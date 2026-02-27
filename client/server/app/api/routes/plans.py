from fastapi import APIRouter, Depends, HTTPException, status
from app.models.plan import PlanCreate, PlanResponse
from app.core.security import get_current_user_id
from app.db.mongodb import get_database
from bson import ObjectId
from typing import List
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_data: PlanCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Save a new fitness plan."""
    db = get_database()
    plans_collection = db["plans"]
    
    plan_dict = {
        "user_id": user_id,
        "user_inputs": plan_data.user_inputs,
        "classifier_label": plan_data.classifier_label,
        "plan_text": plan_data.plan_text,
        "created_at": datetime.utcnow()
    }
    
    result = await plans_collection.insert_one(plan_dict)
    plan_dict["_id"] = result.inserted_id
    
    return PlanResponse(
        id=str(result.inserted_id),
        user_id=user_id,
        user_inputs=plan_dict["user_inputs"],
        classifier_label=plan_dict["classifier_label"],
        plan_text=plan_dict["plan_text"],
        created_at=plan_dict["created_at"]
    )

@router.get("/", response_model=List[PlanResponse])
async def get_user_plans(user_id: str = Depends(get_current_user_id)):
    """Get all plans for current user."""
    db = get_database()
    plans_collection = db["plans"]
    
    cursor = plans_collection.find({"user_id": user_id}).sort("created_at", -1)
    plans = await cursor.to_list(length=100)
    
    return [
        PlanResponse(
            id=str(plan["_id"]),
            user_id=plan["user_id"],
            user_inputs=plan["user_inputs"],
            classifier_label=plan["classifier_label"],
            plan_text=plan["plan_text"],
            created_at=plan["created_at"]
        )
        for plan in plans
    ]

@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get a specific plan by ID."""
    db = get_database()
    plans_collection = db["plans"]
    
    try:
        plan = await plans_collection.find_one({
            "_id": ObjectId(plan_id),
            "user_id": user_id
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan ID"
        )
    
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    return PlanResponse(
        id=str(plan["_id"]),
        user_id=plan["user_id"],
        user_inputs=plan["user_inputs"],
        classifier_label=plan["classifier_label"],
        plan_text=plan["plan_text"],
        created_at=plan["created_at"]
    )

@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: str,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a plan."""
    db = get_database()
    plans_collection = db["plans"]
    
    try:
        result = await plans_collection.delete_one({
            "_id": ObjectId(plan_id),
            "user_id": user_id
        })
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan ID"
        )
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )
    
    return {"message": "Plan deleted successfully"}

