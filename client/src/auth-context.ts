import { createContext, useContext } from 'react';
import { apiRequest } from './api';
import type { AuthUser, ItemResponse } from './types';

export type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; user: AuthUser | null };

export type AuthContextValue = {
  state: AuthState;
  user: AuthUser | null;
  signIn: (user: AuthUser) => void;
  signOut: () => Promise<void>;
  reload: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return value;
}

export async function signInRequest(email: string, password: string) {
  const response = await apiRequest<ItemResponse<AuthUser>>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return response.data;
}

export function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}
