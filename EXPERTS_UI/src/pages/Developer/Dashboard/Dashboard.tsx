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
        iconBg: "bg-gradient-to-br from-[#D4A373] to-[#B5835A] text-white shadow-md shadow-[#D4A373]/20",
        cardBg: "linear-gradient(135deg, #FFFFFF 0%, #FBF9F7 100%)",
        icon: TotalProjectIcon,
        navigateTo: "/developer/project-management?tab=active&subTab=all",
    },
    {
        title: "Total Ready Projects",
        key: "totalReadyProjects",
        iconBg: "bg-gradient-to-br from-[#0284C7] to-[#0369A1] text-white shadow-md shadow-[#0284C7]/20",
        cardBg: "linear-gradient(135deg, #FFFFFF 0%, #F0F9FF 100%)",
        icon: TotalReadyIcon,
        navigateTo: "/developer/project-management?tab=active&subTab=new",
    },
    {
        title: "Off-plan Projects",
        key: "offPlanProjects",
        iconBg: "bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow-md shadow-[#F59E0B]/20",
        cardBg: "linear-gradient(135deg, #FFFFFF 0%, #FFFBEB 100%)",
        icon: OffPlanProjectIcon,
        navigateTo: "/developer/project-management?tab=active&subTab=off-plan",
    },
    {
        title: "Total Revenue",
        key: "totalRevenue",
        iconBg: "bg-gradient-to-br from-[#10B981] to-[#059669] text-white shadow-md shadow-[#10B981]/20",
        cardBg: "linear-gradient(135deg, #FFFFFF 0%, #ECFDF5 100%)",
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
        <div className="px-4 pb-8 pt-5 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
            {/* Hero Banner with Modern Curves and Overlay */}
            <div
                className="p-6 md:p-8 rounded-[24px] gap-6 flex flex-col justify-between relative shadow-xl overflow-hidden border border-white/10"
                style={{
                    backgroundImage: `linear-gradient(135deg, rgba(15, 23, 42, 0.90) 0%, rgba(30, 41, 59, 0.85) 100%), url(${mainbg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <DeveloperHeader title="Dashboard" showBack={false} onBackClick={() => { }} />

                <div className="relative mt-2">
                    {isDashboardLoading && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-white/70 backdrop-blur-sm">
                            <Loader size={60} margin={0} />
                        </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                                    className="group flex flex-col justify-between rounded-[20px] p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border border-[#E2E8F0] shadow-sm relative overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A373]"
                                    style={{ background: card.cardBg }}
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <span
                                                    className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${card.iconBg}`}
                                                >
                                                    <Icon width={14} height={14} />
                                                </span>
                                                <span className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">
                                                    {card.title}
                                                </span>
                                            </div>
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-[Bold] ${card.arrow === "up" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                                            >
                                                {card.badgeText}
                                                <span className="ml-1">{card.arrow === "up" ? "↑" : "↓"}</span>
                                            </span>
                                        </div>

                                        <div className="flex items-baseline justify-between mt-1">
                                            <div className="text-[28px] sm:text-[32px] text-[#0F172A] font-[Bold] tracking-tight leading-none">
                                                {card.value}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-[Medium] text-[#94A3B8] group-hover:text-[#D4A373] transition-colors">
                                        <span>View breakdown</span>
                                        <RightArrowIcon className="w-2.5 h-2.5 transform group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* Project and Location based projects */}
            <div className="relative mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6">
                {isDashboardLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-white/60 backdrop-blur-sm">
                        <Loader size={60} margin={0} />
                    </div>
                )}
                {/* Projects Section */}
                <div className="bg-white rounded-[24px] p-6 md:p-7 border border-[#E2E8F0] shadow-sm min-w-0">
                    {/* Project header */}
                    <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
                        <div>
                            <h2 className="text-[#0F172A] font-[Bold] text-[20px] tracking-tight">Active Portfolio</h2>
                            <p className="text-[#64748B] text-[12px] font-[Medium]">Track your live residential & commercial assets</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-full">
                                <button
                                    onClick={() => setActiveTab("active")}
                                    className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] px-4 h-[32px] rounded-full transition-all ${activeTab === "active"
                                        ? "bg-[#0F172A] text-white shadow-sm"
                                        : "text-[#64748B] hover:text-[#0F172A]"
                                        }`}
                                >
                                    Active ({activeTabCount})
                                </button>
                                <button
                                    onClick={() => setActiveTab("soldout")}
                                    className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] px-4 h-[32px] rounded-full transition-all ${activeTab === "soldout"
                                        ? "bg-[#0F172A] text-white shadow-sm"
                                        : "text-[#64748B] hover:text-[#0F172A]"
                                        }`}
                                >
                                    Sold Out ({soldoutTabCount})
                                </button>
                            </div>
                            <div className="w-[1px] h-5 bg-slate-200 hidden sm:block"></div>
                            <div className="flex items-center gap-2">
                                <span className="text-[#64748B] text-[12px] font-[Medium]">Sort:</span>
                                <div className="relative" ref={sortDropdownRef}>
                                    <div
                                        onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                        className="flex items-center justify-between gap-2 border border-[#CBD5E1] bg-white rounded-full px-3.5 h-[34px] cursor-pointer min-w-[110px] hover:border-[#94A3B8] transition-colors"
                                    >
                                        <span className="text-[#0F172A] text-[12px] font-[SemiBold]">{selectedSortLabel}</span>
                                        <DownArrowIcon className={`w-3 h-3 text-[#64748B] transition-transform duration-200 ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
                                    </div>

                                    {isSortDropdownOpen && (
                                        <div className="absolute right-0 top-[40px] w-full min-w-[140px] bg-white border border-[#E2E8F0] rounded-[14px] shadow-lg py-1.5 z-20 flex flex-col">
                                            {sortOptions.map((option) => (
                                                <div
                                                    key={option.value}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setSelectedSort(option.value);
                                                        setIsSortDropdownOpen(false);
                                                    }}
                                                    className={`px-4 py-2 text-[12px] font-[Medium] cursor-pointer hover:bg-[#F8FAFC] transition-colors ${selectedSort === option.value ? "text-[#D4A373] font-[SemiBold] bg-[#FDFBF9]" : "text-[#334155]"}`}
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
                        <div className="min-w-[760px]">
                            <div className="rounded-[16px] border border-[#E2E8F0] overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                                <div className="grid grid-cols-[1.5fr_1fr_1.2fr_1.2fr] px-4 py-3 gap-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                    <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Project Details</p>
                                    <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Status</p>
                                    <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Progress</p>
                                    <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Completion</p>
                                </div>

                                {projectRows.map((row, index) => (
                                    <div
                                        key={row.projectId}
                                        onClick={() => navigate(`/developer/project-details?projectId=${row.projectId}`)}
                                        className={`grid grid-cols-[1.5fr_1fr_1.2fr_1.2fr] px-4 py-3.5 gap-4 items-center cursor-pointer transition-colors hover:bg-[#F8FAFC] ${index !== projectRows.length - 1 ? "border-b border-[#F1F5F9]" : ""
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className="w-[44px] h-[44px] rounded-[10px] bg-cover bg-center shrink-0 border border-[#E2E8F0] shadow-sm"
                                                style={{ backgroundImage: `url(${toProjectImageUrl(row.image)})` }}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-[Bold] text-[#0F172A] leading-snug truncate hover:text-[#D4A373] transition-colors">{row.projectName}</p>
                                                <p className="text-[11px] text-[#64748B] leading-snug truncate mt-0.5">{[row.location?.city, row.location?.zone].filter(Boolean).join(", ") || "-"}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <span
                                                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-[Bold] ${row.projectStatus === "ready"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                                    }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${row.projectStatus === "ready" ? "bg-emerald-500" : "bg-amber-500"}`} />
                                                {row.projectStatus === "ready" ? "Ready" : "Off-plan"}
                                            </span>
                                        </div>

                                        <div className="flex items-center">
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-[Medium] text-[#334155]">
                                                {row.progressStatus || "Scheduled"}
                                            </span>
                                        </div>

                                        <div className="flex items-center">
                                            <p className="text-[12px] font-[Medium] text-[#475569]">{formatDate(row.expectedCompletionDate)}</p>
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
                        className="mt-5 rounded-[12px] w-full h-[42px] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] text-[#0F172A] text-[13px] font-[SemiBold] cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                        <span>View all projects</span>
                        <RightArrowIcon className="w-2.5 h-2.5" />
                    </button>
                </div>

                {/* Location based projects */}
                <div className="rounded-[24px] bg-white p-6 md:p-7 border border-[#E2E8F0] shadow-sm min-w-0 flex flex-col justify-between">
                    <div>
                        <div className="mb-5">
                            <h2 className="text-[#0F172A] font-[Bold] text-[20px] tracking-tight">Prime Zones</h2>
                            <p className="text-[#64748B] text-[12px] font-[Medium]">Listings distributed by location</p>
                        </div>

                        <div className="flex flex-col gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                            {locationRows.map((item, index) => (
                                <button
                                    key={`${item.name}-${index}`}
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/developer/project-management?tab=active&subTab=all&search=${encodeURIComponent(item.name)}`
                                        )
                                    }
                                    className="group cursor-pointer w-full rounded-[14px] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] p-3.5 flex items-center justify-between text-left transition-all duration-200 hover:border-[#CBD5E1] hover:shadow-sm"
                                >
                                    <div>
                                        <p className="text-[13px] font-[Bold] text-[#0F172A] leading-snug group-hover:text-[#D4A373] transition-colors">{item.name}</p>
                                        <p className="text-[11px] font-[Medium] text-[#64748B] mt-0.5">{item.listings} active {item.listings === 1 ? 'project' : 'projects'}</p>
                                    </div>
                                    <div className="w-7 h-7 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#64748B] group-hover:text-[#0F172A] group-hover:border-[#CBD5E1] group-hover:translate-x-0.5 transition-all">
                                        <RightArrowIcon className="w-2.5 h-2.5" />
                                    </div>
                                </button>
                            ))}
                            {!locationRows.length && !isDashboardLoading && (
                                <div className="px-4 py-8 text-center text-[13px] font-[Regular] text-[#94A3B8]">
                                    No location-based projects found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;

