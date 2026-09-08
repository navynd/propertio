import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://molumulk.tj/api").replace(
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

export type AboutSeoFields = {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
};

export type AboutPageSettings = {
  heroEyebrow?: string;
  heroHeadline?: string;
  heroSubheadline?: string;
  heroBannerImage?: string;
  heroGalleryImages?: string[];
  bannerText?: string;
  businessSectionTitle?: string;
  businessParagraph1?: string;
  businessParagraph2?: string;
  businessCtaPrimaryLabel?: string;
  businessCtaPrimaryUrl?: string;
  businessCtaSecondaryLabel?: string;
  businessCtaSecondaryUrl?: string;
  stat1Value?: string;
  stat1Description?: string;
  stat2Value?: string;
  stat2Description?: string;
  stat3Value?: string;
  stat3Description?: string;
  successSectionTitle?: string;
  ctaBackgroundImage?: string;
  ctaHeadline?: string;
  ctaSubheadline?: string;
  ctaButtonLabel?: string;
  ctaButtonUrl?: string;
  seo?: AboutSeoFields;
};

export type AboutTimelineEntry = {
  id: string;
  month: string;
  day: string;
  year: string;
  title: string;
  description: string;
  displayOrder: number;
};

export type AboutPageResponse = {
  settings: AboutPageSettings;
  timeline: AboutTimelineEntry[];
};

const unwrap = <T,>(raw: ApiEnvelope<T>): T => raw?.data ?? (raw as unknown as T);

export const aboutService = {
  async getAbout(): Promise<AboutPageResponse> {
    const response = await apiClient.get<ApiEnvelope<AboutPageResponse>>("/about");
    return unwrap(response.data);
  },
};
