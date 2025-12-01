import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
          setError('Authentication failed: ' + error);
          setLoading(false);
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        if (!code) {
          setError('No authorization code received');
          setLoading(false);
          setTimeout(() => navigate('/auth'), 3000);
          return;
        }

        // Exchange the code for a session with our backend
        const response = await fetch(`${API_BASE_URL}/api/auth/google/callback?code=${code}`, {
          method: 'GET',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Authentication failed');
        }

        const data = await response.json();

        // Save token to localStorage
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_email', data.email);
        localStorage.setItem('user_id', data.user_id);

        // Migrate local guest data to Supabase
        try {
          const { migrateLocalDataToSupabase, hasLocalGuestData } = await import('../utils/dataMigration');
          if (hasLocalGuestData()) {
            console.log('Migrating local guest data to Supabase...');
            const migrationResult = await migrateLocalDataToSupabase(data.access_token, data.user_id);
            console.log('Migration result:', migrationResult);
          }
        } catch (err) {
          console.error('Failed to migrate guest data:', err);
        }

        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setLoading(false);
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div>Completing authentication...</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Please wait while we sign you in.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ color: '#d32f2f' }}>Authentication Error</div>
        <div style={{ fontSize: '14px', color: '#666' }}>{error}</div>
        <div style={{ fontSize: '14px', color: '#666' }}>Redirecting to login page...</div>
      </div>
    );
  }

  return null;
};

export default GoogleCallback;
