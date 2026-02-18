import { useRef, useEffect } from 'react';

interface ChatInputProps {
  value: string;
  isLoading: boolean;
  disabled: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({
  value,
  isLoading,
  disabled,
  onChange,
  onSend,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
    const maxHeight = lineHeight * 6;
    const newHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${newHeight}px`;
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="input-container">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="message-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          rows={1}
          disabled={isLoading}
        />
        <button
          className="send-btn"
          onClick={onSend}
          disabled={!value.trim() || isLoading || disabled}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
      <p className="input-hint">按 Enter 发送，Shift + Enter 换行</p>
    </div>
  );
}
