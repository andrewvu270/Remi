import { createTheme } from '@mui/material/styles';

const remiTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#4F46E5', // Tech Indigo 600
            light: '#818CF8', // Indigo 400
            dark: '#3730A3', // Indigo 800
            contrastText: '#fff',
        },
        secondary: {
            main: '#F59E0B', // Amber 500 (Focus/Action)
            light: '#FCD34D',
            dark: '#B45309',
            contrastText: '#fff',
        },
        background: {
            default: '#F8F9FA', // Fallback
            paper: '#FFFFFF',
        },
        text: {
            primary: '#111827', // Gray 900
            secondary: '#4B5563', // Gray 600
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 800,
            letterSpacing: '-0.025em',
        },
        h2: {
            fontWeight: 700,
            letterSpacing: '-0.025em',
        },
        h3: {
            fontWeight: 700,
            letterSpacing: '-0.025em',
        },
        button: {
            fontWeight: 600,
            textTransform: 'none',
        },
    },
    shape: {
        borderRadius: 12, // Base border radius
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                contained: {
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', // Subtle shadow
                    border: '1px solid rgba(229, 231, 235, 1)', // Gray 200 border
                },
                rounded: {
                    borderRadius: 16,
                }
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                        transform: 'translateY(-2px)',
                    }
                }
            }
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    fontWeight: 500,
                }
            }
        }
    },
});

export default remiTheme;
