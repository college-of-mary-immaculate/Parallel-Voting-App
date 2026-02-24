import express from 'express';
import { initializeDatabase } from './src/config/database.js';
import { validateDatabaseSetup, checkDatabaseHealth } from './src/utils/database.js';
import 'dotenv/config.js';
 
const app = express();
const port = process.env.API_PORT || 5000;
 
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 
// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    const dbSetup = await validateDatabaseSetup();
 
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Parallel Voting App API',
      version: '1.0.0',
      database: dbHealth,
      setup: dbSetup
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});
 
// Database test endpoint
app.get('/test-db', async (req, res) => {
  try {
    const result = await initializeDatabase();
    res.json({
      message: 'Database connection successful',
      connections: Object.keys(result),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: 'Database connection failed',
      error: error.message
    });
  }
});
 
// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Parallel Voting App API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      testDb: '/test-db'
    }
  });
});
 
// Start server
const startServer = async () => {
  try {
    console.log('🚀 Starting Parallel Voting App API...');
 
    // Initialize database connections
    await initializeDatabase();
 
    // Start server
    app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🔗 Database test: http://localhost:${port}/test-db`);
    });
 
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};
 
// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});
 
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});
 
// Start the server
startServer();