import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Avatar,
  Chip,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Timer as TimerIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  LocalFireDepartment as FireIcon,
  EmojiEvents as TrophyIcon,
  Bolt as EnergyIcon,
  WorkspacePremium as PremiumIcon,
  AutoAwesome as CelebrateIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface PomodoroTimerProps {
  taskTitle: string;
  learningStyle: string;
  studyTips: string[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconType: 'star' | 'fire' | 'trophy' | 'energy';
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

interface PomodoroStats {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  taskTitle,
  learningStyle,
  studyTips
}) => {
  const theme = useTheme();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');
  const [streak, setStreak] = useState(0);
  const [showTip, setShowTip] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [energyLevel, setEnergyLevel] = useState(100);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<PomodoroStats>({
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
    longestStreak: 0,
    weeklyGoal: 20,
    weeklyProgress: 0
  });
  const [level, setLevel] = useState(1);
  const [experience, setExperience] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const focusTime = 25 * 60; // 25 minutes
  const shortBreak = 5 * 60; // 5 minutes
  const longBreak = 15 * 60; // 15 minutes



  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
        // Energy decreases slowly during focus sessions
        if (sessionType === 'focus' && timeLeft % 60 === 0) {
          setEnergyLevel(prev => Math.max(0, prev - 2));
        }
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  // Load stats and achievements from localStorage
  useEffect(() => {
    const savedStats = localStorage.getItem('pomodoroStats');
    const savedAchievements = localStorage.getItem('pomodoroAchievements');
    const savedLevel = localStorage.getItem('pomodoroLevel');
    const savedExp = localStorage.getItem('pomodoroExp');

    if (savedStats) setStats(JSON.parse(savedStats));
    if (savedAchievements) setAchievements(JSON.parse(savedAchievements));
    if (savedLevel) setLevel(parseInt(savedLevel));
    if (savedExp) setExperience(parseInt(savedExp));
  }, []);

  // Initialize default achievements
  useEffect(() => {
    if (achievements.length === 0) {
      const defaultAchievements: Achievement[] = [
        {
          id: 'first_session',
          name: 'First Focus',
          description: 'Complete your first focus session',
          iconType: 'star',
          unlocked: false,
          progress: 0,
          maxProgress: 1
        },
        {
          id: 'streak_warrior',
          name: 'Streak Warrior',
          description: 'Complete 5 sessions in a row',
          iconType: 'fire',
          unlocked: false,
          progress: 0,
          maxProgress: 5
        },
        {
          id: 'focus_master',
          name: 'Focus Master',
          description: 'Complete 50 total sessions',
          iconType: 'trophy',
          unlocked: false,
          progress: 0,
          maxProgress: 50
        },
        {
          id: 'energy_champion',
          name: 'Energy Champion',
          description: 'Maintain high energy for 10 sessions',
          iconType: 'energy',
          unlocked: false,
          progress: 0,
          maxProgress: 10
        }
      ];
      setAchievements(defaultAchievements);
    }
  }, []);

  const handleSessionComplete = () => {
    setIsRunning(false);

    if (sessionType === 'focus') {
      const newStreak = streak + 1;
      const experienceGained = 25 + (newStreak > 3 ? 10 : 0); // Bonus XP for streaks
      const newExperience = experience + experienceGained;
      const newLevel = Math.floor(newExperience / 100) + 1;

      setStreak(newStreak);
      setExperience(newExperience);

      // Check for level up
      if (newLevel > level) {
        setLevel(newLevel);
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }

      // Update stats
      const newStats = {
        ...stats,
        totalSessions: stats.totalSessions + 1,
        totalMinutes: stats.totalMinutes + 25,
        currentStreak: newStreak,
        longestStreak: Math.max(stats.longestStreak, newStreak),
        weeklyProgress: stats.weeklyProgress + 1
      };
      setStats(newStats);
      localStorage.setItem('pomodoroStats', JSON.stringify(newStats));
      localStorage.setItem('pomodoroExp', newExperience.toString());
      localStorage.setItem('pomodoroLevel', newLevel.toString());

      // Check achievements
      checkAndUnlockAchievements(newStats, newStreak);

      // Determine break length
      if (newStreak % 4 === 0) {
        setSessionType('break');
        setTimeLeft(longBreak);
        // Restore energy on long break
        setEnergyLevel(prev => Math.min(100, prev + 30));
      } else {
        setSessionType('break');
        setTimeLeft(shortBreak);
        // Small energy restore on short break
        setEnergyLevel(prev => Math.min(100, prev + 10));
      }

      // Show celebration for milestones
      if (newStreak % 4 === 0 || newStreak === 1) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }
    } else {
      setSessionType('focus');
      setTimeLeft(focusTime);
      // Energy boost after break
      setEnergyLevel(prev => Math.min(100, prev + 20));
    }
  };

  const checkAndUnlockAchievements = (newStats: PomodoroStats, currentStreak: number) => {
    const updatedAchievements = achievements.map(achievement => {
      if (achievement.unlocked) return achievement;

      let newProgress = achievement.progress;
      let shouldUnlock = false;

      switch (achievement.id) {
        case 'first_session':
          newProgress = Math.min(achievement.maxProgress, newStats.totalSessions);
          shouldUnlock = newStats.totalSessions >= 1;
          break;
        case 'streak_warrior':
          newProgress = Math.min(achievement.maxProgress, currentStreak);
          shouldUnlock = currentStreak >= 5;
          break;
        case 'focus_master':
          newProgress = Math.min(achievement.maxProgress, newStats.totalSessions);
          shouldUnlock = newStats.totalSessions >= 50;
          break;
        case 'energy_champion':
          newProgress = Math.min(achievement.maxProgress, newStats.totalSessions);
          shouldUnlock = newStats.totalSessions >= 10 && energyLevel > 70;
          break;
      }

      if (shouldUnlock && !achievement.unlocked) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 2000);
      }

      return {
        ...achievement,
        progress: newProgress,
        unlocked: shouldUnlock
      };
    });

    setAchievements(updatedAchievements);
    localStorage.setItem('pomodoroAchievements', JSON.stringify(updatedAchievements));
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setSessionType('focus');
    setTimeLeft(focusTime);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    const total = sessionType === 'focus' ? focusTime : (streak % 4 === 3 ? longBreak : shortBreak);
    return ((total - timeLeft) / total) * 100;
  };

  const getSessionColor = (): string => {
    if (sessionType === 'focus') {
      return theme.palette.primary.main;
    }
    return theme.palette.success.main;
  };



  const getStyleSpecificTip = (): string => {
    const tips = {
      visual: "🎨 Try drawing a diagram to visualize the concept",
      reading: "📚 Take structured notes with key highlights",
      hands_on: "🔧 Practice with a concrete example",
      auditory: "🎧 Explain the concept out loud to yourself"
    };

    return tips[learningStyle as keyof typeof tips] || "💡 Stay focused on your learning goal";
  };

  return (
    <>
      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            transition={{ type: "spring", duration: 0.5 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999
            }}
          >
            <Card sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, #FFD700, #FFA500)' }}>
              <CelebrateIcon sx={{ fontSize: 48, color: 'white', mb: 1 }} />
              <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                Level Up! {level}
              </Typography>
              <Typography variant="body1" sx={{ color: 'white' }}>
                You've reached level {level}!
              </Typography>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebration Animation */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              zIndex: 9998
            }}
          >
            <Card sx={{ p: 2, bgcolor: 'success.light' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrophyIcon color="success" />
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {streak === 1 ? 'First session complete!' : `${streak} session streak!`}
                </Typography>
              </Box>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card sx={{ mb: 2, border: `2px solid ${getSessionColor()}`, position: 'relative', overflow: 'visible' }}>
          {/* Energy Bar */}
          <Box sx={{ position: 'absolute', top: -10, left: 20, right: 20, zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EnergyIcon sx={{ fontSize: 16, color: energyLevel > 50 ? 'success.main' : 'warning.main' }} />
              <LinearProgress
                variant="determinate"
                value={energyLevel}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: energyLevel > 50 ? 'success.main' : 'warning.main',
                    borderRadius: 3
                  }
                }}
              />
              <Typography variant="caption" sx={{ fontWeight: 'bold', minWidth: 30 }}>
                {energyLevel}%
              </Typography>
            </Box>
          </Box>
          <CardContent>
            <Box sx={{ mt: 2 }}>
              {/* Header with Icon and Level */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TimerIcon sx={{ color: getSessionColor() }} />
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {sessionType === 'focus' ? 'Focus Time' : 'Break Time'}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${streak} 🔥`}
                      size="small"
                      color="primary"
                      variant={streak > 0 ? 'filled' : 'outlined'}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>

                {/* Level Display */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Chip
                    avatar={
                      <Avatar sx={{ bgcolor: 'primary.main', width: 24, height: 24 }}>
                        <PremiumIcon sx={{ fontSize: 16, color: 'white' }} />
                      </Avatar>
                    }
                    label={`Lvl ${level}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </motion.div>
              </Box>

              {/* XP Progress Bar */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="textSecondary">
                    Experience Points
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {experience % 100}/100 XP
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={experience % 100}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #4CAF50, #8BC34A)',
                      borderRadius: 2
                    }
                  }}
                />
              </Box>

              {/* Task Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 500, textAlign: 'center' }}>
                  {taskTitle}
                </Typography>
              </motion.div>

              {/* Timer Display with Enhanced Animation */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
              >
                <Box sx={{
                  textAlign: 'center',
                  mb: 3,
                  py: 3,
                  bgcolor: `${getSessionColor()}10`,
                  borderRadius: 2,
                  border: `2px solid ${getSessionColor()}`,
                  position: 'relative'
                }}>
                  {/* Animated Ring Effect */}
                  {isRunning && (
                    <motion.div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '120%',
                        height: '120%',
                        border: `2px solid ${getSessionColor()}`,
                        borderRadius: '16px'
                      }}
                      animate={{
                        scale: [1, 1.1, 1],
                        opacity: [0.5, 0, 0.5]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  )}

                  <motion.div
                    animate={{
                      scale: isRunning ? [1, 1.02, 1] : 1,
                    }}
                    transition={{
                      duration: 1,
                      repeat: isRunning ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  >
                    <Typography
                      variant="h2"
                      sx={{
                        fontWeight: 700,
                        color: getSessionColor(),
                        fontFamily: 'monospace',
                        textShadow: isRunning ? `0 0 20px ${getSessionColor()}` : 'none'
                      }}
                    >
                      {formatTime(timeLeft)}
                    </Typography>
                  </motion.div>

                  {/* Progress Bar */}
                  <Box sx={{
                    width: '80%',
                    mx: 'auto',
                    mt: 2,
                    height: 8,
                    bgcolor: 'grey.200',
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}>
                    <motion.div
                      style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${getSessionColor()}, ${getSessionColor()})`,
                        borderRadius: 4
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgress()}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </Box>
                </Box>
              </motion.div>

              {/* Learning Style Tip */}
              <Box sx={{
                mb: 2,
                p: 2,
                bgcolor: '#FFF3E0', // Landing Page Beige
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer'
              }}
                onClick={() => setShowTip(!showTip)}
              >
                <PsychologyIcon color="info" />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {getStyleSpecificTip()}
                </Typography>
              </Box>

              {/* Additional Study Tips */}
              {showTip && studyTips.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    More Study Tips:
                  </Typography>
                  {studyTips.slice(0, 2).map((tip, index) => (
                    <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                      • {tip}
                    </Typography>
                  ))}
                </Box>
              )}

              {/* Enhanced Control Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="contained"
                    startIcon={isRunning ? <PauseIcon /> : <PlayIcon />}
                    onClick={toggleTimer}
                    sx={{
                      bgcolor: getSessionColor(),
                      '&:hover': { bgcolor: getSessionColor() },
                      minWidth: '140px',
                      py: 1.5
                    }}
                  >
                    {isRunning ? 'Pause' : 'Start'}
                  </Button>
                </motion.div>

                {sessionType === 'focus' && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setTimeLeft(0);
                        handleSessionComplete();
                      }}
                      sx={{ py: 1.5 }}
                    >
                      Skip to Break
                    </Button>
                  </motion.div>
                )}

                <Tooltip title="Reset Timer">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <IconButton onClick={resetTimer} size="small">
                      <RefreshIcon />
                    </IconButton>
                  </motion.div>
                </Tooltip>
              </Box>

            </Box>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
};

export default PomodoroTimer;
