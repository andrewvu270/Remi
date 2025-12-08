"""
Orchestrator Agent

Coordinates all MyDesk agents, manages workflow, maintains context,
and integrates agent outputs into cohesive responses.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from ..database import get_supabase_admin
from .agent_base import AgentResponse, AgentStatus
from .task_parsing_agent import task_parsing_agent
from .enhanced_task_parsing_agent import enhanced_task_parsing_agent
from .workload_prediction_agent import workload_prediction_agent
from .prioritization_agent import prioritization_agent
from .schedule_optimization_agent import schedule_optimization_agent
from .natural_language_agent import natural_language_agent
from ..services.mcp_service import mcp_service

logger = logging.getLogger(__name__)


class WorkflowType:
    """Standard workflow types"""
    PARSE_DOCUMENT = "parse_document"
    PARSE_DOCUMENT_ENHANCED = "parse_document_enhanced"  # New enhanced workflow
    PREDICT_WORKLOAD = "predict_workload"
    PRIORITIZE_TASKS = "prioritize_tasks"
    GENERATE_SCHEDULE = "generate_schedule"
    NATURAL_LANGUAGE_QUERY = "natural_language_query"
    FULL_PIPELINE = "full_pipeline"  # Parse → Predict → Prioritize → Schedule
    FULL_PIPELINE_ENHANCED = "full_pipeline_enhanced"  # With MCP tools


class OrchestratorAgent:
    """
    Orchestrator Agent - coordinates all agents and workflows.

    The Orchestrator is responsible for:
    - Receiving user input (documents, queries, tasks)
    - Routing to appropriate agents
    - Maintaining context and state
    - Integrating agent outputs
    - Managing the full workflow pipeline
    """

    def __init__(self):
        self.logger = logger
        self.context: Dict[str, Any] = {}
        self.mcp_service = mcp_service

        # Initialize agents (both original and enhanced)
        self.agents = {
            "task_parsing": task_parsing_agent,
            "task_parsing_enhanced": enhanced_task_parsing_agent,  # New enhanced agent
            "workload_prediction": workload_prediction_agent,
            "prioritization": prioritization_agent,
            "schedule_optimization": schedule_optimization_agent,
            "natural_language": natural_language_agent
        }

        self.logger.info("Orchestrator Agent initialized with 6 agents (including enhanced task parsing)")

    async def execute_workflow(
        self,
        workflow_type: str,
        input_data: Dict[str, Any],
        user_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a workflow by coordinating multiple agents.

        Args:
            workflow_type: Type of workflow to execute
            input_data: Input data for the workflow
            user_context: Optional user context (user_id, preferences, etc.)

        Returns:
            Dictionary with workflow results
        """
        self.logger.info(f"Executing workflow: {workflow_type}")

        # Update context
        if user_context:
            self.context.update(user_context)

        # Route to appropriate workflow
        if workflow_type == WorkflowType.PARSE_DOCUMENT:
            return await self._workflow_parse_document(input_data)

        elif workflow_type == WorkflowType.PARSE_DOCUMENT_ENHANCED:
            return await self._workflow_parse_document_enhanced(input_data)

        elif workflow_type == WorkflowType.PREDICT_WORKLOAD:
            return await self._workflow_predict_workload(input_data)

        elif workflow_type == WorkflowType.PRIORITIZE_TASKS:
            return await self._workflow_prioritize_tasks(input_data)

        elif workflow_type == WorkflowType.GENERATE_SCHEDULE:
            return await self._workflow_generate_schedule(input_data)

        elif workflow_type == WorkflowType.NATURAL_LANGUAGE_QUERY:
            return await self._workflow_natural_language(input_data)

        elif workflow_type == WorkflowType.FULL_PIPELINE:
            return await self._workflow_full_pipeline(input_data)

        elif workflow_type == WorkflowType.FULL_PIPELINE_ENHANCED:
            return await self._workflow_full_pipeline_enhanced(input_data)

        else:
            return {
                "success": False,
                "error": f"Unknown workflow type: {workflow_type}"
            }

    async def _workflow_parse_document(
        self,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Workflow: Parse document and extract tasks"""
        self.logger.info("Starting document parsing workflow")

        # Step 1: Parse document
        parse_response = await self.agents["task_parsing"]._execute_with_error_handling(
            input_data,
            self.context
        )

        if parse_response.status == AgentStatus.ERROR:
            return self._format_error_response("task_parsing", parse_response)

        return {
            "success": True,
            "workflow": "parse_document",
            "tasks": parse_response.data.get("tasks", []),
            "count": parse_response.data.get("count", 0),
            "confidence": parse_response.confidence,
            "explanation": parse_response.explanation
        }

    async def _workflow_predict_workload(
        self,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Workflow: Predict workload for a task"""
        self.logger.info("Starting workload prediction workflow")

        # Step 1: Predict workload
        predict_response = await self.agents["workload_prediction"]._execute_with_error_handling(
            input_data,
            self.context
        )

        if predict_response.status == AgentStatus.ERROR:
            return self._format_error_response("workload_prediction", predict_response)

        return {
            "success": True,
            "workflow": "predict_workload",
            "prediction": predict_response.data,
            "confidence": predict_response.confidence,
            "explanation": predict_response.explanation
        }

    async def _workflow_prioritize_tasks(
        self,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Workflow: Prioritize tasks"""
        self.logger.info("Starting task prioritization workflow")

        # Step 1: Prioritize
        priority_response = await self.agents["prioritization"]._execute_with_error_handling(
            input_data,
            self.context
        )

        if priority_response.status == AgentStatus.ERROR:
            return self._format_error_response("prioritization", priority_response)

        return {
            "success": True,
            "workflow": "prioritize_tasks",
            "priorities": priority_response.data.get("priorities", []),
            "recommendations": priority_response.data.get("recommendations", []),
            "confidence": priority_response.confidence,
            "explanation": priority_response.explanation
        }

    async def _workflow_generate_schedule(
        self,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Workflow: Generate optimized schedule"""
        self.logger.info("Starting schedule generation workflow")

        # Step 1: Generate schedule
        schedule_response = await self.agents["schedule_optimization"]._execute_with_error_handling(
            input_data,
            self.context
        )

        if schedule_response.status == AgentStatus.ERROR:
            return self._format_error_response("schedule_optimization", schedule_response)

        return {
            "success": True,
            "workflow": "generate_schedule",
            "schedule": schedule_response.data.get("schedule", {}),
            "workload_analysis": schedule_response.data.get("workload_analysis", {}),
            "recommendations": schedule_response.data.get("recommendations", []),
            "confidence": schedule_response.confidence,
            "explanation": schedule_response.explanation
        }

    async def _workflow_natural_language(
        self,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Workflow: Process natural language query"""
        self.logger.info("Starting natural language workflow")

        # Enrich context with user tasks
        user_id = self.context.get("user_id")
        if user_id:
            try:
                tasks = await self._fetch_user_tasks(user_id)
                self.context["tasks"] = tasks
                # Also create a summary for better prompting
                pending_tasks = [t for t in tasks if t.get("status") != "completed"]
                self.context["task_summary"] = {
                    "total_pending": len(pending_tasks),
                    "due_soon": [t["title"] for t in pending_tasks[:5]] # Simple heuristic
                }
            except Exception as e:
                self.logger.warning(f"Failed to fetch context tasks: {e}")

        # Step 1: Parse query
        nl_response = await self.agents["natural_language"]._execute_with_error_handling(
            input_data,
            self.context
        )

        if nl_response.status == AgentStatus.ERROR:
            return self._format_error_response("natural_language", nl_response)

        # Step 2: Execute action based on intent (if applicable)
        intent = nl_response.data.get("intent")
        action_result = None

        if intent == "view_schedule":
            # Trigger schedule generation
            action_result = await self._workflow_generate_schedule(
                nl_response.data.get("parameters", {})
            )
        elif intent == "prioritize":
            # Trigger prioritization
            action_result = await self._workflow_prioritize_tasks(
                nl_response.data.get("parameters", {})
            )

        return {
            "success": True,
            "workflow": "natural_language_query",
            "intent": intent,
            "response": nl_response.data.get("response", ""),
            "action_result": action_result,
            "confidence": nl_response.confidence
        }

    async def _workflow_full_pipeline(
        self,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Full pipeline: Parse → Predict → Prioritize → Schedule

        This is the complete MyDesk workflow for processing a document
        and generating an optimized schedule.
        """
        self.logger.info("Starting full pipeline workflow")

        results = {
            "success": True,
            "workflow": "full_pipeline",
            "stages": {}
        }

        # Stage 1: Parse document
        self.logger.info("Pipeline Stage 1: Parsing document")
        parse_response = await self.agents["task_parsing"]._execute_with_error_handling(
            input_data,
            self.context
        )

        if parse_response.status == AgentStatus.ERROR:
            return self._format_error_response("task_parsing", parse_response)

        tasks = parse_response.data.get("tasks", [])
        results["stages"]["parsing"] = {
            "success": True,
            "tasks_found": len(tasks)
        }

        # Stage 2: Predict workload for each task
        self.logger.info(f"Pipeline Stage 2: Predicting workload for {len(tasks)} tasks")
        enriched_tasks = []

        for task in tasks:
            predict_response = await self.agents["workload_prediction"]._execute_with_error_handling(
                {"task": task, "use_hybrid": True},
                self.context
            )

            if predict_response.status == AgentStatus.COMPLETED:
                task.update({
                    "estimated_hours": predict_response.data.get("estimated_hours"),
                    "stress_score": predict_response.data.get("stress_score"),
                    "complexity": predict_response.data.get("complexity")
                })

            enriched_tasks.append(task)

        results["stages"]["workload_prediction"] = {
            "success": True,
            "tasks_analyzed": len(enriched_tasks)
        }

        # Stage 3: Prioritize tasks
        self.logger.info("Pipeline Stage 3: Prioritizing tasks")
        priority_response = await self.agents["prioritization"]._execute_with_error_handling(
            {"tasks": enriched_tasks},
            self.context
        )

        if priority_response.status == AgentStatus.COMPLETED:
            priorities = priority_response.data.get("priorities", [])

            # Add priority scores to tasks
            priority_map = {p["task_id"]: p for p in priorities}
            for task in enriched_tasks:
                task_id = task.get("id", task.get("title"))
                if task_id in priority_map:
                    task["priority_score"] = priority_map[task_id]["priority_score"]
                    task["priority_rank"] = priority_map[task_id]["rank"]

        results["stages"]["prioritization"] = {
            "success": True,
            "high_priority_count": priority_response.data.get("high_priority_count", 0)
        }

        # Stage 4: Generate optimized schedule
        self.logger.info("Pipeline Stage 4: Generating schedule")
        schedule_response = await self.agents["schedule_optimization"]._execute_with_error_handling(
            {"tasks": enriched_tasks, "days": input_data.get("schedule_days", 7)},
            self.context
        )

        if schedule_response.status == AgentStatus.COMPLETED:
            results["schedule"] = schedule_response.data.get("schedule", {})
            results["workload_analysis"] = schedule_response.data.get("workload_analysis", {})
            results["recommendations"] = schedule_response.data.get("recommendations", [])

        results["stages"]["scheduling"] = {
            "success": True,
            "days_scheduled": len(schedule_response.data.get("schedule", {}))
        }

        # Final results
        results["tasks"] = enriched_tasks
        results["total_tasks"] = len(enriched_tasks)

        return results

    def _format_error_response(
        self,
        agent_name: str,
        response: AgentResponse
    ) -> Dict[str, Any]:
        """Format error response"""
        return {
            "success": False,
            "error": response.error,
            "agent": agent_name,
            "timestamp": response.timestamp.isoformat()
        }

    def get_agent_status(self) -> Dict[str, Any]:
        """Get status of all agents"""
        return {
            "orchestrator_status": "active",
            "mcp_servers": list(self.mcp_service.server_processes.keys()),
            "agents": {
                name: agent.get_state()
                for name, agent in self.agents.items()
            },
            "context": self.context,
            "timestamp": datetime.now().isoformat()
        }

    async def _workflow_parse_document_enhanced(
        self,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enhanced document parsing workflow with MCP tools"""
        self.logger.info("Starting enhanced document parsing workflow")

        try:
            # Use enhanced task parsing agent with MCP capabilities
            agent = self.agents["task_parsing_enhanced"]
            response = await agent.process(input_data, self.context)

            if response.status == AgentStatus.COMPLETED:
                return {
                    "success": True,
                    "tasks": response.data.get("tasks", []),
                    "mcp_tools_used": ["filesystem", "memory", "web_search"],
                    "enhanced_features": ["research_insights", "memory_context"],
                    "explanation": response.explanation
                }
            else:
                return self._format_error_response("task_parsing_enhanced", response)

        except Exception as e:
            self.logger.error(f"Enhanced document parsing workflow failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "workflow": "parse_document_enhanced"
            }

    async def _workflow_full_pipeline_enhanced(
        self,
        input_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enhanced full pipeline with MCP tools"""
        self.logger.info("Starting enhanced full pipeline workflow")

        results = {
            "success": True,
            "stages": {},
            "tasks": [],
            "mcp_enhancements": {},
            "total_tasks": 0
        }

        try:
            # Stage 1: Enhanced Document Parsing
            parse_result = await self._workflow_parse_document_enhanced(input_data)
            results["stages"]["parsing"] = {
                "success": parse_result["success"],
                "mcp_tools_used": parse_result.get("mcp_tools_used", [])
            }

            if not parse_result["success"]:
                return parse_result

            tasks = parse_result["tasks"]
            results["mcp_enhancements"]["research_insights"] = [
                task.get("research_insights") for task in tasks
                if task.get("research_insights")
            ]

            # Stage 2: Workload Prediction
            workload_input = {"tasks": tasks}
            workload_response = await self.agents["workload_prediction"].process(workload_input, self.context)

            if workload_response.success:
                enriched_tasks = workload_response.data.get("tasks", tasks)
                results["stages"]["workload_prediction"] = {"success": True}
            else:
                enriched_tasks = tasks
                results["stages"]["workload_prediction"] = {"success": False}

            # Stage 3: Prioritization
            prioritize_input = {"tasks": enriched_tasks}
            prioritize_response = await self.agents["prioritization"].process(prioritize_input, self.context)

            if prioritize_response.success:
                prioritized_tasks = prioritize_response.data.get("prioritized_tasks", enriched_tasks)
                results["stages"]["prioritization"] = {"success": True}
            else:
                prioritized_tasks = enriched_tasks
                results["stages"]["prioritization"] = {"success": False}

            # Stage 4: Schedule Optimization
            schedule_input = {"tasks": prioritized_tasks}
            schedule_response = await self.agents["schedule_optimization"].process(schedule_input, self.context)

            if schedule_response.success:
                results["schedule"] = schedule_response.data.get("schedule", {})
                results["recommendations"] = schedule_response.data.get("recommendations", [])
                results["stages"]["scheduling"] = {"success": True}
            else:
                results["stages"]["scheduling"] = {"success": False}

            # Final results
            results["tasks"] = prioritized_tasks
            results["total_tasks"] = len(prioritized_tasks)

            return results

        except Exception as e:
            self.logger.error(f"Enhanced full pipeline workflow failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "workflow": "full_pipeline_enhanced"
            }


    async def _fetch_user_tasks(self, user_id: str) -> List[Dict[str, Any]]:
        """Fetch tasks for a specific user to provide context"""
        try:
            supabase = get_supabase_admin()
            response = supabase.table("tasks").select("*").eq("user_id", user_id).order("due_date", desc=False).execute()
            return response.data if response.data else []
        except Exception as e:
            self.logger.error(f"Error fetching user tasks for context: {str(e)}")
            return []


# Create singleton instance
orchestrator_agent = OrchestratorAgent()
