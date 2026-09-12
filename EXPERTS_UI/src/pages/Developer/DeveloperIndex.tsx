import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import DeveloperSidebar from "../../components/DeveloperLayout/DeveloperSidebar";
import { developerService } from "../../services/developerService";
import { toast } from "../../services/toast";

function DeveloperIndex() {
  const [isNotificationHidden, setIsNotificationHidden] = useState(false);
  const [isToggleVisible, setIsToggleVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || "";
  const projectNameFromState = ((location.state as { projectName?: string } | null)?.projectName || "").trim();
  const projectNameFromQuery = (searchParams.get("projectName") || "").trim();
  const [projectName, setProjectName] = useState(projectNameFromState || projectNameFromQuery || "-");
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const isAssignAgencies = location.pathname === "/developer/assign-agencies";
  const isReviewAssignment = location.pathname === "/developer/review-assignment";
  const isUnitsAssign = location.pathname === "/developer/units-assign";
  const isUnitsEditAssign = location.pathname === "/developer/units-edit-assign";

  const footerProjectName = useMemo(() => projectName || "-", [projectName]);
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
    if (projectNameFromState) {
      setProjectName(projectNameFromState);
      return;
    }
    if (projectNameFromQuery) {
      setProjectName(projectNameFromQuery);
      return;
    }
    if (!projectId) {
      setProjectName("-");
      return;
    }
    let mounted = true;
    developerService
      .getProjectDetails(projectId)
      .then((res) => {
        if (!mounted) return;
        setProjectName(String(res?.project?.projectName || "-"));
      })
      .catch(() => {
        if (!mounted) return;
        setProjectName("-");
      });
    return () => {
      mounted = false;
    };
  }, [projectId, projectNameFromQuery, projectNameFromState]);

  const withProjectParams = (path: string) => {
    const query = new URLSearchParams(searchParams);
    if (!query.get("projectName") && footerProjectName && footerProjectName !== "-") {
      query.set("projectName", footerProjectName);
    }
    const q = query.toString();
    return q ? `${path}?${q}` : path;
  };

  const handleUnitsFooterAction = async () => {
    if (isUnitsAssign) {
      const raw = sessionStorage.getItem("developer.unitsAssignSelection");
      if (!raw) {
        toast.error("No selection found", "Please select agencies and units before review.");
        return;
      }
      try {
        const parsed = JSON.parse(raw) as {
          selectedUnits?: string[];
          selectedAgencyIds?: string[];
        };
        const selectedUnits = Array.isArray(parsed.selectedUnits) ? parsed.selectedUnits : [];
        const selectedAgencyIds = Array.isArray(parsed.selectedAgencyIds) ? parsed.selectedAgencyIds : [];
        if (selectedUnits.length < 1) {
          toast.error("No units selected", "Please select at least one unit.");
          return;
        }
        if (selectedAgencyIds.length < 1) {
          toast.error("No agencies selected", "Please select at least one agency.");
          return;
        }
      } catch {
        toast.error("Invalid selection data", "Please reselect agencies and units.");
        return;
      }
      navigate(withProjectParams("/developer/units-edit-assign"), { state: { projectName: footerProjectName } });
      return;
    }

    const raw = sessionStorage.getItem("developer.unitsAssignSelection");
    if (!raw) {
      toast.error("No assignment selection", "Please select units and agencies first.");
      return;
    }

    let parsed: {
      projectId?: string;
      selectedUnits?: string[];
      selectedAgencyIds?: string[];
      perAgencyUnitIds?: Record<string, string[]>;
    } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast.error("Invalid selection data", "Please reselect agencies and units.");
      return;
    }

    const effectiveProjectId = String(parsed.projectId || projectId || "");
    const selectedUnits = Array.isArray(parsed.selectedUnits) ? parsed.selectedUnits.map(String) : [];
    const selectedAgencyIds = Array.isArray(parsed.selectedAgencyIds) ? parsed.selectedAgencyIds.map(String) : [];

    if (!effectiveProjectId) {
      toast.error("Missing project", "projectId is required.");
      return;
    }
    if (selectedUnits.length < 1) {
      toast.error("No units selected", "Please select at least one unit.");
      return;
    }
    if (selectedAgencyIds.length < 1) {
      toast.error("No agencies selected", "Please select at least one agency.");
      return;
    }

    const perAgencyUnitIds =
      parsed.perAgencyUnitIds && typeof parsed.perAgencyUnitIds === "object"
        ? parsed.perAgencyUnitIds
        : {};

    const assignments = selectedAgencyIds
      .map((agencyId) => ({
        agencyId,
        unitIds: Array.isArray(perAgencyUnitIds[agencyId])
          ? perAgencyUnitIds[agencyId].map(String)
          : selectedUnits,
      }))
      .filter((item) => item.unitIds.length > 0);

    if (assignments.length < 1) {
      toast.error("No assignments to save", "Please select units for at least one agency.");
      return;
    }

    const payload = {
      projectId: effectiveProjectId,
      assignments,
      // Business rule: once agencies are allocated, project becomes published.
      publish: true,
    };

    try {
      setIsSubmittingAssign(true);
      await developerService.assignAgencies(payload);
      sessionStorage.removeItem("developer.unitsAssignSelection");
      toast.success("Assignment saved", "Agencies assigned and project published successfully.");
      navigate(withProjectParams("/developer/units"));
    } catch (error: unknown) {
      toast.error("Assignment failed", (error as { message?: string })?.message || "Could not assign agencies.");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleBulkAssignFooterAction = async () => {
    if (isAssignAgencies) {
      const raw = sessionStorage.getItem("developer.bulkAssignSelection");
      if (!raw) {
        toast.error("No selection found", "Please select agencies and units before review.");
        return;
      }
      try {
        const parsed = JSON.parse(raw) as { selectedUnits?: string[]; selectedAgencyIds?: string[] };
        const selectedUnits = Array.isArray(parsed.selectedUnits) ? parsed.selectedUnits : [];
        const selectedAgencyIds = Array.isArray(parsed.selectedAgencyIds) ? parsed.selectedAgencyIds : [];
        if (selectedUnits.length < 1) {
          toast.error("No units selected", "Please select at least one unit.");
          return;
        }
        if (selectedAgencyIds.length < 1) {
          toast.error("No agencies selected", "Please select at least one agency.");
          return;
        }
      } catch {
        toast.error("Invalid selection data", "Please reselect agencies and units.");
        return;
      }
      navigate(withProjectParams("/developer/review-assignment"), { state: { projectName: footerProjectName } });
      return;
    }

    const raw = sessionStorage.getItem("developer.bulkAssignSelection");
    if (!raw) {
      toast.error("No assignment selection", "Please select units and agencies first.");
      return;
    }
    let parsed: {
      projectId?: string;
      selectedUnits?: string[];
      selectedAgencyIds?: string[];
      perAgencyUnitIds?: Record<string, string[]>;
    } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      toast.error("Invalid selection data", "Please reselect agencies and units.");
      return;
    }

    const effectiveProjectId = String(parsed.projectId || projectId || "");
    const selectedUnits = Array.isArray(parsed.selectedUnits) ? parsed.selectedUnits.map(String) : [];
    const selectedAgencyIds = Array.isArray(parsed.selectedAgencyIds) ? parsed.selectedAgencyIds.map(String) : [];
    if (!effectiveProjectId) {
      toast.error("Missing project", "projectId is required.");
      return;
    }
    if (selectedUnits.length < 1) {
      toast.error("No units selected", "Please select at least one unit.");
      return;
    }
    if (selectedAgencyIds.length < 1) {
      toast.error("No agencies selected", "Please select at least one agency.");
      return;
    }

    const perAgencyUnitIds =
      parsed.perAgencyUnitIds && typeof parsed.perAgencyUnitIds === "object"
        ? parsed.perAgencyUnitIds
        : {};
    const assignments = selectedAgencyIds
      .map((agencyId) => ({
        agencyId,
        unitIds: Array.isArray(perAgencyUnitIds[agencyId]) ? perAgencyUnitIds[agencyId].map(String) : selectedUnits,
      }))
      .filter((item) => item.unitIds.length > 0);

    if (assignments.length < 1) {
      toast.error("No assignments to save", "Please select units for at least one agency.");
      return;
    }

    try {
      setIsSubmittingAssign(true);
      await developerService.assignAgencies({
        projectId: effectiveProjectId,
        assignments,
        publish: true,
      });
      sessionStorage.removeItem("developer.bulkAssignSelection");
      toast.success("Assignment saved", "Agencies assigned and project published successfully.");
      navigate(withProjectParams("/developer/units"));
    } catch (error: unknown) {
      toast.error("Assignment failed", (error as { message?: string })?.message || "Could not assign agencies.");
    } finally {
      setIsSubmittingAssign(false);
    }
  };

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
    <>
      <div className="flex min-h-screen bg-[#0A0A0A] lg:mt-0 mt-[70px]">
        <DeveloperSidebar />
        <div className="flex w-full flex-col lg:pl-[280px]">
          <main className={`bg-[#0A0A0A] min-h-screen text-[#F5F0E8] ${isNotificationHidden ? 'pt-[66px]' : ''} ${isToggleVisible ? 'pt-[120px]' : ''}`}>
            <div className="">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {/*Bottom footer*/}
      {(isAssignAgencies || isReviewAssignment) && (
        <div className="fixed bottom-0 left-0 w-full bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)] z-[200]">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[70px]">

            {/* Left */}
            <div className="text-[18px] font-[Bold] text-[#707070]">
              Project Name : <span className="font-[Bold] text-[#222]">{footerProjectName}</span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/developer/project-management")} className="cursor-pointer px-[20px] h-[44px] rounded-[10px] border border-[#222] text-[14px] font-[Bold] text-[#222]">
                Cancel
              </button>

              <button onClick={handleBulkAssignFooterAction} disabled={isSubmittingAssign} className="cursor-pointer px-[20px] h-[44px] rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] disabled:opacity-70">
                {isAssignAgencies ? "Review assignment" : "Publish"}
              </button>
            </div>
          </div>
        </div>
      )}
      {(isUnitsAssign || isUnitsEditAssign) && (
        <div className="fixed bottom-0 left-0 w-full bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)] z-[200]">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-[70px]">

            {/* Left */}
            <div className="text-[18px] font-[Bold] text-[#707070]">
              Project Name : <span className="font-[Bold] text-[#222]">{footerProjectName}</span>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <button onClick={() => navigate("/developer/project-management")} className="cursor-pointer px-[20px] h-[44px] rounded-[10px] border border-[#222] text-[14px] font-[Bold] text-[#222]">
                Cancel
              </button>

              <button onClick={handleUnitsFooterAction} disabled={isSubmittingAssign} className="cursor-pointer px-[20px] h-[44px] rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] disabled:opacity-70">
                {isUnitsAssign ? "Review assignment" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>

  );
}

export default DeveloperIndex;