const { createHash } = require('crypto');
const { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } = require('./auditLogger');

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  // Default limits
  default: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP, please try again later',
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    skip: (req) => false // Custom skip function
  },
  
  // Specific endpoint limits
  endpoints: {
    // Authentication endpoints (more restrictive)
    '/api/auth/login': {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 login attempts per 15 minutes
      message: 'Too many login attempts, please try again later',
      blockDuration: 30 * 60 * 1000 // 30 minutes block after limit
    },
    
    '/api/auth/register': {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 registrations per hour
      message: 'Too many registration attempts, please try again later',
      blockDuration: 60 * 60 * 1000 // 1 hour block after limit
    },
    
    '/api/auth/reset-password': {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3, // 3 password reset requests per hour
      message: 'Too many password reset attempts, please try again later',
      blockDuration: 60 * 60 * 1000 // 1 hour block after limit
    },
    
    // Voting endpoints (very restrictive)
    '/api/votes': {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 vote attempts per hour
      message: 'Too many vote attempts, please try again later',
      blockDuration: 2 * 60 * 60 * 1000 // 2 hours block after limit
    },
    
    '/api/secure-votes': {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 secure vote attempts per hour
      message: 'Too many vote attempts, please try again later',
      blockDuration: 2 * 60 * 60 * 1000 // 2 hours block after limit
    },
    
    // Export endpoints (restrictive)
    '/api/export': {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 20, // 20 export requests per hour
      message: 'Too many export requests, please try again later',
      blockDuration: 30 * 60 * 1000 // 30 minutes block after limit
    },
    
    // Admin endpoints (moderate)
    '/api/admin': {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // 200 admin requests per 15 minutes
      message: 'Too many admin requests, please try again later'
    },
    
    // Analytics endpoints (moderate)
    '/api/analytics': {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // 50 analytics requests per 15 minutes
      message: 'Too many analytics requests, please try again later'
    }
  },
  
  // IP-based limits
  ipBased: {
    // Global IP limits
    global: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 1000, // 1000 requests per hour per IP
      message: 'IP address rate limit exceeded, please try again later'
    },
    
    // Suspicious IP limits
    suspicious: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 100, // 100 requests per hour for suspicious IPs
      message: 'Suspicious activity detected, access limited'
    },
    
    // Blocked IPs
    blocked: {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 0, // No requests allowed for blocked IPs
      message: 'Access denied: IP address is blocked'
    }
  },
  
  // User-based limits
  userBased: {
    // Voting limits per user
    voting: {
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      max: 1, // 1 vote per election per day
      message: 'Daily voting limit exceeded'
    },
    
    // Export limits per user
    export: {
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // 10 exports per hour per user
      message: 'Export limit exceeded, please try again later'
    }
  },
  
  // DDoS protection
  ddosProtection: {
    enabled: true,
    burstThreshold: 50, // 50 requests in 1 second triggers burst protection
    burstWindowMs: 1000, // 1 second window for burst detection
    thresholdMultiplier: 5, // 5x normal limit triggers DDoS protection
    ddosWindowMs: 5 * 60 * 1000, // 5 minutes DDoS protection window
    ddosMax: 100, // Maximum requests during DDoS protection
    message: 'DDoS protection activated, please try again later'
  },
  
  // Storage and cleanup
  storage: {
    type: 'memory', // 'memory' or 'redis'
    cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
    maxEntries: 10000, // Maximum entries to store
    enableCompression: false // Enable compression for stored data
  }
};

// In-memory storage for rate limiting
const rateLimitStore = new Map();

// IP blocking storage
const blockedIPs = new Map();

// Suspicious IP tracking
const suspiciousIPs = new Map();

// User-based rate limiting storage
const userRateLimits = new Map();

// Get client IP address
const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         '127.0.0.1';
};

// Get user identifier for user-based rate limiting
const getUserId = (req) => {
  return req.user?.userId || 
         req.headers['x-user-id'] || 
         req.session?.userId ||
         null;
};

// Generate rate limit key
const generateKey = (prefix, identifier) => {
  const hash = createHash('sha256')
    .update(`${prefix}:${identifier}`)
    .digest('hex');
  return hash;
};

// Check if IP is blocked
const isIPBlocked = (ip) => {
  const blockedEntry = blockedIPs.get(ip);
  if (!blockedEntry) {
    return false;
  }
  
  const now = Date.now();
  return blockedEntry.expiresAt > now;
};

