const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError
} = require('./errorTypes');

/**
 * Error Handling Utilities
 * Provides helper functions for common error scenarios
 */

/**
 * Handle database operation errors
 */
const handleDatabaseError = (error, operation = 'database operation') => {
  if (error.name === 'SequelizeValidationError') {
    return new ValidationError(
      `Validation failed during ${operation}`,
      error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }))
    );
  }

  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors?.[0]?.path || 'field';
    return new ConflictError(
      `${field} already exists during ${operation}`,
      [{ field, message: `${field} is already in use` }]
    );
  }

  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return new ValidationError(
      `Invalid reference in ${operation}`,
      [{ message: 'Referenced resource does not exist' }]
    );
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return new DatabaseError(`Database connection failed during ${operation}`);
  }

  return new DatabaseError(`${operation} failed: ${error.message}`);
};

/**
 * Handle authentication errors
 */
const handleAuthError = (error, operation = 'authentication') => {
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token provided');
  }

  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token has expired');
  }

  if (error.message.includes('User not found')) {
    return new AuthenticationError('Invalid credentials');
  }

  if (error.message.includes('Invalid password')) {
    return new AuthenticationError('Invalid credentials');
  }

  return new AuthenticationError(`${operation} failed: ${error.message}`);
};

/**
 * Handle authorization errors
 */
const handleAuthzError = (userRole, requiredRole, resource) => {
  return new AuthorizationError(
    `User with role '${userRole}' does not have permission to ${requiredRole} ${resource}`
  );
};

/**
 * Handle resource not found errors
 */
const handleNotFoundError = (resource, identifier) => {
  const message = identifier 
    ? `${resource} with identifier '${identifier}' not found`
    : `${resource} not found`;
  return new NotFoundError(message);
};

/**
 * Handle validation errors with detailed field information
 */
const handleValidationError = (fields, message = 'Validation failed') => {
  const details = Array.isArray(fields) ? fields : [fields];
  
  return new ValidationError(message, details);
};

/**
 * Handle rate limiting errors
 */
const handleRateLimitError = (limit, windowMs, operation = 'requests') => {
  return new RateLimitError(
    `Too many ${operation}. Limit: ${limit} per ${windowMs / 1000} seconds`
  );
};

/**
 * Handle external service errors
 */
const handleExternalServiceError = (serviceName, error) => {
  if (error.code === 'ECONNREFUSED') {
    return new ExternalServiceError(serviceName, 'Service is unavailable');
  }

  if (error.code === 'ETIMEDOUT') {
    return new ExternalServiceError(serviceName, 'Service timeout');
  }

  if (error.response) {
    const status = error.response.status;
    if (status >= 500) {
      return new ExternalServiceError(serviceName, 'Service error');
    } else if (status === 429) {
      return new RateLimitError(`${serviceName} rate limit exceeded`);
    } else if (status === 401) {
      return new AuthenticationError(`${serviceName} authentication failed`);
    } else if (status === 403) {
      return new AuthorizationError(`${serviceName} access denied`);
    } else if (status === 404) {
      return new NotFoundError(`${serviceName} resource`);
    }
  }

  return new ExternalServiceError(serviceName, error.message);
};

/**
 * Wrap async functions with error handling
 */
const withErrorHandling = (fn, errorHandler = null) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        throw errorHandler(error);
      }
      throw error;
    }
  };
};

/**
 * Validate required fields and throw ValidationError if missing
 */
const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missingFields.length > 0) {
    throw new ValidationError(
      'Required fields are missing',
      missingFields.map(field => ({
        field,
        message: `${field} is required`,
        value: data[field]
      }))
    );
  }
};

/**
 * Validate field formats and throw ValidationError if invalid
 */
