from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class DerivedMetrics(BaseModel):
    bmi: Optional[float]
    bmi_category: Optional[str]
    avg_daily_calories: Optional[float]
    avg_daily_protein: Optional[float]
    weekly_workout_minutes: Optional[float]
    adherence_score: Optional[int]
    activity_level: Optional[str]


class OptionalUserInputs(BaseModel):
    family_history: Optional[str] = None
    sleep_quality: Optional[str] = None
    stress_level: Optional[str] = None


class HealthProfileResponse(BaseModel):
    derived_metrics: DerivedMetrics
    optional_user_inputs: OptionalUserInputs
    confidence_level: str


class AwarenessItem(BaseModel):
    name: str
    risk_level: str
    numeric_score: int
    reasons: List[str]
    improvement_hint: str


class HealthAwarenessResponse(BaseModel):
    items: List[AwarenessItem]
    confidence_level: Optional[str] = "medium"
