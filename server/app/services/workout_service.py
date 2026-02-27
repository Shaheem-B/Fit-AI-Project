from typing import List, Dict, Any
from app.models.workout import Exercise, MuscleGroup, WorkoutStreak
from datetime import datetime, date, timedelta
from app.db.mongodb import get_database
from pydantic import field_validator

# Predefined exercises database
EXERCISES_DATABASE = {
    "chest": [
        Exercise(
            name="Push-ups",
            description="Classic bodyweight chest exercise",
            muscle_group="chest",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Start in a plank position with hands shoulder-width apart",
                "Lower your body until chest nearly touches the floor",
                "Push back up to starting position",
                "Keep your body in a straight line throughout"
            ],
            tips=["Keep core tight", "Don't let hips sag", "Full range of motion"]
        ),
        Exercise(
            name="Bench Press",
            description="Classic barbell chest exercise",
            muscle_group="chest",
            equipment="barbell",
            difficulty="intermediate",
            instructions=[
                "Lie on bench with feet flat on floor",
                "Grip barbell slightly wider than shoulders",
                "Lower bar to chest with control",
                "Press up to starting position"
            ],
            tips=["Keep shoulders back", "Don't bounce off chest", "Use spotter for heavy weights"]
        ),
        Exercise(
            name="Dumbbell Flyes",
            description="Isolation exercise for chest muscles",
            muscle_group="chest",
            equipment="dumbbells",
            difficulty="beginner",
            instructions=[
                "Lie on bench holding dumbbells above chest",
                "Lower weights in wide arc until chest stretch",
                "Bring weights together above chest",
                "Squeeze chest muscles at top"
            ],
            tips=["Control the movement", "Don't go too heavy", "Feel the stretch"]
        ),
        Exercise(
            name="Incline Push-ups",
            description="Modified push-ups with elevated feet",
            muscle_group="chest",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Place feet on elevated surface",
                "Perform push-ups in standard form",
                "Focus on upper chest activation",
                "Maintain straight body line"
            ],
            tips=["Adjust elevation for difficulty", "Keep core engaged"]
        ),
        Exercise(
            name="Dips",
            description="Bodyweight exercise targeting chest and triceps",
            muscle_group="chest",
            equipment="bodyweight",
            difficulty="intermediate",
            instructions=[
                "Hold dip bars with arms extended",
                "Lower body until shoulders below elbows",
                "Push up to starting position",
                "Keep chest up and shoulders back"
            ],
            tips=["Lean forward for more chest focus", "Use assistance if needed"]
        )
    ],
    
    "back": [
        Exercise(
            name="Pull-ups",
            description="Bodyweight back exercise",
            muscle_group="back",
            equipment="pull-up bar",
            difficulty="intermediate",
            instructions=[
                "Hang from bar with overhand grip",
                "Pull body up until chin over bar",
                "Lower with control to starting position",
                "Keep chest up and shoulders back"
            ],
            tips=["Use assistance if needed", "Full range of motion", "Engage lats"]
        ),
        Exercise(
            name="Bent-over Row",
            description="Barbell rowing exercise",
            muscle_group="back",
            equipment="barbell",
            difficulty="intermediate",
            instructions=[
                "Stand with feet hip-width apart",
                "Bend forward at hips with straight back",
                "Pull barbell to lower chest",
                "Lower with control"
            ],
            tips=["Keep back straight", "Pull elbows back", "Squeeze shoulder blades"]
        ),
        Exercise(
            name="Lat Pulldown",
            description="Cable exercise for latissimus dorsi",
            muscle_group="back",
            equipment="cable machine",
            difficulty="beginner",
            instructions=[
                "Sit at lat pulldown machine",
                "Grip bar wider than shoulders",
                "Pull bar to upper chest",
                "Control the return"
            ],
            tips=["Lean back slightly", "Pull with lats, not arms", "Full stretch"]
        ),
        Exercise(
            name="Deadlift",
            description="Compound exercise for entire posterior chain",
            muscle_group="back",
            equipment="barbell",
            difficulty="advanced",
            instructions=[
                "Stand with feet hip-width apart",
                "Bend down and grip barbell",
                "Stand up by extending hips and knees",
                "Lower with control"
            ],
            tips=["Keep back straight", "Start with lighter weights", "Use proper form"]
        ),
        Exercise(
            name="Face Pulls",
            description="Rear delt and upper trap exercise",
            muscle_group="back",
            equipment="cable",
            difficulty="beginner",
            instructions=[
                "Set cable at face height",
                "Pull rope to face, separating hands",
                "Squeeze shoulder blades together",
                "Return with control"
            ],
            tips=["External rotation at end", "Light weight", "Focus on rear delts"]
        )
    ],
     "biceps": [
        Exercise(
            name="Bicep Curls",
            description="Classic bicep isolation exercise",
            muscle_group="arms",
            equipment="dumbbells",
            difficulty="beginner",
            instructions=[
                "Stand with dumbbells at sides",
                "Curl weights up to shoulders",
                "Squeeze biceps at top",
                "Lower with control"
            ],
            tips=["Keep elbows at sides", "Full range of motion", "Control the negative"]
        ),
        Exercise(
            name="Tricep Dips",
            description="Bodyweight tricep exercise",
            muscle_group="arms",
            equipment="bodyweight",
            difficulty="intermediate",
            instructions=[
                "Sit on edge of bench",
                "Lower body by bending elbows",
                "Push back up to starting position",
                "Keep torso upright"
            ],
            tips=["Don't go too low", "Use assistance if needed", "Keep elbows back"]
        ),
        Exercise(
            name="Hammer Curls",
            description="Bicep exercise with neutral grip",
            muscle_group="arms",
            equipment="dumbbells",
            difficulty="beginner",
            instructions=[
                "Hold dumbbells with neutral grip",
                "Curl weights up to shoulders",
                "Focus on bicep contraction",
                "Lower with control"
            ],
            tips=["Targets brachialis", "Keep wrists neutral", "Full range of motion"]
        ),
        Exercise(
            name="Overhead Tricep Extension",
            description="Tricep isolation exercise",
            muscle_group="arms",
            equipment="dumbbell",
            difficulty="beginner",
            instructions=[
                "Hold dumbbell overhead with both hands",
                "Lower behind head by bending elbows",
                "Extend back to starting position",
                "Keep elbows pointing forward"
            ],
            tips=["Don't flare elbows", "Control the movement", "Feel tricep stretch"]
        ),
        Exercise(
            name="Chin-ups",
            description="Bicep-focused pull-up variation",
            muscle_group="arms",
            equipment="pull-up bar",
            difficulty="intermediate",
            instructions=[
                "Hang from bar with underhand grip",
                "Pull body up until chin over bar",
                "Focus on bicep contraction",
                "Lower with control"
            ],
            tips=["Narrower grip than pull-ups", "Bicep-focused", "Full range of motion"]
        )
    ],
    
    "forearms": [
        Exercise(
            name="Bicep Curls",
            description="Classic bicep isolation exercise",
            muscle_group="arms",
            equipment="dumbbells",
            difficulty="beginner",
            instructions=[
                "Stand with dumbbells at sides",
                "Curl weights up to shoulders",
                "Squeeze biceps at top",
                "Lower with control"
            ],
            tips=["Keep elbows at sides", "Full range of motion", "Control the negative"]
        ),
        
        Exercise(
            name="Hammer Curls",
            description="Bicep exercise with neutral grip",
            muscle_group="arms",
            equipment="dumbbells",
            difficulty="beginner",
            instructions=[
                "Hold dumbbells with neutral grip",
                "Curl weights up to shoulders",
                "Focus on bicep contraction",
                "Lower with control"
            ],
            tips=["Targets brachialis", "Keep wrists neutral", "Full range of motion"]
        ),
       
        Exercise(
            name="Chin-ups",
            description="Bicep-focused pull-up variation",
            muscle_group="arms",
            equipment="pull-up bar",
            difficulty="intermediate",
            instructions=[
                "Hang from bar with underhand grip",
                "Pull body up until chin over bar",
                "Focus on bicep contraction",
                "Lower with control"
            ],
            tips=["Narrower grip than pull-ups", "Bicep-focused", "Full range of motion"]
        )
    ],
     "triceps": [
        Exercise(
            name="Tricep Dips",
            description="Bodyweight tricep exercise",
            muscle_group="arms",
            equipment="bodyweight",
            difficulty="intermediate",
            instructions=[
                "Sit on edge of bench",
                "Lower body by bending elbows",
                "Push back up to starting position",
                "Keep torso upright"
            ],
            tips=["Don't go too low", "Use assistance if needed", "Keep elbows back"]
        ),
        Exercise(
            name="Overhead Tricep Extension",
            description="Tricep isolation exercise",
            muscle_group="arms",
            equipment="dumbbell",
            difficulty="beginner",
            instructions=[
                "Hold dumbbell overhead with both hands",
                "Lower behind head by bending elbows",
                "Extend back to starting position",
                "Keep elbows pointing forward"
            ],
            tips=["Don't flare elbows", "Control the movement", "Feel tricep stretch"]
        )
    ],
    
    "legs": [
        Exercise(
            name="Squats",
            description="Fundamental leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Stand with feet shoulder-width apart",
                "Lower body by bending knees and hips",
                "Go down until thighs parallel to floor",
                "Stand back up to starting position"
            ],
            tips=["Keep chest up", "Knees track over toes", "Full depth"]
        ),
        Exercise(
            name="Lunges",
            description="Single-leg leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Step forward into lunge position",
                "Lower back knee toward ground",
                "Push back to starting position",
                "Alternate legs"
            ],
            tips=["Keep torso upright", "Don't let knee go past toes", "Controlled movement"]
        ),
        Exercise(
            name="Deadlift",
            description="Hip hinge movement pattern",
            muscle_group="legs",
            equipment="barbell",
            difficulty="intermediate",
            instructions=[
                "Stand with feet hip-width apart",
                "Bend at hips with straight back",
                "Lower weight along legs",
                "Stand up by extending hips"
            ],
            tips=["Keep bar close to body", "Start with lighter weight", "Hip hinge movement"]
        ),
        Exercise(
            name="Calf Raises",
            description="Calf muscle isolation",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Stand on edge of step or platform",
                "Raise up on toes",
                "Lower below step level",
                "Repeat for full range"
            ],
            tips=["Full range of motion", "Control the movement", "Hold at top briefly"]
        ),
        Exercise(
            name="Bulgarian Split Squats",
            description="Advanced single-leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="advanced",
            instructions=[
                "Place rear foot on elevated surface",
                "Lower into single-leg squat",
                "Push back up to starting position",
                "Keep front knee over ankle"
            ],
            tips=["Focus on front leg", "Keep torso upright", "Controlled movement"]
        )
    ],
    
    "hamstrings": [
        Exercise(
            name="Squats",
            description="Fundamental leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Stand with feet shoulder-width apart",
                "Lower body by bending knees and hips",
                "Go down until thighs parallel to floor",
                "Stand back up to starting position"
            ],
            tips=["Keep chest up", "Knees track over toes", "Full depth"]
        ),
        Exercise(
            name="Lunges",
            description="Single-leg leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Step forward into lunge position",
                "Lower back knee toward ground",
                "Push back to starting position",
                "Alternate legs"
            ],
            tips=["Keep torso upright", "Don't let knee go past toes", "Controlled movement"]
        ),
        Exercise(
            name="Deadlift",
            description="Hip hinge movement pattern",
            muscle_group="legs",
            equipment="barbell",
            difficulty="intermediate",
            instructions=[
                "Stand with feet hip-width apart",
                "Bend at hips with straight back",
                "Lower weight along legs",
                "Stand up by extending hips"
            ],
            tips=["Keep bar close to body", "Start with lighter weight", "Hip hinge movement"]
        ),
        
        Exercise(
            name="Bulgarian Split Squats",
            description="Advanced single-leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="advanced",
            instructions=[
                "Place rear foot on elevated surface",
                "Lower into single-leg squat",
                "Push back up to starting position",
                "Keep front knee over ankle"
            ],
            tips=["Focus on front leg", "Keep torso upright", "Controlled movement"]
        )
    ],
        "glutes": [
        Exercise(
            name="Squats",
            description="Fundamental leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Stand with feet shoulder-width apart",
                "Lower body by bending knees and hips",
                "Go down until thighs parallel to floor",
                "Stand back up to starting position"
            ],
            tips=["Keep chest up", "Knees track over toes", "Full depth"]
        ),
        Exercise(
            name="Lunges",
            description="Single-leg leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Step forward into lunge position",
                "Lower back knee toward ground",
                "Push back to starting position",
                "Alternate legs"
            ],
            tips=["Keep torso upright", "Don't let knee go past toes", "Controlled movement"]
        ),
        Exercise(
            name="Deadlift",
            description="Hip hinge movement pattern",
            muscle_group="legs",
            equipment="barbell",
            difficulty="intermediate",
            instructions=[
                "Stand with feet hip-width apart",
                "Bend at hips with straight back",
                "Lower weight along legs",
                "Stand up by extending hips"
            ],
            tips=["Keep bar close to body", "Start with lighter weight", "Hip hinge movement"]
        ),
        
        Exercise(
            name="Bulgarian Split Squats",
            description="Advanced single-leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="advanced",
            instructions=[
                "Place rear foot on elevated surface",
                "Lower into single-leg squat",
                "Push back up to starting position",
                "Keep front knee over ankle"
            ],
            tips=["Focus on front leg", "Keep torso upright", "Controlled movement"]
        )
    ],
    
    "calves": [
       
        Exercise(
            name="Calf Raises",
            description="Calf muscle isolation",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Stand on edge of step or platform",
                "Raise up on toes",
                "Lower below step level",
                "Repeat for full range"
            ],
            tips=["Full range of motion", "Control the movement", "Hold at top briefly"]
        ),
        Exercise(
            name="Bulgarian Split Squats",
            description="Advanced single-leg exercise",
            muscle_group="legs",
            equipment="bodyweight",
            difficulty="advanced",
            instructions=[
                "Place rear foot on elevated surface",
                "Lower into single-leg squat",
                "Push back up to starting position",
                "Keep front knee over ankle"
            ],
            tips=["Focus on front leg", "Keep torso upright", "Controlled movement"]
        )
    ],
    
    "shoulders": [
        Exercise(
            name="Shoulder Press",
            description="Overhead pressing movement",
            muscle_group="shoulders",
            equipment="dumbbells",
            difficulty="intermediate",
            instructions=[
                "Start with dumbbells at shoulder height",
                "Press weights straight up overhead",
                "Lower with control to shoulders",
                "Keep core engaged"
            ],
            tips=["Don't arch back excessively", "Full range of motion", "Control the weight"]
        ),
        Exercise(
            name="Lateral Raises",
            description="Side deltoid isolation",
            muscle_group="shoulders",
            equipment="dumbbells",
            difficulty="beginner",
            instructions=[
                "Hold dumbbells at sides",
                "Raise weights out to sides",
                "Lift to shoulder height",
                "Lower with control"
            ],
            tips=["Light weight", "No swinging", "Feel the burn"]
        ),
        Exercise(
            name="Rear Delt Flyes",
            description="Posterior deltoid exercise",
            muscle_group="shoulders",
            equipment="dumbbells",
            difficulty="beginner",
            instructions=[
                "Bend forward at hips",
                "Hold dumbbells with arms hanging",
                "Raise weights out to sides",
                "Squeeze shoulder blades"
            ],
            tips=["Light weight", "Focus on rear delts", "Control the movement"]
        ),
        Exercise(
            name="Front Raises",
            description="Anterior deltoid isolation",
            muscle_group="shoulders",
            equipment="dumbbells",
            difficulty="beginner",
            instructions=[
                "Hold dumbbells in front of thighs",
                "Raise weights forward to shoulder height",
                "Lower with control",
                "Keep arms slightly bent"
            ],
            tips=["Light weight", "No momentum", "Focus on front delts"]
        ),
        Exercise(
            name="Upright Rows",
            description="Compound shoulder exercise",
            muscle_group="shoulders",
            equipment="barbell",
            difficulty="intermediate",
            instructions=[
                "Hold barbell with narrow grip",
                "Pull bar up along body",
                "Lift to chest level",
                "Lower with control"
            ],
            tips=["Don't go too high", "Keep elbows up", "Controlled movement"]
        )
    ],
    "quads": [ # <-- Ensure 'quads' (or 'legs' if that's your primary category) exists here
            Exercise(
                name="Barbell Back Squat",
                description="A compound exercise that works the entire lower body, focusing on quads, glutes, and hamstrings.",
                muscle_group="quads",
                recommended_sets=3,
                recommended_reps=8
            ),
            Exercise(
                name="Leg Press",
                description="A compound exercise that targets the quads, glutes, and hamstrings using a leg press machine.",
                muscle_group="quads",
                recommended_sets=3,
                recommended_reps=10
            ),
            # ... more quad exercises ...
        ],
    
    "abs": [
        Exercise(
            name="Plank",
            description="Isometric core exercise",
            muscle_group="core",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Start in push-up position",
                "Hold body in straight line",
                "Engage core muscles",
                "Breathe normally"
            ],
            tips=["Keep hips level", "Don't sag", "Start with shorter holds"]
        ),
        Exercise(
            name="Crunches",
            description="Basic abdominal exercise",
            muscle_group="core",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Lie on back with knees bent",
                "Lift shoulders off ground",
                "Crunch abs to lift torso",
                "Lower with control"
            ],
            tips=["Don't pull on neck", "Focus on abs", "Controlled movement"]
        ),
        Exercise(
            name="Russian Twists",
            description="Oblique and core exercise",
            muscle_group="core",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Sit with knees bent",
                "Lean back slightly",
                "Rotate torso side to side",
                "Keep feet off ground for difficulty"
            ],
            tips=["Keep chest up", "Controlled rotation", "Engage core"]
        ),
        Exercise(
            name="Mountain Climbers",
            description="Dynamic core exercise",
            muscle_group="core",
            equipment="bodyweight",
            difficulty="intermediate",
            instructions=[
                "Start in plank position",
                "Bring one knee to chest",
                "Quickly switch legs",
                "Maintain plank position"
            ],
            tips=["Keep hips level", "Fast pace", "Engage core throughout"]
        ),
        Exercise(
            name="Dead Bug",
            description="Core stability exercise",
            muscle_group="core",
            equipment="bodyweight",
            difficulty="beginner",
            instructions=[
                "Lie on back with arms up",
                "Bring knees to 90 degrees",
                "Lower opposite arm and leg",
                "Return to starting position"
            ],
            tips=["Keep lower back pressed down", "Controlled movement", "Alternate sides"]
        )
    ]
}

