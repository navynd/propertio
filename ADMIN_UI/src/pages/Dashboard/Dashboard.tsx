import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import {
    MultiUserIcon,
    ListingIcon,
    TotalProjectIcon,
    NotificationIcon,
} from "../../assets/icons";
import { getApiErrorMessage, isAbortError } from "../../services/apiClient";
import {
    dashboardService,
    type DashboardOverview,
    type DashboardStatCard,
} from "../../services/dashboardService";
import {
    CmsActivityChart,
    ListingsByTypeChart,
    PlatformGrowthChart,
    ReportsOverviewChart,
    RevenueTrendChart,
    UserDistributionChart,
} from "./DashboardCharts";

const statIcons = [MultiUserIcon, ListingIcon, TotalProjectIcon, NotificationIcon];

const defaultStatCards: DashboardStatCard[] = [
    {
        title: "Total Users",
        value: "—",
        growth: "—",
        growthUp: true,
        cardBg: "bg-[#F3EEFF]",
        iconBg: "bg-[#6A3CA8]",
    },
    {
        title: "Active Listings",
        value: "—",
        growth: "—",
        growthUp: true,
        cardBg: "bg-[#E8F5EE]",
        iconBg: "bg-[#00A663]",
    },
    {
        title: "Total Projects",
        value: "—",
        growth: "—",
        growthUp: true,
        cardBg: "bg-[#E8F0FF]",
        iconBg: "bg-[#0832AE]",
    },
    {
        title: "Pending Reports",
        value: "—",
        growth: "—",
        growthUp: false,
        cardBg: "bg-[#FFF2F2]",
        iconBg: "bg-[#EA3934]",
    },
];

