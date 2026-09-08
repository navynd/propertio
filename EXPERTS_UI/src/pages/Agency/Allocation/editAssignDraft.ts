const STORAGE_KEY = "experts.ui.agencyEditAssignDraft";

export const EDIT_ASSIGN_DRAFT_EVENT = "experts-agency-edit-assign-draft";

export type AgencyEditAssignDraft = {
  projectId: string;
  allocationId: string;
  layoutId?: string;
  selectedUnitIds: string[];
};

export function notifyEditAssignDraftUpdated() {
  window.dispatchEvent(new Event(EDIT_ASSIGN_DRAFT_EVENT));
}

export function writeEditAssignDraft(draft: AgencyEditAssignDraft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
  notifyEditAssignDraftUpdated();
}

export function readEditAssignDraft(): AgencyEditAssignDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<AgencyEditAssignDraft>;
    const projectId = p?.projectId ? String(p.projectId).trim() : "";
    const allocationId = p?.allocationId ? String(p.allocationId).trim() : "";
    if (!projectId || !allocationId) return null;
    const selectedUnitIds = Array.isArray(p.selectedUnitIds)
      ? p.selectedUnitIds.map(String)
      : [];
    return {
      projectId,
      allocationId,
      layoutId: p.layoutId ? String(p.layoutId).trim() : undefined,
      selectedUnitIds,
    };
  } catch {
    return null;
  }
}

export function clearEditAssignDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notifyEditAssignDraftUpdated();
}
