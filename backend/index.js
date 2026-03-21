import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { initializeSocket, setSocketInstance } from './src/config/socketConfig.js';
import { requestLogger, errorAudit, requestId } from './src/middleware/auditMiddleware.js';
import { startPeriodicCleanup } from './src/utils/tokenBlacklist.js';
import { 
  rateLimitMiddleware, 
  endpointRateLimit, 
  createRoleBasedRateLimit,
  rateLimitStats,
  initializeRateLimiting 
} from './src/middleware/rateLimitMiddleware.js';
import {
  databaseOptimizationMiddleware,
  performanceMonitoringMiddleware,
  cacheManagementMiddleware,
  createOptimizationRoutes
} from './src/middleware/databaseOptimizationMiddleware.js';
import {
  apiVersioningMiddleware,
  versionValidationMiddleware,
  versionCompatibilityMiddleware,
  versionRateLimitingMiddleware,
  versionAnalyticsMiddleware
} from './src/middleware/apiVersioningMiddleware.js';
import {
  staticDataCache,
  userDataCache,
  analyticsCache,
  writeOperationInvalidation,
  cacheStats
} from './src/middleware/cacheMiddleware.js';
import {
  globalErrorHandler,
  notFoundHandler,
  setupGlobalErrorHandlers,
  asyncErrorHandler
} from './src/middleware/errorHandler.js';
import errorMonitor from './src/utils/errorMonitor.js';

import { testConnection } from "./src/config/database.js";
import { closeConnections } from "./src/config/database.js";

// Load environment variables
dotenv.config();

// Setup global error handlers
setupGlobalErrorHandlers();

// Start error monitoring
errorMonitor.startMonitoring();

const app = express();
const PORT = process.env.API_PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.HOST || 'http://localhost:3000',
  credentials: true
}));

// Security middleware
// app.use(securityHeaders);
// app.use(validateRequestSize('10mb'));

// Apply general rate limiting
app.use(rateLimitMiddleware.general);

// Apply role-based rate limiting
app.use(createRoleBasedRateLimit());

// Performance monitoring middleware
// app.use(performanceMonitoringMiddleware.requestTiming);
// app.use(performanceMonitoringMiddleware.memoryMonitoring);
// app.use(performanceMonitoringMiddleware.cpuMonitoring);

// Database optimization middleware
// app.use(databaseOptimizationMiddleware.initialize);
// app.use(databaseOptimizationMiddleware.queryMonitor);
// app.use(databaseOptimizationMiddleware.cacheInvalidation);
// app.use(databaseOptimizationMiddleware.healthCheck);

// Cache management middleware
// app.use(cacheManagementMiddleware.cacheStats);
// app.use(cacheManagementMiddleware.cacheControl);
// app.use(cacheManagementMiddleware.cacheWarmer);

// API versioning middleware
// app.use(apiVersioningMiddleware);
// app.use(versionValidationMiddleware);
// app.use(versionCompatibilityMiddleware);
// app.use(versionRateLimitingMiddleware);
// app.use(versionAnalyticsMiddleware);

// Caching middleware
// app.use(cacheStats);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Content type validation for POST/PUT requests
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('multipart/form-data')) {
      return res.status(415).json({
        success: false,
        message: 'Unsupported media type',
        code: 'UNSUPPORTED_MEDIA_TYPE'
      });
    }
  }
  next();
});

// Rate limiting statistics endpoint
app.use('/api/rate-limit-stats', rateLimitStats);

// Audit middleware
app.use(requestId);
app.use(requestLogger);

// Basic route
// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Parallel Voting App API',
//     version: '1.0.0',
//     status: 'running'
//   });
// });

// Import routes
// const authRoutes = require('./src/routes/authRoutes');
// const electionRoutes = require('./src/routes/electionRoutes');
// const candidateRoutes = require('./src/routes/candidateRoutes');
// const voteRoutes = require('./src/routes/voteRoutes');
// const secureVoteRoutes = require('./src/routes/secureVoteRoutes');
// const socketRoutes = require('./src/routes/socketRoutes');
// const realtimeRoutes = require('./src/routes/realtimeRoutes');
// const analyticsRoutes = require('./src/routes/analyticsRoutes');
// const adminRoutes = require('./src/routes/adminRoutes');
// const notificationRoutes = require('./src/routes/notificationRoutes');
// const securityRoutes = require('./src/routes/securityRoutes');
// const auditRoutes = require('./src/routes/auditRoutes');
// const exportRoutes = require('./src/routes/exportRoutes');
// const protectedRoutes = require('./src/routes/protectedRoutes');
// const jwtSecurityRoutes = require('./src/routes/jwtSecurityRoutes');
// const apiVersioningRoutes = require('./src/routes/apiVersioningRoutes');
// const cacheRoutes = require('./src/routes/cacheRoutes');
// const { versionedAuthRouter, versionedElectionRouter, versionedVoteRouter, versionedAnalyticsRouter } = require('./src/routes/versionedRouteExamples');

