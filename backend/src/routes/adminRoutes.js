const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const {
  getAdminDashboard,
  getUserManagement,
  getElectionManagement,
  getSystemMonitoring,
  updateUserStatus,
  updateUserRole,
  controlElectionStatus,
  getAdminLogs,
  getSystemReports
} = require('../utils/adminUtils');

const router = express.Router();

// Apply admin authorization to all routes
router.use(authenticateToken, authorize('admin'));

// GET /api/admin/dashboard - Get admin dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await getAdminDashboard();

    res.json({
      success: true,
      message: 'Admin dashboard retrieved successfully',
      data: dashboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/users - Get user management data
router.get('/users', async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search || '',
      role: req.query.role || '',
      status: req.query.status || '',
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    const users = await getUserManagement(filters);

    res.json({
      success: true,
      message: 'User management data retrieved successfully',
      data: users,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get user management error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user management data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/users/:userId/status - Update user status
router.put('/users/:userId/status', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { status, reason } = req.body;

    if (!validator.isInt(userId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['activate', 'deactivate', 'ban', 'unban'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await updateUserStatus(parseInt(userId), status, reason);

    res.json({
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/users/:userId/role - Update user role
router.put('/users/:userId/role', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { newRole, reason } = req.body;

    if (!validator.isInt(userId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    if (!newRole) {
      return res.status(400).json({
        success: false,
        message: 'New role is required'
      });
    }

    const validRoles = ['admin', 'voter', 'moderator'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    const result = await updateUserRole(parseInt(userId), newRole, reason);

    res.json({
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/elections - Get election management data
router.get('/elections', async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search || '',
      status: req.query.status || '',
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 100) filters.limit = 20;

    const elections = await getElectionManagement(filters);

    res.json({
      success: true,
      message: 'Election management data retrieved successfully',
      data: elections,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get election management error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve election management data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/admin/elections/:electionId/control - Control election status
router.put('/elections/:electionId/control', async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const { action, reason } = req.body;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        message: 'Action is required'
      });
    }

    const validActions = ['start', 'pause', 'resume', 'end', 'cancel'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Must be one of: ${validActions.join(', ')}`
      });
    }

    const result = await controlElectionStatus(parseInt(electionId), action, reason);

    res.json({
      success: true,
      message: result.message,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Control election status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to control election status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/monitoring - Get system monitoring data
router.get('/monitoring', async (req, res) => {
  try {
    const monitoring = await getSystemMonitoring();

    res.json({
      success: true,
      message: 'System monitoring data retrieved successfully',
      data: monitoring,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get system monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system monitoring data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/logs - Get admin activity logs
router.get('/logs', async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      action: req.query.action || '',
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

    const logs = await getAdminLogs(filters);

    res.json({
      success: true,
      message: 'Admin logs retrieved successfully',
      data: logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get admin logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin logs',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/reports - Get system reports
router.get('/reports', async (req, res) => {
  try {
    const reportType = req.query.type || 'overview';

    const validReportTypes = ['overview', 'users', 'elections', 'voting'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`
      });
    }

    const report = await getSystemReports(reportType);

    res.json({
      success: true,
      message: `${reportType} report generated successfully`,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get system reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate system report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/users/:userId - Get user details
router.get('/users/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!validator.isInt(userId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Get detailed user information
    const userDetails = await require('../config/mockDatabase').query(`
      SELECT 
        u.userId,
        u.email,
        u.firstName,
        u.lastName,
        u.role,
        u.isActive,
        u.isEmailVerified,
        u.createdAt,
        u.lastLogin,
        u.dateOfBirth,
        u.gender,
        u.country,
        u.city,
        u.state,
        COUNT(DISTINCT v.voteId) as totalVotes,
        COUNT(DISTINCT v.electionId) as electionsParticipated,
        COUNT(DISTINCT c.candidateId) as candidatesCreated,
        GROUP_CONCAT(DISTINCT e.title) as participatedElections
      FROM User u
      LEFT JOIN Vote v ON u.userId = v.userId
      LEFT JOIN Candidate c ON u.userId = c.createdBy
      LEFT JOIN Election e ON v.electionId = e.electionId
      WHERE u.userId = ?
      GROUP BY u.userId
    `, [userId]);

    if (userDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User details retrieved successfully',
      data: userDetails[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/elections/:electionId - Get election details
router.get('/elections/:electionId', async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    // Get detailed election information
    const electionDetails = await require('../config/mockDatabase').query(`
      SELECT 
        e.*,
        COUNT(DISTINCT v.userId) as uniqueVoters,
        COUNT(DISTINCT c.candidateId) as totalCandidates,
        COUNT(DISTINCT c.candidateId) FILTER (WHERE c.status = 'active') as activeCandidates,
        COUNT(DISTINCT c.candidateId) FILTER (WHERE c.isWriteIn = 1) as writeInCandidates,
        CASE 
          WHEN e.status = 'active' AND NOW() >= e.startTime AND NOW() <= e.endTime THEN 'live'
          WHEN e.status = 'upcoming' AND NOW() < e.startTime THEN 'scheduled'
          WHEN e.status = 'completed' THEN 'finished'
          WHEN e.status = 'active' AND NOW() > e.endTime THEN 'expired'
          ELSE e.status
        END as currentStatus
      FROM Election e
      LEFT JOIN Vote v ON e.electionId = v.electionId
      LEFT JOIN Candidate c ON e.electionId = c.electionId
      WHERE e.electionId = ?
      GROUP BY e.electionId
    `, [electionId]);

    if (electionDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Election not found'
      });
    }

    // Get candidate results
    const candidateResults = await require('../config/mockDatabase').query(`
      SELECT 
        c.candidateId,
        c.name,
        c.party,
        c.description,
        c.status,
        c.isWriteIn,
        COUNT(v.voteId) as voteCount,
        COUNT(v.voteId) * 100.0 / (
          SELECT COUNT(*) FROM Vote v2 WHERE v2.electionId = ?
        ) as percentage
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.electionId = ?
      GROUP BY c.candidateId
      ORDER BY voteCount DESC
    `, [electionId, electionId]);

    res.json({
      success: true,
      message: 'Election details retrieved successfully',
      data: {
        ...electionDetails[0],
        candidates: candidateResults
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get election details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve election details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/stats - Get comprehensive statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await require('../config/mockDatabase').query(`
      SELECT 
        'users' as category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE isActive = 1) as active,
        COUNT(*) FILTER (WHERE role = 'admin') as admins,
        COUNT(*) FILTER (WHERE isEmailVerified = 1) as verified,
        COUNT(*) FILTER (WHERE lastLogin >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as recentlyActive
      FROM User
      
      UNION ALL
      
      SELECT 
        'elections' as category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'upcoming') as upcoming,
        COUNT(*) FILTER (WHERE isPublic = 1) as public
      FROM Election
      
      UNION ALL
      
      SELECT 
        'votes' as category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE votedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as today,
        COUNT(*) FILTER (WHERE votedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as thisWeek,
        COUNT(*) FILTER (WHERE votedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as thisMonth,
        COUNT(DISTINCT userId) as uniqueVoters
      FROM Vote
      
      UNION ALL
      
      SELECT 
        'candidates' as category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE isWriteIn = 1) as writeIn,
        COUNT(*) FILTER (WHERE status = 'disqualified') as disqualified,
        COUNT(DISTINCT electionId) as electionsWithCandidates
      FROM Candidate
    `);

    res.json({
      success: true,
      message: 'Comprehensive statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get comprehensive statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve comprehensive statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/export - Export admin data
router.post('/export', async (req, res) => {
  try {
    const { dataType, format = 'json', filters = {} } = req.body;

    const validDataTypes = ['users', 'elections', 'votes', 'logs'];
    if (!validDataTypes.includes(dataType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid data type. Must be one of: ${validDataTypes.join(', ')}`
      });
    }

    const validFormats = ['json', 'csv'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: `Invalid format. Must be one of: ${validFormats.join(', ')}`
      });
    }

    let data;
    switch (dataType) {
      case 'users':
        data = await getUserManagement(filters);
        break;
      case 'elections':
        data = await getElectionManagement(filters);
        break;
      case 'logs':
        data = await getAdminLogs(filters);
        break;
      default:
        data = { data: [] };
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(data.data || data.users || data.elections || data.logs || []);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=admin_${dataType}_export.csv`);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=admin_${dataType}_export.json`);
      res.json(data);
    }
  } catch (error) {
    console.error('Export admin data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export admin data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  if (!data || data.length === 0) return 'No data available';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(item => 
    headers.map(header => {
      const value = item[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
};

module.exports = router;
