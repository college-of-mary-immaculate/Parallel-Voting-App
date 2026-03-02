import axios from 'axios';

// Create base axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle common responses
api.interceptors.response.use(
  (response) => {
    // Log successful response in development
    if (import.meta.env.DEV) {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    
    return response;
  },
  (error) => {
    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    // Handle different error status codes
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - token expired or invalid
          console.error('Authentication failed - token may be expired');
          // Clear token and redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
          
        case 403:
          // Forbidden - user doesn't have permission
          console.error('Access forbidden - insufficient permissions');
          break;
          
        case 404:
          // Not found
          console.error('Resource not found');
          break;
          
        case 422:
          // Validation error
          console.error('Validation error:', data.errors);
          break;
          
        case 500:
          // Server error
          console.error('Server error - please try again later');
          break;
          
        default:
          console.error(`HTTP Error ${status}: ${data.message || 'Unknown error'}`);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error - please check your connection');
    } else {
      // Other error
      console.error('Request setup error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Utility function to handle API errors consistently
export const handleApiError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.response?.data?.error) {
    return error.response.data.error;
  } else if (error.message) {
    return error.message;
  } else {
    return 'An unexpected error occurred. Please try again.';
  }
};

// API endpoints configuration
export const endpoints = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    profile: '/auth/profile',
  },
  
  // Elections
  elections: {
    list: '/elections',
    create: '/elections',
    update: (id) => `/elections/${id}`,
    delete: (id) => `/elections/${id}`,
    details: (id) => `/elections/${id}`,
    active: '/elections/active',
  },
  
  // Voting
  voting: {
    submit: '/votes',
    userVotes: '/votes/user',
    electionVotes: (id) => `/votes/election/${id}`,
  },
  
  // Results
  results: {
    election: (id) => `/results/election/${id}`,
    summary: '/results/summary',
  },
  
  // Users
  users: {
    profile: '/users/profile',
    update: '/users/profile',
  },
};

export default api;
