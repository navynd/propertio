import { useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import { ModalCloseIcon } from "../../Components/parts/icon";
import {
    postMortgageUpfrontCosts,
    type MortgageResidencyStatus,
    type MortgageUpfrontCostsResponseData,
} from "../../services/apiService";
import "../../assets/styles/UpfrontCostsModal.scss";

type UpfrontCostsModalProps = {
    open: boolean;
    onClose: () => void;
    purchasePrice: number;
    downPaymentPct: number;
    loanAmount: number;
    interestRate: number;
    loanPeriodYears: number;
    monthlyPayment: number;
    residencyStatus?: MortgageResidencyStatus;
};

const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-IN").format(Math.round(value));

function UpfrontCostsModal({
    open,
    onClose,
    purchasePrice,
    downPaymentPct,
    loanAmount,
    interestRate,
    loanPeriodYears,
    monthlyPayment,
    residencyStatus,
}: UpfrontCostsModalProps) {
    const downPayment = (purchasePrice * downPaymentPct) / 100;
    const [apiData, setApiData] = useState<MortgageUpfrontCostsResponseData | null>(
        null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        const fetchUpfrontCosts = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const response = await postMortgageUpfrontCosts(
                    {
                        purchasePrice,
                        downPayment,
                        loanAmount,
                        loanPeriod: loanPeriodYears,
                        interestRate,
                        residencyStatus: residencyStatus || null,
                    },
                    controller.signal
                );
                setApiData(response?.data ?? null);
            } catch (err: unknown) {
                if ((err as { name?: string })?.name === "CanceledError") return;
                setError("Unable to fetch upfront costs right now.");
                setApiData(null);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUpfrontCosts();
        return () => controller.abort();
    }, [
        open,
        purchasePrice,
        downPayment,
        loanAmount,
        loanPeriodYears,
        interestRate,
        residencyStatus,
    ]);

    const fallbackData = useMemo(() => {
        const landDepartmentFee = purchasePrice * 0.04;
        const registrationTransferFee = purchasePrice <= 500000 ? 2100 : 4200;
        const mortgageRegistrationFee = loanAmount * 0.0025 + 290;
        const agencyFee = purchasePrice * 0.02;
        const arrangementFee = loanAmount * 0.01;
        const adminFee = 3150;
        const totalPurchaseCosts =
            landDepartmentFee +
            registrationTransferFee +
            mortgageRegistrationFee +
            agencyFee +
            arrangementFee +
            adminFee;
        const totalUpfront = downPayment + totalPurchaseCosts;

        return {
            paymentBreakdown: {
                downPayment,
                totalPurchaseCosts,
                landDepartmentFee,
                registrationTrusteeFee: registrationTransferFee,
                mortgageRegistrationFee,
                realEstateAgencyFee: agencyFee,
                mortgageArrangementFee: arrangementFee,
                adminFee,
            },
            calculationsBasedOn: {
                monthlyPayment,
                interestRate,
                loanAmount,
                loanDuration: `${loanPeriodYears} years`,
                residencyStatus: residencyStatus || null,
            },
            totalAmountRequiredUpfront: totalUpfront,
        };
    }, [
        purchasePrice,
        downPayment,
        loanAmount,
        loanPeriodYears,
        interestRate,
        monthlyPayment,
        residencyStatus,
    ]);

    const currentData = apiData ?? fallbackData;
    const breakdown: { label: string; value: number }[] = [
        {
            label: "Land department fee",
            value: currentData.paymentBreakdown.landDepartmentFee,
        },
        {
            label: "Registration transfer fee",
            value: currentData.paymentBreakdown.registrationTrusteeFee,
        },
        {
            label: "Mortgage registration fee",
            value: currentData.paymentBreakdown.mortgageRegistrationFee,
        },
        {
            label: "Real estate agency fee",
            value: currentData.paymentBreakdown.realEstateAgencyFee,
        },
        {
            label: "Mortgage arrangement fee",
            value: currentData.paymentBreakdown.mortgageArrangementFee,
        },
        { label: "Admin fee", value: currentData.paymentBreakdown.adminFee },
    ];

    const calcs: { label: string; value: string }[] = [
        {
            label: "Monthly payment",
            value: `${formatNumber(currentData.calculationsBasedOn.monthlyPayment)} AED`,
        },
        {
            label: "Interest rate",
            value: `${currentData.calculationsBasedOn.interestRate.toFixed(2)}%`,
        },
        {
            label: "Loan amount",
            value: `${formatNumber(currentData.calculationsBasedOn.loanAmount)} AED`,
        },
        { label: "Loan duration", value: currentData.calculationsBasedOn.loanDuration },
    ];

    if (!open) return null;

    return (
        <div
            className="upfront-costs-modal-overlay"
            onClick={() => {
                onClose();
            }}
        >
            <div className="upfront-costs-modal" onClick={(e) => e.stopPropagation()}>
                <div className="upfront-costs-modal__header">
                    <div className="upfront-costs-modal__close" onClick={onClose}>
                        <ModalCloseIcon width="16" height="16" />
                    </div>
                </div>

                <div className="upfront-costs-modal__content">
                    <Typography className="upfront-costs-modal__title">
                        Estimated upfront costs
                    </Typography>
                    <Box className="upfront-costs-modal__panel">
                        <Typography className="upfront-costs-modal__card-title">
                            Payment breakdown
                        </Typography>

                        <Box className="upfront-costs-modal__row upfront-costs-modal__row--pill1">
                            <span className="upfront-costs-modal__row-label">
                                Down payment
                            </span>
                            <span className="upfront-costs-modal__row-value">
                                {formatNumber(currentData.paymentBreakdown.downPayment)} AED
                            </span>
                        </Box>
                        <Box className="upfront-costs-modal__card">
                            <Box className="upfront-costs-modal__row upfront-costs-modal__row--pill">
                                <span className="upfront-costs-modal__row-label">
                                    Total purchase costs
                                </span>
                                <span className="upfront-costs-modal__row-value">
                                    {formatNumber(currentData.paymentBreakdown.totalPurchaseCosts)} AED
                                </span>
                            </Box>

                            <Box className="upfront-costs-modal__list">
                                {breakdown.map((item) => (
                                    <Box
                                        key={item.label}
                                        className="upfront-costs-modal__row upfront-costs-modal__row--list"
                                    >
                                        <span className="upfront-costs-modal__row-label">
                                            {item.label}
                                        </span>
                                        <span className="upfront-costs-modal__row-value">
                                            {formatNumber(item.value)} AED
                                        </span>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <Typography className="upfront-costs-modal__card-title  calc-title">
                            Calculations based on
                        </Typography>
                        {isLoading && (
                            <Typography className="upfront-costs-modal__row-label">
                                Updating upfront costs...
                            </Typography>
                        )}
                        {error && (
                            <Typography className="upfront-costs-modal__row-label">
                                {error}
                            </Typography>
                        )}
                        <Box className="upfront-costs-modal__card upfront-costs-modal__card--calc">
                            <Box className="upfront-costs-modal__list upfront-costs-modal__list--calc">
                                {calcs.map((item) => (
                                    <Box
                                        key={item.label}
                                        className="upfront-costs-modal__row upfront-costs-modal__row--list-calc"
                                    >
                                        <span className="upfront-costs-modal__row-label">
                                            {item.label}
                                        </span>
                                        <span className="upfront-costs-modal__row-value">
                                            {item.value}
                                        </span>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Box>

                    <Box className="upfront-costs-modal__total">
                        <Typography className="upfront-costs-modal__total-label">
                            Total amount required upfront
                        </Typography>
                        <Typography className="upfront-costs-modal__total-value">
                            {formatNumber(currentData.totalAmountRequiredUpfront)} AED
                        </Typography>
                    </Box>
                </div>
            </div>
        </div>
    );
}

export default UpfrontCostsModal;

