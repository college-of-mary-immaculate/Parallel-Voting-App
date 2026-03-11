const crypto = require('crypto');
const { query } = require('../config/mockDatabase');
const { sendVoteConfirmation } = require('./emailService');

/**
 * Vote Verification & Security Utilities
 * Provides enhanced security measures for voting including verification codes,
 * anti-fraud detection, and security monitoring
 */

// Security configuration
const SECURITY_CONFIG = {
  verificationCodeLength: 8,
  verificationCodeExpiry: 30 * 60 * 1000, // 30 minutes
  maxVerificationAttempts: 3,
  suspiciousActivityThreshold: 5,
  ipRateLimitWindow: 15 * 60 * 1000, // 15 minutes
  maxVotesPerIP: 10,
  sessionTimeout: 60 * 60 * 1000, // 1 hour
  auditLogRetention: 90 * 24 * 60 * 60 * 1000 // 90 days
};

/**
 * Generate secure verification code
 */
const generateVerificationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < SECURITY_CONFIG.verificationCodeLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Hash verification code for secure storage
 */
const hashVerificationCode = (code) => {
  return crypto.createHash('sha256').update(code).digest('hex');
};

/**
 * Generate secure vote token
 */
const generateVoteToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Create vote verification record
 */
const createVoteVerification = async (voteId, userId, electionId, candidateId, ipAddress, userAgent) => {
  try {
    const verificationCode = generateVerificationCode();
    const hashedCode = hashVerificationCode(verificationCode);
    const voteToken = generateVoteToken();
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.verificationCodeExpiry);

    // Store verification record
    await query(`
      INSERT INTO VoteVerification (
        voteId, userId, electionId, candidateId, verificationCode, 
        voteToken, ipAddress, userAgent, attempts, expiresAt, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      voteId, userId, electionId, candidateId, hashedCode, 
      voteToken, ipAddress, userAgent, 0, expiresAt
    ]);

    // Log security event
    await logSecurityEvent({
      userId,
      electionId,
      voteId,
      eventType: 'verification_created',
      ipAddress,
      userAgent,
      details: `Verification code generated for vote ${voteId}`
    });

    return {
      verificationCode,
      voteToken,
      expiresAt: expiresAt.toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to create vote verification: ${error.message}`);
  }
};

/**
 * Verify vote code
 */
