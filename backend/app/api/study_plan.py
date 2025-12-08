from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import OAuth2PasswordBearer
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import os
from pydantic import BaseModel
from app.services.auth_service import AuthService
from app.services.llm_client import LLMClientManager
from app.services.study_analytics_service import StudyAnalyticsService
from app.config import settings
import math
import json

router = APIRouter()

class StudyPlanRequest(BaseModel):
    tasks: List[Dict[str, Any]]
    study_hours_per_day: int = 2
    start_date: Optional[str] = None  # Format: YYYY-MM-DD, defaults to tomorrow

class StudyPlanResponse(BaseModel):
    plan: str
    total_hours: float
    days_planned: int
    warning: Optional[str] = None
    needs_more_hours: bool = False
    sessions: Optional[List[Dict[str, Any]]] = None

async def get_user_study_preferences(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch user's study preferences from study habits analysis
    Returns personalized recommendations for scheduling
    """
    try:
        from app.database import get_supabase_client
        supabase = get_supabase_client()
        
        # Get recent study habits
        habits_response = supabase.table('study_habits').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(1).execute()
        
        if not habits_response.data:
            return None
        
        habit = habits_response.data[0]
        
        # Get AI analysis for personalized recommendations
        analytics_service = StudyAnalyticsService()
        
        # Prepare minimal data for quick analysis
        sessions_response = supabase.table('study_sessions').select('*').eq('user_id', user_id).eq('completed', True).order('completed_at', desc=True).limit(20).execute()
        
        if not sessions_response.data or len(sessions_response.data) < 3:
            return None
        
        # Extract preferences from habits
        preferences = {
            'optimal_time': habit.get('most_productive_time', 'morning'),
            'recommended_session_length': habit.get('average_session_duration', 2.0),
            'prefers_pomodoro': habit.get('pomodoro_usage_rate', 0) > 0.5,
            'estimation_bias': habit.get('estimation_accuracy', 1.0),
            'weekly_capacity': habit.get('total_hours', 0) / max(1, habit.get('weeks_tracked', 1))
        }
        
        return preferences
        
    except Exception as e:
        print(f"Failed to get user preferences: {e}")
        return None

def smart_schedule_sessions(tasks: List[Dict[str, Any]], study_hours_per_day: int, start_date_str: Optional[str] = None, user_preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Smart scheduling algorithm that:
    1. Starts from user-specified date (or tomorrow if not specified)
    2. Distributes sessions by priority and deadline
    3. Interleaves tasks for variety
    4. Ensures each day totals exactly the user's input hours
    5. Warns if more hours needed
    """
    # Sort tasks by priority (desc) and due date (asc)
    sorted_tasks = sorted(
        tasks,
        key=lambda t: (
            -t.get('priority_score', 5),
            datetime.fromisoformat(t['due_date'].replace('Z', '+00:00')) if t.get('due_date') else datetime.max
        )
    )
    
    # Calculate total hours needed
    total_hours_needed = sum(t.get('predicted_hours', 2) for t in sorted_tasks)
    
    # Find the earliest due date to determine planning window
    earliest_due = None
    for task in sorted_tasks:
        if task.get('due_date'):
            try:
                due = datetime.fromisoformat(task['due_date'].replace('Z', '+00:00'))
                if earliest_due is None or due < earliest_due:
                    earliest_due = due
            except:
                pass
    
    # Start from user-specified date or tomorrow
    if start_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str)
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        except:
            # Fallback to tomorrow if invalid date
            start_date = datetime.now() + timedelta(days=1)
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = datetime.now() + timedelta(days=1)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Calculate days needed based on hours
    days_needed = math.ceil(total_hours_needed / study_hours_per_day)
    
    # Check if we need more hours per day to meet deadlines
    warning = None
    needs_more_hours = False
    adjusted_hours_per_day = study_hours_per_day
    
    if earliest_due:
        days_until_due = (earliest_due - start_date).days
        if days_until_due > 0:
            min_hours_per_day = total_hours_needed / days_until_due
            if min_hours_per_day > study_hours_per_day:
                needs_more_hours = True
                adjusted_hours_per_day = math.ceil(min_hours_per_day)
                warning = f"⚠️ Warning: You need to study at least {adjusted_hours_per_day} hours/day to meet your earliest deadline. Consider increasing your daily study hours or adjusting task priorities."
                days_needed = days_until_due
    
    # Create task pool with remaining hours for each task
    task_pool = [
        {
            'task': task,
            'remaining_hours': task.get('predicted_hours', 2),
            'priority': task.get('priority_score', 5),
            'due_date': task.get('due_date')
        }
        for task in sorted_tasks
    ]
    
    # Schedule sessions across days
    schedule = []
    current_time = 9  # Start at 9 AM
    
    for day_num in range(days_needed):
        current_date = start_date + timedelta(days=day_num)
        day_hours_allocated = 0
        day_sessions = []
        current_time = 9  # Reset time each day
        
        # Interleave tasks - pick from different tasks to avoid monotony
        while day_hours_allocated < adjusted_hours_per_day and any(t['remaining_hours'] > 0 for t in task_pool):
            # Find next task to schedule (prioritize high priority with remaining hours)
            available_tasks = [t for t in task_pool if t['remaining_hours'] > 0]
            if not available_tasks:
                break
            
            # Pick task (rotate through priorities for variety)
            task_to_schedule = available_tasks[0]
            
            # Determine session length (use user preference if available)
            max_session_length = 2.0
            if user_preferences:
                # Use personalized session length
                max_session_length = user_preferences.get('recommended_session_length', 2.0)
                # Adjust for Pomodoro preference (25-min intervals = ~0.5h chunks)
                if user_preferences.get('prefers_pomodoro', False):
                    max_session_length = min(max_session_length, 1.5)  # Pomodoro-friendly
            
            hours_left_today = adjusted_hours_per_day - day_hours_allocated
            session_hours = min(
                max_session_length,
                task_to_schedule['remaining_hours'],
                hours_left_today
            )
            
            # Apply estimation bias correction if available
            if user_preferences and 'estimation_bias' in user_preferences:
                bias = user_preferences['estimation_bias']
                if bias < 0.9:  # User tends to underestimate
                    session_hours *= 1.1  # Add 10% buffer
                elif bias > 1.1:  # User tends to overestimate
                    session_hours *= 0.95  # Reduce slightly
            
            if session_hours < 0.5:  # Skip very small sessions
                break
            
            # Create session (no specific times, just duration for flexibility)
            session = {
                'id': f"session-{len(schedule)}",  # Add unique ID
                'task_id': task_to_schedule['task'].get('id', ''),
                'task_title': task_to_schedule['task']['title'],
                'course_code': task_to_schedule['task'].get('course_code'),
                'day': current_date.strftime('%Y-%m-%d'),
                'priority': task_to_schedule['priority'],
                'estimated_hours': round(session_hours, 1)
            }
            
            day_sessions.append(session)
            task_to_schedule['remaining_hours'] -= session_hours
            day_hours_allocated += session_hours
            
            # Move this task to end of pool for variety
            task_pool.remove(task_to_schedule)
            task_pool.append(task_to_schedule)
        
        schedule.extend(day_sessions)
    
    return {
        'sessions': schedule,
        'total_hours': total_hours_needed,
        'days_planned': days_needed,
        'warning': warning,
        'needs_more_hours': needs_more_hours,
        'adjusted_hours_per_day': adjusted_hours_per_day
    }

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

