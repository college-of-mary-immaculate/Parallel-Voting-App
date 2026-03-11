const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const {
  initializeEmailService,
  sendVoteConfirmation,
  sendElectionAnnouncement,
  sendElectionReminder,
  sendElectionResults,
  sendAdminNotification,
  getEmailLogs,
  getEmailStatistics
} = require('../utils/emailService');

const router = express.Router();

// POST /api/notifications/initialize - Initialize email service (admin only)
router.post('/initialize', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const result = await initializeEmailService();

    if (result) {
      res.json({
        success: true,
        message: 'Email service initialized successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to initialize email service',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Initialize email service error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize email service',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/notifications/vote-confirmation - Send vote confirmation (admin only)
router.post('/vote-confirmation', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { userId, electionId, candidateId, voteId } = req.body;

    if (!validator.isInt(userId.toString(), { min: 1 }) ||
        !validator.isInt(electionId.toString(), { min: 1 }) ||
        !validator.isInt(candidateId.toString(), { min: 1 }) ||
        !validator.isInt(voteId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID, election ID, candidate ID, or vote ID'
      });
    }

    const result = await sendVoteConfirmation(userId, electionId, candidateId, voteId);

    res.json({
      success: true,
      message: result.message,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send vote confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send vote confirmation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/notifications/election-announcement - Send election announcement (admin only)
router.post('/election-announcement', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { electionId, announcementType = 'new' } = req.body;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const validTypes = ['new', 'upcoming', 'cancelled'];
    if (!validTypes.includes(announcementType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid announcement type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const result = await sendElectionAnnouncement(electionId, announcementType);

    res.json({
      success: true,
      message: result.message,
      results: result.results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send election announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send election announcement',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/notifications/election-reminder - Send election reminder (admin only)
router.post('/election-reminder', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { electionId, reminderType = 'start_soon' } = req.body;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const validTypes = ['start_soon', 'ending_soon', 'last_day'];
    if (!validTypes.includes(reminderType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reminder type. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const result = await sendElectionReminder(electionId, reminderType);

    res.json({
      success: true,
      message: result.message,
      results: result.results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send election reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send election reminder',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/notifications/election-results - Send election results (admin only)
router.post('/election-results', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { electionId } = req.body;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const result = await sendElectionResults(electionId);

    res.json({
      success: true,
      message: result.message,
      results: result.results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send election results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send election results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/notifications/admin-notification - Send admin notification (admin only)
router.post('/admin-notification', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { subject, message, recipients } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }

    if (subject.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Subject must be less than 200 characters'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Message must be less than 2000 characters'
      });
    }

    const result = await sendAdminNotification(subject, message, recipients);

    res.json({
      success: true,
      message: result.message,
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send admin notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send admin notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/notifications/logs - Get email notification logs (admin only)
router.get('/logs', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      type: req.query.type || '',
      status: req.query.status || '',
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

    const logs = await getEmailLogs(filters);

    res.json({
      success: true,
      message: 'Email logs retrieved successfully',
      data: logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get email logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve email logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/notifications/statistics - Get email statistics (admin only)
router.get('/statistics', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const statistics = await getEmailStatistics();

    res.json({
      success: true,
      message: 'Email statistics retrieved successfully',
      data: statistics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get email statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve email statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/notifications/test - Test email configuration (admin only)
router.post('/test', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { testEmail } = req.body;

    if (!testEmail || !validator.isEmail(testEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Valid test email address is required'
      });
    }

    // Initialize email service
    const initialized = await initializeEmailService();
    if (!initialized) {
      return res.status(500).json({
        success: false,
        message: 'Email service not properly configured'
      });
    }

    // Send test email
    const result = await sendAdminNotification(
      'Email Service Test',
      'This is a test email to verify that the email service is working correctly.',
      [{ email: testEmail }]
    );

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/notifications/config - Get email configuration status (admin only)
router.get('/config', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const config = {
      emailHost: process.env.EMAIL_HOST || 'smtp.gmail.com',
      emailPort: process.env.EMAIL_PORT || 587,
      emailSecure: process.env.EMAIL_SECURE === 'true',
      emailUser: process.env.EMAIL_USER ? '***configured***' : 'not configured',
      emailFromName: process.env.EMAIL_FROM_NAME || 'Voting System',
      emailFrom: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'not configured',
      isConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
    };

    res.json({
      success: true,
      message: 'Email configuration retrieved successfully',
      data: config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get email config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve email configuration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/notifications/bulk - Send bulk notifications (admin only)
router.post('/bulk', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Notifications array is required'
      });
    }

    if (notifications.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 notifications allowed per bulk request'
      });
    }

    const results = [];
    
    for (const notification of notifications) {
      try {
        let result;
        
        switch (notification.type) {
          case 'vote_confirmation':
            result = await sendVoteConfirmation(
              notification.userId,
              notification.electionId,
              notification.candidateId,
              notification.voteId
            );
            break;
          case 'election_announcement':
            result = await sendElectionAnnouncement(
              notification.electionId,
              notification.announcementType
            );
            break;
          case 'election_reminder':
            result = await sendElectionReminder(
              notification.electionId,
              notification.reminderType
            );
            break;
          case 'election_results':
            result = await sendElectionResults(notification.electionId);
            break;
          case 'admin_notification':
            result = await sendAdminNotification(
              notification.subject,
              notification.message,
              notification.recipients
            );
            break;
          default:
            throw new Error(`Invalid notification type: ${notification.type}`);
        }

        results.push({
          type: notification.type,
          success: true,
          message: result.message,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          type: notification.type,
          success: false,
          error: error.message
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Bulk notification processing completed: ${successful} successful, ${failed} failed`,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/notifications/templates - Get available email templates (admin only)
router.get('/templates', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const templates = {
      vote_confirmation: {
        name: 'Vote Confirmation',
        description: 'Sent to users after they successfully cast their vote',
        variables: ['userName', 'electionTitle', 'candidateName', 'candidateParty', 'voteId', 'timestamp']
      },
      election_announcement: {
        name: 'Election Announcement',
        description: 'Sent to announce new, upcoming, or cancelled elections',
        types: ['new', 'upcoming', 'cancelled'],
        variables: ['userName', 'electionTitle', 'description', 'startTime', 'endTime', 'type']
      },
      election_reminder: {
        name: 'Election Reminder',
        description: 'Sent to remind users about upcoming election deadlines',
        types: ['start_soon', 'ending_soon', 'last_day'],
        variables: ['userName', 'electionTitle', 'endTime', 'status']
      },
      election_results: {
        name: 'Election Results',
        description: 'Sent to election participants with final results',
        variables: ['userName', 'electionTitle', 'candidateResults']
      },
      admin_notification: {
        name: 'Admin Notification',
        description: 'Sent to admin users for system alerts and notifications',
        variables: ['subject', 'message', 'timestamp']
      }
    };

    res.json({
      success: true,
      message: 'Email templates retrieved successfully',
      data: templates,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve email templates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
