const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const {
  startRealTimeCounting,
  stopRealTimeCounting,
  getRealTimeSummary,
  getVotingTimeline,
  getLeadingCandidate,
  cleanupElection,
  getActiveCountingElections,
  initializeMultipleElections
} = require('../utils/realtimeVoteCounting');

const router = express.Router();

// POST /api/realtime/start/:electionId - Start real-time counting for election
router.post('/start/:electionId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const { intervalMs = 5000 } = req.body;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    if (intervalMs && !validator.isInt(intervalMs.toString(), { min: 1000, max: 30000 })) {
      return res.status(400).json({
        success: false,
        message: 'Interval must be between 1000ms and 30000ms'
      });
    }

    startRealTimeCounting(electionId, intervalMs);

    res.json({
      success: true,
      message: 'Real-time vote counting started',
      data: {
        electionId,
        intervalMs,
        startedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Start real-time counting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start real-time counting',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/realtime/stop/:electionId - Stop real-time counting for election
router.post('/stop/:electionId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    stopRealTimeCounting(electionId);

    res.json({
      success: true,
      message: 'Real-time vote counting stopped',
      data: {
        electionId,
        stoppedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Stop real-time counting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop real-time counting',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/realtime/summary/:electionId - Get real-time election summary
router.get('/summary/:electionId', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const summary = await getRealTimeSummary(electionId);

    res.json({
      success: true,
      message: 'Real-time election summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    console.error('Get real-time summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve real-time summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/realtime/timeline/:electionId - Get voting timeline
router.get('/timeline/:electionId', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const minutes = parseInt(req.query.minutes) || 60;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    if (!validator.isInt(minutes.toString(), { min: 5, max: 1440 })) {
      return res.status(400).json({
        success: false,
        message: 'Minutes must be between 5 and 1440 (24 hours)'
      });
    }

    const timeline = await getVotingTimeline(electionId, minutes);

    res.json({
      success: true,
      message: 'Voting timeline retrieved successfully',
      data: timeline
    });
  } catch (error) {
    console.error('Get voting timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve voting timeline',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/realtime/leading/:electionId - Get leading candidate
router.get('/leading/:electionId', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const leadingCandidate = await getLeadingCandidate(electionId);

    res.json({
      success: true,
      message: 'Leading candidate retrieved successfully',
      data: {
        electionId,
        leadingCandidate,
        hasLeader: leadingCandidate !== null
      }
    });
  } catch (error) {
    console.error('Get leading candidate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leading candidate',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/realtime/refresh/:electionId - Force refresh vote counts
router.post('/refresh/:electionId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const { query } = require('../utils/realtimeVoteCounting');
    const voteCounts = await query.refreshVoteCounts(electionId);

    res.json({
      success: true,
      message: 'Vote counts refreshed successfully',
      data: {
        electionId,
        voteCounts,
        refreshedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Refresh vote counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to refresh vote counts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/realtime/active - Get all active real-time counting elections
router.get('/active', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const activeElections = getActiveCountingElections();

    res.json({
      success: true,
      message: 'Active real-time counting elections retrieved successfully',
      data: {
        activeElections,
        count: activeElections.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get active counting elections error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve active counting elections',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/realtime/cleanup/:electionId - Clean up resources for election
router.post('/cleanup/:electionId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    cleanupElection(electionId);

    res.json({
      success: true,
      message: 'Real-time counting resources cleaned up successfully',
      data: {
        electionId,
        cleanedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Cleanup real-time counting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup real-time counting resources',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/realtime/batch-start - Start real-time counting for multiple elections
router.post('/batch-start', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const { electionIds, intervalMs = 5000 } = req.body;

    if (!Array.isArray(electionIds) || electionIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Election IDs array is required'
      });
    }

    // Validate all election IDs
    for (const electionId of electionIds) {
      if (!validator.isInt(electionId.toString(), { min: 1 })) {
        return res.status(400).json({
          success: false,
          message: `Invalid election ID: ${electionId}`
        });
      }
    }

    if (intervalMs && !validator.isInt(intervalMs.toString(), { min: 1000, max: 30000 })) {
      return res.status(400).json({
        success: false,
        message: 'Interval must be between 1000ms and 30000ms'
      });
    }

    await initializeMultipleElections(electionIds);

    res.json({
      success: true,
      message: 'Real-time counting started for multiple elections',
      data: {
        electionIds,
        count: electionIds.length,
        intervalMs,
        startedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Batch start real-time counting error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start batch real-time counting',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
