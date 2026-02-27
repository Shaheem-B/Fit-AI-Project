from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema):
        return {"type": "string"}


class HealthProfileIn(BaseModel):
    age: int
    gender: str
    height: float  # cm
    weight: float  # kg
    activity_level: str  # low / moderate / high
    family_history: str  # yes / no
    sugar_intake: str  # low / medium / high
    sleep_hours: float
    stress_level: str  # low / medium / high


class HealthProfileDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    age: int
    gender: str
    height: float
    weight: float
    bmi: float
    activity_level: str
    family_history: str
    sugar_intake: str
    sleep_hours: float
    stress_level: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class RiskFactor(BaseModel):
    reason: str


class DiseaseAwareness(BaseModel):
    disease_name: str
    risk_level: str
    score: int
    factors: list[str]
    prevention_tips: list[str]
    disclaimer: str = "For awareness only. Not medical advice."


class HealthSyncDataIn(BaseModel):
    """Input model for syncing health data (steps, sleep, heart rate)."""
    avg_steps: int  # avg steps per day
    avg_sleep_hours: float  # avg sleep per night
    resting_heart_rate: Optional[int] = None  # optional
    source: str  # 'phone_app' | 'smartwatch' | 'manual'


class HealthSyncDataDB(BaseModel):
    """Health sync data stored in MongoDB."""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    avg_steps: int
    avg_sleep_hours: float
    resting_heart_rate: Optional[int] = None
    source: str  # 'phone_app' | 'smartwatch' | 'manual'
    confidence_score: float  # 0.0 to 1.0 based on data quality
    synced_at: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class HealthSyncStatus(BaseModel):
    """Status response for synced health data."""
    user_id: str
    is_synced: bool
    last_sync: Optional[datetime] = None
    data: Optional[dict] = None
