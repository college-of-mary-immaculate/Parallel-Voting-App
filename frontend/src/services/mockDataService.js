// Mock data service for testing real-time dashboard
export const generateMockElectionData = (electionId) => {
  const candidates = [
    { id: 1, name: 'Alice Johnson', position: 'President', votes: 245 },
    { id: 2, name: 'Bob Smith', position: 'President', votes: 189 },
    { id: 3, name: 'Carol Davis', position: 'President', votes: 156 },
    { id: 4, name: 'David Wilson', position: 'President', votes: 98 }
  ];

  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

  return {
    electionId,
    totalVotes,
    candidates: candidates.map(candidate => ({
      ...candidate,
      percentage: totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(1) : 0
    })),
    lastUpdated: new Date().toISOString()
  };
};

export const generateMockVotingActivity = () => {
  const candidates = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson'];
  const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
  
  return {
    id: Date.now(),
    type: 'vote',
    candidateName: randomCandidate,
    timestamp: new Date()
  };
};

export const simulateRealTimeUpdates = (callback, interval = 5000) => {
  let active = true;
  
  const updateData = () => {
    if (!active) return;
    
    // Simulate random vote increases
    const mockData = generateMockElectionData('mock-election-1');
    mockData.candidates = mockData.candidates.map(candidate => ({
      ...candidate,
      votes: candidate.votes + Math.floor(Math.random() * 5)
    }));
    
    mockData.totalVotes = mockData.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
    
    callback({
      type: 'RESULTS_UPDATE',
      payload: {
        electionId: 'mock-election-1',
        results: mockData
      }
    });
  };

  const intervalId = setInterval(updateData, interval);
  
  return () => {
    active = false;
    clearInterval(intervalId);
  };
};
