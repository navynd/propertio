import { apiClient } from "./apiClient";
import type {
  AgentDetailResponse,
  AgentsDropdownResponse,
  AgentsListResponse,
  CountryOption,
  InviteAgentPayload,
  InviteAgentResponse,
  JobTitleOption,
  ListAgentsParams,
  MasterDataAgentExperienceResponse,
  MasterDataAgentTypesResponse,
  MasterDataCountriesResponse,
  MasterDataJobTitlesResponse,
  SupportedUrlsResponse,
  UpdateAgentPayload,
  VerifyAgentPayload,
} from "../types/api";

const buildQuery = (params: ListAgentsParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.sortBy?.trim()) search.set("sortBy", params.sortBy.trim());
  if (params.agency?.trim()) search.set("agency", params.agency.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const agentsService = {
  listAgentsForDropdown(search?: string, signal?: AbortSignal) {
    const searchParams = new URLSearchParams();
    if (search?.trim()) searchParams.set("search", search.trim());
    const qs = searchParams.toString();
    return apiClient.get<AgentsDropdownResponse>(`/agents/list${qs ? `?${qs}` : ""}`, {
      auth: true,
      signal,
    });
  },
  listAgents(params: ListAgentsParams = {}) {
    return apiClient.get<AgentsListResponse>(`/agents${buildQuery(params)}`, {
      auth: true,
    });
  },
  inviteAgent(payload: InviteAgentPayload, signal?: AbortSignal) {
    return apiClient.post<InviteAgentResponse>("/agents/invite-agent", payload, {
      auth: true,
      signal,
    });
  },
  getAgentById(id: string, signal?: AbortSignal) {
    return apiClient.get<AgentDetailResponse>(`/agents/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
  updateAgentById(id: string, payload: UpdateAgentPayload, signal?: AbortSignal) {
    return apiClient.put<AgentDetailResponse>(`/agents/${encodeURIComponent(id)}`, payload, {
      auth: true,
      signal,
    });
  },
  verifyAgent(id: string, payload: VerifyAgentPayload, signal?: AbortSignal) {
    return apiClient.post<{ agent?: AgentDetailResponse["agent"] }>(
      `/agents/${encodeURIComponent(id)}/verify`,
      payload,
      { auth: true, signal }
    );
  },
  async updateAgentProfilePicture(
    id: string,
    file: File,
    signal?: AbortSignal
  ): Promise<{ agent?: AgentDetailResponse["agent"] }> {
    const body = new FormData();
    body.append("profilePicture", file);
    return apiClient.put<{ agent?: AgentDetailResponse["agent"] }>(
      `/agents/${encodeURIComponent(id)}/profile-picture`,
      body,
      { auth: true, signal }
    );
  },
  async removeAgentProfilePicture(
    id: string,
    signal?: AbortSignal
  ): Promise<{ agent?: AgentDetailResponse["agent"] }> {
    const body = new FormData();
    body.append("removeProfilePicture", "true");
    return apiClient.put<{ agent?: AgentDetailResponse["agent"] }>(
      `/agents/${encodeURIComponent(id)}/profile-picture`,
      body,
      { auth: true, signal }
    );
  },
  async deleteAgentById(id: string, signal?: AbortSignal): Promise<void> {
    await apiClient.delete<void>(`/agents/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
  getAgentTypes(signal?: AbortSignal) {
    return apiClient.get<MasterDataAgentTypesResponse>(
      "/master-data?types=agenttypes",
      { auth: true, signal }
    );
  },
  getAgentExperienceOptions(signal?: AbortSignal) {
    return apiClient.get<MasterDataAgentExperienceResponse>(
      "/master-data?types=agentexperience",
      { auth: true, signal }
    );
  },
  async listJobTitles(signal?: AbortSignal): Promise<JobTitleOption[]> {
    const data = await apiClient.get<MasterDataJobTitlesResponse>(
      "/master-data?types=jobtitles",
      { auth: true, signal }
    );
    return (data.jobTitles ?? []).filter((item) => item?._id && item?.title);
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
