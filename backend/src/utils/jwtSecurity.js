// const jwt = require('jsonwebtoken');
// const { createHash, randomBytes } = require('crypto');
// const { executeQuery } = require('./databaseOptimizer');
// const { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } = require('./auditLogger');

import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "crypto";
import { executeQuery } from "./databaseOptimizer.js";
import { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } from "./auditLogger.js";

// JWT Security Configuration
const JWT_SECURITY_CONFIG = {
  // Token settings
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key',
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', // 15 minutes
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || 'parallel-voting-app',
    audience: process.env.JWT_AUDIENCE || 'parallel-voting-users'
  },
  
  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7 days
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || 'parallel-voting-app',
    audience: process.env.JWT_AUDIENCE || 'parallel-voting-users'
  },
  
  // Security settings
  security: {
    // Token rotation
    enableRotation: true,
    rotationThreshold: 5, // Rotate after 5 refreshes
    
    // Token blacklisting
    enableBlacklisting: true,
    blacklistCleanupInterval: 60 * 60 * 1000, // 1 hour
    
    // Token validation
    validateIssuer: true,
    validateAudience: true,
    validateExpiration: true,
    
    // Rate limiting
    refreshRateLimit: {
      enabled: true,
      maxAttempts: 5, // 5 refresh attempts per hour
      windowMs: 60 * 60 * 1000 // 1 hour
    },
    
    // Device tracking
    enableDeviceTracking: true,
    maxDevicesPerUser: 5 // Maximum devices per user
  },
  
  // Storage settings
  storage: {
    // In-memory token blacklist
    type: 'memory', // 'memory' or 'redis'
    cleanupInterval: 60 * 60 * 1000, // 1 hour
    maxBlacklistSize: 10000
  }
};

// In-memory token blacklist
const tokenBlacklist = new Map();
const refreshAttempts = new Map();
const userDevices = new Map();

// Token blacklist management
class TokenBlacklist {
  constructor() {
    this.blacklist = tokenBlacklist;
    this.startCleanup();
  }
  
