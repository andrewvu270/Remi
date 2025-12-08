import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  useTheme,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Timeline as TimelineIcon,
  EmojiEvents as TrophyIcon,
  Schedule as ScheduleIcon,
  Psychology as PsychologyIcon,
  LocalFireDepartment as FireIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  AutoAwesome as AutoAwesomeIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

interface AnalyticsData {
  weeklyProductivity: Array<{ day: string; hours: number; tasks: number; efficiency: number }>;
  taskDistribution: Array<{ type: string; count: number; color: string }>;
  stressTrends: Array<{ date: string; stress: number; burnout: number }>;
  focusPatterns: Array<{ hour: string; focus: number; energy: number }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    progress: number;
    maxProgress: number;
    unlocked: boolean;
  }>;
  performanceMetrics: {
    totalFocusTime: number;
    averageSessionLength: number;
    streakDays: number;
    productivityScore: number;
    weeklyGoal: number;
    weeklyProgress: number;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [animateCharts, setAnimateCharts] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
    // Trigger animations after data loads
    setTimeout(() => setAnimateCharts(true), 500);
  }, []);

  const loadAnalyticsData = async () => {
    setLoading(true);

    // Mock data - in real app, this would come from your backend
    const mockData: AnalyticsData = {
      weeklyProductivity: [
        { day: 'Mon', hours: 6.5, tasks: 8, efficiency: 85 },
        { day: 'Tue', hours: 7.2, tasks: 10, efficiency: 92 },
        { day: 'Wed', hours: 5.8, tasks: 7, efficiency: 78 },
        { day: 'Thu', hours: 8.1, tasks: 12, efficiency: 88 },
        { day: 'Fri', hours: 6.9, tasks: 9, efficiency: 91 },
        { day: 'Sat', hours: 4.2, tasks: 5, efficiency: 82 },
        { day: 'Sun', hours: 3.5, tasks: 4, efficiency: 75 },
      ],
      taskDistribution: [
        { type: 'Assignments', count: 45, color: '#1976d2' },
        { type: 'Study', count: 38, color: '#388e3c' },
        { type: 'Projects', count: 22, color: '#f57c00' },
        { type: 'Exams', count: 15, color: '#d32f2f' },
        { type: 'Research', count: 18, color: '#7b1fa2' },
      ],
      stressTrends: [
        { date: 'Mon', stress: 3, burnout: 2 },
        { date: 'Tue', stress: 5, burnout: 3 },
        { date: 'Wed', stress: 4, burnout: 3 },
        { date: 'Thu', stress: 6, burnout: 4 },
        { date: 'Fri', stress: 7, burnout: 5 },
        { date: 'Sat', stress: 2, burnout: 1 },
        { date: 'Sun', stress: 2, burnout: 1 },
      ],
      focusPatterns: [
        { hour: '8AM', focus: 65, energy: 80 },
        { hour: '10AM', focus: 85, energy: 90 },
        { hour: '12PM', focus: 70, energy: 60 },
        { hour: '2PM', focus: 75, energy: 65 },
        { hour: '4PM', focus: 80, energy: 70 },
        { hour: '6PM', focus: 60, energy: 50 },
        { hour: '8PM', focus: 55, energy: 45 },
      ],
      achievements: [
        {
          id: 'week_warrior',
          name: 'Week Warrior',
          description: '7-day productivity streak',
          progress: 7,
          maxProgress: 7,
          unlocked: true,
        },
        {
          id: 'focus_master',
          name: 'Focus Master',
          description: '50 hours of total focus time',
          progress: 42,
          maxProgress: 50,
          unlocked: false,
        },
        {
          id: 'task_hero',
          name: 'Task Hero',
          description: 'Complete 100 tasks',
          progress: 87,
          maxProgress: 100,
          unlocked: false,
        },
      ],
      performanceMetrics: {
        totalFocusTime: 42.5,
        averageSessionLength: 45,
        streakDays: 7,
        productivityScore: 86,
        weeklyGoal: 35,
        weeklyProgress: 42.2,
      },
    };

    setData(mockData);
    setLoading(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <AssessmentIcon sx={{ fontSize: 48, color: 'primary.main' }} />
        </motion.div>
      </Box>
    );
  }

  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Typography variant="body1" color="textSecondary">
            Track your productivity patterns and optimize your workflow
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tooltip title="Refresh Analytics">
            <IconButton onClick={loadAnalyticsData}>
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <RefreshIcon />
              </motion.div>
            </IconButton>
          </Tooltip>
        </motion.div>
      </Box>

      {/* Key Performance Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'Focus Time',
            value: `${data.performanceMetrics.totalFocusTime}h`,
            subtitle: 'This week',
            icon: <ScheduleIcon />,
            color: '#1976d2',
            progress: (data.performanceMetrics.totalFocusTime / 50) * 100,
          },
          {
            title: 'Productivity Score',
            value: `${data.performanceMetrics.productivityScore}%`,
            subtitle: 'Above average',
            icon: <TrendingUpIcon />,
            color: '#388e3c',
            progress: data.performanceMetrics.productivityScore,
          },
          {
            title: 'Current Streak',
            value: `${data.performanceMetrics.streakDays} days`,
            subtitle: 'Keep it going!',
            icon: <FireIcon />,
            color: '#f57c00',
            progress: (data.performanceMetrics.streakDays / 14) * 100,
          },
          {
            title: 'Weekly Goal',
            value: `${Math.round((data.performanceMetrics.weeklyProgress / data.performanceMetrics.weeklyGoal) * 100)}%`,
            subtitle: `${data.performanceMetrics.weeklyProgress}h / ${data.performanceMetrics.weeklyGoal}h`,
            icon: <TrophyIcon />,
            color: '#7b1fa2',
            progress: (data.performanceMetrics.weeklyProgress / data.performanceMetrics.weeklyGoal) * 100,
          },
        ].map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <Card sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: metric.color, mr: 2 }}>
                      {metric.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {metric.value}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {metric.subtitle}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {metric.title}
                  </Typography>

                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, metric.progress)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: metric.color,
                        borderRadius: 3,
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* AI Insights Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 }}
          >
            <Card sx={{ p: 3, position: 'relative', overflow: 'hidden', border: '2px solid #FFF3E0' }}>
              <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(90deg, #FFD700, #FFA500)' }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AutoAwesomeIcon sx={{ color: '#FFA500' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Remi's AI Insights
                </Typography>
                <Chip label="Beta" size="small" sx={{ height: 20, bgcolor: '#FFF3E0', color: '#E65100' }} />
              </Box>

              <Typography variant="body1" color="text.secondary" paragraph>
                Based on your recent study sessions, you're doing great at maintaining streaks! However, your late-night sessions seem to have lower focus scores.
              </Typography>

              <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LightbulbIcon fontSize="small" color="primary" />
                  Recommendation
                </Typography>
                <Typography variant="body2">
                  Try shifting your "Operating Systems" study block to 10:00 AM when your energy levels are reportedly highest.
                </Typography>
              </Box>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Weekly Productivity Chart */}
        <Grid item xs={12} md={8}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon color="primary" />
                  Weekly Productivity Trends
                </Typography>

                {animateCharts && (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data.weeklyProductivity}>
                      <defs>
                        <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1976d2" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#1976d2" stopOpacity={0.1} />
                        </linearGradient>
                        <linearGradient id="colorEfficiency" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#388e3c" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#388e3c" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" stroke="#666" />
                      <YAxis stroke="#666" />
                      <RechartsTooltip />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke="#1976d2"
                        fillOpacity={1}
                        fill="url(#colorHours)"
                        strokeWidth={2}
                        animationDuration={1500}
                      />
                      <Area
                        type="monotone"
                        dataKey="efficiency"
                        stroke="#388e3c"
                        fillOpacity={1}
                        fill="url(#colorEfficiency)"
                        strokeWidth={2}
                        animationDuration={1500}
                        animationBegin={300}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Task Distribution Chart */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssessmentIcon color="primary" />
                  Task Distribution
                </Typography>

                {animateCharts && (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.taskDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        animationDuration={1500}
                        animationBegin={500}
                      >
                        {data.taskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Stress Trends Chart */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PsychologyIcon color="primary" />
                  Stress & Burnout Trends
                </Typography>

                {animateCharts && (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data.stressTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#666" />
                      <YAxis stroke="#666" />
                      <RechartsTooltip />
                      <Line
                        type="monotone"
                        dataKey="stress"
                        stroke="#f57c00"
                        strokeWidth={3}
                        dot={{ fill: '#f57c00', r: 6 }}
                        animationDuration={1500}
                        animationBegin={700}
                      />
                      <Line
                        type="monotone"
                        dataKey="burnout"
                        stroke="#d32f2f"
                        strokeWidth={3}
                        dot={{ fill: '#d32f2f', r: 6 }}
                        animationDuration={1500}
                        animationBegin={900}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Focus Patterns Chart */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SpeedIcon color="primary" />
                  Daily Focus Patterns
                </Typography>

                {animateCharts && (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.focusPatterns}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="hour" stroke="#666" />
                      <YAxis stroke="#666" />
                      <RechartsTooltip />
                      <Bar
                        dataKey="focus"
                        fill="#1976d2"
                        radius={[8, 8, 0, 0]}
                        animationDuration={1500}
                        animationBegin={1100}
                      />
                      <Bar
                        dataKey="energy"
                        fill="#388e3c"
                        radius={[8, 8, 0, 0]}
                        animationDuration={1500}
                        animationBegin={1300}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Achievements Progress */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrophyIcon color="primary" />
                  Achievement Progress
                </Typography>

                <Grid container spacing={3}>
                  {data.achievements.map((achievement, index) => (
                    <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: achievement.unlocked ? 'success.light' : 'grey.50' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ bgcolor: achievement.unlocked ? 'success.main' : 'grey.400', mr: 2 }}>
                              <TrophyIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {achievement.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {achievement.description}
                              </Typography>
                            </Box>
                          </Box>

                          <Box sx={{ mb: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="textSecondary">
                                Progress
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {achievement.progress}/{achievement.maxProgress}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={(achievement.progress / achievement.maxProgress) * 100}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: achievement.unlocked ? 'success.main' : 'primary.main',
                                  borderRadius: 3,
                                }
                              }}
                            />
                          </Box>

                          {achievement.unlocked && (
                            <Chip
                              label="Unlocked!"
                              size="small"
                              color="success"
                              variant="filled"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </motion.div>
  );
};

export default AnalyticsDashboard;
