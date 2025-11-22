from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional
from datetime import datetime
import uuid

from ..database import get_supabase, get_supabase_admin
from ..schemas.task import Task, TaskCreate, TaskUpdate, TaskWithCourse, TaskList
from ..ml.weight_calculator import TaskWeightCalculator
from ..ml.priority_calculator import PriorityCalculator
from ..services.auth_service import AuthService

router = APIRouter()

@router.get("/", response_model=TaskList)
async def get_tasks(
    skip: int = 0, 
    limit: int = 100,
    course_id: str = None
):
    try:
        print(f"Fetching tasks with skip={skip}, limit={limit}, course_id={course_id}")
        # Use admin client to bypass RLS
        supabase = get_supabase_admin()
        
        # Build query
        query = supabase.table("tasks").select("*")
        
        if course_id:
            query = query.eq("course_id", course_id)
        
        # Sort by: 1) status (pending first), 2) due_date (soonest first), 3) priority_score (highest first)
        query = query.order("status", desc=True).order("due_date", desc=False).order("priority_score", desc=True)
        
        # Get total count
        count_response = supabase.table("tasks").select("*", count="exact").execute()
        total = count_response.count if hasattr(count_response, 'count') else 0
        
        # Apply pagination
        query = query.range(skip, skip + limit - 1)
        
        # Execute query
        response = query.execute()
        tasks = response.data if response.data else []
        
        print(f"Found {len(tasks)} tasks")
        print(f"Total tasks: {total}")
        
        result = TaskList(tasks=tasks, total=total)
        print(f"Returning TaskList with {len(result.tasks)} tasks")
        return result
    except Exception as e:
        import traceback
        print(f"Error fetching tasks: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching tasks: {str(e)}"
        )

@router.post("/", response_model=Task)
async def create_task(
    task: TaskCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Create a task. Only authenticated users can create tasks.
    Tasks from guest migration will include their own IDs.
    """
    try:
        # Verify authentication
        user_id = None
        if authorization:
            try:
                token = authorization.split(" ")[1] if " " in authorization else authorization
                user_data = await AuthService.verify_user_session(token)
                if user_data:
                    user_id = user_data.get("id")
                    print(f"[TASK] Authenticated user found: {user_id}")
            except Exception as e:
                print(f"[TASK] Error verifying token: {str(e)}")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Authentication required to create tasks")
        
        # Calculate weight and priority scores if not provided
        weight_calculator = TaskWeightCalculator()
        priority_calculator = PriorityCalculator()
        
        task_data = task.dict()
        
        # Use provided scores or calculate new ones
        if 'weight_score' not in task_data or task_data['weight_score'] is None:
            task_data['weight_score'] = weight_calculator.calculate_weight_score(task_data)
        
        if 'priority_score' not in task_data or task_data['priority_score'] is None:
            task_data['priority_score'] = priority_calculator.calculate_priority_score({
                **task_data,
                'weight_score': task_data['weight_score']
            })
        
        # Create task in Supabase
        new_task = {
            "id": task_data.get('id', str(uuid.uuid4())),  # Use provided ID or generate new
            "user_id": user_id,  # Always use authenticated user's ID
            "course_id": task_data.get('course_id'),
            "title": task_data.get('title'),
            "description": task_data.get('description', ''),
            "task_type": task_data.get('task_type'),
            "due_date": task_data.get('due_date').isoformat() if isinstance(task_data.get('due_date'), datetime) else task_data.get('due_date'),
            "weight_score": task_data['weight_score'],
            "predicted_hours": task_data.get('predicted_hours', 4.0),
            "priority_score": task_data['priority_score'],
            "status": task_data.get('status', 'pending'),
            "grade_percentage": task_data.get('grade_percentage', 0),
            "created_at": task_data.get('created_at', datetime.utcnow().isoformat())
        }
        
        supabase_admin = get_supabase_admin()
        response = supabase_admin.table("tasks").insert(new_task).execute()
        return response.data[0] if response.data else new_task
    except HTTPException:
        raise
    except Exception as e:
        print(f"[TASK] Error creating task: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{task_id}", response_model=TaskWithCourse)
async def get_task(task_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("tasks").select("*").eq("id", task_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    try:
        supabase = get_supabase()
        
        update_data = task_update.dict(exclude_unset=True)
        
        # Recalculate weight and priority if relevant fields changed
        if any(field in update_data for field in ['task_type', 'grade_percentage']):
            weight_calculator = TaskWeightCalculator()
            priority_calculator = PriorityCalculator()
            
            # Get current task
            current = supabase.table("tasks").select("*").eq("id", task_id).execute()
            if not current.data:
                raise HTTPException(status_code=404, detail="Task not found")
            
            current_task = current.data[0]
            task_data = {
                'task_type': update_data.get('task_type', current_task.get('task_type')),
                'grade_percentage': update_data.get('grade_percentage', current_task.get('grade_percentage'))
            }
            
            weight_score = weight_calculator.calculate_weight_score(task_data)
            update_data['weight_score'] = weight_score
            update_data['priority_score'] = priority_calculator.calculate_priority_score({
                **task_data,
                'weight_score': weight_score,
                'due_date': update_data.get('due_date', current_task.get('due_date')),
                'predicted_hours': update_data.get('predicted_hours', current_task.get('predicted_hours'))
            })
        
        update_data['updated_at'] = datetime.utcnow().isoformat()
        response = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{task_id}")
async def delete_task(task_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("tasks").delete().eq("id", task_id).execute()
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{task_id}/complete", response_model=Task)
async def complete_task(task_id: str):
    try:
        supabase = get_supabase()
        update_data = {
            "status": "completed",
            "updated_at": datetime.utcnow().isoformat()
        }
        response = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))