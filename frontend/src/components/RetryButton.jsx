import React from 'react';
import { LoadingButton } from './LoadingButton';

const RetryButton = ({ 
  onRetry, 
  isRetrying, 
  retryCount, 
  maxRetries = 3, 
  className = '',
  children = 'Retry',
  variant = 'outline',
  size = 'md'
}) => {
  const remainingRetries = maxRetries - retryCount;
  
  if (retryCount >= maxRetries) {
    return (
      <div className="text-sm text-gray-500">
        Maximum retry attempts ({maxRetries}) exceeded
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <LoadingButton
        onClick={onRetry}
        isLoading={isRetrying}
        loadingText="Retrying..."
        disabled={isRetrying}
        variant={variant}
        size={size}
        className={className}
      >
        {children} {remainingRetries > 0 && `(${remainingRetries} left)`}
      </LoadingButton>
      
      {retryCount > 0 && (
        <p className="text-xs text-gray-500">
          Attempt {retryCount} of {maxRetries} failed. Trying again...
        </p>
      )}
    </div>
  );
};

export default RetryButton;
