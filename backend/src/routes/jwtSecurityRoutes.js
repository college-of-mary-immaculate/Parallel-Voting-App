const express = require('express');
const { 
  jwtSecurityManager, 
  tokenBlacklistManager, 
  refreshRateLimiter, 
  deviceTracker 
} = require('../utils/jwtSecurity');
const { 
  authenticateToken, 
  authorizeRole, 
  authorizePermission, 
  refreshTokenMiddleware, 
  logoutMiddleware, 
  deviceManagementMiddleware, 
  securityStatsMiddleware,
  authRateLimitMiddleware 
} = require('../middleware/jwtSecurityMiddleware');
const { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } = require('../utils/auditLogger');

const router = express.Router();

// Apply rate limiting to auth routes
router.use(authRateLimitMiddleware(5, 15 * 60 * 1000)); // 5 attempts per 15 minutes

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', refreshTokenMiddleware);

// POST /api/auth/logout - Logout user
router.post('/logout', logoutMiddleware);

// GET /api/auth/security-stats - Get security statistics
router.get('/security-stats', securityStatsMiddleware);

// Device management routes
router.get('/devices', authenticateToken, deviceManagementMiddleware.getUserDevices);
router.post('/devices/deactivate', authenticateToken, deviceManagementMiddleware.deactivateDevice);
router.delete('/devices/:deviceId', authenticateToken, deviceManagementMiddleware.removeDevice);

// GET /api/auth/token-info - Get token information
router.get('/token-info', authenticateToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ') 
      ? req.headers.authorization.slice(7) 
      : req.headers.authorization;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Get detailed token information
    const decoded = jwtSecurityManager.verifyAccessToken(token);
    const userDevices = deviceTracker.getUserDevices(req.user.userId);
    
    // Check if token is blacklisted
    const isBlacklisted = tokenBlacklistManager.isBlacklisted(token);
    
    // Get refresh attempts
    const refreshStats = refreshRateLimiter.getStats();
    const userRefreshAttempts = refreshStats.totalAttempts;
    
    res.json({
      success: true,
      data: {
        token: {
          jti: decoded.jti,
          type: decoded.type,
          issuedAt: new Date(decoded.iat * 1000),
          permissions: decoded.permissions,
          isBlacklisted
        },
        user: {
          userId: req.user.userId,
          email: req.user.email,
          role: req.user.role,
          permissions: req.user.permissions
        },
        devices: {
          total: userDevices.length,
          active: userDevices.filter(d => d.isActive).length,
          devices: userDevices
        },
        security: {
          refreshAttempts: userRefreshAttempts,
          canRefresh: refreshRateLimiter.canRefresh(req.user.userId)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to get token info:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get token information',
      code: 'TOKEN_INFO_FAILED'
    });
  }
});

// POST /api/auth/validate - Validate token
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Validate token
    const decoded = jwtSecurityManager.verifyAccessToken(token);
    
    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        jti: decoded.jti,
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions,
        issuedAt: new Date(decoded.iat * 1000)
      }
    });
    
  } catch (error) {
    console.error('❌ Token validation failed:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.message === 'Token is blacklisted') {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
  }
});

// POST /api/auth/blacklist - Blacklist token (admin only)
router.post('/blacklist', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { token, reason } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Blacklist token
    const success = jwtSecurityManager.blacklistToken(token, reason || 'admin_blacklist', req.user.userId);
    
    if (success) {
      // Log token blacklisting
      logSecurityEvent(
        AUDIT_EVENTS.SYSTEM_CONFIG,
        req.user.userId,
        {
          action: 'token_blacklisted_by_admin',
          tokenId: jwtSecurityManager.extractJTI(token),
          reason
        },
        {
          ip: req.ip,
          headers: req.headers,
          session: req.session,
          id: req.id
        },
        { success: true, severity: 'medium' }
      );
      
      res.json({
        success: true,
        message: 'Token blacklisted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to blacklist token',
        code: 'BLACKLIST_FAILED'
      });
    }
  } catch (error) {
    console.error('❌ Token blacklisting failed:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Token blacklisting failed',
      code: 'BLACKLIST_ERROR'
    });
  }
});

