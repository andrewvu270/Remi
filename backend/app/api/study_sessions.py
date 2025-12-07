"""Study sessions API endpoints for cloud sync"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from app.services.auth_service import AuthService
from app.database import get_supabase_admin

router = APIRouter()

class StudyPlanSaveRequest(BaseModel):
    plan_data: Dict[str, Any]  # The entire study plan object
    sessions: List[Dict[str, Any]]

class StudyPlanResponse(BaseModel):
    id: str
    user_id: str
    plan_data: Dict[str, Any]
    created_at: str
    updated_at: str

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

@router.post("/save")
async def save_study_plan(
    request: StudyPlanSaveRequest,
    http_request: Request
):
    """Save study plan to cloud"""
    try:
        user = await get_current_user(http_request)
        supabase = get_supabase_admin()
        
        # Check if user already has a study plan
        existing = supabase.table("study_plans").select("id").eq("user_id", user['sub']).execute()
        
        plan_data = {
            "user_id": user['sub'],
            "plan_data": request.plan_data,
            "updated_at": datetime.now().isoformat()
        }
        
        if existing.data and len(existing.data) > 0:
            # Update existing plan
            result = supabase.table("study_plans").update(plan_data).eq("user_id", user['sub']).execute()
        else:
            # Create new plan
            plan_data["created_at"] = datetime.now().isoformat()
            result = supabase.table("study_plans").insert(plan_data).execute()
        
        # Save individual sessions
        if request.sessions:
            # Delete old sessions
            supabase.table("scheduled_study_sessions").delete().eq("user_id", user['sub']).execute()
            
            # Insert new sessions
            sessions_data = []
            for session in request.sessions:
                sessions_data.append({
                    "id": session.get('id'),
                    "user_id": user['sub'],
                    "task_id": session.get('task_id', ''),
                    "task_title": session.get('task_title'),
                    "day": session.get('day'),
                    "priority": session.get('priority'),
                    "estimated_hours": session.get('estimated_hours'),
                    "completed": session.get('completed', False),
                    "created_at": datetime.now().isoformat()
                })
            
            if sessions_data:
                supabase.table("scheduled_study_sessions").insert(sessions_data).execute()
        
        return {
            "success": True,
            "message": "Study plan saved to cloud",
            "plan_id": result.data[0]['id'] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save study plan: {str(e)}")

@router.get("/load")
async def load_study_plan(http_request: Request):
    """Load study plan from cloud"""
    try:
        user = await get_current_user(http_request)
        supabase = get_supabase_admin()
        
        # Get study plan
        plan_result = supabase.table("study_plans").select("*").eq("user_id", user['sub']).execute()
        
        if not plan_result.data or len(plan_result.data) == 0:
            return {
                "success": False,
                "message": "No study plan found in cloud"
            }
        
        # Get sessions
        sessions_result = supabase.table("scheduled_study_sessions").select("*").eq("user_id", user['sub']).execute()
        
        return {
            "success": True,
            "plan_data": plan_result.data[0]['plan_data'],
            "sessions": sessions_result.data if sessions_result.data else [],
            "updated_at": plan_result.data[0]['updated_at']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load study plan: {str(e)}")

@router.delete("/clear")
async def clear_study_plan(http_request: Request):
    """Clear study plan from cloud"""
    try:
        user = await get_current_user(http_request)
        supabase = get_supabase_admin()
        
        # Delete sessions
        supabase.table("scheduled_study_sessions").delete().eq("user_id", user['sub']).execute()
        
        # Delete plan
        supabase.table("study_plans").delete().eq("user_id", user['sub']).execute()
        
        return {
            "success": True,
            "message": "Study plan cleared from cloud"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear study plan: {str(e)}")
