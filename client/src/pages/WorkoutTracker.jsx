import React, { useState, useEffect } from 'react';
import {
  Flame,
  Calendar,
  TrendingUp,
  Target,
  Plus,
  Search,
  Dumbbell,
  Clock,
  Award,
  Timer,
  Star,
  History,
  BookOpen,
  Zap
} from 'lucide-react';
import { useWorkoutStore } from '../store/workoutStore';
import { workoutAPI } from '../services/api';
import HumanBodyModel from '../components/HumanBodyModel'; // Re-import HumanBodyModel
import ExerciseCard from '../components/ExerciseCard';
import WorkoutLogTable from '../components/WorkoutLogTable';
import toast from 'react-hot-toast';
// import HumanBody3DModel from '../components/HumanBody3DModel'; // Commented out 3D model import

// Quick-add exercises for common workouts (duration in minutes)
const QUICK_ADD_EXERCISES = [
  { name: 'Push-ups', muscle_group: 'chest', sets: 3, reps: 10, duration: 6 },
  { name: 'Squats', muscle_group: 'legs', sets: 3, reps: 12, duration: 8 },
  { name: 'Pull-ups', muscle_group: 'back', sets: 3, reps: 8, duration: 7 },
  { name: 'Plank', muscle_group: 'core', sets: 3, reps: 30, duration: 5 },
  { name: 'Bench Press', muscle_group: 'chest', sets: 4, reps: 8, duration: 10 },
  { name: 'Deadlift', muscle_group: 'back', sets: 4, reps: 6, duration: 12 },
  { name: 'Bicep Curls', muscle_group: 'arms', sets: 3, reps: 12, duration: 7 },
  { name: 'Lunges', muscle_group: 'legs', sets: 3, reps: 10, duration: 8 },
  { name: 'Shoulder Press', muscle_group: 'shoulders', sets: 3, reps: 10, duration: 8 },
  { name: 'Burpees', muscle_group: 'cardio', sets: 3, reps: 10, duration: 15 },
  { name: 'Mountain Climbers', muscle_group: 'core', sets: 3, reps: 20, duration: 10 },
  { name: 'Dips', muscle_group: 'arms', sets: 3, reps: 8, duration: 6 },
  { name: 'Calf Raises', muscle_group: 'legs', sets: 3, reps: 15, duration: 6 },
  { name: 'Russian Twists', muscle_group: 'core', sets: 3, reps: 20, duration: 7 },
  { name: 'Jumping Jacks', muscle_group: 'cardio', sets: 3, reps: 30, duration: 12 },
  { name: 'Tricep Dips', muscle_group: 'arms', sets: 3, reps: 12, duration: 7 }
];

// Cardio quick options
const QUICK_CARDIO_OPTIONS = [
  { name: 'Running (10 min)', activity: 'running', duration: 10, distance: 1.5 },
  { name: 'Running (20 min)', activity: 'running', duration: 20, distance: 3.0 },
  { name: 'Running (30 min)', activity: 'running', duration: 30, distance: 4.5 },
  { name: 'Cycling (20 min)', activity: 'cycling', duration: 20, distance: 5.0 },
  { name: 'Cycling (30 min)', activity: 'cycling', duration: 30, distance: 8.0 },
  { name: 'Cycling (45 min)', activity: 'cycling', duration: 45, distance: 12.0 },
  { name: 'Walking (30 min)', activity: 'walking', duration: 30, distance: 2.0 },
  { name: 'Walking (45 min)', activity: 'walking', duration: 45, distance: 3.0 },
  { name: 'Swimming (30 min)', activity: 'swimming', duration: 30, distance: 1.0 },
  { name: 'HIIT (20 min)', activity: 'hiit', duration: 20, distance: null },
  { name: 'Jump Rope (15 min)', activity: 'jump_rope', duration: 15, distance: null }
];

