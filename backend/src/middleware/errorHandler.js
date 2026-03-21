// const errorLogger = require('../utils/errorLogger');
// const {
//   AppError,
//   ValidationError,
//   AuthenticationError,
//   AuthorizationError,
//   NotFoundError,
//   ConflictError,
//   RateLimitError,
//   DatabaseError,
//   ExternalServiceError
// } = require('../utils/errorTypes');

import errorLogger from '../utils/errorLogger.js';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError
} from "../utils/errorTypes.js";

/**
 * Global Error Handler Middleware
 * Provides centralized error handling with user-friendly responses
 */

const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log the error with full context
  const logEntry = errorLogger.logError(error, req, {
    stack: err.stack,
    originalError: err
  });

  // Handle specific error types
  if (err.name === 'ValidationError' || err.name === 'SequelizeValidationError') {
    error = handleValidationError(err);
  } else if (err.name === 'JsonWebTokenError') {
    error = handleJWTError(err);
  } else if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError(err);
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    error = handleSequelizeUniqueConstraintError(err);
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    error = handleSequelizeForeignKeyConstraintError(err);
  } else if (err.name === 'SequelizeDatabaseError') {
    error = handleSequelizeDatabaseError(err);
  } else if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    error = handleConnectionError(err);
  } else if (err.code === 'ENOENT') {
    error = handleFileNotFoundError(err);
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    error = handleFileSizeError(err);
  } else if (!error.isOperational) {
    error = handleUnexpectedError(err);
  }

  // Build error response
  const errorResponse = buildErrorResponse(error, logEntry.id);

  // Send response
  res.status(error.statusCode || 500).json(errorResponse);
};

/**
 * Handle validation errors
 */
const handleValidationError = (err) => {
  let details = [];
  
  if (err.errors && Array.isArray(err.errors)) {
    details = err.errors.map(error => ({
      field: error.path || error.field,
      message: error.message,
      value: error.value
    }));
  } else if (err.details && Array.isArray(err.details)) {
    details = err.details;
  } else if (typeof err.message === 'string') {
    details = [{ message: err.message }];
  }

  return new ValidationError('Validation failed', details);
};

/**
 * Handle JWT errors
 */
const handleJWTError = (err) => {
  return new AuthenticationError('Invalid token. Please log in again.');
};

/**
 * Handle JWT expired errors
 */
const handleJWTExpiredError = (err) => {
  return new AuthenticationError('Your token has expired. Please log in again.');
};

/**
 * Handle Sequelize unique constraint errors
 */
const handleSequelizeUniqueConstraintError = (err) => {
  const field = err.errors?.[0]?.path || 'field';
  const value = err.errors?.[0]?.value;
  
  return new ConflictError(
    `${field} already exists`,
    [{ field, message: `${field} '${value}' is already in use`, value }]
  );
};

/**
 * Handle Sequelize foreign key constraint errors
 */
const handleSequelizeForeignKeyConstraintError = (err) => {
  return new ValidationError('Invalid reference. The referenced resource does not exist.');
};

/**
 * Handle Sequelize database errors
 */
const handleSequelizeDatabaseError = (err) => {
  return new DatabaseError('Database operation failed. Please try again later.');
};

/**
 * Handle connection errors
 */
const handleConnectionError = (err) => {
  return new ExternalServiceError('Database', 'Unable to connect to database');
};

/**
 * Handle file not found errors
 */
const handleFileNotFoundError = (err) => {
  return new NotFoundError('File');
};

/**
 * Handle file size errors
 */
const handleFileSizeError = (err) => {
  return new ValidationError('File size exceeds limit');
};

/**
 * Handle unexpected errors
 */
const handleUnexpectedError = (err) => {
  return new AppError(
    process.env.NODE_ENV === 'production' 
      ? 'Something went wrong. Please try again later.' 
      : err.message,
    500,
    'INTERNAL_SERVER_ERROR'
  );
};

/**
 * Build user-friendly error response
 */
