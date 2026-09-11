import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { DashboardOverview } from "../../services/dashboardService";
import { platformGrowthCategories, revenueTrendSeries } from "./dashboardData";

const chartCardClass =
    "bg-[#141414] rounded-[18px] border border-[rgba(201,169,110,0.18)] p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.4)]";

const chartTitleClass = "text-[18px] font-['Playfair_Display',serif] font-bold text-[#F5F0E8] mb-[4px]";
const chartSubtitleClass = "text-[12px] font-[Regular] text-[#A89880] mb-[16px]";

const baseChartOptions: ApexOptions = {
    chart: {
        toolbar: { show: false },
        fontFamily: "'DM Sans', sans-serif",
        animations: { enabled: false },
    },
    grid: {
        borderColor: "rgba(201, 169, 110, 0.1)",
        strokeDashArray: 4,
    },
    theme: {
        mode: "dark",
    },
    legend: {
        fontSize: "12px",
        fontWeight: 500,
        labels: { colors: "#A89880" },
    },
};

type DashboardChartsProps = {
    data?: DashboardOverview | null;
};

export function PlatformGrowthChart({ data }: DashboardChartsProps) {
    const categories = data?.platformGrowth.categories ?? [];
    const series = data?.platformGrowth.series ?? [
        { name: "New Users", data: [] },
        { name: "New Listings", data: [] },
    ];

    const options: ApexOptions = {
        ...baseChartOptions,
        chart: { ...baseChartOptions.chart, type: "area", height: 320 },
        colors: ["#C9A96E", "#10B981"],
        stroke: { curve: "smooth", width: 2 },
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [0, 90, 100],
            },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories,
            labels: { style: { colors: "#A89880", fontSize: "11px" } },
        },
        yaxis: {
            labels: {
                style: { colors: "#A89880", fontSize: "11px" },
                formatter: (v) => `${Math.round(v)}`,
            },
        },
        tooltip: { theme: "dark" },
    };

    return (
        <div className={chartCardClass}>
            <h3 className={chartTitleClass}>Platform Growth</h3>
            <p className={chartSubtitleClass}>New users and listings over the last 12 months</p>
            <ReactApexChart options={options} series={series} type="area" height={320} />
        </div>
    );
}

export function UserDistributionChart({ data }: DashboardChartsProps) {
    const labels = data?.userDistribution.labels ?? [];
    const series = data?.userDistribution.series ?? [];

    const options: ApexOptions = {
        ...baseChartOptions,
        chart: { ...baseChartOptions.chart, type: "donut", height: 300 },
        colors: ["#C9A96E", "#E4C98B", "#10B981", "#A89880"],
        labels,
        plotOptions: {
            pie: {
                donut: {
                    size: "68%",
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: "Total Users",
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#F5F0E8",
                        },
                        value: {
                            color: "#F5F0E8",
                            fontSize: "20px",
                            fontWeight: 700,
                        },
                    },
                },
            },
        },
        dataLabels: { enabled: false },
        legend: { position: "bottom", labels: { colors: "#A89880" } },
        tooltip: { theme: "dark" },
    };

    return (
        <div className={chartCardClass}>
            <h3 className={chartTitleClass}>User Distribution</h3>
            <p className={chartSubtitleClass}>Developers, agencies, agents, and end users</p>
            <ReactApexChart options={options} series={series} type="donut" height={300} />
        </div>
    );
}

export function ListingsByTypeChart({ data }: DashboardChartsProps) {
    const categories = data?.listingsByType.categories ?? [];
    const series = data?.listingsByType.series ?? [{ name: "Listings", data: [] }];

    const options: ApexOptions = {
        ...baseChartOptions,
        chart: { ...baseChartOptions.chart, type: "bar", height: 300 },
        colors: ["#C9A96E"],
        plotOptions: {
            bar: {
                borderRadius: 8,
                columnWidth: "48%",
            },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories,
            labels: { style: { colors: "#A89880", fontSize: "11px" } },
        },
        yaxis: {
            labels: {
                style: { colors: "#A89880", fontSize: "11px" },
                formatter: (v) => `${Math.round(v)}`,
            },
        },
        tooltip: { theme: "dark" },
    };

    return (
        <div className={chartCardClass}>
            <h3 className={chartTitleClass}>Listings by Type</h3>
            <p className={chartSubtitleClass}>Buy, rent, commercial, and new projects</p>
            <ReactApexChart options={options} series={series} type="bar" height={300} />
        </div>
    );
}

