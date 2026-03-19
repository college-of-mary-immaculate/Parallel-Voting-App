const express = require('express');
const { cacheManager, CACHING_CONFIG } = require('../utils/cacheManager');
const { authenticateToken, authorizeRole } = require('../middleware/jwtSecurityMiddleware');
const { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } = require('../utils/auditLogger');

const router = express.Router();

// GET /api/cache/stats - Get cache statistics (admin only)
router.get('/stats', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { cacheName = 'all' } = req.query;
    
    let stats;
    if (cacheName === 'all') {
      stats = await cacheManager.getStats();
    } else {
      const cache = cacheManager.getCache(cacheName);
      stats = await cache.getStats();
    }
    
    return res.json({
      success: true,
      data: {
        stats,
        cacheName,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cache stats error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get cache statistics',
        code: 'CACHE_STATS_ERROR',
        details: error.message
      }
    });
  }
});

// GET /api/cache/health - Get cache health status
router.get('/health', async (req, res) => {
  try {
    const { cacheName = 'default', detailed = false } = req.query;
    
    const cache = cacheManager.getCache(cacheName);
    const stats = await cache.getStats();
    
    let status = 'healthy';
    const issues = [];
    
    // Check Redis connection
    if (cacheName === 'default' || cacheName === 'redis') {
      if (stats.connected === false) {
        status = 'unhealthy';
        issues.push('Redis not connected');
      }
    }
    
    // Check memory usage
    if (stats.memory) {
      const memoryUsage = parseFloat(stats.memory.memoryUsage);
      if (memoryUsage > 90) {
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
        issues.push(`High memory usage: ${memoryUsage}%`);
      }
    }
    
    // Check hit rate
    if (stats.stats && stats.stats.hitRate) {
      const hitRate = parseFloat(stats.stats.hitRate);
      if (hitRate < 50) {
        status = status === 'healthy' ? 'degraded' : 'unhealthy';
        issues.push(`Low hit rate: ${hitRate}%`);
      }
    }
    
    const health = {
      status,
      cache: {
        name: cacheName,
        connected: stats.connected !== false,
        memoryUsage: stats.memory?.memoryUsage || 'N/A',
        hitRate: stats.stats?.hitRate || 'N/A',
        size: stats.size || stats.caches?.default?.size || 'N/A'
      },
      issues,
      timestamp: new Date().toISOString()
    };
    
    if (detailed === 'true') {
      health.details = stats;
    }
    
    const statusCode = status === 'healthy' ? 200 : status === 'degraded' ? 200 : 503;
    
    return res.status(statusCode).json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('❌ Cache health error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get cache health',
        code: 'CACHE_HEALTH_ERROR',
        details: error.message
      }
    });
  }
});

// POST /api/cache/clear - Clear cache (admin only)
router.post('/clear', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { pattern = '*', cacheName = 'default', tags = [] } = req.body;
    
    let clearedItems = 0;
    
    // Clear by pattern
    if (pattern) {
      const cache = cacheManager.getCache(cacheName);
      clearedItems = await cache.clear(pattern);
    }
    
    // Clear by tags
    if (tags.length > 0) {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const taggedKeys = await cacheManager.get(tagKey, cacheName) || [];
        
        for (const key of taggedKeys) {
          await cacheManager.delete(key, cacheName);
          clearedItems++;
        }
        
        // Clear tag index
        await cacheManager.delete(tagKey, cacheName);
      }
    }
    
    // Log cache clearing
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user.userId,
      {
        action: 'cache_clear',
        pattern,
        cacheName,
        tags,
        clearedItems
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'medium' }
    );
    
    return res.json({
      success: true,
      data: {
        clearedItems,
        pattern,
        cacheName,
        tags,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cache clear error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to clear cache',
        code: 'CACHE_CLEAR_ERROR',
        details: error.message
      }
    });
  }
});

// GET /api/cache/keys - Get cache keys (admin only)
router.get('/keys', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { pattern = '*', cacheName = 'default', limit = 100 } = req.query;
    
    const cache = cacheManager.getCache(cacheName);
    let keys;
    
    if (cache.keys) {
      // Memory cache
      keys = cache.keys(pattern);
    } else {
      // Redis cache
      keys = await cache.keys(pattern);
    }
    
    // Limit results
    const limitedKeys = keys.slice(0, parseInt(limit));
    
    return res.json({
      success: true,
      data: {
        keys: limitedKeys,
        total: keys.length,
        pattern,
        cacheName,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('❌ Cache keys error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get cache keys',
        code: 'CACHE_KEYS_ERROR',
        details: error.message
      }
    });
  }
});

