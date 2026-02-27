from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List, Union
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

class FoodItem(BaseModel):
    """Food item from nutrition API"""
    name: str
    calories: float  # per 100g
    protein: float   # per 100g
    carbs: float     # per 100g
    fat: float       # per 100g
    fiber: Optional[float] = None
    sugar: Optional[float] = None
    sodium: Optional[float] = None

class FoodSearchResponse(BaseModel):
    """Response for food search API"""
    foods: List[FoodItem]
    total_results: int

class FoodLogEntry(BaseModel):
    """Individual food log entry"""
    food_name: str
    quantity: float  # in grams
    meal_type: str   # "breakfast", "lunch", "snacks", "dinner"
    macros: Dict[str, float]  # calculated macros for this quantity
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class FoodLogCreate(BaseModel):
    """Request to create a food log"""
    food_name: str
    quantity: float
    meal_type: str
    date: Optional[date] = None  # defaults to today

class DailyFoodLog(BaseModel):
    """Daily food log for a user"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    date: Union[date, datetime]  # Accept both date and datetime
    meals: Dict[str, List[FoodLogEntry]] = {
        "breakfast": [],
        "lunch": [],
        "snacks": [],
        "dinner": []
    }
    total_macros: Dict[str, float] = {
        "calories": 0.0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0
    }
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator('date')
    @classmethod
    def validate_date(cls, v):
        if isinstance(v, date):
            return datetime.combine(v, datetime.min.time())
        return v

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class DailyFoodLogResponse(BaseModel):
    """Response for daily food log"""
    id: str
    user_id: str
    date: date
    meals: Dict[str, List[FoodLogEntry]]
    total_macros: Dict[str, float]
    created_at: datetime
    updated_at: datetime

class DailyGoals(BaseModel):
    """User's daily nutrition goals"""
    calories: float
    protein: float
    carbs: float
    fat: float
