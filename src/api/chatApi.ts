import { API_BASE } from '../constants';
import type { TalkRequest, StreamData } from '../types';

type StreamCallback = (data: StreamData) => void;
type ErrorCallback = (error: string) => void;

export const ApiErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  SERVER_ERROR: 'SERVER_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  ABORTED: 'ABORTED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ApiErrorCodeType = typeof ApiErrorCode[keyof typeof ApiErrorCode];

export class ApiError extends Error {
  code: ApiErrorCodeType;
  statusCode?: number;

  constructor(message: string, code: ApiErrorCodeType, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

const DEFAULT_TIMEOUT = 30000;

class ChatApi {
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('请求超时，请检查网络连接', ApiErrorCode.TIMEOUT);
      }
      throw new ApiError('网络连接失败，请检查网络设置', ApiErrorCode.NETWORK_ERROR);
    }
  }

  private handleResponseError(response: Response): never {
    if (response.status >= 500) {
      throw new ApiError(`服务器错误 (${response.status})`, ApiErrorCode.SERVER_ERROR, response.status);
    }
    if (response.status >= 400) {
      throw new ApiError(`请求错误 (${response.status})`, ApiErrorCode.SERVER_ERROR, response.status);
    }
    throw new ApiError('未知响应错误', ApiErrorCode.UNKNOWN, response.status);
  }

  async getModels(): Promise<string[]> {
    console.log('[API Request] GET', `${API_BASE}/get_models`);
    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/get_models`);
      
      if (!response.ok) {
        this.handleResponseError(response);
      }

      const data = await response.json();
      console.log('[API Response] GET', `${API_BASE}/get_models`, '=>', data);
      return data;
    } catch (error) {
      console.error('[API Error] GET', `${API_BASE}/get_models`, '=>', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('获取模型列表失败', ApiErrorCode.UNKNOWN);
    }
  }

  async createSession(): Promise<string> {
    console.log('[API Request] GET', `${API_BASE}/new_session`);
    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/new_session`);
      
      if (!response.ok) {
        this.handleResponseError(response);
      }

      const data = await response.json();
      console.log('[API Response] GET', `${API_BASE}/new_session`, '=>', data);
      return data;
    } catch (error) {
      console.error('[API Error] GET', `${API_BASE}/new_session`, '=>', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('创建会话失败', ApiErrorCode.UNKNOWN);
    }
  }

  async sendMessage(
    request: TalkRequest,
    onStream: StreamCallback,
    onError: ErrorCallback,
    signal?: AbortSignal
  ): Promise<void> {
    console.log('[API Request] POST', `${API_BASE}/talk`, '=>', request);

    try {
      const response = await this.fetchWithTimeout(
        `${API_BASE}/talk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: request.session_id,
            user_input: request.user_input,
            model: request.model,
          }),
        },
        60000
      );

      console.log('[API Response] POST', `${API_BASE}/talk`, 'Status:', response.status);

      if (!response.ok) {
        this.handleResponseError(response);
      }

      if (!response.body) {
        throw new ApiError('响应体为空', ApiErrorCode.SERVER_ERROR);
      }

      await this.processStream(response.body, onStream, onError, signal);
      console.log('[API] 流式响应结束');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[API] 请求被取消');
        throw new ApiError('请求已取消', ApiErrorCode.ABORTED);
      }
      console.error('[API Error] POST', `${API_BASE}/talk`, '=>', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('发送消息失败', ApiErrorCode.UNKNOWN);
    }
  }

  private async processStream(
    body: ReadableStream<Uint8Array>,
    onStream: StreamCallback,
    onError: ErrorCallback,
    signal?: AbortSignal
  ): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent = '';

    try {
      while (true) {
        if (signal?.aborted) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.startsWith('event:')) {
            currentEvent = trimmedLine.slice(6).trim();
            continue;
          }
          
          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.slice(5).trim();
            
            if (currentEvent === 'complete') {
              console.log('[API] 收到 complete 事件');
              return;
            }
            
            if (currentEvent === 'error') {
              try {
                const data = JSON.parse(dataStr);
                console.error('[API Error] 收到 error 事件:', data.error);
                onError(data.error);
              } catch (e) {
                console.error('[API Error] 解析 error 事件失败:', e);
                onError(dataStr);
              }
              continue;
            }
            
            if (currentEvent === 'message') {
              if (!dataStr) continue;
              try {
                const data = JSON.parse(dataStr);
                console.log('[API Stream Data]', data);
                onStream(data as StreamData);
              } catch (e) {
                console.error('[API Error] 解析 message 数据失败:', e, 'Data:', dataStr);
              }
              continue;
            }
            
            if (!dataStr || dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              console.log('[API Stream Data]', data);
              if (data.error) {
                console.error('[API Error] 流式接口返回错误:', data.error);
                onError(data.error);
                continue;
              }
              onStream(data as StreamData);
            } catch (e) {
              console.error('[API Error] 解析数据失败:', e, 'Data:', dataStr);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${API_BASE}/get_models`, {}, 5000);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const chatApi = new ChatApi();
