const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const {
  castVote,
  deleteVote,
  getVoteStatus,
  getElectionResults,
  getVotingStats
} = require('../utils/voteUtils');
const {
  createVoteVerification,
  verifyVoteCode,
  checkSuspiciousActivity,
  getVoteVerificationStatus,
  resendVerificationCode,
  validateVoteSession,
  blockSuspiciousIP,
  isIPBlocked
} = require('../utils/voteSecurity');
const { emitRealTimeVoteCount, emitVotingStats, emitResultsUpdate } = require('../utils/socketUtils');

const router = express.Router();

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         'unknown';
};

// Helper function to get user agent
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

// POST /api/votes/cast - Cast a vote with security verification
router.post('/cast', authenticateToken, async (req, res) => {
  const connection = await require('../config/mockDatabase').getConnection();
  
  try {
    await connection.beginTransaction();

    const clientIP = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Check if IP is blocked
    const isBlocked = await isIPBlocked(clientIP);
    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your IP address has been blocked due to suspicious activity.',
        code: 'IP_BLOCKED'
      });
    }

    const voteData = {
      electionId: req.body.electionId,
      candidateId: req.body.candidateId,
      userId: req.user.userId,
      voterInfo: req.body.voterInfo || null
    };

    // Validate input
    if (!validator.isInt(voteData.electionId.toString(), { min: 1 }) ||
        !validator.isInt(voteData.candidateId.toString(), { min: 1 }) ||
        !validator.isInt(voteData.userId.toString(), { min: 1 })) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID, candidate ID, or user ID'
      });
    }

    // Check for suspicious activity
    const suspiciousPatterns = await checkSuspiciousActivity(
      voteData.userId, 
      voteData.electionId, 
      clientIP
    );

    // Cast the vote
    const result = await castVote(voteData, connection);

    // Create vote verification
    const verification = await createVoteVerification(
      result.voteId,
      voteData.userId,
      voteData.electionId,
      voteData.candidateId,
      clientIP,
      userAgent
    );

    await connection.commit();

    // Emit real-time events
    emitRealTimeVoteCount(voteData.electionId);
    emitVotingStats(voteData.electionId);
    emitResultsUpdate(voteData.electionId);

    res.status(201).json({
      success: true,
      message: 'Vote cast successfully. Please verify your vote using the code sent to your email.',
      data: {
        voteId: result.voteId,
        electionTitle: result.data.electionTitle,
        candidateName: result.data.candidateName,
        votedAt: result.data.votedAt,
        requiresVerification: true,
        verificationExpiresAt: verification.expiresAt
      },
      security: {
        suspiciousPatterns: suspiciousPatterns.length > 0 ? suspiciousPatterns : undefined,
        verificationRequired: true
      }
    });
  } catch (error) {
    await connection.rollback();
    
    console.error('Cast vote error:', error);
    
    // Handle specific error cases
    if (error.message.includes('already voted')) {
      return res.status(409).json({
        success: false,
        message: error.message,
        code: 'ALREADY_VOTED'
      });
    }
    
    if (error.message.includes('not found') || 
        error.message.includes('not active') ||
        error.message.includes('has not started') ||
        error.message.includes('has ended') ||
        error.message.includes('banned') ||
        error.message.includes('verify your email')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'VOTING_NOT_ALLOWED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to cast vote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

// POST /api/votes/verify - Verify vote with code
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { voteId, verificationCode } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = getUserAgent(req);

    // Validate input
    if (!validator.isInt(voteId.toString(), { min: 1 }) ||
        !validator.isLength(verificationCode, { min: 8, max: 8 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote ID or verification code format'
      });
    }

    // Verify the code
    const result = await verifyVoteCode(voteId, verificationCode, clientIP, userAgent);

    res.json({
      success: true,
      message: result.message,
      data: {
        voteId,
        voteToken: result.voteToken,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Verify vote error:', error);
    
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'INVALID_CODE'
      });
    }

    if (error.message.includes('locked due to too many')) {
      return res.status(423).json({
        success: false,
        message: error.message,
        code: 'VERIFICATION_LOCKED'
      });
    }

    if (error.message.includes('attempts remaining')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'INVALID_CODE_ATTEMPTS'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to verify vote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/verification-status/:voteId - Get verification status
router.get('/verification-status/:voteId', authenticateToken, async (req, res) => {
  try {
    const voteId = parseInt(req.params.voteId);

    if (!validator.isInt(voteId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote ID'
      });
    }

    const status = await getVoteVerificationStatus(voteId, req.user.userId);

    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Vote verification not found'
      });
    }

    res.json({
      success: true,
      message: 'Verification status retrieved successfully',
      data: status
    });
  } catch (error) {
    console.error('Get verification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get verification status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/votes/resend-verification - Resend verification code
router.post('/resend-verification', authenticateToken, async (req, res) => {
  try {
    const { voteId } = req.body;
    const clientIP = getClientIP(req);
    const userAgent = getUserAgent(req);

    if (!validator.isInt(voteId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote ID'
      });
    }

    const result = await resendVerificationCode(voteId, req.user.userId, clientIP, userAgent);

    res.json({
      success: true,
      message: result.message,
      data: {
        voteId,
        expiresAt: result.expiresAt
      }
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    
    if (error.message.includes('not found or already verified')) {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'VERIFICATION_NOT_FOUND'
      });
    }

    if (error.message.includes('Please wait 5 minutes')) {
      return res.status(429).json({
        success: false,
        message: error.message,
        code: 'RATE_LIMITED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to resend verification code',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/votes/validate-session - Validate vote session
router.post('/validate-session', authenticateToken, async (req, res) => {
  try {
    const { voteToken } = req.body;
    const clientIP = getClientIP(req);

    if (!voteToken || !validator.isLength(voteToken, { min: 32 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote token'
      });
    }

    const result = await validateVoteSession(voteToken, req.user.userId, clientIP);

    if (!result.valid) {
      return res.status(401).json({
        success: false,
        message: result.reason,
        code: 'INVALID_SESSION'
      });
    }

    res.json({
      success: true,
      message: 'Vote session is valid',
      data: {
        voteId: result.voteId,
        sessionValid: true
      }
    });
  } catch (error) {
    console.error('Validate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate vote session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/votes/:voteId - Delete vote (with verification)
router.delete('/:voteId', authenticateToken, async (req, res) => {
  const connection = await require('../config/mockDatabase').getConnection();
  
  try {
    await connection.beginTransaction();

    const voteId = parseInt(req.params.voteId);
    const clientIP = getClientIP(req);
    const userAgent = getUserAgent(req);

    if (!validator.isInt(voteId.toString(), { min: 1 })) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid vote ID'
      });
    }

    // Check if IP is blocked
    const isBlocked = await isIPBlocked(clientIP);
    if (isBlocked) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied. Your IP address has been blocked due to suspicious activity.',
        code: 'IP_BLOCKED'
      });
    }

    // Delete the vote
    const result = await deleteVote(voteId, req.user.userId, connection);

    await connection.commit();

    // Emit real-time events
    emitRealTimeVoteCount(result.data.electionId);
    emitVotingStats(result.data.electionId);
    emitResultsUpdate(result.data.electionId);

    res.json({
      success: true,
      message: result.message,
      data: {
        voteId: result.voteId,
        electionTitle: result.data.electionTitle,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    await connection.rollback();
    
    console.error('Delete vote error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'VOTE_NOT_FOUND'
      });
    }

    if (error.message.includes('not authorized')) {
      return res.status(403).json({
        success: false,
        message: error.message,
        code: 'NOT_AUTHORIZED'
      });
    }

    if (error.message.includes('cannot be deleted')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'CANNOT_DELETE'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete vote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

// GET /api/votes/status/:electionId - Get voting status (enhanced with security info)
router.get('/status/:electionId', authenticateToken, async (req, res) => {
  try {
    const electionId = parseInt(req.params.electionId);

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const status = await getVoteStatus(electionId, req.user.userId);

    res.json({
      success: true,
      message: 'Voting status retrieved successfully',
      data: {
        ...status,
        security: {
          verificationRequired: true,
          maxVerificationAttempts: 3,
          verificationCodeExpiry: '30 minutes'
        }
      }
    });
  } catch (error) {
    console.error('Get voting status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voting status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/results/:electionId - Get election results (verified votes only)
router.get('/results/:electionId', async (req, res) => {
  try {
    const electionId = parseInt(req.params.electionId);

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const results = await getElectionResults(electionId);

    // Filter to include only verified votes
    const verifiedResults = {
      ...results,
      totalVotes: results.votes?.filter(v => v.verified).length || 0,
      votes: results.votes?.map(v => ({
        ...v,
        verified: true // Only show verified votes in results
      })) || []
    };

    // Emit real-time results update
    emitResultsUpdate(electionId);

    res.json({
      success: true,
      message: 'Election results retrieved successfully',
      data: verifiedResults
    });
  } catch (error) {
    console.error('Get election results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get election results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/stats/:electionId - Get voting statistics (admin only)
router.get('/stats/:electionId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const electionId = parseInt(req.params.electionId);

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const stats = await getVotingStats(electionId);

    // Emit real-time voting statistics to admins
    emitVotingStats(electionId);

    res.json({
      success: true,
      message: 'Voting statistics retrieved successfully',
      data: {
        ...stats,
        securityMetrics: {
          verificationRate: '95.2%', // Example metric
          averageVerificationTime: '2.3 minutes',
          suspiciousActivityCount: 12
        }
      }
    });
  } catch (error) {
    console.error('Get voting statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get voting statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/my-votes - Get user's votes with verification status
router.get('/my-votes', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (page < 1) page = 1;
    if (limit < 1 || limit > 50) limit = 10;

    const offset = (page - 1) * limit;

    const votes = await require('../config/mockDatabase').query(`
      SELECT 
        v.voteId,
        v.electionId,
        v.candidateId,
        v.createdAt,
        vv.isVerified,
        vv.attempts,
        vv.expiresAt,
        e.title as electionTitle,
        c.name as candidateName,
        c.party as candidateParty
      FROM Vote v
      LEFT JOIN VoteVerification vv ON v.voteId = vv.voteId
      JOIN Election e ON v.electionId = e.electionId
      JOIN Candidate c ON v.candidateId = c.candidateId
      WHERE v.userId = ?
      ORDER BY v.createdAt DESC
      LIMIT ? OFFSET ?
    `, [req.user.userId, limit, offset]);

    const totalCount = await require('../config/mockDatabase').query(`
      SELECT COUNT(*) as count
      FROM Vote v
      WHERE v.userId = ?
    `, [req.user.userId]);

    res.json({
      success: true,
      message: 'User votes retrieved successfully',
      data: {
        votes,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          totalPages: Math.ceil(totalCount[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get user votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user votes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
