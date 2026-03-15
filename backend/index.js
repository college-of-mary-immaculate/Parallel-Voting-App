const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { initializeSocket, setSocketInstance } = require('./src/config/socketConfig');
const { requestLogger, errorAudit, requestId } = require('./src/middleware/auditMiddleware');
const { startPeriodicCleanup } = require('./src/utils/tokenBlacklist');
const { securityHeaders, rateLimit, validateContentType, validateRequestSize } = require('./src/middleware/validationMiddleware');

// Load environment variables
dotenv.config();

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
app.use(securityHeaders);
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
}));
app.use(validateRequestSize('10mb'));

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

// Audit middleware
app.use(requestId);
app.use(requestLogger);

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Parallel Voting App API',
    version: '1.0.0',
    status: 'running'
  });
});

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const electionRoutes = require('./src/routes/electionRoutes');
const candidateRoutes = require('./src/routes/candidateRoutes');
const voteRoutes = require('./src/routes/voteRoutes');
const secureVoteRoutes = require('./src/routes/secureVoteRoutes');
const socketRoutes = require('./src/routes/socketRoutes');
const realtimeRoutes = require('./src/routes/realtimeRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const securityRoutes = require('./src/routes/securityRoutes');
const auditRoutes = require('./src/routes/auditRoutes');
const exportRoutes = require('./src/routes/exportRoutes');
const protectedRoutes = require('./src/routes/protectedRoutes');
app.use('/api/auth', authRoutes);
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

// Error handling middleware
app.use(errorAudit);
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
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
  await closeConnections();
  console.log('🗄️ Database connections closed');
  
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
