const { query } = require('../config/mockDatabase');

/**
 * Election Results & Analytics Utilities
 * Provides comprehensive analytics and statistics for elections
 */

/**
 * Get detailed election results with analytics
 */
const getDetailedElectionResults = async (electionId) => {
  try {
    // Get election information
    const election = await query(
      'SELECT * FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      throw new Error('Election not found');
    }

    const electionData = election[0];

    // Get candidate results with detailed statistics
    const candidateResults = await query(
      `SELECT 
        c.candidateId,
        c.name,
        c.party,
        c.description,
        c.isWriteIn,
        c.status,
        COUNT(v.voteId) as voteCount,
        COUNT(DISTINCT v.userId) as uniqueVoters,
        MIN(v.votedAt) as firstVoteTime,
        MAX(v.votedAt) as lastVoteTime,
        COUNT(CASE WHEN v.votedAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 END) as votesLastHour,
        COUNT(CASE WHEN v.votedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as votesLast24Hours
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.electionId = ?
      GROUP BY c.candidateId
      ORDER BY voteCount DESC`,
      [electionId]
    );

    // Calculate total votes and percentages
    const totalVotes = candidateResults.reduce((sum, candidate) => sum + candidate.voteCount, 0);
    const totalVoters = candidateResults.reduce((sum, candidate) => sum + candidate.uniqueVoters, 0);

    // Add percentages and rankings
    const resultsWithAnalytics = candidateResults.map((candidate, index) => ({
      ...candidate,
      percentage: totalVotes > 0 ? parseFloat(((candidate.voteCount / totalVotes) * 100).toFixed(2)) : 0,
      rank: index + 1,
      voteShare: totalVotes > 0 ? parseFloat(((candidate.voteCount / totalVotes) * 100).toFixed(2)) : 0,
      voterShare: totalVoters > 0 ? parseFloat(((candidate.uniqueVoters / totalVoters) * 100).toFixed(2)) : 0
    }));

    // Get voting timeline analytics
    const votingTimeline = await getVotingTimeline(electionId);

    // Get voter demographics
    const voterDemographics = await getVoterDemographics(electionId);

    // Get geographic distribution
    const geographicDistribution = await getGeographicDistribution(electionId);

    // Get voting patterns
    const votingPatterns = await getVotingPatterns(electionId);

    return {
      success: true,
      election: {
        ...electionData,
        totalVotes,
        totalVoters,
        candidateCount: candidateResults.length,
        activeCandidates: candidateResults.filter(c => c.status === 'active').length
      },
      results: resultsWithAnalytics,
      analytics: {
        votingTimeline,
        voterDemographics,
        geographicDistribution,
        votingPatterns,
        statistics: {
          averageVotesPerCandidate: candidateResults.length > 0 ? Math.round(totalVotes / candidateResults.length) : 0,
          leadingMargin: resultsWithAnalytics.length >= 2 ? 
            resultsWithAnalytics[0].voteCount - (resultsWithAnalytics[1]?.voteCount || 0) : 0,
          isCloseRace: resultsWithAnalytics.length >= 2 && 
            Math.abs(resultsWithAnalytics[0].voteCount - (resultsWithAnalytics[1]?.voteCount || 0)) <= 5,
          turnoutRate: await calculateTurnoutRate(electionId),
          votingDuration: await calculateVotingDuration(electionId)
        }
      }
    };
  } catch (error) {
    throw new Error(`Failed to get detailed election results: ${error.message}`);
  }
};

/**
 * Get voting timeline analytics
 */