const buildErrorResponse = (error, logId) => {
  const response = {
    success: false,
    error: {
      code: error.errorCode || 'UNKNOWN_ERROR',
      message: getUserFriendlyMessage(error),
      logId: logId
    },
    timestamp: new Date().toISOString()
  };

  // Add details in development or for validation errors
  if (process.env.NODE_ENV === 'development' || error.errorCode === 'VALIDATION_ERROR') {
    response.error.details = error.details || null;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  // Add suggestions for common errors
  const suggestions = getSuggestions(error);
  if (suggestions) {
    response.error.suggestions = suggestions;
  }

  return response;
};

/**
 * Get user-friendly error message
 */
const getUserFriendlyMessage = (error) => {
  // In production, use predefined messages for operational errors
  if (process.env.NODE_ENV === 'production' && error.isOperational) {
    return error.message;
  }

  // Map error codes to user-friendly messages
  const messageMap = {
    'VALIDATION_ERROR': 'The provided data is invalid. Please check your input.',
    'AUTHENTICATION_ERROR': 'Authentication failed. Please check your credentials.',
    'AUTHORIZATION_ERROR': 'You do not have permission to perform this action.',
    'NOT_FOUND': 'The requested resource was not found.',
    'CONFLICT_ERROR': 'The request conflicts with existing data.',
    'RATE_LIMIT_EXCEEDED': 'Too many requests. Please try again later.',
    'DATABASE_ERROR': 'A database error occurred. Please try again later.',
    'EXTERNAL_SERVICE_ERROR': 'An external service is unavailable. Please try again later.',
    'INTERNAL_SERVER_ERROR': 'An unexpected error occurred. Please try again later.',
    'UNKNOWN_ERROR': 'An unknown error occurred. Please contact support.'
  };

  return messageMap[error.errorCode] || error.message || 'An error occurred.';
};

/**
 * Get suggestions for error resolution
 */
const getSuggestions = (error) => {
  const suggestions = {
    'VALIDATION_ERROR': [
      'Check all required fields are filled',
      'Ensure data formats are correct',
      'Verify field constraints'
    ],
    'AUTHENTICATION_ERROR': [
      'Check your login credentials',
      'Clear your browser cache and try again',
      'Contact support if the issue persists'
    ],
    'AUTHORIZATION_ERROR': [
      'Ensure you have the required permissions',
      'Contact an administrator for access',
      'Check your account status'
    ],
    'NOT_FOUND': [
      'Verify the resource exists',
      'Check the resource ID or URL',
      'Contact support if you believe this is an error'
    ],
    'CONFLICT_ERROR': [
      'Choose a different value for the conflicting field',
      'Check if the resource already exists',
      'Contact support for assistance'
    ],
    'RATE_LIMIT_EXCEEDED': [
      'Wait a few minutes before trying again',
      'Reduce the frequency of requests',
      'Contact support for higher limits'
    ],
    'DATABASE_ERROR': [
      'Try refreshing the page',
      'Wait a moment and try again',
      'Contact support if the issue persists'
    ],
    'EXTERNAL_SERVICE_ERROR': [
      'Try again in a few minutes',
      'Check your internet connection',
      'Contact support if the issue persists'
    ]
  };

  return suggestions[error.errorCode] || null;
};

/**
 * Async error wrapper for catching unhandled promise rejections
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Handle 404 errors
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

/**
 * Handle uncaught exceptions
 */
const handleUncaughtException = (err) => {
  errorLogger.logError(err, null, {
    type: 'UNCAUGHT_EXCEPTION',
    pid: process.pid
  });
  
  console.error('💥 UNCAUGHT EXCEPTION:', err);
  
  // Graceful shutdown
  process.exit(1);
};

/**
 * Handle unhandled promise rejections
 */
const handleUnhandledRejection = (reason, promise) => {
  errorLogger.logError(new Error(reason), null, {
    type: 'UNHANDLED_REJECTION',
    promise: promise.toString()
  });
  
  console.error('💥 UNHANDLED REJECTION:', reason);
  
  // Graceful shutdown
  process.exit(1);
};

/**
 * Setup global error handlers
 */
const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', handleUncaughtException);
  process.on('unhandledRejection', handleUnhandledRejection);
};

export {
  globalErrorHandler,
  asyncErrorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
  handleValidationError,
  handleJWTError,
  handleJWTExpiredError,
  handleSequelizeUniqueConstraintError,
  handleSequelizeForeignKeyConstraintError,
  handleSequelizeDatabaseError,
  handleConnectionError,
  handleFileNotFoundError,
  handleFileSizeError,
  handleUnexpectedError
};
