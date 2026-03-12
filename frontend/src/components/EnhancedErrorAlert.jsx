import React from 'react';
import { ErrorAlert } from './ErrorAlert';
import RetryButton from './RetryButton';

const EnhancedErrorAlert = ({ 
  error, 
  onClose, 
  onRetry, 
  isRetrying, 
  retryCount, 
  maxRetries = 3,
  showRetry = true,
  className = '',
  actionButtons = null 
}) => {
  if (!error) return null;

  const getErrorSeverity = (error) => {
    if (error.status >= 500) return 'error';
    if (error.status >= 400) return 'warning';
    return 'info';
  };

  const getErrorTitle = (error) => {
    if (error.status === 500) return 'Server Error';
    if (error.status === 404) return 'Not Found';
    if (error.status === 401) return 'Unauthorized';
    if (error.status === 403) return 'Forbidden';
    if (error.status >= 400) return 'Request Error';
    return 'Error';
  };

  const getErrorDescription = (error) => {
    if (error.message) return error.message;
    if (error.status === 500) return 'An unexpected server error occurred. Please try again.';
    if (error.status === 404) return 'The requested resource was not found.';
    if (error.status === 401) return 'You need to be logged in to access this resource.';
    if (error.status === 403) return 'You don\'t have permission to access this resource.';
    if (error.status >= 400) return 'There was a problem with your request.';
    return 'An unexpected error occurred.';
  };

  const getRetrySuggestion = (error) => {
    if (error.status === 500) return 'The server is temporarily unavailable. Please wait a moment and retry.';
    if (error.status >= 400) return 'Please check your request and try again.';
    return 'Something went wrong. You can try again.';
  };

  const severity = getErrorSeverity(error);
  const title = getErrorTitle(error);
  const description = getErrorDescription(error);
  const retrySuggestion = getRetrySuggestion(error);

  return (
    <div className={`rounded-md ${className}`}>
      <ErrorAlert error={error} onClose={onClose} />
      
      {/* Detailed Error Information */}
      <div className="mt-3 p-3 bg-gray-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${
              severity === 'error' ? 'text-red-400' :
              severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
            }`} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              {title}
            </h3>
            <div className="mt-2 text-sm text-gray-500">
              <p>{description}</p>
              <p className="mt-1">{retrySuggestion}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        {showRetry && onRetry && (
          <RetryButton
            onRetry={onRetry}
            isRetrying={isRetrying}
            retryCount={retryCount}
            maxRetries={maxRetries}
            className="flex-1"
          />
        )}
        
        {actionButtons && (
          <div className="flex gap-3">
            {actionButtons}
          </div>
        )}
        
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Retry Progress */}
      {isRetrying && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Retrying...</span>
            <span className="text-sm text-gray-500">{retryCount}/{maxRetries}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(retryCount / maxRetries) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedErrorAlert;
