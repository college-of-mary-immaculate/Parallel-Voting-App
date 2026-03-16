const { jwtSecurityManager, tokenBlacklistManager, refreshRateLimiter, deviceTracker } = require('../utils/jwtSecurity');
const { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } = require('../utils/auditLogger');

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    // Extract token from Bearer header
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }
    
    // Verify token
    const decoded = jwtSecurityManager.verifyAccessToken(token);
    
    // Add user info to request
    req.user = {
      userId: parseInt(decoded.sub),
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
      jti: decoded.jti,
      iat: decoded.iat
    };
    
    // Log successful authentication
    logSecurityEvent(
      AUDIT_EVENTS.USER_LOGIN,
      decoded.sub,
      {
        action: 'token_verified',
        tokenId: decoded.jti,
        role: decoded.role
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'low' }
    );
    
    next();
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.message === 'Token is blacklisted') {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked',
        code: 'TOKEN_REVOKED'
      });
    }
    
    // Log authentication failure
    logSecurityEvent(
      AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
      null,
      {
        action: 'token_verification_failed',
        error: error.message,
        token: req.headers.authorization?.substring(0, 50) + '...'
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: false, severity: 'medium' }
    );
    
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Role-based Authorization Middleware
const authorizeRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }
    
    // Log authorization check
    logSecurityEvent(
      AUDIT_EVENTS.AUTHORIZATION_CHECK,
      req.user.userId,
      {
        action: 'role_authorization',
        userRole,
        allowedRoles,
        result: 'success'
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'low' }
    );
    
    next();
  };
};

// Permission-based Authorization Middleware
const authorizePermission = (requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const userPermissions = req.user.permissions || [];
    
    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredPermissions,
        current: userPermissions
      });
    }
    
    // Log permission check
    logSecurityEvent(
      AUDIT_EVENTS.AUTHORIZATION_CHECK,
      req.user.userId,
      {
        action: 'permission_authorization',
        userPermissions,
        requiredPermissions,
        result: 'success'
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'low' }
    );
    
    next();
  };
};

// Resource Ownership Middleware
const authorizeOwnership = (resourceType, resourceIdParam = 'id') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const resourceId = req.params[resourceIdParam];
    const userId = req.user.userId;
    
    try {
      let hasOwnership = false;
      
      switch (resourceType) {
        case 'user':
          hasOwnership = userId === parseInt(resourceId);
          break;
          
        case 'election':
          // Check if user is admin or election officer
          if (['admin', 'election_officer'].includes(req.user.role)) {
            hasOwnership = true;
          } else {
            // Check if user created the election
            const { executeQuery } = require('../utils/databaseOptimizer');
            const [elections] = await executeQuery(
              'SELECT created_by FROM elections WHERE election_id = ?',
              [resourceId]
            );
            
            if (elections.length > 0) {
              hasOwnership = elections[0].created_by === userId;
            }
          }
          break;
          
        case 'vote':
          // Check if user owns the vote
          const { executeQuery } = require('../utils/databaseOptimizer');
          const [votes] = await executeQuery(
            'SELECT user_id FROM votes WHERE vote_id = ?',
            [resourceId]
          );
          
          if (votes.length > 0) {
            hasOwnership = votes[0].user_id === userId;
          }
          break;
          
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid resource type',
            code: 'INVALID_RESOURCE_TYPE'
          });
      }
      
      if (!hasOwnership) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: insufficient ownership',
          code: 'INSUFFICIENT_OWNERSHIP',
          resourceType,
          resourceId
        });
      }
      
      // Log ownership check
      logSecurityEvent(
        AUDIT_EVENTS.AUTHORIZATION_CHECK,
        userId,
        {
          action: 'ownership_authorization',
          resourceType,
          resourceId,
          result: 'success'
        },
        {
          ip: req.ip,
          headers: req.headers,
          session: req.session,
          id: req.id
        },
        { success: true, severity: 'low' }
      );
      
      next();
    } catch (error) {
      console.error('❌ Ownership check failed:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        code: 'AUTHORIZATION_ERROR'
      });
    }
  };
};

// Token Refresh Middleware
const refreshTokenMiddleware = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }
    
    // Get device info
    const deviceInfo = {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    };
    
    // Refresh token
    const tokens = await jwtSecurityManager.refreshAccessToken(refreshToken, deviceInfo);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens
    });
    
  } catch (error) {
    console.error('❌ Token refresh failed:', error.message);
    
    // Handle specific errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired',
        code: 'REFRESH_TOKEN_EXPIRED'
      });
    }
    
    if (error.message === 'Token is blacklisted') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked',
        code: 'REFRESH_TOKEN_REVOKED'
      });
    }
    
    if (error.message === 'Refresh rate limit exceeded') {
      return res.status(429).json({
        success: false,
        message: 'Too many refresh attempts. Please try again later.',
        code: 'REFRESH_RATE_LIMIT_EXCEEDED'
      });
    }
    
    if (error.message === 'User not found or inactive') {
      return res.status(401).json({
        success: false,
        message: 'User account not found or inactive',
        code: 'USER_INACTIVE'
      });
    }
    
    // Log failed refresh attempt
    logSecurityEvent(
      AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
      null,
      {
        action: 'token_refresh_failed',
        error: error.message,
        refreshToken: refreshToken.substring(0, 50) + '...'
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: false, severity: 'medium' }
    );
    
    return res.status(401).json({
      success: false,
      message: 'Token refresh failed',
      code: 'REFRESH_FAILED'
    });
  }
};

