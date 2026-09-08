import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import AgencySidebar from "../../components/AgencyLayout/AgencySidebar";
import {
  readAssignAgentNav,
  writeAssignAgentNav,
  ASSIGN_AGENT_DRAFT_EVENT,
  clearAssignAgentNavDraft,
} from "./Allocation/assignAgentNav";
import {
  readEditAssignDraft,
  clearEditAssignDraft,
  EDIT_ASSIGN_DRAFT_EVENT,
} from "./Allocation/editAssignDraft";
import { agencyService, type AgencyProfile } from "../../services/agencyService";
import { API_BASE_URL, getApiErrorMessage } from "../../services/apiClient";
import { toast } from "../../services/toast";
import { AgencyLayoutContext } from "../../context/AgencyLayoutContext";

function buildAgencyProfilePictureUrl(
  base: string,
  filename: string | null | undefined,
): string | null {
  if (!filename || !String(filename).trim()) return null;
  const raw = String(filename).trim();
  const lower = raw.toLowerCase();
  if (lower === "profileless.png" || lower.endsWith("/profileless.png")) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  const cleanBase = base.replace(/\/+$/, "");
  const cleanFile = raw.replace(/^\/+/, "");
  return `${cleanBase}/${cleanFile}`;
}

function AgencyIndex() {
  const [isNotificationHidden, setIsNotificationHidden] = useState(false);
  const [isToggleVisible, setIsToggleVisible] = useState(false);
  const [headerProfileImage, setHeaderProfileImage] = useState<string | null>(null);
  const [headerVerified, setHeaderVerified] = useState(false);
  const [assignDraftTick, setAssignDraftTick] = useState(0);
  const [editDraftTick, setEditDraftTick] = useState(0);
  const [footerAllocating, setFooterAllocating] = useState(false);
  const [footerEditSaving, setFooterEditSaving] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const defaultOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

  const loadAgencyHeader = useCallback(async () => {
    try {
      const fallback = `${defaultOrigin}/uploads/img/property/`;
      const [master, profile] = await Promise.all([
        agencyService.getMasterData(["supportedurls"]).catch(() => null),
        agencyService.getProfile(),
      ]);
      const supported = (master as { supportedUrls?: { agencyUrl?: { img?: string } } } | null)
        ?.supportedUrls;
      const imgBase = (supported?.agencyUrl?.img?.trim() || fallback).replace(/\/+$/, "/");
      const p = profile as AgencyProfile | null;
      setHeaderProfileImage(buildAgencyProfilePictureUrl(imgBase, p?.profilePicture));
      setHeaderVerified(Boolean(p?.isVerified));
    } catch {
      setHeaderProfileImage(null);
      setHeaderVerified(false);
    }
  }, [defaultOrigin]);

  useEffect(() => {
    void loadAgencyHeader();
  }, [loadAgencyHeader]);

  const layoutValue = useMemo(
    () => ({
      refreshAgencyHeader: loadAgencyHeader,
      shellHeader: {
        profileImage: headerProfileImage,
        verified: headerVerified,
      },
    }),
    [loadAgencyHeader, headerProfileImage, headerVerified],
  );

  const isProjectAllocationAssignAgent =
    location.pathname === "/agency/allocation/project-assign-agent";
  const isProjectAllocationReviewAssign =
    location.pathname === "/agency/allocation/project-review-assign";
  const isProjectAllocationEditAssign =
    location.pathname === "/agency/allocation/project-edit-assign";

  const editAssignProjectName = useMemo(() => {
    if (!isProjectAllocationEditAssign) return "";
    const s = location.state as { projectName?: string } | null | undefined;
    return s?.projectName?.trim() || "";
  }, [location.state, isProjectAllocationEditAssign]);

  type EditAssignRouteState = {
    projectId?: string;
    allocationId?: string;
    layoutId?: string;
    projectName?: string;
  };

  const editSaveCtx = useMemo(() => {
    if (!isProjectAllocationEditAssign) return null;
    const s = location.state as EditAssignRouteState | null | undefined;
    const projectId = s?.projectId?.trim();
    const allocationId = s?.allocationId?.trim();
    if (!projectId || !allocationId) return null;
    const draft = readEditAssignDraft();
    if (
      draft &&
      draft.projectId === projectId &&
      draft.allocationId === allocationId
    ) {
      return {
        projectId,
        allocationId,
        unitIds: draft.selectedUnitIds ?? [],
      };
    }
    return { projectId, allocationId, unitIds: [] as string[] };
  }, [isProjectAllocationEditAssign, location.state, editDraftTick]);

  const assignFooterCtx = useMemo(
    () => readAssignAgentNav(location.state),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session draft updates (assignDraftTick) are not in location.state
    [location.state, assignDraftTick],
  );

  useEffect(() => {
    const onDraft = () => setAssignDraftTick((t) => t + 1);
    window.addEventListener(ASSIGN_AGENT_DRAFT_EVENT, onDraft);
    return () => window.removeEventListener(ASSIGN_AGENT_DRAFT_EVENT, onDraft);
  }, []);

  useEffect(() => {
    const onEditDraft = () => setEditDraftTick((t) => t + 1);
    window.addEventListener(EDIT_ASSIGN_DRAFT_EVENT, onEditDraft);
    return () => window.removeEventListener(EDIT_ASSIGN_DRAFT_EVENT, onEditDraft);
  }, []);

  useEffect(() => {
    if (
      assignFooterCtx &&
      (isProjectAllocationAssignAgent || isProjectAllocationReviewAssign)
    ) {
      writeAssignAgentNav(assignFooterCtx);
    }
  }, [assignFooterCtx, isProjectAllocationAssignAgent, isProjectAllocationReviewAssign]);
  useEffect(() => {
    const checkNotificationVisibility = () => {
      const notificationDiv = document.querySelector('.verifynoti_div');
      if (notificationDiv) {
        const isHidden = notificationDiv.classList.contains('hidden');
        setIsNotificationHidden(isHidden);
      }
    };

    // Check initially
    checkNotificationVisibility();

    // Set up a MutationObserver to watch for class changes
    const observer = new MutationObserver(checkNotificationVisibility);
    const notificationDiv = document.querySelector('.verifynoti_div');

    if (notificationDiv) {
      observer.observe(notificationDiv, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const checkToggleVisibility = () => {
      const headertoogle_div = document.querySelector('.headertoogle_div');
      if (headertoogle_div) {
        // Check if the element is actually visible by checking computed style
        // The toggle has max-sm:flex lg:hidden, so it's visible on mobile
        const computedStyle = window.getComputedStyle(headertoogle_div);
        const isVisible = computedStyle.display !== 'none';
        setIsToggleVisible(isVisible);
      }
    };

    // Initial check after DOM is ready
    const timeoutId = setTimeout(() => {
      checkToggleVisibility();
    }, 100);

    // Check on window resize (responsive classes change based on screen size)
    window.addEventListener('resize', checkToggleVisibility);

    // Set up a MutationObserver to watch for class changes
    const observer = new MutationObserver(checkToggleVisibility);
    const headertoogle_div = document.querySelector('.headertoogle_div');

    if (headertoogle_div) {
      observer.observe(headertoogle_div, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      window.removeEventListener('resize', checkToggleVisibility);
    };
  }, []);

  return (
    <AgencyLayoutContext.Provider value={layoutValue}>
      <>
      <div className="flex min-h-screen bg-[#F5F5F5] lg:mt-0 mt-[70px]">
        <AgencySidebar />
        <div className="flex w-full flex-col lg:pl-[270px] xl:pl-[290px]">
          <main className={`bg-[#F5F5F5] ${isNotificationHidden ? 'pt-[66px]' : ''} ${isToggleVisible ? 'pt-[120px]' : ''}`}>
            <div className="">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {/*Bottom footer*/}
      {(isProjectAllocationAssignAgent || isProjectAllocationReviewAssign) && (
        <div className="fixed bottom-0 left-0 w-full bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)] z-[200]">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[70px]">

            {/* Left */}
            <div className="text-[18px] font-[Bold] text-[#707070]">
              Project Name :{" "}
              <span className="font-[Bold] text-[#222]">
                {assignFooterCtx?.projectName?.trim() ||
                  assignFooterCtx?.projectId ||
                  "—"}
              </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="cursor-pointer px-[20px] h-[44px] rounded-[10px] border border-[#222] text-[14px] font-[Bold] text-[#222]"
              >
                Cancel
              </button>

              {isProjectAllocationAssignAgent ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!assignFooterCtx?.projectId) {
                      toast.error("Missing project", "Open assign agent from a project first.");
                      return;
                    }
                    if ((assignFooterCtx.selectedUnitIds?.length ?? 0) === 0) {
                      toast.error("No units selected", "Select at least one unit before reviewing.");
                      return;
                    }
                    if (!assignFooterCtx.selectedAgentId) {
                      toast.error("No agent selected", "Choose an agent before reviewing assignment.");
                      return;
                    }
                    navigate("/agency/allocation/project-review-assign", {
                      state: {
                        projectId: assignFooterCtx.projectId,
                        projectName: assignFooterCtx.projectName,
                        layoutId: assignFooterCtx.layoutId,
                        selectedUnitIds: assignFooterCtx.selectedUnitIds,
                        selectedAgentId: assignFooterCtx.selectedAgentId,
                        selectedAgentName: assignFooterCtx.selectedAgentName,
                        selectedAgentType: assignFooterCtx.selectedAgentType,
                        selectedAgentProfilePicture:
                          assignFooterCtx.selectedAgentProfilePicture,
                      },
                    });
                  }}
                  className="cursor-pointer px-[20px] h-[44px] rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold]"
                >
                  Review assignment
                </button>
              ) : (
                <button
                  type="button"
                  disabled={footerAllocating}
                  onClick={async () => {
                    if (!assignFooterCtx?.projectId) {
                      toast.error("Missing project", "Open assign agent from a project first.");
                      return;
                    }
                    const unitIds = assignFooterCtx.selectedUnitIds ?? [];
                    if (unitIds.length === 0) {
                      toast.error("No units selected", "Select at least one unit before allocating.");
                      return;
                    }
                    if (!assignFooterCtx.selectedAgentId) {
                      toast.error("No agent selected", "Choose an agent before allocating.");
                      return;
                    }
                    try {
                      setFooterAllocating(true);
                      await agencyService.assignProjectAgents({
                        projectId: assignFooterCtx.projectId,
                        assignments: [
                          { agentId: assignFooterCtx.selectedAgentId, unitIds },
                        ],
                      });
                      toast.success("Units assigned", "The selected units were assigned to the agent.");
                      clearAssignAgentNavDraft();
                      navigate("/agency/allocation/project", { replace: true });
                    } catch (error) {
                      toast.error(
                        "Assignment failed",
                        getApiErrorMessage(error, "Failed to assign units."),
                      );
                    } finally {
                      setFooterAllocating(false);
                    }
                  }}
                  className="cursor-pointer px-[20px] h-[44px] rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {footerAllocating ? "Allocating…" : "Allocate to agents"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {(isProjectAllocationEditAssign) && (
        <div className="fixed bottom-0 left-0 w-full bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)] z-[200]">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[70px]">

            {/* Left */}
            <div className="text-[18px] font-[Bold] text-[#707070]">
              Project Name :{" "}
              <span className="font-[Bold] text-[#222]">
                {editAssignProjectName || "—"}
              </span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="cursor-pointer px-[20px] h-[44px] rounded-[10px] border border-[#222] text-[14px] font-[Bold] text-[#222]"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={footerEditSaving || (editSaveCtx?.unitIds.length ?? 0) === 0}
                onClick={async () => {
                  if (!editSaveCtx?.projectId || !editSaveCtx.allocationId) {
                    toast.error(
                      "Missing details",
                      "Open edit assignment from an assigned row on the unit page.",
                    );
                    return;
                  }
                  const unitIds = editSaveCtx.unitIds;
                  if (unitIds.length === 0) {
                    toast.error(
                      "No units selected",
                      "Select at least one unit before saving.",
                    );
                    return;
                  }
                  try {
                    setFooterEditSaving(true);
                    await agencyService.updateProjectAgentAllocation({
                      projectId: editSaveCtx.projectId,
                      allocationId: editSaveCtx.allocationId,
                      unitIds,
                    });
                    toast.success(
                      "Assignment updated",
                      "The unit list for this allocation was saved.",
                    );
                    clearEditAssignDraft();
                    navigate(-1);
                  } catch (error) {
                    toast.error(
                      "Update failed",
                      getApiErrorMessage(error, "Could not save assignment changes."),
                    );
                  } finally {
                    setFooterEditSaving(false);
                  }
                }}
                className="cursor-pointer px-[20px] h-[44px] rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {footerEditSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
    </AgencyLayoutContext.Provider>
  );
}

export default AgencyIndex;