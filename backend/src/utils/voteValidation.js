const { query } = require('../config/mockDatabase');
const { emitError } = require('./socketUtils');

/**
 * Vote Validation Utilities
 * Comprehensive validation for voting operations
 */

/**
 * Validate if user is eligible to vote in an election
 */
const validateUserEligibility = async (userId, electionId) => {
  try {
    // Check if user exists and is active
    const user = await query(
      'SELECT userId, email, role, isActive FROM User WHERE userId = ?',
      [userId]
    );

    if (user.length === 0) {
      return {
        valid: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      };
    }

    if (!user[0].isActive) {
      return {
        valid: false,
        error: 'USER_INACTIVE',
        message: 'User account is inactive'
      };
    }

    // Check if user is banned
    if (user[0].role === 'banned') {
      return {
        valid: false,
        error: 'USER_BANNED',
        message: 'User account is banned'
      };
    }

    // Check if election exists
    const election = await query(
      'SELECT * FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      return {
        valid: false,
        error: 'ELECTION_NOT_FOUND',
        message: 'Election not found'
      };
    }

    const electionData = election[0];

    // Check if election is active
    if (electionData.status !== 'active') {
      return {
        valid: false,
        error: 'ELECTION_NOT_ACTIVE',
        message: `Election is ${electionData.status}. Only active elections allow voting.`
      };
    }

    // Check election time window
    const now = new Date();
    const startTime = new Date(electionData.startTime);
    const endTime = new Date(electionData.endTime);

    if (now < startTime) {
      return {
        valid: false,
        error: 'ELECTION_NOT_STARTED',
        message: 'Election has not started yet'
      };
    }

    if (now > endTime) {
      return {
        valid: false,
        error: 'ELECTION_ENDED',
        message: 'Election has ended'
      };
    }

    // Check eligibility criteria if specified
    if (electionData.eligibilityCriteria) {
      const eligibilityResult = await validateEligibilityCriteria(userId, electionData.eligibilityCriteria);
      
      if (!eligibilityResult.valid) {
        return eligibilityResult;
      }
    }

    return {
      valid: true,
      user: user[0],
      election: electionData
    };

  } catch (error) {
    console.error('User eligibility validation error:', error);
    return {
      valid: false,
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate user eligibility'
    };
  }
};

/**
 * Validate eligibility criteria based on election requirements
 */
