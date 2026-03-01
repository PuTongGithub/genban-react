import { useState, useCallback, useRef, useEffect } from 'react';
import { chatApi, ApiError, ApiErrorCode } from '../api';
import type { Message, StreamData } from '../types';

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  isOffline: boolean;
  sendMessage: (content: string, token: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  connect: (token: string) => void;
  disconnect: () => void;
}

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1秒
  maxDelay: 10000, // 最大10秒
};

export function useChat(onAuthError?: () => void): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const currentAssistantIdRef = useRef<string | null>(null);
  const isConnectingRef = useRef(false);
  const onAuthErrorRef = useRef(onAuthError);
  const currentTokenRef = useRef<string | null>(null);
  const lastUserMessageRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 保持回调引用最新
  useEffect(() => {
    onAuthErrorRef.current = onAuthError;
  }, [onAuthError]);

  // 清理重试定时器
  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const handleStreamData = useCallback((data: StreamData) => {
    const { role, id, content, reasoning_content, tool_calls, type } = data;

    // 去重：基于id避免重复显示消息
    if (messageIdsRef.current.has(id)) {
      // 如果是已存在的assistant消息，更新内容
      if (role === 'assistant' && id === currentAssistantIdRef.current) {
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
                source: type,
              },
            ];
          }
          return prev;
        });
      }
      return;
    }

    // 新消息
    messageIdsRef.current.add(id);

    if (type === 'error') {
      // 错误类型消息：显示为助手消息，但标记为error类型
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: content || '',
          reasoningContent: '',
          source: 'error',
        },
      ]);
      currentAssistantIdRef.current = null;
      setIsLoading(false);
    } else if (role === 'user') {
      // 用户消息：检查是否与最后发送的消息内容相同，避免重复显示
      const userContent = content || '';
      if (userContent === lastUserMessageRef.current) {
        // 消息内容相同，跳过（因为已经本地添加了）
        lastUserMessageRef.current = null;
        return;
      }
      // 不同的用户消息，添加显示
      setMessages(prev => [
        ...prev,
        { role: 'user', content: userContent, source: type },
      ]);
    } else if (role === 'tool') {
      // 工具消息
      setMessages(prev => [
        ...prev,
        { role: 'tool', content: content || '', source: type },
      ]);
      currentAssistantIdRef.current = null;
    } else if (role === 'assistant') {
      // 助手消息
      currentAssistantIdRef.current = id;
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: content || '',
          reasoningContent: reasoning_content || '',
          toolCalls: tool_calls || undefined,
          source: type,
        },
      ]);
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
    currentAssistantIdRef.current = null;
  }, []);

  const handleComplete = useCallback(() => {
    // 单轮对话完成，重置当前助手消息id
    currentAssistantIdRef.current = null;
    setIsLoading(false);
  }, []);

  // 使用 ref 保持函数引用稳定
  const handleStreamDataRef = useRef(handleStreamData);
  const handleStreamErrorRef = useRef(handleStreamError);
  const handleCompleteRef = useRef(handleComplete);

  useEffect(() => {
    handleStreamDataRef.current = handleStreamData;
  }, [handleStreamData]);

  useEffect(() => {
    handleStreamErrorRef.current = handleStreamError;
  }, [handleStreamError]);

  useEffect(() => {
    handleCompleteRef.current = handleComplete;
  }, [handleComplete]);

  const disconnect = useCallback(() => {
    clearRetryTimeout();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsConnected(false);
    isConnectingRef.current = false;
    currentTokenRef.current = null;
    retryCountRef.current = 0;
  }, [clearRetryTimeout]);

  const connect = useCallback((token: string) => {
    // 如果已经在连接中，或者已经用相同token连接，则跳过
    if (isConnectingRef.current || (isConnected && currentTokenRef.current === token)) {
      return;
    }

    // 如果已连接但token不同，先断开
    if (isConnected && currentTokenRef.current !== token) {
      disconnect();
    }

    isConnectingRef.current = true;
    currentTokenRef.current = token;
    setIsConnected(true);
    setError(null);
    setIsOffline(false);

    abortControllerRef.current = new AbortController();

    const doConnect = async () => {
      try {
        await chatApi.connectStream(
          token,
          (data) => handleStreamDataRef.current(data),
          (err) => handleStreamErrorRef.current(err),
          () => handleCompleteRef.current(),
          abortControllerRef.current?.signal
        );
        // 连接成功，重置重试计数
        retryCountRef.current = 0;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === ApiErrorCode.ABORTED) {
            // 正常断开，不显示错误，不重试
            return;
          }
          if (err.code === ApiErrorCode.UNAUTHORIZED) {
            onAuthErrorRef.current?.();
            return;
          }
          if (err.code === ApiErrorCode.NETWORK_ERROR) {
            setIsOffline(true);
          }

          // 检查是否需要重试
          if (retryCountRef.current < RETRY_CONFIG.maxRetries) {
            retryCountRef.current++;
            const delay = Math.min(
              RETRY_CONFIG.initialDelay * Math.pow(2, retryCountRef.current - 1),
              RETRY_CONFIG.maxDelay
            );
            setError(`连接断开，${delay / 1000}秒后自动重试 (${retryCountRef.current}/${RETRY_CONFIG.maxRetries})...`);

            retryTimeoutRef.current = setTimeout(() => {
              isConnectingRef.current = false;
              connect(token);
            }, delay);
            return;
          }

          // 重试次数用尽
          setError(`连接失败，已重试${RETRY_CONFIG.maxRetries}次，请检查网络后点击重试按钮`);
        } else {
          setError('连接失败，请稍后重试');
        }
      } finally {
        isConnectingRef.current = false;
        setIsConnected(false);
      }
    };

    doConnect();
  }, [isConnected, disconnect, clearRetryTimeout]);

  const sendMessage = useCallback(async (content: string, token: string) => {
    if (!content.trim()) return;

    const userMessage = content.trim();

    // 立即显示用户消息
    lastUserMessageRef.current = userMessage;
    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage, source: 'user' },
    ]);

    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      await chatApi.submit(
        { user_input: userMessage },
        token
      );
      // 提交成功后，助手回复会通过SSE推送回来
    } catch (err) {
      setIsLoading(false);
      if (err instanceof ApiError) {
        if (err.code === ApiErrorCode.UNAUTHORIZED) {
          onAuthErrorRef.current?.();
          return;
        }
        if (err.code === ApiErrorCode.NETWORK_ERROR) {
          setIsOffline(true);
        }
        setError(err.message);
      } else {
        setError('发送消息失败，请稍后重试');
      }
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    messageIdsRef.current.clear();
    currentAssistantIdRef.current = null;
    lastUserMessageRef.current = null;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setIsOffline(false);
    // 重置重试计数
    retryCountRef.current = 0;
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearRetryTimeout();
    };
  }, [clearRetryTimeout]);

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
