//const { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } = require('./auditLogger');
import { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } from "./auditLogger.js";

// API Versioning Configuration
const API_VERSIONING_CONFIG = {
  // Default version
  defaultVersion: 'v1',
  
  // Supported versions
  supportedVersions: ['v1', 'v2'],
  
  // Versioning strategy
  strategy: 'url-path', // 'url-path', 'header', 'query-param'
  
  // Version header name (for header strategy)
  versionHeader: 'API-Version',
  
  // Version query parameter (for query-param strategy)
  versionQueryParam: 'version',
  
  // Deprecation settings
  deprecation: {
    // Warning threshold (days before deprecation)
    warningThreshold: 30,
    
    // Sunset period (days after deprecation before removal)
    sunsetPeriod: 90,
    
    // Deprecated versions
    deprecatedVersions: [],
    
    // Sunset versions (to be removed)
    sunsetVersions: []
  },
  
  // Version compatibility
  compatibility: {
    // Allow fallback to default version
    allowFallback: true,
    
    // Strict version checking
    strictMode: false,
    
    // Version mapping for backward compatibility
    versionMapping: {
      '1': 'v1',
      '2': 'v2'
    }
  },
  
  // Response headers
  responseHeaders: {
    // Include version in response headers
    includeVersion: true,
    
    // Include supported versions
    includeSupported: true,
    
    // Include deprecation warnings
    includeDeprecation: true
  },
  
  // Version-specific features
  features: {
    v1: {
      // Basic features
      authentication: true,
      elections: true,
      candidates: true,
      voting: true,
      analytics: true,
      notifications: true,
      
      // Advanced features
      realTime: true,
      export: true,
      audit: true,
      security: true,
      
      // New features not available in v1
      multiFactorAuth: false,
      advancedAnalytics: false,
      bulkOperations: false,
      webhooks: false
    },
    
    v2: {
      // All v1 features
      authentication: true,
      elections: true,
      candidates: true,
      voting: true,
      analytics: true,
      notifications: true,
      realTime: true,
      export: true,
      audit: true,
      security: true,
      
      // New v2 features
      multiFactorAuth: true,
      advancedAnalytics: true,
      bulkOperations: true,
      webhooks: true,
      
      // Enhanced features
      pagination: true,
      filtering: true,
      sorting: true,
      search: true,
      caching: true
    }
  },
  
  // Migration settings
  migration: {
    // Enable automatic migration
    enableAutoMigration: false,
    
    // Migration endpoints
    migrationEndpoints: ['/api/v1/migrate', '/api/v2/migrate'],
    
    // Migration data retention
    retentionPeriod: 30 // days
  }
};

// Version Information Class
class VersionInfo {
  constructor(version, isDeprecated = false, isSunset = false, deprecationDate = null, sunsetDate = null) {
    this.version = version;
    this.isDeprecated = isDeprecated;
    this.isSunset = isSunset;
    this.deprecationDate = deprecationDate;
    this.sunsetDate = sunsetDate;
    this.features = API_VERSIONING_CONFIG.features[version] || {};
    this.supported = API_VERSIONING_CONFIG.supportedVersions.includes(version);
  }
  
  // Check if feature is available in this version
  hasFeature(feature) {
    return this.features[feature] === true;
  }
  
  // Get available features
  getAvailableFeatures() {
    return Object.keys(this.features).filter(feature => this.features[feature]);
  }
  
  // Get version metadata
  getMetadata() {
    return {
      version: this.version,
      supported: this.supported,
      deprecated: this.isDeprecated,
      sunset: this.isSunset,
      deprecationDate: this.deprecationDate,
      sunsetDate: this.sunsetDate,
      features: this.features,
      availableFeatures: this.getAvailableFeatures()
    };
  }
}

// API Versioning Manager
class APIVersionManager {
  constructor() {
    this.config = API_VERSIONING_CONFIG;
    this.versionInfo = new Map();
    this.initializeVersions();
  }
  
  // Initialize version information
  initializeVersions() {
    // Initialize supported versions
    for (const version of this.config.supportedVersions) {
      const isDeprecated = this.config.deprecation.deprecatedVersions.includes(version);
      const isSunset = this.config.deprecation.sunsetVersions.includes(version);
      
      let deprecationDate = null;
      let sunsetDate = null;
      
      if (isDeprecated) {
        deprecationDate = new Date(Date.now() + this.config.deprecation.warningThreshold * 24 * 60 * 60 * 1000);
      }
      
      if (isSunset) {
        sunsetDate = new Date(Date.now() + this.config.deprecation.sunsetPeriod * 24 * 60 * 60 * 1000);
      }
      
      this.versionInfo.set(version, new VersionInfo(version, isDeprecated, isSunset, deprecationDate, sunsetDate));
    }
  }
  
