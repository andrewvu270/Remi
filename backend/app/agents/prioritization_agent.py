"""
Prioritization Agent

Intelligently ranks tasks based on urgency, effort, stress, and user patterns.
Uses LLM for reasoning and explanation.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
from ..agents.agent_base import BaseAgent, AgentResponse
from ..services.llm_service import llm_service
import logging

logger = logging.getLogger(__name__)


class PrioritizationAgent(BaseAgent):
    """Agent for intelligent task prioritization"""
    
    def __init__(self):
        super().__init__("PrioritizationAgent")
        # Do not bind llm_service at init; use module-level reference in methods
    
    async def process(
        self, 
        input_data: Dict[str, Any], 
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Prioritize tasks based on multiple factors.
        
        Input data should contain:
        - tasks: List of task dictionaries
        - criteria: Optional prioritization criteria
        
        Returns:
            AgentResponse with prioritized tasks
        """
        tasks = input_data.get("tasks", [])
        criteria = input_data.get("criteria", {})
        
        if not tasks:
            return self._create_response(
                data={"priorities": []},
                confidence=0.0,
                explanation="No tasks to prioritize"
            )
        
        # Use LLM for intelligent prioritization
        llm_result = await llm_service.prioritize_tasks(tasks, context)
        
        # Calculate rule-based priorities as backup
        rule_based = self._rule_based_prioritization(tasks)
        
        # Combine approaches
        final_priorities = self._combine_prioritizations(
            llm_result, 
            rule_based, 
            tasks
        )
        
        return self._create_response(
            data={
                "priorities": final_priorities,
                "recommendations": llm_result.get("recommendations", []),
                "high_priority_count": sum(1 for p in final_priorities if p["priority_score"] > 0.7)
            },
            confidence=0.85,
            explanation="Tasks prioritized based on urgency, effort, and impact",
            metadata={
                "total_tasks": len(tasks),
                "criteria": criteria
            }
        )
    
    def _rule_based_prioritization(
        self, 
        tasks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Calculate rule-based priority scores"""
        prioritized = []
        
        for task in tasks:
            score = self._calculate_priority_score(task)
            prioritized.append({
                "task_id": task.get("id", task.get("title")),
                "priority_score": score,
                "factors": self._get_priority_factors(task)
            })
        
        # Sort by score (descending)
        prioritized.sort(key=lambda x: x["priority_score"], reverse=True)
        
        return prioritized
    
    def _calculate_priority_score(self, task: Dict[str, Any]) -> float:
        """Calculate priority score (0.0 to 1.0)"""
        score = 0.0
        
        # Factor 1: Deadline urgency (0.4 weight)
        urgency = self._calculate_urgency(task.get("due_date"))
        score += urgency * 0.4
        
        # Factor 2: Grade/importance (0.3 weight)
        importance = float(task.get("grade_percentage", 10)) / 100.0
        score += importance * 0.3
        
        # Factor 3: Stress level (0.2 weight)
        stress = float(task.get("stress_score", 0.5))
        score += stress * 0.2
        
        # Factor 4: Estimated hours (0.1 weight - higher hours = higher priority)
        hours = float(task.get("estimated_hours", 3))
        hours_factor = min(hours / 20.0, 1.0)  # Normalize to 0-1
        score += hours_factor * 0.1
        
        return min(score, 1.0)
    
    def _calculate_urgency(self, due_date: Optional[str]) -> float:
        """Calculate urgency factor based on due date"""
        if not due_date:
            return 0.3  # Low urgency if no deadline
        
        try:
            due = datetime.strptime(due_date, "%Y-%m-%d")
            days_until = (due - datetime.now()).days
            
            if days_until < 0:
                return 1.0  # Overdue - maximum urgency
            elif days_until <= 1:
                return 0.95
            elif days_until <= 3:
                return 0.85
            elif days_until <= 7:
                return 0.7
            elif days_until <= 14:
                return 0.5
            else:
                return 0.3
        except:
            return 0.3
    
    def _get_priority_factors(self, task: Dict[str, Any]) -> Dict[str, float]:
        """Get breakdown of priority factors"""
        return {
            "urgency": self._calculate_urgency(task.get("due_date")),
            "importance": float(task.get("grade_percentage", 10)) / 100.0,
            "stress": float(task.get("stress_score", 0.5)),
            "effort": min(float(task.get("estimated_hours", 3)) / 20.0, 1.0)
        }
    
    def _combine_prioritizations(
        self,
        llm_result: Dict[str, Any],
        rule_based: List[Dict[str, Any]],
        tasks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Combine LLM and rule-based prioritizations"""
        # If LLM failed, use rule-based
        if "error" in llm_result:
            return rule_based
        
        llm_priorities = llm_result.get("priorities", [])
        llm_explanations = llm_result.get("explanations", {})
        
        # Create combined result
        combined = []
        for i, task_id in enumerate(llm_priorities):
            # Find rule-based score
            rule_item = next(
                (r for r in rule_based if r["task_id"] == task_id), 
                None
            )
            
            # LLM ranking score (1.0 for first, decreasing)
            llm_score = 1.0 - (i / max(len(llm_priorities), 1))
            
            # Combine scores (70% LLM, 30% rule-based)
            if rule_item:
                final_score = (llm_score * 0.7) + (rule_item["priority_score"] * 0.3)
                factors = rule_item["factors"]
            else:
                final_score = llm_score * 0.7
                factors = {}
            
            combined.append({
                "task_id": task_id,
                "priority_score": round(final_score, 3),
                "rank": i + 1,
                "explanation": llm_explanations.get(str(task_id), ""),
                "factors": factors
            })
        
        return combined


# Create singleton instance
prioritization_agent = PrioritizationAgent()
