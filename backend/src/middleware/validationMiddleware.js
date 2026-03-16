const {
  validateRequest,
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
  securityHeaders,
  rateLimit,
  validateContentType,
  validateRequestSize
} = require('../utils/validationService');

// Common validation schemas
const COMMON_SCHEMAS = {
  // Pagination
  pagination: {
    query: {
      page: (value) => validateNumber(value, 'page', { required: false, min: 1, max: 1000 }),
      limit: (value) => validateNumber(value, 'limit', { required: false, min: 1, max: 100 })
    }
  },
  
  // Date range
  dateRange: {
    query: {
      startDate: (value) => validateDate(value, 'startDate', { required: false }),
      endDate: (value) => validateDate(value, 'endDate', { required: false })
    }
  },
  
  // Search and filter
  searchFilter: {
    query: {
      search: (value) => validateString(value, 'search', { required: false }),
      sort: (value) => validateEnum(value, 'sort', 'sort', { required: false }),
      order: (value) => validateEnum(value, 'order', 'sort', { required: false })
    }
  }
};

// Authentication validation schemas
const AUTH_SCHEMAS = {
  register: {
    body: {
      email: (value) => validateEmail(value, { required: true }),
      password: (value) => validatePassword(value, { required: true, strong: true }),
      firstName: (value) => validateString(value, 'firstName', { required: true }),
      lastName: (value) => validateString(value, 'lastName', { required: true }),
      phoneNumber: (value) => validateString(value, 'phoneNumber', { required: false }),
      dateOfBirth: (value) => validateDate(value, 'dateOfBirth', { required: false }),
      address: (value) => validateString(value, 'address', { required: false }),
      city: (value) => validateString(value, 'city', { required: false }),
      state: (value) => validateString(value, 'state', { required: false }),
      country: (value) => validateString(value, 'country', { required: false }),
      postalCode: (value) => validateString(value, 'postalCode', { required: false })
    }
  },
  
  login: {
    body: {
      email: (value) => validateEmail(value, { required: true }),
      password: (value) => validateString(value, 'password', { required: true })
    }
  },
  
  changePassword: {
    body: {
      currentPassword: (value) => validateString(value, 'password', { required: true }),
      newPassword: (value) => validatePassword(value, { required: true, strong: true }),
      confirmPassword: (value) => validateString(value, 'password', { required: true })
    }
  },
  
  resetPassword: {
    body: {
      email: (value) => validateEmail(value, { required: true })
    }
  },
  
  confirmResetPassword: {
    body: {
      token: (value) => validateString(value, 'verificationCode', { required: true }),
      newPassword: (value) => validatePassword(value, { required: true, strong: true }),
      confirmPassword: (value) => validateString(value, 'password', { required: true })
    }
  }
};

// Election validation schemas
const ELECTION_SCHEMAS = {
  create: {
    body: {
      title: (value) => validateString(value, 'title', { required: true }),
      description: (value) => validateString(value, 'description', { required: false }),
      startTime: (value) => validateDate(value, 'startTime', { required: true }),
      endTime: (value) => validateDate(value, 'endTime', { required: true }),
      isPublic: (value) => validateBoolean(value, 'isPublic', { required: false, defaultValue: true }),
      allowWriteIn: (value) => validateBoolean(value, 'allowWriteIn', { required: false, defaultValue: false }),
      maxVotesPerVoter: (value) => validateNumber(value, 'maxVotesPerVoter', { required: false, min: 1, max: 10 })
    }
  },
  
  update: {
    params: {
      electionId: (value) => validateNumber(value, 'electionId', { required: true })
    },
    body: {
      title: (value) => validateString(value, 'title', { required: false }),
      description: (value) => validateString(value, 'description', { required: false }),
      startTime: (value) => validateDate(value, 'startTime', { required: false }),
      endTime: (value) => validateDate(value, 'endTime', { required: false }),
      isPublic: (value) => validateBoolean(value, 'isPublic', { required: false }),
      allowWriteIn: (value) => validateBoolean(value, 'allowWriteIn', { required: false }),
      maxVotesPerVoter: (value) => validateNumber(value, 'maxVotesPerVoter', { required: false, min: 1, max: 10 })
    }
  },
  
  getElections: {
    query: {
      ...COMMON_SCHEMAS.pagination.query,
      ...COMMON_SCHEMAS.searchFilter.query,
      status: (value) => validateEnum(value, 'status', 'electionStatus', { required: false }),
      isPublic: (value) => validateBoolean(value, 'isPublic', { required: false })
    }
  }
};

