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
        // iconBg: "bg-[#EA3934]",
        iconBg: "bg-[#00C853]",
        cardBg:
            "linear-gradient(180deg,rgba(0, 166, 99, 0) 42.64%,rgba(0, 166, 99, 0.2) 100%), #ffffff",
        icon: AgencyIcon6,
        isMoney: true,
    },
    {
        key: "activeListings",
        title: "Active listings",
        iconBg: "bg-[#EA3934]",
        cardBg:
            "linear-gradient(180deg,rgba(234, 57, 52, 0) 42.64%,rgba(234, 57, 52, 0.20) 100%), #ffffff",
        icon: AgencyIcon1,
    },
    {
        key: "totalListings",
        title: "Total listings",
        iconBg: "bg-[#0832AE]",
        cardBg:
            "linear-gradient(180deg,rgba(8, 50, 174, 0) 42.64%,rgba(8, 50, 174, 0.20) 100%), #ffffff",
        icon: DashListingIcon,
    },
    {
        key: "totalRentProperties",
        title: "Total rent properties",
        iconBg: "bg-[#FF46A2]",
        cardBg:
            "linear-gradient(180deg,rgba(255, 70, 162, 0) 42.64%,rgba(255, 70, 162, 0.20) 100%), #ffffff",
        icon: AgencyIcon5,

    },
    {
        key: "totalSaleProperties",
        title: "Total sale properties",
        iconBg: "bg-[#C7A335]",
        cardBg:
            "linear-gradient(180deg,rgba(199, 163, 53, 0) 42.64%,rgba(199, 163, 53, 0.20) 100%), #ffffff",
        icon: AgencyIcon4,
    },
    {
        key: "totalInquiries",
        title: "Total number of inquiries",
        iconBg: "bg-[#F28D6A]",
        cardBg:
            "linear-gradient(180deg,rgba(242, 141, 106, 0) 42.64%,rgba(242, 141, 106, 0.20) 100%), #ffffff",
        icon: QuestionMarkIcon,

    },
    {
        key: "newInquiries",
        title: "Total number of new inquiries",
        iconBg: "bg-[#E80808]",
        cardBg:
            "linear-gradient(180deg, rgba(232, 8, 8, 0.00) 42.64%, var(--red, rgba(232, 8, 8, 0.20)) 100%), var(--White, #FFF)",
        icon: InquireIcon,

    },
    {
        key: "dealsClosed",
        title: "Total deals closed (including sales & rent)",
        iconBg: "bg-[#8E68E2]",
        cardBg:
            "linear-gradient(180deg, rgba(142, 104, 226, 0.00) 42.64%, rgba(142, 104, 226, 0.20) 100%), var(--White, #FFF)",
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
        container: "bg-[#EA3934]",
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
            const badgeBg = direction === "up" ? "bg-[#00A663]" : "bg-[#EA3934]";
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
            <div className="p-[20px] h-auto rounded-[15px] gap-[20px] flex flex-col justify-between" style={{ backgroundImage: `url(${mainbg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', }}>
                <AgentHeader
                    variant="embedded"
                    title="Dashboard"
                    showBack={false}
                    onBackClick={() => { }}
                    profileImage={shellHeader.profileImage ?? undefined}
                    verified={shellHeader.verified}
                    agentType={shellHeader.agentType}
                />
                <div className="relative md:mt-[80px]">
                    {isDashboardLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[15px] bg-white/60">
                            <Loader size={80} margin={0} />
                        </div>
                    )}
                    {/* <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {metricCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div
                                    key={card.title}
                                    className={`flex flex-col justify-between rounded-[15px] p-[20px_20px_0px_20px]`}
                                    style={{
                                        background: card.cardBg,
                                    }}
                                >
                                    <div className="">
                                        <div className="flex flex-col gap-2 justify-center">
                                            <p className="mb-2 flex items-center gap-2 text-[12px] font-[Medium] text-[#222]">
                                                <span
                                                    className={`flex flex-shrink-0 h-6 w-6 items-center justify-center rounded-full ${card.iconBg}`}
                                                >
                                                    <Icon className="flex-shrink-0 h-3.5 w-3.5" width={12} height={12} />
                                                </span>
                                                {card.title}
                                            </p>
                                            <p className="text-[30px] text-[#222] font-semibold w-[180px] break-words leading-[1]">{card.value}</p>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex justify-end">
                                        <span
                                            className={`inline-flex items-center min-w-[30px] rounded-[10px_10px_0px_0px] p-[6px_6px_2px_6px] text-[10px] font-[SemiBold] text-white ${card.badgeBg}`}
                                        >
                                            {card.badgeText}
                                            {card.arrow === "up" ? (
                                                <span className="ml-[4px]">▲</span>
                                            ) : (
                                                <span className="ml-[4px]">▼</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div> */}
                    <div className="grid gap-[10px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {metricCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div
                                    key={card.title}
                                    className="flex flex-col justify-between rounded-[15px] p-[25px_25px_0px_25px]"
                                    style={{ background: card.cardBg }}
                                >
                                    <div className="flex flex-col gap-[25px]">

                                        {/* ✅ TITLE FIXED HEIGHT */}
                                        <div className="flex items-center gap-2 text-[12px] font-[Medium] text-[#222] h-[30px]">
                                            <span
                                                className={`flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full ${card.iconBg}`}
                                            >
                                                <Icon width={12} height={12} />
                                            </span>
                                            <span className="line-clamp-2">
                                                {card.title}
                                            </span>
                                        </div>

                                        {/* ✅ VALUE FIXED HEIGHT */}
                                        <div className="mt-auto flex flex-col justify-end md:text-[28px] text-[20px] text-[#222] font-semibold leading-[1] md:w-[180px] lg:w-[150px] xl:w-[180px] w-full break-words h-[55px]">
                                            {card.value}
                                        </div>

                                    </div>

                                    {/* Badge */}
                                    <div className="flex justify-end">
                                        <span
                                            className={`inline-flex items-center min-w-[30px] rounded-[10px_10px_0px_0px] p-[6px_6px_2px_6px] text-[10px] font-[SemiBold] text-white ${card.badgeBg}`}
                                        >
                                            {card.badgeText}
                                            {card.arrow === "up" ? (
                                                <span className="ml-[4px]">▲</span>
                                            ) : (
                                                <span className="ml-[4px]">▼</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* <div className="grid gap-[10px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {metricCards.map((card) => {
                            const Icon = card.icon;
                            return (
                                <div
                                    key={card.title}
                                    className={`flex flex-col justify-between rounded-[15px] p-[25px_25px_0px_25px]`}
                                    style={{
                                        background: card.cardBg,
                                    }}
                                >
                                    <div className="flex flex-col gap-[25px]">
                                        <div className="flex items-center gap-2 text-[12px] font-[Medium] text-[#222]">
                                            <span
                                                className={`flex flex-shrink-0 h-6 w-6 items-center justify-center rounded-full ${card.iconBg}`}
                                            >
                                                <Icon className="flex-shrink-0" width={12} height={12} />
                                            </span>
                                            {card.title}
                                        </div>
                                        <div className="md:text-[30px] text-[20px] text-[#222] font-semibold md:w-[180px] lg:w-[150px] xl:w-[180px] w-full break-words leading-[1]">{card.value}</div>
                                    </div>
                                    <div className="flex justify-end">
                                        <span
                                            className={`inline-flex items-center min-w-[30px] rounded-[10px_10px_0px_0px] p-[6px_6px_2px_6px] text-[10px] font-[SemiBold] text-white ${card.badgeBg}`}
                                        >
                                            {card.badgeText}
                                            {card.arrow === "up" ? (
                                                <span className="ml-[4px]">▲</span>
                                            ) : (
                                                <span className="ml-[4px]">▼</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div> */}
                </div>
            </div>
            {/* Project and Location based projects */}
            <div className="mt-[14px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-[14px]">
                {/* Projects */}
                <div className="bg-[#F5F5F5] rounded-[15px] md:p-[22px_30px_30px_30px] p-[20px] bg-[#fff] min-w-0 overflow-hidden">
                    {/* Project header */}
                    <div className="flex flex-wrap gap-4 items-center justify-between mb-[16px]">
                        <h2 className="text-[#222] font-[Bold] text-[20px]">Listed properties</h2>
                        <div className="flex flex-wrap items-center gap-[16px]">
                            <div className="hidden 2xl:flex items-center gap-[10px]">
                                {projectTabs.map((tab) => (
                                    <button
                                        key={tab.value}
                                        onClick={() => setActiveTab(tab.value)}
                                        className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] p-[0px_15px] h-[33px] rounded-full shrink-0 transition-colors ${activeTab === tab.value
                                            ? "bg-[#222] text-[#fff]"
                                            : "bg-[#fff] border border-[#EAEAEA] text-[#222] hover:bg-[#F5F5F5]"
                                            }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            {/* ✅ Dropdown (SM → XL) */}
                            <div className="block 2xl:hidden relative" ref={sortDropdownRef}>
                                <div
                                    onClick={() => setIsTabDropdownOpen(!isTabDropdownOpen)}
                                    className="flex items-center justify-between gap-[8px] border border-[#EAEAEA] bg-white rounded-full px-[16px] h-[38px] cursor-pointer min-w-[120px]"
                                >
                                    <span className="text-[#222] text-[13px] font-[Medium]">
                                        {projectTabs.find(t => t.value === activeTab)?.label || "All"}
                                    </span>
                                    <DownArrowIcon
                                        className={`transition-transform duration-200 ${isTabDropdownOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </div>

                                {isTabDropdownOpen && (
                                    <div className="absolute left-0 top-[45px] w-full min-w-[150px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-10 flex flex-col max-h-[200px] overflow-y-auto scrollbar-hide">
                                        {projectTabs.map((tab) => (
                                            <div
                                                key={tab.value}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveTab(tab.value);
                                                    setIsTabDropdownOpen(false);
                                                }}
                                                className={`px-[16px] py-[10px] text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] ${activeTab === tab.value
                                                    ? "text-[#00A663] bg-[#F5F5F5]"
                                                    : "text-[#222]"
                                                    }`}
                                            >
                                                {tab.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="w-[1px] h-[20px] bg-gray-300 hidden sm:block shrink-0"></div>
                            <div className="flex items-center gap-[8px] shrink-0">
                                <span className="text-[#707070] text-[13px] font-[Medium]">Sort by:</span>
                                <div className="relative" ref={sortDropdownRef}>
                                    <div
                                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                        className="flex items-center justify-between gap-[8px] border border-[#EAEAEA] bg-white rounded-full px-[16px] h-[38px] cursor-pointer min-w-[120px]"
                                    >
                                        <span className="text-[#222] text-[13px] font-[Medium]">{selectedSortLabel}</span>
                                        <DownArrowIcon className={`transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isSortDropdownOpen && (
                                        <div className="absolute right-0 top-[45px] w-full min-w-[150px] max-h-[200px] overflow-y-auto scrollbar-hide bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-10 flex flex-col">
                                            {sortOptions.map((option) => (
                                                <div
                                                    key={option.value}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedSort(option.value);
                                                        setIsSortDropdownOpen(false);
                                                    }}
                                                    className={`px-[16px] py-[10px] text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors ${selectedSort === option.value ? "text-[#00A663] bg-[#F5F5F5]" : "text-[#222]"}`}
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
                            <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                                <div className="grid grid-cols-[2.3fr_1.4fr_1.2fr_1.4fr_1fr] px-[14px] py-[10px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Property Details</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Property for</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Beds</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">AED</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                                </div>

                                {projectRows.map((row, index) => (
                                    <div
                                        key={row.propertyId}
                                        className={`grid grid-cols-[2.3fr_1.4fr_1.2fr_1.4fr_1fr] px-[14px] py-[10px] ${index !== projectRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""
                                            }`}
                                    >
                                        <div className="flex items-center gap-[10px]">
                                            <div className="w-[60px] h-[60px] rounded-[8px] bg-cover bg-center shrink-0">
                                                <img src={toPropertyImageUrl(row.image)} alt="property" className="w-full h-full object-cover rounded-[8px]" />
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] mb-[4px]">{row.title}</p>
                                                <p className="text-[12px] text-[#707070] leading-[1.2]">{[row.location?.city, row.location?.zone].filter(Boolean).join(", ") || "-"}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <span
                                                className={`inline-flex items-center rounded-[6px] p-[6px_10px] text-[12px] font-[SemiBold] leading-none ${row.listingLabel === "Buy"
                                                    ? "bg-[rgba(0,166,99,0.10)] text-[#00A663]" : row.listingLabel === "Rent"
                                                        ? "bg-[rgba(234,57,52,0.10)] text-[#EA3934]"
                                                        : row.listingLabel === "Commercial Buy"
                                                            ? "bg-[rgba(255,70,162,0.10)] text-[#FF46A2]"
                                                            : row.listingLabel === "Commercial Rent"
                                                                ? "bg-[rgba(199,163,53,0.10)] text-[#C7A335]"
                                                                : "bg-[rgba(234,57,52,0.10)] text-[#EA3934]"
                                                    }`}
                                            >
                                                {row.listingLabel || "-"}
                                            </span>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="text-[12px] font-[Regular] text-[#222]">{formatNumber(row.beds ?? 0)}</p>
                                        </div>
                                        <div className="flex items-center">
                                            <p className="text-[12px] font-[Regular] text-[#222]">{formatMoney(row.price ?? 0, row.currency)}</p>
                                        </div>

                                        <div className="flex items-center">
                                            <span
                                                className={`inline-flex items-center rounded-[6px] p-[6px_10px] text-[12px] font-[SemiBold] leading-none ${row.status?.toLowerCase() === "active"
                                                    ? "bg-[#00A663] text-[#FFF]" : row.status?.toLowerCase() === "sold"
                                                        ? "border border-[rgba(34, 34, 34, 0.10)] text-[#222]"
                                                        : row.status?.toLowerCase() === "inactive"
                                                            ? "bg-[#E80808] text-[#FFF]"
                                                            : row.status?.toLowerCase() === "rented"
                                                                ? "border border-[rgba(34, 34, 34, 0.10)] text-[#222]"
                                                                : "bg-[rgba(255,70,162,0.10)] text-[#FF46A2]"
                                                    }`}
                                            >
                                                {row.status || "-"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {!projectRows.length && !isDashboardLoading && (
                                    <div className="px-[14px] py-[18px] text-[12px] text-[#707070]">
                                        No properties found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate("/agent/properties-management")}
                        className="mt-[20px] rounded-[5px] w-full h-[37px] bg-[rgba(34,34,34,0.10)] text-[#222] text-[14px] font-[SemiBold] cursor-pointer"
                    >
                        View all
                    </button>
                </div>

                {/* New inquiries */}
                <div className="rounded-[15px] bg-[#fff]  min-w-0">
                    <h2 className="text-[#222] font-[Bold] text-[20px] md:p-[30px_30px_0px_30px] p-[20px]">New inquiries</h2>

                    <div className="max-h-[600px] overflow-y-auto pr-[0px] flex flex-col gap-[10px] ">
                        {inquiryRows.map((item, index) => {
                            const contactStyle = inquiryContactStyles[item.contactType];
                            const ContactIcon = contactStyle.Icon;

                            return (
                                <button
                                    key={item.inquiryId}
                                    type="button"
                                    onClick={() => navigateToPropertyLeadsFromInquiry(item)}
                                    className={`cursor-pointer rounded-[14px] bg-[#fff] shadow-[0_6px_18px_0_#f1f1f1]  p-[20px_0px] m-[0px_20px] text-left
                                          ${index === 0 ? "mt-[25px]" : ""} ${index === inquiryRows.length - 1 ? "mb-[5px]" : ""}`}
                                >
                                    <div className="p-[0px_14px_14px_14px]">
                                        <p className="text-[12px] font-[Bold] text-[#222] leading-[1.2] mb-[8px] w-[180px] flex-wrap">{item.property}</p>
                                        <p className="text-[12px] font-[Regular] text-[#707070] flex items-center gap-[6px] leading-[1.2]">
                                            <span className="inline-flex h-[14px] w-[14px] items-center justify-center">
                                                <svg width="12" height="14" viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M6 7.875C7.24264 7.875 8.25 6.86764 8.25 5.625C8.25 4.38236 7.24264 3.375 6 3.375C4.75736 3.375 3.75 4.38236 3.75 5.625C3.75 6.86764 4.75736 7.875 6 7.875Z" stroke="#9CA3AF" strokeWidth="1.1" />
                                                    <path d="M10.5 5.625C10.5 9.17242 6.75 12.75 6 12.75C5.25 12.75 1.5 9.17242 1.5 5.625C1.5 3.13972 3.51472 1.125 6 1.125C8.48528 1.125 10.5 3.13972 10.5 5.625Z" stroke="#9CA3AF" strokeWidth="1.1" />
                                                </svg>
                                            </span>
                                            {item.location}
                                        </p>
                                    </div>

                                    <div className="h-[1px] w-full bg-[rgba(34,34,34,0.08)]" />

                                    <div className="p-[14px_14px_0px_14px] flex items-center justify-between gap-[10px]">
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <span className={`h-[30px] w-[30px] rounded-[9px] flex items-center justify-center shrink-0 ${contactStyle.container}`}>
                                                <ContactIcon width={16} height={16} />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Bold] text-[#222] leading-[1.2] mb-[4px] capitalize ">{item.name}</p>
                                                <p className="text-[12px] font-[Regular] text-[#707070] leading-[1.2] truncate">{item.detail}</p>
                                            </div>
                                        </div>
                                        <RightArrowIcon className="w-[8px] h-[12px] shrink-0" />
                                    </div>
                                </button>
                            );
                        })}
                        {!inquiryRows.length && !isDashboardLoading && (
                            <div className="text-[12px] font-[Medium] text-[#707070] py-[8px] px-[8px]">No inquiries found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

export default AgentDashboard;

