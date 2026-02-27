from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user_id
from app.db.mongodb import get_database
from app.models.health_profile import HealthProfileIn, DiseaseAwareness, HealthSyncDataIn, HealthSyncStatus
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter()


def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100.0
    if height_m <= 0:
        return 0.0
    return round(weight_kg / (height_m * height_m), 2)


def score_obesity(profile: dict) -> (int, List[str]):
    score = 0
    factors: List[str] = []

    # BMI >= 27 -> +2
    if profile.get("bmi", 0) >= 27:
        score += 2
        factors.append("BMI >= 27")

    # Low activity -> +2
    if profile.get("activity_level") == "low":
        score += 2
        factors.append("Low physical activity")

    # High sugar intake -> +1
    if profile.get("sugar_intake") == "high":
        score += 1
        factors.append("High sugar intake")

    return score, factors


def score_diabetes(profile: dict) -> (int, List[str]):
    score = 0
    factors: List[str] = []

    # BMI >= 25 -> +2
    if profile.get("bmi", 0) >= 25:
        score += 2
        factors.append("BMI >= 25")

    # Family history -> +2
    if profile.get("family_history") == "yes":
        score += 2
        factors.append("Family history of diabetes")

    # Low activity -> +1
    if profile.get("activity_level") == "low":
        score += 1
        factors.append("Low physical activity")

    return score, factors


def score_hypertension(profile: dict) -> (int, List[str]):
    score = 0
    factors: List[str] = []

    # Age >= 40 -> +2
    if profile.get("age", 0) >= 40:
        score += 2
        factors.append("Age >= 40")

    # High stress -> +2
    if profile.get("stress_level") == "high":
        score += 2
        factors.append("High stress level")

    # Low activity -> +1
    if profile.get("activity_level") == "low":
        score += 1
        factors.append("Low physical activity")

    return score, factors


def risk_level_from_score(score: int) -> str:
    if score <= 2:
        return "Low"
    if 3 <= score <= 5:
        return "Moderate"
    return "High"


@router.post("/health-profile", status_code=200)
async def save_health_profile(profile: HealthProfileIn, user_id: str = Depends(get_current_user_id)):
    """Save or update the user's health profile. Derived BMI is stored."""
    db = get_database()
    coll = db["health_profiles"]

    bmi = calculate_bmi(profile.weight, profile.height)

    doc = {
        "user_id": user_id,
        "age": profile.age,
        "gender": profile.gender,
        "height": profile.height,
        "weight": profile.weight,
        "bmi": bmi,
        "activity_level": profile.activity_level,
        "family_history": profile.family_history,
        "sugar_intake": profile.sugar_intake,
        "sleep_hours": profile.sleep_hours,
        "stress_level": profile.stress_level,
        "created_at": datetime.utcnow(),
    }

    # Upsert by user_id so user has single profile document
    result = await coll.update_one({"user_id": user_id}, {"$set": doc}, upsert=True)

    # Also update user's preferred workouts_per_week in users collection for goals
    users_coll = db["users"]
    try:
        # Try to update by ObjectId first
        try:
            uid_obj = ObjectId(user_id)
            await users_coll.update_one({"_id": uid_obj}, {"$set": {"workouts_per_week": profile.workouts_per_week}}, upsert=False)
        except Exception:
            await users_coll.update_one({"user_id": user_id}, {"$set": {"workouts_per_week": profile.workouts_per_week}}, upsert=False)
    except Exception:
        # Ignore failures updating user document
        pass

    return {"status": "ok", "bmi": bmi}


