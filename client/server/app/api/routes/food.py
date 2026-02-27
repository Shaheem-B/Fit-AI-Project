from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from datetime import date, datetime
from app.models.food import (
    FoodSearchResponse, FoodLogCreate, DailyFoodLogResponse, 
    FoodLogEntry, DailyFoodLog, FoodItem
)
from app.core.security import get_current_user_id
from app.db.mongodb import get_database
from app.services.food_service import search_food_items, calculate_macros_for_quantity
from bson import ObjectId

router = APIRouter()

@router.get("/search", response_model=FoodSearchResponse)
async def search_food(
    query: str = Query(..., min_length=2, description="Food search query"),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of results"),
    user_id: str = Depends(get_current_user_id)
):
    """Search for food items by name"""
    if not query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty"
        )
    
    try:
        result = await search_food_items(query.strip(), limit)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Food search failed: {str(e)}"
        )

@router.post("/log", response_model=DailyFoodLogResponse)
async def log_food(
    food_log: FoodLogCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Log a food item to a specific meal"""
    db = get_database()
    food_logs_collection = db["food_logs"]
    
    # Set date to today if not provided
    log_date = food_log.date or date.today()
    
    # Validate meal type
    valid_meals = ["breakfast", "lunch", "snacks", "dinner"]
    if food_log.meal_type not in valid_meals:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid meal type. Must be one of: {', '.join(valid_meals)}"
        )
    
    # First, search for the food to get nutrition info
    try:
        search_result = await search_food_items(food_log.food_name, limit=1)
        if not search_result.foods:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Food item not found"
            )
        
        food_item = search_result.foods[0]
        macros = calculate_macros_for_quantity(food_item, food_log.quantity)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get food nutrition data: {str(e)}"
        )
    
    # Create food log entry
    log_entry = FoodLogEntry(
        food_name=food_log.food_name,
        quantity=food_log.quantity,
        meal_type=food_log.meal_type,
        macros=macros
    )
    
    # Convert date to datetime for MongoDB compatibility
    log_datetime = datetime.combine(log_date, datetime.min.time())
    
    # Find or create daily log for this date
    existing_log = await food_logs_collection.find_one({
        "user_id": user_id,
        "date": log_datetime
    })
    
    if existing_log:
        # Update existing log
        existing_log["meals"][food_log.meal_type].append(log_entry.dict())
        
        # Recalculate total macros
        total_macros = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
        for meal_type, meals in existing_log["meals"].items():
            for meal in meals:
                total_macros["calories"] += meal["macros"]["calories"]
                total_macros["protein"] += meal["macros"]["protein"]
                total_macros["carbs"] += meal["macros"]["carbs"]
                total_macros["fat"] += meal["macros"]["fat"]
        
        existing_log["total_macros"] = total_macros
        existing_log["updated_at"] = log_entry.logged_at
        
        await food_logs_collection.replace_one(
            {"_id": existing_log["_id"]},
            existing_log
        )
        
        return DailyFoodLogResponse(
            id=str(existing_log["_id"]),
            user_id=existing_log["user_id"],
            date=log_date,  # Return original date for API response
            meals=existing_log["meals"],
            total_macros=existing_log["total_macros"],
            created_at=existing_log["created_at"],
            updated_at=existing_log["updated_at"]
        )
    else:
        # Create new daily log
        new_log = DailyFoodLog(
            user_id=user_id,
            date=log_datetime,
            meals={meal_type: [] for meal_type in valid_meals},
            total_macros={"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
        )
        
        # Add the food entry
        new_log.meals[food_log.meal_type].append(log_entry.dict())
        new_log.total_macros = macros  # First entry, so total = this entry's macros
        
        log_dict = new_log.dict(by_alias=True)
        result = await food_logs_collection.insert_one(log_dict)
        log_dict["_id"] = result.inserted_id
        
        return DailyFoodLogResponse(
            id=str(result.inserted_id),
            user_id=log_dict["user_id"],
            date=log_date,  # Return original date for API response
            meals=log_dict["meals"],
            total_macros=log_dict["total_macros"],
            created_at=log_dict["created_at"],
            updated_at=log_dict["updated_at"]
        )

@router.get("/daily", response_model=DailyFoodLogResponse)
async def get_daily_food_log(
    target_date: Optional[date] = Query(None, description="Date to get logs for (defaults to today)"),
    user_id: str = Depends(get_current_user_id)
):
    """Get daily food log for a specific date"""
    db = get_database()
    food_logs_collection = db["food_logs"]
    
    # Use today if no date provided
    log_date = target_date or date.today()
    
    # Convert date to datetime for MongoDB compatibility
    log_datetime = datetime.combine(log_date, datetime.min.time())
    
    # Find daily log
    daily_log = await food_logs_collection.find_one({
        "user_id": user_id,
        "date": log_datetime
    })
    
    if not daily_log:
        # Return empty log for the date
        empty_log = DailyFoodLog(
            user_id=user_id,
            date=log_datetime,
            meals={
                "breakfast": [],
                "lunch": [],
                "snacks": [],
                "dinner": []
            },
            total_macros={"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
        )
        
        return DailyFoodLogResponse(
            id="",
            user_id=user_id,
            date=log_date,  # Return original date for API response
            meals=empty_log.meals,
            total_macros=empty_log.total_macros,
            created_at=empty_log.created_at,
            updated_at=empty_log.updated_at
        )
    
    return DailyFoodLogResponse(
        id=str(daily_log["_id"]),
        user_id=daily_log["user_id"],
        date=log_date,  # Return original date for API response
        meals=daily_log["meals"],
        total_macros=daily_log["total_macros"],
        created_at=daily_log["created_at"],
        updated_at=daily_log["updated_at"]
    )

@router.delete("/log/{log_id}")
async def delete_food_log(
    log_id: str,
    meal_type: str = Query(..., description="Meal type"),
    food_index: int = Query(..., ge=0, description="Index of food item in meal"),
    user_id: str = Depends(get_current_user_id)
):
    """Delete a specific food log entry"""
    db = get_database()
    food_logs_collection = db["food_logs"]
    
    try:
        # Find the daily log
        daily_log = await food_logs_collection.find_one({
            "user_id": user_id,
            "_id": ObjectId(log_id)
        })
        
        if not daily_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Daily log not found"
            )
        
        # Remove the food entry
        if (meal_type in daily_log["meals"] and 
            food_index < len(daily_log["meals"][meal_type])):
            
            removed_item = daily_log["meals"][meal_type].pop(food_index)
            
            # Recalculate total macros
            total_macros = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
            for meal_type_key, meals in daily_log["meals"].items():
                for meal in meals:
                    total_macros["calories"] += meal["macros"]["calories"]
                    total_macros["protein"] += meal["macros"]["protein"]
                    total_macros["carbs"] += meal["macros"]["carbs"]
                    total_macros["fat"] += meal["macros"]["fat"]
            
            daily_log["total_macros"] = total_macros
            daily_log["updated_at"] = removed_item["logged_at"]
            
            # Update in database
            await food_logs_collection.replace_one(
                {"_id": daily_log["_id"]},
                daily_log
            )
            
            return {"message": "Food log entry deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Food entry not found"
            )
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete food log: {str(e)}"
        )
