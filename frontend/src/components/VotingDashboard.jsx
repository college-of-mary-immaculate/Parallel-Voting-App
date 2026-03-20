import React, { useState, useEffect } from 'react';
import { Grid, Card, Card, CardContent, Typography, LinearProgress, Box } from '@mui/material';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const VotingDashboard = () => {
  const [elections, setElections] = useState([]);

  useEffect(() => {
    // Mock data - in real app, fetch from backend
    const mockElections = [
      {
        id: 1,
        title: 'Student Council Election 2024',
        description: 'Election for student council representatives',
        status: 'active',
        startTime: '2024-03-20T09:00:00',
        endTime: '2024-03-20T17:00:00',
        candidates: [
          { id: 1, name: 'Alice Johnson', party: 'Independent', votes: 150 },
          { id: 2, name: 'Bob Smith', party: 'Democratic', votes: 120 },
          { id: 3, name: 'Charlie Davis', party: 'Green', votes: 95 }
        ],
        totalVotes: 365
      },
      {
        id: 2,
        title: 'Technology Committee Election 2024',
        description: 'Election for technology committee members',
        status: 'completed',
        startTime: '2024-02-15T10:00:00',
        endTime: '2024-02-15T16:00:00',
        candidates: [
          { id: 1, name: 'David Lee', party: 'Tech', votes: 89 },
          { id: 2, name: 'Eva Martinez', party: 'Tech', votes: 134 }
        ],
        totalVotes: 223
      }
    ];
    setElections(mockElections);
  }, []);

  const totalVotes = elections.reduce((sum, election) => sum + election.totalVotes, 0);

  return (
    <Box sx={{ p: 3, flexGrow: 1 }}>
      <Typography variant="h4" component="h2" gutterBottom={2}>
        Voting Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {elections.map((election, index) => (
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="h2">
                  {election.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {election.description}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body1">
                    <strong>Status:</strong>
                    <Chip 
                      label={election.status} 
                      color={election.status === 'active' ? 'success' : 'default'}
                      size="small"
                    />
                    <span>Starts: {new Date(election.startTime).toLocaleString()}</span>
                    <span>Ends: {new Date(election.endTime).toLocaleString()}</span>
                  </Typography>
                  <Typography variant="body1">
                    <strong>Total Votes:</strong> {election.totalVotes || 0}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={(election.totalVotes / 100) * 100} 
                    sx={{ mb: 1 }}
                  />
                </Typography>
              </CardContent>
              <CardActions>
                <Button variant="outlined" size="small">
                  View Details
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Grid item xs={12} md={6} lg={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" component="h2">
              Total Votes Cast
            </Typography>
            <Typography variant="h3" component="h3">
              {totalVotes.toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6} lg={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" component="h2">
              Active Elections
            </Typography>
            <Typography variant="body1">
              {elections.filter(e => e.status === 'active').length} active elections
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Box>
  );
};

export default VotingDashboard;
