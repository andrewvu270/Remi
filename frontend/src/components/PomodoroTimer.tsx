import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Button,
  useTheme,
} from '@mui/material';
import {
  Timer as TimerIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';

interface PomodoroTimerProps {
  taskTitle: string;
  learningStyle: string;
  studyTips: string[];
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  taskTitle,
  learningStyle,
  studyTips
}) => {
  const theme = useTheme();
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState<'focus' | 'break'>('focus');
  const [streak, setStreak] = useState(0);
  const [showTip, setShowTip] = useState(false);

  const focusTime = 25 * 60; // 25 minutes
  const shortBreak = 5 * 60; // 5 minutes
  const longBreak = 15 * 60; // 15 minutes

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleSessionComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  const handleSessionComplete = () => {
    setIsRunning(false);
    
    if (sessionType === 'focus') {
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      // Determine break length
      if (newStreak % 4 === 0) {
        setSessionType('break');
        setTimeLeft(longBreak);
      } else {
        setSessionType('break');
        setTimeLeft(shortBreak);
      }
    } else {
      setSessionType('focus');
      setTimeLeft(focusTime);
    }
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
    <Card sx={{ mb: 2, border: `2px solid ${getSessionColor()}20` }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimerIcon sx={{ color: getSessionColor() }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {sessionType === 'focus' ? 'Focus Time' : 'Break Time'}
            </Typography>
            <Chip
              label={`${streak} 🔥`}
              size="small"
              color="primary"
              variant={streak > 0 ? 'filled' : 'outlined'}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Reset">
              <IconButton onClick={resetTimer} size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Task Info */}
        <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
          {taskTitle}
        </Typography>

        {/* Timer Display */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 3,
          py: 3,
          bgcolor: `${getSessionColor()}10`,
          borderRadius: 2,
          border: `2px solid ${getSessionColor()}30`
        }}>
          <Typography 
            variant="h2" 
            sx={{ 
              fontWeight: 700, 
              color: getSessionColor(),
              fontFamily: 'monospace'
            }}
          >
            {formatTime(timeLeft)}
          </Typography>
          
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
            <Box
              sx={{
                width: `${getProgress()}%`,
                height: '100%',
                bgcolor: getSessionColor(),
                transition: 'width 1s linear'
              }}
            />
          </Box>
        </Box>

        {/* Learning Style Tip */}
        <Box sx={{ 
          mb: 2,
          p: 2,
          bgcolor: theme.palette.info.light,
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

        {/* Control Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            startIcon={isRunning ? <PauseIcon /> : <PlayIcon />}
            onClick={toggleTimer}
            sx={{
              bgcolor: getSessionColor(),
              '&:hover': { bgcolor: getSessionColor() }
            }}
          >
            {isRunning ? 'Pause' : 'Start'}
          </Button>
          
          {sessionType === 'focus' && (
            <Button
              variant="outlined"
              onClick={() => {
                setTimeLeft(0);
                handleSessionComplete();
              }}
            >
              Skip to Break
            </Button>
          )}
        </Box>

        {/* Session Stats */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          mt: 3,
          pt: 2,
          borderTop: '1px solid #eee'
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="primary">
              {streak}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Sessions Today
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main">
              {Math.round((streak * focusTime) / 60)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Focus Minutes
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="info.main">
              {streak > 0 ? Math.round((streak * (focusTime + shortBreak)) / 60) : 0}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Total Minutes
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PomodoroTimer;
