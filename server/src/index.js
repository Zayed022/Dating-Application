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
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
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

// Make io accessible to routes
app.use((req, _res, next) => { req.io = io; next(); });

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

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// 404 handler
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Something went wrong';
  res.status(status).json({ success: false, message });
});

// ─── Socket.io handlers ───────────────────────────────────────────────────────
setupSocketHandlers(io);

// ─── Database & Server ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI, {
    autoIndex: true,
  })
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = { app, io };
