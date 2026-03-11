const express = require('express');
const validator = require('validator');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');
const {
  getDetailedElectionResults,
  getVotingTimeline,
  getVoterDemographics,
  getGeographicDistribution,
  getVotingPatterns,
  getComparativeAnalytics,
  getRealTimeAnalytics
} = require('../utils/analyticsUtils');
const { getElectionResults } = require('../utils/voteUtils');

const router = express.Router();

// GET /api/analytics/election/:electionId/results - Get detailed election results with analytics
router.get('/election/:electionId/results', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const results = await getDetailedElectionResults(electionId);

    res.json({
      success: true,
      message: 'Detailed election results retrieved successfully',
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get detailed election results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve detailed election results',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/analytics/election/:electionId/timeline - Get voting timeline analytics
router.get('/election/:electionId/timeline', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const interval = req.query.interval || 'hour';

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const validIntervals = ['minute', 'hour', 'day'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid interval. Must be: minute, hour, or day'
      });
    }

    const timeline = await getVotingTimeline(electionId, interval);

    res.json({
      success: true,
      message: 'Voting timeline retrieved successfully',
      data: timeline,
      timestamp: new Date().toISOString()
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

// GET /api/analytics/election/:electionId/demographics - Get voter demographics analytics
router.get('/election/:electionId/demographics', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const demographics = await getVoterDemographics(electionId);

    res.json({
      success: true,
      message: 'Voter demographics retrieved successfully',
      data: demographics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get voter demographics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve voter demographics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/analytics/election/:electionId/geographic - Get geographic distribution analytics
router.get('/election/:electionId/geographic', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const geographic = await getGeographicDistribution(electionId);

    res.json({
      success: true,
      message: 'Geographic distribution retrieved successfully',
      data: geographic,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get geographic distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve geographic distribution',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/analytics/election/:electionId/patterns - Get voting patterns analytics
router.get('/election/:electionId/patterns', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const patterns = await getVotingPatterns(electionId);

    res.json({
      success: true,
      message: 'Voting patterns retrieved successfully',
      data: patterns,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get voting patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve voting patterns',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/analytics/election/:electionId/realtime - Get real-time voting analytics
router.get('/election/:electionId/realtime', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const realtime = await getRealTimeAnalytics(electionId);

    res.json({
      success: true,
      message: 'Real-time analytics retrieved successfully',
      data: realtime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get real-time analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve real-time analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/analytics/compare - Compare multiple elections
router.post('/compare', authenticateToken, async (req, res) => {
  try {
    const { electionIds } = req.body;

    if (!Array.isArray(electionIds) || electionIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 election IDs are required for comparison'
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

    const comparison = await getComparativeAnalytics(electionIds);

    res.json({
      success: true,
      message: 'Election comparison retrieved successfully',
      data: comparison,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get election comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve election comparison',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/analytics/election/:electionId/summary - Get comprehensive summary
router.get('/election/:electionId/summary', authenticateToken, async (req, res) => {
  try {
    const electionId = req.params.electionId;

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    // Get all analytics data
    const [detailedResults, timeline, demographics, geographic, patterns, realtime] = await Promise.all([
      getDetailedElectionResults(electionId),
      getVotingTimeline(electionId),
      getVoterDemographics(electionId),
      getGeographicDistribution(electionId),
      getVotingPatterns(electionId),
      getRealTimeAnalytics(electionId)
    ]);

    res.json({
      success: true,
      message: 'Comprehensive election summary retrieved successfully',
      data: {
        election: detailedResults.election,
        results: detailedResults.results,
        statistics: detailedResults.analytics.statistics,
        timeline,
        demographics,
        geographic,
        patterns,
        realtime
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get comprehensive summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve comprehensive summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/analytics/dashboard - Get dashboard analytics (admin only)
router.get('/dashboard', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    // Get overall system statistics
    const systemStats = await require('../config/mockDatabase').query(`
      SELECT 
        COUNT(DISTINCT e.electionId) as totalElections,
        COUNT(DISTINCT e.electionId) FILTER (WHERE e.status = 'active') as activeElections,
        COUNT(DISTINCT e.electionId) FILTER (WHERE e.status = 'completed') as completedElections,
        COALESCE(SUM(e.totalVotes), 0) as totalVotesCast,
        COUNT(DISTINCT v.userId) as totalVoters,
        COUNT(DISTINCT c.candidateId) as totalCandidates
      FROM Election e
      LEFT JOIN Vote v ON e.electionId = v.electionId
      LEFT JOIN Candidate c ON e.electionId = c.electionId
    `);

    // Get recent activity
    const recentActivity = await require('../config/mockDatabase').query(`
      SELECT 
        'vote' as activityType,
        v.votedAt as timestamp,
        e.title as electionTitle,
        c.name as candidateName,
        u.email as voterEmail
      FROM Vote v
      JOIN Election e ON v.electionId = e.electionId
      JOIN Candidate c ON v.candidateId = c.candidateId
      JOIN User u ON v.userId = u.userId
      ORDER BY v.votedAt DESC
      LIMIT 10
    `);

    // Get top elections by participation
    const topElections = await require('../config/mockDatabase').query(`
      SELECT 
        e.electionId,
        e.title,
        e.status,
        e.totalVotes,
        COUNT(DISTINCT v.userId) as uniqueVoters,
        (e.totalVotes * 100.0 / (SELECT COUNT(*) FROM User WHERE isActive = 1)) as turnoutRate
      FROM Election e
      LEFT JOIN Vote v ON e.electionId = v.electionId
      GROUP BY e.electionId
      ORDER BY e.totalVotes DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      message: 'Dashboard analytics retrieved successfully',
      data: {
        systemStats: systemStats[0] || {},
        recentActivity,
        topElections
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dashboard analytics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/analytics/export/:electionId - Export election data (admin only)
router.get('/export/:electionId', authenticateToken, authorize('admin'), async (req, res) => {
  try {
    const electionId = req.params.electionId;
    const format = req.query.format || 'json';

    if (!validator.isInt(electionId.toString(), { min: 1 })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid election ID'
      });
    }

    const validFormats = ['json', 'csv'];
    if (!validFormats.includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Must be: json or csv'
      });
    }

    const detailedResults = await getDetailedElectionResults(electionId);

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(detailedResults);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=election_${electionId}_results.csv`);
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=election_${electionId}_results.json`);
      res.json(detailedResults);
    }
  } catch (error) {
    console.error('Export election data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export election data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to convert data to CSV
const convertToCSV = (data) => {
  const headers = ['Candidate ID', 'Name', 'Party', 'Vote Count', 'Percentage', 'Rank'];
  const rows = data.results.map(candidate => [
    candidate.candidateId,
    candidate.name,
    candidate.party || 'N/A',
    candidate.voteCount,
    candidate.percentage,
    candidate.rank
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(field => `"${field}"`).join(','))
  ].join('\n');

  return csvContent;
};

module.exports = router;
