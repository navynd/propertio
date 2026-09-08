import profileimg from "../../../assets/img/profileless.png";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
    CancelIcon,
    DownArrowIcon,
    EditIcon,
    LeftArrowIcon,
    LocationIcon,
    RightArrowIcon,
    SearchIcon,
    TrashIcon,
    EyeDarkIcon,
} from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { agenciesService } from "../../../services/agenciesService";
import { getApiErrorMessage } from "../../../services/apiClient";
import { useToast } from "../../../context/ToastContext";
import { projectsService } from "../../../services/projectsService";
import type {
    AdminProjectListItem,
    AgencyDropdownItem,
    DeveloperDropdownItem,
    ProjectLocationOption,
    ProjectsListCounts,
} from "../../../types/api";

const ITEMS_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 400;
const ALL_LOCATIONS = "All locations";

const SORT_OPTIONS = [
    { name: "Newest", value: "newest" },
    { name: "Oldest", value: "oldest" },
    { name: "Active", value: "active" },
    { name: "Inactive", value: "inactive" },
    { name: "Sold", value: "sold" },
    { name: "Price: Low to High", value: "price-asc" },
    { name: "Price: High to Low", value: "price-desc" },
] as const;

const projectStatusBadgeClass =
    "rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] whitespace-nowrap";

