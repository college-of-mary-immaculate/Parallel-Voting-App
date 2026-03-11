import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElectionStore, useAuthStore } from '../store';
import { LoadingSpinner, ErrorAlert, LoadingButton } from '../components';

const Elections = () => {
  const navigate = useNavigate();
  const { elections, fetchElections, isLoading, error, clearError } = useElectionStore();
  const { user } = useAuthStore();
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('startDate');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Date filter states
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [hasVotedFilter, setHasVotedFilter] = useState('all');
  const [candidateCountFilter, setCandidateCountFilter] = useState('all');

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
    const electionStartDate = new Date(election.startDate);
    const electionEndDate = new Date(election.endDate);
    const today = new Date();

    switch (dateFilter) {
      case 'today':
        matchesDate = electionStartDate.toDateString() === today.toDateString();
        break;
      case 'week':
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        matchesDate = electionStartDate <= weekFromNow && electionEndDate >= today;
        break;
      case 'month':
        const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        matchesDate = electionStartDate <= monthFromNow && electionEndDate >= today;
        break;
      case 'custom':
        if (startDate) {
          matchesDate = matchesDate && electionStartDate >= new Date(startDate);
        }
        if (endDate) {
          matchesDate = matchesDate && electionStartDate <= new Date(endDate);
        }
        break;
    }

    // Voted filter
    const hasVoted = votedElections.includes(election.id);
    const matchesVoted = hasVotedFilter === 'all' || 
      (hasVotedFilter === 'voted' && hasVoted) ||
      (hasVotedFilter === 'not-voted' && !hasVoted);

    // Candidate count filter
    const candidateCount = election.candidates?.length || 0;
    const matchesCandidateCount = candidateCountFilter === 'all' ||
      (candidateCountFilter === 'few' && candidateCount <= 3) ||
      (candidateCountFilter === 'moderate' && candidateCount > 3 && candidateCount <= 6) ||
      (candidateCountFilter === 'many' && candidateCount > 6);

    return matchesSearch && matchesStatus && matchesCategory && matchesDate && matchesVoted && matchesCandidateCount;
  });

  // Enhanced sorting
  const sortedElections = [...filteredElections].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'startDate':
        comparison = new Date(a.startDate) - new Date(b.startDate);
        break;
      case 'endDate':
        comparison = new Date(a.endDate) - new Date(b.endDate);
        break;
      case 'candidates':
        comparison = (a.candidates?.length || 0) - (b.candidates?.length || 0);
        break;
      case 'votes':
        comparison = (a.totalVotes || 0) - (b.totalVotes || 0);
        break;
      default:
        comparison = 0;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Get unique categories from elections
  const categories = [...new Set(elections.map(e => e.category).filter(Boolean))];

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setDateFilter('all');
    setStartDate('');
    setEndDate('');
    setHasVotedFilter('all');
    setCandidateCountFilter('all');
    setSortBy('startDate');
    setSortOrder('desc');
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'upcoming':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleVoteClick = (electionId) => {
    navigate(`/vote/${electionId}`);
  };

  const handleViewResults = (electionId) => {
    navigate(`/results/${electionId}`);
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || categoryFilter !== 'all' || 
    dateFilter !== 'all' || hasVotedFilter !== 'all' || candidateCountFilter !== 'all';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Elections</h1>
            <p className="mt-2 text-gray-600">Browse and participate in available elections</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            {/* Main Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search elections by title, description, or category..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Primary Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Status Filter */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <select
                  id="dateFilter"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {/* Sort Options */}
              <div>
                <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex space-x-2">
                  <select
                    id="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="startDate">Start Date</option>
                    <option value="endDate">End Date</option>
                    <option value="title">Title</option>
                    <option value="candidates">Candidates</option>
                    <option value="votes">Votes</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {sortOrder === 'asc' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      )}
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Date Range */}
            {dateFilter === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            )}

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-600 hover:text-gray-800 font-medium flex items-center"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                {/* Voted Filter */}
                <div>
                  <label htmlFor="voted" className="block text-sm font-medium text-gray-700 mb-2">
                    Voting Status
                  </label>
                  <select
                    id="voted"
                    value={hasVotedFilter}
                    onChange={(e) => setHasVotedFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="all">All Elections</option>
                    <option value="not-voted">Not Voted</option>
                    <option value="voted">Already Voted</option>
                  </select>
                </div>

                {/* Candidate Count Filter */}
                <div>
                  <label htmlFor="candidates" className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Candidates
                  </label>
                  <select
                    id="candidates"
                    value={candidateCountFilter}
                    onChange={(e) => setCandidateCountFilter(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="all">Any Number</option>
                    <option value="few">1-3 Candidates</option>
                    <option value="moderate">4-6 Candidates</option>
                    <option value="many">7+ Candidates</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Error Alert */}
          <ErrorAlert error={error} onClose={clearError} />

          {/* Loading State */}
          {isLoading ? (
            <LoadingSpinner size="lg" message="Loading elections..." className="py-8" />
          ) : (
            <>
              {/* Results Summary */}
              <div className="mb-6 flex items-center justify-between">
                <p className="text-gray-600">
                  Showing <span className="font-medium">{sortedElections.length}</span> of{' '}
                  <span className="font-medium">{elections.length}</span> elections
                  {hasActiveFilters && (
                    <span className="text-indigo-600 ml-2">(filtered)</span>
                  )}
                </p>
                
                {/* Quick Filter Tags */}
                {hasActiveFilters && (
                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Search: {searchTerm}
                      </span>
                    )}
                    {statusFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {statusFilter}
                      </span>
                    )}
                    {categoryFilter !== 'all' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {categoryFilter}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Elections Grid */}
              {sortedElections.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No elections found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {hasActiveFilters 
                      ? 'Try adjusting your search or filters' 
                      : 'No elections are available at this time'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {sortedElections.map((election) => {
                    const hasVoted = votedElections.includes(election.id);
                    return (
                      <div key={election.id} className={`bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200 ${hasVoted ? 'border-2 border-green-200' : ''}`}>
                        {/* Election Header */}
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(election.status)}`}>
                              {getStatusIcon(election.status)}
                              {election.status.charAt(0).toUpperCase() + election.status.slice(1)}
                            </span>
                            <div className="flex items-center space-x-2">
                              {hasVoted && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Voted
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                ID: {election.id}
                              </span>
                            </div>
                          </div>

                          {/* Election Title */}
                          <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2">
                            {election.title}
                          </h3>

                          {/* Election Description */}
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {election.description}
                          </p>

                          {/* Election Meta */}
                          <div className="space-y-2 mb-4">
                            {election.category && (
                              <div className="flex items-center text-sm text-gray-500">
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                {election.category}
                              </div>
                            )}
                            <div className="flex items-center text-sm text-gray-500">
                              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {formatDate(election.startDate)} - {formatDate(election.endDate)}
                            </div>
                          </div>

                          {/* Election Stats */}
                          <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              {election.candidates?.length || 0} candidates
                            </div>
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {election.totalVotes || 0} votes
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2">
                            {election.status === 'active' && !hasVoted && (
                              <LoadingButton
                                onClick={() => handleVoteClick(election.id)}
                                className="w-full"
                                variant="primary"
                              >
                                Cast Vote
                              </LoadingButton>
                            )}
                            
                            {hasVoted && (
                              <button
                                onClick={() => navigate('/vote-confirmation', { 
                                  state: { 
                                    electionId: election.id,
                                    transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}` 
                                  }
                                })}
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                View Receipt
                              </button>
                            )}
                            
                            <LoadingButton
                              onClick={() => handleViewResults(election.id)}
                              className="w-full"
                              variant={election.status === 'active' && !hasVoted ? 'outline' : 'primary'}
                            >
                              View Results
                            </LoadingButton>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Elections;