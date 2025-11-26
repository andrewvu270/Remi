export interface Task {
  id: string;
  title: string;
  task_type: string;
  due_date: string;
  description?: string; 
  weight_score?: number;  // Made optional to match backend
  predicted_hours: number;
  priority_score: number;
  status: 'pending' | 'completed' | 'overdue';
  grade_percentage: number;
  course_code: string;
  difficulty_level?: number;
  priority_rating?: number;
  course_id?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

// Helper type for task status
export type TaskStatus = 'pending' | 'completed' | 'overdue';
