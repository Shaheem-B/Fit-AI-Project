import asyncio
from datetime import datetime, timedelta, date
import httpx
from typing import Optional, List

from app.core.config import settings
from app.db.mongodb import get_database


async def exchange_code_for_token(code: str) -> dict:
    """Exchange authorization code for tokens using configured token URL."""
    async with httpx.AsyncClient() as client:
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.WEARABLE_REDIRECT_URI,
            "client_id": settings.WEARABLE_CLIENT_ID,
            "client_secret": settings.WEARABLE_CLIENT_SECRET,
        }
        resp = await client.post(settings.WEARABLE_TOKEN_URL, data=data, timeout=20.0)
        resp.raise_for_status()
        return resp.json()


async def refresh_token(refresh_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.WEARABLE_CLIENT_ID,
            "client_secret": settings.WEARABLE_CLIENT_SECRET,
        }
        resp = await client.post(settings.WEARABLE_TOKEN_URL, data=data, timeout=20.0)
        resp.raise_for_status()
        return resp.json()


async def fetch_aggregated_for_user(user_id: str, token: str, target_date: date) -> Optional[dict]:
    """Call provider aggregated endpoint for a single date.

    The provider is expected to return aggregated values for the date.
    This function is privacy-first and only requests aggregation endpoints.
    """
    params = {"date": target_date.isoformat()}
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient() as client:
        resp = await client.get(settings.WEARABLE_AGG_URL, params=params, headers=headers, timeout=20.0)
        if resp.status_code == 401:
            return None
        resp.raise_for_status()
        return resp.json()


async def run_daily_sync_loop(app):
    """Background loop to sync aggregated daily summaries for connected users.

    Behaviour:
    - Runs every 6 hours and attempts to fetch any missing daily summaries for the last 3 days.
    - Stores normalized results in `wearable_daily_summary` collection.
    - Refreshes tokens when expired.
    """
    db = get_database()
    tokens_coll = db["wearable_tokens"]
    summary_coll = db["wearable_daily_summary"]

    async def _ensure_user_sync(user_doc):
        user_id = user_doc.get("user_id")
        access_token = user_doc.get("access_token")
        refresh_tk = user_doc.get("refresh_token")

        # Try last 3 days (today, yesterday, day before)
        for delta in range(0, 3):
            d = date.today() - timedelta(days=delta)
            exists = await summary_coll.find_one({"user_id": user_id, "date": d.isoformat()})
            if exists:
                continue
            # fetch aggregated
            data = None
            try:
                data = await fetch_aggregated_for_user(user_id, access_token, d)
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401 and refresh_tk:
                    # try refresh
                    try:
                        new_t = await refresh_token(refresh_tk)
                        access_token = new_t.get("access_token")
                        refresh_tk = new_t.get("refresh_token")
                        # persist tokens
                        await tokens_coll.update_one({"user_id": user_id}, {"$set": {"access_token": access_token, "refresh_token": refresh_tk, "updated_at": datetime.utcnow()}})
                        data = await fetch_aggregated_for_user(user_id, access_token, d)
                    except Exception:
                        data = None
                else:
                    data = None
            except Exception:
                data = None

            if not data:
                continue

            # Normalize fields - provider may have different keys
            normalized = {
                "user_id": user_id,
                "date": d.isoformat(),
                "steps": int(data.get("steps", 0)),
                "sleep_minutes": int(data.get("sleep_minutes", 0)),
                "resting_heart_rate": data.get("resting_heart_rate"),
                "active_minutes": int(data.get("active_minutes", 0)),
                "calories_burned": data.get("calories_burned"),
                "source": "wearable",
                "created_at": datetime.utcnow()
            }

            await summary_coll.update_one({"user_id": user_id, "date": d.isoformat()}, {"$set": normalized}, upsert=True)

            # Update last_synced_at on token doc for quick status lookup
            try:
                await tokens_coll.update_one({"user_id": user_id}, {"$set": {"last_synced_at": datetime.utcnow(), "updated_at": datetime.utcnow()}})
            except Exception:
                pass

    while True:
        try:
            cursor = tokens_coll.find({})
            async for tok in cursor:
                await _ensure_user_sync(tok)
        except Exception:
            pass

        # Sleep for 6 hours before trying again
        await asyncio.sleep(6 * 60 * 60)
