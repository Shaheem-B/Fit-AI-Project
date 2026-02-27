from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, date, timedelta
from typing import List

from app.core.security import get_current_user_id
from app.db.mongodb import get_database
from bson import ObjectId
from app.models.health_insights import (
    HealthProfileResponse,
    HealthAwarenessResponse,
    AwarenessItem,
    DerivedMetrics,
    OptionalUserInputs,
)

router = APIRouter()


async def _get_user_goals(db, user_id: str):
    plans_collection = db["plans"]
    users_collection = db["users"]
    plan = await plans_collection.find_one({"user_id": user_id}, sort=[("created_at", -1)])
    defaults = {"calories": 2000.0, "protein": 75.0, "workouts_per_week": 3}

    # If a plan exists, prefer its goals
    if plan:
        user_inputs = plan.get("user_inputs", {}) or {}
        daily_goals = user_inputs.get("daily_goals") or user_inputs.get("goals") or {}
        calories = daily_goals.get("calories") or user_inputs.get("calories_goal") or defaults["calories"]
        protein = daily_goals.get("protein") or user_inputs.get("protein_goal") or defaults["protein"]
        workouts_per_week = user_inputs.get("workouts_per_week") or user_inputs.get("planned_workouts_per_week") or defaults["workouts_per_week"]
        return {"calories": float(calories), "protein": float(protein), "workouts_per_week": float(workouts_per_week)}

    # Fallback: attempt to read from user profile
    user = await users_collection.find_one({"_id": user_id})
    try:
        if not user:
            user = await users_collection.find_one({"user_id": user_id})
    except Exception:
        pass

    if user:
        calories = user.get("calories_goal") or defaults["calories"]
        protein = user.get("protein_goal") or defaults["protein"]
        workouts_per_week = user.get("workouts_per_week") or defaults["workouts_per_week"]
        return {"calories": float(calories), "protein": float(protein), "workouts_per_week": float(workouts_per_week)}

    return defaults


def _bmi_category(bmi: float) -> str:
    if bmi <= 0:
        return "unknown"
    if bmi < 18.5:
        return "Underweight"
    if 18.5 <= bmi < 25:
        return "Normal"
    if 25 <= bmi < 30:
        return "Overweight"
    return "Obese"


@router.get("/profile", response_model=HealthProfileResponse)
async def get_health_profile(user_id: str = Depends(get_current_user_id)):
    """Derive an explainable health profile from user, food_logs and workout_logs."""
    db = get_database()
    users = db["users"]
    food = db["food_logs"]
    workout = db["workout_logs"]

    user = None
    # try common id shapes
    try:
        user = await users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await users.find_one({"_id": user_id})
    if not user:
        user = await users.find_one({"user_id": user_id})
    # best-effort fields
    weight = user.get("weight") if user else None
    height_cm = user.get("height_cm") if user else None

    # BMI
    bmi = None
    bmi_cat = None
    if weight and height_cm:
        try:
            h_m = float(height_cm) / 100.0
            if h_m > 0:
                bmi = round(float(weight) / (h_m * h_m), 2)
                bmi_cat = _bmi_category(bmi)
        except Exception:
            bmi = None

    # last 14 days food aggregation
    end_dt = datetime.combine(date.today() + timedelta(days=1), datetime.min.time())
    start_dt = datetime.combine(date.today() - timedelta(days=13), datetime.min.time())

    food_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {
            "dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
            "cal": {"$ifNull": ["$total_macros.calories", 0]},
            "protein": {"$ifNull": ["$total_macros.protein", 0]}
        }},
        {"$group": {"_id": "$dateStr", "cal": {"$sum": "$cal"}, "protein": {"$sum": "$protein"}}},
        {"$group": {"_id": None, "avg_cal": {"$avg": "$cal"}, "avg_protein": {"$avg": "$protein"}, "days": {"$sum": 1}}}
    ]

    f_res = await food.aggregate(food_pipeline).to_list(length=1)
    avg_cal = float(f_res[0].get("avg_cal", 0.0)) if f_res else 0.0
    avg_protein = float(f_res[0].get("avg_protein", 0.0)) if f_res else 0.0

    # weekly workout minutes (last 7 days)
    w_end = datetime.combine(date.today() + timedelta(days=1), datetime.min.time())
    w_start = datetime.combine(date.today() - timedelta(days=6), datetime.min.time())
    workout_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": w_start, "$lte": w_end}}},
        {"$group": {"_id": None, "total_seconds": {"$sum": {"$ifNull": ["$total_duration", 0]}}}}
    ]
    w_res = await workout.aggregate(workout_pipeline).to_list(length=1)
    total_seconds = int(w_res[0].get("total_seconds", 0)) if w_res else 0
    weekly_minutes = round(total_seconds / 60.0, 1)

    # adherence: reuse analytics weighting for last 14 days
    goals = await _get_user_goals(db, user_id)
    cal_goal = max(1.0, goals.get("calories", 2000.0))
    protein_goal = max(1.0, goals.get("protein", 75.0))
    workouts_per_week = max(0.0, goals.get("workouts_per_week", 3.0))
    planned_per_day = workouts_per_week / 7.0

    adherence_food_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {
            "dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
            "cal_ratio": {"$min": [{"$divide": [{"$ifNull": ["$total_macros.calories", 0]}, cal_goal]}, 1]},
            "protein_ratio": {"$min": [{"$divide": [{"$ifNull": ["$total_macros.protein", 0]}, protein_goal]}, 1]}
        }},
        {"$group": {"_id": None, "avg_cal": {"$avg": "$cal_ratio"}, "avg_protein": {"$avg": "$protein_ratio"}}}
    ]

    a_res = await food.aggregate(adherence_food_pipeline).to_list(length=1)
    avg_cal_ratio = float(a_res[0].get("avg_cal", 0.0)) if a_res else 0.0
    avg_protein_ratio = float(a_res[0].get("avg_protein", 0.0)) if a_res else 0.0

    workout_adherence_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_dt, "$lte": end_dt}}},
        {"$project": {"workouts_count": {"$size": {"$ifNull": ["$workouts", []]}}}},
        {"$group": {"_id": None, "avg_workouts_per_day": {"$avg": "$workouts_count"}}}
    ]
    w_ad_res = await workout.aggregate(workout_adherence_pipeline).to_list(length=1)
    avg_workouts_per_day = float(w_ad_res[0].get("avg_workouts_per_day", 0.0)) if w_ad_res else 0.0
    workout_ratio = min(1.0, avg_workouts_per_day / (planned_per_day or 1.0)) if planned_per_day > 0 else 0.0

    adherence_score = int(round((avg_cal_ratio * 0.4 + avg_protein_ratio * 0.3 + workout_ratio * 0.3) * 100.0))

    # activity level heuristics (WHO-inspired minutes/week)
    if weekly_minutes < 90:
        activity_level = "Sedentary"
    elif 90 <= weekly_minutes < 225:
        activity_level = "Moderate"
    else:
        activity_level = "Active"

    # optional user inputs
    optional_inputs = OptionalUserInputs(
        family_history=(user.get("family_history") if user else None),
        sleep_quality=(user.get("sleep_quality") if user else None),
        stress_level=(user.get("stress_level") if user else None),
    )

    derived = DerivedMetrics(
        bmi=bmi,
        bmi_category=bmi_cat,
        avg_daily_calories=round(avg_cal, 1),
        avg_daily_protein=round(avg_protein, 1),
        weekly_workout_minutes=weekly_minutes,
        adherence_score=adherence_score,
        activity_level=activity_level,
    )

    # confidence: proportion of derived metrics present
    derived_present = 0
    derived_total = 6
    for v in [derived.bmi, derived.avg_daily_calories, derived.avg_daily_protein, derived.weekly_workout_minutes, derived.adherence_score, derived.activity_level]:
        if v is not None:
            derived_present += 1
    confidence_pct = derived_present / derived_total if derived_total > 0 else 0
    confidence_level = "high" if confidence_pct >= 0.7 else ("medium" if confidence_pct >= 0.4 else "low")

    return HealthProfileResponse(
        derived_metrics=derived,
        optional_user_inputs=optional_inputs,
        confidence_level=confidence_level
    )


