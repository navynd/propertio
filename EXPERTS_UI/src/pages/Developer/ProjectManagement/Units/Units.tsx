import { useEffect, useMemo, useState } from "react";
import { SearchIcon, TrashIcon, EyeDarkIcon, MultiUserIcon, EditIcon } from "../../../../components/CustomFile/icons";
import DeveloperHeader from "../../../../components/Header/DeveloperHeader";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Loader from "../../../../components/Loader/loader";
import { toast } from "../../../../services/toast";
import { developerService, type DeveloperProjectUnitsLayoutItem } from "../../../../services/developerService";

type AssignmentFilter = "unassigned" | "assigned";

type UnitRow = {
  rowKey: string;
  layoutId: string;
  towerType: string;
  layoutName: string;
  numberOfBeds: string;
  totalAvailableUnits: string;
};

const ITEMS_PER_PAGE = 10;

const Units = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const projectId = searchParams.get("projectId") || "";
  const projectNameFromState = ((location.state as { projectName?: string } | null)?.projectName || "").trim();

  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("unassigned");
  const [categoryTab, setCategoryTab] = useState("All");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [isLoading, setIsLoading] = useState(false);
  const [projectName, setProjectName] = useState(projectNameFromState || "-");
  const [summary, setSummary] = useState({ totalUnits: 0, sold: 0, remaining: 0 });
  const [propertyTypeFilters, setPropertyTypeFilters] = useState<Array<{ id: string; name: string; count: number }>>([]);
  const [layouts, setLayouts] = useState<DeveloperProjectUnitsLayoutItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: ITEMS_PER_PAGE, totalPages: 1 });

  useEffect(() => {
    if (!projectId) {
      toast.error("Project not found", "Missing projectId in URL.");
      navigate("/developer/project-management?tab=unpublished");
      return;
    }

    let mounted = true;
    if (projectNameFromState) {
      setProjectName(projectNameFromState);
    } else {
      developerService
        .getProjectDetails(projectId)
        .then((res) => {
          if (!mounted) return;
          setProjectName(String(res?.project?.projectName || "-"));
        })
        .catch(() => undefined);
    }

    return () => {
      mounted = false;
    };
  }, [navigate, projectId, projectNameFromState]);

  const selectedPropertyTypeId = useMemo(
    () => (categoryTab !== "All" ? propertyTypeFilters.find((f) => f.name === categoryTab)?.id : undefined),
    [categoryTab, propertyTypeFilters]
  );

  useEffect(() => {
    if (!projectId) return;

    let mounted = true;
    setIsLoading(true);

    developerService
      .getProjectUnits({
        projectId,
        assigned: assignmentFilter === "assigned",
        propertyType: selectedPropertyTypeId,
        search: searchQuery,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      })
      .then((res) => {
        if (!mounted) return;
        setSummary({
          totalUnits: Number(res?.summary?.totalUnits || 0),
          sold: Number(res?.summary?.sold || 0),
          remaining: Number(res?.summary?.remaining || 0),
        });
        setPropertyTypeFilters(Array.isArray(res?.propertyTypeFilters) ? res.propertyTypeFilters : []);
        setLayouts(Array.isArray(res?.layouts) ? res.layouts : []);
        setPagination({
          total: Number(res?.pagination?.total || 0),
          page: Number(res?.pagination?.page || currentPage),
          limit: Number(res?.pagination?.limit || ITEMS_PER_PAGE),
          totalPages: Number(res?.pagination?.totalPages || 1),
        });
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setLayouts([]);
        setPagination({ total: 0, page: 1, limit: ITEMS_PER_PAGE, totalPages: 1 });
        toast.error("Units load failed", (error as { message?: string })?.message || "Failed to fetch project units.");
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [assignmentFilter, currentPage, projectId, searchQuery, selectedPropertyTypeId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [assignmentFilter, categoryTab, searchQuery]);

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [assignmentFilter, categoryTab, layouts]);

  const visibleCategoryTabs = useMemo(() => ["All", ...propertyTypeFilters.map((p) => p.name)], [propertyTypeFilters]);

  useEffect(() => {
    if (!visibleCategoryTabs.includes(categoryTab)) {
      setCategoryTab("All");
    }
  }, [categoryTab, visibleCategoryTabs]);

  const rows: UnitRow[] = useMemo(
    () =>
      layouts.map((layout) => ({
        rowKey: String(layout.layoutId),
        layoutId: String(layout.layoutId),
        towerType: `${layout.building?.name || "-"} / ${layout.propertyType?.name || "-"}`,
        layoutName: String(layout.layoutName || "-"),
        numberOfBeds: String(layout.bedrooms ?? "-"),
        totalAvailableUnits: String(layout.availableUnits ?? layout.unassignedUnits ?? 0),
      })),
    [layouts]
  );

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedKeys.has(r.rowKey));

  const toggleRow = (rowKey: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) rows.forEach((r) => next.delete(r.rowKey));
      else rows.forEach((r) => next.add(r.rowKey));
      return next;
    });
  };

  const goToAssignAgency = (layoutId?: string) => {
    if (!projectId) return;
    const query = new URLSearchParams({ projectId });
    if (layoutId) query.set("layoutId", layoutId);
    navigate(`/developer/units-assign?${query.toString()}`);
  };

  const handleHeaderAssignAgency = () => {
    const selectedLayoutIds = rows.filter((row) => selectedKeys.has(row.rowKey)).map((row) => row.layoutId);
    if (selectedLayoutIds.length > 0) {
      // Layout-wise assignment mode when table selection exists.
      if (selectedLayoutIds.length > 1) {
        toast.error("Select only one layout", "Please select a single row for layout-wise assignment.");
        return;
      }
      goToAssignAgency(selectedLayoutIds[0]);
      return;
    }
    // No row selected -> bulk assignment mode.
    goToAssignAgency();
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <DeveloperHeader title="Units" showBack={true} onBackClick={() => navigate(-1)} />

      {isLoading && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
          <Loader size={90} margin={0} />
        </div>
      )}

      <div className="rounded-[15px] bg-white md:p-[20px_30px] p-[20px] min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[20px] leading-[140%] shrink-0">
          <span className="text-[#707070] font-[Regular]">Project Name : </span>
          <span className="text-[#222] font-[Bold]">{projectName}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="h-[21px] px-[10px] inline-flex items-center rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white text-[12px]"><span className="font-[Bold]">{summary.totalUnits}</span><span className="font-[Regular]">&nbsp;Total units</span></span>
          <span className="h-[21px] px-[10px] inline-flex items-center rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white text-[12px]"><span className="font-[Bold]">{summary.sold}</span><span className="font-[Regular]">&nbsp;Sold</span></span>
          <span className="h-[21px] px-[10px] inline-flex items-center rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white text-[12px]"><span className="font-[Bold]">{summary.remaining}</span><span className="font-[Regular]">&nbsp;Remaining</span></span>
        </div>
      </div>

      <div className="rounded-[15px] bg-white min-w-0 border border-[rgba(34,34,34,0.06)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        <div className="md:p-[30px] p-[20px] flex flex-col gap-[16px] xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center gap-[10px] w-full xl:w-auto min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-[8px] shrink-0">
              <button type="button" onClick={() => setAssignmentFilter("unassigned")} className={`shrink-0 rounded-full px-[15px] h-[33px] text-[12px] font-[SemiBold] transition-colors cursor-pointer ${assignmentFilter === "unassigned" ? "bg-[#222] text-white" : "bg-white text-[#222] border border-[rgba(34,34,34,0.10)]"}`}>Unassigned</button>
              <button type="button" onClick={() => setAssignmentFilter("assigned")} className={`shrink-0 rounded-full px-[15px] h-[33px] text-[12px] font-[SemiBold] transition-colors cursor-pointer ${assignmentFilter === "assigned" ? "bg-[#222] text-white" : "bg-white text-[#222] border border-[rgba(34,34,34,0.10)]"}`}>Assigned</button>
            </div>
            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[40px] w-full sm:flex-1 sm:min-w-[200px] xl:max-w-[360px]">
              <SearchIcon className="text-[#707070] shrink-0" />
              <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search here" className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-[10px] shrink-0">
            <button type="button" className="opacity-50 cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#94A3B8]"><TrashIcon width={16} height={16} />Delete</button>
            <button type="button" onClick={handleHeaderAssignAgency} className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#EA3934] px-[14px] h-[33px] text-[12px] font-[SemiBold] text-white"><MultiUserIcon width={18} height={18} stroke="#FFFFFF" />Assign agency</button>
          </div>
        </div>

        <div className="md:px-[30px] px-[20px] border-b border-[rgba(34,34,34,0.10)] flex gap-[20px] sm:gap-[28px] overflow-x-auto scrollbar-hide">
          {visibleCategoryTabs.map((tab) => {
            const active = categoryTab === tab;
            return (
              <button key={tab} type="button" onClick={() => setCategoryTab(tab)} className={`relative shrink-0 p-[20px_30px] text-[13px] transition-colors whitespace-nowrap ${active ? "text-[#0832AE] font-[SemiBold]" : "text-[#222] font-[Regular]"}`}>
                {tab}
                {active && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#0832AE]" />}
              </button>
            );
          })}
        </div>

        <div className="md:p-[30px] p-[20px]">
          <div className="overflow-x-auto w-full scrollbar-hide">
            <div className="min-w-[1280px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
              <div className="grid grid-cols-[40px_minmax(128px,1.75fr)_minmax(104px,1.35fr)_minmax(80px,1.65fr)_minmax(112px,1.22fr)_136px] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                <div className="flex justify-center"><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer" /></div>
                <p className="text-[14px] font-[Bold] text-[#222]">Tower name / Type</p>
                <p className="text-[14px] font-[Bold] text-[#222]">Layout name</p>
                <p className="text-[14px] font-[Bold] text-[#222]">Number of beds</p>
                <p className="text-[14px] font-[Bold] text-[#222]">Total available units</p>
                <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
              </div>

              {rows.map((row, index) => (
                <div key={row.rowKey} className={`grid grid-cols-[40px_minmax(128px,1.75fr)_minmax(104px,1.35fr)_minmax(80px,1.65fr)_minmax(112px,1.22fr)_136px] gap-2 items-center px-[14px] py-[12px] ${index !== rows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}>
                  <div className="flex justify-center"><input type="checkbox" checked={selectedKeys.has(row.rowKey)} onChange={() => toggleRow(row.rowKey)} className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer" /></div>
                  <p className="text-[12px] font-[Bold] text-[#222]">{row.towerType}</p>
                  <p className="text-[12px] font-[Regular] text-[#222]">{row.layoutName}</p>
                  <p className="text-[12px] font-[Regular] text-[#222]">{row.numberOfBeds}</p>
                  <p className="text-[12px] font-[Regular] text-[#222]">{row.totalAvailableUnits}</p>
                  <div className="flex items-center justify-end gap-[6px]">
                    <button onClick={() => navigate(`/developer/units-details?projectId=${encodeURIComponent(projectId)}&layoutId=${encodeURIComponent(row.layoutId)}&assigned=${assignmentFilter === "assigned" ? "true" : "false"}`)} type="button" className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]" aria-label="View"><EyeDarkIcon width={20} height={20} /></button>
                    <button type="button" onClick={() => goToAssignAgency(row.layoutId)} className="p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]" aria-label="Assign"><MultiUserIcon width={20} height={20} /></button>
                    <button type="button" className="p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]" aria-label="Edit"><EditIcon width={20} height={20} /></button>
                    <button type="button" className="p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#E53E3E]" aria-label="Delete"><TrashIcon width={20} height={20} /></button>
                  </div>
                </div>
              ))}

              {rows.length === 0 && !isLoading && <div className="px-[14px] py-[20px] text-[13px] text-[#707070]">No units found.</div>}
            </div>
          </div>
        </div>

        <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
          <Pagenation currentPage={pagination.page} totalItems={pagination.total} itemsPerPage={pagination.limit} onPageChange={setCurrentPage} />
        </div>
      </div>
    </div>
  );
};

export default Units;
