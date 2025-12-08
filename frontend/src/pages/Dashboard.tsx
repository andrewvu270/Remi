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
  CloudUpload as CloudUploadIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
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
  const navigate = useNavigate();
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [statsSnapshot, setStatsSnapshot] = useState(() => computeStats(getLocalTasks()));
  const [activeView, setActiveView] = useState<'overview' | 'analytics'>('overview');
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

      const summary = response.summary || response.message || 'Analysis complete. Ask your Study Buddy for next steps.';
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
        text: 'Files processed. Ask your Study Buddy for next-step planning or scheduling.'
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
      bgGradient: 'linear-gradient(135deg, #4caf50, #66bb6a)',
      filter: 'completed'
    },
    {
      label: 'Pending',
      value: statsSnapshot.pending,
      icon: PendingIcon,
      color: '#f57c00',
      bgGradient: 'linear-gradient(135deg, #ff9800, #ffb74d)',
      filter: 'pending'
    },
    {
      label: 'Due Soon',
      value: statsSnapshot.dueSoon,
      icon: DueSoonIcon,
      color: '#d32f2f',
      bgGradient: 'linear-gradient(135deg, #f44336, #ef5350)',
      filter: 'dueSoon'
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
          Welcome back
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          A streamlined workspace that mirrors the landing-page flow.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {[
            { id: 'overview', label: 'Overview', icon: <DashboardIcon fontSize="small" /> },
            { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon fontSize="small" /> },
          ].map((view) => (
            <Button
              key={view.id}
              variant={activeView === view.id ? 'contained' : 'outlined'}
              onClick={() => setActiveView(view.id as 'overview' | 'analytics')}
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
                    onClick={() => navigate(`/tasks?filter=${stat.filter}`)}
                    sx={{
                      p: 3,
                      borderRadius: '20px',
                      color: '#fff',
                      background: stat.bgGradient,
                      boxShadow: '0 12px 30px rgba(0,0,0,0.12)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 16px 40px rgba(0,0,0,0.2)'
                      }
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
                <Paper
                  sx={{
                    p: 4,
                    borderRadius: '24px',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    bgcolor: '#fff',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box>
                      <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: 'primary.dark' }}>
                        Smart Scheduling
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '90%' }}>
                        Remi analyzes your syllabus and automatically builds a balanced study plan for you.
                      </Typography>
                    </Box>

                  </Box>

                  {previewTasks.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, mt: 2 }}>
                      {previewTasks.map((task, index) => (
                        <Paper
                          key={task.id}
                          elevation={0}
                          sx={{
                            p: 2.5,
                            borderRadius: '16px',
                            bgcolor: index % 2 === 0 ? '#E3F2FD' : '#F8F9FA',
                            borderLeft: index % 2 === 0 ? '6px solid #64B5F6' : '6px solid transparent',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                            '&:hover': {
                              transform: 'translateX(4px)',
                              bgcolor: '#E1F5FE'
                            }
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
                          <Button size="small" variant="text" onClick={() => window.location.assign('/schedule')}>
                            View
                          </Button>
                        </Paper>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: '#F8F9FA',
                      borderRadius: '16px',
                      mt: 2,
                      p: 3
                    }}>
                      <Typography variant="body2" color="text.secondary" align="center">
                        No upcoming tasks detected yet. Upload a syllabus to let Remi generate a plan!
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} md={5}>
                <Paper
                  sx={{
                    p: 4,
                    borderRadius: '24px',
                    height: '100%',
                    bgcolor: '#E1F5FE', // Light blue background
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: 'primary.dark' }}>
                    File Intake
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Drop any syllabus, assignment brief, or reference file. Remi will scan it instantly.
                  </Typography>

                  {/* Dashed Drop Zone */}
                  <Box
                    component="label"
                    sx={{
                      p: 4,
                      border: '2px dashed #64B5F6',
                      borderRadius: '24px',
                      textAlign: 'center',
                      bgcolor: 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: '#fff', borderColor: '#2196F3', transform: 'scale(1.02)' },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '200px'
                    }}
                  >
                    {uploading ? (
                      <CircularProgress size={32} />
                    ) : (
                      <>
                        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
                        <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                          Drop Syllabus Here
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          or click to browse
                        </Typography>
                      </>
                    )}
                    <input
                      type="file"
                      multiple
                      accept="*/*"
                      hidden
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </Box>

                  {analysisError && (
                    <Alert severity="error" sx={{ mt: 2, borderRadius: '12px' }}>
                      {analysisError}
                    </Alert>
                  )}

                  {analysisInsight && !analysisError && (
                    <Paper sx={{ mt: 3, p: 2, borderRadius: '16px', bgcolor: 'rgba(255,255,255,0.8)' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Latest insight ({analysisInsight.fileName})
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                        "{analysisInsight.summary}"
                      </Typography>
                    </Paper>
                  )}
                </Paper>
              </Grid>
            </Grid>

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
  );
};

export default Dashboard;