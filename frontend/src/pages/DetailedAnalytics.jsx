import { useState, useEffect } from 'react';
import { useElectionStore } from '../store';
import { LoadingSpinner, ErrorAlert, EnhancedChart } from '../components';
import AdvancedAnalytics from '../components/AdvancedAnalytics';

const DetailedAnalytics = () => {
  const { elections, fetchElections, isLoading, error, clearError } = useElectionStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d');
  const [selectedChartType, setSelectedChartType] = useState('overview');
  const [analyticsData, setAnalyticsData] = useState({
    overview: {},
    voterTurnout: [],
    votingPatterns: [],
    candidateComparison: [],
    demographics: [],
    regionalAnalysis: []
  });

  useEffect(() => {
    fetchElections();
    generateDetailedAnalytics();
  }, [fetchElections]);

  useEffect(() => {
    generateDetailedAnalytics();
  }, [elections, selectedTimeRange]);

  const generateDetailedAnalytics = () => {
    // Generate comprehensive analytics data
    const totalVotes = elections.reduce((sum, election) => sum + (election.totalVotes || Math.floor(Math.random() * 1000)), 0);
    const totalVoters = Math.floor(totalVotes * 0.8);
    const activeElections = elections.filter(e => e.status === 'active').length;
    const completedElections = elections.filter(e => e.status === 'completed').length;

    // Overview data
    const overview = {
      totalVotes,
      totalVoters,
      activeElections,
      completedElections,
      averageVotesPerElection: elections.length > 0 ? Math.floor(totalVotes / elections.length) : 0,
      participationRate: Math.floor(Math.random() * 30 + 40), // 40-70%
      growthRate: Math.floor(Math.random() * 20 - 10) // -10 to +10%
    };

    // Voter turnout data
    const voterTurnout = [
      { timeRange: 'Last 24h', turnout: 65 },
      { timeRange: 'Last 7d', turnout: 58 },
      { timeRange: 'Last 30d', turnout: 72 },
      { timeRange: 'Last 90d', turnout: 68 }
    ];

    // Voting patterns (hourly)
    const votingPatterns = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      votes: Math.floor(Math.random() * 150) + 20
    }));

    // Candidate comparison
    const candidateComparison = elections.slice(0, 5).map(election => ({
      candidate: election.title,
      primaryVotes: Math.floor(Math.random() * 800) + 200,
      secondaryVotes: Math.floor(Math.random() * 300) + 50
    }));

    // Demographics data
    const demographics = [
      { category: '18-24 years', count: Math.floor(totalVoters * 0.15) },
      { category: '25-34 years', count: Math.floor(totalVoters * 0.25) },
      { category: '35-44 years', count: Math.floor(totalVoters * 0.30) },
      { category: '45-54 years', count: Math.floor(totalVoters * 0.20) },
      { category: '55+ years', count: Math.floor(totalVoters * 0.10) }
    ];

    // Regional analysis
    const regionalAnalysis = [
      { region: 'North Region', votes: Math.floor(totalVotes * 0.35) },
      { region: 'South Region', votes: Math.floor(totalVotes * 0.25) },
      { region: 'East Region', votes: Math.floor(totalVotes * 0.20) },
      { region: 'West Region', votes: Math.floor(totalVotes * 0.15) },
      { region: 'Central Region', votes: Math.floor(totalVotes * 0.05) }
    ];

    setAnalyticsData({
      overview,
      voterTurnout,
      votingPatterns,
      candidateComparison,
      demographics,
      regionalAnalysis
    });
  };

  const chartTypes = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'voterTurnout', name: 'Voter Turnout', icon: '📈' },
    { id: 'votingPatterns', name: 'Voting Patterns', icon: '⏰' },
    { id: 'candidateComparison', name: 'Candidate Comparison', icon: '👥' },
    { id: 'demographics', name: 'Demographics', icon: '👥' },
    { id: 'regionalAnalysis', name: 'Regional Analysis', icon: '🗺' }
  ];

  const renderOverviewCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalVotes?.toLocaleString()}</div>
        <div className="text-sm text-gray-500">Total Votes</div>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalVoters?.toLocaleString()}</div>
        <div className="text-sm text-gray-500">Total Voters</div>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-2xl font-bold text-gray-900">{analyticsData.overview.activeElections}</div>
        <div className="text-sm text-gray-500">Active Elections</div>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-2xl font-bold text-gray-900">{analyticsData.overview.completedElections}</div>
        <div className="text-sm text-gray-500">Completed Elections</div>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-2xl font-bold text-gray-900">{analyticsData.overview.participationRate}%</div>
        <div className="text-sm text-gray-500">Participation Rate</div>
      </div>
      <div className="bg-white shadow rounded-lg p-6">
        <div className={`text-2xl font-bold ${analyticsData.overview.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {analyticsData.overview.growthRate >= 0 ? '+' : ''}{analyticsData.overview.growthRate}%
        </div>
        <div className="text-sm text-gray-500">Growth Rate</div>
      </div>
    </div>
  );

  const renderChartContent = () => {
    switch (selectedChartType) {
      case 'overview':
        return (
          <div className="space-y-8">
            {renderOverviewCards()}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Voting Trends</h3>
                <EnhancedChart
                  type="line"
                  data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                      label: 'Votes',
                      data: [1200, 1900, 1500, 2100, 2400, 2200],
                      backgroundColor: 'rgba(59, 130, 246, 0.8)',
                      borderColor: 'rgba(59, 130, 246, 1)',
                      fill: true
                    }]
                  }}
                  height={300}
                />
              </div>
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Election Types</h3>
                <EnhancedChart
                  type="doughnut"
                  data={{
                    labels: ['Presidential', 'Senate', 'Local', 'Referendum'],
                    datasets: [{
                      data: [45, 25, 20, 10]
                    }]
                  }}
                  height={300}
                />
              </div>
            </div>
          </div>
        );

      case 'voterTurnout':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Voter Turnover Analysis</h3>
            <AdvancedAnalytics
              data={analyticsData.voterTurnout}
              type="voterTurnout"
              height={400}
            />
          </div>
        );

      case 'votingPatterns':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Voting Patterns by Hour</h3>
            <AdvancedAnalytics
              data={analyticsData.votingPatterns}
              type="votingPatterns"
              height={400}
            />
          </div>
        );

      case 'candidateComparison':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Candidate Performance Comparison</h3>
            <AdvancedAnalytics
              data={analyticsData.candidateComparison}
              type="candidateComparison"
              height={400}
            />
          </div>
        );

      case 'demographics':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Age Demographics</h3>
              <EnhancedChart
                type="pie"
                data={{
                  labels: analyticsData.demographics.map(d => d.category),
                  datasets: [{
                    data: analyticsData.demographics.map(d => d.count)
                  }]
                }}
                height={300}
              />
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Gender Distribution</h3>
              <EnhancedChart
                type="polarArea"
                data={{
                  labels: ['Male', 'Female', 'Other'],
                  datasets: [{
                    data: [52, 45, 3]
                  }]
                }}
                height={300}
              />
            </div>
          </div>
        );

      case 'regionalAnalysis':
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Regional Vote Distribution</h3>
            <AdvancedAnalytics
              data={analyticsData.regionalAnalysis}
              type="regionalAnalysis"
              height={400}
            />
          </div>
        );

      default:
        return <div>Select a chart type</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Detailed Analytics</h1>
            <div className="flex flex-col sm:flex-row gap-4">
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

          {/* Chart Type Selector */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Analytics Categories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {chartTypes.map((chartType) => (
                <button
                  key={chartType.id}
                  onClick={() => setSelectedChartType(chartType.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    selectedChartType === chartType.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{chartType.icon}</div>
                  <div className="text-sm font-medium text-gray-900">{chartType.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Chart Content */}
          {renderChartContent()}

          {isLoading && <LoadingSpinner size="lg" message="Loading analytics..." className="py-8" />}
        </div>
      </div>
    </div>
  );
};

export default DetailedAnalytics;
