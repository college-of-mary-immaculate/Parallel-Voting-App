const express = require('express');
const { versionManager, API_VERSIONING_CONFIG } = require('../utils/apiVersioning');
const { VersionedResponse, VersionedRouter } = require('../utils/versionedRoutes');
const { 
  getVersionStatistics, 
  versionHealthCheck,
  versionAnalyticsMiddleware 
} = require('../utils/apiVersioningMiddleware');
const { authenticateToken, authorizeRole } = require('../middleware/jwtSecurityMiddleware');

const router = express.Router();

// Apply version analytics to all routes
router.use(versionAnalyticsMiddleware());

// GET /api/version - Get current API version information
router.get('/', (req, res) => {
  try {
    const versionInfo = {
      currentVersion: versionManager.config.defaultVersion,
      supportedVersions: versionManager.getSupportedVersions(),
      deprecatedVersions: versionManager.getDeprecatedVersions(),
      sunsetVersions: versionManager.getSunsetVersions(),
      strategy: versionManager.config.strategy,
      features: versionManager.config.features,
      configuration: {
        defaultVersion: versionManager.config.defaultVersion,
        allowFallback: versionManager.config.compatibility.allowFallback,
        strictMode: versionManager.config.compatibility.strictMode,
        responseHeaders: versionManager.config.responseHeaders
      }
    };
    
    return VersionedResponse.success(res, versionInfo);
  } catch (error) {
    return VersionedResponse.error(res, error, 500);
  }
});

