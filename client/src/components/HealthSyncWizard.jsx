import { useState, useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Smartphone, Watch, PenTool, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'

export default function HealthSyncWizard({ isOpen, onClose, onSuccess, existingProfile = {}, workoutData = {}, foodData = {} }) {
  const [step, setStep] = useState(1) // 1: source | 2: data | 3: confirm
  const [source, setSource] = useState('phone_app')
  const [loading, setLoading] = useState(false)
  const [syncComplete, setSyncComplete] = useState(false)

  const token = useAuthStore((state) => state.token)

  const [formData, setFormData] = useState({
    avg_steps: 0,
    avg_sleep_hours: 0,
    resting_heart_rate: null
  })

  // Pre-fill from existing data
  useEffect(() => {
    if (!isOpen) return
    
    let prefilledSteps = existingProfile.avg_steps || 8000
    let prefilledSleep = existingProfile.avg_sleep_hours || (existingProfile.sleep_hours || 7)
    let prefilledHR = existingProfile.resting_heart_rate || null

    // Try to infer from workout/food data
    if (workoutData?.daily_calories_burned) {
      // rough estimate: 100 steps ≈ 5 cal
      prefilledSteps = Math.max(prefilledSteps, Math.round(workoutData.daily_calories_burned * 20))
    }

    setFormData({
      avg_steps: prefilledSteps,
      avg_sleep_hours: prefilledSleep,
      resting_heart_rate: prefilledHR
    })
  }, [isOpen, existingProfile, workoutData, foodData])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'resting_heart_rate' 
        ? (value === '' ? null : Math.max(0, Math.min(150, Number(value))))
        : (name === 'avg_sleep_hours' ? Number(value) : Number(value))
    }))
  }

  const validateData = () => {
    if (formData.avg_steps < 0 || formData.avg_steps > 50000) {
      toast.error('Steps must be between 0 and 50,000')
      return false
    }
    if (formData.avg_sleep_hours < 0 || formData.avg_sleep_hours > 24) {
      toast.error('Sleep hours must be between 0 and 24')
      return false
    }
    if (formData.resting_heart_rate && (formData.resting_heart_rate < 30 || formData.resting_heart_rate > 150)) {
      toast.error('Resting heart rate must be between 30-150 bpm')
      return false
    }
    return true
  }

  const calculateConfidenceScore = () => {
    let score = 0.8
    if (formData.resting_heart_rate) score += 0.2
    if (source === 'smartwatch') score = Math.min(score, 0.95)
    else if (source === 'phone_app') score = Math.min(score, 0.85)
    else score = Math.min(score, 0.75)
    return Math.round(score * 100)
  }

  const getDataQualityLabel = (score) => {
    if (score >= 90) return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-50' }
    if (score >= 80) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' }
    if (score >= 70) return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { label: 'Poor', color: 'text-red-600', bg: 'bg-red-50' }
  }

  const handleSubmit = async () => {
    if (!validateData()) return

    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          avg_steps: formData.avg_steps,
          avg_sleep_hours: formData.avg_sleep_hours,
          resting_heart_rate: formData.resting_heart_rate,
          source
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to sync health data')
      }

      setSyncComplete(true)
      toast.success('Health data synced successfully!')
      
      setTimeout(() => {
        onSuccess?.()
        handleClose()
      }, 2000)
    } catch (error) {
      console.error('Sync error:', error)
      toast.error(error.message || 'Failed to sync health data')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setSyncComplete(false)
    setSource('phone_app')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {syncComplete ? 'Sync Complete' : 'Smart Health Data Sync'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {syncComplete ? (
            // Success State
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-green-100 rounded-full">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Health Data Connected</h3>
              <p className="text-sm text-gray-600">
                Your health metrics have been synced successfully. This data will help improve your personalized insights.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Daily Steps:</span>
                  <span className="ml-2 text-gray-900">{formData.avg_steps.toLocaleString()}</span>
                </div>
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Avg Sleep:</span>
                  <span className="ml-2 text-gray-900">{formData.avg_sleep_hours} hours</span>
                </div>
                {formData.resting_heart_rate && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Resting HR:</span>
                    <span className="ml-2 text-gray-900">{formData.resting_heart_rate} bpm</span>
                  </div>
                )}
              </div>
            </div>
          ) : step === 1 ? (
            // Step 1: Data Source Selection
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Where is your health data coming from?
              </p>
              {[
                { id: 'smartwatch', label: 'Smartwatch', icon: Watch, desc: 'Apple Watch, Wear OS, Garmin' },
                { id: 'phone_app', label: 'Phone App', icon: Smartphone, desc: 'Google Fit, Health app' },
                { id: 'manual', label: 'Manual Entry', icon: PenTool, desc: 'Enter data manually' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSource(opt.id)}
                  className={`w-full p-4 rounded-lg border-2 transition flex items-start gap-3 ${
                    source === opt.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <opt.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    source === opt.id ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{opt.label}</div>
                    <div className="text-xs text-gray-500">{opt.desc}</div>
                  </div>
                </button>
              ))}
              <button
                onClick={() => setStep(2)}
                className="w-full mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : step === 2 ? (
            // Step 2: Data Input
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Enter your average health metrics
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Average Daily Steps
                </label>
                <input
                  type="number"
                  name="avg_steps"
                  value={formData.avg_steps}
                  onChange={handleInputChange}
                  min="0"
                  max="50000"
                  step="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. 8000"
                />
                <p className="text-xs text-gray-500 mt-1">Typical range: 3,000 - 15,000</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Average Sleep per Night
                </label>
                <input
                  type="number"
                  name="avg_sleep_hours"
                  value={formData.avg_sleep_hours}
                  onChange={handleInputChange}
                  min="0"
                  max="24"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. 7.5"
                />
                <p className="text-xs text-gray-500 mt-1">Hours per night</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resting Heart Rate <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="number"
                  name="resting_heart_rate"
                  value={formData.resting_heart_rate || ''}
                  onChange={handleInputChange}
                  min="30"
                  max="150"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. 60"
                />
                <p className="text-xs text-gray-500 mt-1">BPM (beats per minute) - measured at rest</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                >
                  Review <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            // Step 3: Confirmation
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Review your health data before syncing
              </p>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Daily Steps</p>
                    <p className="text-lg font-bold text-gray-900">{formData.avg_steps.toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-gray-500">steps/day</p>
                </div>

                <div className="border-t border-gray-200 pt-3 flex justify-between items-start">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Average Sleep</p>
                    <p className="text-lg font-bold text-gray-900">{formData.avg_sleep_hours}</p>
                  </div>
                  <p className="text-xs text-gray-500">hours/night</p>
                </div>

                {formData.resting_heart_rate && (
                  <>
                    <div className="border-t border-gray-200 pt-3 flex justify-between items-start">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase">Resting HR</p>
                        <p className="text-lg font-bold text-gray-900">{formData.resting_heart_rate}</p>
                      </div>
                      <p className="text-xs text-gray-500">bpm</p>
                    </div>
                  </>
                )}
              </div>

              <div className={`rounded-lg p-4 flex items-start gap-3 ${getDataQualityLabel(calculateConfidenceScore()).bg}`}>
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${getDataQualityLabel(calculateConfidenceScore()).color}`} />
                <div>
                  <p className={`font-semibold text-sm ${getDataQualityLabel(calculateConfidenceScore()).color}`}>
                    Data Quality: {getDataQualityLabel(calculateConfidenceScore()).label}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Confidence: <span className="font-medium">{calculateConfidenceScore()}%</span>
                  </p>
                </div>
              </div>

              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <p className="font-medium text-gray-700 mb-1">Data Source:</p>
                <p className="capitalize">{source.replace('_', ' ')}</p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(2)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? '⏳ Syncing...' : '✓ Sync Data'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
