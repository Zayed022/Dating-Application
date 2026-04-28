import * as Location from 'expo-location';
import api from './api';

export interface LocationData {
  coordinates: [number, number]; // [longitude, latitude]
  city?: string;
  country?: string;
}

/**
 * Requests permission and gets the user's current GPS location.
 * Returns null if denied or unavailable.
 */
export const getCurrentLocation = async (): Promise<LocationData | null> => {
  try {
    // 1. Ask for foreground permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('📍 Location permission denied');
      return null;
    }

    // 2. Get current position (accuracy: Balanced = ~100m, fast)
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { longitude, latitude } = position.coords;

    // 3. Reverse geocode to get city/country name
    let city: string | undefined;
    let country: string | undefined;

    try {
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      city = place?.city || place?.subregion || place?.region || undefined;
      country = place?.country || undefined;
    } catch {
      // Reverse geocode is optional — swallow errors
      console.log('📍 Reverse geocode failed (non-fatal)');
    }

    return {
      coordinates: [longitude, latitude], // MongoDB expects [lng, lat]
      city,
      country,
    };
  } catch (error) {
    console.error('📍 Location error:', error);
    return null;
  }
};

/**
 * Fetches location and saves it to the user's profile on the server.
 * Call this after login and periodically (e.g., when app foregrounds).
 */
export const updateUserLocation = async (): Promise<LocationData | null> => {
  const locationData = await getCurrentLocation();
  if (!locationData) return null;

  try {
    await api.patch('/users/location', {
      coordinates: locationData.coordinates,
      city: locationData.city,
      country: locationData.country,
    });
    console.log(`📍 Location updated: ${locationData.city}, ${locationData.country}`);
  } catch (error) {
    console.error('📍 Failed to save location to server:', error);
  }

  return locationData;
};

/**
 * Calculates straight-line distance between two [lng, lat] coordinate pairs.
 * Returns distance in kilometres.
 */
export const calculateDistanceKm = (
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number]
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};
