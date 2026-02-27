import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { userAPI, healthAPI, workoutAPI, foodAPI } from '../services/api'
import { wearableAPI } from '../services/api'
import { Heart, Activity, Scale, Loader2 } from 'lucide-react'
import HealthSyncWizard from '../components/HealthSyncWizard'

function calcBMI(weight, height) {
  const h = Number(height)
  const w = Number(weight)
  if (!h || !w) return null
  const m = h / 100
  return +(w / (m * m)).toFixed(1)
}

export default function HealthProfile() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    age: '',
    gender: 'male',
    height: '',
    weight: '',
    activity_level: 'moderate',
    family_history: 'no',
    sugar_intake: 'medium',
    sleep_hours: '',
    stress_level: 'medium',
    workouts_per_week: 3
  })
  const [bmiPreview, setBmiPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [derived, setDerived] = useState(null)
  const [wearableStatus, setWearableStatus] = useState(null)
  const [syncWizardOpen, setSyncWizardOpen] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [workoutData, setWorkoutData] = useState({})
  const [foodData, setFoodData] = useState({})
  const [sleepFromSync, setSleepFromSync] = useState(false)
  const [activityFromSync, setActivityFromSync] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const user = await userAPI.getProfile()
        if (user) {
          setForm((f) => ({
            ...f,
            age: user.age || f.age,
            height: user.height_cm || f.height,
            weight: user.weight || f.weight,
            activity_level: user.activity_level || f.activity_level,
            workouts_per_week: user.workouts_per_week || f.workouts_per_week
          }))
        }
      } catch (e) {
        // ignore
      }
    })()

    ;(async () => {
      try {
        const s = await wearableAPI.status()
        setWearableStatus(s.data)
      } catch (e) {
        // ignore
      }
    })()

    ;(async () => {
      try {
        const s = await healthAPI.getSyncStatus()
        console.log('Initial sync status loaded:', s)
        setSyncStatus(s)
        
        // Populate form with sync data if available
        if (s && s.data) {
          console.log('Initial sync data available:', s.data)
          const hasSleepData = s.data.avg_sleep_hours !== null && s.data.avg_sleep_hours !== undefined
          const hasStepsData = s.data.avg_steps !== null && s.data.avg_steps !== undefined
          
          setForm((f) => {
            const newForm = {
              ...f,
              ...(hasSleepData && { sleep_hours: s.data.avg_sleep_hours }),
              // Suggest activity level based on steps if not already set
              ...(hasStepsData && !f.activity_level && { 
                activity_level: s.data.avg_steps < 5000 ? 'low' : 
                               s.data.avg_steps < 10000 ? 'moderate' : 'high'
              })
            }
            console.log('Initial form population:', newForm)
            return newForm
          })
          
          if (hasSleepData) setSleepFromSync(true)
          if (hasStepsData && !f.activity_level) setActivityFromSync(true)
        }
      } catch (e) {
        console.error('Error loading initial sync status:', e)
        // ignore
      }
    })()

    ;(async () => {
      try {
        const today = new Date().toISOString().split('T')[0]
        const wd = await workoutAPI.getDailyLog(today)
        setWorkoutData(wd || {})
      } catch (e) {
        // ignore
      }
    })()

    ;(async () => {
      try {
        const fd = await foodAPI.getDailyLog()
        setFoodData(fd || {})
      } catch (e) {
        // ignore
      }
    })()
  }, [])

  useEffect(() => {
    setBmiPreview(calcBMI(form.weight, form.height))
  }, [form.weight, form.height])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((s) => ({ ...s, [name]: value }))
    
    // Reset sync indicators if user manually changes fields
    if (name === 'sleep_hours') {
      setSleepFromSync(false)
    }
    if (name === 'activity_level') {
      setActivityFromSync(false)
    }
  }

  const validate = () => {
    if (!form.age || !form.height || !form.weight) return 'Please enter age, height and weight.'
    if (Number(form.age) <= 0) return 'Enter a valid age.'
    if (Number(form.height) < 50 || Number(form.height) > 250) return 'Enter height in cm (50-250).'
    if (Number(form.weight) < 20 || Number(form.weight) > 500) return 'Enter weight in kg (20-500).'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const v = validate()
    if (v) return alert(v)
    setSaving(true)
    try {
      const payload = {
        age: Number(form.age),
        gender: form.gender,
        height: Number(form.height),
        weight: Number(form.weight),
        activity_level: form.activity_level,
        workouts_per_week: Number(form.workouts_per_week || 0),
        family_history: form.family_history,
        sugar_intake: form.sugar_intake,
        sleep_hours: Number(form.sleep_hours || 0),
        stress_level: form.stress_level
      }
      console.log('[HealthProfile] Payload:', payload)
      await healthAPI.saveProfile(payload)
      // fetch auto-derived profile
      try {
        const p = await healthAPI.getHealthProfile()
        setDerived(p)
      } catch (e) {
        // ignore if endpoint unavailable
      }
      navigate('/health-awareness')
    } catch (err) {
      console.error('[HealthProfile] Full error:', err)
      console.error('[HealthProfile] Error response:', err.response)
      let errorMsg = 'Unknown error occurred'
      
      if (err.response?.data) {
        const data = err.response.data
        if (data.detail) {
          errorMsg = Array.isArray(data.detail) 
            ? data.detail.map(e => e.msg || JSON.stringify(e)).join(', ')
            : data.detail
        } else if (data.message) {
          errorMsg = data.message
        } else {
          errorMsg = JSON.stringify(data).substring(0, 200)
        }
      } else if (err.message) {
        errorMsg = err.message
      }
      
      alert(`Failed to save profile:\n${errorMsg}`)
    } finally {
      setSaving(false)
    }
  }

  const bmiCategory = (b) => {
    if (!b) return null
    if (b < 18.5) return { label: 'Underweight', color: 'bg-blue-100 text-blue-800' }
    if (b < 25) return { label: 'Normal', color: 'bg-green-100 text-green-800' }
    if (b < 27) return { label: 'Overweight', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Obese', color: 'bg-red-100 text-red-800' }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-red-50 to-rose-100 text-red-600 shadow-lg">
          <Heart className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Profile</h1>
          <p className="text-base text-gray-600 mt-1">Complete your health profile to receive personalized insights and recommendations.</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="card-gradient border-2 border-emerald-200/50 shadow-lg hover:shadow-2xl transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-base font-bold text-emerald-900 mb-1">📱 Sync Health Data</div>
              <div className="text-sm text-emerald-700">Connect your wearable device to sync steps, sleep, and heart rate metrics.</div>
              {syncStatus?.data && (
                <div className="text-sm text-emerald-600 font-semibold mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  ✓ Connected • Last synced: {new Date(syncStatus.last_sync).toLocaleString()}
                </div>
              )}
            </div>
            <button 
              onClick={() => setSyncWizardOpen(true)}
              className="btn-success whitespace-nowrap"
            >
              {syncStatus?.data ? '🔄 Update Data' : '📊 Sync Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Display synced health data */}
      {syncStatus?.data && (
        <div className="mb-8">
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-200 rounded-full">
                <Activity className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">Your Synced Metrics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/70 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm text-gray-600 font-medium">📍 Daily Steps</p>
                <p className="text-2xl font-bold text-emerald-700 mt-2">{syncStatus.data.avg_steps?.toLocaleString() || 'N/A'}</p>
                {syncStatus.data.avg_steps && (
                  <p className="text-xs text-emerald-600 mt-1">
                    → {syncStatus.data.avg_steps < 5000 ? '🟠 Low' : syncStatus.data.avg_steps < 10000 ? '🟡 Moderate' : '🟢 High'} activity
                  </p>
                )}
              </div>
              <div className="bg-white/70 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm text-gray-600 font-medium">😴 Average Sleep</p>
                <p className="text-2xl font-bold text-emerald-700 mt-2">{syncStatus.data.avg_sleep_hours || 'N/A'} <span className="text-sm">hrs</span></p>
              </div>
              <div className="bg-white/70 rounded-xl p-4 border border-emerald-100">
                <p className="text-sm text-gray-600 font-medium">❤️ Resting HR</p>
                <p className="text-2xl font-bold text-emerald-700 mt-2">{syncStatus.data.resting_heart_rate || 'N/A'} <span className="text-sm">bpm</span></p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <p className="text-emerald-700 font-medium">
                ✓ Data Quality: {syncStatus.data.confidence_score ? `${Math.round(syncStatus.data.confidence_score * 100)}%` : 'N/A'}
              </p>
              <p className="text-emerald-600">Source: {syncStatus.data.source?.replace('_', ' ') || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
            <input name="age" value={form.age} onChange={handleChange} placeholder="Years" type="number" className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-500 mt-1">Used for age-related risk scoring.</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
            <select name="gender" value={form.gender} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Height (cm)</label>
            <input name="height" value={form.height} onChange={handleChange} placeholder="e.g. 170" type="number" className="w-full px-3 py-2 text-sm border border-gray-300 rounded" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Weight (kg)</label>
            <input name="weight" value={form.weight} onChange={handleChange} placeholder="e.g. 70" type="number" className="w-full px-3 py-2 text-sm border border-gray-300 rounded" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">BMI Preview: <span className="font-medium">{bmiPreview ?? '—'}</span></div>
          <div className="flex items-center gap-3">
            {bmiPreview && (
              <div className={`px-2 py-1 rounded text-xs font-semibold ${bmiCategory(bmiPreview).color}`}>
                {bmiCategory(bmiPreview).label}
              </div>
            )}
            <div className="text-xs text-gray-500">BMI is derived from weight and height.</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Activity level</label>
            <select name="activity_level" value={form.activity_level} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded">
              <option value="low">Low (sedentary)</option>
              <option value="moderate">Moderate (some exercise)</option>
              <option value="high">High (regular intense activity)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Choose the closest match to your weekly activity.</p>
            {activityFromSync && <p className="text-xs text-green-600 mt-1">✓ Suggested from synced daily steps</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Family history of diabetes</label>
            <select name="family_history" value={form.family_history} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded">
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sugar intake</label>
            <select name="sugar_intake" value={form.sugar_intake} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sleep hours (per night)</label>
            <input name="sleep_hours" value={form.sleep_hours} onChange={handleChange} placeholder="e.g. 7" type="number" step="0.5" className="w-full px-3 py-2 text-sm border border-gray-300 rounded" />
            {sleepFromSync && <p className="text-xs text-green-600 mt-1">✓ Auto-populated from synced health data</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Planned workouts per week</label>
            <input name="workouts_per_week" value={form.workouts_per_week} onChange={handleChange} placeholder="e.g. 3" type="number" min="0" max="21" className="w-full px-3 py-2 text-sm border border-gray-300 rounded" />
            <p className="text-xs text-gray-500 mt-1">Used for adherence and plan recommendations.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Stress level</label>
          <select name="stress_level" value={form.stress_level} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-300 rounded">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition">{saving ? 'Saving...' : <><Activity className="inline w-4 h-4 mr-2"/>Save & View Awareness</>}</button>
          <button type="button" onClick={() => navigate('/health-awareness')} className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100">View awareness (without saving)</button>
          <div className="ml-auto text-sm text-gray-500 flex items-center gap-2"><Scale className="w-4 h-4" />Data is stored locally on your account.</div>
        </div>
      </form>

      <HealthSyncWizard 
        isOpen={syncWizardOpen}
        onClose={() => setSyncWizardOpen(false)}
        onSuccess={async () => {
          // Refresh sync status
          try {
            const s = await healthAPI.getSyncStatus()
            console.log('Sync success - new status:', s)
            setSyncStatus(s)
            
            // Re-populate form with new sync data
            if (s && s.data) {
              console.log('Re-populating form with:', s.data)
              const hasSleepData = s.data.avg_sleep_hours !== null && s.data.avg_sleep_hours !== undefined
              const hasStepsData = s.data.avg_steps !== null && s.data.avg_steps !== undefined
              
              setForm((f) => {
                const newForm = {
                  ...f,
                  ...(hasSleepData && { sleep_hours: s.data.avg_sleep_hours }),
                  ...(hasStepsData && !f.activity_level && { 
                    activity_level: s.data.avg_steps < 5000 ? 'low' : 
                                   s.data.avg_steps < 10000 ? 'moderate' : 'high'
                  })
                }
                console.log('New form state:', newForm)
                return newForm
              })
              
              if (hasSleepData) setSleepFromSync(true)
              if (hasStepsData && !f.activity_level) setActivityFromSync(true)
            }
          } catch (e) {
            console.error('Error in onSuccess:', e)
            // ignore
          }
        }}
        existingProfile={form}
        workoutData={workoutData}
        foodData={foodData}
      />

      {derived && (
        <div className="mt-6 card p-4">
          <h3 className="text-lg font-semibold mb-2">Derived Metrics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">Weekly workout minutes</div>
              <div className="font-semibold">{derived.weekly_workout_minutes ?? '—'} min</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Adherence score</div>
              <div className="font-semibold">{derived.adherence_score ? `${derived.adherence_score}%` : '—'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
