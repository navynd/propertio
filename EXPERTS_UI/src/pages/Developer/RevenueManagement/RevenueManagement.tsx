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
                className="cursor-pointer h-[36px] rounded-full border border-[#2A2A2A] bg-[#171717] px-[14px] text-[12px] font-[SemiBold] text-[#F5F0E8] hover:border-[#C9A96E]/40 inline-flex items-center gap-[6px] transition-colors"
            >
                {selectedDate ? formatDisplayDate(selectedDate) : type === "from" ? "From date" : "To date"}
            </button>
            {activeDatePicker === type && (
                <div className={`absolute ${side}-0 top-[42px] z-20 h-[320px] w-[280px] rounded-[16px] bg-[#171717] border border-[#2A2A2A] p-[20px] shadow-2xl`}>
                    <div className="flex items-center justify-between mb-[16px]">
                        <button type="button" onClick={() => shiftMonth(-1)} className="text-[16px] font-[SemiBold] text-[#A89880] hover:text-[#F5F0E8] px-[6px] rotate-180 transition-colors"><LeftArrowIcon width={14} height={14} /></button>
                        <p className="text-[15px] font-[Bold] text-[#F5F0E8]">{monthTitle(displayMonth)}</p>
                        <button type="button" onClick={() => shiftMonth(1)} className="text-[16px] font-[SemiBold] text-[#A89880] hover:text-[#F5F0E8] px-[6px] transition-colors"><RightArrowIcon width={14} height={14} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-[6px] text-center">
                        {weekDays.map((day, index) => (
                            <span key={`${type}-day-${day}-${index}`} className="text-[12px] font-[SemiBold] text-[#A89880]">{day}</span>
                        ))}
                        {calendarCells.map((day, idx) => {
                            if (!day) {
                                return (
                                    <span
                                        key={`${type}-blank-${idx}`}
                                        className="h-[30px] w-[30px] mx-auto rounded-full border border-transparent bg-[#111111]/50"
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
                                    className={`h-[30px] w-[30px] mx-auto rounded-full text-[12px] font-[SemiBold] border transition-colors cursor-pointer ${isSelected
                                        ? "bg-[#C9A96E] text-[#0A0A0A] border-[#C9A96E] font-[Bold] shadow-sm"
                                        : "text-[#A89880] border-transparent hover:border-[#2A2A2A] hover:bg-[#2A2A2A] hover:text-[#F5F0E8]"
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
                <div className="rounded-[20px] bg-[#111111] border border-[#2A2A2A] shadow-xl min-w-0 md:p-[30px] p-[20px] flex flex-col gap-[24px]">
                    {/* Toolbar */}
                    <div className="flex items-center flex-wrap justify-between gap-[12px]">
                        {/* Search */}
                        <div className="flex items-center gap-[10px] bg-[#171717] border border-[#2A2A2A] rounded-full px-[16px] h-[38px] w-full lg:max-w-[250px] 2xl:max-w-[300px] focus-within:border-[#C9A96E] transition-colors">
                            <SearchIcon className="text-[#A89880] shrink-0" />
                            <input
                                type="search"
                                placeholder="Search here"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full bg-transparent text-[13px] font-[Regular] text-[#F5F0E8] placeholder:text-[#6B6259] focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-[10px]">
                            {/* Date range from */}
                            {renderDatePicker("from", fromDate, "left", fromDateRef)}
                            {/* Date range to */}
                            <span className="text-[12px] text-[#A89880]">to</span>
                            {renderDatePicker("to", toDate, "right", toDateRef)}

                            <div className="w-[1px] h-[18px] bg-[#2A2A2A] mx-[2px]" />

                            {/* Sort by */}
                            <div className="flex items-center gap-[8px] shrink-0">
                                <span className="text-[#A89880] text-[12px] font-[Regular] whitespace-nowrap">Sort by:</span>
                                <div className="relative" ref={sortDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                        className="flex items-center justify-between gap-[8px] border border-[#2A2A2A] bg-[#171717] rounded-full px-[14px] h-[36px] cursor-pointer min-w-[110px] text-[#F5F0E8] hover:border-[#C9A96E]/40 transition-colors"
                                    >
                                        <span className="text-[12px] font-[SemiBold]">{selectedSort}</span>
                                        <DownArrowIcon className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {isSortDropdownOpen && (
                                        <div className="absolute right-0 top-[42px] w-full min-w-[130px] bg-[#171717] border border-[#2A2A2A] rounded-[12px] shadow-2xl py-[6px] z-20 flex flex-col">
                                            {sortOptions.map((option) => (
                                                <button
                                                    key={option}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setSelectedSort(option);
                                                        setIsSortDropdownOpen(false);
                                                    }}
                                                    className={`px-[14px] py-[8px] text-left text-[12px] font-[Medium] hover:bg-[#2A2A2A] transition-colors cursor-pointer ${selectedSort === option ? "text-[#C9A96E] bg-[#2A2A2A]" : "text-[#F5F0E8]"
                                                        }`}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Add Deal button */}
                            <button
                                type="button"
                                onClick={() => setIsAddDealModalOpen(true)}
                                className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#C9A96E] hover:bg-[#E4C98B] text-[#0A0A0A] px-[16px] h-[36px] text-[12px] font-[Bold] shrink-0 transition-colors shadow-md"
                            >
                                <PlusIcon width={14} height={14} />
                                Add Deal
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto w-full scrollbar-hide relative">
                        {isLoading && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0A0A]/70 backdrop-blur-sm rounded-[16px]">
                                <Loader size={60} margin={0} />
                            </div>
                        )}
                        <div className="min-w-[1290px] rounded-[16px] border border-[#2A2A2A] overflow-hidden bg-[#111111]">
                            <div className="grid grid-cols-[40px_1.5fr_1.9fr_1.5fr_1.1fr_0.7fr] gap-[15px] items-center px-[16px] py-[14px] bg-[#171717] border-b border-[#2A2A2A]">
                                <div className="flex justify-center">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        className="h-[15px] w-[15px] rounded border border-[#2A2A2A] bg-[#0A0A0A] accent-[#C9A96E] cursor-pointer"
                                    />
                                </div>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Project details</p>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Agency name</p>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Deal closed date</p>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Deal amount</p>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Actions</p>
                            </div>

                            {!isLoading && paginatedRows.length === 0 ? (
                                <DeveloperTableEmptyState message="No closed deals found. Adjust filters or add a deal." />
                            ) : (
                                paginatedRows.map((row, index) => (
                                    <div
                                        key={row.id}
                                        className={`grid grid-cols-[40px_1.5fr_1.9fr_1.5fr_1.1fr_0.7fr] gap-[15px] items-center px-[16px] py-[14px] hover:bg-[#171717]/60 transition-colors ${index !== paginatedRows.length - 1 ? "border-b border-[#2A2A2A]" : ""
                                            }`}
                                    >
                                        <div className="flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(row.id)}
                                                onChange={() => toggleRow(row.id)}
                                                className="h-[15px] w-[15px] rounded border border-[#2A2A2A] bg-[#0A0A0A] accent-[#C9A96E] cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex items-center gap-[12px] min-w-0">
                                            <div className="w-[56px] h-[56px] rounded-[8px] overflow-hidden shrink-0 border border-[#2A2A2A] bg-[#171717]">
                                                <img src={row.imageUrl} alt="" className="w-full h-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-[Bold] text-[#F5F0E8] leading-[1.3] mb-[4px] truncate">{row.projectName}</p>
                                                <p className="text-[12px] font-[Regular] text-[#A89880] flex items-center gap-[5px] leading-[1.2]">
                                                    <span className="inline-flex shrink-0 text-[#C9A96E]">
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
                                                    className={`inline-flex items-center rounded-[6px] h-[22px] px-[8px] text-[11px] font-[SemiBold] border ${agency.startsWith("+")
                                                        ? "bg-transparent text-[#A89880] border-transparent"
                                                        : "border-[#2A2A2A] bg-[#171717] text-[#F5F0E8]"
                                                        }`}
                                                >
                                                    {agency}
                                                </span>
                                            ))}
                                        </div>

                                        <p className="text-[12px] font-[Regular] text-[#F5F0E8]">{row.closedDate}</p>
                                        <p className="text-[12px] font-[Bold] text-[#F5F0E8] whitespace-nowrap">{formatAmount(row.dealAmount, row.currency)}</p>

                                        <div className="flex items-center justify-start gap-[6px]">
                                            <button onClick={() => navigate(`/developer/revenue-details?projectId=${encodeURIComponent(row.projectId)}`)} type="button" className="cursor-pointer p-[8px] rounded-[8px] bg-[#171717] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-[#A89880] hover:text-[#C9A96E] transition-colors" aria-label="View">
                                                <EyeDarkIcon width={18} height={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Pagination */}
                    <div className="px-[20px] md:px-[20px] pb-[10px]">
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