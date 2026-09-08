const ACCESS_TOKEN_KEY = "molumulk.admin.accessToken";
const REFRESH_TOKEN_KEY = "molumulk.admin.refreshToken";
const ADMIN_USER_KEY = "molumulk.admin.user";

const isBrowser = typeof window !== "undefined";

export const authStorage = {
  getAccessToken(): string | null {
    if (!isBrowser) return null;
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (!isBrowser) return null;
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setTokens(accessToken: string, refreshToken: string) {
    if (!isBrowser) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  getAdminUser<T = unknown>(): T | null {
    if (!isBrowser) return null;
    const raw = window.localStorage.getItem(ADMIN_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setAdminUser(user: unknown) {
    if (!isBrowser) return;
    window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user ?? null));
  },

  clear() {
    if (!isBrowser) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(ADMIN_USER_KEY);
  },
};
