// API Configuration for Frontend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost';

// API endpoints
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  LOGIN: '/api/auth/login',
  VOTE: '/api/votes',
  RESULTS: '/api/results',
  ELECTIONS: '/api/elections'
};

// API functions
export const api = {
  // Health check
  healthCheck: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.HEALTH}`);
      const data = await response.json();
      console.log('✅ Backend health check:', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return { success: false, error: error.message };
    }
  },

  // Elections
  getAll: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ELECTIONS}`);
      const data = await response.json();
      console.log('🚀 API Request: GET /elections', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ API Error: GET /elections', error);
      return { success: false, error: error.message };
    }
  },

  getById: async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.ELECTIONS}/${id}`);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('❌ API Error: GET /elections/:id', error);
      return { success: false, error: error.message };
    }
  },

  // Authentication
  login: async (credentials) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      console.log('🚀 API Request: POST /auth/login', data);
      return { success: response.ok, data };
    } catch (error) {
      console.error('❌ API Error: POST /auth/login', error);
      return { success: false, error: error.message };
    }
  },

  // Voting
  vote: async (voteData) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VOTE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voteData),
      });
      const data = await response.json();
      console.log('🚀 API Request: POST /votes', data);
      return { success: response.ok, data };
    } catch (error) {
      console.error('❌ API Error: POST /votes', error);
      return { success: false, error: error.message };
    }
  },

  // Results
  getResults: async (electionId) => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.RESULTS}${electionId ? `/${electionId}` : ''}`);
      const data = await response.json();
      console.log('🚀 API Request: GET /results', data);
      return { success: true, data };
    } catch (error) {
      console.error('❌ API Error: GET /results', error);
      return { success: false, error: error.message };
    }
  },
};
