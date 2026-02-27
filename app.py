import os
import streamlit as st
from PIL import Image
from io import BytesIO
import requests
from dotenv import load_dotenv
from google import genai
# ------------------------
# Image classifier (local)
# ------------------------
from transformers.models.resnet import ResNetForImageClassification  
from transformers import AutoImageProcessor
import torch
# Load Gemini API key
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

client = genai.Client(api_key=GEMINI_API_KEY)

LABEL_MAP = {0: "Skinny", 1: "Ordinary", 2: "Overweight", 3: "Very Muscular"}

@st.cache_resource
def load_image_model():
    processor = AutoImageProcessor.from_pretrained('glazzova/body_complexion')
    model = ResNetForImageClassification.from_pretrained('glazzova/body_complexion')
    model.eval()
    return processor, model

def classify_image(image_pil):
    processor, model = load_image_model()
    inputs = processor(image_pil, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits
        label_id = int(logits.argmax(-1).item())
        label = LABEL_MAP.get(label_id, "Unknown")
    return label

# Gemini API helper
def generate_with_gemini(prompt: str, max_tokens: int = 600, temperature: float = 0.7):
    # NOTE: The current Gemini API client does not support max_tokens or temperature as arguments.
    # These parameters are kept for compatibility but are not used in the API call.
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        return response.text
    except Exception as e:
        st.error(f"Gemini API generation failed: {e}")
        return "Error generating response."
# Helpers
def compute_bmi(weight_kg, height_cm):
    h_m = height_cm / 100.0
    if h_m <= 0:
        return None
    return round(weight_kg / (h_m * h_m), 1)

def build_plan_prompt(inputs: dict, classifier_label: str):
    bmi = compute_bmi(inputs["weight"], inputs["height_cm"])
    diet_pref_line = f"- Diet preferences: {inputs.get('diet_prefs')}" if inputs.get('diet_prefs') else ""
    prompt = f"""
You are a professional certified nutritionist and strength & conditioning coach.
Given the user's data, create a concise summary (max 10 lines) for a 6-week plan including:

- 1-line summary and numeric adherence difficulty (1-10)
- Daily macro split and calories
- 3-day sample meal plan (breakfast, lunch, dinner, snack)
- 1-week sample workout plan (sets, reps, rest)
- 2 tips for hydration/safety
- Beginner and advanced variation (1 line each)

User details:
- Name: {inputs.get('name') or 'N/A'}
- Age: {inputs['age']}
- Sex: {inputs['sex']}
- Height (cm): {inputs['height_cm']}
- Weight (kg): {inputs['weight']}
- BMI (approx): {bmi}
- Activity level: {inputs['activity_level']}
- Goal: {inputs['goal']}
- Image-classified body type: {classifier_label}
{diet_pref_line}
""".strip()
    return prompt

def build_chat_prompt_from_history():
    lines = []
    for m in st.session_state.chat_history:
        speaker = "User" if m["role"] == "user" else "Assistant"
        lines.append(f"{speaker}: {m['text']}")
    lines.append("Assistant:")
    return "\n".join(lines)

# ------------------------
# Streamlit UI
st.set_page_config(page_title="Personal Trainer Bot", layout="wide")
st.title("Personal Trainer Bot — diet & workout planner")

# ------------------------
# Session state
# ------------------------
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "last_plan_inputs" not in st.session_state:
    st.session_state.last_plan_inputs = None

# ------------------------
# Inputs & chat columns
# ------------------------
col1, col2 = st.columns([1,2])

with col1:
    st.subheader("User inputs")
    name = st.text_input("Name (optional)")
    weight = st.number_input("Weight (kg)", min_value=20.0, max_value=300.0, value=70.0, step=0.5)
    height_cm = st.number_input("Height (cm)", min_value=100.0, max_value=250.0, value=170.0, step=0.5)
    goal = st.selectbox("Primary goal", ["Gain weight / muscle", "Maintain", "Lose fat / get lean", "Improve performance / athletic"])
    activity_level = st.selectbox("Activity level", ["Sedentary", "Lightly active", "Moderately active", "Active", "Very active"])
    age = st.number_input("Age", min_value=10, max_value=100, value=25, step=1)
    sex = st.selectbox("Sex", ["Male", "Female", "Other / Prefer not to say"])
    diet_prefs = st.text_input("Diet preferences (optional)", placeholder="e.g. vegetarian, low carb, high protein")
    uploaded_file = st.file_uploader("Upload a person's image (jpg/png)", type=["jpg","jpeg","png"])
    generate_btn = st.button("Generate personalized plan")

with col2:
    st.subheader("Chat (ask follow-ups)")
    for msg in st.session_state.chat_history:
        if msg["role"] == "user":
            with st.chat_message("user"):
                st.markdown(msg["text"])
        else:
            with st.chat_message("assistant"):
                st.markdown(msg["text"])
    user_message = st.chat_input("Ask a follow-up question or adjust the plan...")

# ------------------------
# Generate initial plan
# ------------------------
if generate_btn:
    if uploaded_file is None:
        st.error("Please upload an image first.")
    else:
        image = Image.open(BytesIO(uploaded_file.read())).convert("RGB")
        st.image(image, caption="Uploaded image", use_container_width=True)

        with st.spinner("Classifying body type..."):
            try:
                classifier_label = classify_image(image)
            except Exception as e:
                st.error(f"Image classification failed: {e}")
                classifier_label = "Unknown"
        st.success(f"Image classified as: **{classifier_label}**")

        inputs = {
            "name": name,
            "weight": weight,
            "height_cm": height_cm,
            "age": age,
            "sex": sex,
            "activity_level": activity_level,
            "goal": goal,
            "diet_prefs": diet_prefs,
            "classifier_label": classifier_label
        }
        st.session_state.last_plan_inputs = inputs

        prompt = build_plan_prompt(inputs, classifier_label)
        with st.expander("Prompt sent to Gemini API (debug)"):
            st.code(prompt[:4000] + ("..." if len(prompt) > 4000 else ""))

        with st.spinner("Generating personalized plan..."):
            reply = generate_with_gemini(prompt, max_tokens=400)

        user_req_text = f"Generate personalized plan for user with inputs: {inputs}"
        st.session_state.chat_history.append({"role": "user", "text": user_req_text})
        st.session_state.chat_history.append({"role": "bot", "text": reply})

        with st.chat_message("user"):
            st.markdown(user_req_text)
        with st.chat_message("assistant"):
            st.markdown(reply)

# ------------------------
# Follow-up chat
# ------------------------
if user_message:
    st.session_state.chat_history.append({"role": "user", "text": user_message})
    with st.chat_message("user"):
        st.markdown(user_message)

    full_prompt = build_chat_prompt_from_history()
    with st.spinner("Thinking..."):
        followup_reply = generate_with_gemini(full_prompt, max_tokens=256)

    st.session_state.chat_history.append({"role": "bot", "text": followup_reply})
    with st.chat_message("assistant"):
        st.markdown(followup_reply)

st.caption("Tip: This app uses Gemini API for plan generation and local GPU only for image classification.")
