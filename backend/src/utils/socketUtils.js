const { 
  notifyAdmins, 
  broadcastToElection, 
  broadcastToAll, 
  sendToUser 
} = require('../config/socketConfig');

/**
 * Socket.io Event Utilities
 * Handles real-time events for voting system
 */

// Store the io instance for global access
let ioInstance = null;

/**
 * Set the global Socket.io instance
 */
const setSocketInstance = (io) => {
  ioInstance = io;
};

/**
 * Emit vote cast event
 */
const emitVoteCast = (electionId, candidateId, candidateName, voterEmail) => {
  if (!ioInstance) return;

  // Broadcast to election room
  broadcastToElection(ioInstance, electionId, 'vote-cast', {
    candidateId,
    candidateName,
    voterEmail: voterEmail || 'Anonymous',
    message: `A vote was cast for ${candidateName}`
  });

  // Notify admins
  notifyAdmins(ioInstance, {
    type: 'vote_cast',
    data: {
      electionId,
      candidateId,
      candidateName,
      voterEmail,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Emit election results update
 */
const emitResultsUpdate = (electionId, results) => {
  if (!ioInstance) return;

  broadcastToElection(ioInstance, electionId, 'results-updated', {
    results,
    totalVotes: results.reduce((sum, candidate) => sum + candidate.voteCount, 0),
    message: 'Election results updated'
  });
};

/**
 * Emit election status change
 */
const emitElectionStatusChange = (electionId, electionTitle, oldStatus, newStatus, changedBy) => {
  if (!ioInstance) return;

  broadcastToElection(ioInstance, electionId, 'election-status-changed', {
    electionId,
    electionTitle,
    oldStatus,
    newStatus,
    changedBy,
    message: `Election status changed from ${oldStatus} to ${newStatus}`
  });

  // Also broadcast to all users for important status changes
  if (newStatus === 'active' || newStatus === 'completed') {
    broadcastToAll(ioInstance, 'election-announcement', {
      electionId,
      electionTitle,
      status: newStatus,
      message: `Election "${electionTitle}" is now ${newStatus}!`
    });
  }
};

/**
 * Emit candidate update
 */
const emitCandidateUpdate = (electionId, candidateId, candidateName, action, updatedBy) => {
  if (!ioInstance) return;

  broadcastToElection(ioInstance, electionId, 'candidate-updated', {
    candidateId,
    candidateName,
    action, // 'added', 'updated', 'removed'
    updatedBy,
    message: `Candidate ${candidateName} was ${action}`
  });
};

/**
 * Emit vote deletion (admin action)
 */
const emitVoteDeleted = (electionId, candidateId, candidateName, deletedBy, reason) => {
  if (!ioInstance) return;

  // Notify admins only
  notifyAdmins(ioInstance, {
    type: 'vote_deleted',
    data: {
      electionId,
      candidateId,
      candidateName,
      deletedBy,
      reason,
      timestamp: new Date().toISOString()
    }
  });

  // Update results for election room
  broadcastToElection(ioInstance, electionId, 'results-updated', {
    message: 'Vote count updated',
    note: 'A vote was removed by administrator'
  });
};

/**
 * Emit user notification
 */
const emitUserNotification = (userId, type, title, message, data = {}) => {
  if (!ioInstance) return;

  sendToUser(ioInstance, userId, 'notification', {
    type,
    title,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Emit system announcement
 */
const emitSystemAnnouncement = (title, message, targetRole = null) => {
  if (!ioInstance) return;

  const announcement = {
    type: 'system_announcement',
    title,
    message,
    timestamp: new Date().toISOString()
  };

  if (targetRole === 'admin') {
    notifyAdmins(ioInstance, {
      type: 'system_announcement',
      data: announcement
    });
  } else {
    broadcastToAll(ioInstance, 'system-announcement', announcement);
  }
};

/**
 * Emit voting statistics update (admin only)
 */
const emitVotingStats = (electionId, stats) => {
  if (!ioInstance) return;

  notifyAdmins(ioInstance, {
    type: 'voting_stats',
    data: {
      electionId,
      stats,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Emit real-time vote count
 */
const emitRealTimeVoteCount = (electionId, candidateId, voteCount) => {
  if (!ioInstance) return;

  broadcastToElection(ioInstance, electionId, 'vote-count-update', {
    candidateId,
    voteCount,
    timestamp: new Date().toISOString()
  });
};

/**
 * Emit election start notification
 */
const emitElectionStart = (electionId, electionTitle) => {
  if (!ioInstance) return;

  broadcastToAll(ioInstance, 'election-started', {
    electionId,
    electionTitle,
    message: `Voting has started for "${electionTitle}"!`,
    action: 'vote_now'
  });
};

/**
 * Emit election end notification
 */
const emitElectionEnd = (electionId, electionTitle) => {
  if (!ioInstance) return;

  broadcastToAll(ioInstance, 'election-ended', {
    electionId,
    electionTitle,
    message: `Voting has ended for "${electionTitle}". Results are now available!`,
    action: 'view_results'
  });
};

/**
 * Emit candidate added notification
 */
const emitCandidateAdded = (electionId, candidate) => {
  if (!ioInstance) return;

  broadcastToElection(ioInstance, electionId, 'candidate-added', {
    candidate,
    message: `New candidate "${candidate.name}" added to the election`
  });
};

/**
 * Emit candidate removed notification
 */
const emitCandidateRemoved = (electionId, candidateName, removedBy) => {
  if (!ioInstance) return;

  broadcastToElection(ioInstance, electionId, 'candidate-removed', {
    candidateName,
    removedBy,
    message: `Candidate "${candidateName}" removed from the election`
  });
};

/**
 * Emit election created notification
 */
const emitElectionCreated = (electionId, electionTitle, createdBy) => {
  if (!ioInstance) return;

  broadcastToAll(ioInstance, 'election-created', {
    electionId,
    electionTitle,
    createdBy,
    message: `New election "${electionTitle}" has been created!`
  });
};

/**
 * Emit election deleted notification (admin only)
 */
const emitElectionDeleted = (electionId, electionTitle, deletedBy) => {
  if (!ioInstance) return;

  notifyAdmins(ioInstance, {
    type: 'election_deleted',
    data: {
      electionId,
      electionTitle,
      deletedBy,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Emit user banned notification (admin only)
 */
const emitUserBanned = (userId, userEmail, bannedBy, reason) => {
  if (!ioInstance) return;

  // Notify user
  sendToUser(ioInstance, userId, 'account-suspended', {
    reason,
    message: 'Your account has been suspended',
    timestamp: new Date().toISOString()
  });

  // Notify admins
  notifyAdmins(ioInstance, {
    type: 'user_banned',
    data: {
      userId,
      userEmail,
      bannedBy,
      reason,
      timestamp: new Date().toISOString()
    }
  });
};

/**
 * Emit error notification
 */
const emitError = (userId, errorType, message, details = {}) => {
  if (!ioInstance) return;

  sendToUser(ioInstance, userId, 'error', {
    type: errorType,
    message,
    details,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  setSocketInstance,
  emitVoteCast,
  emitResultsUpdate,
  emitElectionStatusChange,
  emitCandidateUpdate,
  emitVoteDeleted,
  emitUserNotification,
  emitSystemAnnouncement,
  emitVotingStats,
  emitRealTimeVoteCount,
  emitElectionStart,
  emitElectionEnd,
  emitCandidateAdded,
  emitCandidateRemoved,
  emitElectionCreated,
  emitElectionDeleted,
  emitUserBanned,
  emitError
};