// Check if IP is suspicious
const isIPSuspicious = (ip) => {
  const suspiciousEntry = suspiciousIPs.get(ip);
  if (!suspiciousEntry) {
    return false;
  }
  
  const now = Date.now();
  return suspiciousEntry.expiresAt > now;
};

// Block IP address
const blockIP = (ip, duration, reason) => {
  const expiresAt = Date.now() + duration;
  blockedIPs.set(ip, {
    blockedAt: Date.now(),
    expiresAt,
    reason,
    requestCount: 0
  });
  
  // Log IP blocking event
  logSecurityEvent(
    AUDIT_EVENTS.IP_BLOCKED,
    null,
    {
      ipAddress: ip,
      blockReason: reason,
      blockDuration: duration,
      expiresAt: new Date(expiresAt).toISOString()
    },
    {
      ip: ip,
      headers: { 'user-agent': 'Rate Limiter' },
      session: { id: 'rate-limiter' },
      id: 'block-ip'
    },
    { success: true, severity: 'high' }
  );
};

// Mark IP as suspicious
const markIPSuspicious = (ip, reason) => {
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  suspiciousIPs.set(ip, {
    markedAt: Date.now(),
    expiresAt,
    reason,
    suspiciousScore: (suspiciousIPs.get(ip)?.suspiciousScore || 0) + 1
  });
  
  // Log suspicious activity
  logSecurityEvent(
    AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
    null,
    {
      ipAddress: ip,
      suspiciousReason: reason,
      suspiciousScore: suspiciousIPs.get(ip)?.suspiciousScore || 1
    },
    {
      ip: ip,
      headers: { 'user-agent': 'Rate Limiter' },
      session: { id: 'rate-limiter' },
      id: 'suspicious-ip'
    },
    { success: true, severity: 'medium' }
  );
};

// Clean up expired entries
const cleanupExpiredEntries = () => {
  const now = Date.now();
  
  // Clean up rate limit entries
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
  
  // Clean up blocked IPs
  for (const [ip, entry] of blockedIPs.entries()) {
    if (entry.expiresAt <= now) {
      blockedIPs.delete(ip);
    }
  }
  
  // Clean up suspicious IPs
  for (const [ip, entry] of suspiciousIPs.entries()) {
    if (entry.expiresAt <= now) {
      suspiciousIPs.delete(ip);
    }
  }
  
  // Clean up user rate limits
  for (const [key, entry] of userRateLimits.entries()) {
    if (entry.resetTime <= now) {
      userRateLimits.delete(key);
    }
  }
};

// Check rate limit
const checkRateLimit = (key, config, req) => {
  const now = Date.now();
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
      firstRequest: now,
      lastRequest: now
    };
    rateLimitStore.set(key, entry);
  }
  
  // Reset if window expired
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + config.windowMs;
  }
  
  // Increment request count
  entry.count++;
  entry.lastRequest = now;
  
  // Check if limit exceeded
  const isExceeded = entry.count > config.max;
  
  return {
    isExceeded,
    count: entry.count,
    remaining: Math.max(0, config.max - entry.count),
    resetTime: entry.resetTime,
    totalRequests: entry.count,
    windowMs: config.windowMs,
    maxRequests: config.max
  };
};

