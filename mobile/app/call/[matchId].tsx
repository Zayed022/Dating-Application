import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  Animated, Easing,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { matchService } from '../../services/userService';
import socketService from '../../services/socketService';
import { Colors, Typography, Spacing } from '../../constants';

type CallState = 'ringing' | 'connected' | 'ended';

export default function CallScreen() {
  const { matchId, type = 'audio' } = useLocalSearchParams<{ matchId: string; type: 'audio' | 'video' }>();
  const insets = useSafeAreaInsets();

  const [callState, setCallState] = useState<CallState>('ringing');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callIdRef = useRef<string>(`call-${Date.now()}`);

  const { data: matchesData } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchService.getMatches(),
    select: (res) => res.data,
  });
  const match = matchesData?.find((m) => m._id === matchId);

  // Pulse animation for ringing state
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Simulate auto-connect after 3 seconds (in real app, socket handles this)
  useEffect(() => {
    if (callState !== 'ringing') return;
    socketService.initiateCall(matchId!, type as 'audio' | 'video');

    const timer = setTimeout(() => {
      setCallState('connected');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Call timer
  useEffect(() => {
    if (callState === 'connected') {
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  const handleEndCall = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    socketService.endCall(callIdRef.current);
    setCallState('ended');
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => router.back(), 1500);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const partnerPhoto = match?.user.photos[0] ||
    `https://ui-avatars.com/api/?name=${match?.user.name ?? 'U'}&background=FF3D6B&color=fff&size=400`;
  const isVideo = type === 'video';

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={isVideo ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#1A0A0F', '#2D0418', '#0D0D0D']}
        style={StyleSheet.absoluteFill}
      />

      {/* Video placeholder (camera feed would go here) */}
      {isVideo && callState === 'connected' && !isCameraOff && (
        <View style={styles.videoFeed}>
          <Image source={{ uri: partnerPhoto }} style={styles.videoBackground} blurRadius={8} />
          <View style={styles.videoOverlay} />
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.callType}>{isVideo ? '📹 Video Call' : '📞 Voice Call'}</Text>
        {callState === 'connected' && (
          <Text style={styles.timer}>{formatDuration(duration)}</Text>
        )}
      </View>

      {/* Center - Avatar */}
      <View style={styles.center}>
        {callState === 'ringing' ? (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={styles.ringEffect1}>
              <View style={styles.ringEffect2}>
                <Image source={{ uri: partnerPhoto }} style={styles.bigAvatar} />
              </View>
            </View>
          </Animated.View>
        ) : (
          <Image
            source={{ uri: partnerPhoto }}
            style={[styles.bigAvatar, callState === 'ended' && styles.avatarDimmed]}
          />
        )}

        <Text style={styles.callerName}>{match?.user.name ?? 'Match'}</Text>
        <Text style={styles.callStatus}>
          {callState === 'ringing' && 'Calling...'}
          {callState === 'connected' && '🟢 Connected'}
          {callState === 'ended' && 'Call ended'}
        </Text>
      </View>

      {/* Self preview (video only) */}
      {isVideo && callState === 'connected' && (
        <View style={styles.selfPreview}>
          <View style={styles.selfPreviewInner}>
            {isCameraOff ? (
              <View style={styles.cameraOff}>
                <Text style={styles.cameraOffIcon}>📷</Text>
              </View>
            ) : (
              <Image
                source={{ uri: `https://ui-avatars.com/api/?name=Me&background=333&color=fff&size=200` }}
                style={styles.selfVideo}
              />
            )}
          </View>
        </View>
      )}

      {/* Controls */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
        {callState !== 'ended' && (
          <>
            {/* Row 1 - Secondary controls */}
            <View style={styles.controlRow}>
              <TouchableOpacity
                style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
                onPress={() => { setIsMuted(!isMuted); Haptics.selectionAsync(); }}
              >
                <Text style={styles.controlBtnIcon}>{isMuted ? '🔇' : '🎤'}</Text>
                <Text style={styles.controlBtnLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, isSpeaker && styles.controlBtnActive]}
                onPress={() => { setIsSpeaker(!isSpeaker); Haptics.selectionAsync(); }}
              >
                <Text style={styles.controlBtnIcon}>{isSpeaker ? '🔊' : '🔈'}</Text>
                <Text style={styles.controlBtnLabel}>Speaker</Text>
              </TouchableOpacity>

              {isVideo && (
                <TouchableOpacity
                  style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
                  onPress={() => { setIsCameraOff(!isCameraOff); Haptics.selectionAsync(); }}
                >
                  <Text style={styles.controlBtnIcon}>{isCameraOff ? '📷' : '📸'}</Text>
                  <Text style={styles.controlBtnLabel}>{isCameraOff ? 'Camera Off' : 'Camera'}</Text>
                </TouchableOpacity>
              )}

              {!isVideo && (
                <TouchableOpacity style={styles.controlBtn}>
                  <Text style={styles.controlBtnIcon}>⌨️</Text>
                  <Text style={styles.controlBtnLabel}>Keypad</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* End call button */}
            <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall} activeOpacity={0.85}>
              <View style={styles.endCallCircle}>
                <Text style={styles.endCallIcon}>📵</Text>
              </View>
              <Text style={styles.endCallLabel}>End Call</Text>
            </TouchableOpacity>
          </>
        )}

        {callState === 'ended' && (
          <View style={styles.callEndedInfo}>
            <Text style={styles.callEndedText}>Call ended • {formatDuration(duration)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  videoFeed: { ...StyleSheet.absoluteFillObject },
  videoBackground: { width: '100%', height: '100%' },
  videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  header: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  callType: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.sizes.sm, marginBottom: 4 },
  timer: {
    color: '#fff',
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    fontVariant: ['tabular-nums'],
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringEffect1: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,61,107,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringEffect2: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,61,107,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigAvatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  avatarDimmed: { opacity: 0.5 },
  callerName: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: '#fff',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  callStatus: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.sizes.base },
  selfPreview: {
    position: 'absolute',
    top: 120,
    right: 20,
    width: 90,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  selfPreviewInner: { flex: 1, backgroundColor: Colors.bgCard },
  selfVideo: { width: '100%', height: '100%' },
  cameraOff: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#333' },
  cameraOffIcon: { fontSize: 28 },
  controls: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  controlBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: Spacing.md,
    minWidth: 70,
    gap: 6,
  },
  controlBtnActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  controlBtnIcon: { fontSize: 26 },
  controlBtnLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  endCallBtn: { alignItems: 'center', gap: 8 },
  endCallCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallIcon: { fontSize: 30 },
  endCallLabel: { color: 'rgba(255,255,255,0.7)', fontSize: Typography.sizes.sm },
  callEndedInfo: { alignItems: 'center', paddingBottom: Spacing.xl },
  callEndedText: { color: 'rgba(255,255,255,0.6)', fontSize: Typography.sizes.base },
});
