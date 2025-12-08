from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str  # 'Assignment', 'Exam', 'Quiz', 'Project', 'Reading'
    due_date: datetime
    grade_percentage: Optional[float] = 0.0

class TaskCreate(TaskBase):
    course_id: str
    @field_validator('title', 'task_type', 'course_id')
    @classmethod
    def validate_required_fields(cls, v, info):
        if not v or (isinstance(v, str) and not v.strip()):
            raise ValueError(f'{info.field_name} is required and cannot be empty')
        return v
    
    @field_validator('due_date')
    @classmethod
    def validate_due_date(cls, v):
        if not v:
            raise ValueError('due_date is required')
        return v

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    task_type: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None  # 'pending', 'in_progress', 'completed'
    grade_percentage: Optional[float] = None

class TaskInDBBase(TaskBase):
    id: str
    course_id: str
    weight_score: float
    predicted_hours: float
    priority_score: float
    status: str
    extra_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Task(TaskInDBBase):
    course_code: Optional[str] = None

class TaskWithCourse(Task):
    course_name: Optional[str] = None
    course_code: Optional[str] = None

class TaskExtracted(BaseModel):
    title: str
    task_type: str
    due_date: str
    description: Optional[str] = None
    grade_percentage: Optional[float] = None
    importance_keywords: Optional[List[str]] = []

class TaskList(BaseModel):
    tasks: List[Task]
    total: int
