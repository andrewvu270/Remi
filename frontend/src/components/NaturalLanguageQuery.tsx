import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { agentService } from '../utils/agentService';

interface QueryResponse {
  response: string;
  actions_taken?: string[];
  related_tasks?: any[];
  suggestions?: string[];
  research_sources?: Array<{
    source: string;
    title?: string;
    url?: string;
    summary?: string;
  }>;
}

const NaturalLanguageQuery: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queryHistory, setQueryHistory] = useState<{ query: string; response: QueryResponse }[]>([]);

  const exampleQueries = [
    "What's my busiest day this week?",
    "Move low-effort tasks to tomorrow",
    "Show me high-priority tasks",
    "How many hours of work do I have today?",
    "What assignments are due soon?",
    "Help me plan my study schedule",
  ];

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const userId = localStorage.getItem('access_token') ? 'registered' : 'guest';
      const result = await agentService.naturalLanguageQuery({
        query,
        user_id: userId,
      });

      setResponse(result);
      setQueryHistory(prev => [{ query, response: result }, ...prev.slice(0, 4)]); // Keep last 5 queries
      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process query');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Ask me anything about your schedule..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          multiline
          maxRows={3}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '16px',
            }
          }}
        />
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !query.trim()}
          sx={{
            borderRadius: '16px',
            minWidth: '120px',
            px: 2
          }}
        >
          {loading ? <CircularProgress size={20} /> : <SendIcon />}
        </Button>
      </Box>

      {/* Example Queries */}
      {!query && !loading && !response && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Try asking:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {exampleQueries.map((example, index) => (
              <Chip
                key={index}
                label={example}
                variant="outlined"
                size="small"
                clickable
                onClick={() => handleExampleClick(example)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText'
                  }
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '16px' }}>
          {error}
        </Alert>
      )}

      {/* Response */}
      {response && (
        <Box sx={{
          p: 2,
          bgcolor: 'grey.50',
          borderRadius: '16px',
          border: '1px solid',
          borderColor: 'grey.200'
        }}>
          <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.6, color: 'text.primary', fontWeight: 500 }}>
            {response.response}
          </Typography>

          {/* Actions Taken */}
          {response.actions_taken && response.actions_taken.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Actions taken:
              </Typography>
              {response.actions_taken.map((action, index) => (
                <Chip
                  key={index}
                  label={action}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}

          {/* Related Tasks */}
          {response.related_tasks && response.related_tasks.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Related tasks:
              </Typography>
              {response.related_tasks.map((task, index) => (
                <Box key={index} sx={{
                  p: 1,
                  bgcolor: 'white',
                  borderRadius: '8px',
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {task.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Due: {new Date(task.due_date).toLocaleDateString()} •
                    {task.predicted_hours ? ` ${task.predicted_hours.toFixed(1)}h` : ''}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* Research Sources */}
          {response.research_sources && response.research_sources.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <SearchIcon fontSize="small" />
                Research sources:
              </Typography>
              {response.research_sources.map((source, index) => (
                <Box key={index} sx={{
                  p: 1,
                  bgcolor: 'white',
                  borderRadius: '8px',
                  mb: 1,
                  border: '1px solid',
                  borderColor: 'grey.200'
                }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {source.title || source.source}
                  </Typography>
                  {source.summary && (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                      {source.summary}
                    </Typography>
                  )}
                  {source.url && (
                    <Typography variant="caption" color="primary.main" sx={{ mt: 0.5, display: 'block' }}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                        View source →
                      </a>
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}

          {/* Suggestions */}
          {response.suggestions && response.suggestions.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Suggestions:
              </Typography>
              {response.suggestions.map((suggestion, index) => (
                <Typography key={index} variant="body2" color="textSecondary" sx={{ mb: 0.5 }}>
                  • {suggestion}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* Query History */}
      {queryHistory.length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Recent conversations:
          </Typography>
          {queryHistory.map((item, index) => (
            <Box key={index} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => {
              setResponse(item.response);
              setQuery(item.query);
            }}>
              <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                {item.query}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ ml: 1 }}>
                {item.response.response.substring(0, 100)}...
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default NaturalLanguageQuery;
