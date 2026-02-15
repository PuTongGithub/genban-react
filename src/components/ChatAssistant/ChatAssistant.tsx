import { useState, useEffect, useRef } from 'react';
import { useModels, useChat } from '../../hooks';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import './ChatAssistant.css';

export function ChatAssistant() {
  const { models, selectedModel, setSelectedModel } = useModels();
  const { messages, isLoading, sessionId, sendMessage, clearMessages, createSession } = useChat({
    selectedModel,
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    createSession();
  }, [createSession]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleNewChat = async () => {
    setInputValue('');
    await clearMessages();
  };

  return (
    <div className="chat-container">
      <ChatHeader
        models={models}
        selectedModel={selectedModel}
        isLoading={isLoading}
        onModelChange={setSelectedModel}
        onNewChat={handleNewChat}
      />
      <MessageList
        messages={messages}
        isLoading={isLoading}
        isReasoningExpanded={isReasoningExpanded}
        onToggleReasoning={() => setIsReasoningExpanded(!isReasoningExpanded)}
      />
      <ChatInput
        value={inputValue}
        isLoading={isLoading}
        disabled={!sessionId}
        onChange={setInputValue}
        onSend={handleSend}
      />
    </div>
  );
}