const validateEligibilityCriteria = async (userId, criteria) => {
  try {
    const criteriaData = JSON.parse(criteria);
    
    // Check age requirement
    if (criteriaData.minAge) {
      const userAge = await query(
        'SELECT TIMESTAMPDIFF(YEAR, dateOfBirth, CURDATE()) as age FROM User WHERE userId = ?',
        [userId]
      );

      if (userAge.length > 0 && userAge[0].age < criteriaData.minAge) {
        return {
          valid: false,
          error: 'AGE_REQUIREMENT_NOT_MET',
          message: `User must be at least ${criteriaData.minAge} years old`
        };
      }
    }

    // Check department/role requirement
    if (criteriaData.allowedRoles && criteriaData.allowedRoles.length > 0) {
      const userRole = await query(
        'SELECT role FROM User WHERE userId = ?',
        [userId]
      );

      if (userRole.length > 0 && !criteriaData.allowedRoles.includes(userRole[0].role)) {
        return {
          valid: false,
          error: 'ROLE_NOT_ELIGIBLE',
          message: 'User role is not eligible for this election'
        };
      }
    }

    // Check registration date requirement
    if (criteriaData.minRegistrationDays) {
      const registrationDate = await query(
        'SELECT createdAt FROM User WHERE userId = ?',
        [userId]
      );

      if (registrationDate.length > 0) {
        const daysSinceRegistration = Math.floor(
          (new Date() - new Date(registrationDate[0].createdAt)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceRegistration < criteriaData.minRegistrationDays) {
          return {
            valid: false,
            error: 'REGISTRATION_TOO_RECENT',
            message: `User must be registered for at least ${criteriaData.minRegistrationDays} days`
          };
        }
      }
    }

    // Check verification status
    if (criteriaData.requireVerification) {
      const verificationStatus = await query(
        'SELECT isVerified FROM User WHERE userId = ?',
        [userId]
      );

      if (verificationStatus.length > 0 && !verificationStatus[0].isVerified) {
        return {
          valid: false,
          error: 'USER_NOT_VERIFIED',
          message: 'User must be verified to vote in this election'
        };
      }
    }

    return {
      valid: true
    };

  } catch (error) {
    console.error('Eligibility criteria validation error:', error);
    return {
      valid: false,
      error: 'CRITERIA_VALIDATION_ERROR',
      message: 'Failed to validate eligibility criteria'
    };
  }
};

/**
 * Validate if user has already voted in the election
 */
const validateDuplicateVote = async (userId, electionId) => {
  try {
    // Check for existing vote
    const existingVote = await query(
      'SELECT voteId, votedAt FROM Vote WHERE userId = ? AND electionId = ?',
      [userId, electionId]
    );

    if (existingVote.length > 0) {
      return {
        valid: false,
        error: 'ALREADY_VOTED',
        message: 'User has already voted in this election',
        data: {
          voteId: existingVote[0].voteId,
          votedAt: existingVote[0].votedAt
        }
      };
    }

    return {
      valid: true
    };

  } catch (error) {
    console.error('Duplicate vote validation error:', error);
    return {
      valid: false,
      error: 'DUPLICATE_CHECK_ERROR',
      message: 'Failed to check for duplicate votes'
    };
  }
};

/**
 * Validate if candidate is valid for the election
 */
const validateCandidate = async (candidateId, electionId) => {
  try {
    // Check if candidate exists
    const candidate = await query(
      'SELECT * FROM Candidate WHERE candidateId = ?',
      [candidateId]
    );

    if (candidate.length === 0) {
      return {
        valid: false,
        error: 'CANDIDATE_NOT_FOUND',
        message: 'Candidate not found'
      };
    }

    const candidateData = candidate[0];

    // Check if candidate belongs to the election
    if (candidateData.electionId !== electionId) {
      return {
        valid: false,
        error: 'CANDIDATE_NOT_IN_ELECTION',
        message: 'Candidate does not belong to this election'
      };
    }

    // Check if candidate is active
    if (candidateData.status !== 'active') {
      return {
        valid: false,
        error: 'CANDIDATE_NOT_ACTIVE',
        message: 'Candidate is not active'
      };
    }

    // Check if candidate is disqualified
    if (candidateData.isDisqualified) {
      return {
        valid: false,
        error: 'CANDIDATE_DISQUALIFIED',
        message: 'Candidate has been disqualified'
      };
    }

    return {
      valid: true,
      candidate: candidateData
    };

  } catch (error) {
    console.error('Candidate validation error:', error);
    return {
      valid: false,
      error: 'CANDIDATE_VALIDATION_ERROR',
      message: 'Failed to validate candidate'
    };
  }
};

/**
 * Validate write-in candidate if applicable
 */
const validateWriteInCandidate = async (electionId, writeInData) => {
  try {
    // Check if election allows write-in candidates
    const election = await query(
      'SELECT allowWriteIn, maxCandidates FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      return {
        valid: false,
        error: 'ELECTION_NOT_FOUND',
        message: 'Election not found'
      };
    }

    const electionData = election[0];

    if (!electionData.allowWriteIn) {
      return {
        valid: false,
        error: 'WRITE_IN_NOT_ALLOWED',
        message: 'This election does not allow write-in candidates'
      };
    }

    // Check if max candidates limit reached
    if (electionData.maxCandidates) {
      const candidateCount = await query(
        'SELECT COUNT(*) as count FROM Candidate WHERE electionId = ? AND status = "active"',
        [electionId]
      );

      if (candidateCount[0].count >= electionData.maxCandidates) {
        return {
          valid: false,
          error: 'MAX_CANDIDATES_REACHED',
          message: 'Maximum number of candidates reached for this election'
        };
      }
    }

    // Validate write-in data
    if (!writeInData || !writeInData.name || writeInData.name.trim().length === 0) {
      return {
        valid: false,
        error: 'INVALID_WRITE_IN_DATA',
        message: 'Write-in candidate name is required'
      };
    }

    // Check for duplicate write-in candidate name
    const existingCandidate = await query(
      'SELECT candidateId FROM Candidate WHERE electionId = ? AND name = ?',
      [electionId, writeInData.name.trim()]
    );

    if (existingCandidate.length > 0) {
      return {
        valid: false,
        error: 'CANDIDATE_ALREADY_EXISTS',
        message: 'A candidate with this name already exists'
      };
    }

    return {
      valid: true,
      election: electionData
    };

  } catch (error) {
    console.error('Write-in candidate validation error:', error);
    return {
      valid: false,
      error: 'WRITE_IN_VALIDATION_ERROR',
      message: 'Failed to validate write-in candidate'
    };
  }
};

