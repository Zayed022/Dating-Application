// ─── Brand Colors ────────────────────────────────────────────────────────────
export const Colors = {
  primary: '#FF3D6B',      // Hot pink/red
  primaryDark: '#D4234F',
  primaryLight: '#FF6B8A',
  secondary: '#FF8C42',    // Warm orange
  accent: '#7C3AED',       // Purple
  accentLight: '#A78BFA',

  // Backgrounds
  bg: '#0D0D0D',
  bgCard: '#1A1A1A',
  bgElevated: '#242424',
  bgModal: '#1C1C1C',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A8A8A8',
  textMuted: '#666666',
  textDanger: '#FF4444',
  textSuccess: '#22C55E',

  // UI
  border: '#2A2A2A',
  borderLight: '#333333',
  overlay: 'rgba(0,0,0,0.75)',
  overlayLight: 'rgba(0,0,0,0.4)',

  // Status
  online: '#22C55E',
  away: '#EAB308',
  offline: '#6B7280',

  // Gradient presets
  gradientPrimary: ['#FF3D6B', '#FF8C42'] as string[],
  gradientDark: ['#1A1A1A', '#0D0D0D'] as string[],
  gradientCard: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.9)'] as string[],
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────
export const Typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  fonts: {
    heading: undefined, // System default (SF Pro / Roboto)
    body: undefined,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

// ─── App Config ──────────────────────────────────────────────────────────────
export const Config = {
  API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api',
  SOCKET_URL: process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:5000',
  CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
  RAZORPAY_KEY_ID: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
  MAX_PHOTOS: 6,
  SWIPE_DECK_SIZE: 10,
  MESSAGE_PAGE_SIZE: 30,
} as const;

// ─── Subscription Plans ──────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = [
  {
    id: 'gold_monthly',
    name: 'Gold',
    price: 799,
    currency: '₹',
    duration: 'monthly' as const,
    features: [
      'Unlimited likes',
      'See who liked you',
      '5 Super Likes/day',
      'Rewind last swipe',
      'Boost profile once/month',
    ],
  },
  {
    id: 'platinum_monthly',
    name: 'Platinum',
    price: 1499,
    currency: '₹',
    duration: 'monthly' as const,
    features: [
      'Everything in Gold',
      'Priority matching',
      'Message before matching',
      'Profile badge',
      'Advanced filters',
      'Incognito mode',
    ],
  },
  {
    id: 'platinum_annual',
    name: 'Platinum Annual',
    price: 9999,
    currency: '₹',
    duration: 'annual' as const,
    features: [
      'Everything in Platinum',
      'Best value — save 44%',
      '12 months of premium',
    ],
  },
] as const;

// ─── Storage Keys ────────────────────────────────────────────────────────────
export const StorageKeys = {
  ACCESS_TOKEN: 'sparq_access_token',
  REFRESH_TOKEN: 'sparq_refresh_token',
  USER: 'sparq_user',
  ONBOARDED: 'sparq_onboarded',
} as const;
