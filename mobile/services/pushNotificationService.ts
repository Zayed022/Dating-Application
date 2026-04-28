import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { notificationService } from './userService';

// ─── How notifications look when app is in foreground ────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Register for push notifications ─────────────────────────────────────────
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!Device.isDevice) {
    console.log('📲 Push notifications require a physical device');
    return null;
  }

  // Check / request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('📲 Push notification permission denied');
    return null;
  }

  // Android channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Sparq Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3D6B',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 100, 200, 100],
      lightColor: '#FF3D6B',
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('matches', {
      name: 'Matches',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  // Get Expo push token
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    console.log('📲 Push token:', token);

    // Save token to backend
    await notificationService.registerPushToken(token);
    return token;
  } catch (error) {
    console.error('📲 Failed to get push token:', error);
    return null;
  }
};

// ─── Navigation handler when user taps a notification ────────────────────────
export const setupNotificationListeners = () => {
  // Tapped while app is open (foreground)
  const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📲 Foreground notification:', notification.request.content.title);
    // You can update badge count, show in-app toast, etc.
  });

  // Tapped from notification tray (background / killed)
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, string>;
    handleNotificationNavigation(data);
  });

  return () => {
    foregroundSub.remove();
    responseSub.remove();
  };
};

const handleNotificationNavigation = (data: Record<string, string>) => {
  if (!data) return;

  // Navigate to the right screen based on notification type
  switch (data.type) {
    case 'match':
    case 'message':
      if (data.matchId) router.push(`/chat/${data.matchId}`);
      break;
    case 'like':
      router.push('/(tabs)/home');
      break;
    case 'buddy_request':
      router.push('/features/rent-buddy');
      break;
    case 'blind_date':
      router.push('/features/blind-date');
      break;
    case 'travel':
      router.push('/features/travel-mate');
      break;
    default:
      router.push('/features/notifications');
  }
};

// ─── Check initial notification (app opened by tapping notification) ──────────
export const checkInitialNotification = async () => {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (response) {
    const data = response.notification.request.content.data as Record<string, string>;
    // Small delay to let navigation stack initialize
    setTimeout(() => handleNotificationNavigation(data), 1000);
  }
};
