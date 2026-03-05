const { query } = require('../config/mockDatabase');

/**
 * Election Utilities
 * Provides database operations for election management
 */

// Create new election
const createElection = async (electionData) => {
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
  } = electionData;

  // Validate required fields
  if (!title || !startTime || !endTime) {
    throw new Error('Title, start time, and end time are required');
  }

  // Validate dates
  const start = new Date(startTime);
  const end = new Date(endTime);
  const now = new Date();

  if (start >= end) {
    throw new Error('Start time must be before end time');
  }

  if (start <= now) {
    throw new Error('Start time must be in the future');
  }

  try {
    const result = await query(
      `INSERT INTO Election (
        title, description, type, startTime, endTime, 
        eligibilityCriteria, maxCandidates, allowWriteIn, 
        isPublic, status, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming', ?, NOW(), NOW())`,
      [
        title,
        description || null,
        type || 'general',
        startTime,
        endTime,
        eligibilityCriteria || null,
        maxCandidates || null,
        allowWriteIn || false,
        isPublic !== false, // default to true
        electionData.createdBy || null
      ]
    );

    return {
      success: true,
      electionId: result.insertId,
      message: 'Election created successfully'
    };
  } catch (error) {
    throw new Error(`Failed to create election: ${error.message}`);
  }
};

