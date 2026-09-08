import { apiClient } from "./apiClient";
import type {
  AmenityMasterItem,
  DeveloperDropdownItem,
  DevelopersDropdownResponse,
  MasterDataAmenitiesResponse,
  MasterDataProjectLocationsResponse,
  MasterDataPropertyClassificationResponse,
  ProjectDetailResponse,
  ProjectLocationOption,
  ProjectsListResponse,
  PropertyTypeMasterItem,
  SupportedUrlsResponse,
} from "../types/api";

const buildListQuery = (params: ListProjectsParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.developer?.trim()) search.set("developer", params.developer.trim());
  if (params.agency?.trim()) search.set("agency", params.agency.trim());
  if (params.city?.trim()) search.set("city", params.city.trim());
  if (params.startDate?.trim()) search.set("startDate", params.startDate.trim());
  if (params.endDate?.trim()) search.set("endDate", params.endDate.trim());
  if (params.sortBy?.trim()) search.set("sortBy", params.sortBy.trim());
  if (params.status?.trim()) search.set("status", params.status.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type ListProjectsParams = {
  page?: number;
  limit?: number;
  search?: string;
  developer?: string;
  agency?: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  status?: string;
};

export const projectsService = {
  listProjects(params: ListProjectsParams = {}, signal?: AbortSignal) {
    return apiClient.get<ProjectsListResponse>(`/projects${buildListQuery(params)}`, {
      auth: true,
      signal,
    });
  },

  getProjectById(id: string, signal?: AbortSignal) {
    return apiClient.get<ProjectDetailResponse>(`/projects/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },

  updateProject(projectId: string, body: Record<string, unknown>, signal?: AbortSignal) {
    return apiClient.put<ProjectDetailResponse>(
      `/projects/${encodeURIComponent(projectId)}`,
      body,
      { auth: true, signal }
    );
  },

  deleteProject(id: string, signal?: AbortSignal) {
    return apiClient.delete<{ projectId?: string; message?: string }>(
      `/projects/${encodeURIComponent(id)}`,
      { auth: true, signal }
    );
  },

  uploadProjectMedia(formData: FormData, signal?: AbortSignal) {
    return apiClient.post<{ uploads?: Record<string, unknown>; projectId?: string }>(
      "/projects/upload-media",
      formData,
      { auth: true, signal }
    );
  },

  async getSupportedUrls(signal?: AbortSignal): Promise<SupportedUrlsMasterData> {
    return apiClient.get<SupportedUrlsMasterData>("/master-data?types=supportedurls", {
      auth: true,
      signal,
    });
  },

  async listProjectLocations(signal?: AbortSignal): Promise<ProjectLocationOption[]> {
    const data = await apiClient.get<MasterDataProjectLocationsResponse>(
      "/master-data?types=projectlocations",
      { auth: true, signal }
    );
    return (data.projectLocations ?? data.projectlocations ?? []).filter((loc) =>
      loc?.displayName?.trim()
    );
  },

  async listAmenities(signal?: AbortSignal): Promise<AmenityMasterItem[]> {
    const data = await apiClient.get<MasterDataAmenitiesResponse>(
      "/master-data?types=amenities",
      { auth: true, signal }
    );
    return (data.amenities ?? []).filter((item) => item?._id);
  },

  async listPropertyTypesMaster(signal?: AbortSignal) {
    const data = await apiClient.get<{ propertyTypes?: Array<{ _id: string; name?: string }> }>(
      "/master-data?types=propertytypes",
      { auth: true, signal }
    );
    return data.propertyTypes ?? [];
  },

  listDevelopersForDropdown(search?: string, signal?: AbortSignal) {
    const searchParams = new URLSearchParams();
    if (search?.trim()) searchParams.set("search", search.trim());
    const qs = searchParams.toString();
    return apiClient.get<DevelopersDropdownResponse>(
      `/developers/list${qs ? `?${qs}` : ""}`,
      { auth: true, signal }
    );
  },
};

/** Master-data supported URLs; includes legacy lowercase keys from some API responses. */
export type SupportedUrlsMasterData = SupportedUrlsResponse & {
  supportedurls?: SupportedUrlsResponse["supportedUrls"];
  items?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export type { AmenityMasterItem, DeveloperDropdownItem, PropertyTypeMasterItem };
