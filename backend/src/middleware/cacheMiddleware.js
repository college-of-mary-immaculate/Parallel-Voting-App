import { cacheManager, CACHING_CONFIG } from '../utils/cacheManager.js';
import { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } from '../utils/auditLogger.js';

// Cache Middleware Factory
const createCacheMiddleware = (options = {}) => {
  const config = {
    // Cache key generator
    keyGenerator: (req) => {
      const prefix = options.keyPrefix || 'cache';
      const method = req.method;
      const url = req.originalUrl || req.url;
      const params = JSON.stringify(req.query);
      const userId = req.user?.userId || 'anonymous';
      
      return `${prefix}:${method}:${url}:${params}:${userId}`;
    },
    
    // TTL (time to live) in seconds
    ttl: options.ttl || CACHING_CONFIG.ttl.default,
    
    // Cache name
    cacheName: options.cacheName || 'default',
    
    // Condition to cache (function)
    shouldCache: options.shouldCache || ((req, res, data) => {
      // Don't cache error responses
      if (res.statusCode >= 400) return false;
      
      // Don't cache if no-cache header is present
      if (req.headers['cache-control'] === 'no-cache') return false;
      
      // Only cache GET requests by default
      if (options.cacheAllMethods) return true;
      return req.method === 'GET';
    }),
    
    // Cache invalidation conditions
    invalidateOn: options.invalidateOn || [],
    
    // Compression
    compress: options.compress !== false && CACHING_CONFIG.compression.enabled,
    
    // Tags for cache invalidation
    tags: options.tags || [],
    
    // Skip cache for specific conditions
    skipCache: options.skipCache || ((req) => {
      // Skip cache for authenticated users with specific roles
      if (req.user && ['admin', 'moderator'].includes(req.user.role)) {
        return true;
      }
      return false;
    })
  };
  
  return async (req, res, next) => {
    try {
      // Check if we should skip caching
      if (config.skipCache(req)) {
        return next();
      }
      
      // Generate cache key
      const cacheKey = config.keyGenerator(req);
      
      // Try to get from cache
      const cachedData = await cacheManager.get(cacheKey, config.cacheName);
      
      if (cachedData !== null) {
        // Add cache headers
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        res.setHeader('X-Cache-TTL', await getCacheTTL(cacheKey, config.cacheName));
        
        // Decompress if needed
        let responseData = cachedData;
        if (config.compress && cachedData.compressed) {
          responseData = decompressData(cachedData.data);
        } else if (config.compress && cachedData.data) {
          responseData = cachedData.data;
        }
        
        return res.json(responseData);
      }
      
      // Add cache headers for miss
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);
      
      // Store original res.json method
      const originalJson = res.json;
      
      // Override res.json to cache the response
      res.json = async (data) => {
        try {
          // Check if we should cache this response
          if (config.shouldCache(req, res, data)) {
            let dataToCache = data;
            
            // Compress data if enabled
            if (config.compress && shouldCompress(data)) {
              const compressedData = compressData(data);
              dataToCache = {
                data: data,
                compressed: true,
                originalSize: Buffer.byteLength(JSON.stringify(data), 'utf8'),
                compressedSize: compressedData.length,
                algorithm: CACHING_CONFIG.compression.algorithm
              };
            }
            
            // Store in cache
            await cacheManager.set(cacheKey, dataToCache, config.ttl, config.cacheName);
            
            // Add cache tags if specified
            if (config.tags.length > 0) {
              await addCacheTags(cacheKey, config.tags, config.cacheName);
            }
            
            // Log cache set
            logSecurityEvent(
              AUDIT_EVENTS.SYSTEM_CONFIG,
              req.user?.userId || null,
              {
                action: 'cache_set',
                cacheKey,
                cacheName: config.cacheName,
                ttl: config.ttl,
                tags: config.tags,
                endpoint: req.path,
                method: req.method
              },
              {
                ip: req.ip,
                headers: req.headers,
                session: req.session,
                id: req.id
              },
              { success: true, severity: 'low' }
            );
          }
          
          // Call original json method
          return originalJson.call(res, data);
        } catch (error) {
          console.error('❌ Cache middleware error:', error);
          return originalJson.call(res, data);
        }
      };
      
      next();
    } catch (error) {
      console.error('❌ Cache middleware error:', error);
      next();
    }
  };
};

