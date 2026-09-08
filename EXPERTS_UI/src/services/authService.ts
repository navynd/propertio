import { apiClient } from "./apiClient";
import { authStorage } from "./authStorage";
import type { AuthSession, ExpertUser, TokenPair } from "../types/auth";

export type LoginPayload = {
  email: string;
  password: string;
  /** When true, API issues a longer-lived refresh token (same as consumer user login). */
  rememberMe?: boolean;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type VerifyOtpPayload = {
  email: string;
  otp: string;
};

export type ResetPasswordPayload = {
  email: string;
  newPassword: string;
};

type AuthResponseData = {
  token?: string;
  tokens?: Partial<TokenPair>;
  user?: ExpertUser;
};

const toSession = (data: AuthResponseData): AuthSession => {
  const accessToken = data.tokens?.accessToken ?? data.token;
  const refreshToken = data.tokens?.refreshToken;
  const user = data.user;

  if (!accessToken || !refreshToken || !user) {
    throw new Error("Invalid auth response from server");
  }

  return {
    user,
    tokens: { accessToken, refreshToken },
  };
};

const persistSession = (session: AuthSession) => {
  authStorage.setSession(session);
  return session;
};

export const authService = {
  hydrateSession(): AuthSession | null {
    return authStorage.getSession();
  },

  async login(payload: LoginPayload): Promise<AuthSession> {
    const { email, password, rememberMe } = payload;
    const data = await apiClient.post<AuthResponseData>(
      "/auth/pfexperts/login",
      { email, password, rememberMe },
      {
        auth: false,
      }
    );
    return persistSession(toSession(data));
  },

  async refreshSession(): Promise<AuthSession | null> {
    const currentRefreshToken = authStorage.getRefreshToken();
    if (!currentRefreshToken) return null;

    try {
      const data = await apiClient.post<AuthResponseData>(
        "/auth/pfexperts/refresh",
        { refreshToken: currentRefreshToken },
        { auth: false, retryOnAuthFail: false }
      );
      return persistSession(toSession(data));
    } catch {
      authStorage.clearSession();
      return null;
    }
  },

  async logout(): Promise<void> {
    const session = authStorage.getSession();
    try {
      if (session?.tokens?.refreshToken) {
        await apiClient.post(
          "/auth/pfexperts/logout",
          {
            refreshToken: session.tokens.refreshToken,
            email: session.user.email,
            id: session.user.id,
          },
          { auth: false, retryOnAuthFail: false },
        );
      }
    } catch {
      // Still clear locally so the user can always leave the app (network / 401 / server errors).
    } finally {
      authStorage.clearSession();
    }
  },

  async sendOtp(payload: ForgotPasswordPayload): Promise<void> {
    await apiClient.post("/auth/pfexperts/send-otp", payload, { auth: false });
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<{ resetAllowedUntil?: string }> {
    const data = await apiClient.post<{ resetAllowedUntil?: string }>(
      "/auth/pfexperts/verify-otp",
      payload,
      { auth: false }
    );
    return data;
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await apiClient.post("/auth/pfexperts/reset-password", payload, { auth: false });
  },
};
