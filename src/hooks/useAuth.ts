import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../stores';
import { authApi } from '../api';
import { ApiError } from '../api/client';
import type { UserInfo } from '../types';

export interface UseAuthReturn {
  userInfo: UserInfo | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  login: (userId: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const {
    userInfo,
    isLoading,
    error,
    setUserInfo,
    setLoading,
    setError,
    clearError,
    logout,
  } = useAuthStore();

  // 计算登录状态
  const isLoggedIn = useMemo(() => {
    if (!userInfo) return false;
    return userInfo.expiresAt > Date.now() / 1000;
  }, [userInfo]);

  const login = useCallback(
    async (userId: string, password: string): Promise<boolean> => {
      if (!userId.trim() || !password.trim()) {
        setError('请输入用户名和密码');
        return false;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await authApi.login({
          user_id: userId.trim(),
          password: password.trim(),
        });

        if (response.error) {
          setError(response.error);
          return false;
        }

        const info: UserInfo = {
          userId: userId.trim(),
          token: response.token,
          expiresAt: response.expires_at,
        };

        setUserInfo(info);
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('登录失败，请稍后重试');
        }
        return false;
      } finally {
        setLoading(false);
      }
    },
    [setUserInfo, setLoading, setError]
  );

  return {
    userInfo,
    isLoggedIn,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };
}
