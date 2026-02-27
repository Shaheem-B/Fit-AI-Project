import { useState, useEffect } from 'react'


import { BarChart3, PieChart, TrendingUp } from 'lucide-react'

export default function NutritionAnalyzer({ dailyLog, dailyGoals }) {
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => {
    if (dailyLog?.total_macros) {
      analyzeNutrition()
    }
  }, [dailyLog, dailyGoals])

  const analyzeNutrition = () => {
    const macros = dailyLog.total_macros
    const goals = dailyGoals

    // Macronutrient breakdown
    const totalCalories = macros.calories
    const proteinCals = macros.protein * 4
    const carbCals = macros.carbs * 4
    const fatCals = macros.fat * 9

    const macroBreakdown = {
      protein: {
        grams: macros.protein,
        calories: proteinCals,
        percentage: totalCalories > 0 ? (proteinCals / totalCalories) * 100 : 0,
        goal: goals.protein,
        status: macros.protein >= goals.protein ? 'good' : macros.protein >= goals.protein * 0.8 ? 'fair' : 'poor'
      },
      carbs: {
        grams: macros.carbs,
        calories: carbCals,
        percentage: totalCalories > 0 ? (carbCals / totalCalories) * 100 : 0,
        goal: goals.carbs,
        status: macros.carbs <= goals.carbs * 1.2 && macros.carbs >= goals.carbs * 0.8 ? 'good' : 'fair'
      },
      fat: {
        grams: macros.fat,
        calories: fatCals,
        percentage: totalCalories > 0 ? (fatCals / totalCalories) * 100 : 0,
        goal: goals.fat,
        status: macros.fat <= goals.fat * 1.2 && macros.fat >= goals.fat * 0.7 ? 'good' : 'fair'
      }
    }

    // Quality analysis
    const qualityScore = calculateQualityScore(macroBreakdown, totalCalories, goals.calories)

    setAnalysis({
      macroBreakdown,
      qualityScore,
      totalCalories,
      calorieStatus: totalCalories >= goals.calories * 0.9 && totalCalories <= goals.calories * 1.1 ? 'optimal' :
                     totalCalories > goals.calories * 1.1 ? 'excess' : 'deficit'
    })
  }

  const calculateQualityScore = (macros, totalCals, goalCals) => {
    let score = 0

    // Protein quality (40% weight)
    if (macros.protein.grams >= macros.protein.goal) score += 40
    else if (macros.protein.grams >= macros.protein.goal * 0.8) score += 25
    else if (macros.protein.grams >= macros.protein.goal * 0.6) score += 10

    // Calorie accuracy (30% weight)
    const calAccuracy = Math.abs(totalCals - goalCals) / goalCals
    if (calAccuracy <= 0.1) score += 30
    else if (calAccuracy <= 0.2) score += 20
    else if (calAccuracy <= 0.3) score += 10

    // Macro balance (30% weight)
    const proteinPct = macros.protein.percentage
    const carbPct = macros.carbs.percentage
    const fatPct = macros.fat.percentage

    // Ideal ranges: Protein 20-35%, Carbs 40-60%, Fat 20-35%
    let balanceScore = 0
    if (proteinPct >= 20 && proteinPct <= 35) balanceScore += 10
    if (carbPct >= 40 && carbPct <= 60) balanceScore += 10
    if (fatPct >= 20 && fatPct <= 35) balanceScore += 10

    score += balanceScore

    return Math.min(100, score)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50'
      case 'fair': return 'text-yellow-600 bg-yellow-50'
      case 'poor': return 'text-red-600 bg-red-50'
      case 'optimal': return 'text-green-600 bg-green-50'
      case 'excess': return 'text-red-600 bg-red-50'
      case 'deficit': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'good': return 'Good'
      case 'fair': return 'Fair'
      case 'poor': return 'Needs Work'
      case 'optimal': return 'Optimal'
      case 'excess': return 'Excess'
      case 'deficit': return 'Deficit'
      default: return 'Unknown'
    }
  }

  if (!analysis) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
          Nutrition Analysis
        </h2>
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Add some food to see nutrition analysis</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
        Nutrition Analysis
      </h2>

      {/* Quality Score */}
      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Nutrition Quality Score</span>
          <span className="text-lg font-bold text-primary-600">{analysis.qualityScore}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${analysis.qualityScore}%` }}
          />
        </div>
        <div className="text-xs text-gray-600 mt-1">
          {analysis.qualityScore >= 80 ? 'Excellent nutrition balance!' :
           analysis.qualityScore >= 60 ? 'Good overall balance' :
           analysis.qualityScore >= 40 ? 'Room for improvement' :
           'Consider adjusting your food choices'}
        </div>
      </div>

      {/* Calorie Status */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Calorie Status</span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(analysis.calorieStatus)}`}>
            {getStatusText(analysis.calorieStatus)}
          </span>
        </div>
      </div>

      {/* Macronutrient Breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center">
          <PieChart className="w-4 h-4 mr-1" />
          Macronutrient Breakdown
        </h3>

        {Object.entries(analysis.macroBreakdown).map(([macro, data]) => (
          <div key={macro} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium capitalize">{macro}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.status)}`}>
                {getStatusText(data.status)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600 mb-2">
              <div>{data.grams.toFixed(1)}g</div>
              <div>{Math.round(data.calories)} cal</div>
              <div>{Math.round(data.percentage)}%</div>
            </div>

            <div className="text-xs text-gray-500">
              Goal: {data.goal}g • {macro === 'protein' ? '20-35%' : macro === 'carbs' ? '40-60%' : '20-35%'} of calories
            </div>

            <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
              <div
                className={`h-1 rounded-full ${
                  macro === 'protein' ? 'bg-green-500' :
                  macro === 'carbs' ? 'bg-yellow-500' : 'bg-orange-500'
                }`}
                style={{ width: `${Math.min(data.percentage * 3.33, 100)}%` }} // Scale for visibility
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center">
          <TrendingUp className="w-4 h-4 mr-1" />
          Recommendations
        </h4>
        <div className="text-xs text-yellow-700 space-y-1">
          {analysis.macroBreakdown.protein.status === 'poor' && (
            <div>• Increase protein intake with chicken, fish, eggs, or legumes</div>
          )}
          {analysis.calorieStatus === 'deficit' && (
            <div>• Add nutrient-dense foods to meet calorie goals</div>
          )}
          {analysis.calorieStatus === 'excess' && (
            <div>• Consider portion control or lighter meal options</div>
          )}
          {analysis.macroBreakdown.fat.grams < analysis.macroBreakdown.fat.goal * 0.7 && (
            <div>• Include healthy fats like avocado, nuts, and olive oil</div>
          )}
          {analysis.qualityScore < 60 && (
            <div>• Focus on balanced meals with all macronutrients</div>
          )}
        </div>
      </div>
    </div>
  )
}