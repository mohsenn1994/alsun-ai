import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../lib/api';

/** What consumers of the auth context can read/do. */
interface AuthContextValue {
  authenticated: boolean;
  username: string | null;
  loading: boolean; // true during the initial /me check
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Provides session state to the whole app. On mount it calls /api/auth/me once to
 * learn whether a valid cookie already exists (so a refresh keeps you signed in),
 * and exposes login/logout that update the in-memory state after the API call.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Establish the session state once on load.
  useEffect(() => {
    authApi
      .me()
      .then((state) => {
        setAuthenticated(state.authenticated);
        setUsername(state.username ?? null);
      })
      .catch(() => {
        setAuthenticated(false);
        setUsername(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(u: string, p: string) {
    const state = await authApi.login(u, p);
    setAuthenticated(state.authenticated);
    setUsername(state.username ?? null);
  }

  async function logout() {
    await authApi.logout();
    setAuthenticated(false);
    setUsername(null);
  }

  return (
    <AuthContext.Provider value={{ authenticated, username, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to read the auth context; throws if used outside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
