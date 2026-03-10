import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { LoadingSpinner, ErrorAlert } from '../components';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    totalCandidates: 0,
    totalUsers: 0,
    totalVotes: 0,
    pendingApprovals: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    fetchAdminData();
  }, [user, navigate]);

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      // Mock admin data
      const mockStats = {
        totalElections: 12,
        activeElections: 3,
        totalCandidates: 48,
        totalUsers: 1250,
        totalVotes: 3420,
        pendingApprovals: 5
      };

      const mockActivity = [
        { id: 1, type: 'election_created', message: 'New election "Student Council 2024" created', time: '2 hours ago' },
        { id: 2, type: 'candidate_registered', message: 'John Doe registered for President', time: '3 hours ago' },
        { id: 3, type: 'vote_cast', message: '245 votes cast in "Election A"', time: '5 hours ago' },
        { id: 4, type: 'user_registered', message: 'New user registration spike detected', time: '6 hours ago' },
        { id: 5, type: 'system_alert', message: 'Server backup completed successfully', time: '8 hours ago' }
      ];

      setStats(mockStats);
      setRecentActivity(mockActivity);
    } catch (err) {
      setError('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'election_created':
        return '🗳️';
      case 'candidate_registered':
        return '👤';
      case 'vote_cast':
        return '✅';
      case 'user_registered':
        return '👥';
      case 'system_alert':
        return '⚠️';
      default:
        return '📊';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'election_created':
        return 'bg-blue-100 text-blue-800';
      case 'candidate_registered':
        return 'bg-green-100 text-green-800';
      case 'vote_cast':
        return 'bg-purple-100 text-purple-800';
      case 'user_registered':
        return 'bg-yellow-100 text-yellow-800';
      case 'system_alert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading admin dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage elections, candidates, and users</p>
          </div>

          {/* Error Alert */}
          <ErrorAlert error={error} />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold">🗳️</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Elections</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalElections}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold">🟢</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Elections</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.activeElections}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold">👥</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Candidates</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalCandidates}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold">👤</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalUsers.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold">✅</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Votes</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.totalVotes.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-semibold">⏳</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Approvals</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pendingApprovals}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Management Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => navigate('/admin/elections')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="mr-2">🗳️</span>
                  Manage Elections
                </button>
                <button
                  onClick={() => navigate('/admin/candidates')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="mr-2">👥</span>
                  Manage Candidates
                </button>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="mr-2">👤</span>
                  Manage Users
                </button>
                <button
                  onClick={() => navigate('/admin/settings')}
                  className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <span className="mr-2">⚙️</span>
                  System Settings
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-lg">{getActivityIcon(activity.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActivityColor(activity.type)}`}>
                        {activity.type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">Database</div>
                <div className="text-xs text-green-600">Operational</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">API Server</div>
                <div className="text-xs text-green-600">Operational</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">Email Service</div>
                <div className="text-xs text-yellow-600">Degraded</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">Storage</div>
                <div className="text-xs text-green-600">Operational</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
