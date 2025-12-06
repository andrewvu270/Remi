// Centralized API configuration
const envApiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL;
export const API_BASE_URL = envApiBaseUrl || 'http://localhost:8000';

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  GOOGLE_URL: '/api/auth/google-url',
  
  // Upload
  UPLOAD_PREVIEW: '/api/upload/preview',
  UPLOAD_SYLLABUS: '/api/upload/syllabus',
  
  // Tasks
  TASKS: '/api/tasks',
  TASK_COMPLETE: (id: string) => `/api/tasks/${id}/complete`,
  
  // Courses
  COURSES: '/api/courses',
  
  // Survey
  SURVEY_SUBMIT: '/api/survey/submit',
  
  // Study Plan
  STUDY_PLAN_GENERATE: '/api/study-plan/generate',
  
  // ML
  ML_PREDICT: '/api/ml/predict-workload',
  
  // Agent v2 endpoints
  AGENTS_BASE: '/api/v2/agents',
  AGENT_PARSE: '/api/v2/agents/parse',
  AGENT_PREDICT: '/api/v2/agents/predict',
  AGENT_PRIORITIZE: '/api/v2/agents/prioritize',
  AGENT_SCHEDULE: '/api/v2/agents/schedule',
  AGENT_QUERY: '/api/v2/agents/query',
  AGENT_PIPELINE: '/api/v2/agents/pipeline',
  AGENT_STATUS: '/api/v2/agents/status',
  
  // Guest
  GUEST_SESSION: '/api/guest/session',
  GUEST_MIGRATE: (id: string) => `/api/guest/migrate/${id}`,
} as const;
