const jwt = require('jsonwebtoken');

/**
 * Verify JWT token
 */
const verifyToken = (token) => {
  try {
    if (!token) {
      return null;
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
};

/**
 * Generate JWT token
 */
const generateToken = (payload) => {
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
    return token;
  } catch (error) {
    console.error('JWT generation error:', error.message);
    return null;
  }
};

module.exports = {
  verifyToken,
  generateToken
};
