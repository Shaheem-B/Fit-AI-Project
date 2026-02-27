# app.py
import os
import streamlit as st
from PIL import Image
import torch
from transformers.models.resnet import ResNetForImageClassification
from transformers import (
    AutoImageProcessor,
    AutoTokenizer,
    AutoModelForCausalLM,
)
from io import BytesIO

# ------------------------
# Config / Constants
# ------------------------
LOCAL_MODEL_DEFAULT = "Qwen/Qwen2.5-1.5B-Instruct"
LABEL_MAP = {0: "Skinny", 1: "Ordinary", 2: "Overweight", 3: "Very Muscular"}

# ------------------------
# Local LLM loader (cached)
# ------------------------Qwen/Qwen2.5-1.5B-Instruct
@st.cache_resource
def load_local_llm(model_id=LOCAL_MODEL_DEFAULT):
    """
    Loads tokenizer + model locally (no quantization, full precision).
    Suitable for small models like Lukamac/PlayPart-AI-Personal-Trainer.
    """
    tokenizer = AutoTokenizer.from_pretrained(model_id, use_fast=True)

    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        device_map="auto",  # automatically choose CPU/GPU
    )
    model.eval()
    return tokenizer, model

def generate_with_local_llm(prompt, model_id=LOCAL_MODEL_DEFAULT, max_new_tokens=256):
    tokenizer, model = load_local_llm(model_id)
    inputs = tokenizer(prompt, return_tensors="pt", truncation=True, padding=True).to(model.device)
    # keep generation conservative to avoid long runs
    outputs = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        temperature=0.7,
        top_p=0.9,
        do_sample=False
    )
    return tokenizer.decode(outputs[0], skip_special_tokens=True).strip()

# ------------------------
# Image classifier loader (cached)
# ------------------------
@st.cache_resource
def load_image_model():
    processor = AutoImageProcessor.from_pretrained('glazzova/body_complexion', use_fast=True)
    model = ResNetForImageClassification.from_pretrained('glazzova/body_complexion')
    model.eval()
    return processor, model

# ------------------------
# Streamlit UI setup
# ------------------------
st.set_page_config(page_title="Personal Trainer Bot", layout="wide")
st.title("Personal Trainer Bot — diet & workout planner")

with st.sidebar:
    st.header("Settings")
    local_model_id = st.text_input("Local Model ID", value=LOCAL_MODEL_DEFAULT)
    st.markdown("**Note:** This loads the model locally on your machine. If you get OOM, use a smaller model or enable quantization.")

# ------------------------
# Session state init
# ------------------------
if "chat_history" not in st.session_state:
    # each entry: {"role": "user"|"assistant", "text": "..."}
    st.session_state.chat_history = []
if "last_plan_inputs" not in st.session_state:
    st.session_state.last_plan_inputs = None  # store inputs used for the plan (for context)

# ------------------------
# Inputs column (left) and chat column (right)
# ------------------------
col1, col2 = st.columns([1, 2])

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
    # display chat as stream of messages
    for msg in st.session_state.chat_history:
        if msg["role"] == "user":
            with st.chat_message("user"):
                st.markdown(msg["text"])
        else:
            with st.chat_message("assistant"):
                st.markdown(msg["text"])

    # chat input for follow-ups
    user_message = st.chat_input("Ask a follow-up question or adjust the plan...")

# ------------------------
# Helpers
# ------------------------
def compute_bmi(weight_kg, height_cm):
    h_m = height_cm / 100.0
    if h_m <= 0:
        return None
    return round(weight_kg / (h_m * h_m), 1)

def classify_image(image_pil):
    processor, model = load_image_model()
    inputs = processor(image_pil, return_tensors="pt")
    with torch.no_grad():
        logits = model(**inputs).logits
        label_id = int(logits.argmax(-1).item())
        label = LABEL_MAP.get(label_id, "Unknown")
    return label, label_id, logits.tolist()