function Dashboard() {
    const [overview, setOverview] = useState<DashboardOverview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        const loadDashboard = async () => {
            setLoading(true);
            setError(null);

            try {
                const data = await dashboardService.getOverview(controller.signal);
                setOverview(data);
            } catch (fetchError) {
                if (isAbortError(fetchError)) return;
                setError(getApiErrorMessage(fetchError, "Unable to load dashboard data."));
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void loadDashboard();

        return () => controller.abort();
    }, []);

    const statCards = overview?.statCards ?? defaultStatCards;

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Dashboard" showBack={false} onBackClick={() => { }} />

            {error ? (
                <div className="mt-[20px] rounded-[12px] border border-[#F3C4C4] bg-[#FFF5F5] px-[16px] py-[12px] text-[13px] text-[#C62828]">
                    {error}
                </div>
            ) : null}

            <div className="mt-[20px] space-y-[20px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[14px]">
                    {statCards.map((card, index) => {
                        const Icon = statIcons[index];
                        return (
                            <div
                                key={card.title}
                                className="bg-[#FFF] rounded-[16px] p-[20px] border border-[#ECECEC] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-all duration-200 flex flex-col justify-between"
                                style={{ borderTop: index === 0 ? "4px solid var(--primary-color, #1F3D51)" : "1px solid #ECECEC" }}
                            >
                                <div className="flex items-start justify-between gap-[10px]">
                                    <div>
                                        <p className="text-[13px] font-[SemiBold] text-[#707070]">{card.title}</p>
                                        <h2 className="text-[28px] font-[Bold] text-[#222222] mt-[10px] leading-none">
                                            {loading ? "..." : card.value}
                                        </h2>
                                    </div>
                                    <span
                                        className={`flex h-[42px] w-[42px] items-center justify-center rounded-[12px] ${index === 0 ? '' : card.iconBg}`}
                                        style={index === 0 ? { backgroundColor: "var(--primary-color, #1F3D51)" } : undefined}
                                    >
                                        <Icon stroke="#fff" fill="#fff" width={20} height={20} className="shrink-0" />
                                    </span>
                                </div>
                                <div className="mt-[20px] flex items-center gap-[8px]">
                                    <span
                                        className={`text-[12px] font-[Bold] px-[8px] py-[3px] rounded-[6px] ${
                                            card.growthUp
                                                ? "bg-[#E6F4EA] text-[#137333]"
                                                : "bg-[#FCE8E6] text-[#C5221F]"
                                        }`}
                                    >
                                        {loading ? "..." : card.growth}
                                    </span>
                                    <span className="text-[12px] text-[#888888] font-[Regular]">vs last month</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-[14px]">
                    <PlatformGrowthChart data={overview} />
                    <UserDistributionChart data={overview} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
                    <ListingsByTypeChart data={overview} />
                    <ReportsOverviewChart data={overview} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
                    <RevenueTrendChart />
                    <CmsActivityChart data={overview} />
                </div>

                {/* Inquiries Overview — temporarily hidden
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
                    <InquiriesOverviewChart data={overview} />
                    <RevenueTrendChart />
                </div>
                */}

                {/* Action Queue — temporarily hidden
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-[14px]">
                    <CmsActivityChart data={overview} />
                    <div className="bg-white rounded-[12px] border border-[#EAEAEA] p-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.06)]">
                        <h3 className="text-[16px] font-[Bold] text-[#222] mb-[4px]">Action Queue</h3>
                        <p className="text-[12px] font-[Regular] text-[#707070] mb-[16px]">Items that require operational attention</p>
                        <div className="space-y-[10px]">
                            {(overview?.actionQueue ?? []).map((item) => (
                                <button
                                    key={item.title}
                                    type="button"
                                    onClick={() => navigate(item.path)}
                                    className="w-full rounded-[10px] border border-[#ECECEC] bg-[#FAFAFA] px-[12px] py-[10px] text-left hover:bg-[#F4F4F4]"
                                >
                                    <div className="flex items-center justify-between gap-[10px]">
                                        <span className="text-[13px] text-[#444]">{item.title}</span>
                                        <span className="text-[16px] font-[SemiBold] text-[#222]">{item.value}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                */}

                {/* Recent Activity — temporarily hidden
                <div className="bg-white rounded-[12px] border border-[#EAEAEA] p-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.06)]">
                    <h3 className="text-[16px] font-[Bold] text-[#222] mb-[4px]">Recent Activity</h3>
                    <p className="text-[12px] font-[Regular] text-[#707070] mb-[16px]">Latest system actions and updates</p>
                    <div className="space-y-[10px]">
                        {(overview?.recentActivity ?? []).map((item) => (
                            <div key={item.id} className="rounded-[10px] border border-[#ECECEC] px-[12px] py-[10px]">
                                <p className="text-[13px] text-[#222]">
                                    <span className="font-[SemiBold] capitalize">{item.actorType}</span>{" "}
                                    <span className="capitalize">{item.action}</span>{" "}
                                    <span className="capitalize">{item.resourceType}</span>
                                </p>
                                <p className="text-[11px] text-[#8A8A8A] mt-[4px]">
                                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
                */}

                {/* Ecosystem Overview — temporarily hidden
                <div className="bg-white rounded-[12px] border border-[#EAEAEA] p-[20px]">
                    <h3 className="text-[16px] font-[Bold] text-[#222] mb-[12px]">Ecosystem Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[12px]">
                        <div className="rounded-[10px] bg-[#F5F5F5] p-[14px]">
                            <p className="text-[12px] text-[#707070]">propertioclone-sultan</p>
                            <p className="text-[14px] font-[SemiBold] text-[#222] mt-[4px]">User portal (buy/rent/search)</p>
                        </div>
                        <div className="rounded-[10px] bg-[#F5F5F5] p-[14px]">
                            <p className="text-[12px] text-[#707070]">propertioexperts</p>
                            <p className="text-[14px] font-[SemiBold] text-[#222] mt-[4px]">Developer / Agency / Agent portal</p>
                        </div>
                        <div className="rounded-[10px] bg-[var(--primary-color-alpha)] p-[14px] border border-[var(--primary-color-alpha)]">
                            <p className="text-[12px] text-[var(--primary-color)]">propertioadminsrc-ui</p>
                            <p className="text-[14px] font-[SemiBold] text-[#222] mt-[4px]">Central admin control panel</p>
                        </div>
                    </div>
                </div>
                */}
            </div>
        </div>
    );
}

export default Dashboard;
