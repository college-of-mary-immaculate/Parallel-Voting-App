import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useElectionStore, useAuthStore } from '../store';
import { LoadingSpinner, ErrorAlert, LoadingButton, VoteChart } from '../components';

const Results = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    elections, 
    fetchElections, 
    fetchResults, 
    results, 
    isLoading, 
    error, 
    clearError 
  } = useElectionStore();
  const { user } = useAuthStore();
  
  const [chartType, setChartType] = useState('bar');
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchElections();
    if (id) {
      fetchResults(id);
    }
  }, [fetchElections, fetchResults, id]);

  // Auto-refresh results every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh || !id) return;

    const interval = setInterval(() => {
      fetchResults(id);
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, id, fetchResults]);

  // Find specific election
  const election = elections.find(e => e.id === parseInt(id));
  const electionResults = results[id] || {};

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getWinner = () => {
    if (!electionResults.candidates || electionResults.candidates.length === 0) return null;
    return electionResults.candidates.reduce((winner, candidate) => 
      candidate.votes > (winner?.votes || 0) ? candidate : winner
    );
  };

  const getCandidateColor = (index) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'];
    return colors[index % colors.length];
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleBackToElections = () => {
    navigate('/elections');
  };

  const handleViewAllResults = () => {
    navigate('/results');
  };

  const handleRefresh = () => {
    if (id) {
      fetchResults(id);
    }
  };

  if (isLoading && !election) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading results..." />
      </div>
    );
  }

  if (!election) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 00-2-2h-2a2 2 0 00-2 2v10z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Results not found</h3>
              <p className="mt-1 text-sm text-gray-500">The election results you're looking for don't exist.</p>
              <div className="mt-6">
                <button
                  onClick={handleBackToElections}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Back to Elections
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const winner = getWinner();
  const totalVotes = electionResults.candidates?.reduce((sum, candidate) => sum + candidate.votes, 0) || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleBackToElections}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Elections
            </button>
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Election Results</h1>
                <p className="mt-1 text-gray-600">{election.title}</p>
              </div>
              <div className="flex items-center space-x-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(election.status)}`}>
                  {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                </span>
                <LoadingButton
                  onClick={handleRefresh}
                  isLoading={isLoading}
                  loadingText="Refreshing..."
                  variant="outline"
                  size="sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </LoadingButton>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          <ErrorAlert error={error} onClose={clearError} />

          {/* Winner Announcement */}
          {election.status === 'completed' && winner && (
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-lg p-6 mb-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
                  <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.605 1.603-.921 1.902 0l2.8-2.034a1 1 0 00.364-1.118L15.07 6.62c-.783-.57-1.838-.197-1.588.81l-1.07 3.292a1 1 0 01-.95.69H8.088a1 1 0 01-.95-.69L6.068 7.43c-.25-1.006-1.805-1.38-1.588-.81l2.8 2.034a1 1 0 00.364 1.118L6.07 13.02c-.3.921.603 1.603.921 1.902 0l1.07-3.292a1 1 0 00-.95-.69H4.228c-.969 0-1.371-1.24-.588-1.81l2.8-2.034a1 1 0 00.364-1.118L4.93 4.62c-.783-.57-1.838-.197-1.588.81z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">🎉 Winner Announced!</h2>
                <div className="flex items-center justify-center space-x-4">
                  <div className={`w-12 h-12 ${getCandidateColor(0)} rounded-full flex items-center justify-center text-white font-semibold`}>
                    {getInitials(winner.name)}
                  </div>
                  <div className="text-white">
                    <div className="text-xl font-semibold">{winner.name}</div>
                    <div className="text-sm opacity-90">{winner.votes} votes ({((winner.votes / totalVotes) * 100).toFixed(1)}%)</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Controls */}
          <div className="bg-white shadow rounded-lg p-4 mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Chart Type:</label>
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                  className="block px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="pie">Pie Chart</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                  Auto-refresh every 30 seconds
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Vote Chart */}
            <div>
              <VoteChart
                data={electionResults.candidates || []}
                title="Vote Distribution"
                type={chartType}
              />
            </div>

            {/* Detailed Results */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Detailed Results</h3>
              <div className="space-y-4">
                {electionResults.candidates?.map((candidate, index) => (
                  <div key={candidate.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 ${getCandidateColor(index)} rounded-full flex items-center justify-center text-white font-semibold mr-3`}>
                        {getInitials(candidate.name)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{candidate.name}</div>
                        <div className="text-sm text-gray-500">{candidate.position || 'Candidate'}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{candidate.votes}</div>
                      <div className="text-sm text-gray-500">{((candidate.votes / totalVotes) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500">
                    No results available yet
                  </div>
                )}
              </div>
              
              {/* Summary */}
              {electionResults.candidates && electionResults.candidates.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{totalVotes}</div>
                      <div className="text-sm text-gray-500">Total Votes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{electionResults.candidates.length}</div>
                      <div className="text-sm text-gray-500">Candidates</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Election Information */}
          <div className="mt-8 bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Election Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Timeline</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Started: {formatDate(election.startDate)}
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Ended: {formatDate(election.endDate)}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Statistics</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {electionResults.candidates?.length || 0} Candidates
                  </div>
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {totalVotes} Total Votes
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                  </div>
                  {electionResults.lastUpdated && (
                    <div className="flex items-center text-sm">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Last updated: {formatDate(electionResults.lastUpdated)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
