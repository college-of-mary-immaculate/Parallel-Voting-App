import React from 'react';
import { 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Typography, 
  Chip, 
  Box,
  Avatar,
  LinearProgress,
  IconButton,
  Paper,
  Divider
} from '@mui/material';
import { 
  HowToVote, 
  People, 
  TrendingUp, 
  Schedule, 
  CheckCircle,
  Error,
  Info
} from '@mui/icons-material';

const VotingCard = ({ election, onVote }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'completed': return 'default';
      case 'pending': return 'warning';
      default: return 'error';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircle />;
      case 'completed': return <CheckCircle />;
      case 'pending': return <Schedule />;
      default: return <Error />;
    }
  };

  const getTopCandidate = () => {
    if (!election.candidates || election.candidates.length === 0) return null;
    return election.candidates.reduce((prev, current) => 
      (prev.votes > current.votes) ? prev : current
    );
  };

  const totalVotes = election.candidates?.reduce((sum, candidate) => sum + (candidate.votes || 0), 0) || 0;
  const topCandidate = getTopCandidate();

  return (
    <Card sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 3,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      }
    }}>
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ 
            bgcolor: getStatusColor(election.status) + '.main',
            width: 48,
            height: 48,
            mr: 2
          }}>
            {getStatusIcon(election.status)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {election.title}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={election.status?.toUpperCase() || 'UNKNOWN'}
                color={getStatusColor(election.status)}
                size="small"
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                ID: {election.id}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {election.description || 'No description available'}
        </Typography>

        {/* Time Info */}
        {election.startTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.secondary' }}>
            <Schedule sx={{ fontSize: 16, mr: 1 }} />
            <Typography variant="caption">
              {new Date(election.startTime).toLocaleDateString()} - {new Date(election.endTime).toLocaleDateString()}
            </Typography>
          </Box>
        )}

        {/* Candidates */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <People sx={{ fontSize: 18 }} />
            Candidates ({election.candidates?.length || 0})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {election.candidates?.slice(0, 3).map((candidate, index) => (
              <Chip 
                key={candidate.id}
                label={candidate.name}
                variant="outlined"
                size="small"
                sx={{ 
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              />
            ))}
            {election.candidates?.length > 3 && (
              <Chip 
                label={`+${election.candidates.length - 3} more`}
                variant="outlined"
                size="small"
                sx={{ fontSize: '0.75rem' }}
              />
            )}
          </Box>
        </Box>

        {/* Voting Stats */}
        {totalVotes > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp sx={{ fontSize: 18 }} />
                Total Votes
              </Typography>
              <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
                {totalVotes}
              </Typography>
            </Box>
            
            {/* Top Candidate */}
            {topCandidate && (
              <Paper sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Leading Candidate
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {topCandidate.name}
                  </Typography>
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                    {topCandidate.votes} ({Math.round((topCandidate.votes / totalVotes) * 100)}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(topCandidate.votes / totalVotes) * 100}
                  sx={{ mt: 1, height: 4, borderRadius: 2 }}
                />
              </Paper>
            )}
          </Box>
        )}

        {/* Action Buttons */}
        {election.status === 'active' && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<HowToVote />}
              onClick={() => onVote && onVote(election.id)}
              sx={{ 
                borderRadius: 2,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.3)'
              }}
            >
              Vote Now
            </Button>
          </Box>
        )}
      </CardContent>

      {/* Footer */}
      {election.status === 'completed' && (
        <>
          <Divider />
          <CardActions sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
              <Typography variant="caption" color="text.secondary">
                Election Completed
              </Typography>
            </Box>
            <Button size="small" variant="outlined">
              View Results
            </Button>
          </CardActions>
        </>
      )}
    </Card>
  );
};

export default VotingCard;
