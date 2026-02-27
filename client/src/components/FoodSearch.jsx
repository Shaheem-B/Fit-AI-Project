import { useState, useEffect } from 'react'
import { useFoodStore } from '../store/foodStore'
import { foodAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Search, Plus, Loader2, Clock, Star, Zap, Settings } from 'lucide-react'

export default function FoodSearch({ onFoodLogged }) {
  const {
    searchQuery,
    searchResults,
    isSearching,
    selectedFood,
    quantity,
    selectedMeal,
    setSearchQuery,
    setSearchResults,
    setIsSearching,
    setSelectedFood,
    setQuantity,
    setSelectedMeal,
    getCalculatedMacros,
    resetForm,
    clearSearch
  } = useFoodStore()

  const [showResults, setShowResults] = useState(false)
  const [recentFoods, setRecentFoods] = useState([])
  const [activeTab, setActiveTab] = useState('search') // 'search', 'quick', 'recent', 'custom'
  const [customFoods, setCustomFoods] = useState([])
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customFoodForm, setCustomFoodForm] = useState({
    name: '',
    grams: '',
    lookedUpFood: null
  })

  // Quick add foods
  const quickAddFoods = [
    { name: "Apple", quantity: 150, icon: "🍎" },
    { name: "Banana", quantity: 120, icon: "🍌" },
    { name: "Chicken Breast", quantity: 100, icon: "🍗" },
    { name: "Greek Yogurt", quantity: 170, icon: "🥛" },
    { name: "Boiled Egg", quantity: 50, icon: "🥚" },
    { name: "White Rice", quantity: 100, icon: "🍚" },
    { name: "Broccoli", quantity: 100, icon: "🥦" },
    { name: "Salmon", quantity: 100, icon: "🐟" },
    { name: "Almonds", quantity: 28, icon: "🥜" },
    { name: "Orange", quantity: 130, icon: "🍊" },
    { name: "Spinach", quantity: 30, icon: "🥬" },
    { name: "Sweet Potato", quantity: 150, icon: "🍠" },
    { name: "Avocado", quantity: 100, icon: "🥑" },
    { name: "Oats", quantity: 40, icon: "🥣" },
    { name: "Milk", quantity: 240, icon: "🥛" },
    { name: "Cottage Cheese", quantity: 113, icon: "🧀" }
  ]

  // Load recent foods and custom foods on component mount
  useEffect(() => {
    loadRecentFoods()
    loadCustomFoods()
  }, [])

  // Auto-search when query changes
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchFoods(searchQuery)
      }, 500) // Debounce for 500ms
      return () => clearTimeout(timer)
    } else {
      setSearchResults([])
      setShowResults(false)
    }
  }, [searchQuery])

  const loadRecentFoods = async () => {
    try {
      // Get recent foods from localStorage or API
      const stored = localStorage.getItem('recentFoods')
      if (stored) {
        setRecentFoods(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load recent foods:', error)
    }
  }

  const loadCustomFoods = async () => {
    try {
      const response = await foodAPI.getCustomFoods()
      setCustomFoods(response.foods)
    } catch (error) {
      console.error('Failed to load custom foods:', error)
    }
  }

  const saveToRecentFoods = (food) => {
    const updated = [food, ...recentFoods.filter(f => f.name !== food.name)].slice(0, 10)
    setRecentFoods(updated)
    localStorage.setItem('recentFoods', JSON.stringify(updated))
  }

  const searchFoods = async (query) => {
    if (!query || query.length < 2) return

    setIsSearching(true)
    try {
      const response = await foodAPI.searchFood(query)
      setSearchResults(response.foods || [])
      setShowResults(true)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search foods')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleFoodSelect = (food) => {
    setSelectedFood(food)
    setShowResults(false)
  }

  const handleLogFood = async () => {
    if (!selectedFood) {
      toast.error('Please select a food item')
      return
    }

    if (quantity <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    try {
      await foodAPI.logFood({
        food_name: selectedFood.name,
        quantity: quantity,
        meal_type: selectedMeal
      })

      // Save to recent foods
      saveToRecentFoods({
        name: selectedFood.name,
        quantity: quantity,
        meal: selectedMeal,
        timestamp: Date.now()
      })

      toast.success(`${selectedFood.name} added to ${selectedMeal}!`)
      resetForm()
      clearSearch()
      onFoodLogged()
    } catch (error) {
      toast.error('Failed to log food item')
    }
  }

  const handleQuickAdd = async (food) => {
    try {
      // First search for the food to get nutrition data
      const response = await foodAPI.searchFood(food.name)
      if (response.foods && response.foods.length > 0) {
        const foodData = response.foods[0]
        setSelectedFood(foodData)
        setQuantity(food.quantity)
        // Auto-log the food
        await foodAPI.logFood({
          food_name: foodData.name,
          quantity: food.quantity,
          meal_type: selectedMeal
        })

        // Save to recent foods
        saveToRecentFoods({
          name: foodData.name,
          quantity: food.quantity,
          meal: selectedMeal,
          timestamp: Date.now()
        })

        toast.success(`${foodData.name} (${food.quantity}g) added to ${selectedMeal}!`)
        onFoodLogged()
      }
    } catch (error) {
      toast.error('Failed to add food item')
    }
  }

  const handleLookupCustomFood = async (foodName) => {
    if (!foodName.trim() || foodName.length < 2) {
      setCustomFoodForm({ ...customFoodForm, name: foodName, lookedUpFood: null })
      return
    }

    try {
      const response = await foodAPI.searchFood(foodName)
      if (response.foods && response.foods.length > 0) {
        setCustomFoodForm({ ...customFoodForm, name: foodName, lookedUpFood: response.foods[0] })
        toast.success('Food found! Nutrition data auto-populated')
      } else {
        setCustomFoodForm({ ...customFoodForm, name: foodName, lookedUpFood: null })
      }
    } catch (error) {
      console.error('Lookup error:', error)
      setCustomFoodForm({ ...customFoodForm, name: foodName, lookedUpFood: null })
    }
  }

  const handleCreateCustomFood = async () => {
    if (!customFoodForm.name.trim()) {
      toast.error('Please enter a food name')
      return
    }

    if (!customFoodForm.grams || parseFloat(customFoodForm.grams) <= 0) {
      toast.error('Please enter grams')
      return
    }

    if (!customFoodForm.lookedUpFood) {
      toast.error('Food not found. Please check the name and try again.')
      return
    }

    const grams = parseFloat(customFoodForm.grams)
    const multiplier = grams / 100

    try {
      // Log the food directly instead of creating a custom food
      await foodAPI.logFood({
        food_name: customFoodForm.lookedUpFood.name,
        quantity: grams,
        meal_type: selectedMeal
      })

      // Save to recent foods
      saveToRecentFoods({
        name: customFoodForm.lookedUpFood.name,
        quantity: grams,
        meal: selectedMeal,
        timestamp: Date.now()
      })

      toast.success(`${customFoodForm.lookedUpFood.name} (${grams}g) added to ${selectedMeal}!`)
      setCustomFoodForm({
        name: '',
        grams: '',
        lookedUpFood: null
      })
      setShowCustomForm(false)
      onFoodLogged()
    } catch (error) {
      toast.error('Failed to add food')
    }
  }

  const handleCustomFoodSelect = (food) => {
    setSelectedFood(food)
    setActiveTab('search') // Switch to search tab to show quantity input
  }

  const calculatedMacros = getCalculatedMacros()

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">🍽️ Add Food</h2>
      
      {/* Meal Type Selector */}
      <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200">
        <label className="text-xs font-bold text-indigo-900 block mb-3">📋 Select Meal Type</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedMeal('breakfast')}
            className={`py-3 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              selectedMeal === 'breakfast'
                ? 'bg-amber-500 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-amber-50'
            }`}
          >
            <span className="text-lg">🌅</span> Breakfast
          </button>
          <button
            onClick={() => setSelectedMeal('lunch')}
            className={`py-3 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              selectedMeal === 'lunch'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-orange-50'
            }`}
          >
            <span className="text-lg">🌞</span> Lunch
          </button>
          <button
            onClick={() => setSelectedMeal('snacks')}
            className={`py-3 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              selectedMeal === 'snacks'
                ? 'bg-yellow-500 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-yellow-50'
            }`}
          >
            <span className="text-lg">🍪</span> Snacks
          </button>
          <button
            onClick={() => setSelectedMeal('dinner')}
            className={`py-3 px-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              selectedMeal === 'dinner'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-purple-50'
            }`}
          >
            <span className="text-lg">🌙</span> Dinner
          </button>
        </div>
      </div>

      {/* Tab Buttons - Perfect Grid Alignment */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <button
          onClick={() => setActiveTab('search')}
          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'search'
              ? 'bg-orange-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
        </button>
        <button
          onClick={() => setActiveTab('quick')}
          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'quick'
              ? 'bg-yellow-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span className="hidden sm:inline">Quick</span>
        </button>
        <button
          onClick={() => setActiveTab('recent')}
          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'recent'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">Recent</span>
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
            activeTab === 'custom'
              ? 'bg-purple-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Custom</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="border border-gray-200 rounded-lg p-5 bg-gradient-to-br from-white to-gray-50 min-h-80">
        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-3">
            <div className="p-2 bg-orange-100 border border-orange-300 rounded-lg text-xs text-orange-800 font-semibold">
              🔍 Start typing to search foods (minimum 2 characters)
            </div>
            <div className="relative flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowResults(true)}
                  placeholder="Search for food..."
                  className="input-field pl-10 text-sm w-full border-2 border-orange-200 focus:border-orange-500"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-orange-400" />
                )}
              </div>
              <button
                onClick={() => searchFoods(searchQuery)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-all text-sm"
              >
                Search
              </button>
            </div>

            {/* Search Results */}
            {showResults && searchResults.length > 0 && (
              <div className="bg-white border-2 border-orange-200 rounded-lg shadow-md max-h-48 overflow-y-auto">
                {searchResults.map((food, index) => (
                  <button
                    key={index}
                    onClick={() => handleFoodSelect(food)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-orange-50 border-b border-orange-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-semibold text-gray-800">{food.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{food.calories} cal • {food.protein}g protein</div>
                  </button>
                ))}
              </div>
            )}

            {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-800 font-semibold">🔎 No foods found for "{searchQuery}"</p>
                <p className="text-xs text-yellow-700 mt-1">Try different keywords or check Recent/Custom foods</p>
              </div>
            )}

            {selectedFood && (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border-2 border-orange-300 p-4 shadow-sm">
                <div className="font-bold text-base text-orange-900 mb-3 flex items-center gap-2">
                  <span className="text-xl">🍽️</span> {selectedFood.name}
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-bold text-orange-800 block mb-1">📏 Quantity (grams)</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                      className="input-field text-sm w-full border-2 border-orange-200"
                      placeholder="100"
                    />
                  </div>
                </div>
                <button
                  onClick={handleLogFood}
                  className="btn-primary w-full text-sm py-2 mt-3 font-bold"
                >
                  ✓ Add to Log
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Add Tab */}
        {activeTab === 'quick' && (
          <div>
            <div className="mb-3 p-3 bg-yellow-100 rounded-lg text-center text-xs text-yellow-800 font-semibold">⚡ Click any food to instantly add it</div>
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
              {quickAddFoods.map((food, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAdd(food)}
                  className="flex flex-col items-center justify-center p-4 border-2 border-yellow-300 rounded-xl bg-white hover:bg-yellow-50 hover:shadow-lg active:bg-yellow-100 transition-all transform hover:scale-105"
                  title={food.name}
                >
                  <div className="text-4xl mb-2">{food.icon}</div>
                  <div className="text-xs text-gray-800 font-bold text-center">{food.name}</div>
                  <div className="text-xs text-yellow-600 font-bold mt-1">+{food.quantity}g</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Tab */}
        {activeTab === 'recent' && (
          <div>
            {recentFoods.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recentFoods.map((food, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentFoodSelect(food)}
                    className="w-full text-left p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 hover:shadow-md transition-all hover:border-blue-400"
                  >
                    <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
                      <span>🕐</span> {food.name}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 ml-6">{food.quantity}g • {food.meal?.charAt(0).toUpperCase() + food.meal?.slice(1)}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No recent foods yet</p>
                <p className="text-xs mt-1 opacity-70">Foods you add will appear here</p>
              </div>
            )}
          </div>
        )}

        {/* Custom Tab */}
        {activeTab === 'custom' && (
          <div>
            <button
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="mb-4 w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg"
            >
              {showCustomForm ? '✕ Close Form' : '➕ Create New Food'}
            </button>

            {showCustomForm && (
              <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg shadow-sm">
                <h4 className="font-bold mb-4 text-base text-purple-900 flex items-center gap-2"><span>✏️</span> Add Food by Name</h4>
                <p className="text-xs text-purple-800 mb-3">Enter food name and grams - nutrition data will auto-populate</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-700 font-bold block mb-1">🍽️ Food</label>
                    <input
                      type="text"
                      value={customFoodForm.name}
                      onChange={(e) => handleLookupCustomFood(e.target.value)}
                      placeholder="e.g., Apple, Chicken Breast"
                      className="input-field text-sm w-full h-9 border-2 border-purple-200 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700 font-bold block mb-1">⚖️ Gram</label>
                    <input
                      type="number"
                      value={customFoodForm.grams}
                      onChange={(e) => setCustomFoodForm({...customFoodForm, grams: e.target.value})}
                      placeholder="100"
                      className="input-field text-sm w-full h-9 border-2 border-purple-200 focus:border-purple-500"
                    />
                  </div>
                </div>

                {customFoodForm.lookedUpFood && customFoodForm.grams && (
                  <div className="mb-4 p-3 bg-white rounded-lg border-2 border-green-300">
                    <p className="text-xs font-bold text-green-800 mb-2">✓ Auto-populated Nutrition Data ({customFoodForm.grams}g)</p>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div>
                        <div className="font-bold text-orange-600">{Math.round((customFoodForm.lookedUpFood.calories * parseFloat(customFoodForm.grams) / 100) * 10) / 10}</div>
                        <div className="text-gray-600">Calories</div>
                      </div>
                      <div>
                        <div className="font-bold text-green-600">{Math.round((customFoodForm.lookedUpFood.protein * parseFloat(customFoodForm.grams) / 100) * 10) / 10}g</div>
                        <div className="text-gray-600">Protein</div>
                      </div>
                      <div>
                        <div className="font-bold text-yellow-600">{Math.round((customFoodForm.lookedUpFood.carbs * parseFloat(customFoodForm.grams) / 100) * 10) / 10}g</div>
                        <div className="text-gray-600">Carbs</div>
                      </div>
                      <div>
                        <div className="font-bold text-orange-500">{Math.round((customFoodForm.lookedUpFood.fat * parseFloat(customFoodForm.grams) / 100) * 10) / 10}g</div>
                        <div className="text-gray-600">Fat</div>
                      </div>
                      <div>
                        <div className="font-bold text-green-700">{Math.round(((customFoodForm.lookedUpFood.fiber || 0) * parseFloat(customFoodForm.grams) / 100) * 10) / 10}g</div>
                        <div className="text-gray-600">Fiber</div>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleCreateCustomFood}
                  disabled={!customFoodForm.lookedUpFood || !customFoodForm.grams}
                  className={`w-full text-sm py-2 mb-2 font-bold rounded-lg transition-all ${ customFoodForm.lookedUpFood && customFoodForm.grams ? 'btn-primary' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
                >
                  ✓ Add to {selectedMeal?.charAt(0).toUpperCase() + selectedMeal?.slice(1)}
                </button>
              </div>
            )}

            {customFoods.length > 0 ? (
              <div>
                <p className="text-xs font-bold text-purple-800 mb-3 block">📚 Your Custom Foods</p>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {customFoods.map((food, index) => (
                    <button
                      key={index}
                      onClick={() => handleCustomFoodSelect(food)}
                      className="w-full text-left p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 hover:shadow-md transition-all hover:border-purple-400 bg-white"
                    >
                      <div className="font-bold text-sm text-gray-800 flex items-center gap-2">
                        <span>⭐</span> {food.name}
                      </div>
                      <div className="text-xs text-gray-600 mt-1 ml-6">{food.calories} cal • P:{food.protein}g C:{food.carbs}g F:{food.fat}g</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Settings className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No custom foods yet</p>
                <p className="text-xs mt-1 opacity-70">Create your first custom food above</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
