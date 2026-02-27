import traceback
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
from datetime import date, datetime
from app.models.workout import (
    ExerciseSearchResponse, WorkoutLogCreate, DailyWorkoutLogResponse,
    WorkoutLog, DailyWorkoutLog, WorkoutStreak, Exercise
)
from app.core.security import get_current_user_id
from app.db.mongodb import get_database
from app.services.workout_service import (
    get_exercises_by_muscle_group, get_all_muscle_groups,
    search_exercises, calculate_workout_streak
)
from bson import ObjectId


router = APIRouter()

@router.get("/muscle-groups")
async def get_muscle_groups(user_id: str = Depends(get_current_user_id)):
    """Get all available muscle groups with exercises"""
    try:
        muscle_groups = get_all_muscle_groups()
        return {"muscle_groups": muscle_groups}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get muscle groups: {str(e)}"
        )

@router.get("/exercises/{muscle_group}")
async def get_exercises_by_muscle(
    muscle_group: str,
    user_id: str = Depends(get_current_user_id)
):
    """Get exercises for a specific muscle group"""
    try:
        # Convert muscle_group to lowercase for consistent lookup in EXERCISES_DATABASE
        exercises = get_exercises_by_muscle_group(muscle_group.lower()) # <-- FIX APPLIED HERE
        if not exercises:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No exercises found for muscle group: {muscle_group}"
            )

        return {"exercises": exercises}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get exercises: {str(e)}"
        )

@router.get("/search", response_model=ExerciseSearchResponse)
async def search_exercises_endpoint(
    query: str = Query(..., min_length=2, description="Exercise search query"),
    muscle_group: Optional[str] = Query(None, description="Filter by muscle group"),
    user_id: str = Depends(get_current_user_id)
):
    """Search exercises by name or description"""
    if not query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty"
        )

    try:
        # Pass muscle_group as lowercase if provided
        exercises = search_exercises(query.strip(), muscle_group.lower() if muscle_group else None)
        return ExerciseSearchResponse(
            exercises=exercises,
            total_results=len(exercises)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Exercise search failed: {str(e)}"
        )

