import React from 'react'

function LineChart({ points = [], label = '', color = '#0ea5e9', minValue = null, maxValue = null }) {
  if (!points.length) return <div className="text-sm text-gray-500">No data</div>

  const width = 800
  const height = 300
  const padding = 50
  const maxY = maxValue !== null ? maxValue : (Math.max(...points.map((p) => p.value)) || 1)
  const minY = minValue !== null ? minValue : 0

  const stepX = (width - padding * 2) / Math.max(1, points.length - 1)

  const toX = (i) => padding + i * stepX
  const toY = (v) => height - padding - ((v - minY) / (maxY - minY || 1)) * (height - padding * 2 - 20)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.value)}`).join(' ')
  const fillPath = `${path} L ${toX(points.length - 1)} ${height - padding} L ${toX(0)} ${height - padding} Z`

  // Calculate stats for the mini summary
  const avg = Math.round(points.reduce((acc, p) => acc + p.value, 0) / points.length)
  const max = Math.max(...points.map((p) => p.value))
  const min = Math.min(...points.map((p) => p.value))

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full drop-shadow-sm">
        {/* Background gradient definition */}
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = height - padding - pct * (height - padding * 2 - 20)
          const value = minY + pct * (maxY - minY)
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeWidth={0.8} strokeDasharray="5,3" opacity={0.6} />
              <text x={padding - 10} y={y + 4} fontSize="12" fill="#9ca3af" textAnchor="end" fontWeight={500}>
                {Math.round(value)}
              </text>
            </g>
          )
        })}
        
        {/* Fill area under curve */}
        <path d={fillPath} fill={`url(#gradient-${label})`} />
        
        {/* Main line */}
        <path d={path} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))" />
        
        {/* Data points with glow */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(p.value)} r={5} fill={color} opacity={0.2} />
            <circle cx={toX(i)} cy={toY(p.value)} r={3} fill={color} />
            <circle cx={toX(i)} cy={toY(p.value)} r={1.5} fill="white" />
          </g>
        ))}
        
        {/* X-axis labels */}
        {points.map((p, i) => {
          const labelInterval = Math.max(1, Math.floor(points.length / 8))
          if (i % labelInterval === 0 || i === points.length - 1) {
            return (
              <text key={`label-${i}`} x={toX(i)} y={height - 15} fontSize="12" fill="#6b7280" textAnchor="middle" fontWeight={500}>
                {p.date.slice(5)}
              </text>
            )
          }
        })}
        
        {/* Axes with better styling */}
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d1d5db" strokeWidth={1.5} />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d1d5db" strokeWidth={1.5} />
      </svg>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div className="text-center">
          <p className="text-xs text-gray-600 font-medium">Average</p>
          <p className="text-lg font-bold text-blue-600">{avg}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 font-medium">Peak</p>
          <p className="text-lg font-bold text-green-600">{Math.round(max)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 font-medium">Low</p>
          <p className="text-lg font-bold text-orange-600">{Math.round(min)}</p>
        </div>
      </div>
    </div>
  )
}

