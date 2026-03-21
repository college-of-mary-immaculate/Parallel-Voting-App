// const { 
//   versionManager, 
//   createVersionMiddleware, 
//   createFeatureMiddleware 
// } = require('../utils/apiVersioning');
// const { validateVersion, requireFeature, VersionedResponse } = require('../utils/versionedRoutes');
// const { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } = require('../utils/auditLogger');

import { versionManager, createVersionMiddleware, createFeatureMiddleware } from "../utils/apiVersioning.js";
import { validateVersion, requireFeature, VersionedResponse } from "../utils/versionedRoutes.js";
import { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } from "../utils/auditLogger.js";

// API Versioning Middleware
const apiVersioningMiddleware = createVersionMiddleware({
  requireVersion: false, // Allow fallback to default version
  strictMode: false
});

// Version Validation Middleware
const versionValidationMiddleware = validateVersion({
  rejectDeprecated: false, // Allow deprecated versions with warnings
  rejectSunset: true // Reject sunset versions
});

// Feature Availability Middleware Factory
const createFeatureAvailabilityMiddleware = (features, options = {}) => {
  return (req, res, next) => {
    const { apiVersion, versionInfo } = req;
    
    // Check if all required features are available
    const unavailableFeatures = features.filter(feature => 
      !versionManager.hasFeature(apiVersion, feature)
    );
    
    if (unavailableFeatures.length > 0) {
      return VersionedResponse.error(res, {
        message: `Some features are not available in API version ${apiVersion}`,
        code: 'FEATURES_NOT_AVAILABLE',
        details: {
          unavailableFeatures,
          currentVersion: apiVersion,
          availableVersions: versionManager.getSupportedVersions().filter(v => 
            unavailableFeatures.every(feature => versionManager.hasFeature(v, feature))
          ),
          availableFeatures: versionInfo.getAvailableFeatures()
        }
      }, 400);
    }
    
    next();
  };
};

// Version Compatibility Middleware
const versionCompatibilityMiddleware = (options = {}) => {
  return (req, res, next) => {
    const { apiVersion, versionInfo } = req;
    
    // Check client compatibility
    const clientVersion = req.headers['x-client-version'];
    if (clientVersion && options.checkClientCompatibility) {
      const isCompatible = checkClientVersionCompatibility(clientVersion, apiVersion);
      
      if (!isCompatible) {
        return VersionedResponse.error(res, {
          message: `Client version ${clientVersion} is not compatible with API version ${apiVersion}`,
          code: 'CLIENT_API_INCOMPATIBLE',
          details: {
            clientVersion,
            apiVersion,
            supportedVersions: versionManager.getSupportedVersions()
          }
        }, 400);
      }
    }
    
    // Add compatibility headers
    res.setHeader('X-API-Compatibility', 'true');
    res.setHeader('X-Minimum-Client-Version', getMinimumClientVersion(apiVersion));
    
    next();
  };
};

// Version Migration Middleware
const versionMigrationMiddleware = (options = {}) => {
  return (req, res, next) => {
    const { apiVersion } = req;
    
    // Check if migration is needed
    if (options.enableMigration && shouldMigrate(apiVersion, req.headers)) {
      const migrationInfo = getMigrationInfo(apiVersion, req.headers);
      
      if (options.autoMigrate) {
        // Perform automatic migration
        return performAutoMigration(req, res, migrationInfo, next);
      } else {
        // Return migration information
        return VersionedResponse.error(res, {
          message: `API version ${apiVersion} requires migration`,
          code: 'MIGRATION_REQUIRED',
          details: migrationInfo
        }, 426); // Upgrade Required
      }
    }
    
    next();
  };
};

