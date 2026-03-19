// Performance monitoring and optimization utilities

// Core Web Vitals monitoring
export const measureCoreWebVitals = () => {
  // Largest Contentful Paint (LCP)
  const observeLCP = () => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
      
      // Send to analytics service
      sendMetric('LCP', Math.round(lastEntry.startTime));
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
  };

  // First Input Delay (FID)
  const observeFID = () => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log('FID:', entry.processingStart - entry.startTime);
        sendMetric('FID', Math.round(entry.processingStart - entry.startTime));
      });
    });
    
    observer.observe({ entryTypes: ['first-input'] });
  };

  // Cumulative Layout Shift (CLS)
  let clsValue = 0;
  const observeCLS = () => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          console.log('CLS:', clsValue);
          sendMetric('CLS', Math.round(clsValue * 1000) / 1000);
        }
      });
    });
    
    observer.observe({ entryTypes: ['layout-shift'] });
  };

  // Start observing all metrics
  observeLCP();
  observeFID();
  observeCLS();
};

// Bundle size monitoring
export const measureBundleSize = () => {
  if (performance.memory) {
    const memoryInfo = {
      used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
      total: Math.round(performance.memory.totalJSHeapSize / 1048576), // MB
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) // MB
    };
    
    console.log('Memory Usage:', memoryInfo);
    sendMetric('memory_usage', memoryInfo.used);
    return memoryInfo;
  }
  return null;
};

// Route change performance monitoring
export const measureRouteChange = (routeName) => {
  const startTime = performance.now();
  
  return {
    end: () => {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log(`Route ${routeName} load time:`, duration, 'ms');
      sendMetric('route_load_time', duration, { route: routeName });
      
      return duration;
    }
  };
};

// API request performance monitoring
export const measureAPIRequest = (url, method = 'GET') => {
  const startTime = performance.now();
  
  return {
    end: (status) => {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log(`API ${method} ${url}:`, duration, 'ms', status);
      sendMetric('api_request_time', duration, { 
        url, 
        method, 
        status 
      });
      
      return duration;
    }
  };
};

// Component render performance monitoring
export const measureComponentRender = (componentName) => {
  const startTime = performance.now();
  
  return {
    end: () => {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log(`Component ${componentName} render time:`, duration, 'ms');
      sendMetric('component_render_time', duration, { component: componentName });
      
      return duration;
    }
  };
};

// Image loading performance monitoring
export const measureImageLoad = (src) => {
  const startTime = performance.now();
  
  return {
    end: (success) => {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      console.log(`Image ${src} load time:`, duration, 'ms', success ? 'success' : 'failed');
      sendMetric('image_load_time', duration, { 
        src, 
        success: success ? 1 : 0 
      });
      
      return duration;
    }
  };
};

// Send metrics to analytics service
const sendMetric = (name, value, tags = {}) => {
  // In production, send to your analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Google Analytics, Mixpanel, etc.
    // gtag('event', name, { value, ...tags });
    
    // For now, just log in development
    console.log('Metric:', { name, value, tags });
  }
};

// Performance budget checker
export const checkPerformanceBudget = () => {
  const budgets = {
    LCP: 2500, // 2.5 seconds
    FID: 100,  // 100 milliseconds
    CLS: 0.1,  // 0.1
    bundleSize: 1024 * 1024, // 1MB
    memoryUsage: 100 // 100MB
  };

  // Check current performance against budgets
  const checkBudgets = () => {
    const results = {
      passed: true,
      violations: []
    };

    // Check memory usage
    const memory = measureBundleSize();
    if (memory && memory.used > budgets.memoryUsage) {
      results.passed = false;
      results.violations.push({
        metric: 'memory_usage',
        current: memory.used,
        budget: budgets.memoryUsage,
        unit: 'MB'
      });
    }

    return results;
  };

  return {
    budgets,
    check: checkBudgets
  };
};

// Lazy loading with performance tracking
export const lazyLoadWithTracking = (importFunc, componentName) => {
  const measure = measureComponentRender(componentName);
  
  return importFunc().then(module => {
    measure.end();
    return module;
  }).catch(error => {
    measure.end();
    console.error(`Failed to load ${componentName}:`, error);
    throw error;
  });
};

// Preload critical resources
export const preloadCriticalResources = () => {
  // Preload critical fonts
  const preloadFont = (url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    link.href = url;
    document.head.appendChild(link);
  };

  // Preload critical images
  const preloadImage = (url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  };

  // Preload critical scripts
  const preloadScript = (url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = url;
    document.head.appendChild(link);
  };

  return {
    preloadFont,
    preloadImage,
    preloadScript
  };
};

// Performance monitoring initialization
export const initPerformanceMonitoring = () => {
  // Only monitor in production or when enabled
  if (process.env.NODE_ENV === 'production' || process.env.REACT_APP_PERFORMANCE_MONITORING) {
    measureCoreWebVitals();
    
    // Monitor memory usage periodically
    setInterval(measureBundleSize, 30000); // Every 30 seconds
    
    // Check performance budgets
    const budgetChecker = checkPerformanceBudget();
    setInterval(() => {
      const results = budgetChecker.check();
      if (!results.passed) {
        console.warn('Performance budget violations:', results.violations);
      }
    }, 60000); // Every minute
  }
};

// Performance optimization utilities
export const performanceUtils = {
  // Debounce function for performance
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function for performance
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // RequestIdleCallback for non-critical tasks
  runWhenIdle: (callback) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback);
    } else {
      // Fallback for browsers that don't support requestIdleCallback
      setTimeout(callback, 1);
    }
  },

  // Virtual scroll helper for large lists
  calculateVisibleItems: (containerHeight, itemHeight, scrollTop) => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      1000 // Prevent infinite loops
    );
    
    return { startIndex, endIndex };
  }
};

export default {
  measureCoreWebVitals,
  measureBundleSize,
  measureRouteChange,
  measureAPIRequest,
  measureComponentRender,
  measureImageLoad,
  checkPerformanceBudget,
  lazyLoadWithTracking,
  preloadCriticalResources,
  initPerformanceMonitoring,
  performanceUtils
};
