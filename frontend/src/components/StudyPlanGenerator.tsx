import React, { useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogTitle, 
  TextField, 
  Typography, 
  CircularProgress,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import { Task } from '../types/task';
import { Download as DownloadIcon, Close as CloseIcon } from '@mui/icons-material';

interface StudyPlanGeneratorProps {
  tasks: Task[];
  open: boolean;
  onClose: () => void;
}

const StudyPlanGenerator: React.FC<StudyPlanGeneratorProps> = ({ tasks, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [studyPlan, setStudyPlan] = useState<string>('');
  const [studyHours, setStudyHours] = useState<number>(2);
  const [daysToPlan, setDaysToPlan] = useState<number>(7);

  const generateStudyPlan = async () => {
    if (tasks.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') || ''}`
        },
        body: JSON.stringify({
          tasks: tasks.map(task => ({
            id: task.id,
            title: task.title,
            task_type: task.task_type,
            due_date: task.due_date,
            priority_score: task.priority_score,
            predicted_hours: task.predicted_hours,
            grade_percentage: task.grade_percentage,
            research_sources: task.research_sources,
            wiki_summary: task.wiki_summary,
            academic_sources: task.academic_sources,
            community_answers: task.community_answers,
            research_insights: task.research_insights
          })),
          study_hours_per_day: studyHours,
          days_to_plan: daysToPlan
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate study plan');
      }

      const data = await response.json();
      setStudyPlan(data.plan);
    } catch (error) {
      console.error('Error generating study plan:', error);
      alert('Failed to generate study plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadAsPdf = () => {
    // This would be implemented with a PDF generation library
    alert('PDF generation will be implemented in the next step');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Generate Study Plan</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {!studyPlan ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body1" paragraph>
              Generate a personalized study plan based on your tasks, priorities, and available time.
            </Typography>
            
            <TextField
              label="Study Hours Per Day"
              type="number"
              value={studyHours}
              onChange={(e) => setStudyHours(Math.max(1, parseInt(e.target.value) || 1))}
              fullWidth
              margin="normal"
              inputProps={{ min: 1, max: 12 }}
            />
            
            <TextField
              label="Number of Days to Plan"
              type="number"
              value={daysToPlan}
              onChange={(e) => setDaysToPlan(Math.max(1, parseInt(e.target.value) || 1))}
              fullWidth
              margin="normal"
              inputProps={{ min: 1, max: 30 }}
            />
            
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {tasks.length} tasks will be included in the plan
            </Typography>
          </Box>
        ) : (
          <Box>
            <Box 
              sx={{ 
                maxHeight: '60vh', 
                overflowY: 'auto', 
                p: 2, 
                border: '1px solid #eee', 
                borderRadius: 1,
                whiteSpace: 'pre-wrap'
              }}
              dangerouslySetInnerHTML={{ 
                __html: studyPlan.replace(/\n/g, '<br />')
                  .replace(/^#\s+(.*)$/gm, '<h2>$1</h2>')
                  .replace(/^##\s+(.*)$/gm, '<h3>$1</h3>')
                  .replace(/^-\s+(.*)$/gm, '<li>$1</li>')
                  .replace(/\n\s*\n/g, '</ul><br />')
                  .replace(/<li>/g, '<ul><li>')
                  .replace(/<\/li>\s*<ul>/g, '</li><ul>')
                  .replace(/<\/li>\s*<\/ul>/g, '</ul></li>')
              }} 
            />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        {studyPlan ? (
          <>
            <Button 
              onClick={() => setStudyPlan('')} 
              color="primary"
              disabled={loading}
            >
              Back
            </Button>
            <Tooltip title="Download as PDF">
              <Button
                variant="contained"
                color="primary"
                onClick={downloadAsPdf}
                startIcon={<DownloadIcon />}
                disabled={loading}
              >
                Download PDF
              </Button>
            </Tooltip>
          </>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={generateStudyPlan}
            disabled={loading || tasks.length === 0}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Generating...' : 'Generate Plan'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default StudyPlanGenerator;
