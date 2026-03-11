import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'text-indigo-600', 
  message = 'Loading...', 
  fullScreen = false,
  overlay = false,
  variant = 'spinner',
  className = ''
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

  // Spinner variant
  const renderSpinner = () => (
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
  );

  // Dots variant
  const renderDots = () => {
    const dotSizes = {
      xs: 'w-1 h-1',
      sm: 'w-1.5 h-1.5',
      md: 'w-2 h-2',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4'
    };

    return (
      <div className="flex space-x-1">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`${dotSizes[size]} ${color} rounded-full animate-bounce`}
            style={{ animationDelay: `${index * 0.1}s` }}
          />
        ))}
      </div>
    );
  };

  // Pulse variant
  const renderPulse = () => (
    <div className={`${sizeClasses[size]} ${color} animate-pulse rounded-full bg-current`} />
  );

  // Bars variant
  const renderBars = () => {
    const barSizes = {
      xs: 'w-1 h-4',
      sm: 'w-1.5 h-6',
      md: 'w-2 h-8',
      lg: 'w-3 h-12',
      xl: 'w-4 h-16'
    };

    return (
      <div className="flex items-end space-x-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`${barSizes[size]} ${color} animate-pulse rounded-full bg-current`}
            style={{ 
              animationDelay: `${index * 0.1}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
    );
  };

  // Ring variant
  const renderRing = () => (
    <div className={`${sizeClasses[size]} relative`}>
      <div className={`absolute inset-0 ${color} rounded-full border-4 border-t-transparent border-r-transparent animate-spin`} />
    </div>
  );

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'bars':
        return renderBars();
      case 'ring':
        return renderRing();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        {renderVariant()}
        {message && (
          <p className={`text-sm ${color} font-medium text-center`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

// Specialized loading components
export const PageLoader = ({ message = 'Loading page...' }) => (
  <LoadingSpinner 
    size="lg" 
    message={message} 
    fullScreen 
    variant="spinner"
  />
);

export const ButtonLoader = ({ size = 'sm', color = 'text-white' }) => (
  <LoadingSpinner 
    size={size} 
    color={color} 
    variant="dots"
  />
);

export const CardLoader = ({ message = 'Loading content...' }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <LoadingSpinner 
      size="md" 
      message={message} 
      variant="ring"
    />
  </div>
);

export const ListLoader = ({ message = 'Loading items...' }) => (
  <div className="flex flex-col items-center justify-center py-8">
    <LoadingSpinner 
      size="sm" 
      message={message} 
      variant="bars"
    />
  </div>
);

export const InlineLoader = ({ message = 'Processing...', size = 'sm' }) => (
  <div className="flex items-center space-x-2">
    <LoadingSpinner 
      size={size} 
      variant="dots"
      className="inline-flex"
    />
    {message && (
      <span className="text-sm text-gray-600">{message}</span>
    )}
  </div>
);

export default LoadingSpinner;
