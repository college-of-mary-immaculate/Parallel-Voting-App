const { createHash } = require('crypto');
const mysql = require('mysql2/promise');
const { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } = require('./auditLogger');

// Database optimization configuration
const DB_OPTIMIZATION_CONFIG = {
  // Index configuration
  indexes: {
    // User table indexes
    users: [
      { name: 'idx_users_email', columns: ['email'], unique: true, type: 'BTREE' },
      { name: 'idx_users_role', columns: ['role'], type: 'BTREE' },
      { name: 'idx_users_is_active', columns: ['is_active'], type: 'BTREE' },
      { name: 'idx_users_is_email_verified', columns: ['is_email_verified'], type: 'BTREE' },
      { name: 'idx_users_created_at', columns: ['created_at'], type: 'BTREE' },
      { name: 'idx_users_last_login', columns: ['last_login'], type: 'BTREE' },
      { name: 'idx_users_composite', columns: ['role', 'is_active'], type: 'BTREE' }
    ],
    
    // Election table indexes
    elections: [
      { name: 'idx_elections_title', columns: ['title'], type: 'BTREE' },
      { name: 'idx_elections_status', columns: ['status'], type: 'BTREE' },
      { name: 'idx_elections_is_public', columns: ['is_public'], type: 'BTREE' },
      { name: 'idx_elections_start_time', columns: ['start_time'], type: 'BTREE' },
      { name: 'idx_elections_end_time', columns: ['end_time'], type: 'BTREE' },
      { name: 'idx_elections_created_at', columns: ['created_at'], type: 'BTREE' },
      { name: 'idx_elections_composite', columns: ['status', 'is_public', 'start_time'], type: 'BTREE' }
    ],
    
    // Candidate table indexes
    candidates: [
      { name: 'idx_candidates_election_id', columns: ['election_id'], type: 'BTREE' },
      { name: 'idx_candidates_first_name', columns: ['first_name'], type: 'BTREE' },
      { name: 'idx_candidates_last_name', columns: ['last_name'], type: 'BTREE' },
      { name: 'idx_candidates_party', columns: ['party'], type: 'BTREE' },
      { name: 'idx_candidates_is_active', columns: ['is_active'], type: 'BTREE' },
      { name: 'idx_candidates_created_at', columns: ['created_at'], type: 'BTREE' },
      { name: 'idx_candidates_composite', columns: ['election_id', 'is_active'], type: 'BTREE' },
      { name: 'idx_candidates_search', columns: ['first_name', 'last_name', 'party'], type: 'FULLTEXT' }
    ],
    
    // Vote table indexes
    votes: [
      { name: 'idx_votes_election_id', columns: ['election_id'], type: 'BTREE' },
      { name: 'idx_votes_candidate_id', columns: ['candidate_id'], type: 'BTREE' },
      { name: 'idx_votes_user_id', columns: ['user_id'], type: 'BTREE' },
      { name: 'idx_votes_voted_at', columns: ['voted_at'], type: 'BTREE' },
      { name: 'idx_votes_is_verified', columns: ['is_verified'], type: 'BTREE' },
      { name: 'idx_votes_verification_code', columns: ['verification_code'], type: 'BTREE' },
      { name: 'idx_votes_composite', columns: ['election_id', 'user_id'], type: 'BTREE', unique: true },
      { name: 'idx_votes_composite2', columns: ['election_id', 'candidate_id'], type: 'BTREE' }
    ],
    
    // Audit log table indexes
    audit_logs: [
      { name: 'idx_audit_logs_category', columns: ['category'], type: 'BTREE' },
      { name: 'idx_audit_logs_event_type', columns: ['event_type'], type: 'BTREE' },
      { name: 'idx_audit_logs_user_id', columns: ['user_id'], type: 'BTREE' },
      { name: 'idx_audit_logs_election_id', columns: ['election_id'], type: 'BTREE' },
      { name: 'idx_audit_logs_created_at', columns: ['created_at'], type: 'BTREE' },
      { name: 'idx_audit_logs_severity', columns: ['severity'], type: 'BTREE' },
      { name: 'idx_audit_logs_success', columns: ['success'], type: 'BTREE' },
      { name: 'idx_audit_logs_composite', columns: ['category', 'created_at'], type: 'BTREE' }
    ],
    
    // Email logs table indexes
    email_logs: [
      { name: 'idx_email_logs_to_email', columns: ['to_email'], type: 'BTREE' },
      { name: 'idx_email_logs_template', columns: ['template'], type: 'BTREE' },
      { name: 'idx_email_logs_status', columns: ['status'], type: 'BTREE' },
      { name: 'idx_email_logs_created_at', columns: ['created_at'], type: 'BTREE' },
      { name: 'idx_email_logs_composite', columns: ['status', 'created_at'], type: 'BTREE' }
    ],
    
    // Security events table indexes
    security_events: [
      { name: 'idx_security_events_ip_address', columns: ['ip_address'], type: 'BTREE' },
      { name: 'idx_security_events_event_type', columns: ['event_type'], type: 'BTREE' },
      { name: 'idx_security_events_user_id', columns: ['user_id'], type: 'BTREE' },
      { name: 'idx_security_events_created_at', columns: ['created_at'], type: 'BTREE' },
      { name: 'idx_security_events_severity', columns: ['severity'], type: 'BTREE' },
      { name: 'idx_security_events_composite', columns: ['ip_address', 'created_at'], type: 'BTREE' }
    ]
  },
  
  // Query optimization settings
  queryOptimization: {
    // Slow query threshold (milliseconds)
    slowQueryThreshold: 1000,
    
    // Enable query logging
    enableQueryLogging: true,
    
    // Enable query analysis
    enableQueryAnalysis: true,
    
    // Maximum query execution time
    maxQueryExecutionTime: 5000,
    
    // Enable EXPLAIN analysis
    enableExplainAnalysis: true
  },
  
  // Caching configuration
  caching: {
    // Enable caching
    enabled: true,
    
    // Cache type: 'memory', 'redis', 'file'
    type: 'memory',
    
    // Default TTL (seconds)
    defaultTTL: 300, // 5 minutes
    
    // Maximum cache size
    maxCacheSize: 1000,
    
    // Cache cleanup interval (seconds)
    cleanupInterval: 60, // 1 minute
    
    // Cache keys
    keys: {
      // Election data cache
      elections: {
        prefix: 'election:',
        ttl: 600, // 10 minutes
        tags: ['elections']
      },
      
      // Candidate data cache
      candidates: {
        prefix: 'candidate:',
        ttl: 600, // 10 minutes
        tags: ['candidates']
      },
      
      // Vote counts cache
      voteCounts: {
        prefix: 'vote_count:',
        ttl: 30, // 30 seconds
        tags: ['votes']
      },
      
      // User data cache
      users: {
        prefix: 'user:',
        ttl: 900, // 15 minutes
        tags: ['users']
      },
      
      // Analytics cache
      analytics: {
        prefix: 'analytics:',
        ttl: 1800, // 30 minutes
        tags: ['analytics']
      }
    }
  },
  
  // Performance monitoring
  performanceMonitoring: {
    // Enable performance monitoring
    enabled: true,
    
    // Connection pool monitoring
    monitorConnectionPool: true,
    
    // Query performance monitoring
    monitorQueryPerformance: true,
    
    // Slow query logging
    logSlowQueries: true,
    
    // Performance metrics collection
    collectMetrics: true
  }
};

