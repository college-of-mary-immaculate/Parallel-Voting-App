const crypto = require('crypto');
const { query } = require('../config/mockDatabase');

/**
 * Comprehensive Audit Logging System
 * Provides complete audit trails for all important actions and changes
 * in the voting system with tamper-evidence and compliance features
 */

// Audit log configuration
const AUDIT_CONFIG = {
  logRetention: 365 * 24 * 60 * 60 * 1000, // 1 year
  batchSize: 100,
  compressionEnabled: true,
  encryptionEnabled: false, // Can be enabled for sensitive data
  checksumEnabled: true,
  backupInterval: 24 * 60 * 60 * 1000, // 24 hours
  alertThresholds: {
    failedLogins: 5,
    suspiciousActivity: 10,
    systemErrors: 3
  }
};

// Audit event categories
const AUDIT_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  USER_MANAGEMENT: 'user_management',
  ELECTION_MANAGEMENT: 'election_management',
  CANDIDATE_MANAGEMENT: 'candidate_management',
  VOTING: 'voting',
  VOTE_VERIFICATION: 'vote_verification',
  SYSTEM: 'system',
  SECURITY: 'security',
  ADMIN: 'admin',
  DATA_EXPORT: 'data_export',
  CONFIGURATION: 'configuration',
  EMAIL: 'email',
  API: 'api'
};

// Audit event types
const AUDIT_EVENTS = {
  // Authentication events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET: 'password_reset',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  
  // User management events
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_SUSPENDED: 'user_suspended',
  USER_REACTIVATED: 'user_reactivated',
  ROLE_CHANGED: 'role_changed',
  
  // Election management events
  ELECTION_CREATED: 'election_created',
  ELECTION_UPDATED: 'election_updated',
  ELECTION_DELETED: 'election_deleted',
  ELECTION_STARTED: 'election_started',
  ELECTION_ENDED: 'election_ended',
  ELECTION_PUBLISHED: 'election_published',
  ELECTION_ARCHIVED: 'election_archived',
  
  // Candidate management events
  CANDIDATE_CREATED: 'candidate_created',
  CANDIDATE_UPDATED: 'candidate_updated',
  CANDIDATE_DELETED: 'candidate_deleted',
  CANDIDATE_WITHDRAWN: 'candidate_withdrawn',
  
  // Voting events
  VOTE_CAST: 'vote_cast',
  VOTE_DELETED: 'vote_deleted',
  VOTE_VERIFIED: 'vote_verified',
  VOTE_VERIFICATION_FAILED: 'vote_verification_failed',
  VOTE_VERIFICATION_RESENT: 'vote_verification_resent',
  
  // System events
  SYSTEM_START: 'system_start',
  SYSTEM_SHUTDOWN: 'system_shutdown',
  SYSTEM_ERROR: 'system_error',
  SYSTEM_BACKUP: 'system_backup',
  SYSTEM_RESTORE: 'system_restore',
  CONFIGURATION_CHANGED: 'configuration_changed',
  
  // Security events
  SECURITY_BREACH: 'security_breach',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  IP_BLOCKED: 'ip_blocked',
  IP_UNBLOCKED: 'ip_unblocked',
  SECURITY_INVESTIGATION: 'security_investigation',
  
  // Admin events
  ADMIN_LOGIN: 'admin_login',
  ADMIN_LOGOUT: 'admin_logout',
  PRIVILEGED_ACTION: 'privileged_action',
  DATA_EXPORT: 'data_export',
  AUDIT_REVIEWED: 'audit_reviewed',
  
  // Email events
  EMAIL_SENT: 'email_sent',
  EMAIL_FAILED: 'email_failed',
  EMAIL_BOUNCED: 'email_bounced',
  
  // API events
  API_ACCESS: 'api_access',
  API_ERROR: 'api_error',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded'
};

/**
 * Generate unique audit log ID
 */
