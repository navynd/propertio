const STORAGE_KEY = "experts.ui.agencyAssignAgent";

/** Fired when draft selections change on project-assign-agent (same-tab footer refresh). */
export const ASSIGN_AGENT_DRAFT_EVENT = "experts-agency-assign-draft";

export function notifyAssignAgentDraftUpdated() {
  window.dispatchEvent(new Event(ASSIGN_AGENT_DRAFT_EVENT));
}

export type AgencyAssignAgentNavState = {
  projectId: string;
  layoutId?: string;
  projectName?: string;
  from?: string;
  /** Set on assign-agent page: at least one unit + agent required before review. */
  selectedUnitIds?: string[];
  selectedAgentId?: string;
  selectedAgentName?: string;
  selectedAgentType?: string;
  selectedAgentProfilePicture?: string | null;
};

/** Merge React Router `location.state` with session fallback (refresh-safe). */
export function readAssignAgentNav(locationState: unknown): AgencyAssignAgentNavState | null {
  const s = locationState as Partial<AgencyAssignAgentNavState> | null | undefined;
  if (s?.projectId) {
    const pid = String(s.projectId);
    let draftFromSession: Pick<
      AgencyAssignAgentNavState,
      | "selectedUnitIds"
      | "selectedAgentId"
      | "selectedAgentName"
      | "selectedAgentType"
      | "selectedAgentProfilePicture"
    > = {};
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<AgencyAssignAgentNavState>;
        if (p?.projectId && String(p.projectId) === pid) {
          draftFromSession = {
            selectedUnitIds: Array.isArray(p.selectedUnitIds)
              ? p.selectedUnitIds.map(String)
              : undefined,
            selectedAgentId: p.selectedAgentId ? String(p.selectedAgentId) : undefined,
            selectedAgentName: p.selectedAgentName ? String(p.selectedAgentName) : undefined,
            selectedAgentType: p.selectedAgentType ? String(p.selectedAgentType) : undefined,
            selectedAgentProfilePicture:
              p.selectedAgentProfilePicture === null || p.selectedAgentProfilePicture === undefined
                ? p.selectedAgentProfilePicture
                : String(p.selectedAgentProfilePicture),
          };
        }
      }
    } catch {
      /* ignore */
    }
    const fromUnitIds = Array.isArray(s.selectedUnitIds)
      ? s.selectedUnitIds.map(String)
      : undefined;
    /** Empty array in router state must not override session draft (?? keeps []). */
    const mergedUnitIds =
      fromUnitIds != null && fromUnitIds.length > 0
        ? fromUnitIds
        : draftFromSession.selectedUnitIds;
    const fromState = {
      selectedAgentId: s.selectedAgentId ? String(s.selectedAgentId) : undefined,
      selectedAgentName: s.selectedAgentName ? String(s.selectedAgentName) : undefined,
      selectedAgentType: s.selectedAgentType ? String(s.selectedAgentType) : undefined,
      selectedAgentProfilePicture: s.selectedAgentProfilePicture,
    };
    return {
      projectId: pid,
      layoutId: s.layoutId ? String(s.layoutId) : undefined,
      projectName: s.projectName,
      from: s.from,
      selectedUnitIds: mergedUnitIds,
      selectedAgentId: fromState.selectedAgentId ?? draftFromSession.selectedAgentId,
      selectedAgentName: fromState.selectedAgentName ?? draftFromSession.selectedAgentName,
      selectedAgentType: fromState.selectedAgentType ?? draftFromSession.selectedAgentType,
      selectedAgentProfilePicture:
        fromState.selectedAgentProfilePicture ??
        draftFromSession.selectedAgentProfilePicture,
    };
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<AgencyAssignAgentNavState>;
    if (p?.projectId) {
      return {
        projectId: String(p.projectId),
        layoutId: p.layoutId ? String(p.layoutId) : undefined,
        projectName: p.projectName,
        from: p.from,
        selectedUnitIds: Array.isArray(p.selectedUnitIds)
          ? p.selectedUnitIds.map(String)
          : undefined,
        selectedAgentId: p.selectedAgentId ? String(p.selectedAgentId) : undefined,
        selectedAgentName: p.selectedAgentName ? String(p.selectedAgentName) : undefined,
        selectedAgentType: p.selectedAgentType ? String(p.selectedAgentType) : undefined,
        selectedAgentProfilePicture:
          p.selectedAgentProfilePicture === null || p.selectedAgentProfilePicture === undefined
            ? p.selectedAgentProfilePicture
            : String(p.selectedAgentProfilePicture),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeAssignAgentNav(ctx: AgencyAssignAgentNavState) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
}

export function clearAssignAgentNavDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  notifyAssignAgentDraftUpdated();
}
