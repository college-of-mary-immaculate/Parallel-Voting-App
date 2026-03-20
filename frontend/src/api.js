// API Configuration for Frontend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost';

// API endpoints
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  LOGIN: '/api/auth/login',
  VOTE: '/api/votes',
  RESULTS: '/api/results'
};

// API functions
export const api = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.HEALTH}`);
      const data = await response.json();
      console.log('✅ Backend health check:', data);
      return data;
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      throw error;
    }
  },

  // Login function
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        'Accept': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      console.log('✅ Login response:', data);
      return data;
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    }
  },

  // Vote function
  castVote: async (voteData) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VOTE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(voteData)
      });
      
      const data = await response.json();
      console.log('✅ Vote cast:', data);
      return data;
    } catch (error) {
      console.error('❌ Vote failed:', error);
      throw error;
    }
  },

  // Get results
  getResults: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.RESULTS}`);
      const data = await response.json();
      console.log('✅ Results:', data);
      return data;
    } catch (error) {
      console.error('❌ Get results failed:', error);
      throw error;
    }
  }
};
