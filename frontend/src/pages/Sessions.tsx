import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { BarChart } from '@mui/icons-material';
import SessionAnalytics from '../components/SessionAnalytics';
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
}

const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date');
  const [showAnalytics, setShowAnalytics] = useState(false);
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
            
            // Apply filter
            let filteredSessions = allSessions;
            if (filter === 'active') {
              filteredSessions = allSessions.filter((s: Session) => !s.completed);
            } else if (filter === 'completed') {
              filteredSessions = allSessions.filter((s: Session) => s.completed);
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
      if (sortBy === 'priority') {
        return b.priority - a.priority;
      }
      return new Date(a.day).getTime() - new Date(b.day).getTime();
    });
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'error';
    if (priority >= 6) return 'warning';
    return 'success';
  };

  const renderSessionGroup = (title: string, sessionList: Session[]) => {
    if (sessionList.length === 0) return null;

    const sorted = sortSessions(sessionList);

    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          {title} ({sessionList.length})
        </Typography>
        <List>
          {sorted.map(session => (
            <ListItem key={session.id} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                onClick={() => navigate(`/sessions/${session.id}`)}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                        {session.task_title}
                      </Typography>
                      {session.completed && (
                        <Chip label="Completed" size="small" color="success" />
                      )}
                      {session.pomodoro_count > 0 && (
                        <Chip label={`🍅 ${session.pomodoro_count}`} size="small" />
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                      <Typography variant="body2" color="textSecondary">
                        📅 {new Date(session.day).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        ⏱️ {session.actual_hours || session.estimated_hours}h
                        {session.actual_hours && ` (est: ${session.estimated_hours}h)`}
                      </Typography>
                      <Chip
                        label={`Priority: ${session.priority}`}
                        size="small"
                        color={getPriorityColor(session.priority)}
                      />
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
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
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
            Study Sessions
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Track and manage your study sessions
          </Typography>
        </Box>
        <Button
          variant={showAnalytics ? 'contained' : 'outlined'}
          startIcon={<BarChart />}
          onClick={() => setShowAnalytics(!showAnalytics)}
        >
          {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {showAnalytics && (
        <Box sx={{ mb: 4 }}>
          <SessionAnalytics />
        </Box>
      )}

      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          <Tabs value={filter} onChange={(_, v) => setFilter(v)}>
            <Tab label="All" value="all" />
            <Tab label="Active" value="active" />
            <Tab label="Completed" value="completed" />
          </Tabs>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              label="Sort By"
              onChange={(e) => setSortBy(e.target.value as 'date' | 'priority')}
            >
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="priority">Priority</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {sessions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
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
    </Container>
  );
};

export default Sessions;