// Cache Invalidation Middleware
const createCacheInvalidationMiddleware = (options = {}) => {
  const config = {
    // Cache invalidation patterns
    patterns: options.patterns || [],
    
    // Cache tags to invalidate
    tags: options.tags || [],
    
    // Cache name
    cacheName: options.cacheName || 'default',
    
    // Condition to invalidate
    shouldInvalidate: options.shouldInvalidate || ((req, res) => {
      // Invalidate on successful write operations
      return res.statusCode < 400 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
    })
  };
  
  return async (req, res, next) => {
    try {
      // Store original res.json method
      const originalJson = res.json;
      
      // Override res.json to handle invalidation
      res.json = async (data) => {
        try {
          // Call original json method first
          const result = originalJson.call(res, data);
          
          // Check if we should invalidate cache
          if (config.shouldInvalidate(req, res, data)) {
            await invalidateCache(req, config);
          }
          
          return result;
        } catch (error) {
          console.error('❌ Cache invalidation middleware error:', error);
          return originalJson.call(res, data);
        }
      };
      
      next();
    } catch (error) {
      console.error('❌ Cache invalidation middleware error:', error);
      next();
    }
  };
};

// Cache Tagging Middleware
const createCacheTaggingMiddleware = (options = {}) => {
  const config = {
    // Tag generator function
    tagGenerator: options.tagGenerator || ((req) => {
      const tags = [];
      
      // Add method-based tags
      tags.push(`method:${req.method.toLowerCase()}`);
      
      // Add path-based tags
      const pathParts = req.path.split('/').filter(part => part);
      if (pathParts.length > 0) {
        tags.push(`resource:${pathParts[0]}`);
      }
      
      // Add user-based tags
      if (req.user) {
        tags.push(`user:${req.user.userId}`);
        tags.push(`role:${req.user.role}`);
      }
      
      // Add custom tags
      if (options.tags) {
        tags.push(...options.tags);
      }
      
      return tags;
    }),
    
    // Cache name
    cacheName: options.cacheName || 'default'
  };
  
  return async (req, res, next) => {
    try {
      // Generate tags for this request
      const tags = config.tagGenerator(req);
      
      // Store tags in request for later use
      req.cacheTags = tags;
      
      // Add cache tag header
      if (tags.length > 0) {
        res.setHeader('X-Cache-Tags', tags.join(','));
      }
      
      next();
    } catch (error) {
      console.error('❌ Cache tagging middleware error:', error);
      next();
    }
  };
};

// Cache Statistics Middleware
const createCacheStatsMiddleware = (options = {}) => {
  const config = {
    // Include detailed stats
    detailed: options.detailed || false,
    
    // Include performance metrics
    performance: options.performance || false,
    
    // Cache name
    cacheName: options.cacheName || 'all'
  };
  
  return async (req, res, next) => {
    try {
      // Get cache statistics
      const stats = await cacheManager.getStats();
      
      // Add cache stats headers
      res.setHeader('X-Cache-Stats', JSON.stringify({
        hits: stats.manager.hits,
        misses: stats.manager.misses,
        hitRate: stats.manager.hitRate
      }));
      
      // Add detailed stats if requested
      if (config.detailed) {
        res.setHeader('X-Cache-Detailed', JSON.stringify(stats));
      }
      
      // Add performance metrics if requested
      if (config.performance) {
        const startTime = Date.now();
        
        // Override res.json to measure response time
        const originalJson = res.json;
        res.json = (data) => {
          const responseTime = Date.now() - startTime;
          res.setHeader('X-Response-Time', `${responseTime}ms`);
          return originalJson.call(res, data);
        };
      }
      
      next();
    } catch (error) {
      console.error('❌ Cache stats middleware error:', error);
      next();
    }
  };
};