const validateFieldFormats = (data, formatRules) => {
  const errors = [];

  Object.entries(formatRules).forEach(([field, rule]) => {
    const value = data[field];
    
    if (value !== undefined && value !== null) {
      if (rule.type && typeof value !== rule.type) {
        errors.push({
          field,
          message: `${field} must be of type ${rule.type}`,
          value
        });
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({
          field,
          message: rule.message || `${field} format is invalid`,
          value
        });
      }

      if (rule.minLength && value.length < rule.minLength) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.minLength} characters long`,
          value
        });
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push({
          field,
          message: `${field} must be no more than ${rule.maxLength} characters long`,
          value
        });
      }

      if (rule.min && value < rule.min) {
        errors.push({
          field,
          message: `${field} must be at least ${rule.min}`,
          value
        });
      }

      if (rule.max && value > rule.max) {
        errors.push({
          field,
          message: `${field} must be no more than ${rule.max}`,
          value
        });
      }

      if (rule.enum && !rule.enum.includes(value)) {
        errors.push({
          field,
          message: `${field} must be one of: ${rule.enum.join(', ')}`,
          value
        });
      }
    }
  });

  if (errors.length > 0) {
    throw new ValidationError('Field validation failed', errors);
  }
};

/**
 * Common format rules for validation
 */
const COMMON_FORMAT_RULES = {
  email: {
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Email must be a valid email address',
    maxLength: 255
  },
  password: {
    type: 'string',
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]$/,
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  },
  uuid: {
    type: 'string',
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    message: 'ID must be a valid UUID'
  },
  positiveInteger: {
    type: 'number',
    min: 1,
    message: 'Must be a positive integer'
  },
  nonEmptyString: {
    type: 'string',
    minLength: 1,
    message: 'Cannot be empty'
  },
  isoDateTime: {
    type: 'string',
    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
    message: 'Must be a valid ISO 8601 datetime'
  }
};

/**
 * Validate user data
 */
const validateUserData = (userData) => {
  validateRequiredFields(userData, ['firstName', 'lastName', 'email', 'password']);
  
  validateFieldFormats(userData, {
    firstName: { ...COMMON_FORMAT_RULES.nonEmptyString, maxLength: 50 },
    lastName: { ...COMMON_FORMAT_RULES.nonEmptyString, maxLength: 50 },
    email: COMMON_FORMAT_RULES.email,
    password: COMMON_FORMAT_RULES.password
  });
};

/**
 * Validate election data
 */
const validateElectionData = (electionData) => {
  validateRequiredFields(electionData, ['title', 'startDate', 'endDate']);
  
  validateFieldFormats(electionData, {
    title: { ...COMMON_FORMAT_RULES.nonEmptyString, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 },
    startDate: COMMON_FORMAT_RULES.isoDateTime,
    endDate: COMMON_FORMAT_RULES.isoDateTime
  });

  // Validate that end date is after start date
  const startDate = new Date(electionData.startDate);
  const endDate = new Date(electionData.endDate);
  
  if (endDate <= startDate) {
    throw new ValidationError('End date must be after start date', [
      {
        field: 'endDate',
        message: 'End date must be after start date',
        value: electionData.endDate
      }
    ]);
  }
};

/**
 * Validate candidate data
 */
const validateCandidateData = (candidateData) => {
  validateRequiredFields(candidateData, ['electionId', 'name']);
  
  validateFieldFormats(candidateData, {
    electionId: COMMON_FORMAT_RULES.positiveInteger,
    name: { ...COMMON_FORMAT_RULES.nonEmptyString, maxLength: 255 },
    description: { type: 'string', maxLength: 1000 }
  });
};

/**
 * Validate vote data
 */
const validateVoteData = (voteData) => {
  validateRequiredFields(voteData, ['electionId', 'candidateId']);
  
  validateFieldFormats(voteData, {
    electionId: COMMON_FORMAT_RULES.positiveInteger,
    candidateId: COMMON_FORMAT_RULES.positiveInteger
  });
};

module.exports = {
  handleDatabaseError,
  handleAuthError,
  handleAuthzError,
  handleNotFoundError,
  handleValidationError,
  handleRateLimitError,
  handleExternalServiceError,
  withErrorHandling,
  validateRequiredFields,
  validateFieldFormats,
  COMMON_FORMAT_RULES,
  validateUserData,
  validateElectionData,
  validateCandidateData,
  validateVoteData
};
