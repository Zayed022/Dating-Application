import api from './api';
import { ApiResponse, AuthTokens, User } from '../types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  age: number;
  gender: string;
}

export interface AuthData {
  user: User;
  tokens: AuthTokens;
}

const authService = {
  login: async (payload: LoginPayload): Promise<ApiResponse<AuthData>> => {
    const { data } = await api.post<ApiResponse<AuthData>>('/auth/login', payload);
    return data;
  },

  register: async (payload: RegisterPayload): Promise<ApiResponse<AuthData>> => {
    const { data } = await api.post<ApiResponse<AuthData>>('/auth/register', payload);
    return data;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken }).catch(() => {});
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<AuthTokens>> => {
    const { data } = await api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken });
    return data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
    return data;
  },

  resetPassword: async (token: string, password: string): Promise<ApiResponse<{ message: string }>> => {
    const { data } = await api.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, password });
    return data;
  },

  getMe: async (): Promise<ApiResponse<User>> => {
    const { data } = await api.get<ApiResponse<User>>('/auth/me');
    return data;
  },
};

export default authService;