@router.post("/log", response_model=DailyWorkoutLogResponse)
async def log_workout(
    workout_log: WorkoutLogCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Log a workout to a specific date"""
    db = get_database()
    workout_logs_collection = db["workout_logs"]

    try:
        # Log incoming request
        print(f"[WORKOUT LOG] user_id={user_id}")
        print(f"[WORKOUT LOG] exercise={workout_log.exercise_name}, muscle={workout_log.muscle_group}, duration={workout_log.duration}s, date={workout_log.date}")
        
        # Set date to today if not provided
        log_date = workout_log.date or date.today()

        # Validate muscle group (ensure consistency with EXERCISES_DATABASE keys)
        # Assuming workout_log.muscle_group is already lowercase or will be handled by service
        valid_muscle_groups = [
            "chest", "back", "arms", "legs", "shoulders", "core", "cardio", 
            "biceps", "triceps", "forearms", "abs", "glutes", "quads", "hamstrings", "calves",
            # Cardio activity types
            "running", "cycling", "walking", "swimming", "hiit", "jump_rope"
        ]
        if workout_log.muscle_group not in valid_muscle_groups:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid muscle group. Must be one of: {', '.join(valid_muscle_groups)}"
            )

        # Create workout log entry
        log_entry = WorkoutLog(
            exercise_name=workout_log.exercise_name,
            muscle_group=workout_log.muscle_group,
            sets=workout_log.sets,
            reps=workout_log.reps,
            weight=workout_log.weight,
            duration=workout_log.duration,
            distance=workout_log.distance,
            notes=workout_log.notes
        )

        # Convert date to datetime for MongoDB compatibility
        log_datetime = datetime.combine(log_date, datetime.min.time())

        # Find or create daily log for this date
        existing_log = await workout_logs_collection.find_one({
            "user_id": user_id,
            "date": log_datetime
        })

        if existing_log:
            # Update existing log
            existing_log["workouts"].append(log_entry.dict())

            # Recalculate totals
            total_sets = sum(w["sets"] for w in existing_log["workouts"])
            total_reps = sum(w["reps"] for w in existing_log["workouts"])
            total_weight = sum((w.get("weight") or 0) for w in existing_log["workouts"])
            total_duration = sum((w.get("duration") or 0) for w in existing_log["workouts"])

            existing_log["total_sets"] = total_sets
            existing_log["total_reps"] = total_reps
            existing_log["total_weight"] = total_weight
            existing_log["total_duration"] = total_duration
            existing_log["updated_at"] = log_entry.logged_at

            await workout_logs_collection.replace_one(
                {"_id": existing_log["_id"]},
                existing_log
            )

            return DailyWorkoutLogResponse(
                id=str(existing_log["_id"]),
                user_id=existing_log["user_id"],
                date=log_date,  # Return original date for API response
                workouts=[WorkoutLog(**w) for w in existing_log["workouts"]],
                total_sets=existing_log["total_sets"],
                total_reps=existing_log["total_reps"],
                total_weight=existing_log["total_weight"],
                total_duration=existing_log["total_duration"],
                created_at=existing_log["created_at"],
                updated_at=existing_log["updated_at"]
            )
        else:
            # Create new daily log
            new_log = DailyWorkoutLog(
                user_id=user_id,
                date=log_datetime,
                workouts=[],
                total_sets=0,
                total_reps=0,
                total_weight=0.0,
                total_duration=0
            )

            # Add the workout entry
            new_log.workouts.append(log_entry)
            new_log.total_sets = log_entry.sets
            new_log.total_reps = log_entry.reps
            new_log.total_weight = (log_entry.weight or 0.0)
            new_log.total_duration = (log_entry.duration or 0)

            log_dict = new_log.dict(by_alias=True)
            result = await workout_logs_collection.insert_one(log_dict)
            log_dict["_id"] = result.inserted_id

            return DailyWorkoutLogResponse(
                id=str(result.inserted_id),
                user_id=log_dict["user_id"],
                date=log_date,  # Return original date for API response
                workouts=[WorkoutLog(**w) for w in log_dict["workouts"]],
                total_sets=log_dict["total_sets"],
                total_reps=log_dict["total_reps"],
                total_weight=log_dict["total_weight"],
                total_duration=log_dict["total_duration"],
                created_at=log_dict["created_at"],
                updated_at=log_dict["updated_at"]
            )
    except Exception as e:
        print(f"Error logging workout: {e}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log workout: {str(e)}"
        )

@router.get("/daily", response_model=DailyWorkoutLogResponse)
async def get_daily_workout_log(
    target_date: Optional[date] = Query(None, description="Date to get logs for (defaults to today)"),
    user_id: str = Depends(get_current_user_id)
):
    """Get daily workout log for a specific date"""
    db = get_database()
    workout_logs_collection = db["workout_logs"]

    # Use today if no date provided
    log_date = target_date or date.today()

    # Convert date to datetime for MongoDB compatibility
    log_datetime = datetime.combine(log_date, datetime.min.time())

    # Find daily log
    daily_log = await workout_logs_collection.find_one({
        "user_id": user_id,
        "date": log_datetime
    })

    if not daily_log:
        # Return empty log for the date
        empty_log = DailyWorkoutLog(
            user_id=user_id,
            date=log_datetime,
            workouts=[],
            total_sets=0,
            total_reps=0,
            total_weight=0.0,
            total_duration=0
        )

        return DailyWorkoutLogResponse(
            id="",
            user_id=user_id,
            date=log_date,
            workouts=[],
            total_sets=0,
            total_reps=0,
            total_weight=0.0,
            total_duration=0,
            created_at=empty_log.created_at,
            updated_at=empty_log.updated_at
        )

    return DailyWorkoutLogResponse(
        id=str(daily_log["_id"]),
        user_id=daily_log["user_id"],
        date=log_date,  # Return original date for API response
        workouts=[WorkoutLog(**w) for w in daily_log["workouts"]],
        total_sets=daily_log["total_sets"],
        total_reps=daily_log["total_reps"],
        total_weight=daily_log["total_weight"],
        total_duration=daily_log["total_duration"],
        created_at=daily_log["created_at"],
        updated_at=daily_log["updated_at"]
    )

@router.get("/streak", response_model=WorkoutStreak)
async def get_workout_streak(user_id: str = Depends(get_current_user_id)):
    """Get user's workout streak information"""
    try:
        streak = await calculate_workout_streak(user_id)
        return streak
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate streak: {str(e)}"
        )

