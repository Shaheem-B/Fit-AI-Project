from PIL import Image
from io import BytesIO
import torch
import torch.nn as nn
from transformers.models.resnet import ResNetForImageClassification
from transformers import AutoImageProcessor, ViTImageProcessor, ViTModel, ViTConfig
from huggingface_hub import hf_hub_download
from app.core.config import settings
from typing import Dict, Any, Optional
import asyncio
from functools import lru_cache
import os
import requests

# Label mapping
LABEL_MAP = {
    0: "Skinny",
    1: "Ordinary",
    2: "Overweight",
    3: "Very Muscular",
    4: "Fat",
    5: "Skinny Fat"
}

# Groq API settings
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

@lru_cache(maxsize=1)
def load_image_model():
    """Load and cache the image classification model."""
    processor = AutoImageProcessor.from_pretrained('glazzova/body_complexion')
    model = ResNetForImageClassification.from_pretrained('glazzova/body_complexion')
    model.eval()
    return processor, model

# ── ViT Height & Weight Model ──────────────────────────────────────────
VIT_MODEL_ID = "Rithankoushik/Finetuned_VITmodel"

class ViTRegression(nn.Module):
    """Custom ViT model for height and weight regression."""
    def __init__(self, model_name, state_dict):
        super().__init__()
        # Use add_pooling_layer=True if the checkpoint expects it
        self.vit = ViTModel.from_pretrained(model_name, add_pooling_layer=True)
        
        def build_dynamic_head(prefix):
            layers = []
            # Indices observed in checkpoints: 0, 3
            # Index 1 is ReLU, 2 is Dropout
            
            # Layer 0
            w0 = state_dict.get(f"{prefix}.0.weight")
            if w0 is not None:
                if len(w0.shape) == 2:
                    layers.append(nn.Linear(w0.shape[1], w0.shape[0]))
                else:
                    layers.append(nn.LayerNorm(w0.shape[0]))
            
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(0.1))
            
            # Layer 3
            w3 = state_dict.get(f"{prefix}.3.weight")
            if w3 is not None:
                if len(w3.shape) == 2:
                    layers.append(nn.Linear(w3.shape[1], w3.shape[0]))
                else:
                    layers.append(nn.LayerNorm(w3.shape[0]))
            
            return nn.Sequential(*layers)

        self.feature_extractor = build_dynamic_head("feature_extractor")
        self.height_head = build_dynamic_head("height_head")
        self.weight_head = build_dynamic_head("weight_head")

    def forward(self, pixel_values):
        outputs = self.vit(pixel_values)
        # Use CLS token from last_hidden_state
        cls_token = outputs.last_hidden_state[:, 0, :]
        features = self.feature_extractor(cls_token)
        height = self.height_head(features)
        weight = self.weight_head(features)
        return {"height": height, "weight": weight}

@lru_cache(maxsize=1)
def load_vit_model():
    """Download and cache the finetuned ViT model for height/weight prediction."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model_path = hf_hub_download(repo_id=VIT_MODEL_ID, filename="best_model.pt")
    
    # Load checkpoint
    checkpoint = torch.load(model_path, map_location=device, weights_only=False)
    state_dict = checkpoint.get("model_state_dict", checkpoint)
    dataset_stats = checkpoint.get("dataset_stats", {})
    model_name = checkpoint.get("model_name", "google/vit-base-patch16-224")

    # Clean state dict (remove 'module.' if present)
    new_state_dict = {k.replace('module.', ''): v for k, v in state_dict.items()}

    # Initialize architecture dynamically from state_dict
    model = ViTRegression(model_name, new_state_dict)
    model.load_state_dict(new_state_dict, strict=False) # strict=False to allow for minor misses like pooler
    model.to(device)
    model.eval()
        
    processor = ViTImageProcessor.from_pretrained("google/vit-base-patch16-224")
    return model, processor, dataset_stats, device

async def predict_height_weight(image_bytes: bytes) -> dict:
    """Predict height (cm) and weight (kg) from an image using the finetuned ViT model."""
    def _predict():
        model, processor, dataset_stats, device = load_vit_model()
        
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        inputs = processor(images=image, return_tensors="pt").to(device)
        with torch.no_grad():
            outputs = model(inputs["pixel_values"])
            
        height_norm = outputs["height"].item()
        weight_norm = outputs["weight"].item()
            
        height_cm = height_norm * dataset_stats.get("height_std", 1.0) + dataset_stats.get("height_mean", 0.0)
        weight_kg = weight_norm * dataset_stats.get("weight_std", 1.0) + dataset_stats.get("weight_mean", 0.0)
        
        return {
            "height_cm": round(height_cm, 1),
            "weight_kg": round(weight_kg, 1),
        }
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _predict)

# ── Body-type classifier ───────────────────────────────────────────────
async def classify_body_image(image_bytes: bytes) -> str:
    """Classify body type from image bytes."""
    def _classify():
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        processor, model = load_image_model()
        inputs = processor(image, return_tensors="pt")
        with torch.no_grad():
            logits = model(**inputs).logits
            label_id = int(logits.argmax(-1).item())
            label = LABEL_MAP.get(label_id, "Unknown")
        return label

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _classify)

def compute_bmi(weight_kg: float, height_cm: float) -> Optional[float]:
    h_m = height_cm / 100.0
    if h_m <= 0:
        return None
    return round(weight_kg / (h_m * h_m), 1)

def build_plan_prompt(inputs: Dict[str, Any], classifier_label: str) -> str:
    bmi = compute_bmi(inputs["weight"], inputs["height_cm"])
    diet_pref_line = f"- Diet preferences: {inputs.get('diet_prefs')}" if inputs.get('diet_prefs') else ""
    
    prompt = f"""
