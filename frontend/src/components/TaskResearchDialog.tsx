import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  Search as SearchIcon,
  People as PeopleIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { Task } from '../types/task';

interface TaskResearchDialogProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
}

const TaskResearchDialog: React.FC<TaskResearchDialogProps> = ({ task, open, onClose }) => {
  if (!task) return null;

  const hasResearchData = !!(
    task.research_sources ||
    task.wiki_summary ||
    task.academic_sources ||
    task.community_answers ||
    task.research_insights
  );

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'wikipedia':
        return <SchoolIcon fontSize="small" />;
      case 'arxiv':
      case 'scholar':
        return <SearchIcon fontSize="small" />;
      case 'stackexchange':
        return <PeopleIcon fontSize="small" />;
      default:
        return <SearchIcon fontSize="small" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'wikipedia':
        return '#000000';
      case 'arxiv':
        return '#b31b1b';
      case 'scholar':
        return '#4285f4';
      case 'stackexchange':
        return '#f48024';
      case 'web_search':
        return '#34a853';
      default:
        return '#757575';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6">Research Insights</Typography>
          <Typography variant="body2" color="textSecondary">
            {task.title}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pb: 2 }}>
        {!hasResearchData ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="textSecondary">
              No research data available for this task.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Wikipedia Summary */}
            {task.wiki_summary && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon sx={{ color: getSourceColor('wikipedia') }} />
                    <Typography variant="subtitle1">Wikipedia Summary</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {task.wiki_summary}
                  </Typography>
                  {task.research_sources?.find(s => s.source === 'wikipedia')?.reference?.map((ref, idx) => (
                    <Link key={idx} href={ref.url} target="_blank" rel="noopener noreferrer" sx={{ display: 'block', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption">{ref.title}</Typography>
                        <OpenInNewIcon fontSize="inherit" />
                      </Box>
                    </Link>
                  ))}
                </AccordionDetails>
              </Accordion>
            )}

            {/* Academic Sources */}
            {task.academic_sources && task.academic_sources.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon sx={{ color: getSourceColor('arxiv') }} />
                    <Typography variant="subtitle1">Academic Sources</Typography>
                    <Chip label={task.academic_sources.length} size="small" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {task.academic_sources.map((source, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {source.title}
                              </Typography>
                              {source.url && (
                                <IconButton size="small" href={source.url} target="_blank" rel="noopener noreferrer">
                                  <OpenInNewIcon fontSize="inherit" />
                                </IconButton>
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              {source.authors && (
                                <Typography variant="caption" color="textSecondary">
                                  Authors: {source.authors.join(', ')}
                                </Typography>
                              )}
                              {source.summary && (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                  {source.summary}
                                </Typography>
                              )}
                              {source.citation && (
                                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                                  {source.citation}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Community Answers */}
            {task.community_answers && task.community_answers.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PeopleIcon sx={{ color: getSourceColor('stackexchange') }} />
                    <Typography variant="subtitle1">Community Q&A</Typography>
                    <Chip label={task.community_answers.length} size="small" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {task.community_answers.map((answer, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {answer.title}
                              </Typography>
                              {answer.score !== undefined && (
                                <Chip label={`+${answer.score}`} size="small" color="primary" />
                              )}
                              {answer.link && (
                                <IconButton size="small" href={answer.link} target="_blank" rel="noopener noreferrer">
                                  <OpenInNewIcon fontSize="inherit" />
                                </IconButton>
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              {answer.summary && (
                                <Typography variant="body2">
                                  {answer.summary}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Research Insights */}
            {task.research_insights && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon sx={{ color: getSourceColor('web_search') }} />
                    <Typography variant="subtitle1">Research Insights</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {task.research_insights.typical_hours && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Typical Time Estimate
                        </Typography>
                        <Typography variant="body2">
                          {task.research_insights.typical_hours}
                        </Typography>
                      </Box>
                    )}
                    
                    {task.research_insights.difficulty_factors && task.research_insights.difficulty_factors.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Difficulty Factors
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {task.research_insights.difficulty_factors.map((factor, idx) => (
                            <Chip key={idx} label={factor} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {task.research_insights.recommendations && task.research_insights.recommendations.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom>
                          Recommendations
                        </Typography>
                        <List dense>
                          {task.research_insights.recommendations.map((rec, idx) => (
                            <ListItem key={idx} sx={{ px: 0 }}>
                              <ListItemText primary={rec} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}

            {/* All Research Sources */}
            {task.research_sources && task.research_sources.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SearchIcon />
                    <Typography variant="subtitle1">All Sources</Typography>
                    <Chip label={task.research_sources.length} size="small" />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    {task.research_sources.map((source, idx) => (
                      <ListItem key={idx} sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getSourceIcon(source.source)}
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {source.source}
                              </Typography>
                              {source.query && (
                                <Typography variant="caption" color="textSecondary">
                                  "{source.query}"
                                </Typography>
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              {source.title && (
                                <Typography variant="caption" color="textSecondary">
                                  {source.title}
                                </Typography>
                              )}
                              {source.result_count !== undefined && (
                                <Typography variant="caption" color="textSecondary" sx={{ ml: 2 }}>
                                  {source.result_count} results
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskResearchDialog;
