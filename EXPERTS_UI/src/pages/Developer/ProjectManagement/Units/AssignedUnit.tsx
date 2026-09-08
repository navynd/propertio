import { useEffect, useMemo, useState } from "react";
import userImg from "../../../../assets/img/user.png";
import { SearchIcon, EditIcon, TrashIcon, DownArrowIcon } from "../../../../components/CustomFile/icons";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import { useNavigate } from "react-router-dom";
import { developerService, type DeveloperProjectUnitDetailResponse } from "../../../../services/developerService";
import { toast } from "../../../../services/toast";
import { API_BASE_URL } from "../../../../services/apiClient";

const TAB_BLUE = "#0832AE";
type MainTab = "agencies" | "status";
type UnitStatusFilter = "All" | "Available" | "Reserved" | "In-Progress" | "Follow up" | "Closed" | "PreClose";

type AgencyDisplay = {
  id: string;
  name: string;
  portraitUrl: string;
};

type UnitStatusRow = {
  id: string;
  unitId: string;
  agencies: AgencyDisplay[];
  handlingAgent: {
    id: string;
    fullName: string;
    profilePicture: string;
  } | null;
  status: Exclude<UnitStatusFilter, "All">;
};

type AssignedUnitProps = {
  projectId: string;
  layoutId: string;
  assigned: boolean;
  layout: DeveloperProjectUnitDetailResponse["layout"] | null;
  agencies: DeveloperProjectUnitDetailResponse["agencies"];
  statusUnits: DeveloperProjectUnitDetailResponse["unitStatus"]["units"];
};

const unitStatusFilters: UnitStatusFilter[] = ["All", "Available", "Reserved", "In-Progress", "Follow up", "PreClose", "Closed"];

const makeAgencyLabel = (id: string) => {
  const short = id && id.length > 8 ? `...${id.slice(-6)}` : id;
  return `Agency ${short || "Unknown"}`;
};

const toStatusLabel = (status: string): UnitStatusRow["status"] => {
  if (status === "available") return "Available";
  if (status === "reserved") return "Reserved";
  if (status === "in-progress") return "In-Progress";
  if (status === "follow-up") return "Follow up";
  if (status === "closed") return "Closed";
  return "PreClose";
};

const toApiStatus = (status: UnitStatusFilter): DeveloperProjectUnitDetailResponse["unitStatus"]["units"][number]["status"] | undefined => {
  if (status === "All") return undefined;
  if (status === "Available") return "available";
  if (status === "Reserved") return "reserved";
  if (status === "In-Progress") return "in-progress";
  if (status === "Follow up") return "follow-up";
  if (status === "Closed") return "closed";
  return "pre-close";
};

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

