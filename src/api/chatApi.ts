import { httpClient, ApiError } from './client';
import type { SubmitRequest, SubmitResponse, StreamData } from '../types';

type StreamCallback = (data: StreamData) => void;
type ErrorCallback = (error: string) => void;
type CompleteCallback = () => void;

class ChatApi {
  async submit(request: SubmitRequest): Promise<SubmitResponse> {
    return httpClient.post<SubmitResponse>('/submit', request);
  }

  async connectStream(
    onStream: StreamCallback,
    onError: ErrorCallback,
    onComplete: CompleteCallback,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const response = await httpClient.stream('/stream', { signal });
      await this.processStream(response.body!, onStream, onError, onComplete, signal);
    } catch (err) {
      // 如果是取消错误，直接抛出，让上层处理
      if (err instanceof ApiError && err.code === 'ABORTED') {
        throw err;
      }
      // 其他错误也直接抛出
      throw err;
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
          await reader.cancel();
          break;
        }

        let done: boolean;
        let value: Uint8Array | undefined;

        try {
          const result = await reader.read();
          done = result.done;
          value = result.value;
        } catch (readErr) {
          // 读取过程中可能被取消
          if (signal?.aborted || (readErr instanceof DOMException && readErr.name === 'AbortError')) {
            await reader.cancel();
            break;
          }
          throw readErr;
        }

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
              } catch {
                onError(dataStr);
              }
              continue;
            }

            if (currentEvent === 'message' || !currentEvent) {
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
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // 忽略释放锁的错误
      }
    }
  }
}

export { ApiError };
export const chatApi = new ChatApi();
