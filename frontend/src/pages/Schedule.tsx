import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextField,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { fetchAllTasks } from '../utils/taskStorage';
import { API_BASE_URL } from '../config/api';

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
  stress_level?: string;
  ai_insights?: any;
}

interface StudySession {
  id: string;
  task_id: string;
  task_title: string;
  start_time?: string;  // Optional now - for flexibility
  end_time?: string;    // Optional now - for flexibility
  day: string;
  priority: number;
  research_tips?: string[];
  estimated_hours: number;
  completed?: boolean;
  actual_hours?: number;
}

interface StudyPlan {
  sessions: StudySession[];
  total_hours: number;
  days_planned: number;
  stress_level: 'low' | 'medium' | 'high';
  recommendations: string[];
}

const Schedule: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedDayTasks, setSelectedDayTasks] = useState<Task[]>([]);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [studyHours, setStudyHours] = useState(3);
  const [planWarning, setPlanWarning] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(() => {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [addSessionDialogOpen, setAddSessionDialogOpen] = useState(false);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<Date | null>(null);
  const [newSessionData, setNewSessionData] = useState({
    task_title: '',
    estimated_hours: 2,
    priority: 5
  });

  useEffect(() => {
    // Check authentication status
    const token = localStorage.getItem('access_token');
    setIsAuthenticated(!!token);
    
    fetchTasks();
    loadStudyPlan();
    
    // Only sync from cloud if authenticated
    if (token) {
      syncFromCloud();
    }
  }, []);

  const loadStudyPlan = () => {
    try {
      const saved = localStorage.getItem('studyPlan');
      if (saved) {
        const parsedPlan = JSON.parse(saved);
        setStudyPlan(parsedPlan);
        
        // Load completed sessions
        const savedCompleted = localStorage.getItem('completedSessions');
        if (savedCompleted) {
          setCompletedSessions(new Set(JSON.parse(savedCompleted)));
        }
      }
    } catch (error) {
      console.warn('Failed to load study plan from localStorage:', error);
    }
  };

  const syncToCloud = async () => {
    // Only sync if authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('Not authenticated - skipping cloud sync');
      return;
    }
    
    if (!studyPlan) {
      console.log('No study plan to sync');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_data: {
            total_hours: studyPlan.total_hours,
            days_planned: studyPlan.days_planned,
            stress_level: studyPlan.stress_level,
            recommendations: studyPlan.recommendations
          },
          sessions: studyPlan.sessions.map(s => ({
            ...s,
            completed: completedSessions.has(s.id)
          }))
        })
      });

      if (response.ok) {
        setSyncStatus('✓ Synced to cloud');
        setTimeout(() => setSyncStatus(null), 3000);
      } else {
        throw new Error('Failed to sync to cloud');
      }
    } catch (error) {
      console.error('Cloud sync failed:', error);
      setSyncStatus('✗ Sync failed');
      setTimeout(() => setSyncStatus(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  const syncFromCloud = async () => {
    // Only sync if authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.log('Not authenticated - skipping cloud sync');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions/load`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.plan_data) {
          // Merge cloud data with local data
          const cloudPlan: StudyPlan = {
            sessions: data.sessions || [],
            total_hours: data.plan_data.total_hours || 0,
            days_planned: data.plan_data.days_planned || 0,
            stress_level: data.plan_data.stress_level || 'low',
            recommendations: data.plan_data.recommendations || []
          };

          // Check if local data is newer
          const localTimestamp = localStorage.getItem('studyPlanTimestamp');
          const cloudTimestamp = new Date(data.updated_at).getTime();
          
          if (!localTimestamp || cloudTimestamp > parseInt(localTimestamp)) {
            // Cloud is newer, use cloud data
            setStudyPlan(cloudPlan);
            localStorage.setItem('studyPlan', JSON.stringify(cloudPlan));
            localStorage.setItem('studyPlanTimestamp', cloudTimestamp.toString());
            
            // Update completed sessions
            const completed = new Set(
              cloudPlan.sessions.filter(s => s.completed).map(s => s.id)
            );
            setCompletedSessions(completed);
            localStorage.setItem('completedSessions', JSON.stringify(Array.from(completed)));
            
            setSyncStatus('✓ Loaded from cloud');
          } else {
            setSyncStatus('✓ Local data is current');
          }
          setTimeout(() => setSyncStatus(null), 3000);
        }
      }
    } catch (error) {
      console.error('Failed to load from cloud:', error);
    } finally {
      setSyncing(false);
    }
  };

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

  const getStudySessionsForDate = (date: Date): StudySession[] => {
    if (!studyPlan) return [];
    
    return studyPlan.sessions.filter(session => {
      const sessionDate = new Date(session.day);
      if (isNaN(sessionDate.getTime())) {
        console.warn('Invalid session date:', session.day);
        return false;
      }
      
      const matches = (
        sessionDate.getFullYear() === date.getFullYear() &&
        sessionDate.getMonth() === date.getMonth() &&
        sessionDate.getDate() === date.getDate()
      );
      
      return matches;
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
    const daySessions = getStudySessionsForDate(date);
    
    if (dayTasks.length > 0 || daySessions.length > 0) {
      setSelectedDate(date);
      setSelectedDayTasks(dayTasks);
    }
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
    setSelectedDayTasks([]);
  };
  const toggleSessionCompletion = (sessionId: string) => {
    setCompletedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      
      // Save to localStorage
      localStorage.setItem('completedSessions', JSON.stringify(Array.from(newSet)));
      
      // Auto-sync to cloud only if authenticated
      if (isAuthenticated) {
        setTimeout(() => syncToCloud(), 500);
      }
      
      return newSet;
    });
  };

  const addSession = () => {
    if (!selectedDateForAdd || !newSessionData.task_title.trim()) {
      return;
    }

    const newSession: StudySession = {
      id: `session-${Date.now()}`,
      task_id: '',
      task_title: newSessionData.task_title,
      day: selectedDateForAdd.toISOString().split('T')[0],
      priority: newSessionData.priority,
      estimated_hours: newSessionData.estimated_hours,
      completed: false
    };

    setStudyPlan(prev => {
      if (!prev) {
        // Create new plan if none exists
        const newPlan: StudyPlan = {
          sessions: [newSession],
          total_hours: newSessionData.estimated_hours,
          days_planned: 1,
          stress_level: 'low',
          recommendations: []
        };
        localStorage.setItem('studyPlan', JSON.stringify(newPlan));
        localStorage.setItem('studyPlanTimestamp', Date.now().toString());
        if (isAuthenticated) {
          setTimeout(() => syncToCloud(), 500);
        }
        return newPlan;
      }

      // Add to existing plan
      const updatedPlan: StudyPlan = {
        ...prev,
        sessions: [...prev.sessions, newSession],
        total_hours: prev.total_hours + newSessionData.estimated_hours
      };
      
      localStorage.setItem('studyPlan', JSON.stringify(updatedPlan));
      localStorage.setItem('studyPlanTimestamp', Date.now().toString());
      if (isAuthenticated) {
        setTimeout(() => syncToCloud(), 500);
      }
      return updatedPlan;
    });

    // Reset form
    setNewSessionData({
      task_title: '',
      estimated_hours: 2,
      priority: 5
    });
    setAddSessionDialogOpen(false);
    setSelectedDateForAdd(null);
  };

  const removeSession = (sessionId: string) => {
    setStudyPlan(prev => {
      if (!prev) return null;

      const sessionToRemove = prev.sessions.find(s => s.id === sessionId);
      const updatedPlan: StudyPlan = {
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== sessionId),
        total_hours: prev.total_hours - (sessionToRemove?.estimated_hours || 0)
      };

      // Remove from completed sessions if it was completed
      setCompletedSessions(prevCompleted => {
        const newSet = new Set(prevCompleted);
        newSet.delete(sessionId);
        localStorage.setItem('completedSessions', JSON.stringify(Array.from(newSet)));
        return newSet;
      });

      localStorage.setItem('studyPlan', JSON.stringify(updatedPlan));
      localStorage.setItem('studyPlanTimestamp', Date.now().toString());
      if (isAuthenticated) {
        setTimeout(() => syncToCloud(), 500);
      }
      return updatedPlan;
    });
  };

  const openAddSessionDialog = (date: Date) => {
    setSelectedDateForAdd(date);
    setAddSessionDialogOpen(true);
  };

  const generateStudyPlan = async () => {
    if (tasks.length === 0) {
      setError('No tasks available for study plan generation');
      return;
    }
    
    setGenerating(true);
    setError(null);
    setPlanWarning(null);
    
    try {
      const incompleteTasks = tasks.filter(task => task.status !== 'completed');
      const requestData = {
        tasks: incompleteTasks.map(task => ({
          id: task.id,
          title: task.title,
          task_type: task.task_type,
          due_date: task.due_date,
          priority_score: task.priority_score,
          predicted_hours: task.predicted_hours,
          grade_percentage: task.grade_percentage
        })),
        study_hours_per_day: studyHours,
        start_date: startDate
      };
      
      const response = await fetch(`${API_BASE_URL}/api/study-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('📅 Backend response:', data);
      console.log('📅 Response keys:', Object.keys(data));
      console.log('📅 Sessions from backend:', data.sessions);
      console.log('📅 Sessions is array?', Array.isArray(data.sessions));
      console.log('📅 Sessions length:', data.sessions?.length);
      if (data.sessions && data.sessions.length > 0) {
        console.log('📅 First session from backend:', data.sessions[0]);
      }
      console.log('📅 Sample from plan text:', data.plan.substring(0, 500));
      
      // Check for warnings
      if (data.warning) {
        setPlanWarning(data.warning);
      }
      
      // Use sessions directly from backend if available, otherwise parse
      let parsedPlan: StudyPlan;
      if (data.sessions && Array.isArray(data.sessions)) {
        // Backend now returns structured sessions directly
        parsedPlan = {
          sessions: data.sessions.map((s: any, idx: number) => ({
            id: s.id || `session-${idx}`,
            task_id: s.task_id || '',
            task_title: s.task_title,
            start_time: s.start_time || undefined,
            end_time: s.end_time || undefined,
            day: s.day,
            priority: s.priority,
            estimated_hours: s.estimated_hours,
            research_tips: s.research_tips || []
          })),
          total_hours: data.total_hours,
          days_planned: data.days_planned,
          stress_level: data.total_hours > 21 ? 'high' : data.total_hours > 14 ? 'medium' : 'low',
          recommendations: []
        };
      } else {
        // Fallback to parsing markdown (for backward compatibility)
        parsedPlan = parseStudyPlan(data.plan, data.total_hours, data.days_planned);
      }
      
      console.log('📅 Parsed plan:', parsedPlan);
      console.log('📅 Number of sessions:', parsedPlan.sessions.length);
      if (parsedPlan.sessions.length > 0) {
        console.log('📅 First session:', parsedPlan.sessions[0]);
        console.log('📅 First session day:', parsedPlan.sessions[0].day);
      }
      
      setStudyPlan(parsedPlan);
      
      // Save to localStorage
      localStorage.setItem('studyPlan', JSON.stringify(parsedPlan));
      localStorage.setItem('studyPlanTimestamp', Date.now().toString());
      
      // Auto-sync to cloud only if authenticated
      if (isAuthenticated) {
        setTimeout(() => syncToCloud(), 500);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  const parseStudyPlan = (planText: string, totalHours: number, daysPlanned: number): StudyPlan => {
    const sessions: StudySession[] = [];
    const lines = planText.split('\n');
    let currentDate = '';
    let sessionId = 0;
    
    lines.forEach((line) => {
      const dayMatch = line.match(/## Day \d+: (.+)/);
      if (dayMatch) {
        currentDate = dayMatch[1];
        return;
      }

      if (!line.startsWith('-')) return;
      
      const timeMatch = line.match(/\*{0,2}(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\*{0,2}/);
      if (!timeMatch) return;
      
      const titleMatch = line.match(/\*{0,2}\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\*{0,2}\s+(.+)\s+\(Priority:/);
      if (!titleMatch) return;
      
      const priorityMatch = line.match(/Priority:\s*(\d+)/);
      const durationMatch = line.match(/-\s*([\d.]+)h/);
      
      sessions.push({
        id: `session-${sessionId++}`,
        task_id: '',
        task_title: titleMatch[1].trim(),
        start_time: timeMatch[1],
        end_time: timeMatch[2],
        day: currentDate,
        priority: priorityMatch ? parseInt(priorityMatch[1]) : 5,
        estimated_hours: durationMatch ? parseFloat(durationMatch[1]) : 1,
        research_tips: []
      });
    });
    
    const recommendations: string[] = [];
    const summaryMatch = planText.match(/## Summary\n([\s\S]*?)(?=\n\n|$)/);
    if (summaryMatch) {
      const summaryLines = summaryMatch[1].split('\n').filter(line => line.trim().startsWith('-'));
      summaryLines.forEach(line => {
        const tipMatch = line.match(/-\s*(.+)/);
        if (tipMatch && !tipMatch[1].toLowerCase().includes('total study hours') && 
            !tipMatch[1].toLowerCase().includes('tasks covered')) {
          recommendations.push(tipMatch[1].trim());
        }
      });
    }
    
    return {
      sessions,
      total_hours: totalHours,
      days_planned: daysPlanned,
      stress_level: totalHours > 21 ? 'high' : totalHours > 14 ? 'medium' : 'low',
      recommendations
    };
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
      const daySessions = getStudySessionsForDate(date);
      
      const isToday = date.toDateString() === new Date().toDateString();
      const hasCompletedSessions = daySessions.some(s => completedSessions.has(s.id));

      days.push(
        <Paper
          key={day}
          onClick={() => handleDayClick(date)}
          onDoubleClick={() => openAddSessionDialog(date)}
          sx={{
            p: 1,
            minHeight: 120,
            border: '1px solid #e0e0e0',
            backgroundColor: isToday
              ? '#e3f2fd'
              : hasCompletedSessions
                ? '#e8f5e9'
                : dayTasks.some(t => t.status === 'completed')
                  ? '#e8f5e9'
                  : dayTasks.length > 0 || daySessions.length > 0
                    ? '#fff3e0'
                    : '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              boxShadow: 2,
              backgroundColor: isToday ? '#bbdefb' : '#f5f5f5',
            },
          }}
          title="Double-click to add session"
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            {day}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Show study sessions first */}
            {daySessions.slice(0, 1).map((session) => {
              const isCompleted = completedSessions.has(session.id);
              return (
                <Chip
                  key={session.id}
                  label={`${session.estimated_hours}h - ${session.task_title.substring(0, 10)}`}
                  size="small"
                  sx={{
                    backgroundColor: isCompleted ? '#9E9E9E' : '#424242',
                    color: 'white',
                    fontSize: '0.7rem',
                    height: 20,
                    opacity: isCompleted ? 0.8 : 1,
                    textDecoration: isCompleted ? 'line-through' : 'none',
                    '& .MuiChip-label': {
                      px: 0.5,
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSessionCompletion(session.id);
                  }}
                />
              );
            })}
            {/* Show tasks */}
            {dayTasks.slice(0, daySessions.length > 0 ? 1 : 2).map((task) => (
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
            {(dayTasks.length > (daySessions.length > 0 ? 1 : 2) || daySessions.length > 1) && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                +{(dayTasks.length > (daySessions.length > 0 ? 1 : 2) ? dayTasks.length - (daySessions.length > 0 ? 1 : 2) : 0) + 
                  (daySessions.length > 1 ? daySessions.length - 1 : 0)} more
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

      {/* Study Plan Generation Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          Study Plan Generator
        </Typography>
        
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              label="Study Hours/Day"
              type="number"
              value={studyHours}
              onChange={(e) => setStudyHours(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1, max: 12 }}
              fullWidth
              helperText="Hours per day"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ 
                min: new Date().toISOString().split('T')[0]
              }}
              fullWidth
              helperText="When to start"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchTasks}
                disabled={generating}
              >
                Refresh Tasks
              </Button>
              {studyPlan && (
                <>
                  {isAuthenticated && (
                    <Button
                      variant="outlined"
                      startIcon={syncing ? <CircularProgress size={16} /> : <RefreshIcon />}
                      onClick={syncFromCloud}
                      disabled={syncing || generating}
                    >
                      {syncing ? 'Syncing...' : 'Sync from Cloud'}
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setClearDialogOpen(true)}
                    disabled={generating}
                  >
                    Clear Sessions
                  </Button>
                </>
              )}
              <Button
                variant="contained"
                startIcon={generating ? <CircularProgress size={16} /> : <CalendarIcon />}
                onClick={generateStudyPlan}
                disabled={generating || tasks.length === 0}
              >
                {generating ? 'Generating...' : 'Generate Plan'}
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography variant="body2" color="textSecondary">
            {tasks.filter(t => t.status !== 'completed').length} incomplete tasks available for planning
            {!isAuthenticated && ' • Cloud sync disabled (not logged in)'}
          </Typography>
          {syncStatus && isAuthenticated && (
            <Typography variant="body2" color={syncStatus.includes('✓') ? 'success.main' : 'error.main'}>
              {syncStatus}
            </Typography>
          )}
        </Box>
        
        {planWarning && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {planWarning}
          </Alert>
        )}
        
        {tasks.filter(t => t.status !== 'completed').length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No incomplete tasks available for study plan generation.
          </Alert>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      <Paper className="bento-card animate-fade-in delay-300" sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Calendar Items
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
            💡 Double-click any day to add a session
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
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
        </Box>
        
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Study Sessions
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {[
              { status: 'Uncompleted', color: '#424242', opacity: 1 },
              { status: 'Completed', color: '#9E9E9E', opacity: 0.8 },
            ].map((item) => (
              <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    backgroundColor: item.color,
                    borderRadius: '50%',
                    opacity: item.opacity,
                  }}
                />
                <Typography variant="body2" color="textSecondary">{item.status}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Paper>


      {/* Legend */}
      <Dialog open={selectedDate !== null} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          Schedule for {selectedDate?.toLocaleDateString()}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            {/* Study Sessions */}
            {(() => {
              const daySessions = selectedDate ? getStudySessionsForDate(selectedDate) : [];
              return daySessions.length > 0 ? (
                <>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                    Study Sessions
                  </Typography>
                  {daySessions.map((session) => {
                    const isCompleted = completedSessions.has(session.id);
                    return (
                      <Card key={session.id} sx={{ 
                        border: isCompleted ? '2px solid #4caf50' : '1px solid #e0e0e0',
                        bgcolor: isCompleted ? '#f8fff8' : 'background.paper'
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {session.task_title}
                            </Typography>
                            <Chip
                              label={isCompleted ? 'Completed' : `${session.priority}/10`}
                              size="small"
                              color={isCompleted ? 'success' : (session.priority >= 8 ? 'error' : session.priority >= 6 ? 'warning' : 'default')}
                            />
                          </Box>
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                            Duration: {session.estimated_hours}h (schedule flexibly throughout your day)
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => navigate(`/sessions/${session.id}`)}
                            >
                              View Details
                            </Button>
                            <Button
                              size="small"
                              variant={isCompleted ? 'outlined' : 'contained'}
                              color={isCompleted ? 'secondary' : 'primary'}
                              onClick={() => toggleSessionCompletion(session.id)}
                            >
                              {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => {
                                if (window.confirm('Remove this session?')) {
                                  removeSession(session.id);
                                }
                              }}
                            >
                              Remove
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              ) : null;
            })()}
            
            {/* Tasks */}
            {selectedDayTasks.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2 }}>
                  Tasks
                </Typography>
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
              </>
            )}
            
            {/* No items message */}
            {(() => {
              const daySessions = selectedDate ? getStudySessionsForDate(selectedDate) : [];
              if (daySessions.length === 0 && selectedDayTasks.length === 0) {
                return (
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                    No tasks or study sessions scheduled for this day.
                  </Typography>
                );
              }
              return null;
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Clear Sessions Confirmation Dialog */}
      <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
        <DialogTitle>Clear All Study Sessions?</DialogTitle>
        <DialogContent>
          <Typography>
            This will permanently delete your current study plan and all session progress. 
            You'll need to generate a new plan. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={async () => {
              // Clear from cloud only if authenticated
              if (isAuthenticated) {
                const token = localStorage.getItem('access_token');
                if (token) {
                  try {
                    await fetch(`${API_BASE_URL}/api/study-sessions/clear`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });
                  } catch (error) {
                    console.error('Failed to clear from cloud:', error);
                  }
                }
              }
              
              // Clear local data
              setStudyPlan(null);
              setCompletedSessions(new Set());
              localStorage.removeItem('studyPlan');
              localStorage.removeItem('completedSessions');
              localStorage.removeItem('studyPlanTimestamp');
              setClearDialogOpen(false);
            }}
            color="error"
            variant="contained"
          >
            Clear Sessions
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Session Dialog */}
      <Dialog open={addSessionDialogOpen} onClose={() => setAddSessionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add Study Session
          {selectedDateForAdd && ` - ${selectedDateForAdd.toLocaleDateString()}`}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Task Title"
              value={newSessionData.task_title}
              onChange={(e) => setNewSessionData(prev => ({ ...prev, task_title: e.target.value }))}
              fullWidth
              required
              autoFocus
            />
            <TextField
              label="Estimated Hours"
              type="number"
              value={newSessionData.estimated_hours}
              onChange={(e) => setNewSessionData(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 0 }))}
              inputProps={{ min: 0.5, max: 12, step: 0.5 }}
              fullWidth
            />
            <TextField
              label="Priority (1-10)"
              type="number"
              value={newSessionData.priority}
              onChange={(e) => setNewSessionData(prev => ({ ...prev, priority: parseInt(e.target.value) || 5 }))}
              inputProps={{ min: 1, max: 10 }}
              fullWidth
              helperText="1 = Low priority, 10 = High priority"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddSessionDialogOpen(false);
            setNewSessionData({ task_title: '', estimated_hours: 2, priority: 5 });
          }}>
            Cancel
          </Button>
          <Button 
            onClick={addSession}
            variant="contained"
            disabled={!newSessionData.task_title.trim()}
          >
            Add Session
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Schedule;
