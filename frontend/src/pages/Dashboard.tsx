import React, { useCallback, useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Fab
} from '@mui/material';

import {
  TaskAlt as CompletedIcon,
  HourglassEmpty as PendingIcon,
  AccessTime as DueSoonIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config/api';
import NaturalLanguageQuery from '../components/NaturalLanguageQuery';
import PomodoroTimer from '../components/PomodoroTimer';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { agentService } from '../utils/agentService';

interface StoredTask {
  id: string;
  title: string;
  due_date?: string;
  status?: string;
}

const getLocalTasks = (): StoredTask[] => {
  const tasks: StoredTask[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('task_')) {
      try {
        const task = JSON.parse(localStorage.getItem(key) || '{}');
        // Only include guest tasks (same logic as fetchAllTasks)
        if (task && task.id && task.user_id === 'guest') {
          tasks.push(task);
        }
      } catch (e) {
        // Ignore malformed task entries
      }
    }
  }
  return tasks;
};

const getUpcomingTasks = (tasks: StoredTask[]) => {
  return tasks
    .filter((task) => task.due_date)
    .map((task) => ({
      ...task,
      due_date: task.due_date || '',
    }))
    .filter((task) => {
      const due = new Date(task.due_date);
      return !Number.isNaN(due.getTime());
    })
    .sort((a, b) => {
      const dateA = new Date(a.due_date || '').getTime();
      const dateB = new Date(b.due_date || '').getTime();
      return dateA - dateB;
    })
    .slice(0, 3);
};

const computeStats = (tasks: StoredTask[]) => {
  const now = new Date();

  const dueSoonThreshold = new Date(now);
  dueSoonThreshold.setDate(now.getDate() + 7);

  let completed = 0;
  let pending = 0;
  let dueSoon = 0;

  tasks.forEach((task) => {
    const status = (task.status || '').toLowerCase();
    if (status === 'completed') {
      completed += 1;
    } else {
      pending += 1;
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (!Number.isNaN(dueDate.getTime()) && dueDate >= now && dueDate <= dueSoonThreshold) {
          dueSoon += 1;
        }
      }
    }
  });

  return {
    completed,
    pending,
    dueSoon,
  };
};

