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

class Exercise(BaseModel):
    """Exercise definition"""
    name: str
    description: str
    muscle_group: str  # chest, back, arms, legs, shoulders, core, cardio
    equipment: Optional[str] = None
    difficulty: str = "beginner"  # beginner, intermediate, advanced
    instructions: List[str] = []
    tips: List[str] = []

class WorkoutLog(BaseModel):
    """Individual workout log entry"""
    exercise_name: str
    muscle_group: str
    sets: int
    reps: int
    weight: Optional[float] = None  # in kg/lbs
    duration: Optional[int] = None  # in seconds for cardio
    distance: Optional[float] = None  # in km for cardio
    notes: Optional[str] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class WorkoutLogCreate(BaseModel):
    """Request to create a workout log"""
    exercise_name: str
    muscle_group: str
    sets: int
    reps: int
    weight: Optional[float] = None
    duration: Optional[int] = None
    distance: Optional[float] = None
    notes: Optional[str] = None
    date: Union[date, None] = None  # Allow date or None

class DailyWorkoutLog(BaseModel):
    """Daily workout log for a user"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    date: Union[date, datetime]  # Accept both date and datetime
    workouts: List[WorkoutLog] = []
    total_sets: int = 0
    total_reps: int = 0
    total_weight: float = 0.0
    total_duration: int = 0  # in seconds
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

class DailyWorkoutLogResponse(BaseModel):
    """Response for daily workout log"""
    id: str
    user_id: str
    date: date
    workouts: List[WorkoutLog]
    total_sets: int
    total_reps: int
    total_weight: float
    total_duration: int
    created_at: datetime
    updated_at: datetime

class MuscleGroup(BaseModel):
    """Muscle group with exercises"""
    name: str
    display_name: str
    exercises: List[Exercise]

class WorkoutStreak(BaseModel):
    """User workout streak information"""
    current_streak: int
    longest_streak: int
    last_workout_date: Optional[date] = None
    total_workout_days: int

class ExerciseSearchResponse(BaseModel):
    """Response for exercise search"""
    exercises: List[Exercise]
    total_results: int
