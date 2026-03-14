const { v4: uuidv4 } = require('uuid');
const {
  createAuditLog,
  logAuthEvent,
  logUserEvent,
  logElectionEvent,
  logVotingEvent,
  logSecurityEvent,
  logSystemEvent,
  logAdminEvent,
  AUDIT_CATEGORIES,
  AUDIT_EVENTS
} = require('../utils/auditLogger');

/**
 * Audit Middleware
 * Provides automatic audit logging for all API requests and important actions
 */

/**
 * Request ID middleware - adds unique ID to each request
 */
const requestId = (req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

/**
 * Request logging middleware - logs all API requests
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Store original end function
  const originalEnd = res.end;
  
  // Override end function to log after response
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    // Log the request
    createAuditLog({
      category: AUDIT_CATEGORIES.API,
      eventType: AUDIT_EVENTS.API_ACCESS,
      userId: req.user?.userId || null,
      action: `${req.method} ${req.route?.path || req.path}`,
      resource: `${req.method}_${req.route?.path || req.path}`,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      sessionId: req.session?.id || null,
      requestId: req.id || null,
      success: res.statusCode < 400,
      errorMessage: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null,
      severity: res.statusCode >= 500 ? 'high' : res.statusCode >= 400 ? 'medium' : 'info',
      metadata: {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: duration,
        responseSize: res.get('Content-Length') || 0,
        contentType: res.get('Content-Type') || 'unknown'
      }
    }).catch(error => {
      console.error('Failed to log request:', error);
    });
    
    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * Authentication audit middleware
 */
const authAudit = (eventType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      // Log authentication event
      logAuthEvent(
        eventType,
        data.user?.userId || null,
        req,
        {
          success: res.statusCode < 400,
          errorMessage: data.message || null,
          severity: res.statusCode >= 400 ? 'medium' : 'info',
          metadata: {
            email: req.body.email || null,
            timestamp: new Date().toISOString()
          }
        }
      ).catch(error => {
        console.error('Failed to log auth event:', error);
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * User management audit middleware
 */
const userAudit = (eventType, targetUserIdParam = 'userId') => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      const targetUserId = req.params[targetUserIdParam] || req.body[targetUserIdParam];
      
      if (targetUserId) {
        logUserEvent(
          eventType,
          req.user?.userId || null,
          targetUserId,
          {
            oldValue: req.body.oldValue || null,
            newValue: req.body.newValue || null
          },
          req,
          {
            success: res.statusCode < 400,
            errorMessage: data.message || null,
            severity: res.statusCode >= 400 ? 'medium' : 'info',
            metadata: {
              changes: req.body,
              timestamp: new Date().toISOString()
            }
          }
        ).catch(error => {
          console.error('Failed to log user event:', error);
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Election management audit middleware
 */
const electionAudit = (eventType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      const electionId = req.params.electionId || req.body.electionId || data.electionId;
      
      if (electionId) {
        logElectionEvent(
          eventType,
          req.user?.userId || null,
          electionId,
          {
            oldValue: req.body.oldValue || null,
            newValue: req.body.newValue || null,
            electionTitle: req.body.title || data.election?.title
          },
          req,
          {
            success: res.statusCode < 400,
            errorMessage: data.message || null,
            severity: res.statusCode >= 400 ? 'medium' : 'info',
            metadata: {
              electionData: req.body,
              timestamp: new Date().toISOString()
            }
          }
        ).catch(error => {
          console.error('Failed to log election event:', error);
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Voting audit middleware
 */
const votingAudit = (eventType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      const electionId = req.body.electionId || req.params.electionId;
      const candidateId = req.body.candidateId || req.params.candidateId;
      const voteId = data.voteId || req.params.voteId;
      
      if (electionId && candidateId) {
        logVotingEvent(
          eventType,
          req.user?.userId || null,
          electionId,
          candidateId,
          voteId,
          req,
          {
            success: res.statusCode < 400,
            errorMessage: data.message || null,
            severity: res.statusCode >= 400 ? 'high' : 'info',
            metadata: {
              votingData: req.body,
              timestamp: new Date().toISOString()
            }
          }
        ).catch(error => {
          console.error('Failed to log voting event:', error);
        });
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Admin action audit middleware
 */
const adminAudit = (action, resource) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      logAdminEvent(
        'privileged_action',
        req.user?.userId || null,
        action,
        resource,
        {
          oldValue: req.body.oldValue || null,
          newValue: req.body.newValue || null
        },
        req,
        {
          success: res.statusCode < 400,
          errorMessage: data.message || null,
          severity: 'medium',
          metadata: {
            adminAction: action,
            resource: resource,
            requestData: req.body,
            timestamp: new Date().toISOString()
          }
        }
      ).catch(error => {
        console.error('Failed to log admin event:', error);
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Security audit middleware
 */
const securityAudit = (eventType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      logSecurityEvent(
        eventType,
        req.user?.userId || null,
        {
          securityDetails: req.body,
          response: data
        },
        req,
        {
          success: res.statusCode < 400,
          errorMessage: data.message || null,
          severity: 'high',
          metadata: {
            securityEvent: eventType,
            requestData: req.body,
            timestamp: new Date().toISOString()
          }
        }
      ).catch(error => {
        console.error('Failed to log security event:', error);
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Error audit middleware
 */
const errorAudit = (err, req, res, next) => {
  // Log the error
  createAuditLog({
    category: AUDIT_CATEGORIES.SYSTEM,
    eventType: AUDIT_EVENTS.SYSTEM_ERROR,
    userId: req.user?.userId || null,
    action: 'system_error',
    resource: 'system',
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    sessionId: req.session?.id || null,
    requestId: req.id || null,
    success: false,
    errorMessage: err.message,
    severity: err.status >= 500 ? 'high' : 'medium',
    metadata: {
      error: {
        message: err.message,
        stack: err.stack,
        status: err.status,
        method: req.method,
        path: req.path,
        body: req.body,
        params: req.params,
        query: req.query
      },
      timestamp: new Date().toISOString()
    }
  }).catch(error => {
    console.error('Failed to log error:', error);
  });
  
  next(err);
};

/**
 * Data export audit middleware
 */
const dataExportAudit = (exportType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      logAdminEvent(
        'data_export',
        req.user?.userId || null,
        `export_${exportType}`,
        `data_export_${exportType}`,
        {
          oldValue: null,
          newValue: {
            exportType,
            recordCount: data.logs?.length || data.data?.length || 0,
            filters: req.query
          }
        },
        req,
        {
          success: res.statusCode < 400,
          errorMessage: data.message || null,
          severity: 'medium',
          metadata: {
            exportType,
            recordCount: data.logs?.length || data.data?.length || 0,
            filters: req.query,
            timestamp: new Date().toISOString()
          }
        }
      ).catch(error => {
        console.error('Failed to log data export event:', error);
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Configuration change audit middleware
 */
const configAudit = (configType) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
      createAuditLog({
        category: AUDIT_CATEGORIES.CONFIGURATION,
        eventType: AUDIT_EVENTS.CONFIGURATION_CHANGED,
        userId: req.user?.userId || null,
        action: `configuration_change_${configType}`,
        resource: `config_${configType}`,
        oldValue: req.body.oldValue || null,
        newValue: req.body.newValue || req.body,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        sessionId: req.session?.id || null,
        requestId: req.id || null,
        success: res.statusCode < 400,
        errorMessage: data.message || null,
        severity: 'medium',
        metadata: {
          configType,
          changes: req.body,
          timestamp: new Date().toISOString()
        }
      }).catch(error => {
        console.error('Failed to log configuration change:', error);
      });
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Manual audit logging helper
 */
const logAudit = async (auditData) => {
  try {
    return await createAuditLog(auditData);
  } catch (error) {
    console.error('Failed to log audit:', error);
    throw error;
  }
};

/**
 * Batch audit logging helper
 */
const logBatchAudit = async (auditDataArray) => {
  try {
    const results = [];
    for (const auditData of auditDataArray) {
      try {
        const result = await createAuditLog(auditData);
        results.push({ success: true, auditId: result.auditId });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  } catch (error) {
    console.error('Failed to log batch audit:', error);
    throw error;
  }
};

module.exports = {
  // Middleware functions
  requestId,
  requestLogger,
  authAudit,
  userAudit,
  electionAudit,
  votingAudit,
  adminAudit,
  securityAudit,
  errorAudit,
  dataExportAudit,
  configAudit,
  
  // Helper functions
  logAudit,
  logBatchAudit,
  
  // Event types for easy reference
  AUTH_EVENTS: {
    LOGIN: 'user_login',
    LOGOUT: 'user_logout',
    LOGIN_FAILED: 'login_failed',
    PASSWORD_CHANGE: 'password_change',
    PASSWORD_RESET: 'password_reset'
  },
  
  USER_EVENTS: {
    CREATED: 'user_created',
    UPDATED: 'user_updated',
    DELETED: 'user_deleted',
    SUSPENDED: 'user_suspended',
    REACTIVATED: 'user_reactivated',
    ROLE_CHANGED: 'role_changed'
  },
  
  ELECTION_EVENTS: {
    CREATED: 'election_created',
    UPDATED: 'election_updated',
    DELETED: 'election_deleted',
    STARTED: 'election_started',
    ENDED: 'election_ended',
    PUBLISHED: 'election_published',
    ARCHIVED: 'election_archived'
  },
  
  VOTING_EVENTS: {
    CAST: 'vote_cast',
    DELETED: 'vote_deleted',
    VERIFIED: 'vote_verified',
    VERIFICATION_FAILED: 'vote_verification_failed',
    VERIFICATION_RESENT: 'vote_verification_resent'
  },
  
  SECURITY_EVENTS: {
    BREACH: 'security_breach',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    IP_BLOCKED: 'ip_blocked',
    IP_UNBLOCKED: 'ip_unblocked',
    INVESTIGATION: 'security_investigation'
  }
};
