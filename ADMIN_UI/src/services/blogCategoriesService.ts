import { apiClient } from "./apiClient";
import type {
  BlogCategoriesListResponse,
  BlogCategoryListCounts,
  BlogCategoryRecord,
  BlogSubcategoryRecord,
} from "../types/api";

export type ListBlogCategoriesParams = {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
};

const buildQuery = (params: ListBlogCategoriesParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.isActive !== undefined) search.set("isActive", String(params.isActive));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type BlogCategoryPayload = {
  name: string;
  slug?: string;
  displayOrder?: number;
  isActive?: boolean;
  subcategories?: BlogSubcategoryRecord[];
};

export const blogCategoriesService = {
  listBlogCategories(params: ListBlogCategoriesParams = {}, signal?: AbortSignal) {
    return apiClient.get<BlogCategoriesListResponse>(
      `/master-data/blog-categories${buildQuery(params)}`,
      { auth: true, signal }
    );
  },

  createBlogCategory(payload: BlogCategoryPayload, signal?: AbortSignal) {
    return apiClient.post<{ category: BlogCategoryRecord }>(
      "/master-data/blog-categories",
      payload,
      { auth: true, signal }
    );
  },

  updateBlogCategory(id: string, payload: BlogCategoryPayload, signal?: AbortSignal) {
    return apiClient.put<{ category: BlogCategoryRecord }>(
      `/master-data/blog-categories/${encodeURIComponent(id)}`,
      payload,
      { auth: true, signal }
    );
  },

  deleteBlogCategory(id: string, signal?: AbortSignal) {
    return apiClient.delete<void>(`/master-data/blog-categories/${encodeURIComponent(id)}`, {
      auth: true,
      signal,
    });
  },
};

export type { BlogCategoryListCounts };
