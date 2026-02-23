interface ChatHeaderProps {
  isLoading: boolean;
  onNewChat: () => void;
}

export function ChatHeader({
  isLoading,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <div className="chat-header">
      <div className="header-left">
        <h1 className="chat-title">AI 聊天助手</h1>
      </div>
      <div className="header-right">
        <button
          className="new-chat-btn"
          onClick={onNewChat}
          disabled={isLoading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v16m8-8H4" />
          </svg>
          新建对话
        </button>
      </div>
    </div>
  );
}
