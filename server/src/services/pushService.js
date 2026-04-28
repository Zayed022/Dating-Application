const { Expo } = require('expo-server-sdk');

const expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });

/**
 * Send a push notification to one or more Expo push tokens.
 *
 * @param {string|string[]} pushTokens  - Expo push token(s) from device
 * @param {string} title                - Notification title
 * @param {string} body                 - Notification body text
 * @param {object} data                 - Extra data for navigation on tap
 * @param {string} channelId            - Android channel (default | messages | matches)
 */
const sendPushNotification = async (pushTokens, title, body, data = {}, channelId = 'default') => {
  const tokens = Array.isArray(pushTokens) ? pushTokens : [pushTokens];

  const messages = tokens
    .filter((token) => {
      if (!Expo.isExpoPushToken(token)) {
        console.warn(`❌ Invalid Expo push token: ${token}`);
        return false;
      }
      return true;
    })
    .map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
      channelId,
      badge: 1,
      priority: 'high',
    }));

  if (messages.length === 0) return;

  // Expo recommends chunking in batches of 100
  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      receipts.forEach((receipt) => {
        if (receipt.status === 'error') {
          console.error('❌ Push error:', receipt.message, receipt.details);
          if (receipt.details?.error === 'DeviceNotRegistered') {
            // TODO: remove the invalid token from the user document
            console.warn('Device not registered — should remove token from DB');
          }
        }
      });
    } catch (error) {
      console.error('❌ Push send failed:', error);
    }
  }
};

/**
 * Convenience helpers for common notification types
 */
const pushNotifications = {
  newMatch: async (pushToken, matcherName) => {
    if (!pushToken) return;
    await sendPushNotification(
      pushToken,
      "It's a Match! 💘",
      `You and ${matcherName} liked each other!`,
      { type: 'match' },
      'matches'
    );
  },

  newMessage: async (pushToken, senderName, preview, matchId) => {
    if (!pushToken) return;
    await sendPushNotification(
      pushToken,
      senderName,
      preview,
      { type: 'message', matchId },
      'messages'
    );
  },

  superLike: async (pushToken, likerName) => {
    if (!pushToken) return;
    await sendPushNotification(
      pushToken,
      '⭐ Super Like!',
      `${likerName} super liked your profile!`,
      { type: 'like' },
      'default'
    );
  },

  buddyBooking: async (pushToken, bookerName, hours) => {
    if (!pushToken) return;
    await sendPushNotification(
      pushToken,
      'New Booking! 🤝',
      `${bookerName} wants to book you for ${hours} hours`,
      { type: 'buddy_request' },
      'default'
    );
  },

  blindDateMatch: async (pushToken) => {
    if (!pushToken) return;
    await sendPushNotification(
      pushToken,
      'Blind Date Match! 🎭',
      'Your anonymous date is ready. Start chatting!',
      { type: 'blind_date' },
      'default'
    );
  },

  travelJoin: async (pushToken, joinerName, destination) => {
    if (!pushToken) return;
    await sendPushNotification(
      pushToken,
      '✈️ New Travel Companion!',
      `${joinerName} joined your trip to ${destination}!`,
      { type: 'travel' },
      'default'
    );
  },
};

module.exports = { sendPushNotification, pushNotifications };
