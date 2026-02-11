import { useState, useRef, useEffect, useCallback } from 'react';
import './index.css';

const API_BASE = '/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  reasoningContent?: string;
}

interface StreamData {
  role: string;
  content: string;
  reasoning_content: string;
}

export default function ChatAssistant() {
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initializedRef = useRef(false);

  // 获取模型列表
  const fetchModels = useCallback(async () => {
    try {
      console.log('[API Request] GET', `${API_BASE}/get_models`);
      const response = await fetch(`${API_BASE}/get_models`);
      const data = await response.json();
      console.log('[API Response] GET', `${API_BASE}/get_models`, '=>', data);
      setModels(data);
      if (data.length > 0) {
        setSelectedModel(data[0]);
      }
    } catch (error) {
      console.error('[API Error] GET', `${API_BASE}/get_models`, '=>', error);
    }
  }, []);

  // 创建新会话
  const createNewSession = useCallback(async () => {
    try {
      console.log('[API Request] GET', `${API_BASE}/new_session`);
      const response = await fetch(`${API_BASE}/new_session`);
      const data = await response.json();
      console.log('[API Response] GET', `${API_BASE}/new_session`, '=>', data);
      setSessionId(data);
      return data;
    } catch (error) {
      console.error('[API Error] GET', `${API_BASE}/new_session`, '=>', error);
      return null;
    }
  }, []);

  // 初始化
  useEffect(() => {
    // 防止 React 18 严格模式下重复调用
    if (initializedRef.current) return;
    initializedRef.current = true;

    fetchModels();
    createNewSession();
  }, [fetchModels, createNewSession]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 新建对话
  const handleNewChat = async () => {
    // 取消正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages([]);
    setInputValue('');
    await createNewSession();
  };

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId || !selectedModel || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    // 添加空的助手消息
    setMessages(prev => [...prev, { role: 'assistant', content: '', reasoningContent: '' }]);

    // 创建 AbortController
    abortControllerRef.current = new AbortController();

    const requestBody = {
      sessionId,
      userInput: userMessage,
      model: selectedModel,
    };
    console.log('[API Request] POST', `${API_BASE}/talk`, '=>', requestBody);

    try {
      const response = await fetch(`${API_BASE}/talk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      console.log('[API Response] POST', `${API_BASE}/talk`, 'Status:', response.status);

      if (!response.body) {
        throw new Error('响应体为空');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          // 处理 data: 或 data: 开头（带或不带空格）
          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.slice(5).trim();
            if (dataStr === '[DONE]' || !dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              console.log('[API Stream Data]', data);

              // 处理错误数据
              if (data.error) {
                console.error('[API Error] 流式接口返回错误:', data.error);
                setMessages(prev => {
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage && lastMessage.role === 'assistant') {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...lastMessage,
                        content: `❌ 错误：${data.error}`,
                      },
                    ];
                  }
                  return prev;
                });
                continue;
              }

              // 处理正常流式数据
              const streamData = data as StreamData;
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.role === 'assistant') {
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastMessage,
                      content: lastMessage.content + (streamData.content || ''),
                      reasoningContent: lastMessage.reasoningContent + (streamData.reasoning_content || ''),
                    },
                  ];
                }
                return prev;
              });
            } catch (e) {
              console.error('[API Error] 解析数据失败:', e, 'Data:', dataStr);
            }
          }
        }
      }
      console.log('[API] 流式响应结束');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[API] 请求被取消');
      } else {
        console.error('[API Error] POST', `${API_BASE}/talk`, '=>', error);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = '抱歉，发生了错误，请稍后重试。';
          }
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      {/* 头部 */}
      <div className="chat-header">
        <div className="header-left">
          <h1 className="chat-title">AI 聊天助手</h1>
        </div>
        <div className="header-right">
          {/* 模型选择 */}
          <select
            className="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isLoading}
          >
            {models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          
          {/* 新建对话按钮 */}
          <button
            className="new-chat-btn"
            onClick={handleNewChat}
            disabled={isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 4v16m8-8H4" />
            </svg>
            新建对话
          </button>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p>开始一个新的对话吧</p>
            <p className="empty-hint">输入消息与 AI 助手交流</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-content-wrapper">
                {/* 推理内容（仅助手消息显示） */}
                {message.role === 'assistant' && message.reasoningContent && (
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
                      思考过程
                    </button>
                    {isReasoningExpanded && (
                      <div className="reasoning-content">
                        {message.reasoningContent}
                      </div>
                    )}
                  </div>
                )}
                {/* 主内容 */}
                <div className="message-content">
                  {message.content || (isLoading && index === messages.length - 1 && message.role === 'assistant' ? (
                    <span className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  ) : null)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            className="message-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            disabled={isLoading}
          />
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading || !sessionId}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
        <p className="input-hint">按 Enter 发送，Shift + Enter 换行</p>
      </div>
    </div>
  );
}