// GET /api/cache/key/:key - Get specific cache key (admin only)
router.get('/key/:key', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { key } = req.params;
    const { cacheName = 'default' } = req.query;
    
    const cache = cacheManager.getCache(cacheName);
    const value = await cache.get(key);
    const exists = await cache.exists(key);
    
    let ttl = -1;
    if (cache.ttl) {
      ttl = await cache.ttl(key);
    }
    
    return res.json({
      success: true,
      data: {
        key,
        value,
        exists,
        ttl,
        cacheName,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cache key error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get cache key',
        code: 'CACHE_KEY_ERROR',
        details: error.message
      }
    });
  }
});

// DELETE /api/cache/key/:key - Delete specific cache key (admin only)
router.delete('/key/:key', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { key } = req.params;
    const { cacheName = 'default' } = req.query;
    
    const result = await cacheManager.delete(key, cacheName);
    
    // Log cache key deletion
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user.userId,
      {
        action: 'cache_key_delete',
        key,
        cacheName,
        deleted: result
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'medium' }
    );
    
    return res.json({
      success: true,
      data: {
        key,
        deleted: result,
        cacheName,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cache key delete error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete cache key',
        code: 'CACHE_KEY_DELETE_ERROR',
        details: error.message
      }
    });
  }
});

// POST /api/cache/set - Set cache key (admin only)
router.post('/set', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { key, value, ttl = CACHING_CONFIG.ttl.default, cacheName = 'default' } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Key and value are required',
          code: 'MISSING_PARAMETERS'
        }
      });
    }
    
    const result = await cacheManager.set(key, value, ttl, cacheName);
    
    // Log cache key set
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user.userId,
      {
        action: 'cache_key_set',
        key,
        ttl,
        cacheName,
        success: result
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'medium' }
    );
    
    return res.json({
      success: true,
      data: {
        key,
        ttl,
        cacheName,
        set: result,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cache set error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to set cache key',
        code: 'CACHE_SET_ERROR',
        details: error.message
      }
    });
  }
});

// POST /api/cache/warmup - Trigger cache warmup (admin only)
router.post('/warmup', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { dataSets = CACHING_CONFIG.warming.dataSets } = req.body;
    
    const results = [];
    
    for (const dataSet of dataSets) {
      try {
        console.log(`🔥 Warming up data set: ${dataSet}`);
        
        switch (dataSet) {
          case 'activeElections':
            await warmUpActiveElections();
            results.push({ dataSet, status: 'success' });
            break;
          case 'popularCandidates':
            await warmUpPopularCandidates();
            results.push({ dataSet, status: 'success' });
            break;
          case 'userStatistics':
            await warmUpUserStatistics();
            results.push({ dataSet, status: 'success' });
            break;
          case 'systemHealth':
            await warmUpSystemHealth();
            results.push({ dataSet, status: 'success' });
            break;
          default:
            results.push({ dataSet, status: 'skipped', reason: 'Unknown data set' });
        }
      } catch (error) {
        results.push({ dataSet, status: 'error', error: error.message });
      }
    }
    
    // Log cache warmup
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user.userId,
      {
        action: 'cache_warmup',
        dataSets,
        results
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'low' }
    );
    
    return res.json({
      success: true,
      data: {
        results,
        dataSets,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cache warmup error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to warm up cache',
        code: 'CACHE_WARMUP_ERROR',
        details: error.message
      }
    });
  }
});

// GET /api/cache/config - Get cache configuration (admin only)
router.get('/config', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const config = {
      redis: {
        host: CACHING_CONFIG.redis.host,
        port: CACHING_CONFIG.redis.port,
        connected: false // Don't expose password
      },
      memory: {
        maxSize: CACHING_CONFIG.memory.maxSize,
        memoryLimit: CACHING_CONFIG.memory.memoryLimit,
        defaultTTL: CACHING_CONFIG.memory.defaultTTL
      },
      strategies: CACHING_CONFIG.strategies,
      ttl: CACHING_CONFIG.ttl,
      warming: {
        enabled: CACHING_CONFIG.warming.enabled,
        dataSets: CACHING_CONFIG.warming.dataSets
      },
      monitoring: {
        enabled: CACHING_CONFIG.monitoring.enabled
      }
    };
    
    return res.json({
      success: true,
      data: {
        config,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cache config error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get cache configuration',
        code: 'CACHE_CONFIG_ERROR',
        details: error.message
      }
    });
  }
});

