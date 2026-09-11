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

export type TestimonialSectionSettings = {
  sectionTitle?: string;
  sectionSubtitle?: string;
};

export type HomeTestimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar: string;
  rating?: number | null;
  displayOrder: number;
};

export type TestimonialsResponse = {
  settings: TestimonialSectionSettings;
  testimonials: HomeTestimonial[];
  mediaBaseUrl?: { img?: string };
};

const unwrap = <T,>(raw: ApiEnvelope<T>): T => raw?.data ?? (raw as unknown as T);

export const testimonialService = {
  async getTestimonials(): Promise<TestimonialsResponse> {
    const response = await apiClient.get<ApiEnvelope<TestimonialsResponse>>("/testimonials");
    return unwrap(response.data);
  },
};
