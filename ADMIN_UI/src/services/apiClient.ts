import { authStorage } from "./authStorage";
import type { ApiEnvelope } from "../types/api";

export const API_BASE_URL =
  import.meta.env.VITE_ADMIN_API_URL ?? "http://localhost:4000/admin";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  signal?: AbortSignal;
  retryOnAuthFail?: boolean;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const isJsonResponse = (response: Response) =>
  response.headers.get("content-type")?.includes("application/json");

const parseResponse = async <T>(response: Response): Promise<T | null> => {
  if (!isJsonResponse(response)) return null;
  return (await response.json()) as T;
};

const request = async <T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { body, headers = {}, auth = true, signal, retryOnAuthFail = true } = options;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  const isFormDataBody =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormDataBody) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const accessToken = authStorage.getAccessToken();
    if (accessToken) {
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    }
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body:
      body === undefined
        ? undefined
        : isFormDataBody
          ? (body as FormData)
          : JSON.stringify(body),
    signal,
  });

  const payload = await parseResponse<ApiEnvelope<T>>(response);
  const message =
    payload?.message || `Request failed with status ${response.status}`;

  const ok = response.ok && payload?.status !== false;

  if (!ok) {
    if (response.status === 401 && auth && retryOnAuthFail) {
      const refreshToken = authStorage.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
            signal,
          });
          const refreshPayload = await parseResponse<ApiEnvelope<{
            tokens?: { accessToken?: string; refreshToken?: string };
            admin?: unknown;
          }>>(refreshResponse);
          const refreshedTokens = refreshPayload?.data?.tokens;
          if (
            refreshResponse.ok &&
            refreshPayload?.status !== false &&
            refreshedTokens?.accessToken &&
            refreshedTokens?.refreshToken
          ) {
            authStorage.setTokens(
              refreshedTokens.accessToken,
              refreshedTokens.refreshToken
            );
            if (refreshPayload?.data?.admin) {
              authStorage.setAdminUser(refreshPayload.data.admin);
            }
            return request<T>(method, path, {
              ...options,
              retryOnAuthFail: false,
            });
          }
        } catch {
          // Ignore and fall through to clear session + throw original auth error.
        }
      }
      authStorage.clear();
    }
    throw new ApiError(
      message,
      response.status,
      payload?.code,
      payload?.details ?? payload
    );
  }

  return (payload?.data as T) ?? (payload as unknown as T);
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (error instanceof Error) {
    return (
      error.name === "AbortError" ||
      error.message === "The operation was aborted." ||
      error.message === "signal is aborted without reason"
    );
  }
  return false;
}

export const apiClient = {
  get<T>(path: string, options?: Omit<RequestOptions, "body">) {
    return request<T>("GET", path, options);
  },
  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return request<T>("POST", path, { ...options, body });
  },
  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return request<T>("PUT", path, { ...options, body });
  },
  patch<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) {
    return request<T>("PATCH", path, { ...options, body });
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>("DELETE", path, options);
  },
};
