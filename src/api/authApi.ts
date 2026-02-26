import { API_BASE } from '../constants';
import type { LoginRequest, LoginResponse } from '../types';
import { ApiError, ApiErrorCode } from './chatApi';

class AuthApi {
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

  async login(request: LoginRequest): Promise<LoginResponse> {
    console.log('[API Request] POST', `${API_BASE}/login`);
    try {
      const response = await this.fetchWithErrorHandling(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new ApiError('用户名或密码错误', ApiErrorCode.SERVER_ERROR, response.status);
        }
        if (response.status >= 500) {
          throw new ApiError(`服务器错误 (${response.status})`, ApiErrorCode.SERVER_ERROR, response.status);
        }
        throw new ApiError(`请求错误 (${response.status})`, ApiErrorCode.SERVER_ERROR, response.status);
      }

      const data: LoginResponse = await response.json();
      console.log('[API Response] POST', `${API_BASE}/login`, '=>', data);
      return data;
    } catch (error) {
      console.error('[API Error] POST', `${API_BASE}/login`, '=>', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('登录失败', ApiErrorCode.UNKNOWN);
    }
  }
}

export const authApi = new AuthApi();
