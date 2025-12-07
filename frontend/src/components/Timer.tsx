import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, IconButton, LinearProgress, Switch, FormControlLabel } from '@mui/material';
import { PlayArrow, Pause, Stop } from '@mui/icons-material';

interface TimerProps {
  initialSeconds: number;
  pomodoroMode: boolean;
  onComplete: () => void;
  onTick: (remainingSeconds: number) => void;
  onPomodoroIntervalChange: (type: 'work' | 'break', count: number) => void;
}

const Timer: React.FC<TimerProps> = ({
  initialSeconds,
  pomodoroMode,
  onComplete,
  onTick,
  onPomodoroIntervalChange
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [currentInterval, setCurrentInterval] = useState<'work' | 'break'>('work');
  const [intervalSeconds, setIntervalSeconds] = useState(pomodoroMode ? 25 * 60 : initialSeconds);
  
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);

  const WORK_DURATION = 25 * 60; // 25 minutes
  const SHORT_BREAK = 5 * 60; // 5 minutes
  const LONG_BREAK = 15 * 60; // 15 minutes

  useEffect(() => {
    if (pomodoroMode) {
      setIntervalSeconds(WORK_DURATION);
      setRemainingSeconds(WORK_DURATION);
      setCurrentInterval('work');
    } else {
      setIntervalSeconds(initialSeconds);
      setRemainingSeconds(initialSeconds);
    }
  }, [pomodoroMode, initialSeconds]);

  useEffect(() => {
    if (isRunning && !isPaused) {
      startTimeRef.current = Date.now() - (intervalSeconds - remainingSeconds) * 1000;
      
      const tick = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        const newRemaining = Math.max(0, intervalSeconds - elapsed);
        
        setRemainingSeconds(newRemaining);
        onTick(newRemaining);
        
        if (newRemaining === 0) {
          handleIntervalComplete();
        }
      };

      intervalRef.current = window.setInterval(tick, 100);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, isPaused, intervalSeconds, remainingSeconds]);

  const handleIntervalComplete = () => {
    // Play notification sound
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => console.log('Could not play sound'));
    
    if (pomodoroMode) {
      if (currentInterval === 'work') {
        const newCount = pomodoroCount + 1;
        setPomodoroCount(newCount);
        
        // Determine break length
        const breakDuration = newCount % 4 === 0 ? LONG_BREAK : SHORT_BREAK;
        setIntervalSeconds(breakDuration);
        setRemainingSeconds(breakDuration);
        setCurrentInterval('break');
        onPomodoroIntervalChange('break', newCount);
        
        alert(`Pomodoro ${newCount} complete! Time for a ${newCount % 4 === 0 ? 'long' : 'short'} break.`);
      } else {
        // Break complete, start new work interval
        setIntervalSeconds(WORK_DURATION);
        setRemainingSeconds(WORK_DURATION);
        setCurrentInterval('work');
        onPomodoroIntervalChange('work', pomodoroCount);
        
        alert('Break complete! Ready for another Pomodoro?');
      }
      
      setIsRunning(false);
    } else {
      setIsRunning(false);
      onComplete();
      alert('Session complete!');
    }
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
    pausedTimeRef.current = remainingSeconds;
  };

  const handleResume = () => {
    setIsPaused(false);
    setRemainingSeconds(pausedTimeRef.current);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setRemainingSeconds(pomodoroMode ? WORK_DURATION : initialSeconds);
    setPomodoroCount(0);
    setCurrentInterval('work');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progress = ((intervalSeconds - remainingSeconds) / intervalSeconds) * 100;

  return (
    <Box sx={{ textAlign: 'center', p: 3 }}>
      {pomodoroMode && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" color="textSecondary">
            {currentInterval === 'work' ? '🍅 Work Session' : '☕ Break Time'}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Pomodoros completed: {pomodoroCount}
          </Typography>
        </Box>
      )}
      
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
        <Box
          sx={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: '8px solid',
            borderColor: currentInterval === 'work' ? 'primary.main' : 'success.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: `conic-gradient(
              ${currentInterval === 'work' ? '#1976d2' : '#4caf50'} ${progress}%, 
              #e0e0e0 ${progress}%
            )`
          }}
        >
          <Box
            sx={{
              width: 180,
              height: 180,
              borderRadius: '50%',
              backgroundColor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
              {formatTime(remainingSeconds)}
            </Typography>
          </Box>
        </Box>
      </Box>

      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ mb: 3, height: 8, borderRadius: 4 }}
        color={currentInterval === 'work' ? 'primary' : 'success'}
      />

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {!isRunning ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrow />}
            onClick={handleStart}
            color={currentInterval === 'work' ? 'primary' : 'success'}
          >
            Start
          </Button>
        ) : isPaused ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrow />}
            onClick={handleResume}
          >
            Resume
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            startIcon={<Pause />}
            onClick={handlePause}
          >
            Pause
          </Button>
        )}
        
        {isRunning && (
          <Button
            variant="outlined"
            size="large"
            startIcon={<Stop />}
            onClick={handleStop}
            color="error"
          >
            Stop
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default Timer;
