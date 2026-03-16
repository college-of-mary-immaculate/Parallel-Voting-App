const {
  createRateLimitMiddleware,
  createUserRateLimitMiddleware,
  getRateLimitStats,
  resetRateLimit,
  resetUserRateLimit,
  blockIP,
  markIPSuspicious,
  RATE_LIMIT_CONFIG
} = require('../utils/rateLimiter');

// Pre-configured rate limiting middleware
const rateLimitMiddleware = {
  // General rate limiting
  general: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later'
  }),
  
  // Strict rate limiting for sensitive operations
  strict: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes
    message: 'Request limit exceeded, please try again later'
  }),
  
  // Very strict rate limiting for critical operations
  veryStrict: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 requests per hour
    message: 'Critical operation limit exceeded, please try again later'
  }),
  
  // Authentication rate limiting
  auth: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 auth requests per 15 minutes
    message: 'Too many authentication attempts, please try again later'
  }),
  
  // Login rate limiting (very restrictive)
  login: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per 15 minutes
    message: 'Too many login attempts, please try again later',
    blockDuration: 30 * 60 * 1000 // 30 minutes block after limit
  }),
  
  // Registration rate limiting
  registration: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour
    message: 'Too many registration attempts, please try again later',
    blockDuration: 60 * 60 * 1000 // 1 hour block after limit
  }),
  
  // Password reset rate limiting
  passwordReset: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset requests per hour
    message: 'Too many password reset attempts, please try again later',
    blockDuration: 60 * 60 * 1000 // 1 hour block after limit
  }),
  
  // Voting rate limiting (very restrictive)
  voting: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 vote attempts per hour
    message: 'Too many vote attempts, please try again later',
    blockDuration: 2 * 60 * 60 * 1000 // 2 hours block after limit
  }),
  
  // Secure voting rate limiting
  secureVoting: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 secure vote attempts per hour
    message: 'Too many vote attempts, please try again later',
    blockDuration: 2 * 60 * 60 * 1000 // 2 hours block after limit
  }),
  
  // Export rate limiting
  export: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 export requests per hour
    message: 'Too many export requests, please try again later',
    blockDuration: 30 * 60 * 1000 // 30 minutes block after limit
  }),
  
  // Admin rate limiting
  admin: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 admin requests per 15 minutes
    message: 'Too many admin requests, please try again later'
  }),
  
  // Analytics rate limiting
  analytics: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 analytics requests per 15 minutes
    message: 'Too many analytics requests, please try again later'
  }),
  
  // Email rate limiting
  email: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 email requests per hour
    message: 'Too many email requests, please try again later'
  }),
  
  // File upload rate limiting
  fileUpload: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 25, // 25 file uploads per hour
    message: 'Too many file upload attempts, please try again later',
    blockDuration: 30 * 60 * 1000 // 30 minutes block after limit
  }),
  
  // API key rate limiting
  apiKey: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // 1000 API key requests per hour
    message: 'API key rate limit exceeded, please try again later'
  }),
  
  // WebSocket rate limiting
  websocket: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 WebSocket messages per minute
    message: 'WebSocket rate limit exceeded, please try again later'
  })
};

// User-based rate limiting middleware
const userRateLimitMiddleware = {
  // Voting rate limiting per user
  voting: createUserRateLimitMiddleware('voting'),
  
  // Export rate limiting per user
  export: createUserRateLimitMiddleware('export'),
  
  // Email rate limiting per user
  email: createUserRateLimitMiddleware('email', {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 emails per hour per user
    message: 'User email limit exceeded, please try again later'
  })
};

// Custom rate limiting middleware factory
const createCustomRateLimit = (options) => {
  return createRateLimitMiddleware(options);
};

// Rate limiting for specific HTTP methods
const methodRateLimit = {
  get: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 GET requests per 15 minutes
    message: 'GET request limit exceeded, please try again later'
  }),
  
  post: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 POST requests per 15 minutes
    message: 'POST request limit exceeded, please try again later'
  }),
  
  put: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 PUT requests per 15 minutes
    message: 'PUT request limit exceeded, please try again later'
  }),
  
  delete: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // 25 DELETE requests per 15 minutes
    message: 'DELETE request limit exceeded, please try again later'
  }),
  
  patch: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 PATCH requests per 15 minutes
    message: 'PATCH request limit exceeded, please try again later'
  })
};

