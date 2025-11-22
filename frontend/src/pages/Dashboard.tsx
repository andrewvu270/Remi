import React, { useCallback, useEffect, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

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

        const previewResponse = await fetch('http://localhost:8000/api/upload/preview', {
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
            
            const courseResponse = await fetch('http://localhost:8000/api/courses/', {
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

        const uploadResponse = await fetch('http://localhost:8000/api/upload/syllabus', {
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
    { label: 'Completed', value: statsSnapshot.completed, icon: CheckCircleIcon, color: '#388e3c' },
    { label: 'Pending', value: statsSnapshot.pending, icon: WarningIcon, color: '#f57c00' },
    { label: 'Due Soon', value: statsSnapshot.dueSoon, icon: ErrorIcon, color: '#d32f2f' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          Welcome to Academic Scheduler
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage your courses, track deadlines, and optimize your study schedule
        </Typography>
      </Box>

      {/* Upload Section */}
      <Paper
        sx={{
          p: 4,
          mb: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: 2,
          textAlign: 'center',
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 48, mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          Upload Your Syllabus
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, opacity: 0.9 }}>
          Upload PDF syllabi to automatically extract deadlines and course information
        </Typography>
        <Button
          variant="contained"
          component="label"
          sx={{
            backgroundColor: 'white',
            color: '#667eea',
            fontWeight: 'bold',
            '&:hover': { backgroundColor: '#f5f5f5' },
          }}
          disabled={uploading}
        >
          {uploading ? <CircularProgress size={24} /> : 'Choose PDF Files'}
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
        <Alert severity={uploadMessage.type} sx={{ mb: 3 }}>
          {uploadMessage.text}
        </Alert>
      )}

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Icon sx={{ fontSize: 32, color: stat.color, mr: 1 }} />
                    <Typography color="textSecondary" variant="body2">
                      {stat.label}
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: stat.color }}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Uploaded Syllabi ({uploadedFiles.length})
          </Typography>
          <Grid container spacing={2}>
            {uploadedFiles.map((file, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {file}
                    </Typography>
                    <LinearProgress variant="determinate" value={100} sx={{ mb: 1 }} />
                    <Typography variant="caption" color="textSecondary">
                      Processing complete
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="primary">
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

    </Container>
  );
};

export default Dashboard;