export function ReportsOverviewChart({ data }: DashboardChartsProps) {
    const categories = data?.reportsMonthly.categories ?? [];
    const series = data?.reportsMonthly.series ?? [
        { name: "Open", data: [] },
        { name: "Resolved", data: [] },
    ];

    const options: ApexOptions = {
        ...baseChartOptions,
        chart: { ...baseChartOptions.chart, type: "bar", height: 300, stacked: true },
        colors: ["#EF4444", "#10B981"],
        plotOptions: {
            bar: {
                borderRadius: 6,
                columnWidth: "52%",
            },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories,
            labels: { style: { colors: "#A89880", fontSize: "11px" } },
        },
        yaxis: {
            labels: {
                style: { colors: "#A89880", fontSize: "11px" },
            },
        },
        tooltip: { theme: "dark" },
    };

    return (
        <div className={chartCardClass}>
            <h3 className={chartTitleClass}>Reports Overview</h3>
            <p className={chartSubtitleClass}>Open vs resolved reports (last 6 months)</p>
            <ReactApexChart options={options} series={series} type="bar" height={300} />
        </div>
    );
}

export function RevenueTrendChart() {
    const options: ApexOptions = {
        ...baseChartOptions,
        chart: { ...baseChartOptions.chart, type: "line", height: 280 },
        colors: ["#C9A96E"],
        stroke: { curve: "smooth", width: 3 },
        markers: {
            size: 4,
            strokeWidth: 2,
            hover: { size: 6 },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories: platformGrowthCategories,
            labels: { style: { colors: "#A89880", fontSize: "11px" } },
        },
        yaxis: {
            labels: {
                style: { colors: "#A89880", fontSize: "11px" },
                formatter: (v) => `${v}K`,
            },
        },
        tooltip: { theme: "dark" },
    };

    return (
        <div className={chartCardClass}>
            <h3 className={chartTitleClass}>Revenue Trend</h3>
            <p className={chartSubtitleClass}>Monthly platform revenue (AED thousands)</p>
            <ReactApexChart options={options} series={revenueTrendSeries} type="line" height={280} />
        </div>
    );
}

export function CmsActivityChart({ data }: DashboardChartsProps) {
    const labels = data?.cmsActivity.labels ?? [];
    const series = data?.cmsActivity.series ?? [];
    const total = series.reduce((sum, value) => sum + value, 0);

    const options: ApexOptions = {
        ...baseChartOptions,
        chart: { ...baseChartOptions.chart, type: "radialBar", height: 280 },
        colors: ["#C9A96E", "#E4C98B", "#10B981"],
        plotOptions: {
            radialBar: {
                hollow: { size: "45%" },
                dataLabels: {
                    name: { fontSize: "12px", color: "#A89880" },
                    value: { fontSize: "16px", fontWeight: 700, color: "#F5F0E8" },
                    total: {
                        show: true,
                        label: "Total CMS",
                        color: "#F5F0E8",
                        formatter: () => `${total}`,
                    },
                },
            },
        },
        labels,
        legend: { position: "bottom", labels: { colors: "#A89880" } },
        tooltip: { theme: "dark" },
    };

    return (
        <div className={chartCardClass}>
            <h3 className={chartTitleClass}>CMS Activity</h3>
            <p className={chartSubtitleClass}>Published content by module</p>
            <ReactApexChart options={options} series={series} type="radialBar" height={280} />
        </div>
    );
}

export function InquiriesOverviewChart({ data }: DashboardChartsProps) {
    const categories = data?.inquiriesOverview.categories ?? [];
    const series = data?.inquiriesOverview.series ?? [
        { name: "Property Inquiries", data: [] },
        { name: "Project Inquiries", data: [] },
    ];

    const options: ApexOptions = {
        ...baseChartOptions,
        chart: { ...baseChartOptions.chart, type: "bar", height: 300, stacked: true },
        colors: ["#C9A96E", "#10B981"],
        plotOptions: {
            bar: {
                borderRadius: 6,
                columnWidth: "55%",
            },
        },
        dataLabels: { enabled: false },
        xaxis: {
            categories,
            labels: { style: { colors: "#A89880", fontSize: "11px" } },
        },
        yaxis: {
            labels: { style: { colors: "#A89880", fontSize: "11px" } },
        },
        tooltip: { theme: "dark" },
    };

    return (
        <div className={chartCardClass}>
            <h3 className={chartTitleClass}>Inquiries Overview</h3>
            <p className={chartSubtitleClass}>Property vs project inquiries (last 6 months)</p>
            <ReactApexChart options={options} series={series} type="bar" height={300} />
        </div>
    );
}
