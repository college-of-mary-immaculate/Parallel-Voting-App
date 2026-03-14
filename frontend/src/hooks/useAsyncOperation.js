import { useState, useCallback, useEffect } from 'react';
import { useRetry } from './useRetry';

export const useAsyncOperation = (operation, options = {}) => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    onComplete
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { execute, retry, reset: resetRetry, retryCount, isRetrying, canRetry } = useRetry(maxRetries, retryDelay);

  const executeOperation = useCallback(async (...args) => {
    setIsLoading(true);
    setError(null);
    setIsSuccess(false);

    try {
      const result = await execute(operation, ...args);
      setData(result);
      setIsSuccess(true);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (onError) {
        onError(err, retryCount);
      }
      
      throw err;
    } finally {
      setIsLoading(false);
      
      if (onComplete) {
        onComplete();
      }
    }
  }, [operation, execute, onSuccess, onError, onComplete, retryCount]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsSuccess(false);
    resetRetry();
  }, [resetRetry]);

  const retryOperation = useCallback(async () => {
    if (canRetry && error) {
      try {
        await retry();
        // If retry succeeds, re-execute the original operation
        return await executeOperation();
      } catch (err) {
        // Retry failed, error is already set
        throw err;
      }
    }
  }, [canRetry, error, retry, executeOperation]);

  return {
    data,
    error,
    isLoading,
    isSuccess,
    isRetrying,
    retryCount,
    canRetry,
    execute: executeOperation,
    retry: retryOperation,
    reset
  };
};

export default useAsyncOperation;
