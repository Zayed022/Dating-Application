import { useState } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import authService from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, StorageKeys } from '../../constants';
import socketService from '../../services/socketService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { setUser, setTokens } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: () => authService.login({ email: email.trim(), password }),
    onSuccess: async ({ data }) => {
      setTokens(data.tokens);
      setUser(data.user);
      await socketService.connect();

      if (!data.user.profileComplete) {
        router.replace('/(auth)/complete-profile');
      } else {
        router.replace('/(tabs)/home');
      }
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed. Please try again.';
      Alert.alert('Login Failed', message);
    },
  });

  const handleLogin = () => {
    if (!email.trim()) return Alert.alert('Error', 'Please enter your email');
    if (!password) return Alert.alert('Error', 'Please enter your password');
    if (!/\S+@\S+\.\S+/.test(email)) return Alert.alert('Error', 'Please enter a valid email');
    loginMutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['#FF3D6B', '#FF8C42']}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.logoIcon}>💘</Text>
          </LinearGradient>
          <Text style={styles.appName}>Sparq</Text>
          <Text style={styles.tagline}>Find your spark ✨</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.title}>Welcome back</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loginMutation.isPending && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FF3D6B', '#FF8C42']}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loginMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Sign In</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerBtnText}>
              New to Sparq?{' '}
              <Text style={styles.registerBtnHighlight}>Create account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: Spacing.base },
  hero: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: Spacing['2xl'],
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  logoIcon: { fontSize: 40 },
  appName: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: Typography.sizes.base,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  form: { flex: 1 },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  inputWrapper: { marginBottom: Spacing.base },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 4,
  },
  eyeIcon: { fontSize: 18 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: Spacing.xl },
  forgotText: {
    color: Colors.primary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
  },
  loginBtn: { borderRadius: 14, overflow: 'hidden', marginBottom: Spacing.lg },
  loginBtnDisabled: { opacity: 0.7 },
  gradient: { paddingVertical: 16, alignItems: 'center' },
  loginBtnText: {
    color: '#fff',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.bold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    marginHorizontal: Spacing.md,
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
  },
  registerBtn: { alignItems: 'center' },
  registerBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.base,
  },
  registerBtnHighlight: {
    color: Colors.primary,
    fontWeight: Typography.weights.semibold,
  },
});
