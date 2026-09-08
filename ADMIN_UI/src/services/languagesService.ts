import { apiClient } from "./apiClient";
import type {
  LanguageListCounts,
  LanguageRecord,
  LanguagesListResponse,
} from "../types/api";

export type ListLanguagesParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

const buildQuery = (params: ListLanguagesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.isActive !== undefined) search.set("isActive", String(params.isActive));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type LanguagePayload = {
  name: string;
  code?: string;
  nativeName?: string;
  isActive?: boolean;
};

export const languagesService = {
  listLanguages(params: ListLanguagesParams = {}, signal?: AbortSignal) {
    return apiClient.get<LanguagesListResponse>(
      `/master-data/languages${buildQuery(params)}`,
      { auth: true, signal }
    );
  },

  createLanguage(payload: LanguagePayload, signal?: AbortSignal) {
    return apiClient.post<{ language: LanguageRecord }>(
      "/master-data/languages",
      payload,
      { auth: true, signal }
    );
  },

  updateLanguage(id: string, payload: LanguagePayload, signal?: AbortSignal) {
    return apiClient.put<{ language: LanguageRecord }>(
      `/master-data/languages/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },

  deleteLanguage(id: string, signal?: AbortSignal) {
    return apiClient.delete<void>(`/master-data/languages/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
};

export type { LanguageListCounts };
