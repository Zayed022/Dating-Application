import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Image, Animated, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing } from '../../constants';

const { width: W } = Dimensions.get('window');

export default function MatchModal() {
  const { isMatchModalVisible, matchedUser, hideMatchModal } = useUIStore();
  const { user } = useAuthStore();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isMatchModalVisible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(heartAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(heartAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      heartAnim.setValue(0);
    }
  }, [isMatchModalVisible]);

  const heartScale = heartAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });

  const myPhoto = user?.photos[0] || `https://ui-avatars.com/api/?name=${user?.name ?? 'Me'}&background=FF3D6B&color=fff`;
  const theirPhoto = matchedUser?.photo || `https://ui-avatars.com/api/?name=${matchedUser?.name ?? 'Match'}&background=FF8C42&color=fff`;

  return (
    <Modal
      visible={isMatchModalVisible}
      transparent
      animationType="none"
      onRequestClose={hideMatchModal}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <LinearGradient
          colors={['rgba(255,61,107,0.95)', 'rgba(255,140,66,0.95)']}
          style={StyleSheet.absoluteFill}
        />

        {/* Confetti dots (decorative) */}
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.confettiDot,
              {
                top: `${Math.random() * 40}%`,
                left: `${Math.random() * 100}%`,
                backgroundColor: i % 3 === 0 ? '#fff' : i % 3 === 1 ? '#FFD700' : '#FF69B4',
                width: 6 + Math.random() * 8,
                height: 6 + Math.random() * 8,
              },
            ]}
          />
        ))}

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.matchLabel}>It's a Match! 🎉</Text>
          <Text style={styles.matchSub}>
            You and {matchedUser?.name} liked each other!
          </Text>

          {/* Avatars */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: myPhoto }} style={styles.avatar} />
            </View>

            <Animated.Text style={[styles.heartCenter, { transform: [{ scale: heartScale }] }]}>
              💘
            </Animated.Text>

            <View style={styles.avatarWrapper}>
              <Image source={{ uri: theirPhoto }} style={styles.avatar} />
            </View>
          </View>

          <Text style={styles.names}>
            You & {matchedUser?.name}
          </Text>

          {/* Actions */}
          <TouchableOpacity
            style={styles.chatBtn}
            onPress={() => {
              hideMatchModal();
              if (matchedUser?.id) router.push(`/chat/${matchedUser.id}`);
            }}
          >
            <Text style={styles.chatBtnText}>Send a Message 💬</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.keepSwipingBtn} onPress={hideMatchModal}>
            <Text style={styles.keepSwipingText}>Keep Swiping 🔥</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  confettiDot: {
    position: 'absolute',
    borderRadius: 4,
    opacity: 0.7,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 28,
    padding: Spacing.xl,
    alignItems: 'center',
    width: W - 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backdropFilter: 'blur(10px)',
  },
  matchLabel: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  matchSub: {
    fontSize: Typography.sizes.base,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
    marginBottom: Spacing.lg,
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  avatar: { width: '100%', height: '100%' },
  heartCenter: {
    fontSize: 44,
    marginHorizontal: -10,
    zIndex: 10,
  },
  names: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  chatBtn: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  chatBtnText: {
    color: Colors.primary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
  },
  keepSwipingBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  keepSwipingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
});
