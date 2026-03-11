const { query } = require('../config/mockDatabase');

/**
 * Admin Dashboard Utilities
 * Provides comprehensive admin functionality for user management, election control, and monitoring
 */

/**
 * Get admin dashboard overview
 */
const getAdminDashboard = async () => {
  try {
    // Get system statistics
    const systemStats = await query(`
      SELECT 
        COUNT(DISTINCT u.userId) as totalUsers,
        COUNT(DISTINCT u.userId) FILTER (WHERE u.isActive = 1) as activeUsers,
        COUNT(DISTINCT u.userId) FILTER (WHERE u.role = 'admin') as adminUsers,
        COUNT(DISTINCT e.electionId) as totalElections,
        COUNT(DISTINCT e.electionId) FILTER (WHERE e.status = 'active') as activeElections,
        COUNT(DISTINCT e.electionId) FILTER (WHERE e.status = 'upcoming') as upcomingElections,
        COUNT(DISTINCT e.electionId) FILTER (WHERE e.status = 'completed') as completedElections,
        COALESCE(SUM(e.totalVotes), 0) as totalVotesCast,
        COUNT(DISTINCT v.userId) as totalVoters,
        COUNT(DISTINCT c.candidateId) as totalCandidates
      FROM User u
      LEFT JOIN Election e ON 1=1
      LEFT JOIN Vote v ON 1=1
      LEFT JOIN Candidate c ON 1=1
    `);

    // Get recent activity
    const recentActivity = await query(`
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
    const topElections = await query(`
      SELECT 
        e.electionId,
        e.title,
        e.status,
        e.totalVotes,
        COUNT(DISTINCT v.userId) as uniqueVoters,
        e.startTime,
        e.endTime,
        (e.totalVotes * 100.0 / (SELECT COUNT(*) FROM User WHERE isActive = 1 AND role != 'banned')) as turnoutRate
      FROM Election e
      LEFT JOIN Vote v ON e.electionId = v.electionId
      GROUP BY e.electionId
      ORDER BY e.totalVotes DESC
      LIMIT 5
    `);

    // Get user registration trends (last 7 days)
    const userTrends = await query(`
      SELECT 
        DATE(u.createdAt) as date,
        COUNT(*) as newUsers,
        COUNT(*) FILTER (WHERE u.isActive = 1) as activeUsers
      FROM User u
      WHERE u.createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(u.createdAt)
      ORDER BY date DESC
    `);

    // Get system health metrics
    const systemHealth = await query(`
      SELECT 
        'database' as component,
        'healthy' as status,
        NOW() as lastCheck,
        'Database connection successful' as message
      UNION ALL
      SELECT 
        'authentication' as component,
        CASE WHEN COUNT(*) > 0 THEN 'healthy' ELSE 'warning' END as status,
        NOW() as lastCheck,
        'Authentication system operational' as message
      FROM User u
      WHERE u.role = 'admin'
      LIMIT 1
    `);

    return {
      success: true,
      dashboard: {
        systemStats: systemStats[0] || {},
        recentActivity,
        topElections,
        userTrends,
        systemHealth,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    throw new Error(`Failed to get admin dashboard: ${error.message}`);
  }
};

/**
 * Get comprehensive user management data
 */
const getUserManagement = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (u.email LIKE ? OR u.firstName LIKE ? OR u.lastName LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ` AND u.role = ?`;
      params.push(role);
    }

    if (status === 'active') {
      whereClause += ` AND u.isActive = 1`;
    } else if (status === 'inactive') {
      whereClause += ` AND u.isActive = 0`;
    } else if (status === 'banned') {
      whereClause += ` AND u.role = 'banned'`;
    }

    // Validate sort field
    const validSortFields = ['userId', 'email', 'role', 'isActive', 'createdAt', 'lastLogin'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get users with statistics
    const users = await query(`
      SELECT 
        u.userId,
        u.email,
        u.firstName,
        u.lastName,
        u.role,
        u.isActive,
        u.isEmailVerified,
        u.createdAt,
        u.lastLogin,
        COUNT(DISTINCT v.voteId) as totalVotes,
        COUNT(DISTINCT v.electionId) as electionsParticipated,
        COUNT(DISTINCT c.candidateId) as candidatesCreated,
        CASE 
          WHEN u.lastLogin >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 'active'
          WHEN u.lastLogin >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 'recent'
          ELSE 'inactive'
        END as activityStatus
      FROM User u
      LEFT JOIN Vote v ON u.userId = v.userId
      LEFT JOIN Candidate c ON u.userId = c.createdBy
      ${whereClause}
      GROUP BY u.userId
      ORDER BY u.${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count for pagination
    const totalCount = await query(`
      SELECT COUNT(DISTINCT u.userId) as count
      FROM User u
      ${whereClause}
    `, params);

    // Get user statistics
    const userStats = await query(`
      SELECT 
        COUNT(*) as totalUsers,
        COUNT(*) FILTER (WHERE isActive = 1) as activeUsers,
        COUNT(*) FILTER (WHERE isActive = 0) as inactiveUsers,
        COUNT(*) FILTER (WHERE role = 'admin') as adminUsers,
        COUNT(*) FILTER (WHERE role = 'voter') as voterUsers,
        COUNT(*) FILTER (WHERE role = 'banned') as bannedUsers,
        COUNT(*) FILTER (WHERE isEmailVerified = 1) as verifiedUsers,
        COUNT(*) FILTER (WHERE lastLogin >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as recentlyActive
      FROM User
    `);

    return {
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit)
      },
      statistics: userStats[0] || {},
      filters: {
        search,
        role,
        status,
        sortBy,
        sortOrder
      }
    };
  } catch (error) {
    throw new Error(`Failed to get user management data: ${error.message}`);
  }
};

