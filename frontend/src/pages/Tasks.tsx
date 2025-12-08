import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { agentService } from '../utils/agentService';
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
  Chip,
  Dialog,
  TextField,
  MenuItem,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Grid,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { fetchAllTasks, addTask, updateTaskStatus } from '../utils/taskStorage';
import { Task } from '../types/task';

// Using the Task type from types/task.ts


const Tasks: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams] = useSearchParams();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [sortBy, setSortBy] = useState<'deadline' | 'priority'>('priority');
  const [filterBy, setFilterBy] = useState<'all' | 'pending' | 'completed' | 'dueSoon'>(() => {
    const urlFilter = searchParams.get('filter');
    if (urlFilter === 'completed') return 'completed';
    if (urlFilter === 'pending') return 'pending';
    if (urlFilter === 'dueSoon') return 'dueSoon';
    return 'all';
  });
  const [isPrioritizing, setIsPrioritizing] = useState(false);
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

      // Set tasks directly without agent predictions for now
      setTasks(data.tasks);
      setError(null);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleRePrioritize = async () => {
    const pendingTasks = tasks.filter(task => task.status === 'pending');
    if (pendingTasks.length === 0) return;

    setIsPrioritizing(true);
    try {
      const userId = localStorage.getItem('access_token') ? 'registered' : 'guest';
      const prioritization = await agentService.prioritizeTasks({
        tasks: pendingTasks,
        user_id: userId,
      });

      // Update tasks with new AI priority scores
      const updatedTasks = tasks.map(task => {
        const priorityInfo = prioritization.prioritized_tasks?.find((p: any) => p.task_id === task.id);
        if (priorityInfo) {
          return {
            ...task,
            priority_score: priorityInfo.priority_score,
            ai_insights: priorityInfo.ai_insights,
            reasoning: priorityInfo.reasoning,
          };
        }
        return task;
      });

      setTasks(updatedTasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to re-prioritize tasks');
    } finally {
      setIsPrioritizing(false);
    }
  };

  const handleAddTask = async () => {
    try {
      await addTask(newTask);
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

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await updateTaskStatus(taskId, newStatus);

      // If marking as pending, reset all related session stats
      if (newStatus === 'pending') {
        const storedPlan = localStorage.getItem('studyPlan');
        if (storedPlan) {
          const plan = JSON.parse(storedPlan);
          const updatedSessions = plan.sessions.map((s: any) => {
            // Reset sessions related to this task
            if (s.task_id === taskId) {
              return {
                ...s,
                completed: false,
                completed_at: undefined,
                actual_hours: undefined,
                reflection: undefined,
                pomodoro_count: 0
              };
            }
            return s;
          });
          localStorage.setItem('studyPlan', JSON.stringify({ ...plan, sessions: updatedSessions }));
        }
      }

      fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
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

  const getPriorityLabel = (priorityScore: number): { label: string; color: 'error' | 'warning' | 'info' | 'success' } => {
    // Priority score is 0-1 from backend, convert to 0-10 scale
    const scaledScore = priorityScore * 10;

    if (scaledScore >= 8) return { label: 'Critical', color: 'error' };
    if (scaledScore >= 6) return { label: 'High', color: 'warning' };
    if (scaledScore >= 4) return { label: 'Medium', color: 'info' };
    return { label: 'Low', color: 'success' };
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
      if (filterBy === 'dueSoon') {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        const taskDate = new Date(task.due_date);
        return task.status === 'pending' && taskDate <= threeDaysFromNow;
      }
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
        mb: { xs: 4, md: 6 },
        gap: { xs: 2, sm: 0 }
      }} className="animate-fade-in">
        <Box>
          <Typography
            variant="h2"
            component="h1"
            sx={{ mb: 1 }}
          >
            Tasks
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Manage your assignments and deadlines.
          </Typography>
        </Box>
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          width: { xs: '100%', sm: 'auto' }
        }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={isPrioritizing ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={handleRePrioritize}
            disabled={isPrioritizing || tasks.filter(t => t.status === 'pending').length === 0}
            fullWidth={isMobile}
            size="large"
          >
            {isPrioritizing ? 'Re-prioritizing...' : 'Re-prioritize'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            fullWidth={isMobile}
            size="large"
          >
            Add Task
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '16px' }}>{error}</Alert>}

      {/* Filter and Sort Controls */}
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 2,
        mb: 4,
        alignItems: { xs: 'stretch', sm: 'center' }
      }} className="animate-fade-in delay-100">
        <Box sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', sm: 'flex-start' }
        }}>
          <Button
            variant={filterBy === 'dueSoon' ? 'contained' : 'text'}
            onClick={() => setFilterBy('dueSoon')}
            sx={{ borderRadius: '100px' }}
          >
            Due Soon
          </Button>
          <Button
            variant={filterBy === 'pending' ? 'contained' : 'text'}
            onClick={() => setFilterBy('pending')}
            sx={{ borderRadius: '100px' }}
          >
            Pending
          </Button>
          <Button
            variant={filterBy === 'completed' ? 'contained' : 'text'}
            onClick={() => setFilterBy('completed')}
            sx={{ borderRadius: '100px' }}
          >
            Completed
          </Button>
          <Button
            variant={filterBy === 'all' ? 'contained' : 'text'}
            onClick={() => setFilterBy('all')}
            sx={{ borderRadius: '100px' }}
          >
            All
          </Button>
        </Box>

        <Box sx={{
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', sm: 'flex-start' },
          ml: { sm: 'auto' }
        }}>
          <Button
            variant={sortBy === 'deadline' ? 'outlined' : 'text'}
            onClick={() => setSortBy('deadline')}
            size="small"
            sx={{ borderRadius: '100px' }}
          >
            Sort: Deadline
          </Button>
          <Button
            variant={sortBy === 'priority' ? 'outlined' : 'text'}
            onClick={() => setSortBy('priority')}
            size="small"
            sx={{ borderRadius: '100px' }}
          >
            Sort: Priority
          </Button>
        </Box>
      </Box>

      {tasks.length === 0 ? (
        <Paper
          className="bento-card animate-fade-in delay-200"
          sx={{
            p: 8,
            textAlign: 'center',
            borderRadius: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
          }}
        >
          <Box
            component="img"
            src="/images/study-session-mascot.png"
            alt="Study Buddy Mascot"
            sx={{
              width: 150,
              height: 150,
              objectFit: 'contain',
              mb: 3,
              opacity: 0.9,
              animation: 'gentle-float 3s ease-in-out infinite',
              '@keyframes gentle-float': {
                '0%, 100%': { transform: 'translateY(0px)' },
                '50%': { transform: 'translateY(-15px)' }
              }
            }}
          />
          <Typography variant="h5" color="textSecondary" gutterBottom>
            No tasks yet
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            Add a task to get started with your schedule.
          </Typography>
          <Button variant="contained" onClick={() => setOpenDialog(true)}>
            Create First Task
          </Button>
        </Paper>
      ) : isMobile ? (
        // Mobile Card View
        <Grid container spacing={2} className="animate-fade-in delay-200">
          {getFilteredAndSortedTasks().map((task) => (
            <Grid item xs={12} key={task.id}>
              <Paper
                className="bento-card"
                sx={{
                  opacity: task.status === 'completed' ? 0.7 : 1,
                  border: task.status === 'overdue' ? '1px solid #d32f2f' : '1px solid transparent'
                }}
              >
                <Box sx={{ p: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
                        fontSize: '1.1rem'
                      }}
                    >
                      {task.title}
                    </Typography>
                    <Chip
                      label={task.status === 'completed' ? 'Completed' : 'Pending'}
                      color={task.status === 'completed' ? 'success' : 'default'}
                      size="small"
                      onClick={() => handleToggleTaskStatus(task.id, task.status)}
                      clickable
                      icon={task.status === 'completed' ? <CheckCircleIcon /> : undefined}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                    <Chip
                      label={task.task_type}
                      size="small"
                      sx={{ bgcolor: `${getTaskTypeColor(task.task_type)}.main`, color: 'white' }}
                    />
                    <Chip
                      label={task.course_code}
                      variant="outlined"
                      size="small"
                    />

                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Due Date
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {new Date(task.due_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary" display="block">
                        Time Left
                      </Typography>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          color: getHoursRemaining(task.due_date) === 'Overdue' ? 'error.main' : 'text.primary'
                        }}
                      >
                        {getHoursRemaining(task.due_date)}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      ) : (
        // Desktop Table View
        <Paper
          className="bento-card animate-fade-in delay-200"
          sx={{
            p: 0,
            overflow: 'hidden',
            borderRadius: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            position: 'relative'
          }}
        >
          {/* Watermark Icon */}
          <Typography
            sx={{
              position: 'absolute',
              top: -20,
              right: 20,
              fontSize: '120px',
              opacity: 0.03,
              pointerEvents: 'none',
              zIndex: 0
            }}
          >
            <Box component="img" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAC1klEQVR4nO2WTUhUURTHf+fOvDfO+JFpamoppZhEH0hFbYqgRVBQROCmRYsW7VoEQdCqXRAEbVq0aBFBEATRJqIPiAqiMMrU1MnRcXTmnXvucN/TmUZnxnfHaOGiA4fLvZxz//+59557LocVLllkCxERMSIm9v+LiIiRZVlWRMRIskRExIiIGBER83+LiIiYWJaliIiYWJaliIiYWJaliIiYWJaliIiYWJaliIiYWJaliIiYWJaliIiYWJaliIiYWJaliIiYWPF/4nzm+dJl14uImBkRETPLsoqIiJllWUVEzCzLKiJiZllWEREzy7KKiJhZllVExMyyrCIiZpZlFRExsyxr2Yi4+fFLp2VZxUy8gYiZZVnFRLyBiJllWcVEvIGImWVZxUS8gYiZZVnFRLyBiJllWcVEvIGImWVZxUS8gYiZZVnFRLyBiJllWcVEvIGImWVZxUS8gYiZZVnFRLyBiJllWcVEvIGImWVZxUS8gYiZZVnFRLyBiJllWcVEvIGImWVZxUS8gYiZZVnFRLyBiJllWcVEvIGImWVZxUR8QFxE3Hz0ufPGuzepwYlJrl+/zsTEROrdcbGmpiZt7949rF+/ntbWVurq6li9ejXV1dVUVVVRWVlJRUUF5eXllJWVUVpaSkpKCklJSSQmJhIfH09cXByxsbHExMTwK8FLjiGxkUhc6P9/ERERE7u8pT1WULaKtavLqZv/7K13n+1t7+1rW7tmFfOFPG+/fvP13buPLxw7cWrH3LvXKy6eP9Pa1rbnnvhO0uIT0BQVGpOX8aRaWLoaeACqHAUHAbQPmgKTBtX9+OffF/v7/lzXvxdc/NDV/eDj58+Xbz1uL6fQaRSOv7PxvJ3x/4DH4I8Af1kHsUx7cXFxIiaWiIiJJSJiYl2+dPG4pqhSRMREQVVkNhM/UoSIiIiIiIiIiIiIiIiIyK/FP6E5O/lY8oZJAAAAAElFTkSuQmCC" alt="Tasks" sx={{ width: 20, height: 20, display: 'inline-block', verticalAlign: 'middle' }} />
          </Typography>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, py: 3 }}>Title</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Priority</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Time Left</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Est. Hours</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Grade %</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getFilteredAndSortedTasks().map((task) => (
                  <TableRow
                    key={task.id}
                    hover
                    sx={{
                      opacity: task.status === 'completed' ? 0.6 : 1,
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell sx={{ color: task.status === 'completed' ? 'text.secondary' : 'text.primary', fontWeight: 500 }}>
                      {task.title}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {task.course_code}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.task_type}
                        size="small"
                        sx={{
                          bgcolor: `${getTaskTypeColor(task.task_type)}20`,
                          color: `${getTaskTypeColor(task.task_type)}`,
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {task.priority_score !== undefined ? (
                        <Chip
                          label={getPriorityLabel(task.priority_score).label}
                          size="small"
                          color={getPriorityLabel(task.priority_score).color}
                          sx={{ fontWeight: 600 }}
                        />
                      ) : (
                        <Typography variant="body2" color="textSecondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{
                      color: task.status === 'completed' ? 'text.disabled' : 'text.secondary',
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none'
                    }}>
                      {new Date(task.due_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      color: task.status === 'completed' ? 'text.disabled' : getHoursRemaining(task.due_date) === 'Overdue' ? 'error.main' : 'text.primary'
                    }}>
                      {task.status === 'completed' ? '-' : getHoursRemaining(task.due_date)}
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      color: task.status === 'completed'
                        ? 'text.disabled'
                        : task.predicted_hours > 8
                          ? 'error.main'
                          : task.predicted_hours > 4
                            ? 'warning.main'
                            : 'success.main'
                    }}>
                      {task.predicted_hours?.toFixed(1)}h
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: task.status === 'completed' ? 'text.disabled' : task.grade_percentage >= 20 ? 'error.main' : 'text.primary' }}>
                      {task.grade_percentage}%
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={task.status === 'completed' ? 'Completed' : 'Pending'}
                        color={task.status === 'completed' ? 'success' : 'default'}
                        size="small"
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        clickable
                        variant={task.status === 'completed' ? 'filled' : 'outlined'}
                        icon={task.status === 'completed' ? <CheckCircleIcon /> : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
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


    </Container >
  );
};

export default Tasks;