/**
 * Validate voting rate limits
 */
const validateVotingRateLimit = async (userId, electionId) => {
  try {
    // Check for multiple vote attempts in short time
    const recentAttempts = await query(
      `SELECT COUNT(*) as count 
       FROM Vote 
       WHERE userId = ? AND electionId = ? 
       AND votedAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      [userId, electionId]
    );

    if (recentAttempts[0].count > 0) {
      return {
        valid: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Vote rate limit exceeded. Please wait before trying again.'
      };
    }

    return {
      valid: true
    };

  } catch (error) {
    console.error('Rate limit validation error:', error);
    return {
      valid: false,
      error: 'RATE_LIMIT_CHECK_ERROR',
      message: 'Failed to check voting rate limits'
    };
  }
};

/**
 * Validate election capacity
 */
const validateElectionCapacity = async (electionId) => {
  try {
    // Check if election has reached maximum voters
    const election = await query(
      'SELECT maxVoters FROM Election WHERE electionId = ?',
      [electionId]
    );

    if (election.length === 0) {
      return {
        valid: false,
        error: 'ELECTION_NOT_FOUND',
        message: 'Election not found'
      };
    }

    const electionData = election[0];

    if (electionData.maxVoters) {
      const voterCount = await query(
        'SELECT COUNT(DISTINCT userId) as count FROM Vote WHERE electionId = ?',
        [electionId]
      );

      if (voterCount[0].count >= electionData.maxVoters) {
        return {
          valid: false,
          error: 'ELECTION_FULL',
          message: 'This election has reached its maximum number of voters'
        };
      }
    }

    return {
      valid: true
    };

  } catch (error) {
    console.error('Election capacity validation error:', error);
    return {
      valid: false,
      error: 'CAPACITY_VALIDATION_ERROR',
      message: 'Failed to validate election capacity'
    };
  }
};

/**
 * Comprehensive vote validation
 */
const validateVote = async (userId, electionId, candidateId, writeInData = null) => {
  try {
    const validationResults = [];

    // 1. Validate user eligibility
    const eligibilityResult = await validateUserEligibility(userId, electionId);
    validationResults.push({ type: 'eligibility', ...eligibilityResult });

    if (!eligibilityResult.valid) {
      return {
        valid: false,
        error: eligibilityResult.error,
        message: eligibilityResult.message,
        validationResults
      };
    }

    // 2. Check for duplicate votes
    const duplicateResult = await validateDuplicateVote(userId, electionId);
    validationResults.push({ type: 'duplicate', ...duplicateResult });

    if (!duplicateResult.valid) {
      return {
        valid: false,
        error: duplicateResult.error,
        message: duplicateResult.message,
        validationResults
      };
    }

    // 3. Validate candidate or write-in
    if (writeInData) {
      const writeInResult = await validateWriteInCandidate(electionId, writeInData);
      validationResults.push({ type: 'writeIn', ...writeInResult });

      if (!writeInResult.valid) {
        return {
          valid: false,
          error: writeInResult.error,
          message: writeInResult.message,
          validationResults
        };
      }
    } else {
      const candidateResult = await validateCandidate(candidateId, electionId);
      validationResults.push({ type: 'candidate', ...candidateResult });

      if (!candidateResult.valid) {
        return {
          valid: false,
          error: candidateResult.error,
          message: candidateResult.message,
          validationResults
        };
      }
    }

    // 4. Validate rate limits
    const rateLimitResult = await validateVotingRateLimit(userId, electionId);
    validationResults.push({ type: 'rateLimit', ...rateLimitResult });

    if (!rateLimitResult.valid) {
      return {
        valid: false,
        error: rateLimitResult.error,
        message: rateLimitResult.message,
        validationResults
      };
    }

    // 5. Validate election capacity
    const capacityResult = await validateElectionCapacity(electionId);
    validationResults.push({ type: 'capacity', ...capacityResult });

    if (!capacityResult.valid) {
      return {
        valid: false,
        error: capacityResult.error,
        message: capacityResult.message,
        validationResults
      };
    }

    return {
      valid: true,
      message: 'Vote validation successful',
      validationResults,
      user: eligibilityResult.user,
      election: eligibilityResult.election,
      candidate: validationResults.find(r => r.type === 'candidate')?.candidate
    };

  } catch (error) {
    console.error('Comprehensive vote validation error:', error);
    return {
      valid: false,
      error: 'VALIDATION_ERROR',
      message: 'Failed to validate vote',
      validationResults
    };
  }
};

/**
 * Validate vote deletion (admin only)
 */
const validateVoteDeletion = async (voteId, adminUserId) => {
  try {
    // Check if admin has permission
    const admin = await query(
      'SELECT role FROM User WHERE userId = ?',
      [adminUserId]
    );

    if (admin.length === 0 || admin[0].role !== 'admin') {
      return {
        valid: false,
        error: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only administrators can delete votes'
      };
    }

    // Check if vote exists
    const vote = await query(
      'SELECT * FROM Vote WHERE voteId = ?',
      [voteId]
    );

    if (vote.length === 0) {
      return {
        valid: false,
        error: 'VOTE_NOT_FOUND',
        message: 'Vote not found'
      };
    }

    // Check if election is still active
    const election = await query(
      'SELECT status FROM Election WHERE electionId = ?',
      [vote[0].electionId]
    );

    if (election.length === 0) {
      return {
        valid: false,
        error: 'ELECTION_NOT_FOUND',
        message: 'Election not found'
      };
    }

    if (election[0].status === 'active') {
      return {
        valid: false,
        error: 'ELECTION_STILL_ACTIVE',
        message: 'Cannot delete votes from active elections'
      };
    }

    return {
      valid: true,
      vote: vote[0]
    };

  } catch (error) {
    console.error('Vote deletion validation error:', error);
    return {
      valid: false,
      error: 'DELETION_VALIDATION_ERROR',
      message: 'Failed to validate vote deletion'
    };
  }
};

/**
 * Get validation error details for user feedback
 */
const getValidationErrorDetails = (validationError) => {
  const errorMap = {
    'USER_NOT_FOUND': {
      title: 'User Not Found',
      description: 'Your user account could not be found in the system.',
      action: 'Please contact support for assistance.'
    },
    'USER_INACTIVE': {
      title: 'Account Inactive',
      description: 'Your account is currently inactive.',
      action: 'Please contact an administrator to reactivate your account.'
    },
    'USER_BANNED': {
      title: 'Account Banned',
      description: 'Your account has been banned from voting.',
      action: 'Please contact support if you believe this is an error.'
    },
    'ELECTION_NOT_FOUND': {
      title: 'Election Not Found',
      description: 'The election you are trying to vote in could not be found.',
      action: 'Please check the election details and try again.'
    },
    'ELECTION_NOT_ACTIVE': {
      title: 'Election Not Active',
      description: 'This election is not currently active for voting.',
      action: 'Please check the election schedule and try again later.'
    },
    'ELECTION_NOT_STARTED': {
      title: 'Election Not Started',
      description: 'This election has not started yet.',
      action: 'Please wait until the election start time.'
    },
    'ELECTION_ENDED': {
      title: 'Election Ended',
      description: 'This election has already ended.',
      action: 'Voting is no longer available for this election.'
    },
    'ALREADY_VOTED': {
      title: 'Already Voted',
      description: 'You have already cast your vote in this election.',
      action: 'Each user can only vote once per election.'
    },
    'CANDIDATE_NOT_FOUND': {
      title: 'Candidate Not Found',
      description: 'The selected candidate could not be found.',
      action: 'Please select a valid candidate and try again.'
    },
    'CANDIDATE_NOT_IN_ELECTION': {
      title: 'Invalid Candidate',
      description: 'This candidate is not part of this election.',
      action: 'Please select a candidate from this election.'
    },
    'CANDIDATE_NOT_ACTIVE': {
      title: 'Candidate Inactive',
      description: 'This candidate is not active for voting.',
      action: 'Please select an active candidate.'
    },
    'RATE_LIMIT_EXCEEDED': {
      title: 'Too Many Attempts',
      description: 'You have made too many voting attempts recently.',
      action: 'Please wait a moment before trying again.'
    },
    'ELECTION_FULL': {
      title: 'Election Full',
      description: 'This election has reached its maximum number of voters.',
      action: 'No more votes can be accepted for this election.'
    }
  };

  return errorMap[validationError.error] || {
    title: 'Validation Error',
    description: validationError.message,
    action: 'Please check your input and try again.'
  };
};

module.exports = {
  validateUserEligibility,
  validateEligibilityCriteria,
  validateDuplicateVote,
  validateCandidate,
  validateWriteInCandidate,
  validateVotingRateLimit,
  validateElectionCapacity,
  validateVote,
  validateVoteDeletion,
  getValidationErrorDetails
};
