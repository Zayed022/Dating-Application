import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing } from '../../constants';
import authService from '../../services/authService';
import socketService from '../../services/socketService';

export default function MeScreen() {
  const { user, logout, tokens } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          if (tokens?.refreshToken) {
            await authService.logout(tokens.refreshToken);
          }
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const photo = user?.photos[0] || `https://ui-avatars.com/api/?name=${user?.name}&background=FF3D6B&color=fff&size=400`;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Image source={{ uri: photo }} style={styles.avatar} />
        {user?.isPremium && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>💎 {user.premiumPlan?.toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.name}, {user?.age}</Text>
        <Text style={styles.bio} numberOfLines={3}>{user?.bio || 'No bio yet...'}</Text>

        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push(`/profile/${user?._id}`)}
        >
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Premium Banner */}
      {!user?.isPremium && (
        <TouchableOpacity
          onPress={() => router.push('/features/premium')}
          style={styles.premiumBanner}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#F59E0B', '#EC4899']}
            style={styles.premiumBannerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.premiumBannerEmoji}>💎</Text>
            <View style={styles.premiumBannerText}>
              <Text style={styles.premiumBannerTitle}>Upgrade to Premium</Text>
              <Text style={styles.premiumBannerSub}>Unlimited likes, see who liked you</Text>
            </View>
            <Text style={styles.premiumBannerArrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        {[
          { icon: '📸', label: 'My Photos', onPress: () => router.push(`/profile/${user?._id}`) },
          { icon: '⚙️', label: 'Preferences', onPress: () => router.push(`/profile/${user?._id}`) },
          { icon: '🔔', label: 'Notifications', onPress: () => router.push('/features/notifications') },
          { icon: '💳', label: 'Subscription', onPress: () => router.push('/features/premium') },
        ].map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety</Text>

        {[
          { icon: '🚨', label: 'Safety Center', onPress: () => {} },
          { icon: '🚫', label: 'Blocked Users', onPress: () => {} },
          { icon: '🛡️', label: 'Privacy Settings', onPress: () => {} },
        ].map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>

        {[
          { icon: 'ℹ️', label: 'About Sparq', onPress: () => {} },
          { icon: '📋', label: 'Terms of Service', onPress: () => {} },
          { icon: '🔒', label: 'Privacy Policy', onPress: () => {} },
          { icon: '💬', label: 'Support', onPress: () => {} },
        ].map((item, idx) => (
          <TouchableOpacity key={idx} style={styles.menuItem} onPress={item.onPress}>
            <View style={styles.menuItemLeft}>
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Sparq v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 100 },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: Spacing.md,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  premiumBadge: {
    backgroundColor: `${Colors.secondary}30`,
    borderColor: Colors.secondary,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: Spacing.sm,
  },
  premiumBadgeText: { color: Colors.secondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  name: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  bio: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 8,
  },
  editBtnText: { color: Colors.primary, fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.sm },
  premiumBanner: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.md,
  },
  premiumBannerEmoji: { fontSize: 28 },
  premiumBannerText: { flex: 1 },
  premiumBannerTitle: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.base },
  premiumBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.sizes.xs },
  premiumBannerArrow: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  section: { marginBottom: Spacing.xl, paddingHorizontal: Spacing.base },
  sectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgCard,
    padding: Spacing.base,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  menuItemIcon: { fontSize: 20, width: 28 },
  menuItemLabel: { color: Colors.textPrimary, fontSize: Typography.sizes.base },
  menuItemArrow: { color: Colors.textMuted, fontSize: 20 },
  logoutBtn: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    backgroundColor: Colors.bgCard,
    padding: Spacing.base,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.textDanger}30`,
  },
  logoutBtnText: { color: Colors.textDanger, fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.base },
  version: { color: Colors.textMuted, fontSize: Typography.sizes.xs, textAlign: 'center', paddingBottom: Spacing.lg },
});
