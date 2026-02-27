import React, { useState } from 'react';
import { Plus, Dumbbell, Clock, Target } from 'lucide-react';
import toast from 'react-hot-toast';

const ExerciseCard = ({ exercise, onAddToWorkout }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [weight, setWeight] = useState(0);

  const handleAddToWorkout = () => {
    if (sets <= 0 || reps <= 0) {
      toast.error('Please enter valid sets and reps');
      return;
    }

    // Calculate estimated duration: ~2-3 minutes per exercise + 1 min per set (rest) - converted to seconds
    const estimatedDurationMinutes = 3 + (parseInt(sets) * 1);
    const estimatedDurationSeconds = estimatedDurationMinutes * 60;
    
    const workoutData = {
      exercise_name: exercise.name,
      muscle_group: exercise.muscle_group,
      sets: parseInt(sets),
      reps: parseInt(reps),
      weight: weight > 0 ? parseFloat(weight) : null,
      duration: estimatedDurationSeconds,
      distance: null,
      notes: null
    };

    try {
      onAddToWorkout(workoutData);
      toast.success(`${exercise.name} added to workout!`);
    } catch (error) {
      console.error('Failed to add exercise:', error);
      toast.error(`Failed: ${error.message}`);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {exercise.name}
            </h3>
            
            <p className="text-gray-600 text-sm mb-3">
              {exercise.description}
            </p>
            
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(exercise.difficulty)}`}>
                {exercise.difficulty}
              </span>
              {exercise.equipment && (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Dumbbell className="w-3 h-3" />
                  {exercise.equipment}
                </span>
              )}
            </div>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 text-sm font-medium hover:text-blue-700"
            >
              {showDetails ? 'Hide Details' : 'Show Instructions'}
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-2">Instructions:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 mb-3">
              {exercise.instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
            
            {exercise.tips && exercise.tips.length > 0 && (
              <>
                <h4 className="font-medium text-gray-900 mb-2">Tips:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  {exercise.tips.map((tip, index) => (
                    <li key={index}>{tip}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Sets
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={sets}
                onChange={(e) => setSets(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reps
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={reps}
                onChange={(e) => setReps(parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
          
          <button
            onClick={handleAddToWorkout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add to Workout
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExerciseCard;
