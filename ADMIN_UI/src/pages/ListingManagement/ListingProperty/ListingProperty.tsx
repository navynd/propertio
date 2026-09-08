import profileless from "../../../assets/img/profileless.png";
import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import {
    CancelIcon,
    DownArrowIcon,
    EditIcon,
    LeftArrowIcon,
    LocationIcon,
    RightArrowIcon,
    SearchIcon,
    TrashIcon,
    EyeDarkIcon
} from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { agenciesService } from "../../../services/agenciesService";
import { agentsService } from "../../../services/agentsService";
import { getApiErrorMessage } from "../../../services/apiClient";
import { propertiesService } from "../../../services/propertiesService";
import { useToast } from "../../../context/ToastContext";
import type {
    AdminPropertyListItem,
    AgencyDropdownItem,
    AgentDropdownItem,
    ListingTypeMasterItem,
    PropertiesListCounts,
} from "../../../types/api";

type ListingChip = { label: string; value: string };

const ITEMS_PER_PAGE = 5;
const SORT_OPTIONS = [
    { name: "Newest", value: "newest" },
    { name: "Oldest", value: "oldest" },
    { name: "Active", value: "active" },
    { name: "Inactive", value: "inactive" },
    { name: "Sold", value: "sold" },
    { name: "Rented", value: "rented" },
    { name: "Pending", value: "pending" },
    { name: "Price: Low to High", value: "price-asc" },
    { name: "Price: High to Low", value: "price-desc" },
] as const;
const SEARCH_DEBOUNCE_MS = 400;
const ALL_LOCATIONS = "All locations";
const tableGrid =
    "grid-cols-[1.15fr_0.95fr_1.2fr_0.85fr_0.7fr_0.85fr_0.65fr]";

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

const toApiDateString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
};

