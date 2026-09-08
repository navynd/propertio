import { useEffect, useState } from "react";
import { EditIcon, TrashIcon } from "../../../components/CustomFile/icons";
import { useNavigate, useParams } from "react-router-dom";
import PropertiesListingHeader from "./ListingComponents/PropertiesListingHeader";
import ListingCommon from "./ListingComponents/ListingCommon";
import Loader from "../../../components/Loader/loader";
import { agentService, type AgentPropertyDetail } from "../../../services/agentService";
import { API_BASE_URL, ApiError } from "../../../services/apiClient";
import { toast } from "../../../services/toast";
import { extractPropertyMediaBasesFromSupportedUrls } from "../../../utils/agentPropertyListingMedia";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const PropertiesMangeDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [property, setProperty] = useState<AgentPropertyDetail | null>(null);
    const [propertyImageBaseUrl, setPropertyImageBaseUrl] = useState<string | null>(null);
    const [propertyVideoBaseUrl, setPropertyVideoBaseUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallbackImageBase = `${fallbackOrigin}/uploads/img/property/`;
        const fallbackVideoBase = `${fallbackOrigin}/uploads/vid/property/`;
        agentService
            .getSupportedUrlsMasterData()
            .then((data) => {
                if (!mounted) return;
                const { imageBase, videoBase } = extractPropertyMediaBasesFromSupportedUrls(data);
                setPropertyImageBaseUrl((imageBase ?? fallbackImageBase).replace(/\/?$/, "/"));
                setPropertyVideoBaseUrl((videoBase ?? fallbackVideoBase).replace(/\/?$/, "/"));
            })
            .catch(() => {
                if (!mounted) return;
                setPropertyImageBaseUrl(fallbackImageBase.replace(/\/?$/, "/"));
                setPropertyVideoBaseUrl(fallbackVideoBase.replace(/\/?$/, "/"));
            });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!id || !OBJECT_ID_RE.test(id)) {
            setLoading(false);
            setError("Invalid property link.");
            setProperty(null);
            return;
        }

        let mounted = true;
        setLoading(true);
        setError(null);

        agentService
            .getPropertyById(id)
            .then((data) => {
                if (!mounted) return;
                setProperty(data);
            })
            .catch((err: unknown) => {
                if (!mounted) return;
                const message =
                    err instanceof ApiError
                        ? err.message
                        : (err as { message?: string })?.message || "Unable to load property.";
                setError(message);
                setProperty(null);
                toast.error("Property load failed", message);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [id]);

    if (!id || !OBJECT_ID_RE.test(id)) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <p className="text-[14px] text-[#707070]">Invalid property link.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex min-h-[240px] items-center justify-center">
                <Loader size={80} margin={0} />
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-3">
                <p className="text-[14px] text-[#707070]">{error || "Property not found."}</p>
                <button
                    type="button"
                    onClick={() => navigate("/agent/properties-management")}
                    className="w-fit rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[36px] text-[12px] font-[SemiBold] text-[#222]"
                >
                    Back to properties
                </button>
            </div>
        );
    }

    const title = property.title?.trim() || "Property";

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
                <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0 min-w-0">
                    <span className="text-[#707070] font-[Regular]">Property : </span>
                    <span className="text-[#222] font-[Bold] break-words">{title}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
                    <button
                        type="button"
                        onClick={() =>
                            navigate("/agent/properties-management/edit-property", {
                                state: { propertyId: property._id },
                            })
                        }
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <EditIcon width={20} height={20} stroke="#222222" />
                        Edit
                    </button>
                    <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <TrashIcon width={20} height={20} />
                        Delete
                    </button>
                </div>
            </div>
            <PropertiesListingHeader property={property} onPropertyUpdated={setProperty} />
            <ListingCommon
                property={property}
                propertyImageBaseUrl={propertyImageBaseUrl}
                propertyVideoBaseUrl={propertyVideoBaseUrl}
            />
        </div>
    );
};

export default PropertiesMangeDetail;
