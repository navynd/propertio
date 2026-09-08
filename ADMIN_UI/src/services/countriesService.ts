import { apiClient } from "./apiClient";
import type {
  CountriesListResponse,
  CountryListCounts,
  CountryRecord,
} from "../types/api";

export type ListCountriesParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

const buildQuery = (params: ListCountriesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.isActive !== undefined) search.set("isActive", String(params.isActive));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type CountryPayload = {
  name: string;
  code: string;
  phoneCode?: string;
  flag?: string;
  currency?: { code?: string; symbol?: string };
  isActive?: boolean;
  displayOrder?: number;
};

export const countriesService = {
  listCountries(params: ListCountriesParams = {}, signal?: AbortSignal) {
    return apiClient.get<CountriesListResponse>(
      `/master-data/countries${buildQuery(params)}`,
      { auth: true, signal }
    );
  },

  createCountry(payload: CountryPayload, signal?: AbortSignal) {
    return apiClient.post<{ country: CountryRecord }>(
      "/master-data/countries",
      payload,
      { auth: true, signal }
    );
  },

  updateCountry(id: string, payload: CountryPayload, signal?: AbortSignal) {
    return apiClient.put<{ country: CountryRecord }>(
      `/master-data/countries/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },

  deleteCountry(id: string, signal?: AbortSignal) {
    return apiClient.delete<void>(`/master-data/countries/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
};

export type { CountryListCounts };
