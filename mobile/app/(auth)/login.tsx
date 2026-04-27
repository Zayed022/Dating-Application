import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import authService from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { Config } from '../../constants';
import socketService from '../../services/socketService';

const { width: W, height: H } = Dimensions.get('window');

// ─── Animated Float Label Input ───────────────────────────────────────────────
function FloatInput({
  label, value, onChangeText, secureTextEntry,
  keyboardType, autoCapitalize, autoComplete, rightEl, error,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  secureTextEntry?: boolean; keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'sentences'; autoComplete?: 'email' | 'password' | 'new-password';
  rightEl?: React.ReactNode; error?: boolean;
}) {
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const animate = (toFocused: boolean) => {
    Animated.parallel([
      Animated.timing(labelAnim, {
        toValue: toFocused || value ? 1 : 0, duration: 180,
        easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
      Animated.timing(borderAnim, {
        toValue: toFocused ? 1 : 0, duration: 200, useNativeDriver: false,
      }),
    ]).start();
  };

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 8] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 10] });
  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.28)', error ? '#FF4466' : '#FF3560'],
  });
  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      error ? 'rgba(255,68,102,0.5)' : 'rgba(255,255,255,0.08)',
      error ? '#FF4466' : 'rgba(255,53,96,0.6)',
    ],
  });

  return (
    <Animated.View style={[styles.fieldWrap, { borderColor }, focused && styles.fieldFocused]}>
      <Animated.Text style={[styles.floatLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
        {label}
      </Animated.Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'none'}
        autoCorrect={false}
        autoComplete={autoComplete}
        onFocus={() => { setFocused(true); animate(true); }}
        onBlur={() => { setFocused(false); animate(false); }}
        selectionColor="#FF3560"
        placeholderTextColor="transparent"
        placeholder=" "
      />
      {rightEl && <View style={styles.fieldRight}>{rightEl}</View>}
    </Animated.View>
  );
}

