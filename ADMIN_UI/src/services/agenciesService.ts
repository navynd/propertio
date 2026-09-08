import { apiClient } from "./apiClient";
import type {
  AgenciesDropdownResponse,
  AgenciesListResponse,
  AgencyDetailResponse,
  CountryOption,
  InviteAgencyPayload,
  ListAgenciesParams,
  MasterDataCountriesResponse,
  SupportedUrlsResponse,
  UpdateAgencyPayload,
} from "../types/api";

const buildQuery = (params: ListAgenciesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.sortBy?.trim()) search.set("sortBy", params.sortBy.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const agenciesService = {
  inviteAgency(payload: InviteAgencyPayload, signal?: AbortSignal) {
    return apiClient.post("/agency/invite-agency", payload, { auth: true, signal });
  },
  listAgencies(params: ListAgenciesParams = {}) {
    return apiClient.get<AgenciesListResponse>(`/agency${buildQuery(params)}`, {
      auth: true,
    });
  },
  listAgenciesForDropdown(search?: string, signal?: AbortSignal) {
    const searchParams = new URLSearchParams();
    if (search?.trim()) searchParams.set("search", search.trim());
    const qs = searchParams.toString();
    return apiClient.get<AgenciesDropdownResponse>(
      `/agency/list${qs ? `?${qs}` : ""}`,
      {
        auth: true,
        signal,
      }
    );
  },
  getAgencyById(id: string, signal?: AbortSignal) {
    return apiClient.get<AgencyDetailResponse>(`/agency/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
  updateAgencyById(id: string, payload: UpdateAgencyPayload, signal?: AbortSignal) {
    return apiClient.put<AgencyDetailResponse>(`/agency/${encodeURIComponent(id)}`, payload, {
      auth: true,
      signal,
    });
  },
  verifyAgency(id: string, action: "approve" | "reject", signal?: AbortSignal) {
    return apiClient.post<{ agency?: AgencyDetailResponse["agency"] }>(
      `/agency/${encodeURIComponent(id)}/verify`,
      { action },
      { auth: true, signal }
    );
  },
  async updateAgencyProfilePicture(
    id: string,
    file: File,
    signal?: AbortSignal
  ): Promise<{ agency?: AgencyDetailResponse["agency"] }> {
    const body = new FormData();
    body.append("profilePicture", file);
    return apiClient.put<{ agency?: AgencyDetailResponse["agency"] }>(
      `/agency/${encodeURIComponent(id)}/profile-picture`,
      body,
      { auth: true, signal }
    );
  },
  async removeAgencyProfilePicture(
    id: string,
    signal?: AbortSignal
  ): Promise<{ agency?: AgencyDetailResponse["agency"] }> {
    const body = new FormData();
    body.append("removeProfilePicture", "true");
    return apiClient.put<{ agency?: AgencyDetailResponse["agency"] }>(
      `/agency/${encodeURIComponent(id)}/profile-picture`,
      body,
      { auth: true, signal }
    );
  },
  async deleteAgencyById(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete<void>(`/agency/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
  async getSupportedUrls(signal?: AbortSignal): Promise<SupportedUrlsResponse> {
    return apiClient.get<SupportedUrlsResponse>("/master-data?types=supportedurls", {
      auth: true,
      signal,
    });
  },
  async listMasterCountries(signal?: AbortSignal): Promise<CountryOption[]> {
    const data = await apiClient.get<MasterDataCountriesResponse>(
      "/master-data?types=countries",
      { auth: true, signal }
    );
    return (data.countries ?? [])
      .filter((country) => country?.name && country?.code && country?.phoneCode)
      .sort(
        (a, b) =>
          (a.displayOrder ?? Number.MAX_SAFE_INTEGER) -
          (b.displayOrder ?? Number.MAX_SAFE_INTEGER)
      )
      .map((country, index) => ({
        id: index + 1,
        _id: country._id,
        name: country.name?.trim() || "",
        dialCode: country.phoneCode?.trim() || "",
        code: country.code?.trim() || "",
        flag: country.flag?.trim() || "",
      }))
      .filter((country) => country.name && country.code && country.dialCode);
  },
};
