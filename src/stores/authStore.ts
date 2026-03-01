import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserInfo } from '../types';

interface AuthState {
  // 状态
  userInfo: UserInfo | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUserInfo: (userInfo: UserInfo | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  logout: () => void;
}

const STORAGE_KEY = 'genban-auth-storage';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // 初始状态
      userInfo: null,
      isLoading: false,
      error: null,

      // Actions
      setUserInfo: (userInfo) => set({ userInfo, error: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      clearError: () => set({ error: null }),

      logout: () => set({ userInfo: null, error: null, isLoading: false }),
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ userInfo: state.userInfo }),
    }
  )
);

// 计算属性函数
export const getToken = (): string | null => {
  return useAuthStore.getState().userInfo?.token ?? null;
};

export const isAuthenticated = (): boolean => {
  const userInfo = useAuthStore.getState().userInfo;
  if (!userInfo) return false;
  return userInfo.expiresAt > Date.now() / 1000;
};
