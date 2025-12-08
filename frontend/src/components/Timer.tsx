import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Button, LinearProgress } from '@mui/material';
import { PlayArrow, Pause, Stop } from '@mui/icons-material';

interface TimerProps {
  sessionId: string;
  onElapsedTimeChange: (seconds: number) => void;
  onPomodoroCountChange?: (count: number) => void;
  disabled?: boolean;
}

const Timer: React.FC<TimerProps> = ({
  sessionId,
  onElapsedTimeChange,
  onPomodoroCountChange,
  disabled = false
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);
  const storageKey = `timer_${sessionId}`;

  const MAX_HOURS = 12; // Cap at 12 hours
  const MAX_SECONDS = MAX_HOURS * 3600;

  // Load saved timer state on mount
  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (savedState) {
      try {
        const { elapsed, running, paused, timestamp } = JSON.parse(savedState);
        
        // If timer was running when page closed, calculate elapsed time
        if (running && !paused) {
          const now = Date.now();
          const additionalElapsed = Math.floor((now - timestamp) / 1000);
          const totalElapsed = Math.min(elapsed + additionalElapsed, MAX_SECONDS);
          setElapsedSeconds(totalElapsed);
          pausedElapsedRef.current = totalElapsed;
          setIsPaused(true); // Auto-pause when restoring
        } else {
          setElapsedSeconds(elapsed);
          pausedElapsedRef.current = elapsed;
          setIsPaused(paused);
        }
      } catch (e) {
        console.error('Failed to restore timer state:', e);
      }
    }
  }, [sessionId]);

  // Save timer state to localStorage
  const saveTimerState = (elapsed: number, running: boolean, paused: boolean) => {
    localStorage.setItem(storageKey, JSON.stringify({
      elapsed,
      running,
      paused,
      timestamp: Date.now()
    }));
  };

  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const { elapsed, running, paused } = JSON.parse(e.newValue);
          setElapsedSeconds(elapsed);
          setIsRunning(running);
          setIsPaused(paused);
        } catch (err) {
          console.error('Failed to sync timer across tabs:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  // Main timer loop - counts UP
  useEffect(() => {
    if (isRunning && !isPaused && !disabled) {
      startTimeRef.current = Date.now() - (elapsedSeconds * 1000);
      
      const tick = () => {
        const now = Date.now();
        const newElapsed = Math.floor((now - startTimeRef.current) / 1000);
        
        // Cap at max hours
        if (newElapsed >= MAX_SECONDS) {
          setElapsedSeconds(MAX_SECONDS);
          setIsRunning(false);
          setIsPaused(true);
          alert(`Timer has reached maximum limit of ${MAX_HOURS} hours. Please complete your session.`);
          return;
        }
        
        setElapsedSeconds(newElapsed);
        onElapsedTimeChange(newElapsed);
        saveTimerState(newElapsed, true, false);
      };

      intervalRef.current = window.setInterval(tick, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isRunning, isPaused, disabled, elapsedSeconds]);

  // Warn before leaving page if timer is running
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning && !isPaused) {
        e.preventDefault();
        e.returnValue = 'Timer is still running. Your progress will be saved.';
        saveTimerState(elapsedSeconds, true, false);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRunning, isPaused, elapsedSeconds]);

  const handleStart = () => {
    if (disabled) return;
    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now() - (elapsedSeconds * 1000);
    saveTimerState(elapsedSeconds, true, false);
  };

  const handlePause = () => {
    setIsPaused(true);
    pausedElapsedRef.current = elapsedSeconds;
    saveTimerState(elapsedSeconds, true, true);
  };

  const handleResume = () => {
    setIsPaused(false);
    startTimeRef.current = Date.now() - (pausedElapsedRef.current * 1000);
    saveTimerState(pausedElapsedRef.current, true, false);
  };

  const handleStop = () => {
    if (window.confirm('Are you sure you want to stop the timer? Your elapsed time will be saved.')) {
      setIsRunning(false);
      setIsPaused(false);
      saveTimerState(elapsedSeconds, false, false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the timer? All progress will be lost.')) {
      setElapsedSeconds(0);
      setIsRunning(false);
      setIsPaused(false);
      pausedElapsedRef.current = 0;
      localStorage.removeItem(storageKey);
      onElapsedTimeChange(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getElapsedHours = (): number => {
    return elapsedSeconds / 3600;
  };

  const progress = Math.min((elapsedSeconds / MAX_SECONDS) * 100, 100);

  return (
    <Box sx={{ textAlign: 'center', p: 3 }}>
      <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 2 }}>
        ⏱️ Elapsed Time
      </Typography>
      
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
        <Box
          sx={{
            width: 200,
            height: 200,
            borderRadius: '50%',
            border: '8px solid',
            borderColor: disabled ? 'grey.400' : isRunning && !isPaused ? 'primary.main' : 'grey.300',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            background: disabled ? '#f5f5f5' : `conic-gradient(
              ${isRunning && !isPaused ? '#1976d2' : '#9e9e9e'} ${progress}%, 
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
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="h3" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
              {formatTime(elapsedSeconds)}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {getElapsedHours().toFixed(2)} hours
            </Typography>
          </Box>
        </Box>
      </Box>

      {elapsedSeconds > 0 && (
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mb: 2, height: 6, borderRadius: 3 }}
          color={disabled ? 'inherit' : 'primary'}
        />
      )}

      {isPaused && isRunning && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
          ⏸️ Timer Paused
        </Typography>
      )}

      {elapsedSeconds >= MAX_SECONDS * 0.9 && (
        <Typography variant="body2" color="error.main" sx={{ mb: 2 }}>
          ⚠️ Approaching maximum time limit
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!isRunning ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrow />}
            onClick={handleStart}
            disabled={disabled}
          >
            {elapsedSeconds > 0 ? 'Continue' : 'Start'}
          </Button>
        ) : isPaused ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrow />}
            onClick={handleResume}
            disabled={disabled}
          >
            Resume
          </Button>
        ) : (
          <Button
            variant="contained"
            size="large"
            startIcon={<Pause />}
            onClick={handlePause}
            disabled={disabled}
          >
            Pause
          </Button>
        )}
        
        {(isRunning || elapsedSeconds > 0) && (
          <>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Stop />}
              onClick={handleStop}
              disabled={disabled}
            >
              Stop
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={handleReset}
              disabled={disabled || (isRunning && !isPaused)}
              color="error"
            >
              Reset
            </Button>
          </>
        )}
      </Box>

      {disabled && (
        <Typography variant="caption" color="error" sx={{ mt: 2, display: 'block' }}>
          Session is completed. Timer is disabled.
        </Typography>
      )}
    </Box>
  );
};

export default Timer;
