import json
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import numpy as np
import lightgbm as lgb


class MLPredictionService:
    """Service for ML-based workload prediction and task analysis."""
    
    def __init__(self):
        self.model = None
        self.is_trained = False
        self.model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/lightgbm_survey_model.txt"))
        self.feature_columns_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/lightgbm_feature_columns.json"))
        self.feature_importance_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../models/lightgbm_feature_importance.json"))
        self.feature_columns: List[str] = []
        self.base_hours = {
            "Assignment": 3.0,
            "Exam": 8.0,
            "Quiz": 2.0,
            "Project": 12.0,
            "Reading": 1.5,
            "Lab": 4.0
        }
        self.use_lightgbm = os.getenv("USE_LIGHTGBM", "false").lower() in {"1", "true", "yes"}
        self._load_or_create_model()
    
    def _load_or_create_model(self):
        """Load existing model or create a new one if none exists."""
        try:
            if self.use_lightgbm and os.path.exists(self.model_path):
                self.model = lgb.Booster(model_file=self.model_path)
                self.feature_columns = self._load_feature_columns()
                self.is_trained = True
            else:
                self.model = None
                self.is_trained = False
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            self.model = None
            self.is_trained = False
    
    def _create_rule_based_model(self):
        """Placeholder kept for backward compatibility (base hours set in __init__)."""
        return
    
    async def predict_workload(self, task_data: Dict[str, Any]) -> float:
        """
        Predict the workload (hours needed) for a given task.
        
        Args:
            task_data: Dictionary containing task information
            
        Returns:
            Predicted hours needed to complete the task
        """
        try:
            if self.is_trained and self.model:
                return await self._ml_predict(task_data)

            return self._rule_based_predict(task_data)

        except Exception as e:
            print(f"Prediction error: {str(e)}")
            # Fallback to rule-based prediction
            return self._rule_based_predict(task_data)
    
    async def _ml_predict(self, task_data: Dict[str, Any]) -> float:
        """
        Make prediction using trained ML model.
        
        Args:
            task_data: Task information dictionary
            
        Returns:
            Predicted hours
        """
        # Extract features for ML model
        features = self._extract_features(task_data)
        features = np.array([features])

        missing_columns = [idx for idx, value in enumerate(features[0]) if value is None]
        if missing_columns:
            return self._rule_based_predict(task_data)

        prediction = self.model.predict(features)[0]

        # Ensure prediction is reasonable
        return max(0.5, min(prediction, 40.0))  # Between 0.5 and 40 hours
    
    def _rule_based_predict(self, task_data: Dict[str, Any]) -> float:
        """
        Make prediction using rule-based approach.
        
        Args:
            task_data: Task information dictionary
            
        Returns:
            Predicted hours
        """
        estimated_hours = float(task_data.get("estimated_hours", 0) or 0)
        grade_percentage = float(task_data.get("grade_percentage", 0) or 0)
        task_type = task_data.get("task_type", "Assignment")
        difficulty = float(task_data.get("difficulty_level", 3) or 3)
        priority = float(task_data.get("priority_rating", 3) or 3)

        base_hours = self.base_hours.get(task_type, 3.0)

        estimate_weight = 0.5 * estimated_hours
        grade_weight = base_hours * (grade_percentage / 100.0)
        difficulty_weight = (difficulty / 5.0) * base_hours
        priority_weight = (priority / 5.0) * base_hours * 0.8

        predicted_hours = estimated_hours + estimate_weight + grade_weight + difficulty_weight + priority_weight

        return max(0.5, min(predicted_hours, 40.0))
    
    def _extract_features(self, task_data: Dict[str, Any]) -> List[float]:
        """
        Extract numerical features from task data for ML model.
        
        Args:
            task_data: Task information dictionary
            
        Returns:
            List of numerical features
        """
        if not self.feature_columns:
            self.feature_columns = self._load_feature_columns()

        if not self.feature_columns:
            raise RuntimeError("Feature columns not configured for ML model")

        feature_values: Dict[str, float] = {
            "grade_percentage": float(task_data.get("grade_percentage", 0) or 0),
            "estimated_hours": float(task_data.get("estimated_hours", 0) or 0),
            "difficulty_level": float(task_data.get("difficulty_level", 3) or 3),
            "priority_rating": float(task_data.get("priority_rating", 3) or 3),
            "days_until_due": float(self._calculate_days_until_due(task_data.get("due_date"))),
            "days_between_estimate_and_completion": float(self._calculate_days_between(task_data.get("due_date"), task_data.get("completion_date"))),
        }

        for key in list(feature_values.keys()):
            if not np.isfinite(feature_values[key]):
                feature_values[key] = 0.0

        task_type = task_data.get("task_type", "Assignment")
        for column in self.feature_columns:
            if column.startswith("task_type_"):
                feature_values[column] = 1.0 if column == f"task_type_{task_type}" else 0.0

        return [feature_values.get(column, 0.0) for column in self.feature_columns]

    async def update_model_with_feedback(self, task_data: Dict[str, Any], actual_hours: float):
        """
        Update the model with actual completion time feedback.
        
        Args:
            task_data: Original task data
            actual_hours: Actual hours taken to complete the task
        """
        try:
            # In a real implementation, you would:
            # 1. Store this feedback data
            # 2. Periodically retrain the model with new data
            # 3. Update the model file
            
            # For now, we'll just log the feedback
            print(f"Model feedback: Task '{task_data.get('title')}' - Predicted vs Actual: {task_data.get('predicted_hours')} vs {actual_hours}")
            
            # Store feedback for future model training
            feedback_data = {
                "task_data": task_data,
                "actual_hours": actual_hours,
                "timestamp": datetime.now().isoformat()
            }
            
            # In production, save this to a database or file
            # await self._save_feedback(feedback_data)
            
        except Exception as e:
            print(f"Error updating model with feedback: {str(e)}")
    
    async def get_model_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the ML model performance.
        
        Returns:
            Dictionary containing model statistics
        """
        try:
            # In a real implementation, you would calculate actual statistics
            # For now, return placeholder data
            return {
                "model_type": "LightGBM" if self.model else "Rule-based",
                "is_trained": self.is_trained,
                "total_predictions": 0,  # Would track this in production
                "average_accuracy": 0.85,  # Would calculate from validation data
                "last_updated": datetime.now().isoformat(),
                "feature_importance": {
                    "task_type": 0.35,
                    "grade_percentage": 0.25,
                    "description_length": 0.15,
                    "days_until_due": 0.15,
                    "instructor_keywords": 0.10
                }
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _load_feature_columns(self) -> List[str]:
        try:
            if os.path.exists(self.feature_columns_path):
                with open(self.feature_columns_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list):
                    return data
            if os.path.exists(self.feature_importance_path):
                with open(self.feature_importance_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    return list(data.keys())
        except Exception as exc:
            print(f"Failed to load feature columns: {exc}")
        return [
            "grade_percentage",
            "estimated_hours",
            "difficulty_level",
            "priority_rating",
            "days_until_due",
            "days_between_estimate_and_completion",
            "task_type_Assignment",
            "task_type_Exam",
            "task_type_Quiz",
            "task_type_Project",
            "task_type_Lab",
            "task_type_Reading",
        ]

    @staticmethod
    def _calculate_days_until_due(due_date: Optional[str]) -> float:
        if not due_date:
            return 30.0
        try:
            due_datetime = datetime.strptime(due_date, "%Y-%m-%d")
            days_until = (due_datetime - datetime.now()).days
            return float(max(0, days_until))
        except Exception:
            return 30.0

    @staticmethod
    def _calculate_days_between(due_date: Optional[str], completion_date: Optional[str]) -> float:
        if not due_date:
            return 0.0
        try:
            due_datetime = datetime.strptime(due_date, "%Y-%m-%d")
            completion_datetime = datetime.strptime(completion_date, "%Y-%m-%d") if completion_date else datetime.now()
            return float((completion_datetime - due_datetime).days)
        except Exception:
            return 0.0


# Create a singleton instance
ml_service = MLPredictionService()