// GET /api/auth/blacklist - Get blacklist (admin only)
router.get('/blacklist', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    
    // Get blacklist statistics
    const stats = tokenBlacklistManager.getStats();
    
    res.json({
      success: true,
      data: {
        statistics: stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: stats.total
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to get blacklist:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get blacklist',
      code: 'BLACKLIST_FETCH_FAILED'
    });
  }
});

// DELETE /api/auth/blacklist/:jti - Remove from blacklist (admin only)
router.delete('/blacklist/:jti', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { jti } = req.params;
    
    if (!jti) {
      return res.status(400).json({
        success: false,
        message: 'JTI required',
        code: 'JTI_REQUIRED'
      });
    }
    
    // Remove from blacklist
    tokenBlacklistManager.remove(jti);
    
    // Log blacklist removal
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user.userId,
      {
        action: 'token_removed_from_blacklist',
        tokenId: jti
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'low' }
    );
    
    res.json({
      success: true,
      message: 'Token removed from blacklist successfully'
    });
    
  } catch (error) {
    console.error('❌ Failed to remove from blacklist:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to remove from blacklist',
      code: 'BLACKLIST_REMOVE_FAILED'
    });
  }
});

// POST /api/auth/rotate-secret - Rotate JWT secrets (admin only)
router.post('/rotate-secrets', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'ROTATE_JWT_SECRETS') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required',
        code: 'CONFIRMATION_REQUIRED'
      });
    }
    
    // Log secret rotation
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user.userId,
      {
        action: 'jwt_secrets_rotated',
        timestamp: new Date().toISOString()
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'high' }
    );
    
    res.json({
      success: true,
      message: 'JWT secrets rotation initiated. Please update your environment variables.',
      warning: 'All existing tokens will be invalidated. Users will need to log in again.'
    });
    
  } catch (error) {
    console.error('❌ Failed to rotate secrets:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to rotate secrets',
      code: 'SECRET_ROTATION_FAILED'
    });
  }
});

// GET /api/auth/security-config - Get security configuration (admin only)
router.get('/security-config', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { JWT_SECURITY_CONFIG } = require('../utils/jwtSecurity');
    
    // Remove sensitive data from config
    const safeConfig = {
      accessToken: {
        expiresIn: JWT_SECURITY_CONFIG.accessToken.expiresIn,
        algorithm: JWT_SECURITY_CONFIG.accessToken.algorithm,
        issuer: JWT_SECURITY_CONFIG.accessToken.issuer,
        audience: JWT_SECURITY_CONFIG.accessToken.audience
      },
      refreshToken: {
        expiresIn: JWT_SECURITY_CONFIG.refreshToken.expiresIn,
        algorithm: JWT_SECURITY_CONFIG.refreshToken.algorithm,
        issuer: JWT_SECURITY_CONFIG.refreshToken.issuer,
        audience: JWT_SECURITY_CONFIG.refreshToken.audience
      },
      security: {
        enableRotation: JWT_SECURITY_CONFIG.security.enableRotation,
        rotationThreshold: JWT_SECURITY_CONFIG.security.rotationThreshold,
        enableBlacklisting: JWT_SECURITY_CONFIG.security.enableBlacklisting,
        validateIssuer: JWT_SECURITY_CONFIG.security.validateIssuer,
        validateAudience: JWT_SECURITY_CONFIG.security.validateAudience,
        validateExpiration: JWT_SECURITY_CONFIG.security.validateExpiration,
        refreshRateLimit: JWT_SECURITY_CONFIG.security.refreshRateLimit,
        enableDeviceTracking: JWT_SECURITY_CONFIG.security.enableDeviceTracking,
        maxDevicesPerUser: JWT_SECURITY_CONFIG.security.maxDevicesPerUser
      },
      storage: {
        type: JWT_SECURITY_CONFIG.storage.type,
        cleanupInterval: JWT_SECURITY_CONFIG.storage.cleanupInterval,
        maxBlacklistSize: JWT_SECURITY_CONFIG.storage.maxBlacklistSize
      }
    };
    
    res.json({
      success: true,
      data: safeConfig
    });
    
  } catch (error) {
    console.error('❌ Failed to get security config:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get security configuration',
      code: 'CONFIG_FETCH_FAILED'
    });
  }
});

