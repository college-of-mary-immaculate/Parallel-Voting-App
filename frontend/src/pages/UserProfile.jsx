import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { 
  LoadingSpinner, 
  ErrorAlert, 
  LoadingButton,
  ProfileCardSkeleton,
  VotingHistorySkeleton,
  SettingsFormSkeleton,
  InlineLoader,
  EnhancedFormField,
  ValidationSummary
} from '../components';
import { useFormValidation, useAsyncValidation } from '../hooks';
import { validationSchemas, checkPasswordStrength } from '../utils';

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Profile form validation
  const {
    formData: profileData,
    errors: profileErrors,
    touched: profileTouched,
    isSubmitting: isProfileSubmitting,
    hasTouchedErrors: hasProfileErrors,
    handleChange: handleProfileChange,
    handleBlur: handleProfileBlur,
    handleSubmit: handleProfileSubmit,
    getFieldProps: getProfileFieldProps,
    setFieldValue: setProfileFieldValue,
    resetForm: resetProfileForm
  } = useFormValidation(
    {
      name: '',
      email: '',
      phone: '',
      department: '',
      studentId: '',
      yearLevel: '',
      bio: ''
    },
    validationSchemas.profileUpdate,
    {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300
    }
  );

  // Password form validation
  const {
    formData: passwordData,
    errors: passwordErrors,
    touched: passwordTouched,
    isSubmitting: isPasswordSubmitting,
    hasTouchedErrors: hasPasswordErrors,
    handleChange: handlePasswordChange,
    handleBlur: handlePasswordBlur,
    handleSubmit: handlePasswordSubmit,
    getFieldProps: getPasswordFieldProps,
    setFieldValue: setPasswordFieldValue,
    resetForm: resetPasswordForm
  } = useFormValidation(
    {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    },
    {
      currentPassword: validationSchemas.profileUpdate.password,
      newPassword: validationSchemas.register.password,
      confirmPassword: validationSchemas.register.confirmPassword
    },
    {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300,
      customValidations: {
        confirmPassword: {
          custom: {
            validate: (value, formData) => {
              if (value !== formData.newPassword) {
                return 'Passwords do not match';
              }
              return null;
            }
          }
        }
      }
    }
  );

  // Settings form data
  const [settingsData, setSettingsData] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    twoFactorAuth: false,
    publicProfile: false,
    showVotingHistory: true
  });

  // Mock voting history
  const [votingHistory, setVotingHistory] = useState([]);

  const { validateAsync, isAsyncValidating } = useAsyncValidation();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Set initial form data
    setProfileFieldValue('name', user.name || '');
    setProfileFieldValue('email', user.email || '');
    setProfileFieldValue('phone', user.phone || '');
    setProfileFieldValue('department', user.department || '');
    setProfileFieldValue('studentId', user.studentId || '');
    setProfileFieldValue('yearLevel', user.yearLevel || '');
    setProfileFieldValue('bio', user.bio || '');
    
    setIsProfileLoading(false);

    // Load voting history
    loadVotingHistory();
  }, [user, navigate, setProfileFieldValue]);

  const loadVotingHistory = async () => {
    setIsHistoryLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockHistory = [
        {
          id: 1,
          electionTitle: 'Student Council Election 2024',
          electionType: 'General Election',
          candidateName: 'Alice Johnson',
          candidatePosition: 'President',
          voteDate: '2024-03-10T14:30:00Z',
          transactionId: 'TXN-1710095400000-A1B2C3D4',
          status: 'confirmed',
          isCurrent: true
        },
        {
          id: 2,
          electionTitle: 'Class Representatives 2023',
          electionType: 'Local Election',
          candidateName: 'Bob Smith',
          candidatePosition: 'Class Representative',
          voteDate: '2023-11-15T10:20:00Z',
          transactionId: 'TXN-1700016000000-E5F6G7H8',
          status: 'confirmed',
          isCurrent: false
        }
      ];
      
      setVotingHistory(mockHistory);
    } catch (err) {
      setError('Failed to load voting history');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleProfileUpdate = async (formData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update user in store
      await updateUser(formData);
      
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (formData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess('Password changed successfully!');
      resetPasswordForm();
    } catch (err) {
      setError('Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailBlur = async (e) => {
    handleProfileBlur(e);
    
    // Optional: Add async email validation
    const { name, value } = e.target;
    if (name === 'email' && value && !profileErrors.email) {
      await validateAsync(name, async (email) => {
        // Example: Check if email format is valid for domain
        const domain = email.split('@')[1];
        if (domain && ['test.com', 'example.com'].includes(domain.toLowerCase())) {
          return { isValid: false, error: 'Please use a real email address' };
        }
        return { isValid: true };
      }, value);
    }
  };

  // Clear confirmPassword error when newPassword changes
  const handlePasswordInputChange = (e) => {
    handlePasswordChange(e);
    
    // Clear confirmPassword error when newPassword changes
    if (passwordData.confirmPassword && passwordData.confirmPassword !== e.target.value) {
      setPasswordFieldValue('confirmPassword', '');
    }
  };

  // Get password strength for real-time feedback
  const passwordStrength = checkPasswordStrength(passwordData.newPassword);

  const handleProfileFormSubmit = (e) => {
    e.preventDefault();
    setError(null);
    handleProfileSubmit(handleProfileUpdate);
  };

  const handlePasswordFormSubmit = (e) => {
    e.preventDefault();
    setError(null);
    handlePasswordSubmit(handlePasswordUpdate);
  };

  const handleSettingsChange = (key, value) => {
    setSettingsData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    if (!confirm('This will permanently delete all your data including voting history. Are you absolutely sure?')) {
      return;
    }

    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      logout();
      navigate('/login');
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: '👤' },
    { id: 'history', name: 'Voting History', icon: '🗳️' },
    { id: 'settings', name: 'Settings', icon: '⚙️' },
    { id: 'security', name: 'Security', icon: '🔒' }
  ];

  const renderProfileTab = () => (
    <div className="space-y-6">
      {isProfileLoading ? (
        <ProfileCardSkeleton />
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Personal Information</h3>
          <form onSubmit={handleProfileUpdate}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={profileData.name}
                onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={profileData.email}
                onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                Student ID
              </label>
              <input
                type="text"
                id="studentId"
                value={profileData.studentId}
                onChange={(e) => setProfileData(prev => ({ ...prev, studentId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <input
                type="text"
                id="department"
                value={profileData.department}
                onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="yearLevel" className="block text-sm font-medium text-gray-700 mb-2">
                Year Level
              </label>
              <select
                id="yearLevel"
                value={profileData.yearLevel}
                onChange={(e) => setProfileData(prev => ({ ...prev, yearLevel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year</option>
              </select>
            </div>
          </div>
          <div className="mt-6">
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Tell us about yourself..."
            />
          </div>
          <div className="mt-6 flex justify-end">
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingText="Saving..."
            >
              Save Profile
            </LoadingButton>
          </div>
        </form>
      </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Voting History</h3>
          <p className="text-sm text-gray-500">Your complete voting record</p>
        </div>
        <div className="overflow-x-auto">
          {isHistoryLoading ? (
            <VotingHistorySkeleton />
          ) : votingHistory.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Election</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {votingHistory.map((vote) => (
                  <tr key={vote.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{vote.electionTitle}</div>
                        <div className="text-sm text-gray-500">{vote.electionType}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{vote.candidateName}</div>
                        <div className="text-sm text-gray-500">{vote.candidatePosition}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(vote.voteDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-xs text-gray-600">{vote.transactionId}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {vote.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => navigate(`/vote-confirmation?transactionId=${vote.transactionId}`)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Voting History</h3>
              <p className="text-gray-500 mb-6">You haven't participated in any elections yet.</p>
              <button
                onClick={() => navigate('/elections')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Browse Elections
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Voting Statistics */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Voting Statistics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{votingHistory.length}</div>
            <div className="text-sm text-gray-500">Total Votes Cast</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {votingHistory.filter(v => v.isCurrent).length}
            </div>
            <div className="text-sm text-gray-500">Active Elections</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {votingHistory.length > 0 ? '100%' : '0%'}
            </div>
            <div className="text-sm text-gray-500">Participation Rate</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      {isProfileLoading ? (
        <SettingsFormSkeleton />
      ) : (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h3>
          <form onSubmit={handleSettingsUpdate}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-500">Receive election updates and results via email</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsData(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  settingsData.emailNotifications ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                  settingsData.emailNotifications ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
                <p className="text-sm text-gray-500">Get voting reminders via text message</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsData(prev => ({ ...prev, smsNotifications: !prev.smsNotifications }))}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  settingsData.smsNotifications ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                  settingsData.smsNotifications ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Push Notifications</h4>
                <p className="text-sm text-gray-500">Receive browser push notifications</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsData(prev => ({ ...prev, pushNotifications: !prev.pushNotifications }))}
                className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  settingsData.pushNotifications ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                  settingsData.pushNotifications ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          <div className="border-t pt-6 mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Privacy Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Public Profile</h4>
                  <p className="text-sm text-gray-500">Make your profile visible to other users</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsData(prev => ({ ...prev, publicProfile: !prev.publicProfile }))}
                  className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    settingsData.publicProfile ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    settingsData.publicProfile ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Show Voting History</h4>
                  <p className="text-sm text-gray-500">Display your voting history on your profile</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsData(prev => ({ ...prev, showVotingHistory: !prev.showVotingHistory }))}
                  className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                    settingsData.showVotingHistory ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                    settingsData.showVotingHistory ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingText="Saving..."
            >
              Save Settings
            </LoadingButton>
          </div>
        </form>
      </div>
      )}
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Change Password</h3>
        <form onSubmit={handlePasswordUpdate}>
          <div className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <LoadingButton
              type="submit"
              isLoading={isSubmitting}
              loadingText="Updating..."
            >
              Update Password
            </LoadingButton>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Two-Factor Authentication</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Enable 2FA</h4>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <button
              type="button"
              onClick={() => setSettingsData(prev => ({ ...prev, twoFactorAuth: !prev.twoFactorAuth }))}
              className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                settingsData.twoFactorAuth ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span className={`translate-x-0 inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                settingsData.twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Danger Zone</h3>
        <div className="space-y-4">
          <div className="border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-red-900 mb-2">Delete Account</h4>
            <p className="text-sm text-red-700 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'history':
        return renderHistoryTab();
      case 'settings':
        return renderSettingsTab();
      case 'security':
        return renderSecurityTab();
      default:
        return renderProfileTab();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Profile</h1>
            <p className="mt-2 text-gray-600">Manage your account information and preferences</p>
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

          {/* Profile Tabs */}
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
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