You are a **certified nutritionist and elite strength & conditioning coach**.
Create a **high-impact, visually attractive, and easy-to-follow 6-week fitness & nutrition plan**.

Use:
• Clean bullet points
• Short punchy lines
• Clear section headers
• Relevant emojis (🥗 🏋️ 💧 🍳 🥩 🔥 ⚡ ✅)
• No long paragraphs

---

🔥 PLAN SNAPSHOT
• Goal-focused 1-line summary
• Adherence difficulty: **X / 10** (with emoji)

---

🍽️ DAILY NUTRITION TARGETS
• Calories: **XXXX kcal**
• Protein: **XX g (XX%)** 🥩
• Carbs: **XX g (XX%)** 🍚
• Fats: **XX g (XX%)** 🥑

---

🥗 WEEKLY MEAL PLAN (SUN → SAT)
Provide **simple, realistic meals** for each day.

**Sunday 🥗**
• Breakfast 🍳:
• Lunch 🍱:
• Dinner 🍽️:
• Snack 🍎:

**Monday 🥗**
• Breakfast 🍳:
• Lunch 🍱:
• Dinner 🍽️:
• Snack 🍎:

**Tuesday 🥗**
• Breakfast 🍳:
• Lunch 🍱:
• Dinner 🍽️:
• Snack 🍎:

**Wednesday 🥗**
• Breakfast 🍳:
• Lunch 🍱:
• Dinner 🍽️:
• Snack 🍎:

**Thursday 🥗**
• Breakfast 🍳:
• Lunch 🍱:
• Dinner 🍽️:
• Snack 🍎:

**Friday 🥗**
• Breakfast 🍳:
• Lunch 🍱:
• Dinner 🍽️:
• Snack 🍎:

**Saturday 🥗**
• Breakfast 🍳:
• Lunch 🍱:
• Dinner 🍽️:
• Snack 🍎:

---

🏋️ WEEKLY WORKOUT PLAN (SUN → SAT)
Give **day-wise workouts** with clarity and motivation.

**Sunday 🏋️**
• Focus:
• Exercises:
• Sets × Reps:
• Rest:
• Coach Tip ⚡:

**Monday 🏋️**
• Focus:
• Exercises:
• Sets × Reps:
• Rest:
• Coach Tip ⚡:

**Tuesday 🏋️**
• Focus:
• Exercises:
• Sets × Reps:
• Rest:
• Coach Tip ⚡:

**Wednesday 🏋️**
• Focus:
• Exercises:
• Sets × Reps:
• Rest:
• Coach Tip ⚡:

**Thursday 🏋️**
• Focus:
• Exercises:
• Sets × Reps:
• Rest:
• Coach Tip ⚡:

**Friday 🏋️**
• Focus:
• Exercises:
• Sets × Reps:
• Rest:
• Coach Tip ⚡:

**Saturday 🏋️**
• Focus:
• Exercises:
• Sets × Reps:
• Rest:
• Coach Tip ⚡:

---

💧 HYDRATION & SAFETY
• Tip 1:
• Tip 2:

---

🔁 VARIATIONS
• Beginner Version 👶:
• Advanced Version 🦍:

---

📋 USER PROFILE
• Name: {inputs.get('name') or 'N/A'}
• Age: {inputs['age']}
• Sex: {inputs['sex']}
• Height: {inputs['height_cm']} cm
• Weight: {inputs['weight']} kg
• BMI: {bmi}
• Activity Level: {inputs['activity_level']}
• Goal: {inputs['goal']}
• Body Type: {classifier_label}
{diet_pref_line}
""".strip()
    return prompt

async def generate_with_groq(prompt: str) -> str:
    """Generate text using Groq API."""
    def _generate():
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "openai/gpt-oss-20b",  # Example Groq model
            "messages": [
                {"role": "system", "content": "You are a helpful nutrition and fitness coach."},
                {"role": "user", "content": prompt}
            ]
        }
        response = requests.post(GROQ_API_URL, headers=headers, json=data)
        response.raise_for_status()
        res_json = response.json()
        return res_json["choices"][0]["message"]["content"]

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _generate)

async def generate_personalized_plan(user_inputs: Dict[str, Any], classifier_label: str) -> str:
    """Generate personalized fitness plan using Groq API."""
    prompt = build_plan_prompt(user_inputs, classifier_label)
    plan_text = await generate_with_groq(prompt)
    return plan_text

async def chat_with_history(message: str, plan_id: Optional[str], user_id: str) -> str:
    """Chat with AI assistant using Groq API."""
    prompt = f"User: {message}\nAssistant:"
    
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
                prompt = f"""You are a certified nutritionist and strength & conditioning coach.
The user has a personalized plan. Here's their plan summary:
{plan['plan_text'][:500]}

User question: {message}
Assistant:"""
        except:
            pass
    
    response = await generate_with_groq(prompt)
    return response
