import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface UIState {
  toasts: Toast[];
  isMatchModalVisible: boolean;
  matchedUser: { id: string; name: string; photo: string } | null;
  showToast: (message: string, type?: Toast['type'], duration?: number) => void;
  hideToast: (id: string) => void;
  showMatchModal: (user: { id: string; name: string; photo: string }) => void;
  hideMatchModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toasts: [],
  isMatchModalVisible: false,
  matchedUser: null,

  showToast: (message, type = 'info', duration = 3000) => {
    const id = Date.now().toString();
    const toast: Toast = { id, message, type, duration };
    set((state) => ({ toasts: [...state.toasts, toast] }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },

  hideToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  showMatchModal: (user) => {
    set({ matchedUser: user, isMatchModalVisible: true });
  },

  hideMatchModal: () => {
    set({ isMatchModalVisible: false, matchedUser: null });
  },
}));
