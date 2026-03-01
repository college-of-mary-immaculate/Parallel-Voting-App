import api, { handleApiError, endpoints } from '../utils/axios';

// Authentication API calls
export const authAPI = {
  login: async (credentials) => {
    try {
      const response = await api.post(endpoints.auth.login, credentials);
      return {
        success: true,
        data: response.data,
        token: response.data.token,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post(endpoints.auth.register, userData);
      return {
        success: true,
        data: response.data,
        token: response.data.token,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  logout: async () => {
    try {
      await api.post(endpoints.auth.logout);
      localStorage.removeItem('token');
      return { success: true };
    } catch (error) {
      // Even if logout fails on server, clear local token
      localStorage.removeItem('token');
      return { success: true };
    }
  },

  getProfile: async () => {
    try {
      const response = await api.get(endpoints.auth.profile);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post(endpoints.auth.refresh);
      const newToken = response.data.token;
      localStorage.setItem('token', newToken);
      return {
        success: true,
        token: newToken,
      };
    } catch (error) {
      localStorage.removeItem('token');
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },
};

// Elections API calls
export const electionsAPI = {
  getAll: async () => {
    try {
      const response = await api.get(endpoints.elections.list);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  getActive: async () => {
    try {
      const response = await api.get(endpoints.elections.active);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(endpoints.elections.details(id));
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  create: async (electionData) => {
    try {
      const response = await api.post(endpoints.elections.create, electionData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  update: async (id, electionData) => {
    try {
      const response = await api.put(endpoints.elections.update(id), electionData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  delete: async (id) => {
    try {
      await api.delete(endpoints.elections.delete(id));
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },
};

// Voting API calls
export const votingAPI = {
  submitVote: async (voteData) => {
    try {
      const response = await api.post(endpoints.voting.submit, voteData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  getUserVotes: async () => {
    try {
      const response = await api.get(endpoints.voting.userVotes);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  getElectionVotes: async (electionId) => {
    try {
      const response = await api.get(endpoints.voting.electionVotes(electionId));
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },
};

// Results API calls
export const resultsAPI = {
  getElectionResults: async (electionId) => {
    try {
      const response = await api.get(endpoints.results.election(electionId));
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  getSummary: async () => {
    try {
      const response = await api.get(endpoints.results.summary);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },
};

// Users API calls
export const usersAPI = {
  getProfile: async () => {
    try {
      const response = await api.get(endpoints.users.profile);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },

  updateProfile: async (profileData) => {
    try {
      const response = await api.put(endpoints.users.update, profileData);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        error: handleApiError(error),
      };
    }
  },
};

// Export all APIs
export default {
  auth: authAPI,
  elections: electionsAPI,
  voting: votingAPI,
  results: resultsAPI,
  users: usersAPI,
};
