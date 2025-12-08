"""
Workload Prediction Agent

Hybrid LLM + ML approach for predicting task workload and stress levels.
Combines LLM reasoning with calibrated ML predictions.
"""

from typing import Any, Dict, Optional
from ..agents.agent_base import BaseAgent, AgentResponse
from ..services.llm_service import llm_service
from ..services.ml_service import ml_service
import logging

logger = logging.getLogger(__name__)


class WorkloadPredictionAgent(BaseAgent):
    """Agent for predicting workload, effort, and stress levels"""
    
    def __init__(self):
        super().__init__("WorkloadPredictionAgent")
        # Do not bind llm_service at init; use module-level reference in methods
        self.ml = ml_service
    
    async def process(
        self, 
        input_data: Dict[str, Any], 
        context: Optional[Dict[str, Any]] = None
    ) -> AgentResponse:
        """
        Predict workload for a task using hybrid LLM + ML approach.
        
        Input data should contain:
        - task: Task dictionary with title, description, type, etc.
        - use_hybrid: Whether to use hybrid approach (default: True)
        
        Returns:
            AgentResponse with workload predictions
        """
        task = input_data.get("task", {})
        use_hybrid = input_data.get("use_hybrid", True)
        
        if not task:
            return self._create_response(
                data={},
                confidence=0.0,
                explanation="No task provided"
            )
        
        # Phase 1: LLM Analysis
        llm_analysis = await self._llm_predict(task, context)
        
        # Phase 2: ML Calibration (if hybrid mode and ML model is trained)
        if use_hybrid and self.ml.is_trained:
            ml_prediction = await self._ml_calibrate(task, llm_analysis)
            final_prediction = self._combine_predictions(llm_analysis, ml_prediction)
            confidence = (llm_analysis["confidence"] + 0.8) / 2  # ML adds confidence
        else:
            final_prediction = llm_analysis
            confidence = llm_analysis["confidence"]
        
        return self._create_response(
            data={
                "estimated_hours": final_prediction["estimated_hours"],
                "stress_score": final_prediction["stress_score"],
                "complexity": final_prediction["complexity"],
                "breakdown": final_prediction.get("breakdown", {}),
                "llm_estimate": llm_analysis["estimated_hours"],
                "ml_estimate": ml_prediction.get("estimated_hours") if use_hybrid else None
            },
            confidence=confidence,
            explanation=final_prediction["explanation"],
            metadata={
                "method": "hybrid" if use_hybrid and self.ml.is_trained else "llm_only",
                "llm_confidence": llm_analysis["confidence"]
            }
        )
    
    async def _llm_predict(
        self, 
        task: Dict[str, Any], 
        context: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Use LLM to analyze task and predict workload"""
        task_description = task.get("description", task.get("title", ""))
        task_type = task.get("task_type", "Assignment")
        
        analysis = await llm_service.analyze_task_workload(
            task_description,
            task_type,
            context
        )
        
        # Add stress breakdown
        analysis["breakdown"] = self._calculate_stress_breakdown(task, analysis)
        
        return analysis
    
    async def _ml_calibrate(
        self, 
        task: Dict[str, Any], 
        llm_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use ML model to calibrate LLM prediction"""
        # Prepare task data with LLM estimates as features
        task_data = task.copy()
        task_data["estimated_hours"] = llm_analysis["estimated_hours"]
        task_data["difficulty_level"] = self._complexity_to_difficulty(
            llm_analysis["complexity"]
        )
        
        # Get ML prediction
        ml_hours = await self.ml.predict_workload(task_data)
        
        return {
            "estimated_hours": ml_hours,
            "method": "ml_calibrated"
        }
    
    def _combine_predictions(
        self, 
        llm_analysis: Dict[str, Any], 
        ml_prediction: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Combine LLM and ML predictions intelligently"""
        llm_hours = llm_analysis["estimated_hours"]
        ml_hours = ml_prediction["estimated_hours"]
        llm_confidence = llm_analysis["confidence"]
        
        # Weighted average based on LLM confidence
        # High LLM confidence: 60% LLM, 40% ML
        # Low LLM confidence: 30% LLM, 70% ML
        llm_weight = 0.3 + (llm_confidence * 0.3)
        ml_weight = 1.0 - llm_weight
        
        combined_hours = (llm_hours * llm_weight) + (ml_hours * ml_weight)
        
        return {
            "estimated_hours": round(combined_hours, 1),
            "stress_score": llm_analysis["stress_score"],
            "complexity": llm_analysis["complexity"],
            "explanation": f"{llm_analysis['explanation']} (Calibrated with historical data)",
            "confidence": llm_confidence,
            "breakdown": llm_analysis.get("breakdown", {})
        }
    
    def _calculate_stress_breakdown(
        self, 
        task: Dict[str, Any], 
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate stress factors breakdown"""
        stress_score = analysis["stress_score"]
        
        # Decompose stress into factors
        time_pressure = min(stress_score * 0.4, 0.4)
        complexity_stress = min(stress_score * 0.3, 0.3)
        importance_stress = min(stress_score * 0.3, 0.3)
        
        return {
            "time_pressure": round(time_pressure, 2),
            "complexity": round(complexity_stress, 2),
            "importance": round(importance_stress, 2),
            "total": round(stress_score, 2)
        }
    
    def _complexity_to_difficulty(self, complexity: str) -> int:
        """Convert complexity string to difficulty level"""
        mapping = {
            "low": 2,
            "medium": 3,
            "high": 4
        }
        return mapping.get(complexity.lower(), 3)


# Create singleton instance
workload_prediction_agent = WorkloadPredictionAgent()