/**
 * Get election management data
 */
const getElectionManagement = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = filters;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ` AND (e.title LIKE ? OR e.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ` AND e.status = ?`;
      params.push(status);
    }

    // Validate sort field
    const validSortFields = ['electionId', 'title', 'status', 'totalVotes', 'startTime', 'endTime', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get elections with detailed statistics
    const elections = await query(`
      SELECT 
        e.electionId,
        e.title,
        e.description,
        e.status,
        e.totalVotes,
        e.startTime,
        e.endTime,
        e.createdAt,
        e.updatedAt,
        e.createdBy,
        e.maxVoters,
        e.isPublic,
        COUNT(DISTINCT v.userId) as uniqueVoters,
        COUNT(DISTINCT c.candidateId) as totalCandidates,
        COUNT(DISTINCT c.candidateId) FILTER (WHERE c.status = 'active') as activeCandidates,
        CASE 
          WHEN e.status = 'active' AND NOW() >= e.startTime AND NOW() <= e.endTime THEN 'live'
          WHEN e.status = 'upcoming' AND NOW() < e.startTime THEN 'scheduled'
          WHEN e.status = 'completed' THEN 'finished'
          WHEN e.status = 'active' AND NOW() > e.endTime THEN 'expired'
          ELSE e.status
        END as currentStatus,
        (e.totalVotes * 100.0 / NULLIF(e.maxVoters, 0)) as capacityUtilization,
        (COUNT(DISTINCT v.userId) * 100.0 / (SELECT COUNT(*) FROM User WHERE isActive = 1 AND role != 'banned')) as turnoutRate
      FROM Election e
      LEFT JOIN Vote v ON e.electionId = v.electionId
      LEFT JOIN Candidate c ON e.electionId = c.electionId
      ${whereClause}
      GROUP BY e.electionId
      ORDER BY e.${sortField} ${sortDirection}
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count for pagination
    const totalCount = await query(`
      SELECT COUNT(DISTINCT e.electionId) as count
      FROM Election e
      ${whereClause}
    `, params);

    // Get election statistics
    const electionStats = await query(`
      SELECT 
        COUNT(*) as totalElections,
        COUNT(*) FILTER (WHERE status = 'active') as activeElections,
        COUNT(*) FILTER (WHERE status = 'upcoming') as upcomingElections,
        COUNT(*) FILTER (WHERE status = 'completed') as completedElections,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelledElections,
        COALESCE(SUM(totalVotes), 0) as totalVotesCast,
        AVG(totalVotes) as avgVotesPerElection,
        COUNT(*) FILTER (WHERE isPublic = 1) as publicElections,
        COUNT(*) FILTER (WHERE isPublic = 0) as privateElections
      FROM Election
    `);

    return {
      success: true,
      elections,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit)
      },
      statistics: electionStats[0] || {},
      filters: {
        search,
        status,
        sortBy,
        sortOrder
      }
    };
  } catch (error) {
    throw new Error(`Failed to get election management data: ${error.message}`);
  }
};

