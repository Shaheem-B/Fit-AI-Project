from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
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


class WearableTokenDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    provider: str = "generic"
    access_token: str
    refresh_token: Optional[str]
    scope: Optional[str]
    expires_at: Optional[datetime]
    connected_at: Optional[datetime] = None
    last_synced_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime]

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True


class WearableDailySummaryIn(BaseModel):
    user_id: str
    date: date
    steps: int = 0
    sleep_minutes: int = 0
    resting_heart_rate: Optional[float] = None
    active_minutes: int = 0
    calories_burned: Optional[float] = None
    source: str = "wearable"


class WearableDailySummaryDB(WearableDailySummaryIn):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        populate_by_name = True
