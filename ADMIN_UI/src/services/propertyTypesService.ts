import { apiClient } from "./apiClient";
import type { PropertyTypeRecord, PropertyTypesListResponse } from "../types/api";

export type ListPropertyTypesParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

const buildQuery = (params: ListPropertyTypesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.isActive !== undefined) search.set("isActive", String(params.isActive));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type PropertyTypePayload = {
  name: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
};

export const propertyTypesService = {
  listPropertyTypes(params: ListPropertyTypesParams = {}, signal?: AbortSignal) {
    return apiClient.get<PropertyTypesListResponse>(
      `/master-data/property-types${buildQuery(params)}`,
      { auth: true, signal }
    );
  },

  createPropertyType(payload: PropertyTypePayload, signal?: AbortSignal) {
    return apiClient.post<{ propertyType: PropertyTypeRecord }>(
      "/master-data/property-types",
      payload,
      { auth: true, signal }
    );
  },

  updatePropertyType(id: string, payload: PropertyTypePayload, signal?: AbortSignal) {
    return apiClient.put<{ propertyType: PropertyTypeRecord }>(
      `/master-data/property-types/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },

  deletePropertyType(id: string, signal?: AbortSignal) {
    return apiClient.delete<void>(`/master-data/property-types/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
};
