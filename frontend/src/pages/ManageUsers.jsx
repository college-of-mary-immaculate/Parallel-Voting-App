import { useState, useEffect } from 'react';
import { LoadingSpinner, ErrorAlert, LoadingButton } from '../components';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'voter',
    status: 'active',
    department: '',
    studentId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Mock data
      const mockUsers = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john.doe@university.edu',
          role: 'admin',
          status: 'active',
          department: 'Computer Science',
          studentId: '2021001',
          lastLogin: '2024-03-10T14:30:00Z',
          registrationDate: '2024-01-15T09:00:00Z',
          votesCast: 0
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane.smith@university.edu',
          role: 'voter',
          status: 'active',
          department: 'Business Administration',
          studentId: '2021002',
          lastLogin: '2024-03-10T10:15:00Z',
          registrationDate: '2024-01-20T11:30:00Z',
          votesCast: 3
        },
        {
          id: 3,
          name: 'Bob Johnson',
          email: 'bob.johnson@university.edu',
          role: 'voter',
          status: 'inactive',
          department: 'Engineering',
          studentId: '2021003',
          lastLogin: '2024-02-28T16:45:00Z',
          registrationDate: '2024-01-18T14:20:00Z',
          votesCast: 1
        },
        {
          id: 4,
          name: 'Alice Brown',
          email: 'alice.brown@university.edu',
          role: 'candidate',
          status: 'active',
          department: 'Political Science',
          studentId: '2021004',
          lastLogin: '2024-03-10T09:00:00Z',
          registrationDate: '2024-01-22T13:45:00Z',
          votesCast: 0
        },
        {
          id: 5,
          name: 'Charlie Wilson',
          email: 'charlie.wilson@university.edu',
          role: 'voter',
          status: 'suspended',
          department: 'Mathematics',
          studentId: '2021005',
          lastLogin: '2024-03-01T12:30:00Z',
          registrationDate: '2024-01-25T10:15:00Z',
          votesCast: 2
        }
      ];

      setUsers(mockUsers);
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        role: 'voter',
        status: 'active',
        department: '',
        studentId: ''
      });
      fetchUsers();
    } catch (err) {
      console.error('Failed to create user:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      department: user.department,
      studentId: user.studentId
    });
    setShowCreateForm(true);
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleToggleUserStatus = async (userId, newStatus) => {
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      fetchUsers();
    } catch (err) {
      console.error('Failed to update user status:', err);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!confirm('Are you sure you want to reset this user\'s password?')) return;
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Password reset link sent to user email');
    } catch (err) {
      console.error('Failed to reset password:', err);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'candidate':
        return 'bg-blue-100 text-blue-800';
      case 'voter':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    admins: users.filter(u => u.role === 'admin').length,
    candidates: users.filter(u => u.role === 'candidate').length,
    voters: users.filter(u => u.role === 'voter').length,
    suspended: users.filter(u => u.status === 'suspended').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Users</h1>
              <p className="mt-2 text-gray-600">Manage user accounts and permissions</p>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setFormData({
                  name: '',
                  email: '',
                  role: 'voter',
                  status: 'active',
                  department: '',
                  studentId: ''
                });
                setShowCreateForm(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="mr-2">➕</span>
              Add User
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-500">Total Users</div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
              <div className="text-sm text-gray-500">Admins</div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-2xl font-bold text-blue-600">{stats.candidates}</div>
              <div className="text-sm text-gray-500">Candidates</div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-2xl font-bold text-green-600">{stats.voters}</div>
              <div className="text-sm text-gray-500">Voters</div>
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-2xl font-bold text-red-600">{stats.suspended}</div>
              <div className="text-sm text-gray-500">Suspended</div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Users
                </label>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or student ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="role-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Role
                </label>
                <select
                  id="role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="candidate">Candidate</option>
                  <option value="voter">Voter</option>
                </select>
              </div>
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div className="flex items-end">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{filteredUsers.length}</span> users found
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
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <form onSubmit={handleCreateUser}>
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
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="voter">Voter</option>
                      <option value="candidate">Candidate</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                      Department
                    </label>
                    <input
                      type="text"
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                  <div>
                    <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-2">
                      Student ID
                    </label>
                    <input
                      type="text"
                      id="studentId"
                      value={formData.studentId}
                      onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 2021001"
                    />
                  </div>
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
                    {editingUser ? 'Update User' : 'Add User'}
                  </LoadingButton>
                </div>
              </form>
            </div>
          )}

          {/* Users List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Users</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Votes Cast</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">ID: {user.studentId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.department || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.lastLogin).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.votesCast}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleResetPassword(user.id)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Reset
                            </button>
                          </div>
                          <div className="flex space-x-2">
                            {user.status === 'active' && (
                              <button
                                onClick={() => handleToggleUserStatus(user.id, 'suspended')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Suspend
                              </button>
                            )}
                            {user.status === 'suspended' && (
                              <button
                                onClick={() => handleToggleUserStatus(user.id, 'active')}
                                className="text-green-600 hover:text-green-900"
                              >
                                Activate
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {isLoading && <LoadingSpinner size="lg" message="Loading users..." className="py-8" />}
        </div>
      </div>
    </div>
  );
};

export default ManageUsers;
