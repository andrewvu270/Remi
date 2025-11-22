"""Guest mode endpoints for unauthenticated users"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
import uuid

from ..database import get_supabase

router = APIRouter(prefix="/api/guest", tags=["guest"])

class GuestTaskCreate(BaseModel):
    title: str
    description: str = ""
    task_type: str
    due_date: str
    grade_percentage: float = 0.0
    predicted_hours: float = 4.0
    status: str = "pending"

class GuestTaskResponse(BaseModel):
    id: str
    title: str
    task_type: str
    due_date: str
    grade_percentage: float
    status: str
    priority_score: float
    
    class Config:
        from_attributes = True

class GuestSessionCreate(BaseModel):
    session_id: str

@router.post("/session")
async def create_guest_session(data: GuestSessionCreate):
    """Create or get guest session"""
    try:
        supabase = get_supabase()
        
        # Check if session exists
        existing = supabase.table("guest_sessions").select("*").eq("id", data.session_id).execute()
        
        if existing.data:
            return {"session_id": existing.data[0]["id"], "is_new": False}
        
        # Create new session
        new_session = {
            "id": data.session_id,
            "created_at": datetime.utcnow().isoformat()
        }
        response = supabase.table("guest_sessions").insert(new_session).execute()
        
        if response.data:
            return {"session_id": response.data[0]["id"], "is_new": True}
        return {"session_id": data.session_id, "is_new": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tasks/{guest_session_id}")
async def create_guest_task(
    guest_session_id: str,
    task: GuestTaskCreate
):
    """Create task for guest"""
    try:
        supabase = get_supabase()
        
        # Verify session exists
        session = supabase.table("guest_sessions").select("*").eq("id", guest_session_id).execute()
        
        if not session.data:
            raise HTTPException(status_code=404, detail="Guest session not found")
        
        # Create new task
        new_task = {
            "id": str(uuid.uuid4()),
            "guest_session_id": guest_session_id,
            "title": task.title,
            "description": task.description,
            "task_type": task.task_type,
            "due_date": task.due_date,
            "grade_percentage": task.grade_percentage,
            "predicted_hours": task.predicted_hours,
            "status": task.status,
            "created_at": datetime.utcnow().isoformat()
        }
        
        response = supabase.table("guest_tasks").insert(new_task).execute()
        return response.data[0] if response.data else new_task
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tasks/{guest_session_id}")
async def get_guest_tasks(guest_session_id: str):
    """Get all tasks for guest"""
    try:
        supabase = get_supabase()
        response = supabase.table("guest_tasks").select("*").eq("guest_session_id", guest_session_id).order("due_date", desc=False).execute()
        tasks = response.data if response.data else []
        return {"tasks": tasks, "total": len(tasks)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tasks/{task_id}")
async def update_guest_task(
    task_id: str,
    task_update: GuestTaskCreate
):
    """Update guest task"""
    try:
        supabase = get_supabase()
        update_data = {
            "title": task_update.title,
            "description": task_update.description,
            "task_type": task_update.task_type,
            "due_date": task_update.due_date,
            "grade_percentage": task_update.grade_percentage,
            "status": task_update.status,
            "updated_at": datetime.utcnow().isoformat()
        }
        response = supabase.table("guest_tasks").update(update_data).eq("id", task_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tasks/{task_id}")
async def delete_guest_task(task_id: str):
    """Delete guest task"""
    try:
        supabase = get_supabase()
        response = supabase.table("guest_tasks").delete().eq("id", task_id).execute()
        return {"message": "Task deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/migrate/{guest_session_id}")
async def migrate_guest_data(
    guest_session_id: str,
    user_id: str
):
    """Migrate guest data to user account"""
    try:
        supabase = get_supabase()
        
        # Get all guest tasks
        guest_tasks_response = supabase.table("guest_tasks").select("*").eq("guest_session_id", guest_session_id).execute()
        guest_tasks = guest_tasks_response.data if guest_tasks_response.data else []
        
        migrated_count = 0
        
        # Migrate tasks to user account
        for guest_task in guest_tasks:
            new_task = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "title": guest_task.get("title"),
                "description": guest_task.get("description", ""),
                "task_type": guest_task.get("task_type"),
                "due_date": guest_task.get("due_date"),
                "grade_percentage": guest_task.get("grade_percentage", 0),
                "predicted_hours": guest_task.get("predicted_hours", 4.0),
                "status": guest_task.get("status", "pending"),
                "created_at": datetime.utcnow().isoformat()
            }
            
            supabase.table("tasks").insert(new_task).execute()
            migrated_count += 1
        
        # Delete guest data
        supabase.table("guest_tasks").delete().eq("guest_session_id", guest_session_id).execute()
        supabase.table("guest_sessions").delete().eq("id", guest_session_id).execute()
        
        return {
            "message": "Data migrated successfully",
            "migrated_tasks": migrated_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
