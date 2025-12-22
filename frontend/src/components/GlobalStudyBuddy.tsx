import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Box, Fab, Paper, Typography, Button, useTheme, useMediaQuery } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import NaturalLanguageQuery from './NaturalLanguageQuery';
import Mascot from './Mascot';

const GlobalStudyBuddy: React.FC = () => {
  const [showFab, setShowFab] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mascotMood, setMascotMood] = useState<'happy' | 'dance'>('happy');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const location = useLocation();

  useEffect(() => {
    // Show FAB after a delay
    setTimeout(() => setShowFab(true), 1000);
  }, []);

  if (location.pathname === '/' || location.pathname === '/auth' || location.pathname === '/register') {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {showFab && !isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000
            }}
          >
            <Fab
              color="primary"
              aria-label="study-buddy"
              onClick={() => setIsOpen(true)}
              sx={{
                width: 64,
                height: 64,
                fontSize: '28px',
                background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1565c0, #2196f3)',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.3s ease'
              }}
            >
              💬
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Study Buddy Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", duration: 0.3 }}
            style={{
              position: 'fixed',
              bottom: isMobile ? 0 : 24,
              right: isMobile ? 0 : 24,
              left: isMobile ? 0 : 'auto',
              zIndex: 1001,
              width: isMobile ? '100%' : '450px',
              maxWidth: isMobile ? '100%' : 'calc(100vw - 48px)'
            }}
          >
            <Paper
              elevation={12}
              sx={{
                borderRadius: isMobile ? '20px 20px 0 0' : '20px',
                overflow: 'hidden',
                maxHeight: isMobile ? '80vh' : '650px',
                height: isMobile ? '80vh' : 'auto',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
              }}
            >
              <Box
                sx={{
                  p: 2.5,
                  background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
                  color: 'white',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Box
                  sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
                  onClick={() => setMascotMood(prev => prev === 'dance' ? 'happy' : 'dance')}
                >
                  <Mascot mood={mascotMood} size="medium" animated={true} />
                  <Box>
                    <Typography variant={isMobile ? 'h5' : 'h4'} sx={{ fontWeight: 800, letterSpacing: '0.5px' }}>
                      Remi
                    </Typography>
                    <Typography variant="subtitle2" sx={{ opacity: 0.9, display: 'block', lineHeight: 1 }}>
                      Your Study Monster
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  onClick={() => setIsOpen(false)}
                  sx={{
                    color: 'white',
                    minWidth: 'auto',
                    fontSize: '20px',
                    '&:hover': {
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  ✕
                </Button>
              </Box>
              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                <NaturalLanguageQuery />
              </Box>
            </Paper>
          </motion.div>
        )}
      </AnimatePresence >
    </>
  );
};

export default GlobalStudyBuddy;
