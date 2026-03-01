import { useState } from 'react';
import type { Message } from '../../types';

interface MessageItemProps {
  message: Message;
  isLoading: boolean;
  isLast: boolean;
}

function ToolCallsPanel({ toolCalls }: { toolCalls: Message['toolCalls'] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="tool-calls-section">
      <button
        className="tool-calls-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <svg
          className={`tool-calls-arrow ${isExpanded ? 'expanded' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        请求工具调用
      </button>
      {isExpanded && (
        <div className="tool-calls-content">
          {toolCalls.map((toolCall, index) => (
            <div key={index} className="tool-call-item">
              <div className="tool-call-name">
                <span className="tool-call-label">函数:</span>
                <code>{toolCall.function.name}</code>
              </div>
              <div className="tool-call-args">
                <span className="tool-call-label">参数:</span>
                <pre>{(() => {
                  try {
                    return JSON.stringify(JSON.parse(toolCall.function.arguments), null, 2);
                  } catch {
                    return toolCall.function.arguments;
                  }
                })()}</pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MessageItem({
  message,
  isLoading,
  isLast,
}: MessageItemProps) {
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
  const [isToolExpanded, setIsToolExpanded] = useState(false);
  const [isCommandExpanded, setIsCommandExpanded] = useState(true);

  const showTypingIndicator = isLoading && isLast && message.role === 'assistant' && !message.content && !message.reasoningContent;

  const isCommand = message.source === 'command';
  const isError = message.source === 'error';

  const getMessageClass = () => {
    if (message.role === 'user') return 'user-message';
    if (message.role === 'tool') return 'tool-message';
    if (isCommand) return 'command-message';
    if (isError) return 'error-message';
    return 'assistant-message';
  };

  const getAvatar = () => {
    if (message.role === 'user') return '👤';
    if (message.role === 'tool') return '🔧';
    if (isCommand) return '⚙️';
    if (isError) return '⚠️';
    return '🤖';
  };

  const hasReasoning = message.role === 'assistant' && message.reasoningContent && message.reasoningContent.trim();
  const hasContent = message.content && message.content.trim();
  const isThinking = isLast && isLoading && message.role === 'assistant' && !hasContent && hasReasoning;
  const hasToolCalls = message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0;

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

  if (isCommand) {
    return (
      <div className={`message ${getMessageClass()}`}>
        <div className="message-avatar">
          {getAvatar()}
        </div>
        <div className="message-content-wrapper">
          <button
            className="command-toggle"
            onClick={() => setIsCommandExpanded(!isCommandExpanded)}
          >
            <svg
              className={`command-arrow ${isCommandExpanded ? 'expanded' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
            系统命令结果
          </button>
          {isCommandExpanded && (
            <div className="command-content">
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
        {hasToolCalls && <ToolCallsPanel toolCalls={message.toolCalls} />}
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