// Cache Warmer Middleware
const createCacheWarmerMiddleware = (options = {}) => {
  const config = {
    // Warmup routes
    routes: options.routes || [],
    
    // Warmup interval (in milliseconds)
    interval: options.interval || 300000, // 5 minutes
    
    // Cache name
    cacheName: options.cacheName || 'default',
    
    // Warmup on startup
    onStartup: options.onStartup !== false
  };
  
  return async (req, res, next) => {
    try {
      // Store warmup config in app locals
      if (!req.app.locals.cacheWarmer) {
        req.app.locals.cacheWarmer = {
          config,
          isRunning: false,
          lastRun: null
        };
        
        // Start warmup if enabled
        if (config.onStartup) {
          startCacheWarmup(req.app, config);
        }
      }
      
      next();
    } catch (error) {
      console.error('❌ Cache warmer middleware error:', error);
      next();
    }
  };
};

// Cache Health Check Middleware
const createCacheHealthMiddleware = (options = {}) => {
  const config = {
    // Health check endpoint
    endpoint: options.endpoint || '/health/cache',
    
    // Cache name
    cacheName: options.cacheName || 'default',
    
    // Include detailed health info
    detailed: options.detailed || false
  };
  
  return async (req, res, next) => {
    try {
      if (req.path === config.endpoint) {
        const health = await getCacheHealth(config.cacheName, config.detailed);
        
        const statusCode = health.status === 'healthy' ? 200 : 503;
        
        return res.status(statusCode).json({
          status: health.status,
          cache: health.cache,
          timestamp: new Date().toISOString(),
          ...(config.detailed && { details: health.details })
        });
      }
      
      next();
    } catch (error) {
      console.error('❌ Cache health middleware error:', error);
      next();
    }
  };
};

// Helper Functions

// Get cache TTL
async function getCacheTTL(key, cacheName) {
  try {
    const cache = cacheManager.getCache(cacheName);
    
    if (cache.ttl) {
      return await cache.ttl(key);
    }
    
    return -1;
  } catch (error) {
    console.error('❌ Error getting cache TTL:', error);
    return -1;
  }
}

// Compress data
function compressData(data) {
  try {
    const zlib = require('zlib');
    const jsonString = JSON.stringify(data);
    return zlib.gzipSync(jsonString, { level: CACHING_CONFIG.compression.level });
  } catch (error) {
    console.error('❌ Error compressing data:', error);
    return data;
  }
}

// Decompress data
function decompressData(compressedData) {
  try {
    const zlib = require('zlib');
    return JSON.parse(zlib.gunzipSync(compressedData).toString());
  } catch (error) {
    console.error('❌ Error decompressing data:', error);
    return compressedData;
  }
}

// Check if data should be compressed
function shouldCompress(data) {
  try {
    const jsonString = JSON.stringify(data);
    const size = Buffer.byteLength(jsonString, 'utf8');
    return size >= CACHING_CONFIG.compression.threshold;
  } catch (error) {
    return false;
  }
}

// Add cache tags
async function addCacheTags(key, tags, cacheName) {
  try {
    // Store tags in a separate cache entry
    const tagsKey = `tags:${key}`;
    await cacheManager.set(tagsKey, tags, CACHING_CONFIG.ttl.default * 2, cacheName);
    
    // Add key to tag index
    for (const tag of tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = await cacheManager.get(tagKey, cacheName) || [];
      
      if (!taggedKeys.includes(key)) {
        taggedKeys.push(key);
        await cacheManager.set(tagKey, taggedKeys, CACHING_CONFIG.ttl.default * 2, cacheName);
      }
    }
  } catch (error) {
    console.error('❌ Error adding cache tags:', error);
  }
}

// Invalidate cache
async function invalidateCache(req, config) {
  try {
    // Invalidate by patterns
    for (const pattern of config.patterns) {
      await cacheManager.clear(pattern, config.cacheName);
    }
    
    // Invalidate by tags
    for (const tag of config.tags) {
      const tagKey = `tag:${tag}`;
      const taggedKeys = await cacheManager.get(tagKey, config.cacheName) || [];
      
      for (const key of taggedKeys) {
        await cacheManager.delete(key, config.cacheName);
      }
      
      // Clear tag index
      await cacheManager.delete(tagKey, config.cacheName);
    }
    
    // Log cache invalidation
    logSecurityEvent(
      AUDIT_EVENTS.SYSTEM_CONFIG,
      req.user?.userId || null,
      {
        action: 'cache_invalidation',
        patterns: config.patterns,
        tags: config.tags,
        cacheName: config.cacheName,
        endpoint: req.path,
        method: req.method
      },
      {
        ip: req.ip,
        headers: req.headers,
        session: req.session,
        id: req.id
      },
      { success: true, severity: 'low' }
    );
  } catch (error) {
    console.error('❌ Error invalidating cache:', error);
  }
}

