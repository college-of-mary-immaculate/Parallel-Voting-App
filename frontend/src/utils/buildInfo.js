// Build information and utilities
import { config } from '../config/environment';

export const buildInfo = {
  version: config.app.version,
  buildDate: config.app.buildDate,
  buildCommit: config.app.buildCommit,
  buildBranch: config.app.buildBranch,
  environment: config.environment.mode,
  features: config.features,
  timestamp: Date.now()
};

// Build information component
export const BuildInfo = () => {
  if (!config.environment.isDevelopment && !config.environment.isProduction) {
    return null;
  }

  return (
    <div className="build-info" style={{ 
      position: 'fixed', 
      bottom: 0, 
      right: 0, 
      fontSize: '10px', 
      color: '#666',
      background: 'rgba(255,255,255,0.9)',
      padding: '2px 5px',
      zIndex: 9999
    }}>
      {config.app.name} v{config.app.version} ({config.environment.mode})
    </div>
  );
};

// Get build information for API headers
export const getBuildHeaders = () => {
  return {
    'X-App-Version': config.app.version,
    'X-Build-Date': config.app.buildDate,
    'X-Build-Commit': config.app.buildCommit,
    'X-Environment': config.environment.mode
  };
};

// Check if build is stale (older than 24 hours)
export const isBuildStale = () => {
  const buildDate = new Date(config.app.buildDate);
  const now = new Date();
  const hoursDiff = (now - buildDate) / (1000 * 60 * 60);
  
  return hoursDiff > 24;
};

// Get build age in human readable format
export const getBuildAge = () => {
  const buildDate = new Date(config.app.buildDate);
  const now = new Date();
  const diffMs = now - buildDate;
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  
  return 'Just now';
};

// Build health check
export const performBuildHealthCheck = async () => {
  const healthCheck = {
    timestamp: Date.now(),
    buildInfo,
    environment: config.environment.mode,
    features: Object.keys(config.features).filter(key => config.features[key]),
    apiEndpoints: Object.keys(config.api.endpoints),
    status: 'healthy',
    issues: []
  };

  try {
    // Check if build is stale
    if (isBuildStale()) {
      healthCheck.issues.push('Build is older than 24 hours');
    }

    // Check required features
    const requiredFeatures = ['pwa', 'offline'];
    requiredFeatures.forEach(feature => {
      if (!config.features[feature]) {
        healthCheck.issues.push(`Required feature ${feature} is disabled`);
      }
    });

    // Check API configuration
    try {
      new URL(config.api.baseUrl);
    } catch (error) {
      healthCheck.issues.push('Invalid API base URL');
      healthCheck.status = 'unhealthy';
    }

    // Check environment variables
    if (!config.app.name || !config.app.version) {
      healthCheck.issues.push('Missing app name or version');
    }

    // Set status based on issues
    if (healthCheck.issues.length > 0) {
      healthCheck.status = 'warning';
    }

  } catch (error) {
    healthCheck.status = 'error';
    healthCheck.issues.push(`Health check failed: ${error.message}`);
  }

  return healthCheck;
};

// Log build information
export const logBuildInfo = () => {
  console.group('🚀 Build Information');
  console.log('App:', config.app.name);
  console.log('Version:', config.app.version);
  console.log('Environment:', config.environment.mode);
  console.log('Build Date:', config.app.buildDate);
  console.log('Build Commit:', config.app.buildCommit);
  console.log('Build Branch:', config.app.buildBranch);
  console.log('Features:', config.features);
  console.log('API Base URL:', config.api.baseUrl);
  console.log('Cache Version:', config.cache.version);
  console.groupEnd();
};

// Export build information for debugging
export const exportBuildInfo = () => {
  const data = {
    buildInfo,
    config,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `build-info-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
};

// Initialize build information
export const initializeBuildInfo = () => {
  // Log build information in development
  if (config.environment.isDevelopment) {
    logBuildInfo();
  }

  // Perform health check
  performBuildHealthCheck().then(healthCheck => {
    if (healthCheck.status !== 'healthy') {
      console.warn('Build health check issues:', healthCheck.issues);
    }
  });

  // Add build info to window for debugging
  if (config.environment.isDevelopment) {
    window.buildInfo = buildInfo;
    window.config = config;
    window.performBuildHealthCheck = performBuildHealthCheck;
    window.exportBuildInfo = exportBuildInfo;
  }
};

export default {
  buildInfo,
  BuildInfo,
  getBuildHeaders,
  isBuildStale,
  getBuildAge,
  performBuildHealthCheck,
  logBuildInfo,
  exportBuildInfo,
  initializeBuildInfo
};
