import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  SearchIcon,
  TrashIcon,
  EyeDarkIcon,
  MultiUserIcon,
  EditIcon,
  PlusUserIcon,
} from "../../../../../components/CustomFile/icons";
import AgencyHeader from "../../../../../components/Header/AgencyHeader";
import Pagenation from "../../../../../components/Pagenation/Pagenation";
import {
  agencyService,
  type ProjectUnitsResponse,
} from "../../../../../services/agencyService";
import { toast } from "../../../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../../../services/apiClient";
import Loader from "../../../../../components/Loader/loader";
import mainbg from "../../../../../assets/img/mainbg.png";
import { readAssignAgentNav, writeAssignAgentNav } from "../../assignAgentNav";


type AssignmentFilter = "unassigned" | "assigned";

type CategoryTab = string;



const ProjectAllocationUnit = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("unassigned");
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("All");
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(
    new Set(),
  );
  const [selectedAssigned, setSelectedAssigned] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { projectId } = useParams();

  const [unitsData, setUnitsData] = useState<ProjectUnitsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [agentImageBaseUrl, setAgentImageBaseUrl] = useState("");
  const navCtx = useMemo(() => readAssignAgentNav(location.state), [location.state]);
  const projectName =
    (location.state as { projectName?: string } | null)?.projectName?.trim() ||
    navCtx?.projectName?.trim() ||
    "Project";
  const visibleCategoryTabs = useMemo(() => {
    if (!unitsData?.propertyTypeFilters?.length) {
        return ["All"];
    }

    return [
        "All",
        ...unitsData.propertyTypeFilters.map((item) => item.name),
    ];
}, [unitsData]);
  /** Debounced term sent to API as `search` (server-side filtering). */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const layoutRows = unitsData?.layouts ?? [];

  const isProjectUnitsResponse = (data: unknown): data is ProjectUnitsResponse => {
    if (!data || typeof data !== "object") return false;
    const d = data as ProjectUnitsResponse;
    return Array.isArray(d.layouts) && typeof d.pagination?.totalLayouts === "number";
  };

  const formatTowerType = (buildingName?: string | null, propertyType?: string | null) => {
    const safeBuilding = buildingName?.trim() ? buildingName : "--";
    const safeType = propertyType?.trim() ? propertyType : "--";
    return `${safeBuilding} / ${safeType}`;
  };

  useEffect(() => {
    if (assignmentFilter === "unassigned") {
      setCategoryTab("All");
      return;
    }
    setCategoryTab((prev) =>
      prev === "Duplex" || prev === "Villa" ? "All" : prev,
    );
  }, [assignmentFilter]);

  useEffect(() => {
    if (!projectId) return;
    if (!projectName || projectName === "Project") return;
    writeAssignAgentNav({
      projectId,
      projectName,
      from: "project-units",
    });
  }, [projectId, projectName]);

  useEffect(() => {
    let isMounted = true;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/project/`;

    agencyService
      .getMasterData(["supportedurls"])
      .then((res) => {
        if (!isMounted) return;
        const agentImg =
          res?.supportedUrls?.agentUrl?.img?.trim() || fallback;
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

  const toAgentProfileUrl = (image: string | null | undefined) => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;
    const base = (agentImageBaseUrl || fallbackBase).replace(/\/+$/, "");
    const cleanImage = image.replace(/^\/+/, "");
    return `${base}/${cleanImage}`;
  };



  const totalPages = unitsData?.pagination?.totalPages || 1;
 

  useEffect(() => {
    if (!projectId) {
      toast.error("Missing project", "A valid project id is required to load units.");
      return;
    }
    const fetchUnits = async () => {
      try {
        setLoading(true);
        const res = await agencyService.getProjectUnits({
          projectId,
          tab: assignmentFilter,
          subTab: categoryTab.toLowerCase(),
          unitStatusTab:
            assignmentFilter === "assigned" ? "assigned-agents" : "all",
          statusFilter: "all",
          search: debouncedSearch || undefined,
          page: currentPage,
          limit: itemsPerPage,
        });
        if (!isProjectUnitsResponse(res)) {
          throw new Error("Unexpected units response.");
        }
        setUnitsData(res);
      } catch (error) {
        toast.error(
          "Could not load project units",
          getApiErrorMessage(error, "Could not load project units."),
        );
        setUnitsData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [
    projectId,
    assignmentFilter,
    categoryTab,
    currentPage,
    debouncedSearch,
  ]);
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryTab, searchQuery, assignmentFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedUnassigned(new Set());
    setSelectedAssigned(new Set());
  }, [assignmentFilter, categoryTab, debouncedSearch]);

 const paginatedIds = layoutRows.map(
  (item) => item.layoutId,
);
  const selectedSet =
    assignmentFilter === "unassigned" ? selectedUnassigned : selectedAssigned;
  const setSelectedSet =
    assignmentFilter === "unassigned"
      ? setSelectedUnassigned
      : setSelectedAssigned;

  const allVisibleSelected =
    paginatedIds.length > 0 &&
    paginatedIds.every((key) => selectedSet.has(key));

  const toggleRow = (rowKey: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedSet((prev) => {
        const next = new Set(prev);
        paginatedIds.forEach((key) => next.delete(key));
        return next;
      });
    } else {
      setSelectedSet((prev) => {
        const next = new Set(prev);
        paginatedIds.forEach((key) => next.add(key));
        return next;
      });
    }
  };

  const onClickAssignAgent = () => {
    const selectedIds = Array.from(
      assignmentFilter === "unassigned" ? selectedUnassigned : selectedAssigned,
    );

    if (selectedIds.length > 1) {
      toast.error(
        "One layout only",
        "Select only one layout when assigning agents by layout.",
      );
      return;
    }

    navigate("/agency/allocation/project-assign-agent", {
      state: {
        from: "project-units",
        projectId: projectId!,
        projectName,
        ...(selectedIds.length === 1 ? { layoutId: selectedIds[0] } : {}),
      },
    });
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader
        title="Units"
        showBack={true}
        onBackClick={() => navigate(-1)}
      />

      <div className="rounded-[15px] bg-white md:p-[25px_30px] p-[20px] min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[20px] leading-[140%] shrink-0">
          <span className="text-[#707070] font-[Regular]">Project Name : </span>
          <span className="text-[#222] font-[Bold]">{projectName}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="h-[21px] px-[10px] inline-flex items-center rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white text-[12px]">
            <span className="font-[Bold]"> {unitsData?.totalUnits || 0}</span>
            <span className="font-[Regular]">&nbsp;Total units</span>
          </span>
          <span className="h-[21px] px-[10px] inline-flex items-center rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white text-[12px]">
            <span className="font-[Bold]"> {unitsData?.soldUnits || 0}</span>
            <span className="font-[Regular]">&nbsp;Sold</span>
          </span>
          <span className="h-[21px] px-[10px] inline-flex items-center rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white text-[12px]">
            <span className="font-[Bold]">{unitsData?.remainingUnits || 0}</span>
            <span className="font-[Regular]">&nbsp;Remaining</span>
          </span>
        </div>
      </div>

      <div className="rounded-[15px] bg-white min-w-0 border border-[rgba(34,34,34,0.06)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="md:p-[30px] p-[20px] flex flex-col gap-[16px] xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-[10px] w-full xl:w-auto min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-[8px] shrink-0">
              <button
                type="button"
                onClick={() => setAssignmentFilter("unassigned")}
                className={`shrink-0 rounded-full px-[15px] h-[33px] text-[12px] font-[SemiBold] transition-colors cursor-pointer ${
                  assignmentFilter === "unassigned"
                    ? "bg-[#222] text-white"
                    : "bg-white text-[#222] border border-[rgba(34,34,34,0.10)]"
                }`}
              >
                Unassigned
              </button>
              <button
                type="button"
                onClick={() => setAssignmentFilter("assigned")}
                className={`shrink-0 rounded-full px-[15px] h-[33px] text-[12px] font-[SemiBold] transition-colors cursor-pointer ${
                  assignmentFilter === "assigned"
                    ? "bg-[#222] text-white"
                    : "bg-white text-[#222] border border-[rgba(34,34,34,0.10)]"
                }`}
              >
                Assigned
              </button>
            </div>
            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[40px] w-full sm:flex-1 sm:min-w-[200px] xl:max-w-[360px]">
              <SearchIcon className="text-[#707070] shrink-0" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search here"
                className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-[10px] shrink-0">
            <button
              type="button"
              className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#707070] bg-transparent hover:bg-[#F8FAFC]"
            >
              <TrashIcon width={16} height={16} fill="#707070" />
              Delete
            </button>
            <button
              type="button"
              onClick={onClickAssignAgent}
              className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#EA3934] px-[14px] h-[33px] text-[12px] font-[SemiBold] text-white"
            >
              <PlusUserIcon width={18} height={18} />
              Assign agent
            </button>
          </div>
        </div>

        <div className="md:px-[30px] px-[20px] border-b border-[rgba(34,34,34,0.10)] flex gap-[20px] sm:gap-[28px] overflow-x-auto scrollbar-hide">
          {visibleCategoryTabs.map((tab) => {
            const active = categoryTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setCategoryTab(tab)}
                className={`relative shrink-0 p-[20px_30px] text-[13px] transition-colors whitespace-nowrap ${
                  active
                    ? "text-[#0832AE] font-[SemiBold]"
                    : "text-[#222] font-[Regular]"
                }`}
              >
                {tab}
                {active && (
                  <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#0832AE]" />
                )}
              </button>
            );
          })}
        </div>

        <div className="md:p-[30px] p-[20px]">
          {loading ? (
            <div className="rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white min-h-[220px] flex items-center justify-center">
              <Loader size={70} margin={0} />
            </div>
          ) : (
          <div className="overflow-x-auto w-full scrollbar-hide">
            {assignmentFilter === "unassigned" ? (
              <div className="min-w-[1280px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                <div className="grid grid-cols-[40px_minmax(140px,1.4fr)_minmax(120px,1.4fr)_minmax(120px,1.4fr)_minmax(120px,1.4fr)_112px] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                    />
                  </div>
                  <p className="text-[14px] font-[Bold] text-[#222]">
                    Tower name / Type
                  </p>
                  <p className="text-[14px] font-[Bold] text-[#222]">
                    Layout name
                  </p>
                  <p className="text-[14px] font-[Bold] text-[#222]">
                    Number of beds
                  </p>
                  <p className="text-[14px] font-[Bold] text-[#222]">
                    Total available units
                  </p>
                  <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
                </div>
               {layoutRows.map((layout, index) => {
                  
                  return (
                    <div
                      key={layout.layoutId}
                      className={`grid grid-cols-[40px_minmax(140px,1.4fr)_minmax(120px,1.4fr)_minmax(120px,1.4fr)_minmax(120px,1.4fr)_112px] gap-2 items-center px-[14px] py-[12px] ${
                        index !== layoutRows.length - 1
                          ? "border-b border-[rgba(34,34,34,0.08)]"
                          : ""
                      }`}
                    >
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={selectedUnassigned.has(layout.layoutId)}
                          onChange={() => toggleRow(layout.layoutId)}
                          className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                        />
                      </div>
                      <p className="text-[12px] font-[Bold] text-[#222]">
                        {formatTowerType(layout.buildingName, layout.propertyType)}
                      </p>
                      <p className="text-[12px] font-[Regular] text-[#222]">
                        {layout.layoutName}
                      </p>
                      <p className="text-[12px] font-[Regular] text-[#222]">
                        {layout.beds}
                      </p>
                      <p className="text-[12px] font-[Regular] text-[#222]">
                        {layout.totalAvailableUnits}
                      </p>
                      <div className="flex items-center justify-end gap-[6px]">
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/agency/allocation/project-unit-details", {
                              state: {
                                projectId,
                                layoutId: layout.layoutId,
                                projectName,
                              },
                            })
                          }
                          className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]"
                          aria-label="View"
                        >
                          <EyeDarkIcon width={20} height={20} />
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]"
                          aria-label="Manage assignment"
                        >
                          <MultiUserIcon width={20} height={20} />
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#E53E3E]"
                          aria-label="Delete"
                        >
                          <TrashIcon width={20} height={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {layoutRows.length === 0 && (
                  <div className="px-[14px] py-[28px] text-center text-[14px] text-[#707070]">
                    No unassigned layouts found.
                  </div>
                )}
              </div>
            ) : (
              <div className="min-w-[1020px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                <div className="grid grid-cols-[40px_minmax(140px,1.25fr)_minmax(120px,1fr)_minmax(200px,1.35fr)_minmax(88px,0.65fr)_112px] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                  <div className="flex justify-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                    />
                  </div>
                  <p className="text-[14px] font-[Bold] text-[#222]">
                    Tower name / Type
                  </p>
                  <p className="text-[14px] font-[Bold] text-[#222]">
                    Layout name
                  </p>
                  <p className="text-[14px] font-[Bold] text-[#222]">
                    Assigned agent
                  </p>
                  <p className="text-[14px] font-[Bold] text-[#222]">
                    Units assigned
                  </p>
                  <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
                </div>
                {layoutRows.map((layout, index) => {
                  const agents = layout.assignedAgents?.length
                    ? layout.assignedAgents
                    : layout.agentName || layout.agentAvatar
                      ? [
                          {
                            agentId: "",
                            fullName: layout.agentName ?? "—",
                            profilePicture: layout.agentAvatar,
                            agentType: undefined,
                            unitsAssigned: layout.unitsAssigned ?? 0,
                            specialization: layout.agentTitle
                              ? { title: layout.agentTitle }
                              : null,
                          },
                        ]
                      : [];
                  const primary = agents[0];
                  const moreCount = Math.max(0, agents.length - 1);

                  return (
                    <div
                      key={layout.layoutId}
                      className={`grid grid-cols-[40px_minmax(140px,1.25fr)_minmax(120px,1fr)_minmax(200px,1.35fr)_minmax(88px,0.65fr)_112px] gap-2 items-center px-[14px] py-[12px] ${
                        index !== layoutRows.length - 1
                          ? "border-b border-[rgba(34,34,34,0.08)]"
                          : ""
                      }`}
                    >
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={selectedAssigned.has(layout.layoutId)}
                          onChange={() => toggleRow(layout.layoutId)}
                          className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                        />
                      </div>
                      <p className="text-[12px] font-[Bold] text-[#222]">
                        {formatTowerType(layout.buildingName, layout.propertyType)}
                      </p>
                      <p className="text-[12px] font-[Regular] text-[#222]">
                        {layout.layoutName}
                      </p>
                      <div className="flex items-center gap-[10px] min-w-0">
                        <img
                          src={
                            primary
                              ? toAgentProfileUrl(primary.profilePicture)
                              : mainbg
                          }
                          alt={primary?.fullName ?? ""}
                          className="h-[40px] w-[40px] rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[12px] font-[Bold] text-[#222] truncate">
                            {primary?.fullName ?? "—"}
                          </p>
                          <p className="text-[11px] font-[Regular] text-[#707070] truncate">
                            {primary?.specialization?.title ||
                              primary?.agentType ||
                              ""}
                          </p>
                          {moreCount > 0 ? (
                            <p className="text-[10px] font-[Regular] text-[#94A3B8] truncate">
                              +{moreCount} more{" "}
                              {moreCount === 1 ? "agent" : "agents"}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="text-[12px] font-[Regular] text-[#222]">
                        {layout.unitsAssigned ?? 0}
                      </p>
                      <div className="flex items-center  gap-[6px]">
                        <button
                          type="button"
                          onClick={() =>
                            navigate("/agency/allocation/project-unit-details", {
                              state: {
                                projectId,
                                layoutId: layout.layoutId,
                                projectName,
                              },
                            })
                          }
                          className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]"
                          aria-label="View"
                        >
                          <EyeDarkIcon width={20} height={20} />
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]"
                          aria-label="Edit"
                        >
                          <EditIcon width={20} height={20} />
                        </button>
                        <button
                          type="button"
                          className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#E53E3E]"
                          aria-label="Delete"
                        >
                          <TrashIcon width={20} height={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {layoutRows.length === 0 && (
                  <div className="px-[14px] py-[28px] text-center text-[14px] text-[#707070]">
                    No assigned layouts found.
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>

        <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
          <Pagenation
            currentPage={currentPage}
            totalItems={unitsData?.pagination?.totalLayouts || 0}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};

export default ProjectAllocationUnit;