@router.get("/awareness", response_model=HealthAwarenessResponse)
async def get_health_awareness(user_id: str = Depends(get_current_user_id)):
    """Compute comprehensive health awareness indicators using lifestyle data."""
    db = get_database()
    users = db["users"]
    food = db["food_logs"]
    workout = db["workout_logs"]
    wearable = db["wearable_daily_summary"]

    # Get user profile
    user = None
    try:
        user = await users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = await users.find_one({"_id": user_id})
    if not user:
        user = await users.find_one({"user_id": user_id})

    # Basic profile data
    weight = user.get("weight") if user else None
    height_cm = user.get("height_cm") if user else None
    bmi = None
    bmi_cat = None
    if weight and height_cm:
        try:
            h_m = float(height_cm) / 100.0
            if h_m > 0:
                bmi = round(float(weight) / (h_m * h_m), 2)
                bmi_cat = _bmi_category(bmi)
        except Exception:
            bmi = None

    # Get user goals
    goals = await _get_user_goals(db, user_id)
    cal_goal = max(1.0, goals.get("calories", 2000.0))
    protein_goal = max(1.0, goals.get("protein", 75.0))

    # Date ranges for analysis
    end_dt = datetime.combine(date.today() + timedelta(days=1), datetime.min.time())
    start_14d = datetime.combine(date.today() - timedelta(days=13), datetime.min.time())
    start_7d = datetime.combine(date.today() - timedelta(days=6), datetime.min.time())
    start_4w = datetime.combine(date.today() - timedelta(days=27), datetime.min.time())

    # Food data aggregation (14 days)
    food_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_14d, "$lte": end_dt}}},
        {"$project": {
            "dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
            "cal": {"$ifNull": ["$total_macros.calories", 0]},
            "protein": {"$ifNull": ["$total_macros.protein", 0]},
            "fat": {"$ifNull": ["$total_macros.fat", 0]},
            "sugar": {"$ifNull": ["$total_macros.sugar", 0]},
            "fiber": {"$ifNull": ["$total_macros.fiber", 0]},
            "sodium": {"$ifNull": ["$total_macros.sodium", 0]}
        }},
        {"$group": {"_id": "$dateStr", "cal": {"$sum": "$cal"}, "protein": {"$sum": "$protein"},
                   "fat": {"$sum": "$fat"}, "sugar": {"$sum": "$sugar"}, "fiber": {"$sum": "$fiber"},
                   "sodium": {"$sum": "$sodium"}}},
        {"$group": {"_id": None, "avg_cal": {"$avg": "$cal"}, "avg_protein": {"$avg": "$protein"},
                   "avg_fat": {"$avg": "$fat"}, "avg_sugar": {"$avg": "$sugar"},
                   "avg_fiber": {"$avg": "$fiber"}, "avg_sodium": {"$avg": "$sodium"}, "days": {"$sum": 1}}}
    ]
    f_res = await food.aggregate(food_pipeline).to_list(length=1)
    avg_cal = float(f_res[0].get("avg_cal", 0.0)) if f_res else 0.0
    avg_protein = float(f_res[0].get("avg_protein", 0.0)) if f_res else 0.0
    avg_fat = float(f_res[0].get("avg_fat", 0.0)) if f_res else 0.0
    avg_sugar = float(f_res[0].get("avg_sugar", 0.0)) if f_res else 0.0
    avg_fiber = float(f_res[0].get("avg_fiber", 0.0)) if f_res else 0.0
    avg_sodium = float(f_res[0].get("avg_sodium", 0.0)) if f_res else 0.0
    food_days = int(f_res[0].get("days", 0)) if f_res else 0

    # Average water intake (ml) over last 14 days
    water_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_14d, "$lte": end_dt}}},
        {"$group": {"_id": None, "avg_water_ml": {"$avg": {"$ifNull": ["$water_ml", 0]}}}}
    ]
    w_water_res = await food.aggregate(water_pipeline).to_list(length=1)
    avg_water_ml = float(w_water_res[0].get("avg_water_ml", 0.0)) if w_water_res else 0.0

    # High calorie days analysis
    high_cal_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_14d, "$lte": end_dt}}},
        {"$project": {"dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
                      "cal": {"$ifNull": ["$total_macros.calories", 0]}}},
        {"$group": {"_id": "$dateStr", "cal": {"$sum": "$cal"}}},
        {"$project": {"is_high": {"$cond": [{"$gte": ["$cal", {"$multiply": [cal_goal, 1.2]}]}, 1, 0]}}},
        {"$group": {"_id": None, "high_days": {"$sum": "$is_high"}, "total_days": {"$sum": 1}}}
    ]
    hc_res = await food.aggregate(high_cal_pipeline).to_list(length=1)
    high_cal_days = int(hc_res[0].get("high_days", 0)) if hc_res else 0
    total_food_days = int(hc_res[0].get("total_days", 0)) if hc_res else 0
    high_cal_pct = (high_cal_days / total_food_days * 100) if total_food_days > 0 else 0

    # Protein deficiency analysis
    protein_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_14d, "$lte": end_dt}}},
        {"$project": {"dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
                      "protein": {"$ifNull": ["$total_macros.protein", 0]}}},
        {"$group": {"_id": "$dateStr", "protein": {"$sum": "$protein"}}},
        {"$project": {"is_low": {"$cond": [{"$lt": ["$protein", {"$multiply": [protein_goal, 0.7]}]}, 1, 0]}}},
        {"$group": {"_id": None, "low_days": {"$sum": "$is_low"}, "total_days": {"$sum": 1}}}
    ]
    p_res = await food.aggregate(protein_pipeline).to_list(length=1)
    low_protein_days = int(p_res[0].get("low_days", 0)) if p_res else 0
    protein_def_pct = (low_protein_days / total_food_days * 100) if total_food_days > 0 else 0

    # Workout data aggregation (7 days)
    workout_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_7d, "$lte": end_dt}}},
        {"$group": {"_id": None, "total_cardio_min": {"$sum": {"$ifNull": ["$total_duration", 0]}},
                   "workout_days": {"$sum": {"$cond": ["$has_workout", 1, 0]}}, "total_days": {"$sum": 1}}}
    ]
    w_res = await workout.aggregate(workout_pipeline).to_list(length=1)
    weekly_cardio_min = float(w_res[0].get("total_cardio_min", 0)) if w_res else 0
    workout_days = int(w_res[0].get("workout_days", 0)) if w_res else 0
    sedentary_days = max(0, 7 - workout_days) if w_res else 7

    # Weekly activity analysis (4 weeks)
    weekly_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_4w, "$lte": end_dt}}},
        {"$project": {"week": {"$isoWeek": "$date"}, "year": {"$isoWeekYear": "$date"},
                     "duration": {"$ifNull": ["$total_duration", 0]}}},
        {"$group": {"_id": {"year": "$year", "week": "$week"}, "total_min": {"$sum": "$duration"}}},
        {"$project": {"minutes": {"$divide": ["$total_min", 60]}}}
    ]
    weeks_data = await workout.aggregate(weekly_pipeline).to_list(length=10)
    low_activity_weeks = sum(1 for w in weeks_data if (w.get("minutes") or 0) < 90)
    total_weeks = max(1, len(weeks_data))
    low_activity_pct = low_activity_weeks / total_weeks * 100

    # Wearable data aggregation (7 days) - get actual wearable averages
    wearable_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_7d, "$lte": end_dt}}},
        {"$group": {"_id": None, "avg_steps": {"$avg": "$steps"},
                   "avg_sleep_hours": {"$avg": {"$divide": ["$sleep_minutes", 60]}},
                   "avg_rhr": {"$avg": "$resting_heart_rate"}, "data_days": {"$sum": 1}}}
    ]
    wear_res = await wearable.aggregate(wearable_pipeline).to_list(length=1)
    wearable_avg_steps = float(wear_res[0].get("avg_steps", 0)) if wear_res else 0
    wearable_avg_sleep_hours = float(wear_res[0].get("avg_sleep_hours", 0)) if wear_res else 0
    wearable_avg_rhr = float(wear_res[0].get("avg_rhr", 0)) if wear_res else 0
    wearable_data_available = wear_res and len(wear_res) > 0 and wear_res[0].get("data_days", 0) > 0

    # Fallback: if wearable summaries are missing, try to use the latest health sync record
    healthsync_used = False
    if not wearable_data_available:
        try:
            health_sync_coll = db["health_sync"]
            hs_doc = await health_sync_coll.find_one({"user_id": user_id}, sort=[("synced_at", -1)])
            if hs_doc:
                wearable_avg_steps = float(hs_doc.get("avg_steps", wearable_avg_steps or 0.0))
                wearable_avg_sleep_hours = float(hs_doc.get("avg_sleep_hours", wearable_avg_sleep_hours or 0.0))
                wearable_avg_rhr = float(hs_doc.get("resting_heart_rate", wearable_avg_rhr or 0.0) or 0.0)
                healthsync_used = True
        except Exception:
            pass

    # Health profile sleep_hrs: use it as user's stated preferred sleep (complementary to wearable avg)
    health_profile_sleep_hrs = user.get("sleep_hours", 0) if user else 0
    try:
        health_profile_sleep_hrs = float(health_profile_sleep_hrs) if health_profile_sleep_hrs else 0
    except:
        health_profile_sleep_hrs = 0
    
    # Use actual latest sleep data for calculations - prefer wearable if available
    avg_steps = wearable_avg_steps
    avg_rhr = wearable_avg_rhr
    
    # For sleep quality, use BOTH: wearable average + health profile stated preference
    # This gives a complete picture of sleep (actual measured + user's goal)
    sleep_from_wearable = wearable_avg_sleep_hours if wearable_data_available else 0
    sleep_from_health_profile = health_profile_sleep_hrs if health_profile_sleep_hrs > 0 else None

    # Debug: log whether wearable or health sync data is used (helps troubleshoot missing page issues)
    try:
        print(f"[health.awareness] user={user_id} wearable_available={wearable_data_available} healthsync_used={healthsync_used} avg_steps={avg_steps:.0f} avg_sleep={sleep_from_wearable:.1f}")
    except Exception:
        pass

    # Late meals detection (simplified - would need timestamp data)
    late_meals_count = 0  # Placeholder

    # Activity streak analysis
    streak_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": datetime.combine(date.today() - timedelta(days=30), datetime.min.time()), "$lte": end_dt}}},
        {"$project": {"dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}},
                     "has_workout": {"$gt": [{"$size": {"$ifNull": ["$workouts", []]}}, 0]}}},
        {"$match": {"has_workout": True}},
        {"$group": {"_id": "$dateStr"}},
        {"$sort": {"_id": -1}}
    ]
    recent_workouts = await workout.aggregate(streak_pipeline).to_list(length=1000)
    recent_dates = [d["_id"] for d in recent_workouts]
    streak_instability = 100 if len(recent_dates) < 3 else max(0, 50 - len(recent_dates))

    # Adherence score calculation (7 days)
    adherence_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": start_7d, "$lte": end_dt}}},
        {"$project": {
            "cal_ratio": {"$min": [{"$divide": [{"$ifNull": ["$total_macros.calories", 0]}, cal_goal]}, 1]},
            "protein_ratio": {"$min": [{"$divide": [{"$ifNull": ["$total_macros.protein", 0]}, protein_goal]}, 1]},
            "workouts_count": {"$size": {"$ifNull": ["$workouts", []]}}
        }},
        {"$group": {"_id": None, "avg_cal": {"$avg": "$cal_ratio"}, "avg_protein": {"$avg": "$protein_ratio"},
                   "avg_workouts_per_day": {"$avg": "$workouts_count"}}}
    ]
    adh_res = await food.aggregate(adherence_pipeline).to_list(length=1)
    if adh_res:
        avg_cal_ratio = float(adh_res[0].get("avg_cal", 0.0))
        avg_protein_ratio = float(adh_res[0].get("avg_protein", 0.0))
        avg_workouts_per_day = float(adh_res[0].get("avg_workouts_per_day", 0.0))
    else:
        avg_cal_ratio = 0.0
        avg_protein_ratio = 0.0
        avg_workouts_per_day = 0.0

    workouts_per_week = max(0.0, goals.get("workouts_per_week", 3.0))
    planned_per_day = workouts_per_week / 7.0
    workout_ratio = min(1.0, avg_workouts_per_day / (planned_per_day or 1.0)) if planned_per_day > 0 else 0.0
    adherence_score = int(round((avg_cal_ratio * 0.4 + avg_protein_ratio * 0.3 + workout_ratio * 0.3) * 100.0))

    # Current streaks calculation
    streak_end_dt = datetime.combine(date.today() + timedelta(days=1), datetime.min.time())
    streak_start_dt = streak_end_dt - timedelta(days=365)

    # Diet streak (calorie goal met)
    cal_streak_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": streak_start_dt, "$lte": streak_end_dt}}},
        {"$project": {"dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}}, "met": {"$gte": [{"$ifNull": ["$total_macros.calories", 0]}, cal_goal]}}},
        {"$match": {"met": True}},
        {"$group": {"_id": "$dateStr"}},
        {"$sort": {"_id": -1}}
    ]
    cal_streak_dates = await food.aggregate(cal_streak_pipeline).to_list(length=1000)
    cal_streak_dates = [datetime.strptime(d["_id"], "%Y-%m-%d").date() for d in cal_streak_dates]

    # Workout streak
    workout_streak_pipeline = [
        {"$match": {"user_id": user_id, "date": {"$gte": streak_start_dt, "$lte": streak_end_dt}}},
        {"$project": {"dateStr": {"$dateToString": {"format": "%Y-%m-%d", "date": "$date"}}, "has": {"$gt": [{"$size": {"$ifNull": ["$workouts", []]}}, 0]}}},
        {"$match": {"has": True}},
        {"$group": {"_id": "$dateStr"}},
        {"$sort": {"_id": -1}}
    ]
    workout_streak_dates = await workout.aggregate(workout_streak_pipeline).to_list(length=1000)
    workout_streak_dates = [datetime.strptime(d["_id"], "%Y-%m-%d").date() for d in workout_streak_dates]

    def current_streak(dates_sorted_desc):
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
                streak = 1
                expected = expected - timedelta(days=2)
            else:
                break
        return streak

    diet_streak = current_streak(cal_streak_dates)
    workout_streak = current_streak(workout_streak_dates)

    # Initialize items list
    items = []

    # Helper functions for calculations
    def calculate_hydration_score(steps, workouts, calories, water_ml):
        """Estimate hydration adequacy; prefer measured water (water_ml) when available."""
        if steps == 0 and workouts == 0 and calories == 0 and (water_ml is None or water_ml == 0):
            return "Unknown", ["No activity, food, or water data available"]

        estimated_weight = weight or 70  # default 70kg
        base_need_ml = estimated_weight * 30  # ml per day

        activity_multiplier = 1.0
        if steps > 10000: activity_multiplier += 0.3
        if weekly_cardio_min > 150: activity_multiplier += 0.2
        if avg_fat > 100: activity_multiplier += 0.1

        estimated_need_ml = base_need_ml * activity_multiplier

        if water_ml and water_ml > 0:
            estimated_intake_ml = float(water_ml)
            note = 'measured water intake'
        else:
            estimated_intake_ml = float(calories)  # fallback heuristic
            note = 'estimated from calories'

        ratio = estimated_intake_ml / estimated_need_ml if estimated_need_ml > 0 else 0
        reasons = [f"Estimated {estimated_intake_ml:.0f}ml intake ({note}) vs {estimated_need_ml:.0f}ml need"]

        if ratio >= 0.9:
            return "Adequate", reasons
        elif ratio >= 0.7:
            return "Needs Improvement", reasons
        else:
            return "Dehydration Risk", reasons

    def calculate_sleep_quality_score(wearable_sleep_avg, profile_sleep_goal, rhr, cardio_min, late_meals):
        """Calculate sleep quality based on wearable average + health profile goal + activity factors.
        
        Args:
            wearable_sleep_avg: Actual average sleep from wearable (7 days)
            profile_sleep_goal: User's stated sleep goal from health profile
            rhr: Average resting heart rate from wearable
            cardio_min: Weekly cardio minutes from workouts
            late_meals: Count of late meals
            
        Returns: score (0-100) indicating sleep quality
        """
        score = 50  # base
        
        # Use wearable average if available, otherwise use profile goal
        target_sleep = wearable_sleep_avg if wearable_sleep_avg > 0 else profile_sleep_goal or 7.5
        
        # Ideal range is 7-9 hours
        if 7 <= target_sleep <= 9:
            score += 25
        elif 6 <= target_sleep < 7 or 9 < target_sleep <= 10:
            score += 10
        elif target_sleep < 6:
            score -= 20

        # Resting heart rate (lower is better, indicates recovery)
        if rhr > 0:
            if rhr < 60:
                score += 15
            elif rhr < 70:
                score += 5
            elif rhr > 80:
                score -= 10

        # High cardio without recovery impacts sleep
        if cardio_min > 180:
            score -= 10

        # Late meals disrupt sleep
        if late_meals > 2:
            score -= 15
        elif late_meals > 0:
            score -= 5

        return max(0, min(100, score))

    def calculate_bp_risk(sodium, rhr, cardio_min, sleep_hours):
        """Estimate BP risk level"""
        score = 0

        if sodium > 3000:
            score += 40
        elif sodium > 2300:
            score += 20
        elif sodium < 1500:
            score += 5

        if rhr > 80:
            score += 30
        elif rhr > 70:
            score += 15

        if cardio_min < 75:
            score += 20
        elif cardio_min < 150:
            score += 10

        if sleep_hours < 7:
            score += 15
        elif sleep_hours < 6:
            score += 25

        if score >= 70:
            return "High Risk", score
        elif score >= 35:
            return "Elevated", score
        else:
            return "Normal", score

    # 1. Hydration Adequacy Indicator
    hydration_level, hydration_reasons = calculate_hydration_score(avg_steps, workout_days, avg_cal, avg_water_ml)
    enhanced_hydration_reasons = hydration_reasons[:]
    if avg_water_ml > 0:
        enhanced_hydration_reasons.append(f"[14-day food tracker] Water logged: {avg_water_ml:.0f}ml/day average")
    if avg_steps > 0:
        enhanced_hydration_reasons.append(f"[7-day wearable/sync] Daily steps: {avg_steps:.0f} avg")
    if healthsync_used:
        enhanced_hydration_reasons.append("[Fallback] Using recent health sync data (wearable unavailable)")
    if workout_days > 0:
        enhanced_hydration_reasons.append(f"[7-day workout tracker] Workout days: {workout_days} days")
    if avg_cal > 0:
        enhanced_hydration_reasons.append(f"[14-day food tracker] Calories: {avg_cal:.0f} avg/day")
    items.append(AwarenessItem(
        name="Hydration Adequacy",
        risk_level=hydration_level,
        numeric_score=0,
        reasons=enhanced_hydration_reasons,
        improvement_hint="Aim for clear or pale yellow urine; increase water intake with meals and activity."
    ))

    # 2. Sleep Health Quality Index - Strictly data-driven from wearable + profile
    sleep_score = calculate_sleep_quality_score(sleep_from_wearable, sleep_from_health_profile or 0, avg_rhr, weekly_cardio_min, late_meals_count)
    
    sleep_reasons = []
    sleep_reasons.append(f"[14-day average food data] {total_food_days} days logged")
    
    if sleep_from_wearable > 0:
        sleep_reasons.append(f"[7-day wearable average] {sleep_from_wearable:.1f} hours/night sleep (actual measured)")
    if sleep_from_health_profile and sleep_from_health_profile > 0:
        sleep_reasons.append(f"[Health Profile] {sleep_from_health_profile:.1f} hours/night stated goal")
    if avg_rhr > 0:
        sleep_reasons.append(f"[7-day wearable average] Resting HR: {avg_rhr:.0f} bpm")
    if weekly_cardio_min > 0:
        sleep_reasons.append(f"[7-day aggregation] Weekly cardio: {weekly_cardio_min:.0f} min from workout tracker")
    if late_meals_count > 0:
        sleep_reasons.append(f"[14-day aggregation] {late_meals_count} late meals detected from food logs")
    
    if not sleep_reasons:
        sleep_reasons.append("Insufficient sleep data from wearable/sync/profile sources")

    items.append(AwarenessItem(
        name="Sleep Quality Index",
        risk_level="Poor" if sleep_score < 50 else "Fair" if sleep_score < 75 else "Good",
        numeric_score=int(sleep_score),
        reasons=sleep_reasons,
        improvement_hint="Aim for 7-9 hours sleep; avoid screens 1 hour before bed; no late meals."
    ))

    # 3. Blood Pressure Risk Estimation
    bp_level, bp_score = calculate_bp_risk(avg_sodium, avg_rhr, weekly_cardio_min, sleep_from_wearable)
    bp_reasons = []
    if avg_sodium > 0:
        bp_reasons.append(f"[14-day average from food tracker] Sodium: {avg_sodium:.0f}mg/day")
    if avg_rhr > 0:
        bp_reasons.append(f"[7-day wearable average] Resting heart rate: {avg_rhr:.0f} bpm")
    if weekly_cardio_min > 0:
        bp_reasons.append(f"[7-day aggregation from workout tracker] Weekly cardio: {weekly_cardio_min:.0f} min")
    if sleep_from_wearable > 0:
        bp_reasons.append(f"[7-day wearable average] Average sleep: {sleep_from_wearable:.1f} hours/night")

    items.append(AwarenessItem(
        name="Blood Pressure Risk",
        risk_level=bp_level,
        numeric_score=bp_score,
        reasons=bp_reasons or ["Insufficient blood pressure data from wearable/sync sources"],
        improvement_hint="Reduce sodium intake; maintain regular cardio exercise; ensure adequate sleep."
    ))

    # 4. Diabetes Risk & Control
    diabetes_score = 0
    diabetes_reasons = []
    if bmi and bmi >= 25:
        diabetes_score += 30
        diabetes_reasons.append(f"[Health Profile] BMI {bmi} ({bmi_cat})")
    if high_cal_pct > 30:
        diabetes_score += 30
        diabetes_reasons.append(f"[14-day food tracker] {high_cal_days}/{total_food_days} high-calorie days ({high_cal_pct:.0f}%)")
    if protein_def_pct > 50:
        diabetes_score += 10
        diabetes_reasons.append(f"[14-day food tracker] Protein low on {low_protein_days}/{total_food_days} days")
    if avg_sugar > 50:
        diabetes_score += 20
        diabetes_reasons.append(f"[14-day food tracker] Average sugar: {avg_sugar:.0f}g/day")
    if low_activity_pct > 50:
        diabetes_score += 20
        diabetes_reasons.append(f"[4-week workout tracker] Low activity in {low_activity_weeks}/{total_weeks} weeks ({low_activity_pct:.0f}%)")
    if adherence_score < 50:
        diabetes_score += 15
        diabetes_reasons.append(f"[7-day analytics] Low adherence to goals: {adherence_score}%")

    diabetes_score = min(100, diabetes_score)
    items.append(AwarenessItem(
        name="Diabetes Risk",
        risk_level="High" if diabetes_score >= 70 else "Moderate" if diabetes_score >= 35 else "Low",
        numeric_score=int(diabetes_score),
        reasons=diabetes_reasons or ["Insufficient data from food tracker, workout tracker, and health profile"],
        improvement_hint="Reduce high-calorie days and added sugars; increase protein and regular brisk activity."
    ))

    # 5. Cardiovascular Health Index
    cardio_score = 0
    cardio_reasons = []
    if bmi and bmi >= 27:
        cardio_score += 25
        cardio_reasons.append(f"[Health Profile] BMI {bmi}")
    if high_cal_pct > 40:
        cardio_score += 25
        cardio_reasons.append(f"[14-day food tracker] Frequent high-calorie days ({high_cal_pct:.0f}%)")
    if low_activity_pct > 0:
        cardio_score += min(30, int(low_activity_pct / 2))
        cardio_reasons.append(f"[4-week workout tracker] Low activity: {low_activity_pct:.0f}%")
    if avg_fat > 100:
        cardio_score += 15
        cardio_reasons.append(f"[14-day food tracker] Average fat intake: {avg_fat:.0f}g/day")
    if sedentary_days > 4:
        cardio_score += 20
        cardio_reasons.append(f"[7-day workout tracker] Sedentary days: {sedentary_days}/week")
    cardio_score = min(100, cardio_score)
    items.append(AwarenessItem(
        name="Cardiovascular Health",
        risk_level="High Risk" if cardio_score >= 70 else "Moderate Risk" if cardio_score >= 35 else "Low Risk",
        numeric_score=int(cardio_score),
        reasons=cardio_reasons or ["Insufficient data from food tracker, workout tracker, and health profile"],
        improvement_hint="Increase weekly aerobic minutes and reduce high-calorie/fat intake frequency."
    ))

    # 6. Obesity & Weight Trend
    obesity_score = 0
    obesity_reasons = []
    if bmi:
        if bmi >= 30:
            obesity_score += 60
            obesity_reasons.append(f"[Health Profile] BMI {bmi} (Obese)")
        elif bmi >= 25:
            obesity_score += 30
            obesity_reasons.append(f"[Health Profile] BMI {bmi} (Overweight)")
    if high_cal_pct > 0:
        obesity_score += min(30, int(high_cal_pct / 4))
        obesity_reasons.append(f"[14-day food tracker] {high_cal_pct:.0f}% high-calorie days")
    if weekly_cardio_min < 90:
        obesity_score += 10
        obesity_reasons.append(f"[7-day workout tracker] Low activity: {weekly_cardio_min:.0f} min/week")
    if adherence_score < 60:
        obesity_score += 15
        obesity_reasons.append(f"[7-day analytics] Low adherence: {adherence_score}%")
    obesity_score = min(100, obesity_score)
    items.append(AwarenessItem(
        name="Obesity Risk",
        risk_level="High" if obesity_score >= 70 else "Moderate" if obesity_score >= 35 else "Low",
        numeric_score=int(obesity_score),
        reasons=obesity_reasons or ["Insufficient data from food tracker, workout tracker, and health profile"],
        improvement_hint="Aim for consistent moderate activity and reduce high-calorie intake frequency."
    ))

    # 7. Cholesterol Risk Awareness
    cholesterol_score = 0
    cholesterol_reasons = []
    if avg_fat > 80:
        cholesterol_score += 40
        cholesterol_reasons.append(f"[14-day food tracker] High fat intake: {avg_fat:.0f}g/day")
    if bmi and bmi >= 25:
        cholesterol_score += 20
        cholesterol_reasons.append(f"[Health Profile] BMI {bmi} ({bmi_cat})")
    if sedentary_days > 4:
        cholesterol_score += 20
        cholesterol_reasons.append(f"[7-day workout tracker] Sedentary days: {sedentary_days}/week")
    if avg_fiber < 25:
        cholesterol_score += 20
        cholesterol_reasons.append(f"[14-day food tracker] Low fiber: {avg_fiber:.0f}g/day")
    cholesterol_score = min(100, cholesterol_score)
    items.append(AwarenessItem(
        name="Cholesterol Risk",
        risk_level="High" if cholesterol_score >= 70 else "Moderate" if cholesterol_score >= 35 else "Low",
        numeric_score=int(cholesterol_score),
        reasons=cholesterol_reasons or ["Insufficient data from food tracker, workout tracker, and health profile"],
        improvement_hint="Reduce saturated fat intake; increase fiber-rich foods; maintain regular activity."
    ))

    # 8. Gut Health Score
    gut_score = 0
    gut_reasons = []
    if avg_fiber < 25:
        gut_score += 40
        gut_reasons.append(f"[14-day food tracker] Low fiber: {avg_fiber:.0f}g/day (goal: 25-30g)")
    if sedentary_days > 4:
        gut_score += 20
        gut_reasons.append(f"[7-day workout tracker] Sedentary days: {sedentary_days}/week")
    if late_meals_count > 3:
        gut_score += 15
        gut_reasons.append(f"[14-day food tracker] Irregular eating: {late_meals_count} late meals")
    if avg_sugar > 50:
        gut_score += 15
        gut_reasons.append(f"[14-day food tracker] High sugar: {avg_sugar:.0f}g/day")
    gut_score = min(100, gut_score)
    gut_risk = "Poor" if gut_score >= 70 else "Fair" if gut_score >= 35 else "Good"
    items.append(AwarenessItem(
        name="Gut Health Score",
        risk_level=gut_risk,
        numeric_score=int(gut_score),
        reasons=gut_reasons or ["Insufficient data from food tracker and workout tracker"],
        improvement_hint="Increase fiber intake through vegetables/fruits; reduce sugar; eat regular meals."
    ))

    # 9. Nutrient Deficiency Awareness
    deficiency_score = 0
    deficiency_reasons = []
    if protein_def_pct > 40:
        deficiency_score += 30
        deficiency_reasons.append(f"[14-day food tracker] Protein deficiency: {protein_def_pct:.0f}% of days")
    if avg_fiber < 20:
        deficiency_score += 25
        deficiency_reasons.append(f"[14-day food tracker] Low fiber: {avg_fiber:.0f}g/day")
    if high_cal_pct > 0:
        deficiency_score += min(25, int(high_cal_pct / 4))
        deficiency_reasons.append(f"[14-day food tracker] {high_cal_pct:.0f}% high-calorie days")
    deficiency_score = min(100, deficiency_score)
    items.append(AwarenessItem(
        name="Nutrient Deficiency Risk",
        risk_level="High" if deficiency_score >= 70 else "Moderate" if deficiency_score >= 35 else "Low",
        numeric_score=int(deficiency_score),
        reasons=deficiency_reasons or ["Insufficient data from food tracker"],
        improvement_hint="Ensure balanced meals with adequate protein and fiber; consider nutrient-dense foods."
    ))

    # 10. Stress & Mental Wellness Index
    stress_score = 0
    stress_reasons = []
    if sleep_score < 60:
        stress_score += 30
        stress_reasons.append(f"[7-day wearable] Sleep quality score: {sleep_score}/100")
    if sedentary_days > 5:
        stress_score += 25
        stress_reasons.append(f"[7-day workout tracker] Very sedentary: {sedentary_days} days/week")
    if streak_instability > 50:
        stress_score += 20
        stress_reasons.append(f"[30-day analytics] Inconsistent activity patterns: {streak_instability}%")
    if late_meals_count > 4:
        stress_score += 15
        stress_reasons.append(f"[14-day food tracker] Irregular eating: {late_meals_count} late meals")
    stress_score = min(100, stress_score)
    items.append(AwarenessItem(
        name="Stress & Mental Wellness",
        risk_level="High Stress" if stress_score >= 70 else "Moderate Stress" if stress_score >= 35 else "Low Stress",
        numeric_score=int(stress_score),
        reasons=stress_reasons or ["Insufficient data from wearable/sync data, workout tracker, and food tracker"],
        improvement_hint="Establish consistent sleep and activity routines; practice stress management techniques."
    ))

    # 11. Metabolic Syndrome Risk
    metabolic_score = 0
    metabolic_reasons = []
    if bmi and bmi >= 25:
        metabolic_score += 25
        metabolic_reasons.append(f"[Health Profile] BMI {bmi} ({bmi_cat})")
    if bp_score >= 35:
        metabolic_score += 25
        metabolic_reasons.append(f"[7-day wearable+sync] Blood pressure risk score: {bp_score}/100")
    if avg_fat > 90:
        metabolic_score += 20
        metabolic_reasons.append(f"[14-day food tracker] High fat intake: {avg_fat:.0f}g/day")
    if diabetes_score >= 35:
        metabolic_score += 20
        metabolic_reasons.append(f"[14-day aggregation] Diabetes risk score: {diabetes_score}/100")
    if sedentary_days > 4:
        metabolic_score += 10
        metabolic_reasons.append(f"[7-day workout tracker] Sedentary days: {sedentary_days}/week")
    metabolic_score = min(100, metabolic_score)
    items.append(AwarenessItem(
        name="Metabolic Syndrome Risk",
        risk_level="High" if metabolic_score >= 70 else "Moderate" if metabolic_score >= 35 else "Low",
        numeric_score=int(metabolic_score),
        reasons=metabolic_reasons or ["Insufficient data from health profile, wearable/sync data, food tracker, and workout tracker"],
        improvement_hint="Maintain healthy weight; control blood pressure; reduce fat intake; stay active."
    ))

    # 12. Consistency & Adherence Score
    consistency_score = 100 - adherence_score  # Lower adherence = higher risk score
    consistency_reasons = []
    if adherence_score < 50:
        consistency_reasons.append(f"[7-day analytics] Low adherence: {adherence_score}%")
    elif adherence_score < 75:
        consistency_reasons.append(f"[7-day analytics] Moderate adherence: {adherence_score}%")
    else:
        consistency_reasons.append(f"[7-day analytics] Good adherence: {adherence_score}%")

    if diet_streak > 0:
        consistency_reasons.append(f"[Food tracker] Diet streak: {diet_streak} days")
    if workout_streak > 0:
        consistency_reasons.append(f"[Workout tracker] Workout streak: {workout_streak} days")

    if streak_instability > 50:
        consistency_score += 20
        consistency_reasons.append(f"[30-day analytics] Inconsistent patterns: {streak_instability}%")

    consistency_score = min(100, consistency_score)
    items.append(AwarenessItem(
        name="Consistency & Adherence",
        risk_level="Poor" if consistency_score >= 70 else "Fair" if consistency_score >= 35 else "Good",
        numeric_score=int(consistency_score),
        reasons=consistency_reasons or ["Insufficient tracking data from food tracker, workout tracker, and progress analytics"],
        improvement_hint="Build consistent habits; track progress regularly; set achievable goals; maintain streaks."
    ))

    # Calculate confidence level
    data_points = 0
    total_points = 12
    if bmi is not None: data_points += 1
    if avg_cal > 0: data_points += 1
    if avg_protein > 0: data_points += 1
    if avg_sodium > 0: data_points += 1
    if avg_sugar > 0: data_points += 1
    if avg_fiber > 0: data_points += 1
    if avg_fat > 0: data_points += 1
    if avg_steps > 0: data_points += 1
    if sleep_from_wearable > 0: data_points += 1
    if weekly_cardio_min > 0: data_points += 1
    if adherence_score >= 0: data_points += 1  # Adherence score calculated
    if diet_streak >= 0 or workout_streak >= 0: data_points += 1  # Streaks calculated

    confidence_pct = data_points / total_points if total_points > 0 else 0
    confidence_level = "high" if confidence_pct >= 0.7 else "medium" if confidence_pct >= 0.4 else "low"

    return HealthAwarenessResponse(items=items, confidence_level=confidence_level)
