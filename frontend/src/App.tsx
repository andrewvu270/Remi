import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';

import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Schedule from './pages/Schedule';
import StudyPlan from './pages/StudyPlan';
import Survey from './pages/Survey';
import Auth from './pages/Auth';
import GoogleCallback from './pages/GoogleCallback';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import { getOrCreateGuestSession } from './utils/guestMode';

function App() {
  useEffect(() => {
    // Initialize guest session if not logged in
    const token = localStorage.getItem('access_token');
    if (!token) {
      getOrCreateGuestSession();
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/callback" element={<GoogleCallback />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <>
                <Navigation />
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/study-plan" element={<StudyPlan />} />
                  <Route path="/survey" element={<Survey />} />
                </Routes>
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <>
                <Navigation />
                <Tasks />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute>
              <>
                <Navigation />
                <Schedule />
              </>
            </ProtectedRoute>
          }
        />
        <Route path="/survey" element={<Survey />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;