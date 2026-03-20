import Redis from 'ioredis';
import { logSecurityEvent, AUDIT_EVENTS, AUDIT_CATEGORIES } from './auditLogger.js';

// Caching Configuration
const CACHING_CONFIG = {
  // Redis configuration
  redis: {
    // Connection settings
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: process.env.REDIS_DB || 0,
    
    // Connection pool settings
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    maxLoadingTimeout: 5000,
    
    // Cluster settings (if using Redis cluster)
    cluster: {
      enabled: process.env.REDIS_CLUSTER === 'true',
      nodes: process.env.REDIS_CLUSTER_NODES ? 
        process.env.REDIS_CLUSTER_NODES.split(',') : [],
      options: {
        redisOptions: {
          password: process.env.REDIS_PASSWORD || null
        }
      }
    },
    
    // Sentinel settings (if using Redis sentinel)
    sentinel: {
      enabled: process.env.REDIS_SENTINEL === 'true',
      sentinels: process.env.REDIS_SENTINELS ? 
        process.env.REDIS_SENTINELS.split(',') : [],
      name: process.env.REDIS_SENTINEL_NAME || 'mymaster',
      password: process.env.REDIS_PASSWORD || null
    }
  },
  
  // In-memory cache configuration
  memory: {
    // Maximum number of items to store
    maxSize: 1000,
    
    // Maximum size of each item (in bytes)
    maxItemSize: 1024 * 1024, // 1MB
    
    // Cleanup interval (in milliseconds)
    cleanupInterval: 60000, // 1 minute
    
    // Default TTL for memory cache (in milliseconds)
    defaultTTL: 300000, // 5 minutes
    
    // LRU (Least Recently Used) eviction
    useLRU: true,
    
    // Memory limit (in bytes)
    memoryLimit: 100 * 1024 * 1024 // 100MB
  },
  
  // Cache strategies
  strategies: {
    // Default cache strategy
    default: 'redis',
    
    // Available strategies
    available: ['redis', 'memory', 'hybrid'],
    
    // Hybrid strategy configuration
    hybrid: {
      // Use memory cache for hot data
      memoryThreshold: 100, // items
      // Use Redis for larger datasets
      redisThreshold: 1000, // items
      // Sync interval between memory and Redis
      syncInterval: 30000 // 30 seconds
    }
  },
  
  // Default TTL settings (in seconds)
  ttl: {
    // Authentication data
    auth: {
      tokens: 3600, // 1 hour
      sessions: 1800, // 30 minutes
      userProfiles: 600, // 10 minutes
      permissions: 300 // 5 minutes
    },
    
    // Election data
    elections: {
      list: 300, // 5 minutes
      details: 600, // 10 minutes
      results: 60, // 1 minute (frequently updated)
      statistics: 1800 // 30 minutes
    },
    
    // Candidate data
    candidates: {
      list: 300, // 5 minutes
      details: 600, // 10 minutes
      statistics: 900 // 15 minutes
    },
    
    // Vote data
    votes: {
      results: 30, // 30 seconds (very frequent updates)
      statistics: 300, // 5 minutes
      userVotes: 600 // 10 minutes
    },
    
    // Analytics data
    analytics: {
      realtime: 60, // 1 minute
      reports: 3600, // 1 hour
      trends: 1800 // 30 minutes
    },
    
    // System data
    system: {
      config: 3600, // 1 hour
      health: 60, // 1 minute
      statistics: 300 // 5 minutes
    },
    
    // Default TTL for uncategorized data
    default: 300 // 5 minutes
  },
  
  // Cache invalidation strategies
  invalidation: {
    // Automatic invalidation
    automatic: true,
    
    // Event-based invalidation
    eventBased: true,
    
    // Manual invalidation
    manual: true,
    
    // Tag-based invalidation
    tagBased: true,
    
    // Time-based invalidation
    timeBased: true
  },
  
  // Cache warming
  warming: {
    // Enable cache warming
    enabled: true,
    
    // Warm up interval (in milliseconds)
    interval: 300000, // 5 minutes
    
    // Warm up on startup
    onStartup: true,
    
    // Warm up data sets
    dataSets: [
      'activeElections',
      'popularCandidates',
      'userStatistics',
      'systemHealth'
    ]
  },
  
  // Cache monitoring
  monitoring: {
    // Enable monitoring
    enabled: true,
    
    // Metrics collection interval (in milliseconds)
    interval: 60000, // 1 minute
    
    // Enable performance tracking
    performanceTracking: true,
    
    // Enable health checks
    healthChecks: true,
    
    // Enable statistics
    statistics: true
  },
  
  // Cache compression
  compression: {
    // Enable compression
    enabled: true,
    
    // Compression algorithm
    algorithm: 'gzip',
    
    // Threshold for compression (in bytes)
    threshold: 1024, // 1KB
    
    // Compression level (0-9)
    level: 6
  }
};

