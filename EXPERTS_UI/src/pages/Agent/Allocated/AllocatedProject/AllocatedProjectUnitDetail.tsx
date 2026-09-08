import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import floorPlanPlaceholder from "../../../../assets/img/home1.png";
import { SearchIcon, TrashIcon } from "../../../../components/CustomFile/icons";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import Loader from "../../../../components/Loader/loader";
import { agentService, type AgentAllocatedProjectUnitDetailResponse } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";

const unitLegend: { status: UnitTileStatus; label: string; swatchClass: string }[] = [
    { status: "agentSold", label: "Units Sold by you", swatchClass: "bg-[#0832AE]" },
    { status: "soldOther", label: "Units Sold by other", swatchClass: "bg-[#EA3934]" },
    { status: "agentWorking", label: "Agent working on", swatchClass: "bg-[#00A663]" },
    { status: "available", label: "Units available", swatchClass: "bg-[#F3F4F6] border border-[rgba(34,34,34,0.08)]" },
    { status: "unavailable", label: "Units unavailable", swatchClass: "bg-[#D1D5DB]" },
];

type UnitTileStatus = "agentSold" | "soldOther" | "agentWorking" | "available" | "unavailable";
function unitTileClass(status: UnitTileStatus) {
    if (status === "agentSold") return "bg-[#0832AE] text-white";
    if (status === "soldOther") return "bg-[#EA3934] text-white";
    if (status === "agentWorking") return "bg-[#00A663] text-white";
    if (status === "available") return "bg-[#F5F5F5] text-[#222] border border-[rgba(34,34,34,0.08)]";
    return "bg-[rgba(34,34,34,0.20)] text-[#222]";
}
type UnitStatusFilter = "All" | "Available" | "Reserved" | "In-Progress" | "Follow up" | "PreClose" | "Closed";
type UnitRowStatus = "Available" | "Reserved" | "In-Progress" | "Follow up" | "PreClose" | "Closed";

type UnitStatusRow = {
    id: string;
    unitNumber: string;
    assignedDate: string;
    handlingBy: string;
    status: UnitRowStatus;
};

const statusFilterTabs: UnitStatusFilter[] = [
    "All",
    "Available",
    "Reserved",
    "In-Progress",
    "Follow up",
    "PreClose",
    "Closed",
];