const generateAuditId = () => {
  return `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

/**
 * Generate checksum for tamper detection
 */
const generateChecksum = (data) => {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

/**
 * Get client information from request
 */
const getClientInfo = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
              (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
              req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
              req.headers['x-real-ip'] ||
              'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    referer: req.headers['referer'] || 'unknown',
    timestamp: new Date().toISOString()
  };
};

/**
 * Create audit log entry
 */
const createAuditLog = async (eventData) => {
  try {
    const auditId = generateAuditId();
    const timestamp = new Date();
    
    // Prepare log data
    const logData = {
      auditId,
      category: eventData.category || 'system',
      eventType: eventData.eventType,
      userId: eventData.userId || null,
      electionId: eventData.electionId || null,
      candidateId: eventData.candidateId || null,
      voteId: eventData.voteId || null,
      action: eventData.action || '',
      resource: eventData.resource || '',
      oldValue: eventData.oldValue ? JSON.stringify(eventData.oldValue) : null,
      newValue: eventData.newValue ? JSON.stringify(eventData.newValue) : null,
      ipAddress: eventData.ipAddress || 'unknown',
      userAgent: eventData.userAgent || 'unknown',
      sessionId: eventData.sessionId || null,
      requestId: eventData.requestId || null,
      success: eventData.success !== false,
      errorMessage: eventData.errorMessage || null,
      severity: eventData.severity || 'info',
      metadata: eventData.metadata ? JSON.stringify(eventData.metadata) : null,
      checksum: null, // Will be calculated after data is prepared
      createdAt: timestamp
    };

    // Generate checksum for tamper detection
    if (AUDIT_CONFIG.checksumEnabled) {
      const checksumData = { ...logData };
      delete checksumData.checksum;
      logData.checksum = generateChecksum(checksumData);
    }

    // Insert into database
    await query(`
      INSERT INTO AuditLog (
        auditId, category, eventType, userId, electionId, candidateId, voteId,
        action, resource, oldValue, newValue, ipAddress, userAgent, sessionId,
        requestId, success, errorMessage, severity, metadata, checksum, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      logData.auditId,
      logData.category,
      logData.eventType,
      logData.userId,
      logData.electionId,
      logData.candidateId,
      logData.voteId,
      logData.action,
      logData.resource,
      logData.oldValue,
      logData.newValue,
      logData.ipAddress,
      logData.userAgent,
      logData.sessionId,
      logData.requestId,
      logData.success,
      logData.errorMessage,
      logData.severity,
      logData.metadata,
      logData.checksum,
      logData.createdAt
    ]);

    // Check for alert conditions
    await checkAlertConditions(logData);

    return {
      success: true,
      auditId: logData.auditId,
      timestamp: logData.createdAt
    };
  } catch (error) {
    console.error('Failed to create audit log:', error);
    throw new Error(`Audit logging failed: ${error.message}`);
  }
};

/**
 * Log authentication events
 */
const logAuthEvent = async (eventType, userId, req, additionalData = {}) => {
  const clientInfo = getClientInfo(req);
  
  return await createAuditLog({
    category: AUDIT_CATEGORIES.AUTHENTICATION,
    eventType,
    userId,
    action: eventType.replace('_', ' '),
    resource: 'user_account',
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    sessionId: req.session?.id || null,
    requestId: req.id || null,
    success: additionalData.success !== false,
    errorMessage: additionalData.errorMessage || null,
    severity: additionalData.severity || 'info',
    metadata: additionalData.metadata || null
  });
};

/**
 * Log user management events
 */
const logUserEvent = async (eventType, userId, targetUserId, changes, req, additionalData = {}) => {
  const clientInfo = getClientInfo(req);
  
  return await createAuditLog({
    category: AUDIT_CATEGORIES.USER_MANAGEMENT,
    eventType,
    userId,
    action: eventType.replace('_', ' '),
    resource: `user:${targetUserId}`,
    oldValue: changes.oldValue || null,
    newValue: changes.newValue || null,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    sessionId: req.session?.id || null,
    requestId: req.id || null,
    success: additionalData.success !== false,
    errorMessage: additionalData.errorMessage || null,
    severity: additionalData.severity || 'info',
    metadata: {
      targetUserId,
      ...additionalData.metadata
    }
  });
};

/**
 * Log election management events
 */
const logElectionEvent = async (eventType, userId, electionId, changes, req, additionalData = {}) => {
  const clientInfo = getClientInfo(req);
  
  return await createAuditLog({
    category: AUDIT_CATEGORIES.ELECTION_MANAGEMENT,
    eventType,
    userId,
    electionId,
    action: eventType.replace('_', ' '),
    resource: `election:${electionId}`,
    oldValue: changes.oldValue || null,
    newValue: changes.newValue || null,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    sessionId: req.session?.id || null,
    requestId: req.id || null,
    success: additionalData.success !== false,
    errorMessage: additionalData.errorMessage || null,
    severity: additionalData.severity || 'info',
    metadata: {
      electionTitle: changes.electionTitle || null,
      ...additionalData.metadata
    }
  });
};

/**
 * Log voting events
 */
