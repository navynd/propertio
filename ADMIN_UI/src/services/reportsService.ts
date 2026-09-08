import { apiClient } from "./apiClient";
import type {
  ListReportsParams,
  ReportDetailResponse,
  ReportsListResponse,
} from "../types/api";

const buildQuery = (params: ListReportsParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.status) search.set("status", params.status);
  if (params.priority) search.set("priority", params.priority);
  if (params.reportType) search.set("reportType", params.reportType);
  if (params.userType) search.set("userType", params.userType);
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.startDate?.trim()) search.set("startDate", params.startDate.trim());
  if (params.endDate?.trim()) search.set("endDate", params.endDate.trim());
  if (params.counts) search.set("counts", "true");
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const reportsService = {
  listReports(params: ListReportsParams = {}, signal?: AbortSignal) {
    return apiClient.get<ReportsListResponse>(`/reports${buildQuery(params)}`, {
      auth: true,
      signal,
    });
  },
  getReportById(id: string, signal?: AbortSignal) {
    return apiClient.get<ReportDetailResponse>(`/reports/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
  updateReport(id: string, payload: Record<string, unknown>, signal?: AbortSignal) {
    return apiClient.put<{ reportId: string }>(
      `/reports/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },
  addInternalNote(id: string, note: string, signal?: AbortSignal) {
    return apiClient.post<{ reportId: string }>(
      `/reports/${encodeURIComponent(id)}/internal-notes`,
      { note },
      { auth: true, signal }
    );
  },
  deleteReport(id: string, signal?: AbortSignal) {
    return apiClient.delete<{ reportId: string }>(
      `/reports/${encodeURIComponent(id)}`,
      { auth: true, signal }
    );
  },
};