  // Extract version from request
  extractVersion(req) {
    const strategy = this.config.strategy;
    let version = null;
    
    switch (strategy) {
      case 'url-path':
        version = this.extractVersionFromPath(req.path);
        break;
      case 'header':
        version = this.extractVersionFromHeader(req);
        break;
      case 'query-param':
        version = this.extractVersionFromQuery(req);
        break;
    }
    
    // Apply version mapping
    if (this.config.compatibility.versionMapping[version]) {
      version = this.config.compatibility.versionMapping[version];
    }
    
    // Validate version
    if (!this.isValidVersion(version)) {
      if (this.config.compatibility.allowFallback) {
        version = this.config.defaultVersion;
      } else if (this.config.compatibility.strictMode) {
        throw new Error(`Unsupported API version: ${version}`);
      }
    }
    
    return version;
  }
  
  // Extract version from URL path
  extractVersionFromPath(path) {
    const match = path.match(/^\/api\/(v\d+|latest)/);
    return match ? match[1] : null;
  }
  
  // Extract version from header
  extractVersionFromHeader(req) {
    return req.headers[this.config.versionHeader.toLowerCase()] || null;
  }
  
  // Extract version from query parameter
  extractVersionFromQuery(req) {
    return req.query[this.config.versionQueryParam] || null;
  }
  
  // Validate version
  isValidVersion(version) {
    return this.config.supportedVersions.includes(version);
  }
  
  // Get version information
  getVersionInfo(version) {
    return this.versionInfo.get(version) || new VersionInfo('unknown');
  }
  
  // Check if feature is available in version
  hasFeature(version, feature) {
    const versionInfo = this.getVersionInfo(version);
    return versionInfo.hasFeature(feature);
  }
  
  // Get supported versions
  getSupportedVersions() {
    return this.config.supportedVersions;
  }
  
  // Get deprecated versions
  getDeprecatedVersions() {
    return this.config.deprecation.deprecatedVersions;
  }
  
  // Get sunset versions
  getSunsetVersions() {
    return this.config.deprecation.sunsetVersions;
  }
  
  // Add version response headers
  addVersionHeaders(res, version, versionInfo) {
    if (this.config.responseHeaders.includeVersion) {
      res.setHeader('API-Version', version);
    }
    
    if (this.config.responseHeaders.includeSupported) {
      res.setHeader('API-Supported-Versions', this.config.supportedVersions.join(', '));
    }
    
    if (this.config.responseHeaders.includeDeprecation) {
      if (versionInfo.isDeprecated) {
        res.setHeader('Deprecation', 'true');
        if (versionInfo.deprecationDate) {
          res.setHeader('Sunset', versionInfo.deprecationDate.toISOString());
        }
      }
      
      if (versionInfo.isSunset) {
        res.setHeader('Sunset', versionInfo.sunsetDate.toISOString());
      }
    }
  }
  
  // Create versioned response
  createVersionedResponse(res, data, version, metadata = {}) {
    const versionInfo = this.getVersionInfo(version);
    
    // Add version headers
    this.addVersionHeaders(res, version, versionInfo);
    
    // Create versioned response
    const response = {
      success: true,
      data,
      version,
      metadata: {
        ...metadata,
        version: versionInfo.getMetadata(),
        timestamp: new Date().toISOString()
      }
    };
    
    return response;
  }
  
  // Create error response with version info
  createVersionedError(res, error, version, statusCode = 500) {
    const versionInfo = this.getVersionInfo(version);
    
    // Add version headers
    this.addVersionHeaders(res, version, versionInfo);
    
    // Create versioned error response
    const response = {
      success: false,
      error: {
        message: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR',
        details: error.details || null
      },
      version,
      metadata: {
        version: versionInfo.getMetadata(),
        timestamp: new Date().toISOString()
      }
    };
    
    return res.status(statusCode).json(response);
  }
  
  // Log version usage
  logVersionUsage(req, version, endpoint) {
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user?.userId || null,
      {
        action: 'api_version_used',
        version,
        endpoint,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'low' }
    );
  }
  
  // Get version statistics
  getVersionStatistics() {
    return {
      supportedVersions: this.config.supportedVersions,
      deprecatedVersions: this.config.deprecation.deprecatedVersions,
      sunsetVersions: this.config.deprecation.sunsetVersions,
      defaultVersion: this.config.defaultVersion,
      strategy: this.config.strategy,
      features: this.config.features
    };
  }
}

