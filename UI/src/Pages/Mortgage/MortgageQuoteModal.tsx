import { useEffect, useMemo, useRef, useState } from "react";
import "../../assets/styles/MortgageQuoteModal.scss";
import {
    Button,
    Typography,
    Box,
    TextField,
    InputAdornment,
} from "@mui/material";
import {
    DownArrowIconBlack,
    ModalCloseIcon,
    SearchIcon,
} from "../../Components/parts/icon";
import { countries } from "../../data/countries";
import type { Country } from "../../data/countries";
import {
    getMortgageQuoteMasterData,
    postMortgageGetQuote,
    type MortgageGetQuoteRequestBody,
    type MortgageQuoteCalculatorSnapshot,
    type MortgageResidencyStatus,
} from "../../services/apiService";
import Loader from "../../Components/loader/loader";

interface MortgageQuoteModalProps {
    open: boolean;
    onClose: () => void;
    calculatorSnapshot?: MortgageQuoteCalculatorSnapshot;
    defaultResidencyStatus?: MortgageResidencyStatus;
}

type StepId = 1 | 2 | 3;
type QuoteOption = { name: string; value: string };

const CheckIcon = ({ size = 13 }: { size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
    >
        <path
            d="M20 6L9 17l-5-5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);


function MortgageQuoteModal({
    open,
    onClose,
    calculatorSnapshot,
    defaultResidencyStatus,
}: MortgageQuoteModalProps) {
    const [step, setStep] = useState<StepId>(1);
    const [submitted, setSubmitted] = useState(false);
    const fallbackLoanTypes: QuoteOption[] = [
        { name: "Buy a house", value: "buy" },
        { name: "Want to refinance", value: "refinance" },
    ];
    const fallbackResidency: QuoteOption[] = [
        { name: "Citizen", value: "uae-national" },
        { name: "Resident", value: "uae-resident" },
        { name: "International Buyer", value: "non-resident" },
    ];
    const fallbackBuyingProcess: QuoteOption[] = [
        { name: "Found a property", value: "found-property" },
        { name: "Looking for a property", value: "looking-for-property" },
        { name: "Just exploring", value: "just-exploring" },
    ];
    const fallbackEmploymentStatus: QuoteOption[] = [
        { name: "Salaried", value: "salaried" },
        { name: "I am self employed", value: "self-employed" },
    ];
    const [loanTypeOptions, setLoanTypeOptions] =
        useState<QuoteOption[]>(fallbackLoanTypes);
    const [residencyOptions, setResidencyOptions] =
        useState<QuoteOption[]>(fallbackResidency);
    const [buyingProcessOptions, setBuyingProcessOptions] =
        useState<QuoteOption[]>(fallbackBuyingProcess);
    const [employmentOptions, setEmploymentOptions] =
        useState<QuoteOption[]>(fallbackEmploymentStatus);
    const [countryOptions, setCountryOptions] = useState<Country[]>(countries);

    // Step 1
    const [loanType, setLoanType] = useState("buy");
    const [residenceStatus, setResidenceStatus] = useState<string>(
        defaultResidencyStatus || "uae-resident"
    );
    const [buyingProcess, setBuyingProcess] = useState("found-property");
    const [propertyPrice, setPropertyPrice] = useState("");

    const [residenceOpen, setResidenceOpen] = useState(false);
    const [buyingOpen, setBuyingOpen] = useState(false);
    const residenceDropdownRef = useRef<HTMLDivElement>(null);
    const buyingDropdownRef = useRef<HTMLDivElement>(null);

    // Step 2
    const [employmentStatus, setEmploymentStatus] = useState("salaried");
    const [salary, setSalary] = useState("");
    const [employmentOpen, setEmploymentOpen] = useState(false);
    const employmentDropdownRef = useRef<HTMLDivElement>(null);

    // Step 3
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [selectedCountry, setSelectedCountry] = useState<Country>(
        countries.find((c) => c.code === "AE") || countries[0]
    );
    const [countryOpen, setCountryOpen] = useState(false);
    const [countrySearchQuery, setCountrySearchQuery] = useState("");
    const countryDropdownRef = useRef<HTMLDivElement>(null);
    const [mobile, setMobile] = useState("");
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isMasterDataLoading, setIsMasterDataLoading] = useState(false);
    const isValidEmail = (value: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

    const showSalary = employmentStatus === "salaried";
    const selectedResidenceName =
        residencyOptions.find((item) => item.value === residenceStatus)?.name ||
        "Resident";
    const selectedBuyingProcessName =
        buyingProcessOptions.find((item) => item.value === buyingProcess)?.name ||
        "Found a property";
    const selectedEmploymentName =
        employmentOptions.find((item) => item.value === employmentStatus)?.name ||
        "Salaried";
    const salaryNum = Number(salary);
    const propertyPriceNum = Number(propertyPrice);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const normalizedMobile = mobile.replace(/[^0-9]/g, "");
    const isStep1Valid =
        Boolean(loanType) &&
        Boolean(residenceStatus) &&
        Boolean(buyingProcess) &&
        propertyPriceNum > 0;
    const isStep2Valid =
        Boolean(employmentStatus) &&
        (employmentStatus !== "salaried" || salaryNum > 0);
    const isStep3Valid =
        Boolean(trimmedName) &&
        isValidEmail(trimmedEmail) &&
        Boolean(normalizedMobile) &&
        Boolean(selectedCountry?.dialCode);
    const isCurrentStepValid =
        step === 1 ? isStep1Valid : step === 2 ? isStep2Valid : isStep3Valid;
    const isActionDisabled =
        isSubmitting || (step === 1 && isMasterDataLoading) || !isCurrentStepValid;

    const actionLabel = useMemo(() => {
        if (submitted) return "";
        if (isMasterDataLoading && step === 1) return "Loading...";
        if (isSubmitting) return "Submitting...";
        if (step === 3) return "Submit";
        return "Next";
    }, [step, submitted, isSubmitting, isMasterDataLoading]);

    const onAction = async () => {
        if (submitted || isSubmitting) return;

        if (step === 1) {
            if (!loanType || !residenceStatus) {
                setSubmitError("Please select loan type and residence status.");
                return;
            }
            setSubmitError(null);
            setStep(2);
            return;
        }

        if (step === 2) {
            if (!employmentStatus) {
                setSubmitError("Please select employment status.");
                return;
            }
            if (employmentStatus === "salaried") {
                const salaryNum = Number(salary);
                if (!salaryNum || salaryNum <= 0) {
                    setSubmitError("Please enter a valid monthly salary.");
                    return;
                }
            }
            setSubmitError(null);
            setStep(3);
            return;
        }

        if (!trimmedName) {
            setSubmitError("Name is required.");
            return;
        }
        if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
            setSubmitError("Please enter a valid email address.");
            return;
        }
        if (!normalizedMobile) {
            setSubmitError("Mobile number is required.");
            return;
        }

        const payload: MortgageGetQuoteRequestBody = {
            loanType: loanType as "buy" | "refinance",
            residencyStatus: residenceStatus as MortgageResidencyStatus,
            buyingProcess: buyingProcess as
                | "found-property"
                | "looking-for-property"
                | "just-exploring",
            propertyPrice:
                propertyPrice && propertyPriceNum > 0 ? propertyPriceNum : undefined,
            employmentStatus: employmentStatus as "salaried" | "self-employed",
            monthlySalary:
                employmentStatus === "salaried" && salaryNum > 0 ? salaryNum : undefined,
            name: trimmedName,
            email: trimmedEmail,
            countryCode: selectedCountry?.dialCode || "+971",
            mobileNumber: normalizedMobile,
            calculatorSnapshot,
        };

        try {
            setIsSubmitting(true);
            setSubmitError(null);
            await postMortgageGetQuote(payload);
            setSubmitted(true);
        } catch (error: unknown) {
            const message =
                (error as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message || "Failed to submit quote request. Please try again.";
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const steps = useMemo(
        () =>
            [
                { id: 1 as const, label: "Loan details" },
                { id: 2 as const, label: "Employment" },
                { id: 3 as const, label: "Submit" },
            ] as const,
        []
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const t = event.target as Node;
            if (residenceDropdownRef.current && !residenceDropdownRef.current.contains(t)) {
                setResidenceOpen(false);
            }
            if (buyingDropdownRef.current && !buyingDropdownRef.current.contains(t)) {
                setBuyingOpen(false);
            }
            if (employmentDropdownRef.current && !employmentDropdownRef.current.contains(t)) {
                setEmploymentOpen(false);
            }
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(t)) {
                setCountryOpen(false);
            }
        };

        if (residenceOpen || buyingOpen || employmentOpen || countryOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [residenceOpen, buyingOpen, employmentOpen, countryOpen]);

    const filteredCountries = useMemo(() => {
        const q = countrySearchQuery.trim().toLowerCase();
        if (!q) return countryOptions;
        return countryOptions.filter((c) => c.name.toLowerCase().includes(q));
    }, [countryOptions, countrySearchQuery]);

    useEffect(() => {
        if (!open) return;
        let isMounted = true;
        const loadMasterData = async () => {
            try {
                setIsMasterDataLoading(true);
                const response = await getMortgageQuoteMasterData();
                const data = response?.data;
                if (!isMounted || !data) return;

                if (Array.isArray(data.loanType) && data.loanType.length > 0) {
                    const options = data.loanType
                        .filter((item) => item?.name && item?.value)
                        .map((item) => ({ name: item.name, value: item.value }));
                    if (options.length) {
                        setLoanTypeOptions(options);
                        setLoanType((current) =>
                            options.some((opt) => opt.value === current)
                                ? current
                                : options[0].value
                        );
                    }
                }

                if (Array.isArray(data.residencyStatus) && data.residencyStatus.length > 0) {
                    const options = data.residencyStatus
                        .filter((item) => item?.name && item?.value)
                        .map((item) => ({ name: item.name, value: item.value }));
                    if (options.length) {
                        setResidencyOptions(options);
                        setResidenceStatus((current) =>
                            options.some((opt) => opt.value === current)
                                ? current
                                : options[0].value
                        );
                    }
                }

                if (Array.isArray(data.buyingProcess) && data.buyingProcess.length > 0) {
                    const options = data.buyingProcess
                        .filter((item) => item?.name && item?.value)
                        .map((item) => ({ name: item.name, value: item.value }));
                    if (options.length) {
                        setBuyingProcessOptions(options);
                        setBuyingProcess((current) =>
                            options.some((opt) => opt.value === current)
                                ? current
                                : options[0].value
                        );
                    }
                }

                if (Array.isArray(data.employmentStatus) && data.employmentStatus.length > 0) {
                    const options = data.employmentStatus
                        .filter((item) => item?.name && item?.value)
                        .map((item) => ({ name: item.name, value: item.value }));
                    if (options.length) {
                        setEmploymentOptions(options);
                        setEmploymentStatus((current) =>
                            options.some((opt) => opt.value === current)
                                ? current
                                : options[0].value
                        );
                    }
                }

                if (Array.isArray(data.countries) && data.countries.length > 0) {
                    const mappedCountries = data.countries
                        .map((item, index) => {
                            const code = (item?.code || "").toUpperCase();
                            const localMatchByCode = countries.find((c) => c.code === code);
                            const localMatchByName = countries.find(
                                (c) =>
                                    c.name.trim().toLowerCase() ===
                                    (item?.name || "").trim().toLowerCase()
                            );
                            const local = localMatchByCode || localMatchByName;
                            if (!item?.name) return null;
                            const inferredFlag =
                                local?.flag ||
                                (code.length === 2
                                    ? `https://flagcdn.com/w80/${code.toLowerCase()}.png`
                                    : countries.find((c) => c.code === "AE")?.flag ||
                                    "");
                            return {
                                id: local?.id ?? index + 1,
                                name: item.name,
                                dialCode: item.phoneCode || item.dialCode || local?.dialCode || "",
                                code: code || local?.code || `CT${index + 1}`,
                                flag: inferredFlag,
                            } as Country;
                        })
                        .filter((item): item is Country => Boolean(item?.name));

                    if (mappedCountries.length) {
                        setCountryOptions(mappedCountries);
                        setSelectedCountry((current) => {
                            const existing = mappedCountries.find(
                                (c) => c.code === current.code
                            );
                            return (
                                existing ||
                                mappedCountries.find((c) => c.code === "AE") ||
                                mappedCountries[0]
                            );
                        });
                    }
                }
            } catch {
                // Keep fallback static options when master data request fails.
            } finally {
                if (isMounted) setIsMasterDataLoading(false);
            }
        };

        loadMasterData();
        return () => {
            isMounted = false;
        };
    }, [open]);

    // Reset wizard when modal opens again
    useEffect(() => {
        if (!open) return;
        setStep(1);
        setSubmitted(false);
        setIsSubmitting(false);
        setIsMasterDataLoading(false);
        setSubmitError(null);
        setResidenceOpen(false);
        setBuyingOpen(false);
        setEmploymentOpen(false);
        setCountryOpen(false);
        setCountrySearchQuery("");
        if (defaultResidencyStatus) {
            setResidenceStatus(defaultResidencyStatus);
        }
    }, [open]);

    return (
        open && (
            <div className="mortgage-quote-modal-overlay" onClick={() => { onClose(); }}>
                <div className="mortgage-quote-modal" onClick={(e) => e.stopPropagation()}>
                    {isSubmitting && (
                        <Box className="mortgage-quote-modal__submit-loader">
                            <Loader size={80} margin={0} />
                            <Typography className="mortgage-quote-modal__submit-loader-text">
                                Submitting your request...
                            </Typography>
                        </Box>
                    )}
                    <div className="mortgage-quote-modal-header">
                        <div className="mortgage-quote-modal-close-icon" onClick={onClose}>
                            <ModalCloseIcon width="16" height="16" />
                        </div>
                    </div>
                    <div className="mortgage-quote-modal-content">
                        {!submitted && (
                            <Typography component="h2" className="mortgage-quote-modal-title">
                                Get a mortgage quote
                            </Typography>
                        )}
                        {!submitted && submitError && (
                            <Typography className="pf-property-drilldown__mortgage-summary-label">
                                {submitError}
                            </Typography>
                        )}
                        {!submitted && isMasterDataLoading && step === 1 && (
                            <Typography className="pf-property-drilldown__mortgage-summary-label">
                                Loading master data...
                            </Typography>
                        )}
                        {!submitted && (
                            <Box className="mortgage-quote-steps">
                                {steps.map((s) => {
                                    const isDone = step > s.id;
                                    const isActive = step === s.id;
                                    const isUpcoming = step < s.id;
                                    return (
                                        <Box
                                            key={s.id}
                                            className={[
                                                "mortgage-quote-step",
                                                isDone && "mortgage-quote-step--done",
                                                isActive && "mortgage-quote-step--active",
                                                isUpcoming && "mortgage-quote-step--upcoming",
                                            ]
                                                .filter(Boolean)
                                                .join(" ")}
                                        >
                                            <span className="mortgage-quote-step__dot">
                                                {isDone ? <CheckIcon /> : s.id}
                                            </span>
                                            <span className="mortgage-quote-step__text">
                                                {s.label}
                                            </span>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}

                        {!submitted && (
                            <Box className="mortgage-quote-form">
                                {step === 1 && (
                                    <>
                                        <Box>
                                            <Typography className="mortgage-quote-label">
                                                Loan type
                                            </Typography>
                                            <Box className="mortgage-quote-toggle-row">
                                                {loanTypeOptions.map((opt) => (
                                                    <Button
                                                        key={opt.value}
                                                        className={[
                                                            "mortgage-quote-toggle",
                                                            loanType === opt.value &&
                                                            "mortgage-quote-toggle--active",
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" ")}
                                                        onClick={() => setLoanType(opt.value)}
                                                    >
                                                        {opt.name}
                                                    </Button>
                                                ))}
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Typography className="mortgage-quote-label">
                                                Residence status
                                            </Typography>
                                            <Box
                                                ref={residenceDropdownRef}
                                                className="mortgage-quote-service__custom-select "
                                            >
                                                <Box
                                                    className="mortgage-quote-service__select-btn"
                                                    onClick={() =>
                                                        setResidenceOpen((prev) => {
                                                            const next = !prev;
                                                            if (next) setBuyingOpen(false);
                                                            return next;
                                                        })
                                                    }
                                                >
                                                    <Typography className="mortgage-quote-service__name selected">
                                                        {selectedResidenceName}
                                                    </Typography>
                                                    <DownArrowIconBlack width={14} height={14} />
                                                </Box>
                                                {residenceOpen && (
                                                    <Box className="mortgage-quote-service__dropdown">
                                                        {residencyOptions.map((opt) => {
                                                            const isActive =
                                                                residenceStatus === opt.value;
                                                            return (
                                                                <Box
                                                                    key={opt.value}
                                                                    className={`mortgage-quote-service__dropdown-item ${isActive ? "active" : ""
                                                                        }`}
                                                                    onClick={() => {
                                                                        setResidenceStatus(opt.value);
                                                                        setResidenceOpen(false);
                                                                    }}
                                                                >
                                                                    {opt.name}
                                                                </Box>
                                                            );
                                                        })}
                                                    </Box>
                                                )}
                                            </Box>
                                        </Box>
                                        <Box>
                                            <Typography className="mortgage-quote-label">
                                                Are you in the home buying process?
                                            </Typography>
                                            <Box
                                                ref={buyingDropdownRef}
                                                className="mortgage-quote-service__custom-select mortgage-quote-service__custom-select--buying   mortgage-mt"
                                            >
                                                <Box
                                                    className="mortgage-quote-service__select-btn"
                                                    onClick={() =>
                                                        setBuyingOpen((prev) => {
                                                            const next = !prev;
                                                            if (next) setResidenceOpen(false);
                                                            return next;
                                                        })
                                                    }
                                                >
                                                    <Typography className="mortgage-quote-service__name selected">
                                                        {selectedBuyingProcessName}
                                                    </Typography>
                                                    <DownArrowIconBlack width={14} height={14} />
                                                </Box>
                                                {buyingOpen && (
                                                    <Box className="mortgage-quote-service__dropdown">
                                                        {buyingProcessOptions.map((opt) => {
                                                            const isActive =
                                                                buyingProcess === opt.value;
                                                            return (
                                                                <Box
                                                                    key={opt.value}
                                                                    className={`mortgage-quote-service__dropdown-item ${isActive ? "active" : ""
                                                                        }`}
                                                                    onClick={() => {
                                                                        setBuyingProcess(opt.value);
                                                                        setBuyingOpen(false);
                                                                    }}
                                                                >
                                                                    {opt.name}
                                                                </Box>
                                                            );
                                                        })}
                                                    </Box>
                                                )}
                                            </Box>

                                            <TextField
                                                value={propertyPrice}
                                                onChange={(e) =>
                                                    setPropertyPrice(
                                                        e.target.value.replace(/[^0-9]/g, "")
                                                    )
                                                }
                                                placeholder="Enter price of the property"
                                                fullWidth
                                                className="mortgage-quote-input"
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            AED
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />
                                        </Box>
                                    </>
                                )}

                                {step === 2 && (
                                    <>
                                        <Box>
                                            <Typography className="mortgage-quote-label">
                                                What is your employment status?
                                            </Typography>
                                            <Box
                                                ref={employmentDropdownRef}
                                                className="mortgage-quote-service__custom-select  mortgage-mt"
                                            >
                                                <Box
                                                    className="mortgage-quote-service__select-btn"
                                                    onClick={() =>
                                                        setEmploymentOpen((prev) => {
                                                            const next = !prev;
                                                            if (next) {
                                                                setResidenceOpen(false);
                                                                setBuyingOpen(false);
                                                            }
                                                            return next;
                                                        })
                                                    }
                                                >
                                                    <Typography className="mortgage-quote-service__name selected">
                                                        {selectedEmploymentName}
                                                    </Typography>
                                                    <DownArrowIconBlack width={14} height={14} />
                                                </Box>
                                                {employmentOpen && (
                                                    <Box className="mortgage-quote-service__dropdown">
                                                        {employmentOptions.map((opt) => {
                                                            const isActive =
                                                                employmentStatus === opt.value;
                                                            return (
                                                                <Box
                                                                    key={opt.value}
                                                                    className={`mortgage-quote-service__dropdown-item ${isActive ? "active" : ""
                                                                        }`}
                                                                    onClick={() => {
                                                                        setEmploymentStatus(opt.value);
                                                                        setEmploymentOpen(false);
                                                                    }}
                                                                >
                                                                    {opt.name}
                                                                </Box>
                                                            );
                                                        })}
                                                    </Box>
                                                )}
                                            </Box>

                                            {showSalary && (
                                                <TextField
                                                    value={salary}
                                                    onChange={(e) =>
                                                        setSalary(
                                                            e.target.value.replace(/[^0-9]/g, "")
                                                        )
                                                    }
                                                    placeholder="Enter your salary"
                                                    fullWidth
                                                    className="mortgage-quote-input"
                                                    InputProps={{
                                                        endAdornment: (
                                                            <InputAdornment position="end">
                                                                AED
                                                            </InputAdornment>
                                                        ),
                                                    }}
                                                />
                                            )}
                                        </Box>

                                    </>
                                )}

                                {step === 3 && (
                                    <>
                                        <Box>
                                            <Typography className="mortgage-quote-label">
                                                Name
                                            </Typography>
                                            <TextField
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Enter name"
                                                fullWidth
                                                className="mortgage-quote-input"
                                            />
                                        </Box>

                                        <Box>
                                            <Typography className="mortgage-quote-label">
                                                Email Address
                                            </Typography>
                                            <TextField
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="Enter email address"
                                                fullWidth
                                                className="mortgage-quote-input"
                                            />
                                        </Box>


                                        <Box className="mortgage-quote-grid">
                                            <Box>
                                                <Typography className="mortgage-quote-label">
                                                    Country
                                                </Typography>
                                                <Box
                                                    ref={countryDropdownRef}
                                                    className="mortgage-quote-country"
                                                >
                                                    <Box
                                                        className="mortgage-quote-country__select"
                                                        onClick={() =>
                                                            setCountryOpen((prev) => {
                                                                const next = !prev;
                                                                if (next) {
                                                                    setResidenceOpen(false);
                                                                    setBuyingOpen(false);
                                                                    setEmploymentOpen(false);
                                                                } else {
                                                                    setCountrySearchQuery("");
                                                                }
                                                                return next;
                                                            })
                                                        }
                                                    >
                                                        <Box className="mortgage-quote-country__value">
                                                            <img
                                                                src={selectedCountry.flag}
                                                                alt={selectedCountry.name}
                                                                className="mortgage-quote-country__flag"
                                                            />
                                                            {/* <span className="mortgage-quote-country__text">
                                                                {selectedCountry.name}
                                                            </span> */}
                                                        </Box>
                                                        <DownArrowIconBlack width={12} height={8} />
                                                    </Box>

                                                    {countryOpen && (
                                                        <Box className="mortgage-quote-country__dropdown">
                                                            <Box className="mortgage-quote-country__search">
                                                                <SearchIcon width="20" height="20" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Search country..."
                                                                    className="mortgage-quote-country__search-input"
                                                                    value={countrySearchQuery}
                                                                    onChange={(e) =>
                                                                        setCountrySearchQuery(
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    autoFocus
                                                                />
                                                            </Box>

                                                            <Box className="mortgage-quote-country__list">
                                                                {filteredCountries.map((c) => (
                                                                    <Box
                                                                        key={c.code}
                                                                        className="mortgage-quote-country__item"
                                                                        onClick={() => {
                                                                            setSelectedCountry(c);
                                                                            setCountryOpen(false);
                                                                            setCountrySearchQuery("");
                                                                        }}
                                                                    >
                                                                        <Box className="mortgage-quote-country__item-flagWrap">
                                                                            <img
                                                                                src={c.flag}
                                                                                alt=""
                                                                                className="mortgage-quote-country__item-flag"
                                                                            />
                                                                        </Box>
                                                                        <span className="mortgage-quote-country__item-name">
                                                                            {c.name}
                                                                        </span>
                                                                    </Box>
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Box>
                                            <Box>
                                                <Typography className="mortgage-quote-label">
                                                    Mobile number
                                                </Typography>
                                                <TextField
                                                    value={mobile}
                                                    onChange={(e) =>
                                                        setMobile(
                                                            e.target.value.replace(
                                                                /[^0-9+ ]/g,
                                                                ""
                                                            )
                                                        )
                                                    }
                                                    placeholder="Enter mobile number"
                                                    fullWidth
                                                    className="mortgage-quote-input"
                                                />
                                            </Box>
                                        </Box>
                                    </>
                                )}
                            </Box>
                        )}

                        {submitted && (
                            <Box className="mortgage-quote-success">
                                <Box className="mortgage-quote-success__icon-wrap">
                                    <Box className="mortgage-quote-success__icon">
                                        <CheckIcon size={22} />
                                    </Box>
                                </Box>
                                <Typography className="mortgage-quote-success__title">
                                    Your quote request is submitted
                                </Typography>
                                <Typography className="mortgage-quote-success__sub">
                                    Details will be send to<br></br>
                                    <span className="mortgage-quote-success__email">
                                        {email || "williamturner@gmail.com"}
                                    </span>
                                </Typography>
                            </Box>
                        )}
                        {/* Footer buttons (fixed at bottom of modal) */}
                        {!submitted && (
                            <div className="mortgage-quote-footer">
                                <Button
                                    variant="contained"
                                    className="mortgage-quote-result-btn"
                                    onClick={onAction}
                                >
                                    {(isSubmitting || (isMasterDataLoading && step === 1)) && (
                                        <Box sx={{ mr: 1, display: "inline-flex", alignItems: "center" }}>
                                            <Loader size={18} margin={0} />
                                        </Box>
                                    )}
                                    {actionLabel}
                                </Button>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        )

    );
}

export default MortgageQuoteModal;
