interface ChatHeaderProps {
  isLoading: boolean;
  onNewChat: () => void;
  onLogout: () => void;
}

export function ChatHeader({
  isLoading,
  onNewChat,
  onLogout,
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
        <button
          className="logout-btn"
          onClick={onLogout}
          title="退出登录"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
