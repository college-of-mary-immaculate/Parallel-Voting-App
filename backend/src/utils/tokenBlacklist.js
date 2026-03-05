const { verifyToken, decodeToken } = require('./jwtUtils');

/**
 * Token Blacklist Utilities
 * Handles token blacklisting for secure logout functionality
 */

// In-memory token blacklist (in production, use Redis or database)
const tokenBlacklist = new Map();

// Add token to blacklist
const blacklistToken = async (token, reason = 'logout') => {
  if (!token) {
    throw new Error('Token is required for blacklisting');
  }

  try {
    // Decode token to get expiration time
    const decoded = decodeToken(token);
    
    if (!decoded || !decoded.exp) {
      throw new Error('Invalid token format');
    }

    // Calculate remaining time until expiration
    const now = Math.floor(Date.now() / 1000);
    const timeToExpire = decoded.exp - now;
    
    // If token is already expired, no need to blacklist
    if (timeToExpire <= 0) {
      return {
        success: true,
        message: 'Token is already expired',
        blacklisted: false
      };
    }

    // Add to blacklist with expiration time
    const blacklistEntry = {
      token: token,
      blacklistedAt: now,
      expiresAt: decoded.exp,
      reason: reason,
      userId: decoded.userId,
      email: decoded.email
    };

    // Store in blacklist (key: token hash, value: blacklist entry)
    tokenBlacklist.set(token, blacklistEntry);

    // Set automatic cleanup for expired tokens
    setTimeout(() => {
      tokenBlacklist.delete(token);
    }, timeToExpire * 1000);

    return {
      success: true,
      message: 'Token blacklisted successfully',
      blacklisted: true,
      expiresAt: new Date(decoded.exp * 1000).toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to blacklist token: ${error.message}`);
  }
};

// Check if token is blacklisted
const isTokenBlacklisted = (token) => {
  if (!token) {
    return false;
  }

  const blacklistEntry = tokenBlacklist.get(token);
  
  if (!blacklistEntry) {
    return false;
  }

  // Check if blacklist entry has expired
  const now = Math.floor(Date.now() / 1000);
  if (now >= blacklistEntry.expiresAt) {
    tokenBlacklist.delete(token);
    return false;
  }

  return true;
};

// Remove token from blacklist (if needed)
const removeFromBlacklist = (token) => {
  if (!token) {
    return false;
  }

  const wasBlacklisted = tokenBlacklist.has(token);
  tokenBlacklist.delete(token);
  
  return wasBlacklisted;
};

// Get blacklist entry for a token
const getBlacklistEntry = (token) => {
  if (!token) {
    return null;
  }

  const entry = tokenBlacklist.get(token);
  
  if (!entry) {
    return null;
  }

  // Check if entry has expired
  const now = Math.floor(Date.now() / 1000);
  if (now >= entry.expiresAt) {
    tokenBlacklist.delete(token);
    return null;
  }

  return {
    ...entry,
    blacklistedAt: new Date(entry.blacklistedAt * 1000).toISOString(),
    expiresAt: new Date(entry.expiresAt * 1000).toISOString()
  };
};

// Clean up expired tokens from blacklist
const cleanupExpiredTokens = () => {
  const now = Math.floor(Date.now() / 1000);
  let cleanedCount = 0;

  for (const [token, entry] of tokenBlacklist.entries()) {
    if (now >= entry.expiresAt) {
      tokenBlacklist.delete(token);
      cleanedCount++;
    }
  }

  return cleanedCount;
};

// Get all active blacklist entries
const getAllBlacklistedTokens = () => {
  const now = Math.floor(Date.now() / 1000);
  const activeEntries = [];

  for (const [token, entry] of tokenBlacklist.entries()) {
    if (now < entry.expiresAt) {
      activeEntries.push({
        ...entry,
        blacklistedAt: new Date(entry.blacklistedAt * 1000).toISOString(),
        expiresAt: new Date(entry.expiresAt * 1000).toISOString()
      });
    } else {
      // Remove expired entries
      tokenBlacklist.delete(token);
    }
  }

  return activeEntries;
};

// Blacklist all tokens for a user
const blacklistAllUserTokens = async (userId, reason = 'user_logout') => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const now = Math.floor(Date.now() / 1000);
  let blacklistedCount = 0;

  for (const [token, entry] of tokenBlacklist.entries()) {
    if (entry.userId === userId && now < entry.expiresAt) {
      // Update the reason for existing tokens
      entry.reason = reason;
      entry.blacklistedAt = now;
      blacklistedCount++;
    }
  }

  return {
    success: true,
    message: `Blacklisted ${blacklistedCount} tokens for user`,
    blacklistedCount
  };
};

// Get blacklist statistics
const getBlacklistStats = () => {
  const now = Math.floor(Date.now() / 1000);
  let activeCount = 0;
  let expiredCount = 0;
  const reasons = {};

  for (const [token, entry] of tokenBlacklist.entries()) {
    if (now < entry.expiresAt) {
      activeCount++;
      reasons[entry.reason] = (reasons[entry.reason] || 0) + 1;
    } else {
      expiredCount++;
      tokenBlacklist.delete(token);
    }
  }

  return {
    totalTokens: tokenBlacklist.size,
    activeTokens: activeCount,
    expiredTokensCleaned: expiredCount,
    blacklistReasons: reasons
  };
};

// Initialize periodic cleanup (run every hour)
const startPeriodicCleanup = () => {
  setInterval(() => {
    const cleaned = cleanupExpiredTokens();
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired tokens from blacklist`);
    }
  }, 60 * 60 * 1000); // 1 hour
};

module.exports = {
  blacklistToken,
  isTokenBlacklisted,
  removeFromBlacklist,
  getBlacklistEntry,
  cleanupExpiredTokens,
  getAllBlacklistedTokens,
  blacklistAllUserTokens,
  getBlacklistStats,
  startPeriodicCleanup
};
