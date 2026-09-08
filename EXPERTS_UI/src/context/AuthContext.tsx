import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authService, type LoginPayload } from "../services/authService";
import { setAuthRefreshHandler } from "../services/apiClient";
import type { AuthSession } from "../types/auth";

type AuthContextValue = {
  session: AuthSession | null;
  isAuthReady: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<AuthSession>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const refreshSession = useCallback(async () => {
    const refreshed = await authService.refreshSession();
    setSession(refreshed);
    return refreshed;
  }, []);

  useEffect(() => {
    const stored = authService.hydrateSession();
    setSession(stored);
    setIsAuthReady(true);
  }, []);

  useEffect(() => {
    setAuthRefreshHandler(async () => {
      const refreshed = await refreshSession();
      return refreshed?.tokens.accessToken ?? null;
    });
    return () => setAuthRefreshHandler(null);
  }, [refreshSession]);

  const login = useCallback(async (payload: LoginPayload) => {
    const nextSession = await authService.login(payload);
    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setSession(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthReady,
      isAuthenticated: Boolean(session?.tokens.accessToken),
      login,
      logout,
      refreshSession,
    }),
    [session, isAuthReady, login, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
