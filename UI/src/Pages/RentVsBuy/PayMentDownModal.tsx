import { useState, useEffect, useCallback } from "react";
import "../../assets/styles/RentBuy/PaymentDownModal.scss";
import { Typography } from "@mui/material";
import { DownArrowIconBlack, ModalCloseIcon } from "../../Components/parts/icon";
import type { RentVsBuyResponseData } from "../../services/apiService";
import Loader from "../../Components/loader/loader";

type AccordionKey = "initial" | "recurring" | "netSale";

type BreakdownLine = {
    label: string;
    rent: string;
    buy: string;
};

type BreakdownSection = {
    id: AccordionKey;
    title: string;
    rentTotal: string;
    buyTotal: string;
    lines?: BreakdownLine[];
};

const SECTIONS: BreakdownSection[] = [
    {
        id: "initial",
        title: "Initial payments",
        rentTotal: "-69,486 AED",
        buyTotal: "-328,860 AED",
        lines: [
            { label: "Down Payment", rent: "--", buy: "-240,000 AED" },
            { label: "Agent fees", rent: "66,150 AED", buy: "-25,200 AED" },
            { label: "Bank fees", rent: "--", buy: "-10,880 AED" },
            { label: "Government fees", rent: "-3,336 AED", buy: "-52,780 AED" },
        ],
    },
    {
        id: "recurring",
        title: "Recurring payments",
        rentTotal: "-3,500,000 AED",
        buyTotal: "-1,854,550 AED",
    },
    {
        id: "netSale",
        title: "Net sale price",
        rentTotal: "---",
        buyTotal: "1,175,500 AED",
    },
];

const NET_PERIOD_LABEL = "Net costs over 25 years";
const SUMMARY_RENT = "-3,569,486 AED";
const SUMMARY_BUY = "-1,007,910 AED";

export interface PayMentDownModalProps {
    open: boolean;
    onClose: () => void;
    /** Override footer period label, e.g. "Net costs over 25 years" */
    periodLabel?: string;
    breakdown?: RentVsBuyResponseData["paymentBreakdown"]["overHorizon"] | null;
    loading?: boolean;
}

