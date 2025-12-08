"""
Task Parsing Agent

Extracts tasks from multiple sources (PDFs, documents, text)
using LLM-powered intelligent extraction.
"""

from typing import Any, Dict, List, Optional
from ..agents.agent_base import BaseAgent, AgentResponse
from ..services.llm_service import llm_service
import logging

logger = logging.getLogger(__name__)


class TaskParsingAgent(BaseAgent):
    """Agent for parsing and extracting tasks from various sources"""
    
    def __init__(self):
        super().__init__("TaskParsingAgent")
        # Do not bind llm_service at init; use the module-level reference in process to allow test patching
    
    async def process(
        self, 
        input_data: Dict[str, Any], 
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Parse input and extract tasks.
        
        Input data should contain:
        - text: The text to parse
        - source_type: Type of source (pdf, email, document, etc.)
        
        Returns:
            AgentResponse with extracted tasks
        """
        text = input_data.get("text", "")
        source_type = input_data.get("source_type", "document")
        
        if not text:
            return self._create_response(
                data={"tasks": []},
                confidence=0.0,
                explanation="No text provided to parse"
            )
        
        # Use LLM to extract tasks
        tasks = await llm_service.extract_tasks_from_text(text, source_type)
        
        # Enrich tasks with additional metadata
        enriched_tasks = []
        for task in tasks:
            enriched_task = self._enrich_task(task, context)
            enriched_tasks.append(enriched_task)
        
        confidence = self._calculate_confidence(enriched_tasks)
        
        return self._create_response(
            data={
                "tasks": enriched_tasks,
                "count": len(enriched_tasks),
                "source_type": source_type
            },
            confidence=confidence,
            explanation=f"Extracted {len(enriched_tasks)} tasks from {source_type}",
            metadata={
                "text_length": len(text),
                "source_type": source_type
            }
        )
    
    def _enrich_task(
        self, 
        task: Dict[str, Any], 
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Add additional metadata to extracted task"""
        enriched = task.copy()
        
        # Set defaults
        enriched.setdefault("difficulty_level", 3)
        enriched.setdefault("priority_rating", 3)
        enriched.setdefault("status", "pending")
        
        # Add context if available
        if context:
            if "course_id" in context:
                enriched["course_id"] = context["course_id"]
            if "user_id" in context:
                enriched["user_id"] = context["user_id"]
        
        return enriched
    
    def _calculate_confidence(self, tasks: List[Dict[str, Any]]) -> float:
        """Calculate confidence score based on extracted task quality"""
        if not tasks:
            return 0.5
        
        # Check for key fields
        required_fields = ["title", "task_type"]
        optional_fields = ["due_date", "description", "grade_percentage"]
        
        total_score = 0.0
        for task in tasks:
            score = 0.0
            
            # Required fields (0.5 points)
            if all(task.get(field) for field in required_fields):
                score += 0.5
            
            # Optional fields (0.1 each, up to 0.3)
            for field in optional_fields:
                if task.get(field):
                    score += 0.1
            
            # Due date format (0.2 points)
            if task.get("due_date") and len(task["due_date"]) == 10:
                score += 0.2
            
            total_score += min(score, 1.0)
        
        return min(total_score / len(tasks), 1.0)


# Create singleton instance
task_parsing_agent = TaskParsingAgent()
