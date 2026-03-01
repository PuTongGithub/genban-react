import { useCallback, useEffect, useRef } from 'react';
import { useChatStore, useChatConnectionStore, useAuthStore } from '../stores';
import { chatApi, ApiError } from '../api';
import type { Message } from '../types';

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  isOffline: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  connect: () => void;
  disconnect: () => void;
}

export function useChat(onAuthError?: () => void): UseChatReturn {
  const {
    messages,
    isLoading,
    handleStreamData,
    handleStreamError,
    setLoading,
    clearError,
    clearMessages,
  } = useChatStore();

  const {
    isConnected,
    error,
    isOffline,
    connect: connectToStream,
    disconnect: disconnectFromStream,
  } = useChatConnectionStore();

  // 使用 ref 存储回调，避免重复创建
  const callbacksRef = useRef({
    onStreamData: handleStreamData,
    onStreamError: handleStreamError,
    onAuthError,
    onComplete: () => {
      useChatStore.getState().setCurrentAssistantId(null);
      useChatStore.getState().setLoading(false);
    },
  });

  // 保持 ref 最新
  useEffect(() => {
    callbacksRef.current = {
      onStreamData: handleStreamData,
      onStreamError: handleStreamError,
      onAuthError,
      onComplete: () => {
        useChatStore.getState().setCurrentAssistantId(null);
        useChatStore.getState().setLoading(false);
      },
    };
  }, [handleStreamData, handleStreamError, onAuthError]);

  const connect = useCallback(() => {
    const currentToken = useAuthStore.getState().userInfo?.token;
    if (!currentToken) return;

    connectToStream({
      onStreamData: (data) => callbacksRef.current.onStreamData(data),
      onStreamError: (err) => callbacksRef.current.onStreamError(err),
      onAuthError: () => callbacksRef.current.onAuthError?.(),
      onComplete: () => callbacksRef.current.onComplete(),
    });
  }, [connectToStream]);

  const disconnect = useCallback(() => {
    disconnectFromStream();
  }, [disconnectFromStream]);

  const sendMessage = useCallback(
    async (content: string) => {
      const currentToken = useAuthStore.getState().userInfo?.token;
      if (!content.trim() || !currentToken) return;

      const userMessage = content.trim();
      setLoading(true);
      clearError();

      // 重置连接状态
      useChatConnectionStore.getState().resetRetryCount();

      try {
        await chatApi.submit({ user_input: userMessage });
      } catch (err) {
        setLoading(false);
        if (err instanceof ApiError) {
          if (err.code === 'UNAUTHORIZED') {
            onAuthError?.();
            return;
          }
          if (err.code === 'NETWORK_ERROR') {
            useChatConnectionStore.setState({
              isOffline: true,
              error: '网络连接失败，请检查网络设置',
            });
            return;
          }
          useChatConnectionStore.setState({ error: err.message });
        } else {
          useChatConnectionStore.setState({
            error: '发送消息失败，请稍后重试',
          });
        }
      }
    },
    [setLoading, clearError, onAuthError]
  );

  return {
    messages,
    isLoading,
    isConnected,
    error,
    isOffline,
    sendMessage,
    clearMessages,
    clearError,
    connect,
    disconnect,
  };
}
