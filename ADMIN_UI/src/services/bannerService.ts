import { apiClient } from "./apiClient";
import type { BannerAdminResponse, BannerRecord, BannerSettings } from "../types/api";

export type ListBannerAdminParams = {
  page?: number;
  limit?: number;
  search?: string;
  placement?: string;
  bannerId?: string;
};

const buildQuery = (params: ListBannerAdminParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.placement?.trim()) search.set("placement", params.placement.trim());
  if (params.bannerId?.trim()) search.set("bannerId", params.bannerId.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type SaveBannerPayload = {
  bannerId?: string;
  title: string;
  description?: string;
  link?: string;
  linkText?: string;
  placement: string;
  position?: string;
  displayOrder?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  image?: string;
  imageFile?: File | null;
  mobileImage?: string;
  mobileImageFile?: File | null;
  removeMobileImage?: boolean;
};

const appendBannerFields = (form: FormData, payload: SaveBannerPayload) => {
  form.append("action", "save-banner");
  if (payload.bannerId) form.append("bannerId", payload.bannerId);
  form.append("title", payload.title.trim());
  form.append("description", (payload.description || "").trim());
  form.append("link", (payload.link || "").trim());
  form.append("linkText", (payload.linkText || "Explore more").trim());
  form.append("placement", payload.placement);
  if (payload.position) form.append("position", payload.position);
  if (payload.displayOrder != null) form.append("displayOrder", String(payload.displayOrder));
  form.append("isActive", String(Boolean(payload.isActive)));
  if (payload.startDate) form.append("startDate", payload.startDate);
  if (payload.endDate) form.append("endDate", payload.endDate);
  if (payload.image) form.append("image", payload.image);
  if (payload.mobileImage) form.append("mobileImage", payload.mobileImage);
  if (payload.removeMobileImage) form.append("removeMobileImage", "true");
  if (payload.imageFile) form.append("image", payload.imageFile);
  if (payload.mobileImageFile) form.append("mobileImage", payload.mobileImageFile);
};

export const bannerService = {
  getBanners(params: ListBannerAdminParams = {}, signal?: AbortSignal) {
    return apiClient.get<BannerAdminResponse>(`/cms/banners${buildQuery(params)}`, {
      auth: true,
      signal,
    });
  },

  saveSettings(
    settings: BannerSettings,
    listParams?: ListBannerAdminParams,
    signal?: AbortSignal
  ) {
    return apiClient.post<BannerAdminResponse>(
      "/cms/banners",
      { action: "save-settings", settings, ...listParams },
      { auth: true, signal }
    );
  },

  saveBanner(payload: SaveBannerPayload, signal?: AbortSignal) {
    const form = new FormData();
    appendBannerFields(form, payload);
    return apiClient.post<{ banner: BannerRecord }>("/cms/banners", form, {
      auth: true,
      signal,
    });
  },

  deleteBanner(
    bannerId: string,
    listParams?: ListBannerAdminParams,
    signal?: AbortSignal
  ) {
    return apiClient.post<BannerAdminResponse>(
      "/cms/banners",
      { action: "delete-banner", bannerId, ...listParams },
      { auth: true, signal }
    );
  },
};
