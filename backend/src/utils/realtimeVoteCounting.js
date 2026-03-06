const { query } = require('../config/mockDatabase');
const { 
  emitRealTimeVoteCount,
  emitResultsUpdate,
  emitVotingStats,
  setSocketInstance
} = require('../utils/socketUtils');

/**
 * Real-time Vote Counting Service
 * Handles live vote counting and broadcasting
 */

// Store active vote counting intervals
const activeCountingIntervals = new Map();

// Store vote count cache for performance
const voteCountCache = new Map();

/**
 * Initialize real-time vote counting for an election
 */
const startRealTimeCounting = (electionId, intervalMs = 5000) => {
  if (activeCountingIntervals.has(electionId)) {
    console.log(`Real-time counting already active for election ${electionId}`);
    return;
  }

  console.log(`📊 Starting real-time vote counting for election ${electionId}`);

  const interval = setInterval(async () => {
    try {
      await updateVoteCounts(electionId);
    } catch (error) {
      console.error(`Error updating vote counts for election ${electionId}:`, error.message);
    }
  }, intervalMs);

  activeCountingIntervals.set(electionId, interval);
  
  // Initial vote count update
  updateVoteCounts(electionId);
};

/**
 * Stop real-time vote counting for an election
 */
const stopRealTimeCounting = (electionId) => {
  const interval = activeCountingIntervals.get(electionId);
  
  if (interval) {
    clearInterval(interval);
    activeCountingIntervals.delete(electionId);
    console.log(`⏹ Stopped real-time vote counting for election ${electionId}`);
  }
};

/**
 * Update vote counts for all candidates in an election
 */
const updateVoteCounts = async (electionId) => {
  try {
    // Get current vote counts from database
    const voteCounts = await query(
      `SELECT 
        c.candidateId, c.name, c.party,
        COUNT(v.voteId) as voteCount
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.electionId = ?
      GROUP BY c.candidateId
      ORDER BY voteCount DESC`,
      [electionId]
    );

    // Check if counts have changed
    const cacheKey = `election_${electionId}`;
    const previousCounts = voteCountCache.get(cacheKey) || {};
    
    let hasChanges = false;
    const currentCounts = {};

    voteCounts.forEach(candidate => {
      currentCounts[candidate.candidateId] = candidate.voteCount;
      
      if (previousCounts[candidate.candidateId] !== candidate.voteCount) {
        hasChanges = true;
        
        // Emit real-time update for this candidate
        emitRealTimeVoteCount(electionId, candidate.candidateId, candidate.voteCount);
      }
    });

    // Update cache
    voteCountCache.set(cacheKey, currentCounts);

    // If there are changes, emit complete results update
    if (hasChanges) {
      const results = voteCounts.map(candidate => ({
        candidateId: candidate.candidateId,
        name: candidate.name,
        party: candidate.party,
        voteCount: candidate.voteCount,
        percentage: calculatePercentage(candidate.voteCount, voteCounts)
      }));

      emitResultsUpdate(electionId, results);
      
      console.log(`📊 Updated vote counts for election ${electionId}:`, 
        voteCounts.map(c => `${c.name}: ${c.voteCount}`).join(', '));
    }

    return voteCounts;
  } catch (error) {
    console.error(`Failed to update vote counts for election ${electionId}:`, error.message);
    throw error;
  }
};

/**
 * Calculate percentage for a candidate
 */
const calculatePercentage = (candidateVotes, allCandidates) => {
  const totalVotes = allCandidates.reduce((sum, candidate) => sum + candidate.voteCount, 0);
  
  if (totalVotes === 0) {
    return 0;
  }

  return parseFloat(((candidateVotes / totalVotes) * 100).toFixed(2));
};

/**
 * Get current vote counts from cache
 */
const getCachedVoteCounts = (electionId) => {
  const cacheKey = `election_${electionId}`;
  return voteCountCache.get(cacheKey) || {};
};

/**
 * Force refresh vote counts for an election
 */
const refreshVoteCounts = async (electionId) => {
  console.log(`🔄 Forcing vote count refresh for election ${electionId}`);
  return await updateVoteCounts(electionId);
};

/**
 * Get real-time election summary
 */
