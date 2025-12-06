import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  useTheme,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  Psychology as PsychologyIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';
import { Task } from '../types/task';
import { fetchAllTasks } from '../utils/taskStorage';
import { agentService } from '../utils/agentService';
import PomodoroTimer from '../components/PomodoroTimer';

interface StudySession {
  id: string;
  task_id: string;
  task_title: string;
  start_time: string;
  end_time: string;
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

interface OptimizedSchedule {
  schedule: {
    date: string;
    tasks: Task[];
    total_hours: number;
    stress_level: string;
    warnings: string[];
  }[];
  overall_stress: string;
  burnout_warnings: string[];
  optimization_notes: string[];
}

const StudyPlan: React.FC = () => {
  const theme = useTheme();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studyHours, setStudyHours] = useState(3);
  const [daysToPlan, setDaysToPlan] = useState(7);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [userLearningStyle, setUserLearningStyle] = useState<string>('visual');
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());
  const [optimizedSchedule, setOptimizedSchedule] = useState<OptimizedSchedule | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [planOutdated, setPlanOutdated] = useState(false);

  useEffect(() => {
    fetchTasks();
    loadLearningStyle();
    loadStudyPlan();
  }, []);

  const loadStudyPlan = () => {
    try {
      const saved = localStorage.getItem('studyPlan');
      if (saved) {
        const parsedPlan = JSON.parse(saved);
        setStudyPlan(parsedPlan);
      }
    } catch (error) {
      console.warn('Failed to load study plan from localStorage:', error);
    }
  };

  const saveStudyPlan = (plan: StudyPlan) => {
    try {
      localStorage.setItem('studyPlan', JSON.stringify(plan));
    } catch (error) {
      console.warn('Failed to save study plan to localStorage:', error);
    }
  };

  const loadLearningStyle = () => {
    try {
      const stored = localStorage.getItem('learningStyle');
      if (stored) {
        const profile = JSON.parse(stored);
        const style = profile.style;
        if (style) {
          const dominant = Object.entries(style).reduce((a, b) => 
            style[a[0] as keyof typeof style] > style[b[0] as keyof typeof style] ? a : b
          )[0];
          setUserLearningStyle(dominant);
        }
      }
    } catch (error) {
      console.error('Failed to load learning style:', error);
    }
  };

  const normalizeStatus = (status?: string): Task['status'] => {
    const normalized = typeof status === 'string' ? status.toLowerCase() : 'pending';
    return (['pending', 'in_progress', 'completed', 'overdue'].includes(normalized)
      ? normalized
      : 'pending') as Task['status'];
  };

  const fetchTasks = async () => {
    try {
      const fetchedTasks = await fetchAllTasks();
      const taskArray = Array.isArray(fetchedTasks)
        ? fetchedTasks
        : Array.isArray(fetchedTasks?.tasks)
          ? fetchedTasks.tasks
          : [];
      const normalizedTasks = taskArray.map(task => ({
        ...task,
        status: normalizeStatus(task.status),
      })) as Task[];
      // Only include tasks that are not completed (pending, in-progress, and overdue)
      const incompleteTasks = normalizedTasks.filter((t: Task) => 
        t.status === 'pending' || t.status === 'in_progress' || t.status === 'overdue'
      );
      setTasks(incompleteTasks);
      console.log(`Fetched ${incompleteTasks.length} incomplete tasks out of ${normalizedTasks.length} total tasks`);
      
      // Check if study plan exists and tasks have changed significantly
      if (studyPlan && incompleteTasks.length !== studyPlan.sessions.length) {
        setPlanOutdated(true);
      }
    } catch (err) {
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeSchedule = async () => {
    const pendingTasks = tasks.filter(task => task.status !== 'completed');
    if (pendingTasks.length === 0) {
      setScheduleError('No pending tasks to optimize');
      return;
    }

    setIsOptimizing(true);
    setScheduleError(null);

    try {
      const userId = localStorage.getItem('access_token') ? 'registered' : 'guest';
      const startDate = new Date();
      const scheduleRequest = {
        tasks: pendingTasks,
        start_date: startDate.toISOString().split('T')[0],
        days: Math.max(daysToPlan, 7),
        user_id: userId,
      };

      const optimized = await agentService.generateSchedule(scheduleRequest);
      setOptimizedSchedule(optimized);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to optimize schedule');
    } finally {
      setIsOptimizing(false);
    }
  };

  const generateStudyPlan = async () => {
    if (tasks.length === 0) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify({
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            task_type: task.task_type,
            due_date: task.due_date,
            priority_score: task.priority_score,
            predicted_hours: task.predicted_hours,
            grade_percentage: task.grade_percentage,
            research_sources: task.research_sources,
            wiki_summary: task.wiki_summary,
            academic_sources: task.academic_sources,
            community_answers: task.community_answers,
            research_insights: task.research_insights
          })),
          study_hours_per_day: studyHours,
          days_to_plan: daysToPlan
        })
      });

      if (!response.ok) throw new Error('Failed to generate study plan');
      
      const data = await response.json();
      const parsedPlan = parseStudyPlan(data.plan, data.total_hours, data.days_planned);
      setStudyPlan(parsedPlan);
      saveStudyPlan(parsedPlan);
      setPlanOutdated(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  const parseStudyPlan = (planText: string, totalHours: number, daysPlanned: number): StudyPlan => {
    // Parse the markdown study plan into structured sessions
    const sessions: StudySession[] = [];
    const lines = planText.split('\n');
    let currentDate = '';
    let sessionId = 0;
    
    lines.forEach((line, index) => {
      const dayMatch = line.match(/## Day \d+: (.+)/);
      if (dayMatch) {
        currentDate = dayMatch[1];
        return;
      }

      if (!line.startsWith('-')) return;
      
      const timeMatch = line.match(/\*{0,2}(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\*{0,2}/);
      if (!timeMatch) return;
      
      const [_, startTime, endTime] = timeMatch;
      
      const titleMatch = line.match(/\*{0,2}\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\*{0,2}\s+(.+?)\s+\(Priority:/);
      const taskTitle = titleMatch ? titleMatch[1] : 'Unknown Task';
      
      const priorityMatch = line.match(/Priority:\s+([\d.]+)\/10/);
      const priority = priorityMatch ? parseFloat(priorityMatch[1]) : 5;
      
      const hoursMatch = line.match(/([\d.]+)h/);
      const hours = hoursMatch ? parseFloat(hoursMatch[1]) : 1;
      
      const task = tasks.find(t => t.title.includes(taskTitle.split('(')[0].trim()));
      
      if (task) {
        sessions.push({
          id: `session-${sessionId++}`,
          task_id: task.id,
          task_title: task.title,
          start_time: startTime,
          end_time: endTime,
          day: currentDate,
          priority: priority,
          estimated_hours: hours,
          research_tips: task.research_insights?.recommendations || []
        });
      }
    });

    return {
      sessions,
      total_hours: totalHours,
      days_planned: daysPlanned,
      stress_level: calculateStressLevel(sessions),
      recommendations: extractRecommendations(planText)
    };
  };

  const calculateStressLevel = (sessions: StudySession[]): 'low' | 'medium' | 'high' => {
    if (sessions.length === 0) return 'low';
    
    // More sophisticated stress calculation
    const dailySessions: { [key: string]: StudySession[] } = {};
    sessions.forEach(session => {
      if (!dailySessions[session.day]) {
        dailySessions[session.day] = [];
      }
      dailySessions[session.day].push(session);
    });
    
    // Calculate stress factors
    const avgHoursPerDay = sessions.reduce((sum, s) => sum + s.estimated_hours, 0) / daysToPlan;
    const maxHoursInSingleDay = Math.max(...Object.values(dailySessions).map(daySessions => 
      daySessions.reduce((sum, s) => sum + s.estimated_hours, 0)
    ));
    const highPriorityTasks = sessions.filter(s => s.priority >= 8).length;
    const totalSessions = sessions.length;
    
    // Stress score calculation (0-100)
    let stressScore = 0;
    
    // Factor 1: Average daily workload (40% weight)
    if (avgHoursPerDay > 8) stressScore += 40;
    else if (avgHoursPerDay > 6) stressScore += 30;
    else if (avgHoursPerDay > 4) stressScore += 20;
    
    // Factor 2: Maximum single day load (25% weight)
    if (maxHoursInSingleDay > 10) stressScore += 25;
    else if (maxHoursInSingleDay > 8) stressScore += 20;
    else if (maxHoursInSingleDay > 6) stressScore += 15;
    
    // Factor 3: High priority task concentration (20% weight)
    const highPriorityRatio = highPriorityTasks / totalSessions;
    if (highPriorityRatio > 0.6) stressScore += 20;
    else if (highPriorityRatio > 0.4) stressScore += 15;
    else if (highPriorityRatio > 0.2) stressScore += 10;
    
    // Factor 4: Session density (15% weight)
    const avgSessionsPerDay = totalSessions / daysToPlan;
    if (avgSessionsPerDay > 4) stressScore += 15;
    else if (avgSessionsPerDay > 3) stressScore += 10;
    else if (avgSessionsPerDay > 2) stressScore += 5;
    
    if (stressScore >= 70) return 'high';
    if (stressScore >= 40) return 'medium';
    return 'low';
  };

  const extractRecommendations = (planText: string): string[] => {
    const recommendations: string[] = [];
    const lines = planText.split('\n');
    
    lines.forEach(line => {
      if (line.includes('Tip:') || line.includes('Recommendation:')) {
        recommendations.push(line.trim());
      }
    });
    
    return recommendations;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'error';
    if (priority >= 6) return 'warning';
    return 'success';
  };

  const getTimeBlocks = () => {
    const blocks = [];
    for (let hour = 9; hour <= 21; hour++) {
      blocks.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return blocks;
  };

  const getDays = () => {
    const days = [];
    // Start from December 1, 2025 to match the study plan date range
    const startDate = new Date('2025-12-01');
    
    for (let i = 0; i < daysToPlan; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        name: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    
    return days;
  };

  const getSessionForTimeSlot = (day: string, time: string) => {
    if (!studyPlan) return null;

    const targetHour = parseInt(time.split(':')[0]);

    return studyPlan.sessions.find(session => {
      const sessionTime = session.start_time;

      // Parse session day (e.g., "December 1, 2025") and convert to timeline format
      try {
        const sessionDateStr = session.day;
        // Extract month and day from session.day (e.g., "December 1, 2025" -> "Dec 1")
        const monthNames = {
          'January': 'Jan', 'February': 'Feb', 'March': 'Mar', 'April': 'Apr',
          'May': 'May', 'June': 'Jun', 'July': 'Jul', 'August': 'Aug',
          'September': 'Sep', 'October': 'Oct', 'November': 'Nov', 'December': 'Dec'
        };

        const parts = sessionDateStr.split(' ');
        if (parts.length >= 2) {
          const month = monthNames[parts[0] as keyof typeof monthNames] || parts[0];
          const dayNum = parts[1].replace(',', '');
          const sessionDayFormatted = `${month} ${dayNum}`;

          // Extract day part from timeline day (e.g., "Sun, Dec 1" -> "Dec 1")
          const timelineParts = day.split(', ');
          const timelineDayFormatted = timelineParts[1] || day;

          // Check if day matches AND session starts within this hour
          if (sessionDayFormatted === timelineDayFormatted) {
            const sessionHour = parseInt(sessionTime.split(':')[0]);
            // Session should appear in the time slot of its start hour
            if (sessionHour === targetHour) {
              return true;
            }
          }
        }
      } catch (error) {
        console.warn('Error parsing session date:', session.day, error);
      }

      return false;
    });
  };

  const toggleSessionCompletion = (sessionId: string) => {
    setCompletedSessions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const getProgressStats = () => {
    if (!studyPlan) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = completedSessions.size;
    const total = studyPlan.sessions.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Study Plan
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Visual schedule with optimized study sessions and research insights.
        </Typography>
      </Box>

      {/* Controls */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              label="Study Hours/Day"
              type="number"
              value={studyHours}
              onChange={(e) => setStudyHours(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1, max: 12 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              label="Days to Plan"
              type="number"
              value={daysToPlan}
              onChange={(e) => setDaysToPlan(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1, max: 30 }}
              fullWidth
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
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setCompletedSessions(new Set())}
                  disabled={generating}
                >
                  Reset Progress
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={generating ? <CircularProgress size={16} /> : <CalendarIcon />}
                onClick={generateStudyPlan}
                disabled={generating || tasks.length === 0}
              >
                {generating ? 'Generating...' : 'Generate Plan'}
              </Button>
              {planOutdated && studyPlan && (
                <Alert severity="warning" sx={{ ml: 2, flexGrow: 1 }}>
                  Study plan may be outdated due to task changes. Consider regenerating.
                </Alert>
              )}
              <Button
                variant="contained"
                color="secondary"
                startIcon={isOptimizing ? <CircularProgress size={16} /> : <CalendarIcon />}
                onClick={handleOptimizeSchedule}
                disabled={isOptimizing || tasks.filter(t => t.status !== 'completed').length === 0}
              >
                {isOptimizing ? 'Optimizing...' : 'Optimize Schedule'}
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          {tasks.length} incomplete tasks available for planning
        </Typography>
        
        {tasks.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No incomplete tasks available for study plan generation. All tasks may be completed or there might be an issue fetching tasks.
          </Alert>
        )}
        {scheduleError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {scheduleError}
          </Alert>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Macro Plan - Optimized Schedule */}
      {optimizedSchedule && (
        <Paper className="bento-card animate-fade-in delay-200" sx={{ p: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              AI-Optimized Macro Schedule
            </Typography>
            <Chip 
              label={`Overall Stress: ${optimizedSchedule.overall_stress}`}
              color={
                optimizedSchedule.overall_stress === 'high' ? 'error' :
                optimizedSchedule.overall_stress === 'medium' ? 'warning' : 'success'
              }
            />
          </Box>

          {optimizedSchedule.burnout_warnings && optimizedSchedule.burnout_warnings.length > 0 && (
            <Alert severity="warning" sx={{ mb: 3, borderRadius: '16px' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Burnout Warnings:
              </Typography>
              {optimizedSchedule.burnout_warnings.map((warning, index) => (
                <Typography key={index} variant="body2" sx={{ mb: 0.5 }}>
                  • {warning}
                </Typography>
              ))}
            </Alert>
          )}

          {optimizedSchedule.optimization_notes && optimizedSchedule.optimization_notes.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                AI Recommendations:
              </Typography>
              {optimizedSchedule.optimization_notes.map((note, index) => (
                <Typography key={index} variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                  • {note}
                </Typography>
              ))}
            </Box>
          )}

          <Grid container spacing={2}>
            {optimizedSchedule.schedule.map((day, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ 
                  p: 2, 
                  border: day.warnings.length > 0 ? '1px solid #ff9800' : '1px solid #e0e0e0',
                  bgcolor: day.stress_level === 'high' ? '#fff3e0' : 
                           day.stress_level === 'medium' ? '#f5f5f5' : '#ffffff'
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {new Date(day.date).toLocaleDateString()}
                    </Typography>
                    <Chip 
                      label={`${day.total_hours}h`} 
                      size="small" 
                      color={day.total_hours > 8 ? 'error' : day.total_hours > 4 ? 'warning' : 'success'}
                    />
                  </Box>
                  
                  {day.tasks.length > 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {day.tasks.map((task) => (
                        <Box key={task.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            {task.title}
                          </Typography>
                          <Chip 
                            label={`${task.predicted_hours?.toFixed(1)}h`} 
                            size="small" 
                            variant="outlined"
                          />
                        </Box>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      No tasks scheduled
                    </Typography>
                  )}

                  {day.warnings.length > 0 && (
                    <Alert severity="warning" sx={{ mt: 1, py: 0.5 }}>
                      {day.warnings[0]}
                    </Alert>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}

      {/* Study Plan Timeline */}
      {studyPlan && (
        <Grid container spacing={3}>
          {/* Stats Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TimeIcon color="primary" />
                  <Typography variant="h6">{studyPlan!.total_hours}h</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Total Study Time
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CalendarIcon color="primary" />
                  <Typography variant="h6">{studyPlan!.days_planned}</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Days Planned
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PsychologyIcon 
                    color={studyPlan!.stress_level === 'high' ? 'error' : 
                           studyPlan!.stress_level === 'medium' ? 'warning' : 'success'} 
                  />
                  <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                    {studyPlan!.stress_level}
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Stress Level
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <SearchIcon color="primary" />
                  <Typography variant="h6">{studyPlan!.sessions.length}</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Study Sessions
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Progress Card */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h6">{getProgressStats().percentage}%</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Progress: {getProgressStats().completed}/{getProgressStats().total} sessions
                </Typography>
                <Box sx={{ mt: 1, bgcolor: 'grey.200', borderRadius: 1, height: 8 }}>
                  <Box 
                    sx={{ 
                      bgcolor: 'primary.main', 
                      borderRadius: 1, 
                      height: '100%', 
                      width: `${getProgressStats().percentage}%` 
                    }} 
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Timeline Grid */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, overflowX: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Study Timeline
              </Typography>
              
              <Box sx={{ minWidth: 800 }}>
                {/* Time headers */}
                <Box sx={{ display: 'flex', mb: 1 }}>
                  <Box sx={{ width: 120, p: 1, fontWeight: 'bold' }}>
                    Day/Time
                  </Box>
                  {getTimeBlocks().map(time => (
                    <Box key={time} sx={{ width: 80, p: 1, textAlign: 'center', fontSize: '0.8rem' }}>
                      {time}
                    </Box>
                  ))}
                </Box>

                {/* Day rows */}
                {getDays().map(day => (
                  <Box key={day.date} sx={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                    <Box sx={{ width: 120, p: 1, fontWeight: 'bold', fontSize: '0.9rem' }}>
                      {day.name}
                    </Box>
                    {getTimeBlocks().map(time => {
                      const session = getSessionForTimeSlot(day.name, time);
                      const isCompleted = session && completedSessions.has(session.id);
                      return (
                        <Box
                          key={time}
                          sx={{
                            width: 80,
                            height: 60,
                            p: 0.5,
                            border: '1px solid #f0f0f0',
                            bgcolor: isCompleted ? 'grey.300' : 
                                   session ? theme.palette[getPriorityColor(session.priority)].light : 'transparent',
                            cursor: session ? 'pointer' : 'default',
                            position: 'relative',
                            '&:hover': session ? { 
                              bgcolor: isCompleted ? 'grey.400' : theme.palette[getPriorityColor(session.priority)].main 
                            } : {}
                          }}
                          onClick={() => session && toggleSessionCompletion(session.id)}
                        >
                          {session && (
                            <Box sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                              {isCompleted && (
                                <Box sx={{ 
                                  position: 'absolute', 
                                  top: 2, 
                                  right: 2, 
                                  fontSize: '0.8rem',
                                  color: 'green'
                                }}>
                                  ✓
                                </Box>
                              )}
                              <Typography variant="caption" sx={{ 
                                fontWeight: 'bold',
                                textDecoration: isCompleted ? 'line-through' : 'none'
                              }}>
                                {session.task_title.length > 15 
                                  ? session.task_title.substring(0, 15) + '...'
                                  : session.task_title
                                }
                              </Typography>
                              <Typography variant="caption" sx={{ display: 'block' }}>
                                {session.start_time}-{session.end_time}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Simple Session List for Debugging */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                All Study Sessions ({studyPlan!.sessions.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {studyPlan!.sessions.map((session) => (
                  <Card key={session.id} sx={{ minWidth: 200 }}>
                    <CardContent>
                      <Typography variant="subtitle2" color="primary">
                        {session.task_title}
                      </Typography>
                      <Typography variant="body2">
                        {session.day} at {session.start_time}-{session.end_time}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Priority: {session.priority}/10 | {session.estimated_hours}h
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Recommendations */}
          {studyPlan!.recommendations.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Study Recommendations
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {studyPlan!.recommendations.map((rec, index) => (
                    <Chip
                      key={index}
                      label={rec.replace(/^Tip:\s*/, '')}
                      variant="outlined"
                      size="small"
                      color="primary"
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Pomodoro Timer for Active Session */}
          {selectedSession && (
            <Grid item xs={12}>
              <PomodoroTimer
                taskTitle={selectedSession.task_title}
                learningStyle={userLearningStyle}
                studyTips={selectedSession.research_tips || []}
              />
            </Grid>
          )}
        </Grid>
      )}

      {/* Session Detail Dialog */}
      <Dialog open={!!selectedSession} onClose={() => setSelectedSession(null)} maxWidth="sm" fullWidth>
        {selectedSession && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">{selectedSession.task_title}</Typography>
                <IconButton onClick={() => setSelectedSession(null)}>
                  ×
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2">Time</Typography>
                  <Typography variant="body2">
                    {selectedSession.day} • {selectedSession.start_time}-{selectedSession.end_time}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Duration</Typography>
                  <Typography variant="body2">{selectedSession.estimated_hours} hours</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Priority</Typography>
                  <Chip
                    label={`${selectedSession.priority}/10`}
                    color={getPriorityColor(selectedSession.priority) as any}
                    size="small"
                  />
                </Box>
                {selectedSession.research_tips && selectedSession.research_tips.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2">Study Tips</Typography>
                    {selectedSession.research_tips.map((tip, index) => (
                      <Typography key={index} variant="body2" sx={{ mt: 0.5 }}>
                        • {tip}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedSession(null)}>Close</Button>
              {selectedSession && (
                <Button 
                  onClick={() => {
                    toggleSessionCompletion(selectedSession.id);
                    setSelectedSession(null);
                  }}
                  color={completedSessions.has(selectedSession.id) ? 'secondary' : 'primary'}
                  variant={completedSessions.has(selectedSession.id) ? 'outlined' : 'contained'}
                >
                  {completedSessions.has(selectedSession.id) ? 'Mark Incomplete' : 'Mark Complete'}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default StudyPlan;
