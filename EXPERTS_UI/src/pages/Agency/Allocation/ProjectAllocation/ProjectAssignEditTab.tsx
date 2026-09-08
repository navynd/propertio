import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DownArrowIcon, SearchIcon, TickIcon } from "../../../../components/CustomFile/icons";
import buildingImage from "../../../../assets/img/building.svg";
import mainbg from "../../../../assets/img/mainbg.png";
import AgencyHeader from "../../../../components/Header/AgencyHeader";
import Loader from "../../../../components/Loader/loader";
import {
  agencyService,
  type ProjectUnitDetailResponse,
} from "../../../../services/agencyService";
import { API_BASE_URL, getApiErrorMessage } from "../../../../services/apiClient";
import { toast } from "../../../../services/toast";
import { writeEditAssignDraft } from "../editAssignDraft";

type MasterAgentTypeOption = { name: string; value: string };

type DropdownAgent = {
  id: string;
  name: string;
  agentType: string;
  profilePicture?: string | null;
};

type EditAssignLocationState = {
  projectId?: string;
  layoutId?: string;
  allocationId?: string;
  projectName?: string;
};

function isProjectUnitDetailResponse(data: unknown): data is ProjectUnitDetailResponse {
  return (
    data != null &&
    typeof data === "object" &&
    Array.isArray((data as ProjectUnitDetailResponse).unitGrid)
  );
}

/** Map grid `unitId` (Mongo id) to owning `allocationId` from `assignedAgents[].layoutSummary.units`. */
function buildUnitToAllocationMap(
  assignedAgents: NonNullable<ProjectUnitDetailResponse["assignedAgents"]>,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const ag of assignedAgents) {
    const aid = String(ag.allocationId ?? "").trim();
    if (!aid) continue;
    for (const u of ag.layoutSummary?.units ?? []) {
      if (u._id) m.set(String(u._id), aid);
      if (u.unitId) m.set(String(u.unitId), aid);
    }
  }
  return m;
}

type GridUnitRole = "ours" | "other" | "free";

function gridUnitRole(
  gridUnitId: string,
  isAssigned: boolean,
  editingAllocationId: string,
  unitToAlloc: Map<string, string>,
): GridUnitRole {
  const id = String(gridUnitId);
  const owner = unitToAlloc.get(id);
  if (owner === editingAllocationId) return "ours";
  if (owner && owner !== editingAllocationId) return "other";
  if (!isAssigned) return "free";
  return "other";
}

function initialSelectedIdsForAllocation(
  detail: ProjectUnitDetailResponse,
  editingAllocationId: string,
): string[] {
  const row = detail.assignedAgents?.find((a) => String(a.allocationId) === editingAllocationId);
  if (!row?.layoutSummary?.units?.length) return [];
  const gridIds = new Set((detail.unitGrid ?? []).map((u) => String(u.unitId)));
  const out: string[] = [];
  for (const u of row.layoutSummary.units) {
    const id = u._id ? String(u._id) : u.unitId ? String(u.unitId) : "";
    if (id && gridIds.has(id)) out.push(id);
  }
  return out;
}

