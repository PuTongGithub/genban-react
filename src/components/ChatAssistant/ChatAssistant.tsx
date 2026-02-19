import { useState, useEffect, useRef } from 'react';
import { useModels, useChat } from '../../hooks';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput, type ChatInputRef } from './ChatInput';
import { ErrorBanner } from './ErrorBanner';
import './ChatAssistant.css';

export function ChatAssistant() {
  const { 
    models, 
    selectedModel, 
    setSelectedModel, 
    isLoading: modelsLoading,
    error: modelsError, 
    refetch: refetchModels,
    isOffline: modelsOffline 
  } = useModels();
  
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
  } = useChat({ selectedModel });
  
  const [inputValue, setInputValue] = useState('');
  const initializedRef = useRef(false);
  const chatInputRef = useRef<ChatInputRef>(null);
  const prevIsLoadingRef = useRef(isLoading);

  const hasError = modelsError || chatError;
  const isOffline = modelsOffline || chatOffline;

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
    if (modelsError) {
      await refetchModels();
      if (!sessionId) {
        await createSession();
      }
    } else if (chatError) {
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
          message={modelsError || chatError || '发生错误'}
          isOffline={isOffline}
          onRetry={handleRetry}
          onDismiss={handleDismissError}
        />
      )}
      <ChatHeader
        models={models}
        selectedModel={selectedModel}
        isLoading={isLoading || modelsLoading}
        onModelChange={setSelectedModel}
        onNewChat={handleNewChat}
      />
      <MessageList
        messages={messages}
        isLoading={isLoading}
      />
      <ChatInput
        ref={chatInputRef}
        value={inputValue}
        isLoading={isLoading || modelsLoading}
        disabled={!sessionId || isOffline}
        onChange={setInputValue}
        onSend={handleSend}
      />
    </div>
  );
}
