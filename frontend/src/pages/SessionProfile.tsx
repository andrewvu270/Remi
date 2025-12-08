import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Snackbar
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import {
  PlayArrow,
  CheckCircle,
  ArrowBack,
  CalendarToday,
  Schedule,
  AccessTime,
  School,
  Assignment,
  TrendingUp,
  ExpandMore,
  ExpandLess,
  Lightbulb
} from '@mui/icons-material';
import Timer from '../components/Timer';
import PomodoroTimer from '../components/PomodoroTimer';
import ReflectionEditor from '../components/ReflectionEditor';
import Mascot from '../components/Mascot';
import { API_BASE_URL } from '../config/api';

interface Session {
  id: string;
  task_title: string;
  day: string;
  estimated_hours: number;
  actual_hours?: number;
  priority: number;
  completed: boolean;
  pomodoro_count: number;
  pomodoro_enabled: boolean;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  course_code?: string;
  deadline?: string;
  weight?: number;
  reflection?: {
    reflection_text: string;
    what_learned: string;
    what_was_challenging: string;
    what_to_improve: string;
  };
}

const SessionProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timerActive, setTimerActive] = useState(() => {
    // Restore timer state from localStorage
    const saved = localStorage.getItem(`timer_active_${id}`);
    return saved === 'true';
  });
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [reflection, setReflection] = useState({
    reflection_text: '',
    what_learned: '',
    what_was_challenging: '',
    what_to_improve: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pomodoroExpanded, setPomodoroExpanded] = useState(false);
  const [reflectionExpanded, setReflectionExpanded] = useState(false);
  const [currentTip, setCurrentTip] = useState('');

  const studyTips = [
    "Break complex tasks into smaller, manageable chunks.",
    "Use the Feynman Technique: Try explaining the concept to a 5-year-old.",
    "Take a 5-minute break every 25 minutes to maintain focus.",
    "Switch between subjects to improve retention (Interleaving).",
    "Test yourself frequently instead of just re-reading notes.",
    "Teach what you've learned to someone else.",
    "Eliminate distractions: Put your phone in another room.",
    "Stay hydrated! Your brain needs water to function well.",
    "Listen to instrumental music or white noise if it helps you focus.",
    "Visualize the material to create stronger memory associations."
  ];

  useEffect(() => {
    // Pick a random tip on mount
    const randomTip = studyTips[Math.floor(Math.random() * studyTips.length)];
    setCurrentTip(randomTip);
  }, [id]); // Refresh tip when session ID changes

  useEffect(() => {
    if (id) {
      fetchSession();
    }
  }, [id]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      // Guest mode: Load from localStorage
      if (!token) {
        const storedPlan = localStorage.getItem('studyPlan');
        if (storedPlan) {
          const plan = JSON.parse(storedPlan);
          const foundSession = plan.sessions?.find((s: Session) => s.id === id);
          if (foundSession) {
            setSession(foundSession);
            setPomodoroCount(foundSession.pomodoro_count || 0);
            if (foundSession.reflection) {
              setReflection(foundSession.reflection);
            }
            setError(null);
          } else {
            setError('Session not found');
          }
        } else {
          setError('No study plan found');
        }
        setLoading(false);
        return;
      }

      // Authenticated mode: Load from backend
      const response = await fetch(`${API_BASE_URL}/api/sessions/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, fall back to guest mode
          localStorage.removeItem('access_token');
          await fetchSession();
        } else {
          throw new Error('Failed to fetch session');
        }
        return;
      }

      const data = await response.json();
      setSession(data.session);
      setPomodoroCount(data.session.pomodoro_count || 0);

      // Load existing reflection if available
      if (data.session.reflection) {
        setReflection(data.session.reflection);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = () => {
    if (session?.completed) {
      alert('This session is already completed. Mark it as incomplete to restart.');
      return;
    }
    setTimerActive(true);
    // Persist timer state
    localStorage.setItem(`timer_active_${id}`, 'true');
  };

  const handleElapsedTimeChange = (seconds: number) => {
    setElapsedSeconds(seconds);
    setHasUnsavedChanges(true);
  };

  const handleMarkComplete = () => {
    if (session?.completed) {
      alert('Session is already completed.');
      return;
    }

    // Use elapsed time if timer was used, otherwise use estimated hours
    const actualHours = elapsedSeconds > 0 ? elapsedSeconds / 3600 : session?.estimated_hours || 0;

    if (elapsedSeconds === 0) {
      // Quick complete without timer
      if (window.confirm(`Mark this session as complete? Duration will be set to ${session?.estimated_hours} hours (estimated).`)) {
        completeSession(actualHours, false);
      }
    } else {
      // Complete with timer data
      setShowCompletionDialog(true);
    }
  };

  const handleMarkIncomplete = async () => {
    if (!window.confirm('Mark this session as incomplete? This will reset actual hours, completion time, and reflection data.')) {
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');

      // Guest mode
      if (!token) {
        const storedPlan = localStorage.getItem('studyPlan');
        if (storedPlan) {
          const plan = JSON.parse(storedPlan);
          const updatedSessions = plan.sessions.map((s: Session) =>
            s.id === id ? {
              ...s,
              completed: false,
              completed_at: undefined,
              actual_hours: undefined,
              reflection: undefined,
              pomodoro_count: 0
            } : s
          );
          localStorage.setItem('studyPlan', JSON.stringify({ ...plan, sessions: updatedSessions }));
          localStorage.setItem('studyPlanTimestamp', Date.now().toString());

          // Reset local state
          setElapsedSeconds(0);
          setPomodoroCount(0);
          setReflection({
            reflection_text: '',
            what_learned: '',
            what_was_challenging: '',
            what_to_improve: ''
          });

          await fetchSession();
        }
        return;
      }

      // Authenticated mode
      const response = await fetch(`${API_BASE_URL}/api/sessions/${id}/incomplete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to mark incomplete');

      // Reset local state
      setElapsedSeconds(0);
      setPomodoroCount(0);
      setReflection({
        reflection_text: '',
        what_learned: '',
        what_was_challenging: '',
        what_to_improve: ''
      });

      await fetchSession();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark incomplete');
    } finally {
      setSubmitting(false);
    }
  };

  const completeSession = async (actualHours: number, withReflection: boolean) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');

      const completionData = {
        actual_hours: actualHours,
        completed_at: new Date().toISOString(),
        pomodoro_count: pomodoroCount,
        ...(withReflection && {
          reflection: reflection.reflection_text,
          what_learned: reflection.what_learned,
          what_was_challenging: reflection.what_was_challenging,
          what_to_improve: reflection.what_to_improve
        })
      };

      // Guest mode
      if (!token) {
        const storedPlan = localStorage.getItem('studyPlan');
        if (storedPlan) {
          const plan = JSON.parse(storedPlan);
          const updatedSessions = plan.sessions.map((s: Session) =>
            s.id === id ? { ...s, completed: true, ...completionData, reflection: withReflection ? reflection : undefined } : s
          );
          localStorage.setItem('studyPlan', JSON.stringify({ ...plan, sessions: updatedSessions }));
          localStorage.setItem('studyPlanTimestamp', Date.now().toString());
        }

        setShowCompletionDialog(false);
        setShowSuccess(true);
        setHasUnsavedChanges(false);

        // Clear timer state
        localStorage.removeItem(`timer_${id}`);

        await fetchSession();
        return;
      }

      // Authenticated mode
      const response = await fetch(`${API_BASE_URL}/api/sessions/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(completionData)
      });

      if (!response.ok) throw new Error('Failed to complete session');

      setShowCompletionDialog(false);
      setShowSuccess(true);
      setHasUnsavedChanges(false);

      // Clear timer state
      localStorage.removeItem(`timer_${id}`);

      // Trigger cloud sync
      await triggerCloudSync();

      // Refresh session data
      await fetchSession();

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteSession = () => {
    const actualHours = elapsedSeconds / 3600;
    completeSession(actualHours, true);
    // Clear timer state when completing
    localStorage.removeItem(`timer_active_${id}`);
  };

  const triggerCloudSync = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        // Trigger sync endpoint if available
        await fetch(`${API_BASE_URL}/api/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (err) {
      console.warn('Cloud sync failed:', err);
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'error';
    if (priority >= 6) return 'warning';
    return 'success';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!session) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Session not found</Alert>
        <Button onClick={() => navigate('/sessions')} sx={{ mt: 2 }}>
          Back to Sessions
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/sessions')}
          sx={{ mb: 2 }}
        >
          Back to Sessions
        </Button>
        <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
          {session.task_title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="body1" color="textSecondary">
            {new Date(session.day).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </Typography>
          {session.completed && (
            <Chip label="Completed" color="success" icon={<CheckCircle />} />
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {/* Session Details */}
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Task Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {session.course_code && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <School sx={{ color: 'primary.main', mt: 0.5 }} fontSize="small" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                      Course
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {session.course_code}
                    </Typography>
                  </Box>
                </Box>
              )}

              {session.deadline && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Assignment sx={{ color: 'error.main', mt: 0.5 }} fontSize="small" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                      Deadline
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {new Date(session.deadline).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Typography>
                  </Box>
                </Box>
              )}

              {session.weight !== undefined && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <TrendingUp sx={{ color: 'warning.main', mt: 0.5 }} fontSize="small" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                      Weight
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {session.weight}%
                    </Typography>
                  </Box>
                </Box>
              )}

              <Divider />

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <CalendarToday sx={{ color: 'text.secondary', mt: 0.5 }} fontSize="small" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                    Scheduled Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(session.day).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Schedule sx={{ color: 'text.secondary', mt: 0.5 }} fontSize="small" />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                    Estimated Duration
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {session.estimated_hours} hours
                  </Typography>
                </Box>
              </Box>

              {session.actual_hours && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <AccessTime sx={{
                    color: session.actual_hours > session.estimated_hours ? 'warning.main' : 'success.main',
                    mt: 0.5
                  }} fontSize="small" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                      Actual Duration
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }} color={
                      session.actual_hours > session.estimated_hours ? 'warning.main' : 'success.main'
                    }>
                      {session.actual_hours.toFixed(2)} hours
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {session.actual_hours > session.estimated_hours
                        ? `${(session.actual_hours - session.estimated_hours).toFixed(2)}h over`
                        : `${(session.estimated_hours - session.actual_hours).toFixed(2)}h under`
                      }
                    </Typography>
                  </Box>
                </Box>
              )}

              {elapsedSeconds > 0 && !session.completed && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <AccessTime sx={{ color: 'info.main', mt: 0.5 }} fontSize="small" />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                      Current Elapsed
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600 }} color="info.main">
                      {(elapsedSeconds / 3600).toFixed(2)} hours
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Mascot & Tips Section */}
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              bgcolor: session.completed ? 'rgba(255, 255, 255, 0.6)' : 'primary.50',
              p: 2,
              borderRadius: 2
            }}>
              <Box sx={{ width: 80, height: 80, flexShrink: 0 }}>
                <Mascot key={`profile-mascot-${id}`} mood={timerActive ? 'studying' : 'happy'} size="small" animated />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{
                  fontWeight: 'bold',
                  color: session.completed ? 'secondary.dark' : 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  <Lightbulb fontSize="small" /> Remi's Study Tip
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  "{currentTip}"
                </Typography>
              </Box>
            </Box>

          </CardContent>
        </Card>

        {/* Timer Section */}
        <Card sx={{
          bgcolor: session.completed ? '#FFF3E0' : 'background.paper',
          transition: 'background-color 0.3s'
        }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: session.completed ? 'secondary.dark' : 'text.primary' }}>Study Timer</Typography>

            {!session.completed ? (
              <Box>
                {!timerActive ? (
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      Ready to start your study session?
                    </Typography>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<PlayArrow />}
                      onClick={handleStartSession}
                    >
                      Start Timer
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Timer
                      sessionId={id || ''}
                      onElapsedTimeChange={handleElapsedTimeChange}
                      onPomodoroCountChange={setPomodoroCount}
                      disabled={session.completed}
                    />

                    <Divider sx={{ my: 3 }} />

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        mb: 2,
                        '&:hover': { bgcolor: 'action.hover' },
                        p: 1,
                        borderRadius: 1
                      }}
                      onClick={() => setPomodoroExpanded(!pomodoroExpanded)}
                    >
                      <Typography variant="h6">🍅 Pomodoro Timer</Typography>
                      {pomodoroExpanded ? <ExpandLess /> : <ExpandMore />}
                    </Box>

                    {pomodoroExpanded && (
                      <PomodoroTimer
                        taskTitle={session.task_title}
                        learningStyle="visual"
                        studyTips={[
                          'Take regular breaks to maintain focus',
                          'Stay hydrated during study sessions',
                          'Review your notes after each pomodoro'
                        ]}
                      />
                    )}
                  </>
                )}

                <Divider sx={{ my: 3 }} />

                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={<CheckCircle />}
                    onClick={handleMarkComplete}
                    fullWidth
                  >
                    Mark as Complete
                  </Button>
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                    {elapsedSeconds > 0
                      ? `Elapsed: ${(elapsedSeconds / 3600).toFixed(2)} hours`
                      : `Will use estimated: ${session.estimated_hours} hours`
                    }
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6">Session Completed!</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                  Completed on {session.completed_at ? new Date(session.completed_at).toLocaleString() : 'Unknown'}
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleMarkIncomplete}
                  disabled={submitting}
                >
                  Mark as Incomplete
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Reflection Section - Collapsible */}
      <Card elevation={2} sx={{ mt: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              mb: reflectionExpanded ? 2 : 0,
              '&:hover': { bgcolor: 'action.hover' },
              p: 1,
              borderRadius: 1
            }}
            onClick={() => setReflectionExpanded(!reflectionExpanded)}
          >
            <Typography variant="h6">📝 Session Reflection</Typography>
            {reflectionExpanded ? <ExpandLess /> : <ExpandMore />}
          </Box>

          {reflectionExpanded && !session.completed && (
            <ReflectionEditor
              sessionId={id || ''}
              initialValue={reflection}
              onSave={(newReflection) => {
                setReflection(newReflection);
                setHasUnsavedChanges(true);
              }}
              disabled={false}
            />
          )}

          {reflectionExpanded && session.completed && session.reflection && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {session.reflection.what_learned && (
                <Box>
                  <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 600, mb: 0.5 }}>
                    What I learned
                  </Typography>
                  <Typography variant="body2" sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'success.light' }}>
                    {session.reflection.what_learned}
                  </Typography>
                </Box>
              )}
              {session.reflection.what_was_challenging && (
                <Box>
                  <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600, mb: 0.5 }}>
                    What was challenging
                  </Typography>
                  <Typography variant="body2" sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'warning.light' }}>
                    {session.reflection.what_was_challenging}
                  </Typography>
                </Box>
              )}
              {session.reflection.what_to_improve && (
                <Box>
                  <Typography variant="subtitle2" color="info.main" sx={{ fontWeight: 600, mb: 0.5 }}>
                    What to improve
                  </Typography>
                  <Typography variant="body2" sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'info.light' }}>
                    {session.reflection.what_to_improve}
                  </Typography>
                </Box>
              )}
              {session.reflection.reflection_text && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Additional thoughts
                  </Typography>
                  <Typography variant="body2" sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'grey.300' }}>
                    {session.reflection.reflection_text}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {reflectionExpanded && session.completed && !session.reflection && (
            <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
              No reflection was added for this session.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Completion Dialog */}
      <Dialog
        open={showCompletionDialog}
        onClose={() => {
          if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
          }
          setShowCompletionDialog(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Complete Study Session</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {/* Actual Duration Display */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
                Study Duration
              </Typography>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {(elapsedSeconds / 3600).toFixed(2)} hours
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Estimated: {session?.estimated_hours} hours
                  {elapsedSeconds > 0 && ` (${elapsedSeconds > (session?.estimated_hours || 0) * 3600 ? 'over' : 'under'} by ${Math.abs((elapsedSeconds / 3600) - (session?.estimated_hours || 0)).toFixed(2)}h)`}
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Reflection will be saved from the notes taken during the session */}
            <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
              Your session notes will be saved as reflection.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
              }
              setShowCompletionDialog(false);
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCompleteSession}
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} /> : <CheckCircle />}
          >
            {submitting ? 'Completing...' : 'Complete Session'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        message="Session completed successfully! Data synced to cloud."
      />
    </Container>
  );
};

export default SessionProfile;
