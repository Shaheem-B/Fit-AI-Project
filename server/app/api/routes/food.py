from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import Optional
from datetime import date, datetime
from app.models.food import (
    FoodSearchResponse, FoodLogCreate, DailyFoodLogResponse, 
    FoodLogEntry, DailyFoodLog, FoodItem, CustomFoodCreate
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
        total_macros = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0}
        for meal_type, meals in existing_log["meals"].items():
            for meal in meals:
                total_macros["calories"] += meal["macros"]["calories"]
                total_macros["protein"] += meal["macros"]["protein"]
                total_macros["carbs"] += meal["macros"]["carbs"]
                total_macros["fat"] += meal["macros"]["fat"]
                total_macros["fiber"] += meal["macros"].get("fiber", 0.0)
        
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
            water_ml=existing_log.get("water_ml", 0.0),
            created_at=existing_log["created_at"],
            updated_at=existing_log["updated_at"]
        )
    else:
        # Create new daily log
        new_log = DailyFoodLog(
            user_id=user_id,
            date=log_datetime,
            meals={meal_type: [] for meal_type in valid_meals},
            total_macros={"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0}
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
            water_ml=log_dict.get("water_ml", 0.0),
            created_at=log_dict["created_at"],
            updated_at=log_dict["updated_at"]
        )

@router.post("/water", response_model=DailyFoodLogResponse)
async def log_water(
    body: dict = Body(..., description="Request body should contain { 'water_ml': <number> }"),
    target_date: Optional[date] = Query(None, description="Date to set water for (defaults to today)"),
    user_id: str = Depends(get_current_user_id)
):
    """Log or update daily water intake. Accepts flexible JSON body and returns helpful 422 messages."""
    # Defensive parsing of request body to provide clearer validation errors
    try:
        water_ml_raw = body.get("water_ml") if isinstance(body, dict) else None
    except Exception:
        water_ml_raw = None

    if water_ml_raw is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Missing required field 'water_ml' in request body")

    try:
        water_ml = float(water_ml_raw)
    except Exception:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="'water_ml' must be a number")

    if water_ml < 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="'water_ml' must be >= 0")

    db = get_database()
    food_logs_collection = db["food_logs"]

    log_date = target_date or date.today()
    log_datetime = datetime.combine(log_date, datetime.min.time())

    # Debug log to help reproduce client issues
    print(f"[food.water] user={user_id} date={log_date} water_ml={water_ml}")

    existing_log = await food_logs_collection.find_one({"user_id": user_id, "date": log_datetime})

    if existing_log:
        existing_log["water_ml"] = float(water_ml)
        existing_log["updated_at"] = datetime.utcnow()
        await food_logs_collection.replace_one({"_id": existing_log["_id"]}, existing_log)

        return DailyFoodLogResponse(
            id=str(existing_log["_id"]),
            user_id=existing_log["user_id"],
            date=log_date,
            meals=existing_log.get("meals", {}),
            total_macros=existing_log.get("total_macros", {}),
            water_ml=existing_log.get("water_ml", 0.0),
            created_at=existing_log.get("created_at"),
            updated_at=existing_log.get("updated_at")
        )

    # Create a new log if none exists
    new_log = DailyFoodLog(
        user_id=user_id,
        date=log_datetime,
        meals={"breakfast": [], "lunch": [], "snacks": [], "dinner": []},
        total_macros={"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0},
        water_ml=float(water_ml)
    )

    log_dict = new_log.dict(by_alias=True)
    result = await food_logs_collection.insert_one(log_dict)
    log_dict["_id"] = result.inserted_id

    return DailyFoodLogResponse(
        id=str(result.inserted_id),
        user_id=log_dict["user_id"],
        date=log_date,
        meals=log_dict["meals"],
        total_macros=log_dict["total_macros"],
        water_ml=log_dict.get("water_ml", 0.0),
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
            total_macros={"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0},
            water_ml=0.0
        )
        
        return DailyFoodLogResponse(
            id="",
            user_id=user_id,
            date=log_date,  # Return original date for API response
            meals=empty_log.meals,
            total_macros=empty_log.total_macros,
            water_ml=empty_log.water_ml,
            created_at=empty_log.created_at,
            updated_at=empty_log.updated_at
        )
    
    return DailyFoodLogResponse(
        id=str(daily_log["_id"]),
        user_id=daily_log["user_id"],
        date=log_date,  # Return original date for API response
        meals=daily_log["meals"],
        total_macros=daily_log["total_macros"],
        water_ml=daily_log.get("water_ml", 0.0),
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
            total_macros = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0, "fiber": 0.0}
            for meal_type_key, meals in daily_log["meals"].items():
                for meal in meals:
                    total_macros["calories"] += meal["macros"]["calories"]
                    total_macros["protein"] += meal["macros"]["protein"]
                    total_macros["carbs"] += meal["macros"]["carbs"]
                    total_macros["fat"] += meal["macros"]["fat"]
                    total_macros["fiber"] += meal["macros"].get("fiber", 0.0)
            
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

@router.post("/custom", response_model=FoodItem)
async def create_custom_food(
    custom_food: CustomFoodCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a custom food item"""
    db = get_database()
    custom_foods_collection = db["custom_foods"]
    
    # Validate input
    if custom_food.calories < 0 or custom_food.protein < 0 or custom_food.carbs < 0 or custom_food.fat < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nutritional values cannot be negative"
        )
    
    # Create custom food document
    custom_food_doc = {
        "user_id": user_id,
        "name": custom_food.name,
        "calories": custom_food.calories,
        "protein": custom_food.protein,
        "carbs": custom_food.carbs,
        "fat": custom_food.fat,
        "fiber": custom_food.fiber or 0,
        "sugar": custom_food.sugar or 0,
        "sodium": custom_food.sodium or 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    try:
        result = await custom_foods_collection.insert_one(custom_food_doc)
        custom_food_doc["_id"] = result.inserted_id
        
        return FoodItem(
            name=custom_food_doc["name"],
            calories=custom_food_doc["calories"],
            protein=custom_food_doc["protein"],
            carbs=custom_food_doc["carbs"],
            fat=custom_food_doc["fat"],
            fiber=custom_food_doc["fiber"],
            sugar=custom_food_doc["sugar"],
            sodium=custom_food_doc["sodium"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create custom food: {str(e)}"
        )

@router.get("/custom", response_model=FoodSearchResponse)
async def get_custom_foods(
    user_id: str = Depends(get_current_user_id)
):
    """Get user's custom foods"""
    db = get_database()
    custom_foods_collection = db["custom_foods"]
    
    try:
        custom_foods_cursor = custom_foods_collection.find({"user_id": user_id})
        custom_foods = await custom_foods_cursor.to_list(length=None)
        
        foods = []
        for food_doc in custom_foods:
            food_item = FoodItem(
                name=food_doc["name"],
                calories=food_doc["calories"],
                protein=food_doc["protein"],
                carbs=food_doc["carbs"],
                fat=food_doc["fat"],
                fiber=food_doc.get("fiber", 0),
                sugar=food_doc.get("sugar", 0),
                sodium=food_doc.get("sodium", 0)
            )
            foods.append(food_item)
        
        return FoodSearchResponse(
            foods=foods,
            total_results=len(foods)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get custom foods: {str(e)}"
        )
