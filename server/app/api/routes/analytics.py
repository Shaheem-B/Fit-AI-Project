from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from pydantic import BaseModel

from app.core.security import get_current_user_id
from app.db.mongodb import get_database

router = APIRouter()


class DailySummaryItem(BaseModel):
    date: date
    calories: float
    calories_goal: Optional[float] = None
    protein: float
    protein_goal: Optional[float] = None
    workouts_completed: int
    workouts_planned: Optional[float] = None


class WeeklySummaryResponse(BaseModel):
    days: List[DailySummaryItem]


class AdherenceDetails(BaseModel):
    calories: float
    protein: float
    workouts: float


class AdherenceResponse(BaseModel):
    score: int
    details: AdherenceDetails


class StreaksResponse(BaseModel):
    diet_streak: int
    protein_streak: int
    workout_streak: int


async def _get_user_goals(db, user_id: str) -> Dict[str, Any]:
    """Attempt to read goals from the latest saved plan; fallback to sensible defaults."""
    plans_collection = db["plans"]
    plan = await plans_collection.find_one({"user_id": user_id}, sort=[("created_at", -1)])
    defaults = {"calories": 2000.0, "protein": 75.0, "workouts_per_week": 3}
    if not plan:
        return defaults

    user_inputs = plan.get("user_inputs", {}) or {}
    # Support multiple possible keys
    daily_goals = user_inputs.get("daily_goals") or user_inputs.get("goals") or {}
    calories = daily_goals.get("calories") or user_inputs.get("calories_goal") or defaults["calories"]
    protein = daily_goals.get("protein") or user_inputs.get("protein_goal") or defaults["protein"]
    workouts_per_week = user_inputs.get("workouts_per_week") or user_inputs.get("planned_workouts_per_week") or defaults["workouts_per_week"]

    return {"calories": float(calories), "protein": float(protein), "workouts_per_week": float(workouts_per_week)}


@router.get("/weekly-summary", response_model=WeeklySummaryResponse)
async def weekly_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_id: str = Depends(get_current_user_id)
):
    """Return daily calories/protein and workout counts between start_date and end_date.

    Aggregation notes:
    - food_logs documents store `date` (datetime at midnight) and `total_macros` with calories/protein.
    - workout_logs documents store `date` and an array `workouts`.
    """
    db = get_database()
    food_coll = db["food_logs"]
    workout_coll = db["workout_logs"]

    # Default to last 7 days; end_dt must be start of next day to include all of today
    end_dt = datetime.combine((end_date or date.today()) + timedelta(days=1), datetime.min.time())
    start_dt = datetime.combine(start_date or (date.today() - timedelta(days=6)), datetime.min.time())

    print(f"[DEBUG weekly_summary] user_id={user_id}")
    print(f"[DEBUG weekly_summary] start_dt={start_dt}, end_dt={end_dt}")

    # Get user goals (from latest plan or defaults)
    goals = await _get_user_goals(db, user_id)
    print(f"[DEBUG weekly_summary] goals={goals}")

    # Aggregate food per day
    food_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {
            "dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
            "calories": {"$ifNull": ["$total_macros.calories", 0]},
            "protein": {"$ifNull": ["$total_macros.protein", 0]}
        }},
        {"$group": {"_id": "$dateStr", "calories": {"$sum": "$calories"}, "protein": {"$sum": "$protein"}}},
        {"$sort": {"_id": 1}}
    ]

    food_cursor = food_coll.aggregate(food_pipeline)
    food_rows = await food_cursor.to_list(length=1000)
    print(f"[DEBUG weekly_summary] food_rows count: {len(food_rows)}")
    print(f"[DEBUG weekly_summary] food_rows: {food_rows}")

    # Aggregate workouts per day
    workout_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {
            "dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
            "workouts_count": {"$size": {"$ifNull": ["$workouts", []]}}
        }},
        {"$group": {"_id": "$dateStr", "workouts_completed": {"$sum": "$workouts_count"}}},
        {"$sort": {"_id": 1}}
    ]

    workout_cursor = workout_coll.aggregate(workout_pipeline)
    workout_rows = await workout_cursor.to_list(length=1000)

    print(f"[DEBUG weekly_summary] workout_rows count: {len(workout_rows)}")
    print(f"[DEBUG weekly_summary] workout_rows: {workout_rows}")

    # Merge results by date using dicts (small amount of data)
    food_map = {r["_id"]: r for r in food_rows}
    workout_map = {r["_id"]: r for r in workout_rows}

    # Build day list (note: this merge is on aggregated rows only, not raw logs)
    day_keys = sorted(set(list(food_map.keys()) + list(workout_map.keys())))

    days = []
    for d in day_keys:
        dt = datetime.strptime(d, "%Y-%m-%d").date()
        f = food_map.get(d, {})
        w = workout_map.get(d, {})
        days.append(DailySummaryItem(
            date=dt,
            calories=float(f.get("calories", 0.0)),
            calories_goal=goals.get("calories"),
            protein=float(f.get("protein", 0.0)),
            protein_goal=goals.get("protein"),
            workouts_completed=int(w.get("workouts_completed", 0)),
            workouts_planned=round(goals.get("workouts_per_week", 0.0) / 7.0, 2)
        ))

    return WeeklySummaryResponse(days=days)


