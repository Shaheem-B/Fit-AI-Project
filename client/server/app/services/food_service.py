import httpx
from typing import List, Dict, Any
from app.models.food import FoodItem, FoodSearchResponse
from app.core.config import settings
import asyncio

class NutritionAPI:
    """Service for fetching food nutrition data"""
    
    def __init__(self):
        self.base_url = "https://api.edamam.com/api/food-database/v2"
        self.app_id = getattr(settings, 'EDAMAM_APP_ID', None)
        self.app_key = getattr(settings, 'EDAMAM_APP_KEY', None)
    
    async def search_food(self, query: str, limit: int = 20) -> FoodSearchResponse:
        """Search for food items using Edamam API"""
        if not self.app_id or not self.app_key:
            # Fallback to mock data if API keys not configured
            return await self._mock_search_food(query, limit)
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/parser",
                    params={
                        "q": query,
                        "app_id": self.app_id,
                        "app_key": self.app_key,
                        "limit": limit
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                
                foods = []
                for hint in data.get("hints", []):
                    food_data = hint.get("food", {})
                    nutrients = food_data.get("nutrients", {})
                    
                    food_item = FoodItem(
                        name=food_data.get("label", ""),
                        calories=nutrients.get("ENERC_KCAL", 0.0),
                        protein=nutrients.get("PROCNT", 0.0),
                        carbs=nutrients.get("CHOCDF", 0.0),
                        fat=nutrients.get("FAT", 0.0),
                        fiber=nutrients.get("FIBTG", 0.0),
                        sugar=nutrients.get("SUGAR", 0.0),
                        sodium=nutrients.get("NA", 0.0)
                    )
                    foods.append(food_item)
                
                return FoodSearchResponse(
                    foods=foods,
                    total_results=len(foods)
                )
                
            except Exception as e:
                print(f"Nutrition API error: {e}")
                # Fallback to mock data
                return await self._mock_search_food(query, limit)
    
    async def _mock_search_food(self, query: str, limit: int = 20) -> FoodSearchResponse:
        """Mock food data for testing when API is not available"""
        mock_foods = [
            FoodItem(name="Apple", calories=52, protein=0.3, carbs=13.8, fat=0.2, fiber=2.4, sugar=10.4, sodium=1),
            FoodItem(name="Banana", calories=89, protein=1.1, carbs=22.8, fat=0.3, fiber=2.6, sugar=12.2, sodium=1),
            FoodItem(name="Chicken Breast", calories=165, protein=31, carbs=0, fat=3.6, fiber=0, sugar=0, sodium=74),
            FoodItem(name="Boiled Egg", calories=155, protein=13, carbs=1.1, fat=11, fiber=0, sugar=1.1, sodium=124),
            FoodItem(name="White Rice", calories=130, protein=2.7, carbs=28, fat=0.3, fiber=0.4, sugar=0, sodium=1),
            FoodItem(name="Brown Rice", calories=112, protein=2.3, carbs=22, fat=0.9, fiber=1.8, sugar=0, sodium=5),
            FoodItem(name="Salmon", calories=208, protein=25.4, carbs=0, fat=12.4, fiber=0, sugar=0, sodium=59),
            FoodItem(name="Almonds", calories=579, protein=21, carbs=22, fat=50, fiber=12, sugar=4.4, sodium=1),
            FoodItem(name="Greek Yogurt", calories=59, protein=10, carbs=3.6, fat=0.4, fiber=0, sugar=3.6, sodium=36),
            FoodItem(name="Broccoli", calories=34, protein=2.8, carbs=7, fat=0.4, fiber=2.6, sugar=1.5, sodium=33),
        ]
        
        # Filter mock foods based on query
        filtered_foods = [
            food for food in mock_foods 
            if query.lower() in food.name.lower()
        ][:limit]
        
        # If no matches, return some general foods
        if not filtered_foods:
            filtered_foods = mock_foods[:limit]
        
        return FoodSearchResponse(
            foods=filtered_foods,
            total_results=len(filtered_foods)
        )

# Global instance
nutrition_api = NutritionAPI()

async def search_food_items(query: str, limit: int = 20) -> FoodSearchResponse:
    """Search for food items"""
    return await nutrition_api.search_food(query, limit)

def calculate_macros_for_quantity(food_item: FoodItem, quantity_grams: float) -> Dict[str, float]:
    """Calculate macros for a specific quantity of food"""
    multiplier = quantity_grams / 100.0  # Convert to per 100g basis
    
    return {
        "calories": round(food_item.calories * multiplier, 1),
        "protein": round(food_item.protein * multiplier, 1),
        "carbs": round(food_item.carbs * multiplier, 1),
        "fat": round(food_item.fat * multiplier, 1),
        "fiber": round((food_item.fiber or 0) * multiplier, 1),
        "sugar": round((food_item.sugar or 0) * multiplier, 1),
        "sodium": round((food_item.sodium or 0) * multiplier, 1)
    }