// ─── Ambient orb ─────────────────────────────────────────────────────────────
function AmbientOrb({ color, size, top, left, delay }: {
  color: string; size: number; top: number; left: number; delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.9] });
  return (
    <Animated.View style={[styles.orb, { width: size, height: size, top, left, backgroundColor: color, transform: [{ scale }], opacity }]} />
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [btnState, setBtnState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const { setUser, setTokens } = useAuthStore();

  const logoAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(logoAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
      Animated.spring(badgeAnim, { toValue: 1, tension: 60, friction: 9, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(logoFloat, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const logoFloatY = logoFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });

  const loginMutation = useMutation({
    mutationFn: () => authService.login({ email: email.trim(), password }),
    onSuccess: async ({ data }) => {
      setBtnState('success');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTokens(data.tokens);
      setUser(data.user);
      await socketService.connect();
      setTimeout(() => {
        router.replace(data.user.profileComplete ? '/(tabs)/home' : '/(auth)/complete-profile');
      }, 600);
    },
    onError: (error: unknown) => {
      setBtnState('error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setBtnState('idle'), 1500);
      const err = error as { response?: { data?: { message?: string }; status?: number }; code?: string; message?: string };

      if (err?.code === 'ECONNREFUSED' || err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED' || err?.message?.toLowerCase().includes('network')) {
        Alert.alert('Cannot Reach Server',
          `Network error.\n\nFix:\n1. Backend must be running (npm run dev)\n2. Phone & PC on same Wi-Fi\n3. Edit mobile/.env — set your LAN IP\n\nCurrent URL: ${Config.API_URL}`);
      } else if (err?.response?.status === 401) {
        setEmailError(true); setPasswordError(true);
        Alert.alert('Invalid Credentials', 'Email or password is incorrect.');
      } else {
        Alert.alert('Login Failed', err?.response?.data?.message ?? 'An unexpected error occurred.');
      }
    },
  });

  const handleLogin = () => {
    setEmailError(false); setPasswordError(false);
    let hasError = false;
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) { setEmailError(true); hasError = true; }
    if (!password || password.length < 6) { setPasswordError(true); hasError = true; }
    if (hasError) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); return; }
    setBtnState('loading');
    loginMutation.mutate();
  };

  const getBtnContent = () => {
    if (btnState === 'loading') return <ActivityIndicator color="#fff" size="small" />;
    if (btnState === 'success') return <Text style={styles.btnLabel}>✓  Welcome back</Text>;
    if (btnState === 'error')   return <Text style={styles.btnLabel}>✕  Try again</Text>;
    return <Text style={styles.btnLabel}>Sign In  →</Text>;
  };

  const getBtnColors = (): [string, string] => {
    if (btnState === 'success') return ['#22C55E', '#16A34A'];
    if (btnState === 'error')   return ['#EF4444', '#DC2626'];
    return ['#FF3560', '#FF7A50'];
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <AmbientOrb color="rgba(255,53,96,0.15)"  size={300} top={-80}  left={-80}  delay={0} />
      <AmbientOrb color="rgba(255,122,80,0.10)" size={240} top={100}  left={W-180} delay={1000} />
      <AmbientOrb color="rgba(120,80,255,0.08)" size={200} top={H-280} left={-40} delay={2000} />

      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={20}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>

          {/* Hero */}
          <Animated.View style={[styles.hero, { opacity: logoAnim, transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}>
            <Animated.View style={{ transform: [{ translateY: logoFloatY }] }}>
              <View style={styles.logoOuter2}>
                <View style={styles.logoOuter1}>
                  <LinearGradient colors={['#FF3560', '#FF7A50']} style={styles.logoInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Text style={styles.logoEmoji}>💘</Text>
                  </LinearGradient>
                </View>
              </View>
            </Animated.View>
            <Text style={styles.wordmark}>SPARQ</Text>
            <Text style={styles.tagline}>FIND YOUR SPARK</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View style={{ opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }}>
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.cardTopBar} />
                <Text style={styles.cardEyebrow}>SIGN IN TO CONTINUE</Text>

                <FloatInput label="Email address" value={email} onChangeText={(v) => { setEmail(v); setEmailError(false); }}
                  keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={emailError}
                  rightEl={<Text style={[styles.fieldIconText, emailError && { color: '#FF4466' }]}>✉</Text>} />

                <FloatInput label="Password" value={password} onChangeText={(v) => { setPassword(v); setPasswordError(false); }}
                  secureTextEntry={!showPassword} autoComplete="password" error={passwordError}
                  rightEl={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.fieldIconText}>{showPassword ? '🙈' : '👁'}</Text>
                    </TouchableOpacity>
                  } />

                <TouchableOpacity style={styles.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleLogin} disabled={btnState === 'loading' || btnState === 'success'} activeOpacity={0.88} style={styles.btnWrap}>
                  <LinearGradient colors={getBtnColors()} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <View style={styles.btnShimmer} />
                    <View style={styles.btnContent}>{getBtnContent()}</View>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>NEW TO SPARQ?</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity style={styles.registerBtn} onPress={() => router.push('/(auth)/register')} activeOpacity={0.75}>
                  <Text style={styles.registerText}>Create your account</Text>
                  <Text style={styles.registerArrow}> →</Text>
                </TouchableOpacity>
              </View>
            </BlurView>
          </Animated.View>

          {/* Trust badges */}
          <Animated.View style={[styles.badgeRow, { opacity: badgeAnim, transform: [{ translateY: badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            {[{ dot: '#22C55E', label: '256-bit SSL' }, { dot: '#60A5FA', label: 'Privacy first' }, { dot: '#F472B6', label: '10M+ members' }].map((b) => (
              <View key={b.label} style={styles.badge}>
                <View style={[styles.badgeDot, { backgroundColor: b.dot }]} />
                <Text style={styles.badgeText}>{b.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Feature pills */}
          <Animated.View style={[styles.featRow, { opacity: badgeAnim }]}>
            {[{ icon: '🔥', label: 'Smart Match' }, { icon: '💬', label: 'Live Chat' }, { icon: '🎬', label: 'Reels' }, { icon: '🛡️', label: 'Verified' }].map((f) => (
              <View key={f.label} style={styles.featItem}>
                <View style={styles.featIcon}><Text style={styles.featIconText}>{f.icon}</Text></View>
                <Text style={styles.featLabel}>{f.label}</Text>
              </View>
            ))}
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09090C' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  orb: { position: 'absolute', borderRadius: 9999 },

  hero: { alignItems: 'center', paddingTop: 64, paddingBottom: 28 },
  logoOuter2: { width: 92, height: 92, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,53,96,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoOuter1: { width: 80, height: 80, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,53,96,0.25)', alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#FF3560', shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  logoEmoji: { fontSize: 34 },
  wordmark: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 28, fontWeight: '300', color: '#FFFFFF', letterSpacing: 10, marginBottom: 6 },
  tagline: { fontSize: 10, fontWeight: '400', color: 'rgba(255,255,255,0.25)', letterSpacing: 4 },

  card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardInner: { padding: 24, backgroundColor: 'rgba(15,15,20,0.6)' },
  cardTopBar: { height: 1, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: -24 },
  cardEyebrow: { fontSize: 10, fontWeight: '500', color: 'rgba(255,255,255,0.25)', letterSpacing: 2.5, marginBottom: 20 },

  fieldWrap: { height: 58, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 14, position: 'relative', justifyContent: 'center' },
  fieldFocused: { backgroundColor: 'rgba(255,53,96,0.05)' },
  floatLabel: { position: 'absolute', left: 16, fontWeight: '400', letterSpacing: 0.3 },
  fieldInput: { position: 'absolute', left: 16, right: 48, bottom: 8, fontSize: 15, fontWeight: '400', color: '#FFFFFF', padding: 0 },
  fieldRight: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  fieldIconText: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 20, marginTop: 2 },
  forgotText: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.3 },

  btnWrap: { borderRadius: 15, overflow: 'hidden', marginBottom: 20, elevation: 8 },
  btnGradient: { height: 54, borderRadius: 15, position: 'relative', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  btnShimmer: { position: 'absolute', top: 0, left: 0, right: 0, height: 27, backgroundColor: 'rgba(255,255,255,0.08)', borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  btnContent: { position: 'absolute', alignItems: 'center', justifyContent: 'center', left: 0, right: 0, top: 0, bottom: 0 },
  btnLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '500', letterSpacing: 0.5 },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  dividerText: { fontSize: 9, fontWeight: '500', color: 'rgba(255,255,255,0.2)', letterSpacing: 2 },

  registerBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { fontSize: 13, fontWeight: '400', color: '#FF3560', letterSpacing: 0.2 },
  registerArrow: { fontSize: 13, fontWeight: '500', color: '#FF3560' },

  badgeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '400', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.3 },

  featRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 18 },
  featItem: { alignItems: 'center', gap: 6, flex: 1 },
  featIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  featIconText: { fontSize: 18 },
  featLabel: { fontSize: 9, fontWeight: '400', color: 'rgba(255,255,255,0.25)', letterSpacing: 0.5, textAlign: 'center' },
});