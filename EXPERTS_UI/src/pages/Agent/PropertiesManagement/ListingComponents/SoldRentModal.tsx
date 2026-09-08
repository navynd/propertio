import { useEffect, useRef, useState } from "react";
import { CancelIcon, DownArrowIcon, SearchIcon } from "../../../../components/CustomFile/icons";
import { agentService } from "../../../../services/agentService";
import {
    mapAgentCountryToPhoneRow,
    sortPhoneCountryRows,
    type PhoneCountryRow,
} from "../../../../utils/agentCountryPhoneRows";

const FALLBACK_UAE_ROW: PhoneCountryRow = {
    id: "fallback-ae",
    name: "United Arab Emirates",
    code: "AE",
    dialCode: "+971",
    flag: "https://flagcdn.com/w80/ae.png",
    displayOrder: 0,
};

export type PropertyCloseDealSubmitValues = {
    dealAmount: number;
    dealClosedDate?: string;
    customer: { name: string; email?: string; phone?: string };
    currency?: string;
};

type SoldRentModalProps = {
    isOpen: boolean;
    /** Which terminal status the agent is applying */
    variant: "sold" | "rented" | null;
    onClose: () => void;
    currency?: string;
    isSubmitting?: boolean;
    onSubmit: (values: PropertyCloseDealSubmitValues) => Promise<void> | void;
};

