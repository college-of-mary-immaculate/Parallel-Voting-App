import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console and/or error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You could also log to an error reporting service here
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallback, maxRetries = 3 } = this.props;
      
      // Check if we've exceeded max retries
      if (this.state.retryCount >= maxRetries) {
        return fallback ? (
          fallback({
            error: this.state.error,
            errorInfo: this.state.errorInfo,
            retryCount: this.state.retryCount,
            onRetry: this.handleRetry,
            onReload: this.handleReload
          })
        ) : (
          <DefaultErrorFallback 
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            retryCount={this.state.retryCount}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
            maxRetriesExceeded={true}
          />
        );
      }

      return fallback ? (
        fallback({
          error: this.state.error,
          errorInfo: this.state.errorInfo,
          retryCount: this.state.retryCount,
          onRetry: this.handleRetry,
          onReload: this.handleReload
        })
      ) : (
        <DefaultErrorFallback 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component
const DefaultErrorFallback = ({ 
  error, 
  errorInfo, 
  retryCount, 
  onRetry, 
  onReload, 
  maxRetriesExceeded = false 
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white shadow-lg rounded-lg p-8">
        {/* Error Icon */}
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Something went wrong
        </h2>

        {/* Error Message */}
        <p className="text-gray-600 text-center mb-6">
          {maxRetriesExceeded 
            ? "We're having trouble loading this page. Please try refreshing the browser."
            : "An unexpected error occurred. Please try again or refresh the page."
          }
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!maxRetriesExceeded && (
            <button
              onClick={onRetry}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again {retryCount > 0 && `(${retryCount})`}
            </button>
          )}
          
          <button
            onClick={onReload}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Page
          </button>
        </div>

        {/* Development Info */}
        {isDevelopment && error && (
          <details className="mt-6">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Error Details (Development Only)
            </summary>
            <div className="mt-3 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto max-h-40">
              <div className="font-semibold mb-2">Error:</div>
              <pre className="whitespace-pre-wrap">{error.toString()}</pre>
              
              <div className="font-semibold mt-3 mb-2">Component Stack:</div>
              <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
            </div>
          </details>
        )}

        {/* Support Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            If this problem persists, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

// HOC for wrapping components with error boundary
export const withErrorBoundary = (Component, fallbackProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...fallbackProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for handling async errors
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null);

  const handleError = React.useCallback((error) => {
    console.error('Async error caught:', error);
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, clearError };
};

export default ErrorBoundary;
