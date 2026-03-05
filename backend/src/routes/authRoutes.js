const express = require('express');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { v4: uuidv4 } = require('uuid');
const { generateToken, verifyToken, extractTokenFromHeader } = require('../utils/jwtUtils');
const { hashPassword, verifyPassword, checkPasswordStrength } = require('../utils/passwordUtils');
const { generateResetToken, verifyResetToken, hashNewPassword } = require('../utils/passwordReset');
const { blacklistToken, blacklistAllUserTokens, getBlacklistStats } = require('../utils/tokenBlacklist');
const { authenticateToken, authorize, optionalAuth } = require('../middleware/authMiddleware');
const { query } = require('../config/mockDatabase');

const router = express.Router();

// Validation middleware
const validateRegistration = (req, res, next) => {
  const { email, password, fullname, vin } = req.body;
  
  const errors = [];
  
  // Email validation
  if (!email) {
    errors.push('Email is required');
  } else if (!validator.isEmail(email)) {
    errors.push('Please provide a valid email address');
  }
  
  // Password validation
  if (!password) {
    errors.push('Password is required');
  } else {
    // Use password strength checker
    const passwordCheck = checkPasswordStrength(password);
    if (!passwordCheck.isValid) {
      errors.push(...passwordCheck.errors);
    }
    
    // Additional length requirement
    if (password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
  }
  
  // Name validation
  if (!fullname) {
    errors.push('Full name is required');
  } else if (fullname.length < 2) {
    errors.push('Full name must be at least 2 characters long');
  } else if (!validator.isLength(fullname, { min: 2, max: 80 })) {
    errors.push('Full name must be less than 80 characters');
  }
  
  // VIN validation
  if (!vin) {
    errors.push('Voter ID is required');
  } else if (!validator.isLength(vin, { min: 3, max: 20 })) {
    errors.push('Voter ID must be between 3 and 20 characters');
  } else if (!/^[A-Za-z0-9]+$/.test(vin)) {
    errors.push('Voter ID can only contain letters and numbers');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

// Check if user already exists
const checkUserExists = async (email, vin) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM User WHERE email = ? OR vin = ?',
      [email, vin]
    );
    return result[0].count > 0;
  } catch (error) {
    throw error;
  }
};

// Generate VIN if not provided
const generateVIN = () => {
  const prefix = 'VTR';
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

// POST /api/auth/register
router.post('/register', validateRegistration, async (req, res) => {
  try {
    const { email, password, fullname, vin } = req.body;
    
    // Check if user already exists
    const userExists = await checkUserExists(email, vin || generateVIN());
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or Voter ID already exists'
      });
    }
    
    // Hash password using utility
    const hashedPassword = await hashPassword(password);
    
    // Generate VIN if not provided
    const finalVin = vin || generateVIN();
    
    // Create user
    const result = await query(
      `INSERT INTO User (vin, fullname, email, password, role, isActive, emailVerified, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, 'voter', 1, 0, NOW(), NOW())`,
      [finalVin, fullname, email, hashedPassword]
    );
    
    // Get created user
    const newUser = await query(
      'SELECT userId, vin, fullname, email, role, isActive, emailVerified, createdAt FROM User WHERE userId = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser[0],
        voterId: finalVin
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'User with this email or Voter ID already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Validation middleware for login
const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  
  const errors = [];
  
  // Email validation
  if (!email) {
    errors.push('Email is required');
  } else if (!validator.isEmail(email)) {
    errors.push('Please provide a valid email address');
  }
  
  // Password validation
  if (!password) {
    errors.push('Password is required');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  next();
};

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const users = await query(
      'SELECT userId, vin, fullname, email, password, role, isActive, emailVerified FROM User WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    const user = users[0];
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }
    
    // Verify password using utility
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token using utility
    const payload = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      vin: user.vin
    };
    
    const token = generateToken(payload);
    
    // Remove password from user object
    delete user.password;
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Password reset request
router.post('/reset-request', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    // Check if user exists
    const users = await query('SELECT email FROM User WHERE email = ?', [email]);
    if (users.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken(email);
    
    // In a real app, you would send this via email
    console.log(`Password reset token for ${email}: ${resetToken}`);
    
    res.json({
      success: true,
      message: 'Password reset link has been sent to your email',
      // In development, return token for testing
      ...(process.env.NODE_ENV === 'development' ? { resetToken } : {})
    });
    
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    // Verify reset token
    const decoded = verifyResetToken(token);
    
    // Hash new password
    const hashedPassword = await hashNewPassword(newPassword);
    
    // Update password in database
    await query(
      'UPDATE User SET password = ?, updatedAt = NOW() WHERE email = ?',
      [hashedPassword, decoded.email]
    );
    
    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Change password (authenticated user)
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Get user's current password
    const users = await query(
      'SELECT password FROM User WHERE userId = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    // Verify current password
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password
    const passwordCheck = checkPasswordStrength(newPassword);
    if (!passwordCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: 'New password does not meet security requirements',
        errors: passwordCheck.errors
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);
    
    // Update password
    await query(
      'UPDATE User SET password = ?, updatedAt = NOW() WHERE userId = ?',
      [hashedNewPassword, userId]
    );
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Logout (single token)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.token;
    const userId = req.user.userId;
    
    // Blacklist the current token
    const result = await blacklistToken(token, 'user_logout');
    
    res.json({
      success: true,
      message: 'Logged out successfully',
      data: {
        blacklisted: result.blacklisted,
        expiresAt: result.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Logout from all devices
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const currentToken = req.token;
    
    // Blacklist current token
    await blacklistToken(currentToken, 'user_logout_all');
    
    // Blacklist all other tokens for this user
    const result = await blacklistAllUserTokens(userId, 'user_logout_all');
    
    res.json({
      success: true,
      message: 'Logged out from all devices successfully',
      data: {
        blacklistedCount: result.blacklistedCount,
        message: result.message
      }
    });
    
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout from all devices failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Check token status
router.get('/token-status', optionalAuth, async (req, res) => {
  try {
    if (!req.token) {
      return res.json({
        success: true,
        message: 'No token provided',
        data: {
          hasToken: false,
          isValid: false,
          isBlacklisted: false
        }
      });
    }

    const { isTokenBlacklisted } = require('../utils/tokenBlacklist');
    const isBlacklisted = isTokenBlacklisted(req.token);
    
    res.json({
      success: true,
      message: 'Token status retrieved',
      data: {
        hasToken: true,
        isValid: !!req.user,
        isBlacklisted: isBlacklisted,
        user: req.user || null
      }
    });
    
  } catch (error) {
    console.error('Token status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check token status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Admin: Get blacklist statistics
router.get('/admin/blacklist-stats', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const stats = getBlacklistStats();
    
    res.json({
      success: true,
      message: 'Blacklist statistics retrieved',
      data: stats
    });
    
  } catch (error) {
    console.error('Blacklist stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blacklist statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