const formatProjectStatusLabel = (status?: string) => {
    if (!status?.trim()) return "";
    const normalized = status.trim().toLowerCase();
    if (normalized === "active") return "Active";
    if (normalized === "inactive") return "Inactive";
    if (normalized === "sold") return "Sold";
    if (normalized === "rented") return "Rented";
    if (normalized === "pending") return "Pending";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

function PropertyStatusBadge({ status }: { status?: string }) {
    const label = formatProjectStatusLabel(status);
    if (!label) return <span className="text-[12px] text-[#707070]">—</span>;

    const normalized = status!.trim().toLowerCase();

    if (normalized === "active") {
        return (
            <span
                className={`${projectStatusBadgeClass} bg-[#00A663] text-[#FFF]`}
            >
                {label}
            </span>
        );
    }
    if (normalized === "pending") {
        return (
            <span
                className={`${projectStatusBadgeClass} border border-[rgba(34,34,34,0.10)] bg-white text-[#222]`}
            >
                {label}
            </span>
        );
    }
    if (normalized === "sold") {
        return (
            <span
                className={`${projectStatusBadgeClass} border border-[#ea393459] bg-[#ea393414] text-[#ea3934]`}
            >
                {label}
            </span>
        );
    }
    if (normalized === "rented") {
        return (
            <span
                className={`${projectStatusBadgeClass} bg-[#8ACBD0] text-[#FFF]`}
            >
                {label}
            </span>
        );
    }
    if (normalized === "inactive") {
        return (
            <span
                className={`${projectStatusBadgeClass} bg-[#E80808] text-[#FFF]`}
            >
                {label}
            </span>
        );
    }

    return (
        <span
            className={`${projectStatusBadgeClass} border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5] text-[#222]`}
        >
            {label}
        </span>
    );
}

function StatCards({
    counts,
    totalFallback,
}: {
    counts?: ProjectsListCounts;
    totalFallback: number;
}) {
    const stats = [
        {
            label: "Total",
            value: counts?.totalProjects ?? totalFallback,
            accent: "#222",
        },
        { label: "Active", value: counts?.activeProjects ?? 0, accent: "#00A663" },
        { label: "Inactive", value: counts?.inactiveProjects ?? 0, accent: "#EA3934" },
        { label: "Sold", value: counts?.soldProjects ?? 0, accent: "#F59E0B" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[24px]">
            {stats.map((s) => (
                <div
                    key={s.label}
                    className="rounded-[12px] border border-[rgba(34,34,34,0.08)] bg-white p-[16px] flex flex-col gap-[6px]"
                >
                    <p className="text-[12px] font-[Medium] text-[#707070]">{s.label}</p>
                    <p
                        className="text-[28px] font-[Bold] leading-none"
                        style={{ color: s.accent }}
                    >
                        {s.value}
                    </p>
                </div>
            ))}
        </div>
    );
}

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

const monthTitle = (date: Date) =>
    `${date.toLocaleString("en-US", { month: "long" })}(${date.getFullYear()})`;

const VISIBLE_AGENCY_COUNT = 2;

const formatAuthorizedAgencies = (agencies: string[]) => {
    const visible = agencies.slice(0, VISIBLE_AGENCY_COUNT);
    const remaining = agencies.length - visible.length;
    return {
        visible,
        overflowLabel: remaining > 0 ? `+${remaining}` : null,
    };
};

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
const toApiDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const resolveProfileSrc = (
    filename: string | null | undefined,
    baseUrl: string,
    fallback = profileimg
) => {
    const raw = (filename || "").trim();
    if (!raw || raw.toLowerCase().includes("profileless")) return fallback;
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = baseUrl.replace(/\/+$/, "");
    return base ? `${base}/${encodeURIComponent(raw)}` : fallback;
};

const resolveProjectImageSrc = (images: AdminProjectListItem["images"], baseUrl: string) => {
    const primary = images?.find((img) => img.isPrimary) ?? images?.[0];
    const raw = (primary?.url || "").trim();
    if (!raw) return profileimg;
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = baseUrl.replace(/\/+$/, "");
    return base ? `${base}/${encodeURIComponent(raw)}` : profileimg;
};

const formatProjectLocation = (project: AdminProjectListItem) => {
    const parts = [project.location?.city, project.location?.zone].filter(Boolean);
    return parts.length ? parts.join(", ") : "—";
};

const formatPublishedAt = (value?: string) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

function ListingProject() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [fromDate, setFromDate] = useState<Date | null>(null);
    const [toDate, setToDate] = useState<Date | null>(null);
    const [activeDatePicker, setActiveDatePicker] = useState<"from" | "to" | null>(null);
    const [displayMonth, setDisplayMonth] = useState(() => new Date());
    const fromDateRef = useRef<HTMLDivElement>(null);
    const toDateRef = useRef<HTMLDivElement>(null);
    const locationDropdownRef = useRef<HTMLDivElement>(null);
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(ALL_LOCATIONS);
    const [locationOptions, setLocationOptions] = useState<ProjectLocationOption[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

    const [isDeveloperDropdownOpen, setIsDeveloperDropdownOpen] = useState(false);
    const [selectedDeveloper, setSelectedDeveloper] = useState<DeveloperDropdownItem | null>(null);
    const [developerSearch, setDeveloperSearch] = useState("");
    const [developerOptions, setDeveloperOptions] = useState<DeveloperDropdownItem[]>([]);
    const developerDropdownRef = useRef<HTMLDivElement>(null);

    const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState<AgencyDropdownItem | null>(null);
    const [agencySearch, setAgencySearch] = useState("");
    const [agencyOptions, setAgencyOptions] = useState<AgencyDropdownItem[]>([]);
    const agencyDropdownRef = useRef<HTMLDivElement>(null);

    const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["value"]>("newest");
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);

    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [projects, setProjects] = useState<AdminProjectListItem[]>([]);
    const [totalProjects, setTotalProjects] = useState(0);
    const [listCounts, setListCounts] = useState<ProjectsListCounts>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [projectImgBaseUrl, setProjectImgBaseUrl] = useState("");
    const [developerImgBaseUrl, setDeveloperImgBaseUrl] = useState("");

    const filteredDevelopers = useMemo(() => {
        const q = developerSearch.trim().toLowerCase();
        if (!q) return developerOptions;
        return developerOptions.filter(
            (d) =>
                (d.name || "").toLowerCase().includes(q) ||
                (d.email || "").toLowerCase().includes(q)
        );
    }, [developerSearch, developerOptions]);

    const filteredAgencies = useMemo(() => {
        const q = agencySearch.trim().toLowerCase();
        if (!q) return agencyOptions;
        return agencyOptions.filter(
            (a) =>
                (a.agencyName || "").toLowerCase().includes(q) ||
                (a.email || "").toLowerCase().includes(q)
        );
    }, [agencySearch, agencyOptions]);

    const selectedSortLabel =
        SORT_OPTIONS.find((item) => item.value === sortBy)?.name ?? "Newest";

    useEffect(() => {
        if (!isDeveloperDropdownOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            if (developerDropdownRef.current?.contains(e.target as Node)) return;
            setIsDeveloperDropdownOpen(false);
        };
        document.addEventListener("mousedown", onDocMouseDown as unknown as EventListener);
        return () => document.removeEventListener("mousedown", onDocMouseDown as unknown as EventListener);
    }, [isDeveloperDropdownOpen]);

    useEffect(() => {
        if (!isAgencyDropdownOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            if (agencyDropdownRef.current?.contains(e.target as Node)) return;
            setIsAgencyDropdownOpen(false);
        };
        document.addEventListener("mousedown", onDocMouseDown as unknown as EventListener);
        return () => document.removeEventListener("mousedown", onDocMouseDown as unknown as EventListener);
    }, [isAgencyDropdownOpen]);

    useEffect(() => {
        if (!isSortOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            if (sortRef.current?.contains(e.target as Node)) return;
            setIsSortOpen(false);
        };
        document.addEventListener("mousedown", onDocMouseDown as unknown as EventListener);
        return () => document.removeEventListener("mousedown", onDocMouseDown as unknown as EventListener);
    }, [isSortOpen]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
            setCurrentPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedAgency, sortBy, selectedDeveloper, selectedLocationId, fromDate, toDate]);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();
        Promise.all([
            projectsService.getSupportedUrls(controller.signal),
            projectsService.listProjectLocations(controller.signal),
            projectsService.listDevelopersForDropdown(undefined, controller.signal),
            agenciesService.listAgenciesForDropdown(undefined, controller.signal),
        ])
            .then(([urls, locations, devRes, agencyRes]) => {
                if (!mounted) return;
                setProjectImgBaseUrl(
                    (urls.supportedUrls?.projectUrl?.img || "").trim().replace(/\/?$/, "/")
                );
                setDeveloperImgBaseUrl(
                    (urls.supportedUrls?.developerUrl?.img || "").trim().replace(/\/?$/, "/")
                );
                setLocationOptions(locations);
                setDeveloperOptions(devRes.developers || []);
                setAgencyOptions(agencyRes.agencies || []);
            })
            .catch(() => undefined);
        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await projectsService.listProjects({
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                search: debouncedSearch || undefined,
                developer: selectedDeveloper?._id,
                agency: selectedAgency?._id,
                city: selectedLocationId || undefined,
                sortBy,
                startDate: fromDate ? toApiDateString(fromDate) : undefined,
                endDate: toDate ? toApiDateString(toDate) : undefined,
            });
            setProjects(response.projects || []);
            setTotalProjects(response.pagination?.totalProjects ?? 0);
            setListCounts(response.counts);
        } catch (err: unknown) {
            setError(getApiErrorMessage(err, "Failed to load projects"));
            setProjects([]);
            setTotalProjects(0);
            setListCounts(undefined);
        } finally {
            setLoading(false);
        }
    }, [
        currentPage,
        debouncedSearch,
        selectedDeveloper?._id,
        selectedAgency?._id,
        selectedLocationId,
        sortBy,
        fromDate,
        toDate,
    ]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleDeleteProject = useCallback(
        async (project: AdminProjectListItem) => {
            const label = project.projectName?.trim() || "this project";
            const result = await Swal.fire({
                title: "Delete project?",
                text: `This will permanently delete "${label}" and all related data (units, inquiries, reports, allocations, and more). This cannot be undone.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete",
                cancelButtonText: "Cancel",
                confirmButtonColor: "#EA3934",
                reverseButtons: true,
            });
            if (!result.isConfirmed) return;

            try {
                await projectsService.deleteProject(project._id);
                push({
                    type: "success",
                    title: "Project deleted",
                    description: "Project and related records were deleted successfully.",
                });
                await fetchProjects();
            } catch (err) {
                push({
                    type: "error",
                    title: "Delete failed",
                    description: getApiErrorMessage(err, "Failed to delete project"),
                });
            }
        },
        [fetchProjects, push]
    );

    const calendarCells = getCalendarCells(displayMonth);

    const shiftMonth = (direction: -1 | 1) => {
        setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const openDatePicker = (type: "from" | "to") => {
        setActiveDatePicker((prev) => (prev === type ? null : type));
        const sourceDate = type === "from" ? fromDate : toDate;
        const monthSource = sourceDate ?? new Date();
        setDisplayMonth(new Date(monthSource.getFullYear(), monthSource.getMonth(), 1));
    };

    const selectDate = (day: number) => {
        const selectedDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
        if (activeDatePicker === "from") setFromDate(selectedDate);
        if (activeDatePicker === "to") setToDate(selectedDate);
        setActiveDatePicker(null);
    };

    const clearDate = (type: "from" | "to", event: ReactMouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (type === "from") setFromDate(null);
        else setToDate(null);
        setActiveDatePicker(null);
    };

    const renderDatePicker = (
        type: "from" | "to",
        selectedDate: Date | null,
        side: "left" | "right"
    ) => (
        <div className="relative" ref={type === "from" ? fromDateRef : toDateRef}>
            <div className="inline-flex items-center h-[33px] rounded-full bg-white">
                <button
                    type="button"
                    onClick={() => openDatePicker(type)}
                    className={`cursor-pointer h-full rounded-full text-[12px] inline-flex items-center ${selectedDate ? "pl-[12px] pr-[4px]" : "px-[12px]"
                        } ${selectedDate
                            ? "font-[SemiBold] text-[#222]"
                            : "font-[Regular] text-[#707070]"
                        }`}
                >
                    {selectedDate
                        ? formatDisplayDate(selectedDate)
                        : type === "from"
                            ? "From date"
                            : "To date"}
                </button>
                {selectedDate && (
                    <button
                        type="button"
                        onClick={(e) => clearDate(type, e)}
                        className="cursor-pointer h-full pr-[10px] pl-[2px] inline-flex items-center justify-center shrink-0"
                        aria-label={type === "from" ? "Clear from date" : "Clear to date"}
                    >
                        <CancelIcon width={10} height={10} stroke="#707070" />
                    </button>
                )}
            </div>
            {activeDatePicker === type && (
                <div
                    className={`absolute ${side === "left" ? "md:right-0 " : "md:right-0 right-[-80px] "} top-[40px] z-20 h-[320px] w-[280px] rounded-[12px] bg-white p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}
                >
                    <div className="flex items-center justify-between mb-[16px]">
                        <button
                            type="button"
                            onClick={() => shiftMonth(-1)}
                            className="text-[16px] font-[SemiBold] text-[#222] px-[6px] rotate-180"
                        >
                            <LeftArrowIcon width={14} height={14} />
                        </button>
                        <p className="text-[16px] font-[Bold] text-[#222]">{monthTitle(displayMonth)}</p>
                        <button
                            type="button"
                            onClick={() => shiftMonth(1)}
                            className="text-[16px] font-[SemiBold] text-[#222] px-[6px]"
                        >
                            <RightArrowIcon width={14} height={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-[6px] text-center">
                        {weekDays.map((d, index) => (
                            <span
                                key={`${type}-day-${d}-${index}`}
                                className="text-[13px] font-[SemiBold] text-[#222]"
                            >
                                {d}
                            </span>
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
                                selectedDate != null &&
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
    const locationLabels = [ALL_LOCATIONS, ...locationOptions.map((l) => l.displayName || "")];

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Listing Projects" showBack={false} onBackClick={() => { }} />

            <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">

                <StatCards counts={listCounts} totalFallback={totalProjects} />

                <div className="flex flex-wrap items-center mb-[30px] gap-[10px]">
                    <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[40px] min-w-[200px]">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search here"
                            className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                        />
                    </div>
                    {/* developer dropdown */}
                    <div className="relative" ref={developerDropdownRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsDeveloperDropdownOpen((prev) => !prev);
                                setIsAgencyDropdownOpen(false);
                            }}
                            className="cursor-pointer  h-[40px] rounded-[15px] border border-[rgba(34,34,34,0.12)] px-[14px] text-left text-[14px] font-[Regular] flex items-center justify-between gap-[30px] bg-white"
                        >
                            <span className={selectedDeveloper ? "text-[#222] font-[Medium]" : "text-[#707070]"}>
                                {selectedDeveloper ? selectedDeveloper.name : "Select developer"}
                            </span>
                            <DownArrowIcon
                                width={11}
                                height={7}
                                className={`shrink-0 transition-transform ${isDeveloperDropdownOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {isDeveloperDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-40 w-[250px] mt-[8px] rounded-[10px] bg-white py-[12px] shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                <div className="px-[12px] mb-[10px]">
                                    <div className="flex items-center gap-[10px] h-[40px] rounded-[10px] px-[12px] bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                        <SearchIcon className="text-[#707070] shrink-0" />
                                        <input
                                            type="search"
                                            value={developerSearch}
                                            onChange={(e) => setDeveloperSearch(e.target.value)}
                                            placeholder="Search developer"
                                            className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto px-[12px] scrollbar-hide">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedDeveloper(null);
                                            setIsDeveloperDropdownOpen(false);
                                            setDeveloperSearch("");
                                        }}
                                        className="w-full text-left py-[10px] text-[12px] font-[Medium] text-[#707070] border-b border-[rgba(34,34,34,0.08)]"
                                    >
                                        All developers
                                    </button>
                                    {filteredDevelopers.length === 0 ? (
                                        <p className="text-[12px] text-[#707070] py-[12px] text-center">
                                            No developers found
                                        </p>
                                    ) : (
                                        filteredDevelopers.map((developer) => (
                                            <button
                                                key={developer._id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedDeveloper(developer);
                                                    setIsDeveloperDropdownOpen(false);
                                                    setDeveloperSearch("");
                                                }}
                                                className="w-full text-left flex gap-[12px] items-start py-[12px] border-b border-[rgba(34,34,34,0.08)] rounded-[6px] px-[4px] -mx-[4px] transition-colors"
                                            >
                                                <img
                                                    src={resolveProfileSrc(
                                                        developer.profilePicture,
                                                        developerImgBaseUrl,
                                                        developer.profilePictureUrl || profileimg
                                                    )}
                                                    alt=""
                                                    className="h-[40px] w-[40px] rounded-full object-cover shrink-0"
                                                />
                                                <div className="flex-1 min-w-0 pt-[2px]">
                                                    <p className="text-[12px] font-[Bold] text-[#222] leading-tight">
                                                        {developer.name}
                                                    </p>
                                                    <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px] leading-tight truncate">
                                                        {developer.email}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* agency dropdown */}
                    <div className="relative" ref={agencyDropdownRef}>
                        <button
                            type="button"
                            onClick={() => {
                                setIsAgencyDropdownOpen((prev) => !prev);
                                setIsDeveloperDropdownOpen(false);
                            }}
                            className="cursor-pointer h-[40px] rounded-[15px] border border-[rgba(34,34,34,0.12)] px-[14px] text-left text-[14px] font-[Regular] flex items-center justify-between gap-[30px] bg-white"
                        >
                            <span className={selectedAgency ? "text-[#222] font-[Medium]" : "text-[#707070]"}>
                                {selectedAgency ? selectedAgency.agencyName : "Select agency"}
                            </span>
                            <DownArrowIcon
                                width={11}
                                height={7}
                                className={`shrink-0 transition-transform ${isAgencyDropdownOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {isAgencyDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full z-40 w-[250px] mt-[8px] rounded-[10px] bg-white py-[12px] shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                <div className="px-[12px] mb-[10px]">
                                    <div className="flex items-center gap-[10px] h-[40px] rounded-[10px] px-[12px] bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                        <SearchIcon className="text-[#707070] shrink-0" />
                                        <input
                                            type="search"
                                            value={agencySearch}
                                            onChange={(e) => setAgencySearch(e.target.value)}
                                            placeholder="Search agency"
                                            className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto px-[12px] scrollbar-hide">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedAgency(null);
                                            setIsAgencyDropdownOpen(false);
                                            setAgencySearch("");
                                        }}
                                        className="w-full text-left py-[10px] text-[12px] font-[Medium] text-[#707070] border-b border-[rgba(34,34,34,0.08)]"
                                    >
                                        All agencies
                                    </button>
                                    {filteredAgencies.length === 0 ? (
                                        <p className="text-[12px] text-[#707070] py-[12px] text-center">
                                            No agency found
                                        </p>
                                    ) : (
                                        filteredAgencies.map((agency) => (
                                            <button
                                                key={agency._id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedAgency(agency);
                                                    setIsAgencyDropdownOpen(false);
                                                    setAgencySearch("");
                                                }}
                                                className="w-full text-left flex gap-[12px] items-start py-[12px] border-b border-[rgba(34,34,34,0.08)] rounded-[6px] px-[4px] -mx-[4px] transition-colors"
                                            >
                                                <img
                                                    src={resolveProfileSrc(
                                                        agency.profilePicture,
                                                        "",
                                                        agency.profilePictureUrl || profileimg
                                                    )}
                                                    alt=""
                                                    className="h-[40px] w-[40px] rounded-full object-cover shrink-0"
                                                />
                                                <div className="flex-1 min-w-0 pt-[2px]">
                                                    <p className="text-[12px] font-[Bold] text-[#222] leading-tight">
                                                        {agency.agencyName}
                                                    </p>
                                                    <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px] leading-tight truncate">
                                                        {agency.email}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sort by dropdown */}
                    <div className="relative flex items-center gap-[8px] ml-auto" ref={sortRef}>
                        <span className="text-[12px] font-[SemiBold] text-[#222] whitespace-nowrap">
                            Sort by:
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsSortOpen((o) => !o)}
                            className="h-[40px] min-w-[140px] rounded-[15px] border border-[rgba(34,34,34,0.12)] bg-white px-[14px] text-[14px] font-[Regular] text-[#222] inline-flex items-center justify-between gap-[8px] cursor-pointer"
                        >
                            <span className="truncate">{selectedSortLabel}</span>
                            <DownArrowIcon
                                width={11}
                                height={7}
                                className={`shrink-0 transition-transform ${isSortOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {isSortOpen && (
                            <div className="absolute right-0 top-[48px] z-40 min-w-[200px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white py-[6px] shadow-[0_8px_20px_rgba(0,0,0,0.10)] max-h-[200px] overflow-y-auto">
                                {SORT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setSortBy(opt.value);
                                            setIsSortOpen(false);
                                        }}
                                        className={`w-full px-[14px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${sortBy === opt.value ? "text-[#0832AE]" : "text-[#222]"
                                            }`}
                                    >
                                        {opt.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
                {/* Date filter section */}
                <div className="p-[5px] mb-[10px] bg-[#F5F5F5] lg:rounded-full rounded-[10px] flex flex-col gap-[12px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-[280px]" ref={locationDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsLocationDropdownOpen((o) => !o)}
                            className="cursor-pointer h-[33px] w-full rounded-full bg-white px-[14px] flex items-center justify-between text-left text-[13px] font-[Regular] text-[#222]"
                        >
                            <span className={selectedLocation === ALL_LOCATIONS ? "text-[#707070]" : "text-[#222]"}>{selectedLocation}</span>
                            <DownArrowIcon className={`shrink-0 transition-transform ${isLocationDropdownOpen ? "rotate-180" : ""}`} width={11} height={7} />
                        </button>
                        {isLocationDropdownOpen && (
                            <div className="absolute left-0 right-0 top-[44px] z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                {locationLabels.map((loc) => (
                                    <button
                                        key={loc}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setSelectedLocation(loc);
                                            if (loc === ALL_LOCATIONS) {
                                                setSelectedLocationId(null);
                                            } else {
                                                const match = locationOptions.find(
                                                    (item) => item.displayName === loc
                                                );
                                                setSelectedLocationId(match?._id || loc);
                                            }
                                            setIsLocationDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-[14px] py-[9px] text-[13px] font-[Medium] hover:bg-[#F5F5F5] ${selectedLocation === loc ? "text-[#EA3934] bg-[#FDF2F2]" : "text-[#222]"}`}
                                    >
                                        {loc}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/*Created date filter section*/}
                    <div className="flex flex-wrap items-center gap-[8px] text-[12px]">
                        <span className="text-[#222] font-[Regular] whitespace-nowrap md:block hidden">Created date:</span>
                        {/*From date */}
                        {renderDatePicker("from", fromDate, "left")}
                        <span className="text-[#707070]">to</span>
                        {/*To date */}
                        {renderDatePicker("to", toDate, "right")}
                    </div>
                </div>

                {error && (
                    <p className="text-[13px] text-[#EA3934] mb-[12px] font-[Medium]">{error}</p>
                )}

                {/* Table */}
                <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
                    <div className="min-w-[1250px]">
                        <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                            <div className="grid grid-cols-[1.3fr_1fr_1.3fr_1.1fr_1fr_1fr_1fr] gap-[30px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Name</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Developer</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Authorized Agency</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Price</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Published At</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                            </div>

                            {loading ? (
                                <div className="py-[40px] flex justify-center">
                                    <Loader size={64} margin={0} />
                                </div>
                            ) : projects.length === 0 ? (
                                <p className="text-[13px] text-[#707070] py-[24px] text-center">
                                    No projects found
                                </p>
                            ) : (
                                <div>
                                    {projects.map((row, idx) => {
                                        const agencyNames =
                                            row.authorizedAgencyNames ||
                                            row.authorizedAgencies?.map((a) => a.agencyName || "").filter(Boolean) ||
                                            [];
                                        const { visible: visibleAgencies, overflowLabel } =
                                            formatAuthorizedAgencies(agencyNames);

                                        return (
                                            <div
                                                key={row._id}
                                                className={`grid grid-cols-[1.3fr_1fr_1.3fr_1.1fr_1fr_1fr_1fr] gap-[30px] items-center px-[14px] py-[12px] ${idx !== projects.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                            >
                                                <div className="flex items-center gap-[10px] min-w-0">
                                                    <div className="h-[40px] w-[40px] shrink-0 overflow-hidden rounded-[12px] bg-[#F5F5F5]">
                                                        <img
                                                            src={resolveProjectImageSrc(row.images, projectImgBaseUrl)}
                                                            alt=""
                                                            className="h-full w-full object-cover rounded-[8px]"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] mb-[4px] truncate">
                                                            {row.projectName || "—"}
                                                        </p>
                                                        <p className="text-[12px] text-[#707070] leading-[1.2] flex items-center gap-[5px] min-w-0">
                                                            <span className="inline-flex shrink-0">
                                                                <LocationIcon width={11} height={15} />
                                                            </span>
                                                            <span className="truncate">{formatProjectLocation(row)}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-[10px]">
                                                    <img
                                                        src={resolveProfileSrc(
                                                            row.developer?.profilePicture,
                                                            developerImgBaseUrl
                                                        )}
                                                        alt=""
                                                        className="w-[40px] h-[40px] rounded-[12px] object-cover border border-[rgba(34,34,34,0.08)]"
                                                    />
                                                    <p className="text-[12px] font-[Regular] text-[#222] truncate">
                                                        {row.developer?.name || "—"}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-[6px] flex-wrap min-w-0">
                                                    {visibleAgencies.map((agency) => (
                                                        <span
                                                            key={`${row._id}-${agency}`}
                                                            className="inline-flex items-center rounded-[4px] h-[20px] px-[7px] text-[12px] font-[SemiBold] border border-[rgba(34,34,34,0.10)] text-[#222] shrink-0"
                                                        >
                                                            {agency}
                                                        </span>
                                                    ))}
                                                    {overflowLabel && (
                                                        <span className="inline-flex items-center h-[20px] px-[4px] text-[12px] font-[SemiBold] text-[#707070] shrink-0">
                                                            {overflowLabel}
                                                        </span>
                                                    )}
                                                </div>

                                                <p className="text-[12px] font-[Regular] text-[#222] truncate">
                                                    {row.priceLabel || "—"}
                                                </p>
                                                <p className="text-[12px] font-[Regular] text-[#222] truncate">
                                                    <PropertyStatusBadge status={row.status} />
                                                </p>
                                                <p className="text-[12px] font-[Regular] text-[#222] truncate">
                                                    {formatPublishedAt(row.publishedAt)}
                                                </p>
                                                <div className="flex items-center justify-start gap-[10px]">
                                                    <button
                                                        onClick={() =>
                                                            navigate(`/listingprojectdetail?id=${row._id}`)
                                                        }
                                                        type="button"
                                                        className="cursor-pointer p-[6px]"
                                                        aria-label="View"
                                                    >
                                                        <EyeDarkIcon width={20} height={20} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="cursor-pointer p-[6px]"
                                                        aria-label="Delete"
                                                        onClick={() => handleDeleteProject(row)}
                                                    >
                                                        <TrashIcon width={20} height={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pagenation */}
                <Pagenation
                    currentPage={currentPage}
                    totalItems={totalProjects}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}

export default ListingProject;   