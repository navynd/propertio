import { apiClient } from "./apiClient";
import type {
  SitemapAdminResponse,
  SitemapDocumentRecord,
  SitemapPageSettings,
} from "../types/api";

export type GetSitemapAdminParams = {
  countryCode?: string;
};

const buildQuery = (params: GetSitemapAdminParams) => {
  const search = new URLSearchParams();
  if (params.countryCode) search.set("countryCode", params.countryCode);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const sitemapService = {
  getSitemap(params: GetSitemapAdminParams = {}, signal?: AbortSignal) {
    return apiClient.get<SitemapAdminResponse>(`/cms/sitemap${buildQuery(params)}`, {
      auth: true,
      signal,
    });
  },

  saveSettings(settings: SitemapPageSettings, signal?: AbortSignal) {
    return apiClient.post<{ settings: SitemapPageSettings }>(
      "/cms/sitemap",
      { action: "save-settings", settings },
      { auth: true, signal }
    );
  },

  saveDocument(document: SitemapDocumentRecord, signal?: AbortSignal) {
    return apiClient.post<{ document: SitemapDocumentRecord }>(
      "/cms/sitemap",
      {
        action: "save-document",
        documentId: document.id,
        ...document,
      },
      { auth: true, signal }
    );
  },

  deleteDocument(documentId: string, signal?: AbortSignal) {
    return apiClient.post<{ id: string }>(
      "/cms/sitemap",
      { action: "delete-document", documentId },
      { auth: true, signal }
    );
  },
};
