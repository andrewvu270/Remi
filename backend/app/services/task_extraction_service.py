import json
import re
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from ..config import settings
from .llm_client import LLMClientManager


class TaskExtractionService:
    """Service for extracting academic tasks from syllabus text using OpenAI API."""
    
    def __init__(self):
        try:
            self.client_manager = LLMClientManager()
        except ValueError:
            print("Warning: No LLM provider configured. Study plan generation will not work.")
            self.client_manager = None
    
    async def extract_tasks_from_syllabus(self, syllabus_text: str, course_name: str = "") -> List[Dict[str, Any]]:
        """
        Extract academic tasks from syllabus text using OpenAI GPT.
        
        Args:
            syllabus_text: Raw text content from syllabus
            course_name: Name of the course (for context)
            
        Returns:
            List of extracted tasks with their properties
        """
        try:
            if not self.client_manager:
                raise Exception("OpenAI API key not configured")
            
            # Prepare the prompt for OpenAI
            prompt = self._build_extraction_prompt(syllabus_text, course_name)
            
            # Call OpenAI API using new syntax
            response = await self.client_manager.chat_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an academic assistant that extracts assignment and exam information from course syllabi. Always return valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for consistent results
                max_tokens=2000
            )
            
            # Parse the response
            extracted_text = response.choices[0].message.content.strip()
            
            # Try to extract JSON from the response
            tasks = self._parse_tasks_from_response(extracted_text)
            
            # Process and validate the extracted tasks
            processed_tasks = []
            for task in tasks:
                processed_task = self._process_extracted_task(task)
                if processed_task:
                    processed_tasks.append(processed_task)
            
            return processed_tasks
            
        except Exception as e:
            raise Exception(f"Task extraction failed: {str(e)}")
    
    def _build_extraction_prompt(self, syllabus_text: str, course_name: str) -> str:
        """
        Build the prompt for OpenAI API to extract tasks from syllabus.
        
        Args:
            syllabus_text: Text content from syllabus
            course_name: Name of the course
            
        Returns:
            Formatted prompt string
        """
        current_date = datetime.now()
        current_date_str = current_date.strftime("%Y-%m-%d")
        semester_start = current_date - timedelta(days=current_date.weekday())  # Monday of current week
        
        prompt = f"""
TASK: Extract ALL academic tasks, assignments, exams, quizzes, projects, and important deadlines from this syllabus.

COURSE INFORMATION:
- Course Name: {course_name}
- Today's Date: {current_date_str}
- Semester Start (estimated): {semester_start.strftime("%Y-%m-%d")}

SYLLABUS TEXT:
{syllabus_text[:5000]}

REQUIRED OUTPUT FORMAT (VALID JSON ONLY):
{{
    "course_code": "EXTRACTED COURSE CODE",
    "tasks": [
        {{
            "title": "Task name",
            "description": "What is required",
            "task_type": "Assignment|Exam|Quiz|Project|Reading|Lab|Presentation|Discussion|Other",
            "due_date": "YYYY-MM-DD",
            "due_time": "HH:MM",
            "grade_percentage": 5.0,
            "notes": "Any additional details"
        }}
    ]
}}

COURSE CODE EXTRACTION:
- Look for patterns like: "CS101", "MATH 201", "BIO-301", "PSYCH 101", "ENGL 102"
- Check headers, titles, and first paragraphs
- Course code is usually alphanumeric (letters + numbers)
- If not found, use "UNKNOWN"

DATE EXTRACTION RULES (CRITICAL):
1. EXACT DATES: Look for "January 15", "1/15", "01/15/2024", "15 January", "Jan 15"
2. WEEK NUMBERS: "Week 5" = 5 weeks from semester start. Calculate: {semester_start.strftime("%Y-%m-%d")} + (5 * 7 days)
3. RELATIVE DATES: "End of week 3", "by Friday of week 4", "start of month"
4. MONTH NAMES: "May 4th", "December 10", "March 15, 2024"
5. PATTERNS: Look for "due", "deadline", "submit by", "by", "on", "before"
6. DEFAULT TIME: If no time given, use "23:59" (end of day)
7. FUTURE DATES ONLY: All dates must be in the future from today ({current_date_str})
8. AMBIGUOUS DATES: Use context clues (e.g., "Assignment 1 due Week 2" means 2 weeks from start)

TASK TYPE IDENTIFICATION:
- Exam/Test: "exam", "test", "midterm", "final", "quiz"
- Assignment: "assignment", "hw", "homework", "problem set", "worksheet"
- Project: "project", "group project", "research project"
- Quiz: "quiz", "pop quiz", "weekly quiz"
- Reading: "reading", "chapter", "textbook"
- Lab: "lab", "laboratory", "practical"
- Presentation: "presentation", "talk", "speech"
- Discussion: "discussion", "forum", "debate"

GRADE PERCENTAGE ESTIMATION:
- If percentage given in syllabus, use it
- Otherwise estimate: Exam=25%, Assignment=10%, Project=15%, Quiz=5%, Participation=5%, Other=10%
- Total should make sense for a course

EXTRACTION RULES:
1. Extract EVERY deadline mentioned in the syllabus
2. If a task appears multiple times (e.g., "Weekly assignments"), create ONE entry with "Weekly" in title
3. Include all relevant context in description
4. Be thorough - better to extract too much than miss deadlines
5. Return ONLY valid JSON, no explanations or extra text
6. Ensure all dates are realistic and in the future

EXAMPLE OUTPUT:
{{
    "course_code": "CS101",
    "tasks": [
        {{
            "title": "Assignment 1",
            "description": "Chapter 1-2 problems",
            "task_type": "Assignment",
            "due_date": "2024-09-20",
            "due_time": "23:59",
            "grade_percentage": 10.0,
            "notes": "Submit via Canvas"
        }},
        {{
            "title": "Midterm Exam",
            "description": "Covers chapters 1-5",
            "task_type": "Exam",
            "due_date": "2024-10-15",
            "due_time": "14:00",
            "grade_percentage": 25.0,
            "notes": "In-class exam"
        }}
    ]
}}

NOW EXTRACT ALL TASKS FROM THE SYLLABUS ABOVE. RETURN ONLY VALID JSON.
        """
        
        return prompt
    
    def _parse_tasks_from_response(self, response_text: str) -> List[Dict[str, Any]]:
        """
        Parse and extract JSON tasks from OpenAI response.
        
        Args:
            response_text: Raw response text from OpenAI
            
        Returns:
            List of task dictionaries
        """
        try:
            # Try to find JSON in the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                data = json.loads(json_str)
                return data.get("tasks", [])
            else:
                # Try to parse the entire response as JSON
                data = json.loads(response_text)
                return data.get("tasks", [])
                
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract tasks manually
            return self._fallback_task_extraction(response_text)
    
    def _fallback_task_extraction(self, text: str) -> List[Dict[str, Any]]:
        """
        Fallback method to extract tasks when JSON parsing fails.
        
        Args:
            text: Response text from OpenAI
            
        Returns:
            List of basic task dictionaries
        """
        # This is a simple fallback - in production, you might want more sophisticated parsing
        tasks = []
        
        # Look for common patterns
        lines = text.split('\n')
        current_task = {}
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Look for task patterns
            if any(keyword in line.lower() for keyword in ['assignment', 'exam', 'quiz', 'project']):
                if current_task:
                    tasks.append(current_task)
                current_task = {"title": line, "task_type": "Assignment"}
            
            # Look for dates
            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', line)
            if date_match and current_task:
                current_task["due_date"] = date_match.group(1)
        
        if current_task:
            tasks.append(current_task)
        
        return tasks
    
    def _process_extracted_task(self, task: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process and validate an extracted task.
        
        Args:
            task: Raw task dictionary from extraction
            
        Returns:
            Processed task dictionary or None if invalid
        """
        try:
            # Required fields
            if not task.get("title"):
                return None
            
            # Set defaults for missing fields
            processed_task = {
                "title": task["title"],
                "description": task.get("description", ""),
                "task_type": self._normalize_task_type(task.get("task_type", "Assignment")),
                "due_date": self._parse_date(task.get("due_date")),
                "due_time": task.get("due_time", "23:59"),
                "grade_percentage": float(task.get("grade_percentage", 0)),
                "instructor_keywords": task.get("instructor_keywords", []),
                "notes": task.get("notes", "")
            }
            
            # Validate the processed task
            if not processed_task["due_date"]:
                return None
            
            return processed_task
            
        except Exception as e:
            # Log the error and skip this task
            print(f"Error processing task: {str(e)}")
            return None
    
    def _normalize_task_type(self, task_type: str) -> str:
        """
        Normalize task type to standard values.
        
        Args:
            task_type: Raw task type string
            
        Returns:
            Normalized task type
        """
        task_type = task_type.lower().strip()
        
        type_mapping = {
            "assignment": "Assignment",
            "assignments": "Assignment",
            "exam": "Exam",
            "exams": "Exam",
            "midterm": "Exam",
            "final": "Exam",
            "quiz": "Quiz",
            "quizzes": "Quiz",
            "test": "Quiz",
            "project": "Project",
            "projects": "Project",
            "reading": "Reading",
            "readings": "Reading",
            "lab": "Lab",
            "labs": "Lab"
        }
        
        return type_mapping.get(task_type, "Assignment")
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """
        Parse and normalize date string.
        
        Args:
            date_str: Raw date string
            
        Returns:
            Normalized date string in YYYY-MM-DD format or None
        """
        if not date_str:
            return None
        
        try:
            # Try to parse common date formats
            date_formats = [
                "%Y-%m-%d",
                "%m/%d/%Y",
                "%m-%d-%Y",
                "%B %d, %Y",
                "%b %d, %Y"
            ]
            
            for fmt in date_formats:
                try:
                    parsed_date = datetime.strptime(date_str, fmt)
                    return parsed_date.strftime("%Y-%m-%d")
                except ValueError:
                    continue
            
            # If no format matches, return None
            return None
            
        except Exception:
            return None


# Create a singleton instance
task_extraction_service = TaskExtractionService()