const formatDate = (value?: string) => {
    if (!value) return "--/--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--/--";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const toStatusFilterParam = (tab: UnitStatusFilter) => {
    if (tab === "All") return "all";
    if (tab === "Available") return "available";
    if (tab === "Reserved") return "reserved";
    if (tab === "In-Progress") return "in-progress";
    if (tab === "Follow up") return "follow-up";
    if (tab === "PreClose") return "pre-close";
    return "closed";
};

const toUnitRowStatus = (value?: string): UnitRowStatus => {
    if (!value) return "Available";
    const normalized = value.trim().toLowerCase();
    if (normalized === "reserved") return "Reserved";
    if (normalized === "in-progress") return "In-Progress";
    if (normalized === "follow-up" || normalized === "follow up") return "Follow up";
    if (normalized === "pre-close" || normalized === "preclose") return "PreClose";
    if (normalized === "closed") return "Closed";
    return "Available";
};

const toUnitTileStatus = (value?: string): UnitTileStatus => {
    const normalized = (value || "").trim().toLowerCase();
    if (
        normalized === "agent-sold" ||
        normalized === "agentsold" ||
        normalized === "sold-by-your-agent" ||
        normalized === "sold by your agent"
    ) {
        return "agentSold";
    }
    if (
        normalized === "sold-other" ||
        normalized === "soldother" ||
        normalized === "sold-by-other" ||
        normalized === "sold by other"
    ) {
        return "soldOther";
    }
    if (
        normalized === "agent-working" ||
        normalized === "agentworking" ||
        normalized === "agent-working-on" ||
        normalized === "agent working on"
    ) {
        return "agentWorking";
    }
    if (normalized === "unavailable") return "unavailable";
    return "available";
};

function unitStatusBadgeClass(status: UnitRowStatus) {
    switch (status) {
        case "Available":
            return "bg-[rgba(0,166,99,0.12)] text-[#00A663]";
        case "Reserved":
            return "bg-[rgba(199,163,53,0.15)] text-[#9A7B1A]";
        case "In-Progress":
            return "bg-[rgba(255,70,162,0.12)] text-[#C41E7A]";
        case "Follow up":
            return "bg-[rgba(8,50,174,0.10)] text-[#0832AE]";
        case "PreClose":
            return "bg-[rgba(234,57,52,0.12)] text-[#EA3934]";
        case "Closed":
            return "bg-[#EA3934] text-white";
        default:
            return "bg-[#F5F5F5] text-[#222]";
    }
}

const AllocatedProjectUnitDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [detail, setDetail] = useState<AgentAllocatedProjectUnitDetailResponse | null>(null);
    const [rows, setRows] = useState<UnitStatusRow[]>([]);
    const [unitTiles, setUnitTiles] = useState<Array<{ status: UnitTileStatus; label: string }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [floorPlanUrl, setFloorPlanUrl] = useState("");
    const [projectImageBaseUrl, setProjectImageBaseUrl] = useState("");
    const [totalItems, setTotalItems] = useState(0);
    const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>("All");
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const routeState = location.state as { projectId?: string; layoutId?: string } | null;
    const projectId = routeState?.projectId || "";
    const layoutId = routeState?.layoutId || "";

    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter]);

    useEffect(() => {
        if (!projectId || !layoutId) {
            toast.error("Missing unit", "Project or layout ID not found.");
            navigate("/agent/allocated/project");
            return;
        }
        const fetchUnitDetail = async () => {
            setIsLoading(true);
            try {
                const [supportedRes, response] = await Promise.all([
                    agentService.getSupportedUrlsMasterData(),
                    agentService.getAllocatedProjectUnitDetail({
                        projectId,
                        layoutId,
                        statusFilter: toStatusFilterParam(statusFilter),
                        search,
                        page: currentPage,
                        limit: itemsPerPage,
                    }),
                ]);
                const anySupported = supportedRes as unknown as {
                    supportedUrls?: { projectUrl?: { img?: string } };
                    supportedurls?: { projectUrl?: { img?: string } };
                    projectUrl?: { img?: string };
                };
                const imgBase =
                    anySupported?.supportedUrls?.projectUrl?.img ||
                    anySupported?.supportedurls?.projectUrl?.img ||
                    anySupported?.projectUrl?.img ||
                    "";
                setProjectImageBaseUrl(imgBase);
                setDetail(response);
                setTotalItems(response.pagination?.totalUnits || 0);

                const mappedRows: UnitStatusRow[] = (response.units || []).map((row, idx) => ({
                    id: String(row.id || idx),
                    unitNumber: row.unitNumber ||row.unitId || "--/--",
                    assignedDate: formatDate(row.assignedDate),
                    handlingBy: row.handlingBy || "--/--",
                    status: toUnitRowStatus(row.unitStatus),
                }));
                setRows(mappedRows);

                const mappedTiles = (response.unitGrid || []).map((tile, idx) => ({
                    status: toUnitTileStatus(tile.displayState || tile.status),
                    label: tile.unitNumber ? `Unit-${tile.unitNumber}` : `Unit-${String(idx + 1).padStart(3, "0")}`,
                }));
                setUnitTiles(mappedTiles);

                const floorPlanValue = response.floorPlan;
                let rawUrl = "";
                if (typeof floorPlanValue === "string") rawUrl = floorPlanValue;
                else if (floorPlanValue && typeof floorPlanValue === "object") rawUrl = floorPlanValue.url || "";
                if (rawUrl && !rawUrl.startsWith("http://") && !rawUrl.startsWith("https://") && imgBase) {
                    rawUrl = `${imgBase.replace(/\/?$/, "/")}${rawUrl}`;
                }
                setFloorPlanUrl(rawUrl);
            } catch (error: unknown) {
                const message = (error as { message?: string })?.message || "Failed to fetch unit details.";
                toast.error("Load failed", message);
            } finally {
                setIsLoading(false);
            }
        };
        void fetchUnitDetail();
    }, [currentPage, itemsPerPage, layoutId, navigate, projectId, search, statusFilter]);

    const propertyDetailCards = useMemo(() => {
        const price = detail?.price;
        const amount = typeof price === "number" ? price : price?.amount;
        const currency = typeof price === "number" ? "AED" : price?.currency || "AED";
        return [
            { label: "Layout name", value: detail?.layoutName || "--/--" },
            { label: "Number of beds", value: detail?.beds != null ? String(detail.beds) : "--/--" },
            { label: "Number of units available", value: detail?.unitsAvailable != null ? String(detail.unitsAvailable) : "--/--" },
            { label: "Number of units assigned", value: detail?.unitsAssigned != null ? String(detail.unitsAssigned) : "--/--" },
            { label: "Property type", value: detail?.propertyType || "--/--" },
            { label: "Number of baths", value: detail?.baths != null ? String(detail.baths) : "--/--" },
            {
                label: "Area of this property",
                value: detail?.areaSqft != null ? `${Number(detail.areaSqft).toLocaleString("en-US")} sqft` : "--/--",
            },
            {
                label: "Price",
                value: amount != null ? `${Number(amount).toLocaleString("en-US")} ${currency}` : "--/--",
            },
        ];
    }, [detail]);

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">

            {/* Unit / layout: name bar + detail grid + floor plan */}
            <div className="flex flex-col gap-[20px]">
                <div className="flex justify-between items-center rounded-[15px] bg-white md:p-[20px_30px_20px_30px] p-[16px]">
                    <p className="md:text-[20px] text-[16px] leading-[140%]">
                        <span className="text-[#707070] font-[Regular]">Name : </span>
                        <span className="text-[#222] font-[Bold]">{detail?.buildingName || "--/--"}</span>
                    </p>
                    <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <TrashIcon width={20} height={20} stroke="#222222" />
                        Delete
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
                    {propertyDetailCards.map((card) => (
                        <div key={card.label} className="rounded-[15px] bg-white md:p-[20px_30px_20px_30px] p-[16px]">
                            <p className="text-[12px] font-[Medium] text-[#222] mb-[6px]">{card.label}</p>
                            <p className="text-[16px] font-[Bold] text-[#222] leading-tight">{card.value}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
                    <h3 className="text-[16px] md:text-[20px] font-[Bold] text-[#222] mb-[16px]">Floor plan</h3>
                    <div className="max-w-[min(100%,540px)] w-full h-[360px]">
                        {floorPlanUrl ? (
                            <img
                                src={floorPlanUrl}
                                alt="Floor plan"
                                className="w-full h-full rounded-[12px] object-cover"
                            />
                        ) : (
                            <div className="w-full h-full rounded-[12px] bg-[#F5F5F5] flex items-center justify-center text-[13px] text-[#707070]">
                                Floor plan not available
                            </div>
                        )}
                    </div>
                </div>
                <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
                    <h3 className="text-[16px] md:text-[20px] font-[Bold] text-[#222] mb-[14px]">Units</h3>

                    <div className="flex flex-wrap gap-x-[20px] gap-y-[10px] mb-[20px]">
                        {unitLegend.map((item) => (
                            <span key={item.status} className="inline-flex items-center gap-[8px] text-[12px] font-[Regular] text-[#222]">
                                <span className={`h-[15px] w-[15px] shrink-0 rounded-[5px] ${item.swatchClass}`} />
                                {item.label}
                            </span>
                        ))}
                    </div>

                    <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
                        <div className="grid min-w-[600px] w-full grid-cols-7 gap-[8px] sm:min-w-0">
                            {unitTiles.map((tile) => (
                                <div
                                    key={tile.label}
                                    className={`rounded-[8px] min-h-[39px] px-[20px] flex items-center justify-center text-center text-[11px] sm:text-[12px] font-[SemiBold] leading-tight ${unitTileClass(tile.status)}`}
                                >
                                    {tile.label}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Units status — design match */}
            <div className="rounded-[15px] border border-[rgba(34,34,34,0.08)] bg-white md:p-[30px] p-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <h3 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] mb-[16px]">Units status</h3>

                <div className="flex flex-col gap-[14px] lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-[8px]">
                        {statusFilterTabs.map((tab) => {
                            const active = statusFilter === tab;
                            const countKey = toStatusFilterParam(tab);
                            const count =
                                tab === "All"
                                    ? detail?.statusCounts?.all ?? rows.length
                                    : detail?.statusCounts?.[countKey] ?? 0;
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setStatusFilter(tab)}
                                    className={`shrink-0 rounded-full px-[16px] h-[33px] text-[12px] font-[SemiBold] transition-colors cursor-pointer ${active ? "bg-[#222] text-white" : "bg-white text-[#222] border border-[rgba(34,34,34,0.12)]"}`}
                                >
                                    {tab} ({count})
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[40px] w-full lg:w-[280px] lg:shrink-0">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                            type="search"
                            placeholder="Search here"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                        />
                    </div>
                </div>
                {/*table section*/}
                <div className="mt-[20px] mb-[30px] overflow-x-auto w-full scrollbar-hide">
                    <div className="min-w-[1140px] rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden">
                        <div className="grid grid-cols-[1fr_1fr_1fr_0.7fr] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                            <p className="text-[13px] md:text-[14px] font-[SemiBold] text-[#222]">Unit ID</p>
                            <p className="text-[13px] md:text-[14px] font-[SemiBold] text-[#222]">Assigned date</p>
                            <p className="text-[13px] md:text-[14px] font-[SemiBold] text-[#222]">Handling by</p>
                            <p className="text-[13px] md:text-[14px] font-[SemiBold] text-[#222]">Unit status</p>
                        </div>
                        {rows.length === 0 && !isLoading ? (
                            <div className="px-[14px] py-[28px] text-center">
                                <p className="text-[14px] font-[SemiBold] text-[#222]">
                                    No units found
                                </p>
                                <p className="mt-[6px] text-[13px] font-[Regular] text-[#707070]">
                                    {search.trim() || statusFilter !== "All"
                                        ? "Try changing the status filter or search."
                                        : "There are no units to show for this layout."}
                                </p>
                            </div>
                        ) : (
                            rows.map((row, idx) => (
                                <div
                                    key={row.id}
                                    className={`grid grid-cols-[1fr_1fr_1fr_0.7fr] gap-2 items-center px-[14px] py-[12px] ${idx !== rows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                >
                                    <p className="text-[12px] font-[Bold] text-[#222]">{row.unitNumber}</p>
                                    <p className="text-[12px] font-[Regular] text-[#222]">{row.assignedDate}</p>
                                    <span className="inline-flex w-fit items-center rounded-[6px] border border-[rgba(34,34,34,0.10)] bg-white px-[10px] py-[4px] text-[12px] font-[Medium] text-[#222]">
                                        {row.handlingBy}
                                    </span>
                                    <span
                                        className={`inline-flex w-fit items-center rounded-[6px] px-[10px] py-[4px] text-[12px] font-[SemiBold] ${unitStatusBadgeClass(row.status)}`}
                                    >
                                        {row.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <Pagenation
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />

            </div>
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
        </div>
    );
};

export default AllocatedProjectUnitDetail;
