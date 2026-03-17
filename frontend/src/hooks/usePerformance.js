import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  measureCoreWebVitals, 
  measureBundleSize, 
  measureRouteChange, 
  initPerformanceMonitoring 
} from '../utils/performance';

// Performance monitoring hook
export const usePerformance = () => {
  const [metrics, setMetrics] = useState({
    LCP: null,
    FID: null,
    CLS: null,
    memoryUsage: null,
    routeLoadTime: null
  });
  
  const [isMonitoring, setIsMonitoring] = useState(false);
  const routeMeasureRef = useRef(null);

  // Start performance monitoring
  const startMonitoring = useCallback(() => {
    if (!isMonitoring) {
      initPerformanceMonitoring();
      setIsMonitoring(true);
    }
  }, [isMonitoring]);

  // Measure route change
  const startRouteMeasurement = useCallback((routeName) => {
    routeMeasureRef.current = measureRouteChange(routeName);
  }, []);

  // End route measurement
  const endRouteMeasurement = useCallback(() => {
    if (routeMeasureRef.current) {
      const duration = routeMeasureRef.current.end();
      setMetrics(prev => ({ ...prev, routeLoadTime: duration }));
      routeMeasureRef.current = null;
      return duration;
    }
    return null;
  }, []);

  // Get current memory usage
  const getMemoryUsage = useCallback(() => {
    const memory = measureBundleSize();
    setMetrics(prev => ({ ...prev, memoryUsage: memory }));
    return memory;
  }, []);

  // Check if performance is within budget
  const checkPerformanceBudget = useCallback(() => {
    const budgets = {
      LCP: 2500,
      FID: 100,
      CLS: 0.1,
      memoryUsage: 100
    };

    const violations = [];
    
    Object.entries(budgets).forEach(([metric, limit]) => {
      const value = metrics[metric];
      if (value !== null && value > limit) {
        violations.push({ metric, value, limit });
      }
    });

    return {
      withinBudget: violations.length === 0,
      violations
    };
  }, [metrics]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    startRouteMeasurement,
    endRouteMeasurement,
    getMemoryUsage,
    checkPerformanceBudget
  };
};

// Hook for monitoring component render performance
export const useRenderPerformance = (componentName) => {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());
  const [renderTimes, setRenderTimes] = useState([]);

  const recordRender = useCallback(() => {
    const now = Date.now();
    const renderTime = now - lastRenderTime.current;
    
    renderCount.current += 1;
    lastRenderTime.current = now;
    
    setRenderTimes(prev => {
      const newTimes = [...prev, renderTime];
      // Keep only last 10 renders
      return newTimes.slice(-10);
    });

    return renderTime;
  }, []);

  const getAverageRenderTime = useCallback(() => {
    if (renderTimes.length === 0) return 0;
    const sum = renderTimes.reduce((acc, time) => acc + time, 0);
    return sum / renderTimes.length;
  }, [renderTimes]);

  const getRenderCount = useCallback(() => {
    return renderCount.current;
  }, []);

  return {
    recordRender,
    getAverageRenderTime,
    getRenderCount,
    renderTimes
  };
};

// Hook for monitoring API performance
export const useAPIPerformance = () => {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const startRequest = useCallback((url, method = 'GET') => {
    const requestId = Date.now();
    const startTime = performance.now();
    
    setIsLoading(true);
    
    return {
      requestId,
      end: (status) => {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        const request = {
          id: requestId,
          url,
          method,
          status,
          duration,
          timestamp: startTime
        };
        
        setRequests(prev => {
          const newRequests = [...prev, request];
          // Keep only last 20 requests
          return newRequests.slice(-20);
        });
        
        setIsLoading(false);
        return duration;
      }
    };
  }, []);

  const getAverageResponseTime = useCallback(() => {
    if (requests.length === 0) return 0;
    const sum = requests.reduce((acc, req) => acc + req.duration, 0);
    return sum / requests.length;
  }, [requests]);

  const getSlowRequests = useCallback((threshold = 1000) => {
    return requests.filter(req => req.duration > threshold);
  }, [requests]);

  const clearRequests = useCallback(() => {
    setRequests([]);
  }, []);

  return {
    requests,
    isLoading,
    startRequest,
    getAverageResponseTime,
    getSlowRequests,
    clearRequests
  };
};

