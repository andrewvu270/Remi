import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './index.css';

import App from './App';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000', // Black primary
      light: '#333333',
      dark: '#000000',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#666666',
      light: '#999999',
      dark: '#333333',
      contrastText: '#ffffff',
    },
    background: {
      default: '#ffffff',
      paper: '#f7f7f8',
    },
    text: {
      primary: '#1a1a1a',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: 'var(--font-sans)',
    h1: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      letterSpacing: '-0.03em',
      fontSize: '3.5rem',
      '@media (min-width:600px)': { fontSize: '4.5rem' },
    },
    h2: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      fontSize: '2.5rem',
      '@media (min-width:600px)': { fontSize: '3rem' },
    },
    h3: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      fontSize: '2rem',
    },
    body1: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1.125rem',
      lineHeight: 1.6,
    },
    button: {
      fontFamily: 'var(--font-mono)',
      fontWeight: 500,
      textTransform: 'none',
      letterSpacing: '-0.01em',
    },
  },
  shape: {
    borderRadius: 24, // Large radius for bento feel
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @font-face {
          font-family: 'Universal Sans Display';
          font-style: normal;
          font-display: swap;
          font-weight: 400;
          src: local('Universal Sans Display'), local('Inter');
        }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100, // Pill shape
          padding: '12px 28px',
          fontSize: '1rem',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
        },
        contained: {
          backgroundColor: '#000000',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#333333',
          },
        },
        outlined: {
          borderColor: '#e5e5e5',
          color: '#1a1a1a',
          '&:hover': {
            borderColor: '#000000',
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#f7f7f8',
          borderRadius: 24,
          boxShadow: 'none',
          border: '1px solid transparent',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.05)',
            borderColor: '#e5e5e5',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        },
      },
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);