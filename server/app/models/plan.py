from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
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
        # Pydantic v2+ way to set the JSON schema type
        return {"type": "string"}

class PlanCreate(BaseModel):
    user_inputs: Dict[str, Any]
    classifier_label: str
    plan_text: str

class PlanInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    user_inputs: Dict[str, Any]
    classifier_label: str
    plan_text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class PlanResponse(BaseModel):
    id: str
    user_id: str
    user_inputs: Dict[str, Any]
    classifier_label: str
    plan_text: str
    created_at: datetime

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatRequest(BaseModel):
    message: str
    plan_id: Optional[str] = None

