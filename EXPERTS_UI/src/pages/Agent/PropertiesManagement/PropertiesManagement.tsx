import { useEffect, useMemo, useRef, useState } from "react";
import {
    SearchIcon,
    DownArrowIcon,
    TrashIcon,
    EyeDarkIcon,
    EditIcon,
    LocationIcon,
    PlusIcon,
    TickIcon,
} from "../../../components/CustomFile/icons";
import Pagenation from "../../../components/Pagenation/Pagenation";
import home1img from "../../../assets/img/home1.png";
import { useNavigate } from "react-router-dom";
import Loader from "../../../components/Loader/loader";
import {
    agentService,
    type AgentPropertyListItem,
    type AgentSortByPropertyMasterItem,
    type AgentListingTypeMasterItem,
} from "../../../services/agentService";
import { API_BASE_URL } from "../../../services/apiClient";
import { toast } from "../../../services/toast";
import { extractPropertyMediaBasesFromSupportedUrls } from "../../../utils/agentPropertyListingMedia";

type SaleRent = "Sale" | "Rent";
type ListingChip = {
    label: string;
    value: string;
};

type FlatPropertyRow = {
    rowKey: string;
    id: string;
    image: string;
    title: string;
    location: string;
    propertyFor: string;
    area: string;
    priceMonthly: string;
    status: string;
    raw: AgentPropertyListItem;
};

function propertyForBadgeClass(label: string) {
    if (label === "Rent") return "bg-[rgba(212, 163, 115,0.12)] text-[#D4A373]";
    if (label === "Commercial Rent") return "bg-[rgba(199,163,53,0.18)] text-[#8B6914]";
    if (label === "Buy") return "bg-[rgba(0,166,99,0.12)] text-[#00A663]";
    return "bg-[rgba(255,70,162,0.12)] text-[#C41E7A]";
}

function statusBadgeClass(status: string) {
    if (status === "Rented") return "bg-white text-[#222] border border-[rgba(34,34,34,0.10)]";
    if (status === "Active") return "bg-[#00A663] text-white border border-transparent";
    if (status === "Sold") return "bg-[#FFF] text-[#222] border border-[rgba(34,34,34,0.10)]";
    return "bg-[#D4A373] text-white border border-transparent";
}

/** Rent list column: prefer API `rentPricing.monthly`, else derive from yearly or stored price (yearly). */
function rentMonthlyAmountForDisplay(item: AgentPropertyListItem): number {
    const rp = item.rentPricing;
    if (rp && typeof rp === "object") {
        const m = Number(rp.monthly);
        if (Number.isFinite(m)) return m;
        const y = Number(rp.yearly);
        if (Number.isFinite(y)) return Math.round(y / 12);
    }
    const price = Number(item.price ?? 0);
    if (item.listingType?.transaction === "rent" && Number.isFinite(price)) {
        return Math.round(price / 12);
    }
    return Number.isFinite(price) ? price : 0;
}

const defaultSortOptions: AgentSortByPropertyMasterItem[] = [
    { name: "Featured", value: "featured" },
    { name: "Newest", value: "newest" },
];

