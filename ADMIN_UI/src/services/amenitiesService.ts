import { apiClient } from "./apiClient";
import type { AmenitiesListResponse, AmenityRecord } from "../types/api";

export type ListAmenitiesParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
};

const buildQuery = (params: ListAmenitiesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.category?.trim()) search.set("category", params.category.trim());
  if (params.isActive !== undefined) search.set("isActive", String(params.isActive));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type AmenityFormPayload = {
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
  imageFile?: File | null;
  removeImage?: boolean;
};

const appendAmenityFields = (form: FormData, payload: AmenityFormPayload) => {
  form.append("name", payload.name.trim());
  form.append("category", payload.category.trim());
  form.append("isActive", String(payload.isActive));
  if (payload.description !== undefined) {
    form.append("description", payload.description.trim());
  }
  if (payload.removeImage) {
    form.append("removeImage", "true");
  }
  if (payload.imageFile) {
    form.append("image", payload.imageFile);
  }
};

export const amenitiesService = {
  listAmenities(params: ListAmenitiesParams = {}, signal?: AbortSignal) {
    return apiClient.get<AmenitiesListResponse>(
      `/master-data/amenities${buildQuery(params)}`,
      { auth: true, signal }
    );
  },

  getAmenityById(id: string, signal?: AbortSignal) {
    return apiClient.get<{ amenity: AmenityRecord }>(
      `/master-data/amenities/${encodeURIComponent(id)}`,
      { auth: true, signal }
    );
  },

  createAmenity(payload: AmenityFormPayload, signal?: AbortSignal) {
    const form = new FormData();
    appendAmenityFields(form, payload);
    return apiClient.post<{ amenity: AmenityRecord }>("/master-data/amenities", form, {
      auth: true,
      signal,
    });
  },

  updateAmenity(id: string, payload: AmenityFormPayload, signal?: AbortSignal) {
    const form = new FormData();
    appendAmenityFields(form, payload);
    return apiClient.put<{ amenity: AmenityRecord }>(
      `/master-data/amenities/${encodeURIComponent(id)}`,
      form,
      { auth: true, signal }
    );
  },

  deleteAmenity(id: string, signal?: AbortSignal) {
    return apiClient.delete<void>(`/master-data/amenities/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
};
