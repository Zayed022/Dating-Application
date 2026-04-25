const cloudinary = require('cloudinary').v2;
const Razorpay = require('razorpay');
const crypto = require('crypto');
const {
  Reel, BuddyListing, BlindDate, TravelListing,
  Subscription, Notification, User,
} = require('../models');

// ─── Reels Controller ─────────────────────────────────────────────────────────
exports.getReelsFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const total = await Reel.countDocuments({ isActive: true });
    const reels = await Reel.find({ isActive: true })
      .populate('user', 'name photos age isVerified isPremium')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: reels,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadReel = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No video provided' });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: `sparq/reels/${req.user._id}`, eager: [{ format: 'jpg', transformation: [{ start_offset: '0' }] }] },
        (err, result) => err ? reject(err) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    const reel = await Reel.create({
      user: req.user._id,
      videoUrl: result.secure_url,
      thumbnailUrl: result.eager?.[0]?.secure_url,
      caption: req.body.caption || '',
    });

    await reel.populate('user', 'name photos age');
    res.status(201).json({ success: true, data: reel });
  } catch (error) {
    next(error);
  }
};

exports.likeReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.reelId);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const userId = req.user._id;
    const liked = reel.likes.includes(userId);

    if (liked) {
      reel.likes.pull(userId);
    } else {
      reel.likes.push(userId);
    }
    await reel.save();

    res.json({ success: true, data: { liked: !liked, count: reel.likes.length } });
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Comment text required' });

    const reel = await Reel.findByIdAndUpdate(
      req.params.reelId,
      { $push: { comments: { user: req.user._id, text: text.trim() } } },
      { new: true }
    ).populate('comments.user', 'name photos');

    const newComment = reel.comments[reel.comments.length - 1];
    res.status(201).json({ success: true, data: newComment });
  } catch (error) {
    next(error);
  }
};

