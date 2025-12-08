/**
 * Notification Service
 * Handles browser push notifications for study session reminders
 */

export interface SessionReminder {
  sessionId: string;
  taskTitle: string;
  courseCode?: string;
  scheduledTime: Date;
  estimatedHours: number;
}

class NotificationService {
  private permission: NotificationPermission = 'default';
  private reminders: Map<string, number> = new Map(); // sessionId -> timeoutId

  constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  /**
   * Request permission to show notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;
    return permission === 'granted';
  }

  /**
   * Check if notifications are supported and permitted
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  isPermitted(): boolean {
    return this.permission === 'granted';
  }

  /**
   * Show a notification immediately
   */
  showNotification(title: string, options?: NotificationOptions): void {
    if (!this.isPermitted()) {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      const notification = new Notification(title, {
        ...options
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      // Handle click - focus the window
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Schedule a reminder for a study session
   * @param reminder Session reminder details
   * @param minutesBefore Minutes before session to show reminder (default: 15)
   */
  scheduleReminder(reminder: SessionReminder, minutesBefore: number = 15): void {
    if (!this.isPermitted()) {
      console.warn('Cannot schedule reminder: permission not granted');
      return;
    }

    // Cancel existing reminder for this session
    this.cancelReminder(reminder.sessionId);

    const now = new Date();
    const reminderTime = new Date(reminder.scheduledTime.getTime() - minutesBefore * 60 * 1000);
    const delay = reminderTime.getTime() - now.getTime();

    if (delay <= 0) {
      // Session is in the past or too soon, don't schedule
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const courseInfo = reminder.courseCode ? `${reminder.courseCode} - ` : '';
      this.showNotification(
        '📚 Study Session Reminder',
        {
          body: `${courseInfo}${reminder.taskTitle}\nStarts in ${minutesBefore} minutes (${reminder.estimatedHours}h session)`,
          tag: reminder.sessionId,
          requireInteraction: true,
          actions: [
            { action: 'view', title: 'View Session' },
            { action: 'dismiss', title: 'Dismiss' }
          ]
        }
      );

      // Remove from reminders map
      this.reminders.delete(reminder.sessionId);
    }, delay);

    // Store the timeout ID
    this.reminders.set(reminder.sessionId, timeoutId);

    // Save to localStorage for persistence
    this.saveReminders();
  }

  /**
   * Cancel a scheduled reminder
   */
  cancelReminder(sessionId: string): void {
    const timeoutId = this.reminders.get(sessionId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.reminders.delete(sessionId);
      this.saveReminders();
    }
  }

  /**
   * Cancel all scheduled reminders
   */
  cancelAllReminders(): void {
    this.reminders.forEach((timeoutId) => clearTimeout(timeoutId));
    this.reminders.clear();
    localStorage.removeItem('scheduledReminders');
  }

  /**
   * Get all scheduled reminders
   */
  getScheduledReminders(): string[] {
    return Array.from(this.reminders.keys());
  }

  /**
   * Save reminders to localStorage
   */
  private saveReminders(): void {
    const reminderIds = Array.from(this.reminders.keys());
    localStorage.setItem('scheduledReminders', JSON.stringify(reminderIds));
  }

  /**
   * Restore reminders from localStorage (call on app startup)
   */
  restoreReminders(sessions: SessionReminder[]): void {
    const savedIds = localStorage.getItem('scheduledReminders');
    if (!savedIds) return;

    try {
      const reminderIds: string[] = JSON.parse(savedIds);
      
      // Re-schedule reminders for sessions that still exist
      sessions.forEach(session => {
        if (reminderIds.includes(session.sessionId)) {
          this.scheduleReminder(session);
        }
      });
    } catch (error) {
      console.error('Failed to restore reminders:', error);
    }
  }

  /**
   * Schedule reminders for today's sessions
   */
  scheduleTodaysSessions(sessions: SessionReminder[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysSessions = sessions.filter(session => {
      const sessionDate = new Date(session.scheduledTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });

    todaysSessions.forEach(session => {
      this.scheduleReminder(session);
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
