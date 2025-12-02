import React, { useEffect, useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Divider,
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { getOrCreateGuestSession } from '../utils/guestMode';
import {
  Home as HomeIcon,
  CheckCircle as TasksIcon,
  DateRange as CalendarIcon,
  Schedule as StudyPlanIcon,
  Poll as SurveyIcon,
  Logout as LogoutIcon,
  CloudUpload as CloudUploadIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!localStorage.getItem('access_token'));
  const userEmail = isLoggedIn ? localStorage.getItem('user_email') : null;
  const isGuest = !isLoggedIn;

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('access_token')) {
      getOrCreateGuestSession();
    }

    setIsLoggedIn(!!localStorage.getItem('access_token'));
  }, [location.pathname]);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem('access_token'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    // Clear user authentication data
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');

    setIsLoggedIn(false);
    handleMenuClose();

    // Clear all guest data to start fresh (this will reload the page)
    import('../utils/guestMode').then(({ clearAllGuestData }) => {
      clearAllGuestData();
    });
  };

  const handleSaveToCloud = () => {
    setSaveDialogOpen(true);
    setSaveError(null);
  };

  const handleConfirmSaveToCloud = async () => {
    setSavingData(true);
    setSaveError(null);
    try {
      navigate('/auth');
      setSaveDialogOpen(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingData(false);
    }
  };

  const handleMobileDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  const handleMobileNavigation = (path: string) => {
    navigate(path);
    setMobileDrawerOpen(false);
  };

  const navigationItems = [
    { text: 'Dashboard', icon: <HomeIcon />, path: '/dashboard' },
    { text: 'Tasks', icon: <TasksIcon />, path: '/tasks' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/schedule' },
    { text: 'Study Plan', icon: <StudyPlanIcon />, path: '/study-plan' },
    { text: 'Survey', icon: <SurveyIcon />, path: '/survey' },
  ];

  return (
    <>
      <AppBar position="sticky" sx={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #eee', boxShadow: 'none' }}>
        <Toolbar>
          {/* Mobile Menu Button */}
          {isMobile && (
            <IconButton
              edge="start"
              onClick={handleMobileDrawerToggle}
              sx={{ mr: 2, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              color: 'text.primary',
              fontSize: { xs: '1rem', sm: '1.25rem' },
              textDecoration: 'none',
              '&:hover': { opacity: 0.7 },
              cursor: 'pointer'
            }}
          >
            Academic Scheduler
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  startIcon={item.icon}
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    color: location.pathname === item.path ? 'text.primary' : 'text.secondary',
                    bgcolor: location.pathname === item.path ? 'rgba(0,0,0,0.05)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.05)', color: 'text.primary' },
                    borderRadius: '12px',
                    px: 2
                  }}
                >
                  {item.text}
                </Button>
              ))}

              {isGuest && (
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  onClick={handleSaveToCloud}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    ml: 2
                  }}
                >
                  Save to Cloud
                </Button>
              )}
            </Box>
          )}

          {/* User Menu (both mobile and desktop) */}
          {isLoggedIn && (
            <>
              <IconButton
                onClick={handleMenuOpen}
                sx={{
                  width: 40,
                  height: 40,
                  ml: 1,
                  bgcolor: 'rgba(0,0,0,0.05)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.1)' },
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: '#000',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                >
                  {userEmail?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    borderRadius: '16px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  }
                }}
              >
                <MenuItem disabled>
                  <Typography variant="body2">{userEmail}</Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={handleMobileDrawerToggle}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
            borderRight: 'none',
          },
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            Menu
          </Typography>
          <List>
            {navigationItems.map((item) => (
              <ListItem
                key={item.path}
                onClick={() => handleMobileNavigation(item.path)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  mb: 1,
                  '&:hover': {
                    bgcolor: 'rgba(103, 126, 234, 0.1)',
                  },
                  ...(location.pathname === item.path && {
                    bgcolor: 'rgba(103, 126, 234, 0.2)',
                  }),
                }}
              >
                <ListItemIcon sx={{ color: '#667eea' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}

            {isGuest && (
              <>
                <Divider sx={{ my: 2 }} />
                <ListItem
                  onClick={() => {
                    handleSaveToCloud();
                    setMobileDrawerOpen(false);
                  }}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'rgba(103, 126, 234, 0.1)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: '#667eea' }}>
                    <CloudUploadIcon />
                  </ListItemIcon>
                  <ListItemText primary="Save to Cloud" />
                </ListItem>
              </>
            )}
          </List>
        </Box>
      </Drawer>

      {/* Save to Cloud Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save to Cloud</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
          <Typography>
            To save your data to the cloud and access it from any device, please create an account or log in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmSaveToCloud}
            variant="contained"
            disabled={savingData}
          >
            {savingData ? <CircularProgress size={24} /> : 'Continue to Login'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navigation;
