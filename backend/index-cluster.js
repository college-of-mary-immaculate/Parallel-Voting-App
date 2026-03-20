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

// Elections endpoint
app.get('/api/elections', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: 'Student Council Election 2024',
        description: 'Election for student council representatives',
        status: 'active',
        startTime: '2024-03-20T09:00:00',
        endTime: '2024-03-20T17:00:00',
        candidates: [
          { id: 1, name: 'Alice Johnson', party: 'Independent', votes: 150 },
          { id: 2, name: 'Bob Smith', party: 'Democratic', votes: 120 },
          { id: 3, name: 'Charlie Davis', party: 'Green', votes: 95 }
        ],
        totalVotes: 365
      },
      {
        id: 2,
        title: 'Technology Committee Election 2024',
        description: 'Election for technology committee members',
        status: 'completed',
        startTime: '2024-02-15T10:00:00',
        endTime: '2024-02-15T16:00:00',
        candidates: [
          { id: 1, name: 'David Lee', party: 'Tech', votes: 89 },
          { id: 2, name: 'Eva Martinez', party: 'Tech', votes: 134 }
        ],
        totalVotes: 223
      }
    ]
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Mock authentication
  if (email === 'test@example.com' && password === 'Test123') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          userId: 1,
          vin: 'VTR123456',
          fullname: 'Test User',
          email: 'test@example.com',
          role: 'voter'
        },
        token: 'mock-jwt-token-' + Date.now()
      }
    });
  } else {
    res.json({
      success: false,
      message: 'Invalid credentials',
      error: 'Email or password incorrect'
    });
  }
});

// Vote endpoint
app.post('/api/votes', (req, res) => {
  const { electionId, candidateId, voterId } = req.body;
  
  // Mock vote processing
  if (electionId && candidateId && voterId) {
    res.json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        electionId,
        candidateId,
        voterId,
        timestamp: new Date().toISOString()
      }
    });
  } else {
    res.json({
      success: false,
      message: 'Invalid vote data',
      error: 'Missing required fields'
    });
  }
});

// Results endpoint
app.get('/api/results', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        title: 'Student Council Election 2024',
        results: [
          { candidateId: 1, candidateName: 'Alice Johnson', votes: 150, percentage: 41.1 },
          { candidateId: 2, candidateName: 'Bob Smith', votes: 120, percentage: 32.9 },
          { candidateId: 3, candidateName: 'Charlie Davis', votes: 95, percentage: 26.0 }
        ],
        totalVotes: 365,
        winner: { candidateId: 1, candidateName: 'Alice Johnson' }
      }
    ]
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