const logVotingEvent = async (eventType, userId, electionId, candidateId, voteId, req, additionalData = {}) => {
  const clientInfo = getClientInfo(req);
  
  return await createAuditLog({
    category: AUDIT_CATEGORIES.VOTING,
    eventType,
    userId,
    electionId,
    candidateId,
    voteId,
    action: eventType.replace('_', ' '),
    resource: `vote:${voteId}`,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    sessionId: req.session?.id || null,
    requestId: req.id || null,
    success: additionalData.success !== false,
    errorMessage: additionalData.errorMessage || null,
    severity: additionalData.severity || 'info',
    metadata: additionalData.metadata || null
  });
};

/**
 * Log security events
 */
const logSecurityEvent = async (eventType, userId, details, req, additionalData = {}) => {
  const clientInfo = getClientInfo(req);
  
  return await createAuditLog({
    category: AUDIT_CATEGORIES.SECURITY,
    eventType,
    userId,
    action: eventType.replace('_', ' '),
    resource: 'security',
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    sessionId: req.session?.id || null,
    requestId: req.id || null,
    success: additionalData.success !== false,
    errorMessage: additionalData.errorMessage || null,
    severity: additionalData.severity || 'medium',
    metadata: {
      securityDetails: details,
      ...additionalData.metadata
    }
  });
};

/**
 * Log system events
 */
const logSystemEvent = async (eventType, details, additionalData = {}) => {
  return await createAuditLog({
    category: AUDIT_CATEGORIES.SYSTEM,
    eventType,
    userId: null,
    action: eventType.replace('_', ' '),
    resource: 'system',
    ipAddress: 'system',
    userAgent: 'system',
    sessionId: null,
    requestId: null,
    success: additionalData.success !== false,
    errorMessage: additionalData.errorMessage || null,
    severity: additionalData.severity || 'info',
    metadata: {
      systemDetails: details,
      ...additionalData.metadata
    }
  });
};

/**
 * Log admin events
 */
const logAdminEvent = async (eventType, userId, action, resource, details, req, additionalData = {}) => {
  const clientInfo = getClientInfo(req);
  
  return await createAuditLog({
    category: AUDIT_CATEGORIES.ADMIN,
    eventType,
    userId,
    action,
    resource,
    oldValue: details.oldValue || null,
    newValue: details.newValue || null,
    ipAddress: clientInfo.ipAddress,
    userAgent: clientInfo.userAgent,
    sessionId: req.session?.id || null,
    requestId: req.id || null,
    success: additionalData.success !== false,
    errorMessage: additionalData.errorMessage || null,
    severity: additionalData.severity || 'medium',
    metadata: {
      adminDetails: details,
      ...additionalData.metadata
    }
  });
};

/**
 * Get audit logs with filtering
 */
const getAuditLogs = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 50,
      category = '',
      eventType = '',
      userId = '',
      electionId = '',
      candidateId = '',
      voteId = '',
      severity = '',
      success = '',
      startDate = '',
      endDate = '',
      ipAddress = '',
      searchString = ''
    } = filters;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (category) {
      whereClause += ` AND category = ?`;
      params.push(category);
    }

    if (eventType) {
      whereClause += ` AND eventType = ?`;
      params.push(eventType);
    }

    if (userId) {
      whereClause += ` AND userId = ?`;
      params.push(userId);
    }

    if (electionId) {
      whereClause += ` AND electionId = ?`;
      params.push(electionId);
    }

    if (candidateId) {
      whereClause += ` AND candidateId = ?`;
      params.push(candidateId);
    }

    if (voteId) {
      whereClause += ` AND voteId = ?`;
      params.push(voteId);
    }

    if (severity) {
      whereClause += ` AND severity = ?`;
      params.push(severity);
    }

    if (success !== '') {
      whereClause += ` AND success = ?`;
      params.push(success === 'true');
    }

    if (startDate) {
      whereClause += ` AND createdAt >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND createdAt <= ?`;
      params.push(endDate);
    }

    if (ipAddress) {
      whereClause += ` AND ipAddress = ?`;
      params.push(ipAddress);
    }

    if (searchString) {
      whereClause += ` AND (action LIKE ? OR resource LIKE ? OR errorMessage LIKE ?)`;
      const searchPattern = `%${searchString}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    // Get audit logs with user details
    const logs = await query(`
      SELECT 
        al.*,
        u.email as userEmail,
        u.firstName,
        u.lastName,
        e.title as electionTitle,
        c.name as candidateName
      FROM AuditLog al
      LEFT JOIN User u ON al.userId = u.userId
      LEFT JOIN Election e ON al.electionId = e.electionId
      LEFT JOIN Candidate c ON al.candidateId = c.candidateId
      ${whereClause}
      ORDER BY al.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count for pagination
    const totalCount = await query(`
      SELECT COUNT(*) as count
      FROM AuditLog al
      ${whereClause}
    `, params);

    return {
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit)
      },
      filters
    };
  } catch (error) {
    throw new Error(`Failed to get audit logs: ${error.message}`);
  }
};