// Version Rate Limiting Middleware
const versionRateLimitingMiddleware = (options = {}) => {
  const rateLimits = options.rateLimits || {
    'v1': { max: 1000, windowMs: 15 * 60 * 1000 }, // 1000 requests per 15 minutes
    'v2': { max: 2000, windowMs: 15 * 60 * 1000 }  // 2000 requests per 15 minutes
  };
  
  const attempts = new Map();
  
  return (req, res, next) => {
    const { apiVersion } = req;
    const clientKey = `${req.ip}:${apiVersion}`;
    const now = Date.now();
    
    const rateLimit = rateLimits[apiVersion] || rateLimits['v1'];
    const userAttempts = attempts.get(clientKey) || { count: 0, resetTime: now };
    
    // Reset window if expired
    if (now > userAttempts.resetTime) {
      userAttempts.count = 0;
      userAttempts.resetTime = now + rateLimit.windowMs;
    }
    
    // Check rate limit
    if (userAttempts.count >= rateLimit.max) {
      return VersionedResponse.error(res, {
        message: `Rate limit exceeded for API version ${apiVersion}`,
        code: 'RATE_LIMIT_EXCEEDED',
        details: {
          apiVersion,
          limit: rateLimit.max,
          windowMs: rateLimit.windowMs,
          resetTime: new Date(userAttempts.resetTime).toISOString()
        }
      }, 429);
    }
    
    // Increment attempt count
    userAttempts.count++;
    attempts.set(clientKey, userAttempts);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimit.max - userAttempts.count));
    res.setHeader('X-RateLimit-Reset', new Date(userAttempts.resetTime).toISOString());
    
    // Clean up old entries
    setTimeout(() => {
      if (attempts.has(clientKey) && Date.now() > userAttempts.resetTime) {
        attempts.delete(clientKey);
      }
    }, rateLimit.windowMs);
    
    next();
  };
};

// Version Analytics Middleware
const versionAnalyticsMiddleware = (options = {}) => {
  const analytics = {
    requests: new Map(),
    features: new Map(),
    errors: new Map()
  };
  
  return (req, res, next) => {
    const { apiVersion } = req;
    const startTime = Date.now();
    
    // Track request
    const requestKey = `${apiVersion}:${req.method}:${req.path}`;
    const requestCount = analytics.requests.get(requestKey) || 0;
    analytics.requests.set(requestKey, requestCount + 1);
    
    // Track feature usage
    if (req.path.includes('/elections')) {
      const featureCount = analytics.features.get(`${apiVersion}:elections`) || 0;
      analytics.features.set(`${apiVersion}:elections`, featureCount + 1);
    }
    
    if (req.path.includes('/votes')) {
      const featureCount = analytics.features.get(`${apiVersion}:voting`) || 0;
      analytics.features.set(`${apiVersion}:voting`, featureCount + 1);
    }
    
    // Wrap response to track completion
    const originalJson = res.json;
    res.json = (data) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Log request completion
      logSecurityEvent(
        AUDIT_EVENTS.SYSTEM_CONFIG,
        req.user?.userId || null,
        {
          action: 'api_request_completed',
          version: apiVersion,
          method: req.method,
          path: req.path,
          duration,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        },
        {
          ip: req.ip,
          headers: req.headers,
          session: req.session,
          id: req.id
        },
        { success: res.statusCode < 400, severity: 'low' }
      );
      
      return originalJson.call(res, data);
    };
    
    // Wrap error handling
    const originalSend = res.send;
    res.send = (data) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Track errors
      if (res.statusCode >= 400) {
        const errorKey = `${apiVersion}:${res.statusCode}`;
        const errorCount = analytics.errors.get(errorKey) || 0;
        analytics.errors.set(errorKey, errorCount + 1);
      }
      
      // Log request completion
      logSecurityEvent(
        AUDIT_EVENTS.SYSTEM_CONFIG,
        req.user?.userId || null,
        {
          action: 'api_request_completed',
          version: apiVersion,
          method: req.method,
          path: req.path,
          duration,
          statusCode: res.statusCode,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        },
        {
          ip: req.ip,
          headers: req.headers,
          session: req.session,
          id: req.id
        },
        { success: res.statusCode < 400, severity: 'low' }
      );
      
      return originalSend.call(res, data);
    };
    
    next();
  };
};

// Helper Functions

// Check client version compatibility
function checkClientVersionCompatibility(clientVersion, apiVersion) {
  const compatibilityMatrix = {
    'v1': {
      minClientVersion: '1.0.0',
      maxClientVersion: '1.9.9'
    },
    'v2': {
      minClientVersion: '2.0.0',
      maxClientVersion: '2.9.9'
    }
  };
  
  const compatibility = compatibilityMatrix[apiVersion];
  if (!compatibility) {
    return false;
  }
  
  return compareVersions(clientVersion, compatibility.minClientVersion) >= 0 &&
         compareVersions(clientVersion, compatibility.maxClientVersion) <= 0;
}

