import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElectionStore, useAuthStore } from '../store';
import { LoadingSpinner, ErrorAlert } from '../components';

const Dashboard = () => {
  const { elections, fetchElections, isLoading, error, clearError } = useElectionStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const activeElections = elections.filter(e => e.status === 'active');
  const upcomingElections = elections.filter(e => e.status === 'upcoming');
  const completedElections = elections.filter(e => e.status === 'completed');
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome back, <span className="font-medium text-gray-900">{user?.name || 'User'}</span>
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Logout
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* User Info Card */}
            <div className="lg:col-span-1">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500">User Information</dt>
                        <dd className="text-lg font-medium text-gray-900">{user?.name || 'Guest User'}</dd>
                        <dt className="text-sm font-medium text-gray-500 mt-2">Email</dt>
                        <dd className="text-sm text-gray-600">{user?.email || 'Not available'}</dd>
                        <dt className="text-sm font-medium text-gray-500 mt-2">Account Type</dt>
                        <dd className="text-sm text-gray-600">{user?.role || 'Student'}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Options */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => navigate('/vote')}
                    className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012 2h2a2 2 0 012-2" />
                    </svg>
                    Cast Vote
                  </button>
                  
                  <button
                    onClick={() => navigate('/results')}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v10z" />
                    </svg>
                    View Results
                  </button>
                  
                  <button
                    onClick={() => navigate('/profile')}
                    className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Election Statistics */}
            <div className="lg:col-span-2">
              <ErrorAlert 
                error={error} 
                onClose={clearError}
              />
              {isLoading ? (
                <LoadingSpinner 
                  size="lg" 
                  message="Loading dashboard..." 
                  className="py-8"
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                              <span className="text-white font-semibold">{activeElections.length}</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                Active Elections
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">{activeElections.length}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                              <span className="text-white font-semibold">{completedElections.length}</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                Completed Elections
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">{completedElections.length}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                              <span className="text-white font-semibold">{upcomingElections.length}</span>
                            </div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 truncate">
                                Upcoming Elections
                              </dt>
                              <dd className="text-lg font-medium text-gray-900">{upcomingElections.length}</dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <h2 className="text-2xl font-bold text-gray-900">Recent Elections</h2>
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      {elections.slice(0, 3).map((election) => (
                        <div key={election.id} className="bg-white shadow rounded-lg p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">{election.title}</h3>
                              <p className="text-sm text-gray-500">{election.description}</p>
                              <div className="mt-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  election.status === 'active' ? 'bg-green-100 text-green-800' :
                                  election.status === 'upcoming' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-500">
                                {election.startDate} - {election.endDate}
                              </p>
                              {election.status === 'active' && (
                                <button 
                                  onClick={() => navigate(`/vote/${election.id}`)}
                                  className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                  Vote Now
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