const getVotingTimeline = async (electionId, interval = 'hour') => {
  try {
    let timeFormat;
    switch (interval) {
      case 'minute':
        timeFormat = '%Y-%m-%d %H:%i';
        break;
      case 'hour':
        timeFormat = '%Y-%m-%d %H:00';
        break;
      case 'day':
        timeFormat = '%Y-%m-%d';
        break;
      default:
        timeFormat = '%Y-%m-%d %H:00';
    }

    const timeline = await query(
      `SELECT 
        DATE_FORMAT(v.votedAt, '${timeFormat}') as timeSlot,
        COUNT(*) as totalVotes,
        COUNT(DISTINCT v.userId) as uniqueVoters,
        COUNT(DISTINCT v.candidateId) as candidatesVotedFor,
        AVG(TIMESTAMPDIFF(MINUTE, 
          (SELECT MIN(v2.votedAt) FROM Vote v2 WHERE v2.electionId = v.electionId), 
          v.votedAt
        )) as avgMinutesFromStart
      FROM Vote v
      WHERE v.electionId = ?
      GROUP BY timeSlot
      ORDER BY timeSlot`,
      [electionId]
    );

    return {
      interval,
      timeline: timeline.map(item => ({
        ...item,
        avgMinutesFromStart: Math.round(item.avgMinutesFromStart || 0)
      }))
    };
  } catch (error) {
    throw new Error(`Failed to get voting timeline: ${error.message}`);
  }
};

/**
 * Get voter demographics analytics
 */
const getVoterDemographics = async (electionId) => {
  try {
    // Age distribution
    const ageDistribution = await query(
      `SELECT 
        CASE 
          WHEN TIMESTAMPDIFF(YEAR, u.dateOfBirth, CURDATE()) BETWEEN 18 AND 24 THEN '18-24'
          WHEN TIMESTAMPDIFF(YEAR, u.dateOfBirth, CURDATE()) BETWEEN 25 AND 34 THEN '25-34'
          WHEN TIMESTAMPDIFF(YEAR, u.dateOfBirth, CURDATE()) BETWEEN 35 AND 44 THEN '35-44'
          WHEN TIMESTAMPDIFF(YEAR, u.dateOfBirth, CURDATE()) BETWEEN 45 AND 54 THEN '45-54'
          WHEN TIMESTAMPDIFF(YEAR, u.dateOfBirth, CURDATE()) BETWEEN 55 AND 64 THEN '55-64'
          ELSE '65+'
        END as ageGroup,
        COUNT(*) as voterCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
      GROUP BY ageGroup
      ORDER BY voterCount DESC`,
      [electionId, electionId]
    );

    // Gender distribution (if available)
    const genderDistribution = await query(
      `SELECT 
        COALESCE(u.gender, 'Not Specified') as gender,
        COUNT(*) as voterCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
      GROUP BY u.gender
      ORDER BY voterCount DESC`,
      [electionId, electionId]
    );

    // Role distribution
    const roleDistribution = await query(
      `SELECT 
        u.role,
        COUNT(*) as voterCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
      GROUP BY u.role
      ORDER BY voterCount DESC`,
      [electionId, electionId]
    );

    // Registration duration distribution
    const registrationDistribution = await query(
      `SELECT 
        CASE 
          WHEN TIMESTAMPDIFF(DAY, u.createdAt, CURDATE()) < 30 THEN '< 30 days'
          WHEN TIMESTAMPDIFF(DAY, u.createdAt, CURDATE()) < 90 THEN '30-90 days'
          WHEN TIMESTAMPDIFF(DAY, u.createdAt, CURDATE()) < 365 THEN '90-365 days'
          WHEN TIMESTAMPDIFF(DAY, u.createdAt, CURDATE()) < 1825 THEN '1-5 years'
          ELSE '> 5 years'
        END as registrationDuration,
        COUNT(*) as voterCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
      GROUP BY registrationDuration
      ORDER BY voterCount DESC`,
      [electionId, electionId]
    );

    return {
      ageDistribution,
      genderDistribution,
      roleDistribution,
      registrationDistribution
    };
  } catch (error) {
    throw new Error(`Failed to get voter demographics: ${error.message}`);
  }
};

/**
 * Get geographic distribution analytics
 */