@router.get("/adherence-score", response_model=AdherenceResponse)
async def adherence_score(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user_id: str = Depends(get_current_user_id)
):
    """Compute adherence score (0-100) for date range using aggregation only.

    We compute per-day ratios (actual/goal capped at 1), average them across days present,
    and weight: calories 40%, protein 30%, workouts 30%.
    """
    db = get_database()
    food_coll = db["food_logs"]
    workout_coll = db["workout_logs"]

    # Include all of today by setting end_dt to start of next day
    end_dt = datetime.combine((end_date or date.today()) + timedelta(days=1), datetime.min.time())
    start_dt = datetime.combine(start_date or (date.today() - timedelta(days=6)), datetime.min.time())

    goals = await _get_user_goals(db, user_id)
    cal_goal = max(1.0, goals.get("calories", 2000.0))
    protein_goal = max(1.0, goals.get("protein", 75.0))
    workouts_per_week = max(0.0, goals.get("workouts_per_week", 3.0))
    planned_per_day = workouts_per_week / 7.0

    # Food per-day ratios pipeline
    food_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {
            "dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
            "cal_ratio": {"$min": [{"$divide": [{"$ifNull": ["$total_macros.calories", 0]}, cal_goal]}, 1]},
            "protein_ratio": {"$min": [{"$divide": [{"$ifNull": ["$total_macros.protein", 0]}, protein_goal]}, 1]}
        }},
        {"$group": {"_id": None, "avg_cal": {"$avg": "$cal_ratio"}, "avg_protein": {"$avg": "$protein_ratio"}}}
    ]

    f_res = await food_coll.aggregate(food_pipeline).to_list(length=1)
    if f_res:
        avg_cal = float(f_res[0].get("avg_cal", 0.0))
        avg_protein = float(f_res[0].get("avg_protein", 0.0))
    else:
        avg_cal = 0.0
        avg_protein = 0.0

    # Workouts: compute avg completed per day over range
    workout_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {"workouts_count": {"$size": {"$ifNull": ["$workouts", []]}}}},
        {"$group": {"_id": None, "avg_workouts_per_day": {"$avg": "$workouts_count"}}}
    ]

    w_res = await workout_coll.aggregate(workout_pipeline).to_list(length=1)
    avg_workouts_per_day = float(w_res[0].get("avg_workouts_per_day", 0.0)) if w_res else 0.0

    # Compute normalized workout score (cap at planned_per_day)
    workout_ratio = min(1.0, avg_workouts_per_day / (planned_per_day or 1.0)) if planned_per_day > 0 else 0.0

    # Weighted score
    base_score_float = (avg_cal * 0.4 + avg_protein * 0.3 + workout_ratio * 0.3)

    # Attempt to incorporate wearable aggregated summaries when available.
    db = get_database()
    wearable_coll = db["wearable_daily_summary"]
    wearable_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt.date().isoformat(), "$lte": (end_dt - timedelta(days=1)).date().isoformat()}}},
        {"$group": {"_id": None, "avg_calories_burned": {"$avg": "$calories_burned"}, "avg_active_minutes": {"$avg": "$active_minutes"}, "count_days": {"$sum": 1}}}
    ]

    w_res = await wearable_coll.aggregate(wearable_pipeline).to_list(length=1)
    if w_res and w_res[0].get("count_days", 0) > 0:
        w_row = w_res[0]
        avg_cal_burned = float(w_row.get("avg_calories_burned") or 0.0)
        avg_active_min = float(w_row.get("avg_active_minutes") or 0.0)

        # Normalize wearable ratios (caps at 1.0)
        wearable_cal_ratio = min(1.0, avg_cal_burned / (cal_goal or 1.0)) if cal_goal > 0 else 0.0
        # Treat 30 active minutes per day as a reasonable daily activity target
        wearable_activity_ratio = min(1.0, avg_active_min / 30.0)

        wearable_score = (wearable_cal_ratio * 0.6 + wearable_activity_ratio * 0.4)

        # Give wearable higher weight but cap influence to avoid overfitting
        wearable_weight = 0.6
        wearable_weight = min(0.7, wearable_weight)

        score_float = (base_score_float * (1.0 - wearable_weight)) + (wearable_score * wearable_weight)
    else:
        score_float = base_score_float

    score = int(round(score_float * 100.0))

    return AdherenceResponse(
        score=score,
        details=AdherenceDetails(calories=round(avg_cal * 100, 1), protein=round(avg_protein * 100, 1), workouts=round(workout_ratio * 100, 1))
    )


