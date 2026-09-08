import { useState, useRef, useEffect } from "react";
import type { RefObject } from "react";
import mainbg from "../../../assets/img/mainbg.png";
import homeimg from "../../../assets/img/home.png";
import { DownArrowIcon, SearchIcon, TrashIcon, PlusIcon, LocationIcon, EyeDarkIcon, EditIcon, LeftArrowIcon, RightArrowIcon } from "../../../components/CustomFile/icons";
import DeveloperHeader from "../../../components/Header/DeveloperHeader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import AddDealModal from "./AddDealModal";
import { useNavigate } from "react-router-dom";
import { developerService } from "../../../services/developerService";
import { API_BASE_URL } from "../../../services/apiClient";
import { toast } from "../../../services/toast";
import Loader from "../../../components/Loader/loader";
import { DeveloperTableEmptyState } from "../../../components/DeveloperTableEmptyState";
type RevenueRow = {
    id: string;
    projectId: string;
    projectName: string;
    imageUrl: string;
    location: string;
    agencies: string[];
    closedDate: string;
    dealAmount: number;
    currency: string;
};

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

const monthTitle = (date: Date) =>
    `${date.toLocaleString("en-US", { month: "long" })}(${date.getFullYear()})`;

const getCalendarCells = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [];

    for (let i = 0; i < firstDayIndex; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(day);
    while (cells.length < 42) cells.push(null);
    return cells;
};

