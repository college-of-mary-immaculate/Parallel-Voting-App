const { executeQuery, executeQueryWithExplain, cacheManager, DB_OPTIMIZATION_CONFIG } = require('./databaseOptimizer');

// Optimized query templates
const OPTIMIZED_QUERIES = {
  // User queries
  users: {
    // Get user by email with caching
    getUserByEmail: `
      SELECT 
        user_id, email, password_hash, first_name, last_name, 
        role, is_active, is_email_verified, created_at, last_login
      FROM users 
      WHERE email = ? AND is_active = 1
    `,
    
    // Get user profile with caching
    getUserProfile: `
      SELECT 
        user_id, email, first_name, last_name, role, 
        phone_number, date_of_birth, address, city, state, 
        country, postal_code, is_email_verified, created_at, last_login
      FROM users 
      WHERE user_id = ? AND is_active = 1
    `,
    
    // Get users with pagination and filters
    getUsers: `
      SELECT 
        user_id, email, first_name, last_name, role, 
        is_active, is_email_verified, created_at, last_login
      FROM users 
      WHERE is_active = ?
        AND (? IS NULL OR role = ?)
        AND (? IS NULL OR is_email_verified = ?)
        AND (? IS NULL OR created_at >= ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    
    // Count users for pagination
    countUsers: `
      SELECT COUNT(*) as total
      FROM users 
      WHERE is_active = ?
        AND (? IS NULL OR role = ?)
        AND (? IS NULL OR is_email_verified = ?)
        AND (? IS NULL OR created_at >= ?)
    `,
    
    // Search users with fulltext search
    searchUsers: `
      SELECT 
        user_id, email, first_name, last_name, role, 
        is_active, is_email_verified, created_at,
        MATCH(first_name, last_name, email) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
      FROM users 
      WHERE is_active = 1
        AND MATCH(first_name, last_name, email) AGAINST(? IN NATURAL LANGUAGE MODE)
      ORDER BY relevance DESC, created_at DESC
      LIMIT ? OFFSET ?
    `
  },
  
  // Election queries
  elections: {
    // Get active elections with caching
    getActiveElections: `
      SELECT 
        e.election_id, e.title, e.description, e.status, 
        e.is_public, e.start_time, e.end_time, e.created_at,
        COUNT(c.candidate_id) as candidate_count,
        COUNT(v.vote_id) as vote_count
      FROM elections e
      LEFT JOIN candidates c ON e.election_id = c.election_id AND c.is_active = 1
      LEFT JOIN votes v ON e.election_id = v.election_id
      WHERE e.status = 'active' 
        AND e.is_public = 1
        AND e.start_time <= NOW()
        AND e.end_time >= NOW()
      GROUP BY e.election_id
      ORDER BY e.start_time ASC
    `,
    
    // Get election with candidates and vote counts
    getElectionWithDetails: `
      SELECT 
        e.election_id, e.title, e.description, e.status, 
        e.is_public, e.start_time, e.end_time, e.created_at,
        c.candidate_id, c.first_name, c.last_name, c.party, 
        c.position, c.bio, c.image_url, c.is_active,
        COUNT(v.vote_id) as vote_count
      FROM elections e
      LEFT JOIN candidates c ON e.election_id = c.election_id AND c.is_active = 1
      LEFT JOIN votes v ON c.candidate_id = v.candidate_id
      WHERE e.election_id = ?
      GROUP BY e.election_id, c.candidate_id
      ORDER BY c.last_name, c.first_name
    `,
    
    // Get elections with pagination and filters
    getElections: `
      SELECT 
        e.election_id, e.title, e.description, e.status, 
        e.is_public, e.start_time, e.end_time, e.created_at,
        COUNT(c.candidate_id) as candidate_count,
        COUNT(DISTINCT v.vote_id) as vote_count
      FROM elections e
      LEFT JOIN candidates c ON e.election_id = c.election_id AND c.is_active = 1
      LEFT JOIN votes v ON e.election_id = v.election_id
      WHERE (? IS NULL OR e.status = ?)
        AND (? IS NULL OR e.is_public = ?)
        AND (? IS NULL OR e.start_time >= ?)
        AND (? IS NULL OR e.end_time <= ?)
      GROUP BY e.election_id
      ORDER BY e.created_at DESC
      LIMIT ? OFFSET ?
    `,
    
    // Count elections for pagination
    countElections: `
      SELECT COUNT(DISTINCT e.election_id) as total
      FROM elections e
      WHERE (? IS NULL OR e.status = ?)
        AND (? IS NULL OR e.is_public = ?)
        AND (? IS NULL OR e.start_time >= ?)
        AND (? IS NULL OR e.end_time <= ?)
    `,
    
    // Search elections with fulltext search
    searchElections: `
      SELECT 
        e.election_id, e.title, e.description, e.status, 
        e.is_public, e.start_time, e.end_time, e.created_at,
        COUNT(c.candidate_id) as candidate_count,
        MATCH(e.title, e.description) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
      FROM elections e
      LEFT JOIN candidates c ON e.election_id = c.election_id AND c.is_active = 1
      WHERE MATCH(e.title, e.description) AGAINST(? IN NATURAL LANGUAGE MODE)
      GROUP BY e.election_id
      ORDER BY relevance DESC, e.created_at DESC
      LIMIT ? OFFSET ?
    `
  },
  
  // Candidate queries
  candidates: {
    // Get candidates by election with caching
    getCandidatesByElection: `
      SELECT 
        c.candidate_id, c.first_name, c.last_name, c.party, 
        c.position, c.bio, c.image_url, c.is_active, c.created_at,
        COUNT(v.vote_id) as vote_count,
        ROUND((COUNT(v.vote_id) / (
          SELECT COUNT(*) FROM votes v2 
          WHERE v2.election_id = c.election_id
        )) * 100, 2) as vote_percentage
      FROM candidates c
      LEFT JOIN votes v ON c.candidate_id = v.candidate_id
      WHERE c.election_id = ? AND c.is_active = 1
      GROUP BY c.candidate_id
      ORDER BY c.last_name, c.first_name
    `,
    
    // Get candidate with election details
    getCandidateWithElection: `
      SELECT 
        c.candidate_id, c.first_name, c.last_name, c.party, 
        c.position, c.bio, c.image_url, c.is_active, c.created_at,
        e.election_id, e.title as election_title, e.status as election_status,
        e.start_time as election_start, e.end_time as election_end,
        COUNT(v.vote_id) as vote_count
      FROM candidates c
      JOIN elections e ON c.election_id = e.election_id
      LEFT JOIN votes v ON c.candidate_id = v.candidate_id
      WHERE c.candidate_id = ?
      GROUP BY c.candidate_id
    `,
    
    // Search candidates with fulltext search
    searchCandidates: `
      SELECT 
        c.candidate_id, c.first_name, c.last_name, c.party, 
        c.position, c.bio, c.image_url, c.is_active, c.created_at,
        e.title as election_title, e.status as election_status,
        MATCH(c.first_name, c.last_name, c.party, c.bio) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance
      FROM candidates c
      JOIN elections e ON c.election_id = e.election_id
      WHERE MATCH(c.first_name, c.last_name, c.party, c.bio) AGAINST(? IN NATURAL LANGUAGE MODE)
        AND c.is_active = 1
      ORDER BY relevance DESC, c.last_name, c.first_name
      LIMIT ? OFFSET ?
    `
  },
  
  // Vote queries
  votes: {
    // Check if user has voted in election
    hasUserVoted: `
      SELECT COUNT(*) as has_voted
      FROM votes 
      WHERE election_id = ? AND user_id = ?
    `,
    
    // Get vote results for election
    getElectionResults: `
      SELECT 
        c.candidate_id, c.first_name, c.last_name, c.party, 
        c.position, c.image_url,
        COUNT(v.vote_id) as vote_count,
        ROUND((COUNT(v.vote_id) / (
          SELECT COUNT(*) FROM votes v2 
          WHERE v2.election_id = ?
        )) * 100, 2) as vote_percentage,
        RANK() OVER (ORDER BY COUNT(v.vote_id) DESC) as rank
      FROM candidates c
      LEFT JOIN votes v ON c.candidate_id = v.candidate_id
      WHERE c.election_id = ? AND c.is_active = 1
      GROUP BY c.candidate_id
      ORDER BY vote_count DESC
    `,
    
    // Get user votes with pagination
    getUserVotes: `
      SELECT 
        v.vote_id, v.voted_at, v.is_verified, v.verification_code,
        c.candidate_id, c.first_name, c.last_name, c.party,
        e.election_id, e.title as election_title, e.status as election_status
      FROM votes v
      JOIN candidates c ON v.candidate_id = c.candidate_id
      JOIN elections e ON v.election_id = e.election_id
      WHERE v.user_id = ?
        AND (? IS NULL OR v.election_id = ?)
        AND (? IS NULL OR e.status = ?)
        AND (? IS NULL OR v.voted_at >= ?)
        AND (? IS NULL OR v.voted_at <= ?)
      ORDER BY v.voted_at DESC
      LIMIT ? OFFSET ?
    `,
    
    // Count user votes for pagination
    countUserVotes: `
      SELECT COUNT(*) as total
      FROM votes v
      JOIN elections e ON v.election_id = e.election_id
      WHERE v.user_id = ?
        AND (? IS NULL OR v.election_id = ?)
        AND (? IS NULL OR e.status = ?)
        AND (? IS NULL OR v.voted_at >= ?)
        AND (? IS NULL OR v.voted_at <= ?)
    `,
    
    // Get voting statistics
    getVotingStats: `
      SELECT 
        e.election_id, e.title as election_title,
        COUNT(DISTINCT v.user_id) as total_voters,
        COUNT(v.vote_id) as total_votes,
        COUNT(DISTINCT c.candidate_id) as total_candidates,
        ROUND(AVG(
          SELECT COUNT(*) FROM votes v2 
          WHERE v2.election_id = e.election_id 
          GROUP BY v2.user_id
        ), 2) as avg_votes_per_voter,
        MAX(
          SELECT COUNT(*) FROM votes v3 
          WHERE v3.election_id = e.election_id 
          GROUP BY v3.user_id
        ) as max_votes_per_voter
      FROM elections e
      LEFT JOIN votes v ON e.election_id = v.election_id
      LEFT JOIN candidates c ON e.election_id = c.election_id AND c.is_active = 1
      WHERE e.status = 'completed'
      GROUP BY e.election_id
      ORDER BY e.end_time DESC
    `
  },
  
  // Analytics queries
  analytics: {
    // Get user registration trends
    getUserRegistrationTrends: `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as registrations,
        COUNT(CASE WHEN is_email_verified = 1 THEN 1 END) as verified_registrations
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `,
    
    // Get voting trends
    getVotingTrends: `
      SELECT 
        DATE(voted_at) as date,
        e.election_id, e.title as election_title,
        COUNT(DISTINCT v.user_id) as unique_voters,
        COUNT(v.vote_id) as total_votes
      FROM votes v
      JOIN elections e ON v.election_id = e.election_id
      WHERE v.voted_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(voted_at), e.election_id
      ORDER BY date DESC, total_votes DESC
    `,
    
    // Get election participation rates
    getElectionParticipation: `
      SELECT 
        e.election_id, e.title as election_title,
        COUNT(DISTINCT u.user_id) as total_eligible_users,
        COUNT(DISTINCT v.user_id) as total_voters,
        ROUND((COUNT(DISTINCT v.user_id) / COUNT(DISTINCT u.user_id)) * 100, 2) as participation_rate,
        e.start_time, e.end_time, e.status
      FROM elections e
      LEFT JOIN users u ON u.is_active = 1 AND u.is_email_verified = 1
      LEFT JOIN votes v ON e.election_id = v.election_id
      WHERE e.status IN ('active', 'completed')
        AND e.start_time <= NOW()
      GROUP BY e.election_id
      ORDER BY e.start_time DESC
    `,
    
    // Get system performance metrics
    getSystemMetrics: `
      SELECT 
        'users' as metric_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_count,
        COUNT(CASE WHEN is_email_verified = 1 THEN 1 END) as verified_count,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_count
      FROM users
      UNION ALL
      SELECT 
        'elections' as metric_type,
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_count
      FROM elections
      UNION ALL
      SELECT 
        'votes' as metric_type,
        COUNT(*) as total_count,
        COUNT(CASE WHERE voted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 END) as active_count,
        COUNT(CASE WHERE is_verified = 1 THEN 1 END) as verified_count,
        COUNT(CASE WHERE voted_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as recent_count
      FROM votes
    `
  }
};

// Optimized query executor with caching
class OptimizedQueryExecutor {
  constructor() {
    this.cacheKeyPrefix = 'query:';
    this.defaultTTL = 300; // 5 minutes
  }
  
  // Generate cache key
  generateCacheKey(queryName, params = []) {
    const paramsStr = JSON.stringify(params);
    const keyData = `${queryName}:${paramsStr}`;
    return this.cacheKeyPrefix + require('crypto').createHash('md5').update(keyData).digest('hex');
  }
  
  // Execute user queries
  async executeUserQuery(queryName, params = [], options = {}) {
    const cacheKey = this.generateCacheKey(`user:${queryName}`, params);
    const query = OPTIMIZED_QUERIES.users[queryName];
    
    if (!query) {
      throw new Error(`Unknown user query: ${queryName}`);
    }
    
    return await executeQuery(query, params, {
      cacheKey: options.cache !== false ? cacheKey : null,
      ttl: options.ttl || 300,
      cacheConfig: DB_OPTIMIZATION_CONFIG.caching.keys.users
    });
  }
  
  // Execute election queries
  async executeElectionQuery(queryName, params = [], options = {}) {
    const cacheKey = this.generateCacheKey(`election:${queryName}`, params);
    const query = OPTIMIZED_QUERIES.elections[queryName];
    
    if (!query) {
      throw new Error(`Unknown election query: ${queryName}`);
    }
    
    return await executeQuery(query, params, {
      cacheKey: options.cache !== false ? cacheKey : null,
      ttl: options.ttl || 600,
      cacheConfig: DB_OPTIMIZATION_CONFIG.caching.keys.elections
    });
  }
  
  // Execute candidate queries
  async executeCandidateQuery(queryName, params = [], options = {}) {
    const cacheKey = this.generateCacheKey(`candidate:${queryName}`, params);
    const query = OPTIMIZED_QUERIES.candidates[queryName];
    
    if (!query) {
      throw new Error(`Unknown candidate query: ${queryName}`);
    }
    
    return await executeQuery(query, params, {
      cacheKey: options.cache !== false ? cacheKey : null,
      ttl: options.ttl || 600,
      cacheConfig: DB_OPTIMIZATION_CONFIG.caching.keys.candidates
    });
  }
  
  // Execute vote queries
  async executeVoteQuery(queryName, params = [], options = {}) {
    const cacheKey = this.generateCacheKey(`vote:${queryName}`, params);
    const query = OPTIMIZED_QUERIES.votes[queryName];
    
    if (!query) {
      throw new Error(`Unknown vote query: ${queryName}`);
    }
    
    return await executeQuery(query, params, {
      cacheKey: options.cache !== false ? cacheKey : null,
      ttl: options.ttl || 30,
      cacheConfig: DB_OPTIMIZATION_CONFIG.caching.keys.voteCounts
    });
  }
  
  // Execute analytics queries
  async executeAnalyticsQuery(queryName, params = [], options = {}) {
    const cacheKey = this.generateCacheKey(`analytics:${queryName}`, params);
    const query = OPTIMIZED_QUERIES.analytics[queryName];
    
    if (!query) {
      throw new Error(`Unknown analytics query: ${queryName}`);
    }
    
    return await executeQuery(query, params, {
      cacheKey: options.cache !== false ? cacheKey : null,
      ttl: options.ttl || 1800,
      cacheConfig: DB_OPTIMIZATION_CONFIG.caching.keys.analytics
    });
  }
  
  // Execute custom query with optimization
  async executeCustomQuery(query, params = [], options = {}) {
    if (options.explain) {
      return await executeQueryWithExplain(query, params);
    }
    
    const cacheKey = options.cacheKey ? this.generateCacheKey('custom', [query, ...params]) : null;
    
    return await executeQuery(query, params, {
      cacheKey: options.cache !== false ? cacheKey : null,
      ttl: options.ttl || this.defaultTTL
    });
  }
  
  // Invalidate cache by pattern
  invalidateCache(pattern) {
    const stats = cacheManager.getStats();
    const keysToInvalidate = [];
    
    // Find keys matching pattern
    for (const tag of stats.tags) {
      if (tag.tag.includes(pattern)) {
        tag.count = tag.count; // Add count property
        cacheManager.invalidateByTag(tag.tag);
      }
    }
  }
}

// Pagination helper
const getPaginationParams = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return {
    limit: Math.min(limit, 100), // Max 100 per page
    offset: Math.max(offset, 0)
  };
};

// Build WHERE clause from filters
const buildWhereClause = (filters, tableAlias = '') => {
  const conditions = [];
  const params = [];
  
  const prefix = tableAlias ? `${tableAlias}.` : '';
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`${prefix}${key} IN (${placeholders})`);
        params.push(...value);
      } else if (typeof value === 'object' && value.operator) {
        conditions.push(`${prefix}${key} ${value.operator} ?`);
        params.push(value.value);
      } else {
        conditions.push(`${prefix}${key} = ?`);
        params.push(value);
      }
    }
  }
  
  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params
  };
};

// Build ORDER BY clause
const buildOrderByClause = (sortBy, sortOrder = 'ASC', tableAlias = '') => {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  const validSortOrders = ['ASC', 'DESC'];
  const order = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC';
  
  if (!sortBy) {
    return { clause: '', params: [] };
  }
  
  return {
    clause: `ORDER BY ${prefix}${sortBy} ${order}`,
    params: []
  };
};

// Query performance analyzer
const analyzeQueryPerformance = async (query, params = []) => {
  const result = await executeQueryWithExplain(query, params);
  
  const analysis = {
    query,
    params,
    executionPlan: result.explain,
    issues: result.analysis.issues,
    suggestions: result.analysis.suggestions,
    estimatedRows: result.explain.reduce((sum, row) => sum + (row.rows || 0), 0),
    hasFullTableScan: result.explain.some(row => row.type === 'ALL'),
    hasFilesort: result.explain.some(row => row.Extra && row.Extra.includes('filesort')),
    hasTemporaryTable: result.explain.some(row => row.Extra && row.Extra.includes('temporary')),
    performanceScore: calculatePerformanceScore(result.explain)
  };
  
  return analysis;
};

// Calculate query performance score
const calculatePerformanceScore = (explainResults) => {
  let score = 100;
  
  for (const row of explainResults) {
    // Penalize full table scans
    if (row.type === 'ALL') {
      score -= 30;
    }
    
    // Penalize filesort
    if (row.Extra && row.Extra.includes('filesort')) {
      score -= 20;
    }
    
    // Penalize temporary tables
    if (row.Extra && row.Extra.includes('temporary')) {
      score -= 15;
    }
    
    // Penalize high row counts
    if (row.rows > 10000) {
      score -= 10;
    } else if (row.rows > 1000) {
      score -= 5;
    }
  }
  
  return Math.max(0, score);
};

// Create singleton instance
const queryExecutor = new OptimizedQueryExecutor();

module.exports = {
  queryExecutor,
  getPaginationParams,
  buildWhereClause,
  buildOrderByClause,
  analyzeQueryPerformance,
  calculatePerformanceScore,
  OPTIMIZED_QUERIES
};
