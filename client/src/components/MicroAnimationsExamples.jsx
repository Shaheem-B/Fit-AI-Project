import React, { useEffect, useRef, useState } from 'react'

// AnimatedCard: fades in and scales on hover
export function AnimatedCard({ title, children, className = '' }) {
  return (
    <div className={`card fade-in scale-hover ${className}`}>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  )
}

// AnimatedButton: hover brightness + press scale
export function AnimatedButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-primary btn-press ${disabled ? 'disabled-faint' : ''}`}
    >
      {children}
    </button>
  )
}

// CountUp number - duration in ms
export function CountUp({ value = 0, duration = 600, className = '' }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef()
  useEffect(() => {
    const start = performance.now()
    const from = Number(display)
    const to = Number(value)
    const step = (ts) => {
      const t = Math.min(1, (ts - start) / duration)
      const eased = t * (2 - t) // easeOutQuad
      const cur = Math.round(from + (to - from) * eased)
      setDisplay(cur)
      if (t < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return <div className={`text-2xl font-bold ${className}`}>{display}</div>
}

// ConfidenceBar - smooth fill
export function ConfidenceBar({ percent = 0 }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className="h-3 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 fill-smooth"
        style={{ width: `${pct}%` }}
        aria-valuenow={pct}
      />
    </div>
  )
}

// Awareness item with staggered bullets and one-time pulse for high warnings
export function AwarenessItem({ name, score = 0, reasons = [], hint = '' }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80)
    return () => clearTimeout(t)
  }, [])

  const high = score >= 70

  return (
    <div className={`bg-white rounded-lg p-4 shadow-sm fade-in`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-md font-semibold">{name}</h4>
          <div className="mt-2 flex items-center gap-2">
            <div className={`px-2 py-1 rounded-full text-xs font-semibold transition-colors ${high ? 'bg-red-100 text-red-700 pulse-once' : score>=35 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
              {high ? 'High' : score>=35 ? 'Moderate' : 'Low'}
            </div>
            <div className="text-sm text-gray-500">Score: <span className="font-medium">{score}</span></div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <ul className="space-y-2">
          {reasons.map((r, i) => (
            <li
              key={i}
              className={`text-sm text-gray-700 transform transition-all duration-200 ${show ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              • {r}
            </li>
          ))}
        </ul>
        {hint && <div className="mt-3 text-sm text-gray-600">Hint: {hint}</div>}
      </div>
    </div>
  )
}

// ProgressBar (analytics): grows from 0 -> value using width transition
export function ProgressBar({ value = 60, label }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { const t = setTimeout(() => setMounted(true), 40); return () => clearTimeout(t) }, [])
  return (
    <div className="space-y-2">
      {label && <div className="text-sm text-gray-600">{label}</div>}
      <div className="w-full bg-gray-100 rounded h-3 overflow-hidden">
        <div className={`h-3 bg-primary-500 fill-smooth`} style={{ width: mounted ? `${value}%` : '0%' }} />
      </div>
    </div>
  )
}

export default function MicroAnimationsExamples() {
  return (
    <div className="space-y-4">
      <AnimatedCard title="Daily Summary">
        <div className="flex items-center gap-6">
          <div>
            <CountUp value={2150} className="text-indigo-600" />
            <div className="text-xs text-gray-500">Avg Calories (14d)</div>
          </div>
          <div className="w-48">
            <ConfidenceBar percent={78} />
            <div className="text-xs text-gray-500 mt-1">Confidence</div>
          </div>
        </div>
      </AnimatedCard>

      <div className="flex gap-4">
        <AnimatedButton onClick={() => {}}>Save</AnimatedButton>
        <button className="btn-secondary btn-press">Cancel</button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AwarenessItem name="Diabetes Risk" score={62} reasons={["BMI 27.5","3/14 high-calorie days","Inconsistent workouts"]} hint="Reduce sugary snacks on flagged days." />
        <AwarenessItem name="Muscle Health" score={24} reasons={["Protein low on 9/14 days"]} hint="Add a protein serving to breakfast and dinner." />
      </div>

      <div className="max-w-md">
        <ProgressBar label="Weekly Activity" value={55} />
      </div>
    </div>
  )
}
