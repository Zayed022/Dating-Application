import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, ActivityIndicator, Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { travelService } from '../../services/userService';
import { TravelMateListing } from '../../types';
import { Colors, Typography, Spacing } from '../../constants';
import { format } from 'date-fns';

export default function TravelMateScreen() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [destination, setDestination] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [description, setDescription] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [maxCompanions, setMaxCompanions] = useState('2');

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['travel-listings'],
    queryFn: ({ pageParam = 1 }) => travelService.getListings(pageParam as number),
    getNextPageParam: (lastPage, pages) => {
      const total = lastPage.pagination?.pages ?? 1;
      return pages.length < total ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    select: (d) => ({ ...d, listings: d.pages.flatMap((p) => p.data) }),
  });

  const listings = (data as { listings: TravelMateListing[] } | undefined)?.listings ?? [];

  const createMutation = useMutation({
    mutationFn: () => travelService.createListing({
      destination,
      departureDate: new Date(departureDate).toISOString(),
      returnDate: new Date(returnDate).toISOString(),
      description,
      lookingFor,
      maxCompanions: parseInt(maxCompanions),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-listings'] });
      setShowCreate(false);
      Alert.alert('Posted! ✈️', 'Your travel listing is live!');
    },
    onError: () => Alert.alert('Error', 'Failed to create listing'),
  });

  const joinMutation = useMutation({
    mutationFn: (listingId: string) => travelService.joinTrip(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-listings'] });
      Alert.alert('Joined! 🌍', "You've joined the trip! Connect with your travel mate.");
    },
    onError: () => Alert.alert('Error', 'Could not join trip'),
  });

  const renderListing = ({ item }: { item: TravelMateListing }) => {
    const photo = item.user.photos[0] || `https://ui-avatars.com/api/?name=${item.user.name}&background=0EA5E9&color=fff`;
    const spotsLeft = item.maxCompanions - (item.companions?.length ?? 0);
    const isFull = item.status === 'full';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={['#0EA5E9', '#38BDF8']}
            style={styles.destinationBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.destinationIcon}>✈️</Text>
            <Text style={styles.destinationText}>{item.destination}</Text>
          </LinearGradient>
          <View style={[styles.statusBadge, isFull && styles.statusFull]}>
            <Text style={styles.statusText}>{isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.userRow}>
            <Image source={{ uri: photo }} style={styles.avatar} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.user.name}, {item.user.age}</Text>
              <Text style={styles.dates}>
                {format(new Date(item.departureDate), 'MMM d')} — {format(new Date(item.returnDate), 'MMM d, yyyy')}
              </Text>
            </View>
          </View>

          <Text style={styles.description} numberOfLines={3}>{item.description}</Text>

          {item.lookingFor && (
            <View style={styles.lookingRow}>
              <Text style={styles.lookingLabel}>Looking for: </Text>
              <Text style={styles.lookingText}>{item.lookingFor}</Text>
            </View>
          )}

          <View style={styles.cardFooter}>
            <View style={styles.companionsRow}>
              {Array.from({ length: item.maxCompanions }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.companionSlot, i < (item.companions?.length ?? 0) && styles.companionSlotFilled]}
                >
                  <Text style={styles.companionSlotText}>{i < (item.companions?.length ?? 0) ? '👤' : '+'}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.joinBtn, isFull && styles.joinBtnDisabled]}
              onPress={() => !isFull && joinMutation.mutate(item._id)}
              disabled={isFull || joinMutation.isPending}
            >
              <Text style={styles.joinBtnText}>{isFull ? 'Full' : 'Join Trip'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0EA5E9', '#38BDF8', '#7DD3FC']}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.heroEmoji}>✈️</Text>
        <Text style={styles.heroTitle}>Travel Mate</Text>
        <Text style={styles.heroSubtitle}>Find companions for your next adventure</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.createBtnText}>+ Post a Trip</Text>
        </TouchableOpacity>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌍</Text>
          <Text style={styles.emptyTitle}>No trips yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to plan an adventure!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.emptyBtnText}>Post a Trip ✈️</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={listings}
          renderItem={renderListing}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Modal */}
      <Modal
        visible={showCreate}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreate(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Post a Trip</Text>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {[
              { label: 'Destination', value: destination, setter: setDestination, placeholder: 'e.g. Goa, Maldives, Paris' },
              { label: 'Departure Date (YYYY-MM-DD)', value: departureDate, setter: setDepartureDate, placeholder: '2025-03-15' },
              { label: 'Return Date (YYYY-MM-DD)', value: returnDate, setter: setReturnDate, placeholder: '2025-03-22' },
              { label: 'Max Companions', value: maxCompanions, setter: setMaxCompanions, placeholder: '2', keyboard: 'number-pad' as const },
            ].map((field) => (
              <View key={field.label} style={styles.formGroup}>
                <Text style={styles.label}>{field.label}</Text>
                <TextInput
                  style={styles.input}
                  value={field.value}
                  onChangeText={field.setter}
                  placeholder={field.placeholder}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType={field.keyboard}
                />
              </View>
            ))}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Trip Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Tell others about your trip plan..."
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Looking For</Text>
              <TextInput
                style={styles.input}
                value={lookingFor}
                onChangeText={setLookingFor}
                placeholder="e.g. Female solo traveler, adventure enthusiast"
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
              onPress={() => {
                if (!destination || !departureDate || !returnDate || !description) {
                  return Alert.alert('Missing fields', 'Please fill all required fields');
                }
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
            >
              <LinearGradient
                colors={['#0EA5E9', '#38BDF8']}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Post Trip ✈️</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hero: {
    paddingTop: 56,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: { position: 'absolute', top: 56, left: Spacing.base, padding: 4 },
  backIcon: { fontSize: 22, color: '#fff' },
  heroEmoji: { fontSize: 44 },
  heroTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: '#fff' },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: Typography.sizes.sm, textAlign: 'center' },
  createBtn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 9, marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  createBtnText: { color: '#fff', fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.sm },
  list: { padding: Spacing.base, gap: 16, paddingBottom: 100 },
  card: { backgroundColor: Colors.bgCard, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingBottom: 0 },
  destinationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  destinationIcon: { fontSize: 14 },
  destinationText: { color: '#fff', fontWeight: Typography.weights.bold, fontSize: Typography.sizes.sm },
  statusBadge: { backgroundColor: `${Colors.online}20`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusFull: { backgroundColor: `${Colors.textDanger}20` },
  statusText: { color: Colors.online, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  cardBody: { padding: Spacing.base },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  userInfo: {},
  userName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  dates: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  description: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, lineHeight: 20, marginBottom: Spacing.sm },
  lookingRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm },
  lookingLabel: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  lookingText: { color: Colors.textPrimary, fontSize: Typography.sizes.xs, flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  companionsRow: { flexDirection: 'row', gap: 4 },
  companionSlot: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.border },
  companionSlotFilled: { backgroundColor: `${Colors.primary}20`, borderStyle: 'solid', borderColor: Colors.primary },
  companionSlotText: { fontSize: 12 },
  joinBtn: { backgroundColor: '#0EA5E9', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 9 },
  joinBtnDisabled: { backgroundColor: Colors.bgElevated },
  joinBtnText: { color: '#fff', fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: 6 },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  emptyBtn: { backgroundColor: '#0EA5E9', borderRadius: 16, paddingHorizontal: Spacing.xl, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: Typography.weights.semibold },
  modal: { flex: 1, backgroundColor: Colors.bgModal },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.base, paddingTop: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  modalClose: { fontSize: 22, color: Colors.textSecondary },
  modalContent: { padding: Spacing.base, paddingBottom: 60 },
  formGroup: { marginBottom: Spacing.base },
  label: { color: Colors.textSecondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, paddingHorizontal: Spacing.base, paddingVertical: 12, fontSize: Typography.sizes.base, color: Colors.textPrimary },
  textArea: { minHeight: 100 },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: Spacing.lg },
  submitBtnDisabled: { opacity: 0.7 },
  submitGradient: { paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
});
