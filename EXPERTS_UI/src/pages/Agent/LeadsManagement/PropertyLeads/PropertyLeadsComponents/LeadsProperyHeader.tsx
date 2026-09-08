import { type ReactNode } from "react";
import { NoUserIcon, TickIcon } from "../../../../../components/CustomFile/icons";
import type { AgentInquiryDetailResponse } from "../../../../../services/agentService";

type Props = {
    data: AgentInquiryDetailResponse | null;
    customerImageUrl?: string;
    onMoveToAttended?: () => void;
    onCloseInquiry?: () => void;
    onCloseDeal?: () => void;
    isUpdatingStatus?: boolean;
};

const formatDate = (value?: string) => {
    if (!value) return "--/--";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "--/--";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const toLabel = (value?: string) => {
    if (!value) return "--/--";
    return value
        .split("-")
        .map((v) => v.charAt(0).toUpperCase() + v.slice(1))
        .join(" ");
};

type MasterRef = { _id?: string; name?: string; slug?: string };

const masterLabel = (value?: MasterRef | string | null) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value.name || value.slug || "";
};

const LeadsProperyHeader = ({
    data,
    customerImageUrl,
    onMoveToAttended,
    onCloseInquiry,
    onCloseDeal,
    isUpdatingStatus = false,
}: Props) => {
    const property = data?.property;
    const inquiry = data?.inquiry;
    const customer = data?.customer;
    const listingLabel = masterLabel(inquiry?.listingType) || masterLabel(property?.listingType);
    const propertyTypeLabel = masterLabel(property?.propertyType);
    const customerRows: { label: string; value: ReactNode }[] = [
        { label: "Email address", value: <span className="font-[Bold]">{customer?.email || "--/--"}</span> },
        { label: "Phone number", value: <span className="font-[Bold]">{customer?.phoneNumber || "--/--"}</span> },
        { label: "Date", value: <span className="font-[Bold]">{formatDate(inquiry?.inquiredAt)}</span> },
        { label: "Lead source", value: <span className="font-[Bold]">{toLabel(inquiry?.inquiryType)}</span> },
        ...(inquiry?.dealClosed?.dealAmount != null
            ? [
                {
                    label: "Deal amount",
                    value: (
                        <span className="font-[Bold]">
                            {Number(inquiry.dealClosed.dealAmount).toLocaleString("en-US")} AED
                        </span>
                    ),
                },
            ]
            : []),
    ];

    const detailRows: { label: string; value: ReactNode }[] = [
        { label: "Property Location", value: <span className="font-[Bold]">{property?.location?.fullAddress || "--/--"}</span> },
        { label: "Listing type", value: <span className="font-[Bold]">{listingLabel || "--/--"}</span> },
        { label: "Property type", value: <span className="font-[Bold]">{propertyTypeLabel || "--/--"}</span> },
        { label: "Number of bedrooms", value: <span className="font-[Bold]">{property?.bedrooms ?? "--/--"}</span> },
        {
            label: "Maid room available",
            value: property?.maidBedroom ? (
                <span className="font-[Bold] text-[#00A663] flex items-center gap-[5px]">
                    <span className="w-[20px] h-[20px] bg-[#00A663] rounded-full flex items-center justify-center">
                        <TickIcon width={10} height={10} fill="#fff" />
                    </span>
                    Available
                </span>
            ) : (
                <span className="font-[Bold]">Not available</span>
            ),
        },
        { label: "Number of bathrooms", value: <span className="font-[Bold]">{property?.bathrooms ?? "--/--"}</span> },
        { label: "Area of the property (Sq.m)", value: <span className="font-[Bold]">{property?.area?.sqm ?? "--/--"}</span> },
        { label: "Area of the property (Sq.ft)", value: <span className="font-[Bold]">{property?.area?.sqft ?? "--/--"}</span> },
        { label: "DLD Permit number", value: <span className="font-[Bold]">{property?.dldPermitNumber || "--/--"}</span> },
        { label: "Zone location", value: <span className="font-[Bold]">{property?.location?.zone || "--/--"}</span> },
        {
            label: "Price",
            value: (
                <span className="font-[Bold]">
                    {property?.price != null ? `${Number(property.price).toLocaleString("en-US")} ${property.currency || "AED"}` : "--/--"}
                </span>
            ),
        },
        { label: "Maintenance fee", value: <span className="font-[Bold]">{property?.maintenanceFees ?? "--/--"}</span> },
        { label: "Service charges", value: <span className="font-[Bold]">{property?.serviceCharges ?? "--/--"}</span> },
    ];

    return (
        <div
            className="rounded-[15px] bg-white overflow-hidden min-w-0"
        >
            <div className="flex flex-col lg:flex-col lg:items-stretch xl:flex-row xl:items-stretch">
                {/* Left — description + details */}
                <div className="flex-1 min-w-0 md:p-[30px] p-[20px] ">
                    <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] leading-tight mb-4">Project description</h2>
                    <p className="text-[14px] font-[Regular] text-[#222] leading-[160%] mb-4">
                        {property?.description || "--/--"}
                    </p>
                    <div className="w-full">
                        <div className="h-px w-full bg-[rgba(34,34,34,0.10)] mb-2" />
                        <div className="flex flex-col">
                            {detailRows.map((row) => (
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
                </div>

                {/* Right — sidebar */}

                <div className="w-auto xl:w-[min(100%,380px)] shrink-0 m-[4px] flex flex-col gap-[5px]">
                    <div className="h-full rounded-[15px] bg-[#F5F5F5] md:p-[30px_30px] p-[10px_20px]">
                        <h3 className="text-[20px] font-[Bold] text-[#222] mb-[28px] leading-[140%]">Customer details</h3>
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-[10px]">
                                <div className="overflow-hidden shrink-0 h-[60px] w-[60px] rounded-full bg-white">
                                    {customerImageUrl ? (
                                        <img src={customerImageUrl} alt="" className="h-full w-full object-cover rounded-full" />
                                    ) : (
                                        <NoUserIcon width={60} height={60} />
                                    )}
                                </div>
                                <div className="flex flex-col gap-[5px]">
                                    <span className="text-[14px] text-[#222] font-[Bold]">{customer?.name || "--/--"}</span>
                                    <span className="text-[12px] text-[#707070] font-[Regular]">
                                        Inquired on {formatDate(inquiry?.inquiredAt)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                {customerRows.map((row) => (
                                    <div
                                        key={row.label}
                                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-3 border-b border-[rgba(34,34,34,0.10)] last:border-b-0 text-[14px]"
                                    >
                                        <span className="text-[14px] text-[#222] font-[Regular] shrink-0">{row.label}</span>
                                        <div className="text-[14px] text-[#222] font-[Bold] sm:text-right min-w-0">{row.value}</div>
                                    </div>
                                ))}
                            </div>
                            {!!data?.inquiry?.message && (
                                <div>
                                    <h3 className="text-[20px] font-[Bold] text-[#222] mb-[10px]">Message</h3>
                                    <p className="text-[14px] font-[Regular] text-[#222] leading-[160%] mb-4">
                                        {data?.inquiry?.message}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col gap-[10px] mt-[40px]">
                            {inquiry?.status === "new" && (
                                <button
                                    type="button"
                                    onClick={onMoveToAttended}
                                    disabled={isUpdatingStatus}
                                    className="h-[44px] w-full rounded-[10px] bg-[#EA3934] text-[#FFF] text-[14px] font-[Bold] transition-opacity"
                                >
                                    {isUpdatingStatus ? "Updating..." : "Move to attended"}
                                </button>
                            )}
                            {inquiry?.status === "attended" && (
                                <div className="flex items-center gap-[10px]">
                                    <button
                                        type="button"
                                        onClick={onCloseInquiry}
                                        disabled={isUpdatingStatus}
                                        className="h-[44px] w-full rounded-[10px] bg-[#0832AE] text-[#FFF] text-[14px] font-[Bold] transition-opacity"
                                    >
                                        {isUpdatingStatus ? "Updating..." : "Close Inquiry"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onCloseDeal}
                                        disabled={isUpdatingStatus}
                                        className="h-[44px] w-full rounded-[10px] bg-[#EA3934] text-[#FFF] text-[14px] font-[Bold] transition-opacity"
                                    >
                                        {isUpdatingStatus ? "Updating..." : "Close the deal"}
                                    </button>
                                </div>
                            )}
                            {inquiry?.status === "closed" && !inquiry?.dealClosed?.isClosed && (
                                <button
                                    type="button"
                                    className="h-[44px] w-full rounded-[10px] bg-[#FDE7E7] border border-[#E80808] text-[#E80808] text-[14px] font-[Bold] transition-opacity"
                                >
                                    Inquiry Closed
                                </button>
                            )}
                            {inquiry?.dealClosed?.isClosed && (
                                <button
                                    type="button"
                                    className="h-[44px] w-full rounded-[10px] bg-[#00A663] text-[#FFF] text-[14px] font-[Bold] transition-opacity flex items-center justify-center gap-[5px]"
                                >
                                    <span className="w-[20px] h-[20px] bg-[#FFF] rounded-full flex items-center justify-center"><TickIcon width={10} height={10} fill="#00A663" /></span>Deal is closed
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

export default LeadsProperyHeader;      