const getRealTimeSummary = async (electionId) => {
  try {
    const voteCounts = await updateVoteCounts(electionId);
    const totalVotes = voteCounts.reduce((sum, candidate) => sum + candidate.voteCount, 0);
    
    // Get election details
    const election = await query(
      'SELECT title, status, startTime, endTime FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      throw new Error('Election not found');
    }

    const electionData = election[0];
    const now = new Date();
    const startTime = new Date(electionData.startTime);
    const endTime = new Date(electionData.endTime);

    return {
      electionId,
      title: electionData.title,
      status: electionData.status,
      isActive: electionData.status === 'active' && now >= startTime && now <= endTime,
      totalVotes,
      candidates: voteCounts.map(candidate => ({
        candidateId: candidate.candidateId,
        name: candidate.name,
        party: candidate.party,
        voteCount: candidate.voteCount,
        percentage: calculatePercentage(candidate.voteCount, voteCounts)
      })),
      timestamp: new Date().toISOString(),
      realTimeCounting: activeCountingIntervals.has(electionId)
    };
  } catch (error) {
    console.error(`Failed to get real-time summary for election ${electionId}:`, error.message);
    throw error;
  }
};

/**
 * Get voting activity timeline
 */
const getVotingTimeline = async (electionId, minutes = 60) => {
  try {
    const timeline = await query(
      `SELECT 
        DATE_FORMAT(v.votedAt, '%Y-%m-%d %H:%i') as timeSlot,
        COUNT(*) as votes,
        COUNT(DISTINCT v.candidateId) as uniqueCandidates
      FROM Vote v
      WHERE v.electionId = ? 
        AND v.votedAt >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
      GROUP BY DATE_FORMAT(v.votedAt, '%Y-%m-%d %H:%i')
      ORDER BY timeSlot DESC
      LIMIT 20`,
      [electionId, minutes]
    );

    return {
      electionId,
      timeRange: `Last ${minutes} minutes`,
      timeline: timeline.map(item => ({
        timeSlot: item.timeSlot,
        votes: item.votes,
        uniqueCandidates: item.uniqueCandidates
      })),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Failed to get voting timeline for election ${electionId}:`, error.message);
    throw error;
  }
};

/**
 * Get leading candidate
 */
const getLeadingCandidate = async (electionId) => {
  try {
    const result = await query(
      `SELECT 
        c.candidateId, c.name, c.party,
        COUNT(v.voteId) as voteCount
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.electionId = ?
      GROUP BY c.candidateId
      ORDER BY voteCount DESC
      LIMIT 1`,
      [electionId]
    );

    if (result.length === 0) {
      return null;
    }

    const candidate = result[0];
    
    // Get total votes for percentage calculation
    const totalVotes = await query(
      'SELECT COUNT(*) as total FROM Vote WHERE electionId = ?',
      [electionId]
    );

    return {
      candidateId: candidate.candidateId,
      name: candidate.name,
      party: candidate.party,
      voteCount: candidate.voteCount,
      percentage: calculatePercentage(candidate.voteCount, [{ voteCount: candidate.voteCount }])
    };
  } catch (error) {
    console.error(`Failed to get leading candidate for election ${electionId}:`, error.message);
    throw error;
  }
};

/**
 * Clean up resources for an election
 */
const cleanupElection = (electionId) => {
  stopRealTimeCounting(electionId);
  
  const cacheKey = `election_${electionId}`;
  voteCountCache.delete(cacheKey);
  
  console.log(`🧹 Cleaned up real-time counting resources for election ${electionId}`);
};

/**
 * Get all active real-time counting elections
 */
const getActiveCountingElections = () => {
  return Array.from(activeCountingIntervals.keys());
};

/**
 * Initialize real-time counting for multiple elections
 */
const initializeMultipleElections = async (electionIds) => {
  console.log(`📊 Initializing real-time counting for ${electionIds.length} elections`);
  
  for (const electionId of electionIds) {
    try {
      await updateVoteCounts(electionId);
      startRealTimeCounting(electionId);
    } catch (error) {
      console.error(`Failed to initialize counting for election ${electionId}:`, error.message);
    }
  }
};

module.exports = {
  startRealTimeCounting,
  stopRealTimeCounting,
  updateVoteCounts,
  getCachedVoteCounts,
  refreshVoteCounts,
  getRealTimeSummary,
  getVotingTimeline,
  getLeadingCandidate,
  cleanupElection,
  getActiveCountingElections,
  initializeMultipleElections
};
