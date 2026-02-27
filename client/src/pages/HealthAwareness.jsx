import { useEffect, useState } from 'react'
import { healthAPI } from '../services/api'
import { Heart, Zap, AlertCircle, Droplets, Moon, Activity, Target, Apple, Shield, Brain, Zap as Lightning, Info } from 'lucide-react'

const colorForRisk = (level) => {
  if (level === 'High' || level === 'High Risk' || level === 'Poor' || level === 'Dehydration Risk' || level === 'High Stress') return 'bg-red-100 border-red-400 text-red-800'
  if (level === 'Moderate' || level === 'Moderate Risk' || level === 'Fair' || level === 'Needs Improvement' || level === 'Moderate Stress') return 'bg-yellow-100 border-yellow-400 text-yellow-800'
  if (level === 'Elevated') return 'bg-orange-100 border-orange-400 text-orange-800'
  return 'bg-green-100 border-green-400 text-green-800'
}

export default function HealthAwareness() {
  const [items, setItems] = useState([])
  const [confidence, setConfidence] = useState('medium')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        // prefer auto-derived awareness when available
        let data = null
        try {
          data = await healthAPI.getHealthAwareness()
        } catch (e) {
          data = await healthAPI.getAwareness()
        }
        setItems(data.items || data)
        setConfidence(data.confidence_level || 'medium')
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="p-6 text-center">Loading...</div>

  if (!items || items.length === 0) return (
    <div className="max-w-3xl mx-auto p-6 text-center">
      <p className="text-gray-600">No health profile found. Please complete your profile first.</p>
    </div>
  )

  const iconFor = (name) => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes('hydration')) return <Droplets className="w-5 h-5 text-blue-500" />
    if (lowerName.includes('sleep')) return <Moon className="w-5 h-5 text-indigo-500" />
    if (lowerName.includes('blood pressure') || lowerName.includes('bp')) return <Activity className="w-5 h-5 text-red-500" />
    if (lowerName.includes('diabetes')) return <Zap className="w-5 h-5 text-yellow-500" />
    if (lowerName.includes('cardiovascular') || lowerName.includes('cholesterol')) return <Heart className="w-5 h-5 text-red-500" />
    if (lowerName.includes('obesity') || lowerName.includes('weight')) return <Target className="w-5 h-5 text-orange-500" />
    if (lowerName.includes('gut') || lowerName.includes('fiber')) return <Apple className="w-5 h-5 text-green-500" />
    if (lowerName.includes('nutrient') || lowerName.includes('deficiency')) return <Shield className="w-5 h-5 text-purple-500" />
    if (lowerName.includes('stress') || lowerName.includes('mental')) return <Brain className="w-5 h-5 text-pink-500" />
    if (lowerName.includes('metabolic')) return <Lightning className="w-5 h-5 text-orange-500" />
    if (lowerName.includes('muscle')) return <Activity className="w-5 h-5 text-blue-500" />
    return <AlertCircle className="w-5 h-5 text-gray-500" />
  }

  const confidenceColor = confidence === 'high' ? 'text-green-600' : confidence === 'medium' ? 'text-yellow-600' : 'text-red-600'
  const confidenceText = confidence === 'high' ? 'High confidence' : confidence === 'medium' ? 'Medium confidence' : 'Low confidence'

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50 to-red-100 text-red-600 shadow-lg">
            <Heart className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Health Awareness</h1>
            <p className="text-base text-gray-600 mt-1">Personalized lifestyle insights based on your data</p>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className={`p-4 rounded-xl border-2 backdrop-blur-sm ${
          confidence === 'high' 
            ? 'bg-emerald-50 border-emerald-200' 
            : confidence === 'medium' 
            ? 'bg-amber-50 border-amber-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <p className={`text-sm font-semibold ${
            confidence === 'high' 
              ? 'text-emerald-700' 
              : confidence === 'medium' 
              ? 'text-amber-700' 
              : 'text-red-700'
          }`}>
            📊 Data Confidence
          </p>
          <p className={`text-2xl font-bold mt-2 ${
            confidence === 'high' 
              ? 'text-emerald-600' 
              : confidence === 'medium' 
              ? 'text-amber-600' 
              : 'text-red-600'
          }`}>
            {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
          </p>
        </div>
        <div className="p-4 rounded-xl border-2 bg-blue-50 border-blue-200">
          <p className="text-sm font-semibold text-blue-700">ℹ️ Disclaimer</p>
          <p className="text-sm text-blue-600 mt-2">For awareness only. Not medical advice. Consult professionals.</p>
        </div>
      </div>

      {/* Health Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {items.map((it) => (
          <div key={it.name} className="card-elevated hover:shadow-2xl group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-blue-100 group-hover:to-violet-100 transition-all">
                  {iconFor(it.name)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{it.name}</h3>
                  {it.numeric_score > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            it.numeric_score < 40 ? 'bg-emerald-500' :
                            it.numeric_score < 70 ? 'bg-amber-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(it.numeric_score, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 min-w-fit">{it.numeric_score}%</span>
                    </div>
                  )}
                </div>
              </div>

              <span className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ml-2 ${colorForRisk(it.risk_level)}`}>
                {it.risk_level}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-gray-800 mb-2">Key Factors</h4>
                <div className="flex flex-wrap gap-2">
                  {(it.reasons || []).length ? it.reasons.map((f, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">{f}</span>
                  )) : <div className="text-xs text-gray-500">No contributing factors flagged.</div>}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-800 mb-2">💡 Improvement Tips</h4>
                <div className="text-sm text-gray-700">{it.improvement_hint || 'No specific tips available'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-sm text-blue-800">
          <strong>Important:</strong> These insights are lifestyle-based awareness indicators, not medical diagnoses.
          They are calculated using your food logs, workout data, and wearable information to provide personalized awareness.
          Consult healthcare professionals for personalized medical advice and diagnosis.
        </p>
      </div>
    </div>
  )
}
