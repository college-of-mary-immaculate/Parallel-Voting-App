const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize, authorizeSelf } = require('../middleware/authMiddleware');
const {
  createElection,
  getAllElections,
  getElectionById,
  updateElection,
  deleteElection,
  updateElectionStatus,
  getElectionsByUser
} = require('../utils/electionUtils');

const router = express.Router();

// Validation middleware for election creation
const validateElectionCreation = (req, res, next) => {
  const {
    title,
    description,
    type,
    startTime,
    endTime,
    eligibilityCriteria,
    maxCandidates,
    allowWriteIn,
    isPublic
  } = req.body;

  const errors = [];

  // Title validation
  if (!title) {
    errors.push('Title is required');
  } else if (title.length < 3) {
    errors.push('Title must be at least 3 characters long');
  } else if (title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }

  // Description validation
  if (description && description.length > 2000) {
    errors.push('Description must be less than 2000 characters');
  }

  // Type validation
  const validTypes = ['general', 'primary', 'referendum', 'special'];
  if (type && !validTypes.includes(type)) {
    errors.push('Invalid election type');
  }

  // Date validation
  if (!startTime) {
    errors.push('Start time is required');
  } else if (!validator.isISO8601(startTime)) {
    errors.push('Start time must be a valid ISO 8601 date');
  }

  if (!endTime) {
    errors.push('End time is required');
  } else if (!validator.isISO8601(endTime)) {
    errors.push('End time must be a valid ISO 8601 date');
  }

  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start >= end) {
      errors.push('Start time must be before end time');
    }

    if (start <= now) {
      errors.push('Start time must be in the future');
    }

    // Check if duration is reasonable (not too long)
    const duration = end - start;
    const maxDuration = 365 * 24 * 60 * 60 * 1000; // 1 year
    if (duration > maxDuration) {
      errors.push('Election duration cannot exceed 1 year');
    }
  }

  // Eligibility criteria validation
  if (eligibilityCriteria && eligibilityCriteria.length > 1000) {
    errors.push('Eligibility criteria must be less than 1000 characters');
  }

  // Max candidates validation
  if (maxCandidates !== undefined) {
    if (!validator.isInt(maxCandidates.toString(), { min: 1, max: 100 })) {
      errors.push('Max candidates must be between 1 and 100');
    }
  }

  // Boolean validation
  if (allowWriteIn !== undefined && typeof allowWriteIn !== 'boolean') {
    errors.push('Allow write-in must be a boolean');
  }

  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    errors.push('Is public must be a boolean');
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

// Validation middleware for election updates
const validateElectionUpdate = (req, res, next) => {
  const { title, description, type, startTime, endTime, eligibilityCriteria, maxCandidates, allowWriteIn, isPublic } = req.body;
  const errors = [];

  // Title validation (if provided)
  if (title !== undefined) {
    if (!title) {
      errors.push('Title cannot be empty');
    } else if (title.length < 3) {
      errors.push('Title must be at least 3 characters long');
    } else if (title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }
  }

  // Description validation (if provided)
  if (description !== undefined && description && description.length > 2000) {
    errors.push('Description must be less than 2000 characters');
  }

  // Type validation (if provided)
  if (type !== undefined) {
    const validTypes = ['general', 'primary', 'referendum', 'special'];
    if (!validTypes.includes(type)) {
      errors.push('Invalid election type');
    }
  }

  // Date validation (if provided)
  if (startTime !== undefined || endTime !== undefined) {
    if (startTime && !validator.isISO8601(startTime)) {
      errors.push('Start time must be a valid ISO 8601 date');
    }

    if (endTime && !validator.isISO8601(endTime)) {
      errors.push('End time must be a valid ISO 8601 date');
    }
  }

  // Max candidates validation (if provided)
  if (maxCandidates !== undefined && maxCandidates !== null) {
    if (!validator.isInt(maxCandidates.toString(), { min: 1, max: 100 })) {
      errors.push('Max candidates must be between 1 and 100');
    }
  }

  // Boolean validation (if provided)
  if (allowWriteIn !== undefined && typeof allowWriteIn !== 'boolean') {
    errors.push('Allow write-in must be a boolean');
  }

  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    errors.push('Is public must be a boolean');
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

// GET /api/elections - Get all elections with optional filtering
router.get('/', async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      type: req.query.type,
      isPublic: req.query.isPublic === 'true' ? true : req.query.isPublic === 'false' ? false : undefined,
      createdBy: req.query.createdBy,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'DESC'
    };

    const result = await getAllElections(filters);

    res.json({
      success: true,
      message: 'Elections retrieved successfully',
      data: result.elections,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get elections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve elections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/elections/:id - Get specific election
router.get('/:id', async (req, res) => {
  try {
    const electionId = req.params.id;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const result = await getElectionById(electionId);

    res.json({
      success: true,
      message: 'Election retrieved successfully',
      data: result.election
    });
  } catch (error) {
    console.error('Get election error:', error);
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve election',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/elections - Create new election
router.post('/', authenticateToken, validateElectionCreation, async (req, res) => {
  try {
    const electionData = {
      ...req.body,
      createdBy: req.user.userId
    };

    const result = await createElection(electionData);

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        electionId: result.electionId
      }
    });
  } catch (error) {
    console.error('Create election error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/elections/:id - Update election
router.put('/:id', authenticateToken, validateElectionUpdate, async (req, res) => {
  try {
    const electionId = req.params.id;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const result = await updateElection(electionId, req.body, req.user.userId);

    res.json({
      success: true,
      message: result.message,
      data: {
        affectedRows: result.affectedRows
      }
    });
  } catch (error) {
    console.error('Update election error:', error);
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

// DELETE /api/elections/:id - Delete election
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.id;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const result = await deleteElection(electionId, req.user.userId);

    res.json({
      success: true,
      message: result.message,
      data: {
        affectedRows: result.affectedRows
      }
    });
  } catch (error) {
    console.error('Delete election error:', error);
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

// PUT /api/elections/:id/status - Update election status
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.id;
    const { status } = req.body;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const result = await updateElectionStatus(electionId, status, req.user.userId);

    res.json({
      success: true,
      message: result.message,
      data: {
        affectedRows: result.affectedRows
      }
    });
  } catch (error) {
    console.error('Update election status error:', error);
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

// GET /api/elections/user/:userId - Get elections by user
router.get('/user/:userId', authenticateToken, authorizeSelf('userId'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const filters = {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await getElectionsByUser(userId, filters);

    res.json({
      success: true,
      message: 'User elections retrieved successfully',
      data: result.elections,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get user elections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user elections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/elections/my - Get current user's elections
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 20,
      offset: parseInt(req.query.offset) || 0
    };

    const result = await getElectionsByUser(req.user.userId, filters);

    res.json({
      success: true,
      message: 'Your elections retrieved successfully',
      data: result.elections,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        total: result.total
      }
    });
  } catch (error) {
    console.error('Get my elections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve your elections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;