// Check DDoS protection
const checkDDoSProtection = (ip, req) => {
  if (!RATE_LIMIT_CONFIG.ddosProtection.enabled) {
    return { isDDoS: false };
  }
  
  const now = Date.now();
  const key = generateKey('ddos', ip);
  
  // Get or create DDoS entry
  let entry = rateLimitStore.get(`ddos:${key}`);
  if (!entry) {
    entry = {
      requests: [],
      isDDoSMode: false
    };
    rateLimitStore.set(`ddos:${key}`, entry);
  }
  
  // Add current request
  entry.requests.push(now);
  
  // Clean old requests outside the burst window
  entry.requests = entry.requests.filter(time => now - time < RATE_LIMIT_CONFIG.ddosProtection.burstWindowMs);
  
  // Check for burst
  const isBurst = entry.requests.length > RATE_LIMIT_CONFIG.ddosProtection.burstThreshold;
  
  // Check for DDoS pattern
  const ddosKey = generateKey('ddos-mode', ip);
  let ddosEntry = rateLimitStore.get(ddosKey);
  
  if (!ddosEntry) {
    ddosEntry = {
      isDDoSMode: false,
      activatedAt: null,
      resetTime: now + RATE_LIMIT_CONFIG.ddosProtection.ddosWindowMs
    };
    rateLimitStore.set(ddosKey, ddosEntry);
  }
  
  // Activate DDoS mode if burst detected or already in DDoS mode
  if (isBurst || ddosEntry.isDDoSMode) {
    if (!ddosEntry.isDDoSMode) {
      ddosEntry.isDDoSMode = true;
      ddosEntry.activatedAt = now;
      
      // Log DDoS activation
      logSecurityEvent(
        AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
        null,
        {
          ipAddress: ip,
          ddosActivated: true,
          burstCount: entry.requests.length,
          threshold: RATE_LIMIT_CONFIG.ddosProtection.burstThreshold
        },
        {
          ip: ip,
          headers: { 'user-agent': 'DDoS Protector' },
          session: { id: 'ddos-detector' },
          id: 'ddos-activation'
        },
        { success: true, severity: 'critical' }
      );
    }
    
    // Check DDoS limit
    const ddosRequests = rateLimitStore.get(`ddos-requests:${ip}`)?.count || 0;
    
    if (ddosRequests >= RATE_LIMIT_CONFIG.ddosProtection.ddosMax) {
      return {
        isDDoS: true,
        isBlocked: true,
        message: RATE_LIMIT_CONFIG.ddosProtection.message,
        resetTime: ddosEntry.resetTime
      };
    }
  }
  
  // Reset DDoS mode after window expires
  if (now > ddosEntry.resetTime) {
    ddosEntry.isDDoSMode = false;
    ddosEntry.activatedAt = null;
    ddosEntry.resetTime = now + RATE_LIMIT_CONFIG.ddosProtection.ddosWindowMs;
  }
  
  return {
    isDDoS: ddosEntry.isDDoSMode,
    isBlocked: false,
    activatedAt: ddosEntry.activatedAt
  };
};

// Main rate limiting middleware
const createRateLimitMiddleware = (options = {}) => {
  const config = { ...RATE_LIMIT_CONFIG.default, ...options };
  
  return (req, res, next) => {
    try {
      const ip = getClientIP(req);
      const userId = getUserId(req);
      
      // Check if IP is blocked
      if (isIPBlocked(ip)) {
        const blockedEntry = blockedIPs.get(ip);
        return res.status(429).json({
          success: false,
          message: 'Access denied: IP address is blocked',
          blockedUntil: new Date(blockedEntry.expiresAt).toISOString(),
          reason: blockedEntry.reason,
          code: 'IP_BLOCKED'
        });
      }
      
      // Check DDoS protection
      const ddosCheck = checkDDoSProtection(ip, req);
      if (ddosCheck.isBlocked) {
        return res.status(429).json({
          success: false,
          message: ddosCheck.message,
          resetTime: new Date(ddosCheck.resetTime).toISOString(),
          code: 'DDOS_PROTECTION'
        });
      }
      
      // Skip if custom skip function returns true
      if (config.skip && config.skip(req)) {
        return next();
      }
      
      // Determine which limit to apply
      let limitConfig = config;
      const path = req.path;
      
      // Check for endpoint-specific limits
      for (const [endpoint, endpointConfig] of Object.entries(RATE_LIMIT_CONFIG.endpoints)) {
        if (path.startsWith(endpoint)) {
          limitConfig = { ...config, ...endpointConfig };
          break;
        }
      }
      
      // Apply IP-based limits for suspicious IPs
      if (isIPSuspicious(ip)) {
        limitConfig = { ...limitConfig, ...RATE_LIMIT_CONFIG.ipBased.suspicious };
      }
      
      // Generate rate limit key
      const key = generateKey('rate', `${ip}:${path}`);
      
      // Check rate limit
      const result = checkRateLimit(key, limitConfig, req);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', limitConfig.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
      res.setHeader('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      res.setHeader('X-RateLimit-Total', result.totalRequests);
      
      // Check if limit exceeded
      if (result.isExceeded) {
        // Log rate limit exceeded
        logSecurityEvent(
          AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
          userId,
          {
            ipAddress: ip,
            path: path,
            rateLimitExceeded: true,
            requestCount: result.totalRequests,
            limit: limitConfig.max,
            windowMs: limitConfig.windowMs
          },
          {
            ip: ip,
            headers: req.headers,
            session: req.session,
            id: req.id
          },
          { success: true, severity: 'medium' }
        );
        
        // Apply additional blocking for sensitive endpoints
        if (limitConfig.blockDuration) {
          blockIP(ip, limitConfig.blockDuration, `Rate limit exceeded for ${path}`);
        }
        
        return res.status(429).json({
          success: false,
          message: limitConfig.message,
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
          limit: limitConfig.max,
          remaining: result.remaining,
          resetTime: new Date(result.resetTime).toISOString(),
          code: 'RATE_LIMIT_EXCEEDED'
        });
      }
      
      // Mark IP as suspicious if high activity
      if (result.totalRequests > limitConfig.max * 0.8) {
        markIPSuspicious(ip, `High request rate: ${result.totalRequests}/${limitConfig.max} in ${limitConfig.windowMs}ms`);
      }
      
      next();
      
    } catch (error) {
      console.error('Rate limiting middleware error:', error);
      next();
    }
  };
};

// User-based rate limiting middleware
const createUserRateLimitMiddleware = (type, options = {}) => {
  const config = RATE_LIMIT_CONFIG.userBased[type];
  if (!config) {
    throw new Error(`Unknown user rate limit type: ${type}`);
  }
  
  return (req, res, next) => {
    const userId = getUserId(req);
    
    if (!userId) {
      return next(); // Skip if no user ID
    }
    
    const key = generateKey('user', `${type}:${userId}`);
    const result = checkRateLimit(key, config, req);
    
    // Set rate limit headers
    res.setHeader('X-User-RateLimit-Limit', config.max);
    res.setHeader('X-User-RateLimit-Remaining', Math.max(0, result.remaining));
    res.setHeader('X-User-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    if (result.isExceeded) {
      return res.status(429).json({
        success: false,
        message: config.message,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        code: 'USER_RATE_LIMIT_EXCEEDED'
      });
    }
    
    next();
  };
};

// Get rate limit statistics
const getRateLimitStats = () => {
  const now = Date.now();
  const stats = {
    totalEntries: rateLimitStore.size,
    blockedIPs: blockedIPs.size,
    suspiciousIPs: suspiciousIPs.size,
    userRateLimits: userRateLimits.size,
    activeDDoSMode: 0,
    topActiveIPs: []
  };
  
  // Count active DDoS mode entries
  for (const [key, entry] of rateLimitStore.entries()) {
    if (key.startsWith('ddos-mode:') && entry.isDDoSMode) {
      stats.activeDDoSMode++;
    }
  }
  
  // Get top active IPs
  const ipActivity = new Map();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (key.startsWith('rate:')) {
      const ip = key.split(':')[1];
      ipActivity.set(ip, (ipActivity.get(ip) || 0) + entry.count);
    }
  }
  
  stats.topActiveIPs = Array.from(ipActivity.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));
  
  return stats;
};