/**
 * Get audit statistics
 */
const getAuditStatistics = async (timeframe = '24h') => {
  try {
    let timeCondition = '';
    switch (timeframe) {
      case '1h':
        timeCondition = 'WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)';
        break;
      case '24h':
        timeCondition = 'WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
        break;
      case '7d':
        timeCondition = 'WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        timeCondition = 'WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      default:
        timeCondition = '';
    }

    // Event type statistics
    const eventStats = await query(`
      SELECT 
        eventType,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE success = 1) as successful,
        COUNT(*) FILTER (WHERE success = 0) as failed,
        COUNT(*) FILTER (WHERE severity = 'high') as highSeverity,
        COUNT(*) FILTER (WHERE severity = 'medium') as mediumSeverity,
        COUNT(*) FILTER (WHERE severity = 'low') as lowSeverity
      FROM AuditLog
      ${timeCondition}
      GROUP BY eventType
      ORDER BY count DESC
    `);

    // Category statistics
    const categoryStats = await query(`
      SELECT 
        category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE success = 1) as successful,
        COUNT(*) FILTER (WHERE success = 0) as failed
      FROM AuditLog
      ${timeCondition}
      GROUP BY category
      ORDER BY count DESC
    `);

    // Overall statistics
    const overallStats = await query(`
      SELECT 
        COUNT(*) as totalEvents,
        COUNT(*) FILTER (WHERE success = 1) as successful,
        COUNT(*) FILTER (WHERE success = 0) as failed,
        COUNT(*) FILTER (WHERE severity = 'high') as highSeverity,
        COUNT(*) FILTER (WHERE severity = 'medium') as mediumSeverity,
        COUNT(*) FILTER (WHERE severity = 'low') as lowSeverity,
        COUNT(DISTINCT userId) as uniqueUsers,
        COUNT(DISTINCT ipAddress) as uniqueIPs
      FROM AuditLog
      ${timeCondition}
    `);

    // Top users by activity
    const topUsers = await query(`
      SELECT 
        userId,
        COUNT(*) as activityCount,
        u.email,
        u.firstName,
        u.lastName
      FROM AuditLog al
      LEFT JOIN User u ON al.userId = u.userId
      ${timeCondition}
      WHERE al.userId IS NOT NULL
      GROUP BY al.userId, u.email, u.firstName, u.lastName
      ORDER BY activityCount DESC
      LIMIT 10
    `);

    // Top IP addresses by activity
    const topIPs = await query(`
      SELECT 
        ipAddress,
        COUNT(*) as activityCount
      FROM AuditLog
      ${timeCondition}
      WHERE ipAddress != 'system'
      GROUP BY ipAddress
      ORDER BY activityCount DESC
      LIMIT 10
    `);

    return {
      success: true,
      statistics: {
        byEventType: eventStats,
        byCategory: categoryStats,
        overall: overallStats[0] || {},
        topUsers,
        topIPs,
        timeframe
      }
    };
  } catch (error) {
    throw new Error(`Failed to get audit statistics: ${error.message}`);
  }
};

/**
 * Verify audit log integrity
 */
const verifyAuditIntegrity = async (auditId) => {
  try {
    const log = await query(
      'SELECT * FROM AuditLog WHERE auditId = ?',
      [auditId]
    );

    if (log.length === 0) {
      return { valid: false, reason: 'Audit log not found' };
    }

    const logData = log[0];
    const expectedChecksum = logData.checksum;

    if (!expectedChecksum) {
      return { valid: true, reason: 'Checksum not enabled for this log' };
    }

    // Recalculate checksum
    const checksumData = { ...logData };
    delete checksumData.checksum;
    const calculatedChecksum = generateChecksum(checksumData);

    const isValid = expectedChecksum === calculatedChecksum;

    return {
      valid: isValid,
      reason: isValid ? 'Checksum verified' : 'Checksum mismatch - possible tampering',
      expectedChecksum,
      calculatedChecksum
    };
  } catch (error) {
    throw new Error(`Failed to verify audit integrity: ${error.message}`);
  }
};

/**
 * Check for alert conditions
 */
