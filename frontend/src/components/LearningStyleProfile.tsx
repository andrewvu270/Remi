import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  LinearProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  Paper,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  School as SchoolIcon,
  Lightbulb as LightbulbIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

interface LearningStyle {
  visual: number;
  reading: number;
  hands_on: number;
  auditory: number;
}

interface StudyRecommendation {
  task_type: string;
  best_approach: string;
  techniques: string[];
  estimated_effectiveness: number;
}

const LearningStyleProfile: React.FC = () => {
  const [learningStyle, setLearningStyle] = useState<LearningStyle | null>(null);
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  const quizQuestions = [
    {
      question: "When learning something new, I prefer to:",
      options: [
        "Watch videos or see diagrams",
        "Read detailed explanations",
        "Try it myself with practice",
        "Listen to someone explain it"
      ]
    },
    {
      question: "When I'm stuck on a problem, I:",
      options: [
        "Draw it out or visualize it",
        "Re-read the instructions/text",
        "Experiment with different approaches",
        "Talk through it with someone"
      ]
    },
    {
      question: "I remember information best when:",
      options: [
        "I can see pictures or charts",
        "I can read and re-read notes",
        "I can do hands-on activities",
        "I can discuss it with others"
      ]
    },
    {
      question: "My ideal study session includes:",
      options: [
        "Visual presentations and mind maps",
        "Quiet reading and note-taking",
        "Practice problems and experiments",
        "Group discussions and explanations"
      ]
    }
  ];

  useEffect(() => {
    loadLearningProfile();
  }, []);

  const loadLearningProfile = async () => {
    try {
      const stored = localStorage.getItem('learningStyle');
      if (stored) {
        const profile = JSON.parse(stored);
        setLearningStyle(profile.style);
        setRecommendations(profile.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to load learning profile:', error);
    }
  };

  const saveLearningProfile = async (style: LearningStyle) => {
    try {
      const recommendations = await generateRecommendations(style);
      setLearningStyle(style);
      setRecommendations(recommendations);
      
      const profile = {
        style,
        recommendations,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('learningStyle', JSON.stringify(profile));
    } catch (error) {
      console.error('Failed to save learning profile:', error);
    }
  };

  const generateRecommendations = async (style: LearningStyle): Promise<StudyRecommendation[]> => {
    // This would call the backend to get personalized recommendations
    // For now, return mock recommendations based on dominant style
    
    const dominantStyle = Object.entries(style).reduce((a, b) => 
      style[a[0] as keyof LearningStyle] > style[b[0] as keyof LearningStyle] ? a : b
    )[0];

    const baseRecommendations: StudyRecommendation[] = [
      {
        task_type: "Assignment",
        best_approach: getApproachForStyle(dominantStyle),
        techniques: getTechniquesForStyle(dominantStyle),
        estimated_effectiveness: 85
      },
      {
        task_type: "Exam",
        best_approach: getApproachForStyle(dominantStyle, "exam"),
        techniques: getTechniquesForStyle(dominantStyle, "exam"),
        estimated_effectiveness: 90
      },
      {
        task_type: "Project",
        best_approach: getApproachForStyle(dominantStyle, "project"),
        techniques: getTechniquesForStyle(dominantStyle, "project"),
        estimated_effectiveness: 80
      }
    ];

    return baseRecommendations;
  };

  const getApproachForStyle = (style: string, context: string = "general"): string => {
    const approaches = {
      visual: {
        general: "Start with diagrams and visual representations",
        exam: "Create mind maps and visual summaries",
        project: "Use storyboards and visual planning"
      },
      reading: {
        general: "Begin with comprehensive reading and note-taking",
        exam: "Review detailed notes and create written summaries",
        project: "Research thoroughly and document everything"
      },
      hands_on: {
        general: "Jump into practice problems and experiments",
        exam: "Work through practice tests and examples",
        project: "Build prototypes and test iteratively"
      },
      auditory: {
        general: "Discuss concepts and explain them aloud",
        exam: "Teach concepts to someone else or record yourself",
        project: "Collaborate and get verbal feedback"
      }
    };
    
    return approaches[style as keyof typeof approaches]?.[context as keyof typeof approaches.visual] || "Adapt your approach to the task";
  };

  const getTechniquesForStyle = (style: string, context: string = "general"): string[] => {
    const techniques: Record<string, Record<string, string[]>> = {
      visual: {
        general: [
          "Create mind maps and flowcharts",
          "Use color-coded notes",
          "Watch video tutorials",
          "Draw diagrams to explain concepts"
        ]
      },
      reading: {
        general: [
          "Take detailed structured notes",
          "Create outlines and summaries",
          "Use the SQ3R method (Survey, Question, Read, Recite, Review)",
          "Annotate texts thoroughly"
        ],
        exam: [
          "Review notes multiple times",
          "Create flashcards from key terms",
          "Write practice essays",
          "Summarize each chapter"
        ],
        project: [
          "Research extensively before starting",
          "Document all sources and findings",
          "Create detailed project plans",
          "Write regular progress reports"
        ]
      },
      hands_on: {
        general: [
          "Practice with real examples",
          "Build small prototypes",
          "Use interactive tutorials",
          "Experiment with different approaches"
        ],
        exam: [
          "Work through practice problems",
          "Take timed practice tests",
          "Apply concepts to real scenarios",
          "Use hands-on study tools"
        ],
        project: [
          "Start with a working prototype",
          "Test and iterate frequently",
          "Get hands-on with tools and technologies",
          "Build incrementally"
        ]
      },
      auditory: {
        general: [
          "Explain concepts out loud",
          "Join study groups or discussions",
          "Listen to educational podcasts",
          "Record yourself explaining topics"
        ],
        exam: [
          "Teach concepts to others",
          "Participate in study groups",
          "Use audio recordings for review",
          "Discuss topics with classmates"
        ],
        project: [
          "Collaborate with team members",
          "Present ideas regularly",
          "Get verbal feedback early",
          "Discuss approaches with mentors"
        ]
      }
    };
    
    return techniques[style]?.[context] || techniques[style]?.general || [];
  };

  const handleQuizAnswer = (answerIndex: number) => {
    const newAnswers = [...quizAnswers, answerIndex];
    setQuizAnswers(newAnswers);
    
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      calculateLearningStyle(newAnswers);
    }
  };

  const calculateLearningStyle = (answers: number[]) => {
    const style: LearningStyle = {
      visual: 0,
      reading: 0,
      hands_on: 0,
      auditory: 0
    };

    answers.forEach((answer) => {
      const styleKeys: (keyof LearningStyle)[] = ['visual', 'reading', 'hands_on', 'auditory'];
      if (answer >= 0 && answer < styleKeys.length) {
        style[styleKeys[answer]] += 1;
      }
    });

    // Normalize to percentages
    const total = Object.values(style).reduce((a, b) => a + b, 0);
    Object.keys(style).forEach(key => {
      style[key as keyof LearningStyle] = Math.round((style[key as keyof LearningStyle] / total) * 100);
    });

    saveLearningProfile(style);
    setShowQuiz(false);
    setCurrentQuestion(0);
    setQuizAnswers([]);
  };

  const getDominantStyle = (): string => {
    if (!learningStyle) return 'unknown';
    
    return Object.entries(learningStyle).reduce((a, b) => 
      learningStyle[a[0] as keyof LearningStyle] > learningStyle[b[0] as keyof LearningStyle] ? a : b
    )[0];
  };

  const getStyleColor = (style: string): string => {
    const colors = {
      visual: '#1976d2',
      reading: '#2e7d32',
      hands_on: '#ed6c02',
      auditory: '#9c27b0'
    };
    return colors[style as keyof typeof colors] || '#757575';
  };

  const getStyleIcon = (style: string) => {
    const icons = {
      visual: <PsychologyIcon />,
      reading: <SchoolIcon />,
      hands_on: <LightbulbIcon />,
      auditory: <TrendingUpIcon />
    };
    return icons[style as keyof typeof icons] || <PsychologyIcon />;
  };

  if (showQuiz) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Discover Your Learning Style
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <LinearProgress 
              variant="determinate" 
              value={(currentQuestion / quizQuestions.length) * 100} 
              sx={{ mb: 2 }}
            />
            <Typography variant="body2" color="textSecondary">
              Question {currentQuestion + 1} of {quizQuestions.length}
            </Typography>
          </Box>

          <FormControl component="fieldset">
            <FormLabel component="legend">
              <Typography variant="h6">
                {quizQuestions[currentQuestion].question}
              </Typography>
            </FormLabel>
            <RadioGroup>
              {quizQuestions[currentQuestion].options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={index.toString()}
                  control={<Radio />}
                  label={
                    <Button
                      variant="outlined"
                      onClick={() => handleQuizAnswer(index)}
                      sx={{ mt: 1, textAlign: 'left' }}
                      fullWidth
                    >
                      {option}
                    </Button>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>
        </CardContent>
      </Card>
    );
  }

  if (!learningStyle) {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <PsychologyIcon color="primary" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h6">Discover Your Learning Style</Typography>
              <Typography variant="body2" color="textSecondary">
                Get personalized study recommendations
              </Typography>
            </Box>
          </Box>
          
          <Button
            variant="contained"
            onClick={() => setShowQuiz(true)}
            fullWidth
          >
            Take Learning Style Quiz
          </Button>
        </CardContent>
      </Card>
    );
  }

  const dominant = getDominantStyle();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ color: getStyleColor(dominant) }}>
            {getStyleIcon(dominant)}
          </Box>
          <Box>
            <Typography variant="h6">Your Learning Style</Typography>
            <Typography variant="body2" color="textSecondary">
              Personalized study recommendations based on your profile
            </Typography>
          </Box>
        </Box>

        {/* Learning Style Breakdown */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Style Breakdown
          </Typography>
          {Object.entries(learningStyle).map(([style, percentage]) => (
            <Box key={style} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                  {style.replace('_', ' ')}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {percentage}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={percentage}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: 'grey.200',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: getStyleColor(style)
                  }
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Personalized Recommendations */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Your Study Recommendations
          </Typography>
          {recommendations.map((rec, index) => (
            <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {rec.task_type}s
                </Typography>
                <Chip
                  label={`${rec.estimated_effectiveness}% effective`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Best approach:</strong> {rec.best_approach}
              </Typography>
              
              <Typography variant="body2" color="textSecondary">
                <strong>Techniques:</strong>
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                {rec.techniques.map((technique, techIndex) => (
                  <Chip
                    key={techIndex}
                    label={technique}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Paper>
          ))}
        </Box>

        <Button
          variant="text"
          onClick={() => setShowQuiz(true)}
          sx={{ mt: 2 }}
        >
          Retake Quiz
        </Button>
      </CardContent>
    </Card>
  );
};

export default LearningStyleProfile;
