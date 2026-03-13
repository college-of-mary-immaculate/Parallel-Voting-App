import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElectionStore } from '../store';
import { LoadingSpinner, ErrorAlert, LoadingButton, EnhancedFormField, ValidationSummary } from '../components';
import { useFormValidation } from '../hooks';
import { validationSchemas } from '../utils';

const ManageElections = () => {
  const navigate = useNavigate();
  const { elections, fetchElections, isLoading, error, clearError } = useElectionStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingElection, setEditingElection] = useState(null);

  const {
    formData,
    errors,
    touched,
    isSubmitting,
    hasTouchedErrors,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldProps,
    resetForm,
    setFieldValue
  } = useFormValidation(
    {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      status: 'draft',
      type: 'general',
      category: '',
      maxCandidates: ''
    },
    validationSchemas.electionCreation,
    {
      validateOnChange: true,
      validateOnBlur: true,
      debounceMs: 300
    }
  );

  useEffect(() => {
    fetchElections();
  }, [fetchElections]);

  const handleCreateElection = async (formData) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCreateForm(false);
      resetForm();
      fetchElections();
    } catch (err) {
      console.error('Failed to create election:', err);
    }
  };

  const handleEditElection = (election) => {
    setEditingElection(election);
    setFieldValue('title', election.title);
    setFieldValue('description', election.description);
    setFieldValue('startDate', election.startDate);
    setFieldValue('endDate', election.endDate);
    setFieldValue('status', election.status);
    setFieldValue('type', election.type || 'general');
    setFieldValue('category', election.category || '');
    setFieldValue('maxCandidates', election.maxCandidates || '');
    setShowCreateForm(true);
  };

  const handleDeleteElection = async (electionId) => {
    if (!confirm('Are you sure you want to delete this election? This action cannot be undone.')) return;
    
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

  const handleFormSubmit = (e) => {
    e.preventDefault();
    clearError(); // Clear any previous errors
    handleSubmit(handleCreateElection);
  };

  const handleCancelForm = () => {
    setShowCreateForm(false);
    setEditingElection(null);
    resetForm();
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
              
              {/* Validation Summary */}
              {hasTouchedErrors && (
                <ValidationSummary
                  errors={errors}
                  touched={touched}
                  title="Please fix the following errors:"
                  onFieldClick={(fieldName) => {
                    const element = document.getElementById(fieldName);
                    if (element) {
                      element.focus();
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                />
              )}

              <form onSubmit={handleFormSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <EnhancedFormField
                    label="Election Title"
                    name="title"
                    type="text"
                    placeholder="Enter election title"
                    required
                    showSuccessIndicator={true}
                    helperText="Choose a clear and descriptive title for the election."
                    {...getFieldProps('title')}
                  />

                  <EnhancedFormField
                    label="Election Type"
                    name="type"
                    type="select"
                    helperText="Select the type of election you're creating."
                    {...getFieldProps('type')}
                  >
                    <option value="general">General Election</option>
                    <option value="primary">Primary Election</option>
                    <option value="referendum">Referendum</option>
                    <option value="local">Local Election</option>
                  </EnhancedFormField>

                  <EnhancedFormField
                    label="Start Date"
                    name="startDate"
                    type="datetime-local"
                    required
                    showSuccessIndicator={true}
                    helperText="When the election period begins."
                    {...getFieldProps('startDate')}
                  />

                  <EnhancedFormField
                    label="End Date"
                    name="endDate"
                    type="datetime-local"
                    required
                    showSuccessIndicator={true}
                    helperText="When voting ends and results can be announced."
                    {...getFieldProps('endDate')}
                  />

                  <EnhancedFormField
                    label="Category"
                    name="category"
                    type="select"
                    helperText="Select the appropriate category for this election."
                    {...getFieldProps('category')}
                  >
                    <option value="">Select a category</option>
                    <option value="student-government">Student Government</option>
                    <option value="club-elections">Club Elections</option>
                    <option value="referendum">Referendum</option>
                    <option value="policy">Policy</option>
                    <option value="other">Other</option>
                  </EnhancedFormField>

                  <EnhancedFormField
                    label="Maximum Candidates"
                    name="maxCandidates"
                    type="number"
                    placeholder="e.g., 10"
                    required
                    showSuccessIndicator={true}
                    helperText="Maximum number of candidates allowed (2-50)."
                    {...getFieldProps('maxCandidates')}
                  />
                </div>

                <div className="mt-6">
                  <EnhancedFormField
                    label="Description"
                    name="description"
                    type="textarea"
                    rows={4}
                    required
                    showSuccessIndicator={true}
                    helperText="Provide a detailed description of the election purpose and what voters should know."
                    {...getFieldProps('description')}
                  />
                </div>

                <div className="mt-6">
                  <EnhancedFormField
                    label="Status"
                    name="status"
                    type="select"
                    helperText="Set the initial status of the election."
                    {...getFieldProps('status')}
                  >
                    <option value="draft">Draft</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </EnhancedFormField>
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    isLoading={isSubmitting}
                    loadingText={editingElection ? 'Updating...' : 'Creating...'}
                    disabled={hasTouchedErrors}
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