  // Add token to blacklist
  add(token, reason = 'logout', userId = null) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded) {
        return false;
      }
      
      const blacklistEntry = {
        jti: decoded.jti,
        token: token,
        userId: userId || decoded.sub,
        reason,
        blacklistedAt: new Date(),
        expiresAt: new Date(decoded.exp * 1000)
      };
      
      this.blacklist.set(decoded.jti, blacklistEntry);
      
      // Log token blacklisting
      logSecurityEvent(
        AUDIT_EVENTS.USER_LOGOUT,
        userId || decoded.sub,
        {
          action: 'token_blacklisted',
          tokenId: decoded.jti,
          reason,
          expiresAt: blacklistEntry.expiresAt
        },
        {
          ip: '127.0.0.1',
          headers: { 'user-agent': 'JWT Security' },
          session: { id: 'jwt-blacklist' },
          id: decoded.jti
        },
        { success: true, severity: 'medium' }
      );
      
      return true;
    } catch (error) {
      console.error('❌ Failed to blacklist token:', error);
      return false;
    }
  }
  
  // Check if token is blacklisted
  isBlacklisted(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.jti) {
        return false;
      }
      
      const blacklistEntry = this.blacklist.get(decoded.jti);
      if (!blacklistEntry) {
        return false;
      }
      
      // Check if blacklist entry has expired
      if (new Date() > blacklistEntry.expiresAt) {
        this.blacklist.delete(decoded.jti);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Failed to check token blacklist:', error);
      return false;
    }
  }
  
  // Remove token from blacklist
  remove(jti) {
    this.blacklist.delete(jti);
  }
  
  // Clear expired entries
  cleanup() {
    const now = new Date();
    const expiredKeys = [];
    
    for (const [jti, entry] of this.blacklist.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(jti);
      }
    }
    
    expiredKeys.forEach(key => this.blacklist.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired blacklist entries`);
    }
  }
  
  // Start cleanup interval
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, JWT_SECURITY_CONFIG.storage.cleanupInterval);
  }
  
  // Get blacklist statistics
  getStats() {
    const now = new Date();
    let activeCount = 0;
    let expiredCount = 0;
    
    for (const entry of this.blacklist.values()) {
      if (now > entry.expiresAt) {
        expiredCount++;
      } else {
        activeCount++;
      }
    }
    
    return {
      total: this.blacklist.size,
      active: activeCount,
      expired: expiredCount
    };
  }
}

// Refresh token rate limiting
class RefreshRateLimiter {
  constructor() {
    this.attempts = refreshAttempts;
    this.startCleanup();
  }
  
  // Check if user can refresh token
  canRefresh(userId) {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || { count: 0, resetTime: now };
    
    // Reset window if expired
    if (now > userAttempts.resetTime) {
      this.attempts.set(userId, { count: 0, resetTime: now + JWT_SECURITY_CONFIG.security.refreshRateLimit.windowMs });
      return true;
    }
    
    // Check if limit exceeded
    if (userAttempts.count >= JWT_SECURITY_CONFIG.security.refreshRateLimit.maxAttempts) {
      return false;
    }
    
    return true;
  }
  
  // Record refresh attempt
  recordAttempt(userId) {
    const now = Date.now();
    const userAttempts = this.attempts.get(userId) || { count: 0, resetTime: now };
    
    userAttempts.count++;
    this.attempts.set(userId, userAttempts);
  }
  
  // Reset user attempts
  resetUser(userId) {
    this.attempts.delete(userId);
  }
  
  // Cleanup expired attempts
  cleanup() {
    const now = Date.now();
    const expiredUsers = [];
    
    for (const [userId, attempts] of this.attempts.entries()) {
      if (now > attempts.resetTime) {
        expiredUsers.push(userId);
      }
    }
    
    expiredUsers.forEach(userId => this.attempts.delete(userId));
  }
  
  // Start cleanup interval
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, JWT_SECURITY_CONFIG.security.refreshRateLimit.windowMs);
  }
  
  // Get statistics
  getStats() {
    const stats = {
      totalUsers: this.attempts.size,
      blockedUsers: 0,
      totalAttempts: 0
    };
    
    const now = Date.now();
    for (const [userId, attempts] of this.attempts.entries()) {
      stats.totalAttempts += attempts.count;
      
      if (attempts.count >= JWT_SECURITY_CONFIG.security.refreshRateLimit.maxAttempts && now <= attempts.resetTime) {
        stats.blockedUsers++;
      }
    }
    
    return stats;
  }
}

// Device tracking
class DeviceTracker {
  constructor() {
    this.devices = userDevices;
    this.startCleanup();
  }
  
  // Register device
  registerDevice(userId, deviceInfo) {
    const deviceId = this.generateDeviceId(deviceInfo);
    const now = new Date();
    
    if (!this.devices.has(userId)) {
      this.devices.set(userId, new Map());
    }
    
    const userDevices = this.devices.get(userId);
    
    // Add or update device
    userDevices.set(deviceId, {
      deviceId,
      userAgent: deviceInfo.userAgent,
      ip: deviceInfo.ip,
      lastUsed: now,
      firstSeen: now,
      isActive: true
    });
    
    // Deactivate old devices if limit exceeded
    if (userDevices.size > JWT_SECURITY_CONFIG.security.maxDevicesPerUser) {
      const sortedDevices = Array.from(userDevices.entries())
        .sort(([,a], [,b]) => b.lastUsed - a.lastUsed);
      
      // Deactivate oldest devices beyond limit
      for (let i = JWT_SECURITY_CONFIG.security.maxDevicesPerUser; i < sortedDevices.length; i++) {
        const [oldDeviceId] = sortedDevices[i];
        const oldDevice = userDevices.get(oldDeviceId);
        oldDevice.isActive = false;
      }
    }
    
    return deviceId;
  }
  
  // Get user devices
  getUserDevices(userId) {
    const userDevices = this.devices.get(userId);
    if (!userDevices) {
      return [];
    }
    
    return Array.from(userDevices.values()).map(device => ({
      deviceId: device.deviceId,
      userAgent: device.userAgent,
      ip: device.ip,
      lastUsed: device.lastUsed,
      firstSeen: device.firstSeen,
      isActive: device.isActive
    }));
  }
  
  // Deactivate device
  deactivateDevice(userId, deviceId) {
    const userDevices = this.devices.get(userId);
    if (userDevices && userDevices.has(deviceId)) {
      const device = userDevices.get(deviceId);
      device.isActive = false;
      return true;
    }
    return false;
  }
  
  // Remove device
  removeDevice(userId, deviceId) {
    const userDevices = this.devices.get(userId);
    if (userDevices) {
      return userDevices.delete(deviceId);
    }
    return false;
  }
  
  // Generate device ID
  generateDeviceId(deviceInfo) {
    const data = `${deviceInfo.userAgent}:${deviceInfo.ip}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }
  
  // Cleanup inactive devices
  cleanup() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    for (const [userId, userDevices] of this.devices.entries()) {
      const devicesToRemove = [];
      
      for (const [deviceId, device] of userDevices.entries()) {
        if (device.lastUsed < thirtyDaysAgo) {
          devicesToRemove.push(deviceId);
        }
      }
      
      devicesToRemove.forEach(deviceId => userDevices.delete(deviceId));
    }
  }
  
  // Start cleanup interval
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }
  
  // Get statistics
  getStats() {
    let totalDevices = 0;
    let activeDevices = 0;
    
    for (const userDevices of this.devices.values()) {
      for (const device of userDevices.values()) {
        totalDevices++;
        if (device.isActive) {
          activeDevices++;
        }
      }
    }
    
    return {
      totalUsers: this.devices.size,
      totalDevices,
      activeDevices,
      inactiveDevices: totalDevices - activeDevices
    };
  }
}

