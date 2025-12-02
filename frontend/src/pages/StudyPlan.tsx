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
}

interface StudyPlan {
  sessions: StudySession[];
  total_hours: number;
  days_planned: number;
  stress_level: 'low' | 'medium' | 'high';
  recommendations: string[];
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

  useEffect(() => {
    fetchTasks();
    loadLearningStyle();
  }, []);

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

  const fetchTasks = async () => {
    try {
      const fetchedTasks = await fetchAllTasks();
      const taskArray = Array.isArray(fetchedTasks) ? fetchedTasks : [];
      setTasks(taskArray.filter((t: Task) => t.status !== 'completed'));
    } catch (err) {
      setError('Failed to fetch tasks');
    } finally {
      setLoading(false);
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

    lines.forEach(line => {
      // Extract date from Day headers
      const dayMatch = line.match(/## Day \d+: (.+)/);
      if (dayMatch) {
        currentDate = dayMatch[1];
        return;
      }

      // Extract study sessions
      const sessionMatch = line.match(/-\s+(\d{2}:\d{2})-(\d{2}:\d{2})\s+(.+?)\s+\(Priority:\s+(\d+)\/10\)\s+-\s+([\d.]+)h/);
      if (sessionMatch && currentDate) {
        const [, startTime, endTime, taskTitle, priority, hours] = sessionMatch;
        
        // Find corresponding task
        const task = tasks.find(t => t.title.includes(taskTitle.split('(')[0].trim()));
        
        if (task) {
          sessions.push({
            id: `session-${sessionId++}`,
            task_id: task.id,
            task_title: task.title,
            start_time: startTime,
            end_time: endTime,
            day: currentDate,
            priority: parseInt(priority),
            estimated_hours: parseFloat(hours),
            research_tips: task.research_insights?.recommendations || []
          });
        }
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
    const avgHoursPerDay = sessions.length / daysToPlan;
    if (avgHoursPerDay > 6) return 'high';
    if (avgHoursPerDay > 4) return 'medium';
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
    const today = new Date();
    
    for (let i = 0; i < daysToPlan; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        name: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      });
    }
    
    return days;
  };

  const getSessionForTimeSlot = (day: string, time: string) => {
    if (!studyPlan) return null;
    
    return studyPlan.sessions.find(session => {
      const sessionTime = session.start_time;
      return session.day === day && sessionTime.startsWith(time.split(':')[0]);
    });
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
        
        <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
          {tasks.length} tasks available for planning
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
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
                  <Typography variant="h6">{studyPlan.total_hours}h</Typography>
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
                  <Typography variant="h6">{studyPlan.days_planned}</Typography>
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
                    color={studyPlan.stress_level === 'high' ? 'error' : 
                           studyPlan.stress_level === 'medium' ? 'warning' : 'success'} 
                  />
                  <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                    {studyPlan.stress_level}
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
                  <Typography variant="h6">{studyPlan.sessions.length}</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  Study Sessions
                </Typography>
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
                      return (
                        <Box
                          key={time}
                          sx={{
                            width: 80,
                            height: 60,
                            p: 0.5,
                            border: '1px solid #f0f0f0',
                            bgcolor: session ? theme.palette[getPriorityColor(session.priority)].light : 'transparent',
                            cursor: session ? 'pointer' : 'default',
                            '&:hover': session ? { bgcolor: theme.palette[getPriorityColor(session.priority)].main } : {}
                          }}
                          onClick={() => session && setSelectedSession(session)}
                        >
                          {session && (
                            <Box sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
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

          {/* Recommendations */}
          {studyPlan.recommendations.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Study Recommendations
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {studyPlan.recommendations.map((rec, index) => (
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
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default StudyPlan;
