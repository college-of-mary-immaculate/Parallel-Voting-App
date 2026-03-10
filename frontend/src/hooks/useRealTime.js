import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';
import { generateMockElectionData, simulateRealTimeUpdates } from '../services/mockDataService';

export const useRealTime = (electionId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [liveResults, setLiveResults] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const [votingActivity, setVotingActivity] = useState([]);
  const [useMockData, setUseMockData] = useState(false);

  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
  const mockIntervalRef = useRef(null);

  // Initialize with mock data for testing
  useEffect(() => {
    if (electionId && !liveResults) {
      // Start with mock data
      const mockData = generateMockElectionData(electionId);
      setLiveResults(mockData);
      setLastUpdate(new Date());
      setUseMockData(true);
      
      // Simulate real-time updates
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current);
      }
      
      mockIntervalRef.current = simulateRealTimeUpdates((data) => {
        if (data.type === 'RESULTS_UPDATE') {
          setLiveResults(data.payload.results);
          setLastUpdate(new Date());
          
          // Add to voting activity
          setVotingActivity(prev => [
            {
              id: Date.now(),
              type: 'vote',
              candidateId: data.payload.results.candidates[0]?.id,
              candidateName: data.payload.results.candidates[0]?.name || 'Unknown',
              timestamp: new Date()
            },
            ...prev.slice(0, 9)
          ]);
        }
      }, 3000);
    }

    return () => {
      if (mockIntervalRef.current) {
        clearInterval(mockIntervalRef.current);
      }
    };
  }, [electionId, liveResults]);

  useEffect(() => {
    if (!useMockData) {
      const socket = websocketService.connect(wsUrl);

      socket.onopen = () => {
        setIsConnected(true);
        setError(null);
        // Subscribe to election updates
        websocketService.send({
          type: 'SUBSCRIBE_ELECTION',
          payload: { electionId }
        });
      };

      socket.onclose = () => {
        setIsConnected(false);
      };

      socket.onerror = () => {
        setError('Connection error');
      };

      return () => {
        websocketService.send({
          type: 'UNSUBSCRIBE_ELECTION',
          payload: { electionId }
        });
      };
    } else {
      // Mock connection status
      setIsConnected(true);
      setError(null);
    }
  }, [electionId, wsUrl, useMockData]);

  const handleVoteUpdate = useCallback((data) => {
    if (data.electionId === electionId) {
      setLiveResults(data.results);
      setLastUpdate(new Date());
      
      // Add to voting activity
      setVotingActivity(prev => [
        {
          id: Date.now(),
          type: 'vote',
          candidateId: data.candidateId,
          candidateName: data.candidateName,
          timestamp: new Date()
        },
        ...prev.slice(0, 9) // Keep only last 10 activities
      ]);
    }
  }, [electionId]);

  const handleResultsUpdate = useCallback((data) => {
    if (data.electionId === electionId) {
      setLiveResults(data.results);
      setLastUpdate(new Date());
    }
  }, [electionId]);

  const handleElectionStatus = useCallback((data) => {
    if (data.electionId === electionId) {
      // Handle election status changes
      console.log('Election status changed:', data.status);
    }
  }, [electionId]);

  useEffect(() => {
    if (!useMockData) {
      websocketService.subscribe('VOTE_UPDATE', handleVoteUpdate);
      websocketService.subscribe('RESULTS_UPDATE', handleResultsUpdate);
      websocketService.subscribe('ELECTION_STATUS', handleElectionStatus);

      return () => {
        websocketService.unsubscribe('VOTE_UPDATE', handleVoteUpdate);
        websocketService.unsubscribe('RESULTS_UPDATE', handleResultsUpdate);
        websocketService.unsubscribe('ELECTION_STATUS', handleElectionStatus);
      };
    }
  }, [handleVoteUpdate, handleResultsUpdate, handleElectionStatus, useMockData]);

  const sendVote = useCallback((candidateId) => {
    if (useMockData) {
      // Simulate vote in mock mode
      const mockData = generateMockElectionData(electionId);
      const candidateIndex = mockData.candidates.findIndex(c => c.id === candidateId);
      if (candidateIndex !== -1) {
        mockData.candidates[candidateIndex].votes += 1;
        mockData.totalVotes = mockData.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
        setLiveResults(mockData);
        setLastUpdate(new Date());
      }
    } else {
      websocketService.send({
        type: 'CAST_VOTE',
        payload: {
          electionId,
          candidateId
        }
      });
    }
  }, [electionId, useMockData]);

  const clearActivity = useCallback(() => {
    setVotingActivity([]);
  }, []);

  return {
    isConnected,
    liveResults,
    lastUpdate,
    error,
    votingActivity,
    sendVote,
    clearActivity,
    useMockData
  };
};

export const useRealTimeStats = () => {
  const [stats, setStats] = useState({
    totalElections: 3,
    activeElections: 1,
    totalVotes: 688,
    activeVoters: 245
  });

  const handleStatsUpdate = useCallback((data) => {
    setStats(data);
  }, []);

  useEffect(() => {
    websocketService.subscribe('STATS_UPDATE', handleStatsUpdate);

    return () => {
      websocketService.unsubscribe('STATS_UPDATE', handleStatsUpdate);
    };
  }, [handleStatsUpdate]);

  return stats;
};