exports.incrementViews = async (req, res, next) => {
  try {
    await Reel.findByIdAndUpdate(req.params.reelId, { $inc: { views: 1 } });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

// ─── Buddy Controller ─────────────────────────────────────────────────────────
exports.getBuddyListings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const total = await BuddyListing.countDocuments({ isAvailable: true });
    const listings = await BuddyListing.find({ isAvailable: true })
      .populate('user', 'name age photos isVerified isPremium')
      .sort({ rating: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: listings,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.createBuddyListing = async (req, res, next) => {
  try {
    const { title, description, hourlyRate, currency, activities, location } = req.body;

    const existing = await BuddyListing.findOne({ user: req.user._id });
    if (existing) {
      await BuddyListing.findByIdAndUpdate(existing._id, req.body);
      const updated = await BuddyListing.findById(existing._id).populate('user', 'name age photos');
      return res.json({ success: true, data: updated });
    }

    const listing = await BuddyListing.create({
      user: req.user._id,
      title,
      description,
      hourlyRate,
      currency: currency || '₹',
      activities: activities || [],
      location,
    });
    await listing.populate('user', 'name age photos');
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

exports.bookBuddy = async (req, res, next) => {
  try {
    const { hours } = req.body;
    const listing = await BuddyListing.findById(req.params.listingId).populate('user', 'name');
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (!listing.isAvailable) return res.status(400).json({ success: false, message: 'This buddy is unavailable' });

    const amount = listing.hourlyRate * (hours || 1);

    // Create Razorpay order
    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: 'INR',
      receipt: `buddy_${listing._id}_${Date.now()}`,
    });

    await Notification.create({
      user: listing.user._id,
      type: 'buddy_request',
      title: 'New Booking Request! 🤝',
      body: `${req.user.name} wants to book you for ${hours} hour(s)`,
      data: { bookerId: req.user._id, listingId: listing._id },
    });

    res.json({
      success: true,
      data: { bookingId: order.id, paymentOrder: order },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Blind Date Controller ────────────────────────────────────────────────────
exports.createBlindDateRequest = async (req, res, next) => {
  try {
    const { preferences, scheduledFor } = req.body;

    const existing = await BlindDate.findOne({ user: req.user._id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending blind date request.' });
    }

    const request = await BlindDate.create({
      user: req.user._id,
      preferences,
      scheduledFor: new Date(scheduledFor),
    });

    // Try to find a match
    const potentialMatch = await BlindDate.findOne({
      _id: { $ne: request._id },
      status: 'pending',
      user: { $ne: req.user._id, $nin: req.user.blockedUsers || [] },
      'preferences.genders': req.user.gender,
    });

    if (potentialMatch) {
      request.status = 'matched';
      request.matchedUser = potentialMatch.user;
      request.matchedAt = new Date();

      potentialMatch.status = 'matched';
      potentialMatch.matchedUser = req.user._id;
      potentialMatch.matchedAt = new Date();

      await Promise.all([request.save(), potentialMatch.save()]);

      await Promise.all([
        Notification.create({
          user: potentialMatch.user,
          type: 'blind_date',
          title: '🎭 Blind Date Match!',
          body: 'Your blind date match is ready! Start chatting anonymously.',
          data: { requestId: potentialMatch._id },
        }),
        Notification.create({
          user: req.user._id,
          type: 'blind_date',
          title: '🎭 Blind Date Match!',
          body: 'Your blind date match is ready! Start chatting anonymously.',
          data: { requestId: request._id },
        }),
      ]);
    }

    await request.populate('user', 'name age photos');
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

exports.getMyBlindDateRequests = async (req, res, next) => {
  try {
    const requests = await BlindDate.find({ user: req.user._id })
      .populate('user', 'name age photos')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

exports.cancelBlindDateRequest = async (req, res, next) => {
  try {
    const request = await BlindDate.findOne({ _id: req.params.requestId, user: req.user._id });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    request.status = 'cancelled';
    await request.save();

    if (request.matchedUser) {
      await BlindDate.findOneAndUpdate(
        { user: request.matchedUser, status: 'matched' },
        { status: 'pending', matchedUser: null }
      );
    }

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

// ─── Travel Controller ────────────────────────────────────────────────────────
exports.getTravelListings = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    const total = await TravelListing.countDocuments({ status: 'open' });
    const listings = await TravelListing.find({ status: 'open' })
      .populate('user', 'name age photos isVerified')
      .sort({ departureDate: 1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: listings,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.createTravelListing = async (req, res, next) => {
  try {
    const { destination, departureDate, returnDate, description, lookingFor, maxCompanions } = req.body;

    const listing = await TravelListing.create({
      user: req.user._id,
      destination,
      departureDate: new Date(departureDate),
      returnDate: new Date(returnDate),
      description,
      lookingFor,
      maxCompanions: maxCompanions || 2,
    });

    await listing.populate('user', 'name age photos');
    res.status(201).json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

exports.joinTrip = async (req, res, next) => {
  try {
    const listing = await TravelListing.findById(req.params.listingId).populate('user', 'name');
    if (!listing) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (listing.status !== 'open') return res.status(400).json({ success: false, message: 'This trip is no longer accepting companions' });
    if (listing.user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot join your own trip' });
    }
    if (listing.companions.includes(req.user._id)) {
      return res.status(400).json({ success: false, message: 'Already joined this trip' });
    }

    listing.companions.push(req.user._id);
    if (listing.companions.length >= listing.maxCompanions) listing.status = 'full';
    await listing.save();

    await Notification.create({
      user: listing.user._id,
      type: 'travel',
      title: '✈️ New Travel Companion!',
      body: `${req.user.name} joined your trip to ${listing.destination}!`,
      data: { listingId: listing._id },
    });

    await listing.populate('user companions', 'name age photos');
    res.json({ success: true, data: listing });
  } catch (error) {
    next(error);
  }
};

// ─── Subscription Controller ──────────────────────────────────────────────────
const PLAN_CONFIG = {
  gold_monthly: { amount: 79900, name: 'Gold Monthly', planType: 'gold', durationDays: 30 },
  platinum_monthly: { amount: 149900, name: 'Platinum Monthly', planType: 'platinum', durationDays: 30 },
  platinum_annual: { amount: 999900, name: 'Platinum Annual', planType: 'platinum', durationDays: 365 },
};

exports.createOrder = async (req, res, next) => {
  try {
    const { planId } = req.body;
    const plan = PLAN_CONFIG[planId];
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

    const razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const order = await razorpay.orders.create({
      amount: plan.amount,
      currency: 'INR',
      receipt: `sub_${req.user._id}_${Date.now()}`,
    });

    await Subscription.create({
      user: req.user._id,
      planId,
      razorpayOrderId: order.id,
      amount: plan.amount / 100,
      status: 'pending',
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: plan.amount,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId } = req.body;

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature && process.env.NODE_ENV !== 'development') {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const plan = PLAN_CONFIG[planId];
    const expiresAt = new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000);

    await Subscription.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      { razorpayPaymentId: razorpay_payment_id, status: 'active', startsAt: new Date(), expiresAt }
    );

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { isPremium: true, premiumPlan: plan.planType, premiumExpiresAt: expiresAt },
      { new: true }
    );

    await Notification.create({
      user: req.user._id,
      type: 'system',
      title: '💎 Premium Activated!',
      body: `Welcome to ${plan.name}! Enjoy unlimited features.`,
    });

    res.json({ success: true, data: { isPremium: true, premiumPlan: plan.planType, premiumExpiresAt: expiresAt } });
  } catch (error) {
    next(error);
  }
};

exports.getMySubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ user: req.user._id, status: 'active' }).sort({ createdAt: -1 });
    res.json({ success: true, data: subscription });
  } catch (error) {
    next(error);
  }
};

// ─── Notifications Controller ─────────────────────────────────────────────────
exports.registerPushToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.user._id, { pushToken: token });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const total = await Notification.countDocuments({ user: req.user._id });
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      data: notifications,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.notificationId, user: req.user._id },
      { read: true }
    );
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};
