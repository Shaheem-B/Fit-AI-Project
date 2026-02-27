from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from app.core.security import get_current_user_id
from app.services.ai_service import classify_body_image, generate_personalized_plan, chat_with_history
from app.models.plan import ChatRequest
import json
from typing import Optional

router = APIRouter()

@router.post("/classify-image")
async def classify_image(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id)
):
    """Classify body type from uploaded image."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Read image bytes
    image_bytes = await file.read()
    
    # Classify image
    try:
        label = await classify_body_image(image_bytes)
        return {"classifier_label": label}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image classification failed: {str(e)}"
        )

@router.post("/generate-plan")
async def generate_plan(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    age: int = Form(...),
    sex: str = Form(...),
    weight: float = Form(...),
    height_cm: float = Form(...),
    activity_level: str = Form(...),
    goal: str = Form(...),
    diet_prefs: Optional[str] = Form(None),
    user_id: str = Depends(get_current_user_id)
):
    """Generate personalized fitness plan with image classification."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    # Read image bytes
    image_bytes = await file.read()
    
    # Classify image
    try:
        classifier_label = await classify_body_image(image_bytes)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image classification failed: {str(e)}"
        )
    
    # Prepare user inputs
    user_inputs = {
        "name": name,
        "age": age,
        "sex": sex,
        "weight": weight,
        "height_cm": height_cm,
        "activity_level": activity_level,
        "goal": goal,
        "diet_prefs": diet_prefs
    }
    
    # Generate plan
    try:
        plan_text = await generate_personalized_plan(user_inputs, classifier_label)
        
        return {
            "classifier_label": classifier_label,
            "user_inputs": user_inputs,
            "plan_text": plan_text
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Plan generation failed: {str(e)}"
        )

@router.post("/chat")
async def chat(
    request: ChatRequest,
    user_id: str = Depends(get_current_user_id)
):
    """Chat with AI assistant."""
    try:
        response = await chat_with_history(request.message, request.plan_id, user_id)
        return {"response": response}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}"
        )

