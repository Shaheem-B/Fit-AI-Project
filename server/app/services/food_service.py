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
            # Fruits
            FoodItem(name="Apple", calories=52, protein=0.3, carbs=13.8, fat=0.2, fiber=2.4, sugar=10.4, sodium=1),
            FoodItem(name="Banana", calories=89, protein=1.1, carbs=22.8, fat=0.3, fiber=2.6, sugar=12.2, sodium=1),
            FoodItem(name="Orange", calories=47, protein=0.9, carbs=11.8, fat=0.1, fiber=2.4, sugar=9.4, sodium=0),
            FoodItem(name="Strawberries", calories=32, protein=0.7, carbs=7.7, fat=0.3, fiber=2.0, sugar=4.9, sodium=1),
            FoodItem(name="Blueberries", calories=57, protein=0.7, carbs=14.5, fat=0.3, fiber=2.4, sugar=10.0, sodium=1),
            FoodItem(name="Grapes", calories=69, protein=0.7, carbs=18.1, fat=0.2, fiber=0.9, sugar=15.5, sodium=2),
            FoodItem(name="Pineapple", calories=50, protein=0.5, carbs=13.1, fat=0.1, fiber=1.4, sugar=9.9, sodium=1),
            FoodItem(name="Mango", calories=60, protein=0.8, carbs=15.0, fat=0.4, fiber=1.6, sugar=13.7, sodium=1),
            FoodItem(name="Kiwi", calories=61, protein=1.1, carbs=14.7, fat=0.5, fiber=3.1, sugar=9.0, sodium=3),
            FoodItem(name="Pear", calories=57, protein=0.4, carbs=15.2, fat=0.1, fiber=3.1, sugar=9.8, sodium=1),

            # Vegetables
            FoodItem(name="Broccoli", calories=34, protein=2.8, carbs=7, fat=0.4, fiber=2.6, sugar=1.5, sodium=33),
            FoodItem(name="Spinach", calories=23, protein=2.9, carbs=3.6, fat=0.4, fiber=2.2, sugar=0.4, sodium=79),
            FoodItem(name="Carrots", calories=41, protein=0.9, carbs=9.6, fat=0.2, fiber=2.8, sugar=4.7, sodium=69),
            FoodItem(name="Sweet Potato", calories=86, protein=1.6, carbs=20.1, fat=0.1, fiber=3.0, sugar=4.2, sodium=55),
            FoodItem(name="Tomatoes", calories=18, protein=0.9, carbs=3.9, fat=0.2, fiber=1.2, sugar=2.6, sodium=5),
            FoodItem(name="Cucumber", calories=15, protein=0.7, carbs=3.6, fat=0.1, fiber=0.5, sugar=1.7, sodium=2),
            FoodItem(name="Bell Pepper", calories=31, protein=1.0, carbs=6.0, fat=0.3, fiber=2.1, sugar=4.2, sodium=4),
            FoodItem(name="Zucchini", calories=17, protein=1.2, carbs=3.1, fat=0.3, fiber=1.0, sugar=2.5, sodium=8),
            FoodItem(name="Avocado", calories=160, protein=2.0, carbs=8.5, fat=14.7, fiber=6.7, sugar=0.7, sodium=7),
            FoodItem(name="Lettuce", calories=15, protein=1.4, carbs=2.9, fat=0.2, fiber=1.3, sugar=0.8, sodium=28),

            # Proteins
            FoodItem(name="Chicken Breast", calories=165, protein=31, carbs=0, fat=3.6, fiber=0, sugar=0, sodium=74),
            FoodItem(name="Chicken Thigh", calories=209, protein=26, carbs=0, fat=10.9, fiber=0, sugar=0, sodium=82),
            FoodItem(name="Turkey Breast", calories=135, protein=30, carbs=0, fat=1.0, fiber=0, sugar=0, sodium=59),
            FoodItem(name="Ground Beef (80% lean)", calories=254, protein=20, carbs=0, fat=20, fiber=0, sugar=0, sodium=62),
            FoodItem(name="Salmon", calories=208, protein=25.4, carbs=0, fat=12.4, fiber=0, sugar=0, sodium=59),
            FoodItem(name="Tuna", calories=144, protein=25.4, carbs=0, fat=4.9, fiber=0, sugar=0, sodium=50),
            FoodItem(name="Eggs", calories=155, protein=13, carbs=1.1, fat=11, fiber=0, sugar=1.1, sodium=124),
            FoodItem(name="Greek Yogurt", calories=59, protein=10, carbs=3.6, fat=0.4, fiber=0, sugar=3.6, sodium=36),
            FoodItem(name="Cottage Cheese", calories=98, protein=11, carbs=3.4, fat=4.3, fiber=0, sugar=2.7, sodium=364),
            FoodItem(name="Tofu", calories=76, protein=8.1, carbs=1.9, fat=4.8, fiber=0.3, sugar=0.6, sodium=7),

            # Grains & Carbs
            FoodItem(name="White Rice", calories=130, protein=2.7, carbs=28, fat=0.3, fiber=0.4, sugar=0, sodium=1),
            FoodItem(name="Brown Rice", calories=112, protein=2.3, carbs=22, fat=0.9, fiber=1.8, sugar=0, sodium=5),
            FoodItem(name="Quinoa", calories=120, protein=4.4, carbs=21.3, fat=1.9, fiber=2.8, sugar=0.9, sodium=13),
            FoodItem(name="Oats", calories=379, protein=13.2, carbs=66.3, fat=6.9, fiber=10.6, sugar=0, sodium=2),
            FoodItem(name="Whole Wheat Bread", calories=247, protein=12.9, carbs=41.3, fat=3.2, fiber=6.3, sugar=5.0, sodium=490),
            FoodItem(name="White Bread", calories=265, protein=9.0, carbs=49.0, fat=3.2, fiber=2.7, sugar=5.0, sodium=490),
            FoodItem(name="Pasta", calories=157, protein=5.8, carbs=31.0, fat=0.9, fiber=1.8, sugar=0.6, sodium=1),
            FoodItem(name="Potatoes", calories=77, protein=2.0, carbs=17.0, fat=0.1, fiber=2.2, sugar=0.8, sodium=6),
            FoodItem(name="Corn", calories=86, protein=3.3, carbs=19.0, fat=1.2, fiber=2.7, sugar=3.2, sodium=15),

            # Dairy
            FoodItem(name="Milk (Whole)", calories=61, protein=3.2, carbs=4.8, fat=3.3, fiber=0, sugar=4.8, sodium=43),
            FoodItem(name="Milk (Skim)", calories=34, protein=3.4, carbs=5.1, fat=0.1, fiber=0, sugar=5.1, sodium=42),
            FoodItem(name="Cheddar Cheese", calories=402, protein=7.0, carbs=3.1, fat=33.0, fiber=0, sugar=0.5, sodium=621),
            FoodItem(name="Mozzarella Cheese", calories=280, protein=22.2, carbs=2.2, fat=17.1, fiber=0, sugar=1.0, sodium=619),
            FoodItem(name="Butter", calories=717, protein=0.9, carbs=0.1, fat=81.1, fiber=0, sugar=0.1, sodium=11),

            # Nuts & Seeds
            FoodItem(name="Almonds", calories=579, protein=21, carbs=22, fat=50, fiber=12, sugar=4.4, sodium=1),
            FoodItem(name="Walnuts", calories=654, protein=15, carbs=14, fat=65, fiber=6.7, sugar=2.6, sodium=2),
            FoodItem(name="Peanuts", calories=567, protein=26, carbs=16, fat=49, fiber=8.5, sugar=4.7, sodium=18),
            FoodItem(name="Chia Seeds", calories=486, protein=17, carbs=42, fat=31, fiber=34, sugar=0, sodium=16),
            FoodItem(name="Flax Seeds", calories=534, protein=18, carbs=29, fat=42, fiber=27, sugar=1.3, sodium=30),

            # Beverages
            FoodItem(name="Orange Juice", calories=49, protein=0.7, carbs=11.3, fat=0.2, fiber=0.2, sugar=8.4, sodium=1),
            FoodItem(name="Apple Juice", calories=46, protein=0.1, carbs=11.3, fat=0.1, fiber=0.2, sugar=9.6, sodium=4),
            FoodItem(name="Coffee (Black)", calories=1, protein=0.1, carbs=0, fat=0, fiber=0, sugar=0, sodium=2),
            FoodItem(name="Green Tea", calories=1, protein=0, carbs=0.3, fat=0, fiber=0, sugar=0, sodium=0),

            # Snacks & Sweets
            FoodItem(name="Dark Chocolate (70%)", calories=604, protein=7.8, carbs=46, fat=43, fiber=10.9, sugar=24, sodium=24),
            FoodItem(name="Honey", calories=304, protein=0.3, carbs=82.4, fat=0, fiber=0.2, sugar=82.1, sodium=4),
            FoodItem(name="Peanut Butter", calories=588, protein=25, carbs=20, fat=50, fiber=6, sugar=9, sodium=17),
            FoodItem(name="Granola", calories=471, protein=10, carbs=64, fat=20, fiber=7, sugar=20, sodium=35),

            # Oils & Fats
            FoodItem(name="Olive Oil", calories=884, protein=0, carbs=0, fat=100, fiber=0, sugar=0, sodium=2),
            FoodItem(name="Coconut Oil", calories=862, protein=0, carbs=0, fat=100, fiber=0, sugar=0, sodium=0),
            FoodItem(name="Avocado Oil", calories=884, protein=0, carbs=0, fat=100, fiber=0, sugar=0, sodium=0),

            # Legumes
            FoodItem(name="Black Beans", calories=132, protein=8.9, carbs=23.7, fat=0.5, fiber=8.9, sugar=0.3, sodium=2),
            FoodItem(name="Chickpeas", calories=164, protein=7.6, carbs=27.4, fat=2.6, fiber=7.6, sugar=4.8, sodium=24),
            FoodItem(name="Lentils", calories=116, protein=9.0, carbs=20.1, fat=0.4, fiber=7.9, sugar=1.8, sodium=2),
            FoodItem(name="Kidney Beans", calories=127, protein=8.7, carbs=22.8, fat=0.5, fiber=6.5, sugar=0.3, sodium=2),

            # Seafood
            FoodItem(name="Shrimp", calories=99, protein=20.4, carbs=0.3, fat=1.7, fiber=0, sugar=0, sodium=111),
            FoodItem(name="Cod", calories=82, protein=18.0, carbs=0, fat=0.7, fiber=0, sugar=0, sodium=54),
            FoodItem(name="Tilapia", calories=96, protein=20.1, carbs=0, fat=1.7, fiber=0, sugar=0, sodium=52),
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
