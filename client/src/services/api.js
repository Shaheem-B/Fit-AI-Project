import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  signup: async (email, password, name) => {
    const response = await api.post('/auth/signup', { email, password, name })
    return response.data
  },

  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
  },
}

// User API
export const userAPI = {
  getProfile: async () => {
    const response = await api.get('/users/me')
    return response.data
  },

  updateProfile: async (userData) => {
    const response = await api.put('/users/me', userData)
    return response.data
  },
}

// AI API
export const aiAPI = {
  classifyImage: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/ai/classify-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  generatePlan: async (formData) => {
    const response = await api.post('/ai/generate-plan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  chat: async (message, planId = null) => {
    const response = await api.post('/ai/chat', { message, plan_id: planId })
    return response.data
  },

  predictHeightWeight: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/ai/predict-height-weight', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

// Plans API
export const plansAPI = {
  createPlan: async (planData) => {
    const response = await api.post('/plans/', planData)
    return response.data
  },

  getPlans: async () => {
    const response = await api.get('/plans/')
    return response.data
  },

  getPlan: async (planId) => {
    const response = await api.get(`/plans/${planId}`)
    return response.data
  },

  deletePlan: async (planId) => {
    const response = await api.delete(`/plans/${planId}`)
    return response.data
  },
}

// Food API
export const foodAPI = {
  searchFood: async (query, limit = 20) => {
    const response = await api.get('/food/search', {
      params: { query, limit }
    })
    return response.data
  },

  logFood: async (foodData) => {
    const response = await api.post('/food/log', foodData)
    return response.data
  },

  getDailyLog: async (date = null) => {
    const params = date ? { target_date: date } : {}
    const response = await api.get('/food/daily', { params })
    return response.data
  },

  // Log daily water intake (ml)
  logWater: async (waterMl, date = null) => {
    const params = date ? { target_date: date } : {}
    const response = await api.post('/food/water', { water_ml: waterMl }, { params })
    return response.data
  },

  deleteFoodLog: async (logId, mealType, foodIndex) => {
    const response = await api.delete(`/food/log/${logId}`, {
      params: { meal_type: mealType, food_index: foodIndex }
    })
    return response.data
  },

  createCustomFood: async (customFoodData) => {
    const response = await api.post('/food/custom', customFoodData)
    return response.data
  },

  getCustomFoods: async () => {
    const response = await api.get('/food/custom')
    return response.data
  },
}

// Workout API
export const workoutAPI = {
  getMuscleGroups: () => api.get('/workout/muscle-groups'),
  getExercisesByMuscle: (muscleGroup) => api.get(`/workout/exercises/${muscleGroup}`),
  searchExercises: (query, muscleGroup = null) => {
    const params = new URLSearchParams({ query });
    if (muscleGroup) params.append('muscle_group', muscleGroup);
    return api.get(`/workout/search?${params}`);
  },
  logWorkout: (workoutData) => api.post('/workout/log', workoutData),
  getDailyLog: (date) => api.get(`/workout/daily?date=${date}`),
  getStreak: () => api.get('/workout/streak'),
  getWorkoutHistory: (limit = 30) => api.get(`/workout/history?limit=${limit}`),
  deleteWorkoutLog: (logId, workoutIndex) =>
    api.delete(`/workout/log/${logId}?workout_index=${workoutIndex}`)
}

// Analytics API
export const analyticsAPI = {
  weeklySummary: (startDate = null, endDate = null) => {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    return api.get('/analytics/weekly-summary', { params })
  },
  adherenceScore: (startDate = null, endDate = null) => {
    const params = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    return api.get('/analytics/adherence-score', { params })
  },
  streaks: () => api.get('/analytics/streaks')
}

// Wearables API
export const wearableAPI = {
  connect: () => api.post('/wearables/connect'),
  status: () => api.get('/wearables/status'),
  summary: (range = '7d') => api.get('/wearables/summary', { params: { range } })
}

// Health API
export const healthAPI = {
  saveProfile: async (profileData) => {
    const response = await api.post('/health-profile', profileData)
    return response.data
  },
  getAwareness: async () => {
    // Backwards-compatible fallback: call the same server route as getHealthAwareness
    const response = await api.get('/health/awareness')
    return response.data
  },
  // New insights endpoints (auto-derived)
  getHealthProfile: async () => {
    const response = await api.get('/health/profile')
    return response.data
  },
  getHealthAwareness: async () => {
    const response = await api.get('/health/awareness')
    return response.data
  },
  // Health sync endpoints
  syncHealthData: async (syncData) => {
    const response = await api.post('/sync', syncData)
    return response.data
  },
  getSyncStatus: async () => {
    const response = await api.get('/sync/status')
    return response.data
  }
}

export default api

