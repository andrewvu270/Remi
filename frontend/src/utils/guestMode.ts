/**
 * Guest Mode Utilities
 * Handles guest session management and data persistence
 */

import { API_BASE_URL } from "../config/api";

export const getOrCreateGuestSession = (): string => {
  let sessionId = localStorage.getItem('guest_session_id');
  
  if (!sessionId) {
    // Generate new guest session ID
    sessionId = `guest-${crypto.randomUUID()}`;
    localStorage.setItem('guest_session_id', sessionId);
    
    // Create session in backend
    createGuestSessionInBackend(sessionId);
  }
  
  return sessionId;
};

export const createGuestSessionInBackend = async (sessionId: string) => {
  try {
    await fetch(`${API_BASE_URL}/api/guest/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch (error) {
    console.error('Failed to create guest session:', error);
  }
};

export const isGuest = (): boolean => {
  return !localStorage.getItem('access_token');
};

export const isLoggedIn = (): boolean => {
  return !!localStorage.getItem('access_token');
};

export const getGuestSessionId = (): string | null => {
  return localStorage.getItem('guest_session_id');
};

export const clearGuestSession = () => {
  localStorage.removeItem('guest_session_id');
};

export const clearAllGuestData = () => {
  // Get all localStorage keys
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      // Remove all guest-related data including uploaded files tracking
      if (key.startsWith('task_') || 
          key.startsWith('course_') || 
          key === 'guest_session_id' ||
          key.startsWith('uploaded_files') ||
          key.startsWith('guest_')) {
        keysToRemove.push(key);
      }
    }
  }
  
  // Remove all identified keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log(`Cleared ${keysToRemove.length} guest data items from localStorage`);
  
  // Force a page refresh to ensure all components reset to clean state
  window.location.reload();
};

export const migrateGuestData = async (userId: string) => {
  const guestSessionId = getGuestSessionId();
  
  if (!guestSessionId) {
    return { migrated_tasks: 0, migrated_courses: 0 };
  }
  
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/guest/migrate/${guestSessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      clearGuestSession();
      return data;
    }
  } catch (error) {
    console.error('Failed to migrate guest data:', error);
  }
  
  return { migrated_tasks: 0, migrated_courses: 0 };
};
