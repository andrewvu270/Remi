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
import { PlayArrow, CheckCircle, ArrowBack } from '@mui/icons-material';
import Timer from '../components/Timer';
import ReflectionEditor from '../components/ReflectionEditor';
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
  const [timerActive, setTimerActive] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [actualHours, setActualHours] = useState(0);
  const [actualMinutes, setActualMinutes] = useState(0);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [reflection, setReflection] = useState({
    reflection_text: '',
    what_learned: '',
    what_was_challenging: '',
    what_to_improve: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const handleStartSession = async () => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/api/sessions/${id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          start_time: new Date().toISOString()
        })
      });
      
      setTimerActive(true);
    } catch (err) {
      setError('Failed to start session');
    }
  };

  const handleTimerComplete = () => {
    setTimerActive(false);
    // Pre-fill with estimated time
    const hours = Math.floor(session?.estimated_hours || 0);
    const minutes = Math.round(((session?.estimated_hours || 0) % 1) * 60);
    setActualHours(hours);
    setActualMinutes(minutes);
    setShowCompletionDialog(true);
  };

  const handleCompleteSession = async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      
      const totalHours = actualHours + (actualMinutes / 60);
      
      const response = await fetch(`${API_BASE_URL}/api/sessions/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({
          actual_hours: totalHours,
          reflection: reflection.reflection_text,
          completed_at: new Date().toISOString(),
          pomodoro_count: pomodoroCount,
          what_learned: reflection.what_learned,
          what_was_challenging: reflection.what_was_challenging,
          what_to_improve: reflection.what_to_improve
        })
      });

      if (!response.ok) throw new Error('Failed to complete session');
      
      setShowCompletionDialog(false);
      setShowSuccess(true);
      
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
            📅 {new Date(session.day).toLocaleDateString()}
          </Typography>
          <Chip
            label={`Priority: ${session.priority}`}
            color={getPriorityColor(session.priority)}
            size="small"
          />
          {session.completed && (
            <Chip label="Completed" color="success" icon={<CheckCircle />} />
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
        {/* Session Details */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Session Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">Estimated Duration</Typography>
                <Typography variant="h6">{session.estimated_hours} hours</Typography>
              </Box>
              
              {session.actual_hours && (
                <Box>
                  <Typography variant="body2" color="textSecondary">Actual Duration</Typography>
                  <Typography variant="h6">{session.actual_hours.toFixed(2)} hours</Typography>
                </Box>
              )}
              
              {session.pomodoro_count > 0 && (
                <Box>
                  <Typography variant="body2" color="textSecondary">Pomodoros Completed</Typography>
                  <Typography variant="h6">🍅 {session.pomodoro_count}</Typography>
                </Box>
              )}
              
              {session.notes && (
                <Box>
                  <Typography variant="body2" color="textSecondary">Notes</Typography>
                  <Typography variant="body1">{session.notes}</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Timer Section */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Study Timer</Typography>
            
            {!session.completed ? (
              !timerActive ? (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    Ready to start your study session?
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<PlayArrow />}
                    onClick={handleStartSession}
                  >
                    Start Session
                  </Button>
                </Box>
              ) : (
                <Timer
                  initialSeconds={session.estimated_hours * 3600}
                  pomodoroMode={session.pomodoro_enabled}
                  onComplete={handleTimerComplete}
                  onTick={() => {}}
                  onPomodoroIntervalChange={(type, count) => {
                    if (type === 'work') {
                      setPomodoroCount(count);
                    }
                  }}
                />
              )
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                <Typography variant="h6">Session Completed!</Typography>
                <Typography variant="body2" color="textSecondary">
                  Completed on {session.completed_at ? new Date(session.completed_at).toLocaleString() : 'Unknown'}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Reflection Section (if completed) */}
      {session.completed && session.reflection && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Session Reflection</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {session.reflection.what_learned && (
                <Box>
                  <Typography variant="subtitle2" color="success.main" sx={{ fontWeight: 600 }}>
                    💡 What I learned:
                  </Typography>
                  <Typography variant="body2">{session.reflection.what_learned}</Typography>
                </Box>
              )}
              {session.reflection.what_was_challenging && (
                <Box>
                  <Typography variant="subtitle2" color="warning.main" sx={{ fontWeight: 600 }}>
                    🤔 What was challenging:
                  </Typography>
                  <Typography variant="body2">{session.reflection.what_was_challenging}</Typography>
                </Box>
              )}
              {session.reflection.what_to_improve && (
                <Box>
                  <Typography variant="subtitle2" color="info.main" sx={{ fontWeight: 600 }}>
                    🎯 What to improve:
                  </Typography>
                  <Typography variant="body2">{session.reflection.what_to_improve}</Typography>
                </Box>
              )}
              {session.reflection.reflection_text && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    📝 Additional thoughts:
                  </Typography>
                  <Typography variant="body2">{session.reflection.reflection_text}</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Completion Dialog */}
      <Dialog 
        open={showCompletionDialog} 
        onClose={() => setShowCompletionDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Complete Study Session</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            {/* Actual Duration Input */}
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                How long did you actually study?
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Hours"
                  type="number"
                  value={actualHours}
                  onChange={(e) => setActualHours(Math.max(0, Math.min(12, parseInt(e.target.value) || 0)))}
                  inputProps={{ min: 0, max: 12 }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label="Minutes"
                  type="number"
                  value={actualMinutes}
                  onChange={(e) => setActualMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  inputProps={{ min: 0, max: 59 }}
                  sx={{ flex: 1 }}
                />
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Estimated: {session.estimated_hours} hours
              </Typography>
            </Box>
            
            <Divider />
            
            {/* Reflection Editor */}
            <ReflectionEditor
              sessionId={id || ''}
              initialValue={reflection}
              onSave={setReflection}
              disabled={submitting}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCompletionDialog(false)} disabled={submitting}>
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
