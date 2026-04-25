import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation } from '@tanstack/react-query';
import { profileService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing } from '../../constants';

const { width: W } = Dimensions.get('window');

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, updateUser } = useAuthStore();
  const isOwnProfile = id === user?._id;

  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch other user's profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => profileService.getUserById(id!),
    enabled: !isOwnProfile && !!id,
    select: (res) => res.data,
  });

  const profile = isOwnProfile ? user : profileData;

  const updateMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('bio', bio);
      return profileService.updateProfile(formData);
    },
    onSuccess: ({ data }) => {
      updateUser(data);
      setIsEditing(false);
    },
    onError: () => Alert.alert('Error', 'Failed to update profile'),
  });

  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setIsUploading(true);
      try {
        const uri = result.assets[0].uri;
        const name = uri.split('/').pop() ?? 'photo.jpg';
        const formData = new FormData();
        formData.append('photo', { uri, name, type: `image/${name.split('.').pop()}` } as unknown as Blob);
        const { data } = await profileService.uploadPhoto(formData);
        updateUser({ photos: [...(user?.photos ?? []), data.url] });
      } catch {
        Alert.alert('Error', 'Failed to upload photo');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleReport = () => {
    Alert.alert(
      'Report User',
      'Why are you reporting this profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Fake Profile', onPress: () => submitReport('fake_profile') },
        { text: 'Inappropriate Content', onPress: () => submitReport('inappropriate') },
        { text: 'Harassment', onPress: () => submitReport('harassment') },
        { text: 'Spam', onPress: () => submitReport('spam') },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    try {
      await profileService.reportUser(id!, reason);
      Alert.alert('Reported', 'Thank you for keeping Sparq safe.');
    } catch {
      Alert.alert('Error', 'Could not submit report');
    }
  };

  const handleBlock = () => {
    Alert.alert('Block User', `Block ${profile?.name}? They won't be able to see your profile.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          await profileService.blockUser(id!);
          router.back();
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isOwnProfile ? 'My Profile' : profile.name}
          </Text>
          {!isOwnProfile && (
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleReport} style={styles.iconBtn}>
                <Text style={styles.iconBtnText}>🚨</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleBlock} style={styles.iconBtn}>
                <Text style={styles.iconBtnText}>🚫</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Photos grid */}
        <View style={styles.photoGrid}>
          {profile.photos.map((uri, i) => (
            <View key={i} style={styles.photoWrapper}>
              <Image source={{ uri }} style={styles.gridPhoto} />
              {isOwnProfile && isEditing && (
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={async () => {
                    await profileService.deletePhoto(uri);
                    updateUser({ photos: profile.photos.filter((_, idx) => idx !== i) });
                  }}
                >
                  <Text style={styles.removePhotoText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {isOwnProfile && isEditing && profile.photos.length < 6 && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <Text style={styles.addPhotoIcon}>+</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}, {profile.age}</Text>
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
            {profile.isPremium && <Text style={styles.premiumBadge}>💎</Text>}
          </View>

          {profile.location?.city && (
            <Text style={styles.location}>📍 {profile.location.city}{profile.location.country ? `, ${profile.location.country}` : ''}</Text>
          )}

          <View style={styles.divider} />

          {/* Bio */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>About</Text>
              {isOwnProfile && !isEditing && (
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {isOwnProfile && isEditing ? (
              <TextInput
                style={styles.bioInput}
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={300}
                placeholder="Tell people about yourself..."
                placeholderTextColor={Colors.textMuted}
                textAlignVertical="top"
              />
            ) : (
              <Text style={styles.bioText}>{profile.bio || 'No bio yet.'}</Text>
            )}
          </View>

          {/* Save/Cancel */}
          {isOwnProfile && isEditing && (
            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setBio(user?.bio ?? ''); setIsEditing(false); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, updateMutation.isPending && styles.btnDisabled]}
                onPress={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
              >
                <LinearGradient
                  colors={['#FF3D6B', '#FF8C42']}
                  style={styles.saveBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Preferences (own profile) */}
          {isOwnProfile && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>My Preferences</Text>
              <View style={styles.prefRow}>
                <View style={styles.prefChip}>
                  <Text style={styles.prefLabel}>Age</Text>
                  <Text style={styles.prefValue}>{user?.preferences.ageMin}–{user?.preferences.ageMax}</Text>
                </View>
                <View style={styles.prefChip}>
                  <Text style={styles.prefLabel}>Distance</Text>
                  <Text style={styles.prefValue}>{user?.preferences.maxDistance} km</Text>
                </View>
                <View style={styles.prefChip}>
                  <Text style={styles.prefLabel}>Gender</Text>
                  <Text style={styles.prefValue} numberOfLines={1}>
                    {user?.preferences.genders.join(', ')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Details for other's profile */}
          {!isOwnProfile && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailChip}>
                  <Text style={styles.detailEmoji}>🎂</Text>
                  <Text style={styles.detailText}>{profile.age} years old</Text>
                </View>
                <View style={styles.detailChip}>
                  <Text style={styles.detailEmoji}>🚻</Text>
                  <Text style={styles.detailText}>{profile.gender}</Text>
                </View>
                {profile.isPremium && (
                  <View style={styles.detailChip}>
                    <Text style={styles.detailEmoji}>💎</Text>
                    <Text style={styles.detailText}>Premium member</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const PHOTO_SIZE = (W - 32 - 8) / 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.textSecondary },
  scroll: { paddingBottom: 60 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: Colors.textPrimary },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 6 },
  iconBtnText: { fontSize: 20 },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.base,
    gap: 4,
  },
  photoWrapper: { position: 'relative' },
  gridPhoto: { width: PHOTO_SIZE, height: PHOTO_SIZE * 1.33, borderRadius: 10 },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  addPhotoBtn: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.33,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  addPhotoIcon: { fontSize: 28, color: Colors.textMuted },
  info: { padding: Spacing.base },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  name: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  verifiedBadge: {
    backgroundColor: `${Colors.primary}20`,
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedText: { color: Colors.primary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  premiumBadge: { fontSize: 18 },
  location: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, marginBottom: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editLink: { color: Colors.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  bioText: { color: Colors.textPrimary, fontSize: Typography.sizes.base, lineHeight: 24 },
  bioInput: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.base,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    minHeight: 100,
  },
  editActions: { flexDirection: 'row', gap: 10, marginBottom: Spacing.xl },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: Typography.weights.medium },
  saveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  btnDisabled: { opacity: 0.7 },
  saveBtnGradient: { paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: Typography.weights.bold },
  prefRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  prefChip: {
    backgroundColor: Colors.bgCard,
    borderRadius: 10,
    padding: Spacing.sm,
    alignItems: 'center',
    minWidth: 80,
  },
  prefLabel: { color: Colors.textMuted, fontSize: Typography.sizes.xs, marginBottom: 2 },
  prefValue: { color: Colors.textPrimary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  detailEmoji: { fontSize: 16 },
  detailText: { color: Colors.textPrimary, fontSize: Typography.sizes.sm },
});
