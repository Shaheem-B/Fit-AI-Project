from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db = Database()

async def connect_to_mongo():
    """Connect to MongoDB."""
    print("Connecting to MongoDB...")
    db.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db.db = db.client[settings.MONGODB_DB_NAME]
    print("Connected to MongoDB successfully")

async def close_mongo_connection():
    """Close MongoDB connection."""
    print("Closing MongoDB connection...")
    db.client.close()
    print("MongoDB connection closed")

def get_database():
    """Get database instance."""
    return db.db

