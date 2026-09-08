import { apiClient } from "./apiClient";
import type {
  ProjectLocationRecord,
  ProjectLocationsListResponse,
  PropertyLocationRecord,
  PropertyLocationsListResponse,
} from "../types/api";

export type ListListingSearchCitiesParams = {
  page?: number;
  limit?: number;
  search?: string;
  linkedOnly?: boolean;
};

const buildQuery = (params: ListListingSearchCitiesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.linkedOnly === true) search.set("linkedOnly", "true");
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type ListingSearchCityPayload = {
  displayName: string;
  cityKey?: string;
};

export const propertyLocationsService = {
  list(params: ListListingSearchCitiesParams = {}, signal?: AbortSignal) {
    return apiClient.get<PropertyLocationsListResponse>(
      `/master-data/property-locations${buildQuery(params)}`,
      { auth: true, signal }
    );
  },

  create(payload: ListingSearchCityPayload, signal?: AbortSignal) {
    return apiClient.post<{ propertyLocation: PropertyLocationRecord }>(
      "/master-data/property-locations",
      payload,
      { auth: true, signal }
    );
  },

  update(id: string, payload: Pick<ListingSearchCityPayload, "displayName">, signal?: AbortSignal) {
    return apiClient.put<{ propertyLocation: PropertyLocationRecord }>(
      `/master-data/property-locations/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },

  delete(id: string, signal?: AbortSignal) {
    return apiClient.delete<void>(
      `/master-data/property-locations/${encodeURIComponent(id)}`,
      { auth: true, signal }
    );
  },
};

export const projectLocationsService = {
  list(params: ListListingSearchCitiesParams = {}, signal?: AbortSignal) {
    return apiClient.get<ProjectLocationsListResponse>(
      `/master-data/project-locations${buildQuery(params)}`,
      { auth: true, signal }
    );
  },

  create(payload: ListingSearchCityPayload, signal?: AbortSignal) {
    return apiClient.post<{ projectLocation: ProjectLocationRecord }>(
      "/master-data/project-locations",
      payload,
      { auth: true, signal }
    );
  },

  update(id: string, payload: Pick<ListingSearchCityPayload, "displayName">, signal?: AbortSignal) {
    return apiClient.put<{ projectLocation: ProjectLocationRecord }>(
      `/master-data/project-locations/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },

  delete(id: string, signal?: AbortSignal) {
    return apiClient.delete<void>(
      `/master-data/project-locations/${encodeURIComponent(id)}`,
      { auth: true, signal }
    );
  },
};
