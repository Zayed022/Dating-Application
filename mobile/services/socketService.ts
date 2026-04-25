import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { Config, StorageKeys } from '../constants';
import { Message } from '../types';

type SocketEvents = {
  'new-message': (message: Message) => void;
  'typing': (data: { matchId: string; userId: string; isTyping: boolean }) => void;
  'message-seen': (data: { matchId: string; seenBy: string }) => void;
  'new-match': (data: { matchId: string; user: unknown }) => void;
  'user-online': (userId: string) => void;
  'user-offline': (userId: string) => void;
  'call-incoming': (data: { callId: string; callerId: string; callerName: string; type: 'audio' | 'video' }) => void;
  'call-ended': (callId: string) => void;
};

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();

  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const token = await SecureStore.getItemAsync(StorageKeys.ACCESS_TOKEN);
    if (!token) return;

    this.socket = io(Config.SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket error:', error.message);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  on<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.socket) return;
    this.socket.on(event as string, callback as (...args: unknown[]) => void);

    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (...args: unknown[]) => void);
  }

  off<K extends keyof SocketEvents>(event: K, callback: SocketEvents[K]): void {
    if (!this.socket) return;
    this.socket.off(event as string, callback as (...args: unknown[]) => void);
    this.listeners.get(event)?.delete(callback as (...args: unknown[]) => void);
  }

  emit(event: string, data?: unknown): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot emit:', event);
      return;
    }
    this.socket.emit(event, data);
  }

  // ─── Chat Room Management ───────────────────────────────────────────────
  joinChat(matchId: string): void {
    this.emit('join-chat', { matchId });
  }

  leaveChat(matchId: string): void {
    this.emit('leave-chat', { matchId });
  }

  sendTyping(matchId: string, isTyping: boolean): void {
    this.emit('typing', { matchId, isTyping });
  }

  sendMessageRead(matchId: string): void {
    this.emit('message-seen', { matchId });
  }

  // ─── Calls ──────────────────────────────────────────────────────────────
  initiateCall(matchId: string, type: 'audio' | 'video'): void {
    this.emit('call-initiate', { matchId, type });
  }

  endCall(callId: string): void {
    this.emit('call-end', { callId });
  }

  acceptCall(callId: string): void {
    this.emit('call-accept', { callId });
  }

  declineCall(callId: string): void {
    this.emit('call-decline', { callId });
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
export default socketService;