// Get all elections with optional filtering
const getAllElections = async (filters = {}) => {
  const {
    status,
    type,
    isPublic,
    createdBy,
    limit = 50,
    offset = 0,
    sortBy = 'createdAt',
    sortOrder = 'DESC'
  } = filters;

  try {
    let whereClause = 'WHERE 1=1';
    const params = [];

    // Add filters
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }

    if (isPublic !== undefined) {
      whereClause += ' AND isPublic = ?';
      params.push(isPublic);
    }

    if (createdBy) {
      whereClause += ' AND createdBy = ?';
      params.push(createdBy);
    }

    // Add sorting and pagination
    const orderByClause = `ORDER BY ${sortBy} ${sortOrder}`;
    const limitClause = `LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const elections = await query(
      `SELECT 
        electionId, title, description, type, startTime, endTime,
        eligibilityCriteria, maxCandidates, allowWriteIn, isPublic,
        status, createdBy, createdAt, updatedAt
      FROM Election 
      ${whereClause}
      ${orderByClause}
      ${limitClause}`,
      params
    );

    // Get candidate counts for each election
    for (const election of elections) {
      const candidateCount = await query(
        'SELECT COUNT(*) as count FROM Candidate WHERE electionId = ?',
        [election.electionId]
      );
      election.candidateCount = candidateCount[0].count;

      // Get vote counts
      const voteCount = await query(
        'SELECT COUNT(*) as count FROM Vote WHERE electionId = ?',
        [election.electionId]
      );
      election.voteCount = voteCount[0].count;
    }

    return {
      success: true,
      elections,
      total: elections.length
    };
  } catch (error) {
    throw new Error(`Failed to fetch elections: ${error.message}`);
  }
};

// Get election by ID
const getElectionById = async (electionId) => {
  if (!electionId) {
    throw new Error('Election ID is required');
  }

  try {
    const elections = await query(
      `SELECT 
        e.*,
        u.fullname as creatorName,
        u.email as creatorEmail
      FROM Election e
      LEFT JOIN User u ON e.createdBy = u.userId
      WHERE e.electionId = ?`,
      [electionId]
    );

    if (elections.length === 0) {
      throw new Error('Election not found');
    }

    const election = elections[0];

    // Get candidates for this election
    const candidates = await query(
      `SELECT 
        c.candidateId, c.name, c.description, c.party,
        c.photoUrl, c.isWriteIn, c.createdAt,
        COUNT(v.voteId) as voteCount
      FROM Candidate c
      LEFT JOIN Vote v ON c.candidateId = v.candidateId
      WHERE c.electionId = ?
      GROUP BY c.candidateId
      ORDER BY c.name`,
      [electionId]
    );

    election.candidates = candidates;

    // Get total votes
    const totalVotes = await query(
      'SELECT COUNT(*) as count FROM Vote WHERE electionId = ?',
      [electionId]
    );
    election.totalVotes = totalVotes[0].count;

    return {
      success: true,
      election
    };
  } catch (error) {
    throw new Error(`Failed to fetch election: ${error.message}`);
  }
};

// Update election
const updateElection = async (electionId, updateData, userId) => {
  if (!electionId) {
    throw new Error('Election ID is required');
  }

  try {
    // Check if election exists and user has permission
    const existing = await query(
      'SELECT createdBy, status FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (existing.length === 0) {
      throw new Error('Election not found');
    }

    const election = existing[0];

    // Check if user can update (creator or admin)
    if (election.createdBy !== userId && election.createdBy !== null) {
      throw new Error('You do not have permission to update this election');
    }

    // Don't allow updates if election is active or completed
    if (election.status === 'active' || election.status === 'completed') {
      throw new Error('Cannot update election that is active or completed');
    }

    // Build update query
    const allowedUpdates = [
      'title', 'description', 'type', 'startTime', 'endTime',
      'eligibilityCriteria', 'maxCandidates', 'allowWriteIn', 'isPublic'
    ];

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

    // Validate date changes if provided
    if (updateData.startTime || updateData.endTime) {
      const currentElection = await getElectionById(electionId);
      const startTime = updateData.startTime || currentElection.election.startTime;
      const endTime = updateData.endTime || currentElection.election.endTime;
      const now = new Date();

      if (new Date(startTime) >= new Date(endTime)) {
        throw new Error('Start time must be before end time');
      }

      if (new Date(startTime) <= now && election.status === 'upcoming') {
        throw new Error('Start time must be in the future for upcoming elections');
      }
    }

    updateValues.push('NOW()'); // updatedAt
    updateValues.push(electionId);

    const result = await query(
      `UPDATE Election SET ${updateFields.join(', ')}, updatedAt = NOW() WHERE electionId = ?`,
      updateValues
    );

    return {
      success: true,
      message: 'Election updated successfully',
      affectedRows: result.affectedRows
    };
  } catch (error) {
    throw new Error(`Failed to update election: ${error.message}`);
  }
};

// Delete election
const deleteElection = async (electionId, userId) => {
  if (!electionId) {
    throw new Error('Election ID is required');
  }

  try {
    // Check if election exists and user has permission
    const existing = await query(
      'SELECT createdBy, status FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (existing.length === 0) {
      throw new Error('Election not found');
    }

    const election = existing[0];

    // Check if user can delete (creator or admin)
    if (election.createdBy !== userId && election.createdBy !== null) {
      throw new Error('You do not have permission to delete this election');
    }

    // Don't allow deletion if election is active
    if (election.status === 'active') {
      throw new Error('Cannot delete active election');
    }

    // Start transaction
    await query('START TRANSACTION');

    try {
      // Delete votes first
      await query('DELETE FROM Vote WHERE electionId = ?', [electionId]);

      // Delete candidates
      await query('DELETE FROM Candidate WHERE electionId = ?', [electionId]);

      // Delete election
      const result = await query('DELETE FROM Election WHERE electionId = ?', [electionId]);

      await query('COMMIT');

      return {
        success: true,
        message: 'Election deleted successfully',
        affectedRows: result.affectedRows
      };
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    throw new Error(`Failed to delete election: ${error.message}`);
  }
};

// Update election status
const updateElectionStatus = async (electionId, newStatus, userId) => {
  if (!electionId || !newStatus) {
    throw new Error('Election ID and new status are required');
  }

  const validStatuses = ['upcoming', 'active', 'completed', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error('Invalid status');
  }

  try {
    // Check if election exists
    const existing = await query(
      'SELECT status, createdBy, startTime, endTime FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (existing.length === 0) {
      throw new Error('Election not found');
    }

    const election = existing[0];

    // Check if user can update status
    if (election.createdBy !== userId && election.createdBy !== null) {
      throw new Error('You do not have permission to update this election');
    }

    // Validate status transitions
    const now = new Date();
    const startTime = new Date(election.startTime);
    const endTime = new Date(election.endTime);

    switch (newStatus) {
      case 'active':
        if (election.status !== 'upcoming') {
          throw new Error('Only upcoming elections can be activated');
        }
        if (now < startTime) {
          throw new Error('Cannot activate election before start time');
        }
        if (now > endTime) {
          throw new Error('Cannot activate election after end time');
        }
        break;

      case 'completed':
        if (election.status !== 'active') {
          throw new Error('Only active elections can be completed');
        }
        break;

      case 'cancelled':
        if (election.status === 'completed') {
          throw new Error('Cannot cancel completed election');
        }
        break;
    }

    const result = await query(
      'UPDATE Election SET status = ?, updatedAt = NOW() WHERE electionId = ?',
      [newStatus, electionId]
    );

    return {
      success: true,
      message: `Election status updated to ${newStatus}`,
      affectedRows: result.affectedRows
    };
  } catch (error) {
    throw new Error(`Failed to update election status: ${error.message}`);
  }
};

// Get elections by user
const getElectionsByUser = async (userId, filters = {}) => {
  const { status, limit = 20, offset = 0 } = filters;

  try {
    let whereClause = 'WHERE createdBy = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const elections = await query(
      `SELECT 
        electionId, title, description, type, startTime, endTime,
        status, isPublic, createdAt, updatedAt
      FROM Election 
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      success: true,
      elections,
      total: elections.length
    };
  } catch (error) {
    throw new Error(`Failed to fetch user elections: ${error.message}`);
  }
};

module.exports = {
  createElection,
  getAllElections,
  getElectionById,
  updateElection,
  deleteElection,
  updateElectionStatus,
  getElectionsByUser
};
