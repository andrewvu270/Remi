import { Task, TaskStatus } from '../types/task';
import { API_BASE_URL } from '../config/api';

/**
 * Task Storage Utilities
 * Handles reading tasks from both API (for logged-in users) and localStorage (for guests)
 */

interface TasksResponse {
  tasks: Task[];
  total: number;
}

// Helper function to ensure task status is valid
const ensureValidStatus = (status: string): TaskStatus => {
  return (['pending', 'completed', 'overdue'].includes(status) 
    ? status 
    : 'pending') as TaskStatus;
};

// Helper function to create a valid task from raw data
const createValidTask = (data: any): Task => {
  return {
    id: data.id || '',
    title: data.title || '',
    task_type: data.task_type || 'Assignment',
    due_date: data.due_date || new Date().toISOString(),
    weight_score: typeof data.weight_score === 'number' ? data.weight_score : 0,
    predicted_hours: typeof data.predicted_hours === 'number' ? data.predicted_hours : 0,
    priority_score: typeof data.priority_score === 'number' ? data.priority_score : 5,
    status: ensureValidStatus(data.status),
    grade_percentage: typeof data.grade_percentage === 'number' ? data.grade_percentage : 0,
    course_code: data.course_code || 'N/A',
    course_id: data.course_id || '',
    user_id: data.user_id || 'guest',
    difficulty_level: typeof data.difficulty_level === 'number' ? data.difficulty_level : 3,
    priority_rating: typeof data.priority_rating === 'number' ? data.priority_rating : 3,
  };
};

/**
 * Fetch tasks from API or localStorage depending on authentication status
 */
export const fetchAllTasks = async (): Promise<TasksResponse> => {
  const accessToken = localStorage.getItem('access_token');
  
  if (accessToken) {
    // Logged-in user: fetch from API
    const response = await fetch(`${API_BASE_URL}/api/tasks/?skip=0&limit=1000`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch tasks from server');
    }
    
    return await response.json();
  } else {
    // Guest user: fetch from localStorage
    const tasks: Task[] = [];
    
    // Get all task keys from localStorage
    const taskKeys = Object.keys(localStorage).filter(key => key.startsWith('task_'));
    
    for (const taskKey of taskKeys) {
      try {
        const taskData = localStorage.getItem(taskKey);
        if (taskData) {
          const task = JSON.parse(taskData);
          // Only include guest tasks
          if (task.user_id === 'guest') {
            const validTask = createValidTask(task);
            
            // Add course_code if missing (for backward compatibility)
            if (!validTask.course_code || validTask.course_code === 'N/A') {
              const courseData = localStorage.getItem(`course_${validTask.course_id}`);
              if (courseData) {
                try {
                  const course = JSON.parse(courseData);
                  validTask.course_code = course.code || 'N/A';
                } catch (e) {
                  console.error('Error parsing course data:', e);
                }
              }
            }
            
            tasks.push(validTask);
          }
        }
      } catch (error) {
        console.error(`Error parsing task ${taskKey}:`, error);
      }
    }
    
    // Sort tasks by due date and priority
    tasks.sort((a, b) => {
      // First sort by status (pending first)
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      // Then by due date (soonest first)
      const dateA = new Date(a.due_date).getTime();
      const dateB = new Date(b.due_date).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      // Finally by priority score (highest first)
      return (b.priority_score || 0) - (a.priority_score || 0);
    });
    
    return {
      tasks,
      total: tasks.length
    };
  }
};

/**
 * Add a new task (to API or localStorage)
 */
export const addTask = async (taskData: Partial<Task>): Promise<Task> => {
  const accessToken = localStorage.getItem('access_token');
  
  if (accessToken) {
    // Logged-in user: save to API
    const response = await fetch(`${API_BASE_URL}/api/tasks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create task');
    }
    
    return await response.json();
  } else {
    // Guest user: save to localStorage
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      course_id: taskData.course_id || 'default',
      user_id: 'guest',
      title: taskData.title || '',
      description: taskData.description || '',
      task_type: taskData.task_type || 'Assignment',
      due_date: taskData.due_date || new Date().toISOString(),
      weight_score: taskData.weight_score || 0.5,
      predicted_hours: taskData.predicted_hours || 4.0,
      priority_score: taskData.priority_score || 0.5,
      status: taskData.status || 'pending',
      grade_percentage: taskData.grade_percentage || 0,
      created_at: new Date().toISOString(),
      course_code: 'N/A',
      ...taskData
    };
    
    // Try to get course code from course data
    if (newTask.course_id && newTask.course_id !== 'default') {
      const courseData = localStorage.getItem(`course_${newTask.course_id}`);
      if (courseData) {
        const course = JSON.parse(courseData);
        newTask.course_code = course.code || 'N/A';
      }
    }
    
    // Save to localStorage
    localStorage.setItem(`task_${newTask.id}`, JSON.stringify(newTask));
    
    // Update course tasks list if course exists
    if (newTask.course_id) {
      const courseTasksKey = `course_${newTask.course_id}_tasks`;
      const existingTaskIds = JSON.parse(localStorage.getItem(courseTasksKey) || '[]');
      existingTaskIds.push(newTask.id);
      localStorage.setItem(courseTasksKey, JSON.stringify(existingTaskIds));
    }
    
    return newTask;
  }
};

/**
 * Update a task's status (in API or localStorage)
 */
export const updateTaskStatus = async (taskId: string, status: string): Promise<void> => {
  const accessToken = localStorage.getItem('access_token');
  
  if (accessToken) {
    // Logged-in user: update via API
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update task');
    }
  } else {
    // Guest user: update in localStorage
    const taskKey = `task_${taskId}`;
    const taskData = localStorage.getItem(taskKey);
    
    if (!taskData) {
      throw new Error('Task not found');
    }
    
    const task = JSON.parse(taskData);
    task.status = status;
    localStorage.setItem(taskKey, JSON.stringify(task));
  }
};

/**
 * Delete a task (from API or localStorage)
 */
export const deleteTask = async (taskId: string): Promise<void> => {
  const accessToken = localStorage.getItem('access_token');
  
  if (accessToken) {
    // Logged-in user: delete via API
    const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete task');
    }
  } else {
    // Guest user: delete from localStorage
    const taskKey = `task_${taskId}`;
    const taskData = localStorage.getItem(taskKey);
    
    if (taskData) {
      const task = JSON.parse(taskData);
      
      // Remove from course tasks list
      if (task.course_id) {
        const courseTasksKey = `course_${task.course_id}_tasks`;
        const taskIds = JSON.parse(localStorage.getItem(courseTasksKey) || '[]');
        const updatedTaskIds = taskIds.filter((id: string) => id !== taskId);
        localStorage.setItem(courseTasksKey, JSON.stringify(updatedTaskIds));
      }
      
      // Remove task
      localStorage.removeItem(taskKey);
    }
  }
};
