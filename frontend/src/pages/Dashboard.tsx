import React, { useCallback, useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  TaskAlt as CompletedIcon,
  HourglassEmpty as PendingIcon,
  AccessTime as DueSoonIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';

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

const Dashboard: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [statsSnapshot, setStatsSnapshot] = useState(() => computeStats(getLocalTasks()));

  const refreshStats = useCallback(async () => {
    const token = localStorage.getItem('access_token');

    if (token) {
      const supabaseTasks = await fetchSupabaseTasks();
      if (supabaseTasks && supabaseTasks.length > 0) {
        setStatsSnapshot(computeStats(supabaseTasks));
        return;
      }
    }

    setStatsSnapshot(computeStats(getLocalTasks()));
  }, []);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setUploading(true);
    setUploadMessage(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== 'application/pdf') {
          setUploadMessage({ type: 'error', text: 'Only PDF files are supported' });
          setUploading(false);
          return;
        }

        // Step 1: Preview the file to extract course name
        const previewFormData = new FormData();
        previewFormData.append('file', file);
        previewFormData.append('course_name', file.name.replace('.pdf', ''));

        const previewResponse = await fetch(`${API_BASE_URL}/api/upload/preview`, {
          method: 'POST',
          body: previewFormData,
        });

        if (!previewResponse.ok) {
          throw new Error('Failed to preview file');
        }

        await previewResponse.json();

        // Extract course name from file name or use default
        const courseName = file.name.replace('.pdf', '').replace(/_/g, ' ');

        // Step 2: Create course with extracted name
        let courseId: string | null = localStorage.getItem(`course_${courseName}`);
        if (!courseId) {
          try {
            // Include authorization header if user is logged in
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
              if (courseId) {
                localStorage.setItem(`course_${courseName}`, courseId);
              }
            } else {
              throw new Error('Failed to create course');
            }
          } catch (err) {
            console.error('Error creating course:', err);
            throw new Error('Failed to create course for upload');
          }
        }

        // Step 3: Upload syllabus with course_id to extract and save tasks
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        if (courseId) {
          uploadFormData.append('course_id', courseId);
        }

        // Include authorization header if user is logged in
        const headers: HeadersInit = {};
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const uploadResponse = await fetch(`${API_BASE_URL}/api/upload/syllabus`, {
          method: 'POST',
          headers,
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.detail || 'Upload failed');
        }

        const uploadData = await uploadResponse.json();

        // Store course and tasks in localStorage for guest mode
        if (courseId && uploadData.tasks) {
          // Store course
          const courseData = {
            id: courseId,
            name: courseName,
            code: courseName.substring(0, 10).toUpperCase(),
            description: `Course from ${file.name}`,
            user_id: 'guest',
            created_at: new Date().toISOString(),
          };
          localStorage.setItem(`course_${courseId}`, JSON.stringify(courseData));

          // Store tasks
          uploadData.tasks.forEach((task: any) => {
            localStorage.setItem(`task_${task.id}`, JSON.stringify(task));
          });

          // Store course tasks list
          const courseTaskIds = uploadData.tasks.map((t: any) => t.id);
          localStorage.setItem(`course_${courseId}_tasks`, JSON.stringify(courseTaskIds));
        }

        setUploadedFiles((prev) => [...prev, file.name]);
      }

      setUploadMessage({ type: 'success', text: 'Files uploaded successfully and tasks extracted!' });
      await refreshStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload files';
      setUploadMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploading(false);
    }
  };

  const stats = [
    { label: 'Completed', value: statsSnapshot.completed, icon: CompletedIcon, color: '#388e3c' },
    { label: 'Pending', value: statsSnapshot.pending, icon: PendingIcon, color: '#f57c00' },
    { label: 'Due Soon', value: statsSnapshot.dueSoon, icon: DueSoonIcon, color: '#d32f2f' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 6 }} className="animate-fade-in">
        <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
          Welcome Back
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ fontSize: '1.1rem' }}>
          Here's what's happening with your academic schedule.
        </Typography>
      </Box>

      {/* Stats Grid */}
      <Box className="bento-grid animate-fade-in delay-100" sx={{ mb: 6, padding: 0 }}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Paper
              key={index}
              className="bento-card"
              sx={{
                gridColumn: { xs: 'span 12', sm: 'span 4' },
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '160px'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{
                  p: 1,
                  borderRadius: '12px',
                  bgcolor: `${stat.color}15`,
                  color: stat.color,
                  mr: 2
                }}>
                  <Icon sx={{ fontSize: 24 }} />
                </Box>
                <Typography color="textSecondary" variant="body2" fontWeight={500}>
                  {stat.label}
                </Typography>
              </Box>
              <Typography variant="h3" sx={{ fontWeight: 600, color: 'text.primary' }}>
                {stat.value}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* Upload Section */}
      <Paper
        className="bento-card animate-fade-in delay-200"
        sx={{
          p: 6,
          mb: 6,
          textAlign: 'center',
          border: '2px dashed #e0e0e0',
          bgcolor: 'transparent',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'rgba(0,0,0,0.02)'
          }
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 48, mb: 2, color: 'text.secondary' }} />
        <Typography variant="h4" sx={{ mb: 2 }}>
          Upload Syllabus
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, maxWidth: '500px', mx: 'auto' }}>
          Drop your PDF syllabus here to automatically extract deadlines and create your study plan.
        </Typography>
        <Button
          variant="contained"
          component="label"
          size="large"
          disabled={uploading}
          sx={{ minWidth: '200px' }}
        >
          {uploading ? <CircularProgress size={24} color="inherit" /> : 'Select PDF'}
          <input
            type="file"
            multiple
            accept=".pdf"
            hidden
            onChange={handleFileUpload}
            disabled={uploading}
          />
        </Button>
      </Paper>

      {/* Upload Message */}
      {uploadMessage && (
        <Alert severity={uploadMessage.type} sx={{ mb: 4, borderRadius: '16px' }}>
          {uploadMessage.text}
        </Alert>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Box className="animate-fade-in delay-300">
          <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
            Recent Uploads
          </Typography>
          <Grid container spacing={3}>
            {uploadedFiles.map((file, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Paper className="bento-card" sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    {file}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={100}
                    sx={{
                      mb: 2,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        bgcolor: 'success.main'
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="textSecondary">
                      Processed
                    </Typography>
                    <Button size="small" color="primary">
                      View
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

    </Container>
  );
};

export default Dashboard;