const getGeographicDistribution = async (electionId) => {
  try {
    // Country distribution
    const countryDistribution = await query(
      `SELECT 
        COALESCE(u.country, 'Unknown') as country,
        COUNT(*) as voterCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
      GROUP BY u.country
      ORDER BY voterCount DESC`,
      [electionId, electionId]
    );

    // City distribution
    const cityDistribution = await query(
      `SELECT 
        COALESCE(u.city, 'Unknown') as city,
        COUNT(*) as voterCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
      GROUP BY u.city
      HAVING voterCount > 0
      ORDER BY voterCount DESC
      LIMIT 20`,
      [electionId, electionId]
    );

    // Region/state distribution
    const regionDistribution = await query(
      `SELECT 
        COALESCE(u.state, 'Unknown') as region,
        COUNT(*) as voterCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
      GROUP BY u.state
      HAVING voterCount > 0
      ORDER BY voterCount DESC`,
      [electionId, electionId]
    );

    return {
      countryDistribution,
      cityDistribution,
      regionDistribution
    };
  } catch (error) {
    throw new Error(`Failed to get geographic distribution: ${error.message}`);
  }
};

/**
 * Get voting patterns analytics
 */
const getVotingPatterns = async (electionId) => {
  try {
    // Peak voting hours
    const peakVotingHours = await query(
      `SELECT 
        HOUR(v.votedAt) as hourOfDay,
        COUNT(*) as voteCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      WHERE v.electionId = ?
      GROUP BY HOUR(v.votedAt)
      ORDER BY voteCount DESC`,
      [electionId, electionId]
    );

    // Day of week voting patterns
    const dayOfWeekPatterns = await query(
      `SELECT 
        DAYNAME(v.votedAt) as dayOfWeek,
        DAYOFWEEK(v.votedAt) as dayIndex,
        COUNT(*) as voteCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      WHERE v.electionId = ?
      GROUP BY DAYNAME(v.votedAt), DAYOFWEEK(v.votedAt)
      ORDER BY dayIndex`,
      [electionId, electionId]
    );

    // Device type distribution (from user agent)
    const deviceDistribution = await query(
      `SELECT 
        CASE 
          WHEN v.userAgent LIKE '%Mobile%' OR v.userAgent LIKE '%Android%' OR v.userAgent LIKE '%iPhone%' THEN 'Mobile'
          WHEN v.userAgent LIKE '%Tablet%' OR v.userAgent LIKE '%iPad%' THEN 'Tablet'
          ELSE 'Desktop'
        END as deviceType,
        COUNT(*) as voteCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as percentage
      FROM Vote v
      WHERE v.electionId = ? AND v.userAgent IS NOT NULL
      GROUP BY deviceType
      ORDER BY voteCount DESC`,
      [electionId, electionId]
    );

    // Browser distribution
    const browserDistribution = await query(
      `SELECT 
        CASE 
          WHEN v.userAgent LIKE '%Chrome%' THEN 'Chrome'
          WHEN v.userAgent LIKE '%Firefox%' THEN 'Firefox'
          WHEN v.userAgent LIKE '%Safari%' AND v.userAgent NOT LIKE '%Chrome%' THEN 'Safari'
          WHEN v.userAgent LIKE '%Edge%' THEN 'Edge'
          WHEN v.userAgent LIKE '%Opera%' THEN 'Opera'
          ELSE 'Other'
        END as browser,
        COUNT(*) as voteCount,
        COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ? AND v.userAgent IS NOT NULL) as percentage
      FROM Vote v
      WHERE v.electionId = ? AND v.userAgent IS NOT NULL
      GROUP BY browser
      ORDER BY voteCount DESC`,
      [electionId, electionId]
    );

    return {
      peakVotingHours,
      dayOfWeekPatterns,
      deviceDistribution,
      browserDistribution
    };
  } catch (error) {
    throw new Error(`Failed to get voting patterns: ${error.message}`);
  }
};

/**
 * Calculate turnout rate
 */
const calculateTurnoutRate = async (electionId) => {
  try {
    // Get total eligible voters (this would depend on your eligibility criteria)
    const totalEligibleVoters = await query(
      'SELECT COUNT(*) as count FROM User WHERE isActive = 1 AND role != "banned"'
    );

    const totalVotes = await query(
      'SELECT COUNT(DISTINCT userId) as count FROM Vote WHERE electionId = ?',
      [electionId]
    );

    const turnoutRate = totalEligibleVoters[0].count > 0 ? 
      parseFloat(((totalVotes[0].count / totalEligibleVoters[0].count) * 100).toFixed(2)) : 0;

    return {
      totalEligibleVoters: totalEligibleVoters[0].count,
      totalVoters: totalVotes[0].count,
      turnoutRate
    };
  } catch (error) {
    throw new Error(`Failed to calculate turnout rate: ${error.message}`);
  }
};