@router.get("/history")
async def get_workout_history(
    limit: int = Query(30, ge=1, le=365, description="Number of days to retrieve"),
    user_id: str = Depends(get_current_user_id)
):
    """Get workout history for the user"""
    db = get_database()
    workout_logs_collection = db["workout_logs"]

    try:
        # Get recent workout logs
        cursor = workout_logs_collection.find(
            {"user_id": user_id}
        ).sort("date", -1).limit(limit)

        logs = await cursor.to_list(length=limit)

        # Convert to response format
        history = []
        for log in logs:
            history.append({
                "id": str(log["_id"]),
                "date": log["date"].date() if isinstance(log["date"], datetime) else log["date"],
                "total_sets": log["total_sets"],
                "total_reps": log["total_reps"],
                "total_weight": log["total_weight"],
                "total_duration": log["total_duration"],
                "workout_count": len(log["workouts"])
            })

        return {"history": history, "total_days": len(history)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workout history: {str(e)}"
        )

@router.delete("/log/{log_id}")
async def delete_workout_log(
    log_id: str,
    workout_index: int = Query(..., ge=0, description="Index of workout in daily log"),
    user_id: str = Depends(get_current_user_id)
):
    """Delete a specific workout log entry"""
    db = get_database()
    workout_logs_collection = db["workout_logs"]

    try:
        # Find the daily log
        daily_log = await workout_logs_collection.find_one({
            "user_id": user_id,
            "_id": ObjectId(log_id)
        })

        if not daily_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Daily log not found"
            )

        # Remove the workout entry
        if workout_index < len(daily_log["workouts"]):
            removed_workout = daily_log["workouts"].pop(workout_index)

            # Recalculate totals
            total_sets = sum(w["sets"] for w in daily_log["workouts"])
            total_reps = sum(w["reps"] for w in daily_log["workouts"])
            total_weight = sum((w.get("weight") or 0) for w in daily_log["workouts"])
            total_duration = sum((w.get("duration") or 0) for w in daily_log["workouts"])

            daily_log["total_sets"] = total_sets
            daily_log["total_reps"] = total_reps
            daily_log["total_weight"] = total_weight
            daily_log["total_duration"] = total_duration
            daily_log["updated_at"] = removed_workout["logged_at"]

            # Update in database
            await workout_logs_collection.replace_one(
                {"_id": daily_log["_id"]},
                daily_log
            )

            return {"message": "Workout log entry deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workout entry not found"
            )

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete workout log: {str(e)}"
        )

@router.post("/debug")
async def debug_workout(
    workout_log: WorkoutLogCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Debug endpoint to test workout validation"""
    return {
        "success": True,
        "received": {
            "exercise_name": workout_log.exercise_name,
            "muscle_group": workout_log.muscle_group,
            "sets": workout_log.sets,
            "reps": workout_log.reps,
            "weight": workout_log.weight,
            "duration": workout_log.duration,
            "distance": workout_log.distance,
            "notes": workout_log.notes,
            "date": workout_log.date,
            "user_id": user_id
        },
        "types": {
            "exercise_name": type(workout_log.exercise_name).__name__,
            "sets": type(workout_log.sets).__name__,
            "reps": type(workout_log.reps).__name__,
            "weight": type(workout_log.weight).__name__ if workout_log.weight else "None",
            "duration": type(workout_log.duration).__name__ if workout_log.duration else "None",
            "distance": type(workout_log.distance).__name__ if workout_log.distance else "None",
            "date": type(workout_log.date).__name__ if workout_log.date else "None",
        }
    }