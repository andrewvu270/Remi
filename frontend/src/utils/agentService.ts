import { buildApiUrl, API_ENDPOINTS } from '../config/api';

export interface ParseDocumentRequest {
  text: string;
  source_type?: string;
  user_id?: string;
  course_id?: string;
}

export interface PredictWorkloadRequest {
  task: any;
  use_hybrid?: boolean;
  user_id?: string;
}

export interface PrioritizeTasksRequest {
  tasks: any[];
  criteria?: any;
  user_id?: string;
}

export interface GenerateScheduleRequest {
  tasks: any[];
  start_date?: string;
  days?: number;
  user_id?: string;
}

export interface NaturalLanguageQueryRequest {
  query: string;
  user_id?: string;
}

export interface FullPipelineRequest {
  text: string;
  source_type?: string;
  schedule_days?: number;
  user_id?: string;
  course_id?: string;
}

class AgentService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('access_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async parseDocument(request: ParseDocumentRequest) {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AGENT_PARSE), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to parse document');
    }
    
    return response.json();
  }

  async predictWorkload(request: PredictWorkloadRequest) {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AGENT_PREDICT), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to predict workload');
    }
    
    return response.json();
  }

  async prioritizeTasks(request: PrioritizeTasksRequest) {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AGENT_PRIORITIZE), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to prioritize tasks');
    }
    
    return response.json();
  }

  async generateSchedule(request: GenerateScheduleRequest) {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AGENT_SCHEDULE), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to generate schedule');
    }
    
    return response.json();
  }

  async naturalLanguageQuery(request: NaturalLanguageQueryRequest) {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AGENT_QUERY), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to process query');
    }
    
    return response.json();
  }

  async fullPipeline(request: FullPipelineRequest) {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AGENT_PIPELINE), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to run pipeline');
    }
    
    return response.json();
  }

  async getAgentStatus() {
    const response = await fetch(buildApiUrl(API_ENDPOINTS.AGENT_STATUS), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to get agent status');
    }
    
    return response.json();
  }
}

export const agentService = new AgentService();