const verifyVoteCode = async (voteId, verificationCode, ipAddress, userAgent) => {
  try {
    // Get verification record
    const verification = await query(`
      SELECT * FROM VoteVerification 
      WHERE voteId = ? AND isVerified = 0 AND expiresAt > NOW()
    `, [voteId]);

    if (verification.length === 0) {
      await logSecurityEvent({
        voteId,
        eventType: 'verification_failed',
        ipAddress,
        userAgent,
        details: `Invalid or expired verification code for vote ${voteId}`
      });
      throw new Error('Invalid or expired verification code');
    }

    const verificationRecord = verification[0];
    const hashedInputCode = hashVerificationCode(verificationCode);

    // Check if code matches
    if (verificationRecord.verificationCode !== hashedInputCode) {
      // Increment attempts
      await query(`
        UPDATE VoteVerification 
        SET attempts = attempts + 1, lastAttemptAt = NOW()
        WHERE voteId = ?
      `, [voteId]);

      // Check if max attempts exceeded
      if (verificationRecord.attempts >= SECURITY_CONFIG.maxVerificationAttempts - 1) {
        await query(`
          UPDATE VoteVerification 
          SET isVerified = -1, verifiedAt = NOW()
          WHERE voteId = ?
        `, [voteId]);

        await logSecurityEvent({
          userId: verificationRecord.userId,
          electionId: verificationRecord.electionId,
          voteId,
          eventType: 'verification_locked',
          ipAddress,
          userAgent,
          details: `Verification locked due to too many attempts for vote ${voteId}`
        });

        throw new Error('Verification code locked due to too many failed attempts');
      }

      await logSecurityEvent({
        userId: verificationRecord.userId,
        electionId: verificationRecord.electionId,
        voteId,
        eventType: 'verification_invalid',
        ipAddress,
        userAgent,
        details: `Invalid verification code attempt ${verificationRecord.attempts + 1} for vote ${voteId}`
      });

      throw new Error(`Invalid verification code. ${SECURITY_CONFIG.maxVerificationAttempts - verificationRecord.attempts - 1} attempts remaining`);
    }

    // Mark as verified
    await query(`
      UPDATE VoteVerification 
      SET isVerified = 1, verifiedAt = NOW()
      WHERE voteId = ?
    `, [voteId]);

    await logSecurityEvent({
      userId: verificationRecord.userId,
      electionId: verificationRecord.electionId,
      voteId,
      eventType: 'verification_success',
      ipAddress,
      userAgent,
      details: `Vote ${voteId} successfully verified`
    });

    return {
      success: true,
      message: 'Vote verified successfully',
      voteToken: verificationRecord.voteToken
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Check suspicious voting patterns
 */
const checkSuspiciousActivity = async (userId, electionId, ipAddress) => {
  try {
    const suspiciousPatterns = [];

    // Check for rapid voting from same IP
    const recentVotesFromIP = await query(`
      SELECT COUNT(*) as count FROM Vote v
      JOIN VoteVerification vv ON v.voteId = vv.voteId
      WHERE vv.ipAddress = ? 
        AND v.electionId = ?
        AND v.createdAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
    `, [ipAddress, electionId]);

    if (recentVotesFromIP[0].count >= SECURITY_CONFIG.maxVotesPerIP) {
      suspiciousPatterns.push({
        type: 'rapid_ip_voting',
        severity: 'high',
        details: `${recentVotesFromIP[0].count} votes from IP ${ipAddress} in last hour`
      });
    }

    // Check for multiple verification attempts
    const failedVerifications = await query(`
      SELECT COUNT(*) as count FROM VoteVerification
      WHERE userId = ? 
        AND electionId = ?
        AND attempts >= ?
        AND createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, [userId, electionId, SECURITY_CONFIG.maxVerificationAttempts]);

    if (failedVerifications[0].count > 0) {
      suspiciousPatterns.push({
        type: 'multiple_failed_verifications',
        severity: 'medium',
        details: `${failedVerifications[0].count} instances of failed verification attempts`
      });
    }

    // Check for voting from multiple IPs
    const uniqueIPs = await query(`
      SELECT COUNT(DISTINCT vv.ipAddress) as count 
      FROM Vote v
      JOIN VoteVerification vv ON v.voteId = vv.voteId
      WHERE v.userId = ? 
        AND v.electionId = ?
        AND v.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    `, [userId, electionId]);

    if (uniqueIPs[0].count > 3) {
      suspiciousPatterns.push({
        type: 'multiple_ip_voting',
        severity: 'medium',
        details: `Voting from ${uniqueIPs[0].count} different IP addresses in 24 hours`
      });
    }

    // Log suspicious activity if detected
    if (suspiciousPatterns.length > 0) {
      await logSecurityEvent({
        userId,
        electionId,
        eventType: 'suspicious_activity',
        ipAddress,
        details: JSON.stringify(suspiciousPatterns),
        severity: suspiciousPatterns.some(p => p.severity === 'high') ? 'high' : 'medium'
      });
    }

    return suspiciousPatterns;
  } catch (error) {
    console.error('Error checking suspicious activity:', error);
    return [];
  }
};

/**
 * Get vote verification status
 */
const getVoteVerificationStatus = async (voteId, userId) => {
  try {
    const verification = await query(`
      SELECT vv.*, v.createdAt as voteDate
      FROM VoteVerification vv
      JOIN Vote v ON vv.voteId = v.voteId
      WHERE vv.voteId = ? AND vv.userId = ?
    `, [voteId, userId]);

    if (verification.length === 0) {
      return null;
    }

    const record = verification[0];
    return {
      voteId: record.voteId,
      isVerified: record.isVerified === 1,
      isLocked: record.isVerified === -1,
      attempts: record.attempts,
      maxAttempts: SECURITY_CONFIG.maxVerificationAttempts,
      expiresAt: record.expiresAt,
      verifiedAt: record.verifiedAt,
      voteDate: record.voteDate,
      ipAddress: record.ipAddress,
      canRetry: record.isVerified === 0 && 
                record.attempts < SECURITY_CONFIG.maxVerificationAttempts && 
                new Date(record.expiresAt) > new Date()
    };
  } catch (error) {
    throw new Error(`Failed to get verification status: ${error.message}`);
  }
};

/**
 * Resend verification code
 */
const resendVerificationCode = async (voteId, userId, ipAddress, userAgent) => {
  try {
    // Check if verification exists and can be resent
    const verification = await query(`
      SELECT * FROM VoteVerification 
      WHERE voteId = ? AND userId = ? AND isVerified = 0
    `, [voteId, userId]);

    if (verification.length === 0) {
      throw new Error('Verification not found or already verified');
    }

    const record = verification[0];

    // Check rate limiting for resends
    const recentResends = await query(`
      SELECT COUNT(*) as count FROM VoteVerification
      WHERE voteId = ? AND lastResentAt >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    `, [voteId]);

    if (recentResends[0].count > 0) {
      throw new Error('Please wait 5 minutes before requesting a new verification code');
    }

    // Generate new code
    const newVerificationCode = generateVerificationCode();
    const hashedCode = hashVerificationCode(newVerificationCode);
    const newExpiresAt = new Date(Date.now() + SECURITY_CONFIG.verificationCodeExpiry);

    // Update verification record
    await query(`
      UPDATE VoteVerification 
      SET verificationCode = ?, attempts = 0, expiresAt = ?, lastResentAt = NOW()
      WHERE voteId = ?
    `, [hashedCode, newExpiresAt, voteId]);

    // Get vote details for email
    const voteDetails = await query(`
      SELECT v.*, e.title as electionTitle, c.name as candidateName
      FROM Vote v
      JOIN Election e ON v.electionId = e.electionId
      JOIN Candidate c ON v.candidateId = c.candidateId
      WHERE v.voteId = ?
    `, [voteId]);

    if (voteDetails.length > 0) {
      // Send email with new code
      await sendVoteConfirmation(
        userId,
        voteDetails[0].electionId,
        voteDetails[0].candidateId,
        voteId
      );
    }

    await logSecurityEvent({
      userId,
      voteId,
      eventType: 'verification_resent',
      ipAddress,
      userAgent,
      details: `New verification code sent for vote ${voteId}`
    });

    return {
      success: true,
      message: 'New verification code sent',
      expiresAt: newExpiresAt.toISOString()
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Log security events
 */
const logSecurityEvent = async (eventData) => {
  try {
    await query(`
      INSERT INTO SecurityLog (
        userId, electionId, voteId, eventType, ipAddress, userAgent, 
        details, severity, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      eventData.userId || null,
      eventData.electionId || null,
      eventData.voteId || null,
      eventData.eventType,
      eventData.ipAddress || null,
      eventData.userAgent || null,
      eventData.details || null,
      eventData.severity || 'low'
    ]);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

/**
 * Get security events for monitoring
 */
const getSecurityEvents = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 50,
      eventType = '',
      severity = '',
      userId = '',
      electionId = '',
      startDate = '',
      endDate = ''
    } = filters;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (eventType) {
      whereClause += ` AND eventType = ?`;
      params.push(eventType);
    }

    if (severity) {
      whereClause += ` AND severity = ?`;
      params.push(severity);
    }

    if (userId) {
      whereClause += ` AND userId = ?`;
      params.push(userId);
    }

    if (electionId) {
      whereClause += ` AND electionId = ?`;
      params.push(electionId);
    }

    if (startDate) {
      whereClause += ` AND createdAt >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND createdAt <= ?`;
      params.push(endDate);
    }

    // Get security events
    const events = await query(`
      SELECT 
        sl.*,
        u.email as userEmail,
        u.firstName,
        u.lastName,
        e.title as electionTitle
      FROM SecurityLog sl
      LEFT JOIN User u ON sl.userId = u.userId
      LEFT JOIN Election e ON sl.electionId = e.electionId
      ${whereClause}
      ORDER BY sl.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count
    const totalCount = await query(`
      SELECT COUNT(*) as count
      FROM SecurityLog sl
      ${whereClause}
    `, params);

    return {
      success: true,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit)
      },
      filters
    };
  } catch (error) {
    throw new Error(`Failed to get security events: ${error.message}`);
  }
};

/**
 * Get security statistics
 */
const getSecurityStatistics = async () => {
  try {
    // Event type statistics
    const eventStats = await query(`
      SELECT 
        eventType,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE severity = 'high') as highSeverity,
        COUNT(*) FILTER (WHERE severity = 'medium') as mediumSeverity,
        COUNT(*) FILTER (WHERE severity = 'low') as lowSeverity,
        COUNT(*) FILTER (WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as last24h
      FROM SecurityLog
      GROUP BY eventType
    `);

    // Overall statistics
    const overallStats = await query(`
      SELECT 
        COUNT(*) as totalEvents,
        COUNT(*) FILTER (WHERE severity = 'high') as highSeverity,
        COUNT(*) FILTER (WHERE severity = 'medium') as mediumSeverity,
        COUNT(*) FILTER (WHERE severity = 'low') as lowSeverity,
        COUNT(*) FILTER (WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as last24h,
        COUNT(*) FILTER (WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as last7d,
        COUNT(*) FILTER (WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as last30d
      FROM SecurityLog
    `);

    // Verification statistics
    const verificationStats = await query(`
      SELECT 
        COUNT(*) as totalVerifications,
        COUNT(*) FILTER (WHERE isVerified = 1) as successful,
        COUNT(*) FILTER (WHERE isVerified = -1) as locked,
        COUNT(*) FILTER (WHERE isVerified = 0 AND expiresAt <= NOW()) as expired,
        AVG(attempts) as avgAttempts,
        MAX(attempts) as maxAttempts
      FROM VoteVerification
    `);

    return {
      success: true,
      statistics: {
        byEventType: eventStats,
        overall: overallStats[0] || {},
        verifications: verificationStats[0] || {}
      }
    };
  } catch (error) {
    throw new Error(`Failed to get security statistics: ${error.message}`);
  }
};

/**
 * Validate vote session
 */
const validateVoteSession = async (voteToken, userId, ipAddress) => {
  try {
    const verification = await query(`
      SELECT vv.*, v.createdAt as voteDate
      FROM VoteVerification vv
      JOIN Vote v ON vv.voteId = v.voteId
      WHERE vv.voteToken = ? AND vv.userId = ? AND vv.isVerified = 1
    `, [voteToken, userId]);

    if (verification.length === 0) {
      return { valid: false, reason: 'Invalid vote token' };
    }

    const record = verification[0];
    const sessionAge = Date.now() - new Date(record.voteDate).getTime();

    if (sessionAge > SECURITY_CONFIG.sessionTimeout) {
      return { valid: false, reason: 'Session expired' };
    }

    return { valid: true, voteId: record.voteId };
  } catch (error) {
    throw new Error(`Failed to validate vote session: ${error.message}`);
  }
};

/**
 * Block suspicious IP
 */
const blockSuspiciousIP = async (ipAddress, reason, duration = 24) => {
  try {
    const expiresAt = new Date(Date.now() + duration * 60 * 60 * 1000);

    await query(`
      INSERT INTO BlockedIPs (ipAddress, reason, expiresAt, createdAt)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE 
      reason = VALUES(reason),
      expiresAt = VALUES(expiresAt),
      createdAt = NOW()
    `, [ipAddress, reason, expiresAt]);

    await logSecurityEvent({
      eventType: 'ip_blocked',
      ipAddress,
      details: `IP ${ipAddress} blocked: ${reason}`,
      severity: 'high'
    });

    return { success: true, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    throw new Error(`Failed to block IP: ${error.message}`);
  }
};

/**
 * Check if IP is blocked
 */
const isIPBlocked = async (ipAddress) => {
  try {
    const blocked = await query(`
      SELECT * FROM BlockedIPs 
      WHERE ipAddress = ? AND expiresAt > NOW()
    `, [ipAddress]);

    return blocked.length > 0;
  } catch (error) {
    console.error('Error checking blocked IP:', error);
    return false;
  }
};

module.exports = {
  createVoteVerification,
  verifyVoteCode,
  checkSuspiciousActivity,
  getVoteVerificationStatus,
  resendVerificationCode,
  logSecurityEvent,
  getSecurityEvents,
  getSecurityStatistics,
  validateVoteSession,
  blockSuspiciousIP,
  isIPBlocked,
  generateVerificationCode,
  SECURITY_CONFIG
};
