import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  PriorityHigh as PriorityHighIcon,
} from '@mui/icons-material';
import { fetchAllTasks } from '../utils/taskStorage';

interface StressMetrics {
  overall_stress_level: 'low' | 'medium' | 'high';
  daily_stress: {
    date: string;
    stress_level: 'low' | 'medium' | 'high';
    total_hours: number;
    task_count: number;
  }[];
  burnout_risk: 'low' | 'medium' | 'high';
  recommendations: string[];
  warning_signs: string[];
}

const StressVisualization: React.FC = () => {
  const [metrics, setMetrics] = useState<StressMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStressMetrics();
  }, []);

  const loadStressMetrics = async () => {
    try {
      setLoading(true);
      const data = await fetchAllTasks();
      const tasks = data.tasks || [];
      
      if (tasks.length === 0) {
        setMetrics({
          overall_stress_level: 'low',
          daily_stress: [],
          burnout_risk: 'low',
          recommendations: ['Start by adding some tasks to see stress metrics'],
          warning_signs: [],
        });
        return;
      }

      // Get enhanced tasks with stress predictions
      const pendingTasks = tasks.filter(task => task.status !== 'completed');
      
      // Calculate stress metrics for the next 7 days
      const today = new Date();
      const dailyStress = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTasks = pendingTasks.filter(task => {
          const taskDate = new Date(task.due_date);
          return taskDate.toISOString().split('T')[0] === dateStr;
        });
        
        const totalHours = dayTasks.reduce((sum, task) => sum + (task.predicted_hours || 0), 0);
        const taskCount = dayTasks.length;
        
        let stressLevel: 'low' | 'medium' | 'high' = 'low';
        if (totalHours > 8 || taskCount > 3) stressLevel = 'high';
        else if (totalHours > 4 || taskCount > 1) stressLevel = 'medium';
        
        dailyStress.push({
          date: dateStr,
          stress_level: stressLevel,
          total_hours: totalHours,
          task_count: taskCount,
        });
      }

      // Calculate overall stress level
      const highStressDays = dailyStress.filter(d => d.stress_level === 'high').length;
      const mediumStressDays = dailyStress.filter(d => d.stress_level === 'medium').length;
      
      let overallStress: 'low' | 'medium' | 'high' = 'low';
      if (highStressDays >= 3) overallStress = 'high';
      else if (highStressDays >= 1 || mediumStressDays >= 3) overallStress = 'medium';

      // Calculate burnout risk
      const totalHours = dailyStress.reduce((sum, day) => sum + day.total_hours, 0);
      const avgHoursPerDay = totalHours / 7;
      
      let burnoutRisk: 'low' | 'medium' | 'high' = 'low';
      if (avgHoursPerDay > 8 || highStressDays >= 4) burnoutRisk = 'high';
      else if (avgHoursPerDay > 6 || highStressDays >= 2) burnoutRisk = 'medium';

      // Generate recommendations
      const recommendations = [];
      const warningSigns = [];

      if (overallStress === 'high') {
        recommendations.push('Consider rescheduling some tasks to reduce workload');
        recommendations.push('Take regular breaks and practice stress management');
        warningSigns.push('High workload detected - risk of burnout');
      } else if (overallStress === 'medium') {
        recommendations.push('Monitor your workload carefully');
        recommendations.push('Consider prioritizing high-impact tasks');
      } else {
        recommendations.push('Maintain your current study schedule');
        recommendations.push('Stay ahead by starting tasks early');
      }

      if (burnoutRisk === 'high') {
        recommendations.push('Take a day off to recharge');
        recommendations.push('Speak with a counselor or advisor');
        warningSigns.push('High burnout risk - immediate action recommended');
      } else if (burnoutRisk === 'medium') {
        recommendations.push('Ensure you have adequate rest time');
        warningSigns.push('Moderate burnout risk - monitor closely');
      }

      if (highStressDays > 0) {
        const highStressDates = dailyStress
          .filter(d => d.stress_level === 'high')
          .map(d => new Date(d.date).toLocaleDateString())
          .join(', ');
        warningSigns.push(`High stress days: ${highStressDates}`);
      }

      setMetrics({
        overall_stress_level: overallStress,
        daily_stress: dailyStress,
        burnout_risk: burnoutRisk,
        recommendations: recommendations,
        warning_signs: warningSigns,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stress metrics');
    } finally {
      setLoading(false);
    }
  };

  const getStressColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return '#4caf50';
      case 'medium': return '#ff9800';
      case 'high': return '#f44336';
      default: return '#757575';
    }
  };

  const getStressIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return <CheckCircleIcon color="success" />;
      case 'medium': return <WarningIcon color="warning" />;
      case 'high': return <PriorityHighIcon color="error" />;
      default: return null;
    }
  };

  const getStressProgress = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 33;
      case 'medium': return 66;
      case 'high': return 100;
      default: return 0;
    }
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

  if (!metrics) return null;

  return (
    <Box>
      {/* Overall Stress Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Overall Stress
                </Typography>
                {getStressIcon(metrics.overall_stress_level)}
              </Box>
              <LinearProgress
                variant="determinate"
                value={getStressProgress(metrics.overall_stress_level)}
                sx={{
                  mb: 2,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getStressColor(metrics.overall_stress_level),
                  }
                }}
              />
              <Chip
                label={metrics.overall_stress_level.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: getStressColor(metrics.overall_stress_level),
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Burnout Risk
                </Typography>
                {metrics.burnout_risk === 'high' ? (
                  <PriorityHighIcon color="error" />
                ) : metrics.burnout_risk === 'medium' ? (
                  <WarningIcon color="warning" />
                ) : (
                  <CheckCircleIcon color="success" />
                )}
              </Box>
              <LinearProgress
                variant="determinate"
                value={getStressProgress(metrics.burnout_risk)}
                sx={{
                  mb: 2,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getStressColor(metrics.burnout_risk),
                  }
                }}
              />
              <Chip
                label={metrics.burnout_risk.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: getStressColor(metrics.burnout_risk),
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                7-Day Outlook
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {metrics.daily_stress.slice(0, 5).map((day, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ minWidth: 80 }}>
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={getStressProgress(day.stress_level)}
                      sx={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: getStressColor(day.stress_level),
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ minWidth: 30 }}>
                      {day.task_count}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Warnings and Recommendations */}
      <Grid container spacing={3}>
        {metrics.warning_signs.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <WarningIcon color="error" />
                  Warning Signs
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {metrics.warning_signs.map((warning, index) => (
                    <Alert key={index} severity="warning" sx={{ py: 1 }}>
                      {warning}
                    </Alert>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="success" />
                Recommendations
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {metrics.recommendations.map((recommendation, index) => (
                  <Alert key={index} severity="info" sx={{ py: 1 }}>
                    {recommendation}
                  </Alert>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StressVisualization;
