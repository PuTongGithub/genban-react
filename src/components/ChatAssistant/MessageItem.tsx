import { useState } from 'react';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  isLoading: boolean;
  isLast: boolean;
}

export function MessageItem({
  message,
  isLoading,
  isLast,
}: MessageItemProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
  const [isToolExpanded, setIsToolExpanded] = useState(false);
  
  const showTypingIndicator = isLoading && isLast && message.role === 'assistant' && !message.content && !message.reasoningContent;

  const getMessageClass = () => {
    if (message.role === 'user') return 'user-message';
    if (message.role === 'tool') return 'tool-message';
    return 'assistant-message';
  };

  const getAvatar = () => {
    if (message.role === 'user') return '👤';
    if (message.role === 'tool') return '🔧';
    return '🤖';
  };

  const hasReasoning = message.role === 'assistant' && message.reasoningContent && message.reasoningContent.trim();
  const hasContent = message.content && message.content.trim();
  const isThinking = isLast && isLoading && message.role === 'assistant' && !hasContent && hasReasoning;

  if (message.role === 'tool') {
    return (
      <div className={`message ${getMessageClass()}`}>
        <div className="message-avatar">
          {getAvatar()}
        </div>
        <div className="message-content-wrapper">
          <button
            className="tool-toggle"
            onClick={() => setIsToolExpanded(!isToolExpanded)}
          >
            <svg
              className={`tool-arrow ${isToolExpanded ? 'expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            工具调用结果
          </button>
          {isToolExpanded && (
            <div className="tool-content">
              {message.content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`message ${getMessageClass()}`}>
      <div className="message-avatar">
        {getAvatar()}
      </div>
      <div className="message-content-wrapper">
        {hasReasoning && (
          <div className="reasoning-section">
            <button
              className="reasoning-toggle"
              onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
            >
              <svg
                className={`reasoning-arrow ${isReasoningExpanded ? 'expanded' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
              {isThinking ? '思考中...' : '思考过程'}
            </button>
            {isReasoningExpanded && (
              <div className="reasoning-content">
                {message.reasoningContent}
              </div>
            )}
          </div>
        )}
        {hasContent && (
          <div className="message-content">
            {message.content}
          </div>
        )}
        {showTypingIndicator && (
          <div className="message-content">
            <span className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
