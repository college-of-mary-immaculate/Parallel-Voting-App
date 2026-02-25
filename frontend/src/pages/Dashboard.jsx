import { useEffect } from 'react';
import { useElectionStore, useAuthStore } from '../store';

const Dashboard = () => {
  const { elections, fetchElections, isLoading } = useElectionStore();
  const { user } = useAuthStore();

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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="mt-8">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-gray-500">Loading dashboard...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                              <button className="mt-2 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
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
  );
};

export default Dashboard;
