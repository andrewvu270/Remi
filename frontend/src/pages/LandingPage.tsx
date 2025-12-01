import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Container, Paper, LinearProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle as CheckCircleIcon, RadioButtonUnchecked as UncheckedIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';

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
    const [uploadProgress, setUploadProgress] = useState(0);

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

    // Guest Mode Upload Animation
    useEffect(() => {
        const interval = setInterval(() => {
            setUploadProgress(prev => (prev >= 100 ? 0 : prev + 10));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const toggleChecklist = (id: number) => {
        setChecklist(prev => prev.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    return (
        <Box sx={{ minHeight: '100vh', pt: 8, pb: 12 }}>
            <Container maxWidth="lg">
                {/* Hero Section */}
                <Box sx={{ textAlign: 'center', mb: 10 }} className="animate-fade-in">
                    <Typography variant="h1" gutterBottom sx={{ mb: 3 }}>
                        Master Your<br />
                        <Box component="span" sx={{ color: 'text.secondary' }}>Academic Journey</Box>
                    </Typography>
                    <Typography variant="h3" sx={{ mb: 6, maxWidth: '600px', mx: 'auto', color: 'text.secondary', fontWeight: 400 }}>
                        Intelligent scheduling for modern students. Clean, simple, and effective.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => navigate('/dashboard')}
                        >
                            Get Started
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            onClick={() => navigate(isLoggedIn ? '/dashboard' : '/auth')}
                        >
                            {isLoggedIn ? 'Go to Dashboard' : 'Log In'}
                        </Button>
                    </Box>
                </Box>

                {/* Bento Grid Features */}
                <Box id="features" className="bento-grid animate-fade-in delay-200">
                    {/* Main Feature - Smart Scheduling */}
                    <Paper className="bento-card" sx={{ gridColumn: { xs: 'span 12', md: 'span 8' }, minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
                        <Box>
                            <Typography variant="h4" gutterBottom>Smart Scheduling</Typography>
                            <Typography variant="body1">
                                Our AI analyzes your syllabus and creates the perfect study plan.
                                No more cramming, just consistent progress.
                            </Typography>
                        </Box>
                        <Box sx={{
                            mt: 4,
                            p: 3,
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                            borderRadius: '16px',
                            border: '1px solid #eee',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2
                        }}>
                            {calendarItems.map((item) => (
                                <Box
                                    key={item.id}
                                    sx={{
                                        p: 2,
                                        bgcolor: 'white',
                                        borderRadius: '12px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transform: item.active ? 'scale(1.02)' : 'scale(1)',
                                        transition: 'all 0.3s ease',
                                        borderLeft: item.active ? '4px solid #000' : '4px solid transparent'
                                    }}
                                >
                                    <Box>
                                        <Typography variant="subtitle2" fontWeight="bold">{item.title}</Typography>
                                        <Typography variant="caption" color="text.secondary">{item.time}</Typography>
                                    </Box>
                                    <Box sx={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        bgcolor: item.active ? '#4caf50' : '#e0e0e0'
                                    }} />
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    {/* Secondary Feature - Analytics */}
                    <Paper className="bento-card" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, gridRow: { md: 'span 2' } }}>
                        <Typography variant="h4" gutterBottom>Analytics</Typography>
                        <Typography variant="body1" sx={{ mb: 3 }}>
                            Track your productivity trends and optimize your study habits.
                        </Typography>

                        {/* Overall Score */}
                        <Box sx={{
                            textAlign: 'center',
                            py: 3,
                            mb: 3,
                            bgcolor: '#fafafa',
                            borderRadius: '16px',
                            border: '1px solid #f0f0f0'
                        }}>
                            <Typography variant="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
                                {Math.round((analyticsData[0].value + analyticsData[1].value + analyticsData[2].value) / 3)}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Overall Performance
                            </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {analyticsData.map((item, i) => (
                                <Box key={i}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography variant="body2" fontWeight="600">{item.label}</Typography>
                                        <Typography variant="body2" color="text.secondary">{Math.round(item.value)}%</Typography>
                                    </Box>
                                    <Box sx={{ width: '100%', height: '10px', bgcolor: '#f5f5f5', borderRadius: '5px', overflow: 'hidden' }}>
                                        <Box sx={{
                                            width: `${item.value}%`,
                                            height: '100%',
                                            bgcolor: i === 0 ? '#000' : i === 1 ? '#666' : '#999',
                                            borderRadius: '5px',
                                            transition: 'width 1s ease-in-out'
                                        }} />
                                    </Box>
                                </Box>
                            ))}

                            {/* Weekly Activity Mini-Chart */}
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Weekly Activity</Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '60px' }}>
                                    {[65, 40, 75, 50, 90, 30, 80].map((height, idx) => (
                                        <Box key={idx} sx={{
                                            width: '8%',
                                            height: `${height}%`,
                                            bgcolor: idx === 4 ? '#000' : '#e0e0e0',
                                            borderRadius: '4px 4px 0 0',
                                            transition: 'height 0.5s ease'
                                        }} />
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </Paper>

                    {/* Feature 3 - Task Management */}
                    <Paper className="bento-card" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                        <Typography variant="h5" gutterBottom>Task Management</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            Break down assignments into manageable chunks.
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {checklist.map((item) => (
                                <Box
                                    key={item.id}
                                    onClick={() => toggleChecklist(item.id)}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        cursor: 'pointer',
                                        opacity: item.checked ? 0.5 : 1,
                                        transition: 'opacity 0.2s'
                                    }}
                                >
                                    {item.checked ? <CheckCircleIcon fontSize="small" color="success" /> : <UncheckedIcon fontSize="small" color="disabled" />}
                                    <Typography variant="body2" sx={{ textDecoration: item.checked ? 'line-through' : 'none' }}>
                                        {item.text}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    {/* Feature 4 - Guest Mode */}
                    <Paper className="bento-card" sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
                        <Typography variant="h5" gutterBottom>Guest Mode</Typography>
                        <Typography variant="body1" sx={{ mb: 3 }}>
                            Try it out instantly without creating an account.
                        </Typography>
                        <Box sx={{
                            p: 2,
                            border: '2px dashed #e0e0e0',
                            borderRadius: '12px',
                            textAlign: 'center',
                            bgcolor: '#fafafa'
                        }}>
                            <CloudUploadIcon sx={{ fontSize: 32, color: 'text.secondary', mb: 1 }} />
                            <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
                                Uploading Syllabus...
                            </Typography>
                            <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 6, borderRadius: 3 }} />
                        </Box>
                    </Paper>
                </Box>
            </Container>
        </Box>
    );
};

export default LandingPage;
