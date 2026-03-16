// Offline storage utility for PWA functionality
class OfflineStorage {
  constructor() {
    this.dbName = 'VoteAppOfflineDB';
    this.version = 1;
    this.db = null;
  }

  // Initialize IndexedDB
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores for offline data
        if (!db.objectStoreNames.contains('votes')) {
          const voteStore = db.createObjectStore('votes', { keyPath: 'id', autoIncrement: true });
          voteStore.createIndex('timestamp', 'timestamp', { unique: false });
          voteStore.createIndex('electionId', 'electionId', { unique: false });
        }

        if (!db.objectStoreNames.contains('elections')) {
          const electionStore = db.createObjectStore('elections', { keyPath: 'id' });
          electionStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('action', 'action', { unique: false });
        }
      };
    });
  }

  // Store vote data offline
  async storeVote(voteData) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['votes'], 'readwrite');
      const store = transaction.objectStore('votes');
      
      const vote = {
        ...voteData,
        timestamp: Date.now(),
        synced: false
      };

      const request = store.add(vote);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all offline votes
  async getOfflineVotes() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['votes'], 'readonly');
      const store = transaction.objectStore('votes');
      const index = store.index('synced');
      
      const request = index.getAll(false); // Get only unsynced votes
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Mark vote as synced
  async markVoteSynced(voteId) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['votes'], 'readwrite');
      const store = transaction.objectStore('votes');
      
      const request = store.get(voteId);
      request.onsuccess = () => {
        const vote = request.result;
        if (vote) {
          vote.synced = true;
          vote.syncedAt = Date.now();
          
          const updateRequest = store.put(vote);
          updateRequest.onsuccess = () => resolve(updateRequest.result);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Vote not found'));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Cache election data
  async cacheElections(elections) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['elections'], 'readwrite');
      const store = transaction.objectStore('elections');
      
      const electionsToCache = elections.map(election => ({
        ...election,
        cachedAt: Date.now()
      }));

      // Clear existing cache and add new data
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        let added = 0;
        electionsToCache.forEach(election => {
          const request = store.add(election);
          request.onsuccess = () => {
            added++;
            if (added === electionsToCache.length) {
              resolve(added);
            }
          };
          request.onerror = () => reject(request.error);
        });
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  // Get cached elections
  async getCachedElections() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['elections'], 'readonly');
      const store = transaction.objectStore('elections');
      
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Store user profile offline
  async storeUserProfile(profile) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userProfile'], 'readwrite');
      const store = transaction.objectStore('userProfile');
      
      const userProfile = {
        ...profile,
        id: 'current',
        cachedAt: Date.now()
      };

      const request = store.put(userProfile);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached user profile
  async getCachedUserProfile() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['userProfile'], 'readonly');
      const store = transaction.objectStore('userProfile');
      
      const request = store.get('current');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Add action to sync queue
  async addToSyncQueue(action, data) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const syncItem = {
        action,
        data,
        timestamp: Date.now(),
        retries: 0
      };

      const request = store.add(syncItem);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get sync queue items
  async getSyncQueue() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readonly');
      const store = transaction.objectStore('syncQueue');
      
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Remove item from sync queue
  async removeFromSyncQueue(id) {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const request = store.delete(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all offline data
  async clearAll() {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const stores = ['votes', 'elections', 'userProfile', 'syncQueue'];
      let completed = 0;
      
      stores.forEach(storeName => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        const request = store.clear();
        request.onsuccess = () => {
          completed++;
          if (completed === stores.length) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Get storage usage
  async getStorageUsage() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          usageDetails: estimate.usageDetails
        };
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
        return null;
      }
    }
    return null;
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

export default offlineStorage;
