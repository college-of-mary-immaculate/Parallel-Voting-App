// API utilities with environment configuration
import { config, getApiEndpoint, getBuildHeaders } from '../config/environment';

// API client configuration
const apiConfig = {
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  retryAttempts: config.api.retryAttempts,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...getBuildHeaders()
  }
};

// Request interceptor
const requestInterceptor = (config) => {
  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add build headers
  Object.assign(config.headers, getBuildHeaders());
  
  return config;
};

// Response interceptor
const responseInterceptor = (response) => {
  // Log API response time in development
  if (config.environment.isDevelopment) {
    const responseTime = response.headers.get('x-response-time');
    if (responseTime) {
      console.log(`API Response Time: ${responseTime}ms`);
    }
  }
  
  return response;
};

// Error interceptor
const errorInterceptor = (error) => {
  // Log errors in development
  if (config.environment.isDevelopment) {
    console.error('API Error:', error);
  }
  
  // Send error to reporting service if enabled
  if (config.features.errorReporting) {
    sendErrorToService(error);
  }
  
  return Promise.reject(error);
};

// Retry logic
const retryRequest = async (fn, retries = apiConfig.retryAttempts) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && shouldRetry(error)) {
      console.log(`Retrying request... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return retryRequest(fn, retries - 1);
    }
    throw error;
  }
};

// Determine if request should be retried
const shouldRetry = (error) => {
  // Retry on network errors
  if (!error.response) return true;
  
  // Retry on 5xx errors
  if (error.response.status >= 500) return true;
  
  // Retry on 429 (Too Many Requests)
  if (error.response.status === 429) return true;
  
  // Don't retry on 4xx errors (except 429)
  if (error.response.status >= 400 && error.response.status < 500) return false;
  
  return true;
};

// Send error to reporting service
const sendErrorToService = (error) => {
  if (!config.analytics.errorReportingEndpoint) return;
  
  const errorData = {
    message: error.message,
    stack: error.stack,
    url: window.location.href,
    timestamp: Date.now(),
    buildInfo: {
      version: config.app.version,
      environment: config.environment.mode
    }
  };
  
  // Use sendBeacon for non-blocking error reporting
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      config.analytics.errorReportingEndpoint,
      JSON.stringify(errorData)
    );
  } else {
    // Fallback to fetch
    fetch(config.analytics.errorReportingEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    }).catch(() => {
      // Ignore error reporting errors
    });
  }
};

// Base API class
class BaseAPI {
  constructor() {
    this.baseURL = apiConfig.baseURL;
    this.timeout = apiConfig.timeout;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: { ...apiConfig.headers },
      ...options,
      headers: { ...apiConfig.headers, ...options.headers }
    };

    // Apply request interceptor
    const finalConfig = requestInterceptor(config);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...finalConfig,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Apply response interceptor
      const processedResponse = responseInterceptor(response);

      if (!processedResponse.ok) {
        throw new Error(`HTTP ${processedResponse.status}: ${processedResponse.statusText}`);
      }

      return await processedResponse.json();
    } catch (error) {
      // Apply error interceptor
      errorInterceptor(error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const url = new URL(endpoint, this.baseURL);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    return this.request(url.pathname + url.search);
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
}

// API service instances
export const authAPI = new BaseAPI();
export const electionsAPI = new BaseAPI();
export const candidatesAPI = new BaseAPI();
export const votesAPI = new BaseAPI();
export const resultsAPI = new BaseAPI();
export const usersAPI = new BaseAPI();
export const analyticsAPI = new BaseAPI();

// API service methods
export const authService = {
  login: (credentials) => retryRequest(() => authAPI.post('/auth/login', credentials)),
  register: (userData) => retryRequest(() => authAPI.post('/auth/register', userData)),
  logout: () => authAPI.post('/auth/logout'),
  refreshToken: () => authAPI.post('/auth/refresh'),
  resetPassword: (email) => authAPI.post('/auth/reset-password', { email }),
  verifyEmail: (token) => authAPI.post('/auth/verify-email', { token })
};

export const electionsService = {
  getAll: (params) => electionsAPI.get('/elections', params),
  getById: (id) => electionsAPI.get(`/elections/${id}`),
  create: (data) => electionsAPI.post('/elections', data),
  update: (id, data) => electionsAPI.put(`/elections/${id}`, data),
  delete: (id) => electionsAPI.delete(`/elections/${id}`),
  getResults: (id) => electionsAPI.get(`/elections/${id}/results`)
};

export const candidatesService = {
  getAll: (electionId) => candidatesAPI.get(`/candidates`, { electionId }),
  getById: (id) => candidatesAPI.get(`/candidates/${id}`),
  create: (data) => candidatesAPI.post('/candidates', data),
  update: (id, data) => candidatesAPI.put(`/candidates/${id}`, data),
  delete: (id) => candidatesAPI.delete(`/candidates/${id}`)
};

export const votesService = {
  cast: (data) => retryRequest(() => votesAPI.post('/votes', data)),
  getUserVotes: (userId) => votesAPI.get(`/votes/user/${userId}`),
  getElectionVotes: (electionId) => votesAPI.get(`/votes/election/${electionId}`)
};

export const resultsService = {
  getElectionResults: (electionId) => resultsAPI.get(`/results/election/${electionId}`),
  getDetailedResults: (electionId) => resultsAPI.get(`/results/election/${electionId}/detailed`),
  exportResults: (electionId, format = 'json') => resultsAPI.get(`/results/election/${electionId}/export`, { format })
};

export const usersService = {
  getProfile: () => usersAPI.get('/users/profile'),
  updateProfile: (data) => usersAPI.put('/users/profile', data),
  changePassword: (data) => usersAPI.post('/users/change-password', data),
  deleteAccount: () => usersAPI.delete('/users/account')
};

export const analyticsService = {
  getDashboard: () => analyticsAPI.get('/analytics/dashboard'),
  getElectionStats: (electionId) => analyticsAPI.get(`/analytics/election/${electionId}`),
  getUserStats: () => analyticsAPI.get('/analytics/users'),
  getPerformance: () => analyticsAPI.get('/analytics/performance')
};

// Export API configuration
export { apiConfig };

// Initialize API services
export const initializeAPI = () => {
  // Log API configuration in development
  if (config.environment.isDevelopment) {
    console.group('🔌 API Configuration');
    console.log('Base URL:', apiConfig.baseURL);
    console.log('Timeout:', apiConfig.timeout);
    console.log('Retry Attempts:', apiConfig.retryAttempts);
    console.log('Headers:', apiConfig.headers);
    console.groupEnd();
  }
};

export default {
  BaseAPI,
  authService,
  electionsService,
  candidatesService,
  votesService,
  resultsService,
  usersService,
  analyticsService,
  initializeAPI
};
