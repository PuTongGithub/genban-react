import { create } from 'zustand';
import type { Message, StreamData } from '../types';

interface ChatState {
  // 消息状态
  messages: Message[];
  messageIds: Set<string>;

  // UI 状态
  isLoading: boolean;

  // 当前助手消息追踪
  currentAssistantId: string | null;

  // Actions - 消息管理
  addMessage: (message: Message) => void;
  updateLastMessage: (updater: (msg: Message) => Message) => void;
  appendToLastMessage: (content: string) => void;
  clearMessages: () => void;

  // Actions - 流数据处理
  handleStreamData: (data: StreamData) => void;
  handleStreamError: (error: string) => void;

  // Actions - UI 状态
  setLoading: (loading: boolean) => void;
  clearError: () => void;

  // Actions - 追踪
  setCurrentAssistantId: (id: string | null) => void;

  // Actions - 批量更新
  startNewChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // 初始状态
  messages: [],
  messageIds: new Set(),
  isLoading: false,
  currentAssistantId: null,

  // 消息管理
  addMessage: (message) => {
    const { messageIds } = get();
    const messageId = `${message.role}-${message.content}-${Date.now()}`;

    if (messageIds.has(messageId)) return;

    set((state) => ({
      messages: [...state.messages, message],
      messageIds: new Set([...state.messageIds, messageId]),
    }));
  },

  updateLastMessage: (updater) => {
    set((state) => {
      if (state.messages.length === 0) return state;

      const newMessages = [...state.messages];
      const lastIndex = newMessages.length - 1;
      newMessages[lastIndex] = updater(newMessages[lastIndex]);

      return { messages: newMessages };
    });
  },

  appendToLastMessage: (content) => {
    set((state) => {
      if (state.messages.length === 0) return state;

      const newMessages = [...state.messages];
      const lastIndex = newMessages.length - 1;
      const lastMessage = newMessages[lastIndex];

      if (lastMessage.role === 'assistant') {
        newMessages[lastIndex] = {
          ...lastMessage,
          content: lastMessage.content + content,
        };
      }

      return { messages: newMessages };
    });
  },

  clearMessages: () =>
    set({
      messages: [],
      messageIds: new Set(),
      currentAssistantId: null,
    }),

  // 流数据处理
  handleStreamData: (data) => {
    const { type, id, role, content, reasoning_content, tool_calls } = data;
    const { messageIds, currentAssistantId } = get();

    // 检查消息是否已存在（通过 ID 去重）
    if (messageIds.has(id)) {
      // 更新现有助手消息
      if (role === 'assistant' && id === currentAssistantId) {
        set((state) => {
          const newMessages = [...state.messages];
          const lastIndex = newMessages.length - 1;

          if (lastIndex >= 0 && newMessages[lastIndex].role === 'assistant') {
            newMessages[lastIndex] = {
              ...newMessages[lastIndex],
              content: content || '',
              reasoningContent: reasoning_content || '',
              toolCalls: tool_calls || newMessages[lastIndex].toolCalls,
              source: type,
            };
          }

          return { messages: newMessages };
        });
      }
      return;
    }

    // 新消息处理 - 添加到 messageIds
    set((state) => ({
      messageIds: new Set([...state.messageIds, id]),
    }));

    if (type === 'error') {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            role: 'assistant',
            content: content || '',
            reasoningContent: '',
            source: 'error',
          },
        ],
        currentAssistantId: null,
        isLoading: false,
      }));
    } else if (role === 'user') {
      // 用户消息直接添加
      set((state) => ({
        messages: [
          ...state.messages,
          { role: 'user', content: content || '', source: type },
        ],
      }));
    } else if (role === 'tool') {
      set((state) => ({
        messages: [
          ...state.messages,
          { role: 'tool', content: content || '', source: type },
        ],
        currentAssistantId: null,
      }));
    } else if (role === 'assistant') {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            role: 'assistant',
            content: content || '',
            reasoningContent: reasoning_content || '',
            toolCalls: tool_calls || undefined,
            source: type,
          },
        ],
        currentAssistantId: id,
      }));
    }
  },

  handleStreamError: (error) => {
    set((state) => {
      const lastMessage = state.messages[state.messages.length - 1];
      const errorContent = `❌ 错误：${error}`;

      if (
        lastMessage &&
        lastMessage.role === 'assistant' &&
        !lastMessage.content &&
        !lastMessage.reasoningContent
      ) {
        // 更新空的助手消息
        const newMessages = [...state.messages];
        newMessages[newMessages.length - 1] = {
          ...lastMessage,
          content: errorContent,
        };
        return { messages: newMessages, currentAssistantId: null, isLoading: false };
      }

      // 添加新的错误消息
      return {
        messages: [
          ...state.messages,
          {
            role: 'assistant',
            content: errorContent,
            reasoningContent: '',
            source: 'assistant',
          },
        ],
        currentAssistantId: null,
        isLoading: false,
      };
    });
  },

  // UI 状态
  setLoading: (isLoading) => set({ isLoading }),
  clearError: () => set({}),

  // 追踪
  setCurrentAssistantId: (currentAssistantId) => set({ currentAssistantId }),

  // 批量更新
  startNewChat: () =>
    set({
      messages: [],
      messageIds: new Set(),
      currentAssistantId: null,
    }),
}));
