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

  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
  const mockIntervalRef = useRef(null);

  // Initialize with mock data for testing
  useEffect(() => {
    if (electionId && !liveResults) {
      // Start with mock data
      const mockData = generateMockElectionData(electionId);
      setLiveResults(mockData);
      setLastUpdate(new Date());
    }
  }, [electionId]);

  // WebSocket connection
  useEffect(() => {
    if (!useMockData) {
      const connectWebSocket = () => {
        try {
          websocketService.connect(wsUrl);
          setIsConnected(true);
          setError(null);
        } catch (err) {
          console.error('WebSocket connection failed:', err);
          setError(err.message);
          setIsConnected(false);
        }
      };

      connectWebSocket();

      // Set up event listeners
      websocketService.on('connect', () => {
        console.log(' Real-time connected');
        setIsConnected(true);
        setError(null);
      });

      websocketService.on('disconnect', () => {
        console.log(' Real-time disconnected');
        setIsConnected(false);
      });

      websocketService.on('vote-update', (data) => {
        console.log(' Vote update received:', data);
        setLiveResults(prev => ({
          ...prev,
          votes: data.votes,
          lastUpdate: new Date()
        }));
        setLastUpdate(new Date());
      });

      websocketService.on('election-update', (data) => {
        console.log(' Election update received:', data);
        setLiveResults(prev => ({
          ...prev,
          ...data,
          lastUpdate: new Date()
        }));
        setLastUpdate(new Date());
      });

      // Cleanup on unmount
      return () => {
        websocketService.disconnect();
        setIsConnected(false);
      };
    }

    return connectWebSocket;
  }, [electionId, useMockData, wsUrl]);

  // Mock data simulation for testing
  useEffect(() => {
    if (useMockData && electionId) {
      mockIntervalRef.current = setInterval(() => {
        const mockUpdate = simulateRealTimeUpdates(electionId);
        setLiveResults(prev => ({
          ...prev,
          ...mockUpdate,
          lastUpdate: new Date()
        }));
        setLastUpdate(new Date());
      }, 5000);

      return () => {
        if (mockIntervalRef.current) {
          clearInterval(mockIntervalRef.current);
        }
      };
    }
  }, [useMockData, electionId]);

  // Send vote via WebSocket
  const sendVote = useCallback((electionId, candidateId, voterId) => {
    if (isConnected) {
      websocketService.emit('vote-cast', {
        electionId,
        candidateId,
        voterId,
        timestamp: new Date().toISOString()
      });
      
      // Add to local activity
      setVotingActivity(prev => [...prev, {
        type: 'vote',
        electionId,
        candidateId,
        voterId,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isConnected]);

  // Manual reconnection
  const reconnect = useCallback(() => {
    websocketService.disconnect();
    setTimeout(() => {
      websocketService.connect(wsUrl);
    }, 1000);
  }, [wsUrl]);

  return {
    isConnected,
    liveResults,
    lastUpdate,
    error,
    votingActivity,
    sendVote,
    reconnect,
    toggleMockData: () => setUseMockData(!useMockData)
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
