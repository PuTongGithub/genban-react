import { useRef, useEffect } from 'react';
import type { Message } from '../../types';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

function shouldShowMessage(message: Message): boolean {
  if (message.role === 'user' || message.role === 'tool') {
    return true;
  }

  const hasContent = message.content && message.content.trim();
  const hasReasoning = message.reasoningContent && message.reasoningContent.trim();
  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

  return !!(hasContent || hasReasoning || hasToolCalls);
}

export function MessageList({
  messages,
  isLoading,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = 50;
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      isAtBottomRef.current = isAtBottom;
    };

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!isAtBottomRef.current) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visibleMessages = messages.filter(shouldShowMessage);

  if (visibleMessages.length === 0) {
    return (
      <div className="messages-container" ref={containerRef}>
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>开始一个新的对话吧</p>
          <p className="empty-hint">输入消息与 AI 助手交流</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-container" ref={containerRef}>
      {visibleMessages.map((message, index) => (
        <MessageItem
          key={index}
          message={message}
          isLoading={isLoading}
          isLast={index === visibleMessages.length - 1}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
