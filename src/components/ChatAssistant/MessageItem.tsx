import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  isLoading: boolean;
  isLast: boolean;
  isReasoningExpanded: boolean;
  onToggleReasoning: () => void;
}

export function MessageItem({
  message,
  isLoading,
  isLast,
  isReasoningExpanded,
  onToggleReasoning,
}: MessageItemProps) {
  const showTypingIndicator = isLoading && isLast && message.role === 'assistant' && !message.content;

  return (
    <div
      className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
    >
      <div className="message-avatar">
        {message.role === 'user' ? '👤' : '🤖'}
      </div>
      <div className="message-content-wrapper">
        {message.role === 'assistant' && message.reasoningContent && (
          <div className="reasoning-section">
            <button
              className="reasoning-toggle"
              onClick={onToggleReasoning}
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
              思考过程
            </button>
            {isReasoningExpanded && (
              <div className="reasoning-content">
                {message.reasoningContent}
              </div>
            )}
          </div>
        )}
        <div className="message-content">
          {message.content || (showTypingIndicator ? (
            <span className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </span>
          ) : null)}
        </div>
      </div>
    </div>
  );
}