// Initialize security components
const tokenBlacklistManager = new TokenBlacklist();
const refreshRateLimiter = new RefreshRateLimiter();
const deviceTracker = new DeviceTracker();

// JWT Token Generation and Validation
class JWTSecurityManager {
  constructor() {
    this.accessTokenConfig = JWT_SECURITY_CONFIG.accessToken;
    this.refreshTokenConfig = JWT_SECURITY_CONFIG.refreshToken;
  }
  
  // Generate access token
  generateAccessToken(payload, options = {}) {
    const now = Math.floor(Date.now() / 1000);
    const jti = this.generateJTI();
    
    const tokenPayload = {
      ...payload,
      iat: now,
      jti,
      type: 'access'
    };
    
    const tokenOptions = {
      expiresIn: options.expiresIn || this.accessTokenConfig.expiresIn,
      algorithm: this.accessTokenConfig.algorithm,
      issuer: this.accessTokenConfig.issuer,
      audience: this.accessTokenConfig.audience
    };
    
    return jwt.sign(tokenPayload, this.accessTokenConfig.secret, tokenOptions);
  }
  
  // Generate refresh token
  generateRefreshToken(payload, options = {}) {
    const now = Math.floor(Date.now() / 1000);
    const jti = this.generateJTI();
    
    const tokenPayload = {
      ...payload,
      iat: now,
      jti,
      type: 'refresh',
      rotationCount: 0
    };
    
    const tokenOptions = {
      expiresIn: options.expiresIn || this.refreshTokenConfig.expiresIn,
      algorithm: this.refreshTokenConfig.algorithm,
      issuer: this.refreshTokenConfig.issuer,
      audience: this.refreshTokenConfig.audience
    };
    
    return jwt.sign(tokenPayload, this.refreshTokenConfig.secret, tokenOptions);
  }
  
