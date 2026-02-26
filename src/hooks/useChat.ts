import { useState, useCallback, useRef } from 'react';
import { chatApi, ApiError, ApiErrorCode } from '../api';
import type { Message, StreamData } from '../types';

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  isOffline: boolean;
  sendMessage: (content: string, token: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  retryLastMessage: (token: string) => Promise<void>;
}

export function useChat(onAuthError?: () => void): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<string>('');
  const currentMessageIdRef = useRef<string | null>(null);

  const handleStreamData = useCallback((data: StreamData) => {
    const { role, id, content, reasoning_content, tool_calls, source } = data;

    if (role === 'tool') {
      setMessages(prev => [
        ...prev,
        { role: 'tool', content: content || '', source },
      ]);
      currentMessageIdRef.current = null;
    } else {
      if (currentMessageIdRef.current === id) {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              {
                ...lastMessage,
                content: content || '',
                reasoningContent: reasoning_content || '',
                toolCalls: tool_calls || lastMessage.toolCalls,
                source,
              },
            ];
          }
          return prev;
        });
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: content || '',
            reasoningContent: reasoning_content || '',
            toolCalls: tool_calls || undefined,
            source,
          },
        ]);
        currentMessageIdRef.current = id;
      }
    }
  }, []);

  const handleStreamError = useCallback((error: string) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];

      if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.content && !lastMessage.reasoningContent) {
        return [
          ...prev.slice(0, -1),
          {
            ...lastMessage,
            content: `❌ 错误：${error}`,
          },
        ];
      }

      return [
        ...prev,
        {
          role: 'assistant',
          content: `❌ 错误：${error}`,
          reasoningContent: '',
          source: 'assistant',
        },
      ];
    });
    currentMessageIdRef.current = null;
  }, []);

  const sendMessage = useCallback(async (content: string, token: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = content.trim();
    lastMessageRef.current = userMessage;
    currentMessageIdRef.current = null;
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
          user_input: userMessage,
        },
        token,
        handleStreamData,
        handleStreamError,
        abortControllerRef.current.signal
      );
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === ApiErrorCode.ABORTED) {
          return;
        }
        if (err.code === ApiErrorCode.UNAUTHORIZED) {
          onAuthError?.();
          return;
        }
        if (err.code === ApiErrorCode.NETWORK_ERROR) {
          setIsOffline(true);
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: '🌐 网络连接失败，请检查网络后重试。' },
              ];
            }
            return prev;
          });
        } else {
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: `❌ ${err.message}` },
              ];
            }
            return prev;
          });
        }
        setError(err.message);
      } else {
        const errorMsg = '发送消息失败，请稍后重试。';
        setError(errorMsg);
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMessage, content: `❌ ${errorMsg}` },
            ];
          }
          return prev;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isLoading, handleStreamData, handleStreamError, onAuthError]);

  const retryLastMessage = useCallback(async (token: string) => {
    if (lastMessageRef.current) {
      setMessages(prev => prev.slice(0, -2));
      await sendMessage(lastMessageRef.current, token);
    }
  }, [sendMessage]);

  const clearMessages = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages([]);
    setError(null);
    setIsOffline(false);
    lastMessageRef.current = '';
    currentMessageIdRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setIsOffline(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    isOffline,
    sendMessage,
    clearMessages,
    clearError,
    retryLastMessage,
  };
}
