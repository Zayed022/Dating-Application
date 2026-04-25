const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── User Model ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, select: false, minlength: 8 },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    age: { type: Number, required: true, min: 18, max: 100 },
    gender: {
      type: String,
      required: true,
      enum: ['male', 'female', 'non-binary', 'other'],
      lowercase: true,
    },
    bio: { type: String, maxlength: 300, default: '' },
    photos: [{ type: String }],
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
      city: String,
      country: String,
    },
    preferences: {
      ageMin: { type: Number, default: 18 },
      ageMax: { type: Number, default: 40 },
      genders: { type: [String], default: ['male', 'female'] },
      maxDistance: { type: Number, default: 50 }, // km
    },
    isPremium: { type: Boolean, default: false },
    premiumPlan: { type: String, enum: ['gold', 'platinum', null], default: null },
    premiumExpiresAt: Date,
    isVerified: { type: Boolean, default: false },
    profileComplete: { type: Boolean, default: false },
    pushToken: String,
    lastActive: { type: Date, default: Date.now },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    likedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dislikedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    superLikedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform: (_, obj) => { delete obj.password; return obj; } },
  }
);

userSchema.index({ location: '2dsphere' });
userSchema.index({ age: 1, gender: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model('User', userSchema);

// ─── Match Model ──────────────────────────────────────────────────────────────
const matchSchema = new mongoose.Schema(
  {
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    isActive: { type: Boolean, default: true },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

matchSchema.index({ users: 1 });
matchSchema.index({ createdAt: -1 });

const Match = mongoose.model('Match', matchSchema);

// ─── Message Model ────────────────────────────────────────────────────────────
const messageSchema = new mongoose.Schema(
  {
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    type: { type: String, enum: ['text', 'image', 'gif'], default: 'text' },
    seen: { type: Boolean, default: false },
    seenAt: Date,
  },
  { timestamps: true }
);

messageSchema.index({ matchId: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

// ─── Reel Model ───────────────────────────────────────────────────────────────
const reelSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    videoUrl: { type: String, required: true },
    thumbnailUrl: String,
    caption: { type: String, maxlength: 300 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, maxlength: 500 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    views: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

reelSchema.index({ createdAt: -1 });

const Reel = mongoose.model('Reel', reelSchema);

// ─── Rent Buddy Model ─────────────────────────────────────────────────────────
const buddyListingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 500 },
    activities: [String],
    hourlyRate: { type: Number, required: true, min: 0 },
    currency: { type: String, default: '₹' },
    availability: [String],
    location: String,
    isAvailable: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const BuddyListing = mongoose.model('BuddyListing', buddyListingSchema);

// ─── Blind Date Model ─────────────────────────────────────────────────────────
const blindDateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    preferences: {
      ageMin: { type: Number, default: 18 },
      ageMax: { type: Number, default: 40 },
      genders: [String],
    },
    scheduledFor: Date,
    status: { type: String, enum: ['pending', 'matched', 'completed', 'cancelled'], default: 'pending' },
    matchedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    matchedAt: Date,
  },
  { timestamps: true }
);

blindDateSchema.index({ status: 1, 'preferences.genders': 1 });

const BlindDate = mongoose.model('BlindDate', blindDateSchema);

// ─── Travel Mate Model ────────────────────────────────────────────────────────
const travelListingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    destination: { type: String, required: true },
    departureDate: { type: Date, required: true },
    returnDate: { type: Date, required: true },
    description: { type: String, required: true, maxlength: 1000 },
    lookingFor: String,
    maxCompanions: { type: Number, default: 2, min: 1, max: 10 },
    companions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['open', 'full', 'completed'], default: 'open' },
  },
  { timestamps: true }
);

travelListingSchema.index({ destination: 'text' });
travelListingSchema.index({ departureDate: 1, status: 1 });

const TravelListing = mongoose.model('TravelListing', travelListingSchema);

// ─── Notification Model ───────────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['match', 'message', 'like', 'buddy_request', 'blind_date', 'travel', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: mongoose.Schema.Types.Mixed,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

// ─── Subscription Model ───────────────────────────────────────────────────────
const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    planId: { type: String, required: true },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    amount: Number,
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['pending', 'active', 'failed', 'cancelled'], default: 'pending' },
    startsAt: Date,
    expiresAt: Date,
  },
  { timestamps: true }
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);

// ─── Report Model ─────────────────────────────────────────────────────────────
const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reported: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    details: String,
    status: { type: String, enum: ['pending', 'reviewed', 'resolved'], default: 'pending' },
  },
  { timestamps: true }
);

const Report = mongoose.model('Report', reportSchema);

module.exports = {
  User,
  Match,
  Message,
  Reel,
  BuddyListing,
  BlindDate,
  TravelListing,
  Notification,
  Subscription,
  Report,
};