function BarChart({ items = [], completedColor = '#10b981', plannedColor = '#f3f4f6' }) {
  if (!items.length) return <div className="text-sm text-gray-500">No data</div>
  
  const max = Math.max(...items.map((it) => Math.max(it.completed || 0, it.planned || 0))) || 1
  const totalCompleted = items.reduce((acc, it) => acc + (it.completed || 0), 0)
  const totalPlanned = items.reduce((acc, it) => acc + (it.planned || 0), 0)
  const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-1 h-64 px-4 py-6 bg-gradient-to-b from-green-50 to-emerald-50 rounded-xl border border-green-100">
        {items.map((it, idx) => (
          <div key={it.date} className="flex-1 flex flex-col items-center group">
            <div className="relative h-52 w-full flex items-end justify-center gap-0.5">
              {/* Planned bar background */}
              {it.planned > 0 && (
                <div 
                  className="flex-1 bg-gray-200 rounded-t-lg opacity-40 transition-all" 
                  style={{ height: `${(it.planned / max) * 100}%` }}
                  title={`Planned: ${it.planned}`}
                />
              )}
              {/* Completed bar */}
              {it.completed > 0 && (
                <div 
                  className="flex-1 bg-gradient-to-t from-green-500 to-emerald-400 rounded-t-lg shadow-lg hover:shadow-xl transition-all" 
                  style={{ height: `${(it.completed / max) * 100}%` }}
                  title={`Completed: ${it.completed}`}
                />
              )}
              
              {/* Hover tooltip */}
              <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity pointer-events-none">
                {it.completed}/{it.planned}
              </div>
            </div>
            <div className="text-xs text-gray-700 mt-3 font-semibold">{it.date.slice(5)}</div>
            <div className="text-xs text-gray-500">{it.completed}/{it.planned}</div>
          </div>
        ))}
      </div>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3 px-4 py-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
        <div className="text-center">
          <p className="text-xs text-gray-600 font-medium">Total Completed</p>
          <p className="text-lg font-bold text-green-600">{totalCompleted}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 font-medium">Completion Rate</p>
          <p className="text-lg font-bold text-emerald-600">{completionRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600 font-medium">Total Goal</p>
          <p className="text-lg font-bold text-blue-600">{totalPlanned}</p>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex gap-6 px-4 py-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-t from-green-500 to-emerald-400 rounded-sm"></div>
          <span className="text-gray-700 font-medium">Workouts Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded-sm opacity-40"></div>
          <span className="text-gray-600 font-medium">Workouts Planned</span>
        </div>
      </div>
    </div>
  )
}

// Small sparkline used in the summary cards
function Sparkline({ values = [], color = '#10b981', width = 120, height = 36, strokeWidth = 2 }) {
  if (!values || values.length === 0) return <div className="h-9" />

  const max = Math.max(...values)
  const min = Math.min(...values)
  const len = values.length
  const pad = 4
  const stepX = (width - pad * 2) / Math.max(1, len - 1)
  const toX = (i) => pad + i * stepX
  const toY = (v) => {
    if (max === min) return height / 2
    return pad + (height - pad * 2) - ((v - min) / (max - min)) * (height - pad * 2)
  }

  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')

  return (
    <svg width={width} height={height} className="inline-block align-middle">
      <defs>
        <linearGradient id={`g-${color.replace('#','')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path}`} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d={`${path} L ${toX(len - 1)} ${height} L ${toX(0)} ${height} Z`} fill={`url(#g-${color.replace('#','')})`} opacity={0.25} />
    </svg>
  )
}