const ProjectAssignEditTab = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state ?? null) as EditAssignLocationState | null;

  const projectId = routeState?.projectId?.trim();
  const layoutId = routeState?.layoutId?.trim();
  const allocationId = routeState?.allocationId?.trim();
  const projectName = routeState?.projectName?.trim() || "Project";

  const [layoutDetail, setLayoutDetail] = useState<ProjectUnitDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const [agentTypeOptions, setAgentTypeOptions] = useState<MasterAgentTypeOption[]>([]);
  const [loadingAgentTypes, setLoadingAgentTypes] = useState(false);
  const [selectedAgentTypeValue, setSelectedAgentTypeValue] = useState<string | null>(null);

  const [dropdownAgents, setDropdownAgents] = useState<DropdownAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<DropdownAgent | null>(null);

  const [isAgentTypeDropdownOpen, setIsAgentTypeDropdownOpen] = useState(false);
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const agentTypeDropdownRef = useRef<HTMLDivElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const [agentImageBaseUrl, setAgentImageBaseUrl] = useState("");
  const initialAgentTypeFromApi = useRef<string | null>(null);

  const unitToAllocation = useMemo(() => {
    if (!layoutDetail?.assignedAgents?.length) return new Map<string, string>();
    return buildUnitToAllocationMap(layoutDetail.assignedAgents);
  }, [layoutDetail]);

  const currentAllocationRow = useMemo(() => {
    if (!layoutDetail?.assignedAgents?.length || !allocationId) return null;
    return layoutDetail.assignedAgents.find((a) => String(a.allocationId) === allocationId) ?? null;
  }, [layoutDetail, allocationId]);

  const selectableUnitIds = useMemo(() => {
    if (!layoutDetail?.unitGrid?.length || !allocationId) return [];
    return layoutDetail.unitGrid
      .filter((u) => {
        const role = gridUnitRole(String(u.unitId), u.isAssigned, allocationId, unitToAllocation);
        return role === "ours" || role === "free";
      })
      .map((u) => String(u.unitId));
  }, [layoutDetail, allocationId, unitToAllocation]);

  const selectedAgentTypeLabel = useMemo(() => {
    if (!selectedAgentTypeValue) return null;
    return (
      agentTypeOptions.find((o) => o.value === selectedAgentTypeValue)?.name ??
      selectedAgentTypeValue
    );
  }, [selectedAgentTypeValue, agentTypeOptions]);

  const filteredAgents = useMemo(() => {
    const q = agentSearch.trim().toLowerCase();
    if (!q) return dropdownAgents;
    return dropdownAgents.filter(
      (a) => a.name.toLowerCase().includes(q) || a.agentType.toLowerCase().includes(q),
    );
  }, [agentSearch, dropdownAgents]);

  const isGlobalAllSelectablePicked =
    selectableUnitIds.length > 0 &&
    selectableUnitIds.every((id) => selectedUnits.includes(id));

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/project/`;
    agencyService
      .getMasterData(["supportedurls"])
      .then((res) => {
        if (!isMounted) return;
        const agentImg = res?.supportedUrls?.agentUrl?.img?.trim() || fallback;
        setAgentImageBaseUrl(agentImg.replace(/\/?$/, "/"));
      })
      .catch(() => {
        if (!isMounted) return;
        setAgentImageBaseUrl(fallback.replace(/\/?$/, "/"));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingAgentTypes(true);
        const data = await agencyService.getMasterData(["agenttypes"]);
        if (cancelled) return;
        const raw = (data?.agentTypes ?? []) as Array<{ name?: string; value?: string }>;
        setAgentTypeOptions(
          raw
            .filter((t) => t?.value && t?.name)
            .map((t) => ({ name: String(t.name), value: String(t.value) })),
        );
      } catch (err) {
        if (!cancelled) {
          toast.error(
            "Could not load agent types",
            getApiErrorMessage(err, "Could not load agent types."),
          );
        }
      } finally {
        if (!cancelled) setLoadingAgentTypes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    initialAgentTypeFromApi.current = null;
    setLayoutDetail(null);
    setSelectedUnits([]);
    setSelectedAgentTypeValue(null);
    setSelectedAgent(null);
    setDropdownAgents([]);
  }, [projectId, layoutId, allocationId]);

  useEffect(() => {
    initialAgentTypeFromApi.current = currentAllocationRow?.agentType ?? null;
  }, [currentAllocationRow]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!projectId || !layoutId || !allocationId) {
        toast.error(
          "Missing details",
          "Open edit assignment from an assigned agent on the unit detail page.",
        );
        return;
      }
      try {
        setLoading(true);
        const res = await agencyService.getProjectUnits({
          projectId,
          layoutId,
          tab: "assigned",
        });
        if (cancelled) return;
        if (!isProjectUnitDetailResponse(res)) {
          toast.error(
            "Unexpected response",
            "Could not load layout units for this assignment.",
          );
          setLayoutDetail(null);
          return;
        }
        const row = res.assignedAgents?.find((a) => String(a.allocationId) === allocationId);
        if (!row) {
          toast.error(
            "Allocation not found",
            "This allocation is not on the current layout. Go back and try again.",
          );
          setLayoutDetail(null);
          return;
        }
        setLayoutDetail(res);
        setSelectedUnits(initialSelectedIdsForAllocation(res, allocationId));
      } catch (error) {
        if (!cancelled) {
          toast.error(
            "Could not load assignment",
            getApiErrorMessage(error, "Could not load unit assignment data."),
          );
          setLayoutDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, layoutId, allocationId]);

  useEffect(() => {
    if (!projectId || !allocationId || !layoutDetail) return;
    writeEditAssignDraft({
      projectId,
      allocationId,
      layoutId: layoutId ?? undefined,
      selectedUnitIds: selectedUnits,
    });
  }, [projectId, allocationId, layoutId, layoutDetail, selectedUnits]);

  useEffect(() => {
    if (!currentAllocationRow || !agentTypeOptions.length) return;
    const v = currentAllocationRow.agentType;
    if (agentTypeOptions.some((o) => o.value === v)) {
      setSelectedAgentTypeValue(v);
    }
  }, [currentAllocationRow, agentTypeOptions]);

  useEffect(() => {
    if (!selectedAgentTypeValue) {
      setDropdownAgents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingAgents(true);
        const res = (await agencyService.getAgents({
          isDropdown: true,
          agentType: selectedAgentTypeValue,
        })) as {
          agents?: Array<DropdownAgent & { profilePicture?: string | null }>;
        };
        if (cancelled) return;
        const list = res?.agents ?? [];
        setDropdownAgents(
          list.map((a) => ({
            id: String(a.id),
            name: a.name ?? "",
            agentType: a.agentType ?? selectedAgentTypeValue,
            profilePicture: a.profilePicture ?? null,
          })),
        );
      } catch (err) {
        if (!cancelled) {
          toast.error(
            "Could not load agents",
            getApiErrorMessage(err, "Could not load agents."),
          );
          setDropdownAgents([]);
        }
      } finally {
        if (!cancelled) setLoadingAgents(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAgentTypeValue]);

  useEffect(() => {
    if (!currentAllocationRow || !dropdownAgents.length) return;
    if (selectedAgentTypeValue !== initialAgentTypeFromApi.current) return;
    if (selectedAgent) return;
    const match = dropdownAgents.find((a) => a.id === currentAllocationRow.agentId);
    if (match) setSelectedAgent(match);
  }, [currentAllocationRow, dropdownAgents, selectedAgentTypeValue, selectedAgent]);

  useEffect(() => {
    if (!isAgentDropdownOpen && !isAgentTypeDropdownOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (agentDropdownRef.current?.contains(t)) return;
      if (agentTypeDropdownRef.current?.contains(t)) return;
      setIsAgentDropdownOpen(false);
      setIsAgentTypeDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [isAgentDropdownOpen, isAgentTypeDropdownOpen]);

  const toAgentProfileUrl = (image: string | null | undefined) => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;
    const base = (agentImageBaseUrl || fallbackBase).replace(/\/+$/, "");
    return `${base}/${String(image).replace(/^\/+/, "")}`;
  };

  const toggleUnit = (gridUnitId: string, isAssigned: boolean) => {
    if (!allocationId) return;
    const role = gridUnitRole(String(gridUnitId), isAssigned, allocationId, unitToAllocation);
    if (role === "other") return;
    const id = String(gridUnitId);
    setSelectedUnits((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAllInLayout = () => {
    const allPicked =
      selectableUnitIds.length > 0 &&
      selectableUnitIds.every((id) => selectedUnits.includes(id));
    setSelectedUnits((prev) => {
      if (allPicked) return prev.filter((id) => !selectableUnitIds.includes(id));
      return [...new Set([...prev, ...selectableUnitIds])];
    });
  };

  const unitGrid = layoutDetail?.unitGrid ?? [];
  const selectedInLayout = unitGrid.filter((u) => selectedUnits.includes(String(u.unitId))).length;

  const renderUnitButton = (
    editingAllocId: string,
    unitId: string,
    unitNumber: string,
    isAssigned: boolean,
    status: string,
  ) => {
    const id = String(unitId);
    const role = gridUnitRole(id, isAssigned, editingAllocId, unitToAllocation);
    const lockedOther = role === "other";
    const isSelected = selectedUnits.includes(id);

    return (
      <button
        key={id}
        type="button"
        disabled={lockedOther}
        onClick={() => toggleUnit(id, isAssigned)}
        title={
          lockedOther
            ? "Assigned to another agent on this layout"
            : role === "free"
              ? "Available to add to this assignment"
              : undefined
        }
        className={`rounded-[10px] p-[15px_20px] flex flex-col gap-[9px] items-center justify-between text-[12px] font-[Bold] border border-[rgba(34,34,34,0.10)] leading-[1.2] transition-colors ${lockedOther
          ? "cursor-not-allowed bg-[rgba(8,50,174,0.10)] text-[#222] border-none opacity-80"
          : isSelected
            ? "cursor-pointer bg-[#222] text-white border-[#222]"
            : "cursor-pointer bg-white text-[#222]"
          }`}
      >
        <span
          className={`h-[15px] w-[15px] rounded-full border flex items-center justify-center text-[9px] leading-none ${lockedOther
            ? "bg-[#DCE3F5] border-[#C4CEE9] text-transparent"
            : isSelected
              ? "bg-[#D4A373] border-[#D4A373] text-white"
              : "bg-white border-[rgba(34,34,34,0.12)] text-transparent"
            }`}
        >
          {isSelected && !lockedOther && <TickIcon width={8} height={6} fill="#FFF" />}
        </span>
        <span className="truncate max-w-full">{unitNumber}</span>

      </button>
    );
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <div>
        <AgencyHeader
          title="Edit assignment"
          showBack={true}
          onBackClick={() => navigate(-1)}
        />
      </div>

      {loading ? (
        <div
          className="rounded-[15px] border border-[rgba(34,34,34,0.08)] bg-white min-h-[280px] flex items-center justify-center py-16"
          aria-busy="true"
          aria-label="Loading assignment"
        >
          <Loader size={80} margin={0} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-[20px] mb-[60px]">
          <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] p-[20px]">
            <div className="flex items-center justify-between gap-3 mb-[6px]">
              <h2 className="text-[#222] text-[20px] leading-[1.2] font-[Bold]">
                Select units
              </h2>
              <button
                type="button"
                onClick={toggleSelectAllInLayout}
                disabled={selectableUnitIds.length === 0}
                className="cursor-pointer flex items-center justify-center h-[33px] px-[14px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGlobalAllSelectablePicked ? "Deselect all" : "Select all"}
              </button>
            </div>
            <p className="text-[12px] font-[SemiBold] text-[#707070] mb-[8px]">
              <span className="text-[#222]">{selectedUnits.length}</span> units selected
              {unitGrid.length > 0 && (
                <span className="text-[#707070] font-[Regular]">
                  {" "}
                  · {unitGrid.length} on layout
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-[16px] mb-[18px]">
              <span className="flex items-center gap-[7px] text-[14px] font-[Regular] text-[#222]">
                <span className="h-[15px] w-[15px] rounded-[5px] border border-[rgba(255,255,255,0.30)] bg-[#222]" />
                Selected
              </span>
              <span className="flex items-center gap-[7px] text-[14px] font-[Regular] text-[#707070]">
                <span className="h-[15px] w-[15px] rounded-[5px] border border-[rgba(8,50,174,0.30)] bg-[#E7EBF7]" />
                Other agent
              </span>
              <span className="flex items-center gap-[7px] text-[14px] font-[Regular] text-[#707070]">
                <span className="h-[15px] w-[15px] rounded-[5px] border border-[rgba(34,34,34,0.30)] bg-white" />
                Available
              </span>
            </div>

            <div className="rounded-[15px] bg-[#F5F5F5] md:p-[20px] p-[15px]">
              {layoutDetail && unitGrid.length > 0 && allocationId ? (
                <div className="mb-[14px] last:mb-0">
                  <div className="flex items-center justify-between gap-3 mb-[20px]">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        <img
                          src={buildingImage}
                          alt={layoutDetail.buildingName ?? "Building"}
                          className="w-[24px] h-[24px] object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-[15px] text-[#222] font-[Bold] leading-[1.2]">
                          {layoutDetail.buildingName ?? "—"}
                        </p>
                        <p className="text-[12px] text-[#707070] font-[Regular]">
                          {layoutDetail.propertyType ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[12px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[20px] mb-[25px] last:mb-0">
                    <div className="flex items-center justify-between gap-4 mb-[12px]">
                      <div>
                        <p className="text-[15px] text-[#222] font-[Medium]">{layoutDetail.layoutName}</p>
                        <p className="text-[12px] text-[#707070] font-[Regular]">
                          {layoutDetail.beds} bed ·{" "}
                          {layoutDetail.areaSqft != null ? `${layoutDetail.areaSqft} sqft` : "—"} ·{" "}
                          {unitGrid.length} units
                        </p>
                      </div>
                      <div className="flex items-center gap-[8px]">
                        <p className="h-[21px] min-w-[36px] px-[8px] rounded-[5px] bg-[#F5F5F5] text-[12px] text-[#222] font-[SemiBold] inline-flex items-center justify-center">
                          {selectedInLayout}/{unitGrid.length}
                        </p>
                        <button
                          type="button"
                          onClick={toggleSelectAllInLayout}
                          disabled={selectableUnitIds.length === 0}
                          className="cursor-pointer h-[33px] px-[12px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isGlobalAllSelectablePicked ? "Deselect all" : "Select all"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-[8px]">
                      {unitGrid.map((u) =>
                        renderUnitButton(
                          String(allocationId),
                          u.unitId,
                          u.unitNumber,
                          u.isAssigned,
                          u.status,
                        ),
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[14px] text-[#707070] text-center py-8">
                  {!projectId || !layoutId || !allocationId
                    ? "Missing project, layout, or allocation."
                    : "No unit data for this layout."}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] h-fit">
            <p className="text-[12px] font-[SemiBold] text-[#707070] mb-[6px]">Project</p>
            <p className="text-[16px] font-[Bold] text-[#222] mb-[18px] truncate">{projectName}</p>

            <h2 className="text-[#222] text-[20px] leading-[1.1] font-[Bold] mb-[25px]">
              Select agent
            </h2>
            <div className="flex flex-col gap-[25px] border-b border-[rgba(34,34,34,0.10)] pb-[30px]">
              <div className="relative" ref={agentTypeDropdownRef}>
                <p className="text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Select agent type</p>
                <button
                  type="button"
                  disabled={loadingAgentTypes}
                  onClick={() => {
                    setIsAgentTypeDropdownOpen((o) => !o);
                    setIsAgentDropdownOpen(false);
                  }}
                  className="cursor-pointer w-full h-[44px] rounded-[8px] border border-[rgba(34,34,34,0.12)] px-[14px] text-left text-[14px] font-[Regular] flex items-center justify-between bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    className={
                      selectedAgentTypeLabel ? "text-[#222] font-[Medium]" : "text-[#707070]"
                    }
                  >
                    {loadingAgentTypes
                      ? "Loading types…"
                      : selectedAgentTypeLabel ?? "Select agent type"}
                  </span>
                  <DownArrowIcon
                    width={11}
                    height={7}
                    className={`shrink-0 transition-transform ${isAgentTypeDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isAgentTypeDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-[8px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white py-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] max-h-[240px] overflow-y-auto">
                    {agentTypeOptions.length === 0 ? (
                      <p className="px-[14px] py-[12px] text-[13px] text-[#707070] text-center">
                        No agent types available
                      </p>
                    ) : (
                      agentTypeOptions.map((opt, idx) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSelectedAgentTypeValue(opt.value);
                            setSelectedAgent(null);
                            setIsAgentTypeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-[14px] py-[12px] text-[13px] font-[SemiBold] text-[#222] hover:bg-[#F8FAFC] transition-colors ${idx < agentTypeOptions.length - 1
                            ? "border-b border-[rgba(34,34,34,0.08)]"
                            : ""
                            }`}
                        >
                          {opt.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="relative" ref={agentDropdownRef}>
                <p className="text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Available agent</p>
                <button
                  type="button"
                  disabled={!selectedAgentTypeValue}
                  onClick={() => {
                    setIsAgentDropdownOpen((o) => !o);
                    setIsAgentTypeDropdownOpen(false);
                  }}
                  className="cursor-pointer w-full min-h-[44px] rounded-[8px] border border-[rgba(34,34,34,0.12)] px-[14px] py-[6px] text-left text-[14px] font-[Regular] flex items-center justify-between gap-3 bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex items-center gap-3 min-w-0 flex-1">
                    {selectedAgent?.profilePicture ? (
                      <img
                        src={toAgentProfileUrl(selectedAgent.profilePicture)}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover shrink-0 bg-[#F0F0F0]"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = mainbg;
                        }}
                      />
                    ) : null}
                    <span
                      className={`truncate ${selectedAgent ? "text-[#222] font-[Medium]" : "text-[#707070]"}`}
                    >
                      {!selectedAgentTypeValue
                        ? "Select agent type first"
                        : selectedAgent
                          ? selectedAgent.name
                          : loadingAgents
                            ? "Loading agents…"
                            : "Select agent"}
                    </span>
                  </span>
                  <DownArrowIcon
                    width={11}
                    height={7}
                    className={`shrink-0 transition-transform ${isAgentDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isAgentDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-[8px] rounded-[10px] bg-white py-[12px] shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                    <div className="px-[12px] mb-[10px]">
                      <div className="flex items-center gap-[10px] h-[40px] rounded-[10px] px-[12px] bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                          type="search"
                          value={agentSearch}
                          onChange={(e) => setAgentSearch(e.target.value)}
                          placeholder="Search agent"
                          className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-[280px] overflow-y-auto px-[12px] scrollbar-hide">
                      {loadingAgents ? (
                        <p className="text-[12px] text-[#707070] py-[12px] text-center">Loading…</p>
                      ) : filteredAgents.length === 0 ? (
                        <p className="text-[12px] text-[#707070] py-[12px] text-center">
                          No agents found
                        </p>
                      ) : (
                        filteredAgents.map((agent) => (
                          <button
                            key={agent.id}
                            type="button"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setIsAgentDropdownOpen(false);
                              setAgentSearch("");
                            }}
                            className="w-full text-left flex gap-[12px] items-start py-[12px] border-b border-[rgba(34,34,34,0.08)] rounded-[6px] px-[4px] -mx-[4px] transition-colors"
                          >
                            <img
                              src={toAgentProfileUrl(agent.profilePicture)}
                              alt=""
                              className="h-[40px] w-[40px] rounded-full object-cover shrink-0 bg-[#F0F0F0]"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = mainbg;
                              }}
                            />
                            <div className="flex-1 min-w-0 pt-[2px]">
                              <p className="text-[12px] font-[Bold] text-[#222] leading-tight">
                                {agent.name}
                              </p>
                              <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px] leading-tight capitalize">
                                {agent.agentType}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[12px] bg-[#F5F5F5] md:p-[20px] p-[15px] mt-[24px]">
              <h3 className="text-[15px] text-[#222] font-[Bold] mb-[10px]">Assignment summary</h3>
              <div className="flex items-center justify-between text-[14px] mb-[6px]">
                <span className="text-[#707070] font-[Regular]">Units selected</span>
                <span className="text-[#222] font-[Bold]">{selectedUnits.length}</span>
              </div>
              {currentAllocationRow?.fullName ? (
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-[#707070] font-[Regular]">Editing allocation</span>
                  <span className="text-[#222] font-[Bold] truncate max-w-[60%] text-right">
                    {currentAllocationRow.fullName}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectAssignEditTab;
