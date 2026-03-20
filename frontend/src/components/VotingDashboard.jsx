import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  LinearProgress, 
  Box,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  TrendingUp, 
  People, 
  HowToVote, 
  Schedule, 
  Refresh,
  Assessment,
  BarChart,
  PieChart,
  Timeline
} from '@mui/icons-material';

const VotingDashboard = ({ elections = [] }) => {
  const [selectedElection, setSelectedElection] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const totalElections = elections.length;
  const activeElections = elections.filter(e => e.status === 'active').length;
  const completedElections = elections.filter(e => e.status === 'completed').length;
  const totalVotes = elections.reduce((sum, e) => sum + (e.totalVotes || 0), 0);
  const totalCandidates = elections.reduce((sum, e) => sum + (e.candidates?.length || 0), 0);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <Card sx={{ 
      p: 2, 
      textAlign: 'center',
      background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
      color: 'white',
      borderRadius: 3,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
      }
    }}>
      <Avatar sx={{ 
        bgcolor: 'rgba(255,255,255,0.2)', 
        color: 'white',
        width: 56,
        height: 56,
        mx: 'auto',
        mb: 2
      }}>
        {icon}
      </Avatar>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.9 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ opacity: 0.8, mt: 0.5, display: 'block' }}>
          {subtitle}
        </Typography>
      )}
    </Card>
  );

  const ElectionProgress = ({ election }) => {
    const totalVotes = election.totalVotes || 0;
    const maxVotes = Math.max(...(election.candidates?.map(c => c.votes || 0) || [0]));
    const progress = maxVotes > 0 ? (maxVotes / totalVotes) * 100 : 0;
    
    return (
      <Paper sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {election.title}
          </Typography>
          <Chip 
            label={election.status?.toUpperCase() || 'UNKNOWN'}
            color={election.status === 'active' ? 'success' : election.status === 'completed' ? 'default' : 'warning'}
            size="small"
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Total Votes: {totalVotes}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Candidates: {election.candidates?.length || 0}
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress}
          sx={{ 
            height: 8, 
            borderRadius: 4,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
            }
          }}
        />
      </Paper>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Assessment />
          Live Voting Dashboard
        </Typography>
        <Tooltip title="Refresh Dashboard">
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Elections" 
            value={totalElections}
            icon={<BarChart />}
            color="#1976d2"
            subtitle={`${activeElections} active`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Votes Cast" 
            value={totalVotes}
            icon={<HowToVote />}
            color="#2e7d32"
            subtitle={`Across ${completedElections} completed`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Candidates" 
            value={totalCandidates}
            icon={<People />}
            color="#ed6c02"
            subtitle={`Avg: ${totalElections > 0 ? Math.round(totalCandidates / totalElections) : 0} per election`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Completion Rate" 
            value={`${totalElections > 0 ? Math.round((completedElections / totalElections) * 100) : 0}%`}
            icon={<PieChart />}
            color="#d32f2f"
            subtitle={`${completedElections} of ${totalElections} completed`}
          />
        </Grid>
      </Grid>

      {/* Elections Progress */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timeline />
              Election Progress
            </Typography>
            {elections.length > 0 ? (
              elections.map((election) => (
                <ElectionProgress key={election.id} election={election} />
              ))
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No elections data available
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TrendingUp />
              Quick Stats
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Active Elections
                </Typography>
                <Chip 
                  label={activeElections}
                  color="success"
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Completed Elections
                </Typography>
                <Chip 
                  label={completedElections}
                  color="default"
                  size="small"
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Avg Votes per Election
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {totalElections > 0 ? Math.round(totalVotes / totalElections) : 0}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Avg Candidates per Election
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {totalElections > 0 ? Math.round(totalCandidates / totalElections) : 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VotingDashboard;
