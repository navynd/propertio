import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mainbg from "../../../../assets/img/mainbg.png";
import {
  SearchIcon,
  EditIcon,
  TrashIcon,
  DownArrowIcon,
} from "../../../../components/CustomFile/icons";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import { API_BASE_URL } from "../../../../services/apiClient";
import { agencyService } from "../../../../services/agencyService";
import type { ProjectUnitDetailResponse } from "../../../../services/agencyService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";

const TAB_BLUE = "#0832AE";
export type MainTab = "agencies" | "status";
export type UnitStatusFilter =
  | "All"
  | "Available"
  | "Reserved"
  | "In-Progress"
  | "Follow up"
  | "Closed"
  | "PreClose";

type AgencyAccordion = {
  id: string;
  allocationId?: string;
  agentId: string;
  name: string;
  active: boolean;
  unitCount: number;
  layoutTitle: string;
  layoutSpecs: string;
  unitLabels: string[];
};

type UnitStatusRow = {
  id: string;
  unitId: string;
  agencies: string[];
  yourAgentName: string;
  yourAgentAgency: string;
  yourAgentSpecialization?: string;
  yourAgentPicture?: string;
  handlingAgentName: string;
  handlingAgentAgency: string;
  handlingAgentSpecialization?: string;
  handlingAgentPicture?: string;
  status: Exclude<UnitStatusFilter, "All">;
};

const unitStatusFilters: UnitStatusFilter[] = [
  "All",
  "Available",
  "Reserved",
  "In-Progress",
  "Follow up",
  "PreClose",
  "Closed",
];

function statusBadgeClass(status: UnitStatusRow["status"]) {
  switch (status) {
    case "Available":
      return "bg-[rgba(0,166,99,0.10)] text-[#00A663]";
    case "PreClose":
      return "bg-[rgba(234,57,52,0.10)] text-[#EA3934]";
    case "In-Progress":
      return "bg-[rgba(255,70,162,0.10)] text-[#FF46A2]";
    case "Reserved":
      return "bg-[rgba(199,163,53,0.10)] text-[#C7A335]";
    case "Closed":
      return "bg-[#EA3934] text-white";
    case "Follow up":
      return "bg-[rgba(8,50,174,0.10)] text-[#0832AE]";
    default:
      return "bg-[#F5F5F5] text-[#222]";
  }
}

function toFilterStatus(status: string | undefined): UnitStatusRow["status"] {
  const s = (status ?? "").toLowerCase();
  if (s === "available") return "Available";
  if (s === "reserved") return "Reserved";
  if (s === "in-progress") return "In-Progress";
  if (s === "follow-up") return "Follow up";
  if (s === "closed") return "Closed";
  if (s === "pre-close" || s === "preclose") return "PreClose";
  return "Available";
}

