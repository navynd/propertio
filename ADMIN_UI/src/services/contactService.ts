import { apiClient } from "./apiClient";
import type {
  ContactAdminResponse,
  ContactOfficeLocation,
  ContactPageSettings,
} from "../types/api";

export const contactService = {
  getContact(signal?: AbortSignal) {
    return apiClient.get<ContactAdminResponse>("/cms/contact", { auth: true, signal });
  },

  saveContact(
    payload: {
      settings: ContactPageSettings;
      formSubjects: string[];
      locations: ContactOfficeLocation[];
    },
    signal?: AbortSignal
  ) {
    return apiClient.post<ContactAdminResponse>(
      "/cms/contact",
      { action: "save", ...payload },
      { auth: true, signal }
    );
  },
};