// Start cache warmup
async function startCacheWarmup(app, config) {
  try {
    console.log('🔥 Starting cache warmup...');
    
    const warmup = async () => {
      try {
        app.locals.cacheWarmer.isRunning = true;
        app.locals.cacheWarmer.lastRun = new Date();
        
        for (const route of config.routes) {
          await warmupRoute(app, route);
        }
        
        app.locals.cacheWarmer.isRunning = false;
        console.log('✅ Cache warmup completed');
      } catch (error) {
        console.error('❌ Cache warmup error:', error);
        app.locals.cacheWarmer.isRunning = false;
      }
    };
    
    // Run warmup immediately
    await warmup();
    
    // Schedule periodic warmup
    setInterval(warmup, config.interval);
  } catch (error) {
    console.error('❌ Error starting cache warmup:', error);
  }
}

// Warm up specific route
async function warmupRoute(app, route) {
  try {
    console.log(`🔥 Warming up route: ${route.path}`);
    
    // Create mock request
    const mockReq = {
      method: route.method || 'GET',
      path: route.path,
      query: route.query || {},
      headers: route.headers || {},
      user: route.user || null
    };
    
    // Create mock response
    const mockRes = {
      statusCode: 200,
      headers: {},
      setHeader: function(name, value) {
        this.headers[name] = value;
      },
      json: function(data) {
        this.data = data;
      }
    };
    
    // Execute route handler
    if (route.handler) {
      await route.handler(mockReq, mockRes);
    }
    
    console.log(`✅ Route warmed up: ${route.path}`);
  } catch (error) {
    console.error(`❌ Error warming up route ${route.path}:`, error);
  }
}

// Get cache health
async function getCacheHealth(cacheName, detailed = false) {
  try {
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
        hitRate: stats.stats?.hitRate || 'N/A'
      }
    };
    
    if (detailed) {
      health.details = stats;
    }
    
    return health;
  } catch (error) {
    return {
      status: 'unhealthy',
      cache: { name: cacheName, error: error.message },
      issues: ['Failed to get cache statistics']
    };
  }
}

// Predefined middleware configurations

// Cache for static data (elections, candidates, etc.)
const staticDataCache = createCacheMiddleware({
  keyPrefix: 'static',
  ttl: CACHING_CONFIG.ttl.elections.list,
  tags: ['static', 'elections'],
  shouldCache: (req, res, data) => {
    return req.method === 'GET' && res.statusCode === 200;
  }
});

// Cache for user-specific data
const userDataCache = createCacheMiddleware({
  keyPrefix: 'user',
  ttl: CACHING_CONFIG.ttl.auth.userProfiles,
  tags: ['user', 'profile'],
  shouldCache: (req, res, data) => {
    return req.method === 'GET' && req.user && res.statusCode === 200;
  }
});

// Cache for analytics data
const analyticsCache = createCacheMiddleware({
  keyPrefix: 'analytics',
  ttl: CACHING_CONFIG.ttl.analytics.reports,
  tags: ['analytics', 'reports'],
  shouldCache: (req, res, data) => {
    return req.method === 'GET' && res.statusCode === 200;
  }
});

// Cache invalidation for write operations
const writeOperationInvalidation = createCacheInvalidationMiddleware({
  patterns: ['*'],
  tags: ['static', 'user', 'analytics']
});

// Cache statistics
const cacheStats = createCacheStatsMiddleware({
  detailed: false,
  performance: true
});

// Cache health check
const cacheHealth = createCacheHealthMiddleware({
  endpoint: '/health/cache',
  detailed: false
});

export {
  createCacheMiddleware,
  createCacheInvalidationMiddleware,
  createCacheTaggingMiddleware,
  createCacheStatsMiddleware,
  createCacheWarmerMiddleware,
  createCacheHealthMiddleware,
  staticDataCache,
  userDataCache,
  analyticsCache,
  writeOperationInvalidation,
  cacheStats,
  cacheHealth
};
