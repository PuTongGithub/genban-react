import { useState, useEffect, useRef } from 'react';
import { useChat } from '../../hooks';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput, type ChatInputRef } from './ChatInput';
import { ErrorBanner } from './ErrorBanner';
import './ChatAssistant.css';

export interface ChatAssistantProps {
  token: string;
  onLogout: () => void;
}

export function ChatAssistant({ token, onLogout }: ChatAssistantProps) {
  const {
    messages,
    isLoading,
    isConnected,
    error: chatError,
    isOffline: chatOffline,
    sendMessage,
    clearError,
    connect,
  } = useChat(onLogout);

  const [inputValue, setInputValue] = useState('');
  const chatInputRef = useRef<ChatInputRef>(null);
  const prevIsLoadingRef = useRef(isLoading);
  const hasConnectedRef = useRef(false);

  const hasError = chatError;
  const isOffline = chatOffline;

  // 只在token首次变化时建立连接，避免React StrictMode的双重渲染问题
  useEffect(() => {
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect(token);
    }
  }, [token, connect]);

  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading) {
      chatInputRef.current?.focus();
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleSend = () => {
    if (!inputValue.trim() || !isConnected) return;
    sendMessage(inputValue, token);
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
          onRetry={() => connect(token)}
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
