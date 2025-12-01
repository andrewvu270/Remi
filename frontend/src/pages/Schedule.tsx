import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { fetchAllTasks } from '../utils/taskStorage';

interface Task {
  id: string;
  title: string;
  task_type: string;
  due_date: string;
  priority_score: number;
  course_code: string;
  grade_percentage: number;
  predicted_hours: number;
  status: string;
}

const Schedule: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await fetchAllTasks();
      setTasks(data.tasks || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const getTasksForDate = (date: Date): Task[] => {
    return tasks.filter(task => {
      const taskDate = new Date(task.due_date);
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      );
    });
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getTaskTypeColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      Assignment: '#2196F3',
      Exam: '#F44336',
      Quiz: '#FF9800',
      Project: '#9C27B0',
      Reading: '#00BCD4',
      Lab: '#4CAF50',
    };
    return colors[type] || '#757575';
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDayClick = (date: Date) => {
    const dayTasks = getTasksForDate(date);
    if (dayTasks.length > 0) {
      setSelectedDate(date);
      setSelectedDayTasks(dayTasks);
    }
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
    setSelectedDayTasks([]);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <Box
          key={`empty-${i}`}
          sx={{
            p: 1,
            minHeight: 120,
            backgroundColor: '#f5f5f5',
            border: '1px solid #e0e0e0',
          }}
        />
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayTasks = getTasksForDate(date);
      const isToday =
        date.toDateString() === new Date().toDateString();

      days.push(
        <Paper
          key={day}
          onClick={() => handleDayClick(date)}
          sx={{
            p: 1,
            minHeight: 120,
            border: '1px solid #e0e0e0',
            backgroundColor: isToday
              ? '#e3f2fd'
              : dayTasks.some(t => t.status === 'completed')
                ? '#e8f5e9'
                : dayTasks.length > 0
                  ? '#fff3e0'
                  : '#ffffff',
            cursor: dayTasks.length > 0 ? 'pointer' : 'default',
            transition: 'all 0.2s',
            '&:hover': {
              boxShadow: dayTasks.length > 0 ? 2 : 0,
            },
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            {day}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {dayTasks.slice(0, 2).map((task) => (
              <Chip
                key={task.id}
                label={task.title.substring(0, 12)}
                size="small"
                sx={{
                  backgroundColor: task.status === 'completed' ? '#4caf50' : getTaskTypeColor(task.task_type),
                  color: 'white',
                  fontSize: '0.7rem',
                  height: 20,
                  opacity: task.status === 'completed' ? 0.6 : 1,
                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                  '& .MuiChip-label': {
                    px: 0.5,
                  },
                }}
              />
            ))}
            {dayTasks.length > 2 && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                +{dayTasks.length - 2} more
              </Typography>
            )}
          </Box>
        </Paper>
      );
    }

    return days;
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 6 }} className="animate-fade-in">
        <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
          Calendar
        </Typography>
        <Typography variant="body1" color="textSecondary">
          View your upcoming deadlines and study sessions.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '16px' }}>{error}</Alert>}

      {/* Month Navigation */}
      <Paper className="bento-card animate-fade-in delay-100" sx={{ p: 2, mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ChevronLeftIcon />}
          onClick={handlePrevMonth}
          variant="text"
          color="inherit"
        >
          Previous
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {monthName}
        </Typography>
        <Button
          endIcon={<ChevronRightIcon />}
          onClick={handleNextMonth}
          variant="text"
          color="inherit"
        >
          Next
        </Button>
      </Paper>

      {/* Calendar Grid */}
      <Paper className="bento-card animate-fade-in delay-200" sx={{ p: 3, mb: 4 }}>
        {/* Day headers */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          {dayNames.map((day) => (
            <Grid item xs={12 / 7} key={day}>
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, textAlign: 'center', color: 'text.secondary' }}
              >
                {day}
              </Typography>
            </Grid>
          ))}
        </Grid>

        {/* Calendar days */}
        <Grid container spacing={1}>
          {renderCalendar().map((day, index) => (
            <Grid item xs={12 / 7} key={index}>
              {day}
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Legend */}
      <Paper className="bento-card animate-fade-in delay-300" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Task Types
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {[
            { type: 'Assignment', color: '#2196F3' },
            { type: 'Exam', color: '#F44336' },
            { type: 'Quiz', color: '#FF9800' },
            { type: 'Project', color: '#9C27B0' },
            { type: 'Reading', color: '#00BCD4' },
            { type: 'Lab', color: '#4CAF50' },
          ].map((item) => (
            <Box key={item.type} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  backgroundColor: item.color,
                  borderRadius: '50%',
                }}
              />
              <Typography variant="body2" color="textSecondary">{item.type}</Typography>
            </Box>
          ))}
        </Box>
      </Paper>


      {/* Day Tasks Modal */}
      <Dialog open={selectedDate !== null} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          Tasks for {selectedDate?.toLocaleDateString()}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {selectedDayTasks.map((task) => (
              <Card key={task.id}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {task.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                    {task.course_code}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <Chip
                      label={task.task_type}
                      size="small"
                      sx={{ backgroundColor: task.status === 'completed' ? '#4caf50' : getTaskTypeColor(task.task_type), color: 'white' }}
                    />
                    <Chip
                      label={`${task.grade_percentage}%`}
                      size="small"
                      sx={{ backgroundColor: task.grade_percentage >= 20 ? '#d32f2f' : '#388e3c', color: 'white' }}
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Schedule;
