import { useState, useEffect } from 'react'
import { useFoodStore } from '../store/foodStore'
import { foodAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Calendar, Plus, Trash2, Clock } from 'lucide-react'

export default function MealPlanner({ onMealPlanned }) {
  const [plannedMeals, setPlannedMeals] = useState({})
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newMeal, setNewMeal] = useState({
    meal_type: 'breakfast',
    food_name: '',
    quantity: '',
    time: '08:00'
  })

  // Load planned meals for selected date
  useEffect(() => {
    loadPlannedMeals()
  }, [selectedDate])

  const loadPlannedMeals = async () => {
    try {
      // For now, we'll use localStorage to store planned meals
      // In a real app, this would be stored in the database
      const stored = localStorage.getItem(`mealPlan_${selectedDate}`)
      if (stored) {
        setPlannedMeals(JSON.parse(stored))
      } else {
        setPlannedMeals({
          breakfast: [],
          lunch: [],
          snacks: [],
          dinner: []
        })
      }
    } catch (error) {
      console.error('Failed to load planned meals:', error)
    }
  }

  const savePlannedMeals = (meals) => {
    localStorage.setItem(`mealPlan_${selectedDate}`, JSON.stringify(meals))
    setPlannedMeals(meals)
  }

  const handleAddMeal = async () => {
    if (!newMeal.food_name.trim() || !newMeal.quantity) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      // Search for the food to get nutrition data
      const searchResult = await foodAPI.searchFood(newMeal.food_name)
      if (!searchResult.foods || searchResult.foods.length === 0) {
        toast.error('Food not found')
        return
      }

      const foodData = searchResult.foods[0]
      const quantity = parseFloat(newMeal.quantity)

      const plannedMealItem = {
        food_name: foodData.name,
        quantity: quantity,
        meal_type: newMeal.meal_type,
        time: newMeal.time,
        macros: {
          calories: Math.round((foodData.calories * quantity) / 100),
          protein: Math.round((foodData.protein * quantity) / 100 * 10) / 10,
          carbs: Math.round((foodData.carbs * quantity) / 100 * 10) / 10,
          fat: Math.round((foodData.fat * quantity) / 100 * 10) / 10
        },
        planned_at: new Date().toISOString()
      }

      const updatedMeals = { ...plannedMeals }
      updatedMeals[newMeal.meal_type].push(plannedMealItem)
      savePlannedMeals(updatedMeals)

      setNewMeal({
        meal_type: 'breakfast',
        food_name: '',
        quantity: '',
        time: '08:00'
      })
      setShowAddForm(false)
      toast.success('Meal planned successfully!')
    } catch (error) {
      toast.error('Failed to plan meal')
    }
  }

  const handleRemoveMeal = (mealType, index) => {
    const updatedMeals = { ...plannedMeals }
    updatedMeals[mealType].splice(index, 1)
    savePlannedMeals(updatedMeals)
    toast.success('Meal removed from plan')
  }

  const handleExecuteMeal = async (meal) => {
    try {
      await foodAPI.logFood({
        food_name: meal.food_name,
        quantity: meal.quantity,
        meal_type: meal.meal_type
      })
      toast.success(`${meal.food_name} logged to ${meal.meal_type}!`)
      onMealPlanned && onMealPlanned()
    } catch (error) {
      toast.error('Failed to log meal')
    }
  }

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast': return '🌅'
      case 'lunch': return '☀️'
      case 'snacks': return '🍪'
      case 'dinner': return '🌙'
      default: return '🍽️'
    }
  }

  const totalPlannedCalories = Object.values(plannedMeals).flat().reduce((sum, meal) => sum + meal.macros.calories, 0)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-primary-600" />
          Meal Planner
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Plan Meal
        </button>
      </div>

      {/* Date Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Plan for Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field"
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* Add Meal Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium mb-3">Add Planned Meal</h4>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Meal Type</label>
              <select
                value={newMeal.meal_type}
                onChange={(e) => setNewMeal({...newMeal, meal_type: e.target.value})}
                className="input-field text-sm"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="snacks">Snacks</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={newMeal.time}
                onChange={(e) => setNewMeal({...newMeal, time: e.target.value})}
                className="input-field text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Food Name</label>
              <input
                type="text"
                value={newMeal.food_name}
                onChange={(e) => setNewMeal({...newMeal, food_name: e.target.value})}
                className="input-field text-sm"
                placeholder="e.g., Chicken Breast, Banana"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity (grams)</label>
              <input
                type="number"
                value={newMeal.quantity}
                onChange={(e) => setNewMeal({...newMeal, quantity: e.target.value})}
                className="input-field text-sm"
                placeholder="100"
                min="1"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddMeal} className="btn-primary text-sm flex-1">
              Add to Plan
            </button>
            <button onClick={() => setShowAddForm(false)} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Planned Meals Summary */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-800">Total Planned Calories:</span>
          <span className="text-lg font-bold text-blue-600">{totalPlannedCalories}</span>
        </div>
      </div>

      {/* Meals List */}
      <div className="space-y-4">
        {Object.entries(plannedMeals).map(([mealType, meals]) => (
          <div key={mealType} className="border border-gray-200 rounded-lg p-3">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <span className="mr-2">{getMealIcon(mealType)}</span>
              {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
              <span className="ml-2 text-sm text-gray-500">({meals.length} items)</span>
            </h3>

            {meals.length > 0 ? (
              <div className="space-y-2">
                {meals.map((meal, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{meal.food_name}</div>
                      <div className="text-xs text-gray-600 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {meal.time} • {meal.quantity}g • {meal.macros.calories} cal
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExecuteMeal(meal)}
                        className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                      >
                        Log
                      </button>
                      <button
                        onClick={() => handleRemoveMeal(mealType, index)}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 italic">No meals planned</div>
            )}
          </div>
        ))}
      </div>

      {Object.values(plannedMeals).flat().length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No meals planned for this date</p>
          <p className="text-xs">Plan your meals ahead to stay on track!</p>
        </div>
      )}
    </div>
  )
}