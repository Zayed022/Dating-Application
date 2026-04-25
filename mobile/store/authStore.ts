import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthState, User, AuthTokens } from '../types';
import { StorageKeys } from '../constants';
import socketService from '../services/socketService';

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
    SecureStore.setItemAsync(StorageKeys.USER, JSON.stringify(user)).catch(console.error);
  },

  setTokens: (tokens: AuthTokens) => {
    set({ tokens });
    SecureStore.setItemAsync(StorageKeys.ACCESS_TOKEN, tokens.accessToken).catch(console.error);
    SecureStore.setItemAsync(StorageKeys.REFRESH_TOKEN, tokens.refreshToken).catch(console.error);
  },

  updateUser: (updates: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    set({ user: updated });
    SecureStore.setItemAsync(StorageKeys.USER, JSON.stringify(updated)).catch(console.error);
  },

  logout: async () => {
    socketService.disconnect();
    await Promise.all([
      SecureStore.deleteItemAsync(StorageKeys.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(StorageKeys.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(StorageKeys.USER),
    ]);
    set({ user: null, tokens: null, isAuthenticated: false });
  },
}));

// ─── Hydrate auth state from SecureStore on app boot ─────────────────────────
export const hydrateAuth = async (): Promise<void> => {
  try {
    const [userStr, accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(StorageKeys.USER),
      SecureStore.getItemAsync(StorageKeys.ACCESS_TOKEN),
      SecureStore.getItemAsync(StorageKeys.REFRESH_TOKEN),
    ]);

    if (userStr && accessToken && refreshToken) {
      const user: User = JSON.parse(userStr);
      useAuthStore.setState({
        user,
        tokens: { accessToken, refreshToken },
        isAuthenticated: true,
        isLoading: false,
      });

      // Connect socket
      await socketService.connect();
    } else {
      useAuthStore.setState({ isLoading: false });
    }
  } catch (error) {
    console.error('Hydration error:', error);
    useAuthStore.setState({ isLoading: false });
  }
};
