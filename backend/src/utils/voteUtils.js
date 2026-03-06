const { query } = require('../config/mockDatabase');
const { 
  emitVoteCast, 
  emitResultsUpdate, 
  emitVoteDeleted,
  emitElectionStart,
  emitElectionEnd
} = require('./socketUtils');
const { validateVote, validateVoteDeletion } = require('./voteValidation');

/**
 * Vote Utilities
 * Provides database operations for voting system
 */

// Cast a vote
const castVote = async (voteData) => {
  const {
    electionId,
    candidateId,
    userId,
    voterInfo,
    writeInCandidate
  } = voteData;

  try {
    // Comprehensive vote validation
    const validation = await validateVote(userId, electionId, candidateId, writeInCandidate);
    
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        message: validation.message,
        validationResults: validation.validationResults
      };
    }

    await query('START TRANSACTION');

    // Handle write-in candidate if provided
    let finalCandidateId = candidateId;
    if (writeInCandidate) {
      const writeInResult = await query(
        `INSERT INTO Candidate (
          electionId, name, description, party, 
          isWriteIn, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [
          electionId,
          writeInCandidate.name,
          writeInCandidate.description || null,
          writeInCandidate.party || 'Independent',
          1
        ]
      );
      finalCandidateId = writeInResult.insertId;
    }

    // Cast the vote
    const voteResult = await query(
      `INSERT INTO Vote (
        electionId, candidateId, userId, ipAddress, 
        userAgent, votedAt
      ) VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        electionId,
        finalCandidateId,
        userId,
        voterInfo?.ipAddress || null,
        voterInfo?.userAgent || null
      ]
    );

    // Update candidate vote count
    await query(
      'UPDATE Candidate SET voteCount = voteCount + 1 WHERE candidateId = ?',
      [finalCandidateId]
    );

    // Update election vote count (optional, can be calculated)
    await query(
      'UPDATE Election SET totalVotes = totalVotes + 1 WHERE electionId = ?',
      [electionId]
    );

    await query('COMMIT');

    // Get candidate name for notification
    const candidateData = await query(
      'SELECT name FROM Candidate WHERE candidateId = ?',
      [finalCandidateId]
    );

    // Get user email for notification
    const userData = await query(
      'SELECT email FROM User WHERE userId = ?',
      [userId]
    );

    // Emit real-time vote cast event
    emitVoteCast(electionId, finalCandidateId, candidateData[0]?.name || 'Unknown', userData[0]?.email || 'Anonymous');

    // Emit updated results
    const results = await getElectionResults(electionId);
    emitResultsUpdate(electionId, results.results);

    return {
      success: true,
      voteId: voteResult.insertId,
      message: 'Vote cast successfully',
      data: {
        electionTitle: validation.election.title,
        candidateName: candidateData[0]?.name || 'Unknown',
        votedAt: new Date().toISOString(),
        validationPassed: true
      }
    };
  } catch (error) {
    await query('ROLLBACK');
    throw new Error(`Failed to cast vote: ${error.message}`);
  }
};

