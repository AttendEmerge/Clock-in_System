import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { setAuthToken, setOnAuthFailed } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User, remember?: boolean) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: try to restore session via refresh token cookie.
  // 401 here is expected when the user has no session (first visit or logged out); we then show the login page.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/refresh', {
          method:      'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setAuthToken(data.token);
          setToken(data.token);
          setUser(data.user);
        }
      } catch {
        // No valid session — stay logged out
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Let the API interceptor clear React auth state instead of doing a hard
  // window.location redirect, so ProtectedRoute handles the redirect gracefully.
  useEffect(() => {
    setOnAuthFailed(() => {
      setAuthToken(null);
      setToken(null);
      setUser(null);
    });
    return () => setOnAuthFailed(null);
  }, []);

  const login = (newToken: string, newUser: User, remember = false) => {
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    // Store just the user's name as a login hint (not the token)
    if (remember) {
      localStorage.setItem('login_hint', newUser.name);
    } else {
      localStorage.removeItem('login_hint');
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setAuthToken(null);
    setToken(null);
    setUser(null);
    localStorage.removeItem('login_hint');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
