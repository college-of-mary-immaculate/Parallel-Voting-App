import { useState, useEffect } from 'react';
import { api } from './api.js';
import { Grid, Card, CardContent, Typography, Button, Box, Container, Alert } from '@mui/material';
import VotingCard from './components/VotingCard';
import VotingDashboard from './components/VotingDashboard';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [backendStatus, setBackendStatus] = useState('disconnected');
  const [message, setMessage] = useState('');
  const [elections, setElections] = useState([]);

  // Check backend connection on mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        const health = await api.healthCheck();
        setBackendStatus('connected');
        setMessage('✅ Backend connected successfully!');
        console.log('🔗 Frontend connected to backend:', health);
        
        // Load elections
        const electionsData = await api.getResults();
        setElections(electionsData);
      } catch (error) {
        setBackendStatus('error');
        setMessage('❌ Backend connection failed');
        console.error('❌ Frontend-backend connection error:', error);
      }
    };

    checkBackendConnection();
  }, []);

  // Test vote function
  const handleVote = async (electionId, candidateId) => {
    try {
      const result = await api.castVote({
        electionId,
        candidateId,
        voterId: 1
      });
      
      if (result.success) {
        setMessage('✅ Vote cast successfully!');
        console.log('✅ Frontend vote successful:', result);
        
        // Update elections data
        const electionsData = await api.getResults();
        setElections(electionsData);
      } else {
        setMessage('❌ Vote failed');
        console.error('❌ Frontend vote failed:', result);
      }
    } catch (error) {
      setMessage('❌ Vote error');
      console.error('❌ Frontend vote error:', error);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box className="header" sx={{ p: 2, mb: 4, backgroundColor: 'primary.main', color: 'white' }}>
        <Container maxWidth="md">
          <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
            <img src={viteLogo} className="logo" alt="Vite logo" style={{ height: 40 }} />
            <Typography variant="h4" sx={{ ml: 2, color: 'white' }}>
              Parallel Voting System
            </Typography>
          </Box>
        </Container>
      </Box>
      
      <Typography variant="h5" align="center" sx={{ mt: 1, mb: 2 }}>
        {message && (
          <Alert severity="success" onClose={() => setMessage('')}>
            {message}
          </Alert>
        )}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" component="h2" gutterBottom={2}>
            🗳️ Live Voting Dashboard
          </Typography>
          <VotingDashboard />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" component="h2" gutterBottom={2}>
            📊 Active Elections
          </Typography>
          <Grid container spacing={2}>
            {elections.filter(e => e.status === 'active').map((election, index) => (
              <Grid item xs={12} sm={6} md={4}>
                <VotingCard 
                  key={election.id}
                  election={election}
                  onVote={handleVote}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" component="h2" gutterBottom={2}>
            🧪 Simple Counter
          </Typography>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2">
                Test UI Functionality
              </Typography>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Count: {count}
                </Typography>
                <Button 
                  variant="contained" 
                  onClick={() => setCount((count) => count + 1)}
                  size="large"
                >
                  Increment
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={() => setCount(0)}
                  size="large"
                >
                  Reset
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default App;