const ProjectAssignUnitTab = ({
  units,
  mainTab,
  onMainTabChange,
  tabLoading,
  statusFilter,
  statusSearch,
  statusPage,
  onStatusFilterChange,
  onStatusSearchChange,
  onStatusPageChange,
  projectId,
  layoutId,
  projectName,
}: {
  units: ProjectUnitDetailResponse | null;
  mainTab: MainTab;
  onMainTabChange: (tab: MainTab) => void;
  tabLoading?: boolean;
  statusFilter: UnitStatusFilter;
  statusSearch: string;
  statusPage: number;
  onStatusFilterChange: (f: UnitStatusFilter) => void;
  onStatusSearchChange: (v: string) => void;
  onStatusPageChange: (p: number) => void;
  projectId?: string;
  layoutId?: string;
  projectName?: string;
}) => {
  const navigate = useNavigate();
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  const [agentImageBaseUrl, setAgentImageBaseUrl] = useState("");
  const itemsPerPage = units?.pagination?.limit || 10;

  const toAgentProfileUrl = (image?: string) => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;
    const base = (agentImageBaseUrl || fallbackBase).replace(/\/+$/, "");
    return `${base}/${image.replace(/^\/+/, "")}`;
  };

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

  const agenciesData: AgencyAccordion[] = useMemo(() => {
    if (units?.assignedAgents?.length) {
      return units.assignedAgents.map((agent, index) => ({
        id: agent.allocationId || `${agent.agentId}-${index}`,
        allocationId: agent.allocationId,
        agentId: agent.agentId,
        name: agent.fullName || "Agent not assigned",
        active: true,
        unitCount: agent.unitsCount || 0,
        layoutTitle: agent.layoutSummary?.layoutName || units.layoutName || "-",
        layoutSpecs: `${agent.layoutSummary?.propertyType || units.propertyType || "-"} • ${agent.layoutSummary?.areaSqft || units.areaSqft || 0} sq.ft • ${agent.layoutSummary?.bedrooms || units.beds || 0} Bedrooms • ${agent.layoutSummary?.totalUnits || agent.unitsCount || 0} units`,
        unitLabels: (agent.layoutSummary?.units || []).map((u) => u.unitNumber || "-"),
      }));
    }

    const byAgent = new Map<string, AgencyAccordion>();
    (units?.units || []).forEach((u) => {
      const key = u.yourAgent?.agentId || u.handlingAgent?.agentId;
      const name = u.yourAgent?.fullName || u.handlingAgent?.fullName;
      if (!key || !name) return;
      if (!byAgent.has(key)) {
        byAgent.set(key, {
          id: key,
          allocationId: undefined,
          agentId: key,
          name,
          active: true,
          unitCount: 0,
          layoutTitle: units?.layoutName || "-",
          layoutSpecs: `${units?.propertyType || "-"} • ${units?.areaSqft || 0} sq.ft • ${units?.beds || 0} Bedrooms • ${units?.unitsAssigned || 0} units`,
          unitLabels: [],
        });
      }
      const row = byAgent.get(key)!;
      row.unitCount += 1;
      row.unitLabels.push(u.unitNumber || "-");
    });

    return Array.from(byAgent.values());
  }, [units]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- expand first agency when tab data changes
    setExpandedAgencyId(agenciesData[0]?.id ?? null);
  }, [agenciesData]);

  const unitStatusRows: UnitStatusRow[] = useMemo(
    () =>
      (units?.units || []).map((unit, index) => ({
        id: unit.unitId || `${index}`,
        unitId: unit.unitNumber || `Unit-${index + 1}`,
        agencies: (unit.assignedAgencies || []).map((a) => a.agencyName || "-"),
        yourAgentName: unit.yourAgent?.fullName || "Agent not assigned",
        yourAgentAgency: unit.yourAgent?.agencyName || "-",
        yourAgentSpecialization: unit.yourAgent?.specialization?.title || "-",
        yourAgentPicture: unit.yourAgent?.profilePicture || "profileless.png",
        handlingAgentName: unit.handlingAgent?.fullName || "No agent is handling",
        handlingAgentAgency: unit.handlingAgent?.agencyName || "-",
        handlingAgentSpecialization: unit.handlingAgent?.specialization?.title || "-",
        handlingAgentPicture: unit.handlingAgent?.profilePicture || "profileless.png",
        status: toFilterStatus(unit.unitStatus),
      })),
    [units],
  );

  const paginatedStatusRows = unitStatusRows;
  const toStatusCountKey = (f: UnitStatusFilter) => {
    if (f === "PreClose") return "pre-close";
    return f.toLowerCase().replace(/\s+/g, "-");
  };

  return (
    <div className="rounded-[15px] bg-white min-w-0 overflow-hidden">
      <div className="flex border-b border-[rgba(34,34,34,0.10)] px-5 sm:px-8 gap-8">
        <button
          type="button"
          onClick={() => onMainTabChange("agencies")}
          className={`relative cursor-pointer p-[20px_30px] text-[13px] transition-colors ${mainTab === "agencies" ? "font-[SemiBold]" : "font-[Regular] text-[#222]"}`}
          style={mainTab === "agencies" ? { color: TAB_BLUE } : undefined}
        >
          Assigned Agents
          {mainTab === "agencies" && (
            <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full" style={{ backgroundColor: TAB_BLUE }} />
          )}
        </button>
        <button
          type="button"
          onClick={() => onMainTabChange("status")}
          className={`relative cursor-pointer p-[20px_30px] text-[13px] transition-colors ${mainTab === "status" ? "font-[SemiBold]" : "font-[Regular] text-[#222]"}`}
          style={mainTab === "status" ? { color: TAB_BLUE } : undefined}
        >
          Unit status
          {mainTab === "status" && (
            <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full" style={{ backgroundColor: TAB_BLUE }} />
          )}
        </button>
      </div>

      <div className="md:p-[30px] p-[20px] bg-[#FFF]">
        {tabLoading ? (
          <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] bg-white min-h-[220px] flex items-center justify-center">
            <Loader size={64} margin={0} />
          </div>
        ) : (
          <>
        {mainTab === "agencies" && (
          <>
            {agenciesData.length === 0 ? (
              <div className="rounded-[15px] bg-[#F0F0F0] py-8 px-4 text-center">
                <p className="text-[13px] text-[#707070] font-[Regular]">No units assigned yet</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {agenciesData.map((agency) => {
                  const open = expandedAgencyId === agency.id;
                  return (
                    <div key={agency.id} className="rounded-[15px] bg-[#F5F5F5] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedAgencyId((prev) => (prev === agency.id ? null : agency.id))}
                        className="w-full overflow-x-auto scrollbar-hide bg-[#F5F5F5] grid grid-cols-[180px_auto_auto] items-center justify-between md:p-[20px_30px] p-[15px_20px] gap-3 sm:gap-4 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[14px] font-[SemiBold] text-[#0832AE] truncate">{agency.name}</span>
                          <span className={`inline-flex shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
                            <DownArrowIcon width={10} height={6} stroke="#0832AE" fill="#0832AE" className="text-[#0832AE]" />
                          </span>
                        </div>
                        <div className="text-[14px] font-[Bold] text-[#00A663] shrink-0">Active</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-[Bold] text-[#222] shrink-0">{agency.unitCount} units</span>
                          <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!projectId?.trim() || !layoutId?.trim()) {
                                  toast.error(
                                    "Missing project or layout",
                                    "Open this screen from project units with a layout selected.",
                                  );
                                  return;
                                }
                                if (!agency.allocationId) {
                                  toast.error(
                                    "Cannot edit assignment",
                                    "This row has no allocation id. Assigned-agents data may still be loading.",
                                  );
                                  return;
                                }
                                navigate("/agency/allocation/project-edit-assign", {
                                  state: {
                                    projectId: projectId.trim(),
                                    layoutId: layoutId.trim(),
                                    allocationId: agency.allocationId,
                                    projectName: projectName?.trim(),
                                  },
                                });
                              }}
                              className="cursor-pointer p-2 rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]"
                              aria-label="Edit"
                            >
                              <EditIcon width={20} height={20} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="p-2 rounded-[8px] hover:bg-[#F1F5F9] text-[#E53E3E]"
                              aria-label="Delete"
                            >
                              <TrashIcon width={20} height={20} />
                            </button>
                          </div>
                        </div>
                      </button>
                      {open && (
                        <div className="m-[0px_6px_6px_6px] rounded-[15px] bg-white md:p-[20px_30px] p-[15px_20px]">
                          <p className="text-[15px] font-[Medium] text-[#222] mb-2">{agency.layoutTitle}</p>
                          <p className="text-[12px] font-[Regular] text-[#707070] mb-4">{agency.layoutSpecs}</p>
                          <div className="flex flex-wrap gap-2">
                            {agency.unitLabels.map((label) => (
                              <span
                                key={`${agency.id}-${label}`}
                                className="flex items-center justify-center rounded-[5px] bg-[#222] text-white text-[12px] font-[SemiBold] p-[6px_10px]"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {mainTab === "status" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {unitStatusFilters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => onStatusFilterChange(f)}
                    className={`shrink-0 rounded-full px-[14px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${statusFilter === f ? "bg-[#222] text-white" : "bg-white text-[#222] border border-[rgba(34,34,34,0.10)]"}`}
                  >
                    {f}
                    {f !== "All" ? ` (${units?.statusCounts?.[toStatusCountKey(f)] ?? 0})` : ""}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[40px] w-full xl:w-[280px] shrink-0">
                <SearchIcon className="text-[#707070] shrink-0" />
                <input
                  type="search"
                  value={statusSearch}
                  onChange={(e) => onStatusSearchChange(e.target.value)}
                  placeholder="Search unit, agency, agent..."
                  className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <div className="min-w-[1212px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                <div className="grid grid-cols-[minmax(100px,1fr)_minmax(200px,1.4fr)_minmax(220px,1.6fr)_minmax(220px,1.6fr)_minmax(120px,1fr)] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                  <p className="text-[14px] font-[Bold] text-[#222]">Unit ID</p>
                  <p className="text-[14px] font-[Bold] text-[#222]">Assigned Agencies</p>
                  <p className="text-[14px] font-[Bold] text-[#222]">Your Agent</p>
                  <p className="text-[14px] font-[Bold] text-[#222]">Handling Agent</p>
                  <p className="text-[14px] font-[Bold] text-[#222]">Unit status</p>
                </div>
                {paginatedStatusRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[minmax(100px,1fr)_minmax(200px,1.4fr)_minmax(220px,1.6fr)_minmax(220px,1.6fr)_minmax(120px,1fr)] gap-2 items-center px-[14px] py-[12px] ${index !== paginatedStatusRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                  >
                    <p className="text-[12px] font-[Bold] text-[#222]">{row.unitId}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.agencies.slice(0, 2).map((a) => (
                        <span
                          key={`${row.id}-${a}`}
                          className="inline-flex rounded-[5px] border border-[rgba(34,34,34,0.10)] text-[#222] text-[12px] font-[SemiBold] px-2 py-1"
                        >
                          {a}
                        </span>
                      ))}
                      {row.agencies.length > 2 && (
                        <span className="inline-flex text-[#222] text-[12px] font-[Regular] px-2 py-1">
                          +{row.agencies.length - 2}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-[#F0F0F0] border border-[rgba(34,34,34,0.10)]">
                        <img src={toAgentProfileUrl(row.yourAgentPicture)} alt={row.yourAgentName} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-[Bold] text-[#222] truncate">{row.yourAgentName}</p>
                        <p className="text-[12px] font-[Regular] text-[#707070] truncate">
                          {row.yourAgentName.toLowerCase() === "otheragent"
                            ? row.yourAgentAgency
                            : row.yourAgentSpecialization || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-[#F0F0F0] border border-[rgba(34,34,34,0.10)]">
                        <img src={toAgentProfileUrl(row.handlingAgentPicture)} alt={row.handlingAgentName} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-[Bold] text-[#222] truncate">{row.handlingAgentName}</p>
                        <p className="text-[12px] font-[Regular] text-[#707070] truncate">
                          {row.handlingAgentName.toLowerCase() === "otheragent"
                            ? row.handlingAgentAgency
                            : row.handlingAgentSpecialization || "-"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-[6px] px-2.5 py-1 text-[11px] font-[SemiBold] capitalize ${statusBadgeClass(row.status)}`}>
                        {row.status}
                      </span>
                    </div>
                  </div>
                ))}
                {paginatedStatusRows.length === 0 && (
                  <div className="px-[14px] py-[28px] text-center text-[14px] text-[#707070]">
                    No units found for this filter.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>

      <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
        {!tabLoading && mainTab === "status" ? (
          <Pagenation
            currentPage={statusPage}
            totalItems={units?.pagination?.totalUnits || 0}
            itemsPerPage={itemsPerPage}
            onPageChange={onStatusPageChange}
          />
        ) : null}
      </div>
    </div>
  );
};

export default ProjectAssignUnitTab;
