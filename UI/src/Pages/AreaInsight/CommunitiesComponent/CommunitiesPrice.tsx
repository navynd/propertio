import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { DownArrowIconBlack } from "../../../Components/parts/icon";
import "../../../assets/styles/AgentandAgency.scss";
import "../../../assets/styles/AreaInsight/CommunitiesPrice.scss";

const AREA_NAME = "Palm Jumeirah";

const MONTH_CATEGORIES = [
    "Jan 25",
    "Feb 25",
    "Mar 25",
    "Apr 25",
    "May 25",
    "Jun 25",
    "Jul 25",
    "Aug 25",
    "Sep 25",
    "Oct 25",
    "Nov 25",
    "Dec 25",
];

const MONTH_TOOLTIP_TITLES = [
    "January 2025",
    "February 2025",
    "March 2025",
    "April 2025",
    "May 2025",
    "June 2025",
    "July 2025",
    "August 2025",
    "September 2025",
    "October 2025",
    "November 2025",
    "December 2025",
];

const CHART_RED = "#E53935";

const DEAL_OPTIONS = [
    { label: "Rent", value: "rent" },
    { label: "Sale", value: "sale" },
];

const PROPERTY_TYPE_OPTIONS = [
    { label: "Apartment", value: "apartment" },
    { label: "Villa", value: "villa" },
    { label: "Townhouse", value: "townhouse" },
];

const BED_OPTIONS = [
    { label: "Studio", value: "studio" },
    { label: "1 Bedroom", value: "1" },
    { label: "2 Bedroom", value: "2" },
    { label: "3 Bedroom", value: "3" },
    { label: "4 Bedroom", value: "4" },
];

const TIMEFRAME_OPTIONS = [
    { label: "Last 1 year", value: "1y" },
    { label: "Last 2 years", value: "2y" },
    { label: "Last 5 years", value: "5y" },
];

/** Sample AED/Sqft trend (Jan–Dec) */
const TREND_DATA = [280, 305, 348, 332, 365, 402, 428, 415, 388, 370, 352, 390];

const AVERAGE_PRICES = [
    { label: "Studio", value: "118,000 AED/year" },
    { label: "1 Bedroom", value: "172,000 AED/year" },
    { label: "2 Bedroom", value: "250,000 AED/year" },
    { label: "3 Bedroom", value: "350,000 AED/year" },
    { label: "4 Bedroom", value: "360,500 AED/year" },
];

type FilterKey = "deal" | "property" | "bed" | "timeframe";

