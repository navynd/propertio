import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, Slider, TextField } from "@mui/material";
import Grid from "@mui/material/Grid";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentFirstLevel } from "../../Components/parts/component";
import {
    getResidencyStatusMasterData,
    postMortgageCalculate,
    type MortgageResidencyStatus,
    type MortgageCalculateResponseData,
} from "../../services/apiService";
import houseImg from "../../assets/img/Housesearching.png";
import rentBuyImg from "../../assets/img/rentbuy.png";
import rentBuyBg from "../../assets/img/rentbuybanner.png";
import "../../assets/styles/propertyDrilldown.scss";
import "../../assets/styles/MortgageCal.scss";
import MortgageQuoteModal from "./MortgageQuoteModal";
import UpfrontCostsModal from "./UpfrontCostsModal";

export type MortgageCalProps = {
    /** When true, hides page chrome and fits inside property drilldown */
    embedded?: boolean;
    initialPurchasePrice?: number;
    onViewUpfrontCosts?: () => void;
    onGetMortgageQuote?: () => void;
    propertiesInBudget?: number;
};

const MortgageCal: React.FC<MortgageCalProps> = ({
    embedded = false,
    initialPurchasePrice = 1_500_000,
    onViewUpfrontCosts,
    onGetMortgageQuote,
    propertiesInBudget = 26_637,
}) => {
    const navigate = useNavigate();
    const [openUpfrontCostsModal, setOpenUpfrontCostsModal] = useState(false);
    const [purchasePrice, setPurchasePrice] = useState(initialPurchasePrice);
    const [downPayment, setDownPayment] = useState(20);
    const [loanPeriod, setLoanPeriod] = useState(25);
    const [interestRate, setInterestRate] = useState(4.5);
    const [interestRateInput, setInterestRateInput] = useState("4.50");
    const fallbackResidencyOptions: Array<{
        name: string;
        value: MortgageResidencyStatus;
    }> = [
            { name: "Citizen", value: "uae-national" },
            { name: "Resident", value: "uae-resident" },
            { name: "International Buyer", value: "non-resident" },
        ];
    const [residencyOptions, setResidencyOptions] = useState(fallbackResidencyOptions);
    const [residencyStatus, setResidencyStatus] = useState<MortgageResidencyStatus>(
        "uae-resident"
    );
    const [priceInput, setPriceInput] = useState("");
    const [mortgageResult, setMortgageResult] =
        useState<MortgageCalculateResponseData | null>(null);
    const [isCalculatingMortgage, setIsCalculatingMortgage] = useState(false);
    const [mortgageError, setMortgageError] = useState<string | null>(null);

    const [openMortgageQuoteModal, setOpenMortgageQuoteModal] = useState(false);

    useEffect(() => {
        setPurchasePrice(initialPurchasePrice);
    }, [initialPurchasePrice]);

    const loanAmount = 100 - downPayment;

    const formatNumber = useCallback(
        (value: number) => new Intl.NumberFormat("en-IN").format(value),
        []
    );
    const formatAED = (value: number) => `AED ${formatNumber(value)}`;

    const localDownPaymentAmount = Math.round((purchasePrice * downPayment) / 100);
    const localLoanAmountValue = Math.round((purchasePrice * loanAmount) / 100);
    const principalAmount = mortgageResult?.output.principal ?? localLoanAmountValue;
    const totalMonths = Math.max(1, loanPeriod * 12);
    const monthlyRate = interestRate / 100 / 12;
    const fallbackMonthlyPayment =
        monthlyRate === 0
            ? localLoanAmountValue / totalMonths
            : (localLoanAmountValue *
                monthlyRate *
                Math.pow(1 + monthlyRate, totalMonths)) /
            (Math.pow(1 + monthlyRate, totalMonths) - 1);
    const monthlyPayment =
        mortgageResult?.output.monthlyPayment ?? fallbackMonthlyPayment;
    const totalPayment =
        mortgageResult?.output.totalPayment ?? fallbackMonthlyPayment * totalMonths;
    const totalInterestPaid =
        mortgageResult?.output.totalInterest ??
        Math.max(0, totalPayment - localLoanAmountValue);
    const principalShare =
        mortgageResult?.output.principalPct != null
            ? mortgageResult.output.principalPct / 100
            : principalAmount / Math.max(1, principalAmount + totalInterestPaid);
    const interestShare =
        mortgageResult?.output.interestPct != null
            ? mortgageResult.output.interestPct / 100
            : totalInterestPaid / Math.max(1, principalAmount + totalInterestPaid);
    const donutRadius = 38;
    const donutCircumference = 2 * Math.PI * donutRadius;
    const principalStroke = principalShare * donutCircumference;
    const interestStroke = interestShare * donutCircumference;

    const interestShareOfPayment =
        mortgageResult?.output.interestPct != null
            ? mortgageResult.output.interestPct.toFixed(2)
            : totalPayment > 0
                ? ((totalInterestPaid / totalPayment) * 100).toFixed(2)
                : "0";

    const syncPriceInput = useCallback(() => {
        setPriceInput(formatNumber(purchasePrice));
    }, [purchasePrice, formatNumber]);

    useEffect(() => {
        syncPriceInput();
    }, [syncPriceInput]);

    const minDownPaymentPct = mortgageResult?.calculated.minDownPaymentPct ?? 20;
    const maxLoanAmountPct = 100 - minDownPaymentPct;
    const downPaymentAmount = mortgageResult?.input.downPayment ?? localDownPaymentAmount;
    const loanAmountValue = mortgageResult?.calculated.loanAmount ?? localLoanAmountValue;
    const propertiesCount =
        mortgageResult?.output.propertiesInBudget ?? propertiesInBudget;
    const purchasePriceMin = mortgageResult?.sliderConfig?.purchasePrice?.min ?? 330_000;
    const purchasePriceMax =
        mortgageResult?.sliderConfig?.purchasePrice?.max ?? 200_000_000;
    const downPaymentMinAmount =
        mortgageResult?.sliderConfig?.downPayment?.min ??
        Math.round((purchasePrice * minDownPaymentPct) / 100);
    const downPaymentMaxAmount = Math.round((purchasePrice * 80) / 100);
    const loanAmountMinAmount = Math.round((purchasePrice * 20) / 100);
    const loanAmountMaxAmount = Math.round((purchasePrice * maxLoanAmountPct) / 100);
    const calculatorSnapshot = {
        purchasePrice,
        residencyStatus,
        downPayment: downPaymentAmount,
        downPaymentPct: downPayment,
        loanAmount: loanAmountValue,
        loanPeriod,
        interestRate,
        monthlyPayment: Math.round(monthlyPayment),
        totalInterest: Math.round(totalInterestPaid),
    };

    useEffect(() => {
        let isMounted = true;
        const allowedValues = new Set<MortgageResidencyStatus>([
            "uae-national",
            "uae-resident",
            "non-resident",
        ]);

        const loadResidencyStatuses = async () => {
            try {
                const response = await getResidencyStatusMasterData();
                const apiItems = response?.data?.residencyStatus ?? [];
                const options = apiItems
                    .filter(
                        (item): item is { name: string; value: MortgageResidencyStatus } =>
                            Boolean(item?.name) &&
                            Boolean(item?.value) &&
                            allowedValues.has(item.value as MortgageResidencyStatus)
                    )
                    .map((item) => ({
                        name: item.name,
                        value: item.value,
                    }));

                if (!isMounted || !options.length) return;
                setResidencyOptions(options);
                setResidencyStatus((current) =>
                    options.some((option) => option.value === current)
                        ? current
                        : options[0].value
                );
            } catch {
                // Keep fallback options when master-data call fails.
            }
        };

        loadResidencyStatuses();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            try {
                if (purchasePrice < 330_000) {
                    setMortgageResult(null);
                    setMortgageError("Purchase price must be at least AED 330,000.");
                    return;
                }
                setIsCalculatingMortgage(true);
                setMortgageError(null);
                const response = await postMortgageCalculate(
                    {
                        purchasePrice,
                        residencyStatus,
                        downPayment: localDownPaymentAmount,
                        loanPeriod,
                        interestRate,
                    },
                    controller.signal
                );
                const result = response?.data ?? null;
                setMortgageResult(result);
                if (result?.calculated?.downPaymentPct != null) {
                    setDownPayment((current) =>
                        current === result.calculated.downPaymentPct
                            ? current
                            : result.calculated.downPaymentPct
                    );
                }
            } catch (error: unknown) {
                if ((error as { name?: string })?.name === "CanceledError") return;
                setMortgageError("Unable to calculate mortgage right now.");
            } finally {
                setIsCalculatingMortgage(false);
            }
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [
        purchasePrice,
        residencyStatus,
        localDownPaymentAmount,
        loanPeriod,
        interestRate,
    ]);

    const handleDownChange = (value: number) => {
        const v = Math.min(80, Math.max(minDownPaymentPct, value));
        setDownPayment(v);
    };

    const handleLoanSlider = (value: number) => {
        const loanPct = Math.min(maxLoanAmountPct, Math.max(20, value));
        setDownPayment(100 - loanPct);
    };

    const shellClass = embedded
        ? "mortgage-cal__shell mortgage-cal__shell--embedded"
        : "mortgage-cal__shell";

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

    const inner = (
        <Box className={shellClass}>
            <Grid container spacing={0} sx={{ m: 0 }}>
                <Grid size={{ xs: 12, lg: 4.8, xl: 4.5, md: 4.5 }} sx={{ p: 0 }}>
                    <Box className="mortgage-cal__card mortgage-cal__card--inputs pf-property-drilldown__mortgage-panel pf-property-drilldown__mortgage-panel--left">
                        <Typography className="pf-property-drilldown__mortgage-title">
                            Get the right mortgage
                        </Typography>

                        <Typography className="pf-property-drilldown__mortgage-field-label">
                            Purchase price
                        </Typography>
                        <Box className="pf-property-drilldown__mortgage-input-card">
                            <Box className="pf-property-drilldown__mortgage-slider-row">
                                <TextField
                                    value={priceInput}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, "");
                                        setPriceInput(e.target.value);
                                        if (raw) {
                                            const n = Number(raw);
                                            if (n >= purchasePriceMin && n <= purchasePriceMax) {
                                                setPurchasePrice(n);
                                            }
                                        }
                                    }}
                                    onBlur={() => {
                                        const raw = priceInput.replace(/[^0-9]/g, "");
                                        const n = raw ? Number(raw) : purchasePrice;
                                        const clamped = Math.min(
                                            purchasePriceMax,
                                            Math.max(
                                                purchasePriceMin,
                                                n || purchasePriceMin
                                            )
                                        );
                                        setPurchasePrice(clamped);
                                        setPriceInput(formatNumber(clamped));
                                    }}
                                    size="small"
                                    className="pf-property-drilldown__mortgage-input"
                                />
                                <Slider
                                    value={purchasePrice}
                                    onChange={(_e, value) =>
                                        setPurchasePrice(value as number)
                                    }
                                    min={purchasePriceMin}
                                    max={purchasePriceMax}
                                    className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                            </Box>
                            <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>Min – {formatAED(purchasePriceMin)}</Typography>
                                <Typography>Max – {formatAED(purchasePriceMax)}</Typography>
                            </Box>
                        </Box>

                        <Box className="pf-property-drilldown__mortgage-residency-section">
                            <Typography className="pf-property-drilldown__mortgage-field-label">
                                Residency status
                            </Typography>
                            <Box className="pf-property-drilldown__mortgage-residency">
                                {residencyOptions.map((status) => (
                                    <Button
                                        key={status.value}
                                        className={`pf-property-drilldown__mortgage-residency-btn ${residencyStatus === status.value
                                            ? "pf-property-drilldown__mortgage-residency-btn--active"
                                            : ""
                                            }`}
                                        onClick={() => setResidencyStatus(status.value)}
                                    >
                                        {status.name}
                                    </Button>
                                ))}
                            </Box>
                        </Box>

                        <Typography className="pf-property-drilldown__mortgage-field-label">
                            Down payment
                        </Typography>
                        <Box className="pf-property-drilldown__mortgage-input-card">
                            <Box className="pf-property-drilldown__mortgage-slider-row">
                                <Box className="pf-property-drilldown__mortgage-heading-values">
                                    <Typography className="pf-property-drilldown__mortgage-percentage">
                                        {downPayment}%
                                    </Typography>
                                    <Typography className="pf-property-drilldown__mortgage-field-value">
                                        {formatNumber(downPaymentAmount)}
                                    </Typography>
                                </Box>
                                <Slider
                                    value={downPayment}
                                    onChange={(_e, value) =>
                                        handleDownChange(value as number)
                                    }
                                    min={minDownPaymentPct}
                                    max={80}
                                    className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                            </Box>
                            <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>
                                    Min – {formatAED(downPaymentMinAmount)}
                                </Typography>
                                <Typography>Max – {formatAED(downPaymentMaxAmount)}</Typography>
                            </Box>
                        </Box>

                        <Typography className="pf-property-drilldown__mortgage-field-label">
                            Loan amount
                        </Typography>
                        <Box className="pf-property-drilldown__mortgage-input-card">
                            <Box className="pf-property-drilldown__mortgage-slider-row">
                                <Box className="pf-property-drilldown__mortgage-heading-values">
                                    <Typography className="pf-property-drilldown__mortgage-percentage">
                                        {loanAmount}%
                                    </Typography>
                                    <Typography className="pf-property-drilldown__mortgage-field-value">
                                        {formatNumber(loanAmountValue)}
                                    </Typography>
                                </Box>
                                <Slider
                                    value={loanAmount}
                                    onChange={(_e, value) =>
                                        handleLoanSlider(value as number)
                                    }
                                    min={20}
                                    max={maxLoanAmountPct}
                                    className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                            </Box>
                            <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>
                                    Min – {formatAED(loanAmountMinAmount)}
                                </Typography>
                                <Typography>Max – {formatAED(loanAmountMaxAmount)}</Typography>
                            </Box>
                        </Box>

                        <Typography className="pf-property-drilldown__mortgage-field-label">
                            Loan period
                        </Typography>
                        <Box className="pf-property-drilldown__mortgage-input-card">
                            <Box className="pf-property-drilldown__mortgage-slider-row">
                                <TextField
                                    value={loanPeriod || ""}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9]/g, "");
                                        setLoanPeriod(raw ? Number(raw) : 0);
                                    }}
                                    size="small"
                                    className="pf-property-drilldown__mortgage-input"
                                />
                                <Slider
                                    value={loanPeriod < 1 ? 1 : loanPeriod}
                                    onChange={(_e, value) => setLoanPeriod(value as number)}
                                    min={1}
                                    max={25}
                                    className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                            </Box>
                            <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>Min – 1 year</Typography>
                                <Typography>Max – 25 years</Typography>
                            </Box>
                        </Box>

                        <Typography className="pf-property-drilldown__mortgage-field-label">
                            Interest rate
                        </Typography>
                        <Box className="pf-property-drilldown__mortgage-input-card">
                            <Box className="pf-property-drilldown__mortgage-slider-row">
                                <TextField
                                    value={interestRateInput}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                                        setInterestRateInput(raw);
                                        const numeric = parseFloat(raw);
                                        if (!Number.isNaN(numeric)) {
                                            setInterestRate(
                                                Math.min(10, Math.max(1, numeric))
                                            );
                                        }
                                    }}
                                    size="small"
                                    className="pf-property-drilldown__mortgage-input"
                                />
                                <Slider
                                    value={interestRate}
                                    onChange={(_e, value) => {
                                        const numeric = value as number;
                                        setInterestRate(numeric);
                                        setInterestRateInput(numeric.toFixed(2));
                                    }}
                                    min={1}
                                    max={10}
                                    step={0.25}
                                    className="pf-property-drilldown__mortgage-slider pf-search-listing__price-slider"
                                />
                            </Box>
                            <Box className="pf-property-drilldown__mortgage-slider-meta">
                                <Typography>Min – 1%</Typography>
                                <Typography>Max – 10%</Typography>
                            </Box>
                        </Box>
                    </Box>
                </Grid>

                <Grid size={{ xs: 12, lg: 4, xl: 3.5, md: 4.5 }} sx={{ p: 0 }}>
                    <Box className="mortgage-cal__card mortgage-cal__card--chart pf-property-drilldown__mortgage-panel pf-property-drilldown__mortgage-panel--right mortgagesection-chart">
                        <Box className="pf-property-drilldown__mortgage-summary">
                            <Box className="pf-property-drilldown__mortgage-summary-chart-container">
                                <Box className="pf-property-drilldown__mortgage-summary-legend">
                                    <Box className="pf-property-drilldown__mortgage-summary-legend-item">
                                        <span className="pf-property-drilldown__mortgage-summary-dot pf-property-drilldown__mortgage-summary-dot--principal" />
                                        <Typography className="pf-property-drilldown__mortgage-summary-legend-item-text">
                                            Principal
                                        </Typography>
                                    </Box>
                                    <Box className="pf-property-drilldown__mortgage-summary-legend-item">
                                        <span className="pf-property-drilldown__mortgage-summary-dot pf-property-drilldown__mortgage-summary-dot--interest" />
                                        <Typography className="pf-property-drilldown__mortgage-summary-legend-item-text">
                                            Interest
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box className="pf-property-drilldown__mortgage-summary-chart">
                                    <Box className="pf-property-drilldown__mortgage-summary-chart-inner mortgage-cal__donut-wrap">
                                        <svg
                                            viewBox="0 0 120 120"
                                            className="pf-property-drilldown__mortgage-summary-chart-svg"
                                        >
                                            <circle
                                                cx="60"
                                                cy="60"
                                                r={donutRadius}
                                                fill="none"
                                                stroke="#F4F5F7"
                                                strokeWidth="18"
                                                strokeLinecap="round"
                                                transform="rotate(-90 60 60)"
                                            />
                                            <circle
                                                cx="60"
                                                cy="60"
                                                r={donutRadius}
                                                fill="none"
                                                stroke="#F13A32"
                                                strokeWidth="18"
                                                strokeLinecap="round"
                                                strokeDasharray={`${principalStroke} ${donutCircumference}`}
                                                strokeDashoffset={0}
                                                transform="rotate(-90 60 60)"
                                            />
                                            <circle
                                                cx="60"
                                                cy="60"
                                                r={donutRadius}
                                                fill="none"
                                                stroke="#1F3D51"
                                                strokeWidth="18"
                                                strokeLinecap="round"
                                                strokeDasharray={`${interestStroke} ${donutCircumference}`}
                                                strokeDashoffset={-principalStroke}
                                                transform="rotate(-90 60 60)"
                                            />
                                        </svg>
                                        <Box className="pf-property-drilldown__mortgage-summary-chart-center">
                                            <Typography className="pf-property-drilldown__mortgage-summary-center-label">
                                                Principal
                                            </Typography>
                                            <Typography className="pf-property-drilldown__mortgage-summary-center-value">
                                                {formatNumber(principalAmount)} AED
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                            <Box className="pf-property-drilldown__mortgage-summary-body">
                                <Typography className="pf-property-drilldown__mortgage-summary-heading">
                                    Estimate your monthly mortgage
                                    <br />
                                    payment
                                </Typography>
                                {isCalculatingMortgage && (
                                    <Typography className="pf-property-drilldown__mortgage-summary-label">
                                        Updating estimate...
                                    </Typography>
                                )}
                                {mortgageError && (
                                    <Typography className="pf-property-drilldown__mortgage-summary-label">
                                        {mortgageError}
                                    </Typography>
                                )}
                                <Box className="pf-property-drilldown__mortgage-summary-breakdown">
                                    <Box className="pf-property-drilldown__mortgage-summary-breakdown-item">
                                        <Typography className="pf-property-drilldown__mortgage-summary-label">
                                            Monthly payment
                                        </Typography>
                                        <Typography className="pf-property-drilldown__mortgage-summary-value">
                                            {formatNumber(Math.round(monthlyPayment))} AED
                                        </Typography>
                                    </Box>
                                    <Box className="pf-property-drilldown__mortgage-summary-divider" />
                                    <Box className="pf-property-drilldown__mortgage-summary-breakdown-item">
                                        <Typography className="pf-property-drilldown__mortgage-summary-label">
                                            Interest ({interestShareOfPayment}%)
                                        </Typography>
                                        <Typography className="pf-property-drilldown__mortgage-summary-value">
                                            {formatNumber(Math.round(totalInterestPaid))} AED
                                        </Typography>
                                    </Box>
                                </Box>
                                <Box className="pf-property-drilldown__mortgage-summary-actions">
                                    <Button
                                        className="pf-property-drilldown__mortgage-summary-btn--secondary"
                                        onClick={() => {
                                            if (onViewUpfrontCosts) onViewUpfrontCosts();
                                            else setOpenUpfrontCostsModal(true);
                                        }}
                                    >
                                        View upfront costs
                                    </Button>
                                    <Button
                                        className="pf-property-drilldown__mortgage-summary-btn--primary"
                                        onClick={() => {
                                            if (onGetMortgageQuote) onGetMortgageQuote();
                                            else setOpenMortgageQuoteModal(true);
                                        }}
                                    >
                                        Get a mortgage Quote
                                    </Button>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                </Grid >

                <Grid size={{ xs: 12, lg: 3.2, xl: 4, md: 3 }} sx={{ p: 0 }}>
                    <Box className="mortgage-cal__budget-card">
                        <Box className="mortgage-cal__budget-illustration">
                            <img src={houseImg} alt="" />
                        </Box>
                        <Typography className="mortgage-cal__budget-we">We found</Typography>
                        <Typography className="mortgage-cal__budget-count">
                            {formatNumber(propertiesCount)}
                        </Typography>
                        <Typography className="mortgage-cal__budget-sub">
                            within your budget
                        </Typography>
                        <Button
                            variant="outlined"
                            className="mortgage-cal__budget-btn"
                            onClick={() => navigate("/searchlisting")}
                        >
                            View properties
                        </Button>
                    </Box>
                </Grid>
            </Grid >
        </Box >
    );

    if (embedded) {
        return (
            <Box className="pf-property-drilldown__mortgage-body">{inner}</Box>
        );
    }

    return (
        <Box className="pf-property-drilldown mortgage-cal-page">
            <PFContainer>
                <Box className="mortgage-cal-page__breadcrumbs-wrap">
                    <BreadcrumbsComponentFirstLevel
                        breadcrumbTitle="Home"
                        breadcrumbSubTitle1="Mortgages"
                        breadcrumbLinkTitleTo="/"
                    />
                </Box>
                <Typography className="mortgage-cal-page__title" component="h1">
                    Mortgage calculator
                </Typography>
                <Box className="pf-property-drilldown__mortgage mortgage-cal-page__section">
                    {inner}
                </Box>
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
                        Not sure if you want to
                        <br />
                        Rent or buy?
                    </Typography>
                    <Typography className="mortgage-cal-rentbuy__subtitle">
                        Calculate and compare your monthly costs, and discover when you
                        break even by purchasing a property.
                    </Typography>
                    <Button
                        className="mortgage-cal-rentbuy__btn"
                        onClick={() => navigate("/rentbuycal")}
                    >
                        Explore rent or buy
                    </Button>
                </Box>
            </Box>
            <MortgageQuoteModal
                open={openMortgageQuoteModal}
                onClose={() => setOpenMortgageQuoteModal(false)}
                defaultResidencyStatus={residencyStatus}
                calculatorSnapshot={calculatorSnapshot}
            />
            <UpfrontCostsModal
                open={openUpfrontCostsModal}
                onClose={() => setOpenUpfrontCostsModal(false)}
                purchasePrice={purchasePrice}
                downPaymentPct={downPayment}
                loanAmount={loanAmountValue}
                interestRate={interestRate}
                loanPeriodYears={loanPeriod}
                monthlyPayment={monthlyPayment}
                residencyStatus={residencyStatus}
            />
        </Box>
    );
};

export default MortgageCal;
