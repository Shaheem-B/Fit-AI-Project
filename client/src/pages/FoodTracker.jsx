import { useState, useEffect } from 'react'
import { useFoodStore } from '../store/foodStore'
import { foodAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Loader2, Calendar, Target } from 'lucide-react'
import FoodSearch from '../components/FoodSearch'
import FoodItemCard from '../components/FoodItemCard'
import MealSection from '../components/MealSection'
import DailySummary from '../components/DailySummary'
import MealPlanner from '../components/MealPlanner'
import NutritionAnalyzer from '../components/NutritionAnalyzer'

export default function FoodTracker() {
  const {
    dailyLog,
    selectedDate,
    setSelectedDate,
    setDailyLog,
    dailyGoals,
    setDailyGoals
  } = useFoodStore()
  
  const [loading, setLoading] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [rightPanelTab, setRightPanelTab] = useState('planner') // 'planner' or 'analyzer'

  // Load daily log when date changes
  useEffect(() => {
    loadDailyLog()
  }, [selectedDate])

  const loadDailyLog = async () => {
    setLoading(true)
    try {
      const log = await foodAPI.getDailyLog(selectedDate)
      setDailyLog(log)
    } catch (error) {
      toast.error('Failed to load daily food log')
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate)
    setDatePickerOpen(false)
  }

  const handleFoodLogged = () => {
    // Reload the daily log to get updated data
    loadDailyLog()
  }

  const handleGoalUpdate = (newGoals) => {
    setDailyGoals(newGoals)
    toast.success('Daily goals updated!')
  }

  if (loading && !dailyLog) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-orange-100 to-red-200 text-orange-700 shadow-lg">
              <span className="text-3xl">🍎</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Food Tracker
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Track your daily nutrition and achieve your health goals</p>
            </div>
          </div>
          
          {/* Date Picker */}
          <div className="relative">
            <button
              onClick={() => setDatePickerOpen(!datePickerOpen)}
              className="btn-primary flex items-center px-5 py-3"
            >
              <Calendar className="w-5 h-5 mr-2" />
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </button>
            
            {datePickerOpen && (
              <div className="absolute right-0 top-full mt-3 bg-white border border-gray-200 rounded-xl shadow-xl z-10 card-elevated">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="p-3 border-0 outline-none rounded-lg text-gray-900 font-medium"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column - Food Search & Daily Goals */}
        <div className="lg:col-span-1 space-y-6">
          {/* Daily Goals */}
          <div className="card-elevated">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-3 text-orange-700">
                <span>🎯</span> Daily Goals
              </h2>
              <button
                onClick={() => {
                  const newGoals = {
                    calories: parseFloat(prompt('Calories goal:', dailyGoals.calories)) || dailyGoals.calories,
                    protein: parseFloat(prompt('Protein goal (g):', dailyGoals.protein)) || dailyGoals.protein,
                    carbs: parseFloat(prompt('Carbs goal (g):', dailyGoals.carbs)) || dailyGoals.carbs,
                    fat: parseFloat(prompt('Fat goal (g):', dailyGoals.fat)) || dailyGoals.fat,
                    fiber: parseFloat(prompt('Fiber goal (g):', dailyGoals.fiber)) || dailyGoals.fiber
                  }
                  handleGoalUpdate(newGoals)
                }}
                className="text-sm text-orange-600 hover:text-orange-700 font-bold transition-colors"
              >
                ✏️ Edit
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-100">
                <p className="text-sm text-gray-600 font-medium">Calories</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{dailyGoals.calories}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-100">
                <p className="text-sm text-gray-600 font-medium">Protein</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{dailyGoals.protein}<span className="text-sm">g</span></p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-100">
                <p className="text-sm text-gray-600 font-medium">Carbs</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{dailyGoals.carbs}<span className="text-sm">g</span></p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-4 border border-rose-100">
                <p className="text-sm text-gray-600 font-medium">Fat</p>
                <p className="text-2xl font-bold text-rose-600 mt-1">{dailyGoals.fat}<span className="text-sm">g</span></p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                <p className="text-sm text-gray-600 font-medium">Fiber</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{dailyGoals.fiber}<span className="text-sm">g</span></p>
              </div>
            </div>
          </div>

          {/* Food Search */}
          <FoodSearch onFoodLogged={handleFoodLogged} />
        </div>

        {/* Middle Column - Meals & Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Summary */}
          <DailySummary dailyLog={dailyLog} dailyGoals={dailyGoals} onWaterUpdated={loadDailyLog} />

          {/* Meals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MealSection
              mealType="breakfast"
              meals={dailyLog?.meals?.breakfast || []}
              onFoodRemoved={loadDailyLog}
              dailyLogId={dailyLog?.id}
            />
            
            <MealSection
              mealType="lunch"
              meals={dailyLog?.meals?.lunch || []}
              onFoodRemoved={loadDailyLog}
              dailyLogId={dailyLog?.id}
            />
            
            <MealSection
              mealType="snacks"
              meals={dailyLog?.meals?.snacks || []}
              onFoodRemoved={loadDailyLog}
              dailyLogId={dailyLog?.id}
            />
            
            <MealSection
              mealType="dinner"
              meals={dailyLog?.meals?.dinner || []}
              onFoodRemoved={loadDailyLog}
              dailyLogId={dailyLog?.id}
            />
          </div>
        </div>

        {/* Right Column - Meal Planner & Nutrition Analyzer */}
        <div className="lg:col-span-1">
          {/* Tab Navigation */}
          <div className="card-elevated mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setRightPanelTab('planner')}
                className={`flex-1 px-4 py-3 text-sm font-bold transition-all ${
                  rightPanelTab === 'planner'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📅 Planner
              </button>
              <button
                onClick={() => setRightPanelTab('analyzer')}
                className={`flex-1 px-4 py-3 text-sm font-bold transition-all ${
                  rightPanelTab === 'analyzer'
                    ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Analysis
              </button>
            </div>

            {/* Tab Content */}
            {rightPanelTab === 'planner' ? (
              <MealPlanner onMealPlanned={loadDailyLog} />
            ) : (
              <NutritionAnalyzer dailyLog={dailyLog} dailyGoals={dailyGoals} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