// Get all votes with optional filtering (admin only)
const getAllVotes = async (filters = {}) => {
  const {
    electionId,
    candidateId,
    userId,
    limit = 100,
    offset = 0,
    sortBy = 'votedAt',
    sortOrder = 'DESC'
  } = filters;

  try {
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Add filters
    if (electionId) {
      whereClause += ' AND v.electionId = ?';
      params.push(electionId);
    }

    if (candidateId) {
      whereClause += ' AND v.candidateId = ?';
      params.push(candidateId);
    }

    if (userId) {
      whereClause += ' AND v.userId = ?';
      params.push(userId);
    }

    // Add sorting and pagination
    const orderByClause = `ORDER BY v.${sortBy} ${sortOrder}`;
    const limitClause = `LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const votes = await query(
      `SELECT 
        v.voteId, v.electionId, v.candidateId, v.userId, v.voterInfo, v.votedAt,
        e.title as electionTitle,
        c.name as candidateName, c.party,
        u.fullname as voterName, u.email as voterEmail
      FROM Vote v
      LEFT JOIN Election e ON v.electionId = e.electionId
      LEFT JOIN Candidate c ON v.candidateId = c.candidateId
      LEFT JOIN User u ON v.userId = u.userId
      ${whereClause}
      ${orderByClause}
      ${limitClause}`,
      params
    );

    return {
      success: true,
      votes,
      total: votes.length
    };
  } catch (error) {
    throw new Error(`Failed to fetch votes: ${error.message}`);
  }
};

// Get vote by ID
const getVoteById = async (voteId) => {
  if (!voteId) {
    throw new Error('Vote ID is required');
  }

  try {
    const votes = await query(
      `SELECT 
        v.*,
        e.title as electionTitle,
        c.name as candidateName, c.party,
        u.fullname as voterName, u.email as voterEmail
      FROM Vote v
      LEFT JOIN Election e ON v.electionId = e.electionId
      LEFT JOIN Candidate c ON v.candidateId = c.candidateId
      LEFT JOIN User u ON v.userId = u.userId
      WHERE v.voteId = ?`,
      [voteId]
    );

    if (votes.length === 0) {
      throw new Error('Vote not found');
    }

    return {
      success: true,
      vote: votes[0]
    };
  } catch (error) {
    throw new Error(`Failed to fetch vote: ${error.message}`);
  }
};

// Get votes by election
const getVotesByElection = async (electionId, filters = {}) => {
  const {
    candidateId,
    includeVoterInfo = false,
    limit = 100,
    offset = 0,
    sortBy = 'votedAt',
    sortOrder = 'DESC'
  } = filters;

  if (!electionId) {
    throw new Error('Election ID is required');
  }

  try {
    let whereClause = 'WHERE v.electionId = ?';
    const params = [electionId];

    if (candidateId) {
      whereClause += ' AND v.candidateId = ?';
      params.push(candidateId);
    }

    // Add sorting and pagination
    const orderByClause = `ORDER BY v.${sortBy} ${sortOrder}`;
    const limitClause = `LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    let queryText = `
      SELECT 
        v.voteId, v.candidateId, v.votedAt`;

    if (includeVoterInfo) {
      queryText += `,
        v.userId, v.voterInfo,
        u.fullname as voterName, u.email as voterEmail`;
    }

    queryText += `,
        c.name as candidateName, c.party
      FROM Vote v
      LEFT JOIN Candidate c ON v.candidateId = c.candidateId`;

    if (includeVoterInfo) {
      queryText += `
        LEFT JOIN User u ON v.userId = u.userId`;
    }

    queryText += `
      ${whereClause}
      ${orderByClause}
      ${limitClause}`;

    const votes = await query(queryText, params);

    return {
      success: true,
      votes,
      total: votes.length
    };
  } catch (error) {
    throw new Error(`Failed to fetch election votes: ${error.message}`);
  }
};

// Get votes by candidate
const getVotesByCandidate = async (candidateId, filters = {}) => {
  const {
    includeVoterInfo = false,
    limit = 100,
    offset = 0,
    sortBy = 'votedAt',
    sortOrder = 'DESC'
  } = filters;

  if (!candidateId) {
    throw new Error('Candidate ID is required');
  }

  try {
    let queryText = `
      SELECT 
        v.voteId, v.electionId, v.votedAt`;

    if (includeVoterInfo) {
      queryText += `,
        v.userId, v.voterInfo,
        u.fullname as voterName, u.email as voterEmail`;
    }

    queryText += `,
        e.title as electionTitle
      FROM Vote v
      LEFT JOIN Election e ON v.electionId = e.electionId`;

    if (includeVoterInfo) {
      queryText += `
        LEFT JOIN User u ON v.userId = u.userId`;
    }

    queryText += `
      WHERE v.candidateId = ?
      ORDER BY v.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?`;

    const votes = await query(queryText, [candidateId, limit, offset]);

    return {
      success: true,
      votes,
      total: votes.length
    };
  } catch (error) {
    throw new Error(`Failed to fetch candidate votes: ${error.message}`);
  }
};

