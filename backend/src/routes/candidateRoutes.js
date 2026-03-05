const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize, authorizeSelf } = require('../middleware/authMiddleware');
const {
  createCandidate,
  getAllCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  getCandidatesByElection,
  addWriteInCandidate,
  getCandidateStats
} = require('../utils/candidateUtils');

const router = express.Router();

// Validation middleware for candidate creation
const validateCandidateCreation = (req, res, next) => {
  const {
    electionId,
    name,
    description,
    party,
    photoUrl,
    isWriteIn
  } = req.body;

  const errors = [];

  // Election ID validation
  if (!electionId) {
    errors.push('Election ID is required');
  } else if (!validator.isInt(electionId.toString(), { min: 1 })) {
    errors.push('Invalid election ID');
  }

  // Name validation
  if (!name) {
    errors.push('Candidate name is required');
  } else if (name.length < 2) {
    errors.push('Candidate name must be at least 2 characters long');
  } else if (name.length > 100) {
    errors.push('Candidate name must be less than 100 characters');
  }

  // Description validation
  if (description && description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  // Party validation
  if (party && party.length > 50) {
    errors.push('Party name must be less than 50 characters');
  }

  // Photo URL validation
  if (photoUrl && !validator.isURL(photoUrl)) {
    errors.push('Photo URL must be a valid URL');
  }

  // Write-in validation
  if (isWriteIn !== undefined && typeof isWriteIn !== 'boolean') {
    errors.push('Is write-in must be a boolean');
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

// Validation middleware for candidate updates
const validateCandidateUpdate = (req, res, next) => {
  const { name, description, party, photoUrl } = req.body;
  const errors = [];

  // Name validation (if provided)
  if (name !== undefined) {
    if (!name) {
      errors.push('Candidate name cannot be empty');
    } else if (name.length < 2) {
      errors.push('Candidate name must be at least 2 characters long');
    } else if (name.length > 100) {
      errors.push('Candidate name must be less than 100 characters');
    }
  }

  // Description validation (if provided)
  if (description !== undefined && description && description.length > 500) {
    errors.push('Description must be less than 500 characters');
  }

  // Party validation (if provided)
  if (party !== undefined && party && party.length > 50) {
    errors.push('Party name must be less than 50 characters');
  }

  // Photo URL validation (if provided)
  if (photoUrl !== undefined && photoUrl && !validator.isURL(photoUrl)) {
    errors.push('Photo URL must be a valid URL');
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

// GET /api/candidates - Get all candidates with optional filtering
router.get('/', async (req, res) => {
  try {
    const filters = {
      electionId: req.query.electionId,
      isWriteIn: req.query.isWriteIn === 'true' ? true : req.query.isWriteIn === 'false' ? false : undefined,
      party: req.query.party,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'name',
      sortOrder: req.query.sortOrder || 'ASC'
    };

    const result = await getAllCandidates(filters);

    res.json({
      success: true,
      message: 'Candidates retrieved successfully',
      data: result.candidates,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve candidates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/candidates/:id - Get specific candidate
router.get('/:id', async (req, res) => {
  try {
    const candidateId = req.params.id;

    if (!validator.isInt(candidateId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID'
      });
    }

    const result = await getCandidateById(candidateId);

    res.json({
      success: true,
      message: 'Candidate retrieved successfully',
      data: result.candidate
    });
  } catch (error) {
    console.error('Get candidate error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve candidate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/candidates - Create new candidate
router.post('/', authenticateToken, validateCandidateCreation, async (req, res) => {
  try {
    const result = await createCandidate(req.body);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        candidateId: result.candidateId
      }
    });
  } catch (error) {
    console.error('Create candidate error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/candidates/:id - Update candidate
router.put('/:id', authenticateToken, validateCandidateUpdate, async (req, res) => {
  try {
    const candidateId = req.params.id;

    if (!validator.isInt(candidateId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID'
      });
    }

    const result = await updateCandidate(candidateId, req.body, req.user.userId);

    res.json({
      success: true,
      message: result.message,
      data: {
        affectedRows: result.affectedRows
      }
    });
  } catch (error) {
    console.error('Update candidate error:', error);
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/candidates/:id - Delete candidate
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const candidateId = req.params.id;

    if (!validator.isInt(candidateId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID'
      });
    }

    const result = await deleteCandidate(candidateId, req.user.userId);

    res.json({
      success: true,
      message: result.message,
      data: {
        affectedRows: result.affectedRows
      }
    });
  } catch (error) {
    console.error('Delete candidate error:', error);
    if (error.message.includes('not found') || error.message.includes('permission')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/candidates/election/:electionId - Get candidates by election
router.get('/election/:electionId', async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const filters = {
      isWriteIn: req.query.isWriteIn === 'true' ? true : req.query.isWriteIn === 'false' ? false : undefined,
      includeVoteCount: req.query.includeVoteCount !== 'false',
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'name',
      sortOrder: req.query.sortOrder || 'ASC'
    };

    const result = await getCandidatesByElection(electionId, filters);

    res.json({
      success: true,
      message: 'Election candidates retrieved successfully',
      data: result.candidates,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get election candidates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve election candidates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/candidates/write-in - Add write-in candidate
router.post('/write-in', authenticateToken, async (req, res) => {
  try {
    const { electionId, name } = req.body;

    if (!electionId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Election ID and candidate name are required'
      });
    }

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Candidate name must be between 2 and 100 characters'
      });
    }

    const result = await addWriteInCandidate(electionId, name);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        candidateId: result.candidateId
      }
    });
  } catch (error) {
    console.error('Add write-in candidate error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/candidates/:id/stats - Get candidate statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const candidateId = req.params.id;

    if (!validator.isInt(candidateId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID'
      });
    }

    const result = await getCandidateStats(candidateId);

    res.json({
      success: true,
      message: 'Candidate statistics retrieved successfully',
      data: result.stats
    });
  } catch (error) {
    console.error('Get candidate stats error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve candidate statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/candidates/search - Search candidates
router.get('/search', async (req, res) => {
  try {
    const { q, electionId, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    if (q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // This would be implemented with a proper search in the database
    // For now, we'll use a simple LIKE query
    const filters = {
      limit: parseInt(limit),
      offset: 0,
      sortBy: 'name',
      sortOrder: 'ASC'
    };

    // Add search logic to getAllCandidates or create a separate search function
    const result = await getAllCandidates(filters);

    // Filter results client-side (in production, this should be done in SQL)
    const searchResults = result.candidates.filter(candidate => 
      candidate.name.toLowerCase().includes(q.toLowerCase()) ||
      (candidate.party && candidate.party.toLowerCase().includes(q.toLowerCase())) ||
      (candidate.description && candidate.description.toLowerCase().includes(q.toLowerCase()))
    );

    res.json({
      success: true,
      message: 'Candidates retrieved successfully',
      data: searchResults,
      pagination: {
        query: q,
        total: searchResults.length
      }
    });
  } catch (error) {
    console.error('Search candidates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search candidates',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
