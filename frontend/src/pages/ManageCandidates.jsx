import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner, ErrorAlert, LoadingButton } from '../components';

const ManageCandidates = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [selectedElection, setSelectedElection] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    manifesto: '',
    electionId: '',
    party: '',
    photo: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Mock data
      const mockElections = [
        { id: 1, title: 'Student Council 2024', status: 'active' },
        { id: 2, title: 'Class Representatives', status: 'upcoming' },
        { id: 3, title: 'Club President', status: 'draft' }
      ];

      const mockCandidates = [
        {
          id: 1,
          name: 'Alice Johnson',
          email: 'alice@university.edu',
          position: 'President',
          party: 'Progressive Party',
          electionId: 1,
          electionTitle: 'Student Council 2024',
          manifesto: 'Dedicated to improving student life and academic excellence.',
          status: 'approved',
          votes: 245
        },
        {
          id: 2,
          name: 'Bob Smith',
          email: 'bob@university.edu',
          position: 'President',
          party: 'Traditional Party',
          electionId: 1,
          electionTitle: 'Student Council 2024',
          manifesto: 'Experience and leadership for a better future.',
          status: 'approved',
          votes: 189
        },
        {
          id: 3,
          name: 'Carol Davis',
          email: 'carol@university.edu',
          position: 'Vice President',
          party: 'Independent',
          electionId: 1,
          electionTitle: 'Student Council 2024',
          manifesto: 'Innovation and progress through collaboration.',
          status: 'pending',
          votes: 156
        }
      ];

      setElections(mockElections);
      setCandidates(mockCandidates);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCandidate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        position: '',
        manifesto: '',
        electionId: '',
        party: '',
        photo: ''
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create candidate:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCandidate = (candidate) => {
    setEditingCandidate(candidate);
    setFormData({
      name: candidate.name,
      email: candidate.email,
      position: candidate.position,
      manifesto: candidate.manifesto,
      electionId: candidate.electionId,
      party: candidate.party,
      photo: candidate.photo || ''
    });
    setShowCreateForm(true);
  };

  const handleDeleteCandidate = async (candidateId) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchData();
    } catch (err) {
      console.error('Failed to delete candidate:', err);
    }
  };

  const handleApproveCandidate = async (candidateId) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchData();
    } catch (err) {
      console.error('Failed to approve candidate:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredCandidates = selectedElection 
    ? candidates.filter(c => c.electionId == selectedElection)
    : candidates;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Candidates</h1>
              <p className="mt-2 text-gray-600">Approve and manage election candidates</p>
            </div>
            <button
              onClick={() => {
                setEditingCandidate(null);
                setFormData({
                  name: '',
                  email: '',
                  position: '',
                  manifesto: '',
                  electionId: '',
                  party: '',
                  photo: ''
                });
                setShowCreateForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="mr-2">➕</span>
              Add Candidate
            </button>
          </div>

          {/* Filter */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0">
              <div className="flex-1">
                <label htmlFor="election-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Election
                </label>
                <select
                  id="election-filter"
                  value={selectedElection}
                  onChange={(e) => setSelectedElection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Elections</option>
                  {elections.map(election => (
                    <option key={election.id} value={election.id}>
                      {election.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{filteredCandidates.length}</span> candidates found
                </div>
                <div className="text-sm text-yellow-600">
                  <span className="font-medium">
                    {filteredCandidates.filter(c => c.status === 'pending').length}
                  </span> pending approval
                </div>
              </div>
            </div>
          </div>

          {/* Error Alert */}
          <ErrorAlert error={error} />

          {/* Create/Edit Form */}
          {showCreateForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCandidate ? 'Edit Candidate' : 'Add New Candidate'}
              </h3>
              <form onSubmit={handleCreateCandidate}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <input
                      type="text"
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., President, Vice President"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="party" className="block text-sm font-medium text-gray-700 mb-2">
                      Party/Group
                    </label>
                    <input
                      type="text"
                      id="party"
                      value={formData.party}
                      onChange={(e) => setFormData(prev => ({ ...prev, party: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Progressive Party, Independent"
                    />
                  </div>
                  <div>
                    <label htmlFor="electionId" className="block text-sm font-medium text-gray-700 mb-2">
                      Election
                    </label>
                    <select
                      id="electionId"
                      value={formData.electionId}
                      onChange={(e) => setFormData(prev => ({ ...prev, electionId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="">Select Election</option>
                      {elections.map(election => (
                        <option key={election.id} value={election.id}>
                          {election.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-2">
                      Photo URL
                    </label>
                    <input
                      type="url"
                      id="photo"
                      value={formData.photo}
                      onChange={(e) => setFormData(prev => ({ ...prev, photo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <label htmlFor="manifesto" className="block text-sm font-medium text-gray-700 mb-2">
                    Manifesto/Platform
                  </label>
                  <textarea
                    id="manifesto"
                    value={formData.manifesto}
                    onChange={(e) => setFormData(prev => ({ ...prev, manifesto: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Describe your platform and goals..."
                    required
                  />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={isSubmitting}
                    loadingText="Saving..."
                  >
                    {editingCandidate ? 'Update Candidate' : 'Add Candidate'}
                  </LoadingButton>
                </div>
              </form>
            </div>
          )}

          {/* Candidates List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Candidates</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Election</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCandidates.map((candidate) => (
                    <tr key={candidate.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                {candidate.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{candidate.name}</div>
                            <div className="text-sm text-gray-500">{candidate.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.position}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.electionTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.party || 'Independent'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(candidate.status)}`}>
                          {candidate.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.votes || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditCandidate(candidate)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          {candidate.status === 'pending' && (
                            <button
                              onClick={() => handleApproveCandidate(candidate.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCandidate(candidate.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isLoading && <LoadingSpinner size="lg" message="Loading candidates..." className="py-8" />}
        </div>
      </div>
    </div>
  );
};

export default ManageCandidates;
