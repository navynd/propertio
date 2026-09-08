import { useEffect, useState, type ReactNode } from "react";
import { SuperAgentIcon, TickIcon, AgentIcon, AgentsIcon } from "../../../../components/CustomFile/icons";
import userImg from "../../../../assets/img/user.png";
import mainbg from "../../../../assets/img/mainbg.png";
import {
    agencyService,
} from "../../../../services/agencyService";
import { API_BASE_URL } from "../../../../services/apiClient";

type DealInfoShape = {
    dealType?: string;
    dealAmount?: number;
    dealClosedDate?: string;
    customer?: {
        name?: string;
        email?: string;
        phone?: string;
    };
};

function formatDealClosedDate(value?: string | null): string {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function formatDealTypeLabel(value?: string | null): string {
    const v = String(value ?? "").trim().toLowerCase();
    if (v === "sale") return "Sale";
    if (v === "rent") return "Rent";
    if (!v) return "-";
    return v.charAt(0).toUpperCase() + v.slice(1);
}

function formatDealAmount(
    amount?: number | null,
    currency?: string | null,
): string {
    if (amount == null || Number.isNaN(Number(amount))) return "-";
    const cur = (currency || "AED").trim();
    return `${Number(amount).toLocaleString("en-US")} ${cur}`;
}

const ListingHeader = ({ listing }: any) => {
    const dealStatus = String(listing?.dealStatus ?? "").toLowerCase();
    const propertyStatus = String(listing?.status ?? "").toLowerCase();
    const dealInfo = listing?.dealInfo as DealInfoShape | undefined;
    const isDealClosed =
        dealStatus === "deal-close" ||
        dealStatus === "deal-closed" ||
        propertyStatus === "sold" ||
        propertyStatus === "rented" ||
        Boolean(dealInfo?.dealClosedDate);
    const isMaidRoomAvailable = Boolean(listing?.maidBedroom);
    const agentType = String(listing?.agent?.agentType ?? "").toLowerCase();
    const isSuperAgent = agentType === "superagent";
    const isAgent = agentType === "agent";

    const AssignedRows: { label: string; value: ReactNode }[] = [
        {
            label: "Email address",
            value: <span className="font-[Bold]">{listing?.agent?.email || "-"}</span>,
        },
        {
            label: "Phone number",
            value: <span className="font-[Bold]">{listing?.agent?.phoneNumber || "-"}</span>,
        },
        ...(isDealClosed
            ? [
                  {
                      label: "Deal type",
                      value: (
                          <span className="font-[Bold]">
                              {formatDealTypeLabel(dealInfo?.dealType)}
                          </span>
                      ),
                  },
                  {
                      label: "Deal amount",
                      value: (
                          <span className="font-[Bold]">
                              {formatDealAmount(
                                  dealInfo?.dealAmount,
                                  listing?.currency,
                              )}
                          </span>
                      ),
                  },
                  {
                      label: "Deal closed date",
                      value: (
                          <span className="font-[Bold]">
                              {formatDealClosedDate(dealInfo?.dealClosedDate)}
                          </span>
                      ),
                  },
                  {
                      label: "Customer name",
                      value: (
                          <span className="font-[Bold]">
                              {dealInfo?.customer?.name?.trim() || "-"}
                          </span>
                      ),
                  },
                  {
                      label: "Customer email",
                      value: (
                          <span className="font-[Bold]">
                              {dealInfo?.customer?.email?.trim() || "-"}
                          </span>
                      ),
                  },
                  {
                      label: "Customer phone",
                      value: (
                          <span className="font-[Bold]">
                              {dealInfo?.customer?.phone?.trim() || "-"}
                          </span>
                      ),
                  },
              ]
            : []),
    ];

    const detailRows: { label: string; value: ReactNode }[] = [
        {
            label: "Project Location",
            value: (
                <span className="font-[Bold] text-right max-w-[min(100%,280px)]">
                    {listing?.location?.fullAddress || "-"}
                </span>
            ),
        },
        { label: "Listing type ", value: <span className="font-[Bold]"> {listing?.listingType?.name || "-"}</span> },
        { label: "Property type ", value: <span className="font-[Bold]"> {listing?.propertyType?.name || "-"}</span> },
        { label: "Number of bedrooms", value: <span className="font-[Bold]"> {listing?.bedrooms || "-"}</span> },
        {
            label: "Maid room available",
            value: isMaidRoomAvailable ? (
                <span className="font-[Bold] text-[#00A663] flex items-center gap-[5px]">
                    <span className="w-[20px] h-[20px] bg-[#00A663] rounded-full flex items-center justify-center">
                        <TickIcon width={10} height={10} fill="#fff" />
                    </span>
                    Available
                </span>
            ) : (
                <span className="font-[Bold] text-[#707070]">Not available</span>
            ),
        },
        { label: "Number of bathrooms", value: <span className="font-[Bold]"> {listing?.bathrooms || "-"}</span> },
        { label: "Area of the property (Sq.m)", value: <span className="font-[Bold]"> {listing?.area?.sqm || "-"}</span> },
        { label: "Area of the property (Sq.ft)", value: <span className="font-[Bold]"> {listing?.area?.sqft || "-"}</span> },
        { label: "DLD Permit number", value: <span className="font-[Bold]"> {listing?.dldPermitNumber || "-"}</span> },
        { label: "DLD Permit url", value: <span className="font-[Bold]"> {listing?.dldPermitUrl || "-"}</span> },
        { label: "Zone location", value: <span className="font-[Bold]"> {listing?.location?.zone || "-"}</span> },
        { label: "Monthly rental price", value: <span className="font-[Bold]"> {listing?.price || "-"}</span> },
        { label: "Maintenance fee", value: <span className="font-[Bold]"> {listing?.maintenanceFees ?? "-"}</span> },
        { label: "Service charges", value: <span className="font-[Bold]"> {listing?.serviceCharges ?? "-"}</span> },

    ];
    const [imageBaseUrls, setImageBaseUrls] = useState({
        agent: "",
        property: "",
    });

    useEffect(() => {
        let isMounted = true;

        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallback = `${fallbackOrigin}/uploads/img/property/`;

        agencyService
            .getMasterData(["supportedurls"])
            .then((data) => {
                if (!isMounted) return;

                const supported = data?.supportedUrls;

                setImageBaseUrls({
                    agent: supported?.agentUrl?.img?.trim() || fallback,
                    property: supported?.propertyUrl?.img?.trim() || fallback,
                });
            })
            .catch(() => {
                if (!isMounted) return;

                setImageBaseUrls({
                    agent: fallback,
                    property: fallback,
                });
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const toImageUrl = (image: string | null, type: "agent" | "property") => {
        if (!image) return mainbg;
        if (image.startsWith("http")) return image;

        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;

        const base =
            (type === "agent" ? imageBaseUrls.agent : imageBaseUrls.property) ||
            fallbackBase;

        const cleanBase = base.replace(/\/+$/, "");
        const cleanImage = image.replace(/^\/+/, "");

        return `${cleanBase}/${cleanImage}`;
    };

    return (
        <div
            className="rounded-[15px] bg-white overflow-hidden min-w-0"
        >
            <div className="flex flex-col lg:flex-col lg:items-stretch xl:flex-row xl:items-stretch">
                {/* Left — description + details */}
                <div className="flex-1 min-w-0 md:p-[30px] p-[20px] ">
                    <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] leading-tight mb-4">Project description</h2>
                    <p className="text-[14px] font-[Regular] text-[#222] leading-[160%] mb-4">
                        {listing?.description}
                    </p>
                    <div className="w-full">
                        {/* <p className="text-[15px] font-[Bold] text-[#222] leading-[160%] mb-3">
                            Etiam neque tellus, mattis sed tempor eu, dictum laoreet mi.
                        </p>
                        <ul className="list-disc pl-5 space-y-2 text-[14px] font-[Regular] text-[#707070] leading-[160%] mb-8">
                            {bulletPoints.map((text, i) => (
                                <li key={i} className="text-[14px] font-[Regular] text-[#222] leading-[160%]">{text}</li>
                            ))}
                        </ul> */}
                        <div className="h-px w-full bg-[rgba(34,34,34,0.10)] mb-6" />
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

                <div className="w-auto xl:w-[min(100%,380px)] shrink-0 m-[4px] flex flex-col">
                    <div className="h-full rounded-[15px] bg-[#F5F5F5] md:p-[39px_30px] p-[10px_20px]">
                        <h3 className="text-[20px] font-[Bold] text-[#222] mb-[28px]">Assigned agent</h3>
                        <div className="flex flex-col gap-5">
                            <div className="flex items-center gap-[10px]">
                                <div className="w-[60px] h-[60px] rounded-full overflow-hidden shrink-0 border-[2px] border-[rgba(34,34,34,0.10)]">
                                    <img src={toImageUrl(listing?.agent?.profilePicture, "agent")} alt="agent" className="w-full h-full object-cover" />
                                </div>
                                <div className="flex flex-col gap-[5px]">
                                    {isSuperAgent && (
                                        <span className="flex items-center justify-center gap-1 bg-[#D4A373] w-fit h-[21px] p-[6px_7px] text-[10px] font-[SemiBold] text-white text-uppercase ">
                                            <SuperAgentIcon width={10} height={10} />
                                            SUPER AGENT
                                        </span>
                                    )}
                                    {isAgent && (
                                        <span className="flex items-center justify-center gap-1 bg-[#0832AE] w-fit h-[21px] p-[6px_7px] text-[10px] font-[SemiBold] text-white text-uppercase ">
                                            <AgentsIcon width={10} height={10} />
                                            AGENT
                                        </span>
                                    )}
                                    <span className="text-[14px] text-[#222] font-[Bold]">{listing?.agent?.fullName}</span>
                                    <span className="text-[12px] text-[#707070] font-[Regular]">{listing?.agent?.specialization?.title}</span>
                                </div>
                            </div>
                            <div className="flex flex-col">
                                {AssignedRows.map((row) => (
                                    <div
                                        key={row.label}
                                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-3 border-b border-[rgba(34,34,34,0.10)] last:border-b-0 text-[14px]"
                                    >
                                        <span className="text-[14px] text-[#222] font-[Regular] shrink-0">{row.label}</span>
                                        <div className="text-[14px] text-[#222] font-[Bold] sm:text-right min-w-0">{row.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-[10px] mt-[40px]">
                            {!isDealClosed && (
                                <button
                                    type="button"
                                    className="h-[44px] w-full rounded-[10px] bg-[#E7EBF7] border border-[#0832AE] text-[#0832AE] text-[14px] font-[Bold] transition-opacity"
                                >
                                    Deal is open
                                </button>
                            )}

                            {isDealClosed && (
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

export default ListingHeader;
