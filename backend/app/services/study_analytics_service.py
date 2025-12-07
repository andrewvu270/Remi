"""
Study Analytics Service - Pluggable ML/LLM architecture for study habit analysis

Supports multiple models:
- Groq (current default)
- ERNIE (fine-tuned, to be added)
- Ensemble mode (compare outputs and select best)
"""
from typing import List, Dict, Any, Optional, Literal
from datetime import datetime
import json
from app.services.llm_client import LLMClientManager

ModelType = Literal["groq", "ernie", "ensemble"]

class StudyAnalyticsService:
    """Service for analyzing study habits using pluggable ML models"""
    
    def __init__(self, model_type: ModelType = "groq"):
        self.model_type = model_type
        self.llm_client = LLMClientManager()
    
    async def analyze_study_patterns(
        self,
        sessions: List[Dict],
        reflections: List[Dict],
        time_distribution: Dict,
        time_effectiveness: Dict,
        estimation_accuracy: float,
        completion_rate: float,
        pomodoro_rate: float
    ) -> Dict[str, Any]:
        """
        Analyze study patterns using the configured model
        
        Returns:
            Dict with insights, predictions, and model metadata
        """
        if self.model_type == "groq":
            return await self._analyze_with_groq(
                sessions, reflections, time_distribution, time_effectiveness,
                estimation_accuracy, completion_rate, pomodoro_rate
            )
        elif self.model_type == "ernie":
            return await self._analyze_with_ernie(
                sessions, reflections, time_distribution, time_effectiveness,
                estimation_accuracy, completion_rate, pomodoro_rate
            )
        elif self.model_type == "ensemble":
            return await self._analyze_with_ensemble(
                sessions, reflections, time_distribution, time_effectiveness,
                estimation_accuracy, completion_rate, pomodoro_rate
            )
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")
    
    async def _analyze_with_groq(
        self,
        sessions: List[Dict],
        reflections: List[Dict],
        time_distribution: Dict,
        time_effectiveness: Dict,
        estimation_accuracy: float,
        completion_rate: float,
        pomodoro_rate: float
    ) -> Dict[str, Any]:
        """Analyze using Groq LLM"""
        try:
            # Prepare comprehensive input data
            input_data = self._prepare_analysis_input(
                sessions, reflections, time_distribution, time_effectiveness,
                estimation_accuracy, completion_rate, pomodoro_rate
            )
            
            prompt = f"""Analyze this student's study patterns and provide intelligent insights:

INPUT DATA:
{json.dumps(input_data, indent=2)}

Provide comprehensive analysis in JSON format:
{{
  "insights": [
    {{
      "type": "pattern|strength|improvement|prediction",
      "title": "...",
      "description": "...",
      "recommendation": "...",
      "confidence": 0.0-1.0,
      "data_points": ["specific evidence"]
    }}
  ],
  "predictions": {{
    "optimal_study_time": "morning|afternoon|evening|night",
    "recommended_session_length": 1.5,
    "estimated_weekly_capacity": 15.0,
    "stress_level_trend": "increasing|stable|decreasing"
  }},
  "patterns": {{
    "underestimation_bias": 0.2,
    "overestimation_bias": -0.1,
    "consistency_score": 0.85,
    "pomodoro_effectiveness": 1.15
  }}
}}

Focus on:
1. Time-of-day productivity patterns with specific metrics
2. Estimation accuracy trends and biases
3. Study technique effectiveness (Pomodoro vs regular)
4. Behavioral patterns from reflections
5. Workload capacity predictions
6. Stress level indicators
7. Actionable, data-driven recommendations"""

            response = await self.llm_client.chat_completion(
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert data scientist specializing in learning analytics, behavioral patterns, and predictive modeling. Analyze study data to provide evidence-based insights and accurate predictions."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1200
            )
            
            response_text = response.choices[0].message.content.strip()
            
            # Parse JSON response
            try:
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}') + 1
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = response_text[start_idx:end_idx]
                    analysis = json.loads(json_str)
                else:
                    analysis = json.loads(response_text)
            except Exception as e:
                print(f"Failed to parse Groq response: {e}")
                analysis = self._get_fallback_analysis(sessions, completion_rate)
            
            # Add model metadata
            analysis['model'] = 'groq'
            analysis['model_version'] = 'llama-3.3-70b-versatile'
            analysis['timestamp'] = datetime.now().isoformat()
            
            return analysis
            
        except Exception as e:
            print(f"Groq analysis failed: {e}")
            return self._get_fallback_analysis(sessions, completion_rate)
    
    async def _analyze_with_ernie(
        self,
        sessions: List[Dict],
        reflections: List[Dict],
        time_distribution: Dict,
        time_effectiveness: Dict,
        estimation_accuracy: float,
        completion_rate: float,
        pomodoro_rate: float
    ) -> Dict[str, Any]:
        """
        Analyze using fine-tuned ERNIE model
        
        TODO: Implement ERNIE integration
        - Load fine-tuned ERNIE model
        - Prepare input in ERNIE format
        - Run inference
        - Parse ERNIE output
        """
        # Placeholder for ERNIE implementation
        # This will be implemented when ERNIE model is ready
        
        input_data = self._prepare_analysis_input(
            sessions, reflections, time_distribution, time_effectiveness,
            estimation_accuracy, completion_rate, pomodoro_rate
        )
        
        # TODO: Call ERNIE model API
        # ernie_response = await self._call_ernie_api(input_data)
        
        # For now, return placeholder
        return {
            "model": "ernie",
            "model_version": "ernie-3.0-fine-tuned",
            "status": "not_implemented",
            "message": "ERNIE model integration pending",
            "insights": [],
            "predictions": {},
            "patterns": {}
        }
    
    async def _analyze_with_ensemble(
        self,
        sessions: List[Dict],
        reflections: List[Dict],
        time_distribution: Dict,
        time_effectiveness: Dict,
        estimation_accuracy: float,
        completion_rate: float,
        pomodoro_rate: float
    ) -> Dict[str, Any]:
        """
        Analyze using ensemble of models and select best output
        
        Strategy:
        1. Run both Groq and ERNIE in parallel
        2. Compare outputs using confidence scores and consistency
        3. Select best prediction for each metric
        4. Combine insights from both models
        """
        try:
            # Run both models
            groq_result = await self._analyze_with_groq(
                sessions, reflections, time_distribution, time_effectiveness,
                estimation_accuracy, completion_rate, pomodoro_rate
            )
            
            ernie_result = await self._analyze_with_ernie(
                sessions, reflections, time_distribution, time_effectiveness,
                estimation_accuracy, completion_rate, pomodoro_rate
            )
            
            # Ensemble strategy: combine best of both
            ensemble_result = {
                "model": "ensemble",
                "models_used": ["groq", "ernie"],
                "timestamp": datetime.now().isoformat(),
                "insights": self._merge_insights(
                    groq_result.get('insights', []),
                    ernie_result.get('insights', [])
                ),
                "predictions": self._select_best_predictions(
                    groq_result.get('predictions', {}),
                    ernie_result.get('predictions', {})
                ),
                "patterns": self._merge_patterns(
                    groq_result.get('patterns', {}),
                    ernie_result.get('patterns', {})
                ),
                "model_agreement": self._calculate_agreement(groq_result, ernie_result)
            }
            
            return ensemble_result
            
        except Exception as e:
            print(f"Ensemble analysis failed: {e}")
            # Fallback to Groq only
            return await self._analyze_with_groq(
                sessions, reflections, time_distribution, time_effectiveness,
                estimation_accuracy, completion_rate, pomodoro_rate
            )
    
    def _prepare_analysis_input(
        self,
        sessions: List[Dict],
        reflections: List[Dict],
        time_distribution: Dict,
        time_effectiveness: Dict,
        estimation_accuracy: float,
        completion_rate: float,
        pomodoro_rate: float
    ) -> Dict[str, Any]:
        """Prepare standardized input format for any model"""
        
        # Extract session features
        session_features = []
        for s in sessions:
            session_features.append({
                "title": s.get('task_title', 'Unknown'),
                "estimated_hours": float(s.get('estimated_hours', 0)),
                "actual_hours": float(s.get('actual_hours', 0)),
                "variance": float(s.get('actual_hours', 0)) - float(s.get('estimated_hours', 0)),
                "completed_at": s.get('completed_at', ''),
                "pomodoro_count": s.get('pomodoro_count', 0),
                "pomodoro_used": s.get('pomodoro_count', 0) > 0,
                "priority": s.get('priority', 5)
            })
        
        # Extract reflection themes
        reflection_themes = {
            "challenges": [],
            "learnings": [],
            "improvements": []
        }
        
        for r in reflections:
            if r.get('what_was_challenging'):
                reflection_themes['challenges'].append(r['what_was_challenging'])
            if r.get('what_learned'):
                reflection_themes['learnings'].append(r['what_learned'])
            if r.get('what_to_improve'):
                reflection_themes['improvements'].append(r['what_to_improve'])
        
        return {
            "summary": {
                "total_sessions": len(sessions),
                "completion_rate": completion_rate,
                "estimation_accuracy": estimation_accuracy,
                "pomodoro_usage_rate": pomodoro_rate
            },
            "time_patterns": {
                "distribution": time_distribution,
                "effectiveness": time_effectiveness
            },
            "sessions": session_features[:20],  # Last 20 sessions
            "reflections": reflection_themes
        }
    
    def _merge_insights(self, groq_insights: List[Dict], ernie_insights: List[Dict]) -> List[Dict]:
        """Merge insights from multiple models, removing duplicates and ranking by confidence"""
        all_insights = groq_insights + ernie_insights
        
        # Sort by confidence
        all_insights.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        # Remove duplicates (similar titles)
        seen_titles = set()
        unique_insights = []
        for insight in all_insights:
            title = insight.get('title', '').lower()
            if title not in seen_titles:
                seen_titles.add(title)
                unique_insights.append(insight)
        
        return unique_insights[:8]  # Top 8 insights
    
    def _select_best_predictions(self, groq_pred: Dict, ernie_pred: Dict) -> Dict:
        """Select best prediction for each metric based on confidence/accuracy"""
        # For now, prefer Groq (will update when ERNIE is trained)
        return groq_pred
    
    def _merge_patterns(self, groq_patterns: Dict, ernie_patterns: Dict) -> Dict:
        """Merge pattern analysis from multiple models"""
        # Average numeric patterns
        merged = {}
        all_keys = set(groq_patterns.keys()) | set(ernie_patterns.keys())
        
        for key in all_keys:
            groq_val = groq_patterns.get(key)
            ernie_val = ernie_patterns.get(key)
            
            if groq_val is not None and ernie_val is not None:
                # Average if both present
                if isinstance(groq_val, (int, float)) and isinstance(ernie_val, (int, float)):
                    merged[key] = (groq_val + ernie_val) / 2
                else:
                    merged[key] = groq_val  # Prefer Groq for non-numeric
            else:
                merged[key] = groq_val if groq_val is not None else ernie_val
        
        return merged
    
    def _calculate_agreement(self, result1: Dict, result2: Dict) -> float:
        """Calculate agreement score between two model outputs"""
        # Simple agreement metric (can be enhanced)
        # Compare predictions and patterns
        
        agreements = 0
        total_comparisons = 0
        
        # Compare predictions
        pred1 = result1.get('predictions', {})
        pred2 = result2.get('predictions', {})
        
        for key in set(pred1.keys()) & set(pred2.keys()):
            total_comparisons += 1
            if pred1[key] == pred2[key]:
                agreements += 1
        
        return agreements / total_comparisons if total_comparisons > 0 else 0.0
    
    def _get_fallback_analysis(self, sessions: List[Dict], completion_rate: float) -> Dict[str, Any]:
        """Fallback analysis when models fail"""
        return {
            "model": "fallback",
            "insights": [
                {
                    "type": "info",
                    "title": "Building Study Habits",
                    "description": f"You've completed {len(sessions)} sessions with {completion_rate:.0%} completion rate",
                    "recommendation": "Keep maintaining consistency to unlock AI-powered insights",
                    "confidence": 0.8,
                    "data_points": [f"{len(sessions)} sessions completed"]
                }
            ],
            "predictions": {
                "optimal_study_time": "morning",
                "recommended_session_length": 2.0,
                "estimated_weekly_capacity": 10.0,
                "stress_level_trend": "stable"
            },
            "patterns": {
                "consistency_score": 0.7
            }
        }
