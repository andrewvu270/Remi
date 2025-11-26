import { API_BASE_URL } from '../config/api';
import { Task } from '../types/task';

interface PredictionResponse {
  predicted_hours: number;
  priority_score: number;  // Model's calculated priority (0-10)
  confidence?: number;
}

export const getTaskPrediction = async (task: Task): Promise<{predicted_hours: number, priority_score: number}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ml/predict-workload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task_type: task.task_type,
        grade_percentage: task.grade_percentage,
        difficulty_level: task.difficulty_level || 3, // Default to medium difficulty
        priority_rating: task.priority_rating || 3,   // Default to medium priority
        due_date: task.due_date,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get prediction');
    }

    const data: PredictionResponse = await response.json();
    return {
      predicted_hours: data.predicted_hours,
      priority_score: data.priority_score
    };
  } catch (error) {
    console.error('Error getting prediction:', error);
    // Fallback to simple estimates if prediction fails
    const defaultEstimates: Record<string, {predicted_hours: number, priority_score: number}> = {
      'Assignment': { predicted_hours: 4, priority_score: 5 },
      'Exam': { predicted_hours: 10, priority_score: 8 },
      'Quiz': { predicted_hours: 2, priority_score: 3 },
      'Project': { predicted_hours: 15, priority_score: 9 },
      'Reading': { predicted_hours: 3, priority_score: 2 },
      'Lab': { predicted_hours: 6, priority_score: 6 },
    };
    return defaultEstimates[task.task_type] || { predicted_hours: 4, priority_score: 5 };
  }
};

export const enhanceTasksWithPredictions = async (tasks: Task[]): Promise<Task[]> => {
  // Only predict for pending tasks to reduce API calls
  const pendingTasks = tasks.filter(task => task.status === 'pending');
  
  // Get predictions for all pending tasks
  const predictions = await Promise.all(
    pendingTasks.map(task => getTaskPrediction(task))
  );

  // Create a map of task IDs to predictions
  const predictionMap = new Map<string, {predicted_hours: number, priority_score: number}>();
  pendingTasks.forEach((task, index) => {
    predictionMap.set(task.id, predictions[index]);
  });

  // Update tasks with predictions and priority scores
  return tasks.map(task => {
    const prediction = predictionMap.get(task.id);
    if (prediction) {
      return {
        ...task,
        predicted_hours: prediction.predicted_hours,
        priority_score: prediction.priority_score,
      };
    }
    return task;
  });
};
