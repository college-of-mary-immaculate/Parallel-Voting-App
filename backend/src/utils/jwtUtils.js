const jwt = require('jsonwebtoken');

/**
 * JWT Utilities for authentication
 */

// Generate JWT token
const generateToken = (payload, expiresIn = null) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  const options = {
    expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '24h'
  };

  return jwt.sign(payload, secret, options);
};

// Verify JWT token
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    } else {
      throw new Error('Token verification failed');
    }
  }
};

// Decode JWT token without verification (for debugging)
const decodeToken = (token) => {
  return jwt.decode(token);
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET environment variable is not set');
  }

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET or JWT_SECRET environment variable is not set');
  }

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    } else {
      throw new Error('Refresh token verification failed');
    }
  }
};

// Extract token from Authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
};

// Get token expiration time
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded ? decoded.exp : null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateRefreshToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  isTokenExpired,
  getTokenExpiration
};
