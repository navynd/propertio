import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PropertyCommon from "./PropertyLeadsComponents/PropertyCommon";
import LeadsProperyHeader from "./PropertyLeadsComponents/LeadsProperyHeader";
import CloseDealModal from "./PropertyLeadsComponents/CloseDealModal";
import Loader from "../../../../components/Loader/loader";
import { agentService, type AgentInquiryDetailResponse } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";

const inferDealType = (value?: string): "sale" | "rent" => {
    const normalized = (value || "").trim().toLowerCase();
    if (["rent", "rental", "for-rent"].includes(normalized)) return "rent";
    return "sale";
};

const inferListingBadge = (value?: string): "Rent" | "Buy" => (inferDealType(value) === "rent" ? "Rent" : "Buy");

const resolveListingTypeRaw = (data: AgentInquiryDetailResponse | null): string | undefined => {
    const raw = data?.inquiry?.listingType ?? data?.property?.listingType;
    if (!raw) return undefined;
    if (typeof raw === "string") return raw;
    return raw.slug || raw.name;
};

const LeadsPropertyDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<AgentInquiryDetailResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [propertyImgBaseUrl, setPropertyImgBaseUrl] = useState("");
    const [propertyVidBaseUrl, setPropertyVidBaseUrl] = useState("");
    const [userImgBaseUrl, setUserImgBaseUrl] = useState("");
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isCloseDealModalOpen, setIsCloseDealModalOpen] = useState(false);
    const [isCloseDealSubmitting, setIsCloseDealSubmitting] = useState(false);

    useEffect(() => {
        if (!id) {
            toast.error("Missing inquiry", "Inquiry ID not found.");
            navigate("/agent/leads/property");
            return;
        }
        const loadDetail = async () => {
            setIsLoading(true);
            try {
                const [supportedRes, response] = await Promise.all([
                    agentService.getSupportedUrlsMasterData(),
                    agentService.getInquiryById(id),
                ]);
                const anySupported = supportedRes as unknown as {
                    supportedUrls?: {
                        propertyUrl?: { img?: string; vid?: string };
                        userUrl?: { img?: string };
                    };
                    supportedurls?: {
                        propertyUrl?: { img?: string; vid?: string };
                        userUrl?: { img?: string };
                    };
                    propertyUrl?: { img?: string; vid?: string };
                    userUrl?: { img?: string };
                };
                const propertyUrl =
                    anySupported?.supportedUrls?.propertyUrl ||
                    anySupported?.supportedurls?.propertyUrl ||
                    anySupported?.propertyUrl ||
                    {};
                const userUrl =
                    anySupported?.supportedUrls?.userUrl ||
                    anySupported?.supportedurls?.userUrl ||
                    anySupported?.userUrl ||
                    {};
                setPropertyImgBaseUrl(propertyUrl.img || "");
                setPropertyVidBaseUrl(propertyUrl.vid || "");
                setUserImgBaseUrl(userUrl.img || "");
                setData(response || null);
            } catch (error: unknown) {
                const message = (error as { message?: string })?.message || "Failed to fetch inquiry detail.";
                toast.error("Load failed", message);
            } finally {
                setIsLoading(false);
            }
        };
        void loadDetail();
    }, [id, navigate]);

    const reloadDetail = async () => {
        if (!id) return;
        const response = await agentService.getInquiryById(id);
        setData(response || null);
    };

    const handleUpdateInquiryStatus = async (type: "attend" | "close-inquiry") => {
        if (!id) return;
        setIsUpdatingStatus(true);
        try {
            await agentService.updateInquiryStatus(id, { type });
            toast.success("Updated", type === "attend" ? "Inquiry marked as attended." : "Inquiry closed.");
            await reloadDetail();
        } catch (error: unknown) {
            const message = (error as { message?: string })?.message || "Failed to update inquiry status.";
            toast.error("Update failed", message);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const customerImageUrl = useMemo(() => {
        const raw = data?.customer?.profilePicture || data?.customer?.image || "";
        if (!raw) return "";
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        return userImgBaseUrl ? `${userImgBaseUrl.replace(/\/?$/, "/")}${raw}` : raw;
    }, [data?.customer?.image, data?.customer?.profilePicture, userImgBaseUrl]);

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
                <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
                    <span className="text-[#707070] font-[Regular]">Property Name : </span>
                    <span className="text-[#222] font-[Bold]">{data?.property?.title || "--/--"}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
                </div>
            </div>
            <LeadsProperyHeader
                data={data}
                customerImageUrl={customerImageUrl}
                onMoveToAttended={() => void handleUpdateInquiryStatus("attend")}
                onCloseInquiry={() => void handleUpdateInquiryStatus("close-inquiry")}
                onCloseDeal={() => setIsCloseDealModalOpen(true)}
                isUpdatingStatus={isUpdatingStatus}
            />

            <PropertyCommon data={data} imageBaseUrl={propertyImgBaseUrl} videoBaseUrl={propertyVidBaseUrl} />
            <CloseDealModal
                isOpen={isCloseDealModalOpen}
                onClose={() => {
                    if (isCloseDealSubmitting) return;
                    setIsCloseDealModalOpen(false);
                }}
                isSubmitting={isCloseDealSubmitting}
                lead={{
                    customerName: data?.customer?.name || "-",
                    customerEmail: data?.customer?.email || "-",
                    customerPhone: data?.customer?.phoneNumber || "-",
                    propertyName: data?.property?.title || "-",
                    propertyImage: (() => {
                        const raw = data?.property?.images?.[0]?.url || "";
                        if (!raw) return "";
                        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
                        return propertyImgBaseUrl ? `${propertyImgBaseUrl.replace(/\/?$/, "/")}${raw}` : raw;
                    })(),
                    listingType: inferListingBadge(resolveListingTypeRaw(data)),
                }}
                onSubmit={async ({ dealAmount }) => {
                    if (!id) return;
                    const listingTypeRaw = resolveListingTypeRaw(data);
                    setIsCloseDealSubmitting(true);
                    try {
                        await agentService.closeInquiryDeal(id, {
                            dealType: inferDealType(listingTypeRaw),
                            dealAmount,
                            currency: "AED",
                        });
                        toast.success("Updated", "Deal closed successfully.");
                        setIsCloseDealModalOpen(false);
                        await reloadDetail();
                    } catch (error: unknown) {
                        const message = (error as { message?: string })?.message || "Failed to close deal.";
                        toast.error("Update failed", message);
                    } finally {
                        setIsCloseDealSubmitting(false);
                    }
                }}
            />
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
        </div>
    );
};

export default LeadsPropertyDetail;  
