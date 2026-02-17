interface ErrorBannerProps {
  message: string;
  isOffline?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, isOffline, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <div className="error-content">
        <span className="error-icon">{isOffline ? '🌐' : '⚠️'}</span>
        <span className="error-message">{message}</span>
      </div>
      <div className="error-actions">
        {onRetry && (
          <button className="error-retry-btn" onClick={onRetry}>
            重试
          </button>
        )}
        {onDismiss && (
          <button className="error-dismiss-btn" onClick={onDismiss}>
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
