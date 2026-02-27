from pydantic_settings import BaseSettings
from typing import List
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Project
    PROJECT_NAME: str = "Personal Trainer Bot API"
    PROJECT_NAME: str = "FitAI API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # MongoDB
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "fitness_ai")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Google Gemini
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173"
    ]
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Nutrition API (Optional - for Edamam)
    EDAMAM_APP_ID: str = os.getenv("EDAMAM_APP_ID", "")
    EDAMAM_APP_KEY: str = os.getenv("EDAMAM_APP_KEY", "")

    # Wearable / Health App (OAuth) - read-only aggregated data
    WEARABLE_CLIENT_ID: str = os.getenv("WEARABLE_CLIENT_ID", "")
    WEARABLE_CLIENT_SECRET: str = os.getenv("WEARABLE_CLIENT_SECRET", "")
    WEARABLE_AUTH_URL: str = os.getenv("WEARABLE_AUTH_URL", "https://example.com/oauth/authorize")
    WEARABLE_TOKEN_URL: str = os.getenv("WEARABLE_TOKEN_URL", "https://example.com/oauth/token")
    WEARABLE_AGG_URL: str = os.getenv("WEARABLE_AGG_URL", "https://example.com/api/aggregated")
    WEARABLE_REDIRECT_URI: str = os.getenv("WEARABLE_REDIRECT_URI", "http://localhost:8000/api/wearables/callback")
    
    class Config:
        case_sensitive = True

settings = Settings()

