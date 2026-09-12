import { useMemo, useState, useRef, useEffect } from "react";
import mainbg from "../../../assets/img/mainbg.png";
import homeimg from '../../../assets/img/home.png'
import {
    AgencyIcon1,
    AgencyIcon2,
    AgencyIcon3,
    AgencyIcon4,
    AgencyIcon5,
    AgencyIcon6,
    AgencyIcon7,
    AgencyIcon8,
    RightArrowIcon,
    DownArrowIcon,
    WhatsappIcon,
    CallIcon,
    MessageIcon,
    ListingIcon,
    DashListingIcon,
    QuestionMarkIcon,
    InquireIcon,
} from "../../../components/CustomFile/icons";
import {
    agentService,
    type AgentSupportedUrlsMasterData,
    type AgentDashboardStats,
    type AgentDashboardResponse,
    type AgentDashboardInquiryItem,
    type AgentDashboardPropertyItem,
    type AgentListingTypeMasterItem,
    type AgentSortByPropertyMasterItem,
} from "../../../services/agentService";
import { toast } from "../../../services/toast";
import Loader from "../../../components/Loader/loader";
import { API_BASE_URL } from "../../../services/apiClient";
import AgentHeader from "../../../components/Header/AgentHeader";
import { useAgentLayout } from "../../../context/AgentLayoutContext";
import { useNavigate } from "react-router-dom";

type MetricTemplate = {
    key: keyof AgentDashboardStats;
    title: string;
    iconBg: string;
    cardBg: string;
    icon: (typeof AgencyIcon1);
    /** if true, show amount + currency instead of count */
    isMoney?: boolean;
};

const metricCardTemplates: MetricTemplate[] = [
    {
        key: "totalRevenueSalesAndRent",
        title: "Total revenues by sales & renting",
        iconBg: "bg-gradient-to-br from-[#4ADE80] to-[#16A34A] text-[#0A0A0A]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon6,
        isMoney: true,
    },
    {
        key: "activeListings",
        title: "Active listings",
        iconBg: "bg-gradient-to-br from-[#C9A96E] to-[#9B7B42] text-[#0A0A0A]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon1,
    },
    {
        key: "totalListings",
        title: "Total listings",
        iconBg: "bg-gradient-to-br from-[#38BDF8] to-[#0284C7] text-[#0A0A0A]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: DashListingIcon,
    },
    {
        key: "totalRentProperties",
        title: "Total rent properties",
        iconBg: "bg-gradient-to-br from-[#EC4899] to-[#BE185D] text-[#0A0A0A]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon5,
    },
    {
        key: "totalSaleProperties",
        title: "Total sale properties",
        iconBg: "bg-gradient-to-br from-[#C7A335] to-[#A17C15] text-[#0A0A0A]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon4,
    },
    {
        key: "totalInquiries",
        title: "Total number of inquiries",
        iconBg: "bg-gradient-to-br from-[#FB923C] to-[#C2410C] text-[#0A0A0A]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: QuestionMarkIcon,
    },
    {
        key: "newInquiries",
        title: "Total number of new inquiries",
        iconBg: "bg-gradient-to-br from-[#F87171] to-[#DC2626] text-[#0A0A0A]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: InquireIcon,
    },
    {
        key: "dealsClosed",
        title: "Total deals closed (including sales & rent)",
        iconBg: "bg-gradient-to-br from-[#A855F7] to-[#7E22CE] text-[#0A0A0A]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon7,
    },
];
type InquiryContactType = "whatsapp" | "call" | "message";

type InquiryRow = {
    inquiryId: string;
    property: string;
    location: string;
    contactType: InquiryContactType;
    name: string;
    detail: string;
};

