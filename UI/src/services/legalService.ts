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

export type LegalCountry = {
  _id?: string;
  name: string;
  code?: string;
  flag?: string;
  displayOrder?: number;
};

export type LegalDocument = {
  id: string;
  countryCode?: string;
  categoryName: string;
  slug?: string;
  content?: string;
  displayOrder?: number;
};

export type LegalContactBlock = {
  supportEmail?: string;
  sectionTitle?: string;
};

export type LegalPageSettings = {
  termsPageTitle?: string;
  privacyPageTitle?: string;
  breadcrumbHomeLabel?: string;
  defaultCountryCode?: string;
  contactBlock?: LegalContactBlock;
};

export type LegalPageResponse = {
  settings: LegalPageSettings;
  pageType: "terms" | "privacy";
  countryCode: string;
  documents: LegalDocument[];
  countries: LegalCountry[];
};

const unwrap = <T,>(raw: ApiEnvelope<T>): T => raw?.data ?? (raw as unknown as T);

export const legalService = {
  async getLegal(params: {
    page: "terms" | "privacy";
    country?: string;
  }): Promise<LegalPageResponse> {
    const response = await apiClient.get<ApiEnvelope<LegalPageResponse>>("/legal", {
      params: {
        page: params.page,
        country: params.country,
      },
    });
    return unwrap(response.data);
  },
};
