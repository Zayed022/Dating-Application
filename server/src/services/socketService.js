const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Track online users: userId -> socketId
const onlineUsers = new Map();

const setupSocketHandlers = (io) => {
  // ─── Auth middleware ──────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('_id name photos');
      if (!user) return next(new Error('User not found'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 User connected: ${socket.user.name} (${socket.id})`);

    // Join personal room for direct notifications
    socket.join(`user:${userId}`);

    // Track online
    onlineUsers.set(userId, socket.id);
    io.emit('user-online', userId);

    // ─── Chat rooms ────────────────────────────────────────────────────────
    socket.on('join-chat', ({ matchId }) => {
      socket.join(`chat:${matchId}`);
      console.log(`${socket.user.name} joined chat: ${matchId}`);
    });

    socket.on('leave-chat', ({ matchId }) => {
      socket.leave(`chat:${matchId}`);
    });

    // ─── Typing ────────────────────────────────────────────────────────────
    socket.on('typing', ({ matchId, isTyping }) => {
      socket.to(`chat:${matchId}`).emit('typing', {
        matchId,
        userId,
        isTyping,
      });
    });

    // ─── Message seen ──────────────────────────────────────────────────────
    socket.on('message-seen', ({ matchId }) => {
      socket.to(`chat:${matchId}`).emit('message-seen', {
        matchId,
        seenBy: userId,
      });
    });

    // ─── Calls ────────────────────────────────────────────────────────────
    socket.on('call-initiate', ({ matchId, type }) => {
      const callId = `call_${Date.now()}`;
      socket.to(`user:${matchId}`).emit('call-incoming', {
        callId,
        callerId: userId,
        callerName: socket.user.name,
        callerPhoto: socket.user.photos?.[0],
        type,
      });
      console.log(`📞 Call initiated: ${socket.user.name} -> ${matchId} (${type})`);
    });

    socket.on('call-accept', ({ callId }) => {
      socket.broadcast.emit('call-accepted', { callId });
    });

    socket.on('call-decline', ({ callId }) => {
      socket.broadcast.emit('call-declined', { callId });
    });

    socket.on('call-end', ({ callId }) => {
      socket.broadcast.emit('call-ended', callId);
    });

    // ─── Disconnect ────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
      console.log(`🔌 User disconnected: ${socket.user.name} (${reason})`);
      onlineUsers.delete(userId);
      io.emit('user-offline', userId);

      // Update last active
      User.findByIdAndUpdate(userId, { lastActive: new Date() }).catch(console.error);
    });
  });
};

const getOnlineUsers = () => onlineUsers;

module.exports = { setupSocketHandlers, getOnlineUsers };
