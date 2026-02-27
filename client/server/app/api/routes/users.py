from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserResponse, UserUpdate
from app.core.security import get_current_user_id
from app.db.mongodb import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_current_user(user_id: str = Depends(get_current_user_id)):
    """Get current user profile."""
    db = get_database()
    users_collection = db["users"]
    
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(
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

@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update current user profile."""
    db = get_database()
    users_collection = db["users"]
    
    # Build update dict (only include non-None values)
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )
    
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user
    result = await users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Fetch updated user
    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    
    return UserResponse(
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

