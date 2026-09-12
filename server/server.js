const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');

const config = require('./config/env');
const db = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const garageRoutes = require('./routes/garageRoutes');
const raceRoutes = require('./routes/raceRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const socialRoutes = require('./routes/socialRoutes');

// Sockets
const MultiplayerHandler = require('./sockets/multiplayerHandler');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 20000,
  pingInterval: 25000
});

// Configure Security & Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Permit Three.js dynamic canvas, shaders, and inline assets
  crossOriginEmbedderPolicy: false
}));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /client or /app/src/main/assets/web
const clientPath = path.join(__dirname, '..', 'client');
const androidWebPath = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'web');

app.use(express.static(clientPath));
app.use('/android-assets', express.static(androidWebPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/garage', garageRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/social', socialRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    game: 'RACEFORGE',
    version: '1.0.0',
    database: db.isLiveDb() ? 'MySQL_CONNECTED' : 'IN_MEMORY_RESILIENT_ENGINE',
    timestamp: new Date().toISOString()
  });
});

// Fallback SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Initialize Sockets
const multiplayerHandler = new MultiplayerHandler(io);
multiplayerHandler.initialize();

// Start Server
async function startServer() {
  await db.initDb();

  server.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🏎️  RACEFORGE GAME ENGINE & MULTIPLAYER SERVER ONLINE`);
    console.log(`🏁  Port: http://localhost:${config.port}`);
    console.log(`🔧  Environment: ${config.nodeEnv}`);
    console.log(`🛡️  Authoritative Anti-Cheat & Validation Active`);
    console.log(`=======================================================`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server };
