const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const {
  getAuditLogs,
  getAuditStatistics,
  verifyAuditIntegrity,
  exportAuditLogs,
  cleanupAuditLogs,
  AUDIT_CATEGORIES,
  AUDIT_EVENTS
} = require('../utils/auditLogger');

const router = express.Router();

// GET /api/audit/logs - Get audit logs with filtering (admin only)
router.get('/logs', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      category: req.query.category || '',
      eventType: req.query.eventType || '',
      userId: req.query.userId || '',
      electionId: req.query.electionId || '',
      candidateId: req.query.candidateId || '',
      voteId: req.query.voteId || '',
      severity: req.query.severity || '',
      success: req.query.success || '',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      ipAddress: req.query.ipAddress || '',
      searchString: req.query.search || ''
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 200) filters.limit = 50;

    // Validate dates
    if (filters.startDate && !validator.isDate(filters.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (filters.endDate && !validator.isDate(filters.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format'
      });
    }

    // Validate IDs
    if (filters.userId && !validator.isInt(filters.userId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (filters.electionId && !validator.isInt(filters.electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    if (filters.candidateId && !validator.isInt(filters.candidateId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID'
      });
    }

    if (filters.voteId && !validator.isUUID(filters.voteId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote ID format'
      });
    }

    // Validate severity
    if (filters.severity && !['low', 'medium', 'high'].includes(filters.severity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid severity level. Must be: low, medium, or high'
      });
    }

    // Validate success
    if (filters.success && !['true', 'false'].includes(filters.success)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid success value. Must be: true or false'
      });
    }

    // Validate IP address
    if (filters.ipAddress && !validator.isIP(filters.ipAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format'
      });
    }

    const logs = await getAuditLogs(filters);

    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/audit/statistics - Get audit statistics (admin only)
