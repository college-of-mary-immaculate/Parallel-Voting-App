import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useElectionStore, useAuthStore } from '../store';
import { LoadingSpinner, ErrorAlert, LoadingButton } from '../components';

const Vote = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    elections, 
    fetchElections, 
    submitVote, 
    isLoading, 
    error, 
    clearError 
  } = useElectionStore();
  const { user } = useAuthStore();
  
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  // Find the specific election
  const election = elections.find(e => e.id === parseInt(id));

  // Check if user has already voted (mock check - would come from backend)
  useEffect(() => {
    if (election && user) {
      // This would be an API call to check if user has voted
      const userVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
      setHasVoted(userVotes[election.id] || false);
    }
  }, [election, user]);

  const handleCandidateSelect = (candidateId) => {
    setSelectedCandidate(candidateId);
  };

  const handleSubmitVote = async () => {
    if (!selectedCandidate) {
      return;
    }

    const result = await submitVote({
      electionId: election.id,
      candidateId: selectedCandidate
    });

    if (result.success) {
      // Mark as voted in localStorage (temporary solution)
      const userVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
      userVotes[election.id] = true;
      localStorage.setItem('userVotes', JSON.stringify(userVotes));
      
      setHasVoted(true);
      setShowConfirmation(true);
    }
  };

  const handleViewResults = () => {
    navigate(`/results/${election.id}`);
  };

  const handleBackToElections = () => {
    navigate('/elections');
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

  const getCandidateColor = (index) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-pink-500', 'bg-indigo-500'];
    return colors[index % colors.length];
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading && !election) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" message="Loading election..." />
      </div>
    );
  }

  if (!election) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Election not found</h3>
              <p className="mt-1 text-sm text-gray-500">The election you're looking for doesn't exist.</p>
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

  if (hasVoted || showConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                  Vote Submitted Successfully!
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  Your vote has been recorded for the {election.title}. Thank you for participating!
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleViewResults}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                  >
                    View Results
                  </button>
                  <button
                    onClick={handleBackToElections}
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                  >
                    Back to Elections
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
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
            <h1 className="text-3xl font-bold text-gray-900">Cast Your Vote</h1>
          </div>

          {/* Error Alert */}
          <ErrorAlert error={error} onClose={clearError} />

          {/* Election Information */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {election.title}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {election.description}
              </p>
              <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Voting ends: {formatDate(election.endDate)}
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {election.candidates?.length || 0} candidates
                </div>
              </div>
            </div>
          </div>

          {/* Voting Form */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Select Your Candidate
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Please select one candidate from the list below
              </p>
            </div>
            
            <div className="border-t border-gray-200">
              <div className="p-6">
                <form onSubmit={(e) => { e.preventDefault(); handleSubmitVote(); }}>
                  <div className="space-y-4">
                    {election.candidates?.map((candidate, index) => (
                      <div key={candidate.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                          id={`candidate-${candidate.id}`}
                          name="candidate"
                          type="radio"
                          value={candidate.id}
                          checked={selectedCandidate === candidate.id}
                          onChange={(e) => handleCandidateSelect(e.target.value)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label 
                          htmlFor={`candidate-${candidate.id}`} 
                          className="ml-3 flex-1 cursor-pointer"
                        >
                          <div className="flex items-center">
                            <div className={`w-12 h-12 ${getCandidateColor(index)} rounded-full flex items-center justify-center text-white font-semibold mr-4`}>
                              {getInitials(candidate.name)}
                            </div>
                            <div className="flex-1">
                              <div className="text-base font-medium text-gray-900">
                                {candidate.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {candidate.position || candidate.department || 'Candidate'}
                              </div>
                              {candidate.manifesto && (
                                <div className="mt-2 text-sm text-gray-600">
                                  {candidate.manifesto}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Form Actions */}
                  <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                    <LoadingButton
                      type="submit"
                      disabled={!selectedCandidate}
                      isLoading={isLoading}
                      loadingText="Submitting..."
                      className="w-full sm:w-auto"
                    >
                      Submit Vote
                    </LoadingButton>
                    <button
                      type="button"
                      onClick={handleBackToElections}
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vote;
