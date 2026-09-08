// AUTH STORAGE
// ------------
// This file is a very small helper around `localStorage`.
// It knows how to **save** and **load** the current PFExpert session:
//   - access token
//   - refresh token
//   - user object (id, email, role, etc.)
//
// Other parts of the app (like `AuthContext` and `apiClient`) call this
// instead of talking to `localStorage` directly.
import type { AuthSession } from "../types/auth";

// Use constant keys so they are easy to find / change.
const ACCESS_TOKEN_KEY = "pfexperts.accessToken";
const REFRESH_TOKEN_KEY = "pfexperts.refreshToken";
const USER_KEY = "pfexperts.user";

// When running in tests / SSR there is no `window`.
const isBrowser = typeof window !== "undefined";

export const authStorage = {
  // Read just the access token string from localStorage.
  getAccessToken(): string | null {
    if (!isBrowser) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  // Read just the refresh token string from localStorage.
  getRefreshToken(): string | null {
    if (!isBrowser) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  // Read and parse the stored user JSON.
  getUser(): AuthSession["user"] | null {
    if (!isBrowser) return null;
    const raw = window.localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession["user"];
    } catch {
      return null;
    }
  },

  // Convenience helper:
  // - Try to read **everything** we need for an authenticated session.
  // - If any piece is missing (access token / refresh token / user),
  //   return `null` to indicate "not logged in".
  getSession(): AuthSession | null {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const user = this.getUser();
    if (!accessToken || !refreshToken || !user) return null;
    return {
      user,
      tokens: { accessToken, refreshToken },
    };
  },

  // Save a full session into localStorage.
  setSession(session: AuthSession): void {
    if (!isBrowser) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, session.tokens.accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, session.tokens.refreshToken);
    window.localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  },

  // Completely clear the stored session.
  // Used on logout or when refresh token fails.
  clearSession(): void {
    if (!isBrowser) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  },
};
