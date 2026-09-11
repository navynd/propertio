import { authStorage } from "./authStorage";
import type { ApiEnvelope } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://propertio-api.onrender.com/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RefreshHandler = () => Promise<string | null>;

class ApiError extends Error {
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

let refreshHandler: RefreshHandler | null = null;
let ongoingRefresh: Promise<string | null> | null = null;

export const setAuthRefreshHandler = (handler: RefreshHandler | null) => {
  refreshHandler = handler;
};

const isJsonResponse = (response: Response) =>
  response.headers.get("content-type")?.includes("application/json");

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!isJsonResponse(response)) {
    return null as T;
  }
  return (await response.json()) as T;
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshHandler) return null;
  if (!ongoingRefresh) {
    ongoingRefresh = refreshHandler().finally(() => {
      ongoingRefresh = null;
    });
  }
  return ongoingRefresh;
};

type RequestOptions = {
  body?: unknown;
  headers?: Record<string, string>;
  auth?: boolean;
  retryOnAuthFail?: boolean;
  signal?: AbortSignal;
};

const request = async <T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {}
): Promise<T> => {
  const {
    body,
    headers = {},
    auth = true,
    retryOnAuthFail = true,
    signal,
  } = options;

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
    if (accessToken) requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
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
    payload?.message ||
    payload?.error ||
    `Request failed with status ${response.status}`;

  if (!response.ok) {
    if (response.status === 401 && auth && retryOnAuthFail) {
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        return request<T>(method, path, {
          ...options,
          retryOnAuthFail: false,
        });
      }
    }
    throw new ApiError(message, response.status, payload?.code, payload);
  }

  return (payload?.data as T) ?? (payload as unknown as T);
};

/** Uses API `message` from failed responses (ApiError) when present. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  if (error instanceof Error && error.message) return error.message;
  const msg = (error as { message?: string })?.message;
  return (msg && String(msg).trim()) || fallback;
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

export { ApiError, API_BASE_URL };
