import { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { matchService } from '../../services/userService';
import { Match } from '../../types';
import { Colors, Typography, Spacing } from '../../constants';
import { formatDistanceToNow } from 'date-fns';

export default function MatchesScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchService.getMatches(),
    select: (res) => res.data,
  });

  const matches = data ?? [];

  const renderMatch = useCallback(({ item }: { item: Match }) => {
    const photo = item.user.photos[0] || `https://ui-avatars.com/api/?name=${item.user.name}&background=FF3D6B&color=fff`;
    const timeAgo = item.lastMessage
      ? formatDistanceToNow(new Date(item.lastMessage.createdAt), { addSuffix: true })
      : formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

    return (
      <TouchableOpacity
        style={styles.matchItem}
        onPress={() => router.push(`/chat/${item._id}`)}
        activeOpacity={0.75}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: photo }} style={styles.avatar} />
          {/* Online indicator - would be from socket */}
          <View style={styles.onlineDot} />
        </View>

        <View style={styles.matchInfo}>
          <View style={styles.matchTopRow}>
            <Text style={styles.matchName}>{item.user.name}</Text>
            <Text style={styles.matchTime}>{timeAgo}</Text>
          </View>
          <View style={styles.matchBottomRow}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage ? item.lastMessage.content : "You matched! Say hi 👋"}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Text style={styles.subtitle}>{matches.length} matches</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💔</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySubtitle}>
            Start swiping to find your perfect match!
          </Text>
          <TouchableOpacity
            style={styles.discoverBtn}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Text style={styles.discoverBtnText}>Start Swiping 🔥</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
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
  list: { paddingBottom: 100 },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    gap: Spacing.md,
  },
  avatarContainer: { position: 'relative' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.online,
    borderWidth: 2,
    borderColor: Colors.bg,
  },
  matchInfo: { flex: 1 },
  matchTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  matchName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  matchTime: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  matchBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  lastMessage: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: Typography.weights.bold },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: 88 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  discoverBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: 25,
  },
  discoverBtnText: { color: '#fff', fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.base },
});