const SoldRentModal = ({
    isOpen,
    variant,
    onClose,
    currency = "AED",
    isSubmitting = false,
    onSubmit,
}: SoldRentModalProps) => {
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [countryRows, setCountryRows] = useState<PhoneCountryRow[]>([]);
    const [countriesLoaded, setCountriesLoaded] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<PhoneCountryRow>(FALLBACK_UAE_ROW);
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [phoneLocal, setPhoneLocal] = useState("");
    const [dealAmountInput, setDealAmountInput] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        let mounted = true;
        setCountriesLoaded(false);
        agentService
            .getCountriesMasterData()
            .then((res) => {
                if (!mounted) return;
                const raw = res?.countries ?? [];
                const mapped = sortPhoneCountryRows(raw.map(mapAgentCountryToPhoneRow)).filter(
                    (r) => r.dialCode && r.name
                );
                const list = mapped.length ? mapped : [FALLBACK_UAE_ROW];
                setCountryRows(list);
                const ae = list.find((c) => c.code === "AE") ?? list[0] ?? FALLBACK_UAE_ROW;
                setSelectedCountry(ae);
                setCountriesLoaded(true);
            })
            .catch(() => {
                if (!mounted) return;
                setCountryRows([FALLBACK_UAE_ROW]);
                setSelectedCountry(FALLBACK_UAE_ROW);
                setCountriesLoaded(true);
            });
        return () => {
            mounted = false;
        };
    }, [isOpen]);

    const filteredCountries = countryRows.filter(
        (country) =>
            country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            country.dialCode.includes(searchQuery) ||
            country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        if (!isOpen) {
            setShowConfirmClose(false);
            setFormError(null);
            setCustomerName("");
            setCustomerEmail("");
            setPhoneLocal("");
            setDealAmountInput("");
            setSearchQuery("");
            setIsCountryDropdownOpen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isCountryDropdownOpen) return;
        const onDown = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [isCountryDropdownOpen]);

    if (!isOpen || !variant) return null;

    const labelVerb = variant === "sold" ? "sold" : "rented";
    const fullPhone = `${selectedCountry.dialCode}${phoneLocal.replace(/\s+/g, "")}`.trim();

    const validateForm = (): boolean => {
        if (!customerName.trim()) {
            setFormError("Customer name is required.");
            return false;
        }
        const raw = dealAmountInput.replace(/,/g, "").trim();
        const n = Number(raw);
        if (!raw || Number.isNaN(n) || n < 0) {
            setFormError("Enter a valid deal amount.");
            return false;
        }
        setFormError(null);
        return true;
    };

    const handlePrimaryAction = () => {
        if (!validateForm()) return;
        setShowConfirmClose(true);
    };

    const handleFinalConfirm = async () => {
        const raw = dealAmountInput.replace(/,/g, "").trim();
        const dealAmount = Number(raw);
        await onSubmit({
            dealAmount,
            customer: {
                name: customerName.trim(),
                email: customerEmail.trim() || undefined,
                phone: fullPhone || undefined,
            },
            currency,
        });
    };

    return (
        <div
            className={`fixed inset-0 z-[9999] flex bg-black/40 ${showConfirmClose ? "items-center justify-center p-5" : "justify-center md:items-center items-end"}`}
            onMouseDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (showConfirmClose) setShowConfirmClose(false);
                else if (!isSubmitting) onClose();
            }}
        >
            {!showConfirmClose ? (
                <div
                    className="relative bg-white w-full md:max-w-[723px] h-auto transform transition-all duration-300 rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="shrink-0 flex justify-end p-[20px_20px_0px_20px]">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center disabled:opacity-50"
                        >
                            <CancelIcon width={14} height={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_50px]">
                        <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1]">
                            Close the deal — mark as {labelVerb}
                        </h2>
                        {formError ? (
                            <p className="mt-3 text-center text-[13px] text-[#D4A373] font-[Medium]">{formError}</p>
                        ) : null}
                        <div className="flex flex-col gap-[24px] mt-[35px]">
                            <div>
                                <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                                    Customer name <span className="text-[#D4A373]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Enter customer name"
                                    className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] text-[#222] placeholder:text-[#707070] focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                                <div className="flex-1">
                                    <label className="text-[14px] font-[Bold] text-[#222] block mb-[8px]">Email</label>
                                    <input
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        placeholder="Enter email"
                                        className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] text-[#222] placeholder:text-[#707070] focus:outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                        Phone number
                                    </label>
                                    <div className="flex items-center gap-[10px]">
                                        <div className="relative" ref={dropdownRef}>
                                            <button
                                                type="button"
                                                disabled={!countriesLoaded}
                                                className="flex items-center gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none disabled:opacity-50"
                                                onClick={() => {
                                                    if (!countriesLoaded) return;
                                                    setIsCountryDropdownOpen(!isCountryDropdownOpen);
                                                    if (!isCountryDropdownOpen) setSearchQuery("");
                                                }}
                                            >
                                                {selectedCountry.flag ? (
                                                    <img
                                                        src={selectedCountry.flag}
                                                        alt={selectedCountry.code}
                                                        className="w-[20px] h-[14px] rounded-[2px] object-cover"
                                                    />
                                                ) : (
                                                    <span className="w-[20px] text-[11px] font-[Bold] text-[#222]">
                                                        {selectedCountry.code}
                                                    </span>
                                                )}
                                                <DownArrowIcon
                                                    className={`mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
                                                    width={14}
                                                    height={14}
                                                />
                                            </button>

                                            {isCountryDropdownOpen && countriesLoaded && (
                                                <div className="absolute top-[50px] left-0 w-[260px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                                                    <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                                                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                                                            <SearchIcon className="text-[#707070] shrink-0" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search country..."
                                                                className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="overflow-y-auto overflow-x-hidden flex-1 py-[8px]">
                                                        {filteredCountries.length > 0 ? (
                                                            filteredCountries.map((country) => (
                                                                <button
                                                                    type="button"
                                                                    key={country.id}
                                                                    className={`flex w-full items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] text-left ${selectedCountry.id === country.id ? "bg-[#F5F5F5]" : ""}`}
                                                                    onClick={() => {
                                                                        setSelectedCountry(country);
                                                                        setIsCountryDropdownOpen(false);
                                                                        setSearchQuery("");
                                                                    }}
                                                                >
                                                                    {country.flag ? (
                                                                        <img
                                                                            src={country.flag}
                                                                            alt={country.code}
                                                                            className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0"
                                                                        />
                                                                    ) : (
                                                                        <span className="w-[20px] shrink-0 text-[11px] font-[Bold]">
                                                                            {country.code}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[13px] font-[Medium] text-[#222] truncate">
                                                                        {country.name} ({country.dialCode})
                                                                    </span>
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="p-[14px] text-[13px] text-[#707070] text-center">
                                                                No countries found
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="tel"
                                            value={phoneLocal}
                                            onChange={(e) => setPhoneLocal(e.target.value)}
                                            placeholder="Phone number"
                                            className="relative flex-1 w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                                    Deal amount <span className="text-[#D4A373]">*</span>
                                </label>
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={dealAmountInput}
                                        onChange={(e) => setDealAmountInput(e.target.value)}
                                        placeholder="Enter deal amount"
                                        className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                    />
                                    <div className="pointer-events-none px-[10px] h-[34px] flex items-center absolute right-[7px] top-1/2 -translate-y-1/2 text-[#222] text-[14px] font-[Regular]">
                                        {currency}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 p-[20px] md:p-[30px_50px_60px_50px]">
                        <button
                            type="button"
                            disabled={isSubmitting || !countriesLoaded}
                            onClick={handlePrimaryAction}
                            className="h-[44px] w-full rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                            {!countriesLoaded ? "Loading…" : "Continue"}
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    className="relative w-full max-w-[550px] rounded-t-[15px] md:rounded-[15px] bg-white"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-end p-[20px_20px_0px_20px]">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => setShowConfirmClose(false)}
                            className="cursor-pointer h-[36px] w-[36px] rounded-[10px] border border-[rgba(34,34,34,0.15)] bg-white flex items-center justify-center shrink-0 disabled:opacity-50"
                            aria-label="Close"
                        >
                            <CancelIcon width={12} height={12} />
                        </button>
                    </div>
                    <div className="p-[0px_20px_20px_20px] md:p-[0px_50px_50px_50px]">
                        <p className="text-center text-[15px] md:text-[20px] font-[Bold] text-[#222] leading-[150%] px-1">
                            Mark this property as {labelVerb}? This cannot be undone from the agent portal.
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => setShowConfirmClose(false)}
                                className="h-[44px] px-[20px] w-auto rounded-[10px] border border-[#222] bg-white text-[14px] font-[Bold] text-[#222] cursor-pointer disabled:opacity-50"
                            >
                                No
                            </button>
                            <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => void handleFinalConfirm()}
                                className="h-[44px] px-[20px] w-auto rounded-[10px] bg-[#D4A373] text-[14px] font-[Bold] text-white cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? "Saving…" : "Yes, confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SoldRentModal;
