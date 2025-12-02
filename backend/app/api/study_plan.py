from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import os
import openai
from pydantic import BaseModel
from app.services.auth_service import AuthService
from app.config import settings

router = APIRouter()

class StudyPlanRequest(BaseModel):
    tasks: List[Dict[str, Any]]
    study_hours_per_day: int = 2
    days_to_plan: int = 7

class StudyPlanResponse(BaseModel):
    plan: str
    total_hours: float
    days_planned: int

def generate_study_plan_prompt(tasks: List[Dict[str, Any]], study_hours: int, days: int) -> str:
    """Generate a structured prompt for OpenAI to create a study plan."""
    task_list = "\n".join([
        f"- {task['title']} (Priority: {task.get('priority_score', 5)}/10, "
        f"Estimated: {task.get('predicted_hours', 2)}h, "
        f"Due: {task.get('due_date', 'No due date')})"
        for task in tasks
    ])
    
    # Add research insights section if available
    research_insights = []
    for task in tasks:
        task_research = []
        if task.get('wiki_summary'):
            task_research.append(f"Wikipedia: {task['wiki_summary']}")
        if task.get('academic_sources'):
            sources = task['academic_sources'][:2]  # Limit to top 2
            task_research.extend([f"Academic: {src.get('title', 'N/A')}" for src in sources])
        if task.get('research_insights', {}).get('recommendations'):
            recs = task['research_insights']['recommendations'][:2]
            task_research.extend([f"Tip: {rec}" for rec in recs])
        
        if task_research:
            research_insights.append(f"{task['title']}:\n" + "\n".join(f"  • {insight}" for insight in task_research))
    
    research_section = "\n\nRESEARCH INSIGHTS:\n" + "\n".join(research_insights) if research_insights else ""
    
    return f"""Create a detailed study plan based on the following tasks and their priorities.
    The user has {study_hours} hours available per day for {days} days.
    
    TASKS:
    {task_list}
    {research_section}
    
    INSTRUCTIONS:
    1. Sort tasks by priority score (highest first) and due date (soonest first)
    2. Allocate more time to higher priority tasks
    3. Break down large tasks into smaller study sessions
    4. Include short breaks between study sessions
    5. Provide time estimates for each session
    6. Format the response in markdown with clear sections for each day
    7. Incorporate research insights to provide more targeted study strategies
    8. Include a summary of total study hours and tasks covered
    
    FORMAT:
    # Study Plan for [Start Date] to [End Date]
    
    ## Day 1: [Date]
    - [Time Block] [Task Name] (Priority: X/10) - [Duration]h
      - [Specific subtask or focus area]
      - [Research-based study tip if available]
    
    ## Summary
    - Total study hours: X hours
    - Tasks covered: X/{len(tasks)}
    """

async def get_current_user_optional(request: Request) -> Optional[dict]:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.split(" ")[1]
    if not token:
        return None
        
    return AuthService.verify_token(token)

@router.post("/generate", response_model=StudyPlanResponse)
async def generate_study_plan(
    request: StudyPlanRequest,
    http_request: Request = None
):
    # Get current user (optional)
    current_user = None
    if http_request:
        current_user = await get_current_user_optional(http_request)
    
    # If you want to require authentication, uncomment the following lines:
    # if not current_user:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Authentication required"
    #     )
    """Generate a study plan using OpenAI's API."""
    try:
        # Initialize OpenAI client
        client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        
        # Generate the prompt
        prompt = generate_study_plan_prompt(
            request.tasks,
            request.study_hours_per_day,
            request.days_to_plan
        )
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": "You are a helpful study planner that creates efficient, realistic study schedules."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
        )
        
        plan_content = response.choices[0].message.content
        
        # Calculate total planned hours
        total_hours = request.study_hours_per_day * request.days_to_plan
        
        return {
            "plan": plan_content,
            "total_hours": total_hours,
            "days_planned": request.days_to_plan
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate study plan: {str(e)}"
        )

# PDF Generation Endpoint will be added here

# Add the router to the main FastAPI app in app/api/__init__.py
