import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Image, ActivityIndicator, TextInput, Alert, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { buddyService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { RentBuddyListing } from '../../types';
import { Colors, Typography, Spacing } from '../../constants';

const ACTIVITIES = [
  'Movie Date', 'Dinner', 'Concert', 'Gaming', 'Hiking',
  'Coffee', 'Shopping', 'Museum', 'Sports Event', 'Travel',
];

export default function RentBuddyScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'browse' | 'create'>('browse');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create listing form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [location, setLocation] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['buddy-listings'],
    queryFn: ({ pageParam = 1 }) => buddyService.getListings(pageParam as number),
    getNextPageParam: (lastPage, pages) => {
      const total = lastPage.pagination?.pages ?? 1;
      return pages.length < total ? pages.length + 1 : undefined;
    },
    initialPageParam: 1,
    select: (data) => ({ ...data, listings: data.pages.flatMap((p) => p.data) }),
  });

  const listings = (data as { listings: RentBuddyListing[] } | undefined)?.listings ?? [];

  const createMutation = useMutation({
    mutationFn: () => buddyService.createListing({
      title,
      description,
      hourlyRate: parseFloat(hourlyRate),
      currency: '₹',
      location,
      activities: selectedActivities,
      isAvailable: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddy-listings'] });
      setShowCreateModal(false);
      setTitle(''); setDescription(''); setHourlyRate(''); setLocation('');
      setSelectedActivities([]);
      Alert.alert('Success! 🎉', 'Your buddy listing is now live!');
    },
    onError: () => Alert.alert('Error', 'Failed to create listing'),
  });

  const bookMutation = useMutation({
    mutationFn: ({ listingId, hours }: { listingId: string; hours: number }) =>
      buddyService.bookBuddy(listingId, hours),
    onSuccess: () => Alert.alert('Booked! 🎉', 'Your buddy has been notified.'),
    onError: () => Alert.alert('Error', 'Booking failed'),
  });

  const handleBook = (listing: RentBuddyListing) => {
    if (!user?.isPremium) {
      Alert.alert('Premium Feature', 'Rent a Buddy requires Premium membership.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade', onPress: () => router.push('/features/premium') },
      ]);
      return;
    }
    Alert.alert(
      `Book ${listing.user.name}`,
      `₹${listing.hourlyRate}/hour`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: '2 Hours', onPress: () => bookMutation.mutate({ listingId: listing._id, hours: 2 }) },
        { text: '4 Hours', onPress: () => bookMutation.mutate({ listingId: listing._id, hours: 4 }) },
      ]
    );
  };

  const toggleActivity = (a: string) => {
    setSelectedActivities((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  };

  const renderListing = ({ item }: { item: RentBuddyListing }) => {
    const photo = item.user.photos[0] || `https://ui-avatars.com/api/?name=${item.user.name}&background=7C3AED&color=fff`;
    return (
      <View style={styles.card}>
        <Image source={{ uri: photo }} style={styles.cardPhoto} />
        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardName}>{item.user.name}</Text>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>⭐ {item.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={styles.activities}>
            {item.activities.slice(0, 3).map((a) => (
              <View key={a} style={styles.activityChip}>
                <Text style={styles.activityText}>{a}</Text>
              </View>
            ))}
            {item.activities.length > 3 && (
              <Text style={styles.moreActivities}>+{item.activities.length - 3}</Text>
            )}
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.price}>
              <Text style={styles.priceAmount}>₹{item.hourlyRate}</Text>
              <Text style={styles.priceUnit}> /hr</Text>
            </Text>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => handleBook(item)}
              disabled={!item.isAvailable}
            >
              <Text style={styles.bookBtnText}>
                {item.isAvailable ? 'Book Now' : 'Unavailable'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Rent a Buddy 🤝</Text>
          <Text style={styles.subtitle}>Find companions for any occasion</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createBtnText}>+ List</Text>
        </TouchableOpacity>
      </View>

      {/* Listings */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤝</Text>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to create a buddy listing!</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowCreateModal(true)}>
            <Text style={styles.emptyBtnText}>Create Listing</Text>
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

      {/* Create Listing Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Buddy Listing</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Movie night companion"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>About You</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe yourself and what you offer..."
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Hourly Rate (₹)</Text>
              <TextInput
                style={styles.input}
                value={hourlyRate}
                onChangeText={setHourlyRate}
                placeholder="500"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="City, Area"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Activities</Text>
              <View style={styles.activitiesGrid}>
                {ACTIVITIES.map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.activitySelect, selectedActivities.includes(a) && styles.activitySelectActive]}
                    onPress={() => toggleActivity(a)}
                  >
                    <Text style={[styles.activitySelectText, selectedActivities.includes(a) && styles.activitySelectTextActive]}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, createMutation.isPending && styles.submitBtnDisabled]}
              onPress={() => {
                if (!title || !description || !hourlyRate) return Alert.alert('Missing fields', 'Please fill all required fields');
                createMutation.mutate();
              }}
              disabled={createMutation.isPending}
            >
              <LinearGradient colors={['#7C3AED', '#A78BFA']} style={styles.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Listing 🚀</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: Colors.textPrimary },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  subtitle: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  createBtn: {
    marginLeft: 'auto',
    backgroundColor: `${Colors.accent}20`,
    borderColor: Colors.accent,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  createBtnText: { color: Colors.accentLight, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  list: { padding: Spacing.base, gap: 16, paddingBottom: 100 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardPhoto: { width: '100%', height: 180 },
  cardBody: { padding: Spacing.base },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: Colors.textPrimary },
  ratingBadge: { backgroundColor: `${Colors.secondary}20`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  ratingText: { color: Colors.secondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  cardTitle: { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: 4 },
  cardDesc: { color: Colors.textMuted, fontSize: Typography.sizes.xs, lineHeight: 18, marginBottom: Spacing.sm },
  activities: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm },
  activityChip: { backgroundColor: Colors.bgElevated, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  activityText: { color: Colors.textSecondary, fontSize: 10 },
  moreActivities: { color: Colors.textMuted, fontSize: 10, alignSelf: 'center' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  price: {},
  priceAmount: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.primary },
  priceUnit: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  bookBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
  },
  bookBtnText: { color: '#fff', fontWeight: Typography.weights.semibold, fontSize: Typography.sizes.sm },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: 6 },
  emptySubtitle: { color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  emptyBtn: { backgroundColor: Colors.accent, borderRadius: 16, paddingHorizontal: Spacing.xl, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: Typography.weights.semibold },
  modal: { flex: 1, backgroundColor: Colors.bgModal },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  modalClose: { fontSize: 22, color: Colors.textSecondary },
  modalContent: { padding: Spacing.base, paddingBottom: 60 },
  formGroup: { marginBottom: Spacing.base },
  label: { color: Colors.textSecondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: Spacing.base,
    paddingVertical: 12,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  textArea: { minHeight: 100 },
  activitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activitySelect: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activitySelectActive: { borderColor: Colors.accent, backgroundColor: `${Colors.accent}20` },
  activitySelectText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm },
  activitySelectTextActive: { color: Colors.accentLight, fontWeight: Typography.weights.semibold },
  submitBtn: { borderRadius: 14, overflow: 'hidden', marginTop: Spacing.lg },
  submitBtnDisabled: { opacity: 0.7 },
  submitGradient: { paddingVertical: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
});