// Candidate validation schemas
const CANDIDATE_SCHEMAS = {
  create: {
    params: {
      electionId: (value) => validateNumber(value, 'electionId', { required: true })
    },
    body: {
      firstName: (value) => validateString(value, 'firstName', { required: true }),
      lastName: (value) => validateString(value, 'lastName', { required: true }),
      party: (value) => validateString(value, 'party', { required: false }),
      position: (value) => validateString(value, 'position', { required: false }),
      bio: (value) => validateString(value, 'description', { required: false }),
      imageUrl: (value) => validateString(value, 'imageUrl', { required: false })
    }
  },
  
  update: {
    params: {
      candidateId: (value) => validateNumber(value, 'candidateId', { required: true })
    },
    body: {
      firstName: (value) => validateString(value, 'firstName', { required: false }),
      lastName: (value) => validateString(value, 'lastName', { required: false }),
      party: (value) => validateString(value, 'party', { required: false }),
      position: (value) => validateString(value, 'position', { required: false }),
      bio: (value) => validateString(value, 'description', { required: false }),
      imageUrl: (value) => validateString(value, 'imageUrl', { required: false }),
      isActive: (value) => validateBoolean(value, 'isActive', { required: false })
    }
  },
  
  getCandidates: {
    params: {
      electionId: (value) => validateNumber(value, 'electionId', { required: false })
    },
    query: {
      ...COMMON_SCHEMAS.pagination.query,
      isActive: (value) => validateBoolean(value, 'isActive', { required: false })
    }
  }
};

// Vote validation schemas
const VOTE_SCHEMAS = {
  castVote: {
    body: {
      electionId: (value) => validateNumber(value, 'electionId', { required: true }),
      candidateId: (value) => validateNumber(value, 'candidateId', { required: true }),
      voterInfo: (value) => validateObject(value, 'voterInfo', {}, { required: false, allowExtra: true })
    }
  },
  
  verifyVote: {
    body: {
      voteId: (value) => validateUUID(value, 'voteId', { required: true }),
      verificationCode: (value) => validatePattern(value, 'verificationCode', 'verificationCode', { required: true })
    }
  },
  
  getVotes: {
    query: {
      ...COMMON_SCHEMAS.pagination.query,
      ...COMMON_SCHEMAS.dateRange.query,
      electionId: (value) => validateNumber(value, 'electionId', { required: false }),
      candidateId: (value) => validateNumber(value, 'candidateId', { required: false }),
      userId: (value) => validateNumber(value, 'userId', { required: false }),
      isVerified: (value) => validateBoolean(value, 'isVerified', { required: false })
    }
  }
};

// User management validation schemas
const USER_SCHEMAS = {
  updateUser: {
    params: {
      userId: (value) => validateNumber(value, 'userId', { required: true })
    },
    body: {
      firstName: (value) => validateString(value, 'firstName', { required: false }),
      lastName: (value) => validateString(value, 'lastName', { required: false }),
      phoneNumber: (value) => validateString(value, 'phoneNumber', { required: false }),
      address: (value) => validateString(value, 'address', { required: false }),
      city: (value) => validateString(value, 'city', { required: false }),
      state: (value) => validateString(value, 'state', { required: false }),
      country: (value) => validateString(value, 'country', { required: false }),
      postalCode: (value) => validateString(value, 'postalCode', { required: false }),
      role: (value) => validateEnum(value, 'role', 'role', { required: false }),
      isActive: (value) => validateBoolean(value, 'isActive', { required: false })
    }
  },
  
  getUsers: {
    query: {
      ...COMMON_SCHEMAS.pagination.query,
      ...COMMON_SCHEMAS.searchFilter.query,
      role: (value) => validateEnum(value, 'role', 'role', { required: false }),
      isActive: (value) => validateBoolean(value, 'isActive', { required: false }),
      isEmailVerified: (value) => validateBoolean(value, 'isEmailVerified', { required: false })
    }
  }
};

