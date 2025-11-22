import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { fetchAllTasks } from '../utils/taskStorage';
import { enhanceTasksWithPredictions } from '../utils/predictionService';
import { Task } from '../types/task';
import StudyPlanGenerator from '../components/StudyPlanGenerator';

// Using the Task type from types/task.ts


const Tasks: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openStudyPlan, setOpenStudyPlan] = useState(false);
  const [sortBy, setSortBy] = useState<'deadline' | 'priority'>('deadline');
  const [filterBy, setFilterBy] = useState<'all' | 'pending' | 'completed'>('all');
  const [newTask, setNewTask] = useState({
    title: '',
    task_type: 'Assignment',
    due_date: '',
    grade_percentage: 0,
    course_id: 'default-course',
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchAllTasks();
      
      // Enhance tasks with predictions
      try {
        const enhancedTasks = await enhanceTasksWithPredictions(data.tasks);
        setTasks(enhancedTasks);
      } catch (predictionError) {
        console.error('Error getting predictions:', predictionError);
        // Fall back to original tasks if prediction fails
        setTasks(data.tasks);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask),
      });
      if (!response.ok) throw new Error('Failed to create task');
      setNewTask({
        title: '',
        task_type: 'Assignment',
        due_date: '',
        grade_percentage: 0,
        course_id: 'default-course',
      });
      setOpenDialog(false);
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/complete`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to complete task');
      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    }
  };

  const getTaskTypeColor = (type: string) => {
    const colors: { [key: string]: 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' } = {
      Assignment: 'primary',
      Exam: 'error',
      Quiz: 'warning',
      Project: 'secondary',
      Reading: 'info',
      Lab: 'success',
    };
    return colors[type] || 'default';
  };

  const getHoursRemaining = (dueDate: string): string => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays}d`;
  };

  const getFilteredAndSortedTasks = (): Task[] => {
    let filtered = tasks.filter((task) => {
      if (filterBy === 'pending') return task.status === 'pending';
      if (filterBy === 'completed') return task.status === 'completed';
      return true; // 'all'
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'deadline') {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      } else {
        // Use the model's priority score if available, otherwise fall back to a simple calculation
        if (a.priority_score !== undefined && b.priority_score !== undefined) {
          // Sort by model's priority score (higher = more important)
          return b.priority_score - a.priority_score;
        }
        
        // Fallback to simple priority calculation if model score is not available
        const now = new Date();
        const daysUntilA = Math.max(0, (new Date(a.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilB = Math.max(0, (new Date(b.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Simple fallback: 70% urgency, 30% grade importance
        const scoreA = (10 / (1 + daysUntilA) * 0.7) + (a.grade_percentage * 0.03);
        const scoreB = (10 / (1 + daysUntilB) * 0.7) + (b.grade_percentage * 0.03);
        
        return scoreB - scoreA; // Higher score first
      }
    });
  };

  if (loading) {
    return (
      <Container 
        maxWidth="lg" 
        sx={{ 
          mt: { xs: 2, md: 4 }, 
          mb: { xs: 2, md: 4 },
          px: { xs: 1, sm: 2, md: 3 }
        }}
      >
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </Container>
    );
  }

  return (
    <Container 
      maxWidth="lg" 
      sx={{ 
        mt: { xs: 2, md: 4 }, 
        mb: { xs: 2, md: 4 },
        px: { xs: 1, sm: 2, md: 3 }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        mb: { xs: 2, md: 4 },
        gap: { xs: 2, sm: 0 }
      }}>
        <Typography 
          variant="h3" 
          component="h1" 
          sx={{ 
            fontWeight: 'bold',
            fontSize: { xs: '1.75rem', sm: '2.125rem', md: '2.5rem' }
          }}
        >
          Tasks
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          width: { xs: '100%', sm: 'auto' }
        }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            fullWidth={isMobile}
            sx={{ minHeight: '44px' }}
          >
            Add Task
          </Button>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={() => setOpenStudyPlan(true)}
            disabled={tasks.length === 0}
            fullWidth={isMobile}
            sx={{ minHeight: '44px' }}
          >
            Generate Study Plan
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filter and Sort Controls */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2, 
        mb: 3, 
        alignItems: { xs: 'stretch', sm: 'center' }
      }}>
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', sm: 'flex-start' }
        }}>
          <Button
            variant={filterBy === 'pending' ? 'contained' : 'outlined'}
            onClick={() => setFilterBy('pending')}
            size={isMobile ? 'medium' : 'small'}
            sx={{ minHeight: '36px', flex: { xs: 1, sm: 'none' } }}
          >
            Pending
          </Button>
          <Button
            variant={filterBy === 'completed' ? 'contained' : 'outlined'}
            onClick={() => setFilterBy('completed')}
            size={isMobile ? 'medium' : 'small'}
            sx={{ minHeight: '36px', flex: { xs: 1, sm: 'none' } }}
          >
            Completed
          </Button>
          <Button
            variant={filterBy === 'all' ? 'contained' : 'outlined'}
            onClick={() => setFilterBy('all')}
            size={isMobile ? 'medium' : 'small'}
            sx={{ minHeight: '36px', flex: { xs: 1, sm: 'none' } }}
          >
            All
          </Button>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', sm: 'flex-start' }
        }}>
          <Button
            variant={sortBy === 'deadline' ? 'contained' : 'outlined'}
            onClick={() => setSortBy('deadline')}
            size={isMobile ? 'medium' : 'small'}
            sx={{ minHeight: '36px', flex: { xs: 1, sm: 'none' } }}
          >
            {isMobile ? 'Deadline' : 'Sort: Deadline'}
          </Button>
          <Button
            variant={sortBy === 'priority' ? 'contained' : 'outlined'}
            onClick={() => setSortBy('priority')}
            size={isMobile ? 'medium' : 'small'}
            sx={{ minHeight: '36px', flex: { xs: 1, sm: 'none' } }}
          >
            {isMobile ? 'Priority' : 'Sort: Priority'}
          </Button>
        </Box>
      </Box>

      {tasks.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            No tasks yet. Add one to get started!
          </Typography>
        </Paper>
      ) : isMobile ? (
        // Mobile Card View
        <Grid container spacing={2}>
          {getFilteredAndSortedTasks().map((task) => (
            <Grid item xs={12} key={task.id}>
              <Card 
                sx={{ 
                  backgroundColor: task.status === 'completed' ? '#f5f5f5' : 'inherit',
                  opacity: task.status === 'completed' ? 0.7 : 1,
                  border: task.status === 'overdue' ? '2px solid #d32f2f' : 'none'
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontWeight: 'bold',
                        color: task.status === 'completed' ? '#999' : 'inherit',
                        fontSize: '1.1rem'
                      }}
                    >
                      {task.title}
                    </Typography>
                    <Chip
                      label={task.status}
                      color={task.status === 'completed' ? 'success' : 'default'}
                      size="small"
                      onClick={() => handleCompleteTask(task.id)}
                      clickable
                      icon={task.status === 'completed' ? <CheckCircleIcon /> : undefined}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    <Chip 
                      label={task.task_type} 
                      color={getTaskTypeColor(task.task_type)} 
                      size="small" 
                    />
                    <Chip 
                      label={task.course_code} 
                      variant="outlined" 
                      size="small" 
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Due Date
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {new Date(task.due_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Time Left
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: getHoursRemaining(task.due_date) === 'Overdue' ? '#d32f2f' : 'inherit'
                        }}
                      >
                        {getHoursRemaining(task.due_date)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Est. Hours
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: task.predicted_hours > 8 
                            ? '#d32f2f' 
                            : task.predicted_hours > 4 
                              ? '#ed6c02' 
                              : '#2e7d32'
                        }}
                      >
                        {task.predicted_hours?.toFixed(1)}h
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Grade %
                      </Typography>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: task.grade_percentage >= 20 ? '#d32f2f' : 'inherit'
                        }}
                      >
                        {task.grade_percentage}%
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        // Desktop Table View
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Course</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Due Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Time Left</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Est. Hours</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Grade %</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredAndSortedTasks().map((task) => (
                <TableRow
                  key={task.id}
                  hover
                  sx={{
                    backgroundColor: task.status === 'completed' ? '#f5f5f5' : 'inherit',
                    opacity: task.status === 'completed' ? 0.6 : 1,
                  }}
                >
                  <TableCell sx={{ color: task.status === 'completed' ? '#999' : 'inherit' }}>
                    {task.title}
                  </TableCell>
                  <TableCell sx={{ color: task.status === 'completed' ? '#999' : 'inherit' }}>
                    {task.course_code}
                  </TableCell>
                  <TableCell>
                    <Chip label={task.task_type} color={getTaskTypeColor(task.task_type)} size="small" />
                  </TableCell>
                  <TableCell sx={{ color: task.status === 'completed' ? '#999' : 'inherit' }}>
                    {new Date(task.due_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: task.status === 'completed' ? '#999' : getHoursRemaining(task.due_date) === 'Overdue' ? '#d32f2f' : 'inherit' }}>
                    {getHoursRemaining(task.due_date)}
                  </TableCell>
                  <TableCell sx={{ 
                    fontWeight: 'bold', 
                    color: task.status === 'completed' 
                      ? '#999' 
                      : task.predicted_hours > 8 
                        ? '#d32f2f' 
                        : task.predicted_hours > 4 
                          ? '#ed6c02' 
                          : '#2e7d32'
                  }}>
                    {task.predicted_hours?.toFixed(1)}h
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: task.status === 'completed' ? '#999' : task.grade_percentage >= 20 ? '#d32f2f' : 'inherit' }}>
                    {task.grade_percentage}%
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={task.status}
                      color={task.status === 'completed' ? 'success' : 'default'}
                      size="small"
                      onClick={() => handleCompleteTask(task.id)}
                      clickable
                      icon={task.status === 'completed' ? <CheckCircleIcon /> : undefined}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            Add New Task
          </Typography>
          <TextField
            fullWidth
            label="Task Title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            select
            label="Task Type"
            value={newTask.task_type}
            onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value })}
            sx={{ mb: 2 }}
          >
            <MenuItem value="Assignment">Assignment</MenuItem>
            <MenuItem value="Exam">Exam</MenuItem>
            <MenuItem value="Quiz">Quiz</MenuItem>
            <MenuItem value="Project">Project</MenuItem>
            <MenuItem value="Reading">Reading</MenuItem>
            <MenuItem value="Lab">Lab</MenuItem>
          </TextField>
          <TextField
            fullWidth
            type="date"
            label="Due Date"
            value={newTask.due_date}
            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Grade Percentage"
            value={newTask.grade_percentage}
            onChange={(e) => setNewTask({ ...newTask, grade_percentage: parseFloat(e.target.value) })}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleAddTask}>
              Add Task
            </Button>
          </Box>
        </Box>
      </Dialog>
      
      <StudyPlanGenerator 
        open={openStudyPlan}
        onClose={() => setOpenStudyPlan(false)}
        tasks={tasks}
      />
    </Container>
  );
};

export default Tasks;
