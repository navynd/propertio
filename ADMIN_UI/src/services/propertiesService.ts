import { apiClient } from "./apiClient";
import type {
  AmenityMasterItem,
  ListPropertiesParams,
  ListingTypeMasterItem,
  MasterDataAmenitiesResponse,
  MasterDataListingTypesResponse,
  MasterDataPropertyClassificationResponse,
  MasterDataPropertyLocationsResponse,
  NamedValueMasterItem,
  PropertiesListResponse,
  PropertyDetailResponse,
  PropertyLocationOption,
  PropertyTypeMasterItem,
  SupportedUrlsResponse,
} from "../types/api";

const buildQuery = (params: ListPropertiesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.agent?.trim()) search.set("agent", params.agent.trim());
  if (params.agency?.trim()) search.set("agency", params.agency.trim());
  if (params.city?.trim()) search.set("city", params.city.trim());
  if (params.startDate?.trim()) search.set("startDate", params.startDate.trim());
  if (params.endDate?.trim()) search.set("endDate", params.endDate.trim());
  if (params.sortBy?.trim()) search.set("sortBy", params.sortBy.trim());
  if (params.listingType?.trim()) search.set("listingType", params.listingType.trim());
  if (params.transaction?.trim()) search.set("transaction", params.transaction.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const propertiesService = {
  listProperties(params: ListPropertiesParams = {}, signal?: AbortSignal) {
    return apiClient.get<PropertiesListResponse>(`/properties${buildQuery(params)}`, {
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
  async listPropertyLocations(signal?: AbortSignal): Promise<PropertyLocationOption[]> {
    const data = await apiClient.get<MasterDataPropertyLocationsResponse>(
      "/master-data?types=propertylocations",
      { auth: true, signal }
    );
    return (data.propertyLocations ?? []).filter((loc) => loc?.displayName?.trim());
  },
  async listListingTypes(signal?: AbortSignal): Promise<ListingTypeMasterItem[]> {
    const data = await apiClient.get<MasterDataListingTypesResponse>(
      "/master-data?types=listingtypes",
      { auth: true, signal }
    );
    return (data.listingTypes ?? data.listingtypes ?? []).filter((item) => item?._id);
  },
  async getPropertyClassificationMasterData(
    signal?: AbortSignal
  ): Promise<{
    listingTypes: ListingTypeMasterItem[];
    propertyTypes: PropertyTypeMasterItem[];
    furnishedStatus: NamedValueMasterItem[];
  }> {
    const data = await apiClient.get<MasterDataPropertyClassificationResponse>(
      "/master-data?types=listingtypes,propertytypes,furnishedstatus",
      { auth: true, signal }
    );
    const sortByOrder = <T extends { displayOrder?: number; name?: string }>(items: T[]) =>
      [...items].sort((a, b) => {
        const ao = Number(a.displayOrder ?? 999);
        const bo = Number(b.displayOrder ?? 999);
        if (ao !== bo) return ao - bo;
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });

    const listingTypes = sortByOrder(
      (data.listingTypes ?? data.listingtypes ?? []).filter(
        (item) => item?._id && item.slug !== "new-projects"
      )
    );
    const propertyTypes = sortByOrder(
      (data.propertyTypes ?? data.propertytypes ?? []).filter((item) => item?._id)
    );
    const furnishedStatus = (data.furnishedStatus ?? data.furnishedstatus ?? []).filter(
      (item) => item?.name && item?.value
    );

    return { listingTypes, propertyTypes, furnishedStatus };
  },
  getPropertyById(id: string, signal?: AbortSignal) {
    return apiClient.get<PropertyDetailResponse>(
      `/properties/${encodeURIComponent(id)}`,
      { auth: true, signal }
    );
  },
  updateProperty(id: string, payload: Record<string, unknown>, signal?: AbortSignal) {
    return apiClient.put<PropertyDetailResponse>(
      `/properties/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },
  deleteProperty(id: string, signal?: AbortSignal) {
    return apiClient.delete<{ status?: boolean; message?: string }>(
      `/properties/${encodeURIComponent(id)}`,
      { auth: true, signal }
    );
  },
  uploadPropertyMedia(formData: FormData, signal?: AbortSignal) {
    return apiClient.post<{
      uploads?: {
        images?: Array<{ filename?: string; url?: string; path?: string }>;
        videos?: Array<{ filename?: string; url?: string; path?: string }>;
      };
      propertyUrl?: { img?: string; vid?: string };
    }>("/properties/upload-media", formData, {
      auth: true,
      signal,
    });
  },
  async listAmenities(signal?: AbortSignal): Promise<AmenityMasterItem[]> {
    const data = await apiClient.get<MasterDataAmenitiesResponse>(
      "/master-data?types=amenities",
      { auth: true, signal }
    );
    return (data.amenities ?? [])
      .filter((item) => item?._id)
      .sort((a, b) => {
        const ao = Number(a.displayOrder ?? 999);
        const bo = Number(b.displayOrder ?? 999);
        if (ao !== bo) return ao - bo;
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      });
  },
};
