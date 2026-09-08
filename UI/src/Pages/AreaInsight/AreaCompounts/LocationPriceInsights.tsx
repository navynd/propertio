import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { DownArrowIconBlack } from "../../../Components/parts/icon";
import "../../../assets/styles/AreaInsight/LocationDetails.scss";

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

const CHART_BLUE = "#2E5BFF";
const CHART_RED = "#FF4D4D";

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
    { label: "3+ Bedroom", value: "3" },
];

const AVERAGE_PRICES = [
    { label: "Studio", value: "101,000 AED/year" },
    { label: "1 Bedroom", value: "147,000 AED/year" },
    { label: "2 Bedroom", value: "226,000 AED/year" },
];

type FilterKey = "deal" | "property" | "bed";

const LocationPriceInsights: React.FC = () => {
    const [dealValue, setDealValue] = useState("rent");
    const [propertyValue, setPropertyValue] = useState("apartment");
    const [bedValue, setBedValue] = useState("studio");
    const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);

    const filtersRef = useRef<HTMLDivElement>(null);

    const dealLabel = DEAL_OPTIONS.find((o) => o.value === dealValue)?.label ?? "Rent";
    const propertyLabel =
        PROPERTY_TYPE_OPTIONS.find((o) => o.value === propertyValue)?.label ?? "Apartment";
    const bedLabel = BED_OPTIONS.find((o) => o.value === bedValue)?.label ?? "Studio";

    useEffect(() => {
        if (!openFilter) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                filtersRef.current &&
                !filtersRef.current.contains(event.target as Node)
            ) {
                setOpenFilter(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openFilter]);

    const chartSeries = useMemo(
        () => [
            {
                name: "Al bahia hills",
                data: [120, 180, 205, 195, 220, 260, 280, 310, 290, 270, 240, 255],
            },
            {
                name: "Al bahia",
                data: [80, 110, 145, 130, 160, 200, 220, 250, 235, 210, 190, 205],
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
                width: 2,
            },
            colors: [CHART_BLUE, CHART_RED],
            fill: {
                type: "gradient",
                gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.4,
                    opacityTo: 0.05,
                    stops: [0, 90, 100],
                },
            },
            xaxis: {
                categories: MONTH_CATEGORIES,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                    style: {
                        colors: "#757575",
                        fontSize: "11px",
                    },
                },
            },
            yaxis: {
                min: 0,
                max: 600,
                tickAmount: 6,
                title: {
                    // text: "AED/Sqft",
                    rotate: 0,
                    offsetX: 0,
                    offsetY: -8,
                    textAnchor: "start",
                    style: {
                        color: "#222",
                        fontSize: "12px",
                        fontWeight: 600,
                    },
                },
                labels: {
                    style: {
                        colors: "#757575",
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
                padding: { top: 8, right: 12, bottom: 0, left: 8 },
            },
            legend: { show: false },
            tooltip: {
                shared: true,
                intersect: false,
                custom: ({ dataPointIndex, w }) => {
                    if (dataPointIndex === undefined || dataPointIndex < 0) return "";
                    const title = MONTH_TOOLTIP_TITLES[dataPointIndex] ?? "";
                    const series = w.globals.series as number[][];
                    const rows = series
                        .map((serie, i) => {
                            const v = Math.round(serie[dataPointIndex] ?? 0);
                            const name = chartSeries[i]?.name ?? "";
                            const dot =
                                i === 0 ? "blue" : "red";
                            return `<div class="pf-location-details__chart-tooltip-row">
              <span class="pf-location-details__chart-tooltip-dot pf-location-details__chart-tooltip-dot--${dot}"></span>
              <span class="pf-location-details__chart-tooltip-label">${name} @ ${v} AED/Sqft</span>
            </div>`;
                        })
                        .join("");
                    return `<div class="pf-location-details__chart-tooltip">
            <div class="pf-location-details__chart-tooltip-title">${title}</div>
            ${rows}
          </div>`;
                },
            },
        }),
        [chartSeries]
    );

    const renderDropdown = (
        key: FilterKey,
        options: { label: string; value: string }[],
        value: string,
        setValue: (v: string) => void,
        displayLabel: string
    ) => {
        const isOpen = openFilter === key;
        return (
            <Box
                className="pf-location-details__price-select pf-agent-Service__custom-select"
                style={{ position: "relative" }}
            >
                <Box
                    className="pf-location-details__price-select-btn pf-agent-Service__select-btn"
                    onClick={() => setOpenFilter((p) => (p === key ? null : key))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenFilter((p) => (p === key ? null : key));
                        }
                    }}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                >
                    <Typography className="pf-agent-Service__name selected">
                        {displayLabel}
                    </Typography>
                    <DownArrowIconBlack width={12} height={12} fill="#222" />
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
        <section
            className="pf-location-details__price-insights"
            aria-label="Price insights"
        >
            <div className="pf-location-details__price-insights-header">
                <h2 className="pf-location-details__price-insights-title">Price Insights</h2>
                <div className="pf-location-details__price-insights-filters" ref={filtersRef}>
                    {renderDropdown("deal", DEAL_OPTIONS, dealValue, setDealValue, dealLabel)}
                    {renderDropdown(
                        "property",
                        PROPERTY_TYPE_OPTIONS,
                        propertyValue,
                        setPropertyValue,
                        propertyLabel
                    )}
                    {renderDropdown("bed", BED_OPTIONS, bedValue, setBedValue, bedLabel)}
                </div>
            </div>

            <div className="pf-location-details__price-insights-body">
                <div className="pf-location-details__price-chart-wrap">
                    <div className="pf-location-details__price-chart-head">
                        <span className="pf-location-details__price-chart-head-title">
                            Price trends
                        </span>
                        <span className="pf-location-details__price-chart-head-sub">
                            Studio apartments rented in Palm Jumeirah
                        </span>
                    </div>
                    <div className="pf-location-details__price-chart-yaxis">
                        <span className="pf-location-details__price-chart-yaxis-title">AED/Sqft</span>
                    </div>
                    <div className="pf-location-details__price-chart-inner">
                        <ReactApexChart
                            options={chartOptions}
                            series={chartSeries}
                            type="area"
                            height={320}
                        />
                    </div>
                </div>

                <aside className="pf-location-details__price-averages">
                    <h3 className="pf-location-details__price-averages-title">Average prices</h3>
                    <ul className="pf-location-details__price-averages-list">
                        {AVERAGE_PRICES.map((row) => (
                            <li key={row.label} className="pf-location-details__price-averages-row">
                                <span className="pf-location-details__price-averages-label">
                                    {row.label}
                                </span>
                                <span className="pf-location-details__price-averages-value">
                                    {row.value}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <p className="pf-location-details__price-averages-note">
                        The data displayed is based on average prices and sizes of all Studio
                        apartments in Palm Jumeirah.
                    </p>
                </aside>
            </div>
        </section>
    );
};

export default LocationPriceInsights;
