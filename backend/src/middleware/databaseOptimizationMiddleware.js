// const { 
//   initializeDatabaseOptimization, 
//   performanceMonitor, 
//   cacheManager,
//   DB_OPTIMIZATION_CONFIG 
// } = require('../utils/databaseOptimizer');
// const { analyzeQueryPerformance } = require('../utils/optimizedQueries');

import { 
  initializeDatabaseOptimization, 
  performanceMonitor, 
  cacheManager,
  DB_OPTIMIZATION_CONFIG 
} from "../utils/databaseOptimizer.js";
import { analyzeQueryPerformance } from "../utils/optimizedQueries.js";

// Database optimization middleware
const databaseOptimizationMiddleware = {
  // Initialize database optimization
  initialize: async (req, res, next) => {
    try {
      if (!req.app.locals.dbOptimized) {
        await initializeDatabaseOptimization({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME
        });
        
        req.app.locals.dbOptimized = true;
        console.log('✅ Database optimization initialized');
      }
      
      next();
    } catch (error) {
      console.error('❌ Database optimization initialization failed:', error);
      res.status(500).json({
        success: false,
        message: 'Database optimization failed',
        error: error.message
      });
    }
  },
  
  // Query performance monitoring
  queryMonitor: (req, res, next) => {
    if (!DB_OPTIMIZATION_CONFIG.performanceMonitoring.monitorQueryPerformance) {
      return next();
    }
    
    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to monitor query performance
    res.json = function(data) {
      const startTime = req.queryStartTime || Date.now();
      const executionTime = Date.now() - startTime;
      
      // Log slow queries
      if (executionTime > DB_OPTIMIZATION_CONFIG.queryOptimization.slowQueryThreshold) {
        console.warn(`⚠️ Slow request detected: ${req.method} ${req.path} - ${executionTime}ms`);
        
        // Log to audit
        req.logSecurityEvent?.('SUSPICIOUS_ACTIVITY', {
          action: 'slow_request',
          method: req.method,
          path: req.path,
          executionTime,
          threshold: DB_OPTIMIZATION_CONFIG.queryOptimization.slowQueryThreshold
        }, { severity: 'medium' });
      }
      
      // Add performance headers
      res.setHeader('X-Response-Time', `${executionTime}ms`);
      res.setHeader('X-Query-Cache-Hit', req.cacheHit ? 'true' : 'false');
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    // Record start time
    req.queryStartTime = Date.now();
    
    next();
  },
  
  // Cache invalidation middleware
  cacheInvalidation: (req, res, next) => {
    // Store original res.json method
    const originalJson = res.json;
    
    // Override res.json to handle cache invalidation
    res.json = function(data) {
      // Invalidate cache based on request type
      if (req.method !== 'GET' && res.statusCode < 400) {
        const path = req.path;
        
        // Invalidate user cache
        if (path.includes('/users') || path.includes('/auth')) {
          cacheManager.invalidateByTag('users');
        }
        
        // Invalidate election cache
        if (path.includes('/elections')) {
          cacheManager.invalidateByTag('elections');
        }
        
        // Invalidate candidate cache
        if (path.includes('/candidates')) {
          cacheManager.invalidateByTag('candidates');
        }
        
        // Invalidate vote cache
        if (path.includes('/votes')) {
          cacheManager.invalidateByTag('votes');
        }
        
        // Invalidate analytics cache
        if (path.includes('/analytics')) {
          cacheManager.invalidateByTag('analytics');
        }
        
        console.log(`🗑️ Cache invalidated for ${path}`);
      }
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  },
  
  // Database health check
  healthCheck: async (req, res, next) => {
    try {
      const stats = await performanceMonitor.getConnectionPoolStats();
      
      if (!stats) {
        return res.status(503).json({
          success: false,
          message: 'Database connection unavailable',
          code: 'DB_UNAVAILABLE'
        });
      }
      
      // Check connection pool health
      const poolUtilization = (stats.totalConnections - stats.freeConnections) / stats.connectionLimit;
      
      if (poolUtilization > 0.8) {
        console.warn('⚠️ High database connection pool utilization:', poolUtilization);
      }
      
      // Add database health headers
      res.setHeader('X-DB-Connections-Total', stats.totalConnections);
      res.setHeader('X-DB-Connections-Free', stats.freeConnections);
      res.setHeader('X-DB-Connections-Utilization', `${(poolUtilization * 100).toFixed(1)}%`);
      
      next();
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      res.status(503).json({
        success: false,
        message: 'Database health check failed',
        code: 'DB_HEALTH_CHECK_FAILED'
      });
    }
  },
  
  // Query optimization analysis
  queryAnalyzer: (req, res, next) => {
    if (!DB_OPTIMIZATION_CONFIG.queryOptimization.enableQueryAnalysis) {
      return next();
    }
    
    // Only analyze for admin users or specific endpoints
    if (req.user?.role !== 'admin' && !req.path.includes('/analytics')) {
      return next();
    }
    
    // Store original executeQuery if available
    const originalExecuteQuery = req.app.locals.executeQuery;
    
    if (originalExecuteQuery) {
      req.app.locals.executeQuery = async (query, params, options) => {
        const analysis = await analyzeQueryPerformance(query, params);
        
        // Log performance issues
        if (analysis.performanceScore < 70) {
          console.warn('⚠️ Query performance issues detected:', {
            query: query.substring(0, 100),
            score: analysis.performanceScore,
            issues: analysis.issues
          });
          
          // Log to audit
          req.logSecurityEvent?.('SUSPICIOUS_ACTIVITY', {
            action: 'query_performance_issue',
            query: query.substring(0, 500),
            performanceScore: analysis.performanceScore,
            issues: analysis.issues,
            suggestions: analysis.suggestions
          }, { severity: 'low' });
        }
        
        return originalExecuteQuery(query, params, options);
      };
    }
    
    next();
  }
};

// Performance monitoring middleware
const performanceMonitoringMiddleware = {
  // Request timing
  requestTiming: (req, res, next) => {
    req.startTime = Date.now();
    
    // Store original res.end method
    const originalEnd = res.end;
    
    // Override res.end to calculate total request time
    res.end = function(...args) {
      const totalTime = Date.now() - req.startTime;
      
      // Add timing headers
      res.setHeader('X-Total-Time', `${totalTime}ms`);
      res.setHeader('X-Timestamp', new Date().toISOString());
      
      // Log slow requests
      if (totalTime > 5000) { // 5 seconds
        console.warn(`⚠️ Slow request: ${req.method} ${req.path} - ${totalTime}ms`);
      }
      
      // Call original end method
      return originalEnd.apply(this, args);
    };
    
    next();
  },
  
  // Memory usage monitoring
  memoryMonitoring: (req, res, next) => {
    const memUsage = process.memoryUsage();
    
    // Add memory headers
    res.setHeader('X-Memory-Used', `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    res.setHeader('X-Memory-Total', `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
    res.setHeader('X-Memory-External', `${Math.round(memUsage.external / 1024 / 1024)}MB`);
    
    // Check for high memory usage
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    if (heapUsedMB > 500) { // 500MB
      console.warn('⚠️ High memory usage detected:', heapUsedMB, 'MB');
    }
    
    next();
  },
  
  // CPU usage monitoring
  cpuMonitoring: (req, res, next) => {
    const cpuUsage = process.cpuUsage();
    
    // Add CPU headers
    res.setHeader('X-CPU-User', cpuUsage.user);
    res.setHeader('X-CPU-System', cpuUsage.system);
    
    next();
  }
};

// Cache management middleware
const cacheManagementMiddleware = {
  // Cache statistics
  cacheStats: (req, res, next) => {
    if (req.path === '/api/cache-stats') {
      const stats = cacheManager.getStats();
      
      return res.json({
        success: true,
        data: {
          cache: stats,
          config: DB_OPTIMIZATION_CONFIG.caching,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    next();
  },
  
  // Cache control
  cacheControl: (req, res, next) => {
    // Set cache control headers based on request type
    if (req.method === 'GET') {
      const path = req.path;
      
      if (path.includes('/elections') || path.includes('/candidates')) {
        // Cache for 10 minutes
        res.setHeader('Cache-Control', 'public, max-age=600');
      } else if (path.includes('/analytics')) {
        // Cache for 30 minutes
        res.setHeader('Cache-Control', 'public, max-age=1800');
      } else {
        // Default cache for 5 minutes
        res.setHeader('Cache-Control', 'public, max-age=300');
      }
    } else {
      // No caching for non-GET requests
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    next();
  },
  
  // Cache warming
  cacheWarmer: async (req, res, next) => {
    // Only warm cache for specific requests
    if (req.path === '/api/warm-cache' && req.method === 'POST') {
      try {
        // Warm common queries
        const { queryExecutor } = require('../utils/optimizedQueries');
        
        // Warm active elections
        await queryExecutor.executeElectionQuery('getActiveElections', [], { cache: true });
        
        // Warm user statistics
        await queryExecutor.executeAnalyticsQuery('getUserRegistrationTrends', [30], { cache: true });
        
        // Warm voting statistics
        await queryExecutor.executeAnalyticsQuery('getVotingTrends', [7], { cache: true });
        
        console.log('🔥 Cache warming completed');
        
        return res.json({
          success: true,
          message: 'Cache warming completed',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Cache warming failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Cache warming failed',
          error: error.message
        });
      }
    }
    
    next();
  }
};

// Database optimization routes
const createOptimizationRoutes = (app) => {
  // Database statistics
  app.get('/api/db-stats', async (req, res) => {
    try {
      const [poolStats, tableStats, slowQueries] = await Promise.all([
        performanceMonitor.getConnectionPoolStats(),
        performanceMonitor.getTableStats(),
        performanceMonitor.getSlowQueries(20)
      ]);
      
      res.json({
        success: true,
        data: {
          connectionPool: poolStats,
          tables: tableStats,
          slowQueries,
          cache: cacheManager.getStats(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get database statistics',
        error: error.message
      });
    }
  });
  
  // Optimize database
  app.post('/api/optimize-db', async (req, res) => {
    try {
      const { createIndexes, optimizeTables } = req.body;
      
      const results = {};
      
      if (createIndexes !== false) {
        const { createIndexes: createIndexesFn } = require('../utils/databaseOptimizer');
        await createIndexesFn();
        results.indexes = 'Created';
      }
      
      if (optimizeTables !== false) {
        const { optimizeTables: optimizeTablesFn } = require('../utils/databaseOptimizer');
        await optimizeTablesFn();
        results.optimization = 'Completed';
      }
      
      res.json({
        success: true,
        message: 'Database optimization completed',
        results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
      res.status(500).json({
        success: false,
        message: 'Database optimization failed',
        error: error.message
      });
    }
  });
  
  // Clear cache
  app.post('/api/clear-cache', (req, res) => {
    try {
      const { tags } = req.body;
      
      if (tags && Array.isArray(tags)) {
        tags.forEach(tag => cacheManager.invalidateByTag(tag));
      } else {
        cacheManager.clear();
      }
      
      res.json({
        success: true,
        message: 'Cache cleared',
        tags: tags || 'all',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Cache clearing failed:', error);
      res.status(500).json({
        success: false,
        message: 'Cache clearing failed',
        error: error.message
      });
    }
  });
  
  // Query analysis
  app.post('/api/analyze-query', async (req, res) => {
    try {
      const { query, params } = req.body;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Query is required',
          code: 'MISSING_QUERY'
        });
      }
      
      const analysis = await analyzeQueryPerformance(query, params || []);
      
      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Query analysis failed:', error);
      res.status(500).json({
        success: false,
        message: 'Query analysis failed',
        error: error.message
      });
    }
  });
};

module.exports = {
  databaseOptimizationMiddleware,
  performanceMonitoringMiddleware,
  cacheManagementMiddleware,
  createOptimizationRoutes
};