import authRoutes from './src/routes/authRoutes.js';
import electionRoutes from './src/routes/electionRoutes.js';
import candidateRoutes from './src/routes/candidateRoutes.js';
import voteRoutes from './src/routes/voteRoutes.js';
import secureVoteRoutes from './src/routes/secureVoteRoutes.js';
import socketRoutes from './src/routes/socketRoutes.js';
import realtimeRoutes from './src/routes/realtimeRoutes.js';
import analyticsRoutes from './src/routes/analyticsRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import securityRoutes from './src/routes/securityRoutes.js';
import auditRoutes from './src/routes/auditRoutes.js';
import exportRoutes from './src/routes/exportRoutes.js';
import protectedRoutes from './src/routes/protectedRoutes.js';
import jwtSecurityRoutes from './src/routes/jwtSecurityRoutes.js';
import apiVersioningRoutes from './src/routes/apiVersioningRoutes.js';
import cacheRoutes from './src/routes/cacheRoutes.js';
import { 
  versionedAuthRouter, 
  versionedElectionRouter, 
  versionedVoteRouter, 
  versionedAnalyticsRouter 
} from './src/routes/versionedRouteExamples.js';

// Apply specific rate limiting to routes
app.use('/api/auth', endpointRateLimit['/api/auth/login']);
app.use('/api/auth', endpointRateLimit['/api/auth/register']);
app.use('/api/auth', endpointRateLimit['/api/auth/reset-password']);
app.use('/api/votes', endpointRateLimit['/api/votes']);
app.use('/api/secure-votes', endpointRateLimit['/api/secure-votes']);
app.use('/api/export', endpointRateLimit['/api/export']);
app.use('/api/admin', endpointRateLimit['/api/admin']);
app.use('/api/analytics', endpointRateLimit['/api/analytics']);

app.use('/api/auth', authRoutes);
app.use('/api/auth', jwtSecurityRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/secure-votes', secureVoteRoutes);
app.use('/api/socket', socketRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/export', exportRoutes);
app.use('/api', protectedRoutes);
app.use('/api/version', apiVersioningRoutes);
app.use('/api/cache', cacheRoutes);

// Apply caching middleware to specific routes
app.use('/api/elections', staticDataCache);
app.use('/api/candidates', staticDataCache);
app.use('/api/analytics', analyticsCache);
app.use('/api/auth/profile', userDataCache);

// Apply cache invalidation to write operations
app.use('/api/elections', writeOperationInvalidation);
app.use('/api/candidates', writeOperationInvalidation);
app.use('/api/votes', writeOperationInvalidation);

// Versioned routes
app.use('/api/v1/auth', versionedAuthRouter.getRouter('v1'));
app.use('/api/v1/elections', versionedElectionRouter.getRouter('v1'));
app.use('/api/v1/votes', versionedVoteRouter.getRouter('v1'));
app.use('/api/v1/analytics', versionedAnalyticsRouter.getRouter('v1'));

app.use('/api/v2/auth', versionedAuthRouter.getRouter('v2'));
app.use('/api/v2/elections', versionedElectionRouter.getRouter('v2'));
app.use('/api/v2/votes', versionedVoteRouter.getRouter('v2'));
app.use('/api/v2/analytics', versionedAnalyticsRouter.getRouter('v2'));

// Create optimization routes
createOptimizationRoutes(app);

// Health check endpoint with error monitoring data
app.get('/api/health', asyncErrorHandler(async (req, res) => {
  const dashboardData = errorMonitor.getDashboardData();
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Parallel Voting App API',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    errorMonitoring: {
      enabled: true,
      recentErrors: dashboardData.summary.totalErrors,
      errorRate: dashboardData.summary.errorRate,
      lastAlerts: dashboardData.alerts.lastAlerts
    },
    documentation: {
      swagger: '/api-docs',
      swaggerJson: '/api-docs.json'
    },
    endpoints: {
      authentication: '/api/auth',
      elections: '/api/elections',
      candidates: '/api/candidates',
      voting: '/api/votes',
      analytics: '/api/analytics',
      admin: '/api/admin',
      export: '/api/export',
      cache: '/api/cache'
    }
  });
}));

// Error monitoring dashboard endpoint
app.get('/api/errors/dashboard', asyncErrorHandler(async (req, res) => {
  const dashboardData = errorMonitor.getDashboardData();
  res.json({
    success: true,
    data: dashboardData,
    timestamp: new Date().toISOString()
  });
}));

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    //const { testConnection } = require('./src/config/database');
    await testConnection();
    console.log('✅ Database connection successful');

    // Initialize Socket.io
    const io = initializeSocket(server);
    setSocketInstance(io);
    console.log('🔌 Socket.io server initialized');

    // Start periodic token blacklist cleanup
    startPeriodicCleanup();
    console.log('🧹 Token blacklist cleanup started (runs every hour)');

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io server ready for connections`);
      console.log(`🌐 CORS enabled for: ${process.env.HOST || 'http://localhost:3000'}`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  
  // Close HTTP server
  server.close(() => {
    console.log('📡 HTTP server closed');
  });

  // Close database connections
  // const { closeConnections } = require('./src/config/database');
  await closeConnections();
  console.log('🗄️ Database connections closed');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('� SIGINT received, shutting down gracefully');
  
  // Close HTTP server
  server.close(() => {
    console.log('📡 HTTP server closed');
  });

  // Close database connections
  //const { closeConnections } = require('./src/config/database');
  await closeConnections();
  console.log('🗄️ Database connections closed');
  
  process.exit(0);
});

// Start the server
startServer();

export default app;
