const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize, authorizeSelf } = require('../middleware/authMiddleware');
const {
  castVote,
  getAllVotes,
  getVoteById,
  getVotesByElection,
  getVotesByCandidate,
  getVotesByUser,
  hasUserVoted,
  getElectionResults,
  deleteVote,
  getVotingStats
} = require('../utils/voteUtils');

const router = express.Router();

// Validation middleware for vote casting
const validateVoteCasting = (req, res, next) => {
  const {
    electionId,
    candidateId,
    voterInfo
  } = req.body;

  const errors = [];

  // Election ID validation
  if (!electionId) {
    errors.push('Election ID is required');
  } else if (!validator.isInt(electionId.toString(), { min: 1 })) {
    errors.push('Invalid election ID');
  }

  // Candidate ID validation
  if (!candidateId) {
    errors.push('Candidate ID is required');
  } else if (!validator.isInt(candidateId.toString(), { min: 1 })) {
    errors.push('Invalid candidate ID');
  }

  // Voter info validation (optional)
  if (voterInfo && typeof voterInfo === 'string' && voterInfo.length > 500) {
    errors.push('Voter info must be less than 500 characters');
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

// POST /api/votes - Cast a vote
router.post('/', authenticateToken, validateVoteCasting, async (req, res) => {
  try {
    const voteData = {
      electionId: req.body.electionId,
      candidateId: req.body.candidateId,
      userId: req.user.userId,
      voterInfo: req.body.voterInfo || null
    };

    const result = await castVote(voteData);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        voteId: result.voteId,
        electionTitle: result.data.electionTitle,
        candidateName: result.data.candidateName,
        votedAt: result.data.votedAt
      }
    });
  } catch (error) {
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
  }
});

// GET /api/votes - Get all votes (admin only)
router.get('/', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const filters = {
      electionId: req.query.electionId,
      candidateId: req.query.candidateId,
      userId: req.query.userId,
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'votedAt',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await getAllVotes(filters);

    res.json({
      success: true,
      message: 'Votes retrieved successfully',
      data: result.votes,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve votes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/:id - Get specific vote (admin only)
router.get('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const voteId = req.params.id;

    if (!validator.isInt(voteId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote ID'
      });
    }

    const result = await getVoteById(voteId);

    res.json({
      success: true,
      message: 'Vote retrieved successfully',
      data: result.vote
    });
  } catch (error) {
    console.error('Get vote error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve vote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/election/:electionId - Get votes by election (admin only)
router.get('/election/:electionId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const filters = {
      candidateId: req.query.candidateId,
      includeVoterInfo: req.query.includeVoterInfo === 'true',
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'votedAt',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await getVotesByElection(electionId, filters);

    res.json({
      success: true,
      message: 'Election votes retrieved successfully',
      data: result.votes,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get election votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve election votes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/candidate/:candidateId - Get votes by candidate (admin only)
router.get('/candidate/:candidateId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    if (!validator.isInt(candidateId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID'
      });
    }

    const filters = {
      includeVoterInfo: req.query.includeVoterInfo === 'true',
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'votedAt',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await getVotesByCandidate(candidateId, filters);

    res.json({
      success: true,
      message: 'Candidate votes retrieved successfully',
      data: result.votes,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get candidate votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve candidate votes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/user/:userId - Get votes by user
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!validator.isInt(userId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Users can only see their own votes unless they're admin
    if (userId != req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own votes'
      });
    }

    const filters = {
      electionId: req.query.electionId,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'votedAt',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await getVotesByUser(userId, filters);

    res.json({
      success: true,
      message: 'User votes retrieved successfully',
      data: result.votes,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get user votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user votes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/my - Get current user's votes
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const filters = {
      electionId: req.query.electionId,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'votedAt',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await getVotesByUser(req.user.userId, filters);

    res.json({
      success: true,
      message: 'Your votes retrieved successfully',
      data: result.votes,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get my votes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your votes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/check/:electionId - Check if user has voted in election
router.get('/check/:electionId', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const result = await hasUserVoted(electionId, req.user.userId);

    res.json({
      success: true,
      message: 'Vote status checked successfully',
      data: {
        hasVoted: result.hasVoted,
        voteInfo: result.voteInfo
      }
    });
  } catch (error) {
    console.error('Check vote status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check vote status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/results/:electionId - Get election results
router.get('/results/:electionId', async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const result = await getElectionResults(electionId);

    res.json({
      success: true,
      message: 'Election results retrieved successfully',
      data: {
        election: result.election,
        results: result.results,
        totalVotes: result.totalVotes
      }
    });
  } catch (error) {
    console.error('Get election results error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve election results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/votes/stats/:electionId - Get voting statistics (admin only)
router.get('/stats/:electionId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const result = await getVotingStats(electionId);

    res.json({
      success: true,
      message: 'Voting statistics retrieved successfully',
      data: result.stats
    });
  } catch (error) {
    console.error('Get voting stats error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve voting statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/votes/:id - Delete vote (admin only)
router.delete('/:id', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const voteId = req.params.id;

    if (!validator.isInt(voteId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vote ID'
      });
    }

    const result = await deleteVote(voteId, req.user.userId);

    res.json({
      success: true,
      message: result.message,
      data: result.data
    });
  } catch (error) {
    console.error('Delete vote error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to delete vote',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
