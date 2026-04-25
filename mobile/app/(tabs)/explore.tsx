import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing } from '../../constants';

const FEATURES = [
  {
    id: 'rent-buddy',
    title: 'Rent a Buddy',
    subtitle: 'Find a companion for events',
    emoji: '🤝',
    gradient: ['#7C3AED', '#A78BFA'] as string[],
    route: '/features/rent-buddy',
  },
  {
    id: 'blind-date',
    title: 'Blind Date',
    subtitle: 'Anonymous matching magic',
    emoji: '🎭',
    gradient: ['#EC4899', '#F472B6'] as string[],
    route: '/features/blind-date',
  },
  {
    id: 'travel-mate',
    title: 'Travel Mate',
    subtitle: 'Find travel companions',
    emoji: '✈️',
    gradient: ['#0EA5E9', '#38BDF8'] as string[],
    route: '/features/travel-mate',
  },
  {
    id: 'premium',
    title: 'Go Premium',
    subtitle: 'Unlock all features',
    emoji: '💎',
    gradient: ['#F59E0B', '#FCD34D'] as string[],
    route: '/features/premium',
  },
];

const QUICK_ACTIONS = [
  { id: 'boost', emoji: '⚡', label: 'Boost' },
  { id: 'rewind', emoji: '↩️', label: 'Rewind' },
  { id: 'super-like', emoji: '⭐', label: 'Super' },
  { id: 'incognito', emoji: '🕵️', label: 'Incognito' },
];

export default function ExploreScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Discover special features ✨</Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.quickAction}
              onPress={() => router.push('/features/premium')}
            >
              <View style={styles.quickActionCircle}>
                <Text style={styles.quickActionEmoji}>{action.emoji}</Text>
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Feature Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Special Features</Text>
        <View style={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.featureCard}
              onPress={() => router.push(feature.route as never)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={feature.gradient}
                style={styles.featureGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Your Activity</Text>
          <View style={styles.statsGrid}>
            {[
              { label: 'Likes Given', value: '48' },
              { label: 'Matches', value: '12' },
              { label: 'Messages', value: '89' },
              { label: 'Profile Views', value: '234' },
            ].map((stat) => (
              <View key={stat.label} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 100 },
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: 56,
    paddingBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  section: { paddingHorizontal: Spacing.base, marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: { alignItems: 'center', gap: 6 },
  quickActionCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickActionEmoji: { fontSize: 26 },
  quickActionLabel: { color: Colors.textSecondary, fontSize: Typography.sizes.xs },
  featureGrid: { gap: 12 },
  featureCard: { borderRadius: 20, overflow: 'hidden' },
  featureGradient: {
    padding: Spacing.lg,
    minHeight: 110,
    justifyContent: 'flex-end',
  },
  featureEmoji: { fontSize: 36, marginBottom: Spacing.sm },
  featureTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: '#fff',
    marginBottom: 2,
  },
  featureSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.sizes.sm },
  statsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  statItem: { width: '50%', paddingVertical: Spacing.sm, alignItems: 'center' },
  statValue: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
});