// Logout Middleware
const logoutMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    let userId = null;
    
    if (authHeader) {
      token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;
      
      // Extract user ID from token for logging
      try {
        const decoded = jwtSecurityManager.verifyAccessToken(token);
        userId = decoded.sub;
      } catch (error) {
        // Token might be invalid, but we still proceed with logout
      }
    }
    
    // Blacklist token if provided
    if (token) {
      jwtSecurityManager.blacklistToken(token, 'logout', userId);
    }
    
    // Clear refresh rate limit for user
    if (userId) {
      refreshRateLimiter.resetUser(userId);
    }
    
    // Log successful logout
    logSecurityEvent(
      AUDIT_EVENTS.USER_LOGOUT,
      userId,
      {
        action: 'user_logout',
        tokenBlacklisted: !!token
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
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('❌ Logout failed:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Logout failed',
      code: 'LOGOUT_FAILED'
    });
  }
};

// Device Management Middleware
const deviceManagementMiddleware = {
  // Get user devices
  getUserDevices: async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    try {
      const devices = deviceTracker.getUserDevices(req.user.userId);
      
      res.json({
        success: true,
        data: devices
      });
    } catch (error) {
      console.error('❌ Failed to get user devices:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to get devices',
        code: 'DEVICE_FETCH_FAILED'
      });
    }
  },
  
  // Deactivate device
  deactivateDevice: async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID required',
        code: 'DEVICE_ID_REQUIRED'
      });
    }
    
    try {
      const success = deviceTracker.deactivateDevice(req.user.userId, deviceId);
      
      if (success) {
        // Log device deactivation
        logSecurityEvent(
          AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
          req.user.userId,
          {
            action: 'device_deactivated',
            deviceId
          },
          {
            ip: req.ip,
            headers: req.headers,
            session: req.session,
            id: req.id
          },
          { success: true, severity: 'low' }
        );
        
        return res.json({
          success: true,
          message: 'Device deactivated successfully'
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Device not found',
          code: 'DEVICE_NOT_FOUND'
        });
      }
    } catch (error) {
      console.error('❌ Failed to deactivate device:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to deactivate device',
        code: 'DEVICE_DEACTIVATION_FAILED'
      });
    }
  },
  
  // Remove device
  removeDevice: async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID required',
        code: 'DEVICE_ID_REQUIRED'
      });
    }
    
    try {
      const success = deviceTracker.removeDevice(req.user.userId, deviceId);
      
      if (success) {
        // Log device removal
        logSecurityEvent(
          AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
          req.user.userId,
          {
            action: 'device_removed',
            deviceId
          },
          {
            ip: req.ip,
            headers: req.headers,
            session: req.session,
            id: req.id
          },
          { success: true, severity: 'low' }
        );
        
        return res.json({
          success: true,
          message: 'Device removed successfully'
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Device not found',
          code: 'DEVICE_NOT_FOUND'
        });
      }
    } catch (error) {
      console.error('❌ Failed to remove device:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to remove device',
        code: 'DEVICE_REMOVAL_FAILED'
      });
    }
  }
};

// Security Statistics Middleware
const securityStatsMiddleware = async (req, res, next) => {
  if (req.path === '/api/security-stats') {
    try {
      const stats = jwtSecurityManager.getSecurityStats();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to get security stats:', error);
      
      return res.status(500).json({
        success: false,
        message: 'Failed to get security statistics',
        code: 'SECURITY_STATS_FAILED'
      });
    }
  } else {
    next();
  }
};

// Token Validation Helper
const validateTokenFormat = (token) => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }
  
  try {
    // Try to decode header and payload
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    return header && payload && header.alg && payload.typ;
  } catch (error) {
    return false;
  }
};

// Rate Limiting Helper for Auth Endpoints
const authRateLimitMiddleware = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const userAttempts = attempts.get(key) || { count: 0, resetTime: now };
    
    // Reset window if expired
    if (now > userAttempts.resetTime) {
      userAttempts.count = 0;
      userAttempts.resetTime = now + windowMs;
    }
    
    // Check rate limit
    if (userAttempts.count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
      });
    }
    
    // Increment attempt count
    userAttempts.count++;
    attempts.set(key, userAttempts);
    
    // Clean up old entries periodically
    setTimeout(() => {
      if (attempts.has(key) && Date.now() > userAttempts.resetTime) {
        attempts.delete(key);
      }
    }, windowMs);
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole,
  authorizePermission,
  authorizeOwnership,
  refreshTokenMiddleware,
  logoutMiddleware,
  deviceManagementMiddleware,
  securityStatsMiddleware,
  validateTokenFormat,
  authRateLimitMiddleware
};