// Get minimum client version for API version
function getMinimumClientVersion(apiVersion) {
  const minimumVersions = {
    'v1': '1.0.0',
    'v2': '2.0.0'
  };
  
  return minimumVersions[apiVersion] || '1.0.0';
}

// Compare semantic versions
function compareVersions(version1, version2) {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

// Check if migration is needed
function shouldMigrate(apiVersion, headers) {
  const migrationRequired = headers['x-migration-required'];
  const forceMigration = headers['x-force-migration'];
  
  return migrationRequired === 'true' || forceMigration === 'true';
}

// Get migration information
function getMigrationInfo(apiVersion, headers) {
  const targetVersion = headers['x-target-version'] || versionManager.config.defaultVersion;
  
  return {
    currentVersion: apiVersion,
    targetVersion,
    migrationPath: `/api/${apiVersion}/migrate`,
    migrationSteps: getMigrationSteps(apiVersion, targetVersion),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
  };
}

// Get migration steps
function getMigrationSteps(fromVersion, toVersion) {
  const migrationSteps = {
    'v1->v2': [
      'Update authentication headers',
      'Migrate to new response format',
      'Update pagination parameters',
      'Enable advanced features'
    ]
  };
  
  const key = `${fromVersion}->${toVersion}`;
  return migrationSteps[key] || [];
}

// Perform automatic migration
function performAutoMigration(req, res, migrationInfo, next) {
  // Log migration attempt
  logSecurityEvent(
    AUDIT_EVENTS.SYSTEM_CONFIG,
    req.user?.userId || null,
    {
      action: 'auto_migration_attempted',
      migrationInfo
    },
    {
      ip: req.ip,
      headers: req.headers,
      session: req.session,
      id: req.id
    },
    { success: false, severity: 'medium' }
  );
  
  // Add migration headers
  res.setHeader('X-Migration-Performed', 'true');
  res.setHeader('X-Migration-From', migrationInfo.currentVersion);
  res.setHeader('X-Migration-To', migrationInfo.targetVersion);
  
  // Continue with migrated request
  req.migrated = true;
  req.migrationInfo = migrationInfo;
  
  next();
}

// Version Statistics Helper
const getVersionStatistics = () => {
  return {
    supportedVersions: versionManager.getSupportedVersions(),
    deprecatedVersions: versionManager.getDeprecatedVersions(),
    sunsetVersions: versionManager.getSunsetVersions(),
    defaultVersion: versionManager.config.defaultVersion,
    features: versionManager.config.features,
    strategy: versionManager.config.strategy
  };
};

// Version Health Check
const versionHealthCheck = async (req, res) => {
  try {
    const { apiVersion } = req;
    const versionInfo = versionManager.getVersionInfo(apiVersion);
    
    const health = {
      status: 'healthy',
      version: apiVersion,
      supported: versionInfo.supported,
      deprecated: versionInfo.isDeprecated,
      sunset: versionInfo.isSunset,
      features: versionInfo.getAvailableFeatures(),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
    
    if (versionInfo.isDeprecated) {
      health.status = 'degraded';
      health.warning = `API version ${apiVersion} is deprecated`;
    }
    
    if (versionInfo.isSunset) {
      health.status = 'unhealthy';
      health.error = `API version ${apiVersion} is no longer supported`;
    }
    
    const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;
    
    return VersionedResponse.success(res, health);
  } catch (error) {
    return VersionedResponse.error(res, error, 500);
  }
};

module.exports = {
  apiVersioningMiddleware,
  versionValidationMiddleware,
  createFeatureAvailabilityMiddleware,
  versionCompatibilityMiddleware,
  versionMigrationMiddleware,
  versionRateLimitingMiddleware,
  versionAnalyticsMiddleware,
  getVersionStatistics,
  versionHealthCheck,
  checkClientVersionCompatibility,
  getMinimumClientVersion
};