export default function AnalyticsCharts({ summary, adherence = null, streaks = null }) {
  console.log('[AnalyticsCharts] summary:', summary)
  
  if (!summary) {
    return <div className="p-4 text-sm text-gray-500">No summary data (summary is null)</div>
  }
  
  if (!summary.days) {
    return <div className="p-4 text-sm text-gray-500">No summary data (days is null)</div>
  }
  
  if (summary.days.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No summary data (days array is empty)</div>
  }

  console.log('[AnalyticsCharts] days count:', summary.days.length, 'days:', summary.days)

  const caloriesPoints = summary.days.map((d) => ({ date: d.date, value: d.calories || 0 }))
  const proteinPoints = summary.days.map((d) => ({ date: d.date, value: d.protein || 0 }))
  const workoutItems = summary.days.map((d) => ({ date: d.date, completed: d.workouts_completed || 0, planned: d.workouts_planned || 0 }))

  console.log('[AnalyticsCharts] caloriesPoints:', caloriesPoints)
  console.log('[AnalyticsCharts] proteinPoints:', proteinPoints)
  console.log('[AnalyticsCharts] workoutItems:', workoutItems)

  // Compute workout summary totals (used instead of rendering progress bars)
  const totalCompleted = workoutItems.reduce((acc, it) => acc + (it.completed || 0), 0)
  const totalPlanned = workoutItems.reduce((acc, it) => acc + (it.planned || 0), 0)
  const completionRate = totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Calories Chart */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">🔥</span> Daily Calorie Intake
          </h3>
          <p className="text-sm text-gray-600 mt-1">Track your calories over the last 15 days</p>
        </div>
        <LineChart points={caloriesPoints} label="Calories" color="#f59e0b" />
      </div>

      {/* Protein Chart */}
      <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-100 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="text-xl">💪</span> Daily Protein Intake
          </h3>
          <p className="text-sm text-gray-600 mt-1">Monitor protein for muscle recovery & growth</p>
        </div>
        <LineChart points={proteinPoints} label="Protein" color="#8b5cf6" />
      </div>

      {/* Overall Progress Summary (analytical synthesis) */}
      <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100 shadow-sm">
        <div className="mb-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="text-xl">🧭</span> Overall Progress Summary
            </h3>
            <p className="text-sm text-gray-600 mt-1">An analytical synthesis of your recent nutrition and workout trends</p>
          </div>

          {(() => {
            const days = summary.days || []
            const n = days.length
            const half = Math.max(1, Math.floor(n / 2))

            const avg = (arr, key) => Math.round((arr.reduce((a, d) => a + (d[key] || 0), 0) || 0) / (arr.length || 1))

            const firstHalf = days.slice(0, half)
            const secondHalf = days.slice(half)

            const calFirst = avg(firstHalf, 'calories')
            const calSecond = avg(secondHalf, 'calories')
            const calChange = calFirst === 0 ? 0 : Math.round(((calSecond - calFirst) / calFirst) * 100)

            const protFirst = avg(firstHalf, 'protein')
            const protSecond = avg(secondHalf, 'protein')
            const protChange = protFirst === 0 ? 0 : Math.round(((protSecond - protFirst) / protFirst) * 100)

            const wf = firstHalf.reduce((a, d) => a + (d.workouts_completed || 0), 0) / (firstHalf.length || 1)
            const ws = secondHalf.reduce((a, d) => a + (d.workouts_completed || 0), 0) / (secondHalf.length || 1)
            const workoutChange = wf === 0 ? 0 : Math.round(((ws - wf) / wf) * 100)

            // Values for sparklines
            const calVals = caloriesPoints.map((p) => p.value || 0)
            const protVals = proteinPoints.map((p) => p.value || 0)
            const workoutVals = workoutItems.map((it) => it.completed || 0)

            const statCards = [
              {
                title: 'Workouts / day',
                value: `${wf.toFixed(2)} → ${ws.toFixed(2)}`,
                delta: workoutChange,
                values: workoutVals,
                color: '#059669',
              },
              {
                title: 'Avg Calories',
                value: `${calFirst} → ${calSecond}`,
                delta: calChange,
                values: calVals,
                color: '#f59e0b',
              },
              {
                title: 'Avg Protein',
                value: `${protFirst} → ${protSecond}`,
                delta: protChange,
                values: protVals,
                color: '#8b5cf6',
              },
            ]

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {statCards.map((s, i) => (
                    <div key={i} className="bg-white shadow-sm rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">{s.title}</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center px-2 py-1 text-sm font-semibold rounded ${s.delta >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              {s.delta >= 0 ? <path fillRule="evenodd" d="M10 5a1 1 0 01.832.445l4 6a1 1 0 01-1.664 1.11L10 7.882 6.832 12.555A1 1 0 015.168 11.445l4-6A1 1 0 0110 5z" clipRule="evenodd" /> : <path fillRule="evenodd" d="M10 15a1 1 0 01-.832-.445l-4-6A1 1 0 016.832 7.445L10 12.118l3.168-4.673A1 1 0 0114.832 8.555l-4 6A1 1 0 0110 15z" clipRule="evenodd" />}
                            </svg>
                            <span>{s.delta >= 0 ? `+${s.delta}%` : `${s.delta}%`}</span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-gray-500">Last {n} days</div>
                        <Sparkline values={s.values} color={s.color} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
                    <p className="text-sm font-medium text-gray-600">Adherence & Streak</p>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg">
                        <p className="text-xs">Adherence</p>
                        <p className="text-lg font-bold">{adherence ? `${adherence.score}%` : '—'}</p>
                      </div>
                      <div className="px-3 py-2 bg-rose-50 text-rose-700 rounded-lg">
                        <p className="text-xs">Streak</p>
                        <p className="text-lg font-bold">{streaks ? `${streaks.workout_streak}d` : '—'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-gray-100">
                    <p className="text-sm font-medium text-gray-600">Suggested Focus</p>
                    <div className="mt-3 text-sm text-gray-700 space-y-1">
                      <p>- Maintain consistency or increase progressive overload if workouts/day improved.</p>
                      <p>- Adjust calorie intake if averages move away from your target.</p>
                      <p>- Small, consistent changes will improve adherence over time.</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
    </div>
  )
}
