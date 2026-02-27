import { useState, useEffect, useRef } from 'react'
import { aiAPI, plansAPI, workoutAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Send, Loader2, Bot, User } from 'lucide-react'

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI fitness coach. Ask me anything about nutrition, workouts, or your personalized plan!'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState([])
  const [selectedPlanId, setSelectedPlanId] = useState(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchPlans = async () => {
    try {
      const data = await plansAPI.getPlans()
      setPlans(data)
      if (data.length > 0) {
        setSelectedPlanId(data[0].id)
      }
    } catch (error) {
      // Silently fail
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await aiAPI.chat(userMessage, selectedPlanId)
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }])
    } catch (error) {
      toast.error('Failed to get response')
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-5 mb-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-200 text-cyan-700 shadow-lg">
            <Bot className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              AI Fitness Coach
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Get personalized advice and ask questions about your fitness journey</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={async () => {
              try {
                const res = await workoutAPI.getWorkoutHistory(7)
                const history = res.history || []
                const totalMinutes = history.reduce((acc, d) => acc + (d.total_duration || 0), 0)
                const totalWorkouts = history.reduce((acc, d) => acc + (d.workout_count || 0), 0)
                const summary = `Last 7 days: ${totalWorkouts} workout(s), ${Math.round(totalMinutes/60)} minutes total.`
                setInput(summary)
                toast.success('Inserted workout summary into chat input')
              } catch (e) {
                toast.error('Could not get workout history')
              }
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold hover:shadow-lg transition-all"
          >
            📊 Last 7-day Summary
          </button>

          <button
            onClick={() => setInput('Can you create a 4-week progressive workout plan focused on strength with 3 workouts per week?')}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold hover:shadow-lg transition-all"
          >
            💪 Suggest 4-week Plan
          </button>
        </div>
      </div>

      {plans.length > 0 && (
        <div className="card-elevated p-6 mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            📋 Reference Plan (Optional)
          </label>
          <select
            value={selectedPlanId || ''}
            onChange={(e) => setSelectedPlanId(e.target.value || null)}
            className="input-field bg-white"
          >
            <option value="">No specific plan</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>
                {plan.user_inputs.goal} - {new Date(plan.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="card-elevated p-6">
        {/* Messages Area */}
        <div className="h-[600px] overflow-y-auto mb-6 space-y-5 pr-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start max-w-[80%] ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white ml-3'
                      : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white mr-3'
                  }`}
                >
                  {message.role === 'user' ? '👤' : '🤖'}
                </div>
                <div
                  className={`px-5 py-3 rounded-xl leading-relaxed ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500 text-white mr-3">
                  🤖
                </div>
                <div className="px-5 py-3 rounded-xl bg-gray-100">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="flex gap-3 border-t border-gray-200 pt-5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about fitness, nutrition, or your plan..."
            className="input-field flex-1 bg-white text-base"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="btn-primary px-6 flex items-center justify-center"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

