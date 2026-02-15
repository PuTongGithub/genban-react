import { useRef, useEffect } from 'react';
import type { Message } from '../../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  isReasoningExpanded: boolean;
  onToggleReasoning: () => void;
}

export function MessageList({
  messages,
  isLoading,
  isReasoningExpanded,
  onToggleReasoning,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="messages-container">
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>开始一个新的对话吧</p>
          <p className="empty-hint">输入消息与 AI 助手交流</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container">
      {messages.map((message, index) => (
        <MessageItem
          key={index}
          message={message}
          isLoading={isLoading}
          isLast={index === messages.length - 1}
          isReasoningExpanded={isReasoningExpanded}
          onToggleReasoning={onToggleReasoning}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
