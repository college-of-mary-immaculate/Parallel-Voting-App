const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('./jwtUtils');

/**
 * Socket.io Server Configuration
 * Handles real-time communication for the voting application
 */

// Store connected users and their socket IDs
const connectedUsers = new Map();

// Store room subscriptions (election rooms)
const electionRooms = new Map();

// Store active administrators
const connectedAdmins = new Set();

/**
 * Initialize Socket.io server
 */
const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.HOST || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      // Attach user data to socket
      socket.userId = decoded.userId;
      socket.email = decoded.email;
      socket.role = decoded.role || 'user';
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.userId} (${socket.email})`);
    
    // Store user connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      userId: socket.userId,
      email: socket.email,
      role: socket.role,
      connectedAt: new Date()
    });

    // Track admin connections
    if (socket.role === 'admin') {
      connectedAdmins.add(socket.userId);
      console.log(`👑 Admin connected: ${socket.email}`);
    }

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to voting system',
      userId: socket.userId,
      role: socket.role,
      timestamp: new Date().toISOString()
    });

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Handle joining election rooms
    socket.on('join-election', (data) => {
      const { electionId } = data;
      
      if (!electionId) {
        socket.emit('error', { message: 'Election ID required' });
        return;
      }

      // Join election room
      socket.join(`election:${electionId}`);
      
      // Track room subscription
      if (!electionRooms.has(electionId)) {
        electionRooms.set(electionId, new Set());
      }
      electionRooms.get(electionId).add(socket.userId);

      console.log(`📊 User ${socket.email} joined election ${electionId}`);
      
      socket.emit('joined-election', {
        electionId,
        message: 'Joined election room',
        timestamp: new Date().toISOString()
      });

      // Notify admins about new room member
      notifyAdmins(io, {
        type: 'user_joined_election',
        data: {
          userId: socket.userId,
          email: socket.email,
          electionId,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Handle leaving election rooms
    socket.on('leave-election', (data) => {
      const { electionId } = data;
      
      if (!electionId) {
        socket.emit('error', { message: 'Election ID required' });
        return;
      }

      // Leave election room
      socket.leave(`election:${electionId}`);
      
      // Remove from room tracking
      if (electionRooms.has(electionId)) {
        electionRooms.get(electionId).delete(socket.userId);
        if (electionRooms.get(electionId).size === 0) {
          electionRooms.delete(electionId);
        }
      }

      console.log(`📊 User ${socket.email} left election ${electionId}`);
      
      socket.emit('left-election', {
        electionId,
        message: 'Left election room',
        timestamp: new Date().toISOString()
      });
    });

    // Handle real-time vote notifications
    socket.on('vote-cast', (data) => {
      const { electionId, candidateId, candidateName } = data;
      
      // Broadcast to election room (excluding sender)
      socket.to(`election:${electionId}`).emit('vote-update', {
        type: 'new_vote',
        electionId,
        candidateId,
        candidateName,
        timestamp: new Date().toISOString()
      });

      // Notify all admins
      notifyAdmins(io, {
        type: 'vote_cast',
        data: {
          userId: socket.userId,
          email: socket.email,
          electionId,
          candidateId,
          candidateName,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Handle election status changes
    socket.on('election-status-change', (data) => {
      const { electionId, oldStatus, newStatus, electionTitle } = data;
      
      // Only admins can trigger status changes
      if (socket.role !== 'admin') {
        socket.emit('error', { message: 'Admin access required' });
        return;
      }

      // Broadcast to all users in election room
      io.to(`election:${electionId}`).emit('election-status-updated', {
        electionId,
        electionTitle,
        oldStatus,
        newStatus,
        timestamp: new Date().toISOString()
      });

      // Broadcast to all admins
      notifyAdmins(io, {
        type: 'election_status_changed',
        data: {
          changedBy: socket.email,
          electionId,
          electionTitle,
          oldStatus,
          newStatus,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Handle candidate updates
    socket.on('candidate-updated', (data) => {
      const { electionId, candidateId, candidateName, action } = data;
      
      // Broadcast to election room
      io.to(`election:${electionId}`).emit('candidate-updated', {
        electionId,
        candidateId,
        candidateName,
        action,
        timestamp: new Date().toISOString()
      });
    });

    // Handle real-time results requests
    socket.on('request-results', (data) => {
      const { electionId } = data;
      
      // This would typically fetch current results from database
      // For now, we'll emit a placeholder response
      socket.emit('results-update', {
        electionId,
        message: 'Results data would be sent here',
        timestamp: new Date().toISOString()
      });
    });

    // Handle admin notifications
    socket.on('admin-notification', (data) => {
      if (socket.role !== 'admin') {
        socket.emit('error', { message: 'Admin access required' });
        return;
      }

      const { type, message, targetElectionId } = data;
      
      const notification = {
        type,
        message,
        from: socket.email,
        timestamp: new Date().toISOString()
      };

      if (targetElectionId) {
        // Send to specific election room
        io.to(`election:${targetElectionId}`).emit('admin-notification', notification);
      } else {
        // Send to all connected users
        io.emit('admin-notification', notification);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.userId} (${socket.email})`);
      
      // Remove from connected users
      connectedUsers.delete(socket.userId);
      
      // Remove from admin tracking
      if (socket.role === 'admin') {
        connectedAdmins.delete(socket.userId);
        console.log(`👑 Admin disconnected: ${socket.email}`);
      }

      // Remove from all election rooms
      for (const [electionId, users] of electionRooms.entries()) {
        users.delete(socket.userId);
        if (users.size === 0) {
          electionRooms.delete(electionId);
        }
      }

      // Notify admins about user disconnect
      notifyAdmins(io, {
        type: 'user_disconnected',
        data: {
          userId: socket.userId,
          email: socket.email,
          role: socket.role,
          timestamp: new Date().toISOString()
        }
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  return io;
};

/**
 * Notify all connected administrators
 */
const notifyAdmins = (io, notification) => {
  if (connectedAdmins.size === 0) {
    return; // No admins connected
  }

  connectedAdmins.forEach(adminId => {
    const adminSocket = Array.from(io.sockets.sockets.values())
      .find(socket => socket.userId === adminId);
    
    if (adminSocket) {
      adminSocket.emit('admin-notification', notification);
    }
  });
};

/**
 * Broadcast to election room
 */
const broadcastToElection = (io, electionId, event, data) => {
  io.to(`election:${electionId}`).emit(event, {
    ...data,
    electionId,
    timestamp: new Date().toISOString()
  });
};

/**
 * Broadcast to all connected users
 */
const broadcastToAll = (io, event, data) => {
  io.emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send to specific user
 */
const sendToUser = (io, userId, event, data) => {
  io.to(`user:${userId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Get connection statistics
 */
const getConnectionStats = () => {
  return {
    totalConnected: connectedUsers.size,
    connectedAdmins: connectedAdmins.size,
    electionRooms: electionRooms.size,
    usersByRoom: Array.from(electionRooms.entries()).map(([electionId, users]) => ({
      electionId,
      userCount: users.size
    }))
  };
};

/**
 * Get connected users list (admin only)
 */
const getConnectedUsers = () => {
  return Array.from(connectedUsers.values()).map(user => ({
    userId: user.userId,
    email: user.email,
    role: user.role,
    connectedAt: user.connectedAt
  }));
};

module.exports = {
  initializeSocket,
  notifyAdmins,
  broadcastToElection,
  broadcastToAll,
  sendToUser,
  getConnectionStats,
  getConnectedUsers
};
