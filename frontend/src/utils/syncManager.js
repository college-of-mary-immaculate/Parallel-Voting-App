import offlineStorage from './offlineStorage';

class SyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncInterval = null;
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds

    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('SyncManager: Back online, starting sync...');
      this.startSync();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('SyncManager: Gone offline');
      this.stopSync();
    });
  }

  // Start periodic sync when online
  startSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.performSync();
      }
    }, 30000); // Sync every 30 seconds

    // Also perform immediate sync
    this.performSync();
  }

  // Stop periodic sync when offline
  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Perform synchronization
  async performSync() {
    if (!this.isOnline || this.syncInProgress) return;

    this.syncInProgress = true;
    console.log('SyncManager: Starting synchronization...');

    try {
      const syncQueue = await offlineStorage.getSyncQueue();
      
      for (const item of syncQueue) {
        try {
          await this.syncItem(item);
          await offlineStorage.removeFromSyncQueue(item.id);
          console.log(`SyncManager: Successfully synced item ${item.id}`);
        } catch (error) {
          console.error(`SyncManager: Failed to sync item ${item.id}:`, error);
          
          // Update retry count
          item.retries = (item.retries || 0) + 1;
          
          if (item.retries >= this.maxRetries) {
            console.error(`SyncManager: Max retries reached for item ${item.id}, removing from queue`);
            await offlineStorage.removeFromSyncQueue(item.id);
          } else {
            // Update item with new retry count
            await offlineStorage.removeFromSyncQueue(item.id);
            await offlineStorage.addToSyncQueue(item.action, item.data);
          }
        }
      }

      console.log('SyncManager: Synchronization completed');
    } catch (error) {
      console.error('SyncManager: Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  // Sync individual item
  async syncItem(item) {
    const { action, data } = item;

    switch (action) {
      case 'vote':
        await this.syncVote(data);
        break;
      case 'updateProfile':
        await this.syncProfileUpdate(data);
        break;
      case 'createElection':
        await this.syncElectionCreation(data);
        break;
      case 'updateElection':
        await this.syncElectionUpdate(data);
        break;
      default:
        console.warn(`SyncManager: Unknown action ${action}`);
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // Sync vote
  async syncVote(voteData) {
    const response = await fetch('/api/votes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(voteData)
    });

    if (!response.ok) {
      throw new Error(`Vote sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Mark vote as synced in offline storage
    await offlineStorage.markVoteSynced(voteData.id);
    
    return result;
  }

  // Sync profile update
  async syncProfileUpdate(profileData) {
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      throw new Error(`Profile sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Update cached profile
    await offlineStorage.storeUserProfile(result);
    
    return result;
  }

  // Sync election creation
  async syncElectionCreation(electionData) {
    const response = await fetch('/api/elections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(electionData)
    });

    if (!response.ok) {
      throw new Error(`Election creation sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Update elections cache
    const cachedElections = await offlineStorage.getCachedElections();
    cachedElections.push(result);
    await offlineStorage.cacheElections(cachedElections);
    
    return result;
  }

  // Sync election update
  async syncElectionUpdate(electionData) {
    const response = await fetch(`/api/elections/${electionData.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(electionData)
    });

    if (!response.ok) {
      throw new Error(`Election update sync failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    // Update elections cache
    const cachedElections = await offlineStorage.getCachedElections();
    const index = cachedElections.findIndex(e => e.id === electionData.id);
    if (index !== -1) {
      cachedElections[index] = result;
      await offlineStorage.cacheElections(cachedElections);
    }
    
    return result;
  }

  // Queue action for sync
  async queueAction(action, data) {
    try {
      await offlineStorage.addToSyncQueue(action, data);
      console.log(`SyncManager: Queued ${action} for sync`);
      
      // Try immediate sync if online
      if (this.isOnline && !this.syncInProgress) {
        this.performSync();
      }
    } catch (error) {
      console.error('SyncManager: Failed to queue action:', error);
      throw error;
    }
  }

  // Get sync status
  async getSyncStatus() {
    try {
      const syncQueue = await offlineStorage.getSyncQueue();
      const offlineVotes = await offlineStorage.getOfflineVotes();
      
      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        pendingActions: syncQueue.length,
        unsyncedVotes: offlineVotes.filter(v => !v.synced).length,
        lastSyncTime: localStorage.getItem('lastSyncTime') || null
      };
    } catch (error) {
      console.error('SyncManager: Failed to get sync status:', error);
      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        pendingActions: 0,
        unsyncedVotes: 0,
        lastSyncTime: null
      };
    }
  }

  // Force sync
  async forceSync() {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }
    
    await this.performSync();
    localStorage.setItem('lastSyncTime', new Date().toISOString());
  }

  // Clear all offline data
  async clearOfflineData() {
    try {
      await offlineStorage.clearAll();
      console.log('SyncManager: Cleared all offline data');
    } catch (error) {
      console.error('SyncManager: Failed to clear offline data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const syncManager = new SyncManager();

export default syncManager;