def build_plan_prompt(inputs: dict, classifier_label: str):
    bmi = compute_bmi(inputs["weight"], inputs["height_cm"])
    diet_pref_line = f"- Diet preferences: {inputs.get('diet_prefs')}" if inputs.get('diet_prefs') else ""
    prompt = f"""
You are a professional certified nutritionist and strength & conditioning coach.
Given the user's data, create a personalized 6-week plan including:

1) A short 1-line summary and a numeric score (1-10) for adherence difficulty.
2) A tailored daily macro split and approximate daily calories (kcal).
3) A detailed 7-day meal plan with breakfast, lunch, dinner, and 1 snack each day (include portion guidance).
4) A progressive 6-week workout plan with sets, reps, tempo, rest, and recovery; include warm-ups/cooldowns and one recovery day weekly.
5) Tips about hydration, supplementation, and safety.
6) Two variations: beginner-friendly and advanced.
Return the plan in clear human-readable sections.

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
    # Build a single prompt reflecting the conversation (user + assistant)
    # This gets sent to the LLM for follow-ups.
    lines = []
    for m in st.session_state.chat_history:
        speaker = "User" if m["role"] == "user" else "Assistant"
        lines.append(f"{speaker}: {m['text']}")
    lines.append("Assistant:")
    return "\n".join(lines)

# ------------------------
# Generate initial plan flow
# ------------------------
if generate_btn:
    if uploaded_file is None:
        st.error("Please upload an image first.")
    else:
        # display image (updated param)
        image = Image.open(BytesIO(uploaded_file.read())).convert("RGB")
        st.image(image, caption="Uploaded image", use_container_width=True)

        # classify image
        with st.spinner("Classifying body type..."):
            try:
                classifier_label, classifier_id, _ = classify_image(image)
            except Exception as e:
                st.error(f"Image classification failed: {e}")
                classifier_label = "Unknown"

        st.success(f"Image classified as: **{classifier_label}**")

        # pack inputs and save to session (for context)
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

        # build prompt and call local LLM
        prompt = build_plan_prompt(inputs, classifier_label)
        with st.expander("Prompt sent to the model (debug)"):
            st.code(prompt[:4000] + ("..." if len(prompt) > 4000 else ""))

        with st.spinner("Generating personalized plan (this may take a bit)..."):
            try:
                reply = generate_with_local_llm(prompt, model_id=local_model_id, max_new_tokens=400)
            except RuntimeError as e:
                # Common OOM or device-placement errors
                st.error(
                    "Local model generation failed (likely OOM or device placement). "
                    "Try a smaller model or enable quantization (bitsandbytes)."
                )
                raise e

        # append conversation messages and show
        user_req_text = f"Generate personalized plan for user with inputs: {inputs}"
        st.session_state.chat_history.append({"role": "user", "text": user_req_text})
        st.session_state.chat_history.append({"role": "bot", "text": reply})

        # display latest messages without rerun
        with st.chat_message("user"):
            st.markdown(user_req_text)
        with st.chat_message("assistant"):
            st.markdown(reply)

# ------------------------
# Follow-up chat flow
# ------------------------
if user_message:
    # append user message
    st.session_state.chat_history.append({"role": "user", "text": user_message})
    # show it immediately
    with st.chat_message("user"):
        st.markdown(user_message)

    # build prompt from history (so model sees prior plan + follow-ups)
    full_prompt = build_chat_prompt_from_history()

    with st.spinner("Thinking..."):
        try:
            followup_reply = generate_with_local_llm(full_prompt, model_id=local_model_id, max_new_tokens=256)
        except RuntimeError:
            st.error("Model generation failed on follow-up. Consider lowering token length or using a smaller model.")
            followup_reply = "Sorry — I couldn't generate a response. Try again or use a smaller model."

    st.session_state.chat_history.append({"role": "bot", "text": followup_reply})
    with st.chat_message("assistant"):
        st.markdown(followup_reply)

# ------------------------
# Final note shown in UI
# ------------------------
st.caption("Tip: if local generation errors out (OOM) — switch to a smaller local model or set up 4-bit quantization with bitsandbytes.")
