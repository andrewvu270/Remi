import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import { Notifications, NotificationsOff, NotificationsActive } from '@mui/icons-material';
import { notificationService } from '../services/notificationService';

const NotificationSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [scheduledCount, setScheduledCount] = useState(0);

  useEffect(() => {
    // Check initial state
    if (notificationService.isSupported()) {
      setPermission(Notification.permission);
      setEnabled(Notification.permission === 'granted');
      
      // Load saved preference
      const savedMinutes = localStorage.getItem('reminderMinutes');
      if (savedMinutes) {
        setReminderMinutes(parseInt(savedMinutes));
      }
      
      // Update scheduled count
      setScheduledCount(notificationService.getScheduledReminders().length);
    }
  }, []);

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setPermission(Notification.permission);
    setEnabled(granted);

    if (granted) {
      // Show test notification
      notificationService.showNotification(
        '🎉 Notifications Enabled!',
        {
          body: 'You will now receive reminders for your study sessions.',
        }
      );
    }
  };

  const handleReminderMinutesChange = (minutes: number) => {
    setReminderMinutes(minutes);
    localStorage.setItem('reminderMinutes', minutes.toString());
  };

  const handleTestNotification = () => {
    notificationService.showNotification(
      '📚 Test Notification',
      {
        body: 'This is how your study reminders will look!',
      }
    );
  };

  if (!notificationService.isSupported()) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">
            Your browser does not support notifications.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {enabled ? (
            <NotificationsActive color="primary" fontSize="large" />
          ) : (
            <NotificationsOff color="disabled" fontSize="large" />
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Study Session Reminders</Typography>
            <Typography variant="body2" color="textSecondary">
              Get notified before your scheduled study sessions
            </Typography>
          </Box>
        </Box>

        {permission === 'denied' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Notifications are blocked. Please enable them in your browser settings.
          </Alert>
        )}

        {permission === 'default' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Enable notifications to receive study session reminders.
          </Alert>
        )}

        {permission === 'granted' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Notifications are enabled! You'll receive reminders for upcoming sessions.
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {permission !== 'granted' && (
            <Button
              variant="contained"
              startIcon={<Notifications />}
              onClick={handleEnableNotifications}
              fullWidth
            >
              Enable Notifications
            </Button>
          )}

          {permission === 'granted' && (
            <>
              <FormControl fullWidth>
                <InputLabel>Reminder Time</InputLabel>
                <Select
                  value={reminderMinutes}
                  label="Reminder Time"
                  onChange={(e) => handleReminderMinutesChange(e.target.value as number)}
                >
                  <MenuItem value={5}>5 minutes before</MenuItem>
                  <MenuItem value={10}>10 minutes before</MenuItem>
                  <MenuItem value={15}>15 minutes before</MenuItem>
                  <MenuItem value={30}>30 minutes before</MenuItem>
                  <MenuItem value={60}>1 hour before</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip 
                  label={`${scheduledCount} reminders scheduled`} 
                  size="small" 
                  color="primary"
                  variant="outlined"
                />
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={handleTestNotification}
              >
                Test Notification
              </Button>
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
