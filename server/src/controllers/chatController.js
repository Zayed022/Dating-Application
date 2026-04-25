const { Match, Message, User, Notification } = require('../models');

// ─── Match Controller ─────────────────────────────────────────────────────────
exports.getMatches = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const skip = (page - 1) * limit;

    const matches = await Match.find({
      users: req.user._id,
      isActive: true,
    })
      .populate({ path: 'users', select: 'name age photos isVerified isPremium lastActive' })
      .populate({ path: 'lastMessage', select: 'content type seen createdAt sender' })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = matches.map((match) => {
      const otherUser = match.users.find((u) => u._id.toString() !== req.user._id.toString());
      const unreadCount = match.unreadCounts?.[req.user._id.toString()] || 0;
      return {
        _id: match._id,
        user: otherUser,
        lastMessage: match.lastMessage,
        unreadCount,
        createdAt: match.createdAt,
        updatedAt: match.updatedAt,
      };
    });

    res.json({
      success: true,
      data: formatted,
      pagination: { page, limit },
    });
  } catch (error) {
    next(error);
  }
};

exports.unmatch = async (req, res, next) => {
  try {
    const match = await Match.findOne({
      _id: req.params.matchId,
      users: req.user._id,
    });

    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    match.isActive = false;
    await match.save();

    // Delete messages
    await Message.deleteMany({ matchId: match._id });

    res.json({ success: true, data: null, message: 'Unmatched successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── Chat Controller ──────────────────────────────────────────────────────────
exports.getMessages = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 30;
    const skip = (page - 1) * limit;

    // Verify user belongs to match
    const match = await Match.findOne({ _id: matchId, users: req.user._id, isActive: true });
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const total = await Message.countDocuments({ matchId });
    const messages = await Message.find({ matchId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { content, type = 'text' } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Message content required' });
    }

    // Verify match
    const match = await Match.findOne({ _id: matchId, users: req.user._id, isActive: true });
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const message = await Message.create({
      matchId,
      sender: req.user._id,
      content: content.trim(),
      type,
    });

    // Update match lastMessage and unreadCount for other user
    const otherUserId = match.users.find((u) => u.toString() !== req.user._id.toString());
    const unreadCounts = match.unreadCounts || new Map();
    unreadCounts.set(otherUserId.toString(), (unreadCounts.get(otherUserId.toString()) || 0) + 1);

    match.lastMessage = message._id;
    match.unreadCounts = unreadCounts;
    await match.save();

    // Emit socket event
    req.io?.to(`chat:${matchId}`).emit('new-message', {
      ...message.toObject(),
      matchId,
    });

    // Push notification to other user
    const otherUser = await User.findById(otherUserId).select('pushToken name');
    if (otherUser?.pushToken) {
      // TODO: Send push notification via Expo
      console.log(`Push: New message from ${req.user.name} to ${otherUser.name}`);
    }

    await Notification.create({
      user: otherUserId,
      type: 'message',
      title: `${req.user.name} sent you a message`,
      body: content.length > 50 ? content.substring(0, 50) + '...' : content,
      data: { matchId },
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

exports.markSeen = async (req, res, next) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findOne({ _id: matchId, users: req.user._id });
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    // Mark all unseen messages as seen
    await Message.updateMany(
      { matchId, sender: { $ne: req.user._id }, seen: false },
      { seen: true, seenAt: new Date() }
    );

    // Reset unread count for this user
    const unreadCounts = match.unreadCounts || new Map();
    unreadCounts.set(req.user._id.toString(), 0);
    match.unreadCounts = unreadCounts;
    await match.save();

    // Notify sender via socket
    req.io?.to(`chat:${matchId}`).emit('message-seen', {
      matchId,
      seenBy: req.user._id,
    });

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
