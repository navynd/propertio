import { apiClient } from "./apiClient";
import type {
  TestimonialAdminResponse,
  TestimonialRecord,
  TestimonialSectionSettings,
} from "../types/api";

export type ListTestimonialAdminParams = {
  page?: number;
  limit?: number;
  search?: string;
  testimonialId?: string;
};

const buildQuery = (params: ListTestimonialAdminParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.testimonialId?.trim()) search.set("testimonialId", params.testimonialId.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type SaveTestimonialPayload = {
  testimonialId?: string;
  name: string;
  title?: string;
  content: string;
  rating?: number | null;
  displayOrder?: number;
  isActive?: boolean;
  image?: string;
  imageFile?: File | null;
  removeImage?: boolean;
};

const appendTestimonialFields = (form: FormData, payload: SaveTestimonialPayload) => {
  form.append("action", "save-testimonial");
  if (payload.testimonialId) form.append("testimonialId", payload.testimonialId);
  form.append("name", payload.name.trim());
  form.append("title", (payload.title || "").trim());
  form.append("content", payload.content.trim());
  if (payload.rating != null) form.append("rating", String(payload.rating));
  if (payload.displayOrder != null) form.append("displayOrder", String(payload.displayOrder));
  form.append("isActive", String(Boolean(payload.isActive)));
  if (payload.image) form.append("image", payload.image);
  if (payload.removeImage) form.append("removeImage", "true");
  if (payload.imageFile) form.append("image", payload.imageFile);
};

export const testimonialService = {
  getTestimonials(params: ListTestimonialAdminParams = {}, signal?: AbortSignal) {
    return apiClient.get<TestimonialAdminResponse>(`/cms/testimonials${buildQuery(params)}`, {
      auth: true,
      signal,
    });
  },

  saveSettings(
    settings: TestimonialSectionSettings,
    listParams?: ListTestimonialAdminParams,
    signal?: AbortSignal
  ) {
    return apiClient.post<TestimonialAdminResponse>(
      "/cms/testimonials",
      { action: "save-settings", settings, ...listParams },
      { auth: true, signal }
    );
  },

  saveTestimonial(payload: SaveTestimonialPayload, signal?: AbortSignal) {
    const form = new FormData();
    appendTestimonialFields(form, payload);
    return apiClient.post<{ testimonial: TestimonialRecord }>("/cms/testimonials", form, {
      auth: true,
      signal,
    });
  },

  deleteTestimonial(
    testimonialId: string,
    listParams?: ListTestimonialAdminParams,
    signal?: AbortSignal
  ) {
    return apiClient.post<TestimonialAdminResponse>(
      "/cms/testimonials",
      { action: "delete-testimonial", testimonialId, ...listParams },
      { auth: true, signal }
    );
  },
};