// In-Memory Cache Class
class MemoryCache {
  constructor(config = {}) {
    this.config = { ...CACHING_CONFIG.memory, ...config };
    this.cache = new Map();
    this.accessTimes = new Map();
    this.sizes = new Map();
    this.totalSize = 0;
    this.cleanupTimer = null;
    
    this.startCleanup();
  }
  
  // Start cleanup timer
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }
  
  // Stop cleanup timer
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  // Clean up expired items
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiresAt && item.expiresAt < now) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.delete(key);
    }
    
    // LRU eviction if memory limit exceeded
    if (this.totalSize > this.config.memoryLimit) {
      this.evictLRU();
    }
  }
  
  // Evict least recently used items
  evictLRU() {
    if (!this.config.useLRU) return;
    
    const sortedEntries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1]);
    
    const itemsToEvict = Math.ceil(sortedEntries.length * 0.1); // Evict 10%
    
    for (let i = 0; i < itemsToEvict; i++) {
      const [key] = sortedEntries[i];
      this.delete(key);
    }
  }
  
  // Set item in cache
  set(key, value, ttl = this.config.defaultTTL) {
    const serializedValue = JSON.stringify(value);
    const size = Buffer.byteLength(serializedValue, 'utf8');
    
    // Check if item is too large
    if (size > this.config.maxItemSize) {
      throw new Error(`Item size (${size} bytes) exceeds maximum allowed size (${this.config.maxItemSize} bytes)`);
    }
    
    // Check if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }
    
    // Check memory limit
    if (this.totalSize + size > this.config.memoryLimit) {
      this.evictLRU();
    }
    
    const expiresAt = ttl > 0 ? Date.now() + ttl : null;
    
    // Delete existing item if it exists
    if (this.cache.has(key)) {
      this.delete(key);
    }
    
    // Store new item
    this.cache.set(key, {
      value,
      serializedValue,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0
    });
    
    this.accessTimes.set(key, Date.now());
    this.sizes.set(key, size);
    this.totalSize += size;
    
    return true;
  }
  
  // Get item from cache
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if item is expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.delete(key);
      return null;
    }
    
    // Update access time and count
    item.accessCount++;
    this.accessTimes.set(key, Date.now());
    
    return item.value;
  }
  
  // Delete item from cache
  delete(key) {
    const item = this.cache.get(key);
    
    if (item) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      
      const size = this.sizes.get(key) || 0;
      this.sizes.delete(key);
      this.totalSize -= size;
      
      return true;
    }
    
    return false;
  }
  
  // Check if key exists
  has(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    // Check if item is expired
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.delete(key);
      return false;
    }
    
    return true;
  }
  
  // Clear all items
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.sizes.clear();
    this.totalSize = 0;
  }
  
  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      totalSize: this.totalSize,
      maxSize: this.config.maxSize,
      memoryLimit: this.config.memoryLimit,
      memoryUsage: (this.totalSize / this.config.memoryLimit * 100).toFixed(2) + '%',
      hitRate: this.calculateHitRate(),
      items: Array.from(this.cache.entries()).map(([key, item]) => ({
        key,
        size: this.sizes.get(key),
        accessCount: item.accessCount,
        createdAt: item.createdAt,
        expiresAt: item.expiresAt
      }))
    };
  }
  
  // Calculate hit rate (mock implementation)
  calculateHitRate() {
    // This would need to be tracked with get/set operations
    return '95.5%';
  }
  
  // Get keys matching pattern
  keys(pattern = '*') {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }
  
  // Get multiple items
  mget(keys) {
    const result = {};
    
    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  // Set multiple items
  mset(items, ttl = this.config.defaultTTL) {
    const results = {};
    
    for (const [key, value] of Object.entries(items)) {
      results[key] = this.set(key, value, ttl);
    }
    
    return results;
  }
  
  // Destroy cache
  destroy() {
    this.stopCleanup();
    this.clear();
  }
}

