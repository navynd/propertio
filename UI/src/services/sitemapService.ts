import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://propertio-api.onrender.com/api").replace(
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

export type SitemapCountry = {
  _id?: string;
  name: string;
  code?: string;
  flag?: string;
  displayOrder?: number;
};

export type SitemapDocument = {
  id: string;
  countryCode?: string;
  categoryName: string;
  slug?: string;
  content?: string;
  displayOrder?: number;
};

export type SitemapPageSettings = {
  breadcrumbHomeLabel?: string;
  breadcrumbLabel?: string;
  pageTitle?: string;
  defaultCountryCode?: string;
  locationNames?: Record<string, string>;
};

export type SitemapPageResponse = {
  settings: SitemapPageSettings;
  countryCode: string;
  locationName: string;
  documents: SitemapDocument[];
  countries: SitemapCountry[];
};

const unwrap = <T,>(raw: ApiEnvelope<T>): T => raw?.data ?? (raw as unknown as T);

export const sitemapService = {
  async getSitemap(params: { country?: string } = {}): Promise<SitemapPageResponse> {
    const response = await apiClient.get<ApiEnvelope<SitemapPageResponse>>("/sitemap", {
      params: {
        country: params.country,
      },
    });
    return unwrap(response.data);
  },
};
