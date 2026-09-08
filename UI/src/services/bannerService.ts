import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://propertio.tj/api").replace(
  /\/$/,
  ""
);

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

type ApiEnvelope<T> = {
  status?: boolean;
  success?: boolean;
  message?: string;
  data: T;
};

export type BannerPlacement =
  | "home-page"
  | "search-page"
  | "listing-page"
  | "agent-page"
  | "agency-page"
  | "project-page";

export type PublicBanner = {
  id: string;
  title: string;
  description: string;
  image: string;
  mobileImage: string;
  link: string;
  linkText: string;
  displayOrder: number;
};

export type BannersResponse = {
  settings: {
    defaultButtonText?: string;
    autoSlideInterval?: number;
  };
  placement: string;
  banners: PublicBanner[];
  mediaBaseUrl?: { img?: string };
};

const unwrap = <T,>(raw: ApiEnvelope<T>): T => raw?.data ?? (raw as unknown as T);

export const resolveBannerImage = (
  filename: string | undefined,
  baseUrl: string | undefined,
  fallback: string
) => {
  const trimmed = String(filename || "").trim();
  if (!trimmed) return fallback;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return base ? `${base}/${encodeURIComponent(trimmed)}` : fallback;
};

export const bannerService = {
  async getBanners(placement: BannerPlacement): Promise<BannersResponse> {
    const response = await apiClient.get<ApiEnvelope<BannersResponse>>(
      `/banners?placement=${encodeURIComponent(placement)}`
    );
    return unwrap(response.data);
  },
};
