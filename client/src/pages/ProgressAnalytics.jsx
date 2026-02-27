import { useEffect, useState } from 'react'
import { analyticsAPI, wearableAPI, workoutAPI } from '../services/api'
import AnalyticsCharts from '../components/AnalyticsCharts'
import StatCard from '../components/StatCard'
import Card from '../components/Card'
import { CheckCircle, Dumbbell, Zap } from 'lucide-react'

export default function ProgressAnalytics() {
  const [summary, setSummary] = useState(null)
  const [adherence, setAdherence] = useState(null)
  const [streaks, setStreaks] = useState(null)
  const [wearableSummary, setWearableSummary] = useState(null)
  const [workoutSummary, setWorkoutSummary] = useState(null)

  useEffect(() => {
    const load = async () => {
      try {
        // Calculate date range for last 15 days
        const endDate = new Date()
        const startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - 15)
        
        const formatDate = (d) => d.toISOString().split('T')[0]
        const start = formatDate(startDate)
        const end = formatDate(endDate)

        // Fetch 15-day analytics data
        const res = await analyticsAPI.weeklySummary(start, end)
        setSummary(res.data)
        const a = await analyticsAPI.adherenceScore(start, end)
        setAdherence(a.data)
        const s = await analyticsAPI.streaks()
        setStreaks(s.data)
        try {
          const w = await wearableAPI.summary('30d')
          setWearableSummary(w.data)
        } catch (e) {
          // ignore wearable errors
        }

        // Fetch workout history for last 15 days
        try {
          const wh = await workoutAPI.getWorkoutHistory(15)
          const history = wh.data?.history || []
          // total_duration is in seconds from backend, convert to minutes
          const totalSeconds = history.reduce((acc, d) => acc + (d.total_duration || 0), 0)
          const totalMinutes = Math.round(totalSeconds / 60)
          const totalDays = history.length
          const avgWorkoutsPerDay = history.length > 0 ? history.reduce((acc, d) => acc + (d.workout_count || 0), 0) / (totalDays || 1) : 0
          setWorkoutSummary({ totalMinutes, totalDays, avgWorkoutsPerDay })
        } catch (e) {
          console.error('Failed to load workout history:', e)
          // ignore
        }

      } catch (e) {
        console.error('Analytics Error:', e)
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-5 mb-10">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-100 to-violet-200 text-purple-700 shadow-lg">
          <Zap className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
            Progress Analytics
          </h1>
          <p className="text-gray-600 mt-2 text-lg">Track your fitness journey and celebrate your achievements</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard title="Adherence" value={adherence ? `${adherence.score}%` : '—'} icon={<CheckCircle className="w-6 h-6 text-indigo-500" />} />
        <StatCard title="Calories Goal" value={adherence && adherence.details ? `${adherence.details.calories}%` : '—'} icon={<Zap className="w-6 h-6 text-indigo-500" />} />
        <StatCard title="Workout Streak" value={streaks ? streaks.workout_streak : '—'} icon={<Dumbbell className="w-6 h-6 text-indigo-500" />} />
      </div>

      <Card className="card-elevated p-6 mb-8">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-3 text-purple-700">
          <span>📊</span> Wearable Summary (Last 30 Days)
        </h2>
        {wearableSummary ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-5 border border-blue-100">
              <p className="text-sm text-gray-600 font-medium">Avg Steps</p>
              <p className="text-2xl font-bold text-blue-600 mt-2">{wearableSummary.avg_steps ?? '—'}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border border-green-100">
              <p className="text-sm text-gray-600 font-medium">Active Min</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{wearableSummary.avg_active_minutes ?? '—'}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-5 border border-indigo-100">
              <p className="text-sm text-gray-600 font-medium">Sleep (avg)</p>
              <p className="text-2xl font-bold text-indigo-600 mt-2">{Math.round((wearableSummary.avg_sleep_minutes ?? 0) / 60)}<span className="text-sm">h</span></p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-5 border border-red-100">
              <p className="text-sm text-gray-600 font-medium">Resting HR</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{wearableSummary.avg_resting_heart_rate ?? '—'} <span className="text-sm">bpm</span></p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 font-medium">🔗 No wearable data connected</p>
            <p className="text-sm text-gray-500 mt-2">Sync your wearable device to see activity insights</p>
          </div>
        )}
      </Card>

      <Card className="card-elevated p-6 mb-8">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-3 text-purple-700">
          <span>💪</span> Workouts (Last 15 Days)
        </h2>
        {workoutSummary ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-6 border border-orange-100">
              <p className="text-sm text-gray-600 font-medium">Total Minutes</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{Math.round(workoutSummary.totalMinutes) ?? '—'} <span className="text-lg">min</span></p>
            </div>
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-6 border border-cyan-100">
              <p className="text-sm text-gray-600 font-medium">Workout Days</p>
              <p className="text-3xl font-bold text-cyan-600 mt-2">{workoutSummary.totalDays ?? '—'} <span className="text-lg">days</span></p>
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-6 border border-rose-100">
              <p className="text-sm text-gray-600 font-medium">Avg per Day</p>
              <p className="text-3xl font-bold text-rose-600 mt-2">{(workoutSummary.avgWorkoutsPerDay || 0).toFixed(1)} <span className="text-lg">workouts</span></p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 font-medium">📝 No workout history</p>
            <p className="text-sm text-gray-500 mt-2">Start logging workouts to see your progress</p>
          </div>
        )}
      </Card>

      <Card className="card-elevated p-6 mb-8">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-3 text-purple-700">
          <span>📈</span> 15-Day Nutrition & Workout Trends
        </h2>
        <AnalyticsCharts summary={summary} adherence={adherence} streaks={streaks} />
      </Card>


    </div>
  )
}
