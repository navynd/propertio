import axios from "axios";
import type { RecommendedProperty } from "../Components/cards/RecommendedCard";
import { getSupportedUrlsMasterData } from "./apiService";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://propertio-api.onrender.com/api").replace(
  /\/$/,
  ""
);

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    const headers = config.headers as Record<string, string | undefined>;
    headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type ApiEnvelope<T> = {
  status?: boolean;
  success?: boolean;
  message?: string;
  data: T;
};

export type BlogCategory = {
  _id?: string;
  name: string;
  slug: string;
  subcategories?: { name: string; slug: string; displayOrder?: number }[];
};

export type BlogCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  text: string;
  tag: string;
  image: string;
  authorName: string;
  authorAvatar?: string;
  categorySlug: string;
  subcategorySlug: string;
  publishedAt?: string;
  publishedDate: string;
  readTime: string;
  isFeatured?: boolean;
  views?: number;
  commentsCount?: number;
};

export type BlogDetailPost = BlogCard & {
  content: string;
  tags: string[];
  allowComments: boolean;
};

export type BlogComment = {
  id: string;
  author: string;
  date: string;
  text: string;
  likes: number;
  dislikes: number;
  replies?: BlogComment[];
};

export type BlogPageSettings = {
  pageTitle: string;
  pageSubtitle: string;
  featuredSectionTitle: string;
  itemsPerPage: number;
  showSearch: boolean;
  showCategoryFilters: boolean;
  enableComments: boolean;
};

export type BlogListResponse = {
  mode: "list";
  settings: BlogPageSettings;
  categories: BlogCategory[];
  featured: BlogCard | null;
  topStories: BlogCard[];
  posts: BlogCard[];
  pagination: { page: number; limit: number; total: number; pages: number };
};

export type BlogDetailResponse = {
  mode: "detail";
  settings: BlogPageSettings;
  post: BlogDetailPost;
  relatedPosts: BlogCard[];
  recentPosts: BlogCard[];
  relatedProperties: RecommendedProperty[];
  comments: BlogComment[];
};

export type ListBlogsParams = {
  category?: string;
  subcategory?: string;
  search?: string;
  sortBy?: "newest" | "oldest" | "popular";
  page?: number;
  limit?: number;
};

const GUEST_KEY_STORAGE = "blogGuestKey";

export const getBlogGuestKey = (): string => {
  let key = localStorage.getItem(GUEST_KEY_STORAGE);
  if (!key) {
    key =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(GUEST_KEY_STORAGE, key);
  }
  return key;
};

let cachedBlogImgBase: string | null = null;

export const getBlogImageBaseUrl = async (): Promise<string> => {
  if (cachedBlogImgBase) return cachedBlogImgBase;
  try {
    const resp = await getSupportedUrlsMasterData();
    const items = resp.data?.items as Record<string, { img?: string }> | undefined;
    cachedBlogImgBase = items?.blogUrl?.img || "";
  } catch {
    cachedBlogImgBase = "";
  }
  return cachedBlogImgBase;
};

export const resolveBlogImage = (
  filename: string | undefined,
  baseUrl: string,
  fallback = ""
): string => {
  if (!filename?.trim()) return fallback;
  if (/^https?:\/\//i.test(filename)) return filename;
  if (!baseUrl) return fallback || filename;
  return `${baseUrl}${encodeURIComponent(filename.replace(/^\/+/, ""))}`;
};

const unwrap = <T>(raw: ApiEnvelope<T>): T => raw.data;

export const listBlogs = async (
  params: ListBlogsParams = {},
  signal?: AbortSignal
): Promise<BlogListResponse> => {
  const response = await apiClient.get<ApiEnvelope<BlogListResponse>>("/blogs", {
    params,
    signal,
  });
  return unwrap(response.data);
};

export const getBlogBySlug = async (
  slug: string,
  signal?: AbortSignal
): Promise<BlogDetailResponse> => {
  const response = await apiClient.get<ApiEnvelope<BlogDetailResponse>>("/blogs", {
    params: { slug },
    signal,
  });
  return unwrap(response.data);
};

export type BlogMutationPayload = {
  action: "comment" | "reply" | "react";
  slug: string;
  text?: string;
  parentId?: string;
  commentId?: string;
  reaction?: "like" | "dislike" | "clear";
  guestKey?: string;
  authorName?: string;
};

export const mutateBlog = async (
  payload: BlogMutationPayload,
  signal?: AbortSignal
): Promise<{ comment?: BlogComment }> => {
  const body = {
    ...payload,
    guestKey: payload.guestKey || getBlogGuestKey(),
  };
  const response = await apiClient.post<ApiEnvelope<{ comment?: BlogComment }>>(
    "/blogs",
    body,
    { signal }
  );
  return unwrap(response.data);
};
