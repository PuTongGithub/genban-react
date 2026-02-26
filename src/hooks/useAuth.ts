import { useState, useCallback, useEffect } from 'react';
import { authApi, ApiError } from '../api';
import type { UserInfo } from '../types';

const STORAGE_KEY = 'genban_user_info';

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
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: UserInfo = JSON.parse(stored);
        if (parsed.expiresAt > Date.now() / 1000) {
          setUserInfo(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const login = useCallback(async (userId: string, password: string): Promise<boolean> => {
    if (!userId.trim() || !password.trim()) {
      setError('请输入用户名和密码');
      return false;
    }

    setIsLoading(true);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('登录失败，请稍后重试');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUserInfo(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    userInfo,
    isLoggedIn: !!userInfo,
    isLoading,
    error,
    login,
    logout,
    clearError,
  };
}

export function getStoredToken(): string | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  try {
    const parsed: UserInfo = JSON.parse(stored);
    if (parsed.expiresAt > Date.now() / 1000) {
      return parsed.token;
    }
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
