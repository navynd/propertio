import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import "../../../assets/styles/AreaInsight/LocationDetails.scss";

/** Top → bottom, descending values (Seven Palm highlighted in red).
 *  \u00A0 keeps short names on one line so Apex doesn’t break “Seven | Palm”. */
const NEARBY_CATEGORIES = [
    "Seven\u00A0Palm",
    "Cheval Maison The Palm Dubai",
    "NH Collection Dubai The Palm",
    "Dukes\u00A0The\u00A0Palm",
    "Oceana\u00A0Aegean",
];

/** Thousands (k) on scale — matches design ~265k / 220k / … */
const NEARBY_VALUES = [265, 220, 210, 145, 135];

const NEARBY_BAR_COLORS = ["#E53935", "#F4B4B4", "#F4B4B4", "#F4B4B4", "#F4B4B4"];

const PRICE_RANGE_CATEGORIES = ["0.5M", "1M", "1.5M", "2M", "2.5M"];
/** Counts by price bucket — high at 0.5M, tapering down. */
const AVAILABILITY_VALUES = [560, 395, 265, 155, 72];

const PERIWINKLE = "#A8B5EB";

type LocationAreaBarChartsProps = {
    locationName?: string;
};

const LocationAreaBarCharts: React.FC<LocationAreaBarChartsProps> = ({
    locationName = "Seven Palm",
}) => {
    const nearbyOptions: ApexOptions = useMemo(
        () => ({
            chart: {
                type: "bar",
                toolbar: { show: false },
                zoom: { enabled: false },
                fontFamily: "Regular, sans-serif",
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    distributed: true,
                    borderRadius: 10,
                    borderRadiusApplication: "end",
                    /** Extra vertical gap between rows */
                    barHeight: "58%",
                },
            },
            colors: NEARBY_BAR_COLORS,
            dataLabels: { enabled: false },
            grid: {
                borderColor: "#f1f1f1",
                strokeDashArray: 0,
                /* Horizontal bar: numeric scale uses xaxis → vertical grid lines at 100k, 150k, … */
                xaxis: { lines: { show: true } },
                yaxis: { lines: { show: false } },
                /* Extra left pad: gap between category labels and first grid line / bars */
                padding: { top: 4, right: 8, bottom: 8, left: 20 },
            },
            /**
             * Horizontal bars: Apex uses xaxis for the value scale (min/max/ticks).
             * position: 'top' places 100k–300k labels at the top; hide axis line (grid only).
             */
            xaxis: {
                position: "top",
                categories: NEARBY_CATEGORIES,
                min: 100,
                max: 300,
                tickAmount: 4,
                labels: {
                    show: true,
                    style: {
                        colors: "#666666",
                        fontSize: "11px",
                        fontWeight: 400,
                    },
                    formatter: (val: string | number) => {
                        const n = typeof val === "number" ? val : Number(val);
                        if (Number.isNaN(n)) return "";
                        return `${Math.round(n)}k`;
                    },
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            /**
             * Category column: minWidth/maxWidth reserve space so labels sit LEFT of bars.
             * Small maxWidth caps the whole axis width in Apex → overlap / “Sev|en Palm”.
             */
            yaxis: {
                show: true,
                labels: {
                    show: true,
                    style: {
                        colors: "#222222",
                        fontSize: "11px",
                        fontWeight: 500,
                    },
                    minWidth: 188,
                    maxWidth: 110,
                    align: "left",
                    offsetX: 10,
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            legend: { show: false },
            tooltip: {
                y: {
                    formatter: (val: number) => `${val}k AED`,
                },
            },
        }),
        []
    );

    const nearbySeries = useMemo(
        () => [{ name: "Average price", data: NEARBY_VALUES }],
        []
    );

    const availabilityOptions: ApexOptions = useMemo(
        () => ({
            chart: {
                type: "bar",
                toolbar: { show: false },
                zoom: { enabled: false },
                fontFamily: "Regular, sans-serif",
            },
            plotOptions: {
                bar: {
                    horizontal: false,
                    columnWidth: "52%",
                    borderRadius: 10,
                    borderRadiusApplication: "end",
                },
            },
            colors: [PERIWINKLE],
            dataLabels: { enabled: false },
            grid: {
                borderColor: "#f1f1f1",
                strokeDashArray: 0,
                xaxis: { lines: { show: false } },
                yaxis: { lines: { show: true } },
                padding: { top: 8, right: 8, bottom: 0, left: 8 },
            },
            xaxis: {
                categories: PRICE_RANGE_CATEGORIES,
                labels: {
                    style: { colors: "#888", fontSize: "11px" },
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
            },
            yaxis: {
                min: 0,
                max: 600,
                tickAmount: 6,
                labels: {
                    style: { colors: "#888", fontSize: "11px" },
                    formatter: (val: number) => `${Math.round(val)}`,
                },
            },
            legend: { show: false },
            tooltip: {
                y: {
                    formatter: (val: number) => `${val} properties`,
                },
            },
        }),
        []
    );

    const availabilitySeries = useMemo(
        () => [{ name: "Available", data: AVAILABILITY_VALUES }],
        []
    );

    return (
        <section
            className="pf-location-details__area-bars"
            aria-label="Nearby prices and availability"
        >
            <div className="pf-location-details__area-bars-grid">
                {/* Nearby prices section*/}
                <article className="pf-location-details__area-bar-card pf-location-details__area-bar-card--nearby">
                    <h3 className="pf-location-details__area-bar-title">Nearby prices</h3>
                    <p className="pf-location-details__area-bar-sub pf-location-details__area-bar-sub--nearby">
                        Average price of a 1 bedroom apartment nearest to {locationName}
                    </p>
                    <div className="pf-location-details__area-bar-chart pf-location-details__nearby-chart">
                        <ReactApexChart
                            options={nearbyOptions}
                            series={nearbySeries}
                            type="bar"
                            height={320}
                        />
                    </div>
                </article>

                <article className="pf-location-details__area-bar-card">
                    <h3 className="pf-location-details__area-bar-title">
                        Properties available in the area
                    </h3>
                    <p className="pf-location-details__area-bar-sub">
                        2 bedrooms properties currently available in Palm Jumeirah by price range.
                    </p>
                    <div className="pf-location-details__area-bar-chart">
                        <ReactApexChart
                            options={availabilityOptions}
                            series={availabilitySeries}
                            type="bar"
                            height={300}
                        />
                    </div>
                </article>
            </div>
        </section>
    );
};

export default LocationAreaBarCharts;
