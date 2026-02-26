import { useState } from 'react';
import './Login.css';

export interface LoginProps {
  onLogin: (userId: string, password: string) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

export function Login({ onLogin, isLoading, error }: LoginProps) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim() || !password.trim() || isLoading) return;
    await onLogin(userId, password);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Genban AI</h1>
          <p>智能助手，为您服务</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="userId">用户名</label>
            <input
              id="userId"
              type="text"
              placeholder="请输入用户名"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              id="password"
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error">
              <span className="login-error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoading || !userId.trim() || !password.trim()}
          >
            {isLoading ? (
              <>
                <span className="login-spinner" />
                登录中...
              </>
            ) : (
              '登录'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>请输入您的账号密码进行登录</p>
        </div>
      </div>
    </div>
  );
}
