const { query } = require('../config/mockDatabase');

/**
 * Candidate Utilities
 * Provides database operations for candidate management
 */

// Create new candidate
const createCandidate = async (candidateData) => {
  const {
    electionId,
    name,
    description,
    party,
    photoUrl,
    isWriteIn = false
  } = candidateData;

  // Validate required fields
  if (!electionId || !name) {
    throw new Error('Election ID and candidate name are required');
  }

  try {
    // Check if election exists and can accept candidates
    const election = await query(
      'SELECT electionId, status, maxCandidates FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      throw new Error('Election not found');
    }

    const electionData = election[0];

    // Check if election allows new candidates
    if (electionData.status === 'active' || electionData.status === 'completed') {
      throw new Error('Cannot add candidates to active or completed elections');
    }

    // Check max candidates limit
    if (electionData.maxCandidates) {
      const currentCount = await query(
        'SELECT COUNT(*) as count FROM Candidate WHERE electionId = ? AND isWriteIn = false',
        [electionId]
      );

      if (currentCount[0].count >= electionData.maxCandidates) {
        throw new Error(`Maximum candidates limit (${electionData.maxCandidates}) reached for this election`);
      }
    }

    // Check for duplicate candidate names in the same election
    const existing = await query(
      'SELECT candidateId FROM Candidate WHERE electionId = ? AND name = ? AND isWriteIn = false',
      [electionId, name]
    );

    if (existing.length > 0) {
      throw new Error('A candidate with this name already exists in this election');
    }

    const result = await query(
      `INSERT INTO Candidate (
        electionId, name, description, party, photoUrl, isWriteIn, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        electionId,
        name,
        description || null,
        party || null,
        photoUrl || null,
        isWriteIn
      ]
    );

    return {
      success: true,
      candidateId: result.insertId,
      message: 'Candidate created successfully'
    };
  } catch (error) {
    throw new Error(`Failed to create candidate: ${error.message}`);
  }
};

// Get all candidates with optional filtering
const getAllCandidates = async (filters = {}) => {
  const {
    electionId,
    isWriteIn,
    party,
    limit = 50,
    offset = 0,
    sortBy = 'name',
    sortOrder = 'ASC'
  } = filters;

  try {
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Add filters
    if (electionId) {
      whereClause += ' AND c.electionId = ?';
      params.push(electionId);
    }

    if (isWriteIn !== undefined) {
      whereClause += ' AND c.isWriteIn = ?';
      params.push(isWriteIn);
    }

    if (party) {
      whereClause += ' AND c.party = ?';
      params.push(party);
    }

    // Add sorting and pagination
    const orderByClause = `ORDER BY c.${sortBy} ${sortOrder}`;
    const limitClause = `LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const candidates = await query(
      `SELECT 
        c.candidateId, c.electionId, c.name, c.description, c.party,
        c.photoUrl, c.isWriteIn, c.createdAt,
        e.title as electionTitle,
        COUNT(v.voteId) as voteCount
      FROM Candidate c
      LEFT JOIN Election e ON c.electionId = e.electionId
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      ${whereClause}
      GROUP BY c.candidateId
      ${orderByClause}
      ${limitClause}`,
      params
    );

    return {
      success: true,
      candidates,
      total: candidates.length
    };
  } catch (error) {
    throw new Error(`Failed to fetch candidates: ${error.message}`);
  }
};

// Get candidate by ID
const getCandidateById = async (candidateId) => {
  if (!candidateId) {
    throw new Error('Candidate ID is required');
  }

  try {
    const candidates = await query(
      `SELECT 
        c.*,
        e.title as electionTitle,
        e.status as electionStatus,
        COUNT(v.voteId) as voteCount
      FROM Candidate c
      LEFT JOIN Election e ON c.electionId = e.electionId
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.candidateId = ?
      GROUP BY c.candidateId`,
      [candidateId]
    );

    if (candidates.length === 0) {
      throw new Error('Candidate not found');
    }

    const candidate = candidates[0];

    // Get vote details for this candidate
    const voteDetails = await query(
      `SELECT 
        v.voteId, v.userId, v.votedAt,
        u.fullname as voterName, u.email as voterEmail
      FROM Vote v
      LEFT JOIN User u ON v.userId = u.userId
      WHERE v.candidateId = ?
      ORDER BY v.votedAt DESC`,
      [candidateId]
    );

    candidate.votes = voteDetails;

    return {
      success: true,
      candidate
    };
  } catch (error) {
    throw new Error(`Failed to fetch candidate: ${error.message}`);
  }
};

// Update candidate
const updateCandidate = async (candidateId, updateData, userId) => {
  if (!candidateId) {
    throw new Error('Candidate ID is required');
  }

  try {
    // Check if candidate exists and get election info
    const existing = await query(
      `SELECT 
        c.candidateId, c.electionId, c.name, c.isWriteIn,
        e.status as electionStatus, e.createdBy as electionCreatedBy
      FROM Candidate c
      LEFT JOIN Election e ON c.electionId = e.electionId
      WHERE c.candidateId = ?`,
      [candidateId]
    );

    if (existing.length === 0) {
      throw new Error('Candidate not found');
    }

    const candidate = existing[0];

    // Check if user can update (election creator or admin)
    if (candidate.electionCreatedBy !== userId && candidate.electionCreatedBy !== null) {
      throw new Error('You do not have permission to update this candidate');
    }

    // Don't allow updates if election is active or completed
    if (candidate.electionStatus === 'active' || candidate.electionStatus === 'completed') {
      throw new Error('Cannot update candidates in active or completed elections');
    }

    // Don't allow updating write-in candidates
    if (candidate.isWriteIn) {
      throw new Error('Cannot update write-in candidates');
    }

    // Build update query
    const allowedUpdates = ['name', 'description', 'party', 'photoUrl'];
    const updateFields = [];
    const updateValues = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedUpdates.includes(key) && value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // Check for duplicate name if updating name
    if (updateData.name && updateData.name !== candidate.name) {
      const duplicate = await query(
        'SELECT candidateId FROM Candidate WHERE electionId = ? AND name = ? AND candidateId != ? AND isWriteIn = false',
        [candidate.electionId, updateData.name, candidateId]
      );

      if (duplicate.length > 0) {
        throw new Error('A candidate with this name already exists in this election');
      }
    }

    updateValues.push(candidateId);

    const result = await query(
      `UPDATE Candidate SET ${updateFields.join(', ')} WHERE candidateId = ?`,
      updateValues
    );

    return {
      success: true,
      message: 'Candidate updated successfully',
      affectedRows: result.affectedRows
    };
  } catch (error) {
    throw new Error(`Failed to update candidate: ${error.message}`);
  }
};

// Delete candidate
const deleteCandidate = async (candidateId, userId) => {
  if (!candidateId) {
    throw new Error('Candidate ID is required');
  }

  try {
    // Check if candidate exists and get election info
    const existing = await query(
      `SELECT 
        c.candidateId, c.electionId, c.isWriteIn,
        e.status as electionStatus, e.createdBy as electionCreatedBy
      FROM Candidate c
      LEFT JOIN Election e ON c.electionId = e.electionId
      WHERE c.candidateId = ?`,
      [candidateId]
    );

    if (existing.length === 0) {
      throw new Error('Candidate not found');
    }

    const candidate = existing[0];

    // Check if user can delete (election creator or admin)
    if (candidate.electionCreatedBy !== userId && candidate.electionCreatedBy !== null) {
      throw new Error('You do not have permission to delete this candidate');
    }

    // Don't allow deletion if election is active
    if (candidate.electionStatus === 'active') {
      throw new Error('Cannot delete candidates from active elections');
    }

    // Don't allow deleting write-in candidates
    if (candidate.isWriteIn) {
      throw new Error('Cannot delete write-in candidates');
    }

    // Check if candidate has votes
    const voteCount = await query(
      'SELECT COUNT(*) as count FROM Vote WHERE candidateId = ?',
      [candidateId]
    );

    if (voteCount[0].count > 0) {
      throw new Error('Cannot delete candidate that has received votes');
    }

    // Start transaction
    await query('START TRANSACTION');

    try {
      // Delete candidate
      const result = await query('DELETE FROM Candidate WHERE candidateId = ?', [candidateId]);

      await query('COMMIT');

      return {
        success: true,
        message: 'Candidate deleted successfully',
        affectedRows: result.affectedRows
      };
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    throw new Error(`Failed to delete candidate: ${error.message}`);
  }
};

// Get candidates by election
const getCandidatesByElection = async (electionId, filters = {}) => {
  const {
    isWriteIn,
    includeVoteCount = true,
    limit = 50,
    offset = 0,
    sortBy = 'name',
    sortOrder = 'ASC'
  } = filters;

  if (!electionId) {
    throw new Error('Election ID is required');
  }

  try {
    let whereClause = 'WHERE c.electionId = ?';
    const params = [electionId];

    if (isWriteIn !== undefined) {
      whereClause += ' AND c.isWriteIn = ?';
      params.push(isWriteIn);
    }

    // Add sorting and pagination
    const orderByClause = `ORDER BY c.${sortBy} ${sortOrder}`;
    const limitClause = `LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    let queryText = `
      SELECT 
        c.candidateId, c.electionId, c.name, c.description, c.party,
        c.photoUrl, c.isWriteIn, c.createdAt`;

    if (includeVoteCount) {
      queryText += `,
        COUNT(v.voteId) as voteCount`;
    }

    queryText += `
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      ${whereClause}
      GROUP BY c.candidateId
      ${orderByClause}
      ${limitClause}`;

    const candidates = await query(queryText, params);

    return {
      success: true,
      candidates,
      total: candidates.length
    };
  } catch (error) {
    throw new Error(`Failed to fetch election candidates: ${error.message}`);
  }
};

// Add write-in candidate
const addWriteInCandidate = async (electionId, name) => {
  if (!electionId || !name) {
    throw new Error('Election ID and candidate name are required');
  }

  try {
    // Check if election exists and allows write-ins
    const election = await query(
      'SELECT electionId, status, allowWriteIn FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      throw new Error('Election not found');
    }

    const electionData = election[0];

    if (!electionData.allowWriteIn) {
      throw new Error('This election does not allow write-in candidates');
    }

    if (electionData.status !== 'active') {
      throw new Error('Write-in candidates can only be added to active elections');
    }

    // Check if write-in candidate already exists
    const existing = await query(
      'SELECT candidateId FROM Candidate WHERE electionId = ? AND name = ? AND isWriteIn = true',
      [electionId, name]
    );

    if (existing.length > 0) {
      return {
        success: true,
        candidateId: existing[0].candidateId,
        message: 'Write-in candidate already exists'
      };
    }

    // Create write-in candidate
    const result = await query(
      `INSERT INTO Candidate (
        electionId, name, isWriteIn, createdAt
      ) VALUES (?, ?, true, NOW())`,
      [electionId, name]
    );

    return {
      success: true,
      candidateId: result.insertId,
      message: 'Write-in candidate added successfully'
    };
  } catch (error) {
    throw new Error(`Failed to add write-in candidate: ${error.message}`);
  }
};

// Get candidate statistics
const getCandidateStats = async (candidateId) => {
  if (!candidateId) {
    throw new Error('Candidate ID is required');
  }

  try {
    const stats = await query(
      `SELECT 
        c.candidateId, c.name, c.electionId,
        e.title as electionTitle,
        COUNT(v.voteId) as totalVotes,
        MIN(v.votedAt) as firstVoteTime,
        MAX(v.votedAt) as lastVoteTime
      FROM Candidate c
      LEFT JOIN Election e ON c.electionId = e.electionId
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.candidateId = ?
      GROUP BY c.candidateId`,
      [candidateId]
    );

    if (stats.length === 0) {
      throw new Error('Candidate not found');
    }

    // Get voting timeline (votes per hour/day)
    const timeline = await query(
      `SELECT 
        DATE(v.votedAt) as voteDate,
        COUNT(*) as votes
      FROM Vote v
      WHERE v.candidateId = ?
      GROUP BY DATE(v.votedAt)
      ORDER BY voteDate`,
      [candidateId]
    );

    const candidateStats = stats[0];
    candidateStats.timeline = timeline;

    return {
      success: true,
      stats: candidateStats
    };
  } catch (error) {
    throw new Error(`Failed to fetch candidate statistics: ${error.message}`);
  }
};

module.exports = {
  createCandidate,
  getAllCandidates,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  getCandidatesByElection,
  addWriteInCandidate,
  getCandidateStats
};
