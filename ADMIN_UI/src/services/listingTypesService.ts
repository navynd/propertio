import { apiClient } from "./apiClient";
import type { ListingTypeRecord, ListingTypesListResponse } from "../types/api";

export type ListListingTypesParams = {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  transaction?: string;
  isActive?: boolean;
};

const buildQuery = (params: ListListingTypesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.category?.trim()) search.set("category", params.category.trim());
  if (params.transaction?.trim()) search.set("transaction", params.transaction.trim());
  if (params.isActive !== undefined) search.set("isActive", String(params.isActive));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type ListingTypePayload = {
  name: string;
  slug?: string;
  transaction: string;
  category?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
};

export const listingTypesService = {
  listListingTypes(params: ListListingTypesParams = {}, signal?: AbortSignal) {
    return apiClient.get<ListingTypesListResponse>(
      `/master-data/listing-types${buildQuery(params)}`,
      { auth: true, signal }
    );
  },

  createListingType(payload: ListingTypePayload, signal?: AbortSignal) {
    return apiClient.post<{ listingType: ListingTypeRecord }>(
      "/master-data/listing-types",
      payload,
      { auth: true, signal }
    );
  },

  updateListingType(id: string, payload: ListingTypePayload, signal?: AbortSignal) {
    return apiClient.put<{ listingType: ListingTypeRecord }>(
      `/master-data/listing-types/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },

  deleteListingType(id: string, signal?: AbortSignal) {
    return apiClient.delete<void>(`/master-data/listing-types/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
};
