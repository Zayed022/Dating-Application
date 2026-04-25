import api from './api';
import { ApiResponse, SwipeProfile, Match, Message, Reel, RentBuddyListing, BlindDateRequest, TravelMateListing } from '../types';

// ─── Profile ─────────────────────────────────────────────────────────────────
export const profileService = {
  updateProfile: async (updates: FormData) => {
    const { data } = await api.patch('/users/profile', updates, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  uploadPhoto: async (formData: FormData): Promise<ApiResponse<{ url: string }>> => {
    const { data } = await api.post<ApiResponse<{ url: string }>>('/users/photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  deletePhoto: async (photoUrl: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>('/users/photos', { data: { photoUrl } });
    return data;
  },

  getUserById: async (userId: string) => {
    const { data } = await api.get(`/users/${userId}`);
    return data;
  },

  reportUser: async (userId: string, reason: string, details?: string) => {
    const { data } = await api.post('/users/report', { userId, reason, details });
    return data;
  },

  blockUser: async (userId: string) => {
    const { data } = await api.post('/users/block', { userId });
    return data;
  },

  unblockUser: async (userId: string) => {
    const { data } = await api.delete('/users/block', { data: { userId } });
    return data;
  },
};

// ─── Swipe / Discovery ───────────────────────────────────────────────────────
export const swipeService = {
  getProfiles: async (page = 1): Promise<ApiResponse<SwipeProfile[]>> => {
    const { data } = await api.get<ApiResponse<SwipeProfile[]>>(`/swipe/profiles?page=${page}`);
    return data;
  },

  like: async (userId: string): Promise<ApiResponse<{ isMatch: boolean; matchId?: string }>> => {
    const { data } = await api.post<ApiResponse<{ isMatch: boolean; matchId?: string }>>('/swipe/like', { userId });
    return data;
  },

  dislike: async (userId: string): Promise<ApiResponse<null>> => {
    const { data } = await api.post<ApiResponse<null>>('/swipe/dislike', { userId });
    return data;
  },

  superLike: async (userId: string): Promise<ApiResponse<{ isMatch: boolean; matchId?: string }>> => {
    const { data } = await api.post<ApiResponse<{ isMatch: boolean; matchId?: string }>>('/swipe/super-like', { userId });
    return data;
  },

  rewind: async (): Promise<ApiResponse<{ userId: string }>> => {
    const { data } = await api.post<ApiResponse<{ userId: string }>>('/swipe/rewind');
    return data;
  },
};

// ─── Matches ─────────────────────────────────────────────────────────────────
export const matchService = {
  getMatches: async (page = 1): Promise<ApiResponse<Match[]>> => {
    const { data } = await api.get<ApiResponse<Match[]>>(`/matches?page=${page}`);
    return data;
  },

  unmatch: async (matchId: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(`/matches/${matchId}`);
    return data;
  },
};

// ─── Chat ────────────────────────────────────────────────────────────────────
export const chatService = {
  getMessages: async (matchId: string, page = 1): Promise<ApiResponse<Message[]>> => {
    const { data } = await api.get<ApiResponse<Message[]>>(`/chat/${matchId}/messages?page=${page}`);
    return data;
  },

  sendMessage: async (matchId: string, content: string, type = 'text'): Promise<ApiResponse<Message>> => {
    const { data } = await api.post<ApiResponse<Message>>(`/chat/${matchId}/messages`, { content, type });
    return data;
  },

  markSeen: async (matchId: string): Promise<ApiResponse<null>> => {
    const { data } = await api.patch<ApiResponse<null>>(`/chat/${matchId}/seen`);
    return data;
  },
};

// ─── Reels ───────────────────────────────────────────────────────────────────
export const reelsService = {
  getFeed: async (page = 1): Promise<ApiResponse<Reel[]>> => {
    const { data } = await api.get<ApiResponse<Reel[]>>(`/reels?page=${page}`);
    return data;
  },

  likeReel: async (reelId: string): Promise<ApiResponse<{ liked: boolean; count: number }>> => {
    const { data } = await api.post<ApiResponse<{ liked: boolean; count: number }>>(`/reels/${reelId}/like`);
    return data;
  },

  addComment: async (reelId: string, text: string): Promise<ApiResponse<Comment>> => {
    const { data } = await api.post<ApiResponse<Comment>>(`/reels/${reelId}/comments`, { text });
    return data;
  },

  uploadReel: async (formData: FormData): Promise<ApiResponse<Reel>> => {
    const { data } = await api.post<ApiResponse<Reel>>('/reels', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
};

// ─── Rent a Buddy ────────────────────────────────────────────────────────────
export const buddyService = {
  getListings: async (page = 1): Promise<ApiResponse<RentBuddyListing[]>> => {
    const { data } = await api.get<ApiResponse<RentBuddyListing[]>>(`/buddy?page=${page}`);
    return data;
  },

  createListing: async (listing: Partial<RentBuddyListing>): Promise<ApiResponse<RentBuddyListing>> => {
    const { data } = await api.post<ApiResponse<RentBuddyListing>>('/buddy', listing);
    return data;
  },

  bookBuddy: async (listingId: string, hours: number): Promise<ApiResponse<{ bookingId: string; paymentOrder: unknown }>> => {
    const { data } = await api.post<ApiResponse<{ bookingId: string; paymentOrder: unknown }>>(`/buddy/${listingId}/book`, { hours });
    return data;
  },
};

// ─── Blind Date ──────────────────────────────────────────────────────────────
export const blindDateService = {
  createRequest: async (preferences: BlindDateRequest['preferences'], scheduledFor: string): Promise<ApiResponse<BlindDateRequest>> => {
    const { data } = await api.post<ApiResponse<BlindDateRequest>>('/blind-date', { preferences, scheduledFor });
    return data;
  },

  getMyRequests: async (): Promise<ApiResponse<BlindDateRequest[]>> => {
    const { data } = await api.get<ApiResponse<BlindDateRequest[]>>('/blind-date/mine');
    return data;
  },

  cancelRequest: async (requestId: string): Promise<ApiResponse<null>> => {
    const { data } = await api.delete<ApiResponse<null>>(`/blind-date/${requestId}`);
    return data;
  },
};

// ─── Travel Mate ─────────────────────────────────────────────────────────────
export const travelService = {
  getListings: async (page = 1): Promise<ApiResponse<TravelMateListing[]>> => {
    const { data } = await api.get<ApiResponse<TravelMateListing[]>>(`/travel?page=${page}`);
    return data;
  },

  createListing: async (listing: Partial<TravelMateListing>): Promise<ApiResponse<TravelMateListing>> => {
    const { data } = await api.post<ApiResponse<TravelMateListing>>('/travel', listing);
    return data;
  },

  joinTrip: async (listingId: string): Promise<ApiResponse<TravelMateListing>> => {
    const { data } = await api.post<ApiResponse<TravelMateListing>>(`/travel/${listingId}/join`);
    return data;
  },
};

// ─── Subscription / Payment ──────────────────────────────────────────────────
export const subscriptionService = {
  createOrder: async (planId: string): Promise<ApiResponse<{ orderId: string; amount: number; currency: string; key: string }>> => {
    const { data } = await api.post<ApiResponse<{ orderId: string; amount: number; currency: string; key: string }>>('/subscription/create-order', { planId });
    return data;
  },

  verifyPayment: async (payload: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string; planId: string }): Promise<ApiResponse<{ isPremium: boolean }>> => {
    const { data } = await api.post<ApiResponse<{ isPremium: boolean }>>('/subscription/verify', payload);
    return data;
  },

  getSubscription: async () => {
    const { data } = await api.get('/subscription/my');
    return data;
  },
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationService = {
  registerPushToken: async (token: string): Promise<void> => {
    await api.post('/notifications/register', { token });
  },

  getNotifications: async (page = 1) => {
    const { data } = await api.get(`/notifications?page=${page}`);
    return data;
  },

  markRead: async (notificationId: string) => {
    const { data } = await api.patch(`/notifications/${notificationId}/read`);
    return data;
  },

  markAllRead: async () => {
    const { data } = await api.patch('/notifications/read-all');
    return data;
  },
};
