import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'text-indigo-600', 
  message = 'Loading...', 
  fullScreen = false,
  overlay = false 
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex items-center justify-center bg-white bg-opacity-90 z-50'
    : overlay 
      ? 'absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-40'
      : 'flex items-center justify-center';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-2">
        <div className={`${sizeClasses[size]} animate-spin`}>
          <svg 
            className={`w-full h-full ${color}`} 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        {message && (
          <p className={`text-sm ${color} font-medium`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
