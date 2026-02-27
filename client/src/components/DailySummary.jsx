import toast from 'react-hot-toast'
import { foodAPI } from '../services/api'

export default function DailySummary({ dailyLog, dailyGoals, onWaterUpdated }) {
  const totalMacros = dailyLog?.total_macros || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  
  // Ensure all values are numbers and not NaN
  const safeTotalMacros = {
    calories: totalMacros.calories || 0,
    protein: totalMacros.protein || 0,
    carbs: totalMacros.carbs || 0,
    fat: totalMacros.fat || 0,
    fiber: totalMacros.fiber || 0
  }

  const getProgressPercentage = (current, goal) => {
    if (goal === 0) return 0
    return Math.min(Math.round((current / goal) * 100), 100)
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const progressData = [
    {
      name: 'Calories',
      current: Math.round(safeTotalMacros.calories),
      goal: dailyGoals.calories,
      unit: 'cal',
      color: 'bg-blue-500'
    },
    {
      name: 'Protein',
      current: Math.round(safeTotalMacros.protein * 10) / 10,
      goal: dailyGoals.protein,
      unit: 'g',
      color: 'bg-green-500'
    },
    {
      name: 'Carbs',
      current: Math.round(safeTotalMacros.carbs * 10) / 10,
      goal: dailyGoals.carbs,
      unit: 'g',
      color: 'bg-yellow-500'
    },
    {
      name: 'Fat',
      current: Math.round(safeTotalMacros.fat * 10) / 10,
      goal: dailyGoals.fat,
      unit: 'g',
      color: 'bg-orange-500'
    },
    {
      name: 'Fiber',
      current: Math.round(safeTotalMacros.fiber * 10) / 10,
      goal: dailyGoals.fiber,
      unit: 'g',
      color: 'bg-green-600'
    }
  ]

  return (
    <div className="card">
      <h2 className="text-xl font-semibold mb-4">Daily Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {progressData.map((item) => {
          const percentage = getProgressPercentage(item.current, item.goal)
          const progressColor = getProgressColor(percentage)
          
          return (
            <div key={item.name} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  {item.name}
                </span>
                <span className="text-sm text-gray-600">
                  {item.current} / {item.goal} {item.unit}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${item.color}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              
              <div className="text-xs text-gray-500 text-right">
                {percentage}% of goal
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round(totalMacros.calories)}
            </div>
            <div className="text-sm text-gray-600">Total Calories</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(totalMacros.protein * 10) / 10}g
            </div>
            <div className="text-sm text-gray-600">Protein</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-yellow-600">
              {Math.round(totalMacros.carbs * 10) / 10}g
            </div>
            <div className="text-sm text-gray-600">Carbs</div>
          </div>
          
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {Math.round((safeTotalMacros.fat || 0) * 10) / 10}g
            </div>
            <div className="text-sm text-gray-600">Fat</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-green-600">
              {Math.round((safeTotalMacros.fiber || 0) * 10) / 10}g
            </div>
            <div className="text-sm text-gray-600">Fiber</div>
          </div>

          <div>
            <div className="text-2xl font-bold text-blue-500">
              {dailyLog?.water_ml ? Math.round(dailyLog.water_ml) : 0}ml
            </div>
            <div className="text-sm text-gray-600">Water</div>
            <div className="mt-2">
              <button
                onClick={async () => {
                  const input = prompt('Enter water intake in ml:', dailyLog?.water_ml || 0)
                  if (input === null) return
                  const val = Math.max(0, parseInt(input, 10) || 0)
                  try {
                    await import('../services/api').then(m => m.foodAPI.logWater(val, undefined))
                    if (typeof onWaterUpdated === 'function') onWaterUpdated()
                    toast.success('Water intake updated')
                  } catch (e) {
                    const msg = e?.response?.data?.detail || e?.message || 'Failed to update water intake'
                    toast.error(msg)
                  }
                }}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Remaining */}
      {totalMacros.calories > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Remaining:</span>
                <div className="text-lg font-semibold text-blue-600">
                  {Math.max(0, dailyGoals.calories - Math.round(totalMacros.calories))} cal
                </div>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <div className={`text-lg font-semibold ${
                  totalMacros.calories >= dailyGoals.calories * 1.1 ? 'text-red-600' :
                  totalMacros.calories >= dailyGoals.calories * 0.9 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {totalMacros.calories >= dailyGoals.calories * 1.1 ? 'Over Goal' :
                   totalMacros.calories >= dailyGoals.calories * 0.9 ? 'Near Goal' :
                   'Under Goal'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nutrition Insights */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Quick Insights</h3>
        <div className="text-xs text-blue-700 space-y-1">
          {totalMacros.protein < dailyGoals.protein * 0.7 && (
            <div>• Consider adding more protein-rich foods</div>
          )}
          {totalMacros.carbs > dailyGoals.carbs * 1.2 && (
            <div>• High carb intake - balance with vegetables</div>
          )}
          {totalMacros.fat < dailyGoals.fat * 0.5 && (
            <div>• Add healthy fats like avocado or nuts</div>
          )}
          {totalMacros.calories < dailyGoals.calories * 0.8 && (
            <div>• Room for nutrient-dense foods</div>
          )}
          {totalMacros.calories === 0 && (
            <div>• Start your day with a balanced breakfast!</div>
          )}
        </div>
      </div>
    </div>
  )
}
