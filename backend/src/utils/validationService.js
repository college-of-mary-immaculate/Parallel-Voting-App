const validator = require('validator');
const { createHash } = require('crypto');

// Validation configuration
const VALIDATION_CONFIG = {
  // String validation limits
  stringLengths: {
    firstName: { min: 1, max: 50 },
    lastName: { min: 1, max: 50 },
    email: { min: 5, max: 255 },
    password: { min: 8, max: 128 },
    title: { min: 1, max: 255 },
    description: { min: 0, max: 2000 },
    party: { min: 0, max: 100 },
    position: { min: 0, max: 100 },
    phoneNumber: { min: 0, max: 20 },
    address: { min: 0, max: 500 },
    city: { min: 0, max: 100 },
    state: { min: 0, max: 100 },
    country: { min: 0, max: 100 },
    postalCode: { min: 0, max: 20 },
    search: { min: 0, max: 100 },
    verificationCode: { min: 4, max: 10 }
  },
  
  // Numeric validation ranges
  numericRanges: {
    userId: { min: 1, max: 2147483647 },
    electionId: { min: 1, max: 2147483647 },
    candidateId: { min: 1, max: 2147483647 },
    voteId: { min: 1, max: 2147483647 },
    page: { min: 1, max: 1000 },
    limit: { min: 1, max: 10000 },
    port: { min: 1, max: 65535 }
  },
  
  // Allowed values
  allowedValues: {
    role: ['voter', 'admin', 'election_officer'],
    electionStatus: ['draft', 'active', 'completed', 'archived', 'cancelled'],
    candidateStatus: ['active', 'inactive', 'withdrawn', 'disqualified'],
    voteStatus: ['pending', 'verified', 'rejected'],
    sort: ['asc', 'desc'],
    format: ['json', 'csv', 'pdf', 'xml'],
    severity: ['low', 'medium', 'high', 'critical'],
    category: ['authentication', 'authorization', 'user_management', 'election_management', 'candidate_management', 'voting', 'vote_verification', 'system', 'security', 'admin', 'data_export', 'configuration', 'email', 'api']
  },
  
  // Regular expressions
  patterns: {
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    phoneNumber: /^\+?[\d\s\-\(\)]+$/,
    postalCode: /^[A-Za-z0-9\s\-]+$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    auditId: /^AUD-[0-9]{13}-[A-F0-9]{12}$/i,
    verificationCode: /^[A-Za-z0-9]+$/
  },
  
  // Security settings
  security: {
    maxRequestSize: '10mb',
    maxFieldLength: 10000,
    allowedMimeTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ],
    sanitizeHtml: true,
    preventXSS: true,
    preventSQLInjection: true,
    validateCSRF: true,
    rateLimitEnabled: true
  }
};