// GET /api/version/statistics - Get version usage statistics (admin only)
router.get('/statistics', authenticateToken, authorizeRole(['admin']), (req, res) => {
  try {
    const statistics = getVersionStatistics();
    
    // Add usage analytics if available
    const usageAnalytics = getVersionUsageAnalytics();
    
    return VersionedResponse.success(res, {
      ...statistics,
      usage: usageAnalytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return VersionedResponse.error(res, error, 500);
  }
});

// GET /api/version/health - Check API version health
router.get('/health', versionHealthCheck);

// GET /api/version/features - Get available features by version
router.get('/features', (req, res) => {
  try {
    const { version } = req.query;
    const targetVersion = version || versionManager.config.defaultVersion;
    
    if (!versionManager.isValidVersion(targetVersion)) {
      return VersionedResponse.error(res, {
        message: `Invalid version: ${targetVersion}`,
        code: 'INVALID_VERSION',
        details: {
          requestedVersion: targetVersion,
          supportedVersions: versionManager.getSupportedVersions()
        }
      }, 400);
    }
    
    const versionInfo = versionManager.getVersionInfo(targetVersion);
    const features = {
      version: targetVersion,
      available: versionInfo.getAvailableFeatures(),
      all: versionInfo.features,
      metadata: versionInfo.getMetadata()
    };
    
    return VersionedResponse.success(res, features);
  } catch (error) {
    return VersionedResponse.error(res, error, 500);
  }
});

// POST /api/version/migrate - Migrate to new version
router.post('/migrate', authenticateToken, (req, res) => {
  try {
    const { targetVersion, force = false } = req.body;
    
    if (!targetVersion) {
      return VersionedResponse.error(res, {
        message: 'Target version is required',
        code: 'TARGET_VERSION_REQUIRED'
      }, 400);
    }
    
    if (!versionManager.isValidVersion(targetVersion)) {
      return VersionedResponse.error(res, {
        message: `Invalid target version: ${targetVersion}`,
        code: 'INVALID_TARGET_VERSION',
        details: {
          targetVersion,
          supportedVersions: versionManager.getSupportedVersions()
        }
      }, 400);
    }
    
    const currentVersion = req.apiVersion || versionManager.config.defaultVersion;
    
    if (currentVersion === targetVersion) {
      return VersionedResponse.error(res, {
        message: `Already using version ${targetVersion}`,
        code: 'ALREADY_USING_VERSION'
      }, 400);
    }
    
    // Get migration information
    const migrationInfo = getMigrationInformation(currentVersion, targetVersion);
    
    // Check if migration is allowed
    if (!force && !isMigrationAllowed(currentVersion, targetVersion)) {
      return VersionedResponse.error(res, {
        message: `Migration from ${currentVersion} to ${targetVersion} is not allowed`,
        code: 'MIGRATION_NOT_ALLOWED',
        details: {
          currentVersion,
          targetVersion,
          migrationInfo
        }
      }, 400);
    }
    
    return VersionedResponse.success(res, {
      migration: {
        from: currentVersion,
        to: targetVersion,
        steps: migrationInfo.steps,
        estimatedTime: migrationInfo.estimatedTime,
        requirements: migrationInfo.requirements,
        breakingChanges: migrationInfo.breakingChanges
      },
      instructions: {
        endpoint: `/api/${targetVersion}`,
        headers: {
          'API-Version': targetVersion,
          'X-Migration-From': currentVersion
        },
        authentication: 'Bearer token required'
      }
    });
  } catch (error) {
    return VersionedResponse.error(res, error, 500);
  }
});

// POST /api/version/deprecate - Deprecate a version (admin only)
router.post('/deprecate', authenticateToken, authorizeRole(['admin']), (req, res) => {
  try {
    const { version, deprecationDate, sunsetDate, message } = req.body;
    
    if (!version) {
      return VersionedResponse.error(res, {
        message: 'Version is required',
        code: 'VERSION_REQUIRED'
      }, 400);
    }
    
    if (!versionManager.isValidVersion(version)) {
      return VersionedResponse.error(res, {
        message: `Invalid version: ${version}`,
        code: 'INVALID_VERSION'
      }, 400);
    }
    
    // Add to deprecated versions
    if (!API_VERSIONING_CONFIG.deprecation.deprecatedVersions.includes(version)) {
      API_VERSIONING_CONFIG.deprecation.deprecatedVersions.push(version);
    }
    
    // Set sunset date if provided
    if (sunsetDate) {
      if (!API_VERSIONING_CONFIG.deprecation.sunsetVersions.includes(version)) {
        API_VERSIONING_CONFIG.deprecation.sunsetVersions.push(version);
      }
    }
    
    const deprecationInfo = {
      version,
      deprecated: true,
      deprecationDate: deprecationDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      sunsetDate: sunsetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      message: message || `API version ${version} is deprecated. Please migrate to a newer version.`,
      affectedEndpoints: getAffectedEndpoints(version)
    };
    
    return VersionedResponse.success(res, deprecationInfo);
  } catch (error) {
    return VersionedResponse.error(res, error, 500);
  }
});

// POST /api/version/rollback - Rollback to previous version (admin only)
router.post('/rollback', authenticateToken, authorizeRole(['admin']), (req, res) => {
  try {
    const { targetVersion, reason } = req.body;
    
    if (!targetVersion) {
      return VersionedResponse.error(res, {
        message: 'Target version is required',
        code: 'TARGET_VERSION_REQUIRED'
      }, 400);
    }
    
    if (!versionManager.isValidVersion(targetVersion)) {
      return VersionedResponse.error(res, {
        message: `Invalid target version: ${targetVersion}`,
        code: 'INVALID_TARGET_VERSION'
      }, 400);
    }
    
    const currentVersion = req.apiVersion || versionManager.config.defaultVersion;
    
    // Perform rollback
    const rollbackInfo = {
      from: currentVersion,
      to: targetVersion,
      reason: reason || 'Manual rollback',
      timestamp: new Date().toISOString(),
      affectedSystems: ['api', 'database', 'authentication', 'notifications']
    };
    
    // Log rollback
    console.warn('🔄 API Version Rollback:', rollbackInfo);
    
    return VersionedResponse.success(res, {
      rollback: rollbackInfo,
      instructions: {
        endpoint: `/api/${targetVersion}`,
        headers: {
          'API-Version': targetVersion,
          'X-Rollback-From': currentVersion
        }
      }
    });
  } catch (error) {
    return VersionedResponse.error(res, error, 500);
  }
});

// GET /api/version/compatibility - Check client compatibility
router.get('/compatibility', (req, res) => {
  try {
    const { clientVersion, apiVersion } = req.query;
    
    if (!clientVersion) {
      return VersionedResponse.error(res, {
        message: 'Client version is required',
        code: 'CLIENT_VERSION_REQUIRED'
      }, 400);
    }
    
    const targetApiVersion = apiVersion || versionManager.config.defaultVersion;
    
    if (!versionManager.isValidVersion(targetApiVersion)) {
      return VersionedResponse.error(res, {
        message: `Invalid API version: ${targetApiVersion}`,
        code: 'INVALID_API_VERSION'
      }, 400);
    }
    
    const compatibility = checkClientAPICompatibility(clientVersion, targetApiVersion);
    
    return VersionedResponse.success(res, {
      compatibility: {
        clientVersion,
        apiVersion: targetApiVersion,
        compatible: compatibility.compatible,
        minimumClientVersion: compatibility.minimumClientVersion,
        maximumClientVersion: compatibility.maximumClientVersion,
        recommendedClientVersion: compatibility.recommendedClientVersion,
        issues: compatibility.issues,
        warnings: compatibility.warnings
      }
    });
  } catch (error) {
    return VersionedResponse.error(res, error, 500);
  }
});

// GET /api/version/changelog - Get version changelog
router.get('/changelog', (req, res) => {
  try {
    const { version, from, to } = req.query;
    
    let changelog = getChangelog();
    
    if (version) {
      changelog = changelog.filter(entry => entry.version === version);
    } else if (from && to) {
      changelog = changelog.filter(entry => 
        compareVersions(entry.version, from) >= 0 && 
        compareVersions(entry.version, to) <= 0
      );
    }
    
    return VersionedResponse.success(res, {
      changelog,
      filters: { version, from, to },
      totalEntries: changelog.length
    });
  } catch (error) {
    return VersionedResponse.error(res, error, 500);
  }
});

// Helper Functions

// Get version usage analytics
function getVersionUsageAnalytics() {
  // This would typically come from a database or analytics service
  return {
    last24Hours: {
      'v1': 1250,
      'v2': 890
    },
    last7Days: {
      'v1': 8750,
      'v2': 6230
    },
    last30Days: {
      'v1': 35200,
      'v2': 24900
    },
    features: {
      'v1': {
        authentication: 15000,
        elections: 8500,
        voting: 12000,
        analytics: 3200
      },
      'v2': {
        authentication: 12000,
        elections: 6800,
        voting: 9600,
        analytics: 2500,
        multiFactorAuth: 1500,
        advancedAnalytics: 800
      }
    }
  };
}

// Get migration information
function getMigrationInformation(fromVersion, toVersion) {
  const migrations = {
    'v1->v2': {
      steps: [
        'Update authentication headers format',
        'Migrate to new response structure',
        'Update pagination parameters',
        'Enable advanced features',
        'Update client-side code'
      ],
      estimatedTime: '2-4 hours',
      requirements: [
        'Update client library',
        'Test authentication flow',
        'Update API endpoint URLs',
        'Test new features'
      ],
      breakingChanges: [
        'Response format changes',
        'Authentication header changes',
        'Pagination parameter changes'
      ]
    }
  };
  
  const key = `${fromVersion}->${toVersion}`;
  return migrations[key] || {
    steps: ['Manual migration required'],
    estimatedTime: 'Unknown',
    requirements: ['Contact support'],
    breakingChanges: []
  };
}

// Check if migration is allowed
function isMigrationAllowed(fromVersion, toVersion) {
  const allowedMigrations = [
    'v1->v2'
  ];
  
  return allowedMigrations.includes(`${fromVersion}->${toVersion}`);
}

// Get affected endpoints for version
function getAffectedEndpoints(version) {
  const endpoints = {
    'v1': [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/elections',
      '/api/v1/candidates',
      '/api/v1/votes',
      '/api/v1/analytics'
    ],
    'v2': [
      '/api/v2/auth/login',
      '/api/v2/auth/register',
      '/api/v2/elections',
      '/api/v2/candidates',
      '/api/v2/votes',
      '/api/v2/analytics',
      '/api/v2/multi-factor-auth',
      '/api/v2/advanced-analytics'
    ]
  };
  
  return endpoints[version] || [];
}

// Check client-API compatibility
function checkClientAPICompatibility(clientVersion, apiVersion) {
  const compatibilityMatrix = {
    'v1': {
      minimumClientVersion: '1.0.0',
      maximumClientVersion: '1.9.9',
      recommendedClientVersion: '1.5.0'
    },
    'v2': {
      minimumClientVersion: '2.0.0',
      maximumClientVersion: '2.9.9',
      recommendedClientVersion: '2.1.0'
    }
  };
  
  const compat = compatibilityMatrix[apiVersion];
  if (!compat) {
    return {
      compatible: false,
      issues: [`Unknown API version: ${apiVersion}`]
    };
  }
  
  const clientVersionNum = parseVersion(clientVersion);
  const minVersionNum = parseVersion(compat.minimumClientVersion);
  const maxVersionNum = parseVersion(compat.maximumClientVersion);
  
  const compatible = compareVersions(clientVersion, compat.minimumClientVersion) >= 0 &&
                   compareVersions(clientVersion, compat.maximumClientVersion) <= 0;
  
  const issues = [];
  const warnings = [];
  
  if (compareVersions(clientVersion, compat.minimumClientVersion) < 0) {
    issues.push(`Client version ${clientVersion} is below minimum required version ${compat.minimumClientVersion}`);
  }
  
  if (compareVersions(clientVersion, compat.maximumClientVersion) > 0) {
    warnings.push(`Client version ${clientVersion} is above maximum supported version ${compat.maximumClientVersion}`);
  }
  
  if (compareVersions(clientVersion, compat.recommendedClientVersion) < 0) {
    warnings.push(`Consider upgrading to recommended client version ${compat.recommendedClientVersion}`);
  }
  
  return {
    compatible,
    minimumClientVersion: compat.minimumClientVersion,
    maximumClientVersion: compat.maximumClientVersion,
    recommendedClientVersion: compat.recommendedClientVersion,
    issues,
    warnings
  };
}

// Parse version string to number
function parseVersion(version) {
  return version.split('.').map(part => parseInt(part) || 0);
}

// Compare versions
function compareVersions(v1, v2) {
  const v1Parts = parseVersion(v1);
  const v2Parts = parseVersion(v2);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

// Get changelog
function getChangelog() {
  return [
    {
      version: 'v2.0.0',
      date: '2024-03-01',
      type: 'major',
      description: 'Major release with advanced features',
      changes: [
        'Added multi-factor authentication',
        'Added advanced analytics',
        'Added bulk operations',
        'Added webhooks support',
        'Enhanced pagination and filtering',
        'Improved error handling',
        'Added comprehensive API documentation'
      ],
      breakingChanges: [
        'Response format changes',
        'Authentication header changes',
        'Pagination parameter changes'
      ],
      deprecated: []
    },
    {
      version: 'v1.5.0',
      date: '2024-02-01',
      type: 'minor',
      description: 'Feature enhancements and bug fixes',
      changes: [
        'Added email notifications',
        'Added vote verification',
        'Enhanced security features',
        'Improved performance',
        'Added audit logging'
      ],
      breakingChanges: [],
      deprecated: []
    },
    {
      version: 'v1.0.0',
      date: '2024-01-01',
      type: 'major',
      description: 'Initial release',
      changes: [
        'Basic authentication',
        'Election management',
        'Candidate management',
        'Voting system',
        'Real-time updates',
        'Basic analytics'
      ],
      breakingChanges: [],
      deprecated: []
    }
  ];
}

module.exports = router;
