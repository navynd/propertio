import { useEffect, useMemo, useState } from "react";
import { SearchIcon, TrashIcon, EyeDarkIcon, TickIcon } from "../../../../components/CustomFile/icons";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import { useLocation, useNavigate } from "react-router-dom";
import Loader from "../../../../components/Loader/loader";
import { agentService, type AgentAllocatedProjectUnitsLayout } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";

const AllocatedProjectUnits = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [projectName, setProjectName] = useState("--/--");
    const [categoryTab, setCategoryTab] = useState("All");
    const [categoryTabs, setCategoryTabs] = useState<Array<{ id: string; name: string; count: number }>>([]);
    const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [rows, setRows] = useState<AgentAllocatedProjectUnitsLayout[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [stats, setStats] = useState({ total: 0, sold: 0, remaining: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const projectId = useMemo(() => {
        const state = location.state as { projectId?: string } | null;
        return state?.projectId || "";
    }, [location.state]);

    const visibleCategoryTabs = useMemo(
        () => [{ id: "all", name: "All", count: 0 }, ...categoryTabs],
        [categoryTabs]
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [categoryTab, searchQuery]);

    useEffect(() => {
        setSelectedKeys(new Set());
    }, [categoryTab]);

    useEffect(() => {
        if (!projectId) {
            toast.error("Missing project", "Project ID not found.");
            navigate("/agent/allocated/project");
            return;
        }
        const fetchUnits = async () => {
            setIsLoading(true);
            try {
                const subTab = categoryTab === "All" ? "all" : categoryTab;
                const response = await agentService.getAllocatedProjectUnits({
                    projectId,
                    page: currentPage,
                    limit: itemsPerPage,
                    subTab,
                    search: searchQuery,
                });
                setProjectName(response.projectName || "--/--");
                setStats({
                    total: response.totalUnits || 0,
                    sold: response.soldUnits || 0,
                    remaining: response.remainingUnits || 0,
                });
                setRows(response.layouts || []);
                setCategoryTabs(response.propertyTypeFilters || []);
                setTotalItems(response.pagination?.totalLayouts || 0);
            } catch (error: unknown) {
                const message = (error as { message?: string })?.message || "Failed to fetch units.";
                toast.error("Load failed", message);
            } finally {
                setIsLoading(false);
            }
        };
        void fetchUnits();
    }, [categoryTab, currentPage, itemsPerPage, navigate, projectId, searchQuery]);

    const allVisibleSelected = rows.length > 0 && rows.every((r) => selectedKeys.has(String(r.layoutId || "")));

    const toggleRow = (rowKey: string) => {
        setSelectedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(rowKey)) next.delete(rowKey);
            else next.add(rowKey);
            return next;
        });
    };

    const toggleSelectAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedKeys((prev) => {
                const next = new Set(prev);
                rows.forEach((r) => next.delete(String(r.layoutId || "")));
                return next;
            });
        } else {
            setSelectedKeys((prev) => {
                const next = new Set(prev);
                rows.forEach((r) => next.add(String(r.layoutId || "")));
                return next;
            });
        }
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            {/*Project Name and Unit Stats*/}
            <div className="rounded-[15px] bg-white md:p-[23px_30px] p-[20px] min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[20px] leading-[140%] shrink-0">
                    <span className="text-[#707070] font-[Regular]">Project Name : </span>
                    <span className="text-[#222] font-[Bold]">{projectName}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className="h-[21px] px-[10px] inline-flex items-center rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white text-[12px]">
                        <span className="font-[Bold]">{stats.total}</span>
                        <span className="font-[Regular]">&nbsp;Total units</span>
                    </span>
                    <span className="h-[21px] px-[10px] inline-flex items-center rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white text-[12px]">
                        <span className="font-[Bold]">{stats.sold}</span>
                        <span className="font-[Regular]">&nbsp;Sold</span>
                    </span>
                    <span className="h-[21px] px-[10px] inline-flex items-center rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white text-[12px]">
                        <span className="font-[Bold]">{stats.remaining}</span>
                        <span className="font-[Regular]">&nbsp;Remaining</span>
                    </span>
                </div>
            </div>

            {/*Table section*/}
            <div className="rounded-[15px] bg-white min-w-0 border border-[rgba(34,34,34,0.06)] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                {/*Filters and Search*/}
                <div className="md:p-[30px_30px_20px_30px] p-[20px] flex flex-col gap-[16px] xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-[10px] w-full xl:w-auto min-w-0 flex-1">
                        {/* Search */}
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
                    {/*Delete and Assign agency buttons*/}
                    <div className="flex flex-wrap items-center gap-[10px] opacity-50 shrink-0">
                        <button
                            type="button"
                            className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full  bg-[#F5F5F5] px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222]"
                        >
                            <TrashIcon width={20} height={20} />
                            Delete
                        </button>
                    </div>
                </div>

                {/*Category Tabs*/}
                <div className="md:px-[30px] px-[20px] border-b border-[rgba(34,34,34,0.10)] flex  overflow-x-auto scrollbar-hide">
                    {visibleCategoryTabs.map((tab) => {
                        const active = categoryTab === tab.name;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setCategoryTab(tab.name)}
                                className={`relative shrink-0 p-[20px_30px] text-[13px] transition-colors whitespace-nowrap cursor-pointer ${active ? "text-[#0832AE] font-[SemiBold]" : "text-[#222] font-[Regular]"
                                    }`}
                            >
                                {tab.name}
                                {/*  <span className="text-[11px]">({tab.name === "All" ? totalItems : tab.count})</span> */}
                                {active && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#0832AE]" />}
                            </button>
                        );
                    })}
                </div>
                {/*Table*/}
                <div className="md:p-[30px] p-[20px]">
                    <div className="overflow-x-auto w-full scrollbar-hide">
                        <div className="min-w-[1180px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                            <div className="grid grid-cols-[40px_2fr_2fr_2fr_2fr_136px] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                                <div className="flex justify-center">
                                    <label className="relative">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleSelectAllVisible}
                                            className="peer hidden "
                                        />
                                        <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                                            {allVisibleSelected ? <TickIcon width={10} height={10} /> : null}
                                        </div>
                                    </label>
                                </div>
                                <p className="text-[14px] font-[Bold] text-[#222]">Tower name / Type</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Layout name</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Units assigned</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Units sold</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
                            </div>

                            {rows.map((layout, index) => {
                                const rowKey = String(layout.layoutId || "");
                                return (
                                    <div
                                        key={rowKey}
                                        className={`grid grid-cols-[40px_2fr_2fr_2fr_2fr_136px] gap-2 items-center px-[14px] py-[12px] ${index !== rows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""
                                            }`}
                                    >
                                        <div className="flex justify-center">
                                            <label className="relative">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedKeys.has(rowKey)}
                                                    onChange={() => toggleRow(rowKey)}
                                                    className="peer hidden"
                                                />
                                                <div
                                                    className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                                                    <TickIcon width={10} height={10} />
                                                </div>
                                            </label>
                                        </div>
                                        <p className="text-[12px] font-[Bold] text-[#222]">
                                            {layout.buildingName || "--/--"} / {layout.propertyType || "--/--"}
                                        </p>
                                        <p className="text-[12px] font-[Regular] text-[#222]">{layout.layoutName || "--/--"}</p>
                                        <p className="text-[12px] font-[Regular] text-[#222]">{layout.unitsAssigned ?? 0}</p>
                                        <p className="text-[12px] font-[Regular] text-[#222]">{layout.unitsSold ?? 0}</p>
                                        <div className="flex items-center gap-[6px]">
                                            <button
                                                onClick={() =>
                                                    navigate("/agent/allocated/project-unit-details", {
                                                        state: { projectId, layoutId: layout.layoutId },
                                                    })
                                                }
                                                type="button"
                                                className="cursor-pointer p-[6px] text-[#707070]"
                                                aria-label="View"
                                            >
                                                <EyeDarkIcon width={20} height={20} />
                                            </button>
                                            <button type="button" className="p-[6px] text-[#E53E3E]" aria-label="Delete">
                                                <TrashIcon width={20} height={20} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
                    <Pagenation
                        currentPage={currentPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
        </div>
    );
};

export default AllocatedProjectUnits;
