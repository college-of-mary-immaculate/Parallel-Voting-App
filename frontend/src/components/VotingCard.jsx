import React from 'react';
import { Card, CardContent, CardActions, Button, Typography, Chip } from '@mui/material';

const VotingCard = ({ election, onVote }) => {
  return (
    <Card sx={{ minWidth: 275, mb: 2 }}>
      <CardContent>
        <Typography variant="h6" component="h2">
          {election.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {election.description}
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          <strong>Candidates:</strong>
          {election.candidates?.map((candidate, index) => (
            <Chip key={candidate.id} label={candidate.name} variant="outlined" sx={{ mr: 0.5 }} />
          )) || 'No candidates available'}
        </Typography>
        <Typography variant="body1" sx={{ mt: 2 }}>
          <strong>Status:</strong>
          <Chip 
            label={election.status} 
            color={election.status === 'active' ? 'success' : 'default'}
            size="small"
          />
          <span>Starts: {new Date(election.startTime).toLocaleString()}</span>
          <span>Ends: {new Date(election.endTime).toLocaleString()}</span>
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          <strong>Total Votes:</strong> {election.totalVotes || 0}
        </Typography>
      </CardContent>
      <CardActions>
        <Button 
          variant="contained" 
          color="primary"
          onClick={onVote}
          disabled={election.status !== 'active'}
        >
          Vote Now
        </Button>
      </CardActions>
    </Card>
  );
};

export default VotingCard;
