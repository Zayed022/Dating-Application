import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import authService from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing } from '../../constants';
import socketService from '../../services/socketService';

const GENDERS = ['Male', 'Female', 'Non-binary', 'Other'];

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');

  const { setUser, setTokens } = useAuthStore();

  const registerMutation = useMutation({
    mutationFn: () =>
      authService.register({
        name: name.trim(),
        email: email.trim(),
        password,
        age: parseInt(age),
        gender: gender.toLowerCase(),
      }),
      onSuccess: async (response) => {
        console.log('REGISTER SUCCESS:', response);
      
        const { data } = response; // correct extraction
      
        setTokens(data.tokens);
        setUser(data.user);
      
        await socketService.connect();
        router.replace('/(auth)/complete-profile');
      },
      onError: (error: any) => {
        console.log('AXIOS FULL ERROR:', error);
        console.log('AXIOS RESPONSE:', error?.response);
        console.log('AXIOS DATA:', error?.response?.data);
        console.log('AXIOS STATUS:', error?.response?.status);
      
        Alert.alert(
          'Error',
          error?.response?.data?.message ||
          error?.message ||
          'Registration failed'
        );
      },
  });

  const validateStep1 = () => {
    if (!name.trim()) return Alert.alert('Error', 'Please enter your name');
    if (!/\S+@\S+\.\S+/.test(email)) return Alert.alert('Error', 'Invalid email address');
    if (password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
    if (password !== confirmPassword) return Alert.alert('Error', 'Passwords do not match');
    setStep(2);
  };

  const validateStep2 = () => {
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) return Alert.alert('Error', 'Age must be between 18 and 100');
    if (!gender) return Alert.alert('Error', 'Please select your gender');
    registerMutation.mutate();
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
        {/* Header */}
        <View style={styles.header}>
          {step === 2 && (
            <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.title}>
            {step === 1 ? 'Create Account' : 'About You'}
          </Text>
          <Text style={styles.stepIndicator}>Step {step} of 2</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <LinearGradient
            colors={['#FF3D6B', '#FF8C42']}
            style={[styles.progressFill, { width: `${step * 50}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>

        {/* Step 1 */}
        {step === 1 && (
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoComplete="name"
              />
            </View>

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
                autoComplete="email"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 characters"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoComplete="new-password"
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
            </View>

            <TouchableOpacity style={styles.btn} onPress={validateStep1} activeOpacity={0.85}>
              <LinearGradient colors={['#FF3D6B', '#FF8C42']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Text style={styles.btnText}>Next →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                placeholder="Your age (18+)"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderGrid}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
                    onPress={() => setGender(g)}
                  >
                    <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.termsBox}>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                <Text style={styles.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.btn, registerMutation.isPending && styles.btnDisabled]}
              onPress={validateStep2}
              disabled={registerMutation.isPending}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#FF3D6B', '#FF8C42']} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {registerMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Create Account 🎉</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={() => router.back()} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>
            Already have an account?{' '}
            <Text style={styles.loginLinkHighlight}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, padding: Spacing.base, paddingTop: 60 },
  header: { marginBottom: Spacing.lg },
  backBtn: { marginBottom: Spacing.sm },
  backIcon: { fontSize: 22, color: Colors.textPrimary },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  stepIndicator: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  progressBg: {
    height: 4,
    backgroundColor: Colors.bgCard,
    borderRadius: 2,
    marginBottom: Spacing.xl,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  form: { flex: 1 },
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
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genderBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  genderBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}20`,
  },
  genderText: { color: Colors.textSecondary, fontSize: Typography.sizes.base },
  genderTextActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  termsBox: { marginBottom: Spacing.xl },
  termsText: { color: Colors.textMuted, fontSize: Typography.sizes.sm, lineHeight: 20 },
  termsLink: { color: Colors.primary },
  btn: { borderRadius: 14, overflow: 'hidden', marginBottom: Spacing.lg },
  btnDisabled: { opacity: 0.7 },
  gradient: { paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  loginLink: { alignItems: 'center', paddingBottom: Spacing.xl },
  loginLinkText: { color: Colors.textSecondary, fontSize: Typography.sizes.base },
  loginLinkHighlight: { color: Colors.primary, fontWeight: Typography.weights.semibold },
});
