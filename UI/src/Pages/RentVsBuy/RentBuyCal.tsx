import React, { useEffect, useMemo, useState } from "react";
import ReactApexChart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import PFContainer from "../../Components/container/PFContainer";
import PayMentDownModal from "./PayMentDownModal";
import "../../assets/styles/RentBuy/RentBuyCal.scss";
import { BreadcrumbsComponentFirstLevel } from "../../Components/parts/component";
import { Box, Typography, TextField, Slider, Button, Grid } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import houseImg from "../../assets/img/Housesearching.png";
import rentBuyImg from "../../assets/img/rentbuy.png";
import { useNavigate } from "react-router-dom";
import Loader from "../../Components/loader/loader";
import {
    getResidencyStatusMasterData,
    postRentVsBuyCalculate,
    postRentVsBuyPaymentBreakdown,
    type RentVsBuyResidencyStatus,
    type RentVsBuyRequestBody,
    type RentVsBuyPaymentBreakdownResponseData,
    type RentVsBuyResponseData,
} from "../../services/apiService";
/** Slider track fills from center (0%) to thumb for range -50 … 50 */
function growthRateSliderSx(value: number): SxProps<Theme> {
    const p = (value + 50) / 100;
    const trackFromZero =
        value >= 0
            ? {
                left: "50% !important",
                width: `${Math.max(0, p - 0.5) * 100}% !important`,
            }
            : {
                left: `${p * 100}% !important`,
                width: `${Math.max(0, 0.5 - p) * 100}% !important`,
            };

    return {
        width: "100%",
        py: 0.25,
        "& .MuiSlider-rail": {
            opacity: 1,
            backgroundColor: "#dedede",
            height: 4,
            borderRadius: 999,
        },
        "& .MuiSlider-track": {
            border: "none",
            backgroundColor: "#2b2b2b",
            height: 4,
            borderRadius: 999,
            ...trackFromZero,
        },
        "& .MuiSlider-thumb": {
            width: 18,
            height: 18,
            backgroundColor: "#fff",
            border: "2px solid #2b2b2b",
            boxShadow: "none",
            "&:hover, &.Mui-focusVisible": {
                boxShadow: "0 0 0 4px rgba(43, 43, 43, 0.12)",
            },
            "&.Mui-active": {
                boxShadow: "0 0 0 6px rgba(43, 43, 43, 0.14)",
            },
        },
    };
}