function PayMentDownModal({
    open,
    onClose,
    periodLabel = NET_PERIOD_LABEL,
    breakdown,
    loading = false,
}: PayMentDownModalProps) {
    const [expanded, setExpanded] = useState<Record<AccordionKey, boolean>>({
        initial: true,
        recurring: false,
        netSale: false,
    });

    const toggle = useCallback((id: AccordionKey) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    }, []);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const formatMoney = (value?: number, withNegative = true) => {
        if (typeof value !== "number" || Number.isNaN(value)) return "---";
        const abs = Math.round(Math.abs(value)).toLocaleString("en-IN");
        return `${withNegative ? "-" : ""}${abs} AED`;
    };

    const dynamicSections: BreakdownSection[] | null = breakdown
        ? [
            {
                id: "initial",
                title: "Initial payments",
                rentTotal: formatMoney(breakdown.initial?.rent?.total),
                buyTotal: formatMoney(breakdown.initial?.buy?.total),
                lines: [
                    {
                        label: "Down Payment",
                        rent: "--",
                        buy: formatMoney(breakdown.initial?.buy?.downPayment),
                    },
                    {
                        label: "Agent fees",
                        rent: formatMoney(breakdown.initial?.rent?.agentFees),
                        buy: formatMoney(breakdown.initial?.buy?.agentFees),
                    },
                    {
                        label: "Bank fees",
                        rent: "--",
                        buy: formatMoney(breakdown.initial?.buy?.bankFees),
                    },
                    {
                        label: "Government fees",
                        rent: formatMoney(breakdown.initial?.rent?.governmentFees),
                        buy: formatMoney(breakdown.initial?.buy?.governmentFees),
                    },
                ],
            },
            {
                id: "recurring",
                title: "Recurring payments",
                rentTotal: formatMoney(breakdown.recurring?.rent?.total),
                buyTotal: formatMoney(breakdown.recurring?.buy?.total),
                lines: [
                    {
                        label: "Rent payments",
                        rent: formatMoney(breakdown.recurring?.rent?.rentPayments),
                        buy: "--",
                    },
                    {
                        label: "Renter insurance",
                        rent: formatMoney(breakdown.recurring?.rent?.renterInsurance),
                        buy: "--",
                    },
                    {
                        label: "Principal",
                        rent: "--",
                        buy: formatMoney(breakdown.recurring?.buy?.principal),
                    },
                    {
                        label: "Interest",
                        rent: "--",
                        buy: formatMoney(breakdown.recurring?.buy?.interest),
                    },
                    {
                        label: "Maintenance costs",
                        rent: "--",
                        buy: formatMoney(breakdown.recurring?.buy?.maintenanceCosts),
                    },
                ],
            },
            {
                id: "netSale",
                title: "Net sale price",
                rentTotal: "---",
                buyTotal: formatMoney(
                    breakdown.netSale?.buyOnly?.cashFromSaleAfterLoan,
                    false
                ),
                lines: [
                    {
                        label: "Estimated selling price",
                        rent: "--",
                        buy: formatMoney(
                            breakdown.netSale?.buyOnly?.estimatedSellingPrice,
                            false
                        ),
                    },
                    {
                        label: "Selling fees",
                        rent: "--",
                        buy: formatMoney(breakdown.netSale?.buyOnly?.sellingFees),
                    },
                    {
                        label: "Loan balance end",
                        rent: "--",
                        buy: formatMoney(breakdown.netSale?.buyOnly?.estimatedLoanBalanceEnd),
                    },
                ],
            },
        ]
        : null;

    const sections = dynamicSections ?? SECTIONS;
    const summaryRent = breakdown?.summary
        ? formatMoney(breakdown.summary.netCostRent)
        : SUMMARY_RENT;
    const summaryBuy = breakdown?.summary
        ? formatMoney(breakdown.summary.netCostBuyAfterSale)
        : SUMMARY_BUY;

    return (
        <div
            className="payment-down-modal-overlay"
            role="presentation"
            onClick={onClose}
        >
            <div
                className="payment-down-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-breakdown-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="payment-down-modal-header">
                    <button
                        type="button"
                        className="payment-down-modal-close-icon"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <ModalCloseIcon width={16} height={16} />
                    </button>
                </div>

                <div className="payment-down-modal-content">
                    <Typography
                        id="payment-breakdown-title"
                        component="h2"
                        className="payment-down-modal-title"
                    >
                        Payment Breakdown
                    </Typography>
                    {loading && (
                        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
                            <Loader size={52} margin={0} />
                        </div>
                    )}

                    {!loading && (
                        <>
                            <div className="payment-down-breakdown-panel">
                                <div className="payment-down-columns">
                                    <span className="payment-down-col-label payment-down-col-label--payments">
                                        Payments
                                    </span>
                                    <span className="payment-down-col-label payment-down-col-label--rent">
                                        Rent
                                    </span>
                                    <span className="payment-down-col-label payment-down-col-label--buy">
                                        Buy
                                    </span>
                                </div>

                                {sections.map((section) => {
                                    const isOpen = expanded[section.id];
                                    return (
                                        <div
                                            key={section.id}
                                            className="payment-down-accordion"
                                        >
                                            <button
                                                type="button"
                                                className={`payment-down-accordion-trigger ${isOpen ? "payment-down-accordion-trigger--open" : ""}`}
                                                onClick={() => toggle(section.id)}
                                                aria-expanded={isOpen}
                                            >
                                                <span className="payment-down-accordion-title-wrap">
                                                    <span
                                                        className={`payment-down-accordion-chevron ${isOpen ? "payment-down-accordion-chevron--up" : ""}`}
                                                        aria-hidden
                                                    >
                                                        <DownArrowIconBlack
                                                            width={12}
                                                            height={12}
                                                            fill="#0832AE"
                                                        />
                                                    </span>
                                                    <span className="payment-down-accordion-title">
                                                        {section.title}
                                                    </span>
                                                </span>

                                                <span className="payment-down-accordion-total payment-down-accordion-total--rent">
                                                    {section.rentTotal}
                                                </span>
                                                <span className="payment-down-accordion-total payment-down-accordion-total--buy">
                                                    {section.buyTotal}
                                                </span>

                                            </button>
                                            {isOpen && section.lines && section.lines.length > 0 && (
                                                <div className="payment-down-accordion-body" role="region">
                                                    <div className="payment-down-accordion-body-inner">
                                                        {section.lines.map((line) => (
                                                            <div
                                                                key={line.label}
                                                                className="payment-down-accordion-line"
                                                            >
                                                                <span className="payment-down-accordion-line-label">
                                                                    {line.label}
                                                                </span>
                                                                <span className="payment-down-accordion-line-rent">
                                                                    {line.rent}
                                                                </span>
                                                                <span className="payment-down-accordion-line-buy">
                                                                    {line.buy}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="payment-down-summary-heading">{periodLabel}</p>
                        </>
                    )}

                </div>
                {!loading && (
                    <div className="payment-down-summary-cards">
                        <div className="payment-down-summary-card payment-down-summary-card--rent">
                            <span className="payment-down-summary-card-label">Rent</span>
                            <span className="payment-down-summary-card-value">
                                {summaryRent}
                            </span>
                        </div>
                        <div className="payment-down-summary-card payment-down-summary-card--buy">
                            <span className="payment-down-summary-card-label">Buy</span>
                            <span className="payment-down-summary-card-value">
                                {summaryBuy}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PayMentDownModal;
