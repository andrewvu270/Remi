"""
Agent API Endpoints

Provides REST API endpoints for MyDesk multi-agent system.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import logging

from ..agents.orchestrator_agent import orchestrator_agent, WorkflowType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/agents", tags=["agents"])


# Request/Response Models
class ParseDocumentRequest(BaseModel):
    """Request to parse a document"""
    text: str = Field(..., description="Document text to parse")
    source_type: str = Field(default="document", description="Type of source (pdf, email, etc.)")
    user_id: Optional[str] = Field(None, description="User ID for context")
    course_id: Optional[str] = Field(None, description="Course ID for context")


class PredictWorkloadRequest(BaseModel):
    """Request to predict workload for a task"""
    task: Dict[str, Any] = Field(..., description="Task data")
    use_hybrid: bool = Field(default=True, description="Use hybrid LLM+ML approach")
    user_id: Optional[str] = Field(None, description="User ID for context")


class PrioritizeTasksRequest(BaseModel):
    """Request to prioritize tasks"""
    tasks: List[Dict[str, Any]] = Field(..., description="List of tasks to prioritize")
    criteria: Optional[Dict[str, Any]] = Field(None, description="Prioritization criteria")
    user_id: Optional[str] = Field(None, description="User ID for context")


class GenerateScheduleRequest(BaseModel):
    """Request to generate optimized schedule"""
    tasks: List[Dict[str, Any]] = Field(..., description="List of tasks to schedule")
    start_date: Optional[str] = Field(None, description="Schedule start date (YYYY-MM-DD)")
    days: int = Field(default=7, ge=1, le=30, description="Number of days to schedule")
    user_id: Optional[str] = Field(None, description="User ID for context")


class NaturalLanguageQueryRequest(BaseModel):
    """Request to process natural language query"""
    query: str = Field(..., description="User's natural language query")
    user_id: Optional[str] = Field(None, description="User ID for context")


class FullPipelineRequest(BaseModel):
    """Request to run full pipeline (Parse → Predict → Prioritize → Schedule)"""
    text: str = Field(..., description="Document text to parse")
    source_type: str = Field(default="document", description="Type of source")
    schedule_days: int = Field(default=7, ge=1, le=30, description="Days to schedule")
    user_id: Optional[str] = Field(None, description="User ID for context")
    course_id: Optional[str] = Field(None, description="Course ID for context")


# Endpoints
@router.post("/parse")
async def parse_document(request: ParseDocumentRequest):
    """
    Parse a document and extract tasks.
    
    Uses the Task Parsing Agent with LLM-powered extraction.
    """
    try:
        input_data = {
            "text": request.text,
            "source_type": request.source_type
        }
        
        context = {}
        if request.user_id:
            context["user_id"] = request.user_id
        if request.course_id:
            context["course_id"] = request.course_id
        
        result = await orchestrator_agent.execute_workflow(
            WorkflowType.PARSE_DOCUMENT,
            input_data,
            context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in parse endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/predict")
async def predict_workload(request: PredictWorkloadRequest):
    """
    Predict workload, stress, and effort for a task.
    
    Uses hybrid LLM + ML approach for accurate predictions.
    """
    try:
        input_data = {
            "task": request.task,
            "use_hybrid": request.use_hybrid
        }
        
        context = {}
        if request.user_id:
            context["user_id"] = request.user_id
        
        result = await orchestrator_agent.execute_workflow(
            WorkflowType.PREDICT_WORKLOAD,
            input_data,
            context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in predict endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/prioritize")
async def prioritize_tasks(request: PrioritizeTasksRequest):
    """
    Prioritize tasks based on urgency, effort, and impact.
    
    Uses LLM reasoning combined with rule-based scoring.
    """
    try:
        input_data = {
            "tasks": request.tasks,
            "criteria": request.criteria or {}
        }
        
        context = {}
        if request.user_id:
            context["user_id"] = request.user_id
        
        result = await orchestrator_agent.execute_workflow(
            WorkflowType.PRIORITIZE_TASKS,
            input_data,
            context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in prioritize endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/schedule")
async def generate_schedule(request: GenerateScheduleRequest):
    """
    Generate optimized schedule with workload balancing.
    
    Avoids burnout and provides stress warnings.
    """
    try:
        input_data = {
            "tasks": request.tasks,
            "start_date": request.start_date,
            "days": request.days
        }
        
        context = {}
        if request.user_id:
            context["user_id"] = request.user_id
        
        result = await orchestrator_agent.execute_workflow(
            WorkflowType.GENERATE_SCHEDULE,
            input_data,
            context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in schedule endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/query")
async def natural_language_query(request: NaturalLanguageQueryRequest):
    """
    Process natural language query.
    
    Examples:
    - "What's my busiest day this week?"
    - "Move low-effort tasks to tomorrow"
    - "Show me high-priority tasks"
    """
    try:
        input_data = {
            "query": request.query
        }
        
        context = {}
        if request.user_id:
            context["user_id"] = request.user_id
        
        result = await orchestrator_agent.execute_workflow(
            WorkflowType.NATURAL_LANGUAGE_QUERY,
            input_data,
            context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in query endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pipeline")
async def full_pipeline(request: FullPipelineRequest):
    """
    Run full MyDesk pipeline: Parse → Predict → Prioritize → Schedule
    
    This is the complete workflow for processing a document and
    generating an optimized schedule with stress analysis.
    """
    try:
        input_data = {
            "text": request.text,
            "source_type": request.source_type,
            "schedule_days": request.schedule_days
        }
        
        context = {}
        if request.user_id:
            context["user_id"] = request.user_id
        if request.course_id:
            context["course_id"] = request.course_id
        
        result = await orchestrator_agent.execute_workflow(
            WorkflowType.FULL_PIPELINE,
            input_data,
            context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error in pipeline endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_agent_status():
    """
    Get status of MCP and all agents.
    
    Useful for health checks and debugging.
    """
    try:
        status = orchestrator_agent.get_agent_status()
        return status
        
    except Exception as e:
        logger.error(f"Error in status endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
