# FitAI Backend (FastAPI)

Backend API for the Personal Trainer Bot application.

## Setup

1. **Create virtual environment:**
```bash
python -m venv venv
```

2. **Activate virtual environment:**
```bash
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables:**

Create a `.env` file in the server directory:
```env
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=fitness_ai
SECRET_KEY=your-secret-key-change-in-production
GEMINI_API_KEY=your-gemini-api-key
```

5. **Run the server:**
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Structure

```
server/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── auth.py      # Authentication endpoints
│   │       ├── users.py     # User management
│   │       ├── ai.py        # AI classification & generation
│   │       └── plans.py     # Fitness plans CRUD
│   ├── core/
│   │   ├── config.py        # Configuration
│   │   └── security.py      # JWT & password hashing
│   ├── db/
│   │   └── mongodb.py       # Database connection
│   ├── models/
│   │   ├── user.py          # User models
│   │   └── plan.py          # Plan models
│   └── services/
│       └── ai_service.py    # AI logic (classification & Gemini)
├── main.py                  # FastAPI application
└── requirements.txt
```

## Key Features

- **JWT Authentication** with bcrypt password hashing
- **MongoDB** for data persistence
- **Image Classification** using Hugging Face Transformers
- **AI Text Generation** using Google Gemini API
- **Async/Await** for better performance
- **CORS** enabled for frontend integration

## Dependencies

Main packages:
- `fastapi` - Web framework
- `motor` - Async MongoDB driver
- `python-jose` - JWT tokens
- `passlib` - Password hashing
- `transformers` - Hugging Face models
- `torch` - PyTorch for model inference
- `google-genai` - Gemini API client

## Testing

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest
```

## Deployment

For production:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

Or use Docker:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

