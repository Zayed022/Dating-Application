import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import authService from '../../services/authService';
import { Colors, Typography, Spacing } from '../../constants';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authService.forgotPassword(email.trim()),
    onSuccess: () => setSent(true),
    onError: () => Alert.alert('Error', 'Could not send reset email. Please try again.'),
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        {!sent ? (
          <>
            <Text style={styles.emoji}>🔐</Text>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password.
            </Text>

            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TouchableOpacity
              style={[styles.btn, mutation.isPending && styles.btnDisabled]}
              onPress={() => mutation.mutate()}
              disabled={mutation.isPending || !email.trim()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FF3D6B', '#FF8C42']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {mutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Send Reset Link</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.emoji}>📬</Text>
            <Text style={styles.title}>Email Sent!</Text>
            <Text style={styles.subtitle}>
              Check your inbox at{' '}
              <Text style={{ color: Colors.primary }}>{email}</Text> for the reset link.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
              <LinearGradient
                colors={['#FF3D6B', '#FF8C42']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.btnText}>Back to Sign In</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  back: { position: 'absolute', top: 60, left: Spacing.base, zIndex: 10 },
  backIcon: { fontSize: 22, color: Colors.textPrimary },
  content: { flex: 1, padding: Spacing.base, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 56, marginBottom: Spacing.lg },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.base,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
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
    width: '100%',
    marginBottom: Spacing.xl,
  },
  btn: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  btnDisabled: { opacity: 0.6 },
  gradient: { paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
});
