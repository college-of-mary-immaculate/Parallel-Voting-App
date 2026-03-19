// Environment configuration and validation
export const config = {
  // Application configuration
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Parallel Voting App',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
    description: import.meta.env.VITE_APP_DESCRIPTION || 'Secure voting platform',
    buildDate: import.meta.env.VITE_BUILD_DATE || new Date().toISOString(),
    buildCommit: import.meta.env.VITE_BUILD_COMMIT || 'unknown',
    buildBranch: import.meta.env.VITE_BUILD_BRANCH || 'main'
  },

  // API configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 10000,
    retryAttempts: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS) || 3,
    endpoints: {
      auth: '/api/auth',
      elections: '/api/elections',
      candidates: '/api/candidates',
      votes: '/api/votes',
      results: '/api/results',
      users: '/api/users',
      analytics: '/api/analytics'
    }
  },

  // Feature flags
  features: {
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    performanceMonitoring: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
    errorReporting: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
    pwa: import.meta.env.VITE_ENABLE_PWA === 'true',
    offline: import.meta.env.VITE_ENABLE_OFFLINE === 'true',
    bundleAnalyzer: import.meta.env.VITE_BUNDLE_ANALYZER === 'true',
    sourceMap: import.meta.env.VITE_SOURCE_MAP === 'true',
    minify: import.meta.env.VITE_MINIFY === 'true',
    treeShaking: import.meta.env.VITE_TREESHAKING === 'true'
  },

  // Security configuration
  security: {
    enableCSP: import.meta.env.VITE_ENABLE_CSP === 'true',
    enableHSTS: import.meta.env.VITE_ENABLE_HSTS === 'true',
    secureCookies: import.meta.env.VITE_SECURE_COOKIES === 'true'
  },

  // Analytics and monitoring
  analytics: {
    id: import.meta.env.VITE_ANALYTICS_ID || '',
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
    errorReportingEndpoint: import.meta.env.VITE_ERROR_REPORTING_ENDPOINT || ''
  },

  // CDN configuration
  cdn: {
    url: import.meta.env.VITE_CDN_URL || '',
    staticUrl: import.meta.env.VITE_STATIC_URL || ''
  },

  // Cache configuration
  cache: {
    version: import.meta.env.VITE_CACHE_VERSION || 'v1.0.0',
    duration: parseInt(import.meta.env.VITE_CACHE_DURATION) || 86400
  },

  // PWA configuration
  pwa: {
    name: import.meta.env.VITE_PWA_NAME || 'VoteApp',
    shortName: import.meta.env.VITE_PWA_SHORT_NAME || 'VoteApp',
    themeColor: import.meta.env.VITE_PWA_THEME_COLOR || '#4F46E5',
    backgroundColor: import.meta.env.VITE_PWA_BACKGROUND_COLOR || '#FFFFFF'
  },

  // Environment detection
  environment: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    isTest: import.meta.env.MODE === 'test',
    mode: import.meta.env.MODE || 'development'
  },

  // Performance configuration
  performance: {
    enableBundleAnalyzer: import.meta.env.VITE_BUNDLE_ANALYZER === 'true',
    enableSourceMap: import.meta.env.VITE_SOURCE_MAP === 'true',
    enableMinify: import.meta.env.VITE_MINIFY === 'true',
    enableTreeShaking: import.meta.env.VITE_TREESHAKING === 'true'
  }
};

// Environment validation
export const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  // Validate required environment variables
  const requiredVars = [
    'VITE_API_BASE_URL',
    'VITE_APP_NAME',
    'VITE_APP_VERSION'
  ];

  requiredVars.forEach(varName => {
    if (!import.meta.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Validate API URL format
  try {
    new URL(config.api.baseUrl);
  } catch (error) {
    errors.push('Invalid API base URL format');
  }

  // Validate timeout values
  if (config.api.timeout < 1000 || config.api.timeout > 60000) {
    warnings.push('API timeout should be between 1000ms and 60000ms');
  }

  // Validate retry attempts
  if (config.api.retryAttempts < 0 || config.api.retryAttempts > 5) {
    warnings.push('API retry attempts should be between 0 and 5');
  }

  // Validate cache duration
  if (config.cache.duration < 0) {
    errors.push('Cache duration must be positive');
  }

  // Validate feature flags
  Object.entries(config.features).forEach(([key, value]) => {
    if (typeof value !== 'boolean') {
      warnings.push(`Feature flag ${key} should be boolean`);
    }
  });

  // Log validation results
  if (errors.length > 0) {
    console.error('Environment validation errors:', errors);
  }

  if (warnings.length > 0) {
    console.warn('Environment validation warnings:', warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Get environment-specific configuration
export const getEnvironmentConfig = () => {
  const env = config.environment;
  
  if (env.isProduction) {
    return {
      ...config,
      // Production-specific overrides
      api: {
        ...config.api,
        timeout: 5000, // Shorter timeout in production
        retryAttempts: 2
      },
      performance: {
        ...config.performance,
        enableSourceMap: false, // No source maps in production
        enableBundleAnalyzer: false
      }
    };
  }

  if (env.isDevelopment) {
    return {
      ...config,
      // Development-specific overrides
      api: {
        ...config.api,
        timeout: 30000, // Longer timeout in development
        retryAttempts: 1
      },
      features: {
        ...config.features,
        analytics: false, // Disable analytics in development
        errorReporting: false
      }
    };
  }

  return config;
};

// Feature flag helper
export const isFeatureEnabled = (feature) => {
  return config.features[feature] === true;
};

// API endpoint helper
export const getApiEndpoint = (endpoint) => {
  return `${config.api.baseUrl}${config.api.endpoints[endpoint] || endpoint}`;
};

// CDN URL helper
export const getCdnUrl = (path) => {
  const baseUrl = config.cdn.url || config.api.baseUrl;
  return `${baseUrl}${path}`;
};

// Cache key helper
export const getCacheKey = (key) => {
  return `${key}_${config.cache.version}`;
};

// Environment detection helpers
export const isProduction = () => config.environment.isProduction;
export const isDevelopment = () => config.environment.isDevelopment;
export const isTest = () => config.environment.isTest;

// Export default configuration
export default config;