const CommunitiesPrice: React.FC = () => {
    const [dealValue, setDealValue] = useState("rent");
    const [propertyValue, setPropertyValue] = useState("apartment");
    const [bedValue, setBedValue] = useState("studio");
    const [timeframe, setTimeframe] = useState("1y");

    const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
    const filtersRef = useRef<HTMLDivElement>(null);
    const timeframeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!openFilter) return;
        const handleClickOutside = (event: MouseEvent) => {
            const t = event.target as Node;
            if (filtersRef.current?.contains(t)) return;
            if (timeframeRef.current?.contains(t)) return;
            setOpenFilter(null);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openFilter]);

    const dealLabel = DEAL_OPTIONS.find((o) => o.value === dealValue)?.label ?? "Rent";
    const propertyLabel =
        PROPERTY_TYPE_OPTIONS.find((o) => o.value === propertyValue)?.label ?? "Apartment";
    const bedLabel = BED_OPTIONS.find((o) => o.value === bedValue)?.label ?? "Studio";
    const timeframeLabel =
        TIMEFRAME_OPTIONS.find((o) => o.value === timeframe)?.label ?? "Last 1 year";

    const chartSubtitle = useMemo(() => {
        const prop =
            propertyValue === "apartment"
                ? "apartments"
                : propertyValue === "villa"
                  ? "villas"
                  : "townhouses";
        const action = dealValue === "rent" ? "rented" : "sold";
        return `${bedLabel} ${prop} ${action} in ${AREA_NAME}`;
    }, [bedLabel, propertyValue, dealValue]);

    const disclaimerBedPhrase = useMemo(() => {
        if (bedValue === "studio") return "Studio";
        if (bedValue === "1") return "1 Bedroom";
        if (bedValue === "2") return "2 Bedroom";
        if (bedValue === "3") return "3 Bedroom";
        return "4 Bedroom";
    }, [bedValue]);

    const disclaimerPropPhrase =
        propertyValue === "apartment"
            ? "apartments"
            : propertyValue === "villa"
              ? "villas"
              : "townhouses";

    const chartSeries = useMemo(
        () => [
            {
                name: AREA_NAME,
                data: TREND_DATA,
            },
        ],
        []
    );

    const chartOptions: ApexOptions = useMemo(
        () => ({
            chart: {
                type: "area",
                toolbar: { show: false },
                zoom: { enabled: false },
                fontFamily: "Regular, sans-serif",
            },
            dataLabels: { enabled: false },
            stroke: {
                curve: "smooth",
                width: 2.5,
                colors: [CHART_RED],
            },
            colors: [CHART_RED],
            fill: {
                type: "gradient",
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.42,
                    opacityTo: 0.02,
                    stops: [0, 92, 100],
                },
            },
            xaxis: {
                categories: MONTH_CATEGORIES,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: {
                        colors: "#9ca3af",
                        fontSize: "11px",
                    },
                },
            },
            yaxis: {
                min: 0,
                max: 600,
                tickAmount: 6,
                labels: {
                    style: {
                        colors: "#9ca3af",
                        fontSize: "11px",
                    },
                    formatter: (val: number) => `${Math.round(val)}`,
                },
            },
            grid: {
                borderColor: "#ececec",
                strokeDashArray: 4,
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: true } },
                padding: { top: 4, right: 8, bottom: 0, left: 4 },
            },
            legend: { show: false },
            markers: {
                size: 0,
                hover: { size: 5 },
                colors: [CHART_RED],
                strokeColors: "#fff",
                strokeWidth: 2,
            },
            tooltip: {
                shared: false,
                intersect: false,
                custom: ({ dataPointIndex }) => {
                    if (dataPointIndex === undefined || dataPointIndex < 0) return "";
                    const title = MONTH_TOOLTIP_TITLES[dataPointIndex] ?? "";
                    const v = Math.round(TREND_DATA[dataPointIndex] ?? 0);
                    return `<div class="pf-communities-price__chart-tooltip">
            <div class="pf-communities-price__chart-tooltip-title">${title}</div>
            <div class="pf-communities-price__chart-tooltip-row">
              <span class="pf-communities-price__chart-tooltip-dot"></span>
              <span class="pf-communities-price__chart-tooltip-label">${AREA_NAME} @ ${v.toLocaleString()} AED/Sqft</span>
            </div>
          </div>`;
                },
            },
        }),
        []
    );

    const renderDropdown = (
        filterKey: FilterKey,
        options: { label: string; value: string }[],
        value: string,
        setValue: (v: string) => void,
        displayLabel: string,
        ariaLabel: string
    ) => {
        const isOpen = openFilter === filterKey;
        return (
            <Box
                key={filterKey}
                className="pf-agent-Service__custom-select"
                style={{ position: "relative" }}
            >
                <Box
                    className="pf-agent-Service__select-btn"
                    onClick={() => setOpenFilter((p) => (p === filterKey ? null : filterKey))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenFilter((p) => (p === filterKey ? null : filterKey));
                        }
                    }}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-label={ariaLabel}
                >
                    <Typography className="pf-agent-Service__name selected">
                        {displayLabel}
                    </Typography>
                    <DownArrowIconBlack width={13} height={13} fill="#222" />
                </Box>
                {isOpen && (
                    <Box className="pf-agent-Service__dropdown" role="listbox">
                        {options.map((o) => {
                            const isActive = value === o.value;
                            return (
                                <Box
                                    key={o.value}
                                    className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""}`}
                                    onClick={() => {
                                        setValue(o.value);
                                        setOpenFilter(null);
                                    }}
                                    role="option"
                                    aria-selected={isActive}
                                >
                                    {o.label}
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>
        );
    };

    return (
        <section className="pf-communities-price" aria-label="Price insights">
            <header className="pf-communities-price__header">
                <h2 className="pf-communities-price__title">Price Insights</h2>
                <div ref={filtersRef} className="pf-communities-price__filters">
                    {renderDropdown(
                        "deal",
                        DEAL_OPTIONS,
                        dealValue,
                        setDealValue,
                        dealLabel,
                        "Deal type"
                    )}
                    {renderDropdown(
                        "property",
                        PROPERTY_TYPE_OPTIONS,
                        propertyValue,
                        setPropertyValue,
                        propertyLabel,
                        "Property type"
                    )}
                    {renderDropdown(
                        "bed",
                        BED_OPTIONS,
                        bedValue,
                        setBedValue,
                        bedLabel,
                        "Bedrooms"
                    )}
                </div>
            </header>

            <div className="pf-communities-price__body">
                <div className="pf-communities-price__chart-col">
                    <div className="pf-communities-price__chart-head">
                        <span className="pf-communities-price__chart-head-title">
                            Price trends
                        </span>
                        <span className="pf-communities-price__chart-head-sub">
                            {chartSubtitle}
                        </span>
                    </div>
                    <div className="pf-communities-price__chart-toolbar">
                        <span className="pf-communities-price__y-label">AED/Sqft</span>
                        <div ref={timeframeRef} className="pf-communities-price__timeframe">
                            {renderDropdown(
                                "timeframe",
                                TIMEFRAME_OPTIONS,
                                timeframe,
                                setTimeframe,
                                timeframeLabel,
                                "Time range"
                            )}
                        </div>
                    </div>
                    <div className="pf-communities-price__chart-inner">
                        <ReactApexChart
                            options={chartOptions}
                            series={chartSeries}
                            type="area"
                            height={320}
                        />
                    </div>
                </div>

                <aside className="pf-communities-price__averages">
                    <h3 className="pf-communities-price__averages-title">
                        Average prices
                    </h3>
                    <ul className="pf-communities-price__averages-list">
                        {AVERAGE_PRICES.map((row) => (
                            <li key={row.label} className="pf-communities-price__averages-row">
                                <span className="pf-communities-price__averages-label">
                                    {row.label}
                                </span>
                                <span className="pf-communities-price__averages-value">
                                    {row.value}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="pf-communities-price__averages-note">
                        The data displayed is based on average prices and sizes of all{" "}
                        {disclaimerBedPhrase} {disclaimerPropPhrase} in {AREA_NAME}.
                    </p>
                </aside>
            </div>
        </section>
    );
};

export default CommunitiesPrice;
