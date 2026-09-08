import { apiClient } from "./apiClient";
import type {
  CountryOption,
  ListUsersParams,
  MasterDataCountriesResponse,
  SupportedUrlsResponse,
  UpdateUserPayload,
  UserDetailResponse,
  UsersListResponse,
} from "../types/api";

const buildQuery = (params: ListUsersParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.isActive !== undefined) search.set("isActive", String(params.isActive));
  if (params.isBanned !== undefined) search.set("isBanned", String(params.isBanned));
  if (params.sortBy) search.set("sortBy", params.sortBy);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const usersService = {
  listUsers(params: ListUsersParams = {}) {
    return apiClient.get<UsersListResponse>(`/users${buildQuery(params)}`, {
      auth: true,
    });
  },
  async getUserById(id: string, signal?: AbortSignal): Promise<UserDetailResponse> {
    return apiClient.get<UserDetailResponse>(`/users/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
  async updateUserById(
    id: string,
    payload: UpdateUserPayload,
    signal?: AbortSignal
  ): Promise<UserDetailResponse> {
    return apiClient.put<UserDetailResponse>(`/users/${encodeURIComponent(id)}`, payload, {
      auth: true,
      signal,
    });
  },
  async updateUserProfilePicture(
    id: string,
    file: File,
    signal?: AbortSignal
  ): Promise<{ user?: UserDetailResponse["user"] }> {
    const body = new FormData();
    body.append("profilePicture", file);
    return apiClient.put<{ user?: UserDetailResponse["user"] }>(
      `/users/${encodeURIComponent(id)}/profile-picture`,
      body,
      { auth: true, signal }
    );
  },
  async deleteUserById(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete<void>(`/users/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
  async removeUserProfilePicture(
    id: string,
    signal?: AbortSignal
  ): Promise<{ user?: UserDetailResponse["user"] }> {
    const body = new FormData();
    body.append("removeProfilePicture", "true");
    return apiClient.put<{ user?: UserDetailResponse["user"] }>(
      `/users/${encodeURIComponent(id)}/profile-picture`,
      body,
      { auth: true, signal }
    );
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
