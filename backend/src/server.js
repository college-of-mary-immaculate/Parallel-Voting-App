const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { getConnection, pool } = require('./db/db');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ── Socket.io setup with Redis adapter ──────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: false
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

async function setupRedisAdapter() {
    const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

    const pubClient = createClient({ url: REDIS_URL });
    const subClient = pubClient.duplicate();

    pubClient.on('error', err => console.error('Redis pub error:', err));
    subClient.on('error', err => console.error('Redis sub error:', err));

    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io Redis adapter connected');
}

// Make io accessible in controllers/services
app.set('io', io);

// ── Middleware ───────────────────────────────────────────────────────────────
const authController = require('./controllers/auth.controller');
const userController = require('./controllers/user.controller');
const electionController = require('./controllers/election.controller');
const voterController = require('./controllers/vote.controller');

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false
}));

app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/elections', electionController);
app.use('/api/auth', authController);
app.use('/api/users', userController);
app.use('/api/voter', voterController);

// Health check
app.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1;');
        res.status(200).json({ status: 'OK', message: 'Database connected' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', message: err.message });
    }
});

// Show tables
app.get('/tables', async (req, res) => {
    try {
        const [tables] = await pool.query('SHOW TABLES;');
        res.json({ tables });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Socket.io connection ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join:election', (electionId) => {
        socket.join(`election:${electionId}`);
        console.log(`Socket ${socket.id} joined election:${electionId}`);
    });

    socket.on('leave:election', (electionId) => {
        socket.leave(`election:${electionId}`);
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

// ── Start ────────────────────────────────────────────────────────────────────
async function start() {
    try {
        console.log('Waiting for database connection...');
        await getConnection();

        await setupRedisAdapter();

        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
}

start();

module.exports = { io };