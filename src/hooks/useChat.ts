import { useState, useCallback, useRef } from 'react';
import { chatApi } from '../api';
import type { Message, StreamData } from '../types';

interface UseChatOptions {
  selectedModel: string;
}

export function useChat({ selectedModel }: UseChatOptions) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const createSession = useCallback(async () => {
    try {
      const id = await chatApi.createSession();
      setSessionId(id);
      return id;
    } catch {
      return null;
    }
  }, []);

  const updateLastAssistantMessage = useCallback((updater: (msg: Message) => Message) => {
    setMessages(prev => {
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        return [...prev.slice(0, -1), updater(lastMessage)];
      }
      return prev;
    });
  }, []);

  const handleStreamData = useCallback((data: StreamData) => {
    updateLastAssistantMessage(msg => ({
      ...msg,
      content: msg.content + (data.content || ''),
      reasoningContent: msg.reasoningContent + (data.reasoning_content || ''),
    }));
  }, [updateLastAssistantMessage]);

  const handleStreamError = useCallback((error: string) => {
    updateLastAssistantMessage(msg => ({
      ...msg,
      content: `❌ 错误：${error}`,
    }));
  }, [updateLastAssistantMessage]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !sessionId || !selectedModel || isLoading) return;

    const userMessage = content.trim();
    setIsLoading(true);

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'assistant', content: '', reasoningContent: '' },
    ]);

    abortControllerRef.current = new AbortController();

    try {
      await chatApi.sendMessage(
        {
          sessionId,
          userInput: userMessage,
          model: selectedModel,
        },
        handleStreamData,
        handleStreamError,
        abortControllerRef.current.signal
      );
    } catch {
      updateLastAssistantMessage(() => ({
        role: 'assistant',
        content: '抱歉，发生了错误，请稍后重试。',
      }));
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [sessionId, selectedModel, isLoading, handleStreamData, handleStreamError, updateLastAssistantMessage]);

  const clearMessages = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages([]);
    return createSession();
  }, [createSession]);

  return {
    sessionId,
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    createSession,
  };
}