const RentBuyCal: React.FC = () => {
    const navigate = useNavigate();
    const [annualRent, setAnnualRent] = useState(660_000);
    const [purchasePrice, setPurchasePrice] = useState(1_500_000);
    const [downPayment, setDownPayment] = useState(20);
    const [loanPeriod, setLoanPeriod] = useState(25);
    const [residencyOptions, setResidencyOptions] = useState<Array<{
        name: string;
        value: RentVsBuyResidencyStatus;
    }>>([]);
    const [selectedResidencyStatus, setSelectedResidencyStatus] =
        useState<RentVsBuyResidencyStatus | null>(null);
    const [chartTab, setChartTab] = useState<"comparison" | "monthly">("comparison");
    const [openPaymentDownModal, setOpenPaymentDownModal] = useState(false);
    const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
    const [fixedMortgagePeriod, setFixedMortgagePeriod] = useState(3);
    const [fixedInterestRate, setFixedInterestRate] = useState(4.5);
    const [reversionRate, setReversionRate] = useState(6.5);
    const [annualHomePriceGrowth, setAnnualHomePriceGrowth] = useState(0);
    const [annualRentGrowth, setAnnualRentGrowth] = useState(5);
    const [rentVsBuyResult, setRentVsBuyResult] =
        useState<RentVsBuyResponseData | null>(null);
    const [paymentBreakdownResult, setPaymentBreakdownResult] =
        useState<RentVsBuyPaymentBreakdownResponseData | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [isPaymentBreakdownLoading, setIsPaymentBreakdownLoading] = useState(false);
    const [calculationError, setCalculationError] = useState<string | null>(null);

    const faqs: { question: string; answer: string }[] = [
        {
            question: "Is it free to go to Palm Jumeirah?",
            answer:
                "Yes, visiting Palm Jumeirah is free. You can drive onto the island and enjoy public areas without an entry fee. Some attractions may charge separately.",
        },
        {
            question: "What is special about Palm Jumeirah?",
            answer:
                "Palm Jumeirah is an iconic man‑made island known for luxury resorts, beaches, and attractions like The Pointe and the Boardwalk.",
        },
        {
            question: "Is Palm Jumeirah expensive?",
            answer:
                "Costs vary. Public spaces are free, while dining, beach clubs, and attractions are paid. Hotels and fine dining can be premium‑priced.",
        },
        {
            question: "Who owns Palm Jumeirah?",
            answer:
                "Palm Jumeirah was developed by Nakheel, a Dubai government‑owned developer. Individual properties are owned by private owners.",
        },
        {
            question: "Can tourists buy property in Dubai?",
            answer:
                "Yes. Designated freehold areas allow foreigners to purchase property with full ownership, subject to applicable regulations.",
        },
        {
            question: "Do I need a residency visa to get a mortgage?",
            answer:
                "Not necessarily. Non‑residents can obtain mortgages with select banks, though terms and maximum LTV may differ from residents.",
        },
        {
            question: "What documents are required for a mortgage?",
            answer:
                "Typically: passport/ID, proof of income, bank statements, and property details. Exact requirements vary by lender.",
        },
        {
            question: "How long does mortgage approval take?",
            answer:
                "Pre‑approval can take a few days; full approval typically ranges from 1–3 weeks depending on documentation and valuation.",
        },
    ];

    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>();

    const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(value);
    const formatAED = (value: number) => `${formatNumber(Math.round(value))} AED`;
    const rentVsBuyPayload = useMemo<RentVsBuyRequestBody | null>(
        () => {
            if (!selectedResidencyStatus) return null;
            return {
                purchasePrice,
                residencyStatus: selectedResidencyStatus,
                downPayment: Math.round((purchasePrice * downPayment) / 100),
                loanPeriod,
                interestRate: fixedInterestRate,
                annualRent,
                comparisonYears: loanPeriod,
                rentIncreaseAnnualPct: annualRentGrowth,
                advanced: {
                    fixedMortgagePeriod,
                    fixedInterestRate,
                    reversionRate,
                    annualHomePriceGrowthRate: annualHomePriceGrowth,
                    annualRentGrowthRate: annualRentGrowth,
                },
            };
        },
        [
            purchasePrice,
            selectedResidencyStatus,
            downPayment,
            loanPeriod,
            fixedInterestRate,
            annualRent,
            annualRentGrowth,
            fixedMortgagePeriod,
            reversionRate,
            annualHomePriceGrowth,
        ]
    );

    useEffect(() => {
        let isMounted = true;
        getResidencyStatusMasterData()
            .then((response) => {
                if (!isMounted) return;
                const options = (response?.data?.residencyStatus ?? [])
                    .map((item) => ({
                        name: String(item?.name ?? "").trim(),
                        value: item?.value as RentVsBuyResidencyStatus,
                    }))
                    .filter((item) => item.name && item.value);
                setResidencyOptions(options);
                if (!options.length) {
                    setSelectedResidencyStatus(null);
                    return;
                }
                setSelectedResidencyStatus((current) =>
                    current && options.some((o) => o.value === current) ? current : options[0].value
                );
            })
            .catch(() => {
                setResidencyOptions([]);
                setSelectedResidencyStatus(null);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            try {
                if (purchasePrice < 330_000) {
                    setRentVsBuyResult(null);
                    setCalculationError("Purchase price must be at least AED 330,000.");
                    return;
                }
                if (annualRent <= 0) {
                    setRentVsBuyResult(null);
                    setCalculationError("Annual rent must be greater than 0.");
                    return;
                }
                if (!rentVsBuyPayload) {
                    setRentVsBuyResult(null);
                    return;
                }
                setIsCalculating(true);
                setCalculationError(null);
                const response = await postRentVsBuyCalculate(
                    rentVsBuyPayload,
                    controller.signal
                );
                setRentVsBuyResult(response?.data ?? null);
            } catch (error: unknown) {
                if ((error as { name?: string })?.name === "CanceledError") return;
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data
                        ?.message || "Unable to calculate rent vs buy right now.";
                setCalculationError(message);
            } finally {
                setIsCalculating(false);
            }
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [
        annualRent,
        purchasePrice,
        downPayment,
        loanPeriod,
        selectedResidencyStatus,
        fixedMortgagePeriod,
        fixedInterestRate,
        reversionRate,
        annualHomePriceGrowth,
        annualRentGrowth,
        rentVsBuyPayload,
    ]);

    const openPaymentBreakdown = async () => {
        setOpenPaymentDownModal(true);
        if (purchasePrice < 330_000 || annualRent <= 0 || !rentVsBuyPayload) return;

        try {
            setIsPaymentBreakdownLoading(true);
            setPaymentBreakdownResult(null);
            const response = await postRentVsBuyPaymentBreakdown(rentVsBuyPayload);
            setPaymentBreakdownResult(response?.data ?? null);
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message || "Unable to load payment breakdown right now.";
            setCalculationError(message);
            setPaymentBreakdownResult(null);
        } finally {
            setIsPaymentBreakdownLoading(false);
        }
    };

    const firstYearData = rentVsBuyResult?.yearlyComparison?.[0];
    const rentMonthlyValue =
        firstYearData?.rentMonthlyTotal ??
        Math.round(rentVsBuyResult?.input?.monthlyRent ?? annualRent / 12);
    const buyMonthlyValue =
        firstYearData?.buyMonthlyTotal ??
        Math.round(rentVsBuyResult?.paymentBreakdown?.monthly?.ownerOccupierTotal ?? 0);
    const monthlyPrincipalValue =
        rentVsBuyResult?.paymentBreakdown?.monthly?.mortgagePrincipal ?? 0;
    const monthlyInterestValue =
        rentVsBuyResult?.paymentBreakdown?.monthly?.mortgageInterest ?? 0;
    const monthlyOtherValue =
        (rentVsBuyResult?.paymentBreakdown?.monthly?.maintenance ?? 0) +
        (rentVsBuyResult?.paymentBreakdown?.monthly?.homeInsurance ?? 0) +
        (rentVsBuyResult?.paymentBreakdown?.monthly?.serviceCharges ?? 0) +
        (rentVsBuyResult?.paymentBreakdown?.monthly?.mortgageProtection ?? 0);

    const comparisonDiffSeries = (rentVsBuyResult?.yearlyComparison ?? []).map(
        (item) => (item.cumulativeRent - item.cumulativeBuy) / 1_000_000
    );
    const comparisonLabels =
        rentVsBuyResult?.yearlyComparison?.map((item) => `Y${item.year}`) ?? [];
    const fallbackComparison = [0, 0.45, 0.95, 1.4, 1.9, 2.5];
    const positiveDiffData = comparisonDiffSeries.length
        ? comparisonDiffSeries.map((v) => Math.max(0, v))
        : fallbackComparison;
    const negativeDiffData = comparisonDiffSeries.length
        ? comparisonDiffSeries.map((v) => Math.min(0, v))
        : fallbackComparison.map((v) => -v);
    const diffMax = Math.max(
        ...positiveDiffData.map((v) => Math.abs(v)),
        ...negativeDiffData.map((v) => Math.abs(v)),
        1
    );
    const yAxisRange = Math.ceil(diffMax * 1.15);
    /** Taller plot = more vertical pixels between each Y tick (same tickAmount). */
    const COMPARISON_CHART_HEIGHT = 260;
    const MONTHLY_CHART_HEIGHT = 260;

    const comparisonChartSeries = [
        { name: "Saved if buying", data: positiveDiffData },
        { name: "Lost if renting", data: negativeDiffData },
    ];

    const comparisonChartOptions: ApexOptions = {
        chart: {
            type: "area",
            toolbar: { show: false },
            zoom: { enabled: false },
        },
        dataLabels: { enabled: false },
        stroke: {
            curve: "straight",
            width: 2,
        },
        colors: ["#D4A373", "#1D44D2"],
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                inverseColors: false,
                opacityFrom: [0.95, 0.0],
                opacityTo: [0.0, 0.95],
                stops: [0, 100],
            },
        },
        grid: {
            borderColor: "#ECECEC",
            strokeDashArray: 0,
            xaxis: {
                lines: { show: false },
            },
            yaxis: {
                lines: { show: true },
            },
            padding: {
                left: 18,
                right: 12,
                top: 8,
                bottom: 4,
            },
        },
        xaxis: {
            categories:
                comparisonLabels.length > 0
                    ? comparisonLabels
                    : ["", "", "", "", "", ""],
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
            crosshairs: { show: false },
            tooltip: { enabled: false },
        },
        yaxis: {
            min: -yAxisRange,
            max: yAxisRange,
            tickAmount: 6,
            axisBorder: { show: true },
            labels: {
                style: {
                    colors: "#7B7B7B",
                    fontSize: "11px",
                },
                minWidth: 10,
                offsetX: 5,
                formatter: (value: number) => {
                    if (value === 0) return "";
                    return `${value > 0 ? "" : "-"}${Math.abs(value).toFixed(1)}M`;
                },
            },
        },
        legend: { show: false },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: (value: number) => `${value.toFixed(2)}M AED`,
            },
        },
    };

    const monthlyPaymentSeries = [
        {
            name: "Renting",
            data: [rentMonthlyValue],
        },
        {
            name: "Buying",
            data: [buyMonthlyValue],
        },
    ];
    const monthlyYAxisMax = Math.max(rentMonthlyValue, buyMonthlyValue, 10_000);
    const monthlyTick = Math.max(1, Math.ceil(monthlyYAxisMax / 6 / 1000) * 1000);

    const monthlyPaymentOptions: ApexOptions = {
        chart: {
            type: "bar",
            toolbar: { show: false },
            zoom: { enabled: false },
            stacked: false,
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "8%",
                borderRadius: 4,
            },
        },
        dataLabels: { enabled: false },
        colors: ["#D4A373", "#1D44D2"],
        grid: {
            borderColor: "#ECECEC",
            strokeDashArray: 0,
            xaxis: { lines: { show: false } },
            yaxis: { lines: { show: true } },
            padding: {
                left: 18,
                right: 12,
                top: 8,
                bottom: 4,
            },
        },
        xaxis: {
            categories: [""],
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            min: 0,
            max: monthlyTick * 6,
            tickAmount: 7,
            axisBorder: { show: true },
            labels: {
                style: {
                    colors: "#7B7B7B",
                    fontSize: "11px",
                },
                minWidth: 10,
                offsetX: 5,
                formatter: (value: number) => `${(value / 1000).toFixed(1)}k`,
            },
        },
        legend: { show: false },
        tooltip: {
            enabled: true,
            shared: false,
            intersect: true,
            custom: ({ seriesIndex, dataPointIndex }) => {
                if (dataPointIndex < 0) return "";

                if (seriesIndex === 0) {
                    return `
                        <div class="rent-buy-cal__chart-tooltip rent-buy-cal__chart-tooltip--rent">
                            <h4>
                                Rent payment
                                <span>${formatAED(rentMonthlyValue)}</span>
                            </h4>
                        </div>
                    `;
                }

                return `
                    <div class="rent-buy-cal__chart-tooltip rent-buy-cal__chart-tooltip--buy">
                        <h4 style="padding-bottom: 10px !important;">
                            Mortgage payment
                            <span>${formatAED(buyMonthlyValue)}</span>
                        </h4>
                        <p>
                            <i style="background-color:#A0B1E3"></i>
                            Principal
                            <span>${formatNumber(monthlyPrincipalValue)} AED</span>
                        </p>
                        <p>
                            <i style="background-color:#5372CF"></i>
                            Interest
                            <span>${formatNumber(monthlyInterestValue)} AED</span>
                        </p>
                        <p>
                            <i style="background-color:#1F3D51"></i>
                            Other
                            <span>${formatNumber(monthlyOtherValue)} AED</span>
                        </p>
                    </div>
                `;
            },
        },
    };
    const estimatedSavedIfBuying = Math.max(
        0,
        rentVsBuyResult?.totals?.differenceRentMinusBuy ?? 0
    );
    const estimatedLostIfRenting = Math.max(
        0,
        rentVsBuyResult?.totals?.differenceRentMinusNetBuy ??
        rentVsBuyResult?.totals?.differenceRentMinusBuy ??
        0
    );

    return (
        <>
            <div className="rent-buy-cal">
                <PFContainer>
                    <div className="rent-buy-cal__breadcrumbs">
                        <BreadcrumbsComponentFirstLevel
                            breadcrumbTitle="Home"
                            breadcrumbSubTitle1="Rent Vs Buy Calculator"
                            breadcrumbLinkTitleTo="/"
                        />
                    </div>

                    <h1 className="rent-buy-cal__title">Rent Vs Buy Calculator</h1>

                    <section className="rent-buy-cal__panel">
                        <div className="rent-buy-cal__left">
                            <h3 className="rent-buy-cal__section-title">Calculate</h3>
                            <Typography className="pf-property-drilldown__mortgage-field-label">
                                Annual rent
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-input-card">
                                <Box className="wwq">
                                    <TextField
                                        value={annualRent}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9]/g, "");

                                            setAnnualRent(raw ? Number(raw) : 0);
                                        }}
                                        size="small"
                                        className="pf-property-drilldown__mortgage-input"
                                    />
                                    <Slider
                                        value={annualRent}
                                        onChange={(_e, value) =>
                                            setAnnualRent(value as number)
                                        }
                                        min={20000}
                                        max={2000000}
                                        className="wwq__price-slider"
                                    />
                                </Box>
                                <Box className="pf-property-drilldown__mortgage-slider-meta">
                                    <Typography>Min – 20,000 AED</Typography>
                                    <Typography>Max – 2,000,000 AED</Typography>
                                </Box>
                            </Box>
                            <Typography className="pf-property-drilldown__mortgage-field-label">
                                Purchase price
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-input-card">
                                <Box className="wwq">
                                    <TextField
                                        value={purchasePrice}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9]/g, "");

                                            setPurchasePrice(raw ? Number(raw) : 0);
                                        }}
                                        size="small"
                                        className="pf-property-drilldown__mortgage-input"
                                    />
                                    <Slider
                                        value={purchasePrice}
                                        onChange={(_e, value) =>
                                            setPurchasePrice(value as number)
                                        }
                                        min={330000}
                                        max={200000000}
                                        className="wwq__price-slider"
                                    />
                                </Box>
                                <Box className="pf-property-drilldown__mortgage-slider-meta">
                                    <Typography>Min – 330,000 AED</Typography>
                                    <Typography>Max – 200,000,000 AED</Typography>
                                </Box>
                            </Box>

                            <div className="rent-buy-cal__field">
                                <label>Residency status</label>
                                <div className="rent-buy-cal__residency">
                                    {residencyOptions.map((status) => (
                                        <button
                                            key={status.value}
                                            type="button"
                                            className={selectedResidencyStatus === status.value ? "is-active" : ""}
                                            onClick={() => setSelectedResidencyStatus(status.value)}
                                        >
                                            {status.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Typography className="pf-property-drilldown__mortgage-field-label">
                                Down payment
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-input-card">
                                <Box className="wwq">
                                    <TextField
                                        value={downPayment}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9]/g, "");

                                            setDownPayment(raw ? Number(raw) : 0);
                                        }}
                                        size="small"
                                        className="pf-property-drilldown__mortgage-input"
                                    />
                                    <Slider
                                        value={downPayment}
                                        onChange={(_e, value) =>
                                            setDownPayment(value as number)
                                        }
                                        min={20}
                                        max={80}
                                        className="wwq__price-slider"
                                    />
                                </Box>
                                <Box className="pf-property-drilldown__mortgage-slider-meta">
                                    <Typography>Min – 20%</Typography>
                                    <Typography>Max – 80%</Typography>
                                </Box>
                            </Box>
                            <Typography className="pf-property-drilldown__mortgage-field-label">
                                Mortgage loan period
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-input-card">
                                <Box className="wwq">
                                    {/* <Typography className="pf-property-drilldown__mortgage-field-value">
                                {loanPeriod} years
                              </Typography> */}
                                    <TextField
                                        value={loanPeriod}
                                        onChange={(e) => {
                                            const raw = e.target.value.replace(/[^0-9]/g, "");

                                            setLoanPeriod(raw ? Number(raw) : 0);
                                        }}
                                        size="small"
                                        className="pf-property-drilldown__mortgage-input"
                                    />
                                    <Slider
                                        value={loanPeriod}
                                        onChange={(_e, value) =>
                                            setLoanPeriod(value as number)
                                        }
                                        min={1}
                                        max={25}
                                        className="wwq__price-slider"
                                    />
                                </Box>
                                <Box className="pf-property-drilldown__mortgage-slider-meta">
                                    <Typography>Min – 1 year</Typography>
                                    <Typography>Max – 25 years</Typography>
                                </Box>
                            </Box>

                            {!moreOptionsOpen ? (
                                <button
                                    type="button"
                                    className="rent-buy-cal__more-options"
                                    onClick={() => setMoreOptionsOpen(true)}
                                >
                                    More options
                                    <span className="rent-buy-cal__more-options-chevron" aria-hidden />
                                </button>
                            ) : (
                                <div className="rent-buy-cal__more-panel">
                                    <button
                                        type="button"
                                        className="rent-buy-cal__more-panel-header"
                                        onClick={() => setMoreOptionsOpen(false)}
                                    >
                                        More options
                                        <span className="rent-buy-cal__more-options-chevron rent-buy-cal__more-options-chevron--up" aria-hidden />
                                    </button>

                                    <div className="rent-buy-cal__more-option-group">
                                        <Typography className="pf-property-drilldown__mortgage-field-label">
                                            Fixed mortgage period
                                        </Typography>
                                        <Box className="pf-property-drilldown__mortgage-input-card rent-buy-cal__more-input-card">
                                            <Box className="wwq">
                                                <TextField
                                                    value={fixedMortgagePeriod}
                                                    onChange={(e) => {
                                                        const raw = e.target.value.replace(/[^0-9]/g, "");

                                                        setFixedMortgagePeriod(
                                                            raw ? Math.min(25, Math.max(1, Number(raw))) : 1,
                                                        );
                                                    }}
                                                    size="small"
                                                    className="pf-property-drilldown__mortgage-input"
                                                />
                                                <Slider
                                                    value={fixedMortgagePeriod}
                                                    onChange={(_e, value) =>
                                                        setFixedMortgagePeriod(value as number)
                                                    }
                                                    min={1}
                                                    max={25}
                                                    className="wwq__price-slider"
                                                />
                                            </Box>
                                            <Box className="pf-property-drilldown__mortgage-slider-meta">
                                                <Typography>Min – 1 year</Typography>
                                                <Typography>Max – 25 years</Typography>
                                            </Box>
                                        </Box>
                                    </div>

                                    <div className="rent-buy-cal__more-option-group">
                                        <Typography className="pf-property-drilldown__mortgage-field-label">
                                            Fixed interest rate
                                        </Typography>
                                        <Box className="pf-property-drilldown__mortgage-input-card rent-buy-cal__more-input-card">
                                            <Box className="wwq">
                                                <TextField
                                                    value={fixedInterestRate}
                                                    onChange={(e) => {
                                                        const raw = e.target.value.replace(/[^0-9]/g, "");

                                                        setFixedInterestRate(
                                                            raw ? Math.min(10, Math.max(1, Number(raw))) : 1,
                                                        );
                                                    }}
                                                    size="small"
                                                    className="pf-property-drilldown__mortgage-input"
                                                />
                                                <Slider
                                                    value={fixedInterestRate}
                                                    onChange={(_e, value) =>
                                                        setFixedInterestRate(value as number)
                                                    }
                                                    min={1}
                                                    max={10}
                                                    className="wwq__price-slider"
                                                />
                                            </Box>
                                            <Box className="pf-property-drilldown__mortgage-slider-meta">
                                                <Typography>Min – 1</Typography>
                                                <Typography>Max – 10</Typography>
                                            </Box>
                                        </Box>
                                    </div>

                                    <div className="rent-buy-cal__more-option-group">
                                        <Typography className="pf-property-drilldown__mortgage-field-label">
                                            Reversion rate
                                        </Typography>
                                        <Box className="pf-property-drilldown__mortgage-input-card rent-buy-cal__more-input-card">
                                            <Box className="wwq">
                                                <TextField
                                                    value={reversionRate}
                                                    onChange={(e) => {
                                                        const cleaned = e.target.value.replace(/[^0-9.]/g, "");
                                                        const n = parseFloat(cleaned);

                                                        if (Number.isNaN(n)) {
                                                            setReversionRate(1);

                                                            return;
                                                        }
                                                        const clamped = Math.min(10, Math.max(1, n));

                                                        setReversionRate(Math.round(clamped * 100) / 100);
                                                    }}
                                                    size="small"
                                                    className="pf-property-drilldown__mortgage-input"
                                                />
                                                <Slider
                                                    value={reversionRate}
                                                    onChange={(_e, value) =>
                                                        setReversionRate(value as number)
                                                    }
                                                    min={1}
                                                    max={10}
                                                    step={0.01}
                                                    className="wwq__price-slider"
                                                />
                                            </Box>
                                            <Box className="pf-property-drilldown__mortgage-slider-meta">
                                                <Typography>Min – 1</Typography>
                                                <Typography>Max – 10</Typography>
                                            </Box>
                                        </Box>
                                    </div>

                                    <div className="rent-buy-cal__more-option-group rent-buy-cal__more-option-group--growth">
                                        <Typography className="pf-property-drilldown__mortgage-field-label">
                                            Annual home price growth rate
                                        </Typography>
                                        <div className="rent-buy-cal__growth-row">
                                            <div className="rent-buy-cal__growth-input-wrap">
                                                <TextField
                                                    value={annualHomePriceGrowth}
                                                    onChange={(e) => {
                                                        const raw = e.target.value.replace(/[^0-9.-]/g, "");
                                                        if (raw === "" || raw === "-") {
                                                            setAnnualHomePriceGrowth(0);

                                                            return;
                                                        }
                                                        const n = Number(raw);
                                                        if (Number.isNaN(n)) return;
                                                        setAnnualHomePriceGrowth(Math.min(50, Math.max(-50, n)));
                                                    }}
                                                    size="small"
                                                    className="rent-buy-cal__growth-textfield"
                                                />
                                            </div>
                                            <div className="rent-buy-cal__growth-slider-shell">
                                                <Slider
                                                    value={annualHomePriceGrowth}
                                                    onChange={(_e, value) =>
                                                        setAnnualHomePriceGrowth(value as number)
                                                    }
                                                    min={-50}
                                                    max={50}
                                                    sx={growthRateSliderSx(annualHomePriceGrowth)}
                                                />
                                                <Box className="rent-buy-cal__growth-slider-meta-tri">
                                                    <Typography component="span">-50%</Typography>
                                                    <Typography component="span">0</Typography>
                                                    <Typography component="span">50%</Typography>
                                                </Box>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rent-buy-cal__more-option-group rent-buy-cal__more-option-group--growth">
                                        <Typography className="pf-property-drilldown__mortgage-field-label">
                                            Annual rent growth rate
                                        </Typography>
                                        <div className="rent-buy-cal__growth-row">
                                            <div className="rent-buy-cal__growth-input-wrap">
                                                <TextField
                                                    value={annualRentGrowth}
                                                    onChange={(e) => {
                                                        const raw = e.target.value.replace(/[^0-9.-]/g, "");
                                                        if (raw === "" || raw === "-") {
                                                            setAnnualRentGrowth(0);

                                                            return;
                                                        }
                                                        const n = Number(raw);
                                                        if (Number.isNaN(n)) return;
                                                        setAnnualRentGrowth(Math.min(50, Math.max(-50, n)));
                                                    }}
                                                    size="small"
                                                    className="rent-buy-cal__growth-textfield"
                                                />
                                            </div>
                                            <div className="rent-buy-cal__growth-slider-shell">
                                                <Slider
                                                    value={annualRentGrowth}
                                                    onChange={(_e, value) =>
                                                        setAnnualRentGrowth(value as number)
                                                    }
                                                    min={-50}
                                                    max={50}
                                                    sx={growthRateSliderSx(annualRentGrowth)}
                                                />
                                                <Box className="rent-buy-cal__growth-slider-meta-tri">
                                                    <Typography component="span">-50%</Typography>
                                                    <Typography component="span">0</Typography>
                                                    <Typography component="span">50%</Typography>
                                                </Box>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="rent-buy-cal__right">
                            {isCalculating && (
                                <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                                    <Loader size={48} margin={0} />
                                </Box>
                            )}
                            {calculationError && (
                                <Typography className="pf-property-drilldown__mortgage-summary-label">
                                    {calculationError}
                                </Typography>
                            )}
                            <div className="rent-buy-cal__chart-card">
                                <div className="rent-buy-cal__tabs">
                                    <button
                                        type="button"
                                        className={chartTab === "comparison" ? "is-active" : ""}
                                        onClick={() => setChartTab("comparison")}
                                    >
                                        Comparison
                                    </button>
                                    <button
                                        type="button"
                                        className={chartTab === "monthly" ? "is-active" : ""}
                                        onClick={() => setChartTab("monthly")}
                                    >
                                        Monthly payment
                                    </button>
                                </div>

                                <div className="rent-buy-cal__legend">
                                    <div><i className="dot red" /><span className="rent-buy-cal__legend-text"> {chartTab === "comparison" ? "Saved if buying" : "Renting"}</span></div>
                                    <div><i className="dot blue" /><span className="rent-buy-cal__legend-text"> {chartTab === "comparison" ? "Lost if renting" : "Buying"}</span></div>
                                </div>

                                {chartTab === "comparison" ? (
                                    <div className="rent-buy-cal__chart-wrap rent-buy-cal__chart-wrap--comparison">
                                        <ReactApexChart
                                            options={comparisonChartOptions}
                                            series={comparisonChartSeries}
                                            type="area"
                                            height={COMPARISON_CHART_HEIGHT}
                                        />
                                    </div>
                                ) : (
                                    <div className="rent-buy-cal__monthly-graph">
                                        <div className="rent-buy-cal__chart-wrap rent-buy-cal__chart-wrap--bars">
                                            <ReactApexChart
                                                options={monthlyPaymentOptions}
                                                series={monthlyPaymentSeries}
                                                type="bar"
                                                height={MONTHLY_CHART_HEIGHT}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="rent-buy-cal__estimation">
                                <h4>Estimated cost of renting and buying</h4>
                                <div className="rent-buy-cal__estimation-values">
                                    <div>
                                        <small>{chartTab === "comparison" ? "Saved if buying" : "Renting"}</small>
                                        <strong>
                                            {chartTab === "comparison"
                                                ? formatAED(estimatedSavedIfBuying)
                                                : formatAED(rentMonthlyValue)}
                                        </strong>
                                    </div>
                                    <div>
                                        <small>{chartTab === "comparison" ? "Lost if renting" : "Buying"}</small>
                                        <strong>
                                            {chartTab === "comparison"
                                                ? formatAED(estimatedLostIfRenting)
                                                : formatAED(buyMonthlyValue)}
                                        </strong>
                                    </div>
                                </div>
                                <button onClick={openPaymentBreakdown} type="button" className="rent-buy-cal__breakdown-btn">Payment Breakdown</button>
                            </div>

                            <button type="button" className="rent-buy-cal__quote-btn">
                                Get a mortgage Quote
                            </button>
                        </div>
                    </section>
                </PFContainer>
                <PayMentDownModal
                    open={openPaymentDownModal}
                    onClose={() => setOpenPaymentDownModal(false)}
                    loading={isPaymentBreakdownLoading}
                    periodLabel={`Net costs over ${paymentBreakdownResult?.input?.comparisonYears ?? rentVsBuyResult?.input?.comparisonYears ?? loanPeriod} years`}
                    breakdown={paymentBreakdownResult?.paymentBreakdown?.overHorizon ?? null}
                />
            </div>
            <PFContainer>
                <Box className="mortgage-cal-faq">
                    <Typography className="mortgage-cal-faq__title">
                        Frequently asked questions
                    </Typography>
                    <Grid container spacing={2}>
                        {[0, 1].map((col) => (
                            <Grid key={col} size={{ xs: 12, md: 6 }}>
                                <Box className="mortgage-cal-faq__col">
                                    {faqs
                                        .filter((_, i) => i % 2 === col)
                                        .map((item, idxInCol) => {
                                            const absoluteIndex =
                                                col + idxInCol * 2;
                                            const open =
                                                openFaqIndex === absoluteIndex;
                                            return (
                                                <Box
                                                    key={absoluteIndex}
                                                    className={`mortgage-cal-faq__item ${open ? "mortgage-cal-faq__item--open" : ""
                                                        }`}
                                                >
                                                    <div
                                                        className="mortgage-cal-faq__q"
                                                        onClick={() =>
                                                            setOpenFaqIndex(
                                                                open
                                                                    ? null
                                                                    : absoluteIndex
                                                            )
                                                        }
                                                    >
                                                        <span className="mortgage-cal-faq__q-text">
                                                            {item.question}
                                                        </span>
                                                        <span
                                                            className={`mortgage-cal-faq__toggle ${open ? "is-open" : ""
                                                                }`}
                                                            aria-hidden
                                                        />
                                                    </div>
                                                    {open && (
                                                        <Typography className="mortgage-cal-faq__a">
                                                            {item.answer}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </PFContainer>
            {/*RentBuy section*/}
            <Box className="mortgage-cal-rentbuy">
                <Box className="mortgage-cal-rentbuy__left">
                    <img
                        className="mortgage-cal-rentbuy__img"
                        src={rentBuyImg}
                        alt="Rent or buy"
                    />
                </Box>
                <Box className="mortgage-cal-rentbuy__right">
                    <Typography className="mortgage-cal-rentbuy__title">
                        Continue your home buying
                        journey
                    </Typography>
                    <Typography className="mortgage-cal-rentbuy__subtitle">
                        Find a place to call your own or check if you are qualified for a mortgage.
                    </Typography>
                    <Button
                        className="mortgage-cal-rentbuy__btn"
                        onClick={() => navigate("/searchlisting")}
                    >
                        Go to Mortgage calculator
                    </Button>
                </Box>
            </Box>
        </>


    );
};

export default RentBuyCal;