// POST /api/cache/invalidate - Invalidate cache by tags (admin only)
router.post('/invalidate', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { tags = [], cacheName = 'default' } = req.body;
    
    if (tags.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'At least one tag is required',
          code: 'MISSING_TAGS'
        }
      });
    }
    
    let invalidatedItems = 0;
    
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = await cacheManager.get(tagKey, cacheName) || [];
      
      for (const key of taggedKeys) {
        await cacheManager.delete(key, cacheName);
        invalidatedItems++;
      }
      
      // Clear tag index
      await cacheManager.delete(tagKey, cacheName);
    }
    
    // Log cache invalidation
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user.userId,
      {
        action: 'cache_invalidate_by_tags',
        tags,
        cacheName,
        invalidatedItems
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'medium' }
    );
    
    return res.json({
      success: true,
      data: {
        tags,
        invalidatedItems,
        cacheName,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cache invalidate error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to invalidate cache',
        code: 'CACHE_INVALIDATE_ERROR',
        details: error.message
      }
    });
  }
});

// GET /api/cache/performance - Get cache performance metrics (admin only)
router.get('/performance', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const stats = await cacheManager.getStats();
    
    const performance = {
      manager: {
        hits: stats.manager.hits,
        misses: stats.manager.misses,
        hitRate: stats.manager.hitRate,
        sets: stats.manager.sets,
        deletes: stats.manager.deletes,
        errors: stats.manager.errors
      }
    };
    
    // Add cache-specific performance metrics
    for (const [cacheName, cacheStats] of Object.entries(stats.caches)) {
      performance[cacheName] = {
        size: cacheStats.size,
        memoryUsage: cacheStats.memoryUsage || 'N/A',
        hitRate: cacheStats.stats?.hitRate || 'N/A',
        uptime: cacheStats.uptime?.seconds || 'N/A'
      };
    }
    
    return res.json({
      success: true,
      data: {
        performance,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Cache performance error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get cache performance',
        code: 'CACHE_PERFORMANCE_ERROR',
        details: error.message
      }
    });
  }
});

// Helper Functions for Cache Warming

// Warm up active elections
async function warmUpActiveElections() {
  try {
    // Mock implementation - would fetch from database
    const activeElections = [
      { id: 1, title: 'Election 1', status: 'active', candidates: 5 },
      { id: 2, title: 'Election 2', status: 'active', candidates: 3 }
    ];
    
    await cacheManager.set('active:elections', activeElections, CACHING_CONFIG.ttl.elections.list);
  } catch (error) {
    console.error('❌ Error warming up active elections:', error);
    throw error;
  }
}

// Warm up popular candidates
async function warmUpPopularCandidates() {
  try {
    // Mock implementation - would fetch from database
    const popularCandidates = [
      { id: 1, name: 'Candidate 1', votes: 100, electionId: 1 },
      { id: 2, name: 'Candidate 2', votes: 85, electionId: 1 }
    ];
    
    await cacheManager.set('popular:candidates', popularCandidates, CACHING_CONFIG.ttl.candidates.list);
  } catch (error) {
    console.error('❌ Error warming up popular candidates:', error);
    throw error;
  }
}

// Warm up user statistics
async function warmUpUserStatistics() {
  try {
    // Mock implementation - would fetch from database
    const userStats = {
      totalUsers: 1000,
      activeUsers: 850,
      newUsersToday: 25,
      newUsersThisWeek: 150
    };
    
    await cacheManager.set('user:statistics', userStats, CACHING_CONFIG.ttl.system.statistics);
  } catch (error) {
    console.error('❌ Error warming up user statistics:', error);
    throw error;
  }
}

// Warm up system health
async function warmUpSystemHealth() {
  try {
    // Mock implementation - would check system health
    const health = {
      status: 'healthy',
      database: 'connected',
      redis: 'connected',
      memory: '75%',
      cpu: '45%',
      uptime: '5 days'
    };
    
    await cacheManager.set('system:health', health, CACHING_CONFIG.ttl.system.health);
  } catch (error) {
    console.error('❌ Error warming up system health:', error);
    throw error;
  }
}

module.exports = router;
