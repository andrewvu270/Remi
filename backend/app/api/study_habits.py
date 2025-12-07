"""Study habits and analytics API endpoints"""
from fastapi import APIRouter, HTTPException, Request, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from app.services.auth_service import AuthService
from app.services.study_analytics_service import StudyAnalyticsService
from app.database import get_supabase_admin
import json
import os

router = APIRouter()

# Configure which model to use (can be set via environment variable)
ANALYTICS_MODEL = os.getenv("ANALYTICS_MODEL", "groq")  # Options: "groq", "ernie", "ensemble"

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

@router.get("/analyze")
async def analyze_study_habits(
    request: Request,
    time_range: str = Query("week", regex="^(week|month|all)$")
):
    """Analyze user's study patterns using AI and return intelligent insights"""
    try:
        user = await get_current_user(request)
        supabase = get_supabase_admin()
        
        # Calculate date range
        now = datetime.now()
        if time_range == "week":
            date_from = (now - timedelta(days=7)).date()
        elif time_range == "month":
            date_from = (now - timedelta(days=30)).date()
        else:
            date_from = None
        
        # Get completed sessions in range
        query = supabase.table("scheduled_study_sessions")\
            .select("*")\
            .eq("user_id", user['sub'])\
            .eq("completed", True)
        
        if date_from:
            query = query.gte("day", date_from.isoformat())
        
        sessions_result = query.execute()
        sessions = sessions_result.data if sessions_result.data else []
        
        if not sessions:
            return {
                "success": True,
                "message": "No completed sessions found",
                "analysis": {
                    "total_sessions": 0,
                    "total_hours": 0,
                    "average_duration": 0,
                    "completion_rate": 0,
                    "time_of_day_distribution": {},
                    "estimation_accuracy": 0,
                    "ai_insights": []
                }
            }
        
        # Calculate basic analytics
        total_sessions = len(sessions)
        total_hours = sum(float(s.get('actual_hours', 0)) for s in sessions)
        average_duration = total_hours / total_sessions if total_sessions > 0 else 0
        
        # Time of day distribution
        time_distribution = {'morning': 0, 'afternoon': 0, 'evening': 0, 'night': 0}
        time_effectiveness = {'morning': [], 'afternoon': [], 'evening': [], 'night': []}
        
        for session in sessions:
            if session.get('completed_at'):
                try:
                    completed_at = datetime.fromisoformat(session['completed_at'].replace('Z', '+00:00'))
                    hour = completed_at.hour
                    actual_hours = float(session.get('actual_hours', 0))
                    estimated_hours = float(session.get('estimated_hours', 0))
                    
                    # Determine time of day
                    if 5 <= hour < 12:
                        time_period = 'morning'
                    elif 12 <= hour < 17:
                        time_period = 'afternoon'
                    elif 17 <= hour < 21:
                        time_period = 'evening'
                    else:
                        time_period = 'night'
                    
                    time_distribution[time_period] += 1
                    
                    # Track effectiveness (actual vs estimated)
                    if estimated_hours > 0:
                        effectiveness = actual_hours / estimated_hours
                        time_effectiveness[time_period].append(effectiveness)
                except:
                    pass
        
        # Calculate average effectiveness per time period
        avg_effectiveness = {}
        for period, values in time_effectiveness.items():
            avg_effectiveness[period] = sum(values) / len(values) if values else 0
        
        # Find most productive time (best effectiveness, not just most sessions)
        most_productive = max(avg_effectiveness, key=avg_effectiveness.get) if any(avg_effectiveness.values()) else 'morning'
        
        # Estimation accuracy
        accuracies = []
        for session in sessions:
            estimated = float(session.get('estimated_hours', 0))
            actual = float(session.get('actual_hours', 0))
            if estimated > 0:
                accuracy = 1 - abs(estimated - actual) / estimated
                accuracies.append(max(0, min(1, accuracy)))
        
        avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0
        
        # Pomodoro usage
        pomodoro_sessions = sum(1 for s in sessions if s.get('pomodoro_count', 0) > 0)
        pomodoro_rate = pomodoro_sessions / total_sessions if total_sessions > 0 else 0
        
        # Get all sessions for completion rate
        all_sessions_result = supabase.table("scheduled_study_sessions")\
            .select("completed")\
            .eq("user_id", user['sub'])\
            .execute()
        
        all_sessions = all_sessions_result.data if all_sessions_result.data else []
        total_all = len(all_sessions)
        completed_count = sum(1 for s in all_sessions if s.get('completed', False))
        completion_rate = completed_count / total_all if total_all > 0 else 0
        
        # Get reflections for AI analysis
        reflections_result = supabase.table("session_reflections")\
            .select("*")\
            .eq("user_id", user['sub'])\
            .order("created_at", desc=True)\
            .limit(10)\
            .execute()
        
        reflections = reflections_result.data if reflections_result.data else []
        
        # Use pluggable analytics service
        analytics_service = StudyAnalyticsService(model_type=ANALYTICS_MODEL)
        ai_analysis = await analytics_service.analyze_study_patterns(
            sessions, 
            reflections, 
            time_distribution, 
            avg_effectiveness,
            avg_accuracy,
            completion_rate,
            pomodoro_rate
        )
        
        analysis = {
            "total_sessions": total_sessions,
            "total_hours": round(total_hours, 1),
            "average_duration": round(average_duration, 1),
            "completion_rate": round(completion_rate, 2),
            "time_of_day_distribution": time_distribution,
            "time_effectiveness": {k: round(v, 2) for k, v in avg_effectiveness.items()},
            "most_productive_time": most_productive,
            "estimation_accuracy": round(avg_accuracy, 2),
            "pomodoro_usage_rate": round(pomodoro_rate, 2),
            "time_range": time_range,
            "ai_analysis": ai_analysis,  # Full AI analysis with insights, predictions, patterns
            "model_used": ai_analysis.get('model', 'unknown')
        }
        
        return {
            "success": True,
            "analysis": analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze study habits: {str(e)}")

# Removed - now handled by StudyAnalyticsService

@router.get("/insights")
async def get_study_insights(request: Request):
    """Get AI-generated insights and recommendations based on study habits"""
    try:
        user = await get_current_user(request)
        supabase = get_supabase_admin()
        
        # Get study habits
        habits_result = supabase.table("study_habits")\
            .select("*")\
            .eq("user_id", user['sub'])\
            .execute()
        
        if not habits_result.data or len(habits_result.data) == 0:
            return {
                "success": True,
                "message": "Not enough data yet. Complete more sessions to get personalized insights!",
                "insights": []
            }
        
        habits = habits_result.data[0]
        
        # Get recent reflections for context
        reflections_result = supabase.table("session_reflections")\
            .select("reflection_text, what_was_challenging")\
            .eq("user_id", user['sub'])\
            .order("created_at", desc=True)\
            .limit(5)\
            .execute()
        
        reflections = reflections_result.data if reflections_result.data else []
        
        # Generate AI insights using Groq
        llm_client = LLMClientManager()
        
        # Prepare context
        habits_summary = f"""
Study Habits Summary:
- Total sessions completed: {habits.get('total_sessions_completed', 0)}
- Total study hours: {habits.get('total_study_hours', 0)}
- Average session duration: {habits.get('average_session_duration', 0)} hours
- Estimation accuracy: {habits.get('estimation_accuracy', 0):.0%}
- Completion rate: {habits.get('completion_rate', 0):.0%}
- Pomodoro usage: {habits.get('pomodoro_usage_rate', 0):.0%}
- Preferred time: {habits.get('preferred_time_of_day', 'unknown')}
"""
        
        challenges_text = "\n".join([
            f"- {r.get('what_was_challenging', '')}" 
            for r in reflections 
            if r.get('what_was_challenging')
        ])
        
        prompt = f"""{habits_summary}

Recent Challenges:
{challenges_text if challenges_text else "No challenges reported yet"}

Based on this study data, provide 3-5 specific, actionable insights and recommendations.
Focus on:
1. Patterns in study effectiveness
2. Time management improvements
3. Estimation accuracy tips
4. Addressing reported challenges

Return a JSON array of insights:
[
  {{"type": "strength", "message": "...", "action": "..."}},
  {{"type": "improvement", "message": "...", "action": "..."}},
  {{"type": "tip", "message": "...", "action": "..."}}
]

Keep each message concise (1-2 sentences) and actionable."""

        response = await llm_client.chat_completion(
            messages=[
                {"role": "system", "content": "You are an expert study coach analyzing student habits to provide personalized, evidence-based recommendations."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=600
        )
        
        # Parse response
        response_text = response.choices[0].message.content.strip()
        
        try:
            # Extract JSON
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            if start_idx >= 0 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                insights = json.loads(json_str)
            else:
                insights = json.loads(response_text)
        except:
            # Fallback insights
            insights = [
                {
                    "type": "tip",
                    "message": "You're building great study habits!",
                    "action": "Keep tracking your sessions to get more personalized insights."
                }
            ]
        
        return {
            "success": True,
            "insights": insights,
            "habits_summary": habits
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating insights: {e}")
        # Return fallback insights
        return {
            "success": True,
            "insights": [
                {
                    "type": "tip",
                    "message": "Complete more study sessions to unlock personalized insights",
                    "action": "Try to maintain a consistent study schedule"
                }
            ]
        }

@router.post("/record")
async def record_study_habit(request: Request):
    """Record study habit data (auto-called on session completion)"""
    # This is handled in the complete_session endpoint
    # Keeping this endpoint for potential manual updates
    return {
        "success": True,
        "message": "Study habits are automatically updated on session completion"
    }
