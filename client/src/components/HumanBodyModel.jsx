import React, { useState, useEffect } from 'react';
import { useWorkoutStore } from '../store/workoutStore';

const HumanBodyModel = ({ onMuscleClick }) => {
  const [hoveredMuscle, setHoveredMuscle] = useState('');
  const { fetchMuscleGroups, getExercisesForMuscle } = useWorkoutStore();

  useEffect(() => {
    fetchMuscleGroups();
  }, [fetchMuscleGroups]);

  // IMPORTANT:
  // - IMAGE_WIDTH and IMAGE_HEIGHT should match your actual image dimensions (268x459).
  // - The 'frontPath' and 'backPath' values below are designed to be general regions
  //   that cover the muscle areas in your reference image.
  //   For pixel-perfect accuracy and precise click areas, you may still want to
  //   trace them using an SVG editor and adjust labelPos accordingly.
  const musclesData = [
    {
      id: 'shoulders',
      name: 'Shoulders',
      frontPath: "M55 45 Q130 20 215 45 L215 75 Q130 90 55 75 Z", // Wider shoulder region
      backPath: "M55 45 Q130 20 215 45 L215 75 Q130 90 55 75 Z",
      labelPos: { x: 135, y: 60 }
    },
    {
      id: 'chest',
      name: 'Chest',
      frontPath: "M100 85 C80 95 80 130 135 140 C190 130 190 95 170 85 Z",
      labelPos: { x: 135, y: 110 }
    },
    {
      id: 'biceps',
      name: 'Biceps',
      frontPath: "M75 110 C65 120 70 140 85 150 C100 140 95 120 85 110 Z M185 110 C195 120 190 140 175 150 C160 140 165 120 175 110 Z",
      labelPos: { x: 135, y: 130 }
    },
    {
      id: 'forearms',
      name: 'Forearms',
      frontPath: "M70 155 C60 170 65 190 80 200 C95 190 90 170 80 155 Z M190 155 C200 170 195 190 180 200 C165 190 170 170 180 155 Z",
      labelPos: { x: 135, y: 175 }
    },
    {
      id: 'abs',
      name: 'Abdominals',
      frontPath: "M100 145 L85 155 V210 L135 220 L185 210 V155 L170 145 Z",
      labelPos: { x: 135, y: 180 }
    },
    {
      id: 'quads',
      name: 'Quads',
      frontPath: "M100 230 L80 250 V340 L135 360 L190 340 V250 L170 230 Z",
      labelPos: { x: 135, y: 290 }
    },
    {
      id: 'calves',
      name: 'Calves',
      frontPath: "M110 360 C100 370 100 390 115 400 L135 405 L155 400 C170 390 170 370 160 360 Z",
      backPath: "M110 360 C100 370 100 390 115 400 L135 405 L155 400 C170 390 170 370 160 360 Z",
      labelPos: { x: 135, y: 380 }
    },
    {
      id: 'back',
      name: 'Back',
      backPath: "M100 80 L75 90 C65 140 70 200 135 220 C200 200 205 140 195 90 L170 80 Z",
      labelPos: { x: 135, y: 150 }
    },
    {
      id: 'triceps',
      name: 'Triceps',
      backPath: "M75 115 C65 125 70 145 85 155 C100 145 95 125 85 115 Z M185 115 C195 125 190 145 175 155 C160 145 165 125 175 115 Z",
      labelPos: { x: 135, y: 135 }
    },
    {
      id: 'glutes',
      name: 'Glutes',
      backPath: "M105 210 C90 220 95 240 115 250 L135 255 L155 250 C175 240 180 220 165 210 Z",
      labelPos: { x: 135, y: 230 }
    },
    {
      id: 'hamstrings',
      name: 'Hamstrings',
      backPath: "M100 250 L80 270 V340 L135 360 L190 340 V270 L170 250 Z",
      labelPos: { x: 135, y: 300 }
    }
    // Add more muscle groups as needed with precise frontPath/backPath
  ];


  const handleMuscleClick = async (muscleId) => {
    console.log('Clicked muscle group:', muscleId);
    setHoveredMuscle(muscleId);
    try {
      console.log('Fetching exercises for muscle group:', muscleId);
      await getExercisesForMuscle(muscleId);
      const currentExercises = useWorkoutStore.getState().exercises;
      console.log('Loaded exercises:', currentExercises);
      if (onMuscleClick && currentExercises && currentExercises.length > 0) {
        console.log('Calling onMuscleClick with exercises:', currentExercises);
        onMuscleClick(muscleId, currentExercises);
      } else {
        console.log('No exercises found for muscle group:', muscleId, 'Exercises:', currentExercises);
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
    }
  };

  const getMuscleFillColor = (muscleId) => {
    if (hoveredMuscle === muscleId) {
      return 'rgba(59, 130, 246, 0.5)'; // Semi-transparent blue for hover
    }
    return 'rgba(0,0,0,0)'; // Fully transparent when not hovered
  };

  const getMuscleStrokeColor = (muscleId) => {
    if (hoveredMuscle === muscleId) {
      return '#1D4ED8'; // Darker blue stroke on hover
    }
    return 'transparent'; // No stroke when not hovered
  };

  // IMPORTANT: Updated to your provided image dimensions
  const IMAGE_WIDTH = 268;
  const IMAGE_HEIGHT = 459;

  return (
    <div className="flex flex-col items-center space-y-8 p-4 bg-gray-50 min-h-[550px]">
      <h3 className="text-2xl font-bold text-gray-800 mb-8">Select a Muscle Group</h3>

      {/* Main Container for Human Body Views */}
      <div className="flex flex-wrap justify-center gap-8 w-full max-w-4xl">
        {/* Front View */}
        <div className="relative w-[268px] h-[459px] bg-black rounded-lg shadow-xl overflow-hidden group">
          <img
            src="/human_front.png.jpg"
            alt="Front Human Anatomy"
            className="w-full h-full object-contain"
          />
          <svg
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            viewBox={`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`}
            className="absolute inset-0 z-10"
          >
            {musclesData.map((muscle) => {
              if (muscle.frontPath) {
                return (
                  <g key={muscle.id}
                     className="cursor-pointer"
                     onMouseEnter={() => setHoveredMuscle(muscle.id)}
                     onMouseLeave={() => setHoveredMuscle('')}
                     onClick={() => handleMuscleClick(muscle.id)}>
                    <path
                      d={muscle.frontPath}
                      fill={getMuscleFillColor(muscle.id)}
                      stroke={getMuscleStrokeColor(muscle.id)}
                      strokeWidth="2"
                      className="transition-all duration-200 ease-in-out"
                    />
                    <text
                      x={muscle.labelPos.x}
                      y={muscle.labelPos.y}
                      textAnchor="middle"
                      className={`text-sm font-bold pointer-events-none transition-colors duration-200
                                  ${hoveredMuscle === muscle.id ? 'fill-white text-shadow-md' : 'fill-gray-300'}`}
                      style={{ textShadow: hoveredMuscle === muscle.id ? '1px 1px 3px rgba(0,0,0,0.7)' : 'none' }}
                    >
                      {muscle.name}
                    </text>
                  </g>
                );
              }
              return null;
            })}
          </svg>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full shadow-md">
            Front View
          </div>
        </div>

        {/* Back View */}
        <div className="relative w-[268px] h-[459px] bg-black rounded-lg shadow-xl overflow-hidden group">
          <img
            src="/human_back.png.jpg"
            alt="Back Human Anatomy"
            className="w-full h-full object-contain"
          />
          <svg
            width={IMAGE_WIDTH}
            height={IMAGE_HEIGHT}
            viewBox={`0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}`}
            className="absolute inset-0 z-10"
          >
            {musclesData.map((muscle) => {
              if (muscle.backPath) {
                return (
                  <g key={muscle.id}
                     className="cursor-pointer"
                     onMouseEnter={() => setHoveredMuscle(muscle.id)}
                     onMouseLeave={() => setHoveredMuscle('')}
                     onClick={() => handleMuscleClick(muscle.id)}>
                    <path
                      d={muscle.backPath}
                      fill={getMuscleFillColor(muscle.id)}
                      stroke={getMuscleStrokeColor(muscle.id)}
                      strokeWidth="2"
                      className="transition-all duration-200 ease-in-out"
                    />
                    <text
                      x={muscle.labelPos.x}
                      y={muscle.labelPos.y}
                      textAnchor="middle"
                      className={`text-sm font-bold pointer-events-none transition-colors duration-200
                                  ${hoveredMuscle === muscle.id ? 'fill-white text-shadow-md' : 'fill-gray-300'}`}
                      style={{ textShadow: hoveredMuscle === muscle.id ? '1px 1px 3px rgba(0,0,0,0.7)' : 'none' }}
                    >
                      {muscle.name}
                    </text>
                  </g>
                );
              }
              return null;
            })}
          </svg>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-medium px-3 py-1 rounded-full shadow-md">
            Back View
          </div>
        </div>
      </div>
    </div>
  );
};

export default HumanBodyModel;