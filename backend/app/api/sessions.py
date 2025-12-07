"""Sessions API endpoints for study session tracking"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from pydantic import BaseModel
from app.services.auth_service import AuthService
from app.database import get_supabase_admin

router = APIRouter()

class SessionUpdateRequest(BaseModel):
    completed: Optional[bool] = None
    actual_hours: Optional[float] = None
    reflection: Optional[str] = None
    pomodoro_count: Optional[int] = None
    notes: Optional[str] = None

class SessionStartRequest(BaseModel):
    start_time: str  # ISO timestamp

class SessionCompleteRequest(BaseModel):
    actual_hours: float
    reflection: Optional[str] = None
    completed_at: str  # ISO timestamp
    pomodoro_count: int = 0
    what_learned: Optional[str] = None
    what_was_challenging: Optional[str] = None
    what_to_improve: Optional[str] = None

async def get_current_user(request: Request) -> dict:
    """Get current authenticated user"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = auth_header.split(" ")[1]
    user = AuthService.verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    return user

async def get_current_user_optional(request: Request) -> Optional[dict]:
    """Get current user if authenticated, None if guest"""
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        if not token:
            return None
            
        user = AuthService.verify_token(token)
        return user
    except:
        return None

@router.get("/")
async def list_sessions(
    request: Request,
    status: str = Query("all", regex="^(all|active|completed)$"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None
):
    """List all sessions for the authenticated user with optional filtering"""
    try:
        user = await get_current_user(request)
        supabase = get_supabase_admin()
        
        # Build query
        query = supabase.table("scheduled_study_sessions").select("*").eq("user_id", user['sub'])
        
        # Apply status filter
        if status == "active":
            query = query.eq("completed", False)
        elif status == "completed":
            query = query.eq("completed", True)
        
        # Apply date range filter
        if date_from:
            query = query.gte("day", date_from)
        if date_to:
            query = query.lte("day", date_to)
        
        # Order by date
        query = query.order("day", desc=False)
        
        result = query.execute()
        
        return {
            "success": True,
            "sessions": result.data if result.data else [],
            "count": len(result.data) if result.data else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list sessions: {str(e)}")

@router.get("/{session_id}")
async def get_session(session_id: str, request: Request):
    """Get detailed information about a specific session"""
    try:
        user = await get_current_user(request)
        supabase = get_supabase_admin()
        
        # Get session
        session_result = supabase.table("scheduled_study_sessions")\
            .select("*")\
            .eq("id", session_id)\
            .eq("user_id", user['sub'])\
            .execute()
        
        if not session_result.data or len(session_result.data) == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_result.data[0]
        
        # Get reflection if exists
        reflection_result = supabase.table("session_reflections")\
            .select("*")\
            .eq("session_id", session_id)\
            .eq("user_id", user['sub'])\
            .execute()
        
        if reflection_result.data and len(reflection_result.data) > 0:
            session['reflection_details'] = reflection_result.data[0]
        
        return {
            "success": True,
            "session": session
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get session: {str(e)}")

@router.patch("/{session_id}")
async def update_session(session_id: str, update_data: SessionUpdateRequest, request: Request):
    """Update session details"""
    try:
        user = await get_current_user(request)
        supabase = get_supabase_admin()
        
        # Verify session belongs to user
        session_check = supabase.table("scheduled_study_sessions")\
            .select("id")\
            .eq("id", session_id)\
            .eq("user_id", user['sub'])\
            .execute()
        
        if not session_check.data or len(session_check.data) == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Build update data
        update_dict = {}
        if update_data.completed is not None:
            update_dict['completed'] = update_data.completed
        if update_data.actual_hours is not None:
            update_dict['actual_hours'] = update_data.actual_hours
        if update_data.pomodoro_count is not None:
            update_dict['pomodoro_count'] = update_data.pomodoro_count
        if update_data.notes is not None:
            update_dict['notes'] = update_data.notes
        
        update_dict['updated_at'] = datetime.now().isoformat()
        
        # Update session
        result = supabase.table("scheduled_study_sessions")\
            .update(update_dict)\
            .eq("id", session_id)\
            .execute()
        
        return {
            "success": True,
            "session": result.data[0] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update session: {str(e)}")

@router.post("/{session_id}/start")
async def start_session(session_id: str, start_data: SessionStartRequest, request: Request):
    """Mark session as started and record start time"""
    try:
        user = await get_current_user(request)
        supabase = get_supabase_admin()
        
        # Verify session belongs to user
        session_check = supabase.table("scheduled_study_sessions")\
            .select("id")\
            .eq("id", session_id)\
            .eq("user_id", user['sub'])\
            .execute()
        
        if not session_check.data or len(session_check.data) == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Update session with start time
        result = supabase.table("scheduled_study_sessions")\
            .update({
                "started_at": start_data.start_time,
                "updated_at": datetime.now().isoformat()
            })\
            .eq("id", session_id)\
            .execute()
        
        return {
            "success": True,
            "session": result.data[0] if result.data else None,
            "message": "Session started"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")

@router.post("/{session_id}/complete")
async def complete_session(session_id: str, complete_data: SessionCompleteRequest, request: Request):
    """Mark session as complete and save all completion data"""
    try:
        user = await get_current_user(request)
        supabase = get_supabase_admin()
        
        # Verify session belongs to user
        session_result = supabase.table("scheduled_study_sessions")\
            .select("*")\
            .eq("id", session_id)\
            .eq("user_id", user['sub'])\
            .execute()
        
        if not session_result.data or len(session_result.data) == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_result.data[0]
        
        # Update scheduled session
        update_data = {
            "completed": True,
            "actual_hours": complete_data.actual_hours,
            "completed_at": complete_data.completed_at,
            "pomodoro_count": complete_data.pomodoro_count,
            "updated_at": datetime.now().isoformat()
        }
        
        supabase.table("scheduled_study_sessions")\
            .update(update_data)\
            .eq("id", session_id)\
            .execute()
        
        # Create study_sessions record (for historical tracking)
        study_session_data = {
            "id": f"completed-{session_id}",
            "user_id": user['sub'],
            "task_id": session.get('task_id', ''),
            "duration_minutes": int(complete_data.actual_hours * 60),
            "completed": True,
            "notes": session.get('notes', ''),
            "reflection": complete_data.reflection,
            "pomodoro_count": complete_data.pomodoro_count,
            "started_at": session.get('started_at'),
            "completed_at": complete_data.completed_at,
            "created_at": datetime.now().isoformat()
        }
        
        supabase.table("study_sessions").upsert(study_session_data).execute()
        
        # Save reflection if provided
        if complete_data.reflection or complete_data.what_learned or complete_data.what_was_challenging:
            reflection_data = {
                "session_id": session_id,
                "user_id": user['sub'],
                "reflection_text": complete_data.reflection or "",
                "what_learned": complete_data.what_learned,
                "what_was_challenging": complete_data.what_was_challenging,
                "what_to_improve": complete_data.what_to_improve,
                "created_at": datetime.now().isoformat()
            }
            
            supabase.table("session_reflections").insert(reflection_data).execute()
        
        # Update study habits (call separate function)
        await update_study_habits(user['sub'], session, complete_data)
        
        return {
            "success": True,
            "message": "Session completed successfully",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete session: {str(e)}")

async def update_study_habits(user_id: str, session: dict, complete_data: SessionCompleteRequest):
    """Update user's study habits based on completed session"""
    try:
        supabase = get_supabase_admin()
        
        # Get existing habits or create new
        habits_result = supabase.table("study_habits")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()
        
        if habits_result.data and len(habits_result.data) > 0:
            habits = habits_result.data[0]
            
            # Update totals
            total_sessions = habits.get('total_sessions_completed', 0) + 1
            total_hours = float(habits.get('total_study_hours', 0)) + complete_data.actual_hours
            
            # Calculate new averages
            avg_duration = total_hours / total_sessions if total_sessions > 0 else complete_data.actual_hours
            
            # Calculate estimation accuracy
            estimated = float(session.get('estimated_hours', 0))
            actual = complete_data.actual_hours
            accuracy = 1 - abs(estimated - actual) / estimated if estimated > 0 else 1.0
            current_accuracy = float(habits.get('estimation_accuracy', 1.0))
            new_accuracy = (current_accuracy * (total_sessions - 1) + accuracy) / total_sessions
            
            # Update Pomodoro usage
            pomodoro_sessions = 1 if complete_data.pomodoro_count > 0 else 0
            current_pomodoro_rate = float(habits.get('pomodoro_usage_rate', 0))
            new_pomodoro_rate = (current_pomodoro_rate * (total_sessions - 1) + pomodoro_sessions) / total_sessions
            
            # Determine time of day
            completed_at = datetime.fromisoformat(complete_data.completed_at.replace('Z', '+00:00'))
            hour = completed_at.hour
            if 5 <= hour < 12:
                time_of_day = 'morning'
            elif 12 <= hour < 17:
                time_of_day = 'afternoon'
            elif 17 <= hour < 21:
                time_of_day = 'evening'
            else:
                time_of_day = 'night'
            
            # Update habits
            update_data = {
                "total_sessions_completed": total_sessions,
                "total_study_hours": total_hours,
                "average_session_duration": avg_duration,
                "estimation_accuracy": new_accuracy,
                "pomodoro_usage_rate": new_pomodoro_rate,
                "preferred_time_of_day": time_of_day,  # Simplified - could track distribution
                "last_updated": datetime.now().isoformat()
            }
            
            supabase.table("study_habits")\
                .update(update_data)\
                .eq("user_id", user_id)\
                .execute()
        else:
            # Create new habits record
            completed_at = datetime.fromisoformat(complete_data.completed_at.replace('Z', '+00:00'))
            hour = completed_at.hour
            if 5 <= hour < 12:
                time_of_day = 'morning'
            elif 12 <= hour < 17:
                time_of_day = 'afternoon'
            elif 17 <= hour < 21:
                time_of_day = 'evening'
            else:
                time_of_day = 'night'
            
            new_habits = {
                "user_id": user_id,
                "total_sessions_completed": 1,
                "total_study_hours": complete_data.actual_hours,
                "average_session_duration": complete_data.actual_hours,
                "estimation_accuracy": 1.0,
                "pomodoro_usage_rate": 1.0 if complete_data.pomodoro_count > 0 else 0.0,
                "preferred_time_of_day": time_of_day,
                "completion_rate": 1.0,
                "created_at": datetime.now().isoformat()
            }
            
            supabase.table("study_habits").insert(new_habits).execute()
            
    except Exception as e:
        # Log error but don't fail the completion
        print(f"Failed to update study habits: {e}")
