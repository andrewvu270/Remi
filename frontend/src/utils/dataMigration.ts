/**
 * Data Migration Utilities
 * Handles migration of guest data from localStorage to Supabase when user logs in
 */

import { API_BASE_URL } from "../config/api";

interface LocalCourse {
  id: string;
  name: string;
  code: string;
  description: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
}

interface LocalTask {
  id: string;
  course_id: string;
  user_id: string;
  title: string;
  description: string;
  task_type: string;
  due_date: string;
  weight_score: number;
  predicted_hours: number;
  priority_score: number;
  status: string;
  grade_percentage: number;
  created_at: string;
}

export const migrateLocalDataToSupabase = async (accessToken: string, userId: string) => {
  console.log('[MIGRATION] Starting migration of local data to Supabase');
  
  const migrationResults = {
    courses: { success: 0, failed: 0 },
    tasks: { success: 0, failed: 0 },
    errors: [] as string[]
  };

  try {
    // Step 1: Find all courses in localStorage
    const courseKeys = Object.keys(localStorage).filter(key => key.startsWith('course_') && !key.includes('_tasks'));
    console.log(`[MIGRATION] Found ${courseKeys.length} courses in localStorage`);

    for (const courseKey of courseKeys) {
      try {
        const courseData = localStorage.getItem(courseKey);
        if (!courseData) continue;

        const course: LocalCourse = JSON.parse(courseData);
        
        // Skip if not a guest course
        if (course.user_id !== 'guest') continue;

        // Save course to Supabase (backend will assign the authenticated user ID)
        const courseResponse = await fetch(`${API_BASE_URL}/api/courses/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            id: course.id, // Keep the same ID
            name: course.name,
            code: course.code,
            description: course.description
          })
        });

        if (courseResponse.ok) {
          migrationResults.courses.success++;
          console.log(`[MIGRATION] Successfully migrated course: ${course.name}`);

          // Step 2: Migrate tasks for this course
          const tasksKey = `course_${course.id}_tasks`;
          const taskIdsData = localStorage.getItem(tasksKey);
          
          if (taskIdsData) {
            const taskIds: string[] = JSON.parse(taskIdsData);
            console.log(`[MIGRATION] Found ${taskIds.length} tasks for course ${course.name}`);

            for (const taskId of taskIds) {
              try {
                const taskData = localStorage.getItem(`task_${taskId}`);
                if (!taskData) continue;

                const task: LocalTask = JSON.parse(taskData);
                
                // Update task with authenticated user ID
                const updatedTask = {
                  ...task,
                  user_id: userId
                };

                // Save task to Supabase
                const taskResponse = await fetch(`${API_BASE_URL}/api/tasks/`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                  },
                  body: JSON.stringify(updatedTask)
                });

                if (taskResponse.ok) {
                  migrationResults.tasks.success++;
                  console.log(`[MIGRATION] Successfully migrated task: ${task.title}`);
                } else {
                  migrationResults.tasks.failed++;
                  const error = await taskResponse.text();
                  migrationResults.errors.push(`Task ${task.title}: ${error}`);
                  console.error(`[MIGRATION] Failed to migrate task: ${task.title}`, error);
                }
              } catch (taskError) {
                migrationResults.tasks.failed++;
                console.error(`[MIGRATION] Error migrating task ${taskId}:`, taskError);
              }
            }
          }
        } else {
          migrationResults.courses.failed++;
          const error = await courseResponse.text();
          migrationResults.errors.push(`Course ${course.name}: ${error}`);
          console.error(`[MIGRATION] Failed to migrate course: ${course.name}`, error);
        }
      } catch (courseError) {
        migrationResults.courses.failed++;
        console.error(`[MIGRATION] Error migrating course ${courseKey}:`, courseError);
      }
    }

    // Step 3: Clean up localStorage after successful migration
    if (migrationResults.courses.success > 0 || migrationResults.tasks.success > 0) {
      console.log('[MIGRATION] Cleaning up localStorage...');
      
      // Remove migrated courses and tasks
      for (const courseKey of courseKeys) {
        const courseData = localStorage.getItem(courseKey);
        if (courseData) {
          const course: LocalCourse = JSON.parse(courseData);
          if (course.user_id === 'guest') {
            // Remove course
            localStorage.removeItem(courseKey);
            
            // Remove course tasks list
            localStorage.removeItem(`course_${course.id}_tasks`);
            
            // Remove individual tasks
            const tasksKey = `course_${course.id}_tasks`;
            const taskIdsData = localStorage.getItem(tasksKey);
            if (taskIdsData) {
              const taskIds: string[] = JSON.parse(taskIdsData);
              taskIds.forEach(taskId => {
                localStorage.removeItem(`task_${taskId}`);
              });
            }
          }
        }
      }
      
      // Remove guest session ID
      localStorage.removeItem('guest_session_id');
    }

    console.log('[MIGRATION] Migration completed:', migrationResults);
    return migrationResults;

  } catch (error) {
    console.error('[MIGRATION] Fatal error during migration:', error);
    migrationResults.errors.push(`Fatal error: ${error}`);
    return migrationResults;
  }
};

export const hasLocalGuestData = (): boolean => {
  // Check if there's any guest data in localStorage
  const courseKeys = Object.keys(localStorage).filter(key => key.startsWith('course_') && !key.includes('_tasks'));
  
  for (const courseKey of courseKeys) {
    const courseData = localStorage.getItem(courseKey);
    if (courseData) {
      try {
        const course: LocalCourse = JSON.parse(courseData);
        if (course.user_id === 'guest') {
          return true;
        }
      } catch {
        // Invalid JSON, skip
      }
    }
  }
  
  return false;
};