// Rate limiting based on request size
const sizeBasedRateLimit = {
  small: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 small requests per 15 minutes
    message: 'Small request limit exceeded, please try again later'
  }),
  
  medium: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 medium requests per 15 minutes
    message: 'Medium request limit exceeded, please try again later'
  }),
  
  large: createRateLimitMiddleware({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 large requests per hour
    message: 'Large request limit exceeded, please try again later'
  })
};

// Rate limiting based on user role
const roleBasedRateLimit = {
  admin: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per 15 minutes for admins
    message: 'Admin request limit exceeded, please try again later'
  }),
  
  election_officer: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 minutes for election officers
    message: 'Election officer request limit exceeded, please try again later'
  }),
  
  voter: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes for voters
    message: 'Voter request limit exceeded, please try again later'
  }),
  
  anonymous: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes for anonymous users
    message: 'Anonymous request limit exceeded, please try again later'
  })
};

// Rate limiting based on time of day
const timeBasedRateLimit = {
  businessHours: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // 150 requests per 15 minutes during business hours
    message: 'Business hours request limit exceeded, please try again later',
    skip: (req) => {
      const hour = new Date().getHours();
      return hour < 9 || hour > 17; // Skip outside 9 AM - 5 PM
    }
  }),
  
  afterHours: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes after hours
    message: 'After hours request limit exceeded, please try again later',
    skip: (req) => {
      const hour = new Date().getHours();
      return hour >= 9 && hour <= 17; // Skip during 9 AM - 5 PM
    }
  })
};

// Rate limiting based on geographic location (mock implementation)
const geoBasedRateLimit = {
  domestic: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // 150 requests per 15 minutes for domestic IPs
    message: 'Domestic request limit exceeded, please try again later',
    skip: (req) => {
      // Mock geoIP check - in production, use real geoIP service
      const ip = req.ip || req.connection.remoteAddress;
      return ip && (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.'));
    }
  }),
  
  international: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes for international IPs
    message: 'International request limit exceeded, please try again later',
    skip: (req) => {
      // Mock geoIP check - in production, use real geoIP service
      const ip = req.ip || req.connection.remoteAddress;
      return ip && (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.'));
    }
  })
};

// Adaptive rate limiting based on system load
const adaptiveRateLimit = {
  lowLoad: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 requests per 15 minutes under low load
    message: 'Request limit exceeded, please try again later'
  }),
  
  mediumLoad: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes under medium load
    message: 'Request limit exceeded, please try again later'
  }),
  
  highLoad: createRateLimitMiddleware({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per 15 minutes under high load
    message: 'System under high load, please try again later'
  })
};

// Rate limiting for specific endpoints
const endpointRateLimit = {
  // Authentication endpoints
  '/api/auth/login': rateLimitMiddleware.login,
  '/api/auth/register': rateLimitMiddleware.registration,
  '/api/auth/reset-password': rateLimitMiddleware.passwordReset,
  '/api/auth/change-password': rateLimitMiddleware.auth,
  
  // Voting endpoints
  '/api/votes': rateLimitMiddleware.voting,
  '/api/secure-votes': rateLimitMiddleware.secureVoting,
  
  // Export endpoints
  '/api/export': rateLimitMiddleware.export,
  
  // Admin endpoints
  '/api/admin': rateLimitMiddleware.admin,
  
  // Analytics endpoints
  '/api/analytics': rateLimitMiddleware.analytics,
  
  // Email endpoints
  '/api/notifications': rateLimitMiddleware.email,
  
  // File upload endpoints
  '/api/upload': rateLimitMiddleware.fileUpload,
  
  // API key endpoints
  '/api/api-keys': rateLimitMiddleware.apiKey
};

// Dynamic rate limiting based on request characteristics
const createDynamicRateLimit = (req) => {
  // Choose rate limit based on request characteristics
  if (req.path.startsWith('/api/auth/')) {
    return rateLimitMiddleware.auth;
  }
  
  if (req.path.startsWith('/api/votes')) {
    return rateLimitMiddleware.voting;
  }
  
  if (req.path.startsWith('/api/export')) {
    return rateLimitMiddleware.export;
  }
  
  if (req.path.startsWith('/api/admin')) {
    return rateLimitMiddleware.admin;
  }
  
  if (req.path.startsWith('/api/analytics')) {
    return rateLimitMiddleware.analytics;
  }
  
  // Default to general rate limiting
  return rateLimitMiddleware.general;
};

