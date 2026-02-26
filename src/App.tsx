import { useAuth } from './hooks';
import { Login } from './components/Login';
import { ChatAssistant } from './components/ChatAssistant';

function App() {
  const { userInfo, isLoggedIn, isLoading, error, login, logout, clearError } = useAuth();

  const handleLogin = async (userId: string, password: string): Promise<boolean> => {
    clearError();
    return await login(userId, password);
  };

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={handleLogin}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <ChatAssistant
      token={userInfo!.token}
      onLogout={logout}
    />
  );
}

export default App;
