// ─── User & Auth ────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  email: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  bio: string;
  photos: string[];
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
    city?: string;
    country?: string;
  };
  preferences: {
    ageMin: number;
    ageMax: number;
    genders: string[];
    maxDistance: number;
  };
  isPremium: boolean;
  premiumPlan?: 'gold' | 'platinum';
  premiumExpiresAt?: string;
  isVerified: boolean;
  profileComplete: boolean;
  lastActive: string;
  createdAt: string;
  blockedUsers?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User) => void;
  setTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

// ─── Match & Chat ────────────────────────────────────────────────────────────

export interface Match {
  _id: string;
  user: User;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
}

export interface Message {
  _id: string;
  matchId: string;
  sender: string;
  content: string;
  type: 'text' | 'image' | 'gif';
  seen: boolean;
  createdAt: string;
}

// ─── Swipe ──────────────────────────────────────────────────────────────────

export interface SwipeProfile {
  _id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  location?: {
    city?: string;
    country?: string;
  };
  distance?: number;
  isPremium: boolean;
  isVerified: boolean;
}

// ─── Reels ──────────────────────────────────────────────────────────────────

export interface Reel {
  _id: string;
  user: Pick<User, '_id' | 'name' | 'photos'>;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  likes: string[];
  comments: Comment[];
  views: number;
  createdAt: string;
}

export interface Comment {
  _id: string;
  user: Pick<User, '_id' | 'name' | 'photos'>;
  text: string;
  createdAt: string;
}

// ─── Features ────────────────────────────────────────────────────────────────

export interface RentBuddyListing {
  _id: string;
  user: User;
  title: string;
  description: string;
  activities: string[];
  hourlyRate: number;
  currency: string;
  availability: string[];
  location: string;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface BlindDateRequest {
  _id: string;
  user: User;
  preferences: {
    ageMin: number;
    ageMax: number;
    genders: string[];
  };
  scheduledFor: string;
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  matchedUser?: User;
  createdAt: string;
}

export interface TravelMateListing {
  _id: string;
  user: User;
  destination: string;
  departureDate: string;
  returnDate: string;
  description: string;
  lookingFor: string;
  maxCompanions: number;
  companions: string[];
  status: 'open' | 'full' | 'completed';
  createdAt: string;
}

// ─── Subscription ────────────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration: 'monthly' | 'quarterly' | 'annual';
  features: string[];
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface AppNotification {
  _id: string;
  type: 'match' | 'message' | 'like' | 'buddy_request' | 'blind_date' | 'travel' | 'system';
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string>;
}