const isPlaceholderProfilePicture = (filename: string | null | undefined): boolean => {
    if (!filename || !String(filename).trim()) return true;
    const lower = String(filename).trim().toLowerCase();
    if (lower.includes("profileless.png")) return true;
    const base = lower.split(/[/\\?#]/).pop() ?? "";
    return base === "profileless.png";
};

const resolveProfileSrc = (
    filename: string | null | undefined,
    baseUrl: string,
    fallbackUrl?: string | null
): string => {
    const raw = (filename || "").trim();
    if (!raw || isPlaceholderProfilePicture(raw)) return profileless;
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = (baseUrl || "").trim().replace(/\/+$/, "");
    if (!base) return fallbackUrl?.trim() || profileless;
    return `${base}/${encodeURIComponent(raw)}`;
};

const resolvePropertyImageSrc = (
    images: AdminPropertyListItem["images"],
    propertyImgBaseUrl: string
): string => {
    const primary = images?.find((img) => img.isPrimary) ?? images?.[0];
    const raw = (primary?.url || "").trim();
    if (!raw) return profileless;
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = (propertyImgBaseUrl || "").trim().replace(/\/+$/, "");
    if (!base) return profileless;
    return `${base}/${encodeURIComponent(raw)}`;
};

const formatPropertyLocation = (property: AdminPropertyListItem) => {
    const loc = property.location;
    const parts = [loc?.city, loc?.zone].filter(Boolean);
    if (parts.length) return parts.join(", ");
    return loc?.fullAddress?.trim() || "—";
};

const formatListingType = (property: AdminPropertyListItem) => {
    const parts = [
        property.propertyType?.name?.trim(),
        property.listingType?.name?.trim(),
    ].filter(Boolean);
    return parts.length ? parts.join(" | ") : "—";
};

const formatPropertyPrice = (property: AdminPropertyListItem) => {
    if (typeof property.price !== "number" || Number.isNaN(property.price)) return "—";
    const currency = (property.currency || "AED").trim();
    const amount = property.price.toLocaleString("en-US");
    if (property.listingType?.transaction === "rent") {
        const monthly = property.rentPricing?.monthly;
        if (typeof monthly === "number" && !Number.isNaN(monthly)) {
            return `${currency} ${amount}/yr · ${monthly.toLocaleString("en-US")}/mo`;
        }
        return `${currency} ${amount}/yr`;
    }
    return `${currency} ${amount}`;
};

const propertyStatusBadgeClass =
    "rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] whitespace-nowrap";

const formatPropertyStatusLabel = (status?: string) => {
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
    const label = formatPropertyStatusLabel(status);
    if (!label) return <span className="text-[12px] text-[#707070]">—</span>;

    const normalized = status!.trim().toLowerCase();

    if (normalized === "active") {
        return (
            <span
                className={`${propertyStatusBadgeClass} bg-[#00A663] text-[#FFF]`}
            >
                {label}
            </span>
        );
    }
    if (normalized === "pending") {
        return (
            <span
                className={`${propertyStatusBadgeClass} border border-[rgba(34,34,34,0.10)] bg-white text-[#222]`}
            >
                {label}
            </span>
        );
    }
    if (normalized === "sold") {
        return (
            <span
                className={`${propertyStatusBadgeClass} border border-[#ea393459] bg-[#ea393414] text-[#ea3934]`}
            >
                {label}
            </span>
        );
    }
    if (normalized === "rented") {
        return (
            <span
                className={`${propertyStatusBadgeClass} bg-[#8ACBD0] text-[#FFF]`}
            >
                {label}
            </span>
        );
    }
    if (normalized === "inactive") {
        return (
            <span
                className={`${propertyStatusBadgeClass} bg-[#E80808] text-[#FFF]`}
            >
                {label}
            </span>
        );
    }

    return (
        <span
            className={`${propertyStatusBadgeClass} border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5] text-[#222]`}
        >
            {label}
        </span>
    );
}

function StatCards({
    counts,
    totalFallback,
}: {
    counts?: PropertiesListCounts;
    totalFallback: number;
}) {
    const stats = [
        {
            label: "Total",
            value: counts?.totalProperties ?? totalFallback,
            accent: "#222",
        },
        { label: "Active", value: counts?.activeProperties ?? 0, accent: "#00A663" },
        { label: "Inactive", value: counts?.inactiveProperties ?? 0, accent: "#EA3934" },
        { label: "Sold", value: counts?.soldProperties ?? 0, accent: "#EA3934" },
        { label: "Rented", value: counts?.rentedProperties ?? 0, accent: "#8ACBD0" },
        { label: "Pending", value: counts?.pendingProperties ?? 0, accent: "#F59E0B" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-[14px] mb-[24px]">
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

function ListingProperty() {
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
    const [locationOptions, setLocationOptions] = useState<string[]>([ALL_LOCATIONS]);

    const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<AgentDropdownItem | null>(null);
    const [agentSearch, setAgentSearch] = useState("");
    const [agentOptions, setAgentOptions] = useState<AgentDropdownItem[]>([]);
    const agentDropdownRef = useRef<HTMLDivElement>(null);

    const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState<AgencyDropdownItem | null>(null);
    const [agencySearch, setAgencySearch] = useState("");
    const [agencyOptions, setAgencyOptions] = useState<AgencyDropdownItem[]>([]);
    const agencyDropdownRef = useRef<HTMLDivElement>(null);
    const chipDropdownRef = useRef<HTMLDivElement>(null);
    const sortRef = useRef<HTMLDivElement>(null);

    const [selectedChip, setSelectedChip] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [isChipDropdownOpen, setIsChipDropdownOpen] = useState(false);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [listingTypes, setListingTypes] = useState<ListingTypeMasterItem[]>([]);

    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [properties, setProperties] = useState<AdminPropertyListItem[]>([]);
    const [totalProperties, setTotalProperties] = useState(0);
    const [listCounts, setListCounts] = useState<PropertiesListCounts>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [propertyImgBaseUrl, setPropertyImgBaseUrl] = useState("");
    const [agentImgBaseUrl, setAgentImgBaseUrl] = useState("");
    const [agencyImgBaseUrl, setAgencyImgBaseUrl] = useState("");
    const filteredAgents = useMemo(() => {
        const q = agentSearch.trim().toLowerCase();
        if (!q) return agentOptions;
        return agentOptions.filter(
            (a) =>
                (a.fullName || "").toLowerCase().includes(q) ||
                (a.email || "").toLowerCase().includes(q) ||
                (a.agency?.agencyName || "").toLowerCase().includes(q)
        );
    }, [agentSearch, agentOptions]);

    const filteredAgency = useMemo(() => {
        const q = agencySearch.trim().toLowerCase();
        if (!q) return agencyOptions;
        return agencyOptions.filter((a) =>
            (a.agencyName || "").toLowerCase().includes(q)
        );
    }, [agencySearch, agencyOptions]);

    const listingTypeChips = useMemo<ListingChip[]>(() => {
        const options = listingTypes
            .filter((item) => item.slug !== "new-projects")
            .sort(
                (a, b) =>
                    Number(a.displayOrder ?? 999) - Number(b.displayOrder ?? 999)
            )
            .map((item) => ({
                label: item.name?.trim() || "—",
                value: item._id,
            }));
        return [{ label: "All", value: "all" }, ...options];
    }, [listingTypes]);

    const selectedChipLabel =
        listingTypeChips.find((item) => item.value === selectedChip)?.label ?? "All";

    const selectedSortLabel =
        SORT_OPTIONS.find((item) => item.value === sortBy)?.name ?? "Newest";

    useEffect(() => {
        if (!isSortOpen) return;
        const onDown = (e: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
                setIsSortOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [isSortOpen]);

    useEffect(() => {
        if (!isChipDropdownOpen) return;
        const onDown = (e: MouseEvent) => {
            if (
                chipDropdownRef.current &&
                !chipDropdownRef.current.contains(e.target as Node)
            ) {
                setIsChipDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [isChipDropdownOpen]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedChip, sortBy]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
            setCurrentPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();
        const loadMaster = async () => {
            try {
                const [urls, locations, types] = await Promise.all([
                    propertiesService.getSupportedUrls(controller.signal),
                    propertiesService.listPropertyLocations(controller.signal),
                    propertiesService.listListingTypes(controller.signal),
                ]);
                if (!mounted) return;
                setPropertyImgBaseUrl((urls.supportedUrls?.propertyUrl?.img || "").trim());
                setAgentImgBaseUrl((urls.supportedUrls?.agentUrl?.img || "").trim());
                setAgencyImgBaseUrl((urls.supportedUrls?.agencyUrl?.img || "").trim());
                setListingTypes(types);
                setLocationOptions([
                    ALL_LOCATIONS,
                    ...locations.map((loc) => loc.displayName?.trim() || "").filter(Boolean),
                ]);
            } catch {
                if (mounted) {
                    setPropertyImgBaseUrl("");
                    setAgentImgBaseUrl("");
                    setAgencyImgBaseUrl("");
                    setListingTypes([]);
                    setLocationOptions([ALL_LOCATIONS]);
                }
            }
        };
        void loadMaster();
        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();
        const loadAgencies = async () => {
            try {
                const data = await agenciesService.listAgenciesForDropdown(
                    undefined,
                    controller.signal
                );
                if (!mounted) return;
                setAgencyOptions(data.agencies || []);
            } catch {
                if (mounted) setAgencyOptions([]);
            }
        };
        void loadAgencies();
        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();
        const loadAgents = async () => {
            try {
                const data = await agentsService.listAgentsForDropdown(
                    undefined,
                    controller.signal
                );
                if (!mounted) return;
                setAgentOptions(data.agents ?? []);
            } catch {
                if (mounted) setAgentOptions([]);
            }
        };
        void loadAgents();
        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        if (
            !isAgentDropdownOpen &&
            !isAgencyDropdownOpen &&
            !isLocationDropdownOpen
        )
            return;
        const onDocMouseDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (agentDropdownRef.current?.contains(t)) return;
            if (agencyDropdownRef.current?.contains(t)) return;
            if (locationDropdownRef.current?.contains(t)) return;
            setIsAgentDropdownOpen(false);
            setIsAgencyDropdownOpen(false);
            setIsLocationDropdownOpen(false);
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [isAgentDropdownOpen, isAgencyDropdownOpen, isLocationDropdownOpen]);

    const loadProperties = useCallback(
        async (signal: AbortSignal) => {
            setLoading(true);
            setError(null);
            try {
                const data = await propertiesService.listProperties(
                    {
                        page: currentPage,
                        limit: ITEMS_PER_PAGE,
                        search: debouncedSearch || undefined,
                        agent: selectedAgent?._id,
                        agency: selectedAgency?._id,
                        city:
                            selectedLocation !== ALL_LOCATIONS
                                ? selectedLocation
                                : undefined,
                        startDate: fromDate ? toApiDateString(fromDate) : undefined,
                        endDate: toDate ? toApiDateString(toDate) : undefined,
                        sortBy,
                        listingType: selectedChip === "all" ? undefined : selectedChip,
                    },
                    signal
                );
                if (signal.aborted) return;
                setProperties(data.properties ?? []);
                setTotalProperties(data.pagination?.totalProperties ?? 0);
                setListCounts(data.counts);
            } catch (err) {
                if (signal.aborted) return;
                setProperties([]);
                setTotalProperties(0);
                setListCounts(undefined);
                setError(getApiErrorMessage(err, "Failed to load properties"));
            } finally {
                if (!signal.aborted) setLoading(false);
            }
        },
        [
            currentPage,
            debouncedSearch,
            selectedAgent?._id,
            selectedAgency?._id,
            selectedLocation,
            fromDate,
            toDate,
            sortBy,
            selectedChip,
        ]
    );

    useEffect(() => {
        const controller = new AbortController();
        void loadProperties(controller.signal);
        return () => controller.abort();
    }, [loadProperties]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedAgent?._id, selectedAgency?._id, selectedLocation, fromDate, toDate, sortBy, selectedChip]);

    const calendarCells = getCalendarCells(displayMonth);

    const handleDeleteProperty = useCallback(
        async (property: AdminPropertyListItem) => {
            const label = property.title?.trim() || "this property";
            const result = await Swal.fire({
                title: "Delete property?",
                text: `This will permanently delete ${label} and related data.`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete",
                cancelButtonText: "Cancel",
                confirmButtonColor: "#EA3934",
                reverseButtons: true,
            });
            if (!result.isConfirmed) return;

            try {
                await propertiesService.deleteProperty(property._id);
                push({
                    type: "success",
                    title: "Property deleted",
                    description: "Property and related records were deleted successfully.",
                });
                const controller = new AbortController();
                await loadProperties(controller.signal);
                controller.abort();
            } catch (err) {
                push({
                    type: "error",
                    title: "Delete failed",
                    description: getApiErrorMessage(err, "Failed to delete property"),
                });
            }
        },
        [loadProperties, push]
    );

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

    const clearDate = (type: "from" | "to", event: React.MouseEvent) => {
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

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Listing Property" showBack={false} onBackClick={() => { }} />

            <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">

                <StatCards counts={listCounts} totalFallback={totalProperties} />

                {/* search and filter */}
                <div className="flex flex-wrap items-center justify-between mb-[30px] gap-[10px]">
                    <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[40px] w-full md:w-[280px]">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search here"
                            className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-[10px]">
                        {/* agent dropdown */}
                        <div className="relative" ref={agentDropdownRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAgentDropdownOpen((prev) => !prev);
                                    setIsAgencyDropdownOpen(false);
                                }}
                                className="cursor-pointer md:w-[250px] w-full h-[40px] rounded-[15px] border border-[rgba(34,34,34,0.12)] px-[14px] text-left text-[14px] font-[Regular] flex items-center justify-between gap-[30px] bg-white"
                            >
                                <span
                                    className={
                                        selectedAgent ? "text-[#222] font-[Medium]" : "text-[#707070]"
                                    }
                                >
                                    {selectedAgent?.fullName || "Select agent"}
                                </span>
                                <DownArrowIcon
                                    width={11}
                                    height={7}
                                    className={`shrink-0 transition-transform ${isAgentDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {isAgentDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full z-40 w-[250px] mt-[8px] rounded-[10px] bg-white py-[12px] shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                    <div className="px-[12px] mb-[10px]">
                                        <div className="flex items-center gap-[10px] h-[40px] rounded-[10px] px-[12px] bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                            <SearchIcon className="text-[#707070] shrink-0" />
                                            <input
                                                type="search"
                                                value={agentSearch}
                                                onChange={(e) => setAgentSearch(e.target.value)}
                                                placeholder="Search agent"
                                                className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto px-[12px] scrollbar-hide">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedAgent(null);
                                                setIsAgentDropdownOpen(false);
                                                setAgentSearch("");
                                            }}
                                            className="w-full text-left py-[10px] text-[12px] font-[Medium] text-[#707070] border-b border-[rgba(34,34,34,0.08)]"
                                        >
                                            All agents
                                        </button>
                                        {filteredAgents.length === 0 ? (
                                            <p className="text-[12px] text-[#707070] py-[12px] text-center">
                                                No agents found
                                            </p>
                                        ) : (
                                            filteredAgents.map((agent) => (
                                                <button
                                                    key={agent._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedAgent(agent);
                                                        setIsAgentDropdownOpen(false);
                                                        setAgentSearch("");
                                                    }}
                                                    className="w-full text-left flex gap-[12px] items-start py-[12px] border-b border-[rgba(34,34,34,0.08)] rounded-[6px] px-[4px] -mx-[4px] transition-colors"
                                                >
                                                    <img
                                                        src={resolveProfileSrc(
                                                            agent.profilePicture,
                                                            agentImgBaseUrl
                                                        )}
                                                        alt=""
                                                        className="h-[40px] w-[40px] rounded-full object-cover shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0 pt-[2px]">
                                                        <p className="text-[12px] font-[Bold] text-[#222] leading-tight">
                                                            {agent.fullName || "—"}
                                                        </p>
                                                        <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px] leading-tight truncate">
                                                            {agent.agency?.agencyName ||
                                                                agent.email ||
                                                                "—"}
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
                                    setIsAgentDropdownOpen(false);
                                }}
                                className="cursor-pointer md:w-[250px] w-full h-[40px] rounded-[15px] border border-[rgba(34,34,34,0.12)] px-[14px] text-left text-[14px] font-[Regular] flex items-center justify-between gap-[30px] bg-white"
                            >
                                <span
                                    className={
                                        selectedAgency
                                            ? "text-[#222] font-[Medium]"
                                            : "text-[#707070]"
                                    }
                                >
                                    {selectedAgency?.agencyName || "Select agency"}
                                </span>
                                <DownArrowIcon
                                    width={11}
                                    height={7}
                                    className={`shrink-0 transition-transform duration-200 ${isAgencyDropdownOpen ? "rotate-180" : ""}`}
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
                                        {filteredAgency.length === 0 ? (
                                            <p className="text-[12px] text-[#707070] py-[12px] text-center">
                                                No agency found
                                            </p>
                                        ) : (
                                            filteredAgency.map((agency) => (
                                                <button
                                                    key={agency._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedAgency(agency);
                                                        setIsAgencyDropdownOpen(false);
                                                        setAgencySearch("");
                                                    }}
                                                    className="w-full text-left flex gap-[12px] items-start py-[12px] border-b border-[rgba(34,34,34,0.08)] rounded-[6px] px-[4px] -mx-[4px]"
                                                >
                                                    <img
                                                        src={resolveProfileSrc(
                                                            agency.profilePicture,
                                                            agencyImgBaseUrl,
                                                            agency.profilePictureUrl
                                                        )}
                                                        alt=""
                                                        className="h-[40px] w-[40px] rounded-full object-cover shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0 pt-[2px]">
                                                        <p className="text-[12px] font-[Bold] text-[#222] leading-tight">
                                                            {agency.agencyName || "—"}
                                                        </p>
                                                        <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px] leading-tight truncate">
                                                            {agency?.email || "—"}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-[14px] mb-[20px] xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
                    <div className="flex flex-wrap items-center gap-[12px]">
                        <div className="flex items-center gap-[8px] relative">
                            <div className="hidden 2xl:flex flex-wrap items-center gap-[8px]">
                                {listingTypeChips.map((chip) => (
                                    <button
                                        key={chip.value}
                                        type="button"
                                        onClick={() => setSelectedChip(chip.value)}
                                        className={`rounded-full px-[16px] h-[33px] text-[12px] font-[SemiBold] ${selectedChip === chip.value
                                            ? "bg-[#222] text-white"
                                            : "bg-white border border-[rgba(34,34,34,0.10)] text-[#222]"
                                            }`}
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                            <div className="block 2xl:hidden relative" ref={chipDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsChipDropdownOpen((prev) => !prev)}
                                    className="h-[33px] w-[100px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] text-[12px] font-[SemiBold] flex items-center justify-between gap-[6px] cursor-pointer"
                                >
                                    <span className="text-left truncate w-[50px]">
                                        {selectedChipLabel}
                                    </span>
                                    <DownArrowIcon
                                        width={10}
                                        height={6}
                                        className={`transition-transform ${isChipDropdownOpen ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {isChipDropdownOpen && (
                                    <div className="absolute top-[40px] left-0 z-30 min-w-[160px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white shadow-md">
                                        {listingTypeChips.map((chip) => (
                                            <button
                                                key={chip.value}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedChip(chip.value);
                                                    setIsChipDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-[14px] py-[8px] text-[12px] font-[SemiBold] text-[#222] hover:bg-[#F5F5F5]"
                                            >
                                                {chip.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-[10px] shrink-0">
                        <div className="relative flex items-center gap-[8px]" ref={sortRef}>
                            <span className="text-[12px] font-[SemiBold] text-[#222] whitespace-nowrap">
                                Sort by:
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsSortOpen((o) => !o)}
                                className="h-[33px] w-[108px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center justify-between gap-[8px] cursor-pointer"
                            >
                                <span className="truncate">{selectedSortLabel}</span>
                                <DownArrowIcon
                                    width={10}
                                    height={6}
                                    className={`shrink-0 transition-transform ${isSortOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {isSortOpen && (
                                <div className="absolute right-0 top-[40px] z-30 min-w-[200px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white py-[6px] shadow-[0_8px_20px_rgba(0,0,0,0.10)] max-h-[200px] overflow-y-auto">
                                    {SORT_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSortBy(opt.value);
                                                setIsSortOpen(false);
                                            }}
                                            className={`w-full px-[14px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${sortBy === opt.value
                                                ? "text-[#0832AE]"
                                                : "text-[#222]"
                                                }`}
                                        >
                                            {opt.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-[5px] mb-[10px] bg-[#F5F5F5] lg:rounded-full rounded-[10px] flex flex-col gap-[12px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-[280px]" ref={locationDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsLocationDropdownOpen((o) => !o)}
                            className="cursor-pointer h-[33px] w-full rounded-full bg-white px-[14px] flex items-center justify-between text-left text-[13px] font-[Regular] text-[#222]"
                        >
                            <span
                                className={
                                    selectedLocation === ALL_LOCATIONS
                                        ? "text-[#707070]"
                                        : "text-[#222]"
                                }
                            >
                                {selectedLocation}
                            </span>
                            <DownArrowIcon
                                className={`shrink-0 transition-transform ${isLocationDropdownOpen ? "rotate-180" : ""}`}
                                width={11}
                                height={7}
                            />
                        </button>
                        {isLocationDropdownOpen && (
                            <div className="absolute left-0 right-0 top-[44px] z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                {locationOptions.map((loc) => (
                                    <button
                                        key={loc}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setSelectedLocation(loc);
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
                    <div className="flex flex-wrap items-center gap-[8px] text-[12px]">
                        <span className="text-[#222] font-[Regular] whitespace-nowrap md:block hidden">
                            Created date:
                        </span>
                        {renderDatePicker("from", fromDate, "left")}
                        <span className="text-[#707070]">to</span>
                        {renderDatePicker("to", toDate, "right")}
                    </div>
                </div>

                {error && (
                    <p className="text-[13px] text-[#EA3934] mb-[12px] font-[Medium]">{error}</p>
                )}

                <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
                    <div className="min-w-[1350px]">
                        <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                            <div
                                className={`grid ${tableGrid} gap-[20px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}
                            >
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Name</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">
                                    Property For
                                </p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Agent</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Price</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Published</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                            </div>

                            {loading ? (
                                <div className="py-[40px] flex justify-center">
                                    <Loader size={64} margin={0} />
                                </div>
                            ) : properties.length === 0 ? (
                                <p className="text-[13px] text-[#707070] py-[24px] text-center">
                                    No properties found
                                </p>
                            ) : (
                                <div>
                                    {properties.map((row, idx) => {
                                        const imageSrc = resolvePropertyImageSrc(
                                            row.images,
                                            propertyImgBaseUrl
                                        );
                                        const agentImg = resolveProfileSrc(
                                            row.agent?.profilePicture,
                                            agentImgBaseUrl,
                                            row.agent?.profilePictureUrl
                                        );
                                        const agencyImg = resolveProfileSrc(
                                            row.agency?.profilePicture,
                                            agencyImgBaseUrl,
                                            row.agency?.profilePictureUrl
                                        );
                                        return (
                                            <div
                                                key={row._id}
                                                className={`grid ${tableGrid} gap-[20px] items-center px-[14px] py-[12px] ${idx !== properties.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                            >
                                                <div className="flex items-center gap-[10px] min-w-0">
                                                    <div className="h-[40px] w-[40px] shrink-0 overflow-hidden rounded-[12px] bg-[#F5F5F5]">
                                                        <img
                                                            src={imageSrc}
                                                            alt=""
                                                            className="h-full w-full object-cover rounded-[8px]"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] mb-[4px] truncate">
                                                            {row.title || "—"}
                                                        </p>
                                                        <p className="text-[12px] text-[#707070] leading-[1.2] flex items-center gap-[5px] min-w-0">
                                                            <span className="inline-flex shrink-0">
                                                                <LocationIcon
                                                                    width={11}
                                                                    height={15}
                                                                />
                                                            </span>
                                                            <span className="truncate">
                                                                {formatPropertyLocation(row)}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <p className="text-[12px] font-[Regular] text-[#222] truncate">
                                                    {formatListingType(row)}
                                                </p>
                                                <div className="flex items-start gap-[10px] min-w-0">
                                                    <img
                                                        src={agentImg}
                                                        alt=""
                                                        className="w-[40px] h-[40px] rounded-[12px] object-cover border border-[rgba(34,34,34,0.08)] shrink-0"
                                                    />
                                                    <div className="min-w-0 pt-[2px]">
                                                        <p className="text-[12px] font-[SemiBold] text-[#222] truncate leading-tight">
                                                            {row.agent?.fullName || "—"}
                                                        </p>
                                                        {row.agency?.agencyName ? (
                                                            <div className="flex items-center gap-[6px] mt-[6px] min-w-0">
                                                                <img
                                                                    src={agencyImg}
                                                                    alt=""
                                                                    className="w-[18px] h-[18px] rounded-full object-cover border border-[rgba(34,34,34,0.08)] shrink-0"
                                                                />
                                                                <p className="text-[11px] font-[Regular] text-[#707070] truncate leading-tight">
                                                                    {row.agency.agencyName}
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <p className="text-[12px] font-[Regular] text-[#222] truncate min-w-0">
                                                    {formatPropertyPrice(row)}
                                                </p>
                                                <PropertyStatusBadge status={row.status} />
                                                <p className="text-[12px] font-[Regular] text-[#222] truncate">
                                                    {formatPublishedAt(row.publishedAt)}
                                                </p>
                                                <div className="flex items-center justify-start gap-[10px]">
                                                    <button
                                                        onClick={() =>
                                                            navigate(
                                                                `/listingpropertydetail?id=${encodeURIComponent(row._id)}`
                                                            )
                                                        }
                                                        type="button"
                                                        className="cursor-pointer p-[6px]"
                                                        aria-label="Edit property"
                                                    >
                                                        <EyeDarkIcon width={20} height={20} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDeleteProperty(row)}
                                                        className="cursor-pointer p-[6px]"
                                                        aria-label="Delete property"
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

                <Pagenation
                    currentPage={currentPage}
                    totalItems={totalProperties}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}

export default ListingProperty;
