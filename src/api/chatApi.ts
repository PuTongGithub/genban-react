import { API_BASE } from '../constants';
import type { TalkRequest, StreamData } from '../types';

type StreamCallback = (data: StreamData) => void;
type ErrorCallback = (error: string) => void;

class ChatApi {
  async getModels(): Promise<string[]> {
    console.log('[API Request] GET', `${API_BASE}/get_models`);
    try {
      const response = await fetch(`${API_BASE}/get_models`);
      const data = await response.json();
      console.log('[API Response] GET', `${API_BASE}/get_models`, '=>', data);
      return data;
    } catch (error) {
      console.error('[API Error] GET', `${API_BASE}/get_models`, '=>', error);
      throw error;
    }
  }

  async createSession(): Promise<string> {
    console.log('[API Request] GET', `${API_BASE}/new_session`);
    try {
      const response = await fetch(`${API_BASE}/new_session`);
      const data = await response.json();
      console.log('[API Response] GET', `${API_BASE}/new_session`, '=>', data);
      return data;
    } catch (error) {
      console.error('[API Error] GET', `${API_BASE}/new_session`, '=>', error);
      throw error;
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
      const response = await fetch(`${API_BASE}/talk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: request.sessionId,
          userInput: request.userInput,
          model: request.model,
        }),
        signal,
      });

      console.log('[API Response] POST', `${API_BASE}/talk`, 'Status:', response.status);

      if (!response.body) {
        throw new Error('响应体为空');
      }

      await this.processStream(response.body, onStream, onError);
      console.log('[API] 流式响应结束');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('[API] 请求被取消');
      } else {
        console.error('[API Error] POST', `${API_BASE}/talk`, '=>', error);
        throw error;
      }
    }
  }

  private async processStream(
    body: ReadableStream<Uint8Array>,
    onStream: StreamCallback,
    onError: ErrorCallback
  ): Promise<void> {
    const reader = body.getReader();
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
        if (trimmedLine.startsWith('data:')) {
          const dataStr = trimmedLine.slice(5).trim();
          if (dataStr === '[DONE]' || !dataStr) continue;

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
  }
}

export const chatApi = new ChatApi();
