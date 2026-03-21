import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import existing backend functionality
import { initializeSocket, broadcastToElection, broadcastToAll } from '../backend/src/config/socketConfig.js';
//import socketConfig from "../backend/src/config/socketConfig.js";

//const { initializeSocket, broadcastToElection, broadcastToAll } = socketConfig;
// Import error handling
import { 
  globalErrorHandler, 
  notFoundHandler, 
  setupGlobalErrorHandlers 
} from '../backend/src/middleware/errorHandler.js';
import errorMonitor from '../backend/src/utils/errorMonitor.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// const redisClient1 = createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` });
// const redisClient2 = createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` });

// await redisClient1.connect();
// await redisClient2.connect();

// Initialize Socket.io with enhanced configuration
// const io = new Server(server, {
//   cors: {
//     origin: process.env.HOST || "http://localhost:3000",
//     methods: ["GET", "POST"],
//     credentials: true
//   },
//   transports: ['websocket', 'polling'],
//   adapter: createAdapter(redisClient1, redisClient2)
//   // adapter: require('socket.io-redis-adapter')(
//   //   require('redis').createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` }),
//   //   require('redis').createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}` })
//   // )
// });

// Setup global error handlers
setupGlobalErrorHandlers();

// Start error monitoring
errorMonitor.startMonitoring();

app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Middleware
app.use(cors({
  origin: process.env.HOST || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
// app.use(express.static(path.join(__dirname, '../dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    server: process.env.SERVER_NAME || 'unknown',
    port: process.env.PORT || 3000,
    publisher: process.env.PUBLISHER === 'true',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend in production
// if (process.env.NODE_ENV === 'production') {
//   app.get(/^\/.*$/, (req, res) => {
//     res.sendFile(path.join(__dirname, '../dist/index.html'));
//   });
// }
app.get(/^\/.*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});

// Error handling middleware
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Enhanced Socket.io setup with publisher-subscriber pattern
// let subscriberSocket = null;
let isConnectedToPublisher = false;

// Initialize socket with existing configuration
//const socketIo = initializeSocket(server);

let io;
let subscriberSocket;
let socketIo;

// Publisher-Subscriber Logic
if (process.env.PUBLISHER === 'true') {
  console.log('🔴 Running as PUBLISHER');

  // io = new Server(server, {
  //   cors: {
  //     origin: process.env.HOST || "http://localhost:3000",
  //     methods: ["GET", "POST"],
  //     credentials: true
  //   },
  //   transports: ['websocket', 'polling'],
  //   adapter: createAdapter(redisClient1, redisClient2)
  // });

  socketIo = initializeSocket(server);

  
  // Publisher broadcasts to all subscribers
  socketIo.on('connection', (socket) => {
    console.log(`Publisher: Client connected ${socket.id}`);
    
    // Enhanced real-time events
    socket.on('vote-cast', (data) => {
      console.log('Publisher: Broadcasting vote update:', data);
      
      // Broadcast to all connected clients
      broadcastToElection(socketIo, data.electionId, 'vote-update', {
        type: 'new_vote',
        ...data
      });
      
      // Also broadcast to all for global updates
      broadcastToAll(socketIo, 'global-vote-update', {
        type: 'new_vote',
        ...data
      });
    });

    socket.on('election-status-change', (data) => {
      console.log('Publisher: Broadcasting election status change:', data);
      broadcastToElection(socketIo, data.electionId, 'election-status-updated', data);
      broadcastToAll(socketIo, 'global-election-update', data);
    });

    socket.on('candidate-updated', (data) => {
      console.log('Publisher: Broadcasting candidate update:', data);
      broadcastToElection(socketIo, data.electionId, 'candidate-updated', data);
    });

    socket.on('disconnect', () => {
      console.log(`Publisher: Client disconnected ${socket.id}`);
    });
  });

} else {
  // Subscriber logic
  console.log('🔵 Running as SUBSCRIBER');
  io = new Server(server, {
    cors: {
      origin: process.env.HOST || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  socketIo = io;


  const portsList = process.env.PORTS.split(',').map(url => {
    const [host, port] = url.split(':');
    return { host, port };
  });

  // Connect to publisher
  const connectToPublisher = () => {
    portsList.forEach(({ host, port }) => {
      if (!isConnectedToPublisher) {
        subscriberSocket = Client(`ws://${host}:${port}`, {
          transports: ['websocket', 'polling']
        });

        subscriberSocket.on('connect', () => {
          console.log(`Subscriber connected to publisher: ${host}:${port}`);
          isConnectedToPublisher = true;
        });

        // Relay events from publisher to local clients
        subscriberSocket.on('vote-update', (data) => {
          broadcastToElection(socketIo, data.electionId, 'vote-update', data);
        });

        subscriberSocket.on('election-status-updated', (data) => {
          broadcastToElection(socketIo, data.electionId, 'election-status-updated', data);
        });

        subscriberSocket.on('candidate-updated', (data) => {
          broadcastToElection(socketIo, data.electionId, 'candidate-updated', data);
        });

        subscriberSocket.on('global-vote-update', (data) => {
          broadcastToAll(socketIo, 'global-vote-update', data);
        });

        subscriberSocket.on('global-election-update', (data) => {
          broadcastToAll(socketIo, 'global-election-update', data);
        });

        subscriberSocket.on('disconnect', () => {
          console.log('Subscriber: Disconnected from publisher');
          isConnectedToPublisher = false;
          // Attempt to reconnect
          setTimeout(connectToPublisher, 5000);
        });

        subscriberSocket.on('connect_error', (error) => {
          console.error('Subscriber: Connection error:', error.message);
        });
      }
    });
  };

  connectToPublisher();

  // Handle local client connections
  socketIo.on('connection', (socket) => {
    console.log(`Subscriber: Client connected ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`Subscriber: Client disconnected ${socket.id}`);
    });
  });
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🔗 Publisher mode: ${process.env.PUBLISHER === 'true'}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, io, socketIo };
