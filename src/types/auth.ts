export interface LoginRequest {
  user_id: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expires_at: number;
  error: string;
}

export interface UserInfo {
  userId: string;
  token: string;
  expiresAt: number;
}
