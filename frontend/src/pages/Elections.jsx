import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import LoadingSpinner from '../components/LoadingSpinner';
import LoadingButton from '../components/LoadingButton';
import EnhancedErrorAlert from '../components/EnhancedErrorAlert';
import ErrorBoundary from '../components/ErrorBoundary';

// Skeleton components
const SearchBarSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-10 bg-gray-200 rounded-lg"></div>
  </div>
);

const FilterDropdownSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-10 bg-gray-200 rounded-lg"></div>
  </div>
);

const ResultsSummarySkeleton = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
  </div>
);

const GridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

const Elections = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [votingStatusFilter, setVotingStatusFilter] = useState('all');
  const [candidateCountFilter, setCandidateCountFilter] = useState('all');
  const [sortBy, setSortBy] = useState('deadline-asc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Fetch elections with retry logic
  const {
    data: elections,
    loading,
    error,
    execute: fetchElections,
    retryCount
  } = useAsyncOperation(
    async () => {
      const response = await fetch('/api/elections');
      if (!response.ok) {
        throw new Error(`Failed to fetch elections: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    },
    [],
    { maxRetries: 3, retryDelay: 1000 }
  );

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  // Get user's voting history (mock)
  const getUserVotedElections = () => {
    const userVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
    return Object.keys(userVotes).map(id => parseInt(id));
  };

  const votedElections = getUserVotedElections();

  // Enhanced filtering logic
  const filteredElections = elections.filter(election => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      election.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      election.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      election.category?.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || election.status === statusFilter;

    // Category filter
    const matchesCategory = categoryFilter === 'all' || election.category === categoryFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const electionDate = new Date(election.startDate);
      const today = new Date();
      
      switch (dateFilter) {
        case 'today':
          matchesDate = electionDate.toDateString() === today.toDateString();
          break;
        case 'week':
          const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
          matchesDate = electionDate >= today && electionDate <= weekFromNow;
          break;
        case 'month':
          matchesDate = electionDate.getMonth() === today.getMonth() && 
                       electionDate.getFullYear() === today.getFullYear();
          break;
        case 'custom':
          if (customDateRange.start && customDateRange.end) {
            const start = new Date(customDateRange.start);
            const end = new Date(customDateRange.end);
            matchesDate = electionDate >= start && electionDate <= end;
          }
          break;
        default:
          matchesDate = true;
      }
    }

    // Voting status filter
    let matchesVotingStatus = true;
    if (votingStatusFilter !== 'all') {
      const hasVoted = votedElections.includes(election.id);
      matchesVotingStatus = votingStatusFilter === 'voted' ? hasVoted : !hasVoted;
    }

    // Candidate count filter
    let matchesCandidateCount = true;
    if (candidateCountFilter !== 'all') {
      const candidateCount = election.candidates?.length || 0;
      switch (candidateCountFilter) {
        case '1-5':
          matchesCandidateCount = candidateCount >= 1 && candidateCount <= 5;
          break;
        case '6-10':
          matchesCandidateCount = candidateCount >= 6 && candidateCount <= 10;
          break;
        case '11-20':
          matchesCandidateCount = candidateCount >= 11 && candidateCount <= 20;
          break;
        case '20+':
          matchesCandidateCount = candidateCount > 20;
          break;
        default:
          matchesCandidateCount = true;
      }
    }

    return matchesSearch && matchesStatus && matchesCategory && 
           matchesDate && matchesVotingStatus && matchesCandidateCount;
  });

  // Sorting logic
  const sortedElections = useMemo(() => {
    const sorted = [...filteredElections];
    
    switch (sortBy) {
      case 'deadline-asc':
        return sorted.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
      case 'deadline-desc':
        return sorted.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'created-asc':
        return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'created-desc':
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      default:
        return sorted;
    }
  }, [filteredElections, sortBy]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleVote = (electionId) => {
    navigate(`/elections/${electionId}/vote`);
  };

  const handleView = (electionId) => {
    navigate(`/elections/${electionId}`);
  };

  return (
    <ErrorBoundary
      fallback={({ error, retryCount, onRetry, onReload }) => (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full">
            <EnhancedErrorAlert
              error={error}
              onRetry={retryCount < 3 ? onRetry : null}
              isRetrying={false}
              retryCount={retryCount}
              maxRetries={3}
              showRetry={true}
              actionButtons={[
                <button
                  key="reload"
                  onClick={onReload}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Reload Page
                </button>
              ]}
            />
          </div>
        </div>
      )}
    >
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Elections</h1>
            <p className="text-gray-600">Participate in democratic decision-making</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            {/* Search Bar */}
            <div className="mb-6">
              {loading ? (
                <SearchBarSkeleton />
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search elections by title, description, type, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                  </div>
                  {loading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {loading ? (
                <>
                  <FilterDropdownSkeleton />
                  <FilterDropdownSkeleton />
                  <FilterDropdownSkeleton />
                  <FilterDropdownSkeleton />
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Categories</option>
                      <option value="student-government">Student Government</option>
                      <option value="club-elections">Club Elections</option>
                      <option value="referendum">Referendum</option>
                      <option value="policy">Policy</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="deadline-asc">Deadline (Earliest)</option>
                      <option value="deadline-desc">Deadline (Latest)</option>
                      <option value="title-asc">Title (A-Z)</option>
                      <option value="title-desc">Title (Z-A)</option>
                      <option value="created-asc">Created (Oldest)</option>
                      <option value="created-desc">Created (Newest)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4"
            >
              {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
            </button>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Voting Status</label>
                  <select
                    value={votingStatusFilter}
                    onChange={(e) => setVotingStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">All</option>
                    <option value="voted">Voted</option>
                    <option value="not-voted">Not Voted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate Count</label>
                  <select
                    value={candidateCountFilter}
                    onChange={(e) => setCandidateCountFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Any</option>
                    <option value="1-5">1-5 Candidates</option>
                    <option value="6-10">6-10 Candidates</option>
                    <option value="11-20">11-20 Candidates</option>
                    <option value="20+">20+ Candidates</option>
                  </select>
                </div>

                {dateFilter === 'custom' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customDateRange.start}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customDateRange.end}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6">
              <EnhancedErrorAlert
                error={error}
                onRetry={retryCount < 3 ? fetchElections : null}
                isRetrying={loading}
                retryCount={retryCount}
                maxRetries={3}
                showRetry={true}
              />
            </div>
          )}

          {/* Results Summary */}
          <div className="mb-6">
            {loading ? (
              <ResultsSummarySkeleton />
            ) : (
              <p className="text-gray-600">
                Showing {sortedElections.length} of {elections.length} elections
              </p>
            )}
          </div>

          {/* Elections Grid */}
          {loading ? (
            <GridSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedElections.map((election) => {
                const hasVoted = votedElections.includes(election.id);
                const isActive = election.status === 'active';
                const canVote = isActive && !hasVoted;

                return (
                  <div key={election.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(election.status)}`}>
                          {election.status}
                        </span>
                        {hasVoted && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Voted
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{election.title}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{election.description}</p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(election.startDate).toLocaleDateString()} - {new Date(election.deadline).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          {election.candidates?.length || 0} candidates
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {election.category}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {canVote && (
                          <LoadingButton
                            onClick={() => handleVote(election.id)}
                            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            Vote Now
                          </LoadingButton>
                        )}
                        <button
                          onClick={() => handleView(election.id)}
                          className={`flex-1 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            canVote 
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {hasVoted ? 'View Results' : 'View Details'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && sortedElections.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No elections found</h3>
              <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Elections;