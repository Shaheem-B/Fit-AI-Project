from PIL import Image
from io import BytesIO
import torch
from transformers.models.resnet import ResNetForImageClassification
from transformers import AutoImageProcessor
from google import genai
from app.core.config import settings
from typing import Dict, Any, Optional
import asyncio
from functools import lru_cache

# Label mapping from original app.py
LABEL_MAP = {
    0: "Skinny",
    1: "Ordinary",
    2: "Overweight",
    3: "Very Muscular",
    4: "Fat",
    5: "Skinny Fat"
}

# Initialize Gemini client
client = genai.Client(api_key=settings.GEMINI_API_KEY)

@lru_cache(maxsize=1)
def load_image_model():
    """Load and cache the image classification model."""
    processor = AutoImageProcessor.from_pretrained('glazzova/body_complexion')
    model = ResNetForImageClassification.from_pretrained('glazzova/body_complexion')
    model.eval()
    return processor, model

async def classify_body_image(image_bytes: bytes) -> str:
    """
    Classify body type from image bytes.
    Returns: Label string (Skinny, Ordinary, Overweight, Very Muscular)
    """
    def _classify():
        # Load image
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        
        # Load model
        processor, model = load_image_model()
        
        # Process and classify
        inputs = processor(image, return_tensors="pt")
        with torch.no_grad():
            logits = model(**inputs).logits
            label_id = int(logits.argmax(-1).item())
            label = LABEL_MAP.get(label_id, "Unknown")
        
        return label
    
    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _classify)

def compute_bmi(weight_kg: float, height_cm: float) -> Optional[float]:
    """Compute BMI from weight and height."""
    h_m = height_cm / 100.0
    if h_m <= 0:
        return None
    return round(weight_kg / (h_m * h_m), 1)

def build_plan_prompt(inputs: Dict[str, Any], classifier_label: str) -> str:
    """Build prompt for Gemini API (from original app.py)."""
    bmi = compute_bmi(inputs["weight"], inputs["height_cm"])
    diet_pref_line = f"- Diet preferences: {inputs.get('diet_prefs')}" if inputs.get('diet_prefs') else ""
    
    prompt = f"""
You are a certified nutritionist and strength & conditioning coach.
Create a visually engaging, professional, and concise 6-week fitness & nutrition plan summary (max 10 lines) for the user below.
Use clear bullet points, short sections, and relevant emojis for each section (e.g., 🥗, 🏋️, 💧, 🍗, 🥦, ⚡, ✅, 🔥, etc.).
Format for easy reading and impact.

**Include:**
• 1-line plan summary with a numeric adherence difficulty (1-10) and a fitting emoji
• Daily macronutrient split (protein, carbs, fat in grams and %) and total daily calories (use food emojis)
• 3-day sample meal plan (breakfast, lunch, dinner, snack) with brief, realistic food examples (use meal emojis)
• 1-week detailed workout plan: For each day, specify the muscle group, 2–3 exercises, sets, reps, rest, and a brief tip (use workout emojis)• 2 actionable tips for hydration and safety
• 1-line beginner variation and 1-line advanced variation 

**User Data:**
• Name: {inputs.get('name') or 'N/A'}
• Age: {inputs['age']}
• Sex: {inputs['sex']}
• Height: {inputs['height_cm']} cm
• Weight: {inputs['weight']} kg
• BMI: {bmi}
• Activity level: {inputs['activity_level']}
• Goal: {inputs['goal']}
• Body type: {classifier_label}
{diet_pref_line}
""".strip()
    return prompt

async def generate_with_gemini(prompt: str) -> str:
    """Generate text using Gemini API."""
    def _generate():
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=prompt
            )
            return response.text
        except Exception as e:
            raise Exception(f"Gemini API generation failed: {str(e)}")
    
    # Run in thread pool to avoid blocking
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _generate)

async def generate_personalized_plan(user_inputs: Dict[str, Any], classifier_label: str) -> str:
    """Generate personalized fitness plan."""
    prompt = build_plan_prompt(user_inputs, classifier_label)
    plan_text = await generate_with_gemini(prompt)
    return plan_text

async def chat_with_history(message: str, plan_id: Optional[str], user_id: str) -> str:
    """
    Chat with AI assistant.
    If plan_id is provided, context from that plan can be included.
    """
    # Build chat prompt
    prompt = f"User: {message}\nAssistant:"
    
    # If we have a plan_id, we could load context here
    # For now, simple response
    if plan_id:
        from app.db.mongodb import get_database
        from bson import ObjectId
        
        db = get_database()
        plans_collection = db["plans"]
        
        try:
            plan = await plans_collection.find_one({
                "_id": ObjectId(plan_id),
                "user_id": user_id
            })
            
            if plan:
                # Include plan context
                prompt = f"""You are a certified nutritionist and strength & conditioning coach.
The user has a personalized plan. Here's their plan summary:
{plan['plan_text'][:500]}

User question: {message}
Assistant:"""
        except:
            pass
    
    response = await generate_with_gemini(prompt)
    return response