// Workout templates
const WORKOUT_TEMPLATES = [
  {
    name: 'Upper Body Strength',
    description: 'Full upper body workout focusing on chest, back, and arms',
    exercises: [
      { name: 'Bench Press', muscle_group: 'chest', sets: 4, reps: 8 },
      { name: 'Bent-over Row', muscle_group: 'back', sets: 4, reps: 8 },
      { name: 'Shoulder Press', muscle_group: 'shoulders', sets: 3, reps: 10 },
      { name: 'Bicep Curls', muscle_group: 'arms', sets: 3, reps: 12 },
      { name: 'Tricep Dips', muscle_group: 'arms', sets: 3, reps: 12 }
    ]
  },
  {
    name: 'Lower Body Power',
    description: 'Leg-focused workout for strength and power',
    exercises: [
      { name: 'Squats', muscle_group: 'legs', sets: 4, reps: 8 },
      { name: 'Deadlift', muscle_group: 'back', sets: 4, reps: 6 },
      { name: 'Lunges', muscle_group: 'legs', sets: 3, reps: 10 },
      { name: 'Calf Raises', muscle_group: 'legs', sets: 3, reps: 15 },
      { name: 'Glute Bridges', muscle_group: 'legs', sets: 3, reps: 12 }
    ]
  },
  {
    name: 'Core & Cardio',
    description: 'High-intensity workout combining core work and cardio',
    exercises: [
      { name: 'Burpees', muscle_group: 'cardio', sets: 4, reps: 10 },
      { name: 'Plank', muscle_group: 'core', sets: 3, reps: 45, duration: 45 },
      { name: 'Mountain Climbers', muscle_group: 'core', sets: 3, reps: 30 },
      { name: 'Russian Twists', muscle_group: 'core', sets: 3, reps: 20 },
      { name: 'Jumping Jacks', muscle_group: 'cardio', sets: 3, reps: 50 }
    ]
  },
  {
    name: 'Full Body HIIT',
    description: 'High-intensity interval training for full body conditioning',
    exercises: [
      { name: 'Push-ups', muscle_group: 'chest', sets: 4, reps: 15 },
      { name: 'Squats', muscle_group: 'legs', sets: 4, reps: 20 },
      { name: 'Pull-ups', muscle_group: 'back', sets: 4, reps: 10 },
      { name: 'Plank', muscle_group: 'core', sets: 3, reps: 60, duration: 60 },
      { name: 'Burpees', muscle_group: 'cardio', sets: 3, reps: 15 }
    ]
  }
];