@router.get("/streaks", response_model=StreaksResponse)
async def streaks(user_id: str = Depends(get_current_user_id)):
    """Return simple streaks: diet (consecutive days meeting calorie goal), protein, workout.

    Implementation note: we use aggregation to fetch distinct days meeting each condition,
    then compute consecutive-day streaks in Python on the small result set.
    """
    db = get_database()
    food_coll = db["food_logs"]
    workout_coll = db["workout_logs"]

    # Look back up to last 365 days. Include all of today by setting end_dt to start of next day.
    end_dt = datetime.combine(date.today() + timedelta(days=1), datetime.min.time())
    start_dt = end_dt - timedelta(days=365)

    goals = await _get_user_goals(db, user_id)
    cal_goal = max(1.0, goals.get("calories", 2000.0))
    protein_goal = max(1.0, goals.get("protein", 75.0))

    # Dates where calorie goal met
    cal_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {"dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}}, "met": {"$gte": [{"$ifNull": ["$total_macros.calories", 0]}, cal_goal]}}},
        {"$match": {"met": True}},
        {"$group": {"_id": "$dateStr"}},
        {"$sort": {"_id": -1}}
    ]
    cal_dates = await food_coll.aggregate(cal_pipeline).to_list(length=1000)
    cal_dates = [datetime.strptime(d["_id"], "%Y-%m-%d").date() for d in cal_dates]

    # Dates where protein goal met
    protein_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {"dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}}, "met": {"$gte": [{"$ifNull": ["$total_macros.protein", 0]}, protein_goal]}}},
        {"$match": {"met": True}},
        {"$group": {"_id": "$dateStr"}},
        {"$sort": {"_id": -1}}
    ]
    protein_dates = await food_coll.aggregate(protein_pipeline).to_list(length=1000)
    protein_dates = [datetime.strptime(d["_id"], "%Y-%m-%d").date() for d in protein_dates]

    # Dates where workout logged
    workout_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {"dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}}, "has": {"$gt": [{"$size": {"$ifNull": ["$workouts", []]}}, 0]}}},
        {"$match": {"has": True}},
        {"$group": {"_id": "$dateStr"}},
        {"$sort": {"_id": -1}}
    ]
    workout_dates = await workout_coll.aggregate(workout_pipeline).to_list(length=1000)
    workout_dates = [datetime.strptime(d["_id"], "%Y-%m-%d").date() for d in workout_dates]

    def current_streak(dates_sorted_desc: List[date]) -> int:
        if not dates_sorted_desc:
            return 0
        streak = 0
        today = date.today()
        expected = today
        for d in dates_sorted_desc:
            if d == expected:
                streak += 1
                expected = expected - timedelta(days=1)
            elif d == expected - timedelta(days=1) and streak == 0:
                # If there's no entry for today but yesterday exists, allow starting from yesterday
                streak = 1
                expected = expected - timedelta(days=2)
            else:
                break
        return streak

    diet_streak = current_streak(cal_dates)
    protein_streak = current_streak(protein_dates)
    workout_streak = current_streak(workout_dates)

    return StreaksResponse(diet_streak=diet_streak, protein_streak=protein_streak, workout_streak=workout_streak)
