import { useState, useEffect } from 'react'
import { plansAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Loader2, FileText, Trash2, Calendar } from 'lucide-react'

export default function Plans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const data = await plansAPI.getPlans()
      setPlans(data)
      if (data.length > 0 && !selectedPlan) {
        setSelectedPlan(data[0])
      }
    } catch (error) {
      toast.error('Failed to load plans')
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this plan?')) return

    try {
      await plansAPI.deletePlan(planId)
      toast.success('Plan deleted')
      setPlans(plans.filter(p => p.id !== planId))
      if (selectedPlan?.id === planId) {
        setSelectedPlan(plans[0])
      }
    } catch (error) {
      toast.error('Failed to delete plan')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center py-16">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 w-24 h-24 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-12 h-12 text-green-700" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">No Plans Yet</h2>
          <p className="text-gray-600 mb-8 text-lg max-w-md mx-auto">
            Generate your first personalized fitness plan from the dashboard and start your transformation journey!
          </p>
          <a href="/dashboard" className="btn-primary inline-block">
            ✨ Create Your First Plan
          </a>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-10">
        <div className="flex items-center gap-5 mb-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 text-green-700 shadow-lg">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              My Fitness Plans
            </h1>
            <p className="text-gray-600 mt-2 text-lg">View and manage your personalized plans</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plans List */}
        <div className="lg:col-span-1">
          <div className="card-elevated">
            <h2 className="text-lg font-bold mb-5 text-green-700">📋 Your Plans ({plans.length})</h2>
            <div className="space-y-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                    selectedPlan?.id === plan.id
                      ? 'border-green-500 bg-green-50 shadow-lg'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">
                        {plan.user_inputs.goal}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center mt-2">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePlan(plan.id)
                      }}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <span className="inline-block px-3 py-1 text-xs font-bold bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full">
                    {plan.classifier_label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plan Details */}
        <div className="lg:col-span-2">
          {selectedPlan && (
            <div className="card-elevated">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  🎯 {selectedPlan.user_inputs.goal}
                </h2>
                <div className="flex flex-wrap gap-3 mb-6">
                  <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-sm font-bold">
                    {selectedPlan.classifier_label}
                  </span>
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full text-sm font-bold">
                    {selectedPlan.user_inputs.activity_level}
                  </span>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg p-4 border border-orange-100">
                    <p className="text-sm text-gray-600 font-medium">Age</p>
                    <p className="text-2xl font-bold text-orange-600 mt-1">{selectedPlan.user_inputs.age}</p>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border border-pink-100">
                    <p className="text-sm text-gray-600 font-medium">Sex</p>
                    <p className="text-2xl font-bold text-pink-600 mt-1 capitalize">{selectedPlan.user_inputs.sex}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-100">
                    <p className="text-sm text-gray-600 font-medium">Weight</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">{selectedPlan.user_inputs.weight} <span className="text-sm">kg</span></p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-100">
                    <p className="text-sm text-gray-600 font-medium">Height</p>
                    <p className="text-2xl font-bold text-cyan-600 mt-1">{selectedPlan.user_inputs.height_cm} <span className="text-sm">cm</span></p>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-8">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-green-700">
                  <span>📝</span> Your Personalized Plan
                </h3>
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border border-gray-200">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed text-sm">
                    {selectedPlan.plan_text}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

