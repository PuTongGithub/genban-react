import { API_BASE } from '../constants';

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'SERVER_ERROR'
  | 'PARSE_ERROR'
  | 'ABORTED'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export class ApiError extends Error {
  code: ErrorCode;
  statusCode?: number;

  constructor(message: string, code: ErrorCode, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

interface RequestConfig extends RequestInit {
  skipAuth?: boolean;
}

class HttpClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeader(): Record<string, string> {
    // 从 localStorage 读取 token（与 authStore 保持一致）
    const storage = localStorage.getItem('genban-auth-storage');
    if (storage) {
      try {
        const parsed = JSON.parse(storage);
        if (parsed.state?.userInfo?.token) {
          return { Authorization: `Bearer ${parsed.state.userInfo.token}` };
        }
      } catch {
        // 解析失败，忽略
      }
    }
    return {};
  }

  private async handleError(error: unknown): Promise<never> {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('请求已取消', 'ABORTED');
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('网络连接失败，请检查网络设置', 'NETWORK_ERROR');
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError('未知错误', 'UNKNOWN');
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        throw new ApiError('未授权，请重新登录', 'UNAUTHORIZED', response.status);
      }
      if (response.status >= 500) {
        throw new ApiError(
          `服务器错误 (${response.status})`,
          'SERVER_ERROR',
          response.status
        );
      }
      if (response.status >= 400) {
        throw new ApiError(
          `请求错误 (${response.status})`,
          'SERVER_ERROR',
          response.status
        );
      }
    }

    try {
      return await response.json();
    } catch {
      throw new ApiError('解析响应失败', 'PARSE_ERROR');
    }
  }

  async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { skipAuth = false, headers = {}, ...restConfig } = config;

    const url = `${this.baseURL}${endpoint}`;
    const authHeaders = skipAuth ? {} : this.getAuthHeader();

    try {
      console.log(`[API Request] ${config.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...restConfig,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers,
        },
      });

      const data = await this.handleResponse<T>(response);
      console.log(`[API Response] ${config.method || 'GET'} ${url} =>`, data);
      return data;
    } catch (error) {
      console.error(`[API Error] ${config.method || 'GET'} ${url} =>`, error);
      return this.handleError(error);
    }
  }

  // 便捷方法
  get<T>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  post<T>(
    endpoint: string,
    body: unknown,
    config?: Omit<RequestConfig, 'method' | 'body'>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // SSE 流式请求
  async stream(
    endpoint: string,
    config: Omit<RequestConfig, 'method'> = {}
  ): Promise<Response> {
    const { skipAuth = false, headers = {}, ...restConfig } = config;

    const url = `${this.baseURL}${endpoint}`;
    const authHeaders = skipAuth ? {} : this.getAuthHeader();

    try {
      console.log(`[API Stream] POST ${url}`);

      const response = await fetch(url, {
        ...restConfig,
        method: 'POST',
        headers: {
          ...authHeaders,
          ...headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new ApiError('未授权，请重新登录', 'UNAUTHORIZED', response.status);
        }
        if (response.status >= 500) {
          throw new ApiError(
            `服务器错误 (${response.status})`,
            'SERVER_ERROR',
            response.status
          );
        }
        throw new ApiError(
          `请求错误 (${response.status})`,
          'SERVER_ERROR',
          response.status
        );
      }

      if (!response.body) {
        throw new ApiError('响应体为空', 'SERVER_ERROR');
      }

      return response;
    } catch (error) {
      console.error(`[API Stream Error] POST ${url} =>`, error);
      return this.handleError(error);
    }
  }
}

export const httpClient = new HttpClient(API_BASE);
