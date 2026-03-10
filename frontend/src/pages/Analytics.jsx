import { useState, useEffect } from 'react';
import { useElectionStore } from '../store';
import { LoadingSpinner, ErrorAlert, EnhancedChart } from '../components';

const Analytics = () => {
  const { elections, fetchElections, isLoading, error, clearError } = useElectionStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedElection, setSelectedElection] = useState('all');
  const [analyticsData, setAnalyticsData] = useState({
    totalVotes: 0,
    totalVoters: 0,
    activeElections: 0,
    completedElections: 0,
    votingTrends: [],
    candidatePerformance: [],
    demographicsData: [],
    hourlyVoting: []
  });

  useEffect(() => {
    fetchElections();
    generateAnalyticsData();
  }, [fetchElections]);

  useEffect(() => {
    generateAnalyticsData();
  }, [elections, selectedTimeRange, selectedElection]);

  const generateAnalyticsData = () => {
    // Generate mock analytics data
    const totalVotes = elections.reduce((sum, election) => sum + (election.totalVotes || Math.floor(Math.random() * 1000)), 0);
    const totalVoters = Math.floor(totalVotes * 0.8); // Assume 80% unique voters
    const activeElections = elections.filter(e => e.status === 'active').length;
    const completedElections = elections.filter(e => e.status === 'completed').length;

    // Generate voting trends data
    const days = selectedTimeRange === '24h' ? 1 : selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90;
    const votingTrends = Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString(),
      votes: Math.floor(Math.random() * 200) + 50
    }));

    // Generate candidate performance data
    const candidatePerformance = elections.slice(0, 5).map(election => ({
      name: election.title,
      votes: election.totalVotes || Math.floor(Math.random() * 1000),
      candidates: election.candidates?.length || Math.floor(Math.random() * 5) + 2
    }));

    // Generate demographics data
    const demographicsData = [
      { age: '18-24', votes: Math.floor(totalVotes * 0.15) },
      { age: '25-34', votes: Math.floor(totalVotes * 0.25) },
      { age: '35-44', votes: Math.floor(totalVotes * 0.30) },
      { age: '45-54', votes: Math.floor(totalVotes * 0.20) },
      { age: '55+', votes: Math.floor(totalVotes * 0.10) }
    ];

    // Generate hourly voting patterns
    const hourlyVoting = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      votes: Math.floor(Math.random() * 100) + 10
    }));

    setAnalyticsData({
      totalVotes,
      totalVoters,
      activeElections,
      completedElections,
      votingTrends,
      candidatePerformance,
      demographicsData,
      hourlyVoting
    });
  };

  const chartColors = {
    primary: 'rgba(59, 130, 246, 0.8)',
    secondary: 'rgba(16, 185, 129, 0.8)',
    accent: 'rgba(139, 92, 246, 0.8)',
    warning: 'rgba(245, 158, 11, 0.8)',
    danger: 'rgba(239, 68, 68, 0.8)'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <div className="flex flex-col sm:flex-row gap-4">
              <select
                value={selectedElection}
                onChange={(e) => setSelectedElection(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Elections</option>
                {elections.map(election => (
                  <option key={election.id} value={election.id}>
                    {election.title}
                  </option>
                ))}
              </select>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          </div>

          {/* Error Alert */}
          <ErrorAlert error={error} onClose={clearError} />

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Votes</dt>
                    <dd className="text-lg font-medium text-gray-900">{analyticsData.totalVotes.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Voters</dt>
                    <dd className="text-lg font-medium text-gray-900">{analyticsData.totalVoters.toLocaleString()}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Elections</dt>
                    <dd className="text-lg font-medium text-gray-900">{analyticsData.activeElections}</dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Completed Elections</dt>
                    <dd className="text-lg font-medium text-gray-900">{analyticsData.completedElections}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Voting Trends */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Voting Trends</h3>
              <EnhancedChart
                type="line"
                data={{
                  labels: analyticsData.votingTrends.map(trend => trend.date),
                  datasets: [{
                    label: 'Votes',
                    data: analyticsData.votingTrends.map(trend => trend.votes),
                    backgroundColor: chartColors.primary,
                    borderColor: 'rgba(59, 130, 246, 1)',
                    fill: true
                  }]
                }}
                height={300}
              />
            </div>

            {/* Candidate Performance */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Elections by Votes</h3>
              <EnhancedChart
                type="bar"
                data={{
                  labels: analyticsData.candidatePerformance.map(perf => perf.name),
                  datasets: [{
                    label: 'Votes',
                    data: analyticsData.candidatePerformance.map(perf => perf.votes),
                    backgroundColor: chartColors.secondary
                  }]
                }}
                height={300}
              />
            </div>
          </div>

          {/* Demographics and Hourly Voting */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Age Demographics */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Voter Age Demographics</h3>
              <EnhancedChart
                type="doughnut"
                data={{
                  labels: analyticsData.demographicsData.map(demo => demo.age),
                  datasets: [{
                    label: 'Votes',
                    data: analyticsData.demographicsData.map(demo => demo.votes)
                  }]
                }}
                height={300}
              />
            </div>

            {/* Hourly Voting Patterns */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Hourly Voting Patterns</h3>
              <EnhancedChart
                type="bar"
                data={{
                  labels: analyticsData.hourlyVoting.map(hour => hour.hour),
                  datasets: [{
                    label: 'Votes',
                    data: analyticsData.hourlyVoting.map(hour => hour.votes),
                    backgroundColor: chartColors.accent
                  }]
                }}
                height={300}
                options={{
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45
                      }
                    }
                  }}
                }
              />
            </div>
          </div>

          {/* Detailed Analytics Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Election Performance Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Election</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Votes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Participation Rate</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analyticsData.candidatePerformance.map((election, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {election.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {election.votes.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {election.candidates}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Math.floor(Math.random() * 30 + 40)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isLoading && <LoadingSpinner size="lg" message="Loading analytics..." className="py-8" />}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