const inquiryContactStyles = {
    whatsapp: {
        container: "bg-[#26D366]",
        Icon: WhatsappIcon,
    },
    call: {
        container: "bg-[#D4A373]",
        Icon: CallIcon,
    },
    message: {
        container: "bg-[#0832AE]",
        Icon: MessageIcon,
    },
};
function AgentDashboard() {
    const navigate = useNavigate();
    const { shellHeader } = useAgentLayout();
    const [activeTab, setActiveTab] = useState("all");
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [selectedSort, setSelectedSort] = useState("featured");
    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const [dashboardData, setDashboardData] = useState<AgentDashboardResponse | null>(null);
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [propertyImageBaseUrl, setPropertyImageBaseUrl] = useState<string | null>(null);
    const [listingTypeTabs, setListingTypeTabs] = useState<AgentListingTypeMasterItem[]>([]);
    const [sortOptions, setSortOptions] = useState<AgentSortByPropertyMasterItem[]>([
        { name: "Featured", value: "featured" },
    ]);
    const [isTabDropdownOpen, setIsTabDropdownOpen] = useState(false);
    const tabDropdownRef = useRef<HTMLDivElement>(null);        // ✅ For tab dropdown  
    const handleTabClickOutside = (event: MouseEvent) => {
        if (tabDropdownRef.current && !tabDropdownRef.current.contains(event.target as Node)) {
            setIsTabDropdownOpen(false);
        }
    };
    useEffect(() => {
        document.addEventListener("mousedown", handleTabClickOutside);
        return () => document.removeEventListener("mousedown", handleTabClickOutside);
    }, []);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setIsSortDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        let isMounted = true;
        agentService
            .getListingTypesMasterData()
            .then((data) => {
                if (!isMounted) return;
                const options = (data?.listingTypes ?? data?.listingtypes ?? [])
                    .filter((item) => item?.slug !== "new-projects")
                    .sort((a, b) => {
                        const aOrder = Number(a?.displayOrder ?? Number.MAX_SAFE_INTEGER);
                        const bOrder = Number(b?.displayOrder ?? Number.MAX_SAFE_INTEGER);
                        return aOrder - bOrder;
                    });
                setListingTypeTabs(options);
            })
            .catch(() => {
                // keep only default "All" tab on failure.
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallback = `${fallbackOrigin}/uploads/img/property/`;

        const extractPropertyImgBase = (data: AgentSupportedUrlsMasterData): string | null => {
            const fromObject = (obj: unknown): string | null => {
                if (!obj || typeof obj !== "object") return null;
                const propertyUrl = (obj as { propertyUrl?: unknown }).propertyUrl;
                if (!propertyUrl || typeof propertyUrl !== "object") return null;
                const img = (propertyUrl as { img?: unknown }).img;
                return typeof img === "string" && img.trim() ? img : null;
            };

            const candidates: unknown[] = [data?.supportedUrls, data?.supportedurls, data?.items];
            for (const candidate of candidates) {
                if (Array.isArray(candidate)) {
                    for (const row of candidate) {
                        const value = fromObject(row);
                        if (value) return value;
                    }
                    continue;
                }
                const value = fromObject(candidate);
                if (value) return value;
            }
            return null;
        };

        agentService
            .getSupportedUrlsMasterData()
            .then((data) => {
                if (!isMounted) return;
                const resolved = extractPropertyImgBase(data);
                setPropertyImageBaseUrl((resolved ?? fallback).replace(/\/?$/, "/"));
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
                if (!options.length) return;
                setSortOptions(options);
                setSelectedSort((current) =>
                    options.some((option) => option.value === current) ? current : options[0].value
                );
            })
            .catch(() => {
                // keep default on failure.
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        setIsDashboardLoading(true);
        agentService
            .getDashboard({
                listingType: activeTab === "all" ? undefined : activeTab,
                sortBy: selectedSort,
                page: 1,
                limit: 5,
                inquiriesLimit: 8,
            })
            .then((data) => {
                if (!isMounted) return;
                setDashboardData(data ?? null);
            })
            .catch((err: unknown) => {
                const message =
                    (err as { message?: string })?.message || "Unable to load dashboard data.";
                toast.error("Dashboard load failed", message);
            })
            .finally(() => {
                if (!isMounted) return;
                setIsDashboardLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [activeTab, selectedSort]);

    /**
     * UI mapping for KPI cards
     *
     * We keep the design (colors/gradients/icons/titles) as templates, then overlay
     * values from the API response (`stats`).
     *
     * - `value`: count or money (amount + currency)
     * - `badgeText`: change percentage from API
     * - `arrow` + `badgeBg`: based on `direction` ("up" | "down")
     *
     * During loading we show `--` so UI doesn't jump.
     */
    const stats: AgentDashboardStats | null = dashboardData?.stats ?? null;
    const formatNumber = (n: number) => new Intl.NumberFormat("en-IN").format(n);
    const formatMoney = (amount: number, currency?: string) =>
        `${formatNumber(Math.round(amount))} ${currency ?? "AED"}`;
    const formatPercent = (n: number) => `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(2)}%`;
    const toPropertyImageUrl = (image: string | null) => {
        if (!image) return homeimg;
        if (image.startsWith("http")) return image;
        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallbackBase = `${fallbackOrigin}/uploads/img/property/`;
        const base = (propertyImageBaseUrl || fallbackBase).replace(/\/?$/, "/");
        return `${base}${image}`;
    };

    const metricCards = useMemo(() => {
        return metricCardTemplates.map((tpl) => {
            const s = stats?.[tpl.key];
            const direction = s?.direction ?? "up";
            const badgeBg = direction === "up" ? "bg-[#00A663]" : "bg-[#D4A373]";
            const arrow = direction;
            const change = typeof s?.change === "number" ? s.change : 0;
            const badgeText = formatPercent(change);

            const value = isDashboardLoading
                ? "--"
                : tpl.isMoney
                    ? formatMoney(s?.amount ?? 0, s?.currency)
                    : formatNumber(s?.count ?? 0);

            return {
                ...tpl,
                value,
                badgeText,
                badgeBg,
                arrow,
            };
        });
    }, [isDashboardLoading, stats]);

    const projectTabs = useMemo(
        () => [
            { value: "all", label: "All" },
            ...listingTypeTabs.map((item) => ({
                value: item._id,
                label: item.name,
            })),
        ],
        [listingTypeTabs]
    );
    const selectedSortLabel =
        sortOptions.find((option) => option.value === selectedSort)?.name ?? "Featured";

    const projectRows: AgentDashboardPropertyItem[] = dashboardData?.properties?.items ?? [];

    const mapInquiryType = (rawType: string): InquiryContactType => {
        const normalized = (rawType || "").toLowerCase();
        if (normalized === "email" || normalized === "message") return "message";
        if (normalized === "whatsapp") return "whatsapp";
        return "call";
    };

    const inquiryRows: InquiryRow[] = (dashboardData?.recentInquiries ?? []).map(
        (item: AgentDashboardInquiryItem) => ({
            inquiryId: item.inquiryId,
            property: item.property?.title || "-",
            location: [item.property?.location?.city, item.property?.location?.zone]
                .filter(Boolean)
                .join(", ") || "-",
            contactType: mapInquiryType(item.inquiryType),
            name: item.customer?.name || "-",
            detail: item.contactDetail || "-",
        })
    );

    const navigateToPropertyLeadsFromInquiry = (item: InquiryRow) => {
        const contactTab =
            item.contactType === "whatsapp" ? "whatsapp" : item.contactType === "message" ? "email" : "call";
        const params = new URLSearchParams({ section: "new", contactType: contactTab });
        const name = item.property.trim();
        if (name && name !== "-") params.set("search", name);
        navigate(`/agent/leads/property?${params.toString()}`);
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            {/* Content */}
            <div className="p-[20px] md:p-[28px] h-auto rounded-[24px] gap-[20px] flex flex-col justify-between shadow-2xl overflow-hidden border border-[#2A2A2A]" style={{ backgroundImage: `linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(23, 23, 23, 0.90) 100%), url(${mainbg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', }}>
                <AgentHeader
                    variant="embedded"
                    title="Dashboard"
                    showBack={false}
                    onBackClick={() => { }}
                    profileImage={shellHeader.profileImage ?? undefined}
                    verified={shellHeader.verified}
                    agentType={shellHeader.agentType}
                />
                <div className="relative md:mt-[60px]">
                    {isDashboardLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-[#0A0A0A]/70 backdrop-blur-sm">
                            <Loader size={60} margin={0} />
                        </div>
                    )}
                    <div className="grid gap-[10px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {metricCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div
                                    key={card.title}
                                    className="flex flex-col justify-between rounded-[20px] p-[20px_20px_0px_20px] border border-[#2A2A2A] shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
                                    style={{
                                        background: card.cardBg,
                                    }}
                                >
                                    <div className="flex flex-col gap-[20px]">
                                        <div className="flex items-center gap-2 text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider h-[30px]">
                                            <span
                                                className={`flex flex-shrink-0 h-7 w-7 items-center justify-center rounded-lg shadow-sm ${card.iconBg}`}
                                            >
                                                <Icon className="flex-shrink-0" width={13} height={13} />
                                            </span>
                                            <span className="line-clamp-2">{card.title}</span>
                                        </div>
                                        <div className="md:text-[26px] text-[20px] text-[#F5F0E8] font-[Bold] w-full break-words leading-[1] h-[50px] flex items-end">{card.value}</div>
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-[Bold] mb-3 ${card.arrow === "up" ? "bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30" : "bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30"}`}
                                        >
                                            {card.badgeText}
                                            <span className="ml-[4px]">{card.arrow === "up" ? "▲" : "▼"}</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* Project and Location based projects */}
            <div className="mt-[20px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-[20px]">
                {/* Projects */}
                <div className="rounded-[20px] md:p-[28px] p-[20px] bg-[#111111] border border-[#2A2A2A] shadow-xl min-w-0 overflow-hidden">
                    {/* Project header */}
                    <div className="flex flex-wrap gap-4 items-center justify-between mb-[20px]">
                        <h2 className="text-[#F5F0E8] font-[Bold] text-[18px]">Listed properties</h2>
                        <div className="flex flex-wrap items-center gap-[16px]">
                            <div className="hidden 2xl:flex items-center gap-[8px]">
                                {projectTabs.map((tab) => (
                                    <button
                                        key={tab.value}
                                        onClick={() => setActiveTab(tab.value)}
                                        className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] px-[16px] h-[34px] rounded-full shrink-0 transition-all ${activeTab === tab.value
                                            ? "bg-[#C9A96E] text-[#0A0A0A] font-[Bold] shadow-md"
                                            : "bg-[#171717] border border-[#2A2A2A] text-[#A89880] hover:text-[#F5F0E8] hover:border-[#C9A96E]/40"
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            {/* Dropdown (SM → XL) */}
                            <div className="block 2xl:hidden relative" ref={sortDropdownRef}>
                                <div
                                    onClick={() => setIsTabDropdownOpen(!isTabDropdownOpen)}
                                    className="flex items-center justify-between gap-[8px] border border-[#2A2A2A] bg-[#171717] rounded-full px-[14px] h-[34px] cursor-pointer min-w-[120px] text-[#F5F0E8]"
                                >
                                    <span className="text-[#F5F0E8] text-[12px] font-[SemiBold]">
                                        {projectTabs.find(t => t.value === activeTab)?.label || "All"}
                                    </span>
                                    <DownArrowIcon
                                        className={`transition-transform duration-200 ${isTabDropdownOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </div>

                                {isTabDropdownOpen && (
                                    <div className="absolute left-0 top-[42px] w-full min-w-[150px] max-h-[200px] overflow-y-auto scrollbar-hide bg-[#171717] border border-[#2A2A2A] rounded-[12px] shadow-2xl py-[6px] z-10 flex flex-col">
                                        {projectTabs.map((tab) => (
                                            <div
                                                key={tab.value}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveTab(tab.value);
                                                    setIsTabDropdownOpen(false);
                                                }}
                                                className={`px-[16px] py-[9px] text-[12px] font-[Medium] cursor-pointer hover:bg-[#2A2A2A] transition-colors ${activeTab === tab.value
                                                    ? "text-[#C9A96E] bg-[#2A2A2A]"
                                                    : "text-[#F5F0E8]"
                                                    }`}
                                            >
                                                {tab.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="w-[1px] h-[20px] bg-[#2A2A2A] hidden sm:block shrink-0"></div>
                            <div className="flex items-center gap-[8px] shrink-0">
                                <span className="text-[#A89880] text-[12px] font-[Medium]">Sort by:</span>
                                <div className="relative" ref={sortDropdownRef}>
                                    <div
                                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                        className="flex items-center justify-between gap-[8px] border border-[#2A2A2A] bg-[#171717] rounded-full px-[14px] h-[34px] cursor-pointer min-w-[120px] text-[#F5F0E8] hover:border-[#C9A96E]/40 transition-colors"
                                    >
                                        <span className="text-[#F5F0E8] text-[12px] font-[SemiBold]">{selectedSortLabel}</span>
                                        <DownArrowIcon className={`transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isSortDropdownOpen && (
                                        <div className="absolute right-0 top-[42px] w-full min-w-[150px] max-h-[200px] overflow-y-auto scrollbar-hide bg-[#171717] border border-[#2A2A2A] rounded-[12px] shadow-2xl py-[6px] z-10 flex flex-col">
                                            {sortOptions.map((option) => (
                                                <div
                                                    key={option.value}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedSort(option.value);
                                                        setIsSortDropdownOpen(false);
                                                    }}
                                                    className={`px-[16px] py-[9px] text-[12px] font-[Medium] cursor-pointer hover:bg-[#2A2A2A] transition-colors ${selectedSort === option.value ? "text-[#C9A96E] bg-[#2A2A2A]" : "text-[#F5F0E8]"}`}
                                                >
                                                    {option.name}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Project table */}
                    <div className="overflow-x-auto w-full scrollbar-hide">
                        <div className="min-w-[890px]">
                            <div className="rounded-[16px] border border-[#2A2A2A] overflow-hidden bg-[#111111]">
                                <div className="grid grid-cols-[2.3fr_1.4fr_1.2fr_1.4fr_1fr] px-[16px] py-[14px] bg-[#171717] border-b border-[#2A2A2A]">
                                    <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Property Details</p>
                                    <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Property for</p>
                                    <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Beds</p>
                                    <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">AED</p>
                                    <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Status</p>
                                </div>

                                {projectRows.map((row, index) => (
                                    <div
                                        key={row.propertyId}
                                        className={`grid grid-cols-[2.3fr_1.4fr_1.2fr_1.4fr_1fr] px-[16px] py-[14px] hover:bg-[#171717]/60 transition-colors ${index !== projectRows.length - 1 ? "border-b border-[#2A2A2A]" : ""
                                            }`}
                                    >
                                        <div className="flex items-center gap-[12px]">
                                            <div className="w-[56px] h-[56px] rounded-[8px] overflow-hidden shrink-0 border border-[#2A2A2A] bg-[#171717]">
                                                <img src={toPropertyImageUrl(row.image)} alt="property" className="w-full h-full object-cover rounded-[8px]" />
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-[Bold] text-[#F5F0E8] leading-[1.2] mb-[4px]">{row.title}</p>
                                                <p className="text-[12px] text-[#A89880] leading-[1.2]">{[row.location?.city, row.location?.zone].filter(Boolean).join(", ") || "-"}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <span
                                                className={`inline-flex items-center rounded-[6px] px-2.5 py-1 text-[11px] font-[SemiBold] leading-none border ${row.listingLabel === "Buy"
                                                    ? "bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30" : row.listingLabel === "Rent"
                                                        ? "bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/30"
                                                        : row.listingLabel === "Commercial Buy"
                                                            ? "bg-[#EC4899]/10 text-[#EC4899] border-[#EC4899]/30"
                                                            : row.listingLabel === "Commercial Rent"
                                                                ? "bg-[#C7A335]/10 text-[#C7A335] border-[#C7A335]/30"
                                                                : "bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/30"
                                                    }`}
                                            >
                                                {row.listingLabel || "-"}
                                            </span>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="text-[12px] font-[Regular] text-[#F5F0E8]">{formatNumber(row.beds ?? 0)}</p>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="text-[12px] font-[Bold] text-[#F5F0E8]">{formatMoney(row.price ?? 0, row.currency)}</p>
                                        </div>

                                        <div className="flex items-center">
                                            <span
                                                className={`inline-flex items-center rounded-[6px] px-2.5 py-1 text-[11px] font-[SemiBold] leading-none border ${row.status?.toLowerCase() === "active"
                                                    ? "bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30" : row.status?.toLowerCase() === "sold"
                                                        ? "border-[#2A2A2A] bg-[#171717] text-[#A89880]"
                                                        : row.status?.toLowerCase() === "inactive"
                                                            ? "bg-[#F87171]/10 text-[#F87171] border-[#F87171]/30"
                                                            : row.status?.toLowerCase() === "rented"
                                                                ? "border-[#2A2A2A] bg-[#171717] text-[#A89880]"
                                                                : "bg-[#EC4899]/10 text-[#EC4899] border-[#EC4899]/30"
                                                    }`}
                                            >
                                                {row.status || "-"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {!projectRows.length && !isDashboardLoading && (
                                    <div className="px-[16px] py-[28px] text-[13px] text-[#A89880] text-center">
                                        No properties found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate("/agent/properties-management")}
                        className="mt-[20px] rounded-[10px] w-full h-[40px] bg-[#171717] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-[#F5F0E8] text-[13px] font-[Bold] cursor-pointer transition-colors"
                    >
                        View all
                    </button>
                </div>

                {/* New inquiries */}
                <div className="rounded-[20px] bg-[#111111] border border-[#2A2A2A] shadow-xl min-w-0 p-[20px] flex flex-col">
                    <h2 className="text-[#F5F0E8] font-[Bold] text-[18px] mb-[16px]">New inquiries</h2>

                    <div className="max-h-[600px] overflow-y-auto pr-[0px] flex flex-col gap-[10px]">
                        {inquiryRows.map((item, index) => {
                            const contactStyle = inquiryContactStyles[item.contactType];
                            const ContactIcon = contactStyle.Icon;

                            return (
                                <button
                                    key={item.inquiryId}
                                    type="button"
                                    onClick={() => navigateToPropertyLeadsFromInquiry(item)}
                                    className="cursor-pointer rounded-[14px] bg-[#171717] hover:bg-[#2A2A2A] border border-[#2A2A2A] p-[16px] text-left transition-colors group"
                                >
                                    <div className="mb-[12px]">
                                        <p className="text-[14px] font-[Bold] text-[#F5F0E8] group-hover:text-[#C9A96E] leading-[1.2] mb-[6px] w-[180px] flex-wrap transition-colors">{item.property}</p>
                                        <p className="text-[12px] font-[Regular] text-[#A89880] flex items-center gap-[6px] leading-[1.2]">
                                            <span className="inline-flex h-[14px] w-[14px] items-center justify-center text-[#C9A96E]">
                                                <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6 7.875C7.24264 7.875 8.25 6.86764 8.25 5.625C8.25 4.38236 7.24264 3.375 6 3.375C4.75736 3.375 3.75 4.38236 3.75 5.625C3.75 6.86764 4.75736 7.875 6 7.875Z" stroke="#C9A96E" strokeWidth="1.1" />
                                                    <path d="M10.5 5.625C10.5 9.17242 6.75 12.75 6 12.75C5.25 12.75 1.5 9.17242 1.5 5.625C1.5 3.13972 3.51472 1.125 6 1.125C8.48528 1.125 10.5 3.13972 10.5 5.625Z" stroke="#C9A96E" strokeWidth="1.1" />
                                                </svg>
                                            </span>
                                            {item.location}
                                        </p>
                                    </div>

                                    <div className="h-[1px] w-full bg-[#2A2A2A] my-2" />

                                    <div className="pt-2 flex items-center justify-between gap-[10px]">
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <span className={`h-[30px] w-[30px] rounded-[9px] flex items-center justify-center shrink-0 ${contactStyle.container}`}>
                                                <ContactIcon width={16} height={16} />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Bold] text-[#F5F0E8] leading-[1.2] mb-[2px] capitalize">{item.name}</p>
                                                <p className="text-[12px] font-[Regular] text-[#A89880] leading-[1.2] truncate">{item.detail}</p>
                                            </div>
                                        </div>
                                        <RightArrowIcon className="w-[8px] h-[12px] shrink-0 text-[#A89880] group-hover:text-[#C9A96E] group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </button>
                            );
                        })}
                        {!inquiryRows.length && !isDashboardLoading && (
                            <div className="text-[12px] font-[Medium] text-[#A89880] py-[12px] px-[8px] text-center">No inquiries found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AgentDashboard;