const checkAlertConditions = async (logData) => {
  try {
    // Check for failed login attempts
    if (logData.eventType === AUDIT_EVENTS.LOGIN_FAILED) {
      const recentFailures = await query(`
        SELECT COUNT(*) as count 
        FROM AuditLog 
        WHERE eventType = ? 
          AND ipAddress = ? 
          AND createdAt >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
      `, [AUDIT_EVENTS.LOGIN_FAILED, logData.ipAddress]);

      if (recentFailures[0].count >= AUDIT_CONFIG.alertThresholds.failedLogins) {
        await createAuditLog({
          category: AUDIT_CATEGORIES.SECURITY,
          eventType: 'multiple_failed_logins',
          userId: null,
          action: 'Multiple failed login attempts detected',
          resource: 'security',
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent,
          severity: 'high',
          metadata: {
            failureCount: recentFailures[0].count,
            timeWindow: '15 minutes',
            targetIP: logData.ipAddress
          }
        });
      }
    }

    // Check for suspicious activity patterns
    if (logData.category === AUDIT_CATEGORIES.SECURITY) {
      const recentSecurityEvents = await query(`
        SELECT COUNT(*) as count 
        FROM AuditLog 
        WHERE category = ? 
          AND ipAddress = ? 
          AND createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
      `, [AUDIT_CATEGORIES.SECURITY, logData.ipAddress]);

      if (recentSecurityEvents[0].count >= AUDIT_CONFIG.alertThresholds.suspiciousActivity) {
        await createAuditLog({
          category: AUDIT_CATEGORIES.SECURITY,
          eventType: 'suspicious_activity_spike',
          userId: null,
          action: 'Suspicious activity spike detected',
          resource: 'security',
          ipAddress: logData.ipAddress,
          userAgent: logData.userAgent,
          severity: 'high',
          metadata: {
            eventCount: recentSecurityEvents[0].count,
            timeWindow: '1 hour',
            targetIP: logData.ipAddress
          }
        });
      }
    }

    // Check for system errors
    if (logData.eventType === AUDIT_EVENTS.SYSTEM_ERROR) {
      const recentErrors = await query(`
        SELECT COUNT(*) as count 
        FROM AuditLog 
        WHERE eventType = ? 
          AND createdAt >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
      `, [AUDIT_EVENTS.SYSTEM_ERROR]);

      if (recentErrors[0].count >= AUDIT_CONFIG.alertThresholds.systemErrors) {
        await createAuditLog({
          category: AUDIT_CATEGORIES.SYSTEM,
          eventType: 'system_error_spike',
          userId: null,
          action: 'System error spike detected',
          resource: 'system',
          severity: 'high',
          metadata: {
            errorCount: recentErrors[0].count,
            timeWindow: '5 minutes'
          }
        });
      }
    }
  } catch (error) {
    console.error('Failed to check alert conditions:', error);
  }
};

/**
 * Export audit logs
 */
const exportAuditLogs = async (filters = {}, format = 'json') => {
  try {
    // Get all logs matching filters (no pagination for export)
    const exportFilters = { ...filters, page: 1, limit: 10000 };
    const logs = await getAuditLogs(exportFilters);

    // Add export metadata
    const exportData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        exportedBy: filters.exportedBy || null,
        format,
        totalRecords: logs.logs.length,
        filters: exportFilters
      },
      logs: logs.logs
    };

    return {
      success: true,
      data: exportData,
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`
    };
  } catch (error) {
    throw new Error(`Failed to export audit logs: ${error.message}`);
  }
};

/**
 * Cleanup old audit logs
 */
const cleanupAuditLogs = async () => {
  try {
    const cutoffDate = new Date(Date.now() - AUDIT_CONFIG.logRetention);
    
    const result = await query(
      'DELETE FROM AuditLog WHERE createdAt < ?',
      [cutoffDate]
    );

    await createAuditLog({
      category: AUDIT_CATEGORIES.SYSTEM,
      eventType: 'audit_cleanup',
      userId: null,
      action: 'Old audit logs cleanup',
      resource: 'system',
      severity: 'info',
      metadata: {
        deletedCount: result.affectedRows,
        cutoffDate: cutoffDate.toISOString()
      }
    });

    return {
      success: true,
      deletedCount: result.affectedRows,
      cutoffDate: cutoffDate.toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to cleanup audit logs: ${error.message}`);
  }
};

module.exports = {
  createAuditLog,
  logAuthEvent,
  logUserEvent,
  logElectionEvent,
  logVotingEvent,
  logSecurityEvent,
  logSystemEvent,
  logAdminEvent,
  getAuditLogs,
  getAuditStatistics,
  verifyAuditIntegrity,
  exportAuditLogs,
  cleanupAuditLogs,
  AUDIT_CATEGORIES,
  AUDIT_EVENTS,
  AUDIT_CONFIG,
  generateAuditId,
  getClientInfo
};