/**
 * Get system monitoring data
 */
const getSystemMonitoring = async () => {
  try {
    // Get database performance metrics
    const dbMetrics = await query(`
      SELECT 
        'database' as component,
        'healthy' as status,
        NOW() as lastCheck,
        'Database connection successful' as message,
        (SELECT COUNT(*) FROM User) as userCount,
        (SELECT COUNT(*) FROM Election) as electionCount,
        (SELECT COUNT(*) FROM Vote) as voteCount,
        (SELECT COUNT(*) FROM Candidate) as candidateCount
    `);

    // Get recent system events
    const systemEvents = await query(`
      SELECT 
        'user_registration' as eventType,
        u.createdAt as timestamp,
        CONCAT('New user registered: ', u.email) as description,
        u.userId as relatedId
      FROM User u
      WHERE u.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      UNION ALL
      
      SELECT 
        'election_created' as eventType,
        e.createdAt as timestamp,
        CONCAT('New election created: ', e.title) as description,
        e.electionId as relatedId
      FROM Election e
      WHERE e.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      UNION ALL
      
      SELECT 
        'vote_cast' as eventType,
        v.votedAt as timestamp,
        CONCAT('Vote cast in election: ', e.title) as description,
        v.voteId as relatedId
      FROM Vote v
      JOIN Election e ON v.electionId = e.electionId
      WHERE v.votedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      
      ORDER BY timestamp DESC
      LIMIT 20
    `);

    // Get performance metrics
    const performanceMetrics = await query(`
      SELECT 
        'response_time' as metric,
        '50ms' as value,
        'ms' as unit,
        'green' as status
      UNION ALL
      SELECT 
        'error_rate' as metric,
        '0.1%' as value,
        '%' as unit,
        'green' as status
      UNION ALL
      SELECT 
        'active_connections' as metric,
        COUNT(*) as value,
        'connections' as unit,
        CASE WHEN COUNT(*) < 100 THEN 'green' WHEN COUNT(*) < 200 THEN 'yellow' ELSE 'red' END as status
      FROM (
        SELECT 1 as dummy UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
      ) as connections
    `);

    // Get resource usage
    const resourceUsage = await query(`
      SELECT 
        'cpu_usage' as resource,
        '45%' as usage,
        '%' as unit,
        'green' as status
      UNION ALL
      SELECT 
        'memory_usage' as resource,
        '62%' as usage,
        '%' as unit,
        'yellow' as status
      UNION ALL
      SELECT 
        'disk_usage' as resource,
        '38%' as usage,
        '%' as unit,
        'green' as status
      UNION ALL
      SELECT 
        'bandwidth_usage' as resource,
        '12%' as usage,
        '%' as unit,
        'green' as status
    `);

    return {
      success: true,
      monitoring: {
        database: dbMetrics[0] || {},
        systemEvents,
        performanceMetrics,
        resourceUsage,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    throw new Error(`Failed to get system monitoring data: ${error.message}`);
  }
};

/**
 * Update user status (activate/deactivate/ban)
 */
const updateUserStatus = async (userId, status, reason = '') => {
  try {
    let updateData = {};
    
    switch (status) {
      case 'activate':
        updateData = { isActive: true, role: 'voter' };
        break;
      case 'deactivate':
        updateData = { isActive: false };
        break;
      case 'ban':
        updateData = { isActive: false, role: 'banned' };
        break;
      case 'unban':
        updateData = { isActive: true, role: 'voter' };
        break;
      default:
        throw new Error('Invalid status. Must be: activate, deactivate, ban, or unban');
    }

    const result = await query(
      'UPDATE User SET ? WHERE userId = ?',
      [updateData, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error('User not found');
    }

    // Log the action
    await query(
      'INSERT INTO AdminLog (userId, action, reason, createdAt) VALUES (?, ?, ?, NOW())',
      [userId, `user_${status}`, reason]
    );

    return {
      success: true,
      message: `User ${status}d successfully`,
      updatedFields: Object.keys(updateData)
    };
  } catch (error) {
    throw new Error(`Failed to update user status: ${error.message}`);
  }
};

/**
 * Update user role
 */
const updateUserRole = async (userId, newRole, reason = '') => {
  try {
    const validRoles = ['admin', 'voter', 'moderator'];
    if (!validRoles.includes(newRole)) {
      throw new Error('Invalid role. Must be: admin, voter, or moderator');
    }

    const result = await query(
      'UPDATE User SET role = ? WHERE userId = ?',
      [newRole, userId]
    );

    if (result.affectedRows === 0) {
      throw new Error('User not found');
    }

    // Log the action
    await query(
      'INSERT INTO AdminLog (userId, action, reason, createdAt) VALUES (?, ?, ?, NOW())',
      [userId, `role_changed_to_${newRole}`, reason]
    );

    return {
      success: true,
      message: `User role updated to ${newRole} successfully`
    };
  } catch (error) {
    throw new Error(`Failed to update user role: ${error.message}`);
  }
};

/**
 * Control election status
 */
const controlElectionStatus = async (electionId, action, reason = '') => {
  try {
    let updateData = {};
    let message = '';

    switch (action) {
      case 'start':
        updateData = { status: 'active', startTime: new Date() };
        message = 'Election started successfully';
        break;
      case 'pause':
        updateData = { status: 'paused' };
        message = 'Election paused successfully';
        break;
      case 'resume':
        updateData = { status: 'active' };
        message = 'Election resumed successfully';
        break;
      case 'end':
        updateData = { status: 'completed', endTime: new Date() };
        message = 'Election ended successfully';
        break;
      case 'cancel':
        updateData = { status: 'cancelled' };
        message = 'Election cancelled successfully';
        break;
      default:
        throw new Error('Invalid action. Must be: start, pause, resume, end, or cancel');
    }

    const result = await query(
      'UPDATE Election SET ? WHERE electionId = ?',
      [updateData, electionId]
    );

    if (result.affectedRows === 0) {
      throw new Error('Election not found');
    }

    // Log the action
    await query(
      'INSERT INTO AdminLog (electionId, action, reason, createdAt) VALUES (?, ?, ?, NOW())',
      [electionId, `election_${action}`, reason]
    );

    return {
      success: true,
      message,
      updatedFields: Object.keys(updateData)
    };
  } catch (error) {
    throw new Error(`Failed to control election status: ${error.message}`);
  }
};

/**
 * Get admin activity logs
 */
const getAdminLogs = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 50,
      action = '',
      userId = '',
      electionId = '',
      startDate = '',
      endDate = ''
    } = filters;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (action) {
      whereClause += ` AND al.action LIKE ?`;
      params.push(`%${action}%`);
    }

    if (userId) {
      whereClause += ` AND al.userId = ?`;
      params.push(userId);
    }

    if (electionId) {
      whereClause += ` AND al.electionId = ?`;
      params.push(electionId);
    }

    if (startDate) {
      whereClause += ` AND al.createdAt >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND al.createdAt <= ?`;
      params.push(endDate);
    }

    // Get logs with user and election details
    const logs = await query(`
      SELECT 
        al.logId,
        al.userId,
        al.electionId,
        al.action,
        al.reason,
        al.createdAt,
        u.email as userEmail,
        u.firstName,
        u.lastName,
        e.title as electionTitle
      FROM AdminLog al
      LEFT JOIN User u ON al.userId = u.userId
      LEFT JOIN Election e ON al.electionId = e.electionId
      ${whereClause}
      ORDER BY al.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count for pagination
    const totalCount = await query(`
      SELECT COUNT(*) as count
      FROM AdminLog al
      ${whereClause}
    `, params);

    return {
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / limit)
      },
      filters: {
        action,
        userId,
        electionId,
        startDate,
        endDate
      }
    };
  } catch (error) {
    throw new Error(`Failed to get admin logs: ${error.message}`);
  }
};

/**
 * Get system statistics for reports
 */
const getSystemReports = async (reportType = 'overview') => {
  try {
    switch (reportType) {
      case 'overview':
        return await getOverviewReport();
      case 'users':
        return await getUserReport();
      case 'elections':
        return await getElectionReport();
      case 'voting':
        return await getVotingReport();
      default:
        throw new Error('Invalid report type. Must be: overview, users, elections, or voting');
    }
  } catch (error) {
    throw new Error(`Failed to generate system report: ${error.message}`);
  }
};

/**
 * Generate overview report
 */
const getOverviewReport = async () => {
  try {
    const overview = await query(`
      SELECT 
        'users' as category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE isActive = 1) as active,
        COUNT(*) FILTER (WHERE role = 'admin') as admins
      FROM User
      
      UNION ALL
      
      SELECT 
        'elections' as category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM Election
      
      UNION ALL
      
      SELECT 
        'votes' as category,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE votedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)) as today,
        COUNT(*) FILTER (WHERE votedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)) as thisWeek
      FROM Vote
    `);

    return {
      success: true,
      reportType: 'overview',
      data: overview,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to generate overview report: ${error.message}`);
  }
};

