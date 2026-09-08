import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://estatehub.tj/api").replace(
  /\/$/,
  ""
);

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

type ApiEnvelope<T> = {
  status?: boolean;
  success?: boolean;
  message?: string;
  data: T;
};

export type TeamSeoFields = {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
};

export type TeamPageSettings = {
  pageTitle?: string;
  pageSubtitle?: string;
  itemsPerPage?: number;
  seo?: TeamSeoFields;
};

export type TeamMember = {
  id: string;
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  profileImage: string;
  displayOrder: number;
};

export type TeamPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type TeamPageResponse = {
  settings: TeamPageSettings;
  members: TeamMember[];
  pagination: TeamPagination;
  mediaBaseUrl?: { img?: string };
};

const unwrap = <T,>(raw: ApiEnvelope<T>): T => raw?.data ?? (raw as unknown as T);

export const teamService = {
  async getTeams(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<TeamPageResponse> {
    const search = new URLSearchParams();
    if (params?.search?.trim()) search.set("search", params.search.trim());
    if (params?.page != null) search.set("page", String(params.page));
    if (params?.limit != null) search.set("limit", String(params.limit));
    const qs = search.toString();
    const response = await apiClient.get<ApiEnvelope<TeamPageResponse>>(
      `/teams${qs ? `?${qs}` : ""}`
    );
    return unwrap(response.data);
  },
};
