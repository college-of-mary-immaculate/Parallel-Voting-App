const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection, closeConnections } = require('./src/config/database');
const { startPeriodicCleanup } = require('./src/utils/tokenBlacklist');
const { initializeSocket } = require('./src/config/socketConfig');
const { setSocketInstance } = require('./src/utils/socketUtils');

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

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
const socketRoutes = require('./src/routes/socketRoutes');
const realtimeRoutes = require('./src/routes/realtimeRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');
const protectedRoutes = require('./src/routes/protectedRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/socket', socketRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api', protectedRoutes);

// Error handling middleware
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
