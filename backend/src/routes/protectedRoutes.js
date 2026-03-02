const express = require('express');
const { authenticateToken, authorize, optionalAuth, requireEmailVerification } = require('../middleware/authMiddleware');

const router = express.Router();

// Example protected routes using authentication middleware

// Public route (no authentication required)
router.get('/public', (req, res) => {
  res.json({
    success: true,
    message: 'This is a public route - anyone can access'
  });
});

// Protected route (authentication required)
router.get('/protected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'This is a protected route - only authenticated users can access',
    user: req.user
  });
});

// Admin-only route (authentication + admin role required)
router.get('/admin', authenticateToken, authorize('admin'), (req, res) => {
  res.json({
    success: true,
    message: 'This is an admin-only route',
    user: req.user
  });
});

// Admin or moderator route (authentication + specific roles required)
router.get('/moderator', authenticateToken, authorize('admin', 'moderator'), (req, res) => {
  res.json({
    success: true,
    message: 'This route is for admins and moderators',
    user: req.user
  });
});

// Route requiring email verification
router.get('/verified-only', authenticateToken, requireEmailVerification, (req, res) => {
  res.json({
    success: true,
    message: 'This route requires email verification',
    user: req.user
  });
});

// Optional authentication route (works with or without token)
router.get('/optional', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({
      success: true,
      message: 'Welcome back! You are authenticated',
      user: req.user
    });
  } else {
    res.json({
      success: true,
      message: 'You are accessing as a guest',
      user: null
    });
  }
});

// User profile route (user can only access their own data)
router.get('/profile/:userId', authenticateToken, (req, res) => {
  const requestedUserId = req.params.userId;
  const currentUserId = req.user.userId;
  
  // Allow access if user is admin or accessing their own profile
  if (req.user.role === 'admin' || currentUserId == requestedUserId) {
    res.json({
      success: true,
      message: 'Profile access granted',
      profile: {
        userId: requestedUserId,
        isOwnProfile: currentUserId == requestedUserId,
        isAdmin: req.user.role === 'admin'
      }
    });
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied - you can only access your own profile'
    });
  }
});

// Example of combining multiple middleware
router.post('/sensitive-action', 
  authenticateToken,           // Must be authenticated
  authorize('admin', 'moderator'),  // Must be admin or moderator
  requireEmailVerification,      // Must have verified email
  (req, res) => {
    res.json({
      success: true,
      message: 'Sensitive action completed successfully',
      user: req.user
    });
  }
);

module.exports = router;
