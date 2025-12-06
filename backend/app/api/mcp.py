"""
MCP Integration API Endpoints

Provides endpoints to test and use MCP-enhanced agent workflows.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import logging

from ..agents.orchestrator_agent import orchestrator_agent, WorkflowType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mcp", tags=["mcp"])


class EnhancedDocumentParseRequest(BaseModel):
    """Request for enhanced document parsing with MCP"""
    text: Optional[str] = Field(None, description="Document text to parse")
    file_path: Optional[str] = Field(None, description="File path to parse")
    source_type: str = Field(default="pdf", description="Document type")
    user_id: Optional[str] = Field(None, description="User ID for context")


class EnhancedPipelineRequest(BaseModel):
    """Request for enhanced full pipeline with MCP"""
    text: Optional[str] = Field(None, description="Document text to process")
    file_path: Optional[str] = Field(None, description="File path to process")
    source_type: str = Field(default="pdf", description="Document type")
    schedule_days: int = Field(default=7, description="Days to schedule")
    user_id: Optional[str] = Field(None, description="User ID for context")
    course_id: Optional[str] = Field(None, description="Course ID for context")


@router.post("/parse-enhanced")
async def parse_document_enhanced(request: EnhancedDocumentParseRequest):
    """
    Enhanced document parsing using MCP tools
    
    Uses MCP servers for:
    - File operations (filesystem)
    - Web research (web search)
    - Memory of past parsing (memory)
    """
    try:
        input_data = {
            "text": request.text,
            "file_path": request.file_path,
            "source_type": request.source_type,
            "user_id": request.user_id or "guest"
        }
        
        user_context = {
            "user_id": request.user_id or "guest",
            "use_mcp": True
        }
        
        result = await orchestrator_agent.execute_workflow(
            WorkflowType.PARSE_DOCUMENT_ENHANCED,
            input_data,
            user_context
        )
        
        if result["success"]:
            return {
                "success": True,
                "tasks": result["tasks"],
                "mcp_tools_used": result.get("mcp_tools_used", []),
                "enhanced_features": result.get("enhanced_features", []),
                "explanation": result.get("explanation", ""),
                "total_tasks": len(result["tasks"])
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Enhanced parsing failed")
            )
            
    except Exception as e:
        logger.error(f"Enhanced parsing endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pipeline-enhanced")
async def full_pipeline_enhanced(request: EnhancedPipelineRequest):
    """
    Enhanced full pipeline using MCP tools
    
    Complete workflow: Parse → Predict → Prioritize → Schedule
    with MCP enhancements for research, memory, and file operations.
    """
    try:
        input_data = {
            "text": request.text,
            "file_path": request.file_path,
            "source_type": request.source_type,
            "schedule_days": request.schedule_days,
            "user_id": request.user_id or "guest",
            "course_id": request.course_id
        }
        
        user_context = {
            "user_id": request.user_id or "guest",
            "use_mcp": True,
            "enhanced_features": True
        }
        
        result = await orchestrator_agent.execute_workflow(
            WorkflowType.FULL_PIPELINE_ENHANCED,
            input_data,
            user_context
        )
        
        if result["success"]:
            return {
                "success": True,
                "tasks": result["tasks"],
                "schedule": result.get("schedule", {}),
                "recommendations": result.get("recommendations", []),
                "stages": result.get("stages", {}),
                "mcp_enhancements": result.get("mcp_enhancements", {}),
                "total_tasks": result["total_tasks"]
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=result.get("error", "Enhanced pipeline failed")
            )
            
    except Exception as e:
        logger.error(f"Enhanced pipeline endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_mcp_status():
    """Get MCP service and agent status"""
    try:
        status = orchestrator_agent.get_agent_status()
        return status
    except Exception as e:
        logger.error(f"MCP status endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tools")
async def get_available_mcp_tools():
    """Get available MCP tools by server"""
    try:
        from ..services.mcp_service import mcp_service
        
        tools = {}
        for server_name in ["filesystem", "web_search", "memory"]:
            try:
                server_tools = await mcp_service.get_available_tools(server_name)
                tools[server_name] = server_tools
            except Exception as e:
                tools[server_name] = {"error": str(e)}
        
        return {
            "mcp_servers": list(mcp_service.server_processes.keys()),
            "available_tools": tools
        }
    except Exception as e:
        logger.error(f"MCP tools endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-tool")
async def test_mcp_tool(
    server_name: str,
    tool_name: str,
    arguments: Dict[str, Any] = None
):
    """Test an MCP tool directly"""
    try:
        from ..services.mcp_service import mcp_service
        
        if arguments is None:
            arguments = {}
        
        result = await mcp_service.execute_tool(server_name, tool_name, arguments)
        
        return {
            "server": server_name,
            "tool": tool_name,
            "arguments": arguments,
            "result": result,
            "success": "error" not in result
        }
        
    except Exception as e:
        logger.error(f"MCP tool test error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