// Admin validation schemas
const ADMIN_SCHEMAS = {
  systemConfig: {
    body: {
      configKey: (value) => validateString(value, 'configKey', { required: true }),
      configValue: (value) => validateString(value, 'configValue', { required: true }),
      description: (value) => validateString(value, 'description', { required: false })
    }
  },
  
  bulkAction: {
    body: {
      action: (value) => validateString(value, 'action', { required: true }),
      targetIds: (value) => validateArray(value, 'targetIds', { required: true, minItems: 1, maxItems: 100 }),
      parameters: (value) => validateObject(value, 'parameters', {}, { required: false, allowExtra: true })
    }
  }
};

// Export validation schemas
const EXPORT_SCHEMAS = {
  exportData: {
    params: {
      electionId: (value) => validateNumber(value, 'electionId', { required: false })
    },
    query: {
      format: (value) => validateEnum(value, 'format', 'format', { required: false }),
      ...COMMON_SCHEMAS.dateRange.query
    }
  },
  
  exportUsers: {
    query: {
      format: (value) => validateEnum(value, 'format', 'format', { required: false }),
      role: (value) => validateEnum(value, 'role', 'role', { required: false }),
      isActive: (value) => validateBoolean(value, 'isActive', { required: false }),
      isEmailVerified: (value) => validateBoolean(value, 'isEmailVerified', { required: false }),
      ...COMMON_SCHEMAS.dateRange.query
    }
  }
};

// Audit validation schemas
const AUDIT_SCHEMAS = {
  getAuditLogs: {
    query: {
      ...COMMON_SCHEMAS.pagination.query,
      ...COMMON_SCHEMAS.dateRange.query,
      category: (value) => validateEnum(value, 'category', 'category', { required: false }),
      eventType: (value) => validateString(value, 'eventType', { required: false }),
      userId: (value) => validateNumber(value, 'userId', { required: false }),
      electionId: (value) => validateNumber(value, 'electionId', { required: false }),
      severity: (value) => validateEnum(value, 'severity', 'severity', { required: false }),
      success: (value) => validateBoolean(value, 'success', { required: false }),
      ipAddress: (value) => validateString(value, 'ipAddress', { required: false })
    }
  }
};

// Security validation schemas
const SECURITY_SCHEMAS = {
  blockIP: {
    body: {
      ipAddress: (value) => validateString(value, 'ipAddress', { required: true }),
      reason: (value) => validateString(value, 'reason', { required: true }),
      duration: (value) => validateNumber(value, 'duration', { required: false, min: 1, max: 8760 }) // hours
    }
  },
  
  securityInvestigation: {
    body: {
      investigationType: (value) => validateString(value, 'investigationType', { required: true }),
      targetId: (value) => validateString(value, 'targetId', { required: true }),
      description: (value) => validateString(value, 'description', { required: true }),
      priority: (value) => validateEnum(value, 'priority', 'severity', { required: false })
    }
  }
};

// Notification validation schemas
const NOTIFICATION_SCHEMAS = {
  sendEmail: {
    body: {
      to: (value) => validateArray(value, 'to', { required: true, minItems: 1, maxItems: 100 }),
      subject: (value) => validateString(value, 'subject', { required: true }),
      template: (value) => validateString(value, 'template', { required: false }),
      content: (value) => validateString(value, 'content', { required: false }),
      variables: (value) => validateObject(value, 'variables', {}, { required: false, allowExtra: true })
    }
  }
};

// Validation middleware factory
const createValidationMiddleware = (schema) => {
  return validateRequest(schema);
};

