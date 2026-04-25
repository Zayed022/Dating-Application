import { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  Image, ActivityIndicator, Animated, PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { swipeService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { SwipeProfile } from '../../types';
import { Colors, Typography, Spacing } from '../../constants';
import MatchModal from '../../components/swipe/MatchModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.65;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { showMatchModal } = useUIStore();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-15deg', '0deg', '15deg'],
  });
  const likeOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const nopeOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['swipe-profiles'],
    queryFn: () => swipeService.getProfiles(),
    select: (res) => res.data,
    staleTime: 0,
  });

  const profiles = data ?? [];
  const currentProfile = profiles[currentIndex];

  const likeMutation = useMutation({
    mutationFn: (userId: string) => swipeService.like(userId),
    onSuccess: ({ data }) => {
      if (data.isMatch && data.matchId) {
        const matchedUser = profiles[currentIndex];
        if (matchedUser) {
          showMatchModal({
            id: data.matchId,
            name: matchedUser.name,
            photo: matchedUser.photos[0] ?? '',
          });
        }
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    },
  });

  const dislikeMutation = useMutation({
    mutationFn: (userId: string) => swipeService.dislike(userId),
  });

  const superLikeMutation = useMutation({
    mutationFn: (userId: string) => swipeService.superLike(userId),
    onSuccess: ({ data }) => {
      if (data.isMatch) {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
      }
    },
  });

  const nextCard = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
    setCurrentIndex((i) => {
      const next = i + 1;
      if (next >= profiles.length - 2) {
        refetch();
      }
      return next;
    });
  }, [profiles.length, refetch]);

  const swipeLeft = useCallback(() => {
    if (!currentProfile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(translateX, {
      toValue: -SCREEN_WIDTH * 1.5,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      translateX.setValue(0);
      dislikeMutation.mutate(currentProfile._id);
      nextCard();
    });
  }, [currentProfile, nextCard]);

  const swipeRight = useCallback(() => {
    if (!currentProfile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH * 1.5,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      translateX.setValue(0);
      likeMutation.mutate(currentProfile._id);
      nextCard();
    });
  }, [currentProfile, nextCard]);

  const superLike = useCallback(() => {
    if (!currentProfile) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.timing(translateY, {
      toValue: -SCREEN_HEIGHT,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      superLikeMutation.mutate(currentProfile._id);
      nextCard();
    });
  }, [currentProfile, nextCard]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(gesture.dx);
        translateY.setValue(gesture.dy * 0.3);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          swipeRight();
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          swipeLeft();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Finding matches...</Text>
      </View>
    );
  }

  const isEmpty = !currentProfile;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>Sparq 💘</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/features/notifications')}
          >
            <Text style={styles.headerBtnIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/features/premium')}
          >
            <Text style={styles.headerBtnIcon}>💎</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Deck */}
      <View style={styles.deck}>
        {isEmpty ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌟</Text>
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySubtitle}>
              Check back later for new people in your area.
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => { setCurrentIndex(0); refetch(); }}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Next card (behind) */}
            {profiles[currentIndex + 1] && (
              <ProfileCard
                profile={profiles[currentIndex + 1]}
                style={styles.behindCard}
                isAnimated={false}
              />
            )}

            {/* Current card */}
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [
                    { translateX },
                    { translateY },
                    { rotate },
                  ],
                },
              ]}
              {...panResponder.panHandlers}
            >
              {/* LIKE stamp */}
              <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
                <Text style={styles.stampText}>LIKE 💚</Text>
              </Animated.View>

              {/* NOPE stamp */}
              <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
                <Text style={styles.stampText}>NOPE 💔</Text>
              </Animated.View>

              <ProfileCard
                profile={currentProfile}
                onPress={() => router.push(`/profile/${currentProfile._id}`)}
              />
            </Animated.View>
          </>
        )}
      </View>

      {/* Action Buttons */}
      {!isEmpty && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={swipeLeft} activeOpacity={0.8}>
            <View style={[styles.actionCircle, styles.dislikeCircle]}>
              <Text style={styles.actionIcon}>✕</Text>
            </View>
            <Text style={styles.actionLabel}>Nope</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={superLike} activeOpacity={0.8}>
            <View style={[styles.actionCircle, styles.superLikeCircle]}>
              <Text style={styles.actionIcon}>⭐</Text>
            </View>
            <Text style={styles.actionLabel}>Super</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={swipeRight} activeOpacity={0.8}>
            <LinearGradient
              colors={['#FF3D6B', '#FF8C42']}
              style={[styles.actionCircle, styles.likeCircle]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.actionIcon}>♥</Text>
            </LinearGradient>
            <Text style={styles.actionLabel}>Like</Text>
          </TouchableOpacity>
        </View>
      )}

      <MatchModal />
    </View>
  );
}

