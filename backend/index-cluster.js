import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from 'socket.io-redis-adapter';
import { createClient } from 'redis';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 5000;
const SOCKET_PORT = process.env.PORT || 3000;
const PUBLISHER = process.env.PUBLISHER === 'true';

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Redis clients for Socket.io adapter
const pubClient = createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  retry_delay_on_failover: 100,
  maxRetriesPerRequest: 3
});

const subClient = pubClient.duplicate();

// Socket.io with Redis adapter
const io = new Server(server, {
  adapter: createAdapter(pubClient, subClient, {
    key: 'voting-app',
    publishOnSpecificResponseKey: true
  }),
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173'], // All frontend servers
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173', 'http://localhost:80'], // All frontend servers
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Parallel Voting App API',
    version: '1.0.0',
    serverType: PUBLISHER ? 'MASTER' : 'SLAVE',
    port: SOCKET_PORT,
    apiPort: PORT,
    status: 'running'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Parallel Voting App API',
    serverType: PUBLISHER ? 'MASTER' : 'SLAVE',
    port: SOCKET_PORT,
    apiPort: PORT,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔗 ${PUBLISHER ? 'MASTER' : 'SLAVE'} connected: ${socket.id}`);
  
  // Join voting room
  socket.join('voting-room');
  
  // Handle voting events
  socket.on('vote-cast', (data) => {
    console.log(`🗳 ${PUBLISHER ? 'MASTER' : 'SLAVE'} received vote:`, data);
    
    if (PUBLISHER) {
      // Master broadcasts to all slaves
      io.to('voting-room').emit('vote-update', data);
      console.log('📡 Master broadcasted vote to all slaves');
    } else {
      // Slave just processes the vote (no broadcasting)
      console.log('📝 Slave processed vote locally');
    }
  });
  
  // Handle election events
  socket.on('election-start', (data) => {
    console.log(`🗳 ${PUBLISHER ? 'MASTER' : 'SLAVE'} election started:`, data);
    
    if (PUBLISHER) {
      io.to('voting-room').emit('election-update', data);
      console.log('📡 Master broadcasted election start');
    }
  });
  
  // Handle real-time results
  socket.on('results-request', () => {
    console.log(`📊 ${PUBLISHER ? 'MASTER' : 'SLAVE'} received results request`);
    
    if (PUBLISHER) {
      // Master sends results
      socket.emit('results-data', {
        message: 'Results from master server',
        timestamp: new Date().toISOString(),
        serverType: 'MASTER'
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ ${PUBLISHER ? 'MASTER' : 'SLAVE'} disconnected: ${socket.id}`);
  });
});

// Start server
const startServer = async () => {
  try {
    server.listen(PORT, () => {
      console.log(`🚀 ${PUBLISHER ? 'MASTER' : 'SLAVE'} server running on port ${PORT}`);
      console.log(`📡 API server ready on port ${process.env.API_PORT || 5000}`);
      console.log(`🔗 Socket.io ready for ${PUBLISHER ? 'broadcasting' : 'receiving'}`);
      console.log(`🌐 CORS enabled for: ${process.env.HOST || 'http://localhost:3000'}`);
      console.log(`💾 Redis adapter connected: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('📡 HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('📡 HTTP server closed');
    process.exit(0);
  });
});

// Start server
startServer();

export default app;
