import { apiClient } from "./apiClient";
import { authStorage } from "./authStorage";

type AdminTokens = {
  accessToken: string;
  refreshToken: string;
};

type AdminLoginResponse = {
  admin: unknown;
  tokens: AdminTokens;
};

export type LoginPayload = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export const authService = {
  async login(payload: LoginPayload) {
    const data = await apiClient.post<AdminLoginResponse>(
      "/auth/login",
      payload,
      { auth: false }
    );
    authStorage.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    authStorage.setAdminUser(data.admin);
    return data;
  },

  sendOtp(email: string) {
    return apiClient.post<{ channel?: string }>(
      "/auth/send-otp",
      { email },
      { auth: false }
    );
  },

  verifyOtp(email: string, otp: string) {
    return apiClient.post<{ admin?: unknown }>(
      "/auth/verify-otp",
      { email, otp },
      { auth: false }
    );
  },

  resetPassword(email: string, newPassword: string) {
    return apiClient.post<{}>(
      "/auth/reset-password",
      { email, newPassword },
      { auth: false }
    );
  },

  async refreshSession() {
    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) return null;
    const data = await apiClient.post<AdminLoginResponse>(
      "/auth/refresh",
      { refreshToken },
      { auth: false }
    );
    authStorage.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    authStorage.setAdminUser(data.admin);
    return data;
  },

  async logout() {
    try {
      await apiClient.post("/auth/logout", {});
    } finally {
      authStorage.clear();
    }
  },
};
