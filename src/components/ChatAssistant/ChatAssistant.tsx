import { useState, useEffect, useRef } from 'react';
import { useChat } from '../../hooks';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput, type ChatInputRef } from './ChatInput';
import { ErrorBanner } from './ErrorBanner';
import './ChatAssistant.css';

export function ChatAssistant() {
  const {
    messages,
    isLoading,
    sessionId,
    error: chatError,
    isOffline: chatOffline,
    sendMessage,
    clearMessages,
    createSession,
    clearError,
    retryLastMessage
  } = useChat();

  const [inputValue, setInputValue] = useState('');
  const initializedRef = useRef(false);
  const chatInputRef = useRef<ChatInputRef>(null);
  const prevIsLoadingRef = useRef(isLoading);

  const hasError = chatError;
  const isOffline = chatOffline;

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    createSession();
  }, [createSession]);

  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoading) {
      chatInputRef.current?.focus();
    }
    prevIsLoadingRef.current = isLoading;
  }, [isLoading]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleNewChat = async () => {
    setInputValue('');
    await clearMessages();
  };

  const handleRetry = async () => {
    if (chatError) {
      clearError();
      await retryLastMessage();
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
      />
      <MessageList
        messages={messages}
        isLoading={isLoading}
      />
      <ChatInput
        ref={chatInputRef}
        value={inputValue}
        isLoading={isLoading}
        disabled={!sessionId || isOffline}
        onChange={setInputValue}
        onSend={handleSend}
      />
    </div>
  );
}
