import { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from '../../hooks';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput, type ChatInputRef } from './ChatInput';
import { ErrorBanner } from './ErrorBanner';
import './ChatAssistant.css';

export interface ChatAssistantProps {
  onLogout: () => void;
}

export function ChatAssistant({ onLogout }: ChatAssistantProps) {
  // 使用 ref 稳定 onLogout 引用，避免 useChat 重新创建
  const onLogoutRef = useRef(onLogout);
  useEffect(() => {
    onLogoutRef.current = onLogout;
  }, [onLogout]);

  // 使用稳定的回调
  const stableOnLogout = useCallback(() => {
    onLogoutRef.current();
  }, []);

  const {
    messages,
    isLoading,
    isConnected,
    error: chatError,
    isOffline: chatOffline,
    sendMessage,
    clearError,
    connect,
  } = useChat(stableOnLogout);

  const [inputValue, setInputValue] = useState('');
  const chatInputRef = useRef<ChatInputRef>(null);
  const prevIsLoadingRef = useRef(isLoading);
  const hasConnectedRef = useRef(false);

  const hasError = chatError;
  const isOffline = chatOffline;

  // 只在组件首次挂载时建立连接
  useEffect(() => {
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect();
    }
    // 注意：不添加依赖，只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading) {
      chatInputRef.current?.focus();
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleSend = () => {
    if (!inputValue.trim() || !isConnected) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleDismissError = () => {
    clearError();
  };

  return (
    <div className="chat-container">
      {hasError && (
        <ErrorBanner
          message={chatError || '发生错误'}
          isOffline={isOffline}
          onRetry={() => connect()}
          onDismiss={handleDismissError}
        />
      )}
      <ChatHeader
        isConnected={isConnected}
        onLogout={onLogout}
      />
      <MessageList
        messages={messages}
        isLoading={isLoading}
      />
      <ChatInput
        ref={chatInputRef}
        value={inputValue}
        disabled={!isConnected}
        placeholder={!isConnected ? "连接中..." : "输入消息..."}
        onChange={setInputValue}
        onSend={handleSend}
      />
    </div>
  );
}
