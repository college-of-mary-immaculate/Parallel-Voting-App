import React, { Suspense, useState, useEffect } from 'react';

const LazyComponent = ({ 
  children, 
  fallback = null, 
  errorFallback = null,
  delay = 200,
  minLoadingTime = 300 
}) => {
  const [showFallback, setShowFallback] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFallback(true);
      setStartTime(Date.now());
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const handleError = () => {
    setHasError(true);
  };

  const handleRender = () => {
    if (startTime) {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsed);
      
      if (remainingTime > 0) {
        setTimeout(() => {}, remainingTime);
      }
    }
  };

  if (hasError) {
    return errorFallback || (
      <div className="flex items-center justify-center p-8 text-red-600">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Failed to load component</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <Suspense 
        fallback={
          showFallback ? (
            fallback || (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-2 text-gray-600">Loading...</span>
              </div>
            )
          ) : (
            <div style={{ height: '200px' }} />
          )
        }
      >
        <div onLoad={handleRender}>
          {children}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

// Simple error boundary for lazy components
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('LazyComponent error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.errorFallback || (
        <div className="flex items-center justify-center p-8 text-red-600">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Something went wrong</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LazyComponent;
