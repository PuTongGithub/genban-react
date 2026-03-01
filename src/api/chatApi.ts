import { API_BASE } from '../constants';
import type { SubmitRequest, SubmitResponse, StreamData } from '../types';

type StreamCallback = (data: StreamData) => void;
type ErrorCallback = (error: string) => void;
type CompleteCallback = () => void;

export const ApiErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  ABORTED: 'ABORTED',
  UNAUTHORIZED: 'UNAUTHORIZED',
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

class ChatApi {
  private async fetchWithErrorHandling(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('请求已取消', ApiErrorCode.ABORTED);
      }
      throw new ApiError('网络连接失败，请检查网络设置', ApiErrorCode.NETWORK_ERROR);
    }
  }

  private handleResponseError(response: Response): never {
    if (response.status === 401) {
      throw new ApiError('未授权，请重新登录', ApiErrorCode.UNAUTHORIZED, response.status);
    }
    if (response.status >= 500) {
      throw new ApiError(`服务器错误 (${response.status})`, ApiErrorCode.SERVER_ERROR, response.status);
    }
    if (response.status >= 400) {
      throw new ApiError(`请求错误 (${response.status})`, ApiErrorCode.SERVER_ERROR, response.status);
    }
    throw new ApiError('未知响应错误', ApiErrorCode.UNKNOWN, response.status);
  }

  async submit(request: SubmitRequest, token: string): Promise<SubmitResponse> {
    console.log('[API Request] POST', `${API_BASE}/submit`, '=>', request);
    try {
      const response = await this.fetchWithErrorHandling(`${API_BASE}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        this.handleResponseError(response);
      }

      const data: SubmitResponse = await response.json();
      console.log('[API Response] POST', `${API_BASE}/submit`, '=>', data);
      return data;
    } catch (error) {
      console.error('[API Error] POST', `${API_BASE}/submit`, '=>', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('提交消息失败', ApiErrorCode.UNKNOWN);
    }
  }

  async connectStream(
    token: string,
    onStream: StreamCallback,
    onError: ErrorCallback,
    onComplete: CompleteCallback,
    signal?: AbortSignal
  ): Promise<void> {
    console.log('[API Request] POST', `${API_BASE}/stream`, 'Establishing SSE connection...');

    try {
      const response = await this.fetchWithErrorHandling(
        `${API_BASE}/stream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          signal,
        }
      );

      console.log('[API Response] POST', `${API_BASE}/stream`, 'Status:', response.status);

      if (!response.ok) {
        this.handleResponseError(response);
      }

      if (!response.body) {
        throw new ApiError('响应体为空', ApiErrorCode.SERVER_ERROR);
      }

      await this.processStream(response.body, onStream, onError, onComplete, signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[API] 连接被取消');
        throw new ApiError('请求已取消', ApiErrorCode.ABORTED);
      }
      console.error('[API Error] POST', `${API_BASE}/stream`, '=>', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('连接流式接口失败', ApiErrorCode.UNKNOWN);
    }
  }

  private async processStream(
    body: ReadableStream<Uint8Array>,
    onStream: StreamCallback,
    onError: ErrorCallback,
    onComplete: CompleteCallback,
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
              onComplete();
              continue;
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
}

export const chatApi = new ChatApi();
