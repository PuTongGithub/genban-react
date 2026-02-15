interface ChatHeaderProps {
  models: string[];
  selectedModel: string;
  isLoading: boolean;
  onModelChange: (model: string) => void;
  onNewChat: () => void;
}

export function ChatHeader({
  models,
  selectedModel,
  isLoading,
  onModelChange,
  onNewChat,
}: ChatHeaderProps) {
  return (
    <div className="chat-header">
      <div className="header-left">
        <h1 className="chat-title">AI 聊天助手</h1>
      </div>
      <div className="header-right">
        <select
          className="model-select"
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={isLoading}
        >
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        
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
