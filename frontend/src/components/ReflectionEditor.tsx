import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Chip,
  LinearProgress
} from '@mui/material';
import { Save } from '@mui/icons-material';

interface ReflectionEditorProps {
  sessionId: string;
  initialValue?: {
    reflection_text: string;
    what_learned: string;
    what_was_challenging: string;
    what_to_improve: string;
  };
  onSave: (reflection: {
    reflection_text: string;
    what_learned: string;
    what_was_challenging: string;
    what_to_improve: string;
  }) => void;
  disabled?: boolean;
}

const ReflectionEditor: React.FC<ReflectionEditorProps> = ({
  sessionId,
  initialValue,
  onSave,
  disabled = false
}) => {
  const [reflection, setReflection] = useState({
    reflection_text: initialValue?.reflection_text || '',
    what_learned: initialValue?.what_learned || '',
    what_was_challenging: initialValue?.what_was_challenging || '',
    what_to_improve: initialValue?.what_to_improve || ''
  });
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto-save to localStorage
  useEffect(() => {
    const autoSaveKey = `reflection_draft_${sessionId}`;
    const savedDraft = localStorage.getItem(autoSaveKey);
    
    if (savedDraft && !initialValue) {
      try {
        const parsed = JSON.parse(savedDraft);
        setReflection(parsed);
        setHasUnsavedChanges(true);
      } catch (e) {
        console.warn('Failed to load reflection draft');
      }
    }
  }, [sessionId, initialValue]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (hasUnsavedChanges) {
      const autoSaveKey = `reflection_draft_${sessionId}`;
      const timer = setTimeout(() => {
        localStorage.setItem(autoSaveKey, JSON.stringify(reflection));
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, [reflection, hasUnsavedChanges, sessionId]);

  const handleFieldChange = (field: keyof typeof reflection, value: string) => {
    setReflection(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    onSave(reflection);
    setHasUnsavedChanges(false);
    
    // Clear draft from localStorage
    const autoSaveKey = `reflection_draft_${sessionId}`;
    localStorage.removeItem(autoSaveKey);
  };

  const getCharacterCount = (text: string) => text.length;
  const getWordCount = (text: string) => text.trim().split(/\s+/).filter(word => word.length > 0).length;

  const totalWords = Object.values(reflection).reduce((sum, text) => sum + getWordCount(text), 0);
  const completionScore = Math.min(100, (totalWords / 50) * 100);

  const guidedPrompts = {
    what_learned: [
      "What new concepts did you understand?",
      "What connections did you make?",
      "What 'aha' moments did you have?"
    ],
    what_was_challenging: [
      "What topics were difficult to grasp?",
      "Where did you get stuck?",
      "What caused confusion or frustration?"
    ],
    what_to_improve: [
      "How could you study more effectively?",
      "What would you do differently?",
      "What resources might help next time?"
    ]
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Take a moment to reflect on your study session. This helps improve future sessions.
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2">Reflection Completeness</Typography>
            <Typography variant="body2">{Math.round(completionScore)}%</Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={completionScore} 
            sx={{ height: 6, borderRadius: 3 }}
            color={completionScore > 70 ? 'success' : completionScore > 30 ? 'warning' : 'error'}
          />
        </Box>
        
        {totalWords > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Chip label={`${totalWords} words`} size="small" />
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: 'success.main' }}>
            💡 What did you learn?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {guidedPrompts.what_learned[Math.floor(Math.random() * guidedPrompts.what_learned.length)]}
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            value={reflection.what_learned}
            onChange={(e) => handleFieldChange('what_learned', e.target.value)}
            placeholder="Describe new concepts, insights, or connections you made..."
            disabled={disabled}
            helperText={`${getCharacterCount(reflection.what_learned)} characters`}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: 'warning.main' }}>
            🤔 What was challenging?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {guidedPrompts.what_was_challenging[Math.floor(Math.random() * guidedPrompts.what_was_challenging.length)]}
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            value={reflection.what_was_challenging}
            onChange={(e) => handleFieldChange('what_was_challenging', e.target.value)}
            placeholder="Identify difficult topics, confusion points, or obstacles..."
            disabled={disabled}
            helperText={`${getCharacterCount(reflection.what_was_challenging)} characters`}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: 'info.main' }}>
            🎯 What would you improve?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            {guidedPrompts.what_to_improve[Math.floor(Math.random() * guidedPrompts.what_to_improve.length)]}
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            value={reflection.what_to_improve}
            onChange={(e) => handleFieldChange('what_to_improve', e.target.value)}
            placeholder="Suggest improvements for future study sessions..."
            disabled={disabled}
            helperText={`${getCharacterCount(reflection.what_to_improve)} characters`}
          />
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
            📝 Additional thoughts (optional)
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Any other observations, feelings, or notes about this study session?
          </Typography>
          <TextField
            multiline
            rows={3}
            fullWidth
            value={reflection.reflection_text}
            onChange={(e) => handleFieldChange('reflection_text', e.target.value)}
            placeholder="Share any other thoughts about your study session..."
            disabled={disabled}
            helperText={`${getCharacterCount(reflection.reflection_text)} characters`}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={disabled || !hasUnsavedChanges}
        >
          Save Reflection
        </Button>
      </Box>

      <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
          💡 Reflection Tips:
        </Typography>
        <Typography variant="body2" color="textSecondary">
          • Be specific about what you learned • Identify concrete challenges • 
          Suggest actionable improvements • Aim for 50+ words total for best insights
        </Typography>
      </Box>
    </Box>
  );
};

export default ReflectionEditor;