// Create singleton instance
const versionManager = new APIVersionManager();

// Version Middleware Factory
const createVersionMiddleware = (options = {}) => {
  return (req, res, next) => {
    try {
      // Extract version from request
      const version = versionManager.extractVersion(req);
      
      if (!version) {
        if (options.requireVersion) {
          return versionManager.createVersionedError(res, {
            message: 'API version is required',
            code: 'VERSION_REQUIRED',
            details: {
              supportedVersions: versionManager.getSupportedVersions(),
              defaultVersion: versionManager.config.defaultVersion
            }
          }, versionManager.config.defaultVersion, 400);
        }
        
        // Use default version
        req.apiVersion = versionManager.config.defaultVersion;
      } else {
        req.apiVersion = version;
      }
      
      // Get version info
      req.versionInfo = versionManager.getVersionInfo(req.apiVersion);
      
      // Check if version is supported
      if (!req.versionInfo.supported) {
        return versionManager.createVersionedError(res, {
          message: `Unsupported API version: ${version}`,
          code: 'UNSUPPORTED_VERSION',
          details: {
            requestedVersion: version,
            supportedVersions: versionManager.getSupportedVersions(),
            defaultVersion: versionManager.config.defaultVersion
          }
        }, versionManager.config.defaultVersion, 400);
      }
      
      // Check if version is deprecated
      if (req.versionInfo.isDeprecated) {
        // Add deprecation warning
        res.setHeader('Warning', `299 - "API version ${version} is deprecated"`);
      }
      
      // Check if version is sunset
      if (req.versionInfo.isSunset) {
        return versionManager.createVersionedError(res, {
          message: `API version ${version} is no longer supported`,
          code: 'VERSION_SUNSET',
          details: {
            requestedVersion: version,
            supportedVersions: versionManager.getSupportedVersions(),
            defaultVersion: versionManager.config.defaultVersion,
            sunsetDate: req.versionInfo.sunsetDate
          }
        }, versionManager.config.defaultVersion, 410);
      }
      
      // Log version usage
      versionManager.logVersionUsage(req, req.apiVersion, req.path);
      
      // Add version headers to response
      versionManager.addVersionHeaders(res, req.apiVersion, req.versionInfo);
      
      next();
    } catch (error) {
      console.error('❌ Version middleware error:', error);
      
      return versionManager.createVersionedError(res, {
        message: 'Version processing failed',
        code: 'VERSION_ERROR',
        details: error.message
      }, versionManager.config.defaultVersion, 500);
    }
  };
};

// Feature Check Middleware Factory
const createFeatureMiddleware = (feature, options = {}) => {
  return (req, res, next) => {
    try {
      // Check if feature is available in current version
      if (!versionManager.hasFeature(req.apiVersion, feature)) {
        return versionManager.createVersionedError(res, {
          message: `Feature '${feature}' is not available in API version ${req.apiVersion}`,
          code: 'FEATURE_NOT_AVAILABLE',
          details: {
            feature,
            currentVersion: req.apiVersion,
            availableVersions: versionManager.getSupportedVersions().filter(v => 
              versionManager.hasFeature(v, feature)
            ),
            availableFeatures: req.versionInfo.getAvailableFeatures()
          }
        }, req.apiVersion, 400);
      }
      
      next();
    } catch (error) {
      console.error('❌ Feature middleware error:', error);
      
      return versionManager.createVersionedError(res, {
        message: 'Feature check failed',
        code: 'FEATURE_CHECK_ERROR',
        details: error.message
      }, req.apiVersion, 500);
    }
  };
};

// Versioned Response Helper
const createVersionedResponse = (res, data, metadata = {}) => {
  const version = res.locals.version || versionManager.config.defaultVersion;
  return versionManager.createVersionedResponse(res, data, version, metadata);
};

// Versioned Error Helper
const createVersionedError = (res, error, statusCode = 500) => {
  const version = res.locals.version || versionManager.config.defaultVersion;
  return versionManager.createVersionedError(res, error, version, statusCode);
};

export {
  versionManager,
  createVersionMiddleware,
  createFeatureMiddleware,
  createVersionedResponse,
  createVersionedError,
  API_VERSIONING_CONFIG
};
