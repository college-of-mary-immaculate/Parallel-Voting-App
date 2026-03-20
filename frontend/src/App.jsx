import { useState, useEffect } from 'react';
import { api } from './api.js';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Box, 
  Container, 
  Alert, 
  AppBar, 
  Toolbar, 
  Paper,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { 
  HowToVote, 
  People, 
  Assessment, 
  Settings, 
  Refresh,
  TrendingUp,
  Event,
  CheckCircle,
  Error,
  Warning
} from '@mui/icons-material';
import VotingCard from './components/VotingCard';
import VotingDashboard from './components/VotingDashboard';
import './App.css';

// Create custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      dark: '#115293',
      light: '#42a5f5',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    success: {
      main: '#2e7d32',
    },
    warning: {
      main: '#ed6c02',
    },
    error: {
      main: '#d32f2f',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
});

function App() {
  const [backendStatus, setBackendStatus] = useState('disconnected');
  const [message, setMessage] = useState('');
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check backend connection on mount
  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        setLoading(true);
        const health = await api.healthCheck();
        setBackendStatus('connected');
        setMessage('✅ Backend connected successfully!');
        console.log('🔗 Frontend connected to backend:', health);
        
        // Load elections
        const electionsData = await api.getAll();
        if (electionsData.success) {
          setElections(electionsData.data);
        }
      } catch (error) {
        setBackendStatus('error');
        setMessage('❌ Backend connection failed');
        console.error('Backend connection error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBackendConnection();
  }, []);

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const electionsData = await api.getAll();
      if (electionsData.success) {
        setElections(electionsData.data);
        setMessage('🔄 Data refreshed successfully!');
      }
    } catch (error) {
      setMessage('❌ Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  // Test login function
  const handleTestLogin = async () => {
    try {
      const result = await api.login({
        email: 'test@example.com',
        password: 'Test123'
      });
      console.log('🔐 Login test:', result);
      setMessage(result.success ? '✅ Login successful!' : '❌ Login failed');
    } catch (error) {
      console.error('Login error:', error);
      setMessage('❌ Login error occurred');
    }
  };

  // Test voting function
  const handleTestVote = async () => {
    try {
      const result = await api.vote({
        electionId: 1,
        candidateId: 1,
        voterId: 'test-voter-123'
      });
      console.log('🗳️ Vote test:', result);
      setMessage(result.success ? '✅ Vote cast successfully!' : '❌ Vote failed');
    } catch (error) {
      console.error('Vote error:', error);
      setMessage('❌ Vote error occurred');
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '100vh',
            flexDirection: 'column',
            gap: 2
          }}>
            <LinearProgress sx={{ width: '100%', maxWidth: 400 }} />
            <Typography variant="h6" color="text.secondary">
              Loading Voting System...
            </Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        {/* Header */}
        <AppBar position="static" sx={{ 
          background: 'linear-gradient(135deg, #1976d2 0%, #115293 100%)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <Toolbar>
            <Avatar sx={{ 
              bgcolor: 'white', 
              color: 'primary.main', 
              mr: 2,
              width: 40,
              height: 40
            }}>
              <HowToVote />
            </Avatar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              🗳️ Parallel Voting System
            </Typography>
            <IconButton color="inherit" onClick={handleRefresh} disabled={refreshing}>
              <Refresh />
            </IconButton>
            <Chip 
              label={backendStatus === 'connected' ? 'Connected' : 'Disconnected'}
              color={backendStatus === 'connected' ? 'success' : 'error'}
              variant="outlined"
              sx={{ ml: 2, color: 'white', borderColor: 'white' }}
            />
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* Status Alert */}
            {message && (
              <Alert 
                severity={message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'warning'}
                onClose={() => setMessage('')}
                sx={{ 
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    fontWeight: 500
                  }
                }}
                icon={
                  message.includes('✅') ? <CheckCircle /> : 
                  message.includes('❌') ? <Error /> : <Warning />
                }
              >
                {message}
              </Alert>
            )}

            {/* Stats Cards */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
                  color: 'white'
                }}>
                  <People sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {elections.length}
                  </Typography>
                  <Typography variant="body2">
                    Total Elections
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #66bb6a 0%, #2e7d32 100%)',
                  color: 'white'
                }}>
                  <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {elections.filter(e => e.status === 'active').length}
                  </Typography>
                  <Typography variant="body2">
                    Active Elections
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #ffa726 0%, #ed6c02 100%)',
                  color: 'white'
                }}>
                  <Assessment sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {elections.reduce((sum, e) => sum + (e.totalVotes || 0), 0)}
                  </Typography>
                  <Typography variant="body2">
                    Total Votes
                  </Typography>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  p: 2, 
                  textAlign: 'center',
                  background: 'linear-gradient(135deg, #ef5350 0%, #d32f2f 100%)',
                  color: 'white'
                }}>
                  <Event sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="h4" fontWeight="bold">
                    {elections.filter(e => e.status === 'completed').length}
                  </Typography>
                  <Typography variant="body2">
                    Completed
                  </Typography>
                </Card>
              </Grid>
            </Grid>

            {/* Test Functions */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Settings />
                Test Functions
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button 
                  variant="contained" 
                  startIcon={<HowToVote />}
                  onClick={handleTestLogin}
                  sx={{ borderRadius: 2 }}
                >
                  Test Login
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<Assessment />}
                  onClick={handleTestVote}
                  sx={{ borderRadius: 2 }}
                >
                  Test Vote
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  disabled={refreshing}
                  sx={{ borderRadius: 2 }}
                >
                  Refresh Data
                </Button>
              </Box>
            </Paper>

            {/* Elections Dashboard */}
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Assessment />
                Live Voting Dashboard
              </Typography>
              <VotingDashboard elections={elections} />
            </Paper>

            {/* Elections Grid */}
            <Box>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <HowToVote />
                Available Elections
              </Typography>
              <Grid container spacing={3}>
                {elections.map((election) => (
                  <Grid item xs={12} md={6} lg={4} key={election.id}>
                    <VotingCard election={election} />
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Empty State */}
            {elections.length === 0 && (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                <HowToVote sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Elections Available
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Please check your connection or create an election to get started.
                </Typography>
                <Button variant="contained" onClick={handleRefresh}>
                  Refresh Data
                </Button>
              </Paper>
            )}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
