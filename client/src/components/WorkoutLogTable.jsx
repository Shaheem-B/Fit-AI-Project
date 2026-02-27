import React from 'react';
import { Trash2, Edit3, Dumbbell, Clock, Weight } from 'lucide-react';
import { useWorkoutStore } from '../store/workoutStore';

const WorkoutLogTable = ({ workouts, onDeleteWorkout, onEditWorkout }) => {
  const { formatDuration } = useWorkoutStore();

  const getMuscleGroupColor = (muscleGroup) => {
    const colors = {
      chest: 'bg-blue-100 text-blue-800',
      back: 'bg-green-100 text-green-800',
      arms: 'bg-purple-100 text-purple-800',
      legs: 'bg-orange-100 text-orange-800',
      shoulders: 'bg-pink-100 text-pink-800',
      core: 'bg-yellow-100 text-yellow-800',
      cardio: 'bg-red-100 text-red-800'
    };
    return colors[muscleGroup] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!workouts || workouts.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No workouts logged</h3>
        <p className="text-gray-600">
          Click on a muscle group above to add your first workout!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Today's Workouts</h3>
        <p className="text-sm text-gray-600 mt-1">
          {workouts.length} exercise{workouts.length !== 1 ? 's' : ''} logged
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Exercise
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Muscle Group
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sets × Reps
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Weight
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {workouts.map((workout, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {workout.exercise_name}
                  </div>
                  {workout.notes && (
                    <div className="text-xs text-gray-500 mt-1">
                      {workout.notes}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getMuscleGroupColor(workout.muscle_group)}`}>
                    {workout.muscle_group.charAt(0).toUpperCase() + workout.muscle_group.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{workout.sets}</span>
                    <span className="text-gray-400">×</span>
                    <span className="font-medium">{workout.reps}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {workout.weight ? (
                    <div className="flex items-center gap-1">
                      <Weight className="w-4 h-4 text-gray-400" />
                      <span>{workout.weight} kg</span>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>{formatTime(workout.logged_at)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEditWorkout && onEditWorkout(workout, index)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                      title="Edit workout"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteWorkout && onDeleteWorkout(index)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                      title="Delete workout"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {workouts.reduce((sum, w) => sum + w.sets, 0)}
            </div>
            <div className="text-xs text-gray-600">Total Sets</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {workouts.reduce((sum, w) => sum + w.reps, 0)}
            </div>
            <div className="text-xs text-gray-600">Total Reps</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {workouts.reduce((sum, w) => sum + (w.weight || 0), 0).toFixed(1)} kg
            </div>
            <div className="text-xs text-gray-600">Total Weight</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {workouts.length}
            </div>
            <div className="text-xs text-gray-600">Exercises</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutLogTable;
