require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const { setupSocketHandlers } = require('./services/socketService');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const swipeRoutes = require('./routes/swipe');
const matchRoutes = require('./routes/matches');
const chatRoutes = require('./routes/chat');
const reelsRoutes = require('./routes/reels');
const buddyRoutes = require('./routes/buddy');
const blindDateRoutes = require('./routes/blindDate');
const travelRoutes = require('./routes/travel');
const subscriptionRoutes = require('./routes/subscription');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────────────────────────
// IMPORTANT: Use polling first then upgrade to websocket.
// Pure websocket-only fails on Render's load balancer.
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['polling', 'websocket'], // polling first → then upgrade
  allowUpgrades: true,
  pingTimeout: 60000,   // 60s — survives Render's 55s idle window
  pingInterval: 25000,  // keepalive ping every 25s
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

// Only log in development — reduces Render log noise in production
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts. Please try again later.' },
});

app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// Make io accessible inside route handlers
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/swipe', swipeRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reels', reelsRoutes);
app.use('/api/buddy', buddyRoutes);
app.use('/api/blind-date', blindDateRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Health & connectivity endpoints ─────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    message: '🚀 Sparq server is running',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV,
  })
);
// Simple ping for mobile connectivity check
app.get('/api/ping', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌ Server error:', err);
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Something went wrong';
  res.status(status).json({ success: false, message });
});

// ─── Socket.io handlers ───────────────────────────────────────────────────────
setupSocketHandlers(io);

// ─── Database & Server ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI, { autoIndex: true })
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);

      // ── Keep Render free tier awake ─────────────────────────────────────────
      // Render sleeps after 15 min of inactivity. Ping ourselves every 14 min.
      if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
        const keepAliveUrl = `${process.env.RENDER_EXTERNAL_URL}/health`;
        console.log(`♻️  Keep-alive enabled → ${keepAliveUrl}`);
        setInterval(() => {
          fetch(keepAliveUrl)
            .then(() => console.log('♻️  Keep-alive ping sent'))
            .catch((err) => console.warn('♻️  Keep-alive failed:', err.message));
        }, 14 * 60 * 1000); // every 14 minutes
      }
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = { app, io };
