import { useState, useEffect } from 'react';
import { Box, Typography, Button, Container, Paper, LinearProgress, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle as CheckCircleIcon, RadioButtonUnchecked as UncheckedIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import Mascot from '../components/Mascot';

const LandingPage = () => {
    const navigate = useNavigate();

    // Check if user is logged in
    const isLoggedIn = !!localStorage.getItem('access_token');

    // Animation States
    const [calendarItems, setCalendarItems] = useState([
        { id: 1, title: 'Study Math', time: '10:00 AM', active: false },
        { id: 2, title: 'Physics Lab', time: '2:00 PM', active: false },
        { id: 3, title: 'History Essay', time: '4:00 PM', active: false },
    ]);

    const [analyticsData, setAnalyticsData] = useState([
        { label: 'Study Focus', value: 85 },
        { label: 'Task Completion', value: 92 },
        { label: 'Efficiency', value: 78 }
    ]);
    const [checklist, setChecklist] = useState([
        { id: 1, text: 'Read Chapter 4', checked: true },
        { id: 2, text: 'Complete Quiz', checked: false },
        { id: 3, text: 'Draft Outline', checked: false },
    ]);

    // Smart Scheduling Animation
    useEffect(() => {
        const interval = setInterval(() => {
            setCalendarItems(prev => prev.map(item => ({
                ...item,
                active: Math.random() > 0.5
            })));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    // Analytics Animation
    useEffect(() => {
        const interval = setInterval(() => {
            setAnalyticsData(prev => prev.map(item => ({
                ...item,
                value: Math.min(100, Math.max(40, item.value + (Math.random() * 20 - 10)))
            })));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const toggleChecklist = (id: number) => {
        setChecklist(prev => prev.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    const [remiMood, setRemiMood] = useState<'happy' | 'dance' | 'excited' | 'thinking'>('dance');

    const cycleMood = () => {
        const moods: ('happy' | 'dance' | 'excited' | 'thinking')[] = ['dance', 'excited', 'thinking', 'happy'];
        const nextIndex = (moods.indexOf(remiMood) + 1) % moods.length;
        setRemiMood(moods[nextIndex]);
    };

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    return (
        <Box sx={{
            // background handled globally now
        }}>
            <Container maxWidth="lg">
                {/* Hero Section */}
                <Box sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'center',
                    gap: 4,
                    mb: 12,
                    mt: 4
                }} className="animate-fade-in">

                    {/* Left Copy */}
                    <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'left' }, zIndex: 1 }}>
                        <Box sx={{
                            display: 'inline-block',
                            px: 3,
                            py: 1,
                            background: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(10px)',
                            color: 'secondary.main',
                            borderRadius: '50px',
                            fontWeight: 700,
                            mb: 3,
                            fontSize: '0.9rem',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                        }}>
                            New: Meet Remi! 👾
                        </Box>
                        <Typography variant="h1" sx={{
                            fontSize: { xs: '2.5rem', md: '3.5rem' },
                            background: 'linear-gradient(45deg, #2286C3 30%, #64B5F6 90%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 2,
                            lineHeight: 1.2
                        }}>
                            Study Smarter<br />
                            with <Box component="span" sx={{ color: 'secondary.main', WebkitTextFillColor: 'initial' }}>Remi</Box>
                        </Typography>
                        <Typography variant="h5" sx={{ mb: 4, color: 'text.secondary', fontWeight: 400, lineHeight: 1.6 }}>
                            Your personal AI study monster who manages your schedule, tracks your progress, and keeps you motivated.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => navigate('/dashboard')}
                                sx={{ py: 1.5, px: 4, fontSize: '1.1rem', borderRadius: '50px', boxShadow: '0 10px 30px rgba(33, 150, 243, 0.3)' }}
                            >
                                Start Studying
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={() => navigate(isLoggedIn ? '/dashboard' : '/auth')}
                                sx={{ py: 1.5, px: 4, fontSize: '1.1rem', borderWidth: 2, borderRadius: '50px' }}
                            >
                                {isLoggedIn ? 'Dashboard' : 'Log In'}
                            </Button>
                        </Box>
                    </Box>

                    {/* Right Interactive Mascot */}
                    <Box sx={{
                        flex: 1,
                        height: isMobile ? '400px' : '600px',
                        width: '100%',
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        mt: { xs: 4, md: 10 }
                    }}>
                        <Box sx={{
                            width: 'fit-content',
                            height: 'fit-content',
                            cursor: 'grab',
                            transform: isMobile ? 'translateY(20px)' : 'translateY(50px)'
                        }}>
                            {/* Speech Bubble / Dialog */}
                            <Paper
                                elevation={0}
                                sx={{
                                    position: 'absolute',
                                    top: isMobile ? -50 : -60,
                                    right: isMobile ? -80 : -180,
                                    maxWidth: 200,
                                    p: 2.5,
                                    borderRadius: '24px',
                                    borderBottomLeftRadius: '4px',
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    zIndex: 10,
                                    border: '1px solid rgba(0,0,0,0.05)',
                                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                                    display: { xs: 'none', md: 'block' }, // Keep hidden on tiny screens if needed, or adjust
                                    animation: 'float 3s ease-in-out infinite'
                                }}
                            >
                                <Typography variant="subtitle2" fontWeight="800" color="secondary.main" sx={{ mb: 0.5 }}>
                                    I'm Reminder Monster! 👾
                                </Typography>
                                <Typography variant="caption" sx={{ lineHeight: 1.2, display: 'block', fontWeight: 500, color: 'text.secondary' }}>
                                    I'll make sure you COMPLETE your sessions! Rawr!
                                </Typography>
                            </Paper>

                            {/* Giant Hero Mascot */}
                            <Mascot
                                mood={remiMood}
                                size={isMobile ? 'large' : 'hero'}
                                animated={true}
                                message="Click me to change my mood!"
                                onClick={cycleMood}
                            />
                        </Box>
                    </Box>
                </Box>

                {/* Main Feature - Smart Scheduling */}
                <Typography variant="h3" align="center" sx={{ mb: 6 }}>How Remi Helps You</Typography>

                <Box id="features" className="bento-grid animate-fade-in delay-200">
                    <Paper className="bento-card" sx={{ gridColumn: { xs: 'span 12', md: 'span 8' }, minHeight: '400px', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#fff' }}>
                        <Box sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography variant="h4" gutterBottom color="primary.dark">Smart Scheduling</Typography>
                                    <Typography variant="body1" sx={{ maxWidth: '90%' }}>
                                        Remi analyzes your syllabus and automatically builds a balanced study plan for you.
                                    </Typography>
                                </Box>
                                <Typography variant="h1" sx={{ opacity: 0.1 }}>📅</Typography>
                            </Box>
                        </Box>
                        <Box sx={{
                            flex: 1,
                            mt: 2,
                            px: 4,
                            pb: 4,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                        }}>
                            {/* Reusing existing calendar animation logic but styled */}
                            {calendarItems.map((item) => (
                                <Box
                                    key={item.id}
                                    sx={{
                                        p: 2,
                                        bgcolor: item.active ? '#E3F2FD' : '#F8F9FA',
                                        borderRadius: '16px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transform: item.active ? 'scale(1.02) translateX(10px)' : 'scale(1)',
                                        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                        borderLeft: item.active ? '6px solid #64B5F6' : '6px solid transparent'
                                    }}
                                >
                                    <Box>
                                        <Typography variant="subtitle1" fontWeight="bold" color="text.primary">{item.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{item.time}</Typography>
                                    </Box>
                                    {item.active && <CheckCircleIcon color="primary" />}
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    {/* Secondary Feature - Analytics */}
                    <Paper className="bento-card" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, gridRow: { md: 'span 2' }, bgcolor: '#FFF3E0' }}>
                        <Box sx={{ p: 3 }}>
                            <Typography variant="h4" gutterBottom color="secondary.dark">Progress</Typography>
                            <Typography variant="body1" sx={{ mb: 3 }}>
                                Remi tracks your XP and levels up with you!
                            </Typography>

                            {/* Overall Score */}
                            <Box sx={{
                                textAlign: 'center',
                                py: 4,
                                mb: 3,
                                bgcolor: '#fff',
                                borderRadius: '24px',
                                boxShadow: '0 8px 20px rgba(255,183,77,0.2)'
                            }}>
                                <Typography variant="h2" sx={{ fontWeight: 800, color: 'secondary.main' }}>
                                    {Math.round((analyticsData[0].value + analyticsData[1].value + analyticsData[2].value) / 3)}%
                                </Typography>
                                <Typography variant="subtitle2" color="secondary.dark" fontWeight="bold">
                                    Productivity Score
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {analyticsData.map((item, i) => (
                                    <Box key={i}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="caption" fontWeight="bold" color="text.secondary">{item.label}</Typography>
                                            <Typography variant="caption" fontWeight="bold">{Math.round(item.value)}%</Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={item.value}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: 'rgba(255,255,255,0.5)',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: i === 0 ? '#FFB74D' : i === 1 ? '#FF9800' : '#F57C00',
                                                    borderRadius: 4
                                                }
                                            }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Paper>

                    {/* Feature 3 - Task Management */}
                    <Paper className="bento-card" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                        <Box sx={{ p: 3 }}>
                            <Typography variant="h5" gutterBottom fontWeight="bold">Task Bites</Typography>
                            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                                Break big scary projects into small yummy bites.
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {checklist.map((item) => (
                                    <Box
                                        key={item.id}
                                        onClick={() => toggleChecklist(item.id)}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            cursor: 'pointer',
                                            opacity: item.checked ? 0.6 : 1,
                                            p: 1.5,
                                            borderRadius: '16px',
                                            bgcolor: item.checked ? '#F5F5F5' : '#E3F2FD',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {item.checked ? <CheckCircleIcon color="success" /> : <UncheckedIcon color="primary" />}
                                        <Typography variant="body2" sx={{
                                            textDecoration: item.checked ? 'line-through' : 'none',
                                            fontWeight: item.checked ? 400 : 600
                                        }}>
                                            {item.text}
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Paper>

                    {/* Feature 4 - Guest Mode */}
                    <Paper className="bento-card" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, bgcolor: '#E1F5FE' }}>
                        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Typography variant="h5" gutterBottom fontWeight="bold" color="primary.dark">Try Instantly</Typography>
                            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                                No sign-up needed. Just drop your syllabus and go.
                            </Typography>
                            <Box sx={{
                                p: 3,
                                border: '2px dashed #64B5F6',
                                borderRadius: '20px',
                                textAlign: 'center',
                                bgcolor: 'rgba(255,255,255,0.5)',
                                transition: 'all 0.2s',
                                '&:hover': { bgcolor: '#fff', borderColor: '#2196F3' }
                            }}>
                                <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                                <Typography variant="caption" display="block" color="text.secondary" gutterBottom fontWeight="bold">
                                    Drop Syllabus Here
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Container>
        </Box>
    );
};

export default LandingPage;
