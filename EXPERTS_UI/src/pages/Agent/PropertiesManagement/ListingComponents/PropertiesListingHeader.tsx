import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DownArrowIcon, TickIcon } from "../../../../components/CustomFile/icons";
import {
    agentService,
    type AgentPropertyDetail,
    type AgentPropertyStatusMasterItem,
} from "../../../../services/agentService";
import { ApiError } from "../../../../services/apiClient";
import { toast } from "../../../../services/toast";
import SoldRentModal, { type PropertyCloseDealSubmitValues } from "./SoldRentModal";

const formatNumber = (value: number) => new Intl.NumberFormat("en-IN").format(Math.round(value));

const toTitle = (value: string | undefined | null) => {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const formatMoney = (amount: number, currency?: string) =>
    `${formatNumber(amount)} ${(currency || "AED").trim()}`;

/** Used if master-data fails or returns empty. Must match `PUT /agents/properties/:id/status` allowed values. */
const FALLBACK_PROPERTY_STATUS: AgentPropertyStatusMasterItem[] = [
    { name: "Active", value: "active" },
    { name: "Inactive", value: "inactive" },
    { name: "Sold", value: "sold" },
    { name: "Rented", value: "rented" },
];

const API_CHANGEABLE_STATUS = new Set(["active", "inactive", "sold", "rented"]);

const detailLabelsHiddenForInactive = new Set([
    "Number of bedrooms",
    "Maid room available",
    "Number of bathrooms",
]);

function buildDetailRows(property: AgentPropertyDetail): { label: string; value: ReactNode }[] {
    const loc = property.location;
    const addressBlock =
        loc?.fullAddress?.trim() ||
        [loc?.city, loc?.zone].filter((x) => String(x || "").trim()).join(", ") ||
        "—";

    const sqm = Number(property.area?.sqm ?? 0);
    const sqft = Number(property.area?.sqft ?? 0);
    const tx = String(property.listingType?.transaction ?? "").toLowerCase();
    const isRent = tx === "rent";

    const maidVal =
        property.maidBedroom === true ? (
            <span className="font-[Bold] text-[#00A663] flex items-center gap-[5px] sm:justify-end">
                <span className="w-[20px] h-[20px] bg-[#00A663] rounded-full flex items-center justify-center shrink-0">
                    <TickIcon width={10} height={10} fill="#fff" />
                </span>
                Available
            </span>
        ) : property.maidBedroom === false ? (
            <span className="font-[Bold]">Not available</span>
        ) : (
            <span className="font-[Bold]">—</span>
        );

    const dldUrl = property.dldPermitUrl?.trim();
    const dldUrlNode =
        dldUrl && /^https?:\/\//i.test(dldUrl) ? (
            <a
                href={dldUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-[Bold] text-[#0832AE] break-all text-right max-w-[min(100%,320px)] inline-block"
            >
                {dldUrl.length > 48 ? `${dldUrl.slice(0, 48)}…` : dldUrl}
            </a>
        ) : (
            <span className="font-[Bold] text-right max-w-[min(100%,280px)] break-words inline-block">
                {dldUrl || "—"}
            </span>
        );

    const rows: { label: string; value: ReactNode }[] = [
        {
            label: "Project Location",
            value: (
                <span className="font-[Bold] text-right max-w-[min(100%,280px)] whitespace-pre-wrap inline-block">
                    {addressBlock}
                </span>
            ),
        },
        { label: "Listing type", value: <span className="font-[Bold]">{property.listingType?.name ?? "—"}</span> },
        { label: "Property type", value: <span className="font-[Bold]">{property.propertyType?.name ?? "—"}</span> },
        {
            label: "Number of bedrooms",
            value: <span className="font-[Bold]">{property.bedrooms != null ? String(property.bedrooms) : "—"}</span>,
        },
        { label: "Maid room available", value: maidVal },
        {
            label: "Number of bathrooms",
            value: <span className="font-[Bold]">{property.bathrooms != null ? String(property.bathrooms) : "—"}</span>,
        },
        {
            label: "Area of the property (Sq.m)",
            value: <span className="font-[Bold]">{sqm > 0 ? `${formatNumber(sqm)} sq.m` : "—"}</span>,
        },
        {
            label: "Area of the property (Sq.ft)",
            value: <span className="font-[Bold]">{sqft > 0 ? `${formatNumber(sqft)} sq.ft` : "—"}</span>,
        },
        {
            label: "DLD Permit number",
            value: <span className="font-[Bold]">{property.dldPermitNumber?.trim() || "—"}</span>,
        },
        { label: "DLD Permit url", value: dldUrlNode },
        {
            label: "Zone location",
            value: <span className="font-[Bold]">{property.location?.zone?.trim() || "—"}</span>,
        },
    ];

    if (isRent) {
        const y = property.rentPricing?.yearly ?? property.price;
        const m =
            property.rentPricing?.monthly ??
            (typeof y === "number" && Number.isFinite(y) ? Math.round(y / 12) : undefined);
        rows.push(
            {
                label: "Yearly rental price",
                value: (
                    <span className="font-[Bold]">
                        {typeof y === "number" && Number.isFinite(y) ? formatMoney(y, property.currency) : "—"}
                    </span>
                ),
            },
            {
                label: "Monthly rental price",
                value: (
                    <span className="font-[Bold]">
                        {typeof m === "number" && Number.isFinite(m) ? formatMoney(m, property.currency) : "—"}
                    </span>
                ),
            }
        );
    } else {
        const p = Number(property.price ?? 0);
        rows.push({
            label: "Price",
            value: <span className="font-[Bold]">{formatMoney(Number.isFinite(p) ? p : 0, property.currency)}</span>,
        });
    }

    rows.push(
        {
            label: "Maintenance fee",
            value: (
                <span className="font-[Bold]">
                    {property.maintenanceFees != null && Number.isFinite(Number(property.maintenanceFees))
                        ? formatMoney(Number(property.maintenanceFees), property.currency)
                        : "—"}
                </span>
            ),
        },
        {
            label: "Service charges",
            value: (
                <span className="font-[Bold]">
                    {property.serviceCharges != null && Number.isFinite(Number(property.serviceCharges))
                        ? formatMoney(Number(property.serviceCharges), property.currency)
                        : "—"}
                </span>
            ),
        }
    );

    if (property.completionStatus?.trim()) {
        rows.push({
            label: "Completion status",
            value: <span className="font-[Bold]">{toTitle(property.completionStatus)}</span>,
        });
    }
    if (property.furnishedStatus?.trim()) {
        rows.push({
            label: "Furnished status",
            value: <span className="font-[Bold]">{toTitle(property.furnishedStatus)}</span>,
        });
    }

    return rows;
}

export type PropertiesListingHeaderProps = {
    property: AgentPropertyDetail | null;
    onPropertyUpdated?: (next: AgentPropertyDetail) => void;
};

const PropertiesListingHeader = ({ property, onPropertyUpdated }: PropertiesListingHeaderProps) => {
    const [activateAgent, setActivateAgent] = useState(false);
    const [statusMaster, setStatusMaster] = useState<AgentPropertyStatusMasterItem[]>([]);
    const [selectedStatusValue, setSelectedStatusValue] = useState("");
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const [isSoldRentModalOpen, setIsSoldRentModalOpen] = useState(false);
    const [soldRentIntent, setSoldRentIntent] = useState<"sold" | "rented" | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    useEffect(() => {
        let mounted = true;
        agentService
            .getPropertyStatusMasterData()
            .then((data) => {
                const raw = data?.propertyStatus ?? data?.propertystatus ?? [];
                const rows = raw
                    .map((row) => ({
                        name: String(row?.name ?? "").trim(),
                        value: String(row?.value ?? "").trim().toLowerCase(),
                    }))
                    .filter((row) => row.name && row.value);
                if (mounted && rows.length) setStatusMaster(rows);
            })
            .catch(() => {
                /* keep empty → fallback list */
            });
        return () => {
            mounted = false;
        };
    }, []);

    const statusOptions = useMemo(() => {
        const core = statusMaster.length ? statusMaster : FALLBACK_PROPERTY_STATUS;
        return core.filter((o) => API_CHANGEABLE_STATUS.has(o.value));
    }, [statusMaster]);

    useEffect(() => {
        if (!property) return;
        const s = String(property.status ?? "").trim().toLowerCase();
        setSelectedStatusValue(s);
    }, [property]);

    useEffect(() => {
        setActivateAgent(selectedStatusValue === "active");
    }, [selectedStatusValue]);

    const isStatusLocked = useMemo(() => {
        const s = String(property?.status ?? "").toLowerCase();
        return s === "sold" || s === "rented";
    }, [property?.status]);

    const serverStatusNorm = String(property?.status ?? "").trim().toLowerCase();
    const toggleDisabled =
        isStatusLocked || selectedStatusValue === "sold" || selectedStatusValue === "rented" || isSaving;

    const statusDisplayLabel = useMemo(() => {
        if (!selectedStatusValue) return "";
        const match = statusOptions.find((o) => o.value === selectedStatusValue);
        return match?.name ?? toTitle(selectedStatusValue);
    }, [selectedStatusValue, statusOptions]);

    useEffect(() => {
        if (!isStatusOpen) return;
        const onMouseDown = (e: MouseEvent) => {
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) {
                setIsStatusOpen(false);
            }
        };
        document.addEventListener("mousedown", onMouseDown);
        return () => document.removeEventListener("mousedown", onMouseDown);
    }, [isStatusOpen]);

    const visibleDetailRows = useMemo(() => {
        if (!property) return [];
        const rows = buildDetailRows(property);
        const raw = String(property.status ?? "").toLowerCase();
        if (raw === "inactive") {
            return rows.filter((row) => !detailLabelsHiddenForInactive.has(row.label));
        }
        return rows;
    }, [property]);

    const description = property?.description?.trim() || "";

    const closeSoldRentModal = () => {
        setIsSoldRentModalOpen(false);
        setSoldRentIntent(null);
        if (property) {
            setSelectedStatusValue(String(property.status ?? "").trim().toLowerCase());
        }
    };

    const handleSaveStatus = async () => {
        if (!property || !onPropertyUpdated) return;
        if (isStatusLocked) return;
        if (!API_CHANGEABLE_STATUS.has(selectedStatusValue)) {
            toast.error("Invalid status", "Choose Active, Inactive, Sold, or Rented.");
            return;
        }
        if (selectedStatusValue === serverStatusNorm) {
            toast.info("No change", "Select a different status, then save.");
            return;
        }
        if (selectedStatusValue === "sold" || selectedStatusValue === "rented") {
            setSoldRentIntent(selectedStatusValue);
            setIsSoldRentModalOpen(true);
            return;
        }
        setIsSaving(true);
        try {
            const updated = await agentService.changePropertyStatus(property._id, {
                status: selectedStatusValue as "active" | "inactive",
            });
            onPropertyUpdated(updated);
            toast.success("Status updated", "Property status was saved.");
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : (err as { message?: string })?.message || "Update failed.";
            toast.error("Could not update status", message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSoldRentSubmit = async (values: PropertyCloseDealSubmitValues) => {
        if (!property || !onPropertyUpdated || !soldRentIntent) return;
        setIsSaving(true);
        try {
            const updated = await agentService.changePropertyStatus(property._id, {
                status: soldRentIntent,
                dealInfo: {
                    dealAmount: values.dealAmount,
                    customer: {
                        name: values.customer.name,
                        email: values.customer.email,
                        phone: values.customer.phone,
                    },
                    currency: values.currency || property.currency || "AED",
                },
            });
            onPropertyUpdated(updated);
            toast.success("Status updated", `Property marked as ${soldRentIntent}.`);
            setIsSoldRentModalOpen(false);
            setSoldRentIntent(null);
        } catch (err) {
            const message =
                err instanceof ApiError ? err.message : (err as { message?: string })?.message || "Update failed.";
            toast.error("Could not close deal", message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyPropertyUrl = async () => {
        const url = property?.propertyUrl?.trim();
        if (!url) {
            toast.error("Nothing to copy", "Property URL is not available for this listing.");
            return;
        }
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Property URL copied", "The link was copied to your clipboard.");
        } catch {
            toast.error("Copy failed", "Could not copy to the clipboard. Try selecting the URL and copying manually.");
        }
    };

    return (
        <>
            <div className="rounded-[15px] bg-white overflow-hidden min-w-0">
                <div className="flex flex-col lg:flex-col lg:items-stretch xl:flex-row xl:items-stretch">
                    <div className="flex-1 min-w-0 md:p-[30px] p-[20px] ">
                        <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] leading-tight mb-4">
                            Property description
                        </h2>
                        <p className="text-[14px] font-[Regular] text-[#222] leading-[160%] mb-6 whitespace-pre-wrap">
                            {description || "No description provided."}
                        </p>
                        <div className="h-px w-full bg-[rgba(34,34,34,0.10)] mb-6" />
                        <div className="flex flex-col">
                            {visibleDetailRows.map((row) => (
                                <div
                                    key={row.label}
                                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-3 border-b border-[rgba(34,34,34,0.08)] last:border-b-0 text-[14px]"
                                >
                                    <span className="text-[14px] text-[#222] font-[Regular] shrink-0">{row.label}</span>
                                    <div className="text-[14px] text-[#222] font-[Bold] sm:text-right min-w-0">{row.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-auto xl:w-[min(100%,380px)] shrink-0 m-[4px] flex flex-col">
                        <div className="rounded-[15px] bg-[#F5F5F5] md:p-[15px_30px] p-[10px_20px] mb-[6px] flex items-center justify-between gap-3">
                            <span className="text-[15px] font-[Bold] text-[#222]">Active property</span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={activateAgent}
                                disabled={toggleDisabled}
                                onClick={() => {
                                    if (toggleDisabled) return;
                                    const next = !activateAgent;
                                    setActivateAgent(next);
                                    setSelectedStatusValue(next ? "active" : "inactive");
                                }}
                                className={`relative shrink-0 h-[26px] w-[48px] rounded-full transition-colors ${activateAgent ? "bg-[#EA3934]" : "bg-[#D4D4D4]"
                                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                <span
                                    className={`absolute top-[3px] left-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${activateAgent ? "translate-x-[22px]" : "translate-x-0"
                                        }`}
                                />
                            </button>
                        </div>
                        <div className="h-full rounded-[15px] bg-[#F5F5F5] md:p-[39px_30px] p-[10px_20px]">
                            <h3 className="text-[20px] font-[Bold] text-[#222] mb-[28px]">Set the property status</h3>
                            <div className="flex flex-col gap-[10px] mt-[40px]">
                                <div className="relative" ref={statusDropdownRef}>
                                    <label className="block text-[14px] font-[SemiBold] text-[#222] mb-2">
                                        Status <span className="text-[#EA3934]">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        aria-expanded={isStatusOpen}
                                        aria-haspopup="listbox"
                                        disabled={isStatusLocked || isSaving}
                                        onClick={() => {
                                            if (isStatusLocked || isSaving) return;
                                            setIsStatusOpen((open) => !open);
                                        }}
                                        className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[14px] flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span
                                            className={`text-[14px] font-[Regular] truncate ${selectedStatusValue ? "text-[#222]" : "text-[#707070]"}`}
                                        >
                                            {statusDisplayLabel || "Select"}
                                        </span>
                                        <DownArrowIcon
                                            width={11}
                                            height={7}
                                            className={`shrink-0 transition-transform ${isStatusOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>
                                    {isStatusOpen && (
                                        <div
                                            role="listbox"
                                            className="absolute top-full left-0 right-0 mt-2 z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]"
                                        >
                                            {statusOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={selectedStatusValue === option.value}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        if (isStatusLocked) return;
                                                        setSelectedStatusValue(option.value);
                                                        setIsStatusOpen(false);
                                                    }}
                                                    className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${selectedStatusValue === option.value
                                                        ? "text-[#EA3934] bg-[#FDF2F2]"
                                                        : "text-[#222]"
                                                        }`}
                                                >
                                                    {option.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    disabled={
                                        isStatusLocked ||
                                        isSaving ||
                                        !onPropertyUpdated ||
                                        selectedStatusValue === serverStatusNorm
                                    }
                                    onClick={() => void handleSaveStatus()}
                                    className="cursor-pointer mt-[30px] h-[44px] w-full rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isSaving ? "Saving…" : "Save"}
                                </button>
                                {isStatusLocked ? (
                                    <p className="mt-2 text-[12px] text-[#707070]">
                                        This listing is sold or rented and status cannot be changed.
                                    </p>
                                ) : null}


                                <div className="mt-[30px] bg-[#FFF] rounded-[10px] p-[18px] border border-[rgba(34,34,34,0.10)]">
                                    <h3 className="text-[14px] font-[SemiBold] text-[#222] mb-[10px]">URL</h3>
                                    <input
                                        type="text"
                                        readOnly
                                        placeholder="Property URL"
                                        value={property?.propertyUrl?.trim() || ""}
                                        aria-label="Property public URL"
                                        className="w-full truncate h-[52px] px-[8px] rounded-[10px] bg-[#F5F5F5] text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none border border-[rgba(34,34,34,0.10)]"
                                    />
                                    <div className="flex items-center justify-end">
                                        <button
                                            type="button"
                                            disabled={!property?.propertyUrl?.trim()}
                                            onClick={() => void handleCopyPropertyUrl()}
                                            className="text-[12px] font-[Bold] text-[#FFF] bg-[#EA3934] rounded-[8px] h-[32px] px-[20px] py-[5px] mt-[15px] disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <SoldRentModal
                isOpen={isSoldRentModalOpen}
                variant={soldRentIntent}
                currency={property?.currency || "AED"}
                isSubmitting={isSaving}
                onClose={closeSoldRentModal}
                onSubmit={handleSoldRentSubmit}
            />
        </>
    );
};

export default PropertiesListingHeader;
