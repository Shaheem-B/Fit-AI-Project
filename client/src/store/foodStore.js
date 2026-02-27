import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useFoodStore = create(
  persist(
    (set, get) => ({
      // Daily food log state
      dailyLog: null,
      selectedDate: new Date().toISOString().split('T')[0],
      
      // Search state
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      
      // UI state
      selectedFood: null,
      quantity: 100, // grams
      selectedMeal: 'breakfast',
      
      // Daily goals (can be set by user or fetched from profile)
      dailyGoals: {
        calories: 2000,
        protein: 150,
        carbs: 250,
        fat: 65,
        fiber: 35
      },
      
      // Actions
      setSelectedDate: (date) => set({ selectedDate: date }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setSearchResults: (results) => set({ searchResults: results }),
      
      setIsSearching: (loading) => set({ isSearching: loading }),
      
      setSelectedFood: (food) => set({ selectedFood: food }),
      
      setQuantity: (quantity) => set({ quantity }),
      
      setSelectedMeal: (meal) => set({ selectedMeal: meal }),
      
      setDailyLog: (log) => set({ dailyLog: log }),
      
      setDailyGoals: (goals) => set({ dailyGoals: goals }),
      
      // Calculate macros for selected food and quantity
      getCalculatedMacros: () => {
        const { selectedFood, quantity } = get()
        if (!selectedFood) return null
        
        const multiplier = quantity / 100 // Convert to per 100g basis
        return {
          calories: Math.round(selectedFood.calories * multiplier * 10) / 10,
          protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
          carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
          fat: Math.round(selectedFood.fat * multiplier * 10) / 10,
          fiber: selectedFood.fiber ? Math.round(selectedFood.fiber * multiplier * 10) / 10 : 0,
          sugar: selectedFood.sugar ? Math.round(selectedFood.sugar * multiplier * 10) / 10 : 0,
          sodium: selectedFood.sodium ? Math.round(selectedFood.sodium * multiplier * 10) / 10 : 0
        }
      },
      
      // Get progress percentage for macros
      getMacroProgress: (macroType) => {
        const { dailyLog, dailyGoals } = get()
        if (!dailyLog || !dailyLog.total_macros) return 0
        
        const current = dailyLog.total_macros[macroType] || 0
        const goal = dailyGoals[macroType] || 1
        return Math.min(Math.round((current / goal) * 100), 100)
      },
      
      // Reset form state
      resetForm: () => set({
        selectedFood: null,
        quantity: 100,
        selectedMeal: 'breakfast'
      }),
      
      // Clear search
      clearSearch: () => set({
        searchQuery: '',
        searchResults: [],
        selectedFood: null
      })
    }),
    {
      name: 'food-storage',
      // Only persist certain state, not temporary UI state
      partialize: (state) => ({
        dailyGoals: state.dailyGoals,
        selectedDate: state.selectedDate
      })
    }
  )
)