// Reset rate limits for IP
const resetRateLimit = (ip) => {
  const keysToDelete = [];
  
  for (const [key] of rateLimitStore.entries()) {
    if (key.includes(ip)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
  
  // Unblock IP if blocked
  if (blockedIPs.has(ip)) {
    blockedIPs.delete(ip);
  }
  
  // Remove from suspicious if marked
  if (suspiciousIPs.has(ip)) {
    suspiciousIPs.delete(ip);
  }
};

// Reset rate limits for user
const resetUserRateLimit = (userId, type = null) => {
  if (type) {
    const key = generateKey('user', `${type}:${userId}`);
    userRateLimits.delete(key);
  } else {
    // Reset all user rate limits
    const keysToDelete = [];
    
    for (const [key] of userRateLimits.entries()) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => userRateLimits.delete(key));
  }
};

// Start cleanup interval
const startCleanupInterval = () => {
  setInterval(cleanupExpiredEntries, RATE_LIMIT_CONFIG.storage.cleanupIntervalMs);
};

// Initialize rate limiting
const initializeRateLimiting = () => {
  startCleanupInterval();
  console.log('🛡️ Rate limiting initialized');
  console.log(`📊 Storage type: ${RATE_LIMIT_CONFIG.storage.type}`);
  console.log(`🧹 Cleanup interval: ${RATE_LIMIT_CONFIG.storage.cleanupIntervalMs / 1000} seconds`);
  console.log(`📈 Max entries: ${RATE_LIMIT_CONFIG.storage.maxEntries}`);
};

module.exports = {
  createRateLimitMiddleware,
  createUserRateLimitMiddleware,
  getRateLimitStats,
  resetRateLimit,
  resetUserRateLimit,
  blockIP,
  markIPSuspicious,
  isIPBlocked,
  isIPSuspicious,
  getClientIP,
  getUserId,
  RATE_LIMIT_CONFIG,
  initializeRateLimiting
};
