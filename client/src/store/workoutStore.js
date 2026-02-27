// client/src/store/workoutStore.js
import { create } from 'zustand';
import { workoutAPI } from '../services/api';

export const useWorkoutStore = create((set, get) => ({
  // State
  selectedMuscle: '',
  selectedExercise: null,
  workouts: [],
  dailyLog: null,
  streak: {
    current_streak: 0,
    longest_streak: 0,
    last_workout_date: null,
    total_workout_days: 0
  },
  selectedDate: new Date().toISOString().split('T')[0],
  muscleGroups: [],
  exercises: [], 
  exerciseSearchResults: [],
  loading: false,
  error: null,

  // Actions
  setSelectedMuscle: (muscle) => set({ selectedMuscle: muscle }),
  
  setSelectedExercise: (exercise) => set({ selectedExercise: exercise }),
  
  setSelectedDate: (date) => set({ selectedDate: date }),
  
  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),

  // Fetch muscle groups
  fetchMuscleGroups: async () => {
    set({ loading: true, error: null });
    try {
      const response = await workoutAPI.getMuscleGroups();
      // FIX: Access data from response.data
      set({ muscleGroups: response.data.muscle_groups, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Get exercises for muscle group
  getExercisesForMuscle: async (muscleGroup) => {
    set({ loading: true, error: null, selectedMuscle: muscleGroup });
    try {
      console.log('Store: Fetching exercises for muscle group:', muscleGroup);
      const response = await workoutAPI.getExercisesByMuscle(muscleGroup);
      console.log('Store: API response:', response);
      // Already fixed in previous turn
      set({ exercises: response.data.exercises, loading: false }); 
      console.log('Store: Set exercises:', response.data.exercises);
    } catch (error) {
      console.error('Store: Error fetching exercises:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Search exercises
  searchExercises: async (query, muscleGroup = null) => {
    set({ loading: true, error: null });
    try {
      console.log('Store: Searching exercises with query:', query, 'muscleGroup:', muscleGroup);
      const response = await workoutAPI.searchExercises(query, muscleGroup);
      console.log('Store: Search API response:', response);
      // FIX: Access exercises and total_results from response.data
      set({ 
        exerciseSearchResults: response.data.exercises, 
        total_results: response.data.total_results, 
        loading: false 
      });
      console.log('Store: Set search results:', response.data.exercises);
    } catch (error) {
      console.error('Store: Error searching exercises:', error);
      set({ error: error.message, loading: false });
    }
  },

  // Log a workout
  logWorkout: async (workoutData) => {
    set({ loading: true, error: null });
    try {
      const response = await workoutAPI.logWorkout(workoutData);
      
      // Refresh daily log and streak
      const { selectedDate, fetchDailyLog, fetchStreak } = get();
      await fetchDailyLog(selectedDate);
      await fetchStreak();
      
      set({ loading: false });
      return response;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Fetch daily workout log
  fetchDailyLog: async (date) => {
    set({ loading: true, error: null });
    try {
      const response = await workoutAPI.getDailyLog(date);
      // FIX: Access dailyLog from response.data
      set({ 
        dailyLog: response.data, 
        selectedDate: date,
        loading: false 
      });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch workout streak
  fetchStreak: async () => {
    set({ loading: true, error: null });
    try {
      const response = await workoutAPI.getStreak();
      // FIX: Access streak from response.data
      set({ streak: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Fetch workout history
  fetchWorkoutHistory: async (limit = 30) => {
    set({ loading: true, error: null });
    try {
      const response = await workoutAPI.getWorkoutHistory(limit);
      // FIX: Access history from response.data
      set({ workouts: response.data.history, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Delete workout log entry
  deleteWorkoutLog: async (logId, workoutIndex) => {
    set({ loading: true, error: null });
    try {
      await workoutAPI.deleteWorkoutLog(logId, workoutIndex);
      
      // Refresh daily log and streak
      const { selectedDate, fetchDailyLog, fetchStreak } = get();
      await fetchDailyLog(selectedDate);
      await fetchStreak();
      
      set({ loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null }),

  // Calculate total macros for the day
  getDailyTotals: () => {
    const { dailyLog } = get();
    if (!dailyLog || !dailyLog.workouts) {
      return {
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
        totalDuration: 0,
        workoutCount: 0
      };
    }

    return {
      totalSets: dailyLog.total_sets,
      totalReps: dailyLog.total_reps,
      totalWeight: dailyLog.total_weight,
      totalDuration: dailyLog.total_duration,
      workoutCount: dailyLog.workouts.length
    };
  },

  // Get workouts by muscle group for current day
  getWorkoutsByMuscleGroup: () => {
    const { dailyLog } = get();
    if (!dailyLog || !dailyLog.workouts) {
      return {};
    }

    return dailyLog.workouts.reduce((acc, workout) => {
      if (!acc[workout.muscle_group]) {
        acc[workout.muscle_group] = [];
      }
      acc[workout.muscle_group].push(workout);
      return acc;
    }, {});
  },

  // Format duration for display
  formatDuration: (seconds) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  }
}));