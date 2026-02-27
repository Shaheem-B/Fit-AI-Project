from pydantic import BaseModel, EmailStr, Field
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
        # Pydantic v2+ way to set the JSON schema type
        return {"type": "string"}

class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=4, max_length=72)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None
    diet_prefs: Optional[str] = None

class UserInDB(UserBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Profile fields
    age: Optional[int] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None
    diet_prefs: Optional[str] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: Optional[str] = None
    age: Optional[int] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    height_cm: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None
    diet_prefs: Optional[str] = None
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

