import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElectionStore } from '../store';
import { LoadingSpinner, ErrorAlert, LoadingButton } from '../components';

const ManageElections = () => {
  const navigate = useNavigate();
  const { elections, fetchElections, isLoading, error, clearError } = useElectionStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingElection, setEditingElection] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'draft',
    type: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const handleCreateElection = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCreateForm(false);
      setFormData({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        status: 'draft',
        type: 'general'
      });
      fetchElections();
    } catch (err) {
      console.error('Failed to create election:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditElection = (election) => {
    setEditingElection(election);
    setFormData({
      title: election.title,
      description: election.description,
      startDate: election.startDate,
      endDate: election.endDate,
      status: election.status,
      type: election.type || 'general'
    });
    setShowCreateForm(true);
  };

  const handleDeleteElection = async (electionId) => {
    if (!confirm('Are you sure you want to delete this election?')) return;
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchElections();
    } catch (err) {
      console.error('Failed to delete election:', err);
    }
  };

  const handleToggleStatus = async (electionId, newStatus) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchElections();
    } catch (err) {
      console.error('Failed to update election status:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'completed':
        return '✅';
      case 'draft':
        return '📝';
      case 'upcoming':
        return '⏰';
      default:
        return '❓';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Elections</h1>
              <p className="mt-2 text-gray-600">Create and manage voting elections</p>
            </div>
            <button
              onClick={() => {
                setEditingElection(null);
                setFormData({
                  title: '',
                  description: '',
                  startDate: '',
                  endDate: '',
                  status: 'draft',
                  type: 'general'
                });
                setShowCreateForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="mr-2">➕</span>
              Create Election
            </button>
          </div>

          {/* Error Alert */}
          <ErrorAlert error={error} onClose={clearError} />

          {/* Create/Edit Form */}
          {showCreateForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingElection ? 'Edit Election' : 'Create New Election'}
              </h3>
              <form onSubmit={handleCreateElection}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      Election Title
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                      Election Type
                    </label>
                    <select
                      id="type"
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="general">General Election</option>
                      <option value="primary">Primary Election</option>
                      <option value="referendum">Referendum</option>
                      <option value="local">Local Election</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="datetime-local"
                      id="startDate"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="datetime-local"
                      id="endDate"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div className="mt-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div className="mt-6">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
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
                    {editingElection ? 'Update Election' : 'Create Election'}
                  </LoadingButton>
                </div>
              </form>
            </div>
          )}

          {/* Elections List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">All Elections</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Election</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {elections.map((election) => (
                    <tr key={election.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{election.title}</div>
                          <div className="text-sm text-gray-500">{election.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 capitalize">{election.type || 'general'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(election.status)}`}>
                          <span className="mr-1">{getStatusIcon(election.status)}</span>
                          {election.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(election.startDate).toLocaleDateString()} - {new Date(election.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {election.totalVotes || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditElection(election)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => navigate(`/admin/elections/${election.id}/candidates`)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Candidates
                          </button>
                          {election.status === 'draft' && (
                            <button
                              onClick={() => handleToggleStatus(election.id, 'active')}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Activate
                            </button>
                          )}
                          {election.status === 'active' && (
                            <button
                              onClick={() => handleToggleStatus(election.id, 'completed')}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Complete
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteElection(election.id)}
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

          {isLoading && <LoadingSpinner size="lg" message="Loading elections..." className="py-8" />}
        </div>
      </div>
    </div>
  );
};

export default ManageElections;
