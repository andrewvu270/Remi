import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
  IconButton,
} from '@mui/material';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
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
  started_at?: string;
  completed_at?: string;
  course_code?: string;
}

const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      // Guest mode: Load from localStorage
      if (!token) {
        const storedPlan = localStorage.getItem('studyPlan'); // Changed from 'study_plan' to 'studyPlan'
        if (storedPlan) {
          try {
            const plan = JSON.parse(storedPlan);
            const allSessions = plan.sessions || [];

            // Deduplicate sessions by ID
            const uniqueSessions = Array.from(
              new Map(allSessions.map((s: any) => [s.id, s])).values()
            ) as Session[];

            // Apply filter
            let filteredSessions = uniqueSessions;
            if (filter === 'active') {
              filteredSessions = uniqueSessions.filter((s: Session) => !s.completed);
            } else if (filter === 'completed') {
              filteredSessions = uniqueSessions.filter((s: Session) => s.completed);
            }

            setSessions(filteredSessions);
          } catch (e) {
            console.error('Failed to parse stored plan:', e);
            setSessions([]);
          }
        } else {
          setSessions([]);
        }
        setError(null);
        setLoading(false);
        return;
      }

      // Authenticated mode: Load from backend
      const response = await fetch(`${API_BASE_URL}/api/sessions?status=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, fall back to guest mode
          localStorage.removeItem('access_token');
          await fetchSessions(); // Retry as guest
        } else {
          throw new Error('Failed to fetch sessions');
        }
        return;
      }

      const data = await response.json();
      setSessions(data.sessions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const groupSessionsByDate = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const groups = {
      today: [] as Session[],
      tomorrow: [] as Session[],
      thisWeek: [] as Session[],
      later: [] as Session[]
    };

    sessions.forEach(session => {
      const sessionDate = new Date(session.day);
      const sessionDay = new Date(sessionDate.getFullYear(), sessionDate.getMonth(), sessionDate.getDate());

      if (sessionDay.getTime() === today.getTime()) {
        groups.today.push(session);
      } else if (sessionDay.getTime() === tomorrow.getTime()) {
        groups.tomorrow.push(session);
      } else if (sessionDay < weekFromNow) {
        groups.thisWeek.push(session);
      } else {
        groups.later.push(session);
      }
    });

    return groups;
  };

  const sortSessions = (sessionList: Session[]) => {
    return [...sessionList].sort((a, b) => {
      // Default sort by date
      return new Date(a.day).getTime() - new Date(b.day).getTime();
    });
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'error';
    if (priority >= 6) return 'warning';
    return 'success';
  };

  const toggleSessionComplete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to session detail

    console.log('Toggling session:', sessionId);

    const token = localStorage.getItem('access_token');

    // Guest mode: Update localStorage
    if (!token) {
      const storedPlan = localStorage.getItem('studyPlan');
      if (storedPlan) {
        try {
          const plan = JSON.parse(storedPlan);

          // Find the specific session to toggle
          const targetSession = plan.sessions.find((s: Session) => s.id === sessionId);
          if (!targetSession) {
            console.error('Session not found:', sessionId);
            return;
          }

          console.log('Current session state:', targetSession.completed);
          const newCompletedState = !targetSession.completed;

          // Update only the specific session
          const updatedSessions = plan.sessions.map((s: Session) => {
            if (s.id === sessionId) {
              console.log('Updating session', s.id, 'to completed:', newCompletedState);

              if (newCompletedState) {
                // Marking as complete - use estimated hours if no actual hours
                return {
                  ...s,
                  completed: true,
                  completed_at: new Date().toISOString(),
                  actual_hours: s.actual_hours || s.estimated_hours
                };
              } else {
                // Marking as incomplete - reset all completion data
                return {
                  ...s,
                  completed: false,
                  completed_at: undefined,
                  actual_hours: undefined,
                  reflection: undefined,
                  pomodoro_count: 0
                };
              }
            }
            return s;
          });

          const updatedPlan = { ...plan, sessions: updatedSessions };
          localStorage.setItem('studyPlan', JSON.stringify(updatedPlan));
          localStorage.setItem('studyPlanTimestamp', Date.now().toString());

          // Reload sessions from localStorage to ensure consistency
          fetchSessions();
        } catch (error) {
          console.error('Failed to update session:', error);
        }
      }
      return;
    }

    // Authenticated mode: Update backend
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completed: !session.completed
        })
      });

      if (response.ok) {
        // Update local state
        setSessions(prevSessions =>
          prevSessions.map(s =>
            s.id === sessionId
              ? { ...s, completed: !s.completed, completed_at: !s.completed ? new Date().toISOString() : undefined }
              : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  const renderSessionGroup = (title: string, sessionList: Session[]) => {
    if (sessionList.length === 0) return null;

    const sorted = sortSessions(sessionList);

    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.875rem' }}>
          {title} ({sessionList.length})
        </Typography>
        <Box sx={{ display: 'grid', gap: 2 }}>
          {sorted.map(session => (
            <Paper
              key={session.id}
              elevation={0}
              onClick={() => navigate(`/sessions/${session.id}`)}
              sx={{
                p: 2,
                borderRadius: '16px',
                bgcolor: session.completed ? '#FFF3E0' : 'background.paper', // Beige for completed
                border: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 24px -10px rgba(0, 0, 0, 0.1)',
                  borderColor: 'primary.light',
                }
              }}
            >
              {/* Left Stripe for Priority/Status indicator could go here */}
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => toggleSessionComplete(session.id, e)}
                      sx={{
                        color: session.completed ? 'secondary.main' : 'text.disabled',
                        p: 0.5,
                        '&:hover': { color: session.completed ? 'secondary.dark' : 'primary.main' }
                      }}
                    >
                      {session.completed ? <CheckCircle fontSize="small" /> : <RadioButtonUnchecked fontSize="small" />}
                    </IconButton>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 600,
                        textDecoration: session.completed ? 'line-through' : 'none',
                        color: session.completed ? 'secondary.dark' : 'text.primary'
                      }}
                    >
                      {session.task_title}
                    </Typography>
                    {session.course_code && (
                      <Chip
                        label={session.course_code}
                        size="small"
                        sx={{
                          height: 24,
                          bgcolor: 'primary.50',
                          color: 'primary.main',
                          fontWeight: 600,
                          fontSize: '0.75rem'
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2, ml: 4.5 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      📅 {new Date(session.day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      ⏱️ {session.actual_hours || session.estimated_hours}h
                    </Typography>
                    {session.pomodoro_count > 0 && (
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        🍅 {session.pomodoro_count}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Status Badge/Action icon (Chevron) could go here */}
            </Paper>
          ))}
        </Box>
      </Box>
    );
  };

  const grouped = groupSessionsByDate();

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
          Study Sessions
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Track and manage your study sessions
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper
        sx={{
          p: 3,
          mb: 4,
          borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs value={filter} onChange={(_, v) => setFilter(v)}>
            <Tab label="All" value="all" />
            <Tab label="Active" value="active" />
            <Tab label="Completed" value="completed" />
          </Tabs>


        </Box>
      </Paper>

      {sessions.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
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
            ⏱️
          </Typography>
          <Typography variant="h6" color="textSecondary">
            No sessions found
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Generate a study plan on the Schedule page to create sessions
          </Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => navigate('/schedule')}
          >
            Go to Schedule
          </Button>
        </Paper>
      ) : (
        <>
          {renderSessionGroup('Today', grouped.today)}
          {renderSessionGroup('Tomorrow', grouped.tomorrow)}
          {renderSessionGroup('This Week', grouped.thisWeek)}
          {renderSessionGroup('Later', grouped.later)}
        </>
      )}
    </Container >
  );
};

export default Sessions;