const AssignedUnit = ({ projectId, layoutId, assigned, layout, agencies, statusUnits }: AssignedUnitProps) => {
  const navigate = useNavigate();
  const defaultOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
  const [agencyImgBase, setAgencyImgBase] = useState(`${defaultOrigin}/uploads/img/agency/`);
  const [agentImgBase, setAgentImgBase] = useState(`${defaultOrigin}/uploads/img/agents/`);
  const [mainTab, setMainTab] = useState<MainTab>("agencies");
  const [expandedAgencyId, setExpandedAgencyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>("All");
  const [statusSearch, setStatusSearch] = useState("");
  const [statusPage, setStatusPage] = useState(1);
  const [statusUnitsFromApi, setStatusUnitsFromApi] = useState(statusUnits || []);
  const [statusTotalFromApi, setStatusTotalFromApi] = useState<number>((statusUnits || []).length);
  const itemsPerPage = 5;

  const toAgencyPortraitUrl = (picture: unknown) => {
    const raw = typeof picture === "string" ? picture.trim() : "";
    if (!raw) return userImg;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const filename = raw.includes("/") ? raw.split("/").pop() || raw : raw;
    return `${agencyImgBase}${filename}`;
  };

  const toAgentPortraitUrl = (picture: unknown) => {
    const raw = typeof picture === "string" ? picture.trim() : "";
    if (!raw) return userImg;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const filename = raw.includes("/") ? raw.split("/").pop() || raw : raw;
    return `${agentImgBase}${filename}`;
  };

  useEffect(() => {
    let mounted = true;
    developerService
      .getSupportedUrlsMasterData()
      .then((data) => {
        if (!mounted) return;
        const source =
          (data.supportedUrls as Record<string, unknown>) ||
          (data.supportedurls as Record<string, unknown>) ||
          {};
        const agencyUrl =
          (source.agencyUrl as Record<string, unknown>) ||
          (source.agencyurl as Record<string, unknown>) ||
          {};
        const agentUrl =
          (source.agentUrl as Record<string, unknown>) ||
          (source.agenturl as Record<string, unknown>) ||
          {};
        const base = String(agencyUrl.img || `${defaultOrigin}/uploads/img/agency/`).replace(/\/?$/, "/");
        const agentBase = String(agentUrl.img || `${defaultOrigin}/uploads/img/agents/`).replace(/\/?$/, "/");
        setAgencyImgBase(base);
        setAgentImgBase(agentBase);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [defaultOrigin]);

  const agenciesData = useMemo(
    () =>
      (agencies || []).map((agencyItem) => {
        const agencyId = String(agencyItem.agency?._id || agencyItem.allocationId);
        const agencyDoc = agencyItem.agency;
        const name =
          (agencyDoc?.agencyName && String(agencyDoc.agencyName).trim()) ||
          (agencyDoc?.name && String(agencyDoc.name).trim()) ||
          makeAgencyLabel(agencyId);
        const portraitUrl = toAgencyPortraitUrl(agencyDoc?.profilePicture ?? agencyDoc?.logo);
        return {
          id: agencyId,
          allocationId: String(agencyItem.allocationId || ""),
          name,
          portraitUrl,
          active: agencyItem.status === "active",
          unitCount: Number(agencyItem.unitsInThisLayout || 0),
          layoutTitle: `${layout?.layoutName || "-"} (${layout?.building?.name || "-"})`,
          layoutSpecs: `${layout?.propertyType?.name || "-"} • ${layout?.areaSqft || "-"} sqft • ${layout?.bedrooms ?? "-"} Bedrooms • ${agencyItem.unitsInThisLayout || 0} units`,
          unitLabels: (agencyItem.units || []).map((u) => (u.unitNumber ? `Unit-${u.unitNumber}` : u.unitId || "Unit")),
        };
      }),
    [agencies, agencyImgBase, layout]
  );

  useEffect(() => {
    if (!agenciesData.length) {
      setExpandedAgencyId(null);
      return;
    }
    setExpandedAgencyId((prev) => prev || agenciesData[0].id);
  }, [agenciesData]);

  const agencyMetaById = useMemo(() => {
    const map: Record<string, { name: string; portraitUrl: string }> = {};
    agenciesData.forEach((a) => {
      map[a.id] = { name: a.name, portraitUrl: a.portraitUrl };
    });
    return map;
  }, [agenciesData]);

  useEffect(() => {
    setStatusUnitsFromApi(statusUnits || []);
    setStatusTotalFromApi((statusUnits || []).length);
  }, [statusUnits]);

  useEffect(() => {
    if (mainTab !== "status" || !projectId || !layoutId) return;

    let mounted = true;
    developerService
      .getProjectUnitDetail({
        projectId,
        layoutId,
        assigned,
        unitStatus: toApiStatus(statusFilter),
        page: statusPage,
        limit: itemsPerPage,
      })
      .then((res) => {
        if (!mounted) return;
        setStatusUnitsFromApi(res?.unitStatus?.units || []);
        setStatusTotalFromApi(Number(res?.unitStatus?.pagination?.total || 0));
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        toast.error("Failed to filter unit status", (error as { message?: string })?.message || "Could not fetch unit status.");
      });

    return () => {
      mounted = false;
    };
  }, [assigned, itemsPerPage, layoutId, mainTab, projectId, statusFilter, statusPage]);

  const unitStatusRows = useMemo<UnitStatusRow[]>(
    () =>
      (statusUnitsFromApi || []).map((u) => ({
        id: String(u._id),
        unitId: u.unitNumber ? `Unit-${u.unitNumber}` : u.unitId || "Unit",
        agencies: (u.assignedAgencies || []).map((a) => {
          const id = String(a.id);
          const fromAlloc = agencyMetaById[id];
          const name =
            (a.agencyName && String(a.agencyName).trim()) ||
            (a.name && String(a.name).trim()) ||
            fromAlloc?.name ||
            makeAgencyLabel(id);
          const fromApi = toAgencyPortraitUrl(a.profilePicture ?? a.logo);
          const portraitUrl = fromApi !== userImg ? fromApi : (fromAlloc?.portraitUrl ?? userImg);
          return { id, name, portraitUrl };
        }),
        handlingAgent:
          u.handlingAgent && typeof u.handlingAgent === "object" && Object.keys(u.handlingAgent).length > 0
            ? {
                id: String((u.handlingAgent as { id?: unknown }).id || ""),
                fullName: String((u.handlingAgent as { fullName?: unknown }).fullName || "Handling agent"),
                profilePicture: toAgentPortraitUrl((u.handlingAgent as { profilePicture?: unknown }).profilePicture),
              }
            : null,
        status: toStatusLabel(u.status),
      })),
    [agencyMetaById, agencyImgBase, agentImgBase, statusUnitsFromApi]
  );

  const toggleAgency = (id: string) => setExpandedAgencyId((prev) => (prev === id ? null : id));

  const filteredStatusRows = unitStatusRows.filter((row) => {
    if (!statusSearch.trim()) return true;
    const q = statusSearch.toLowerCase();
    return (
      row.unitId.toLowerCase().includes(q) ||
      row.agencies.some((a) => a.name.toLowerCase().includes(q)) ||
      row.status.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setStatusPage(1);
  }, [statusFilter]);

  const paginatedStatusRows = filteredStatusRows;

  return (
    <div className="rounded-[15px] bg-white min-w-0 overflow-hidden">
      <div className="flex border-b border-[rgba(34,34,34,0.10)] px-5 sm:px-8 gap-8">
        <button type="button" onClick={() => setMainTab("agencies")} className={`relative cursor-pointer p-[20px_30px] text-[13px] transition-colors ${mainTab === "agencies" ? "font-[SemiBold]" : "font-[Regular] text-[#222]"}`} style={mainTab === "agencies" ? { color: TAB_BLUE } : undefined}>
          Assigned Agencies
          {mainTab === "agencies" && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full" style={{ backgroundColor: TAB_BLUE }} />}
        </button>
        <button type="button" onClick={() => setMainTab("status")} className={`relative cursor-pointer p-[20px_30px] text-[13px] transition-colors ${mainTab === "status" ? "font-[SemiBold]" : "font-[Regular] text-[#222]"}`} style={mainTab === "status" ? { color: TAB_BLUE } : undefined}>
          Unit status
          {mainTab === "status" && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full" style={{ backgroundColor: TAB_BLUE }} />}
        </button>
      </div>

      <div className="md:p-[30px] p-[20px] bg-[#FFF]">
        {mainTab === "agencies" && (
          <>
            {agenciesData.length === 0 ? (
              <div className="rounded-[15px] bg-[#F0F0F0] py-8 px-4 text-center">
                <p className="text-[13px] text-[#707070] font-[Regular]">Assign agency</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {agenciesData.map((agency) => {
                  const open = expandedAgencyId === agency.id;
                  return (
                    <div key={agency.id} className="rounded-[15px] bg-[#F5F5F5] overflow-hidden">
                      <button type="button" onClick={() => toggleAgency(agency.id)} className="w-full overflow-x-auto scrollbar-hide bg-[#F5F5F5] grid grid-cols-[180px_auto_auto] items-center justify-between md:p-[20px_30px] p-[15px_20px] gap-3 sm:gap-4 text-left transition-colors">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[14px] font-[SemiBold] text-[#0832AE] truncate">{agency.name}</span>
                          <span className={`inline-flex shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
                            <DownArrowIcon width={10} height={6} stroke="#0832AE" fill="#0832AE" className="text-[#0832AE]" />
                          </span>
                        </div>
                        <div className={`text-[14px] font-[Bold] shrink-0 ${agency.active ? "text-[#00A663]" : "text-[#707070]"}`}>{agency.active ? "Active" : "Inactive"}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-[Bold] text-[#222] shrink-0">{agency.unitCount} units</span>
                          <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/developer/units-edit-assign?projectId=${encodeURIComponent(projectId)}&layoutId=${encodeURIComponent(layoutId)}&allocationId=${encodeURIComponent(agency.allocationId)}`
                                )
                              }
                              className="cursor-pointer p-2 rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]"
                              aria-label="Edit"
                            >
                              <EditIcon width={20} height={20} />
                            </button>
                            <button type="button" onClick={(e) => e.stopPropagation()} className="p-2 rounded-[8px] hover:bg-[#F1F5F9] text-[#E53E3E]" aria-label="Delete">
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
                              <span key={label} className="flex items-center justify-center rounded-[5px] bg-[#222] text-white text-[12px] font-[SemiBold] p-[6px_10px]">
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
          <div className="flex flex-col gap-[30px]">
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {unitStatusFilters.map((f) => (
                  <button key={f} type="button" onClick={() => setStatusFilter(f)} className={`shrink-0 rounded-full px-[14px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${statusFilter === f ? "bg-[#222] text-white" : "bg-white text-[#222] border border-[rgba(34,34,34,0.10)]"}`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[40px] w-full xl:w-[280px] shrink-0">
                <SearchIcon className="text-[#707070] shrink-0" />
                <input type="search" value={statusSearch} onChange={(e) => setStatusSearch(e.target.value)} placeholder="Search here" className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none" />
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-hide">
              <div className="min-w-[920px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                <div className="grid grid-cols-[minmax(100px,1fr)_minmax(220px,1.9fr)_minmax(220px,1.6fr)_minmax(120px,1fr)] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                  <p className="text-[14px] font-[Bold] text-[#222]">Unit ID</p>
                  <p className="text-[14px] font-[Bold] text-[#222]">Assigned Agencies</p>
                  <p className="text-[14px] font-[Bold] text-[#222]">Handling Agent</p>
                  <p className="text-[14px] font-[Bold] text-[#222]">Unit status</p>
                </div>
                {paginatedStatusRows.map((row, index) => (
                  <div key={row.id} className={`grid grid-cols-[minmax(100px,1fr)_minmax(220px,1.9fr)_minmax(220px,1.6fr)_minmax(120px,1fr)] gap-2 items-center px-[14px] py-[12px] ${index !== paginatedStatusRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}>
                    <p className="text-[12px] font-[Bold] text-[#222]">{row.unitId}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.agencies.slice(0, 2).map((a) => (
                        <span key={a.id} className="inline-flex rounded-[5px] border border-[rgba(34,34,34,0.10)] text-[#222] text-[12px] font-[SemiBold] px-2 py-1">
                          {a.name}
                        </span>
                      ))}
                      {row.agencies.length > 2 && <span className="inline-flex text-[#222] text-[12px] font-[Regular] px-2 py-1">+{row.agencies.length - 2}</span>}
                    </div>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-[#F0F0F0] border border-[rgba(34,34,34,0.10)]">
                        <img src={row.handlingAgent?.profilePicture || userImg} alt="" className="h-full w-full object-cover" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-[Bold] text-[#222] truncate">{row.handlingAgent?.fullName || "Not assigned"}</p>
                        <p className="text-[12px] font-[Regular] text-[#707070] truncate">
                          {row.agencies.length ? row.agencies[0].name : "No agency"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <span className={`inline-flex rounded-[6px] px-2.5 py-1 text-[11px] font-[SemiBold] capitalize ${statusBadgeClass(row.status)}`}>{row.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
        {mainTab === "status" ? <Pagenation currentPage={statusPage} totalItems={statusTotalFromApi} itemsPerPage={itemsPerPage} onPageChange={setStatusPage} /> : null}
      </div>
    </div>
  );
};

export default AssignedUnit;
