import { apiClient } from "./apiClient";
import type {
  CountryOption,
  DeveloperDetailResponse,
  DevelopersListResponse,
  InviteDeveloperPayload,
  InviteDeveloperResponse,
  ListDevelopersParams,
  MasterDataCountriesResponse,
  SupportedUrlsResponse,
  UpdateDeveloperPayload,
} from "../types/api";

const buildQuery = (params: ListDevelopersParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.sortBy?.trim()) search.set("sortBy", params.sortBy.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const developersService = {
  listDevelopers(params: ListDevelopersParams = {}) {
    return apiClient.get<DevelopersListResponse>(
      `/developers${buildQuery(params)}`,
      { auth: true }
    );
  },
  listDevelopersForDropdown(search?: string, signal?: AbortSignal) {
    const searchParams = new URLSearchParams();
    if (search?.trim()) searchParams.set("search", search.trim());
    const qs = searchParams.toString();
    return apiClient.get<import("../types/api").DevelopersDropdownResponse>(
      `/developers/list${qs ? `?${qs}` : ""}`,
      { auth: true, signal }
    );
  },
  inviteDeveloper(payload: InviteDeveloperPayload) {
    return apiClient.post<InviteDeveloperResponse>(
      "/developers/invite-developer",
      payload,
      { auth: true }
    );
  },
  getDeveloperById(id: string, signal?: AbortSignal) {
    return apiClient.get<DeveloperDetailResponse>(`/developers/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
  updateDeveloperById(id: string, payload: UpdateDeveloperPayload, signal?: AbortSignal) {
    return apiClient.put<DeveloperDetailResponse>(
      `/developers/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },
  verifyDeveloper(id: string, action: "approve" | "reject", signal?: AbortSignal) {
    return apiClient.post<{ developer?: DeveloperDetailResponse["developer"] }>(
      `/developers/${encodeURIComponent(id)}/verify`,
      { action },
      { auth: true, signal }
    );
  },
  async updateDeveloperProfilePicture(
    id: string,
    file: File,
    signal?: AbortSignal
  ): Promise<{ developer?: DeveloperDetailResponse["developer"] }> {
    const body = new FormData();
    body.append("profilePicture", file);
    return apiClient.put<{ developer?: DeveloperDetailResponse["developer"] }>(
      `/developers/${encodeURIComponent(id)}/profile-picture`,
      body,
      { auth: true, signal }
    );
  },
  async removeDeveloperProfilePicture(
    id: string,
    signal?: AbortSignal
  ): Promise<{ developer?: DeveloperDetailResponse["developer"] }> {
    const body = new FormData();
    body.append("removeProfilePicture", "true");
    return apiClient.put<{ developer?: DeveloperDetailResponse["developer"] }>(
      `/developers/${encodeURIComponent(id)}/profile-picture`,
      body,
      { auth: true, signal }
    );
  },
  async deleteDeveloperById(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete<void>(`/developers/${encodeURIComponent(id)}`, {
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