// XSS protection patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /onload\s*=/gi,
  /onerror\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,
  /onfocus\s*=/gi,
  /onblur\s*=/gi,
  /onchange\s*=/gi,
  /onsubmit\s*=/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,
  /@import/i,
  /binding\s*:/gi
];

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(--|\#|\/\*|\*\/)/gi,
  /(\bOR\b.*\b1\s*=\s*1|\bAND\b.*\b1\s*=\s*1)/gi,
  /(\bWHERE\b.*\bOR\b|\bWHERE\b.*\bAND\b)/gi,
  /(\bIN\s*\(|\bLIKE\s*')/gi,
  /(\bHAVING\b|\bGROUP\s+BY\b)/gi,
  /(\bORDER\s+BY\b|\bLIMIT\s+\d+)/gi,
  /(\bINTO\s+OUTFILE\b|\bLOAD_FILE\s*\()/gi,
  /(\bBENCHMARK\s*\(|\bSLEEP\s*\()/gi,
  /(\bUSER\s*\(\)|\bDATABASE\s*\(\)|\bVERSION\s*\()/gi
];

// Sanitize HTML content
const sanitizeHtml = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    // Remove dangerous HTML tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: and vbscript: protocols
    .replace(/(javascript|vbscript):/gi, '')
    // Remove dangerous CSS
    .replace(/expression\s*\(/gi, '')
    .replace(/binding\s*:/gi, '')
    .replace(/@import/gi, '')
    // Normalize HTML entities
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

// Detect XSS attempts
const detectXSS = (input) => {
  if (typeof input !== 'string') return false;
  
  return XSS_PATTERNS.some(pattern => pattern.test(input));
};

// Detect SQL injection attempts
const detectSQLInjection = (input) => {
  if (typeof input !== 'string') return false;
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
};

// Basic string validation
const validateString = (input, fieldName, options = {}) => {
  const config = VALIDATION_CONFIG.stringLengths[fieldName];
  if (!config) {
    throw new Error(`Unknown field name: ${fieldName}`);
  }
  
  const {
    min = config.min,
    max = config.max,
    required = false,
    trim = true,
    sanitize = VALIDATION_CONFIG.security.sanitizeHtml,
    xssProtection = VALIDATION_CONFIG.security.preventXSS
  } = options;
  
  // Check if required field is missing
  if (required && (input === undefined || input === null || input === '')) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }
  
  // Allow empty optional fields
  if (!required && (input === undefined || input === null || input === '')) {
    return {
      isValid: true,
      value: ''
    };
  }
  
  // Convert to string
  let value = String(input);
  
  // Trim whitespace
  if (trim) {
    value = value.trim();
  }
  
  // Check length
  if (value.length < min || value.length > max) {
    return {
      isValid: false,
      error: `${fieldName} must be between ${min} and ${max} characters`,
      value: null
    };
  }
  
  // XSS protection
  if (xssProtection && detectXSS(value)) {
    return {
      isValid: false,
      error: `${fieldName} contains potentially dangerous content`,
      value: null
    };
  }
  
  // SQL injection protection
  if (VALIDATION_CONFIG.security.preventSQLInjection && detectSQLInjection(value)) {
    return {
      isValid: false,
      error: `${fieldName} contains potentially dangerous content`,
      value: null
    };
  }
  
  // Sanitize HTML
  if (sanitize) {
    value = sanitizeHtml(value);
  }
  
  return {
    isValid: true,
    value: value
  };
};

// Email validation
const validateEmail = (input, options = {}) => {
  const { required = false, normalize = true } = options;
  
  const result = validateString(input, 'email', { required, trim: true });
  if (!result.isValid) {
    return result;
  }
  
  if (result.value && !validator.isEmail(result.value)) {
    return {
      isValid: false,
      error: 'Invalid email format',
      value: null
    };
  }
  
  // Normalize email
  if (normalize && result.value) {
    result.value = result.value.toLowerCase();
  }
  
  return result;
};

// Password validation
const validatePassword = (input, options = {}) => {
  const { required = true, strong = true } = options;
  
  const result = validateString(input, 'password', { required, trim: false });
  if (!result.isValid) {
    return result;
  }
  
  if (strong && result.value && !VALIDATION_CONFIG.patterns.password.test(result.value)) {
    return {
      isValid: false,
      error: 'Password must contain at least 8 characters including uppercase, lowercase, number, and special character',
      value: null
    };
  }
  
  return result;
};

// Numeric validation
const validateNumber = (input, fieldName, options = {}) => {
  const config = VALIDATION_CONFIG.numericRanges[fieldName];
  if (!config) {
    throw new Error(`Unknown field name: ${fieldName}`);
  }
  
  const {
    min = config.min,
    max = config.max,
    required = false,
    integer = true
  } = options;
  
  // Check if required field is missing
  if (required && (input === undefined || input === null || input === '')) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }
  
  // Allow empty optional fields
  if (!required && (input === undefined || input === null || input === '')) {
    return {
      isValid: true,
      value: null
    };
  }
  
  // Convert to number
  let value = Number(input);
  
  // Check if valid number
  if (isNaN(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number`,
      value: null
    };
  }
  
  // Check if integer
  if (integer && !Number.isInteger(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be an integer`,
      value: null
    };
  }
  
  // Check range
  if (value < min || value > max) {
    return {
      isValid: false,
      error: `${fieldName} must be between ${min} and ${max}`,
      value: null
    };
  }
  
  return {
    isValid: true,
    value: value
  };
};

// Date validation
const validateDate = (input, fieldName, options = {}) => {
  const { required = false, format = 'YYYY-MM-DD' } = options;
  
  // Check if required field is missing
  if (required && (input === undefined || input === null || input === '')) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }
  
  // Allow empty optional fields
  if (!required && (input === undefined || input === null || input === '')) {
    return {
      isValid: true,
      value: null
    };
  }
  
  // Validate date format
  if (!validator.isDate(input)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid date`,
      value: null
    };
  }
  
  // Convert to Date object
  const date = new Date(input);
  
  // Check if valid date
  if (isNaN(date.getTime())) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid date`,
      value: null
    };
  }
  
  return {
    isValid: true,
    value: date
  };
};

// Boolean validation
const validateBoolean = (input, fieldName, options = {}) => {
  const { required = false, defaultValue = false } = options;
  
  // Check if required field is missing
  if (required && (input === undefined || input === null)) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }
  
  // Allow empty optional fields
  if (!required && (input === undefined || input === null)) {
    return {
      isValid: true,
      value: defaultValue
    };
  }
  
  // Convert to boolean
  let value;
  if (typeof input === 'boolean') {
    value = input;
  } else if (typeof input === 'string') {
    value = input.toLowerCase() === 'true' || input === '1';
  } else if (typeof input === 'number') {
    value = input === 1;
  } else {
    value = Boolean(input);
  }
  
  return {
    isValid: true,
    value: value
  };
};

// Enum validation
const validateEnum = (input, fieldName, enumName, options = {}) => {
  const allowedValues = VALIDATION_CONFIG.allowedValues[enumName];
  if (!allowedValues) {
    throw new Error(`Unknown enum name: ${enumName}`);
  }
  
  const { required = false } = options;
  
  // Check if required field is missing
  if (required && (input === undefined || input === null || input === '')) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }
  
  // Allow empty optional fields
  if (!required && (input === undefined || input === null || input === '')) {
    return {
      isValid: true,
      value: null
    };
  }
  
  // Convert to string and lowercase
  const value = String(input).toLowerCase();
  
  // Check if value is allowed
  if (!allowedValues.includes(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      value: null
    };
  }
  
  return {
    isValid: true,
    value: value
  };
};

// UUID validation
const validateUUID = (input, fieldName, options = {}) => {
  const { required = false } = options;
  
  // Check if required field is missing
  if (required && (input === undefined || input === null || input === '')) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }
  
  // Allow empty optional fields
  if (!required && (input === undefined || input === null || input === '')) {
    return {
      isValid: true,
      value: null
    };
  }
  
  // Validate UUID format
  if (!validator.isUUID(input)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid UUID`,
      value: null
    };
  }
  
  return {
    isValid: true,
    value: input
  };
};

// Pattern validation
const validatePattern = (input, fieldName, patternName, options = {}) => {
  const pattern = VALIDATION_CONFIG.patterns[patternName];
  if (!pattern) {
    throw new Error(`Unknown pattern name: ${patternName}`);
  }
  
  const { required = false } = options;
  
  // Check if required field is missing
  if (required && (input === undefined || input === null || input === '')) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }
  
  // Allow empty optional fields
  if (!required && (input === undefined || input === null || input === '')) {
    return {
      isValid: true,
      value: null
    };
  }
  
  // Validate pattern
  if (!pattern.test(input)) {
    return {
      isValid: false,
      error: `${fieldName} format is invalid`,
      value: null
    };
  }
  
  return {
    isValid: true,
    value: input
  };
};

// Array validation
const validateArray = (input, fieldName, options = {}) => {
  const {
    required = false,
    minItems = 0,
    maxItems = 100,
    itemValidator = null
  } = options;
  
  // Check if required field is missing
  if (required && (input === undefined || input === null)) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }
  
  // Allow empty optional fields
  if (!required && (input === undefined || input === null)) {
    return {
      isValid: true,
      value: []
    };
  }
  
  // Check if array
  if (!Array.isArray(input)) {
    return {
      isValid: false,
      error: `${fieldName} must be an array`,
      value: null
    };
  }
  
  // Check array length
  if (input.length < minItems || input.length > maxItems) {
    return {
      isValid: false,
      error: `${fieldName} must contain between ${minItems} and ${maxItems} items`,
      value: null
    };
  }
  
  // Validate array items if validator provided
  if (itemValidator) {
    for (let i = 0; i < input.length; i++) {
      const itemResult = itemValidator(input[i], `${fieldName}[${i}]`);
      if (!itemResult.isValid) {
        return {
          isValid: false,
          error: itemResult.error,
          value: null
        };
      }
      input[i] = itemResult.value;
    }
  }
  
  return {
    isValid: true,
    value: input
  };
};

// Object validation
const validateObject = (input, fieldName, schema, options = {}) => {
  const { required = false, allowExtra = false } = options;
  
  // Check if required field is missing
  if (required && (input === undefined || input === null)) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      value: null
    };
  }
  
  // Allow empty optional fields
  if (!required && (input === undefined || input === null)) {
    return {
      isValid: true,
      value: {}
    };
  }
  
  // Check if object
  if (typeof input !== 'object' || Array.isArray(input)) {
    return {
      isValid: false,
      error: `${fieldName} must be an object`,
      value: null
    };
  }
  
  const result = { isValid: true, value: {}, errors: [] };
  
  // Validate each field in schema
  for (const [key, validatorFn] of Object.entries(schema)) {
    const fieldResult = validatorFn(input[key], key);
    if (!fieldResult.isValid) {
      result.isValid = false;
      result.errors.push(fieldResult.error);
    } else {
      result.value[key] = fieldResult.value;
    }
  }
  
  // Check for extra fields
  if (!allowExtra) {
    const extraFields = Object.keys(input).filter(key => !schema.hasOwnProperty(key));
    if (extraFields.length > 0) {
      result.isValid = false;
      result.errors.push(`Unexpected fields: ${extraFields.join(', ')}`);
    }
  }
  
  if (!result.isValid) {
    return {
      isValid: false,
      error: result.errors.join('; '),
      value: null
    };
  }
  
  return result;
};

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body
      if (schema.body) {
        const bodyResult = validateObject(req.body, 'body', schema.body);
        if (!bodyResult.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid request body',
            errors: bodyResult.error.split('; '),
            code: 'VALIDATION_ERROR'
          });
        }
        req.body = bodyResult.value;
      }
      
      // Validate query parameters
      if (schema.query) {
        const queryResult = validateObject(req.query, 'query', schema.query);
        if (!queryResult.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid query parameters',
            errors: queryResult.error.split('; '),
            code: 'VALIDATION_ERROR'
          });
        }
        req.query = queryResult.value;
      }
      
      // Validate path parameters
      if (schema.params) {
        const paramsResult = validateObject(req.params, 'params', schema.params);
        if (!paramsResult.isValid) {
          return res.status(400).json({
            success: false,
            message: 'Invalid path parameters',
            errors: paramsResult.error.split('; '),
            code: 'VALIDATION_ERROR'
          });
        }
        req.params = paramsResult.value;
      }
      
      next();
    } catch (error) {
      console.error('Validation middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'Validation error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'");
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
};

// Rate limiting middleware (basic implementation)
const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later'
  } = options;
  
  const requests = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean old entries
    for (const [key, data] of requests.entries()) {
      if (now - data.resetTime > windowMs) {
        requests.delete(key);
      }
    }
    
    // Get or create request data
    if (!requests.has(ip)) {
      requests.set(ip, { count: 0, resetTime: now + windowMs });
    }
    
    const requestData = requests.get(ip);
    
    // Check limit
    if (requestData.count >= max) {
      return res.status(429).json({
        success: false,
        message: message,
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
    
    // Increment count
    requestData.count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requestData.count));
    res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString());
    
    next();
  };
};

// Content type validation middleware
const validateContentType = (allowedTypes = VALIDATION_CONFIG.security.allowedMimeTypes) => {
  return (req, res, next) => {
    const contentType = req.headers['content-type'];
    
    if (!contentType) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type header is required',
        code: 'MISSING_CONTENT_TYPE'
      });
    }
    
    // Check if content type is allowed
    const isAllowed = allowedTypes.some(type => contentType.includes(type));
    
    if (!isAllowed) {
      return res.status(415).json({
        success: false,
        message: `Content-Type ${contentType} is not allowed`,
        allowedTypes: allowedTypes,
        code: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }
    
    next();
  };
};

// Request size validation middleware
const validateRequestSize = (maxSize = VALIDATION_CONFIG.security.maxRequestSize) => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          success: false,
          message: `Request size ${contentLength} exceeds maximum allowed size ${maxSize}`,
          code: 'REQUEST_TOO_LARGE'
        });
      }
    }
    
    next();
  };
};

// Helper function to parse size strings (e.g., '10mb' -> 10485760)
const parseSize = (size) => {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toString().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) {
    throw new Error(`Invalid size format: ${size}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return Math.floor(value * (units[unit] || 1));
};

// Generate validation error details
const getValidationErrorDetails = (error) => {
  if (typeof error === 'string') {
    return {
      field: 'general',
      message: error,
      code: 'VALIDATION_ERROR'
    };
  }
  
  return {
    field: error.field || 'general',
    message: error.message || 'Validation failed',
    code: error.code || 'VALIDATION_ERROR',
    value: error.value
  };
};

module.exports = {
  validateString,
  validateEmail,
  validatePassword,
  validateNumber,
  validateDate,
  validateBoolean,
  validateEnum,
  validateUUID,
  validatePattern,
  validateArray,
  validateObject,
  validateRequest,
  securityHeaders,
  rateLimit,
  validateContentType,
  validateRequestSize,
  getValidationErrorDetails,
  VALIDATION_CONFIG,
  sanitizeHtml,
  detectXSS,
  detectSQLInjection
};
