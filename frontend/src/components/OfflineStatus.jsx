import React, { useState, useEffect } from 'react';
import offlineApiService from '../services/offlineApiService';

const OfflineStatus = () => {
  const [syncStatus, setSyncStatus] = useState({
    isOnline: navigator.onLine,
    syncInProgress: false,
    pendingActions: 0,
    unsyncedVotes: 0,
    lastSyncTime: null
  });
  const [showDetails, setShowDetails] = useState(false);
  const [storageUsage, setStorageUsage] = useState(null);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const status = await offlineApiService.getSyncStatus();
        const usage = await offlineApiService.getStorageUsage();
        
        setSyncStatus(status);
        setStorageUsage(usage);
      } catch (error) {
        console.error('Failed to get sync status:', error);
      }
    };

    // Initial update
    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    // Listen for online/offline events
    const handleOnline = () => updateStatus();
    const handleOffline = () => updateStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleForceSync = async () => {
    try {
      await offlineApiService.forceSync();
      // Update status after sync
      const status = await offlineApiService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Force sync failed:', error);
    }
  };

  const handleClearOfflineData = async () => {
    if (window.confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      try {
        await offlineApiService.clearOfflineData();
        const status = await offlineApiService.getSyncStatus();
        setSyncStatus(status);
      } catch (error) {
        console.error('Failed to clear offline data:', error);
      }
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Status Indicator */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium cursor-pointer transition-colors ${
          syncStatus.isOnline
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-red-100 text-red-800 hover:bg-red-200'
        }`}
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className={`w-2 h-2 rounded-full ${
          syncStatus.isOnline ? 'bg-green-500' : 'bg-red-500'
        }`} />
        {syncStatus.isOnline ? 'Online' : 'Offline'}
        
        {syncStatus.pendingActions > 0 && (
          <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">
            {syncStatus.pendingActions}
          </span>
        )}
        
        {syncStatus.syncInProgress && (
          <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80">
          <div className="space-y-3">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Connection</span>
              <span className={`text-sm font-medium ${
                syncStatus.isOnline ? 'text-green-600' : 'text-red-600'
              }`}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {/* Sync Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Sync Status</span>
                <span className="text-sm text-gray-600">
                  {syncStatus.syncInProgress ? 'Syncing...' : 'Idle'}
                </span>
              </div>
              
              {syncStatus.pendingActions > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Actions</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {syncStatus.pendingActions}
                  </span>
                </div>
              )}
              
              {syncStatus.unsyncedVotes > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Unsynced Votes</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {syncStatus.unsyncedVotes}
                  </span>
                </div>
              )}
            </div>

            {/* Last Sync */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Last Sync</span>
              <span className="text-sm text-gray-600">
                {formatTime(syncStatus.lastSyncTime)}
              </span>
            </div>

            {/* Storage Usage */}
            {storageUsage && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Storage Used</span>
                  <span className="text-sm text-gray-600">
                    {formatBytes(storageUsage.usage)}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((storageUsage.usage / storageUsage.quota) * 100, 100)}%`
                    }}
                  />
                </div>
                
                <div className="text-xs text-gray-500">
                  {formatBytes(storageUsage.usage)} of {formatBytes(storageUsage.quota)}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-200">
              {syncStatus.isOnline && syncStatus.pendingActions > 0 && (
                <button
                  onClick={handleForceSync}
                  disabled={syncStatus.syncInProgress}
                  className="flex-1 px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
                </button>
              )}
              
              <button
                onClick={handleClearOfflineData}
                className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                Clear Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineStatus;
