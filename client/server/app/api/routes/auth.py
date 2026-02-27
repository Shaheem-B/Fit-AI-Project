from fastapi import APIRouter, HTTPException, status
from app.models.user import UserCreate, UserLogin, UserResponse, TokenResponse, UserInDB
from app.core.security import get_password_hash, verify_password, create_access_token
from app.db.mongodb import get_database
from datetime import datetime

router = APIRouter()

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate):
    try:
        db = get_database()
        users_collection = db["users"]
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create user
        user_dict = {
            "email": user_data.email,
            "name": user_data.name,
            "hashed_password": get_password_hash(user_data.password),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await users_collection.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        
        # Create access token
        access_token = create_access_token(data={"sub": str(result.inserted_id)})
        
        # Prepare user response
        user_response = UserResponse(
            id=str(result.inserted_id),
            email=user_dict["email"],
            name=user_dict.get("name"),
            created_at=user_dict["created_at"]
        )
        
        return TokenResponse(access_token=access_token, user=user_response)
    except Exception as e:
        import traceback
        print("ERROR IN SIGNUP:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Authenticate user and return token."""
    db = get_database()
    users_collection = db["users"]
    
    # Find user
    user = await users_collection.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user["_id"])})
    
    # Prepare user response
    user_response = UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user.get("name"),
        age=user.get("age"),
        sex=user.get("sex"),
        weight=user.get("weight"),
        height_cm=user.get("height_cm"),
        activity_level=user.get("activity_level"),
        goal=user.get("goal"),
        diet_prefs=user.get("diet_prefs"),
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

