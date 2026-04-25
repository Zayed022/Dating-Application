const { validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { generateTokens } = require('../middleware/auth');

const formatUser = (user) => ({
  _id: user._id,
  email: user.email,
  name: user.name,
  age: user.age,
  gender: user.gender,
  bio: user.bio,
  photos: user.photos,
  location: user.location,
  preferences: user.preferences,
  isPremium: user.isPremium,
  premiumPlan: user.premiumPlan,
  premiumExpiresAt: user.premiumExpiresAt,
  isVerified: user.isVerified,
  profileComplete: user.profileComplete,
  lastActive: user.lastActive,
  createdAt: user.createdAt,
});

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.mapped(), message: 'Validation failed' });
    }

    const { email, password, name, age, gender } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({ email, password, name, age, gender });
    const tokens = generateTokens(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: { user: formatUser(user), tokens },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.mapped(), message: 'Validation failed' });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });

    const tokens = generateTokens(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: { user: formatUser(user), tokens },
    });
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const tokens = generateTokens(user._id);
    res.json({ success: true, data: tokens });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
    next(error);
  }
};

exports.logout = async (req, res) => {
  // In production: maintain a token blacklist in Redis
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.getMe = async (req, res) => {
  res.json({ success: true, data: formatUser(req.user) });
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return 200 to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${token}`);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    const tokens = generateTokens(user._id);
    res.json({ success: true, message: 'Password reset successful', data: tokens });
  } catch (error) {
    next(error);
  }
};