const fetchSupabaseTasks = async (): Promise<StoredTask[] | null> => {
  try {
    // Use the same fetchAllTasks function as the Tasks page for consistency
    const { fetchAllTasks } = await import('../utils/taskStorage');
    const data = await fetchAllTasks();

    return (data.tasks || []).map((task: any) => ({
      id: task.id,
      title: task.title,
      due_date: task.due_date,
      status: task.status,
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return null;
  }
};

const Dashboard = () => {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [statsSnapshot, setStatsSnapshot] = useState(() => computeStats(getLocalTasks()));
  const [activeView, setActiveView] = useState<'overview' | 'analytics' | 'focus'>('overview');
  const [showFab, setShowFab] = useState(false);
  const [previewTasks, setPreviewTasks] = useState<StoredTask[]>(getUpcomingTasks(getLocalTasks()));
  const [analysisInsight, setAnalysisInsight] = useState<{
    fileName: string;
    summary: string;
    nextStep?: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const refreshStats = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    let taskSource: StoredTask[] = [];

    if (token) {
      const supabaseTasks = await fetchSupabaseTasks();
      if (supabaseTasks && supabaseTasks.length > 0) {
        taskSource = supabaseTasks;
      }
    }

    if (taskSource.length === 0) {
      taskSource = getLocalTasks();
    }

    setStatsSnapshot(computeStats(taskSource));
    setPreviewTasks(getUpcomingTasks(taskSource));
  }, []);

  useEffect(() => {
    refreshStats();
    // Show FAB after a delay
    setTimeout(() => setShowFab(true), 1000);
  }, [refreshStats]);

  const readFileContent = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);

      if (file.type.startsWith('text') || file.type.includes('json') || file.type === '') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const analyzeFileWithAgent = async (file: File) => {
    try {
      const fileContent = await readFileContent(file);
      const userId = localStorage.getItem('access_token') ? 'registered' : 'guest';
      const response = await agentService.fullPipeline({
        text: fileContent,
        source_type: file.type || file.name.split('.').pop() || 'unknown',
        schedule_days: 7,
        user_id: userId,
      });

      const summary = response.summary || response.message || 'Analysis complete. Ask the AI assistant for next steps.';
      const nextStep = response.next_action || response.recommended_action || response.status;

      setAnalysisInsight({
        fileName: file.name,
        summary,
        nextStep,
      });
      setAnalysisError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze file';
      setAnalysisError(message);
      throw error;
    }
  };

  const processPdfUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('course_id', file.name.replace('.pdf', ''));

    const uploadResponse = await fetch(`${API_BASE_URL}/api/upload/syllabus`, {
      method: 'POST',
      headers: {
        'Authorization': localStorage.getItem('access_token') ?
          `Bearer ${localStorage.getItem('access_token')}` : '',
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.detail || 'Failed to extract text from PDF');
    }

    const uploadData = await uploadResponse.json();

    if (uploadData.tasks && uploadData.tasks.length > 0) {
      const courseName = file.name.replace('.pdf', '').replace(/_/g, ' ');
      const userId = localStorage.getItem('access_token') ? 'registered' : 'guest';

      let courseId: string | null = null;
      try {
        const courseHeaders: HeadersInit = { 'Content-Type': 'application/json' };
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          courseHeaders['Authorization'] = `Bearer ${accessToken}`;
        }

        const courseResponse = await fetch(`${API_BASE_URL}/api/courses/`, {
          method: 'POST',
          headers: courseHeaders,
          body: JSON.stringify({
            name: courseName,
            code: courseName.substring(0, 10).toUpperCase(),
            description: `Course from ${file.name}`,
          }),
        });

        if (courseResponse.ok) {
          const courseData = await courseResponse.json();
          courseId = courseData.id;
        }
      } catch (err) {
        console.error('Error creating course:', err);
        courseId = `course_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      if (userId === 'guest' && courseId) {
        const courseData = {
          id: courseId,
          name: courseName,
          code: courseName.substring(0, 10).toUpperCase(),
          description: `Course from ${file.name}`,
          user_id: 'guest',
          created_at: new Date().toISOString(),
        };
        localStorage.setItem(`course_${courseId}`, JSON.stringify(courseData));
      }

      uploadData.tasks.forEach((task: any) => {
        const enhancedTask = {
          ...task,
          user_id: userId,
          course_id: courseId,
        };

        if (userId === 'guest') {
          localStorage.setItem(`task_${task.id}`, JSON.stringify(enhancedTask));
        }
      });

      if (userId === 'guest' && courseId) {
        const courseTaskIds = uploadData.tasks.map((t: any) => t.id);
        localStorage.setItem(`course_${courseId}_tasks`, JSON.stringify(courseTaskIds));
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadMessage(null);
    setAnalysisError(null);

    try {
      for (const file of Array.from(files)) {
        if (file.type === 'application/pdf') {
          await processPdfUpload(file);
          await refreshStats();
        }

        await analyzeFileWithAgent(file);
        setUploadedFiles((prev) => [...prev, file.name]);
      }

      setUploadMessage({
        type: 'success',
        text: 'Files processed. Ask the AI assistant for next-step planning or scheduling.'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to handle files';
      setUploadMessage({ type: 'error', text: errorMessage });
      setAnalysisError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const stats = [
    {
      label: 'Completed',
      value: statsSnapshot.completed,
      icon: CompletedIcon,
      color: '#388e3c',
      bgGradient: 'linear-gradient(135deg, #4caf50, #66bb6a)'
    },
    {
      label: 'Pending',
      value: statsSnapshot.pending,
      icon: PendingIcon,
      color: '#f57c00',
      bgGradient: 'linear-gradient(135deg, #ff9800, #ffb74d)'
    },
    {
      label: 'Due Soon',
      value: statsSnapshot.dueSoon,
      icon: DueSoonIcon,
      color: '#d32f2f',
      bgGradient: 'linear-gradient(135deg, #f44336, #ef5350)'
    },
  ];

  return (
    <>
      {/* Floating Action Button for Quick Actions */}
      <AnimatePresence>
        {showFab && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000
            }}
          >
            <Fab
              color="primary"
              aria-label="quick-actions"
              sx={{
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0, #2196f3)',
                }
              }}
            >
              <DashboardIcon />
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 5 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
            Welcome back
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            A streamlined workspace that mirrors the landing-page flow.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {[
              { id: 'overview', label: 'Overview', icon: <DashboardIcon fontSize="small" /> },
              { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon fontSize="small" /> },
              { id: 'focus', label: 'Focus Mode', icon: <TimerIcon fontSize="small" /> },
            ].map((view) => (
              <Button
                key={view.id}
                variant={activeView === view.id ? 'contained' : 'outlined'}
                onClick={() => setActiveView(view.id as 'overview' | 'analytics' | 'focus')}
                startIcon={view.icon}
                sx={{
                  borderRadius: '999px',
                  textTransform: 'none',
                }}
              >
                {view.label}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Animated Stats Grid */}
        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {stats.map((stat) => (
                  <Grid item xs={12} md={4} key={stat.label}>
                    <Paper
                      sx={{
                        p: 3,
                        borderRadius: '20px',
                        color: '#fff',
                        background: stat.bgGradient,
                        boxShadow: '0 12px 30px rgba(0,0,0,0.12)'
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                          {stat.value}
                        </Typography>
                        <stat.icon />
                      </Box>
                      <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                        {stat.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={7}>
                  <Paper sx={{ p: 4, borderRadius: '24px' }}>
                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                      Smart Scheduling
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Upcoming tasks pulled directly from your documents and uploads.
                    </Typography>
                    {previewTasks.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {previewTasks.map((task) => (
                          <Paper
                            key={task.id}
                            variant="outlined"
                            sx={{
                              p: 2.5,
                              borderRadius: '18px',
                              borderColor: 'rgba(0,0,0,0.08)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {task.title}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Due {new Date(task.due_date || '').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </Typography>
                            </Box>
                            <Button size="small" variant="outlined" onClick={() => window.location.assign('/schedule')}>
                              View plan
                            </Button>
                          </Paper>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No upcoming tasks detected yet. Upload a file or add tasks to see your personalized plan.
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Paper
                    sx={{
                      p: 4,
                      borderRadius: '24px',
                      height: '100%',
                      border: '2px dashed rgba(0,0,0,0.08)'
                    }}
                  >
                    <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
                      File Intake
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Drop any syllabus, assignment brief, or reference file. The agent will decide whether to schedule it or offer assistance.
                    </Typography>
                    <Button
                      variant="contained"
                      component="label"
                      disabled={uploading}
                      sx={{
                        minWidth: '180px',
                        mb: 2,
                        background: 'linear-gradient(135deg, #1976d2, #42a5f5)'
                      }}
                    >
                      {uploading ? <CircularProgress size={22} color="inherit" /> : 'Upload files'}
                      <input
                        type="file"
                        multiple
                        accept="*/*"
                        hidden
                        onChange={handleFileUpload}
                        disabled={uploading}
                      />
                    </Button>

                    {analysisError && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {analysisError}

                      </Alert>
                    )}

                    {analysisInsight && !analysisError && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Latest insight ({analysisInsight.fileName})
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {analysisInsight.summary}
                        </Typography>
                        {analysisInsight.nextStep && (
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Suggested next step: {analysisInsight.nextStep}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {uploadedFiles.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                          Recent uploads
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {uploadedFiles.slice(-3).map((file) => (
                            <Paper key={file} variant="outlined" sx={{ p: 1.5, borderRadius: '12px' }}>
                              <Typography variant="caption">{file}</Typography>
                            </Paper>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ mb: 4 }}>
                <NaturalLanguageQuery />
              </Box>

            </motion.div>
          )}

          {activeView === 'analytics' && (
            <motion.div
              key="analytics-content"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <AnalyticsDashboard />
            </motion.div>
          )}

          {activeView === 'focus' && (
            <motion.div
              key="focus-content"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimerIcon color="primary" />
                  Focus Mode
                </Typography>
                <Typography variant="body1" color="textSecondary">
                  Boost your productivity with gamified focus sessions and achievement tracking
                </Typography>
              </Box>
              <PomodoroTimer
                taskTitle="Focus Session"
                learningStyle="visual"
                studyTips={["Take regular breaks", "Stay hydrated", "Minimize distractions"]}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Message */}
        <AnimatePresence>
          {uploadMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Alert severity={uploadMessage.type} sx={{ mb: 4, borderRadius: '16px' }}>
                {uploadMessage.text}
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

      </Container>
    </>
  );
};

export default Dashboard;