import { apiClient } from "./apiClient";
import type { AboutAdminResponse, AboutPageSettings, AboutTimelineEntry } from "../types/api";

export const aboutService = {
  getAbout(signal?: AbortSignal) {
    return apiClient.get<AboutAdminResponse>("/cms/about", { auth: true, signal });
  },

  saveAbout(
    payload: { settings: AboutPageSettings; timeline: AboutTimelineEntry[] },
    signal?: AbortSignal
  ) {
    return apiClient.post<AboutAdminResponse>(
      "/cms/about",
      { action: "save", ...payload },
      { auth: true, signal }
    );
  },
};
