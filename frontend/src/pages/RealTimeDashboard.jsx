import { useState, useEffect } from 'react';
import { useElectionStore } from '../store';
import { LoadingSpinner, ErrorAlert, VoteChart } from '../components';
import { useRealTime } from '../hooks/useRealTime';

const RealTimeDashboard = () => {
  const { elections, fetchElections, isLoading, error, clearError } = useElectionStore();
  const [selectedElection, setSelectedElection] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { 
    isConnected, 
    liveResults, 
    lastUpdate, 
    error: wsError, 
    votingActivity 
  } = useRealTime(selectedElection);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const activeElections = elections.filter(e => e.status === 'active');
  const currentResults = liveResults;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Real-Time Results Dashboard</h1>
              <div className="flex items-center mt-2 space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                {lastUpdate && (
                  <span className="text-xs text-gray-500">
                    Last update: {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Live Updates</span>
              </label>
            </div>
          </div>

          {/* Error Alerts */}
          <ErrorAlert error={error} onClose={clearError} />
          {wsError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Connection Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {wsError}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Election Selection */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select Election</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeElections.map((election) => (
                <button
                  key={election.id}
                  onClick={() => setSelectedElection(election.id)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedElection === election.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <h3 className="font-medium text-gray-900">{election.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{election.description}</p>
                  <div className="mt-2 text-xs text-gray-400">
                    Ends: {new Date(election.endDate).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live Results */}
          {selectedElection && currentResults && (
            <div className="space-y-8">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-2xl font-bold text-gray-900">{currentResults.totalVotes || 0}</div>
                  <div className="text-sm text-gray-500">Total Votes</div>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-2xl font-bold text-gray-900">{currentResults.candidates?.length || 0}</div>
                  <div className="text-sm text-gray-500">Candidates</div>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="text-2xl font-bold text-gray-900">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">Last Update</div>
                </div>
                <div className="bg-white shadow rounded-lg p-6">
                  <div className={`text-2xl font-bold ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? 'LIVE' : 'OFFLINE'}
                  </div>
                  <div className="text-sm text-gray-500">Status</div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <VoteChart
                  data={currentResults.candidates || []}
                  title="Live Vote Distribution"
                  type="bar"
                />
                <VoteChart
                  data={currentResults.candidates || []}
                  title="Vote Percentage"
                  type="pie"
                />
              </div>

              {/* Voting Activity Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Detailed Results Table */}
                <div className="lg:col-span-2 bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Live Results Details</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trend</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(currentResults.candidates || [])
                          .sort((a, b) => b.votes - a.votes)
                          .map((candidate, index) => (
                            <tr key={candidate.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                #{index + 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                                    {candidate.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                                    <div className="text-sm text-gray-500">{candidate.position || 'Candidate'}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {candidate.votes}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {currentResults.totalVotes > 0 
                                  ? ((candidate.votes / currentResults.totalVotes) * 100).toFixed(1)
                                  : 0}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-green-600 text-sm">↑ +{Math.floor(Math.random() * 10)}</span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Activity Feed */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Live Activity</h3>
                  </div>
                  <div className="p-6">
                    {votingActivity.length > 0 ? (
                      <div className="space-y-3">
                        {votingActivity.map((activity) => (
                          <div key={activity.id} className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">
                                Vote cast for <span className="font-medium">{activity.candidateName}</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                {activity.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="mt-2 text-sm">No recent activity</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Selection State */}
          {!selectedElection && (
            <div className="bg-white shadow rounded-lg p-12 text-center">
              <div className="text-gray-400">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No election selected</h3>
              <p className="mt-1 text-sm text-gray-500">Select an active election to view live results</p>
            </div>
          )}

          {isLoading && <LoadingSpinner size="lg" message="Loading elections..." className="py-8" />}
        </div>
      </div>
    </div>
  );
};

export default RealTimeDashboard;
