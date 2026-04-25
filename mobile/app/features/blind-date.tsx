import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blindDateService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { BlindDateRequest } from '../../types';
import { Colors, Typography, Spacing } from '../../constants';
import { format, addDays } from 'date-fns';

const GENDERS = ['male', 'female', 'non-binary', 'other'];
const TIME_SLOTS = ['Morning (9–12)', 'Afternoon (12–4)', 'Evening (6–9)', 'Night (9–12)'];

export default function BlindDateScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [ageMin, setAgeMin] = useState(22);
  const [ageMax, setAgeMax] = useState(32);
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['female']);
  const [selectedDate, setSelectedDate] = useState(0); // days from today
  const [selectedTime, setSelectedTime] = useState(TIME_SLOTS[2]);
  const [hasRequest, setHasRequest] = useState(false);

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['blind-date-requests'],
    queryFn: () => blindDateService.getMyRequests(),
    select: (res) => res.data,
  });

  const requests = requestsData ?? [];
  const activeRequest = requests.find((r) => r.status === 'pending' || r.status === 'matched');

  const createMutation = useMutation({
    mutationFn: () => {
      const date = addDays(new Date(), selectedDate + 1);
      return blindDateService.createRequest(
        { ageMin, ageMax, genders: selectedGenders },
        date.toISOString()
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blind-date-requests'] });
      Alert.alert('Request Submitted! 🎭', "We'll find your anonymous match soon!");
    },
    onError: () => Alert.alert('Error', 'Could not submit blind date request'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => blindDateService.cancelRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['blind-date-requests'] }),
  });

  const toggleGender = (g: string) => {
    setSelectedGenders((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const handleSubmit = () => {
    if (!user?.isPremium) {
      Alert.alert('Premium Feature', 'Blind Date requires Premium.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/features/premium') },
      ]);
      return;
    }
    if (selectedGenders.length === 0) return Alert.alert('Required', 'Select at least one gender');
    createMutation.mutate();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <LinearGradient
        colors={['#EC4899', '#F472B6', '#FB7185']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.heroEmoji}>🎭</Text>
        <Text style={styles.heroTitle}>Blind Date</Text>
        <Text style={styles.heroSubtitle}>Anonymous matching — discover the mystery!</Text>
      </LinearGradient>

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How it works</Text>
        <View style={styles.steps}>
          {[
            { icon: '📝', title: 'Set preferences', desc: 'Tell us what you\'re looking for' },
            { icon: '🔀', title: 'Get matched', desc: 'Our algorithm finds your anonymous match' },
            { icon: '💬', title: 'Chat blind', desc: 'Chat without seeing each other\'s photos' },
            { icon: '✨', title: 'Reveal!', desc: 'Both agree to reveal — magic happens!' },
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepIcon}><Text style={styles.stepEmoji}>{step.icon}</Text></View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Active request status */}
      {activeRequest && (
        <View style={styles.activeCard}>
          <View style={styles.activeCardHeader}>
            <Text style={styles.activeCardEmoji}>
              {activeRequest.status === 'matched' ? '✅' : '⏳'}
            </Text>
            <View>
              <Text style={styles.activeCardTitle}>
                {activeRequest.status === 'matched' ? 'Match Found!' : 'Request Pending'}
              </Text>
              <Text style={styles.activeCardSub}>
                {activeRequest.status === 'matched'
                  ? 'Your blind date is waiting!'
                  : 'Searching for your mystery match...'}
              </Text>
            </View>
          </View>
          {activeRequest.status === 'matched' && (
            <TouchableOpacity style={styles.revealBtn}>
              <Text style={styles.revealBtnText}>Start Blind Chat 💬</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.cancelReqBtn}
            onPress={() => cancelMutation.mutate(activeRequest._id)}
          >
            <Text style={styles.cancelReqText}>Cancel Request</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Form */}
      {!activeRequest && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Looking For</Text>
            <View style={styles.chipGroup}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, selectedGenders.includes(g) && styles.chipActive]}
                  onPress={() => toggleGender(g)}
                >
                  <Text style={[styles.chipText, selectedGenders.includes(g) && styles.chipTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Age Range: {ageMin}–{ageMax}</Text>
            <View style={styles.ageRow}>
              <TouchableOpacity style={styles.ageBtn} onPress={() => setAgeMin(Math.max(18, ageMin - 1))}>
                <Text style={styles.ageBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.ageDisplay}>{ageMin}</Text>
              <TouchableOpacity style={styles.ageBtn} onPress={() => setAgeMin(Math.min(ageMax - 1, ageMin + 1))}>
                <Text style={styles.ageBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.ageSep}>to</Text>
              <TouchableOpacity style={styles.ageBtn} onPress={() => setAgeMax(Math.max(ageMin + 1, ageMax - 1))}>
                <Text style={styles.ageBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.ageDisplay}>{ageMax}</Text>
              <TouchableOpacity style={styles.ageBtn} onPress={() => setAgeMax(Math.min(60, ageMax + 1))}>
                <Text style={styles.ageBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {Array.from({ length: 7 }, (_, i) => {
                const date = addDays(new Date(), i + 1);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dateChip, selectedDate === i && styles.dateChipActive]}
                    onPress={() => setSelectedDate(i)}
                  >
                    <Text style={[styles.dateDay, selectedDate === i && styles.dateDayActive]}>
                      {format(date, 'EEE')}
                    </Text>
                    <Text style={[styles.dateNum, selectedDate === i && styles.dateNumActive]}>
                      {format(date, 'd')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time Preference</Text>
            <View style={styles.chipGroup}>
              {TIME_SLOTS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, selectedTime === t && styles.chipActive]}
                  onPress={() => setSelectedTime(t)}
                >
                  <Text style={[styles.chipText, selectedTime === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#EC4899', '#F472B6']}
              style={styles.submitGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>🎭 Find My Blind Date</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { paddingBottom: 60 },
  hero: {
    paddingTop: 56,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
  },
  backBtn: { position: 'absolute', top: 56, left: Spacing.base, padding: 4 },
  backIcon: { fontSize: 22, color: '#fff' },
  heroEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  heroTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: '#fff', marginBottom: 4 },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.sizes.sm, textAlign: 'center' },
  section: { padding: Spacing.base, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.md },
  steps: { gap: 14 },
  step: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  stepEmoji: { fontSize: 20 },
  stepInfo: { flex: 1 },
  stepTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary, marginBottom: 2 },
  stepDesc: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  activeCard: { margin: Spacing.base, backgroundColor: Colors.bgCard, borderRadius: 18, padding: Spacing.base, borderWidth: 1, borderColor: Colors.border },
  activeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  activeCardEmoji: { fontSize: 32 },
  activeCardTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  activeCardSub: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  revealBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 10 },
  revealBtnText: { color: '#fff', fontWeight: Typography.weights.semibold },
  cancelReqBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelReqText: { color: Colors.textDanger, fontSize: Typography.sizes.sm },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  chipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}20` },
  chipText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm },
  chipTextActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  ageBtnText: { color: Colors.textPrimary, fontSize: 18, fontWeight: 'bold' },
  ageDisplay: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary, minWidth: 32, textAlign: 'center' },
  ageSep: { color: Colors.textMuted },
  dateScroll: { marginHorizontal: -4 },
  dateChip: { width: 52, marginHorizontal: 4, paddingVertical: 10, borderRadius: 14, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  dateChipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}20` },
  dateDay: { color: Colors.textMuted, fontSize: 11 },
  dateDayActive: { color: Colors.primary },
  dateNum: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  dateNumActive: { color: Colors.primary },
  submitBtn: { margin: Spacing.base, borderRadius: 16, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.7 },
  submitGradient: { paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
});