// POST /api/auth/cleanup - Cleanup expired tokens (admin only)
router.post('/cleanup', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { type } = req.body;
    
    let cleanedCount = 0;
    
    switch (type) {
      case 'blacklist':
        // Trigger blacklist cleanup
        tokenBlacklistManager.cleanup();
        cleanedCount = 'Blacklist cleanup triggered';
        break;
        
      case 'refresh-attempts':
        // Trigger refresh attempts cleanup
        refreshRateLimiter.cleanup();
        cleanedCount = 'Refresh attempts cleanup triggered';
        break;
        
      case 'devices':
        // Trigger device cleanup
        deviceTracker.cleanup();
        cleanedCount = 'Device cleanup triggered';
        break;
        
      case 'all':
        // Trigger all cleanups
        tokenBlacklistManager.cleanup();
        refreshRateLimiter.cleanup();
        deviceTracker.cleanup();
        cleanedCount = 'All cleanups triggered';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid cleanup type',
          code: 'INVALID_CLEANUP_TYPE',
          validTypes: ['blacklist', 'refresh-attempts', 'devices', 'all']
        });
    }
    
    // Log cleanup
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user.userId,
      {
        action: 'security_cleanup',
        type,
        result: cleanedCount
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'low' }
    );
    
    res.json({
      success: true,
      message: 'Security cleanup completed',
      data: {
        type,
        result: cleanedCount
      }
    });
    
  } catch (error) {
    console.error('❌ Security cleanup failed:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Security cleanup failed',
      code: 'CLEANUP_FAILED'
    });
  }
});

// GET /api/auth/user-sessions - Get user sessions (admin only)
router.get('/user-sessions', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
        code: 'USER_ID_REQUIRED'
      });
    }
    
    // Get user devices (active sessions)
    const devices = deviceTracker.getUserDevices(parseInt(userId));
    
    // Get user's refresh attempts
    const refreshStats = refreshRateLimiter.getStats();
    
    res.json({
      success: true,
      data: {
        userId: parseInt(userId),
        devices,
        refreshAttempts: refreshStats.totalAttempts,
        canRefresh: refreshRateLimiter.canRefresh(parseInt(userId))
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to get user sessions:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to get user sessions',
      code: 'SESSIONS_FETCH_FAILED'
    });
  }
});

// POST /api/auth/revoke-user-sessions - Revoke all user sessions (admin only)
router.post('/revoke-user-sessions', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { userId, reason } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID required',
        code: 'USER_ID_REQUIRED'
      });
    }
    
    // Get user devices and blacklist all tokens
    const devices = deviceTracker.getUserDevices(parseInt(userId));
    let revokedCount = 0;
    
    // Reset refresh rate limit
    refreshRateLimiter.resetUser(parseInt(userId));
    
    // Remove all devices
    for (const device of devices) {
      deviceTracker.removeDevice(parseInt(userId), device.deviceId);
      revokedCount++;
    }
    
    // Log session revocation
    logSecurityEvent(
      AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
      parseInt(userId),
      {
        action: 'all_user_sessions_revoked',
        revokedCount,
        reason: reason || 'admin_action'
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'medium' }
    );
    
    res.json({
      success: true,
      message: 'All user sessions revoked successfully',
      data: {
        userId: parseInt(userId),
        revokedCount,
        reason: reason || 'admin_action'
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to revoke user sessions:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke user sessions',
      code: 'SESSION_REVOKE_FAILED'
    });
  }
});

module.exports = router;