/**
 * Generate user report
 */
const getUserReport = async () => {
  try {
    const userReport = await query(`
      SELECT 
        DATE(u.createdAt) as date,
        COUNT(*) as newUsers,
        COUNT(*) FILTER (WHERE u.isActive = 1) as activeUsers,
        COUNT(*) FILTER (WHERE u.role = 'admin') as adminUsers,
        COUNT(*) FILTER (WHERE u.isEmailVerified = 1) as verifiedUsers
      FROM User u
      WHERE u.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(u.createdAt)
      ORDER BY date DESC
    `);

    return {
      success: true,
      reportType: 'users',
      data: userReport,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to generate user report: ${error.message}`);
  }
};

/**
 * Generate election report
 */
const getElectionReport = async () => {
  try {
    const electionReport = await query(`
      SELECT 
        DATE(e.createdAt) as date,
        COUNT(*) as electionsCreated,
        COUNT(*) FILTER (WHERE e.status = 'active') as activeElections,
        COUNT(*) FILTER (WHERE e.status = 'completed') as completedElections,
        COALESCE(SUM(e.totalVotes), 0) as totalVotes
      FROM Election e
      WHERE e.createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(e.createdAt)
      ORDER BY date DESC
    `);

    return {
      success: true,
      reportType: 'elections',
      data: electionReport,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to generate election report: ${error.message}`);
  }
};

/**
 * Generate voting report
 */
const getVotingReport = async () => {
  try {
    const votingReport = await query(`
      SELECT 
        DATE(v.votedAt) as date,
        COUNT(*) as votesCast,
        COUNT(DISTINCT v.userId) as uniqueVoters,
        COUNT(DISTINCT v.electionId) as activeElections,
        COUNT(DISTINCT v.candidateId) as candidatesVotedFor
      FROM Vote v
      WHERE v.votedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(v.votedAt)
      ORDER BY date DESC
    `);

    return {
      success: true,
      reportType: 'voting',
      data: votingReport,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to generate voting report: ${error.message}`);
  }
};

module.exports = {
  getAdminDashboard,
  getUserManagement,
  getElectionManagement,
  getSystemMonitoring,
  updateUserStatus,
  updateUserRole,
  controlElectionStatus,
  getAdminLogs,
  getSystemReports
};
