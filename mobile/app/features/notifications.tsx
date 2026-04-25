import { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/userService';
import { AppNotification } from '../../types';
import { Colors, Typography, Spacing } from '../../constants';
import { formatDistanceToNow } from 'date-fns';

const NOTIF_ICONS: Record<AppNotification['type'], string> = {
  match: '💘',
  message: '💬',
  like: '❤️',
  buddy_request: '🤝',
  blind_date: '🎭',
  travel: '✈️',
  system: '🔔',
};

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 1 }) => notificationService.getNotifications(pageParam as number),
    getNextPageParam: (lastPage: { pagination?: { pages?: number } }, pages: unknown[]) => {
      const total = lastPage.pagination?.pages ?? 1;
      return pages.length < total ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    select: (d) => ({ ...d, notifications: d.pages.flatMap((p: { data: AppNotification[] }) => p.data) }),
  });

  const notifications = (data as { notifications: AppNotification[] } | undefined)?.notifications ?? [];

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleNotifPress = useCallback((notif: AppNotification) => {
    if (!notif.read) markReadMutation.mutate(notif._id);

    switch (notif.type) {
      case 'match':
      case 'message':
        if (notif.data?.matchId) router.push(`/chat/${notif.data.matchId}`);
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
    }
  }, []);

  const renderItem = useCallback(({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.item, !item.read && styles.itemUnread]}
      onPress={() => handleNotifPress(item)}
      activeOpacity={0.75}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{NOTIF_ICONS[item.type]}</Text>
        {!item.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.itemTime}>
          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
        </Text>
      </View>
    </TouchableOpacity>
  ), [handleNotifPress]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {notifications.some((n) => !n.read) && (
          <TouchableOpacity onPress={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            <Text style={styles.markAllBtn}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySubtitle}>You're all caught up!</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: Colors.textPrimary },
  title: { flex: 1, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  markAllBtn: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  list: { paddingBottom: 100 },
  item: { flexDirection: 'row', padding: Spacing.base, gap: Spacing.md, alignItems: 'flex-start' },
  itemUnread: { backgroundColor: `${Colors.primary}08` },
  iconContainer: { position: 'relative' },
  icon: { fontSize: 28, width: 44, textAlign: 'center' },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.bg,
  },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: 3 },
  itemBody: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, lineHeight: 20, marginBottom: 4 },
  itemTime: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  separator: { height: 1, backgroundColor: Colors.border },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: 6 },
  emptySubtitle: { color: Colors.textSecondary },
});