def get_exercises_by_muscle_group(muscle_group: str) -> List[Exercise]:
    """Get exercises for a specific muscle group"""
    return EXERCISES_DATABASE.get(muscle_group.lower(), [])

def get_all_muscle_groups() -> List[MuscleGroup]:
    """Get all muscle groups with their exercises"""
    muscle_groups = []
    for muscle, exercises in EXERCISES_DATABASE.items():
        muscle_groups.append(MuscleGroup(
            name=muscle,
            display_name=muscle.capitalize(),
            exercises=exercises
        ))
    return muscle_groups

def search_exercises(query: str, muscle_group: str = None) -> List[Exercise]:
    """Search exercises by name or description"""
    results = []
    query_lower = query.lower()
    
    for muscle, exercises in EXERCISES_DATABASE.items():
        if muscle_group and muscle_group.lower() != muscle:
            continue
            
        for exercise in exercises:
            if (query_lower in exercise.name.lower() or 
                query_lower in exercise.description.lower() or
                any(query_lower in instruction.lower() for instruction in exercise.instructions)):
                results.append(exercise)
    
    return results

async def calculate_workout_streak(user_id: str) -> WorkoutStreak:
    """Calculate user's workout streak"""
    db = get_database()
    workout_logs_collection = db["workout_logs"]
    
    # Get all workout logs for user, sorted by date
    cursor = workout_logs_collection.find(
        {"user_id": user_id}
    ).sort("date", -1)
    
    logs = await cursor.to_list(length=365)  # Last year
    
    if not logs:
        return WorkoutStreak(
            current_streak=0,
            longest_streak=0,
            last_workout_date=None,
            total_workout_days=0
        )
    
    # Convert dates and sort
    workout_dates = []
    for log in logs:
        if isinstance(log["date"], datetime):
            workout_dates.append(log["date"].date())
        else:
            workout_dates.append(log["date"])
    
    # Remove duplicates and sort
    unique_dates = sorted(list(set(workout_dates)), reverse=True)
    
    # Calculate current streak
    current_streak = 0
    today = date.today()
    
    for i, workout_date in enumerate(unique_dates):
        if i == 0 and workout_date == today:
            # Today's workout
            current_streak = 1
        elif i == 0 and workout_date == today - timedelta(days=1):
            # Yesterday's workout
            current_streak = 1
        elif i > 0 and unique_dates[i-1] - workout_date == timedelta(days=1):
            # Consecutive day
            current_streak += 1
        else:
            break
    
    # Calculate longest streak
    longest_streak = 0
    temp_streak = 1
    
    for i in range(1, len(unique_dates)):
        if unique_dates[i-1] - unique_dates[i] == timedelta(days=1):
            temp_streak += 1
        else:
            longest_streak = max(longest_streak, temp_streak)
            temp_streak = 1
    
    longest_streak = max(longest_streak, temp_streak)
    
    return WorkoutStreak(
        current_streak=current_streak,
        longest_streak=longest_streak,
        last_workout_date=unique_dates[0] if unique_dates else None,
        total_workout_days=len(unique_dates)
    )
