const cloudinary = require('cloudinary').v2;
const { User, Report, Notification } = require('../models');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const formatUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.likedUsers;
  delete obj.dislikedUsers;
  delete obj.superLikedUsers;
  delete obj.blockedUsers;
  return obj;
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { bio, preferences, profileComplete } = req.body;

    const updates = {};
    if (bio !== undefined) updates.bio = bio;
    if (preferences) {
      const parsed = typeof preferences === 'string' ? JSON.parse(preferences) : preferences;
      updates.preferences = { ...req.user.preferences.toObject(), ...parsed };
    }
    if (profileComplete !== undefined) updates.profileComplete = profileComplete === 'true' || profileComplete === true;
    if (req.body.photos) {
      updates.photos = typeof req.body.photos === 'string' ? JSON.parse(req.body.photos) : req.body.photos;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: formatUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.uploadPhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo provided' });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `sparq/users/${req.user._id}`, transformation: [{ width: 800, height: 1067, crop: 'fill', quality: 'auto' }] },
        (err, result) => err ? reject(err) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    await User.findByIdAndUpdate(req.user._id, { $push: { photos: result.secure_url } });

    res.json({ success: true, data: { url: result.secure_url } });
  } catch (error) {
    next(error);
  }
};

exports.deletePhoto = async (req, res, next) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) return res.status(400).json({ success: false, message: 'Photo URL required' });

    const user = await User.findById(req.user._id);
    if (!user.photos.includes(photoUrl)) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }

    // Extract public_id from URL and delete from Cloudinary
    const publicId = photoUrl.split('/').slice(-2).join('/').split('.')[0];
    await cloudinary.uploader.destroy(publicId).catch(console.error);

    await User.findByIdAndUpdate(req.user._id, { $pull: { photos: photoUrl } });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password -likedUsers -dislikedUsers -blockedUsers -superLikedUsers');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Check if requester is blocked
    if (user.blockedUsers?.includes(req.user._id)) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

exports.reportUser = async (req, res, next) => {
  try {
    const { userId, reason, details } = req.body;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot report yourself' });
    }

    const reportedUser = await User.findById(userId);
    if (!reportedUser) return res.status(404).json({ success: false, message: 'User not found' });

    await Report.create({ reporter: req.user._id, reported: userId, reason, details });

    res.json({ success: true, data: null, message: 'Report submitted. Thank you for keeping Sparq safe.' });
  } catch (error) {
    next(error);
  }
};

exports.blockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot block yourself' });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { blockedUsers: userId } });
    res.json({ success: true, data: null, message: 'User blocked' });
  } catch (error) {
    next(error);
  }
};

exports.unblockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $pull: { blockedUsers: userId } });
    res.json({ success: true, data: null, message: 'User unblocked' });
  } catch (error) {
    next(error);
  }
};
