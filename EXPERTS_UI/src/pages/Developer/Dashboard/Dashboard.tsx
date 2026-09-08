import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import mainbg from "../../../assets/img/mainbg.png";

import {
    TotalProjectIcon,
    TotalReadyIcon,
    OffPlanProjectIcon,
    TotalRevenueIcon,
    RightArrowIcon,
    DownArrowIcon,
} from "../../../components/CustomFile/icons";
import DeveloperHeader from "../../../components/Header/DeveloperHeader";
import {
    developerService,
    type DeveloperDashboardResponse,
    type DeveloperDashboardStatCard,
    type SortByProjectMasterItem,
    type SupportedUrlsMasterData,
} from "../../../services/developerService";
import { toast } from "../../../services/toast";
import { API_BASE_URL } from "../../../services/apiClient";
import Loader from "../../../components/Loader/loader";
import { DeveloperTableEmptyState } from "../../../components/DeveloperTableEmptyState";

type MetricTemplate = {
    title: string;
    key: "totalProjects" | "totalReadyProjects" | "offPlanProjects" | "totalRevenue";
    iconBg: string;
    cardBg: string;
    icon: typeof TotalProjectIcon;
    isMoney?: boolean;
    /** Route (incl. query) when the stat card is clicked */
    navigateTo: string;
};

const metricCardTemplates: MetricTemplate[] = [
    {
        title: "Total Projects",
        key: "totalProjects",
        iconBg: "bg-[#FF4B4F]",
        cardBg:
            "linear-gradient(180deg, rgba(234,57,52,0) 42.64%, rgba(234,57,52,0.2) 100%), #ffffff",
        icon: TotalProjectIcon,
        navigateTo: "/developer/project-management?tab=active&subTab=all",
    },
    {
        title: "Total Ready Projects",
        key: "totalReadyProjects",
        iconBg: "bg-[#335DFF]",
        cardBg:
            "linear-gradient(180deg, rgba(8,50,174,0) 42.64%, rgba(8,50,174,0.2) 100%), #ffffff",
        icon: TotalReadyIcon,
        navigateTo: "/developer/project-management?tab=active&subTab=new",
    },
    {
        title: "Off-plan Projects",
        key: "offPlanProjects",
        iconBg: "bg-[#FF7A00]",
        cardBg:
            "linear-gradient(180deg, rgba(255,70,162,0) 42.64%, rgba(255,70,162,0.2) 100%), #ffffff",
        icon: OffPlanProjectIcon,
        navigateTo: "/developer/project-management?tab=active&subTab=off-plan",
    },
    {
        title: "Total Revenue",
        key: "totalRevenue",
        iconBg: "bg-[#00C853]",
        cardBg:
            "linear-gradient(180deg, rgba(0,166,99,0) 42.64%, rgba(0,166,99,0.2) 100%), #ffffff",
        icon: TotalRevenueIcon,
        isMoney: true,
        navigateTo: "/developer/revenue-management",
    },
];

function Dashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"active" | "soldout">("active");
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [selectedSort, setSelectedSort] = useState("featured");
    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const [dashboardData, setDashboardData] = useState<DeveloperDashboardResponse | null>(null);
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [sortOptions, setSortOptions] = useState<SortByProjectMasterItem[]>([
        { name: "Featured", value: "featured" },
        { name: "Newest", value: "newest" },
    ]);
    const [projectImageBaseUrl, setProjectImageBaseUrl] = useState<string | null>(null);

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
        developerService
            .getSortByProjectMasterData()
            .then((data) => {
                if (!isMounted) return;
                const options = (data?.sortByProject ?? data?.sortbyproject ?? [])
                    .map((item) => ({
                        name: String(item?.name ?? "").trim(),
                        value: String(item?.value ?? "").trim().toLowerCase(),
                    }))
                    .filter((item) => item.name && item.value);
                if (!options.length) return;
                setSortOptions(options);
                setSelectedSort((current) =>
                    options.some((o) => o.value === current) ? current : options[0].value
                );
            })
            .catch(() => {
                // Keep fallback sort options.
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallback = `${fallbackOrigin}/uploads/img/project/`;

        const extractProjectImgBase = (data: SupportedUrlsMasterData): string | null => {
            const fromObject = (obj: unknown): string | null => {
                if (!obj || typeof obj !== "object") return null;
                const projectUrl = (obj as { projectUrl?: unknown }).projectUrl;
                if (!projectUrl || typeof projectUrl !== "object") return null;
                const img = (projectUrl as { img?: unknown }).img;
                return typeof img === "string" && img.trim() ? img : null;
            };

            const candidates: unknown[] = [
                data?.supportedUrls,
                data?.supportedurls,
                data?.items,
            ];

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

        developerService
            .getSupportedUrlsMasterData()
            .then((data) => {
                if (!isMounted) return;
                const resolved = extractProjectImgBase(data);
                setProjectImageBaseUrl((resolved ?? fallback).replace(/\/?$/, "/"));
            })
            .catch(() => {
                if (!isMounted) return;
                setProjectImageBaseUrl(fallback);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        setIsDashboardLoading(true);
        developerService
            .getDashboard({
                projectTab: activeTab,
                sortBy: selectedSort,
                page: 1,
                limit: 5,
            })
            .then((data) => {
                if (!isMounted) return;
                setDashboardData(data ?? null);
            })
            .catch((err: unknown) => {
                const message =
                    (err as { message?: string })?.message || "Unable to load developer dashboard.";
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

    const formatNumber = (value: number) =>
        new Intl.NumberFormat("en-IN").format(Math.round(value));
    const formatPercent = (value: number) => `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}%`;
    const formatMoney = (amount: number, currency?: string) =>
        `${formatNumber(amount)} ${currency ?? "AED"}`;
    const formatDate = (value: string | null) => {
        if (!value) return "-";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };
    const toProjectImageUrl = (image: string | null) => {
        if (!image) return mainbg;
        if (image.startsWith("http")) return image;
        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;
        const base = (projectImageBaseUrl || fallbackBase).replace(/\/?$/, "/");
        return `${base}${image}`;
    };
    const selectedSortLabel =
        sortOptions.find((option) => option.value === selectedSort)?.name ?? "Featured";

    const metricCards = useMemo(() => {
        const stats = dashboardData?.stats;
        return metricCardTemplates.map((tpl) => {
            const stat = stats?.[tpl.key] as DeveloperDashboardStatCard | undefined;
            const change = typeof stat?.change === "number" ? stat.change : 0;
            const direction = stat?.direction === "down" ? "down" : "up";
            return {
                ...tpl,
                value: isDashboardLoading
                    ? "--"
                    : tpl.isMoney
                        ? formatMoney(stat?.amount ?? 0, stat?.currency)
                        : formatNumber(stat?.count ?? 0),
                badgeText: formatPercent(change),
                arrow: direction,
                badgeBg: direction === "up" ? "bg-[#00C853]" : "bg-[#FF1744]",
            };
        });
    }, [dashboardData?.stats, isDashboardLoading]);

    const projectRows = dashboardData?.projects?.items ?? [];
    const locationRows =
        dashboardData?.locationBasedProjects?.map((item) => ({
            name: item.location,
            listings: item.count,
        })) ?? [];
    const activeTabCount = dashboardData?.projects?.tabs?.active ?? 0;
    const soldoutTabCount = dashboardData?.projects?.tabs?.soldout ?? 0;

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            {/* Content */}
            <div className="p-[20px] lg:h-[300px] h-auto rounded-[15px] gap-[20px] flex flex-col justify-between" style={{ backgroundImage: `url(${mainbg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', }}>
                <DeveloperHeader title="Dashboard" showBack={false} onBackClick={() => { }} />

                <div className="relative">
                    {isDashboardLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[15px] bg-white/60">
                            <Loader size={80} margin={0} />
                        </div>
                    )}
                    {/* <div className="grid gap-[10px] sm:grid-cols-2 lg:grid-cols-4">
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
                                                <Icon className="flex-shrink-0 h-3.5 w-3.5" />
                                            </span>
                                            {card.title}
                                        </div>
                                        <div className="md:text-[30px] text-[20px] text-[#222] font-semibold leading-[100%]">{card.value}</div>
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
                    <div className="grid gap-[10px] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
                        {metricCards.map((card) => {
                            const Icon = card.icon;
                            const go = () => navigate(card.navigateTo);
                            return (
                                <div
                                    key={card.title}
                                    role="button"
                                    tabIndex={0}
                                    onClick={go}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            go();
                                        }
                                    }}
                                    className="flex flex-col justify-between rounded-[15px] p-[25px_25px_0px_25px] cursor-pointer transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0832AE] focus-visible:ring-offset-2"
                                    style={{ background: card.cardBg }}
                                >
                                    <div className="flex flex-col gap-[25px]">

                                        {/* ✅ TITLE FIXED HEIGHT */}
                                        <div className="flex items-center gap-2 text-[12px] font-[Medium] text-[#222] h-[20px]">
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
                                        <div className="mt-auto flex flex-col justify-end md:text-[30px] text-[20px] text-[#222] font-semibold leading-[1] md:w-[180px] lg:w-[150px] xl:w-[180px] w-full break-words h-[55px]">
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
                </div>
            </div>
            {/* Project and Location based projects */}
            <div className="relative mt-[14px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-[14px]">
                {isDashboardLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[15px] bg-white/60">
                        <Loader size={80} margin={0} />
                    </div>
                )}
                {/* Projects */}
                <div className="bg-[#F5F5F5] rounded-[15px] md:p-[30px] p-[20px] bg-[#fff] min-w-0 overflow-hidden">
                    {/* Project header */}
                    <div className="flex flex-wrap gap-4 items-center justify-between mb-[16px]">
                        <h2 className="text-[#222] font-[Bold] text-[20px]">Projects</h2>
                        <div className="flex flex-wrap items-center gap-[16px] py-1">
                            <div className="flex items-center gap-[10px]">
                                <button
                                    onClick={() => setActiveTab("active")}
                                    className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] p-[0px_15px] h-[33px] rounded-full shrink-0 transition-colors ${activeTab === "active"
                                        ? "bg-[#222] text-[#fff]"
                                        : "bg-[#fff] border border-[#EAEAEA] text-[#222] hover:bg-[#F5F5F5]"
                                        }`}
                                >
                                    Active projects ({activeTabCount})
                                </button>
                                <button
                                    onClick={() => setActiveTab("soldout")}
                                    className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] p-[0px_15px] h-[33px] rounded-full shrink-0 transition-colors ${activeTab === "soldout"
                                        ? "bg-[#222] text-[#fff]"
                                        : "bg-[#fff] border border-[#EAEAEA] text-[#222] hover:bg-[#F5F5F5]"
                                        }`}
                                >
                                    Soldout ({soldoutTabCount})
                                </button>
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
                                        <div className="absolute right-0 top-[45px] w-full min-w-[150px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-10 flex flex-col">
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
                        <div className="min-w-[900px]">
                            <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                                <div className="grid grid-cols-[1.2fr_1fr_1.2fr_1.2fr] px-[14px] py-[10px] gap-[15px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Project Details</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Project status</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Progress status</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Expected Completion date</p>
                                </div>

                                {projectRows.map((row, index) => (
                                    <div
                                        key={row.projectId}
                                        className={`grid grid-cols-[1.2fr_1fr_1.2fr_1.2fr] px-[14px] py-[10px] gap-[15px] ${index !== projectRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""
                                            }`}
                                    >
                                        <div className="flex items-center gap-[10px]">
                                            <div
                                                className="w-[42px] h-[42px] rounded-[8px] bg-cover bg-center shrink-0"
                                                style={{ backgroundImage: `url(${toProjectImageUrl(row.image)})` }}
                                            />
                                            <div>
                                                <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] mb-[4px]">{row.projectName}</p>
                                                <p className="text-[12px] text-[#707070] leading-[1.2]">{[row.location?.city, row.location?.zone].filter(Boolean).join(", ") || "-"}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <span
                                                className={`inline-flex items-center rounded-[6px] p-[6px_10px] text-[12px] font-[Medium] leading-none ${row.projectStatus === "ready"
                                                    ? "bg-[rgba(0,166,99,0.10)] text-[#00A663]"
                                                    : "bg-[rgba(234,57,52,0.10)] text-[#EA3934]"
                                                    }`}
                                            >
                                                {row.projectStatus === "ready" ? "Ready" : "Off-plan"}
                                            </span>
                                        </div>

                                        <div className="flex items-center">
                                            <span className="inline-flex items-center rounded-[6px] border border-[rgba(34,34,34,0.10)] p-[6px_10px] text-[12px] font-[Medium] text-[#222] leading-none">
                                                {row.progressStatus || "-"}
                                            </span>
                                        </div>

                                        <div className="flex items-center">
                                            <p className="text-[12px] font-[Regular] text-[#222]">{formatDate(row.expectedCompletionDate)}</p>
                                        </div>
                                    </div>
                                ))}
                                {!isDashboardLoading && projectRows.length === 0 && (
                                    <DeveloperTableEmptyState message="No projects found for this tab." />
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() =>
                            navigate("/developer/project-management?tab=active&subTab=all")
                        }
                        className="mt-[20px] rounded-[5px] w-full h-[37px] bg-[rgba(34,34,34,0.10)] text-[#222] text-[14px] font-[SemiBold] cursor-pointer hover:bg-[rgba(34,34,34,0.14)] transition-colors"
                    >
                        View all
                    </button>
                </div>

                {/* Location based projects */}
                <div className="rounded-[15px] bg-[#fff] md:p-[30px_25px_30px_25px] p-[16px] min-w-0">
                    <h2 className="text-[#222] font-[Bold] text-[20px] mb-[20px]">Location based projects</h2>

                    <div className="max-h-[470px] overflow-y-auto shadow-[0_6px_18px_0_rgba(0,0,0,0.15)] bg-white flex flex-col gap-[8px]">
                        {locationRows.map((item, index) => (
                            <button
                                key={`${item.name}-${index}`}
                                type="button"
                                onClick={() =>
                                    navigate(
                                        `/developer/project-management?tab=active&subTab=all&search=${encodeURIComponent(item.name)}`
                                    )
                                }
                                className="cursor-pointer w-full rounded-[12px] bg-[#FFF] shadow-[0_6px_18px_0_rgba(0,0,0,0.15)] p-[15px] flex items-center justify-between text-left"
                            >
                                <div>
                                    <p className="text-[15px] font-[SemiBold] text-[#222] leading-[1.2] mb-[3px]">{item.name}</p>
                                    <p className="text-[12px] font-[Regular] text-[#707070]">{item.listings} listings</p>
                                </div>
                                <RightArrowIcon className="w-[8px] h-[12px]" />
                            </button>
                        ))}
                        {!locationRows.length && !isDashboardLoading && (
                            <div className="px-[8px] py-[16px] text-center text-[13px] font-[Regular] text-[#707070]">
                                No location-based projects found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;

