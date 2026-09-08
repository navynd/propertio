import { apiClient } from "./apiClient";
import type {
  LegalAdminResponse,
  LegalDocumentRecord,
  LegalPageSettings,
} from "../types/api";

export type GetLegalAdminParams = {
  countryCode?: string;
  pageType?: "terms" | "privacy";
};

const buildQuery = (params: GetLegalAdminParams) => {
  const search = new URLSearchParams();
  if (params.countryCode) search.set("countryCode", params.countryCode);
  if (params.pageType) search.set("pageType", params.pageType);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const legalService = {
  getLegal(params: GetLegalAdminParams = {}, signal?: AbortSignal) {
    return apiClient.get<LegalAdminResponse>(`/cms/legal${buildQuery(params)}`, {
      auth: true,
      signal,
    });
  },

  saveSettings(settings: LegalPageSettings, signal?: AbortSignal) {
    return apiClient.post<{ settings: LegalPageSettings }>(
      "/cms/legal",
      { action: "save-settings", settings },
      { auth: true, signal }
    );
  },

  saveDocument(document: LegalDocumentRecord, signal?: AbortSignal) {
    return apiClient.post<{ document: LegalDocumentRecord }>(
      "/cms/legal",
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
      "/cms/legal",
      { action: "delete-document", documentId },
      { auth: true, signal }
    );
  },
};