const RevenueManagement = () => {
    const navigate = useNavigate();
    const [isAddDealModalOpen, setIsAddDealModalOpen] = useState(false);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [selectedSort, setSelectedSort] = useState("Featured");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [activeDatePicker, setActiveDatePicker] = useState<"from" | "to" | null>(null);
    const [displayMonth, setDisplayMonth] = useState(new Date());
    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    const [rows, setRows] = useState<RevenueRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [reloadTick, setReloadTick] = useState(0);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalPages: 1,
        totalDeals: 0,
    });
    const defaultOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const [projectImgBase, setProjectImgBase] = useState(`${defaultOrigin}/uploads/img/project/`);
    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const fromDateRef = useRef<HTMLDivElement>(null);
    const toDateRef = useRef<HTMLDivElement>(null);
    const sortOptions = ["Featured", "Newest", "Oldest", "Highest", "Lowest"];
    const itemsPerPage = 10;

    const toApiSortValue = (value: string): "featured" | "newest" | "oldest" | "highest" | "lowest" => {
        const normalized = value.trim().toLowerCase();
        if (normalized === "newest") return "newest";
        if (normalized === "oldest") return "oldest";
        if (normalized === "highest") return "highest";
        if (normalized === "lowest") return "lowest";
        return "featured";
    };

    const formatDateCell = (value?: string) => {
        if (!value) return "-";
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return "-";
        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    };

    const toProjectImageUrl = (raw?: string) => {
        if (!raw) return homeimg;
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        const filename = raw.includes("/") ? raw.split("/").pop() || raw : raw;
        const encodedFilename = encodeURIComponent(filename).replace(/%2F/g, "/");
        return `${projectImgBase}${encodedFilename}`;
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setIsSortDropdownOpen(false);
            }
            if (
                fromDateRef.current &&
                !fromDateRef.current.contains(event.target as Node) &&
                toDateRef.current &&
                !toDateRef.current.contains(event.target as Node)
            ) {
                setActiveDatePicker(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearchText(searchText.trim());
            setCurrentPage(1);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [searchText]);

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
                const projectUrl = (source.projectUrl as Record<string, unknown>) || {};
                setProjectImgBase((prev) => String(projectUrl.img || prev).replace(/\/?$/, "/"));
            })
            .catch(() => undefined);
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        setIsLoading(true);
        developerService
            .getRevenue({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearchText || undefined,
                sortBy: toApiSortValue(selectedSort),
                startDate: fromDate ? fromDate.toISOString() : undefined,
                endDate: toDate ? toDate.toISOString() : undefined,
            })
            .then((res) => {
                if (!mounted) return;
                const nextRows: RevenueRow[] = (res.deals || []).map((deal) => {
                    const agencies = (deal.agencies?.display || [])
                        .map((a) => String(a.agencyName || a.name || "").trim())
                        .filter(Boolean);
                    if ((deal.agencies?.remainingCount || 0) > 0) {
                        agencies.push(`+${deal.agencies.remainingCount}`);
                    }
                    const city = String(deal.project?.location?.city || "").trim();
                    const zone = String(deal.project?.location?.zone || "").trim();
                    const location = [city, zone].filter(Boolean).join(", ");
                    const rawImage =
                        typeof deal.project?.image === "string"
                            ? deal.project.image
                            : deal.project?.image?.url;
                    return {
                        id: String(deal.dealId),
                        projectId: String(deal.project?.id || ""),
                        projectName: String(deal.project?.projectName || "-"),
                        imageUrl: toProjectImageUrl(rawImage),
                        location: location || "-",
                        agencies: agencies.length ? agencies : ["-"],
                        closedDate: formatDateCell(deal.closedDate),
                        dealAmount: Number(deal.dealAmount || 0),
                        currency: String(deal.currency || "AED"),
                    };
                });
                setRows(nextRows);
                setPagination({
                    page: Number(res.pagination?.page || currentPage),
                    limit: Number(res.pagination?.limit || itemsPerPage),
                    totalPages: Number(res.pagination?.totalPages || 1),
                    totalDeals: Number(res.pagination?.totalDeals || 0),
                });
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                toast.error(
                    "Failed to load revenue",
                    (error as { message?: string })?.message || "Could not fetch revenue data."
                );
            })
            .finally(() => {
                if (!mounted) return;
                setIsLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [currentPage, debouncedSearchText, fromDate, toDate, selectedSort, projectImgBase, reloadTick]);

    const paginatedRows = rows;
    const allSelected = paginatedRows.length > 0 && paginatedRows.every((row) => selectedIds.has(row.id));

    const toggleRow = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (allSelected) {
                paginatedRows.forEach((row) => next.delete(row.id));
            } else {
                paginatedRows.forEach((row) => next.add(row.id));
            }
            return next;
        });
    };

    const formatAmount = (value: number, currency?: string) => `${value.toLocaleString("en-US")} ${currency || "AED"}`;
    const calendarCells = getCalendarCells(displayMonth);

    const shiftMonth = (direction: -1 | 1) => {
        setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const openDatePicker = (type: "from" | "to") => {
        setActiveDatePicker((prev) => (prev === type ? null : type));
        const sourceDate = (type === "from" ? fromDate : toDate) || new Date();
        setDisplayMonth(new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1));
    };

    const selectDate = (day: number) => {
        const selectedDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
        if (activeDatePicker === "from") {
            setFromDate(selectedDate);
        } else if (activeDatePicker === "to") {
            setToDate(selectedDate);
        }
        setActiveDatePicker(null);
    };

    const renderDatePicker = (
        type: "from" | "to",
        selectedDate: Date | null,
        side: "left" | "right",
        ref: RefObject<HTMLDivElement | null>
    ) => (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => openDatePicker(type)}
                className="cursor-pointer h-[33px] rounded-full border border-[rgba(34,34,34,0.10)] px-[12px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center gap-[6px]"
            >
                {selectedDate ? formatDisplayDate(selectedDate) : type === "from" ? "From date" : "To date"}
            </button>
            {activeDatePicker === type && (
                <div className={`absolute ${side}-0 top-[40px] z-9 h-[320px] w-[280px] rounded-[12px]  bg-white p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}>
                    <div className="flex items-center justify-between mb-[16px]">
                        <button type="button" onClick={() => shiftMonth(-1)} className="text-[16px] font-[SemiBold] text-[#222] px-[6px] rotate-180"><LeftArrowIcon width={14} height={14} /></button>
                        <p className="text-[16px] font-[Bold] text-[#222]">{monthTitle(displayMonth)}</p>
                        <button type="button" onClick={() => shiftMonth(1)} className="text-[16px] font-[SemiBold] text-[#222] px-[6px]"><RightArrowIcon width={14} height={14} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-[6px] text-center">
                        {weekDays.map((day, index) => (
                            <span key={`${type}-day-${day}-${index}`} className="text-[13px] font-[SemiBold] text-[#222]">{day}</span>
                        ))}
                        {calendarCells.map((day, idx) => {
                            if (!day) {
                                return (
                                    <span
                                        key={`${type}-blank-${idx}`}
                                        className="h-[30px] w-[30px] mx-auto rounded-full border border-[rgba(34,34,34,0.10)] bg-[#FAFAFA]"
                                    />
                                );
                            }
                            const isSelected =
                                !!selectedDate &&
                                selectedDate.getDate() === day &&
                                selectedDate.getMonth() === displayMonth.getMonth() &&
                                selectedDate.getFullYear() === displayMonth.getFullYear();
                            return (
                                <button
                                    key={`${type}-${day}-${idx}`}
                                    type="button"
                                    onClick={() => selectDate(day)}
                                    className={`h-[30px] w-[30px] mx-auto rounded-full text-[12px] font-[SemiBold] border transition-colors ${isSelected
                                        ? "bg-[#EA3934] text-white border-[#EA3934]"
                                        : "text-[#707070] border-[rgba(34,34,34,0.10)] hover:bg-[#F2F2F2]"
                                        }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );


    return (
        <>
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
                {/* Header */}
                <DeveloperHeader title="Revenue Management" showBack={false} onBackClick={() => { }} />
                {/* Revenue Management */}
                <div className="rounded-[15px] bg-white min-w-0 md:p-[30px] p-[20px] flex flex-col gap-[30px]">
                    {/* Toolbar */}
                    <div className="flex items-center flex-wrap justify-between gap-[12px]">
                        {/* Search */}
                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] w-full lg:max-w-[250px] 2xl:max-w-[300px]">
                            <SearchIcon className="text-[#707070] shrink-0" />
                            <input
                                type="search"
                                placeholder="Search here"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-[10px]">
                            {/* Date range from */}
                            {renderDatePicker("from", fromDate, "left", fromDateRef)}
                            {/* Date range to */}
                            <span className="text-[12px] text-[#707070]">to</span>
                            {renderDatePicker("to", toDate, "right", toDateRef)}

                            <div className="w-[1px] h-[18px] bg-[rgba(34,34,34,0.10)] mx-[2px]" />

                            {/* Sort by */}
                            <div className="flex items-center gap-[8px] shrink-0">
                                <span className="text-[#222] text-[12px] font-[Regular] whitespace-nowrap">Sort by:</span>
                                <div className="relative" ref={sortDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                        className="flex items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.10)] bg-white rounded-full px-[12px] h-[33px] cursor-pointer min-w-[100px]"
                                    >
                                        <span className="text-[#222] text-[12px] font-[SemiBold]">{selectedSort}</span>
                                        <DownArrowIcon className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {isSortDropdownOpen && (
                                        <div className="absolute right-0 top-[40px] w-full min-w-[130px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-20 flex flex-col">
                                            {sortOptions.map((option) => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setSelectedSort(option);
                                                        setIsSortDropdownOpen(false);
                                                    }}
                                                    className={`px-[12px] py-[8px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${selectedSort === option ? "text-[#0832AE] bg-[#F5F5F5]" : "text-[#222]"
                                                        }`}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Delete button */}
                            {/* <button
                                type="button"
                                disabled
                                className="cursor-pointer opacity-50 flex items-center gap-[6px] px-[12px] h-[33px] rounded-full text-[12px] font-[SemiBold] text-[#222] bg-[#F5F5F5]"
                            >
                                <TrashIcon width={16} height={16} />
                                Delete
                            </button> */}

                            {/* Add Deal button */}
                            <button
                                type="button"
                                onClick={() => setIsAddDealModalOpen(true)}
                                className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#EA3934] text-[#FFF] px-[14px] h-[33px] text-[12px] font-[SemiBold] shrink-0"
                            >
                                <PlusIcon width={16} height={16} />
                                Add Deal
                            </button>
                        </div>
                    </div>

                    {/* Table */}

                    <div className="overflow-x-auto w-full scrollbar-hide relative">
                        {isLoading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 rounded-[10px]">
                                <Loader size={72} margin={0} />
                            </div>
                        )}
                        <div className="min-w-[1290px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                            <div className="grid grid-cols-[40px_1.5fr_1.9fr_1.5fr_1.1fr_0.7fr] gap-[15px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                                <div className="flex justify-center">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                                    />
                                </div>
                                <p className="text-[14px] font-[Bold] text-[#222]">Project details</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Agency name</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Deal closed date</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Deal amount</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
                            </div>

                            {!isLoading && paginatedRows.length === 0 ? (
                                <DeveloperTableEmptyState message="No closed deals found. Adjust filters or add a deal." />
                            ) : (
                                paginatedRows.map((row, index) => (
                                    <div
                                        key={row.id}
                                        className={`grid grid-cols-[40px_1.5fr_1.9fr_1.5fr_1.1fr_0.7fr] gap-[15px] items-center px-[14px] py-[12px] ${index !== paginatedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""
                                            }`}
                                    >
                                        <div className="flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(row.id)}
                                                onChange={() => toggleRow(row.id)}
                                                className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex items-center gap-[12px] min-w-0">
                                            <div className="w-[56px] h-[56px] rounded-[8px] overflow-hidden shrink-0">
                                                <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] mb-[4px] truncate">{row.projectName}</p>
                                                <p className="text-[12px] font-[Regular] text-[#707070] flex items-center gap-[5px] leading-[1.2]">
                                                    <span className="inline-flex shrink-0">
                                                        <LocationIcon width={11} height={15} />
                                                    </span>
                                                    <span className="truncate">{row.location}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-[6px] flex-wrap">
                                            {row.agencies.map((agency) => (
                                                <span
                                                    key={`${row.id}-${agency}`}
                                                    className={`inline-flex items-center rounded-[4px] h-[20px] px-[7px] text-[12px] font-[SemiBold] ${agency.startsWith("+")
                                                        ? "bg-transparent text-[#707070]"
                                                        : "border border-[rgba(34,34,34,0.10)] text-[#222]"
                                                        }`}
                                                >
                                                    {agency}
                                                </span>
                                            ))}
                                        </div>

                                        <p className="text-[12px] font-[Regular] text-[#222]">{row.closedDate}</p>
                                        <p className="text-[12px] font-[Regular] text-[#222] whitespace-nowrap">{formatAmount(row.dealAmount, row.currency)}</p>

                                        <div className="flex items-center justify-start gap-[6px]">
                                            <button onClick={() => navigate(`/developer/revenue-details?projectId=${encodeURIComponent(row.projectId)}`)} type="button" className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9]" aria-label="View">
                                                <EyeDarkIcon width={20} height={20} />
                                            </button>
                                            {/* <button type="button" className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9]" aria-label="Edit">
                                            <EditIcon width={20} height={20} />
                                        </button> */}
                                            {/* <button type="button" className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9]" aria-label="Delete">
                                            <TrashIcon width={20} height={20} />
                                        </button> */}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>


                    {/* Pagenation */}
                    <div className="px-[20px] md:px-[20px] pb-[20px]">
                        <Pagenation
                            currentPage={pagination.page || currentPage}
                            totalItems={pagination.totalDeals}
                            itemsPerPage={pagination.limit || itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            </div>
            <AddDealModal
                isOpen={isAddDealModalOpen}
                onClose={() => setIsAddDealModalOpen(false)}
                onSaved={() => setReloadTick((prev) => prev + 1)}
            />
        </>
    );
};

export default RevenueManagement;