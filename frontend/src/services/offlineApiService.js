import syncManager from '../utils/syncManager';
import offlineStorage from '../utils/offlineStorage';

class OfflineApiService {
  constructor() {
    this.baseURL = '/api';
  }

  // Generic request method with offline support
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    };

    const requestOptions = { ...defaultOptions, ...options };

    try {
      // Try online request first
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful GET requests
      if (requestOptions.method === 'GET' || !requestOptions.method) {
        await this.cacheResponse(endpoint, data);
      }
      
      return data;
    } catch (error) {
      // If offline and it's a GET request, try to serve from cache
      if (!navigator.onLine && (!requestOptions.method || requestOptions.method === 'GET')) {
        console.log('OfflineApiService: Serving from cache due to offline status');
        return this.getCachedResponse(endpoint);
      }
      
      // If offline and it's a POST/PUT/DELETE request, queue for sync
      if (!navigator.onLine && ['POST', 'PUT', 'DELETE'].includes(requestOptions.method)) {
        console.log('OfflineApiService: Queuing request for sync');
        await this.queueRequest(endpoint, requestOptions);
        return { queued: true, message: 'Request queued for sync when online' };
      }
      
      throw error;
    }
  }

  // Cache response
  async cacheResponse(endpoint, data) {
    try {
      if (endpoint.includes('/elections')) {
        await offlineStorage.cacheElections(Array.isArray(data) ? data : [data]);
      } else if (endpoint.includes('/user/profile')) {
        await offlineStorage.storeUserProfile(data);
      }
    } catch (error) {
      console.error('OfflineApiService: Failed to cache response:', error);
    }
  }

  // Get cached response
  async getCachedResponse(endpoint) {
    try {
      if (endpoint.includes('/elections')) {
        const elections = await offlineStorage.getCachedElections();
        return elections;
      } else if (endpoint.includes('/user/profile')) {
        const profile = await offlineStorage.getCachedUserProfile();
        return profile;
      }
      
      // Return empty data for uncached endpoints
      return [];
    } catch (error) {
      console.error('OfflineApiService: Failed to get cached response:', error);
      return [];
    }
  }

  // Queue request for sync
  async queueRequest(endpoint, options) {
    const action = this.getActionFromEndpoint(endpoint, options.method);
    const data = {
      endpoint,
      options,
      timestamp: Date.now()
    };

    await syncManager.queueAction(action, data);
  }

  // Determine action type from endpoint
  getActionFromEndpoint(endpoint, method) {
    if (endpoint.includes('/votes')) {
      return 'vote';
    } else if (endpoint.includes('/user/profile')) {
      return method === 'PUT' ? 'updateProfile' : 'profile';
    } else if (endpoint.includes('/elections')) {
      return method === 'POST' ? 'createElection' : 'updateElection';
    }
    
    return 'unknown';
  }

  // API Methods
  async getElections() {
    return this.request('/elections');
  }

  async getElection(id) {
    return this.request(`/elections/${id}`);
  }

  async createElection(electionData) {
    return this.request('/elections', {
      method: 'POST',
      body: JSON.stringify(electionData)
    });
  }

  async updateElection(id, electionData) {
    return this.request(`/elections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(electionData)
    });
  }

  async deleteElection(id) {
    return this.request(`/elections/${id}`, {
      method: 'DELETE'
    });
  }

  async submitVote(voteData) {
    // Store vote offline immediately
    await offlineStorage.storeVote(voteData);
    
    return this.request('/votes', {
      method: 'POST',
      body: JSON.stringify(voteData)
    });
  }

  async getUserProfile() {
    return this.request('/user/profile');
  }

  async updateUserProfile(profileData) {
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST'
    });
  }

  // Get sync status
  async getSyncStatus() {
    return syncManager.getSyncStatus();
  }

  // Force sync
  async forceSync() {
    return syncManager.forceSync();
  }

  // Clear offline data
  async clearOfflineData() {
    return syncManager.clearOfflineData();
  }

  // Check if online
  isOnline() {
    return navigator.onLine;
  }

  // Get storage usage
  async getStorageUsage() {
    return offlineStorage.getStorageUsage();
  }
}

// Create singleton instance
const offlineApiService = new OfflineApiService();

export default offlineApiService;
