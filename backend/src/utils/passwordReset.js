const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate password reset token
 */
const generateResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
  return {
    token,
    expiresAt,
    uuid: uuidv4()
  };
};

/**
 * Verify password reset token
 */
const verifyResetToken = (token) => {
  try {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return hash;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

/**
 * Generate secure temporary password
 */
const generateTempPassword = () => {
  return crypto.randomBytes(16).toString('hex');
};

module.exports = {
  generateResetToken,
  verifyResetToken,
  generateTempPassword
};