function ProfileCard({
  profile,
  onPress,
  style,
  isAnimated = true,
}: {
  profile: SwipeProfile;
  onPress?: () => void;
  style?: object;
  isAnimated?: boolean;
}) {
  const [photoIndex, setPhotoIndex] = useState(0);

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.95}
      disabled={!onPress}
    >
      <Image
        source={{ uri: profile.photos[photoIndex] || `https://ui-avatars.com/api/?name=${profile.name}&background=FF3D6B&color=fff&size=400` }}
        style={styles.cardImage}
        resizeMode="cover"
      />

      {/* Photo dots */}
      {profile.photos.length > 1 && (
        <View style={styles.photoDots}>
          {profile.photos.map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dot, i === photoIndex && styles.dotActive]}
              onPress={() => setPhotoIndex(i)}
            />
          ))}
        </View>
      )}

      {/* Info overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.92)']}
        style={styles.cardGradient}
      >
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName}>{profile.name}, {profile.age}</Text>
            {profile.isVerified && <Text style={styles.verifiedBadge}>✓</Text>}
            {profile.isPremium && <Text style={styles.premiumBadge}>💎</Text>}
          </View>
          {profile.location?.city && (
            <Text style={styles.cardLocation}>📍 {profile.location.city}</Text>
          )}
          {profile.distance !== undefined && (
            <Text style={styles.cardDistance}>{profile.distance} km away</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, marginTop: Spacing.md, fontSize: Typography.sizes.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 56,
    paddingBottom: Spacing.md,
  },
  appName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.extrabold,
    color: Colors.textPrimary,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnIcon: { fontSize: 18 },
  deck: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    zIndex: 2,
  },
  behindCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    zIndex: 1,
    transform: [{ scale: 0.95 }],
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
  },
  cardImage: { width: '100%', height: '100%' },
  photoDots: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: { backgroundColor: '#fff' },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  cardInfo: {},
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: '#fff',
  },
  verifiedBadge: {
    backgroundColor: Colors.primary,
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  premiumBadge: { fontSize: 16 },
  cardLocation: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.sizes.sm },
  cardDistance: { color: 'rgba(255,255,255,0.6)', fontSize: Typography.sizes.xs, marginTop: 2 },
  stamp: {
    position: 'absolute',
    top: 40,
    zIndex: 10,
    borderWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  likeStamp: {
    right: 20,
    borderColor: '#22C55E',
    transform: [{ rotate: '15deg' }],
  },
  nopeStamp: {
    left: 20,
    borderColor: Colors.primary,
    transform: [{ rotate: '-15deg' }],
  },
  stampText: { fontSize: 22, fontWeight: Typography.weights.extrabold, color: '#fff' },
  emptyCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: Colors.bgCard,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: { fontSize: 64, marginBottom: Spacing.lg },
  emptyTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  refreshBtn: {
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: 20,
  },
  refreshBtnText: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
    paddingTop: 8,
    gap: 20,
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dislikeCircle: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  superLikeCircle: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: '#7C3AED' },
  likeCircle: {},
  actionIcon: { fontSize: 24 },
  actionLabel: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
});