async def groq_enhance_schedule(
    schedule_result: Dict[str, Any],
    tasks: List[Dict[str, Any]],
    study_hours_per_day: int,
    user_preferences: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Use Groq to enhance the schedule with smart recommendations and optimizations."""
    try:
        llm_client = LLMClientManager()
        
        # Prepare context for Groq
        task_summary = "\n".join([
            f"- {t['title']} (Priority: {t.get('priority_score', 5)}/10, "
            f"Hours: {t.get('predicted_hours', 2)}h, Due: {t.get('due_date', 'N/A')})"
            for t in tasks[:10]  # Limit to first 10 for context
        ])
        
        sessions_summary = "\n".join([
            f"Day {i+1}: {len([s for s in schedule_result['sessions'] if s['day'] == day])} sessions"
            for i, day in enumerate(sorted(set(s['day'] for s in schedule_result['sessions'])))
        ])
        
        # Add user preferences context if available
        preferences_context = ""
        if user_preferences:
            preferences_context = f"""
USER STUDY PREFERENCES (from historical data):
- Most productive time: {user_preferences.get('optimal_time', 'N/A')}
- Preferred session length: {user_preferences.get('recommended_session_length', 'N/A')}h
- Pomodoro preference: {'Yes' if user_preferences.get('prefers_pomodoro') else 'No'}
- Estimation accuracy: {user_preferences.get('estimation_bias', 1.0):.0%}
- Weekly capacity: {user_preferences.get('weekly_capacity', 'N/A')}h

Consider these preferences when providing tips.
"""
        
        prompt = f"""You are an expert study planner. Analyze this study schedule and provide:
1. 2-3 specific, actionable study tips based on the task types, priorities, and user preferences
2. Identify any potential issues (e.g., too many high-priority tasks on same day)
3. Suggest optimal study techniques for the task types involved

TASKS:
{task_summary}

SCHEDULE OVERVIEW:
- Study hours/day: {study_hours_per_day}h
- Total days: {schedule_result['days_planned']}
- Total sessions: {len(schedule_result['sessions'])}
{sessions_summary}

{preferences_context}

Return a JSON object with:
{{
  "tips": ["tip1", "tip2", "tip3"],
  "warnings": ["warning1"] or [],
  "study_techniques": ["technique1", "technique2"]
}}

Keep tips concise (1-2 sentences each). Focus on practical, personalized advice."""

        response = await llm_client.chat_completion(
            messages=[
                {"role": "system", "content": "You are an expert academic study planner focused on practical, evidence-based advice."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        # Parse Groq response
        response_text = response.choices[0].message.content.strip()
        
        # Try to extract JSON
        try:
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                enhancements = json.loads(json_str)
            else:
                enhancements = json.loads(response_text)
        except:
            # Fallback if JSON parsing fails
            enhancements = {
                "tips": ["Break study sessions into focused 25-minute intervals with 5-minute breaks"],
                "warnings": [],
                "study_techniques": ["Active recall", "Spaced repetition"]
            }
        
        # Add enhancements to schedule result
        schedule_result['ai_tips'] = enhancements.get('tips', [])
        schedule_result['ai_warnings'] = enhancements.get('warnings', [])
        schedule_result['study_techniques'] = enhancements.get('study_techniques', [])
        
        return schedule_result
        
    except Exception as e:
        # If Groq fails, return original schedule without enhancements
        print(f"Groq enhancement failed: {e}")
        return schedule_result

@router.post("/generate", response_model=StudyPlanResponse)
async def generate_study_plan(
    request: StudyPlanRequest,
    http_request: Request = None
):
    """Generate a smart study plan using algorithm + AI personalization + Groq enhancement."""
    try:
        # Get user preferences from study habits (if authenticated)
        user_preferences = None
        user = await get_current_user_optional(http_request)
        if user and user.get('user_id'):
            user_preferences = await get_user_study_preferences(user['user_id'])
            if user_preferences:
                print(f"📊 Using personalized preferences: {user_preferences}")
        
        # Use smart scheduling algorithm with personalization
        schedule_result = smart_schedule_sessions(
            request.tasks,
            request.study_hours_per_day,
            request.start_date,
            user_preferences
        )
        
        # Enhance with Groq if we have many tasks or complex schedule
        if len(request.tasks) >= 5 or schedule_result['days_planned'] >= 5:
            schedule_result = await groq_enhance_schedule(
                schedule_result,
                request.tasks,
                request.study_hours_per_day,
                user_preferences
            )
        
        # Format the schedule into a readable plan
        plan_lines = ["# Smart Study Plan\n"]
        
        if user_preferences:
            plan_lines.append("🤖 **AI-Personalized** - This plan is customized based on your study history\n")
        
        if schedule_result['warning']:
            plan_lines.append(f"{schedule_result['warning']}\n")
        
        plan_lines.append(f"**Daily Study Hours:** {schedule_result['adjusted_hours_per_day']}h")
        plan_lines.append(f"**Total Hours Needed:** {schedule_result['total_hours']}h")
        plan_lines.append(f"**Days Planned:** {schedule_result['days_planned']}\n")
        
        # Add AI tips if available
        if schedule_result.get('ai_tips'):
            plan_lines.append("\n### 💡 AI Study Tips")
            for tip in schedule_result['ai_tips']:
                plan_lines.append(f"- {tip}")
            plan_lines.append("")
        
        if schedule_result.get('study_techniques'):
            plan_lines.append("### 📚 Recommended Techniques")
            for technique in schedule_result['study_techniques']:
                plan_lines.append(f"- {technique}")
            plan_lines.append("")
        
        if schedule_result.get('ai_warnings'):
            for warning in schedule_result['ai_warnings']:
                plan_lines.append(f"⚠️ {warning}\n")
        
        # Group sessions by day
        sessions_by_day = {}
        for session in schedule_result['sessions']:
            day = session['day']
            if day not in sessions_by_day:
                sessions_by_day[day] = []
            sessions_by_day[day].append(session)
        
        # Format each day
        for day_num, (day, sessions) in enumerate(sorted(sessions_by_day.items()), 1):
            day_date = datetime.fromisoformat(day)
            plan_lines.append(f"\n## Day {day_num}: {day_date.strftime('%A, %B %d, %Y')}")
            
            day_total = sum(s['estimated_hours'] for s in sessions)
            plan_lines.append(f"*Total: {day_total}h*\n")
            
            for session in sessions:
                priority_label = "🔴 High" if session['priority'] >= 8 else "🟡 Medium" if session['priority'] >= 6 else "🟢 Low"
                plan_lines.append(
                    f"- **{session['estimated_hours']}h** - "
                    f"{session['task_title']} (Priority: {session['priority']}/10 {priority_label})"
                )
        
        # Add summary
        plan_lines.append("\n## Summary")
        plan_lines.append(f"- Total study hours: {schedule_result['total_hours']}h")
        plan_lines.append(f"- Tasks covered: {len(request.tasks)}")
        plan_lines.append(f"- Study sessions: {len(schedule_result['sessions'])}")
        
        if schedule_result['needs_more_hours']:
            plan_lines.append(f"\n⚠️ **Action Required:** Increase your daily study hours to {schedule_result['adjusted_hours_per_day']}h to meet all deadlines.")
        
        plan_content = "\n".join(plan_lines)
        
        # Debug logging
        print(f"📅 Returning {len(schedule_result['sessions'])} sessions")
        if schedule_result['sessions']:
            print(f"📅 First session: {schedule_result['sessions'][0]}")
        
        # Return both the formatted plan AND the raw sessions for the frontend
        return {
            "plan": plan_content,
            "total_hours": schedule_result['total_hours'],
            "days_planned": schedule_result['days_planned'],
            "warning": schedule_result['warning'],
            "needs_more_hours": schedule_result['needs_more_hours'],
            "sessions": schedule_result['sessions']  # Add raw sessions for frontend
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate study plan: {str(e)}"
        )

# PDF Generation Endpoint will be added here

# Add the router to the main FastAPI app in app/api/__init__.py
