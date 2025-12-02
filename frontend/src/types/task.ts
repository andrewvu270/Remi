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
  stress_level?: 'low' | 'medium' | 'high';
  ai_insights?: any;
  reasoning?: string;
  // MCP research sources
  research_sources?: Array<{
    source: string;
    query?: string;
    title?: string;
    reference?: Array<{title: string; url: string}>;
    result_count?: number;
  }>;
  wiki_summary?: string;
  academic_sources?: Array<{
    title: string;
    authors?: string[];
    summary?: string;
    url?: string;
    citation?: string;
    link?: string;
  }>;
  community_answers?: Array<{
    title: string;
    score?: number;
    summary?: string;
    link?: string;
  }>;
  research_insights?: {
    typical_hours?: string | null;
    difficulty_factors?: string[];
    recommendations?: string[];
  };
}

// Helper type for task status
export type TaskStatus = 'pending' | 'completed' | 'overdue';
