const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { testConnection, closeConnections } = require('./src/config/database');
const { startPeriodicCleanup } = require('./src/utils/tokenBlacklist');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 5000;

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
const protectedRoutes = require('./src/routes/protectedRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/votes', voteRoutes);
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
    
    // Start periodic token blacklist cleanup
    startPeriodicCleanup();
    console.log('🧹 Token blacklist cleanup started (runs every hour)');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await closeConnections();
  process.exit(0);
});

startServer();

module.exports = app;
