import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { chatApi, ApiError } from '../api';
import { useAuthStore } from './authStore';
import type { StreamData } from '../types';

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
};

interface ChatConnectionState {
  // 连接状态
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  isOffline: boolean;

  // 内部状态（不暴露给组件）
  abortController: AbortController | null;
  retryCount: number;
  retryTimeout: ReturnType<typeof setTimeout> | null;

  // Actions
  connect: (callbacks: ConnectionCallbacks) => void;
  disconnect: () => void;
  resetRetryCount: () => void;
}

interface ConnectionCallbacks {
  onStreamData: (data: StreamData) => void;
  onStreamError: (error: string) => void;
  onAuthError?: () => void;
  onComplete?: () => void;
}

export const useChatConnectionStore = create<ChatConnectionState>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    isConnected: false,
    isConnecting: false,
    error: null,
    isOffline: false,
    abortController: null,
    retryCount: 0,
    retryTimeout: null,

    connect: (callbacks) => {
      const { onStreamData, onStreamError, onAuthError, onComplete } = callbacks;
      const state = get();

      // 防止重复连接
      if (state.isConnecting || state.abortController) {
        console.log('[ChatConnection] 已在连接中，跳过');
        return;
      }

      const currentToken = useAuthStore.getState().userInfo?.token;
      if (!currentToken) {
        console.log('[ChatConnection] 无 token，跳过连接');
        return;
      }

      console.log('[ChatConnection] 开始连接...');

      const abortController = new AbortController();

      set({
        isConnecting: true,
        isConnected: true,
        error: null,
        isOffline: false,
        abortController,
      });

      const doConnect = async () => {
        try {
          await chatApi.connectStream(
            (data) => {
              console.log('[ChatConnection] 收到数据:', data);
              onStreamData(data);
            },
            (err) => {
              console.error('[ChatConnection] 流错误:', err);
              onStreamError(err);
            },
            () => {
              console.log('[ChatConnection] 连接完成');
              onComplete?.();
            },
            abortController.signal
          );

          // 连接成功，重置重试计数
          set({ retryCount: 0 });
        } catch (err) {
          console.error('[ChatConnection] 连接错误:', err);

          if (err instanceof ApiError) {
            if (err.code === 'ABORTED') {
              console.log('[ChatConnection] 连接被取消');
              return;
            }

            if (err.code === 'UNAUTHORIZED') {
              set({
                isConnected: false,
                isConnecting: false,
                abortController: null,
              });
              onAuthError?.();
              return;
            }

            if (err.code === 'NETWORK_ERROR') {
              set({ isOffline: true });
            }

            // 自动重试逻辑
            const currentRetryCount = get().retryCount;
            if (currentRetryCount < RETRY_CONFIG.maxRetries) {
              const newRetryCount = currentRetryCount + 1;
              const delay = Math.min(
                RETRY_CONFIG.initialDelay * Math.pow(2, newRetryCount - 1),
                RETRY_CONFIG.maxDelay
              );

              set({
                retryCount: newRetryCount,
                error: `连接断开，${delay / 1000}秒后自动重试 (${newRetryCount}/${RETRY_CONFIG.maxRetries})...`,
              });

              const retryTimeout = setTimeout(() => {
                set({ isConnecting: false, abortController: null });
                get().connect(callbacks);
              }, delay);

              set({ retryTimeout });
              return;
            }

            set({
              error: `连接失败，已重试${RETRY_CONFIG.maxRetries}次，请检查网络后点击重试按钮`,
            });
          } else {
            set({ error: '连接失败，请稍后重试' });
          }
        } finally {
          const currentState = get();
          if (currentState.abortController === abortController) {
            set({
              isConnecting: false,
              isConnected: false,
              abortController: null,
            });
          }
        }
      };

      doConnect();
    },

    disconnect: () => {
      const state = get();

      console.log('[ChatConnection] 断开连接');

      // 清除重试定时器
      if (state.retryTimeout) {
        clearTimeout(state.retryTimeout);
      }

      // 取消正在进行的请求
      if (state.abortController) {
        state.abortController.abort();
      }

      set({
        isConnected: false,
        isConnecting: false,
        abortController: null,
        retryTimeout: null,
        retryCount: 0,
      });
    },

    resetRetryCount: () => {
      set({ retryCount: 0 });
    },
  }))
);

// 导出选择器，方便组件使用
export const selectConnectionStatus = (state: ChatConnectionState) => ({
  isConnected: state.isConnected,
  isConnecting: state.isConnecting,
});

export const selectConnectionError = (state: ChatConnectionState) => ({
  error: state.error,
  isOffline: state.isOffline,
});
