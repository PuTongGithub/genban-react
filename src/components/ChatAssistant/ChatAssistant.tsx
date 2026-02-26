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
    error: chatError,
    isOffline: chatOffline,
    sendMessage,
    clearMessages,
    clearError,
    retryLastMessage
  } = useChat(onLogout);

  const [inputValue, setInputValue] = useState('');
  const chatInputRef = useRef<ChatInputRef>(null);
  const prevIsLoadingRef = useRef(isLoading);

  const hasError = chatError;
  const isOffline = chatOffline;

  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading) {
      chatInputRef.current?.focus();
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue, token);
    setInputValue('');
  };

  const handleNewChat = () => {
    setInputValue('');
    clearMessages();
  };

  const handleRetry = async () => {
    if (chatError) {
      clearError();
      await retryLastMessage(token);
    }
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
          onRetry={handleRetry}
          onDismiss={handleDismissError}
        />
      )}
      <ChatHeader
        isLoading={isLoading}
        onNewChat={handleNewChat}
        onLogout={onLogout}
      />
      <MessageList
        messages={messages}
        isLoading={isLoading}
      />
      <ChatInput
        ref={chatInputRef}
        value={inputValue}
        isLoading={isLoading}
        disabled={isOffline}
        onChange={setInputValue}
        onSend={handleSend}
      />
    </div>
  );
}