/**
 * Calculate voting duration statistics
 */
const calculateVotingDuration = async (electionId) => {
  try {
    const durationStats = await query(
      `SELECT 
        MIN(votedAt) as firstVote,
        MAX(votedAt) as lastVote,
        TIMESTAMPDIFF(MINUTE, MIN(votedAt), MAX(votedAt)) as totalDurationMinutes,
        AVG(TIMESTAMPDIFF(MINUTE, 
          (SELECT MIN(v2.votedAt) FROM Vote v2 WHERE v2.electionId = v.electionId), 
          v.votedAt
        )) as avgMinutesFromStart,
        MIN(TIMESTAMPDIFF(MINUTE, 
          (SELECT MIN(v2.votedAt) FROM Vote v2 WHERE v2.electionId = v.electionId), 
          v.votedAt
        )) as minMinutesFromStart,
        MAX(TIMESTAMPDIFF(MINUTE, 
          (SELECT MIN(v2.votedAt) FROM Vote v2 WHERE v2.electionId = v.electionId), 
          v.votedAt
        )) as maxMinutesFromStart
      FROM Vote v
      WHERE v.electionId = ?`,
      [electionId]
    );

    return durationStats[0] || {};
  } catch (error) {
    throw new Error(`Failed to calculate voting duration: ${error.message}`);
  }
};

/**
 * Get comparative analytics between elections
 */
const getComparativeAnalytics = async (electionIds) => {
  try {
    const elections = await query(
      `SELECT electionId, title, status, totalVotes, startTime, endTime
       FROM Election 
       WHERE electionId IN (${electionIds.join(',')})
       ORDER BY startTime DESC`
    );

    const comparison = await Promise.all(
      elections.map(async (election) => {
        const analytics = await getDetailedElectionResults(election.electionId);
        return {
          electionId: election.electionId,
          title: election.title,
          status: election.status,
          totalVotes: election.totalVotes,
          ...analytics.analytics.statistics
        };
      })
    );

    return {
      success: true,
      elections: comparison
    };
  } catch (error) {
    throw new Error(`Failed to get comparative analytics: ${error.message}`);
  }
};

/**
 * Get real-time voting analytics
 */
const getRealTimeAnalytics = async (electionId) => {
  try {
    // Current voting activity
    const currentActivity = await query(
      `SELECT 
        COUNT(*) as votesLastMinute,
        COUNT(*) as votesLast5Minutes,
        COUNT(*) as votesLastHour,
        COUNT(DISTINCT userId) as activeVotersLastHour
      FROM Vote v
      WHERE v.electionId = ? 
        AND v.votedAt >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [electionId]
    );

    // Recent votes with candidate info
    const recentVotes = await query(
      `SELECT 
        v.voteId,
        v.votedAt,
        c.name as candidateName,
        c.party,
        u.email as voterEmail
      FROM Vote v
      JOIN Candidate c ON v.candidateId = c.candidateId
      JOIN User u ON v.userId = u.userId
      WHERE v.electionId = ?
      ORDER BY v.votedAt DESC
      LIMIT 10`,
      [electionId]
    );

    // Live leaderboard
    const liveLeaderboard = await query(
      `SELECT 
        c.candidateId,
        c.name,
        c.party,
        COUNT(v.voteId) as currentVotes,
        COUNT(v.voteId) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?) as currentPercentage
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.electionId = ? AND c.status = 'active'
      GROUP BY c.candidateId
      ORDER BY currentVotes DESC`,
      [electionId, electionId]
    );

    return {
      success: true,
      currentActivity: currentActivity[0] || {},
      recentVotes,
      liveLeaderboard,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to get real-time analytics: ${error.message}`);
  }
};

module.exports = {
  getDetailedElectionResults,
  getVotingTimeline,
  getVoterDemographics,
  getGeographicDistribution,
  getVotingPatterns,
  calculateTurnoutRate,
  calculateVotingDuration,
  getComparativeAnalytics,
  getRealTimeAnalytics
};