@router.get("/health-awareness", response_model=List[DiseaseAwareness])
async def get_health_awareness(user_id: str = Depends(get_current_user_id)):
    """Compute rule-based risk awareness scores for the user. NOT a diagnosis."""
    db = get_database()
    coll = db["health_profiles"]

    profile = await coll.find_one({"user_id": user_id})
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Health profile not found")

    # Ensure numeric types are used
    profile["bmi"] = float(profile.get("bmi", 0))
    profile["age"] = int(profile.get("age", 0))

    results = []

    # Obesity: scoring rules explained in code
    obesity_score, obesity_factors = score_obesity(profile)
    results.append({
        "disease_name": "Obesity",
        "score": obesity_score,
        "risk_level": risk_level_from_score(obesity_score),
        "factors": obesity_factors,
        "prevention_tips": [
            "Increase physical activity (aim for 150 mins/week of moderate activity)",
            "Reduce intake of high-sugar foods and beverages",
            "Follow a balanced calorie-controlled diet"
        ],
        "disclaimer": "For awareness only. Not medical advice."
    })

    # Type 2 Diabetes
    diabetes_score, diabetes_factors = score_diabetes(profile)
    results.append({
        "disease_name": "Type 2 Diabetes",
        "score": diabetes_score,
        "risk_level": risk_level_from_score(diabetes_score),
        "factors": diabetes_factors,
        "prevention_tips": [
            "Maintain healthy weight and BMI",
            "Limit sugary foods and refined carbs",
            "Regular physical activity and routine screening"
        ],
        "disclaimer": "For awareness only. Not medical advice."
    })

    # Hypertension
    hypertension_score, hypertension_factors = score_hypertension(profile)
    results.append({
        "disease_name": "Hypertension",
        "score": hypertension_score,
        "risk_level": risk_level_from_score(hypertension_score),
        "factors": hypertension_factors,
        "prevention_tips": [
            "Manage stress through relaxation and sleep hygiene",
            "Increase physical activity",
            "Reduce sodium intake and follow a healthy diet"
        ],
        "disclaimer": "For awareness only. Not medical advice."
    })

    return results


def calculate_confidence_score(data: HealthSyncDataIn) -> float:
    """Calculate data quality confidence score (0.0 - 1.0)."""
    score = 0.8  # base score for any sync
    
    # Premium data: resting heart rate included
    if data.resting_heart_rate is not None:
        score += 0.2
    
    # Source reliability
    if data.source == 'smartwatch':
        score = min(score, 0.95)  # smartwatch data is more reliable
    elif data.source == 'phone_app':
        score = min(score, 0.85)
    else:  # manual entry
        score = min(score, 0.75)
    
    return round(score, 2)


@router.post("/sync", status_code=201)
async def sync_health_data(data: HealthSyncDataIn, user_id: str = Depends(get_current_user_id)):
    """Accept health sync data (steps, sleep, heart rate) and store in MongoDB."""
    if not data.source in ['phone_app', 'smartwatch', 'manual']:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid source")
    
    # Validate ranges
    if data.avg_steps < 0 or data.avg_steps > 50000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Steps must be 0-50000")
    
    if data.avg_sleep_hours < 0 or data.avg_sleep_hours > 24:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sleep hours must be 0-24")
    
    if data.resting_heart_rate and (data.resting_heart_rate < 30 or data.resting_heart_rate > 150):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Heart rate must be 30-150 bpm")
    
    confidence = calculate_confidence_score(data)
    
    db = get_database()
    coll = db["health_sync"]
    
    doc = {
        "user_id": user_id,
        "avg_steps": data.avg_steps,
        "avg_sleep_hours": data.avg_sleep_hours,
        "resting_heart_rate": data.resting_heart_rate,
        "source": data.source,
        "confidence_score": confidence,
        "synced_at": datetime.utcnow(),
        "created_at": datetime.utcnow()
    }
    
    # Store as new record (append-only for audit trail)
    result = await coll.insert_one(doc)
    
    return {
        "status": "synced",
        "id": str(result.inserted_id),
        "confidence_score": confidence,
        "message": "Health data synchronized successfully"
    }


@router.get("/sync/status", response_model=HealthSyncStatus)
async def get_sync_status(user_id: str = Depends(get_current_user_id)):
    """Get the latest health sync status for the user."""
    db = get_database()
    coll = db["health_sync"]
    
    # Find most recent sync record
    latest = await coll.find_one(
        {"user_id": user_id},
        sort=[("synced_at", -1)]
    )
    
    if not latest:
        return HealthSyncStatus(
            user_id=user_id,
            is_synced=False,
            last_sync=None,
            data=None
        )
    
    return HealthSyncStatus(
        user_id=user_id,
        is_synced=True,
        last_sync=latest.get("synced_at"),
        data={
            "id": str(latest.get("_id")),
            "user_id": latest.get("user_id"),
            "avg_steps": latest.get("avg_steps"),
            "avg_sleep_hours": latest.get("avg_sleep_hours"),
            "resting_heart_rate": latest.get("resting_heart_rate"),
            "source": latest.get("source"),
            "confidence_score": latest.get("confidence_score"),
            "synced_at": latest.get("synced_at"),
            "created_at": latest.get("created_at")
        } if latest else None
    )
