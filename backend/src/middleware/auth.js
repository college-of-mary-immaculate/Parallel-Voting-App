import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

// Authentication middleware
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Add user to request object
    req.user = {
      userId: user.userId,
      email: user.email,
      role: user.role,
      fullname: user.fullname
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
      error: error.message
    });
  }
};

// Admin-only middleware
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = {
          userId: user.userId,
          email: user.email,
          role: user.role,
          fullname: user.fullname
        };
      }
    }

    next();
  } catch (error) {
    // If token is invalid or expired, just continue without user
    next();
  }
};

// Check if user can vote in election
export const canVote = async (req, res, next) => {
  try {
    const { electionId } = req.body;
    const userId = req.user.userId;

    if (!electionId) {
      return res.status(400).json({
        success: false,
        message: 'Election ID is required.'
      });
    }

    // Import here to avoid circular dependency
    const { Election } = await import('../models/Election.js');
    const { Vote } = await import('../models/Vote.js');

    // Check if election exists and is active
    const election = await Election.findById(electionId);
    
    if (!election) {
      return res.status(404).json({
        success: false,
        message: 'Election not found.'
      });
    }

    if (election.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Election is not active for voting.'
      });
    }

    // Check if voting period is valid
    const now = new Date();
    const startTime = new Date(election.startTime);
    const endTime = new Date(election.endTime);

    if (now < startTime) {
      return res.status(400).json({
        success: false,
        message: 'Voting has not started yet.'
      });
    }

    if (now > endTime) {
      return res.status(400).json({
        success: false,
        message: 'Voting has ended.'
      });
    }

    // Check if user has already voted
    const hasVoted = await Vote.hasUserVoted(userId, electionId);
    
    if (hasVoted) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this election.'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking voting eligibility.',
      error: error.message
    });
  }
};

// Rate limiting middleware (simple implementation)
export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(key)) {
      const userRequests = requests.get(key).filter(time => time > windowStart);
      requests.set(key, userRequests);
    } else {
      requests.set(key, []);
    }

    // Check current requests
    const userRequests = requests.get(key);
    
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }

    // Add current request
    userRequests.push(now);
    next();
  };
};
