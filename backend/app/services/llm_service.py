"""
LLM Service for MyDesk

Provides OpenAI GPT integration for intelligent task analysis,
natural language processing, and reasoning capabilities.
"""

from typing import Any, Dict, List, Optional
import json
import logging

logger = logging.getLogger(__name__)

from .llm_client import LLMClientManager
from ..agents.prompt_engineer_agent import prompt_engineer_agent


class LLMService:
    """Service for LLM-based analysis and reasoning"""
    
    def __init__(self):
        self.client_manager = LLMClientManager()
        self.logger = logger
    
    async def analyze_task_workload(
        self, 
        task_description: str, 
        task_type: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a task and predict workload, stress factors, and effort.
        
        Args:
            task_description: Description of the task
            task_type: Type of task (Assignment, Project, etc.)
            context: Optional context (user history, preferences)
            
        Returns:
            Dictionary with estimated_hours, stress_score, complexity, explanation
        """
        try:
            prompt = self._build_workload_prompt(task_description, task_type, context)
            prompt = await self._refine_prompt(
                prompt,
                target_agent="WorkloadPredictionAgent",
                goal="Estimate task workload, effort, and stress realistically.",
            )
            
            response = await self.client_manager.chat_completion(
                messages=[
                    {"role": "system", "content": "You are an expert at analyzing task complexity and workload. Provide accurate, realistic estimates."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3  # Lower temperature for more consistent predictions
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Validate and normalize response
            return {
                "estimated_hours": float(result.get("estimated_hours", 3.0)),
                "stress_score": float(result.get("stress_score", 0.5)),
                "complexity": result.get("complexity", "medium"),
                "explanation": result.get("explanation", ""),
                "confidence": float(result.get("confidence", 0.7))
            }
            
        except Exception as e:
            self.logger.error(f"Error in LLM workload analysis: {str(e)}")
            # Return conservative defaults
            return {
                "estimated_hours": 3.0,
                "stress_score": 0.5,
                "complexity": "medium",
                "explanation": "Error in analysis, using default estimates",
                "confidence": 0.3
            }
    
    async def prioritize_tasks(
        self, 
        tasks: List[Dict[str, Any]], 
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze and prioritize a list of tasks.
        
        Args:
            tasks: List of task dictionaries
            context: Optional context (deadlines, user preferences)
            
        Returns:
            Dictionary with prioritized task IDs and explanations
        """
        try:
            prompt = self._build_prioritization_prompt(tasks, context)
            prompt = await self._refine_prompt(
                prompt,
                target_agent="PrioritizationAgent",
                goal="Prioritize tasks with clear rationale and balanced workload.",
            )
            
            response = await self.client_manager.chat_completion(
                messages=[
                    {"role": "system", "content": "You are an expert at task prioritization and time management. Help users focus on what matters most."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            self.logger.error(f"Error in LLM prioritization: {str(e)}")
            return {"error": str(e), "priorities": []}
    
    async def parse_natural_language_query(
        self, 
        query: str, 
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Parse a natural language query and extract intent and parameters.
        
        Args:
            query: User's natural language query
            context: Optional context (current tasks, schedule)
            
        Returns:
            Dictionary with intent, parameters, and suggested action
        """
        try:
            prompt = self._build_nl_query_prompt(query, context)
            prompt = await self._refine_prompt(
                prompt,
                target_agent="NaturalLanguageAgent",
                goal="Interpret the user query accurately and return actionable insights.",
            )
            
            response = await self.client_manager.chat_completion(
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that interprets user queries about tasks and schedules. Extract the intent and parameters."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2
            )
            
            result = json.loads(response.choices[0].message.content)
            return result
            
        except Exception as e:
            self.logger.error(f"Error in NL query parsing: {str(e)}")
            return {"error": str(e), "intent": "unknown"}
    
    async def extract_tasks_from_text(
        self, 
        text: str, 
        source_type: str = "document",
        context: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract tasks, deadlines, and details from unstructured text.
        
        Args:
            text: Text to parse (syllabus, email, etc.)
            source_type: Type of source document
            
        Returns:
            List of extracted tasks
        """
        try:
            prompt = self._build_extraction_prompt(text, source_type)
            prompt = await self._refine_prompt(
                prompt,
                target_agent="TaskParsingAgent",
                goal="Extract every relevant academic task with complete metadata.",
                constraints=["Must return valid JSON with a tasks array."],
            )
            
            response = await self.client_manager.chat_completion(
                messages=[
                    {"role": "system", "content": "You are an expert at extracting tasks, deadlines, and requirements from documents. Be thorough and accurate."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1  # Very low for consistent extraction
            )
            
            result = json.loads(response.choices[0].message.content)
            return result.get("tasks", [])
            
        except Exception as e:
            self.logger.error(f"Error in task extraction: {str(e)}")
            return []
    
    def _build_workload_prompt(
        self, 
        task_description: str, 
        task_type: str, 
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Build prompt for workload analysis"""
        context_str = ""
        if context:
            context_str = f"\n\nAdditional context:\n{json.dumps(context, indent=2)}"
        
        return f"""Analyze this task and estimate the workload:

Task Type: {task_type}
Description: {task_description}{context_str}

Provide a JSON response with:
- estimated_hours: realistic hours needed (0.5 to 40)
- stress_score: stress level 0.0 (low) to 1.0 (high burnout risk)
- complexity: "low", "medium", or "high"
- explanation: brief explanation of your estimates
- confidence: your confidence in this estimate (0.0 to 1.0)

Consider:
- Task type and typical time requirements
- Complexity and cognitive load
- Potential blockers or dependencies
- Realistic work pace (not rushed)"""
    
    def _build_prioritization_prompt(
        self, 
        tasks: List[Dict[str, Any]], 
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Build prompt for task prioritization"""
        tasks_str = json.dumps(tasks, indent=2)
        context_str = json.dumps(context, indent=2) if context else "None"
        
        return f"""Prioritize these tasks:

Tasks:
{tasks_str}

Context:
{context_str}

Provide a JSON response with:
- priorities: array of task IDs in priority order (highest first)
- explanations: object mapping task IDs to priority explanations
- recommendations: overall recommendations for task management

Consider:
- Deadlines and urgency
- Task dependencies
- Estimated effort and stress
- Balance to avoid burnout"""
    
    def _build_nl_query_prompt(
        self, 
        query: str, 
        context: Optional[Dict[str, Any]]
    ) -> str:
        """Build prompt for natural language query parsing"""
        context_str = json.dumps(context, indent=2) if context else "None"
        
        return f"""Parse this user query:

Query: "{query}"

Context:
{context_str}

Provide a JSON response with:
- intent: the user's intent (e.g., "view_schedule", "move_task", "get_insights")
- parameters: extracted parameters (dates, task IDs, filters)
- action: suggested action to take
- response: natural language response to the user

Be helpful and interpret the user's intent accurately."""
    
    def _build_extraction_prompt(self, text: str, source_type: str) -> str:
        """Build prompt for task extraction"""
        return f"""Extract all tasks, assignments, and deadlines from this {source_type}:

{text}

Provide a JSON response with:
- tasks: array of task objects, each with:
  - title: task name
  - description: task details
  - due_date: deadline in YYYY-MM-DD format (or null)
  - task_type: type (Assignment, Exam, Project, etc.)
  - grade_percentage: weight/percentage if mentioned (or null)
  - estimated_hours: estimated hours if mentioned (or null)
  - priority: inferred priority (1-5)

Extract ALL tasks mentioned. Be thorough."""

    async def _refine_prompt(
        self,
        prompt: str,
        target_agent: str,
        goal: str,
        constraints: Optional[List[str]] = None,
    ) -> str:
        """Route prompt through the Prompt Engineer agent for polishing."""
        try:
            response = await prompt_engineer_agent.process(
                {
                    "prompt": prompt,
                    "target_agent": target_agent,
                    "goal": goal,
                    "constraints": constraints or [],
                },
                context=None,
            )
            improved = response.data.get("improved_prompt")
            if improved:
                return improved
        except Exception as exc:  # pragma: no cover - defensive
            self.logger.warning(
                "Prompt refinement failed for %s: %s", target_agent, exc
            )
        return prompt


# Create singleton instance
llm_service = LLMService()
