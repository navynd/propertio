import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://propertio-apiservices.onrender.com/api").replace(
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

export type ContactSeoFields = {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
};

export type ContactPageSettings = {
  heroTitle?: string;
  heroSubtitle?: string;
  heroBackgroundImage?: string;
  sectionTitle?: string;
  sectionSubtext?: string;
  email?: string;
  phone?: string;
  officeAddress?: string;
  mapUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  seo?: ContactSeoFields;
};

export type ContactOfficeLocation = {
  id: string;
  city: string;
  country: string;
  locationType: string;
  address: string;
  mapUrl: string;
  phone: string;
  email: string;
  displayOrder: number;
  isActive: boolean;
};

export type ContactPageResponse = {
  settings: ContactPageSettings;
  formSubjects: string[];
  locations: ContactOfficeLocation[];
};

export type ContactSubmitPayload = {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  comments?: string;
};

const unwrap = <T,>(raw: ApiEnvelope<T>): T => raw?.data ?? (raw as unknown as T);

export const contactService = {
  async getContact(): Promise<ContactPageResponse> {
    const response = await apiClient.get<ApiEnvelope<ContactPageResponse>>("/contact");
    return unwrap(response.data);
  },

  async submitContact(payload: ContactSubmitPayload) {
    const response = await apiClient.post<ApiEnvelope<{ submission: { id: string } }>>(
      "/contact",
      payload
    );
    return unwrap(response.data);
  },
};
