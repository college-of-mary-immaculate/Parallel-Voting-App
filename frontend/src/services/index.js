// Services index file
// Export all API services from here for easier imports

export { default as apiService } from './apiService';
export { default as websocketService } from './websocketService';
export { generateMockElectionData, generateMockVotingActivity, simulateRealTimeUpdates } from './mockDataService';
export { authAPI, electionsAPI, votingAPI, resultsAPI, usersAPI } from './apiService';

// Re-export axios utilities
export { default as api, handleApiError, endpoints } from '../utils/axios';
