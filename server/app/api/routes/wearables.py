from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse, JSONResponse
from typing import Optional
from datetime import datetime, date, timedelta
from urllib.parse import urlencode

from app.core.security import get_current_user_id
from app.core.config import settings
from app.db.mongodb import get_database
from app.services import wearable_service
from pydantic import BaseModel

router = APIRouter()


class ConnectResponse(BaseModel):
    authorization_url: str


class WearableConnectionResponse(BaseModel):
    user_id: str
    provider: str
    connected_at: Optional[datetime]
    last_synced_at: Optional[datetime]


@router.post("/connect", response_model=ConnectResponse)
async def connect(user_id: str = Depends(get_current_user_id)):
    """Return an OAuth authorization URL for the user to connect a read-only wearable provider."""
    # Build a state param to include the user id (minimal privacy-preserving state)
    state = user_id
    params = {
        "response_type": "code",
        "client_id": settings.WEARABLE_CLIENT_ID,
        "redirect_uri": settings.WEARABLE_REDIRECT_URI,
        "scope": "read_aggregated",
        "state": state,
        "access_type": "offline"
    }
    url = f"{settings.WEARABLE_AUTH_URL}?{urlencode(params)}"
    return ConnectResponse(authorization_url=url)


@router.get("/callback")
async def callback(request: Request):
    """OAuth callback that exchanges code for tokens and stores them against the user_id embedded in state."""
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing code or state")

    # State contains user_id in our simple design
    user_id = state

    try:
        token_resp = await wearable_service.exchange_code_for_token(code)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Token exchange failed: {str(e)}")

    db = get_database()
    tokens = db["wearable_tokens"]

    expires_in = token_resp.get("expires_in")
    expires_at = None
    if expires_in:
        expires_at = datetime.utcnow() + timedelta(seconds=int(expires_in))

    token_doc = {
        "user_id": user_id,
        "provider": "generic",
        "access_token": token_resp.get("access_token"),
        "refresh_token": token_resp.get("refresh_token"),
        "scope": token_resp.get("scope"),
        "expires_at": expires_at,
        "connected_at": datetime.utcnow(),
        "last_synced_at": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await tokens.update_one({"user_id": user_id}, {"$set": token_doc}, upsert=True)

    # Redirect back to frontend profile page (minimal UX)
    return RedirectResponse(url="/profile")


@router.get("/status", response_model=WearableConnectionResponse)
async def status(user_id: str = Depends(get_current_user_id)):
    db = get_database()
    tokens = db["wearable_tokens"]
    summary = db["wearable_daily_summary"]

    tk = await tokens.find_one({"user_id": user_id})
    if not tk:
        return WearableConnectionResponse(user_id=user_id, provider="none", connected_at=None, last_synced_at=None)

    # Prefer last_synced_at stored on token doc, fallback to latest summary created_at
    last_synced = tk.get("last_synced_at")
    if not last_synced:
        last = await summary.find({"user_id": user_id}).sort([("created_at", -1)]).to_list(length=1)
        last_synced = last[0].get("created_at") if last else None

    return WearableConnectionResponse(
        user_id=user_id,
        provider=tk.get("provider", "generic"),
        connected_at=tk.get("connected_at"),
        last_synced_at=last_synced
    )


@router.get("/summary")
async def summary(range: Optional[str] = "7d", user_id: str = Depends(get_current_user_id)):
    """Return aggregated wearable summary for the requested range (e.g., 7d, 30d)."""
    db = get_database()
    coll = db["wearable_daily_summary"]

    days = 7
    if range and range.endswith("d"):
        try:
            days = int(range[:-1])
        except Exception:
            days = 7

    end_dt = date.today()
    start_dt = end_dt - timedelta(days=days - 1)

    pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt.isoformat(), "$lte": end_dt.isoformat()}}},
        {"$group": {
            "_id": None,
            "avg_steps": {"$avg": "$steps"},
            "avg_sleep_minutes": {"$avg": "$sleep_minutes"},
            "avg_resting_hr": {"$avg": "$resting_heart_rate"},
            "avg_active_minutes": {"$avg": "$active_minutes"},
            "avg_calories_burned": {"$avg": "$calories_burned"},
            "count_days": {"$sum": 1}
        }}
    ]

    res = await coll.aggregate(pipeline).to_list(length=1)
    if res:
        row = res[0]
        return {
            "avg_steps": int(row.get("avg_steps") or 0),
            "avg_sleep_minutes": int(row.get("avg_sleep_minutes") or 0),
            "avg_resting_heart_rate": (row.get("avg_resting_hr") if row.get("avg_resting_hr") is not None else None),
            "avg_active_minutes": int(row.get("avg_active_minutes") or 0),
            "avg_calories_burned": float(row.get("avg_calories_burned") or 0.0),
            "count_days": int(row.get("count_days") or 0)
        }

    # No wearable data found, check health_sync as fallback
    health_sync_coll = db["health_sync"]
    health_res = await health_sync_coll.find({"user_id": user_id}).sort([("synced_at", -1)]).to_list(length=1)
    if health_res:
        health_data = health_res[0]
        # Convert health sync data to wearable summary format
        return {
            "avg_steps": int(health_data.get("avg_steps") or 0),
            "avg_sleep_minutes": int((health_data.get("avg_sleep_hours") or 0) * 60),
            "avg_resting_heart_rate": health_data.get("resting_heart_rate"),
            "avg_active_minutes": 0,
            "avg_calories_burned": 0.0,
            "count_days": days
        }

    return None
