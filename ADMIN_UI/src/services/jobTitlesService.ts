import { apiClient } from "./apiClient";
import type {
  JobTitleListCounts,
  JobTitleRecord,
  JobTitlesListResponse,
} from "../types/api";

export type ListJobTitlesParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

const buildQuery = (params: ListJobTitlesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.isActive !== undefined) search.set("isActive", String(params.isActive));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type JobTitlePayload = {
  title: string;
  description?: string;
  isActive?: boolean;
};

export const jobTitlesService = {
  listJobTitles(params: ListJobTitlesParams = {}, signal?: AbortSignal) {
    return apiClient.get<JobTitlesListResponse>(
      `/master-data/job-titles${buildQuery(params)}`,
      { auth: true, signal }
    );
  },

  createJobTitle(payload: JobTitlePayload, signal?: AbortSignal) {
    return apiClient.post<{ jobTitle: JobTitleRecord }>(
      "/master-data/job-titles",
      payload,
      { auth: true, signal }
    );
  },

  updateJobTitle(id: string, payload: JobTitlePayload, signal?: AbortSignal) {
    return apiClient.put<{ jobTitle: JobTitleRecord }>(
      `/master-data/job-titles/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },

  deleteJobTitle(id: string, signal?: AbortSignal) {
    return apiClient.delete<void>(`/master-data/job-titles/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
};

export type { JobTitleListCounts };
