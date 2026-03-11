const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const {
  getSecurityEvents,
  getSecurityStatistics,
  blockSuspiciousIP,
  isIPBlocked
} = require('../utils/voteSecurity');

const router = express.Router();

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         'unknown';
};

// GET /api/security/events - Get security events (admin only)
router.get('/events', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      eventType: req.query.eventType || '',
      severity: req.query.severity || '',
      userId: req.query.userId || '',
      electionId: req.query.electionId || '',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || ''
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

    // Validate severity
    if (filters.severity && !['low', 'medium', 'high'].includes(filters.severity)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid severity level. Must be: low, medium, or high'
      });
    }

    const events = await getSecurityEvents(filters);

    res.json({
      success: true,
      message: 'Security events retrieved successfully',
      data: events,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get security events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/security/statistics - Get security statistics (admin only)
router.get('/statistics', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const statistics = await getSecurityStatistics();

    res.json({
      success: true,
      message: 'Security statistics retrieved successfully',
      data: statistics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get security statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/security/block-ip - Block suspicious IP (admin only)
router.post('/block-ip', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { ipAddress, reason, duration = 24 } = req.body;

    if (!ipAddress || !validator.isIP(ipAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Valid IP address is required'
      });
    }

    if (!reason || !validator.isLength(reason, { min: 5, max: 500 })) {
      return res.status(400).json({
        success: false,
        message: 'Reason is required (5-500 characters)'
      });
    }

    if (!validator.isInt(duration.toString(), { min: 1, max: 168 })) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 168 hours'
      });
    }

    const result = await blockSuspiciousIP(ipAddress, reason, duration);

    res.json({
      success: true,
      message: `IP ${ipAddress} has been blocked successfully`,
      data: {
        ipAddress,
        reason,
        duration,
        expiresAt: result.expiresAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block IP address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/security/check-ip/:ipAddress - Check if IP is blocked (admin only)
router.get('/check-ip/:ipAddress', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const ipAddress = req.params.ipAddress;

    if (!validator.isIP(ipAddress)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format'
      });
    }

    const isBlocked = await isIPBlocked(ipAddress);

    res.json({
      success: true,
      message: 'IP check completed',
      data: {
        ipAddress,
        isBlocked,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Check IP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check IP address',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/security/dashboard - Security dashboard overview (admin only)
router.get('/dashboard', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const statistics = await getSecurityStatistics();
    
    // Get recent high-severity events
    const recentHighSeverityEvents = await getSecurityEvents({
      severity: 'high',
      limit: 10,
      page: 1
    });

    // Get recent suspicious activity
    const recentSuspiciousActivity = await getSecurityEvents({
      eventType: 'suspicious_activity',
      limit: 10,
      page: 1
    });

    // Calculate security metrics
    const totalEvents = statistics.statistics.overall.totalEvents || 0;
    const highSeverityEvents = statistics.statistics.overall.highSeverity || 0;
    const last24hEvents = statistics.statistics.overall.last24h || 0;
    
    const securityScore = totalEvents > 0 ? Math.max(0, 100 - (highSeverityEvents / totalEvents * 100)) : 100;

    res.json({
      success: true,
      message: 'Security dashboard data retrieved successfully',
      data: {
        overview: {
          totalEvents,
          highSeverityEvents,
          last24hEvents,
          securityScore: Math.round(securityScore),
          status: securityScore >= 80 ? 'healthy' : securityScore >= 60 ? 'warning' : 'critical'
        },
        statistics: statistics.statistics,
        recentHighSeverityEvents: recentHighSeverityEvents.events || [],
        recentSuspiciousActivity: recentSuspiciousActivity.events || []
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/security/threats - Get current security threats (admin only)
router.get('/threats', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    // Get recent security events that indicate threats
    const threatEvents = await getSecurityEvents({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
      limit: 100,
      page: 1
    });

    // Analyze threats
    const threats = [];
    const ipCounts = {};
    const userAttempts = {};

    threatEvents.events?.forEach(event => {
      // Count events by IP
      if (event.ipAddress && event.ipAddress !== 'unknown') {
        ipCounts[event.ipAddress] = (ipCounts[event.ipAddress] || 0) + 1;
      }

      // Count failed verification attempts by user
      if (event.eventType === 'verification_failed' && event.userId) {
        userAttempts[event.userId] = (userAttempts[event.userId] || 0) + 1;
      }

      // Identify high-severity events
      if (event.severity === 'high') {
        threats.push({
          type: 'high_severity_event',
          severity: 'high',
          description: `High severity event: ${event.eventType}`,
          details: event.details,
          timestamp: event.createdAt,
          userId: event.userId,
          ipAddress: event.ipAddress
        });
      }
    });

    // Add IP-based threats
    Object.entries(ipCounts).forEach(([ip, count]) => {
      if (count >= 10) {
        threats.push({
          type: 'suspicious_ip_activity',
          severity: count >= 20 ? 'high' : 'medium',
          description: `Unusual activity from IP: ${count} events in 24 hours`,
          details: `IP ${ip} has generated ${count} security events`,
          ipAddress: ip,
          eventCount: count,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Add user-based threats
    Object.entries(userAttempts).forEach(([userId, attempts]) => {
      if (attempts >= 5) {
        threats.push({
          type: 'multiple_failed_attempts',
          severity: attempts >= 10 ? 'high' : 'medium',
          description: `Multiple failed verification attempts: ${attempts}`,
          details: `User ${userId} has ${attempts} failed verification attempts`,
          userId: parseInt(userId),
          attemptCount: attempts,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Sort threats by severity and recency
    threats.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      if (severityOrder[b.severity] !== severityOrder[a.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    res.json({
      success: true,
      message: 'Security threats retrieved successfully',
      data: {
        threats: threats.slice(0, 50), // Limit to top 50 threats
        summary: {
          totalThreats: threats.length,
          highSeverityThreats: threats.filter(t => t.severity === 'high').length,
          mediumSeverityThreats: threats.filter(t => t.severity === 'medium').length,
          lowSeverityThreats: threats.filter(t => t.severity === 'low').length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get security threats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security threats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/security/investigate - Investigate security incident (admin only)
router.post('/investigate', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { userId, electionId, ipAddress, eventType, investigationNotes } = req.body;

    // Validate required fields
    if (!userId && !electionId && !ipAddress) {
      return res.status(400).json({
        success: false,
        message: 'At least one of userId, electionId, or ipAddress is required'
      });
    }

    if (investigationNotes && !validator.isLength(investigationNotes, { min: 10, max: 2000 })) {
      return res.status(400).json({
        success: false,
        message: 'Investigation notes must be between 10 and 2000 characters'
      });
    }

    // Log investigation
    await require('../utils/voteSecurity').logSecurityEvent({
      userId,
      electionId,
      eventType: 'security_investigation',
      ipAddress: ipAddress || getClientIP(req),
      details: JSON.stringify({
        investigatedBy: req.user.userId,
        investigationTarget: { userId, electionId, ipAddress },
        eventType,
        investigationNotes,
        timestamp: new Date().toISOString()
      }),
      severity: 'medium'
    });

    res.json({
      success: true,
      message: 'Security investigation logged successfully',
      data: {
        investigationId: `INV-${Date.now()}`,
        investigatedBy: req.user.userId,
        targets: { userId, electionId, ipAddress },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Security investigation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log security investigation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/security/audit-log - Get comprehensive audit log (admin only)
router.get('/audit-log', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 100,
      eventType: req.query.eventType || '',
      severity: req.query.severity || '',
      userId: req.query.userId || '',
      electionId: req.query.electionId || '',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || ''
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 500) filters.limit = 100;

    const events = await getSecurityEvents(filters);

    res.json({
      success: true,
      message: 'Audit log retrieved successfully',
      data: {
        ...events,
        exportInfo: {
          totalRecords: events.pagination.total,
          generatedAt: new Date().toISOString(),
          generatedBy: req.user.userId
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit log',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