// Get votes by user
const getVotesByUser = async (userId, filters = {}) => {
  const {
    electionId,
    limit = 50,
    offset = 0,
    sortBy = 'votedAt',
    sortOrder = 'DESC'
  } = filters;

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    let whereClause = 'WHERE v.userId = ?';
    const params = [userId];

    if (electionId) {
      whereClause += ' AND v.electionId = ?';
      params.push(electionId);
    }

    const votes = await query(
      `SELECT 
        v.voteId, v.electionId, v.candidateId, v.votedAt,
        e.title as electionTitle,
        c.name as candidateName, c.party
      FROM Vote v
      LEFT JOIN Election e ON v.electionId = e.electionId
      LEFT JOIN Candidate c ON v.candidateId = c.candidateId
      ${whereClause}
      ORDER BY v.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      success: true,
      votes,
      total: votes.length
    };
  } catch (error) {
    throw new Error(`Failed to fetch user votes: ${error.message}`);
  }
};

// Check if user has voted in election
const hasUserVoted = async (electionId, userId) => {
  if (!electionId || !userId) {
    throw new Error('Election ID and user ID are required');
  }

  try {
    const result = await query(
      'SELECT voteId, votedAt FROM Vote WHERE electionId = ? AND userId = ?',
      [electionId, userId]
    );

    return {
      success: true,
      hasVoted: result.length > 0,
      voteInfo: result.length > 0 ? {
        voteId: result[0].voteId,
        votedAt: result[0].votedAt
      } : null
    };
  } catch (error) {
    throw new Error(`Failed to check vote status: ${error.message}`);
  }
};

// Get election results
const getElectionResults = async (electionId) => {
  if (!electionId) {
    throw new Error('Election ID is required');
  }

  try {
    // Check if election exists
    const election = await query(
      'SELECT electionId, title, status, totalVotes FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      throw new Error('Election not found');
    }

    const electionData = election[0];

    // Get candidate results
    const results = await query(
      `SELECT 
        c.candidateId, c.name, c.party, c.isWriteIn,
        COUNT(v.voteId) as voteCount,
        ROUND((COUNT(v.voteId) * 100.0 / (SELECT COUNT(*) FROM Vote WHERE electionId = ?)), 2) as percentage
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.electionId = ?
      GROUP BY c.candidateId
      ORDER BY voteCount DESC, c.name ASC`,
      [electionId, electionId]
    );

    // Get total votes
    const totalVotes = await query(
      'SELECT COUNT(*) as count FROM Vote WHERE electionId = ?',
      [electionId]
    );

    return {
      success: true,
      election: {
        electionId: electionData.electionId,
        title: electionData.title,
        status: electionData.status,
        totalVotes: totalVotes[0].count
      },
      results,
      totalVotes: totalVotes[0].count
    };
  } catch (error) {
    throw new Error(`Failed to fetch election results: ${error.message}`);
  }
};

// Delete vote (admin only, with strict validation)
const deleteVote = async (voteId, adminUserId) => {
  if (!voteId) {
    throw new Error('Vote ID is required');
  }

  try {
    // Validate vote deletion
    const validation = await validateVoteDeletion(voteId, adminUserId);
    
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        message: validation.message
      };
    }

    await query('START TRANSACTION');

    // Get vote details
    const vote = await query(
      'SELECT electionId, candidateId, userId FROM Vote WHERE voteId = ?',
      [voteId]
    );

    const voteData = vote[0];

    // Get candidate name for notification
    const candidateData = await query(
      'SELECT name FROM Candidate WHERE candidateId = ?',
      [voteData.candidateId]
    );

    // Get admin email for notification
    const adminData = await query(
      'SELECT email FROM User WHERE userId = ?',
      [adminUserId]
    );

    // Delete the vote
    await query('DELETE FROM Vote WHERE voteId = ?', [voteId]);

    // Update candidate vote count
    await query(
      'UPDATE Candidate SET voteCount = voteCount - 1 WHERE candidateId = ?',
      [voteData.candidateId]
    );

    // Update election vote count
    await query(
      'UPDATE Election SET totalVotes = totalVotes - 1 WHERE electionId = ?',
      [voteData.electionId]
    );

    await query('COMMIT');

    // Emit vote deletion event
    emitVoteDeleted(voteData.electionId, voteData.candidateId, candidateData[0]?.name || 'Unknown', adminData[0]?.email || 'Admin', 'Admin deletion');

    // Emit updated results
    const results = await getElectionResults(voteData.electionId);
    emitResultsUpdate(voteData.electionId, results.results);

    return {
      success: true,
      message: 'Vote deleted successfully',
      data: {
        voteId,
        electionId: voteData.electionId,
        candidateId: voteData.candidateId,
        deletedBy: adminUserId,
        validationPassed: true
      }
    };

  } catch (error) {
    await query('ROLLBACK');
    throw new Error(`Failed to delete vote: ${error.message}`);
  }
};

// Get voting statistics
const getVotingStats = async (electionId) => {
  if (!electionId) {
    throw new Error('Election ID is required');
  }

  try {
    const stats = await query(
      `SELECT 
        e.electionId,
        e.title,
        e.status,
        COUNT(v.voteId) as totalVotes,
        COUNT(DISTINCT v.userId) as uniqueVoters,
        COUNT(DISTINCT c.candidateId) as candidatesWithVotes,
        MIN(v.votedAt) as firstVoteTime,
        MAX(v.votedAt) as lastVoteTime
      FROM Election e
      LEFT JOIN Vote v ON e.electionId = v.electionId
      LEFT JOIN Candidate c ON v.electionId = c.electionId
      WHERE e.electionId = ?
      GROUP BY e.electionId`,
      [electionId]
    );

    if (stats.length === 0) {
      throw new Error('Election not found');
    }

    // Get hourly voting pattern
    const hourlyPattern = await query(
      `SELECT 
        HOUR(v.votedAt) as hour,
        COUNT(*) as votes
      FROM Vote v
      WHERE v.electionId = ?
      GROUP BY HOUR(v.votedAt)
      ORDER BY hour`,
      [electionId]
    );

    // Get daily voting pattern
    const dailyPattern = await query(
      `SELECT 
        DATE(v.votedAt) as date,
        COUNT(*) as votes
      FROM Vote v
      WHERE v.electionId = ?
      GROUP BY DATE(v.votedAt)
      ORDER BY date`,
      [electionId]
    );

    const votingStats = stats[0];
    votingStats.hourlyPattern = hourlyPattern;
    votingStats.dailyPattern = dailyPattern;

    return {
      success: true,
      stats: votingStats
    };
  } catch (error) {
    throw new Error(`Failed to fetch voting statistics: ${error.message}`);
  }
};

module.exports = {
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
};
