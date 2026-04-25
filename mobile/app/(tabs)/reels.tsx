import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, ActivityIndicator, Image,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { reelsService } from '../../services/userService';
import { Reel } from '../../types';
import { Colors, Typography, Spacing } from '../../constants';
import { useAuthStore } from '../../store/authStore';

const { width: W, height: H } = Dimensions.get('window');
const REEL_HEIGHT = H;

export default function ReelsScreen() {
  const { user } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['reels'],
    queryFn: ({ pageParam = 1 }) => reelsService.getFeed(pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.pagination?.pages ?? 1;
      return allPages.length < total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    select: (data) => ({
      ...data,
      reels: data.pages.flatMap((p) => p.data),
    }),
  });

  const reels = (data as { reels: Reel[] } | undefined)?.reels ?? [];

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (reels.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🎬</Text>
        <Text style={styles.emptyText}>No reels yet</Text>
        <Text style={styles.emptySubtext}>Be the first to share your vibe!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reels}
        renderItem={({ item, index }) => (
          <ReelItem
            reel={item}
            isActive={index === currentIndex}
            userId={user?._id ?? ''}
          />
        )}
        keyExtractor={(item) => item._id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={REEL_HEIGHT}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : null}
        getItemLayout={(_, index) => ({
          length: REEL_HEIGHT,
          offset: REEL_HEIGHT * index,
          index,
        })}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
      />
    </View>
  );
}

function ReelItem({ reel, isActive, userId }: { reel: Reel; isActive: boolean; userId: string }) {
  const videoRef = useRef<Video>(null);
  const [isLiked, setIsLiked] = useState(reel.likes.includes(userId));
  const [likeCount, setLikeCount] = useState(reel.likes.length);
  const [showComments, setShowComments] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.playAsync().catch(() => {});
      } else {
        videoRef.current.pauseAsync().catch(() => {});
      }
    }
  }, [isActive]);

  const likeMutation = useMutation({
    mutationFn: () => reelsService.likeReel(reel._id),
    onMutate: () => {
      const newLiked = !isLiked;
      setIsLiked(newLiked);
      setLikeCount((c) => newLiked ? c + 1 : c - 1);
    },
    onError: () => {
      setIsLiked(isLiked);
      setLikeCount(reel.likes.length);
    },
  });

  const authorPhoto = reel.user.photos[0] || `https://ui-avatars.com/api/?name=${reel.user.name}&background=FF3D6B&color=fff`;

  return (
    <View style={styles.reel}>
      {/* Video */}
      <Video
        ref={videoRef}
        source={{ uri: reel.videoUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        isLooping
        shouldPlay={isActive}
        isMuted={false}
        useNativeControls={false}
      />

      {/* Overlay */}
      <View style={styles.reelOverlay}>
        {/* Right actions */}
        <View style={styles.reelActions}>
          <View style={styles.authorContainer}>
            <Image source={{ uri: authorPhoto }} style={styles.authorAvatar} />
            <View style={styles.followBtn}>
              <Text style={styles.followBtnText}>+</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => likeMutation.mutate()}
          >
            <Text style={styles.actionEmoji}>{isLiked ? '❤️' : '🤍'}</Text>
            <Text style={styles.actionCount}>{likeCount}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => setShowComments(true)}
          >
            <Text style={styles.actionEmoji}>💬</Text>
            <Text style={styles.actionCount}>{reel.comments.length}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <Text style={styles.actionEmoji}>↗️</Text>
            <Text style={styles.actionCount}>Share</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom info */}
        <View style={styles.reelInfo}>
          <Text style={styles.reelAuthor}>@{reel.user.name.toLowerCase().replace(' ', '_')}</Text>
          {reel.caption ? (
            <Text style={styles.reelCaption} numberOfLines={2}>{reel.caption}</Text>
          ) : null}
          <View style={styles.viewsRow}>
            <Text style={styles.viewCount}>👁 {reel.views.toLocaleString()} views</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyText: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  emptySubtext: { color: Colors.textSecondary, marginTop: 4 },
  reel: { width: W, height: REEL_HEIGHT, backgroundColor: '#000' },
  reelOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.base,
    paddingBottom: 100,
  },
  reelInfo: { flex: 1, marginRight: Spacing.md },
  reelAuthor: {
    color: '#fff',
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.base,
    marginBottom: 4,
  },
  reelCaption: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    marginBottom: 6,
  },
  viewsRow: { flexDirection: 'row' },
  viewCount: { color: 'rgba(255,255,255,0.6)', fontSize: Typography.sizes.xs },
  reelActions: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingBottom: 10,
  },
  authorContainer: { alignItems: 'center', marginBottom: 4 },
  authorAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff' },
  followBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -10,
  },
  followBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', lineHeight: 20 },
  actionItem: { alignItems: 'center' },
  actionEmoji: { fontSize: 28 },
  actionCount: {
    color: '#fff',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginTop: 2,
  },
  footerLoader: { height: REEL_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});
