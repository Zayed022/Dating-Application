import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from '@tanstack/react-query';
import { profileService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import { Colors, Typography, Spacing, Config } from '../../constants';

export default function CompleteProfileScreen() {
  const { user, updateUser } = useAuthStore();
  const [bio, setBio] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState('18');
  const [ageMax, setAgeMax] = useState('35');
  const [distance, setDistance] = useState('50');
  const [selectedGenders, setSelectedGenders] = useState<string[]>(['male', 'female']);
  const [isUploading, setIsUploading] = useState(false);

  const GENDERS = ['male', 'female', 'non-binary', 'other'];

  const toggleGender = (g: string) => {
    setSelectedGenders((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const pickImage = async () => {
    if (photos.length >= Config.MAX_PHOTOS) {
      return Alert.alert('Limit reached', `Maximum ${Config.MAX_PHOTOS} photos allowed`);
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        const uri = result.assets[0].uri;
        const name = uri.split('/').pop() ?? 'photo.jpg';
        const type = `image/${name.split('.').pop()}`;
        formData.append('photo', { uri, name, type } as unknown as Blob);

        const { data } = await profileService.uploadPhoto(formData);
        setPhotos((prev) => [...prev, data.url]);
      } catch {
        Alert.alert('Error', 'Failed to upload photo');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('bio', bio);
      formData.append('photos', JSON.stringify(photos));
      formData.append('preferences', JSON.stringify({
        ageMin: parseInt(ageMin),
        ageMax: parseInt(ageMax),
        genders: selectedGenders,
        maxDistance: parseInt(distance),
      }));
      formData.append('profileComplete', 'true');
      return profileService.updateProfile(formData);
    },
    onSuccess: ({ data }) => {
      updateUser({ ...data, profileComplete: true });
      router.replace('/(tabs)/home');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save profile');
    },
  });

  const handleSave = () => {
    if (photos.length === 0) return Alert.alert('Photos required', 'Please add at least one photo');
    if (!bio.trim()) return Alert.alert('Bio required', 'Please write a short bio');
    if (selectedGenders.length === 0) return Alert.alert('Required', 'Please select who you want to meet');
    saveMutation.mutate();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Help people get to know you ✨</Text>
      </View>

      {/* Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photos ({photos.length}/{Config.MAX_PHOTOS})</Text>
        <View style={styles.photoGrid}>
          {photos.map((uri, index) => (
            <View key={index} style={styles.photoItem}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity
                style={styles.removePhoto}
                onPress={() => removePhoto(index)}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < Config.MAX_PHOTOS && (
            <TouchableOpacity style={styles.addPhoto} onPress={pickImage} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator color={Colors.primary} />
              ) : (
                <>
                  <Text style={styles.addPhotoIcon}>+</Text>
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bio</Text>
        <TextInput
          style={styles.bioInput}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people about yourself..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={300}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{bio.length}/300</Text>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Looking For</Text>
        <View style={styles.genderGrid}>
          {GENDERS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.genderChip, selectedGenders.includes(g) && styles.genderChipActive]}
              onPress={() => toggleGender(g)}
            >
              <Text style={[styles.genderChipText, selectedGenders.includes(g) && styles.genderChipTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Age Range</Text>
        <View style={styles.rangeRow}>
          <View style={styles.rangeItem}>
            <Text style={styles.rangeLabel}>Min Age</Text>
            <TextInput
              style={styles.rangeInput}
              value={ageMin}
              onChangeText={setAgeMin}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          <Text style={styles.rangeDash}>—</Text>
          <View style={styles.rangeItem}>
            <Text style={styles.rangeLabel}>Max Age</Text>
            <TextInput
              style={styles.rangeInput}
              value={ageMax}
              onChangeText={setAgeMax}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Max Distance (km)</Text>
        <TextInput
          style={styles.input}
          value={distance}
          onChangeText={setDistance}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveBtn, saveMutation.isPending && styles.btnDisabled]}
        onPress={handleSave}
        disabled={saveMutation.isPending}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#FF3D6B', '#FF8C42']}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save & Continue 🚀</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.base, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: Spacing.xl },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.sizes.base },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoItem: { position: 'relative', width: 100, height: 134 },
  photo: { width: '100%', height: '100%', borderRadius: 12 },
  removePhoto: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  addPhoto: {
    width: 100,
    height: 134,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
  },
  addPhotoIcon: { fontSize: 28, color: Colors.textMuted, marginBottom: 4 },
  addPhotoText: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  bioInput: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.base,
    height: 120,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
  },
  charCount: {
    textAlign: 'right',
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: 4,
  },
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  genderChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.bgCard,
  },
  genderChipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}20` },
  genderChipText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm },
  genderChipTextActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rangeItem: { flex: 1 },
  rangeLabel: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginBottom: 4,
  },
  rangeInput: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  rangeDash: { color: Colors.textMuted, fontSize: 18, marginTop: 16 },
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
  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: Spacing.md },
  btnDisabled: { opacity: 0.7 },
  gradient: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
});