  // Generate token pair
  generateTokenPair(user, deviceInfo = null) {
    const payload = {
      sub: user.user_id.toString(),
      email: user.email,
      role: user.role,
      permissions: this.getUserPermissions(user.role)
    };
    
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    
    // Track device if enabled
    let deviceId = null;
    if (JWT_SECURITY_CONFIG.security.enableDeviceTracking && deviceInfo) {
      deviceId = deviceTracker.registerDevice(user.user_id, deviceInfo);
    }
    
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpiresIn(this.accessTokenConfig.expiresIn),
      deviceId,
      permissions: payload.permissions
    };
  }
  
  // Refresh access token
  async refreshAccessToken(refreshToken, deviceInfo = null) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.refreshTokenConfig.secret, {
        algorithms: [this.refreshTokenConfig.algorithm],
        issuer: this.refreshTokenConfig.issuer,
        audience: this.refreshTokenConfig.audience
      });
      
      // Check if token is blacklisted
      if (tokenBlacklistManager.isBlacklisted(refreshToken)) {
        throw new Error('Token is blacklisted');
      }
      
      // Check if token is refresh token
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      
      // Check refresh rate limit
      if (!refreshRateLimiter.canRefresh(decoded.sub)) {
        throw new Error('Refresh rate limit exceeded');
      }
      
      // Get user from database
      const [users] = await executeQuery(
        'SELECT user_id, email, role, is_active FROM users WHERE user_id = ? AND is_active = 1',
        [decoded.sub]
      );
      
      if (users.length === 0) {
        throw new Error('User not found or inactive');
      }
      
      const user = users[0];
      
      // Check token rotation
      if (JWT_SECURITY_CONFIG.security.enableRotation && 
          decoded.rotationCount >= JWT_SECURITY_CONFIG.security.rotationThreshold) {
        
        // Blacklist old refresh token
        tokenBlacklistManager.add(refreshToken, 'token_rotation', user.user_id);
        
        // Generate new token pair
        const newTokens = this.generateTokenPair(user, deviceInfo);
        
        // Log token rotation
        logSecurityEvent(
          AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
          user.user_id,
          {
            action: 'token_rotated',
            oldTokenId: decoded.jti,
            newTokenId: this.extractJTI(newTokens.accessToken),
            rotationCount: decoded.rotationCount,
            reason: 'rotation_threshold_reached'
          },
          {
            ip: deviceInfo?.ip || '127.0.0.1',
            headers: { 'user-agent': deviceInfo?.userAgent || 'JWT Security' },
            session: { id: 'token-rotation' },
            id: decoded.jti
          },
          { success: true, severity: 'medium' }
        );
        
        return newTokens;
      }
      
      // Record refresh attempt
      refreshRateLimiter.recordAttempt(decoded.sub);
      
      // Generate new access token
      const newAccessToken = this.generateAccessToken({
        sub: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions
      });
      
      // Log token refresh
      logSecurityEvent(
        AUDIT_EVENTS.USER_LOGIN,
        decoded.sub,
        {
          action: 'token_refreshed',
          tokenId: decoded.jti,
          newTokenId: this.extractJTI(newAccessToken)
        },
        {
          ip: deviceInfo?.ip || '127.0.0.1',
          headers: { 'user-agent': deviceInfo?.userAgent || 'JWT Security' },
          session: { id: 'token-refresh' },
          id: decoded.jti
        },
        { success: true, severity: 'low' }
      );
      
      return {
        accessToken: newAccessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: this.parseExpiresIn(this.accessTokenConfig.expiresIn)
      };
      
    } catch (error) {
      // Record failed refresh attempt
      if (error.name !== 'TokenExpiredError') {
        const decoded = jwt.decode(refreshToken);
        if (decoded) {
          refreshRateLimiter.recordAttempt(decoded.sub);
        }
      }
      
      throw error;
    }
  }
  
  // Verify access token
  verifyAccessToken(token) {
    try {
      // Check if token is blacklisted
      if (tokenBlacklistManager.isBlacklisted(token)) {
        throw new Error('Token is blacklisted');
      }
      
      const decoded = jwt.verify(token, this.accessTokenConfig.secret, {
        algorithms: [this.accessTokenConfig.algorithm],
        issuer: this.accessTokenConfig.issuer,
        audience: this.accessTokenConfig.audience
      });
      
      // Check if token is access token
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      
      return decoded;
    } catch (error) {
      throw error;
    }
  }
  
  // Blacklist token
  blacklistToken(token, reason = 'logout', userId = null) {
    return tokenBlacklistManager.add(token, reason, userId);
  }
  
  // Get user permissions
  getUserPermissions(role) {
    const permissions = {
      admin: [
        'users:read', 'users:write', 'users:delete',
        'elections:read', 'elections:write', 'elections:delete',
        'candidates:read', 'candidates:write', 'candidates:delete',
        'votes:read', 'votes:delete',
        'analytics:read', 'audit:read', 'system:admin'
      ],
      election_officer: [
        'elections:read', 'elections:write',
        'candidates:read', 'candidates:write', 'candidates:delete',
        'votes:read', 'analytics:read'
      ],
      voter: [
        'elections:read', 'candidates:read', 'votes:write'
      ]
    };
    
    return permissions[role] || [];
  }
  
  // Generate JTI (JWT ID)
  generateJTI() {
    return randomBytes(16).toString('hex');
  }
  
  // Extract JTI from token
  extractJTI(token) {
    try {
      const decoded = jwt.decode(token);
      return decoded?.jti;
    } catch (error) {
      return null;
    }
  }
  
  // Parse expires in string
  parseExpiresIn(expiresIn) {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return expiresIn;
    }
    
    const [, value, unit] = match;
    const units = {
      s: 'seconds',
      m: 'minutes',
      h: 'hours',
      d: 'days'
    };
    
    return `${value} ${units[unit] || 'seconds'}`;
  }
  
  // Get security statistics
  getSecurityStats() {
    return {
      blacklist: tokenBlacklistManager.getStats(),
      refreshRateLimit: refreshRateLimiter.getStats(),
      deviceTracking: deviceTracker.getStats(),
      config: JWT_SECURITY_CONFIG
    };
  }
}

// Create singleton instance
const jwtSecurityManager = new JWTSecurityManager();

export {
  jwtSecurityManager,
  tokenBlacklistManager,
  refreshRateLimiter,
  deviceTracker,
  JWT_SECURITY_CONFIG
};
