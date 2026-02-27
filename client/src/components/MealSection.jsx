import { useState } from 'react'
import { foodAPI } from '../services/api'
import toast from 'react-hot-toast'
import FoodItemCard from './FoodItemCard'
import { Loader2 } from 'lucide-react'

export default function MealSection({ mealType, meals, onFoodRemoved, dailyLogId }) {
  const [removingIndex, setRemovingIndex] = useState(null)

  const handleRemoveFood = async (foodIndex) => {
    if (!dailyLogId) {
      toast.error('Cannot remove food: daily log not found')
      return
    }

    setRemovingIndex(foodIndex)
    try {
      await foodAPI.deleteFoodLog(dailyLogId, mealType, foodIndex)
      toast.success('Food item removed')
      onFoodRemoved()
    } catch (error) {
      toast.error('Failed to remove food item')
    } finally {
      setRemovingIndex(null)
    }
  }

  const getMealEmoji = (type) => {
    switch (type) {
      case 'breakfast': return '🌅'
      case 'lunch': return '☀️'
      case 'snacks': return '🍎'
      case 'dinner': return '🌙'
      default: return '🍽️'
    }
  }

  const getMealTitle = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  const calculateMealTotals = () => {
    if (!meals || meals.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    }

    return meals.reduce((totals, meal) => ({
      calories: totals.calories + meal.macros.calories,
      protein: totals.protein + meal.macros.protein,
      carbs: totals.carbs + meal.macros.carbs,
      fat: totals.fat + meal.macros.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  }

  const mealTotals = calculateMealTotals()

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <span className="mr-2">{getMealEmoji(mealType)}</span>
          {getMealTitle(mealType)}
        </h3>
        <div className="text-sm text-gray-600">
          {meals.length} item{meals.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Meal Totals */}
      {mealTotals.calories > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Totals:</h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
            <div>Calories: {Math.round(mealTotals.calories)}</div>
            <div>Protein: {Math.round(mealTotals.protein * 10) / 10}g</div>
            <div>Carbs: {Math.round(mealTotals.carbs * 10) / 10}g</div>
            <div>Fat: {Math.round(mealTotals.fat * 10) / 10}g</div>
          </div>
        </div>
      )}

      {/* Food Items */}
      <div className="space-y-3">
        {meals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🍽️</div>
            <p>No items yet</p>
            <p className="text-sm">Add foods from the search panel</p>
          </div>
        ) : (
          meals.map((food, index) => (
            <div key={index} className="relative">
              <FoodItemCard
                food={food}
                onRemove={() => handleRemoveFood(index)}
                showRemove={true}
              />
              {removingIndex === index && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