// In-memory cache implementation
class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = new Map();
    this.tags = new Map();
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300;
    this.cleanupInterval = options.cleanupInterval || 60000;
    
    // Start cleanup interval
    this.startCleanup();
  }
  
  set(key, value, ttl = this.defaultTTL, tags = []) {
    // Check if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const expiresAt = Date.now() + (ttl * 1000);
    
    this.cache.set(key, {
      value,
      expiresAt,
      accessTime: Date.now(),
      tags
    });
    
    // Update tags mapping
    tags.forEach(tag => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag).add(key);
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }
    
    // Update access time
    item.accessTime = Date.now();
    
    return item.value;
  }
  
  delete(key) {
    const item = this.cache.get(key);
    
    if (item) {
      // Remove from tags
      item.tags.forEach(tag => {
        const tagSet = this.tags.get(tag);
        if (tagSet) {
          tagSet.delete(key);
          if (tagSet.size === 0) {
            this.tags.delete(tag);
          }
        }
      });
      
      this.cache.delete(key);
    }
  }
  
  clear() {
    this.cache.clear();
    this.ttl.clear();
    this.tags.clear();
  }
  
  invalidateByTag(tag) {
    const keys = this.tags.get(tag);
    
    if (keys) {
      keys.forEach(key => this.delete(key));
    }
  }
  
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.accessTime < oldestTime) {
        oldestTime = item.accessTime;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }
  
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete = [];
      
      for (const [key, item] of this.cache.entries()) {
        if (now > item.expiresAt) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.delete(key));
    }, this.cleanupInterval);
  }
  
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      tags: Array.from(this.tags.keys()).map(tag => ({
        tag,
        count: this.tags.get(tag).size
      }))
    };
  }
}

