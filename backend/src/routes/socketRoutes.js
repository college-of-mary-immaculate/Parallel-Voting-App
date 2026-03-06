const express = require('express');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const { getConnectionStats, getConnectedUsers } = require('../config/socketConfig');

const router = express.Router();

// GET /api/socket/stats - Get Socket.io connection statistics (admin only)
router.get('/stats', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const stats = getConnectionStats();
    
    res.json({
      success: true,
      message: 'Socket.io statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    console.error('Get socket stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve socket statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/socket/users - Get connected users list (admin only)
router.get('/users', authenticateToken, authorize('admin'), (req, res) => {
  try {
    const users = getConnectedUsers();
    
    res.json({
      success: true,
      message: 'Connected users retrieved successfully',
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Get connected users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve connected users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