// Hook for monitoring image loading performance
export const useImagePerformance = () => {
  const [images, setImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const startImageLoad = useCallback((src) => {
    const imageId = Date.now();
    const startTime = performance.now();
    
    setIsLoading(true);
    
    return {
      imageId,
      end: (success) => {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        const image = {
          id: imageId,
          src,
          duration,
          success,
          timestamp: startTime
        };
        
        setImages(prev => {
          const newImages = [...prev, image];
          // Keep only last 20 images
          return newImages.slice(-20);
        });
        
        setIsLoading(false);
        return duration;
      }
    };
  }, []);

  const getAverageLoadTime = useCallback(() => {
    const successfulImages = images.filter(img => img.success);
    if (successfulImages.length === 0) return 0;
    const sum = successfulImages.reduce((acc, img) => acc + img.duration, 0);
    return sum / successfulImages.length;
  }, [images]);

  const getFailedImages = useCallback(() => {
    return images.filter(img => !img.success);
  }, [images]);

  const getSlowImages = useCallback((threshold = 1000) => {
    return images.filter(img => img.duration > threshold);
  }, [images]);

  const clearImages = useCallback(() => {
    setImages([]);
  }, []);

  return {
    images,
    isLoading,
    startImageLoad,
    getAverageLoadTime,
    getFailedImages,
    getSlowImages,
    clearImages
  };
};

// Hook for monitoring user interaction performance
export const useInteractionPerformance = () => {
  const [interactions, setInteractions] = useState([]);
  const [isInteracting, setIsInteracting] = useState(false);

  const startInteraction = useCallback((type, target) => {
    const interactionId = Date.now();
    const startTime = performance.now();
    
    setIsInteracting(true);
    
    return {
      interactionId,
      end: () => {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        const interaction = {
          id: interactionId,
          type,
          target,
          duration,
          timestamp: startTime
        };
        
        setInteractions(prev => {
          const newInteractions = [...prev, interaction];
          // Keep only last 20 interactions
          return newInteractions.slice(-20);
        });
        
        setIsInteracting(false);
        return duration;
      }
    };
  }, []);

  const getAverageInteractionTime = useCallback(() => {
    if (interactions.length === 0) return 0;
    const sum = interactions.reduce((acc, interaction) => acc + interaction.duration, 0);
    return sum / interactions.length;
  }, [interactions]);

  const getSlowInteractions = useCallback((threshold = 200) => {
    return interactions.filter(interaction => interaction.duration > threshold);
  }, [interactions]);

  const getInteractionsByType = useCallback((type) => {
    return interactions.filter(interaction => interaction.type === type);
  }, [interactions]);

  const clearInteractions = useCallback(() => {
    setInteractions([]);
  }, []);

  return {
    interactions,
    isInteracting,
    startInteraction,
    getAverageInteractionTime,
    getSlowInteractions,
    getInteractionsByType,
    clearInteractions
  };
};

// Hook for monitoring scroll performance
export const useScrollPerformance = () => {
  const [scrollEvents, setScrollEvents] = useState([]);
  const scrollTimeoutRef = useRef(null);

  const handleScroll = useCallback(() => {
    const startTime = performance.now();
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set new timeout to record scroll end
    scrollTimeoutRef.current = setTimeout(() => {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      const scrollEvent = {
        id: Date.now(),
        duration,
        timestamp: startTime
      };
      
      setScrollEvents(prev => {
        const newScrollEvents = [...prev, scrollEvent];
        // Keep only last 10 scroll events
        return newScrollEvents.slice(-10);
      });
    }, 100); // Consider scroll ended after 100ms of inactivity
  }, []);

  const getAverageScrollTime = useCallback(() => {
    if (scrollEvents.length === 0) return 0;
    const sum = scrollEvents.reduce((acc, event) => acc + event.duration, 0);
    return sum / scrollEvents.length;
  }, [scrollEvents]);

  const getJankyScrolls = useCallback((threshold = 16) => {
    return scrollEvents.filter(event => event.duration > threshold);
  }, [scrollEvents]);

  const clearScrollEvents = useCallback(() => {
    setScrollEvents([]);
  }, []);

  return {
    scrollEvents,
    handleScroll,
    getAverageScrollTime,
    getJankyScrolls,
    clearScrollEvents
  };
};

// Hook for monitoring network performance
export const useNetworkPerformance = () => {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false
  });

  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection) {
          setNetworkInfo({
            effectiveType: connection.effectiveType || '4g',
            downlink: connection.downlink || 10,
            rtt: connection.rtt || 100,
            saveData: connection.saveData || false
          });
        }
      }
    };

    updateNetworkInfo();
    
    // Listen for network changes
    if ('connection' in navigator) {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        connection.addEventListener('change', updateNetworkInfo);
      }
    }

    return () => {
      if ('connection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
          connection.removeEventListener('change', updateNetworkInfo);
        }
      }
    };
  }, []);

  const isSlowConnection = useCallback(() => {
    return networkInfo.effectiveType === 'slow-2g' || 
           networkInfo.effectiveType === '2g' || 
           networkInfo.effectiveType === '3g';
  }, [networkInfo]);

  const isDataSaver = useCallback(() => {
    return networkInfo.saveData;
  }, [networkInfo]);

  return {
    networkInfo,
    isSlowConnection,
    isDataSaver
  };
};

// Hook for monitoring visibility and focus performance
export const useVisibilityPerformance = () => {
  const [visibilityState, setVisibilityState] = useState('visible');
  const [focusState, setFocusState] = useState(true);
  const [visibilityEvents, setVisibilityEvents] = useState([]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const newState = document.visibilityState;
      setVisibilityState(newState);
      
      const event = {
        id: Date.now(),
        type: 'visibility',
        state: newState,
        timestamp: performance.now()
      };
      
      setVisibilityEvents(prev => {
        const newEvents = [...prev, event];
        return newEvents.slice(-10);
      });
    };

    const handleFocusChange = () => {
      const hasFocus = document.hasFocus();
      setFocusState(hasFocus);
      
      const event = {
        id: Date.now(),
        type: 'focus',
        state: hasFocus,
        timestamp: performance.now()
      };
      
      setVisibilityEvents(prev => {
        const newEvents = [...prev, event];
        return newEvents.slice(-10);
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
    };
  }, []);

  const isVisible = useCallback(() => {
    return visibilityState === 'visible' && focusState;
  }, [visibilityState, focusState]);

  return {
    visibilityState,
    focusState,
    visibilityEvents,
    isVisible
  };
};

export default usePerformance;
