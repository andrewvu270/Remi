from fastapi import APIRouter, HTTPException, Header
from typing import List, Optional
import uuid
from datetime import datetime

from ..database import get_supabase, get_supabase_admin
from ..schemas.course import Course, CourseCreate, CourseUpdate, CourseWithTasks
from ..services.auth_service import AuthService

router = APIRouter()

@router.get("/", response_model=List[Course])
async def get_courses(
    skip: int = 0, 
    limit: int = 100
):
    try:
        supabase = get_supabase()
        response = supabase.table("courses").select("*").range(skip, skip + limit - 1).execute()
        return response.data if response.data else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=Course)
async def create_course(
    course: CourseCreate,
    authorization: Optional[str] = Header(None)
):
    """
    Create a course. For authenticated users, stores in Supabase.
    For guests, returns course data to be stored in browser localStorage only.
    """
    try:
        print(f"[COURSE] Creating course: {course}")
        course_data = course.dict(exclude_unset=True)
        print(f"[COURSE] Course data: {course_data}")
        
        # Generate IDs
        if 'id' not in course_data or not course_data['id']:
            course_data['id'] = str(uuid.uuid4())
        
        # Determine if user is authenticated
        user_id = None
        is_authenticated = False
        
        if authorization:
            try:
                # Extract token from "Bearer <token>"
                token = authorization.split(" ")[1] if " " in authorization else authorization
                user_data = await AuthService.verify_user_session(token)
                if user_data:
                    user_id = user_data.get("id")
                    is_authenticated = True
                    print(f"[COURSE] Authenticated user found: {user_id}")
            except Exception as e:
                print(f"[COURSE] Error verifying token: {str(e)}")
        
        if not is_authenticated:
            # Guest user - don't save to Supabase
            print("[COURSE] Guest user - returning course data without saving to Supabase")
            course_data['user_id'] = 'guest'  # Mark as guest for frontend
            course_data['created_at'] = datetime.utcnow().isoformat()
            course_data['updated_at'] = datetime.utcnow().isoformat()
            return course_data
        
        # Authenticated user - ensure user exists in public.users table first
        try:
            supabase_admin = get_supabase_admin()
            
            # Check if user exists in public.users
            user_check = supabase_admin.table("users").select("id").eq("id", user_id).execute()
            if not user_check.data:
                # Create user in public.users if missing
                print(f"[COURSE] User {user_id} not found in public.users, creating...")
                new_user_data = {
                    "id": user_id,
                    "email": f"user_{user_id}@example.com",  # Placeholder email
                    "full_name": "",
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat()
                }
                supabase_admin.table("users").insert(new_user_data).execute()
                print(f"[COURSE] Created user in public.users: {user_id}")
        except Exception as e:
            print(f"[COURSE] Error ensuring user exists: {str(e)}")
        
        # Save course to Supabase
        course_data['user_id'] = user_id
        course_data['created_at'] = datetime.utcnow().isoformat()
        course_data['updated_at'] = datetime.utcnow().isoformat()
        
        try:
            supabase_admin = get_supabase_admin()
            response = supabase_admin.table("courses").insert(course_data).execute()
            if response.data:
                print(f"[COURSE] Course saved to Supabase: {response.data[0]}")
                return response.data[0]
            else:
                raise HTTPException(status_code=500, detail="Failed to save course to database")
        except Exception as e:
            print(f"[COURSE] Error saving to Supabase: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save course: {str(e)}")
    except Exception as e:
        import traceback
        print(f"[COURSE] Error creating course: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{course_id}", response_model=CourseWithTasks)
async def get_course(course_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("courses").select("*").eq("id", course_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Course not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{course_id}", response_model=Course)
async def update_course(
    course_id: str,
    course_update: CourseUpdate
):
    try:
        supabase = get_supabase()
        update_data = course_update.dict(exclude_unset=True)
        response = supabase.table("courses").update(update_data).eq("id", course_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Course not found")
        
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{course_id}")
async def delete_course(course_id: str):
    try:
        supabase = get_supabase()
        response = supabase.table("courses").delete().eq("id", course_id).execute()
        return {"message": "Course deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))