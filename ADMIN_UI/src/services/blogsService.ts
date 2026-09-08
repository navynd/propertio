import { apiClient } from "./apiClient";
import type {
  BlogPageSettings,
  BlogPostRecord,
  BlogsAdminResponse,
  SupportedUrlsResponse,
} from "../types/api";

export type ListBlogsAdminParams = {
  page?: number;
  limit?: number;
  search?: string;
  postId?: string;
};

const buildQuery = (params: ListBlogsAdminParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.postId?.trim()) search.set("postId", params.postId.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type SaveBlogPostPayload = {
  postId?: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  categorySlug?: string;
  subcategorySlug?: string;
  tags?: string[];
  authorName?: string;
  readingTime?: number;
  publishDate?: string;
  displayOrder?: number;
  isFeatured?: boolean;
  isPublished?: boolean;
  allowComments?: boolean;
  coverImage?: string;
  coverImageFile?: File | null;
  removeImage?: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    metaKeywords?: string;
  };
};

const appendPostFields = (form: FormData, payload: SaveBlogPostPayload) => {
  form.append("action", "save-post");
  if (payload.postId) form.append("postId", payload.postId);
  form.append("title", payload.title.trim());
  form.append("slug", payload.slug.trim());
  form.append("excerpt", (payload.excerpt || "").trim());
  form.append("content", payload.content);
  if (payload.categorySlug) form.append("categorySlug", payload.categorySlug);
  if (payload.subcategorySlug) form.append("subcategorySlug", payload.subcategorySlug);
  if (payload.tags?.length) form.append("tags", JSON.stringify(payload.tags));
  if (payload.authorName) form.append("authorName", payload.authorName);
  if (payload.readingTime != null) form.append("readingTime", String(payload.readingTime));
  if (payload.publishDate) form.append("publishDate", payload.publishDate);
  if (payload.displayOrder != null) form.append("displayOrder", String(payload.displayOrder));
  form.append("isFeatured", String(Boolean(payload.isFeatured)));
  form.append("isPublished", String(Boolean(payload.isPublished)));
  form.append("allowComments", String(payload.allowComments !== false));
  if (payload.coverImage) form.append("coverImage", payload.coverImage);
  if (payload.removeImage) form.append("removeImage", "true");
  if (payload.seo?.metaTitle) form.append("metaTitle", payload.seo.metaTitle);
  if (payload.seo?.metaDescription) form.append("metaDescription", payload.seo.metaDescription);
  if (payload.seo?.metaKeywords) form.append("metaKeywords", payload.seo.metaKeywords);
  if (payload.coverImageFile) form.append("coverImage", payload.coverImageFile);
};

export const blogsService = {
  getSupportedUrls(signal?: AbortSignal) {
    return apiClient.get<SupportedUrlsResponse>(
      "/master-data?types=supportedurls",
      { auth: true, signal }
    );
  },

  getBlogs(params: ListBlogsAdminParams = {}, signal?: AbortSignal) {
    return apiClient.get<BlogsAdminResponse>(`/cms/blogs${buildQuery(params)}`, {
      auth: true,
      signal,
    });
  },

  saveSettings(settings: BlogPageSettings, signal?: AbortSignal) {
    return apiClient.post<{ settings: BlogPageSettings }>(
      "/cms/blogs",
      { action: "save-settings", settings },
      { auth: true, signal }
    );
  },

  savePost(payload: SaveBlogPostPayload, signal?: AbortSignal) {
    const form = new FormData();
    appendPostFields(form, payload);
    return apiClient.post<{ post: BlogPostRecord }>("/cms/blogs", form, {
      auth: true,
      signal,
    });
  },

  deletePost(postId: string, signal?: AbortSignal) {
    return apiClient.post<{ postId: string }>(
      "/cms/blogs",
      { action: "delete-post", postId },
      { auth: true, signal }
    );
  },
};