const PropertiesManagement = () => {
    const navigate = useNavigate();
    const [isChipDropdownOpen, setIsChipDropdownOpen] = useState(false);
    const chipDropdownRef = useRef<HTMLDivElement>(null);
    const [isSaleRentOpen, setIsSaleRentOpen] = useState(false);
    const saleRentDropdownRef = useRef<HTMLDivElement>(null);
    const [saleRent, setSaleRent] = useState<SaleRent>("Sale");
    const [selectedChip, setSelectedChip] = useState("all");
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("featured");
    const [isSortOpen, setIsSortOpen] = useState(false);
    const sortRef = useRef<HTMLDivElement>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [rows, setRows] = useState<AgentPropertyListItem[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [sortOptions, setSortOptions] = useState<AgentSortByPropertyMasterItem[]>(defaultSortOptions);
    const [listingTypes, setListingTypes] = useState<AgentListingTypeMasterItem[]>([]);
    const [propertyImageBaseUrl, setPropertyImageBaseUrl] = useState<string | null>(null);

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
            if (chipDropdownRef.current && !chipDropdownRef.current.contains(e.target as Node)) {
                setIsChipDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [isChipDropdownOpen]);

    useEffect(() => {
        if (!isSaleRentOpen) return;
        const onDown = (e: MouseEvent) => {
            if (saleRentDropdownRef.current && !saleRentDropdownRef.current.contains(e.target as Node)) {
                setIsSaleRentOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [isSaleRentOpen]);

    const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(Math.round(value));
    const toTitle = (value: string | undefined | null) => {
        if (!value) return "-";
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    };
    const toPropertyImageUrl = (image: string | undefined) => {
        if (!image) return home1img;
        if (image.startsWith("http")) return image;
        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallbackBase = `${fallbackOrigin}/uploads/img/property/`;
        const base = (propertyImageBaseUrl || fallbackBase).replace(/\/?$/, "/");
        return `${base}${image}`;
    };

    const listingTypeChips = useMemo<ListingChip[]>(() => {
        const options = listingTypes
            .filter((item) => item.slug !== "new-projects")
            .sort((a, b) => Number(a.displayOrder ?? 999) - Number(b.displayOrder ?? 999))
            .map((item) => ({ label: item.name, value: item._id }));
        return [{ label: "All", value: "all" }, ...options];
    }, [listingTypes]);

    const selectedChipLabel =
        listingTypeChips.find((item) => item.value === selectedChip)?.label ?? "All";

    const selectedSortLabel =
        sortOptions.find((item) => item.value === sortBy)?.name ?? "Featured";

    const pageRows = useMemo<FlatPropertyRow[]>(() => {
        return rows.map((item) => {
            const primaryImage =
                item.images?.find((img) => img?.isPrimary)?.url ||
                item.images?.slice().sort((a, b) => Number(a?.order ?? 999) - Number(b?.order ?? 999))[0]?.url;
            const location = [item.location?.city, item.location?.zone].filter(Boolean).join(", ") || "-";
            const areaSqft = Number(item.area?.sqft ?? 0);
            const listingLabel = item.listingType?.name || "-";
            const priceLabel =
                saleRent === "Rent"
                    ? `${formatNumber(rentMonthlyAmountForDisplay(item))} ${item.currency || "AED"}`
                    : `${formatNumber(Number(item.price ?? 0))} ${item.currency || "AED"}`;
            return {
                rowKey: item._id,
                id: item._id,
                image: toPropertyImageUrl(primaryImage),
                title: item.title || "-",
                location,
                propertyFor: listingLabel,
                area: areaSqft > 0 ? `${formatNumber(areaSqft)} sq.ft` : "-",
                priceMonthly: priceLabel,
                status: toTitle(item.status),
                raw: item,
            };
        });
    }, [rows, propertyImageBaseUrl, saleRent]);

    useEffect(() => {
        setCurrentPage(1);
    }, [saleRent, selectedChip, search, sortBy]);

    useEffect(() => {
        setSelectedIds(new Set());
    }, [saleRent, selectedChip, currentPage]);

    useEffect(() => {
        setSelectedChip("all");
    }, [saleRent]);

    useEffect(() => {
        let isMounted = true;
        agentService
            .getListingTypesMasterData()
            .then((data) => {
                if (!isMounted) return;
                setListingTypes(data?.listingTypes ?? data?.listingtypes ?? []);
            })
            .catch(() => { });
        agentService
            .getSortByPropertyMasterData()
            .then((data) => {
                if (!isMounted) return;
                const options = (data?.sortByProperty ?? data?.sortbyproperty ?? [])
                    .map((item) => ({
                        name: String(item?.name ?? "").trim(),
                        value: String(item?.value ?? "").trim().toLowerCase(),
                    }))
                    .filter((item) => item.name && item.value);
                if (options.length) {
                    setSortOptions(options);
                    setSortBy((current) => (options.some((x) => x.value === current) ? current : options[0].value));
                }
            })
            .catch(() => { });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallback = `${fallbackOrigin}/uploads/img/property/`;
        agentService
            .getSupportedUrlsMasterData()
            .then((data) => {
                if (!isMounted) return;
                const { imageBase } = extractPropertyMediaBasesFromSupportedUrls(data);
                setPropertyImageBaseUrl((imageBase ?? fallback).replace(/\/?$/, "/"));
            })
            .catch(() => {
                if (!isMounted) return;
                setPropertyImageBaseUrl(fallback);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        agentService
            .getProperties({
                transaction: selectedChip === "all" ? (saleRent === "Sale" ? "sale" : "rent") : undefined,
                listingType: selectedChip === "all" ? undefined : selectedChip,
                search,
                sortBy,
                page: currentPage,
                limit: itemsPerPage,
            })
            .then((data) => {
                if (!isMounted) return;
                setRows(data?.items ?? []);
                setTotalItems(data?.pagination?.total ?? 0);
            })
            .catch((err: unknown) => {
                const message = (err as { message?: string })?.message || "Unable to load properties.";
                toast.error("Properties load failed", message);
            })
            .finally(() => {
                if (!isMounted) return;
                setIsLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [saleRent, selectedChip, search, sortBy, currentPage, itemsPerPage]);

    const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.rowKey));

    const toggleRow = (rowKey: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(rowKey)) next.delete(rowKey);
            else next.add(rowKey);
            return next;
        });
    };

    const toggleSelectAllPage = () => {
        if (allPageSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                pageRows.forEach((r) => next.delete(r.rowKey));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                pageRows.forEach((r) => next.add(r.rowKey));
                return next;
            });
        }
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="relative rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col gap-[20px]">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[15px] bg-white/60">
                        <Loader size={80} margin={0} />
                    </div>
                )}
                {/* Top bar: Sale/Rent + search + chips + sort + actions */}
                <div className="flex flex-col gap-[14px] xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
                    <div className="flex gap-[12px] lg:flex-row flex-wrap lg:items-center lg:gap-[5px] min-w-0 flex-1 justify-between">
                        {/* sale rent chips */}
                        <div className="flex gap-[12px]">
                            <div className="flex items-center gap-[8px] relative">

                                {/* ✅ Chips (ONLY 2XL) */}
                                <div className="hidden 2xl:flex items-center gap-[8px]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSaleRent("Sale");
                                            setSelectedChip("all");
                                        }}
                                        className={`rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] ${saleRent === "Sale"
                                            ? "bg-[#222] text-white"
                                            : "bg-white border border-[rgba(34,34,34,0.10)] text-[#222]"
                                            }`}
                                    >
                                        Sale
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSaleRent("Rent");
                                            setSelectedChip("all");
                                        }}
                                        className={`rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] ${saleRent === "Rent"
                                            ? "bg-[#222] text-white"
                                            : "bg-white border border-[rgba(34,34,34,0.10)] text-[#222]"
                                            }`}
                                    >
                                        Rent
                                    </button>
                                </div>

                                {/* ✅ Dropdown (lg, md, sm) */}
                                <div className="block 2xl:hidden relative" ref={saleRentDropdownRef}    >
                                    <button
                                        onClick={() => setIsSaleRentOpen((prev) => !prev)}
                                        className="h-[33px] min-w-[10px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] text-[12px] font-[SemiBold] flex items-center justify-between gap-[6px]"
                                    >
                                        {saleRent}
                                        <DownArrowIcon
                                            width={10}
                                            height={6}
                                            className={`transition-transform ${isSaleRentOpen ? "rotate-180" : ""
                                                }`}
                                        />
                                    </button>

                                    {isSaleRentOpen && (
                                        <div className="absolute top-[40px] left-0 z-30 min-w-[140px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white shadow-md">
                                            {(["Sale", "Rent"] as const).map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        setSaleRent(type);
                                                        setSelectedChip("all");
                                                        setIsSaleRentOpen(false);
                                                    }}
                                                    className="w-full text-left px-[14px] py-[8px] text-[12px] font-[SemiBold] text-[#222] hover:bg-[#F5F5F5]"
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] lg:w-[215px] xl:w-[277px]">
                                <SearchIcon className="text-[#707070] shrink-0" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search here"
                                    className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
                                />
                            </div>
                        </div>
                        {/* filters */}
                        <div className="flex gap-[12px]">
                            <div className="flex items-center gap-[8px] relative">
                                {/* Chips (ONLY 2XL) */}
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

                                {/* Dropdown (lg, md, sm) */}
                                <div className="block 2xl:hidden relative" ref={chipDropdownRef}>
                                    <button
                                        onClick={() => setIsChipDropdownOpen((prev) => !prev)}
                                        className="h-[33px] w-[100px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] text-[12px] font-[SemiBold] flex items-center justify-between gap-[6px] cursor-pointer"
                                    >
                                        <span className="text-left truncate w-[50px]">{selectedChipLabel}</span>
                                        <DownArrowIcon
                                            width={10}
                                            height={6}
                                            className={`transition-transform ${isChipDropdownOpen ? "rotate-180" : ""
                                                }`}
                                        />
                                    </button>

                                    {isChipDropdownOpen && (
                                        <div className="absolute top-[40px] left-0 z-30 min-w-[160px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white shadow-md">
                                            {listingTypeChips.map((chip) => (
                                                <button
                                                    key={chip.value}
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
                            <div className="flex flex-wrap items-center gap-[10px] shrink-0">
                                <div className="relative flex items-center gap-[8px]" ref={sortRef}>
                                    <span className="text-[12px] font-[SemiBold] text-[#222] whitespace-nowrap">Sort by:</span>
                                    <button
                                        type="button"
                                        onClick={() => setIsSortOpen((o) => !o)}
                                        className="h-[33px] w-[108px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center justify-between gap-[8px] cursor-pointer"
                                    >
                                        <span className="truncate">{selectedSortLabel}</span>
                                        <DownArrowIcon width={10} height={6} className={`shrink-0 transition-transform ${isSortOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {isSortOpen && (
                                        <div className="absolute right-0 top-[40px] z-30 min-w-[200px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white py-[6px] shadow-[0_8px_20px_rgba(0,0,0,0.10)] max-h-[200px] overflow-y-auto">
                                            {sortOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setSortBy(opt.value);
                                                        setIsSortOpen(false);
                                                    }}
                                                    className={`w-full px-[14px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${sortBy === opt.value ? "text-[#0832AE]" : "text-[#222]"}`}
                                                >
                                                    {opt.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* actions */}
                            <div className="flex flex-wrap items-center gap-[10px]">
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center gap-[6px] h-[33px] px-[14px] rounded-full text-[12px] font-[SemiBold] text-[#222] bg-[#f5f5f5] opacity-40"
                                >
                                    <TrashIcon width={16} height={16} fill="#222" />
                                    Delete
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate("/agent/properties-management/add-property")}
                                    className="inline-flex items-center justify-center gap-[6px] h-[33px] px-[16px] rounded-full bg-[#D4A373] text-white text-[12px] font-[SemiBold] cursor-pointer"
                                >
                                    <PlusIcon width={14} height={14} />
                                    Add property
                                </button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto w-full scrollbar-hide -mx-1 px-1">
                    <div className="min-w-[1410px] rounded-[12px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                        <div className="grid grid-cols-[40px_minmax(220px,1.4fr)_minmax(100px,1fr)_minmax(88px,0.75fr)_minmax(100px,1fr)_minmax(88px,0.85fr)_112px] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                            <div className="flex justify-center">
                                <label className="relative">
                                    <input
                                        type="checkbox"
                                        checked={allPageSelected}
                                        onChange={toggleSelectAllPage}
                                        className="peer hidden "
                                    />
                                    <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                                        {allPageSelected ? <TickIcon width={10} height={10} /> : null}
                                    </div>
                                </label>
                            </div>
                            <p className="text-[13px] md:text-[14px] font-[Bold] text-[#222]">Property Details</p>
                            <p className="text-[13px] md:text-[14px] font-[Bold] text-[#222]">Property for</p>
                            <p className="text-[13px] md:text-[14px] font-[Bold] text-[#222]">Area</p>
                            <p className="text-[13px] md:text-[14px] font-[Bold] text-[#222]">{saleRent === "Sale" ? "AED" : "AED/month"}</p>
                            <p className="text-[13px] md:text-[14px] font-[Bold] text-[#222]">Status</p>
                            <p className="text-[13px] md:text-[14px] font-[Bold] text-[#222]">Actions</p>
                        </div>

                        {pageRows.map((row, idx) => (
                            <div
                                key={row.rowKey}
                                className={`grid grid-cols-[40px_minmax(220px,1.4fr)_minmax(100px,1fr)_minmax(88px,0.75fr)_minmax(100px,1fr)_minmax(88px,0.85fr)_112px] gap-2 items-center px-[14px] py-[14px] ${idx !== pageRows.length - 1 ? "border-b border-[rgba(34,34,34,0.06)]" : ""}`}
                            >
                                <div className="flex justify-center">
                                    <label className="relative">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(row.rowKey)}
                                            onChange={() => toggleRow(row.rowKey)}
                                            className="peer hidden "
                                        />
                                        <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                                            {selectedIds.has(row.rowKey) ? <TickIcon width={10} height={10} /> : null}
                                        </div>
                                    </label>
                                </div>
                                <div className="flex items-center gap-[12px] min-w-0">
                                    <img
                                        src={row.image}
                                        alt=""
                                        className="h-[60px] w-[60px] rounded-[10px] object-cover shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-[Bold] text-[#222] truncate">{row.title}</p>
                                        <p className="text-[12px] font-[Regular] text-[#707070] truncate mt-[4px] inline-flex items-center gap-[4px]">
                                            <span className="shrink-0 inline-flex">
                                                <LocationIcon width={11} height={15} />
                                            </span>
                                            {row.location}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    className={`inline-flex w-fit items-center rounded-[6px] px-[10px] py-[4px] text-[11px] font-[SemiBold] ${propertyForBadgeClass(row.propertyFor)}`}
                                >
                                    {row.propertyFor}
                                </span>
                                <p className="text-[12px] font-[Regular] text-[#222]">{row.area}</p>
                                <p className="text-[12px] font-[SemiBold] text-[#222]">{row.priceMonthly}</p>
                                <span
                                    className={`inline-flex w-fit items-center rounded-[5px] px-[10px] text-[12px] font-[SemiBold] ${statusBadgeClass(row.status)}`}
                                >
                                    {row.status}
                                </span>
                                <div className="flex items-center justify-end gap-[4px]">
                                    <button onClick={() => navigate(`/agent/properties-management-details/${row.id}`, { state: { property: row.raw } })} type="button" className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]" aria-label="View">
                                        <EyeDarkIcon width={20} height={20} />
                                    </button>
                                    <button
                                        onClick={() =>
                                            navigate("/agent/properties-management/edit-property", {
                                                state: { propertyId: row.id || row.raw?._id },
                                            })
                                        }
                                        type="button"
                                        className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#707070]"
                                        aria-label="Edit"
                                    >
                                        <EditIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] text-[#E53E3E]" aria-label="Delete">
                                        <TrashIcon width={20} height={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {!pageRows.length && !isLoading && (
                            <div className="px-[14px] py-[18px] text-[12px] text-[#707070]">No properties found.</div>
                        )}
                    </div>
                </div>

                <div className="pt-[4px]">
                    <Pagenation currentPage={currentPage} totalItems={totalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
                </div>
            </div>
        </div>
    );
};

export default PropertiesManagement;