// Rate limiting middleware that adapts to user role
const createRoleBasedRateLimit = () => {
  return (req, res, next) => {
    // Get user role from request
    const userRole = req.user?.role || 'anonymous';
    
    // Choose appropriate rate limit based on role
    let rateLimit;
    switch (userRole) {
      case 'admin':
        rateLimit = roleBasedRateLimit.admin;
        break;
      case 'election_officer':
        rateLimit = roleBasedRateLimit.election_officer;
        break;
      case 'voter':
        rateLimit = roleBasedRateLimit.voter;
        break;
      default:
        rateLimit = roleBasedRateLimit.anonymous;
        break;
    }
    
    // Apply the chosen rate limit
    return rateLimit(req, res, next);
  };
};

// Rate limiting middleware for WebSocket connections
const createWebSocketRateLimit = (options = {}) => {
  const config = {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 messages per minute
    message: 'WebSocket rate limit exceeded',
    ...options
  };
  
  const rateLimit = createRateLimitMiddleware(config);
  
  return (socket, next) => {
    // Create a mock request object for rate limiting
    const mockReq = {
      ip: socket.handshake.address,
      path: socket.handshake.url,
      headers: socket.handshake.headers,
      user: socket.user
    };
    
    const mockRes = {
      setHeader: () => {}, // No-op for WebSocket
      status: (code) => {
        return {
          json: (data) => {
            socket.emit('error', data);
            if (code === 429) {
              socket.disconnect();
            }
          }
        };
      }
    };
    
    // Apply rate limiting
    rateLimit(mockReq, mockRes, next);
  };
};

// Rate limiting statistics middleware
const rateLimitStats = (req, res, next) => {
  if (req.path === '/api/rate-limit-stats') {
    const stats = getRateLimitStats();
    return res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// Rate limiting management middleware
const rateLimitManagement = {
  // Reset rate limits for IP
  resetIP: (req, res, next) => {
    if (req.path === '/api/rate-limit/reset-ip' && req.method === 'POST') {
      const { ip } = req.body;
      
      if (!ip) {
        return res.status(400).json({
          success: false,
          message: 'IP address is required',
          code: 'MISSING_IP'
        });
      }
      
      resetRateLimit(ip);
      
      return res.json({
        success: true,
        message: 'Rate limits reset for IP',
        ip: ip,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  },
  
  // Reset rate limits for user
  resetUser: (req, res, next) => {
    if (req.path === '/api/rate-limit/reset-user' && req.method === 'POST') {
      const { userId, type } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
      }
      
      resetUserRateLimit(userId, type);
      
      return res.json({
        success: true,
        message: 'Rate limits reset for user',
        userId,
        type: type || 'all',
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  },
  
  // Block IP
  blockIP: (req, res, next) => {
    if (req.path === '/api/rate-limit/block-ip' && req.method === 'POST') {
      const { ip, duration, reason } = req.body;
      
      if (!ip || !duration || !reason) {
        return res.status(400).json({
          success: false,
          message: 'IP, duration, and reason are required',
          code: 'MISSING_PARAMETERS'
        });
      }
      
      blockIP(ip, duration, reason);
      
      return res.json({
        success: true,
        message: 'IP blocked successfully',
        ip,
        duration,
        reason,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  }
};

// Export all middleware and utilities
module.exports = {
  // Pre-configured middleware
  rateLimitMiddleware,
  userRateLimitMiddleware,
  methodRateLimit,
  sizeBasedRateLimit,
  roleBasedRateLimit,
  timeBasedRateLimit,
  geoBasedRateLimit,
  adaptiveRateLimit,
  endpointRateLimit,
  
  // Dynamic middleware creators
  createCustomRateLimit,
  createDynamicRateLimit,
  createRoleBasedRateLimit,
  createWebSocketRateLimit,
  
  // Management middleware
  rateLimitStats,
  rateLimitManagement,
  
  // Utilities
  getRateLimitStats,
  resetRateLimit,
  resetUserRateLimit,
  blockIP,
  markIPSuspicious,
  
  // Configuration
  RATE_LIMIT_CONFIG
};
