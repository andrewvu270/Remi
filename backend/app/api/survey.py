"""Survey endpoints for collecting training data for LightGBM model"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import json
from pathlib import Path
import random
from ..database import get_supabase_admin
from ..services.llm_client import LLMClientManager
import os

router = APIRouter(prefix="/api/survey", tags=["survey"])

class SurveyResponse(BaseModel):
    """Survey response data for model training"""
    task_title: str
    task_type: str  # Assignment, Exam, Quiz, Project, etc.
    due_date: str  # YYYY-MM-DD
    grade_percentage: float  # 0-100
    estimated_hours: float  # Hours needed to complete
    actual_hours: float  # Actual hours spent
    difficulty_level: int  # 1-5 scale
    priority_rating: int  # 1-5 scale (how important user felt it was)
    completed: bool
    completion_date: Optional[str] = None  # YYYY-MM-DD if completed
    notes: Optional[str] = None

class SurveySubmission(BaseModel):
    """Container for survey submissions"""
    responses: List[SurveyResponse]
    user_feedback: Optional[str] = None

# Store survey data in JSON file (can be migrated to database later)
SURVEY_DATA_DIR = Path("survey_data")
SURVEY_DATA_DIR.mkdir(exist_ok=True)
SURVEY_FILE = SURVEY_DATA_DIR / "responses.jsonl"

@router.post("/submit")
async def submit_survey(submission: SurveySubmission, authorization: Optional[str] = Header(None)):
    """Submit survey responses for model training - saves to both file and Supabase"""
    try:
        # Save to JSONL file (backup)
        with open(SURVEY_FILE, "a") as f:
            for response in submission.responses:
                f.write(response.model_dump_json() + "\n")
        
        # Save to Supabase
        supabase = get_supabase_admin()
        saved_count = 0
        
        for response in submission.responses:
            try:
                data = response.model_dump()
                data['user_feedback'] = submission.user_feedback
                data['is_synthetic'] = False  # Real user data
                data['created_at'] = datetime.now().isoformat()
                
                result = supabase.table("survey_responses").insert(data).execute()
                if result.data:
                    saved_count += 1
            except Exception as e:
                print(f"[SURVEY] Error saving to Supabase: {str(e)}")
        
        return {
            "message": "Survey submitted successfully",
            "count": len(submission.responses),
            "saved_to_db": saved_count,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save survey: {str(e)}")

@router.get("/data/count")
async def get_survey_count():
    """Get count of survey responses collected"""
    try:
        if not SURVEY_FILE.exists():
            return {"count": 0}
        
        with open(SURVEY_FILE, "r") as f:
            count = sum(1 for _ in f)
        
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/export")
async def export_survey_data():
    """Export all survey data for model training (admin only)"""
    try:
        if not SURVEY_FILE.exists():
            return {"data": []}
        
        data = []
        with open(SURVEY_FILE, "r") as f:
            for line in f:
                if line.strip():
                    data.append(json.loads(line))
        
        return {"data": data, "count": len(data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def survey_status():
    """Get survey collection status"""
    try:
        # Get count from Supabase
        supabase = get_supabase_admin()
        db_count = 0
        try:
            result = supabase.table("survey_responses").select("id", count="exact").execute()
            db_count = result.count if hasattr(result, 'count') else 0
        except:
            pass
        
        # Get file count as backup
        file_count = 0
        if SURVEY_FILE.exists():
            with open(SURVEY_FILE, "r") as f:
                file_count = sum(1 for _ in f)
        
        total_count = max(db_count, file_count)
        
        return {
            "active": True,
            "responses_collected": total_count,
            "database_count": db_count,
            "file_count": file_count,
            "min_responses_for_training": 100,
            "ready_for_training": total_count >= 100,
            "survey_url": "http://localhost:3000/survey"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-ai-samples")
async def generate_ai_samples(count: int = 5):
    """Generate synthetic survey data using Groq/OpenAI for training"""
    try:
        if count > 20:
            raise HTTPException(status_code=400, detail="Maximum 20 samples at a time")
        
        # Initialize LLM client (Groq-first, OpenAI fallback)
        llm_client = LLMClientManager()
        
        # Generate diverse task scenarios
        prompt = f"""Generate {count} realistic academic task completion records for training a workload prediction model.
        Each record should represent a completed academic task with realistic time estimates and actual completion times.
        
        Return a JSON array with exactly {count} objects, each containing:
        - task_title: Specific, realistic task name
        - task_type: One of [Assignment, Exam, Quiz, Project, Reading, Lab, Presentation]
        - course_name: Realistic course name (vary across STEM, humanities, social sciences)
        - due_date: Date in YYYY-MM-DD format (spread across next 3 months)
        - grade_percentage: Weight in final grade (0-30, realistic for task type)
        - estimated_hours: Initial time estimate (realistic for task type)
        - actual_hours: Actual time spent (can be more or less than estimate)
        - difficulty_level: 1-5 scale
        - priority_rating: 1-5 scale (based on importance)
        - completed: true
        - completion_date: 1-2 days before due_date in YYYY-MM-DD format
        - notes: Brief realistic note about the task
        
        Make the data diverse and realistic. Include tasks that were underestimated and overestimated.
        Ensure variety in courses, task types, and time requirements.
        
        Return ONLY the JSON array, no additional text."""
        
        # Call LLM (Groq first, OpenAI fallback)
        response = await llm_client.chat_completion(
            messages=[
                {"role": "system", "content": "You are a helpful assistant that generates realistic academic task data for training machine learning models."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=2000
        )
        
        # Parse the response
        try:
            # Extract JSON from LLM response
            response_text = response.choices[0].message.content
            
            # Try to find JSON array in response
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                generated_data = json.loads(json_str)
            else:
                generated_data = json.loads(response_text)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
        
        # Save to Supabase
        supabase = get_supabase_admin()
        saved_count = 0
        
        for item in generated_data:
            try:
                # Add metadata
                item['is_synthetic'] = True
                item['user_feedback'] = 'AI-generated training data'
                item['created_at'] = datetime.now().isoformat()
                
                # Ensure dates are strings
                if 'due_date' in item and not isinstance(item['due_date'], str):
                    item['due_date'] = str(item['due_date'])
                if 'completion_date' in item and not isinstance(item['completion_date'], str):
                    item['completion_date'] = str(item['completion_date'])
                
                result = supabase.table("survey_responses").insert(item).execute()
                if result.data:
                    saved_count += 1
            except Exception as e:
                print(f"[SURVEY] Error saving AI data: {str(e)}")
        
        return {
            "message": f"Generated {saved_count} AI samples successfully",
            "requested": count,
            "saved": saved_count,
            "samples": generated_data[:3]  # Return first 3 as preview
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI samples: {str(e)}")

@router.get("/training-data")
async def get_training_data(include_synthetic: bool = True, limit: int = 1000):
    """Fetch training data from Supabase for model training"""
    try:
        supabase = get_supabase_admin()
        
        # Build query
        query = supabase.table("survey_responses").select("*")
        
        # Filter synthetic data if needed
        if not include_synthetic:
            query = query.eq("is_synthetic", False)
        
        # Apply limit and order
        query = query.order("created_at", desc=True).limit(limit)
        
        result = query.execute()
        
        if not result.data:
            return {"data": [], "count": 0}
        
        # Format for training
        training_data = []
        for record in result.data:
            training_data.append({
                "task_title": record.get("task_title"),
                "task_type": record.get("task_type"),
                "course_name": record.get("course_name", "Unknown"),
                "grade_percentage": record.get("grade_percentage"),
                "estimated_hours": record.get("estimated_hours"),
                "actual_hours": record.get("actual_hours"),
                "difficulty_level": record.get("difficulty_level"),
                "priority_rating": record.get("priority_rating"),
                "is_synthetic": record.get("is_synthetic", False)
            })
        
        return {
            "data": training_data,
            "count": len(training_data),
            "message": "Training data ready for export"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch training data: {str(e)}")