const WorkoutTracker = () => {
  const {
    selectedMuscle,
    selectedExercise,
    dailyLog,
    streak,
    selectedDate,
    exercises,
    exerciseSearchResults,
    loading,
    error,
    fetchDailyLog,
    fetchStreak,
    getExercisesForMuscle,
    searchExercises,
    logWorkout,
    deleteWorkoutLog,
    getDailyTotals,
    formatDuration,
    setSelectedDate
  } = useWorkoutStore();

  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeTab, setActiveTab] = useState('search');
  const [showCardioOptions, setShowCardioOptions] = useState(false);
  const [cardioDistance, setCardioDistance] = useState('');
  const [cardioType, setCardioType] = useState('');
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [customWorkout, setCustomWorkout] = useState({
    name: '',
    exercises: []
  });
  const [showCustomWorkoutModal, setShowCustomWorkoutModal] = useState(false);
  const [restTimer, setRestTimer] = useState({ active: false, timeLeft: 60 });
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  useEffect(() => {
    // Fetch today's workout log and streak on component mount
    fetchDailyLog(selectedDate);
    fetchStreak();
  }, [fetchDailyLog, fetchStreak, selectedDate]);

  const handleMuscleClick = async (muscleId, muscleExercises) => {
    console.log('WorkoutTracker: handleMuscleClick called with:', muscleId, muscleExercises);
    // The 2D HumanBodyModel passes muscleExercises directly, so we can use it.
    // However, it's safer to always refetch from the store after `getExercisesForMuscle` call
    await getExercisesForMuscle(muscleId); // Ensure exercises are fetched and updated in store
    const currentExercises = useWorkoutStore.getState().exercises; // Get updated exercises from store

    if (currentExercises && currentExercises.length > 0) {
      console.log('WorkoutTracker: Showing exercise modal');
      setShowExerciseModal(true);
    } else {
      console.log('WorkoutTracker: No exercises found, showing error');
      toast.error(`No exercises found for ${muscleId}`);
    }
  };

  const handleAddToWorkout = async (workoutData) => {
    try {
      await logWorkout(workoutData);
      setShowExerciseModal(false);
      toast.success('Workout logged successfully!');
    } catch (error) {
      toast.error('Failed to log workout');
    }
  };

  const handleDeleteWorkout = async (workoutIndex) => {
    if (!dailyLog || !dailyLog.id) {
      toast.error('No workout log found');
      return;
    }

    try {
      await deleteWorkoutLog(dailyLog.id, workoutIndex);
      toast.success('Workout deleted successfully!');
    } catch (error) {
      toast.error('Failed to delete workout');
    }
  };

  const handleSearchExercises = async (query) => {
    if (query.trim().length < 2) {
      setShowSearchResults(false);
      return;
    }

    try {
      await searchExercises(query);
      setShowSearchResults(true);
    } catch (error) {
      toast.error('Failed to search exercises');
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    fetchDailyLog(newDate);
  };

  // New enhanced functions
  const handleQuickAddExercise = async (exercise) => {
    try {
      const workoutData = {
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group,
        sets: parseInt(exercise.sets) || 3,
        reps: parseInt(exercise.reps) || 10,
        duration: exercise.duration ? parseInt(exercise.duration) * 60 : null // Convert minutes to seconds
        // DO NOT send date - backend will use today
      };
      console.log('[WORKOUT] Sending quick add:', workoutData);
      await logWorkout(workoutData);
      toast.success(`${exercise.name} added to workout!`);
    } catch (error) {
      console.error('Failed to add exercise:', error.response?.data || error.message);
      toast.error(`Failed to add exercise: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleStartTemplate = (template) => {
    setSelectedTemplate(template);
    setActiveTab('search');
    toast.success(`Started ${template.name} workout!`);
  };

  const handleAddFromTemplate = async (exercise) => {
    try {
      const workoutData = {
        exercise_name: exercise.name,
        muscle_group: exercise.muscle_group,
        sets: parseInt(exercise.sets) || 3,
        reps: parseInt(exercise.reps) || 10,
        duration: exercise.duration ? parseInt(exercise.duration) * 60 : null // Convert minutes to seconds
        // DO NOT send date - backend will use today
      };
      console.log('[WORKOUT] Sending template exercise:', workoutData);
      await logWorkout(workoutData);
      toast.success(`${exercise.name} added!`);
    } catch (error) {
      console.error('Failed to add exercise:', error.response?.data || error.message);
      toast.error(`Failed to add exercise: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleAddCardio = async (cardioOption) => {
    try {
      const workoutData = {
        exercise_name: cardioOption.name,
        muscle_group: cardioOption.activity,
        sets: 1,
        reps: 1,
        duration: cardioOption.duration ? parseInt(cardioOption.duration) * 60 : null, // Convert minutes to seconds
        distance: cardioOption.distance || null,
        notes: `${cardioOption.duration} min ${cardioOption.activity}`
        // DO NOT send date - backend will use today
      };
      console.log('[WORKOUT] Sending cardio:', workoutData);
      await logWorkout(workoutData);
      toast.success(`${cardioOption.name} logged!`);
      setShowCardioOptions(false);
    } catch (error) {
      console.error('Failed to log cardio:', error.response?.data || error.message);
      toast.error(`Failed to log cardio: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleStartRestTimer = (seconds = 60) => {
    setRestTimer({ active: true, timeLeft: seconds });
    const interval = setInterval(() => {
      setRestTimer(prev => {
        if (prev.timeLeft <= 1) {
          clearInterval(interval);
          toast.success('Rest time complete!');
          return { active: false, timeLeft: 60 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  };

  const handleStopRestTimer = () => {
    setRestTimer({ active: false, timeLeft: 60 });
  };

  const handleSaveCustomWorkout = () => {
    if (!customWorkout.name.trim()) {
      toast.error('Please enter a workout name');
      return;
    }
    if (customWorkout.exercises.length === 0) {
      toast.error('Please add at least one exercise');
      return;
    }
    // Save to local storage for now
    const savedWorkouts = JSON.parse(localStorage.getItem('customWorkouts') || '[]');
    savedWorkouts.push(customWorkout);
    localStorage.setItem('customWorkouts', JSON.stringify(savedWorkouts));
    setCustomWorkout({ name: '', exercises: [] });
    setShowCustomWorkoutModal(false);
    toast.success('Custom workout saved!');
  };

  const handleAddCustomExercise = (exercise) => {
    setCustomWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, exercise]
    }));
  };

  const loadRecentWorkouts = () => {
    // Load recent workouts from localStorage or API
    const recent = JSON.parse(localStorage.getItem('recentWorkouts') || '[]');
    setRecentWorkouts(recent.slice(0, 10)); // Show last 10
  };

  useEffect(() => {
    loadRecentWorkouts();
  }, []);

  const dailyTotals = getDailyTotals();
  const workouts = dailyLog?.workouts || [];

  const getMotivationalMessage = () => {
    if (streak.current_streak === 0) {
      return "Ready to start your fitness journey? Let's go! 💪";
    } else if (streak.current_streak < 3) {
      return "Great start! Keep building that momentum! 🔥";
    } else if (streak.current_streak < 7) {
      return "You're on fire! Consistency is key! ⚡";
    } else if (streak.current_streak < 14) {
      return "Amazing dedication! You're crushing it! 🚀";
    } else {
      return "Incredible! You're a fitness champion! 🏆";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-200 text-blue-700 shadow-lg">
                <Dumbbell className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Workout Tracker
                </h1>
                <p className="text-gray-600 mt-2 text-lg">Track your workouts, build streaks, and achieve your fitness goals</p>
              </div>
            </div>

            {/* Date Selector */}
            <div className="flex items-center gap-4">
              <button className="btn-primary flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent text-white font-medium focus:outline-none"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Streak and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Current Streak */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Current Streak</p>
                <p className="text-3xl font-bold">{streak.current_streak}</p>
                <p className="text-orange-100 text-sm">days</p>
              </div>
              <Flame className="w-8 h-8 text-orange-200" />
            </div>
          </div>

          {/* Longest Streak */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Best Streak</p>
                <p className="text-3xl font-bold">{streak.longest_streak}</p>
                <p className="text-purple-100 text-sm">days</p>
              </div>
              <Award className="w-8 h-8 text-purple-200" />
            </div>
          </div>

          {/* Total Workouts */}
          <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Workouts</p>
                <p className="text-3xl font-bold">{streak.total_workout_days}</p>
                <p className="text-green-100 text-sm">days</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </div>

          {/* Today's Progress */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Today's Workouts</p>
                <p className="text-3xl font-bold">{dailyTotals.workoutCount}</p>
                <p className="text-blue-100 text-sm">exercises</p>
              </div>
              <Target className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="text-center">
            <p className="text-lg text-gray-800">{getMotivationalMessage()}</p>
          </div>
        </div>

        {/* Search Exercises */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Exercises
          </h3>

          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search for exercises (e.g., push-ups, squats)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchExercises(e.target.value);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowSearchResults(!showSearchResults)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {showSearchResults ? 'Hide' : 'Show'} Results
            </button>
          </div>

          {/* Search Results */}
          {showSearchResults && exerciseSearchResults.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                Search Results ({exerciseSearchResults.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exerciseSearchResults.map((exercise, index) => (
                  <ExerciseCard
                    key={index}
                    exercise={exercise}
                    onAddToWorkout={handleAddToWorkout}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cardio Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            🏃 Cardio Workouts
          </h3>
          
          <button
            onClick={() => setShowCardioOptions(!showCardioOptions)}
            className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg hover:from-red-600 hover:to-orange-600 transition-colors font-medium flex items-center justify-center gap-2"
          >
            {showCardioOptions ? 'Hide' : 'Select'} Cardio Activity
          </button>

          {showCardioOptions && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {QUICK_CARDIO_OPTIONS.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAddCardio(option)}
                  className="p-4 bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-lg hover:shadow-md transition-all hover:border-orange-400"
                >
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{option.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      ⏱️ {option.duration} min {option.distance && `• 📍 ${option.distance}km`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick Strength Exercises */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-md font-medium text-gray-900 mb-4">Quick Strength Exercises</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {QUICK_ADD_EXERCISES.slice(0, 8).map((exercise, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAddExercise(exercise)}
                  className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-all hover:border-blue-400"
                >
                  <p className="font-medium text-gray-900 text-sm">{exercise.name}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    {exercise.sets}×{exercise.reps} • {exercise.duration || 5} min
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Human Body Model */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
            Click on a Muscle Group to Add Exercises
          </h3>
          <HumanBodyModel onMuscleClick={handleMuscleClick} /> {/* Now using the 2D model again */}
        </div>

        {/* Exercise Modal */}
        {showExerciseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedMuscle.charAt(0).toUpperCase() + selectedMuscle.slice(1)} Exercises
                  </h3>
                  <button
                    onClick={() => setShowExerciseModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Debug Info */}
                <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Debug: Selected Muscle: {selectedMuscle} | Exercises Count: {exercises.length}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Exercises: {JSON.stringify(exercises.map(e => e.name))}
                  </p>
                </div>

                {exercises.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exercises.map((exercise, index) => (
                      <ExerciseCard
                        key={index}
                        exercise={exercise}
                        onAddToWorkout={handleAddToWorkout}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No exercises found for this muscle group.</p>
                    <p className="text-sm text-gray-500 mt-2">Please try another muscle group.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Workout Log Table */}
        <WorkoutLogTable
          workouts={workouts}
          onDeleteWorkout={handleDeleteWorkout}
        />

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">Loading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutTracker;