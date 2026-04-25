const { User, Match, Notification } = require('../models');

const SWIPE_DECK_SIZE = 20;

exports.getProfiles = async (req, res, next) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * SWIPE_DECK_SIZE;

    const excludeIds = [
      user._id,
      ...(user.likedUsers || []),
      ...(user.dislikedUsers || []),
      ...(user.superLikedUsers || []),
      ...(user.blockedUsers || []),
    ];

    const query = {
      _id: { $nin: excludeIds },
      gender: { $in: user.preferences.genders },
      age: { $gte: user.preferences.ageMin, $lte: user.preferences.ageMax },
      profileComplete: true,
      blockedUsers: { $nin: [user._id] },
      'photos.0': { $exists: true }, // At least one photo
    };

    // Location-based filter if coordinates are available
    if (user.location?.coordinates && user.location.coordinates[0] !== 0) {
      query.location = {
        $near: {
          $geometry: { type: 'Point', coordinates: user.location.coordinates },
          $maxDistance: user.preferences.maxDistance * 1000, // Convert km to meters
        },
      };
    }

    const profiles = await User.find(query)
      .select('name age gender bio photos location isPremium isVerified')
      .skip(skip)
      .limit(SWIPE_DECK_SIZE)
      .lean();

    // Calculate distances
    const profilesWithDistance = profiles.map((p) => {
      let distance = null;
      if (user.location?.coordinates && p.location?.coordinates) {
        const [lng1, lat1] = user.location.coordinates;
        const [lng2, lat2] = p.location.coordinates;
        const R = 6371;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lng2 - lng1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      }
      return { ...p, distance };
    });

    res.json({ success: true, data: profilesWithDistance });
  } catch (error) {
    next(error);
  }
};

exports.like = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUser = req.user;

    if (userId === currentUser._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot like yourself' });
    }

    // Free tier limit check
    if (!currentUser.isPremium) {
      const likedCount = currentUser.likedUsers?.length || 0;
      if (likedCount >= 10) {
        return res.status(403).json({
          success: false,
          message: 'Daily like limit reached. Upgrade to Premium for unlimited likes.',
          requiresPremium: true,
        });
      }
    }

    // Record the like
    await User.findByIdAndUpdate(currentUser._id, { $addToSet: { likedUsers: userId } });

    // Check for mutual like (match!)
    const targetUser = await User.findById(userId);
    const isMatch = targetUser?.likedUsers?.includes(currentUser._id) || targetUser?.superLikedUsers?.includes(currentUser._id);

    if (isMatch) {
      // Create match
      const existingMatch = await Match.findOne({ users: { $all: [currentUser._id, userId] } });

      if (!existingMatch) {
        const match = await Match.create({ users: [currentUser._id, userId] });

        // Notify both users
        await Promise.all([
          Notification.create({
            user: userId,
            type: 'match',
            title: "It's a Match! 💘",
            body: `You and ${currentUser.name} liked each other!`,
            data: { matchId: match._id },
          }),
          Notification.create({
            user: currentUser._id,
            type: 'match',
            title: "It's a Match! 💘",
            body: `You and ${targetUser.name} liked each other!`,
            data: { matchId: match._id },
          }),
        ]);

        // Emit socket event
        req.io?.to(`user:${userId}`).emit('new-match', {
          matchId: match._id,
          user: { _id: currentUser._id, name: currentUser.name, photos: currentUser.photos },
        });

        return res.json({ success: true, data: { isMatch: true, matchId: match._id } });
      }
    }

    res.json({ success: true, data: { isMatch: false } });
  } catch (error) {
    next(error);
  }
};

exports.dislike = async (req, res, next) => {
  try {
    const { userId } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { dislikedUsers: userId } });
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

exports.superLike = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const currentUser = req.user;

    // Free tier: 1 super like per day — simplified check
    await User.findByIdAndUpdate(currentUser._id, { $addToSet: { superLikedUsers: userId } });

    // Notify the target user
    await Notification.create({
      user: userId,
      type: 'like',
      title: '⭐ Super Like!',
      body: `${currentUser.name} super liked you!`,
      data: { userId: currentUser._id },
    });

    req.io?.to(`user:${userId}`).emit('super-liked', {
      userId: currentUser._id,
      name: currentUser.name,
      photo: currentUser.photos[0],
    });

    // Check mutual
    const targetUser = await User.findById(userId);
    const isMatch = targetUser?.likedUsers?.includes(currentUser._id) || targetUser?.superLikedUsers?.includes(currentUser._id);

    if (isMatch) {
      const existingMatch = await Match.findOne({ users: { $all: [currentUser._id, userId] } });
      if (!existingMatch) {
        const match = await Match.create({ users: [currentUser._id, userId] });
        return res.json({ success: true, data: { isMatch: true, matchId: match._id } });
      }
    }

    res.json({ success: true, data: { isMatch: false } });
  } catch (error) {
    next(error);
  }
};

exports.rewind = async (req, res, next) => {
  try {
    if (!req.user.isPremium) {
      return res.status(403).json({ success: false, message: 'Rewind requires Premium', requiresPremium: true });
    }

    const user = await User.findById(req.user._id);
    const lastLiked = user.likedUsers?.[user.likedUsers.length - 1];
    const lastDisliked = user.dislikedUsers?.[user.dislikedUsers.length - 1];

    let rewoundUserId = null;

    if (lastLiked || lastDisliked) {
      // Remove the most recent interaction
      if (lastDisliked) {
        await User.findByIdAndUpdate(req.user._id, { $pop: { dislikedUsers: 1 } });
        rewoundUserId = lastDisliked;
      } else if (lastLiked) {
        await User.findByIdAndUpdate(req.user._id, { $pop: { likedUsers: 1 } });
        rewoundUserId = lastLiked;
      }
    }

    res.json({ success: true, data: { userId: rewoundUserId } });
  } catch (error) {
    next(error);
  }
};
