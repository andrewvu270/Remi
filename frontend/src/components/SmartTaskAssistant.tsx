import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  TextField,
  Button,
  LinearProgress,
  Alert,
  Avatar,
  Tooltip,
  Badge,
  useTheme,
  Fab,
} from '@mui/material';
import {
  SmartToy as AIIcon,
  Psychology as InsightIcon,
  Category as CategoryIcon,
  Lightbulb as SuggestionIcon,
  TrendingUp as TrendingIcon,
  Schedule as ScheduleIcon,
  PriorityHigh as PriorityIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Send as SendIcon,
  AutoAwesome as SparkleIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { pipeline } from '@xenova/transformers';

interface TaskInsight {
  category: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  suggestions: string[];
  stressLevel: number;
}

interface SmartSuggestion {
  id: string;
  type: 'optimization' | 'warning' | 'tip';
  title: string;
  description: string;
  actionable: boolean;
  icon: React.ReactNode;
}

const SmartTaskAssistant: React.FC = () => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [currentInsight, setCurrentInsight] = useState<TaskInsight | null>(null);
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [aiModels, setAiModels] = useState<{
    classifier: any;
    sentiment: any;
    generator: any;
  } | null>(null);

  // Initialize AI models
  useEffect(() => {
    const initializeModels = async () => {
      try {
        setIsLoading(true);
        
        // Load lightweight models for client-side processing
        const classifier = await pipeline('zero-shot-classification', 'Xenova/distilbert-base-uncased-finetuned-zero-shot-classification');
        const sentiment = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        
        setAiModels({ classifier, sentiment, generator: null });
      } catch (error) {
        console.error('Failed to load AI models:', error);
        // Fallback to rule-based processing
        setAiModels({ classifier: null, sentiment: null, generator: null });
      } finally {
        setIsLoading(false);
      }
    };

    initializeModels();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTaskInput(transcript);
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  const analyzeTask = useCallback(async (taskText: string) => {
    if (!taskText.trim()) return;

    setIsLoading(true);
    
    try {
      let insight: TaskInsight;

      if (aiModels?.classifier && aiModels?.sentiment) {
        // Use AI models for analysis
        const categories = ['Assignment', 'Study', 'Project', 'Exam', 'Meeting', 'Research', 'Personal'];
        const categoryResult = await aiModels.classifier(taskText, categories);
        const sentimentResult = await aiModels.sentiment(taskText);
        
        const dominantCategory = categoryResult.labels[0];
        const sentimentScore = sentimentResult[0]?.score || 0.5;
        
        insight = {
          category: dominantCategory,
          priority: determinePriority(taskText, dominantCategory, sentimentScore),
          estimatedDuration: estimateDuration(taskText, dominantCategory),
          difficulty: determineDifficulty(taskText, dominantCategory),
          tags: generateTags(taskText, dominantCategory),
          suggestions: generateSuggestions(taskText, dominantCategory, sentimentScore),
          stressLevel: Math.round(sentimentScore * 10),
        };
      } else {
        // Fallback to rule-based analysis
        insight = ruleBasedAnalysis(taskText);
      }

      setCurrentInsight(insight);
      generateSmartSuggestions(insight);
    } catch (error) {
      console.error('Error analyzing task:', error);
      // Fallback to rule-based
      const insight = ruleBasedAnalysis(taskText);
      setCurrentInsight(insight);
      generateSmartSuggestions(insight);
    } finally {
      setIsLoading(false);
    }
  }, [aiModels]);

  const determinePriority = (task: string, category: string, sentiment: number): 'low' | 'medium' | 'high' => {
    const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
    const highPriorityCategories = ['Exam', 'Assignment', 'Meeting'];
    
    if (urgentWords.some(word => task.toLowerCase().includes(word))) return 'high';
    if (highPriorityCategories.includes(category)) return 'high';
    if (sentiment > 0.7) return 'medium';
    return 'low';
  };

  const estimateDuration = (task: string, category: string): number => {
    const durationMap: Record<string, number> = {
      'Assignment': 120,
      'Study': 90,
      'Project': 240,
      'Exam': 180,
      'Meeting': 60,
      'Research': 150,
      'Personal': 30,
    };
    
    // Adjust based on task complexity
    const complexityKeywords = ['detailed', 'comprehensive', 'thorough', 'extensive'];
    const isComplex = complexityKeywords.some(word => task.toLowerCase().includes(word));
    
    let baseDuration = durationMap[category] || 60;
    if (isComplex) baseDuration *= 1.5;
    
    return Math.round(baseDuration);
  };

  const determineDifficulty = (task: string, category: string): 'easy' | 'medium' | 'hard' => {
    const hardKeywords = ['complex', 'difficult', 'challenging', 'advanced'];
    const easyKeywords = ['simple', 'basic', 'quick', 'easy'];
    
    if (hardKeywords.some(word => task.toLowerCase().includes(word))) return 'hard';
    if (easyKeywords.some(word => task.toLowerCase().includes(word))) return 'easy';
    if (category === 'Project' || category === 'Exam') return 'hard';
    return 'medium';
  };

  const generateTags = (task: string, category: string): string[] => {
    const tags = [category];
    
    const tagKeywords: Record<string, string[]> = {
      'Assignment': ['deadline', 'submit', 'grade'],
      'Study': ['review', 'practice', 'learn'],
      'Project': ['create', 'build', 'develop'],
      'Exam': ['test', 'prepare', 'memorize'],
      'Meeting': ['discuss', 'collaborate', 'team'],
      'Research': ['investigate', 'analyze', 'explore'],
    };
    
    tagKeywords[category]?.forEach(keyword => {
      if (task.toLowerCase().includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return tags.slice(0, 4);
  };

  const generateSuggestions = (task: string, category: string, sentiment: number): string[] => {
    const suggestions: string[] = [];
    
    if (category === 'Study') {
      suggestions.push('Break this into 25-minute Pomodoro sessions');
      suggestions.push('Create a quick summary before starting');
    } else if (category === 'Assignment') {
      suggestions.push('Start with the hardest part first');
      suggestions.push('Set mini-deadlines for each section');
    } else if (category === 'Project') {
      suggestions.push('Create a detailed project plan');
      suggestions.push('Identify potential blockers early');
    }
    
    if (sentiment > 0.6) {
      suggestions.push('You seem confident - tackle this when energy is high');
    } else {
      suggestions.push('Consider breaking this into smaller steps');
    }
    
    return suggestions.slice(0, 3);
  };

  const ruleBasedAnalysis = (task: string): TaskInsight => {
    const categories = ['Assignment', 'Study', 'Project', 'Exam', 'Meeting', 'Research', 'Personal'];
    const category = categories.find(cat => 
      task.toLowerCase().includes(cat.toLowerCase())
    ) || 'Personal';

    return {
      category,
      priority: determinePriority(task, category, 0.5),
      estimatedDuration: estimateDuration(task, category),
      difficulty: determineDifficulty(task, category),
      tags: generateTags(task, category),
      suggestions: generateSuggestions(task, category, 0.5),
      stressLevel: 5,
    };
  };

  const generateSmartSuggestions = (insight: TaskInsight) => {
    const newSuggestions: SmartSuggestion[] = [];

    // Time-based suggestions
    if (insight.estimatedDuration > 120) {
      newSuggestions.push({
        id: 'break-down',
        type: 'optimization',
        title: 'Break Down Large Task',
        description: `This ${insight.category.toLowerCase()} task might take ${Math.round(insight.estimatedDuration / 60)} hours. Consider splitting it.`,
        actionable: true,
        icon: <ScheduleIcon />,
      });
    }

    // Priority-based suggestions
    if (insight.priority === 'high') {
      newSuggestions.push({
        id: 'high-priority',
        type: 'warning',
        title: 'High Priority Detected',
        description: 'This task should be scheduled today or tomorrow.',
        actionable: true,
        icon: <PriorityIcon />,
      });
    }

    // Difficulty-based suggestions
    if (insight.difficulty === 'hard') {
      newSuggestions.push({
        id: 'prepare',
        type: 'tip',
        title: 'Preparation Needed',
        description: 'This is a complex task. Gather resources and plan your approach.',
        actionable: true,
        icon: <LightbulbIcon />,
      });
    }

    // Stress-based suggestions
    if (insight.stressLevel > 7) {
      newSuggestions.push({
        id: 'stress-management',
        type: 'tip',
        title: 'Stress Management',
        description: 'This task might be stressful. Schedule breaks and practice mindfulness.',
        actionable: true,
        icon: <PsychologyIcon />,
      });
    }

    setSuggestions(newSuggestions);
  };

  const toggleVoiceInput = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  const handleSubmit = () => {
    if (taskInput.trim()) {
      analyzeTask(taskInput);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#757575';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'hard': return '#f44336';
      case 'medium': return '#ff9800';
      case 'easy': return '#4caf50';
      default: return '#757575';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card sx={{ mb: 3, position: 'relative' }}>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              <AIIcon />
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Smart Task Assistant
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Smart task analysis and optimization with your Study Buddy
              </Typography>
            </Box>
            {isLoading && (
              <Box sx={{ ml: 'auto' }}>
                <LinearProgress sx={{ width: 100 }} />
              </Box>
            )}
          </Box>

          {/* Input Section */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder="Describe your task... (e.g., 'Complete the advanced calculus assignment by Friday')"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              sx={{ mb: 2 }}
            />
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!taskInput.trim() || isLoading}
                  startIcon={<SendIcon />}
                  sx={{ flexGrow: 1 }}
                >
                  Analyze Task
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Tooltip title={isListening ? 'Stop Recording' : 'Voice Input'}>
                  <IconButton
                    onClick={toggleVoiceInput}
                    color={isListening ? 'error' : 'primary'}
                    sx={{ bgcolor: isListening ? 'error.light' : 'primary.light' }}
                  >
                    {isListening ? <MicOffIcon /> : <MicIcon />}
                  </IconButton>
                </Tooltip>
              </motion.div>
            </Box>
          </Box>

          {/* Task Insights */}
          <AnimatePresence>
            {currentInsight && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <InsightIcon color="primary" />
                    Task Analysis
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="textSecondary">Category</Typography>
                      <Chip label={currentInsight.category} size="small" sx={{ mt: 0.5 }} />
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="textSecondary">Priority</Typography>
                      <Chip 
                        label={currentInsight.priority} 
                        size="small" 
                        sx={{ 
                          mt: 0.5,
                          bgcolor: getPriorityColor(currentInsight.priority),
                          color: 'white'
                        }} 
                      />
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="textSecondary">Duration</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {currentInsight.estimatedDuration}min
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="textSecondary">Difficulty</Typography>
                      <Chip 
                        label={currentInsight.difficulty} 
                        size="small" 
                        sx={{ 
                          mt: 0.5,
                          bgcolor: getDifficultyColor(currentInsight.difficulty),
                          color: 'white'
                        }} 
                      />
                    </Grid>
                  </Grid>

                  {/* Tags */}
                  {currentInsight.tags.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="textSecondary">Tags</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {currentInsight.tags.map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Suggestions */}
                  {currentInsight.suggestions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="textSecondary">Suggestions</Typography>
                      {currentInsight.suggestions.map((suggestion, index) => (
                        <Typography key={index} variant="body2" sx={{ mt: 0.5 }}>
                          • {suggestion}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Smart Suggestions */}
          {suggestions.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SparkleIcon color="primary" />
                Smart Suggestions
              </Typography>
              
              {suggestions.map((suggestion) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert 
                    severity={suggestion.type === 'warning' ? 'warning' : 'info'} 
                    sx={{ mb: 1 }}
                    action={
                      suggestion.actionable && (
                        <Button size="small" color="inherit">
                          Apply
                        </Button>
                      )
                    }
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {suggestion.icon}
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {suggestion.title}
                        </Typography>
                        <Typography variant="body2">
                          {suggestion.description}
                        </Typography>
                      </Box>
                    </Box>
                  </Alert>
                </motion.div>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SmartTaskAssistant;
