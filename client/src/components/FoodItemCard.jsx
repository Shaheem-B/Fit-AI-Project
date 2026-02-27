import { Trash2 } from 'lucide-react'

export default function FoodItemCard({ food, onRemove, showRemove = true }) {
  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{food.food_name}</h4>
          <div className="text-sm text-gray-600 mb-2">
            {food.quantity}g
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Cal: {food.macros.calories}</div>
            <div>Protein: {food.macros.protein}g</div>
            <div>Carbs: {food.macros.carbs}g</div>
            <div>Fat: {food.macros.fat}g</div>
            <div>Fiber: {food.macros.fiber || 0}g</div>
          </div>
        </div>
        
        {showRemove && (
          <button
            onClick={onRemove}
            className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
