import { httpClient } from './client';
import type { LoginRequest, LoginResponse } from '../types';

class AuthApi {
  async login(request: LoginRequest): Promise<LoginResponse> {
    return httpClient.post<LoginResponse>('/login', request, { skipAuth: true });
  }
}

export const authApi = new AuthApi();
