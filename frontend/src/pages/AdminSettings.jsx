import { useState, useEffect } from 'react';
import { LoadingSpinner, ErrorAlert, LoadingButton } from '../components';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    system: {
      siteName: 'Parallel Voting System',
      siteDescription: 'Secure and transparent voting platform',
      maintenanceMode: false,
      allowRegistration: true,
      requireEmailVerification: true,
      maxVotersPerElection: 10000,
      sessionTimeout: 30
    },
    email: {
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUsername: '',
      smtpPassword: '',
      fromEmail: 'noreply@votingapp.com',
      fromName: 'Voting System'
    },
    security: {
      passwordMinLength: 8,
      requireSpecialChars: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      enableTwoFactor: false
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      newElectionAlert: true,
      voteReminder: true,
      resultNotification: true
    }
  });
  const [activeTab, setActiveTab] = useState('system');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Settings are already set with default values
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (category) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully!`);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess('Database backup completed successfully!');
    } catch (err) {
      setError('Failed to backup database');
    }
  };

  const handleExportData = async () => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess('Data exported successfully!');
    } catch (err) {
      setError('Failed to export data');
    }
  };

  const tabs = [
    { id: 'system', name: 'System Settings', icon: '⚙️' },
    { id: 'email', name: 'Email Configuration', icon: '📧' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' }
  ];

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 mb-2">
            Site Name
          </label>
          <input
            type="text"
            id="siteName"
            value={settings.system.siteName}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, siteName: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700 mb-2">
            Site Description
          </label>
          <input
            type="text"
            id="siteDescription"
            value={settings.system.siteDescription}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, siteDescription: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="maxVoters" className="block text-sm font-medium text-gray-700 mb-2">
            Max Voters per Election
          </label>
          <input
            type="number"
            id="maxVoters"
            value={settings.system.maxVotersPerElection}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, maxVotersPerElection: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700 mb-2">
            Session Timeout (minutes)
          </label>
          <input
            type="number"
            id="sessionTimeout"
            value={settings.system.sessionTimeout}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, sessionTimeout: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Maintenance Mode</h4>
            <p className="text-sm text-gray-500">Temporarily disable the voting system</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, maintenanceMode: !prev.system.maintenanceMode }
            }))}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              settings.system.maintenanceMode ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              settings.system.maintenanceMode ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Allow Registration</h4>
            <p className="text-sm text-gray-500">Enable new user registration</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, allowRegistration: !prev.system.allowRegistration }
            }))}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              settings.system.allowRegistration ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              settings.system.allowRegistration ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Email Verification</h4>
            <p className="text-sm text-gray-500">Require email verification for new accounts</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              system: { ...prev.system, requireEmailVerification: !prev.system.requireEmailVerification }
            }))}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              settings.system.requireEmailVerification ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              settings.system.requireEmailVerification ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>
      
      <div className="flex justify-end">
        <LoadingButton
          onClick={() => handleSaveSettings('system')}
          isLoading={isSubmitting}
          loadingText="Saving..."
        >
          Save System Settings
        </LoadingButton>
      </div>
    </div>
  );

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700 mb-2">
            SMTP Host
          </label>
          <input
            type="text"
            id="smtpHost"
            value={settings.email.smtpHost}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              email: { ...prev.email, smtpHost: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700 mb-2">
            SMTP Port
          </label>
          <input
            type="number"
            id="smtpPort"
            value={settings.email.smtpPort}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              email: { ...prev.email, smtpPort: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="smtpUsername" className="block text-sm font-medium text-gray-700 mb-2">
            SMTP Username
          </label>
          <input
            type="text"
            id="smtpUsername"
            value={settings.email.smtpUsername}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              email: { ...prev.email, smtpUsername: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="smtpPassword" className="block text-sm font-medium text-gray-700 mb-2">
            SMTP Password
          </label>
          <input
            type="password"
            id="smtpPassword"
            value={settings.email.smtpPassword}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              email: { ...prev.email, smtpPassword: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="fromEmail" className="block text-sm font-medium text-gray-700 mb-2">
            From Email
          </label>
          <input
            type="email"
            id="fromEmail"
            value={settings.email.fromEmail}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              email: { ...prev.email, fromEmail: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="fromName" className="block text-sm font-medium text-gray-700 mb-2">
            From Name
          </label>
          <input
            type="text"
            id="fromName"
            value={settings.email.fromName}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              email: { ...prev.email, fromName: e.target.value }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Test Email Configuration</h4>
        <p className="text-sm text-gray-600 mb-4">Send a test email to verify your SMTP settings</p>
        <button className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Send Test Email
        </button>
      </div>
      
      <div className="flex justify-end">
        <LoadingButton
          onClick={() => handleSaveSettings('email')}
          isLoading={isSubmitting}
          loadingText="Saving..."
        >
          Save Email Settings
        </LoadingButton>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="passwordMinLength" className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Password Length
          </label>
          <input
            type="number"
            id="passwordMinLength"
            value={settings.security.passwordMinLength}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, passwordMinLength: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="maxLoginAttempts" className="block text-sm font-medium text-gray-700 mb-2">
            Max Login Attempts
          </label>
          <input
            type="number"
            id="maxLoginAttempts"
            value={settings.security.maxLoginAttempts}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, maxLoginAttempts: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="lockoutDuration" className="block text-sm font-medium text-gray-700 mb-2">
            Lockout Duration (minutes)
          </label>
          <input
            type="number"
            id="lockoutDuration"
            value={settings.security.lockoutDuration}
            onChange={(e) => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, lockoutDuration: parseInt(e.target.value) }
            }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Require Special Characters</h4>
            <p className="text-sm text-gray-500">Passwords must contain special characters</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, requireSpecialChars: !prev.security.requireSpecialChars }
            }))}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              settings.security.requireSpecialChars ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              settings.security.requireSpecialChars ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
            <p className="text-sm text-gray-500">Enable 2FA for enhanced security</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              security: { ...prev.security, enableTwoFactor: !prev.security.enableTwoFactor }
            }))}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              settings.security.enableTwoFactor ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              settings.security.enableTwoFactor ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>
      
      <div className="flex justify-end">
        <LoadingButton
          onClick={() => handleSaveSettings('security')}
          isLoading={isSubmitting}
          loadingText="Saving..."
        >
          Save Security Settings
        </LoadingButton>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
            <p className="text-sm text-gray-500">Send notifications via email</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              notifications: { ...prev.notifications, emailNotifications: !prev.notifications.emailNotifications }
            }))}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              settings.notifications.emailNotifications ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              settings.notifications.emailNotifications ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
            <p className="text-sm text-gray-500">Send notifications via SMS</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              notifications: { ...prev.notifications, smsNotifications: !prev.notifications.smsNotifications }
            }))}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              settings.notifications.smsNotifications ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              settings.notifications.smsNotifications ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
            <p className="text-sm text-gray-500">Send browser push notifications</p>
          </div>
          <button
            onClick={() => setSettings(prev => ({
              ...prev,
              notifications: { ...prev.notifications, pushNotifications: !prev.notifications.pushNotifications }
            }))}
            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              settings.notifications.pushNotifications ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
              settings.notifications.pushNotifications ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>
      
      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Notification Types</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">New Election Alert</h4>
              <p className="text-sm text-gray-500">Notify users when new elections are created</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, newElectionAlert: !prev.notifications.newElectionAlert }
              }))}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                settings.notifications.newElectionAlert ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                settings.notifications.newElectionAlert ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Vote Reminder</h4>
              <p className="text-sm text-gray-500">Remind users to cast their votes</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, voteReminder: !prev.notifications.voteReminder }
              }))}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                settings.notifications.voteReminder ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                settings.notifications.voteReminder ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Result Notification</h4>
              <p className="text-sm text-gray-500">Notify users when election results are available</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({
                ...prev,
                notifications: { ...prev.notifications, resultNotification: !prev.notifications.resultNotification }
              }))}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                settings.notifications.resultNotification ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                settings.notifications.resultNotification ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <LoadingButton
          onClick={() => handleSaveSettings('notifications')}
          isLoading={isSubmitting}
          loadingText="Saving..."
        >
          Save Notification Settings
        </LoadingButton>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'system':
        return renderSystemSettings();
      case 'email':
        return renderEmailSettings();
      case 'security':
        return renderSecuritySettings();
      case 'notifications':
        return renderNotificationSettings();
      default:
        return renderSystemSettings();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Settings</h1>
            <p className="mt-2 text-gray-600">Configure system settings and preferences</p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}
          <ErrorAlert error={error} />

          {/* System Maintenance */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Maintenance</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={handleBackupDatabase}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="mr-2">💾</span>
                Backup Database
              </button>
              <button
                onClick={handleExportData}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="mr-2">📊</span>
                Export Data
              </button>
              <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <span className="mr-2">🔄</span>
                Clear Cache
              </button>
              <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <span className="mr-2">📈</span>
                View Logs
              </button>
            </div>
          </div>

          {/* Settings Tabs */}
          <div className="bg-white shadow rounded-lg">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-6 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
            
            <div className="p-6">
              {renderTabContent()}
            </div>
          </div>

          {isLoading && <LoadingSpinner size="lg" message="Loading settings..." className="py-8" />}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