// Pre-built validation middleware
const validationMiddleware = {
  // Authentication
  validateRegister: createValidationMiddleware(AUTH_SCHEMAS.register),
  validateLogin: createValidationMiddleware(AUTH_SCHEMAS.login),
  validateChangePassword: createValidationMiddleware(AUTH_SCHEMAS.changePassword),
  validateResetPassword: createValidationMiddleware(AUTH_SCHEMAS.resetPassword),
  validateConfirmResetPassword: createValidationMiddleware(AUTH_SCHEMAS.confirmResetPassword),
  
  // Elections
  validateCreateElection: createValidationMiddleware(ELECTION_SCHEMAS.create),
  validateUpdateElection: createValidationMiddleware(ELECTION_SCHEMAS.update),
  validateGetElections: createValidationMiddleware(ELECTION_SCHEMAS.getElections),
  
  // Candidates
  validateCreateCandidate: createValidationMiddleware(CANDIDATE_SCHEMAS.create),
  validateUpdateCandidate: createValidationMiddleware(CANDIDATE_SCHEMAS.update),
  validateGetCandidates: createValidationMiddleware(CANDIDATE_SCHEMAS.getCandidates),
  
  // Votes
  validateCastVote: createValidationMiddleware(VOTE_SCHEMAS.castVote),
  validateVerifyVote: createValidationMiddleware(VOTE_SCHEMAS.verifyVote),
  validateGetVotes: createValidationMiddleware(VOTE_SCHEMAS.getVotes),
  
  // Users
  validateUpdateUser: createValidationMiddleware(USER_SCHEMAS.updateUser),
  validateGetUsers: createValidationMiddleware(USER_SCHEMAS.getUsers),
  
  // Admin
  validateSystemConfig: createValidationMiddleware(ADMIN_SCHEMAS.systemConfig),
  validateBulkAction: createValidationMiddleware(ADMIN_SCHEMAS.bulkAction),
  
  // Export
  validateExportData: createValidationMiddleware(EXPORT_SCHEMAS.exportData),
  validateExportUsers: createValidationMiddleware(EXPORT_SCHEMAS.exportUsers),
  
  // Audit
  validateGetAuditLogs: createValidationMiddleware(AUDIT_SCHEMAS.getAuditLogs),
  
  // Security
  validateBlockIP: createValidationMiddleware(SECURITY_SCHEMAS.blockIP),
  validateSecurityInvestigation: createValidationMiddleware(SECURITY_SCHEMAS.securityInvestigation),
  
  // Notifications
  validateSendEmail: createValidationMiddleware(NOTIFICATION_SCHEMAS.sendEmail),
  
  // Common
  validatePagination: createValidationMiddleware(COMMON_SCHEMAS.pagination),
  validateDateRange: createValidationMiddleware(COMMON_SCHEMAS.dateRange),
  validateSearchFilter: createValidationMiddleware(COMMON_SCHEMAS.searchFilter)
};

// Security middleware
const securityMiddleware = {
  securityHeaders,
  rateLimit: (options) => rateLimit(options),
  validateContentType: (allowedTypes) => validateContentType(allowedTypes),
  validateRequestSize: (maxSize) => validateRequestSize(maxSize)
};

// Custom validation middleware creator
const createCustomValidation = (schema) => {
  return createValidationMiddleware(schema);
};

// Validation error handler
const validationErrorHandler = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details || [error.message],
      code: 'VALIDATION_ERROR'
    });
  }
  next(error);
};

module.exports = {
  // Schemas
  COMMON_SCHEMAS,
  AUTH_SCHEMAS,
  ELECTION_SCHEMAS,
  CANDIDATE_SCHEMAS,
  VOTE_SCHEMAS,
  USER_SCHEMAS,
  ADMIN_SCHEMAS,
  EXPORT_SCHEMAS,
  AUDIT_SCHEMAS,
  SECURITY_SCHEMAS,
  NOTIFICATION_SCHEMAS,
  
  // Middleware
  validationMiddleware,
  securityMiddleware,
  createValidationMiddleware,
  createCustomValidation,
  validationErrorHandler,
  
  // Individual validators
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
  validateObject
};
