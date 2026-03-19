import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import offlineApiService from '../services/offlineApiService';
import { PWAManager } from '../components';

const PWATest = () => {
  const navigate = useNavigate();
  const [testResults, setTestResults] = useState({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  useEffect(() => {
    runPWATests();
  }, []);

  const runPWATests = async () => {
    setIsRunningTests(true);
    const results = {};

    // Test 1: Service Worker Support
    results.serviceWorker = 'serviceWorker' in navigator;
    
    // Test 2: Manifest Support
    results.manifest = 'onbeforeinstallprompt' in window;
    
    // Test 3: IndexedDB Support
    results.indexedDB = 'indexedDB' in window;
    
    // Test 4: Cache API Support
    results.cacheAPI = 'caches' in window;
    
    // Test 5: Push Notification Support
    results.pushNotifications = 'PushManager' in window && 'Notification' in window;
    
    // Test 6: Online Status
    results.isOnline = navigator.onLine;
    
    // Test 7: Storage Estimate
    try {
      const estimate = await navigator.storage.estimate();
      results.storageEstimate = !!estimate;
      results.storageQuota = estimate.quota;
      results.storageUsage = estimate.usage;
    } catch (error) {
      results.storageEstimate = false;
    }
    
    // Test 8: Service Worker Registration
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      results.swRegistered = !!registration;
      results.swScope = registration?.scope || null;
    } catch (error) {
      results.swRegistered = false;
    }
    
    // Test 9: Display Mode
    results.displayMode = getDisplayMode();
    
    // Test 10: Connection Type
    results.connection = navigator.connection ? navigator.connection.effectiveType : 'unknown';
    
    setTestResults(results);
    setIsRunningTests(false);
  };

  const getDisplayMode = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isWebApp = window.navigator.standalone === true;
    
    if (isStandalone || isWebApp) return 'standalone';
    if (document.referrer.includes('android-app://')) return 'webapp';
    return 'browser';
  };

  const testOfflineFunctionality = async () => {
    try {
      // Test storing data offline
      await offlineApiService.createElection({
        title: 'Test Election',
        description: 'This is a test election for offline functionality',
        candidates: ['Candidate 1', 'Candidate 2'],
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString()
      });
      
      alert('Test election stored offline successfully!');
    } catch (error) {
      console.error('Offline test failed:', error);
      alert('Offline test failed. Check console for details.');
    }
  };

  const testSyncFunctionality = async () => {
    try {
      const status = await offlineApiService.getSyncStatus();
      alert(`Sync Status: ${JSON.stringify(status, null, 2)}`);
    } catch (error) {
      console.error('Sync test failed:', error);
      alert('Sync test failed. Check console for details.');
    }
  };

  const clearOfflineData = async () => {
    if (confirm('Are you sure you want to clear all offline data?')) {
      try {
        await offlineApiService.clearOfflineData();
        alert('Offline data cleared successfully!');
      } catch (error) {
        console.error('Clear data failed:', error);
        alert('Failed to clear offline data. Check console for details.');
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

  return (
    <PWAManager>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">PWA Test Page</h1>
            <p className="text-gray-600">Test Progressive Web App functionality and features</p>
          </div>

          {/* Test Results */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">PWA Capabilities Test</h2>
            
            {isRunningTests ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-600">Running tests...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(testResults).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-200">
                    <div>
                      <span className="font-medium text-gray-900">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      {key === 'storageQuota' && value && (
                        <span className="ml-2 text-sm text-gray-500">({formatBytes(value)})</span>
                      )}
                      {key === 'storageUsage' && value && (
                        <span className="ml-2 text-sm text-gray-500">({formatBytes(value)})</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {typeof value === 'boolean' ? (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {value ? 'Supported' : 'Not Supported'}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-600">{value}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <button
              onClick={runPWATests}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Re-run Tests
            </button>
          </div>

          {/* Offline Functionality Tests */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Offline Functionality Tests</h2>
            
            <div className="space-y-4">
              <button
                onClick={testOfflineFunctionality}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Test Offline Storage
              </button>
              
              <button
                onClick={testSyncFunctionality}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Check Sync Status
              </button>
              
              <button
                onClick={clearOfflineData}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Clear Offline Data
              </button>
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Installation Instructions</h2>
            
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Desktop (Chrome/Edge):</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Look for the install icon in the address bar</li>
                  <li>Click "Install VoteApp" or similar</li>
                  <li>Confirm installation in the dialog</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Mobile (Chrome/Android):</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the menu button (three dots)</li>
                  <li>Select "Add to Home screen" or "Install app"</li>
                  <li>Confirm installation</li>
                </ol>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-2">iOS (Safari):</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Tap the Share button</li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" to confirm</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Navigation</h2>
            
            <div className="space-y-2">
              <button
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Go to Home
              </button>
              
              <button
                onClick={() => navigate('/elections')}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Go to Elections
              </button>
            </div>
          </div>
        </div>
      </div>
    </PWAManager>
  );
};

export default PWATest;
