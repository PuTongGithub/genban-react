import { useState, useCallback, useRef } from 'react';
import { chatApi, ApiError, ApiErrorCode } from '../api';
import type { Message, StreamData } from '../types';

interface UseChatOptions {
  selectedModel: string;
}

export interface UseChatReturn {
  sessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => Promise<string | null>;
  createSession: () => Promise<string | null>;
  clearError: () => void;
  retryLastMessage: () => Promise<void>;
}

export function useChat({ selectedModel }: UseChatOptions): UseChatReturn {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<string>('');
  const lastRoleRef = useRef<'assistant' | 'tool'>('assistant');

  const createSession = useCallback(async () => {
    try {
      setError(null);
      const id = await chatApi.createSession();
      setSessionId(id);
      return id;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === ApiErrorCode.NETWORK_ERROR || err.code === ApiErrorCode.TIMEOUT) {
          setIsOffline(true);
        }
        setError(err.message);
      } else {
        setError('创建会话失败');
      }
      return null;
    }
  }, []);

  const updateLastMessage = useCallback((role: 'assistant' | 'tool', updater: (msg: Message) => Message) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === role) {
        return [...prev.slice(0, -1), updater(lastMessage)];
      }
      return prev;
    });
  }, []);

  const handleStreamData = useCallback((data: StreamData) => {
    const role = data.role;
    
    if (role === 'tool') {
      if (lastRoleRef.current !== 'tool') {
        setMessages(prev => [
          ...prev,
          { role: 'tool', content: data.content || '' },
        ]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'tool', content: data.content || '' },
        ]);
      }
      lastRoleRef.current = 'tool';
    } else {
      if (lastRoleRef.current === 'tool') {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.content || '', reasoningContent: data.reasoning_content || '' },
        ]);
      } else {
        updateLastMessage('assistant', () => ({
          role: 'assistant',
          content: data.content || '',
          reasoningContent: data.reasoning_content || '',
        }));
      }
      lastRoleRef.current = 'assistant';
    }
  }, [updateLastMessage]);

  const handleStreamError = useCallback((error: string) => {
    updateLastMessage('assistant', msg => ({
      ...msg,
      content: `❌ 错误：${error}`,
    }));
  }, [updateLastMessage]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !sessionId || !selectedModel || isLoading) return;

    const userMessage = content.trim();
    lastMessageRef.current = userMessage;
    lastRoleRef.current = 'assistant';
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '', reasoningContent: '' },
    ]);

    abortControllerRef.current = new AbortController();

    try {
      await chatApi.sendMessage(
        {
          session_id: sessionId,
          user_input: userMessage,
          model: selectedModel,
        },
        handleStreamData,
        handleStreamError,
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === ApiErrorCode.ABORTED) {
          return;
        }
        if (err.code === ApiErrorCode.NETWORK_ERROR || err.code === ApiErrorCode.TIMEOUT) {
          setIsOffline(true);
          updateLastMessage('assistant', () => ({
            role: 'assistant',
            content: '🌐 网络连接失败，请检查网络后重试。',
          }));
        } else {
          updateLastMessage('assistant', () => ({
            role: 'assistant',
            content: `❌ ${err.message}`,
          }));
        }
        setError(err.message);
      } else {
        const errorMsg = '发送消息失败，请稍后重试。';
        setError(errorMsg);
        updateLastMessage('assistant', () => ({
          role: 'assistant',
          content: `❌ ${errorMsg}`,
        }));
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [sessionId, selectedModel, isLoading, handleStreamData, handleStreamError, updateLastMessage]);

  const retryLastMessage = useCallback(async () => {
    if (lastMessageRef.current) {
      setMessages(prev => prev.slice(0, -2));
      await sendMessage(lastMessageRef.current);
    }
  }, [sendMessage]);

  const clearMessages = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages([]);
    setError(null);
    setIsOffline(false);
    lastMessageRef.current = '';
    lastRoleRef.current = 'assistant';
    return createSession();
  }, [createSession]);

  const clearError = useCallback(() => {
    setError(null);
    setIsOffline(false);
  }, []);

  return {
    sessionId,
    messages,
    isLoading,
    error,
    isOffline,
    sendMessage,
    clearMessages,
    createSession,
    clearError,
    retryLastMessage,
  };
}
