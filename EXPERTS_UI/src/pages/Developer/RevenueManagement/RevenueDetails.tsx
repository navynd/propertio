import { useEffect, useMemo, useState } from "react";
import { SearchIcon, TrashIcon } from "../../../components/CustomFile/icons";
import DeveloperHeader from "../../../components/Header/DeveloperHeader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { useNavigate, useSearchParams } from "react-router-dom";
import { developerService } from "../../../services/developerService";
import { toast } from "../../../services/toast";
import Loader from "../../../components/Loader/loader";
import { DeveloperTableEmptyState } from "../../../components/DeveloperTableEmptyState";
type LayoutRow = {
    id: string;
    towerType: string;
    layoutName: string;
    unitId: string;
    dealClosedBy: string;
    dealClosedDate: string;
    dealAmount: number;
    currency: string;
};

const RevenueDetails = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get("projectId") || "";
    const [activeTower, setActiveTower] = useState("All");
    const [activeUnitTypeTab, setActiveUnitTypeTab] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [summary, setSummary] = useState({
        projectName: "-",
        totalUnits: 0,
        soldUnits: 0,
        remainingUnits: 0,
        totalRevenue: 0,
        currency: "AED",
    });
    const [buildingTabs, setBuildingTabs] = useState<Array<{ id: string; name: string }>>([]);
    const [propertyTypeTabs, setPropertyTypeTabs] = useState<Array<{ id: string; name: string }>>([]);
    const [rows, setRows] = useState<LayoutRow[]>([]);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalDeals: 0,
    });
    const itemsPerPage = 10;

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearchText(searchText.trim());
            setCurrentPage(1);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [searchText]);

    useEffect(() => {
        if (!projectId) {
            toast.error("Project not found", "Missing projectId in URL.");
            navigate("/developer/revenue-management");
            return;
        }
        let mounted = true;
        setIsLoading(true);
        developerService
            .getRevenue({
                projectId,
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearchText || undefined,
                buildingId: activeTower === "All" ? undefined : activeTower,
                propertyType: activeUnitTypeTab === "All" ? undefined : activeUnitTypeTab,
            })
            .then((res) => {
                if (!mounted) return;
                setSummary({
                    projectName: String(res.projectName || "-"),
                    totalUnits: Number(res.totalUnits || 0),
                    soldUnits: Number(res.soldUnits || 0),
                    remainingUnits: Number(res.remainingUnits || 0),
                    totalRevenue: Number(res.totalRevenue || 0),
                    currency: String(res.currency || "AED"),
                });
                setBuildingTabs([{ id: "All", name: "All" }, ...(res.buildingTabs || []).map((b) => ({ id: String(b.id), name: String(b.name) }))]);
                setPropertyTypeTabs([{ id: "All", name: "All" }, ...(res.propertyTypeTabs || []).map((p) => ({ id: String(p.id), name: String(p.name) }))]);
                setRows(
                    (res.deals || []).map((deal) => ({
                        id: String(deal.dealId),
                        towerType: `${String(deal.buildingName || "-")} / ${String(deal.propertyType || "-")}`,
                        layoutName: String(deal.layoutName || "-"),
                        unitId: deal.unitNumber ? `Unit-${deal.unitNumber}` : "-",
                        dealClosedBy: String(deal.agency?.agencyName || deal.agency?.name || "-"),
                        dealClosedDate: deal.closedDate
                            ? new Date(deal.closedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                            : "-",
                        dealAmount: Number(deal.dealAmount || 0),
                        currency: String(deal.currency || res.currency || "AED"),
                    }))
                );
                setPagination({
                    page: Number(res.pagination?.page || currentPage),
                    limit: Number(res.pagination?.limit || itemsPerPage),
                    totalDeals: Number(res.pagination?.totalDeals || 0),
                });
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                toast.error("Failed to load revenue detail", (error as { message?: string })?.message || "Could not fetch revenue detail.");
            })
            .finally(() => {
                if (!mounted) return;
                setIsLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [projectId, currentPage, debouncedSearchText, activeTower, activeUnitTypeTab, navigate]);

    const formatAmount = (value: number, currency?: string) => `${value.toLocaleString("en-US")} ${currency || "AED"}`;

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            {/* Header */}
            <DeveloperHeader title="Revenue detail" showBack={true} onBackClick={() => navigate(-1)} />
            {/* Project summary card */}
            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-[14px]">
                    <div>
                        <h3 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] leading-[1.2] mb-[8px]">
                            <span className="text-[#707070]">Project Name :</span> {summary.projectName}
                        </h3>
                        <div className="flex flex-wrap items-center md:gap-[16px] gap-[8px]">
                            <span className="h-[30px] border border-[rgba(34,34,34,0.10)] flex-shrink-0 rounded-[8px] px-[14px] flex items-center justify-center text-[12px] font-[SemiBold] text-[#222]">{summary.totalUnits} <span className="text-[#707070] ml-[4px]">Total units</span></span>
                            <span className="h-[30px] border border-[rgba(34,34,34,0.10)] flex-shrink-0 rounded-[8px] px-[14px] flex items-center justify-center text-[12px] font-[SemiBold] text-[#222]">{summary.soldUnits} <span className="text-[#707070] ml-[4px]">Sold</span></span>
                            <span className="h-[30px] border border-[rgba(34,34,34,0.10)] flex-shrink-0 rounded-[8px] px-[14px] flex items-center justify-center text-[12px] font-[SemiBold] text-[#222]">{summary.remainingUnits} <span className="text-[#707070] ml-[4px]">Remaining</span></span>
                        </div>
                    </div>
                    <div className="md:text-right">
                        <p className="text-[12px] font-[Regular] text-[#707070] mb-[8px]">Total revenue for this project</p>
                        <p className="text-[16px] font-[SemiBold] text-[#222] leading-[1.1]">{formatAmount(summary.totalRevenue, summary.currency)}</p>
                    </div>
                </div>
            </div>
            <div className="rounded-[15px] bg-white  min-w-0">
                {/* Tower tabs + search */}
                <div className="md:p-[30px_30px] p-[20px_20px] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-[12px]">
                    <div className="flex flex-wrap gap-[8px]">
                        {buildingTabs.map((tower) => (
                            <button
                                key={tower.id || tower.name}
                                type="button"
                                onClick={() => {
                                    setActiveTower(tower.id);
                                    setActiveUnitTypeTab("All");
                                    setCurrentPage(1);
                                }}
                                className={`h-[33px] flex-shrink-0 flex items-center justify-center rounded-full px-[14px] text-[12px] font-[SemiBold] transition-colors ${activeTower === tower.id
                                    ? "bg-[#222] text-white"
                                    : "bg-white border border-[rgba(34,34,34,0.10)] text-[#222]"
                                    }`}
                            >
                                {tower.name}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[40px] w-full lg:max-w-[300px]">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                            type="search"
                            placeholder="Search here"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] placeholder:text-[12px] placeholder:font-[Regular] focus:outline-none"
                        />
                    </div>
                </div>

                {/* Unit type tabs */}
                <div className="p-[0px_30px] border-b border-[rgba(34,34,34,0.10)]">
                    <div className="flex items-center gap-[16px] overflow-x-auto scrollbar-hide">
                        {propertyTypeTabs.map((tab) => (
                            <button
                                key={tab.id || tab.name}
                                type="button"
                                onClick={() => {
                                    setActiveUnitTypeTab(tab.id);
                                    setCurrentPage(1);
                                }}
                                className={`relative p-[20px_30px] text-[13px] font-[Regular] whitespace-nowrap ${activeUnitTypeTab === tab.id ? "text-[#0832AE] font-[SemiBold]" : "text-[#222]"
                                    }`}
                            >
                                {tab.name}
                                {activeUnitTypeTab === tab.id && (
                                    <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[#0832AE] rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Deals table */}
                <div className="p-[30px]">
                    <div className="overflow-x-auto w-full scrollbar-hide relative">
                        {isLoading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-[10px]">
                                <Loader size={72} margin={0} />
                            </div>
                        )}
                        <div className="min-w-[1080px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                            <div className="grid grid-cols-[1.8fr_1.4fr_1fr_1.6fr_1.3fr_1.4fr_72px] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                                <p className="text-[14px] font-[Bold] text-[#222]">Tower name / Type</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Layout name</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Unit ID</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Deal closed by</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Deal closed date</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Deal amount</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
                            </div>

                            {!isLoading && rows.length === 0 ? (
                                <DeveloperTableEmptyState message="No deal records found for this project. Try another tower, unit type, or search." />
                            ) : (
                                rows.map((row, index) => (
                                    <div
                                        key={row.id}
                                        className={`grid grid-cols-[1.8fr_1.4fr_1fr_1.6fr_1.3fr_1.4fr_72px] gap-2 items-center px-[14px] py-[12px] ${index !== rows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""
                                            }`}
                                    >
                                        <p className="text-[12px] font-[Bold] text-[#222]">{row.towerType}</p>
                                        <p className="text-[12px] font-[Regular] text-[#222]">{row.layoutName}</p>
                                        <p className="text-[12px] font-[Regular] text-[#222]">{row.unitId}</p>
                                        <div className="flex items-center">
                                            <span className="inline-flex items-center rounded-[6px] border border-[rgba(34,34,34,0.10)] p-[6px_10px] text-[12px] font-[SemiBold] text-[#222] leading-none">
                                                {row.dealClosedBy}
                                            </span>
                                        </div>
                                        <p className="text-[12px] font-[Regular] text-[#222]">{row.dealClosedDate}</p>
                                        <p className="text-[12px] font-[Regular] text-[#222] whitespace-nowrap">{formatAmount(row.dealAmount, row.currency)}</p>
                                        {/* <div className="flex items-center justify-start">
                                            <button type="button" className="p-[6px] rounded-[8px] hover:bg-[#F1F5F9]" aria-label="Delete">
                                                <TrashIcon width={20} height={20} />
                                            </button>
                                        </div> */}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
                    <Pagenation
                        currentPage={pagination.page || currentPage}
                        totalItems={pagination.totalDeals}
                        itemsPerPage={pagination.limit || itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
        </div >
    );
};

export default RevenueDetails;