// Initialize cache
const cache = new MemoryCache(DB_OPTIMIZATION_CONFIG.caching);

// Database connection pool
let dbPool = null;

// Initialize database connection
const initializeDatabase = async (connectionConfig) => {
  try {
    dbPool = mysql.createPool({
      host: connectionConfig.host || process.env.DB_HOST || 'localhost',
      port: connectionConfig.port || process.env.DB_PORT || 3306,
      user: connectionConfig.user || process.env.DB_USER || 'root',
      password: connectionConfig.password || process.env.DB_PASSWORD || '',
      database: connectionConfig.database || process.env.DB_NAME || 'parallel_voting',
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true,
      charset: 'utf8mb4',
      timezone: '+00:00',
      multipleStatements: false,
      flags: '+FOUND_ROWS',
      ssl: connectionConfig.ssl || false,
      // Performance optimizations
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      // Connection pool optimization
      idleTimeout: 300000, // 5 minutes
      maxIdle: 10
    });
    
    console.log('🗄️ Database connection pool initialized');
    return dbPool;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Get database connection
const getConnection = async () => {
  if (!dbPool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  
  try {
    const connection = await dbPool.getConnection();
    
    // Set session variables for optimization
    await connection.execute(`
      SET SESSION 
      sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO',
      innodb_lock_wait_timeout = 50,
      query_cache_type = ON,
      query_cache_size = 268435456
    `);
    
    return connection;
  } catch (error) {
    console.error('❌ Failed to get database connection:', error);
    throw error;
  }
};

// Create indexes
const createIndexes = async () => {
  const connection = await getConnection();
  
  try {
    console.log('🔧 Creating database indexes...');
    
    for (const [table, indexes] of Object.entries(DB_OPTIMIZATION_CONFIG.indexes)) {
      console.log(`📋 Creating indexes for table: ${table}`);
      
      for (const index of indexes) {
        try {
          // Check if index already exists
          const [existingIndex] = await connection.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.statistics 
            WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?
          `, [table, index.name]);
          
          if (existingIndex[0].count > 0) {
            console.log(`✅ Index ${index.name} already exists`);
            continue;
          }
          
          // Create index
          const indexType = index.type === 'FULLTEXT' ? 'FULLTEXT' : 'INDEX';
          const uniqueKeyword = index.unique ? 'UNIQUE' : '';
          const columns = index.columns.join(', ');
          
          await connection.execute(`
            ALTER TABLE ${table} 
            ADD ${uniqueKeyword} ${indexType} ${index.name} (${columns})
          `);
          
          console.log(`✅ Created index ${index.name} on table ${table}`);
          
          // Log index creation
          await logSecurityEvent(
            AUDIT_EVENTS.SYSTEM_CONFIG,
            null,
            {
              action: 'create_index',
              table: table,
              indexName: index.name,
              columns: index.columns,
              indexType: index.type,
              unique: index.unique || false
            },
            {
              ip: '127.0.0.1',
              headers: { 'user-agent': 'Database Optimizer' },
              session: { id: 'db-optimizer' },
              id: 'create-index'
            },
            { success: true, severity: 'low' }
          );
          
        } catch (error) {
          console.error(`❌ Failed to create index ${index.name}:`, error.message);
        }
      }
    }
    
    console.log('✅ Database indexes creation completed');
  } catch (error) {
    console.error('❌ Index creation failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Analyze and optimize tables
const optimizeTables = async () => {
  const connection = await getConnection();
  
  try {
    console.log('🔧 Analyzing and optimizing tables...');
    
    // Get all tables
    const [tables] = await connection.execute('SHOW TABLES');
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      
      try {
        // Analyze table
        await connection.execute(`ANALYZE TABLE ${tableName}`);
        
        // Optimize table (only if fragmented)
        const [fragmentation] = await connection.execute(`
          SELECT 
            ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size_MB',
            ROUND((data_free / 1024 / 1024), 2) AS 'Free_MB'
          FROM information_schema.tables 
          WHERE table_schema = DATABASE() AND table_name = ?
        `, [tableName]);
        
        if (fragmentation[0].Free_MB > 10) { // Optimize if > 10MB free
          await connection.execute(`OPTIMIZE TABLE ${tableName}`);
          console.log(`✅ Optimized table ${tableName} (freed ${fragmentation[0].Free_MB} MB)`);
        } else {
          console.log(`✅ Analyzed table ${tableName} (no optimization needed)`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to optimize table ${tableName}:`, error.message);
      }
    }
    
    console.log('✅ Table optimization completed');
  } catch (error) {
    console.error('❌ Table optimization failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Query execution with optimization
const executeQuery = async (query, params = [], options = {}) => {
  const connection = await getConnection();
  const startTime = Date.now();
  
  try {
    // Check cache first
    if (DB_OPTIMIZATION_CONFIG.caching.enabled && options.cacheKey) {
      const cachedResult = cache.get(options.cacheKey);
      if (cachedResult) {
        console.log(`🎯 Cache hit for key: ${options.cacheKey}`);
        return cachedResult;
      }
    }
    
    // Log slow queries
    if (DB_OPTIMIZATION_CONFIG.queryOptimization.enableQueryLogging) {
      console.log(`🔍 Executing query: ${query.substring(0, 100)}...`);
    }
    
    // Execute query
    const [results] = await connection.execute(query, params);
    
    // Cache results
    if (DB_OPTIMIZATION_CONFIG.caching.enabled && options.cacheKey && options.ttl) {
      const cacheConfig = options.cacheConfig || DB_OPTIMIZATION_CONFIG.caching.keys.default;
      cache.set(options.cacheKey, results, options.ttl || cacheConfig.ttl, cacheConfig.tags);
      console.log(`💾 Cached results for key: ${options.cacheKey}`);
    }
    
    // Log performance
    const executionTime = Date.now() - startTime;
    if (executionTime > DB_OPTIMIZATION_CONFIG.queryOptimization.slowQueryThreshold) {
      console.warn(`⚠️ Slow query detected: ${executionTime}ms - ${query.substring(0, 100)}...`);
      
      // Log slow query
      await logSecurityEvent(
        AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
        null,
        {
          action: 'slow_query',
          query: query.substring(0, 500),
          params: JSON.stringify(params),
          executionTime: executionTime,
          threshold: DB_OPTIMIZATION_CONFIG.queryOptimization.slowQueryThreshold
        },
        {
          ip: '127.0.0.1',
          headers: { 'user-agent': 'Query Monitor' },
          session: { id: 'query-monitor' },
          id: 'slow-query'
        },
        { success: true, severity: 'medium' }
      );
    }
    
    console.log(`✅ Query executed in ${executionTime}ms`);
    return results;
    
  } catch (error) {
    console.error('❌ Query execution failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Execute query with EXPLAIN analysis
const executeQueryWithExplain = async (query, params = []) => {
  const connection = await getConnection();
  
  try {
    // Execute EXPLAIN
    const [explain] = await connection.execute(`EXPLAIN ${query}`, params);
    
    // Analyze EXPLAIN results
    const analysis = analyzeExplainResults(explain);
    
    if (analysis.hasIssues) {
      console.warn('⚠️ Query optimization issues detected:', analysis.issues);
      
      // Log optimization issues
      await logSecurityEvent(
        AUDIT_EVENTS.SUSPICIOUS_ACTIVITY,
        null,
        {
          action: 'query_optimization_issue',
          query: query.substring(0, 500),
          params: JSON.stringify(params),
          issues: analysis.issues,
          suggestions: analysis.suggestions
        },
        {
          ip: '127.0.0.1',
          headers: { 'user-agent': 'Query Analyzer' },
          session: { id: 'query-analyzer' },
          id: 'query-optimization'
        },
        { success: true, severity: 'low' }
      );
    }
    
    // Execute actual query
    const [results] = await connection.execute(query, params);
    
    return {
      results,
      explain: explain,
      analysis
    };
    
  } catch (error) {
    console.error('❌ Query with EXPLAIN failed:', error);
    throw error;
  } finally {
    connection.release();
  }
};

// Analyze EXPLAIN results
const analyzeExplainResults = (explainResults) => {
  const issues = [];
  const suggestions = [];
  let hasIssues = false;
  
  for (const row of explainResults) {
    // Check for full table scans
    if (row.type === 'ALL') {
      issues.push(`Full table scan on table ${row.table}`);
      suggestions.push(`Add index on columns used in WHERE clause for table ${row.table}`);
      hasIssues = true;
    }
    
    // Check for filesort
    if (row.Extra && row.Extra.includes('Using filesort')) {
      issues.push(`Filesort detected on table ${row.table}`);
      suggestions.push(`Add index on ORDER BY columns for table ${row.table}`);
      hasIssues = true;
    }
    
    // Check for temporary tables
    if (row.Extra && row.Extra.includes('Using temporary')) {
      issues.push(`Temporary table created for table ${row.table}`);
      suggestions.push(`Optimize query to avoid temporary tables for table ${row.table}`);
      hasIssues = true;
    }
    
    // Check for high rows examined
    if (row.rows && row.rows > 10000) {
      issues.push(`High number of rows examined: ${row.rows}`);
      suggestions.push(`Add more specific WHERE conditions or indexes`);
      hasIssues = true;
    }
  }
  
  return {
    hasIssues,
    issues,
    suggestions,
    explainResults
  };
};

// Cache management functions
const cacheManager = {
  // Get from cache
  get: (key) => {
    return cache.get(key);
  },
  
  // Set cache
  set: (key, value, ttl, tags = []) => {
    cache.set(key, value, ttl, tags);
  },
  
  // Delete from cache
  delete: (key) => {
    cache.delete(key);
  },
  
  // Clear cache
  clear: () => {
    cache.clear();
  },
  
  // Invalidate by tag
  invalidateByTag: (tag) => {
    cache.invalidateByTag(tag);
  },
  
  // Get cache stats
  getStats: () => {
    return cache.getStats();
  }
};

// Performance monitoring
const performanceMonitor = {
  // Get connection pool stats
  getConnectionPoolStats: async () => {
    if (!dbPool) {
      return null;
    }
    
    return {
      totalConnections: dbPool._allConnections.length,
      freeConnections: dbPool._freeConnections.length,
      acquiringConnections: dbPool._acquiringConnections.length,
      connectionLimit: dbPool._connectionLimit,
      queueLength: dbPool._connectionQueue.length
    };
  },
  
  // Get slow queries
  getSlowQueries: async (limit = 50) => {
    const connection = await getConnection();
    
    try {
      const [slowQueries] = await connection.execute(`
        SELECT 
          query_time,
          lock_time,
          rows_sent,
          rows_examined,
          sql_text
        FROM mysql.slow_log 
        ORDER BY query_time DESC 
        LIMIT ?
      `, [limit]);
      
      return slowQueries;
    } catch (error) {
      console.error('❌ Failed to get slow queries:', error);
      return [];
    } finally {
      connection.release();
    }
  },
  
  // Get table statistics
  getTableStats: async () => {
    const connection = await getConnection();
    
    try {
      const [stats] = await connection.execute(`
        SELECT 
          table_name,
          table_rows,
          data_length,
          index_length,
          data_free,
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS total_size_mb,
          ROUND((data_free / 1024 / 1024), 2) AS free_space_mb
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY total_size_mb DESC
      `);
      
      return stats;
    } catch (error) {
      console.error('❌ Failed to get table stats:', error);
      return [];
    } finally {
      connection.release();
    }
  }
};

// Initialize database optimization
const initializeDatabaseOptimization = async (connectionConfig) => {
  try {
    console.log('🚀 Initializing database optimization...');
    
    // Initialize database connection
    await initializeDatabase(connectionConfig);
    
    // Create indexes
    await createIndexes();
    
    // Optimize tables
    await optimizeTables();
    
    console.log('✅ Database optimization initialized');
    return true;
  } catch (error) {
    console.error('❌ Database optimization initialization failed:', error);
    throw error;
  }
};

module.exports = {
  initializeDatabaseOptimization,
  initializeDatabase,
  getConnection,
  executeQuery,
  executeQueryWithExplain,
  cacheManager,
  performanceMonitor,
  createIndexes,
  optimizeTables,
  DB_OPTIMIZATION_CONFIG
};
