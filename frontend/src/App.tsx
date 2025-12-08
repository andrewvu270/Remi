import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';

import remiTheme from './theme/remiTheme';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Schedule from './pages/Schedule';
import Sessions from './pages/Sessions';
import SessionProfile from './pages/SessionProfile';
import Survey from './pages/Survey';
import Auth from './pages/Auth';
import GoogleCallback from './pages/GoogleCallback';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import { getOrCreateGuestSession } from './utils/guestMode';
import GlobalStudyBuddy from './components/GlobalStudyBuddy';

function App() {
  useEffect(() => {
    // Initialize guest session if not logged in
    const token = localStorage.getItem('access_token');
    if (!token) {
      getOrCreateGuestSession();
    }
  }, []);

  return (
    <ThemeProvider theme={remiTheme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 15% 50%, #E3F2FD 0%, transparent 25%), radial-gradient(circle at 85% 30%, #E1F5FE 0%, transparent 25%), #F8F9FA',
        position: 'relative'
      }}>
        <BrowserRouter>
          <GlobalStudyBuddy />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<GoogleCallback />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/schedule"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <Schedule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <Sessions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions/:id"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <SessionProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/survey"
              element={
                <ProtectedRoute>
                  <Navigation />
                  <Survey />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </Box>
    </ThemeProvider >
  );
}

export default App;