export type ExpertRole = "agency" | "agent" | "developer";

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type ExpertUser = {
  id: string;
  email: string;
  role: ExpertRole;
  name: string;
  isVerified: boolean;
  profilePicture: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  agencyName?: string;
  fullName?: string;
};

export type AuthSession = {
  user: ExpertUser;
  tokens: TokenPair;
};

export type ApiEnvelope<T> = {
  status?: boolean;
  success?: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
};
