from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import uvicorn
import json

from app.core.config import settings
from app.api.routes import auth, users, ai, plans, food, workout, analytics, health
from app.api.routes import health_insights
from app.api.routes import wearables
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.services.wearable_service import run_daily_sync_loop
import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting lifespan...")
    try:
        await connect_to_mongo()
        print("MongoDB connected successfully")
    except Exception as e:
        print(f"ERROR during MongoDB connection: {e}")
        import traceback
        traceback.print_exc()
        raise
    print("Lifespan startup complete")
    yield
    # Shutdown
    print("Starting shutdown...")
    try:
        await close_mongo_connection()
        print("MongoDB closed successfully")
    except Exception as e:
        print(f"ERROR during MongoDB close: {e}")
        import traceback
        traceback.print_exc()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    """Log validation errors for debugging"""
    errors = exc.errors()
    print(f"[VALIDATION ERROR] Path: {request.url.path}")
    print(f"[VALIDATION ERROR] Method: {request.method}")
    print(f"[VALIDATION ERROR] Details: {json.dumps(errors, indent=2)}")
    print(f"[VALIDATION ERROR] Body: {await request.body()}")
    # Return the default FastAPI validation error response
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=422,
        content={"detail": errors},
    )

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])
app.include_router(food.router, prefix="/api/food", tags=["food"])
app.include_router(workout.router, prefix="/api/workout", tags=["workout"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(health_insights.router, prefix="/api/health", tags=["health_insights"])
app.include_router(wearables.router, prefix="/api/wearables", tags=["wearables"])


@app.get("/")
async def root():
    return {"message": "Personal Trainer Bot API", "version": settings.VERSION}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )

