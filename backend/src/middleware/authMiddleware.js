const { verifyToken, extractTokenFromHeader, generateToken } = require('../utils/jwtUtils');
const { isTokenBlacklisted } = require('../utils/tokenBlacklist');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request object
 */

// Authentication middleware
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'TOKEN_MISSING'
      });
    }

    // Check if token is blacklisted
    if (isTokenBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated (logout)',
        code: 'TOKEN_BLACKLISTED'
      });
    }

    // Verify the token
    const decoded = verifyToken(token);
    
    // Attach user info to request
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
      code: 'TOKEN_INVALID'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      // Check if token is blacklisted
      if (isTokenBlacklisted(token)) {
        // For optional auth, just continue without user info if token is blacklisted
        next();
        return;
      }

      const decoded = verifyToken(token);
      req.user = decoded;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // For optional auth, we just continue without user info
    next();
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Middleware to check if user is accessing their own resource
const authorizeSelf = (userIdParam = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam];
    
    // Allow access if user is admin or accessing their own data
    if (req.user.role === 'admin' || req.user.userId == targetUserId) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        code: 'ACCESS_DENIED',
        message: 'You can only access your own resources'
      });
    }
  };
};

// Middleware to check if user has verified email
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }

  next();
};

// Token refresh middleware
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
        code: 'REFRESH_TOKEN_MISSING'
      });
    }

    const { verifyRefreshToken, generateToken } = require('../utils/jwtUtils');
    const decoded = verifyRefreshToken(refreshToken);
    
    // Generate new access token
    const newToken = generateToken({
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      vin: decoded.vin
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
      code: 'REFRESH_TOKEN_INVALID'
    });
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  authorize,
  authorizeSelf,
  requireEmailVerification,
  refreshToken
};