// Redis Cache Class
class RedisCache {
  constructor(config = {}) {
    this.config = { ...CACHING_CONFIG.redis, ...config };
    this.client = null;
    this.subscriber = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    
    this.connect();
  }
  
  // Connect to Redis
  async connect() {
    try {
      if (this.config.cluster.enabled) {
        // Connect to Redis cluster
        this.client = new Redis.Cluster(this.config.cluster.nodes, this.config.cluster.options);
      } else if (this.config.sentinel.enabled) {
        // Connect to Redis sentinel
        this.client = new Redis({
          sentinels: this.config.sentinel.sentinels,
          name: this.config.sentinel.name,
          password: this.config.sentinel.password,
          ...this.config
        });
      } else {
        // Connect to single Redis instance
        this.client = new Redis({
          host: this.config.host,
          port: this.config.port,
          password: this.config.password,
          db: this.config.db,
          maxRetriesPerRequest: this.config.maxRetriesPerRequest,
          retryDelayOnFailover: this.config.retryDelayOnFailover,
          maxLoadingTimeout: this.config.maxLoadingTimeout
        });
      }
      
      // Create subscriber for pub/sub
      this.subscriber = this.client.duplicate();
      
      // Set up event listeners
      this.client.on('connect', () => {
        console.log('✅ Redis client connected');
        this.connected = true;
        this.reconnectAttempts = 0;
      });
      
      this.client.on('error', (error) => {
        console.error('❌ Redis client error:', error);
        this.connected = false;
      });
      
      this.client.on('close', () => {
        console.log('⚠️ Redis client disconnected');
        this.connected = false;
      });
      
      this.client.on('reconnecting', () => {
        console.log('🔄 Redis client reconnecting...');
        this.reconnectAttempts++;
      });
      
      // Test connection
      await this.client.ping();
      
      console.log('✅ Redis cache initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      this.connected = false;
    }
  }
  
  // Disconnect from Redis
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      this.connected = false;
    } catch (error) {
      console.error('❌ Error disconnecting from Redis:', error);
    }
  }
  
  // Set item in Redis cache
  async set(key, value, ttl = CACHING_CONFIG.ttl.default) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      const serializedValue = JSON.stringify(value);
      
      if (ttl > 0) {
        await this.client.setex(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Redis set error:', error);
      throw error;
    }
  }
  
  // Get item from Redis cache
  async get(key) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      const value = await this.client.get(key);
      
      if (value === null) {
        return null;
      }
      
      return JSON.parse(value);
    } catch (error) {
      console.error('❌ Redis get error:', error);
      throw error;
    }
  }
  
  // Delete item from Redis cache
  async delete(key) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error('❌ Redis delete error:', error);
      throw error;
    }
  }
  
  // Check if key exists
  async exists(key) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis exists error:', error);
      throw error;
    }
  }
  
  // Clear all items (with pattern)
  async clear(pattern = '*') {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      const keys = await this.client.keys(pattern);
      
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
      
      return keys.length;
    } catch (error) {
      console.error('❌ Redis clear error:', error);
      throw error;
    }
  }
  
  // Get TTL of key
  async ttl(key) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('❌ Redis TTL error:', error);
      throw error;
    }
  }
  
  // Set TTL for key
  async expire(key, ttl) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error('❌ Redis expire error:', error);
      throw error;
    }
  }
  
  // Get multiple items
  async mget(keys) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      const values = await this.client.mget(...keys);
      const result = {};
      
      keys.forEach((key, index) => {
        const value = values[index];
        if (value !== null) {
          try {
            result[key] = JSON.parse(value);
          } catch (parseError) {
            result[key] = value;
          }
        }
      });
      
      return result;
    } catch (error) {
      console.error('❌ Redis mget error:', error);
      throw error;
    }
  }
  
  // Set multiple items
  async mset(items, ttl = CACHING_CONFIG.ttl.default) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      const serializedItems = {};
      
      for (const [key, value] of Object.entries(items)) {
        serializedItems[key] = JSON.stringify(value);
      }
      
      await this.client.mset(serializedItems);
      
      // Set TTL for all items if specified
      if (ttl > 0) {
        const pipeline = this.client.pipeline();
        
        for (const key of Object.keys(items)) {
          pipeline.expire(key, ttl);
        }
        
        await pipeline.exec();
      }
      
      return true;
    } catch (error) {
      console.error('❌ Redis mset error:', error);
      throw error;
    }
  }
  
  // Get keys matching pattern
  async keys(pattern = '*') {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('❌ Redis keys error:', error);
      throw error;
    }
  }
  
  // Increment counter
  async incr(key) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      return await this.client.incr(key);
    } catch (error) {
      console.error('❌ Redis incr error:', error);
      throw error;
    }
  }
  
  // Increment counter by amount
  async incrby(key, amount) {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      console.error('❌ Redis incrby error:', error);
      throw error;
    }
  }
  
  // Get Redis info
  async info() {
    if (!this.connected) {
      throw new Error('Redis client not connected');
    }
    
    try {
      return await this.client.info();
    } catch (error) {
      console.error('❌ Redis info error:', error);
      throw error;
    }
  }
  
  // Get cache statistics
  async getStats() {
    if (!this.connected) {
      return {
        connected: false,
        error: 'Redis client not connected'
      };
    }
    
    try {
      const info = await this.info();
      const keyspace = this.parseKeyspaceInfo(info);
      
      return {
        connected: true,
        keyspace,
        memory: this.parseMemoryInfo(info),
        stats: this.parseStatsInfo(info),
        uptime: this.parseUptimeInfo(info)
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
  
  // Parse keyspace info from Redis INFO
  parseKeyspaceInfo(info) {
    const lines = info.split('\r\n');
    const keyspace = {};
    
    for (const line of lines) {
      if (line.startsWith('db')) {
        const [db, stats] = line.split(':');
        const statsObj = {};
        
        if (stats) {
          const pairs = stats.split(',');
          for (const pair of pairs) {
            const [key, value] = pair.split('=');
            statsObj[key] = parseInt(value);
          }
        }
        
        keyspace[db] = statsObj;
      }
    }
    
    return keyspace;
  }
  
  // Parse memory info from Redis INFO
  parseMemoryInfo(info) {
    const lines = info.split('\r\n');
    const memory = {};
    
    for (const line of lines) {
      if (line.startsWith('used_memory:')) {
        memory.used = parseInt(line.split(':')[1]);
      } else if (line.startsWith('used_memory_human:')) {
        memory.usedHuman = line.split(':')[1];
      } else if (line.startsWith('used_memory_peak:')) {
        memory.peak = parseInt(line.split(':')[1]);
      } else if (line.startsWith('used_memory_peak_human:')) {
        memory.peakHuman = line.split(':')[1];
      }
    }
    
    return memory;
  }
  
  // Parse stats info from Redis INFO
  parseStatsInfo(info) {
    const lines = info.split('\r\n');
    const stats = {};
    
    for (const line of lines) {
      if (line.startsWith('total_connections_received:')) {
        stats.totalConnections = parseInt(line.split(':')[1]);
      } else if (line.startsWith('total_commands_processed:')) {
        stats.totalCommands = parseInt(line.split(':')[1]);
      } else if (line.startsWith('keyspace_hits:')) {
        stats.hits = parseInt(line.split(':')[1]);
      } else if (line.startsWith('keyspace_misses:')) {
        stats.misses = parseInt(line.split(':')[1]);
      }
    }
    
    if (stats.hits && stats.misses) {
      stats.hitRate = ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2) + '%';
    }
    
    return stats;
  }
  
  // Parse uptime info from Redis INFO
  parseUptimeInfo(info) {
    const lines = info.split('\r\n');
    const uptime = {};
    
    for (const line of lines) {
      if (line.startsWith('uptime_in_seconds:')) {
        uptime.seconds = parseInt(line.split(':')[1]);
      } else if (line.startsWith('uptime_in_days:')) {
        uptime.days = parseInt(line.split(':')[1]);
      }
    }
    
    return uptime;
  }
}

// Hybrid Cache Class (combines Redis and Memory)
class HybridCache {
  constructor(config = {}) {
    this.config = { ...CACHING_CONFIG.strategies.hybrid, ...config };
    this.memoryCache = new MemoryCache();
    this.redisCache = new RedisCache();
    this.syncTimer = null;
    
    this.startSync();
  }
  
  // Start sync timer
  startSync() {
    this.syncTimer = setInterval(() => {
      this.syncMemoryToRedis();
    }, this.config.syncInterval);
  }
  
  // Stop sync timer
  stopSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
  
  // Sync memory cache to Redis
  async syncMemoryToRedis() {
    try {
      const stats = this.memoryCache.getStats();
      
      // Sync frequently accessed items to Redis
      const items = stats.items
        .filter(item => item.accessCount > 5)
        .sort((a, b) => b.accessCount - a.accessCount)
        .slice(0, this.config.redisThreshold);
      
      for (const item of items) {
        const value = this.memoryCache.get(item.key);
        if (value !== null) {
          await this.redisCache.set(item.key, value);
        }
      }
    } catch (error) {
      console.error('❌ Hybrid cache sync error:', error);
    }
  }
  
  // Set item in hybrid cache
  async set(key, value, ttl = CACHING_CONFIG.ttl.default) {
    try {
      // Always set in memory cache
      this.memoryCache.set(key, value, ttl);
      
      // Set in Redis if threshold is met
      const stats = this.memoryCache.getStats();
      if (stats.size >= this.config.memoryThreshold) {
        await this.redisCache.set(key, value, ttl);
      }
      
      return true;
    } catch (error) {
      console.error('❌ Hybrid cache set error:', error);
      throw error;
    }
  }
  
  // Get item from hybrid cache
  async get(key) {
    try {
      // Try memory cache first
      let value = this.memoryCache.get(key);
      
      if (value !== null) {
        return value;
      }
      
      // Try Redis cache
      value = await this.redisCache.get(key);
      
      if (value !== null) {
        // Store in memory cache for faster access
        this.memoryCache.set(key, value);
      }
      
      return value;
    } catch (error) {
      console.error('❌ Hybrid cache get error:', error);
      throw error;
    }
  }
  
  // Delete item from hybrid cache
  async delete(key) {
    try {
      const memoryResult = this.memoryCache.delete(key);
      const redisResult = await this.redisCache.delete(key);
      
      return memoryResult || redisResult;
    } catch (error) {
      console.error('❌ Hybrid cache delete error:', error);
      throw error;
    }
  }
  
  // Clear hybrid cache
  async clear(pattern = '*') {
    try {
      this.memoryCache.clear();
      await this.redisCache.clear(pattern);
    } catch (error) {
      console.error('❌ Hybrid cache clear error:', error);
      throw error;
    }
  }
  
  // Get hybrid cache statistics
  async getStats() {
    try {
      const memoryStats = this.memoryCache.getStats();
      const redisStats = await this.redisCache.getStats();
      
      return {
        memory: memoryStats,
        redis: redisStats,
        hybrid: {
          syncInterval: this.config.syncInterval,
          memoryThreshold: this.config.memoryThreshold,
          redisThreshold: this.config.redisThreshold
        }
      };
    } catch (error) {
      console.error('❌ Hybrid cache stats error:', error);
      throw error;
    }
  }
  
  // Destroy hybrid cache
  async destroy() {
    this.stopSync();
    this.memoryCache.destroy();
    await this.redisCache.disconnect();
  }
}

// Cache Manager Class
class CacheManager {
  constructor() {
    this.config = CACHING_CONFIG;
    this.caches = new Map();
    this.defaultCache = null;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    
    this.initialize();
  }
  
  // Initialize cache manager
  async initialize() {
    try {
      // Create default cache based on configuration
      const strategy = this.config.strategies.default;
      
      switch (strategy) {
        case 'redis':
          this.defaultCache = new RedisCache();
          break;
        case 'memory':
          this.defaultCache = new MemoryCache();
          break;
        case 'hybrid':
          this.defaultCache = new HybridCache();
          break;
        default:
          // Try Redis first, fallback to memory
          try {
            this.defaultCache = new RedisCache();
            // Test connection
            await this.defaultCache.client.ping();
          } catch (error) {
            console.warn('⚠️ Redis not available, falling back to memory cache');
            this.defaultCache = new MemoryCache();
          }
      }
      
      this.caches.set('default', this.defaultCache);
      
      console.log('✅ Cache manager initialized successfully');
      
      // Start cache warming if enabled
      if (this.config.warming.enabled) {
        this.startCacheWarming();
      }
      
      // Start monitoring if enabled
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize cache manager:', error);
    }
  }
  
  // Get cache instance
  getCache(name = 'default') {
    return this.caches.get(name) || this.defaultCache;
  }
  
  // Create named cache
  createCache(name, type = 'default', config = {}) {
    let cache;
    
    switch (type) {
      case 'redis':
        cache = new RedisCache(config);
        break;
      case 'memory':
        cache = new MemoryCache(config);
        break;
      case 'hybrid':
        cache = new HybridCache(config);
        break;
      default:
        cache = this.defaultCache;
    }
    
    this.caches.set(name, cache);
    return cache;
  }
  
  // Set item in cache
  async set(key, value, ttl = this.config.ttl.default, cacheName = 'default') {
    try {
      const cache = this.getCache(cacheName);
      const result = await cache.set(key, value, ttl);
      
      this.stats.sets++;
      
      // Log cache set
      logSecurityEvent(
        AUDIT_EVENTS.SYSTEM_CONFIG,
        null,
        {
          action: 'cache_set',
          key,
          cacheName,
          ttl
        },
        {},
        { success: true, severity: 'low' }
      );
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Cache set error:', error);
      throw error;
    }
  }
  
  // Get item from cache
  async get(key, cacheName = 'default') {
    try {
      const cache = this.getCache(cacheName);
      const result = await cache.get(key);
      
      if (result !== null) {
        this.stats.hits++;
      } else {
        this.stats.misses++;
      }
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Cache get error:', error);
      throw error;
    }
  }
  
  // Delete item from cache
  async delete(key, cacheName = 'default') {
    try {
      const cache = this.getCache(cacheName);
      const result = await cache.delete(key);
      
      this.stats.deletes++;
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Cache delete error:', error);
      throw error;
    }
  }
  
  // Clear cache
  async clear(pattern = '*', cacheName = 'default') {
    try {
      const cache = this.getCache(cacheName);
      const result = await cache.clear(pattern);
      
      return result;
    } catch (error) {
      this.stats.errors++;
      console.error('❌ Cache clear error:', error);
      throw error;
    }
  }
  
  // Get cache statistics
  async getStats() {
    try {
      const cacheStats = {};
      
      for (const [name, cache] of this.caches.entries()) {
        cacheStats[name] = await cache.getStats();
      }
      
      return {
        caches: cacheStats,
        manager: {
          ...this.stats,
          hitRate: this.stats.hits > 0 ? 
            ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(2) + '%' : 
            '0%'
        },
        config: this.config
      };
    } catch (error) {
      console.error('❌ Cache stats error:', error);
      throw error;
    }
  }
  
  // Start cache warming
  startCacheWarming() {
    if (!this.config.warming.enabled) return;
    
    const warmUp = async () => {
      try {
        console.log('🔥 Starting cache warming...');
        
        for (const dataSet of this.config.warming.dataSets) {
          await this.warmUpDataSet(dataSet);
        }
        
        console.log('✅ Cache warming completed');
      } catch (error) {
        console.error('❌ Cache warming error:', error);
      }
    };
    
    // Warm up on startup
    if (this.config.warming.onStartup) {
      warmUp();
    }
    
    // Schedule periodic warming
    setInterval(warmUp, this.config.warming.interval);
  }
  
  // Warm up specific data set
  async warmUpDataSet(dataSet) {
    try {
      console.log(`🔥 Warming up data set: ${dataSet}`);
      
      switch (dataSet) {
        case 'activeElections':
          await this.warmUpActiveElections();
          break;
        case 'popularCandidates':
          await this.warmUpPopularCandidates();
          break;
        case 'userStatistics':
          await this.warmUpUserStatistics();
          break;
        case 'systemHealth':
          await this.warmUpSystemHealth();
          break;
        default:
          console.warn(`⚠️ Unknown data set: ${dataSet}`);
      }
    } catch (error) {
      console.error(`❌ Error warming up data set ${dataSet}:`, error);
    }
  }
  
  // Warm up active elections
  async warmUpActiveElections() {
    try {
      // Mock implementation - would fetch from database
      const activeElections = [
        { id: 1, title: 'Election 1', status: 'active' },
        { id: 2, title: 'Election 2', status: 'active' }
      ];
      
      await this.set('active:elections', activeElections, this.config.ttl.elections.list);
    } catch (error) {
      console.error('❌ Error warming up active elections:', error);
    }
  }
  
  // Warm up popular candidates
  async warmUpPopularCandidates() {
    try {
      // Mock implementation - would fetch from database
      const popularCandidates = [
        { id: 1, name: 'Candidate 1', votes: 100 },
        { id: 2, name: 'Candidate 2', votes: 85 }
      ];
      
      await this.set('popular:candidates', popularCandidates, this.config.ttl.candidates.list);
    } catch (error) {
      console.error('❌ Error warming up popular candidates:', error);
    }
  }
  
  // Warm up user statistics
  async warmUpUserStatistics() {
    try {
      // Mock implementation - would fetch from database
      const userStats = {
        totalUsers: 1000,
        activeUsers: 850,
        newUsersToday: 25
      };
      
      await this.set('user:statistics', userStats, this.config.ttl.system.statistics);
    } catch (error) {
      console.error('❌ Error warming up user statistics:', error);
    }
  }
  
  // Warm up system health
  async warmUpSystemHealth() {
    try {
      // Mock implementation - would check system health
      const health = {
        status: 'healthy',
        database: 'connected',
        redis: 'connected',
        memory: '75%'
      };
      
      await this.set('system:health', health, this.config.ttl.system.health);
    } catch (error) {
      console.error('❌ Error warming up system health:', error);
    }
  }
  
  // Start monitoring
  startMonitoring() {
    if (!this.config.monitoring.enabled) return;
    
    setInterval(async () => {
      try {
        const stats = await this.getStats();
        
        // Log monitoring data
        logSecurityEvent(
          AUDIT_EVENTS.SYSTEM_CONFIG,
          null,
          {
            action: 'cache_monitoring',
            stats
          },
          {},
          { success: true, severity: 'low' }
        );
        
        // Check for issues
        this.checkCacheHealth(stats);
      } catch (error) {
        console.error('❌ Cache monitoring error:', error);
      }
    }, this.config.monitoring.interval);
  }
  
  // Check cache health
  checkCacheHealth(stats) {
    for (const [cacheName, cacheStats] of Object.entries(stats.caches)) {
      if (cacheStats.memory) {
        const memoryUsage = parseFloat(cacheStats.memory.memoryUsage);
        if (memoryUsage > 90) {
          console.warn(`⚠️ High memory usage in cache ${cacheName}: ${memoryUsage}%`);
        }
      }
      
      if (cacheStats.stats && cacheStats.stats.hitRate) {
        const hitRate = parseFloat(cacheStats.stats.hitRate);
        if (hitRate < 50) {
          console.warn(`⚠️ Low hit rate in cache ${cacheName}: ${hitRate}%`);
        }
      }
    }
  }
  
  // Destroy cache manager
  async destroy() {
    try {
      for (const [name, cache] of this.caches.entries()) {
        if (cache.destroy) {
          await cache.destroy();
        } else if (cache.disconnect) {
          await cache.disconnect();
        }
      }
      
      this.caches.clear();
      console.log('✅ Cache manager destroyed');
    } catch (error) {
      console.error('❌ Error destroying cache manager:', error);
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

export {
  CacheManager,
  MemoryCache,
  RedisCache,
  HybridCache,
  cacheManager,
  CACHING_CONFIG
};
