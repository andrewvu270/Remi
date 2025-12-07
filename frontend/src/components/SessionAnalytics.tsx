import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  TrendingUp,
  Schedule,
  Timer,
  CheckCircle,
  Psychology,
  Lightbulb,
  Star
} from '@mui/icons-material';
import { API_BASE_URL } from '../config/api';

interface AnalyticsProps {
  userId?: string;
  timeRange?: 'week' | 'month' | 'all';
}

interface Insight {
  type: 'pattern' | 'strength' | 'improvement' | 'prediction';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  data_points?: string[];
}

interface AnalyticsData {
  total_sessions: number;
  total_hours: number;
  average_duration: number;
  completion_rate: number;
  time_of_day_distribution: Record<string, number>;
  time_effectiveness: Record<string, number>;
  most_productive_time: string;
  estimation_accuracy: number;
  pomodoro_usage_rate: number;
  ai_analysis: {
    insights: Insight[];
    predictions: {
      optimal_study_time: string;
      recommended_session_length: number;
      estimated_weekly_capacity: number;
      stress_level_trend: string;
    };
    patterns: {
      underestimation_bias?: number;
      overestimation_bias?: number;
      consistency_score?: number;
      pomodoro_effectiveness?: number;
    };
    model: string;
  };
}

const SessionAnalytics: React.FC<AnalyticsProps> = ({ timeRange = 'week' }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTimeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${API_BASE_URL}/api/study-habits/analyze?time_range=${selectedTimeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${token || ''}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const result = await response.json();
      setData(result.analysis);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return <Psychology />;
      case 'strength': return <Star />;
      case 'improvement': return <TrendingUp />;
      case 'prediction': return <Lightbulb />;
      default: return <Lightbulb />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern': return 'info';
      case 'strength': return 'success';
      case 'improvement': return 'warning';
      case 'prediction': return 'primary';
      default: return 'default';
    }
  };

  const formatTimeOfDay = (time: string) => {
    const times: Record<string, string> = {
      morning: '🌅 Morning (5AM-12PM)',
      afternoon: '☀️ Afternoon (12PM-5PM)',
      evening: '🌆 Evening (5PM-9PM)',
      night: '🌙 Night (9PM-5AM)'
    };
    return times[time] || time;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!data || data.total_sessions === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          No study data available
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Complete some study sessions to see your analytics
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Study Analytics
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={selectedTimeRange}
            label="Time Range"
            onChange={(e) => setSelectedTimeRange(e.target.value as 'week' | 'month' | 'all')}
          >
            <MenuItem value="week">This Week</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="all">All Time</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Schedule sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="body2" color="textSecondary">Total Sessions</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {data.total_sessions}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Timer sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="body2" color="textSecondary">Total Hours</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {data.total_hours.toFixed(1)}h
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CheckCircle sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="body2" color="textSecondary">Completion Rate</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {(data.completion_rate * 100).toFixed(0)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="body2" color="textSecondary">Accuracy</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {(data.estimation_accuracy * 100).toFixed(0)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* AI Insights */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Psychology sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">AI-Powered Insights</Typography>
              <Chip 
                label={`Powered by ${data.ai_analysis.model}`} 
                size="small" 
                sx={{ ml: 2 }} 
              />
            </Box>
            
            {data.ai_analysis.insights.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.ai_analysis.insights.map((insight, index) => (
                  <Card key={index} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ color: `${getInsightColor(insight.type)}.main`, mt: 0.5 }}>
                          {getInsightIcon(insight.type)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                              {insight.title}
                            </Typography>
                            <Chip 
                              label={`${(insight.confidence * 100).toFixed(0)}% confidence`}
                              size="small"
                              color={getInsightColor(insight.type) as any}
                            />
                          </Box>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            {insight.description}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                            💡 {insight.recommendation}
                          </Typography>
                          {insight.data_points && insight.data_points.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="textSecondary">
                                Based on: {insight.data_points.join(', ')}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Alert severity="info">
                Complete more study sessions to unlock AI-powered insights!
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Predictions & Patterns */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Predictions</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="textSecondary">Optimal Study Time</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {formatTimeOfDay(data.ai_analysis.predictions.optimal_study_time)}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="textSecondary">Recommended Session Length</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {data.ai_analysis.predictions.recommended_session_length}h
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="textSecondary">Weekly Capacity</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {data.ai_analysis.predictions.estimated_weekly_capacity}h
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="body2" color="textSecondary">Stress Trend</Typography>
                <Chip 
                  label={data.ai_analysis.predictions.stress_level_trend}
                  size="small"
                  color={
                    data.ai_analysis.predictions.stress_level_trend === 'decreasing' ? 'success' :
                    data.ai_analysis.predictions.stress_level_trend === 'increasing' ? 'error' : 'default'
                  }
                />
              </Box>
            </Box>
          </Paper>

          {/* Time Effectiveness */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Time Effectiveness</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(data.time_effectiveness).map(([time, effectiveness]) => (
                <Box key={time}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">{formatTimeOfDay(time)}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {(effectiveness * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(100, effectiveness * 100)}
                    color={effectiveness > 1 ? 'success' : effectiveness > 0.8 ? 'warning' : 'error'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SessionAnalytics;