router.get('/statistics', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '24h';

    if (!['1h', '24h', '7d', '30d'].includes(timeframe)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid timeframe. Must be: 1h, 24h, 7d, or 30d'
      });
    }

    const statistics = await getAuditStatistics(timeframe);

    res.json({
      success: true,
      message: 'Audit statistics retrieved successfully',
      data: statistics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get audit statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/audit/integrity/:auditId - Verify audit log integrity (admin only)
router.get('/integrity/:auditId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const auditId = req.params.auditId;

    if (!auditId || !auditId.startsWith('AUD-')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid audit ID format'
      });
    }

    const integrity = await verifyAuditIntegrity(auditId);

    res.json({
      success: true,
      message: 'Audit integrity check completed',
      data: integrity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Verify audit integrity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify audit integrity',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/audit/export - Export audit logs (admin only)
router.post('/export', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { format = 'json', filters = {} } = req.body;

    if (!['json', 'csv', 'xml'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Must be: json, csv, or xml'
      });
    }

    // Validate filters
    const validatedFilters = {
      ...filters,
      page: 1,
      limit: 10000,
      exportedBy: req.user.userId
    };

    // Validate date filters
    if (validatedFilters.startDate && !validator.isDate(validatedFilters.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (validatedFilters.endDate && !validator.isDate(validatedFilters.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format'
      });
    }

    const exportResult = await exportAuditLogs(validatedFilters, format);

    res.json({
      success: true,
      message: 'Audit logs exported successfully',
      data: exportResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/audit/cleanup - Cleanup old audit logs (admin only)
router.post('/cleanup', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { retentionDays } = req.body;

    if (retentionDays && (!validator.isInt(retentionDays.toString(), { min: 30, max: 1095 }) || retentionDays < 30 || retentionDays > 1095)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid retention days. Must be between 30 and 1095 days'
      });
    }

    const cleanupResult = await cleanupAuditLogs();

    res.json({
      success: true,
      message: 'Audit logs cleanup completed',
      data: cleanupResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cleanup audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup audit logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/audit/categories - Get available audit categories (admin only)
router.get('/categories', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const categories = Object.entries(AUDIT_CATEGORIES).map(([key, value]) => ({
      key,
      value,
      description: getCategoryDescription(value)
    }));

    res.json({
      success: true,
      message: 'Audit categories retrieved successfully',
      data: categories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get audit categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/audit/events - Get available audit event types (admin only)
router.get('/events', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const category = req.query.category;

    let events = Object.entries(AUDIT_EVENTS);
    
    if (category && Object.values(AUDIT_CATEGORIES).includes(category)) {
      // Filter events by category (this would need category mapping in a real implementation)
      events = events.filter(([key, value]) => 
        value.startsWith(category.split('_')[0].toLowerCase())
      );
    }

    const eventTypes = events.map(([key, value]) => ({
      key,
      value,
      description: getEventDescription(value)
    }));

    res.json({
      success: true,
      message: 'Audit event types retrieved successfully',
      data: eventTypes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get audit events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit event types',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/audit/dashboard - Audit dashboard overview (admin only)
router.get('/dashboard', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    // Get statistics for different timeframes
    const [stats1h, stats24h, stats7d, stats30d] = await Promise.all([
      getAuditStatistics('1h'),
      getAuditStatistics('24h'),
      getAuditStatistics('7d'),
      getAuditStatistics('30d')
    ]);

    // Get recent high-severity events
    const recentHighSeverity = await getAuditLogs({
      severity: 'high',
      limit: 10,
      page: 1
    });

    // Get recent failed events
    const recentFailures = await getAuditLogs({
      success: 'false',
      limit: 10,
      page: 1
    });

    // Get top users by activity
    const topUsers = stats24h.statistics.topUsers || [];

    // Get top IPs by activity
    const topIPs = stats24h.statistics.topIPs || [];

    // Calculate health metrics
    const totalEvents24h = stats24h.statistics.overall.totalEvents || 0;
    const failedEvents24h = stats24h.statistics.overall.failed || 0;
    const highSeverity24h = stats24h.statistics.overall.highSeverity || 0;
    
    const successRate = totalEvents24h > 0 ? ((totalEvents24h - failedEvents24h) / totalEvents24h * 100) : 100;
    const healthScore = Math.max(0, 100 - (highSeverity24h / totalEvents24h * 100) - (failedEvents24h / totalEvents24h * 50));

    res.json({
      success: true,
      message: 'Audit dashboard data retrieved successfully',
      data: {
        overview: {
          totalEvents24h,
          failedEvents24h,
          highSeverity24h,
          successRate: Math.round(successRate * 100) / 100,
          healthScore: Math.round(healthScore * 100) / 100,
          status: healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : healthScore >= 50 ? 'warning' : 'critical'
        },
        statistics: {
          '1h': stats1h.statistics,
          '24h': stats24h.statistics,
          '7d': stats7d.statistics,
          '30d': stats30d.statistics
        },
        recentHighSeverity: recentHighSeverity.logs || [],
        recentFailures: recentFailures.logs || [],
        topUsers,
        topIPs
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get audit dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/audit/timeline - Get audit timeline for specific resource (admin only)
router.get('/timeline', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { resourceType, resourceId, startDate, endDate } = req.query;

    if (!resourceType || !resourceId) {
      return res.status(400).json({
        success: false,
        message: 'Resource type and resource ID are required'
      });
    }

    const validResourceTypes = ['user', 'election', 'candidate', 'vote'];
    if (!validResourceTypes.includes(resourceType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid resource type. Must be one of: ${validResourceTypes.join(', ')}`
      });
    }

    // Validate resource ID based on type
    if (resourceType !== 'vote' && !validator.isInt(resourceId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resource ID format'
      });
    }

    if (resourceType === 'vote' && !validator.isUUID(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote ID format'
      });
    }

    // Validate dates
    if (startDate && !validator.isDate(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (endDate && !validator.isDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format'
      });
    }

    // Build filters based on resource type
    const filters = {
      startDate: startDate || '',
      endDate: endDate || '',
      page: 1,
      limit: 100
    };

    switch (resourceType) {
      case 'user':
        filters.userId = resourceId;
        break;
      case 'election':
        filters.electionId = resourceId;
        break;
      case 'candidate':
        filters.candidateId = resourceId;
        break;
      case 'vote':
        filters.voteId = resourceId;
        break;
    }

    const timeline = await getAuditLogs(filters);

    res.json({
      success: true,
      message: 'Audit timeline retrieved successfully',
      data: {
        resourceType,
        resourceId,
        timeline: timeline.logs,
        summary: {
          totalEvents: timeline.logs.length,
          successful: timeline.logs.filter(log => log.success).length,
          failed: timeline.logs.filter(log => !log.success).length,
          highSeverity: timeline.logs.filter(log => log.severity === 'high').length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get audit timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit timeline',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/audit/compliance-report - Generate compliance report (admin only)
router.get('/compliance-report', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, reportType = 'summary' } = req.query;

    // Validate dates
    if (startDate && !validator.isDate(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format'
      });
    }

    if (endDate && !validator.isDate(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format'
      });
    }

    if (!['summary', 'detailed', 'security'].includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Must be: summary, detailed, or security'
      });
    }

    // Get audit logs for the period
    const filters = {
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: endDate || new Date().toISOString().split('T')[0],
      page: 1,
      limit: 10000
    };

    const logs = await getAuditLogs(filters);

    // Generate compliance report
    const report = {
      reportInfo: {
        generatedAt: new Date().toISOString(),
        generatedBy: req.user.userId,
        reportType,
        period: {
          startDate: filters.startDate,
          endDate: filters.endDate
        },
        totalRecords: logs.logs.length
      },
      summary: {
        totalEvents: logs.logs.length,
        successfulEvents: logs.logs.filter(log => log.success).length,
        failedEvents: logs.logs.filter(log => !log.success).length,
        highSeverityEvents: logs.logs.filter(log => log.severity === 'high').length,
        mediumSeverityEvents: logs.logs.filter(log => log.severity === 'medium').length,
        lowSeverityEvents: logs.logs.filter(log => log.severity === 'low').length,
        uniqueUsers: new Set(logs.logs.filter(log => log.userId).map(log => log.userId)).size,
        uniqueIPs: new Set(logs.logs.filter(log => log.ipAddress !== 'system').map(log => log.ipAddress)).size
      },
      categories: {},
      topUsers: [],
      topIPs: [],
      securityEvents: [],
      complianceStatus: 'compliant'
    };

    // Analyze by category
    Object.values(AUDIT_CATEGORIES).forEach(category => {
      const categoryLogs = logs.logs.filter(log => log.category === category);
      report.categories[category] = {
        total: categoryLogs.length,
        successful: categoryLogs.filter(log => log.success).length,
        failed: categoryLogs.filter(log => !log.success).length,
        highSeverity: categoryLogs.filter(log => log.severity === 'high').length
      };
    });

    // Top users
    const userActivity = {};
    logs.logs.forEach(log => {
      if (log.userId) {
        userActivity[log.userId] = (userActivity[log.userId] || 0) + 1;
      }
    });
    report.topUsers = Object.entries(userActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, activityCount: count }));

    // Top IPs
    const ipActivity = {};
    logs.logs.forEach(log => {
      if (log.ipAddress !== 'system') {
        ipActivity[log.ipAddress] = (ipActivity[log.ipAddress] || 0) + 1;
      }
    });
    report.topIPs = Object.entries(ipActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([ipAddress, count]) => ({ ipAddress, activityCount: count }));

    // Security events
    report.securityEvents = logs.logs.filter(log => log.category === AUDIT_CATEGORIES.SECURITY);

    // Determine compliance status
    const failureRate = report.summary.failedEvents / report.summary.totalEvents;
    const highSecurityRate = report.securityEvents.length / report.summary.totalEvents;
    
    if (failureRate > 0.1 || highSecurityRate > 0.05) {
      report.complianceStatus = 'non_compliant';
    } else if (failureRate > 0.05 || highSecurityRate > 0.02) {
      report.complianceStatus = 'warning';
    }

    // Add detailed data if requested
    if (reportType === 'detailed') {
      report.detailedLogs = logs.logs;
    }

    // Add security focus if requested
    if (reportType === 'security') {
      report.securityAnalysis = {
        totalSecurityEvents: report.securityEvents.length,
        securityEventTypes: {},
        securitySeverityBreakdown: {
          high: report.securityEvents.filter(log => log.severity === 'high').length,
          medium: report.securityEvents.filter(log => log.severity === 'medium').length,
          low: report.securityEvents.filter(log => log.severity === 'low').length
        },
        suspiciousIPs: report.topIPs.filter(ip => ip.activityCount > 100),
        recommendations: generateSecurityRecommendations(report)
      };

      // Analyze security event types
      report.securityEvents.forEach(log => {
        report.securityAnalysis.securityEventTypes[log.eventType] = 
          (report.securityAnalysis.securityEventTypes[log.eventType] || 0) + 1;
      });
    }

    res.json({
      success: true,
      message: 'Compliance report generated successfully',
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Generate compliance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate compliance report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper functions
function getCategoryDescription(category) {
  const descriptions = {
    'authentication': 'User authentication and authorization events',
    'authorization': 'Access control and permission events',
    'user_management': 'User account creation, modification, and deletion',
    'election_management': 'Election creation, modification, and management',
    'candidate_management': 'Candidate registration and management',
    'voting': 'Vote casting, verification, and management',
    'vote_verification': 'Vote verification and security events',
    'system': 'System operations and maintenance events',
    'security': 'Security incidents and threat detection',
    'admin': 'Administrative actions and privileged operations',
    'data_export': 'Data export and download events',
    'configuration': 'System configuration changes',
    'email': 'Email communication events',
    'api': 'API access and usage events'
  };
  return descriptions[category] || category;
}

function getEventDescription(eventType) {
  const descriptions = {
    'user_login': 'User successfully logged in',
    'user_logout': 'User logged out',
    'login_failed': 'Failed login attempt',
    'password_change': 'User changed password',
    'password_reset': 'User reset password',
    'account_locked': 'User account was locked',
    'account_unlocked': 'User account was unlocked',
    'user_created': 'New user account created',
    'user_updated': 'User account updated',
    'user_deleted': 'User account deleted',
    'user_suspended': 'User account suspended',
    'user_reactivated': 'User account reactivated',
    'role_changed': 'User role changed',
    'election_created': 'New election created',
    'election_updated': 'Election details updated',
    'election_deleted': 'Election deleted',
    'election_started': 'Election started',
    'election_ended': 'Election ended',
    'election_published': 'Election published',
    'election_archived': 'Election archived',
    'candidate_created': 'New candidate registered',
    'candidate_updated': 'Candidate details updated',
    'candidate_deleted': 'Candidate removed',
    'candidate_withdrawn': 'Candidate withdrew from election',
    'vote_cast': 'Vote was cast',
    'vote_deleted': 'Vote was deleted',
    'vote_verified': 'Vote was successfully verified',
    'vote_verification_failed': 'Vote verification failed',
    'vote_verification_resent': 'Vote verification code resent',
    'system_start': 'System started',
    'system_shutdown': 'System shutdown',
    'system_error': 'System error occurred',
    'system_backup': 'System backup performed',
    'system_restore': 'System restored from backup',
    'configuration_changed': 'System configuration changed',
    'security_breach': 'Security breach detected',
    'suspicious_activity': 'Suspicious activity detected',
    'ip_blocked': 'IP address was blocked',
    'ip_unblocked': 'IP address was unblocked',
    'security_investigation': 'Security investigation initiated',
    'admin_login': 'Administrator logged in',
    'admin_logout': 'Administrator logged out',
    'privileged_action': 'Privileged administrative action performed',
    'data_export': 'Data was exported',
    'audit_reviewed': 'Audit logs were reviewed',
    'email_sent': 'Email sent successfully',
    'email_failed': 'Email delivery failed',
    'email_bounced': 'Email bounced',
    'api_access': 'API endpoint accessed',
    'api_error': 'API error occurred',
    'rate_limit_exceeded': 'API rate limit exceeded'
  };
  return descriptions[eventType] || eventType;
}

function generateSecurityRecommendations(report) {
  const recommendations = [];
  
  if (report.summary.highSeverityEvents > 0) {
    recommendations.push('Review and investigate all high-severity security events');
  }
  
  if (report.summary.failedEvents / report.summary.totalEvents > 0.1) {
    recommendations.push('High failure rate detected - review system performance and error handling');
  }
  
  const suspiciousIPs = report.topIPs.filter(ip => ip.activityCount > 100);
  if (suspiciousIPs.length > 0) {
    recommendations.push(`${suspiciousIPs.length} IP addresses showing unusual activity - consider investigation`);
  }
  
  if (report.securityEvents.length > report.summary.totalEvents * 0.05) {
    recommendations.push('High number of security events - review security measures and monitoring');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System appears to be operating normally - continue monitoring');
  }
  
  return recommendations;
}

module.exports = router;
