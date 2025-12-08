import React, { useState } from 'react';
import { API_BASE_URL } from '../config/api';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Slider,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface SurveyItem {
  task_title: string;
  task_type: string;
  due_date: string;
  grade_percentage: number;
  estimated_hours: number;
  actual_hours: number;
  difficulty_level: number;
  priority_rating: number;
  completed: boolean;
  completion_date: string;
  notes: string;
}

const Survey: React.FC = () => {
  const [items, setItems] = useState<SurveyItem[]>([
    {
      task_title: '',
      task_type: 'Assignment',
      due_date: '',
      grade_percentage: 0,
      estimated_hours: 0,
      actual_hours: 0,
      difficulty_level: 3,
      priority_rating: 3,
      completed: false,
      completion_date: '',
      notes: '',
    },
  ]);
  const [userFeedback, setUserFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        task_title: '',
        task_type: 'Assignment',
        due_date: '',
        grade_percentage: 0,
        estimated_hours: 0,
        actual_hours: 0,
        difficulty_level: 3,
        priority_rating: 3,
        completed: false,
        completion_date: '',
        notes: '',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof SurveyItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleGenerateSample = async () => {
    setGenerating(true);
    setMessage(null);

    try {
      // For now, generate a realistic sample locally
      // This can be replaced with actual AI generation when backend is ready
      const sampleTasks = [
        {
          task_title: 'Linear Algebra Problem Set 3',
          task_type: 'Assignment',
          due_date: '2025-12-15',
          grade_percentage: 8,
          estimated_hours: 4,
          actual_hours: 5.5,
          difficulty_level: 3,
          priority_rating: 4,
          completed: true,
          completion_date: '2025-12-14',
          notes: 'Matrix operations and eigenvalues',
        },
        {
          task_title: 'Research Paper - Climate Change Impact',
          task_type: 'Project',
          due_date: '2025-12-20',
          grade_percentage: 25,
          estimated_hours: 15,
          actual_hours: 18,
          difficulty_level: 4,
          priority_rating: 5,
          completed: true,
          completion_date: '2025-12-18',
          notes: '10-page research paper with citations',
        },
        {
          task_title: 'Chapter 5 Quiz - Organic Chemistry',
          task_type: 'Quiz',
          due_date: '2025-12-10',
          grade_percentage: 5,
          estimated_hours: 2,
          actual_hours: 1.5,
          difficulty_level: 2,
          priority_rating: 3,
          completed: true,
          completion_date: '2025-12-09',
          notes: 'Online quiz, multiple choice',
        },
        {
          task_title: 'Data Structures Lab 7',
          task_type: 'Lab',
          due_date: '2025-12-12',
          grade_percentage: 3,
          estimated_hours: 3,
          actual_hours: 4,
          difficulty_level: 3,
          priority_rating: 3,
          completed: true,
          completion_date: '2025-12-11',
          notes: 'Implement binary search tree',
        },
        {
          task_title: 'Midterm Exam - Macroeconomics',
          task_type: 'Exam',
          due_date: '2025-12-18',
          grade_percentage: 30,
          estimated_hours: 12,
          actual_hours: 15,
          difficulty_level: 5,
          priority_rating: 5,
          completed: true,
          completion_date: '2025-12-18',
          notes: 'Covers chapters 1-8, in-class exam',
        },
      ];

      // Pick a random sample
      const randomSample = sampleTasks[Math.floor(Math.random() * sampleTasks.length)];

      // Set the sample in the form
      setItems([randomSample]);

      setMessage({
        type: 'success',
        text: 'Sample data loaded - review and modify as needed, then click Submit Survey'
      });

    } catch (error) {
      console.error('Error generating sample:', error);
      setMessage({ type: 'error', text: 'Failed to generate sample' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    console.log('Submit button clicked');

    if (items.some(item => !item.task_title || !item.due_date)) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    console.log('Submitting survey with items:', items);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/survey/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responses: items,
          user_feedback: userFeedback,
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', errorText);
        throw new Error(`Failed to submit survey: ${errorText}`);
      }

      const data = await response.json();
      console.log('Survey submitted successfully:', data);

      setMessage({
        type: 'success',
        text: `Survey submitted successfully! ${data.saved_to_db ? `Saved ${data.saved_to_db} records to database.` : ''}`
      });
      setItems([
        {
          task_title: '',
          task_type: 'Assignment',
          due_date: '',
          grade_percentage: 0,
          estimated_hours: 0,
          actual_hours: 0,
          difficulty_level: 3,
          priority_rating: 3,
          completed: false,
          completion_date: '',
          notes: '',
        },
      ]);
      setUserFeedback('');
    } catch (error) {
      console.error('Error submitting survey:', error);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to submit survey' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
          Task Data Collection Survey
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
          Help us improve our AI scheduling model by sharing your task completion data.
        </Typography>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>How your survey helps:</strong> Your task completion data trains our machine learning model to better predict task duration and difficulty. Each submission improves the accuracy of our scheduling recommendations for all users!
          </Typography>
        </Alert>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
          Your responses will be used to train a machine learning model for better task prioritization.
        </Typography>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Tasks ({items.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleGenerateSample}
              disabled={loading || generating}
              sx={{ borderRadius: '12px' }}
            >
              {generating ? <CircularProgress size={20} /> : 'Generate Sample'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddItem}
              disabled={loading || generating}
              sx={{ borderRadius: '12px' }}
            >
              Add Task
            </Button>
          </Box>
        </Box>

        {items.map((item, index) => (
          <Paper
            key={index}
            sx={{
              mb: 3,
              p: 3,
              borderRadius: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Task {index + 1}
              </Typography>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleRemoveItem(index)}
                disabled={items.length === 1}
              >
                Remove
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Task Title *"
                  value={item.task_title}
                  onChange={(e) => handleItemChange(index, 'task_title', e.target.value)}
                  disabled={loading}
                  variant="outlined"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Task Type"
                  value={item.task_type}
                  onChange={(e) => handleItemChange(index, 'task_type', e.target.value)}
                  disabled={loading}
                  SelectProps={{
                    native: true,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                >
                  <option value="Assignment">Assignment</option>
                  <option value="Exam">Exam</option>
                  <option value="Quiz">Quiz</option>
                  <option value="Project">Project</option>
                  <option value="Reading">Reading</option>
                  <option value="Lab">Lab</option>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Due Date *"
                  value={item.due_date}
                  onChange={(e) => handleItemChange(index, 'due_date', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  disabled={loading}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Weight Percentage (0-100)"
                  value={item.grade_percentage}
                  onChange={(e) => handleItemChange(index, 'grade_percentage', parseFloat(e.target.value))}
                  disabled={loading}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Estimated Hours"
                  value={item.estimated_hours}
                  onChange={(event) => handleItemChange(index, 'estimated_hours', parseFloat(event.target.value))}
                  disabled={loading}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Actual Hours Spent"
                  value={item.actual_hours}
                  onChange={(event) => handleItemChange(index, 'actual_hours', parseFloat(event.target.value))}
                  disabled={loading}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px' }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Difficulty Level: {item.difficulty_level}/5
                  </Typography>
                  <Slider
                    value={item.difficulty_level}
                    onChange={(_event, value) => handleItemChange(index, 'difficulty_level', value)}
                    min={1}
                    max={5}
                    marks
                    disabled={loading}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ p: 2, border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px' }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                    Priority Rating: {item.priority_rating}/5
                  </Typography>
                  <Slider
                    value={item.priority_rating}
                    onChange={(_event, value) => handleItemChange(index, 'priority_rating', value)}
                    min={1}
                    max={5}
                    marks
                    disabled={loading}
                  />
                </Box>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.completed}
                      onChange={(e) => handleItemChange(index, 'completed', e.target.checked)}
                      disabled={loading}
                    />
                  }
                  label="Completed"
                  sx={{ ml: 1 }}
                />
              </Grid>
              {item.completed && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Completion Date"
                    value={item.completion_date}
                    onChange={(e) => handleItemChange(index, 'completion_date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    disabled={loading}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes (optional)"
                  value={item.notes}
                  onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                  disabled={loading}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
            </Grid>
          </Paper>
        ))}
      </Box>

      <Paper
        sx={{
          p: 4,
          mb: 3,
          borderRadius: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Typography
          sx={{
            position: 'absolute',
            top: -10,
            right: 20,
            fontSize: '100px',
            opacity: 0.03,
            pointerEvents: 'none',
            zIndex: 0
          }}
        >
          📋
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Additional Feedback (Optional)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Any additional feedback about task prioritization or scheduling?"
          value={userFeedback}
          onChange={(e) => setUserFeedback(e.target.value)}
          disabled={loading}
        />
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={(): void => window.history.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ minWidth: 150 }}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit Survey'}
        </Button>
      </Box>
    </Container>
  );
};

export default Survey;
