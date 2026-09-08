import { apiClient } from "./apiClient";
import type { TeamAdminResponse, TeamMemberRecord, TeamPageSettings } from "../types/api";

export type ListTeamAdminParams = {
  page?: number;
  limit?: number;
  search?: string;
  memberId?: string;
};

const buildQuery = (params: ListTeamAdminParams) => {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.search?.trim()) search.set("search", params.search.trim());
  if (params.memberId?.trim()) search.set("memberId", params.memberId.trim());
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export type SaveTeamMemberPayload = {
  memberId?: string;
  fullName: string;
  jobTitle: string;
  email?: string;
  phone?: string;
  displayOrder?: number;
  isActive?: boolean;
  profileImage?: string;
  profileImageFile?: File | null;
  removeImage?: boolean;
};

const appendMemberFields = (form: FormData, payload: SaveTeamMemberPayload) => {
  form.append("action", "save-member");
  if (payload.memberId) form.append("memberId", payload.memberId);
  form.append("fullName", payload.fullName.trim());
  form.append("jobTitle", payload.jobTitle.trim());
  form.append("email", (payload.email || "").trim());
  form.append("phone", (payload.phone || "").trim());
  if (payload.displayOrder != null) form.append("displayOrder", String(payload.displayOrder));
  form.append("isActive", String(Boolean(payload.isActive)));
  if (payload.profileImage) form.append("profileImage", payload.profileImage);
  if (payload.removeImage) form.append("removeImage", "true");
  if (payload.profileImageFile) form.append("profileImage", payload.profileImageFile);
};

export const teamService = {
  getTeam(params: ListTeamAdminParams = {}, signal?: AbortSignal) {
    return apiClient.get<TeamAdminResponse>(`/cms/team${buildQuery(params)}`, {
      auth: true,
      signal,
    });
  },

  saveSettings(
    settings: TeamPageSettings,
    listParams?: ListTeamAdminParams,
    signal?: AbortSignal
  ) {
    return apiClient.post<TeamAdminResponse>(
      "/cms/team",
      { action: "save-settings", settings, ...listParams },
      { auth: true, signal }
    );
  },

  saveMember(payload: SaveTeamMemberPayload, signal?: AbortSignal) {
    const form = new FormData();
    appendMemberFields(form, payload);
    return apiClient.post<{ member: TeamMemberRecord }>("/cms/team", form, {
      auth: true,
      signal,
    });
  },

  deleteMember(
    memberId: string,
    listParams?: ListTeamAdminParams,
    signal?: AbortSignal
  ) {
    return apiClient.post<TeamAdminResponse>(
      "/cms/team",
      { action: "delete-member", memberId, ...listParams },
      { auth: true, signal }
    );
  },
};
