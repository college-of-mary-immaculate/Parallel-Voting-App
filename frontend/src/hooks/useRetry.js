import { useState, useCallback } from 'react';

export const useRetry = (maxRetries = 3, delay = 1000) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastError, setLastError] = useState(null);

  const execute = useCallback(async (fn, ...args) => {
    try {
      setRetryCount(0);
      setLastError(null);
      setIsRetrying(false);
      return await fn(...args);
    } catch (error) {
      setLastError(error);
      
      if (retryCount < maxRetries) {
        setIsRetrying(true);
        setRetryCount(prev => prev + 1);
        
        // Exponential backoff
        const backoffDelay = delay * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        
        return execute(fn, ...args);
      }
      
      throw error;
    }
  }, [retryCount, maxRetries, delay]);

  const reset = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
    setLastError(null);
  }, []);

  const retry = useCallback(async () => {
    if (lastError && retryCount < maxRetries) {
      setIsRetrying(true);
      setRetryCount(prev => prev + 1);
      
      const backoffDelay = delay * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      
      return execute(() => {
        throw lastError;
      });
    }
  }, [lastError, retryCount, maxRetries, delay, execute]);

  return {
    execute,
    retry,
    reset,
    retryCount,
    isRetrying,
    lastError,
    canRetry: retryCount < maxRetries,
    remainingRetries: maxRetries - retryCount
  };
};

export default useRetry;
