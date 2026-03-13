import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useElectionStore, useAuthStore } from '../store';
import { LoadingSpinner, ErrorAlert, LoadingButton, ValidationSummary } from '../components';
import { useFormValidation } from '../hooks';
import { validationSchemas } from '../utils';

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
  
  const [hasVoted, setHasVoted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const {
    formData,
    errors,
    touched,
    isSubmitting,
    hasTouchedErrors,
    handleChange,
    handleSubmit,
    getFieldProps,
    setFieldValue,
    validateAllFields
  } = useFormValidation(
    {
      candidateId: '',
      confirmation: ''
    },
    validationSchemas.voteSelection,
    {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 0
    }
  );

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
    setFieldValue('candidateId', candidateId);
    setShowConfirmation(false);
  };

  const handleSubmitVote = async (formData) => {
    if (!formData.candidateId) {
      return;
    }

    // Show confirmation dialog before submitting
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    const result = await submitVote({
      electionId: election.id,
      candidateId: formData.candidateId
    });

    if (result.success) {
      // Mark as voted in localStorage (temporary solution)
      const userVotes = JSON.parse(localStorage.getItem('userVotes') || '{}');
      userVotes[election.id] = true;
      localStorage.setItem('userVotes', JSON.stringify(userVotes));
      
      // Generate transaction ID and redirect to confirmation page
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      navigate(`/vote-confirmation?transactionId=${transactionId}&electionId=${election.id}&candidateId=${formData.candidateId}`);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    clearError(); // Clear any previous errors
    
    // Validate that a candidate is selected
    if (!formData.candidateId) {
      setFieldValue('candidateId', '');
      validateAllFields();
      return;
    }
    
    handleSubmit(handleSubmitVote);
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

  const getSelectedCandidate = () => {
    if (!formData.candidateId || !election?.candidates) return null;
    return election.candidates.find(c => c.id === parseInt(formData.candidateId));
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

  if (hasVoted) {
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
                  You have already voted in this election
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                  You can view the results or return to the elections list.
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

  const selectedCandidate = getSelectedCandidate();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-8 space-y-4 sm:space-y-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cast Your Vote</h1>
            <button
              onClick={handleBackToElections}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Elections
            </button>
          </div>

          {/* Error Alert */}
          <ErrorAlert error={error} onClose={clearError} />

          {/* Validation Summary */}
          {hasTouchedErrors && (
            <ValidationSummary
              errors={errors}
              touched={touched}
              title="Please complete the following:"
              onFieldClick={(fieldName) => {
                if (fieldName === 'candidateId') {
                  // Scroll to candidate selection
                  const element = document.getElementById('candidate-selection');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }}
            />
          )}

          {/* Election Information */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {election.title}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                {election.description}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-gray-500">
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
                Please select one candidate from the list below. Your vote is confidential and cannot be changed once submitted.
              </p>
            </div>
            
            <div className="border-t border-gray-200">
              <div className="p-6">
                <form onSubmit={handleFormSubmit}>
                  <div id="candidate-selection" className="space-y-3 sm:space-y-4">
                    {election.candidates?.map((candidate, index) => (
                      <div 
                        key={candidate.id} 
                        className={`flex items-center p-3 sm:p-4 border rounded-lg transition-all cursor-pointer ${
                          formData.candidateId === candidate.id.toString()
                            ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => handleCandidateSelect(candidate.id.toString())}
                      >
                        <input
                          id={`candidate-${candidate.id}`}
                          name="candidateId"
                          type="radio"
                          value={candidate.id}
                          checked={formData.candidateId === candidate.id.toString()}
                          onChange={handleChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 flex-shrink-0"
                        />
                        <label 
                          htmlFor={`candidate-${candidate.id}`} 
                          className="ml-3 flex-1 cursor-pointer min-w-0"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 ${getCandidateColor(index)} rounded-full flex items-center justify-center text-white font-semibold mr-3 sm:mr-4 flex-shrink-0`}>
                              {getInitials(candidate.name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                {candidate.name}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500">
                                {candidate.position || candidate.department || 'Candidate'}
                              </div>
                              {candidate.manifesto && (
                                <div className="mt-2 text-xs sm:text-sm text-gray-600 line-clamp-2">
                                  {candidate.manifesto}
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Error message for no selection */}
                  {errors.candidateId && touched.candidateId && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-600 flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.candidateId}
                      </p>
                    </div>
                  )}

                  {/* Confirmation Dialog */}
                  {showConfirmation && selectedCandidate && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start">
                        <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="ml-3 flex-1">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Confirm Your Vote
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>You are about to vote for:</p>
                            <p className="font-semibold mt-1">{selectedCandidate.name}</p>
                            <p className="mt-2">This action cannot be undone. Are you sure you want to proceed?</p>
                          </div>
                          <div className="mt-3 flex space-x-3">
                            <button
                              type="submit"
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                            >
                              Yes, Submit Vote
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowConfirmation(false)}
                              className="inline-flex items-center px-3 py-1.5 border border-yellow-300 text-xs font-medium rounded-md text-yellow-700 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Actions */}
                  <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                    <LoadingButton
                      type="submit"
                      disabled={!formData.candidateId}
                      isLoading={isSubmitting}
                      loadingText="Submitting..."
                      className="w-full sm:w-auto"
                    >
                      {showConfirmation ? 'Confirm Vote' : 'Submit Vote'}
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
