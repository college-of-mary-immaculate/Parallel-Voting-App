import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useAccessibility } from './AccessibilityProvider';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { keyboardUser, announceToScreenReader } = useAccessibility();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
    announceToScreenReader('You have been logged out successfully');
  };

  const handleLinkClick = () => {
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    announceToScreenReader(`Mobile menu ${!mobileMenuOpen ? 'opened' : 'closed'}`);
  };

  return (
    <header className="bg-white shadow relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link 
                to="/dashboard" 
                className="flex items-center" 
                onClick={handleLinkClick}
                aria-label="VoteApp - Go to dashboard"
              >
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <h1 className="text-xl font-bold text-gray-900">VoteApp</h1>
              </Link>
            </div>
            {/* Desktop Navigation */}
            <nav 
              id="navigation"
              className="hidden md:ml-6 md:flex md:space-x-8"
              role="navigation"
              aria-label="Main navigation"
            >
              <Link
                to="/dashboard"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/dashboard')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                onClick={handleLinkClick}
                aria-current={isActive('/dashboard') ? 'page' : undefined}
              >
                Dashboard
              </Link>
              <Link
                to="/elections"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/elections')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                onClick={handleLinkClick}
              >
                Elections
              </Link>
              <Link
                to="/results"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/results')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                onClick={handleLinkClick}
              >
                Results
              </Link>
              <Link
                to="/realtime"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/realtime')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                onClick={handleLinkClick}
              >
                Live Dashboard
              </Link>
              <Link
                to="/analytics"
                className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                  isActive('/analytics')
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
                onClick={handleLinkClick}
              >
                Analytics
              </Link>
              {isAuthenticated && user?.role === 'admin' && (
                <div className="relative">
                  <button
                    className="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    Admin
                    <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {mobileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <Link
                        to="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={handleLinkClick}
                      >
                        Admin Dashboard
                      </Link>
                      <Link
                        to="/admin/elections"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={handleLinkClick}
                      >
                        Manage Elections
                      </Link>
                      <Link
                        to="/admin/candidates"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={handleLinkClick}
                      >
                        Manage Candidates
                      </Link>
                      <Link
                        to="/admin/users"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={handleLinkClick}
                      >
                        Manage Users
                      </Link>
                      <Link
                        to="/admin/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={handleLinkClick}
                      >
                        Settings
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
          
          {/* Desktop User Actions */}
          <div className="hidden md:flex md:items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-2">
                    <span className="text-gray-600 font-medium text-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user?.name || 'User'}</span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="flex items-center text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Account
                  </button>
                  {mobileMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={handleLinkClick}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  onClick={handleLinkClick}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  onClick={handleLinkClick}
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-500 hover:text-gray-700 focus:outline-none focus:text-gray-700 p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/dashboard"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/dashboard')
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              onClick={handleLinkClick}
            >
              Dashboard
            </Link>
            <Link
              to="/elections"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/elections')
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              onClick={handleLinkClick}
            >
              Elections
            </Link>
            <Link
              to="/results"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/results')
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              onClick={handleLinkClick}
            >
              Results
            </Link>
            <Link
              to="/realtime"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/realtime')
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              onClick={handleLinkClick}
            >
              Live Dashboard
            </Link>
            <Link
              to="/analytics"
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/analytics')
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              onClick={handleLinkClick}
            >
              Analytics
            </Link>
            {isAuthenticated && user?.role === 'admin' && (
              <>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Admin
                  </div>
                </div>
                <Link
                  to="/admin"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/admin')
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={handleLinkClick}
                >
                  Admin Dashboard
                </Link>
                <Link
                  to="/admin/elections"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/admin/elections')
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={handleLinkClick}
                >
                  Manage Elections
                </Link>
                <Link
                  to="/admin/candidates"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/admin/candidates')
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={handleLinkClick}
                >
                  Manage Candidates
                </Link>
                <Link
                  to="/admin/users"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/admin/users')
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={handleLinkClick}
                >
                  Manage Users
                </Link>
                <Link
                  to="/admin/settings"
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isActive('/admin/settings')
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  onClick={handleLinkClick}
                >
                  Settings
                </Link>
              </>
            )}
          </div>
          
          {/* Mobile User Actions */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            {isAuthenticated ? (
              <div className="px-2 space-y-1">
                <div className="flex items-center px-3 py-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                    <span className="text-gray-600 font-medium text-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-medium text-gray-800">{user?.name}</div>
                    <div className="text-sm text-gray-500">{user?.email}</div>
                  </div>
                </div>
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  onClick={handleLinkClick}
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="px-2 space-y-1">
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  onClick={handleLinkClick}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block px-3 py-2 rounded-md text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  onClick={handleLinkClick}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
