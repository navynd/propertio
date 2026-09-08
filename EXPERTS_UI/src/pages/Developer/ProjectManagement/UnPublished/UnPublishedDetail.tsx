import { useEffect, useMemo, useState } from "react";
import DeveloperHeader from "../../../../components/Header/DeveloperHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { developerService } from "../../../../services/developerService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";
import { API_BASE_URL } from "../../../../services/apiClient";
import ProjectDescription from "../ProjectComponents/ProjectDescription";
import PayMap from "../ProjectComponents/PayMap";
import { readProjectLocationLatLng } from "../ProjectComponents/projectLocationUtils";
import CommonSection from "../ProjectComponents/CommonSection";
import Frq from "../ProjectComponents/Frq";
import ProjectHeader from "../ProjectComponents/ProjectHeader";
import { TrashIcon } from "../../../../components/CustomFile/icons";

const UnPublishedDetail = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get("projectId") || "";
    const [isLoading, setIsLoading] = useState(false);
    const [isSavingChanges, setIsSavingChanges] = useState(false);
    const [project, setProject] = useState<Record<string, unknown> | null>(null);
    const [unitProperties, setUnitProperties] = useState<Array<Record<string, unknown>>>([]);
    const [pendingFaqDeleteIds, setPendingFaqDeleteIds] = useState<string[]>([]);
    const defaultOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const [mediaBase, setMediaBase] = useState({
        img: `${defaultOrigin}/uploads/img/project/`,
        vid: `${defaultOrigin}/uploads/vid/project/`,
        doc: `${defaultOrigin}/uploads/doc/project/`,
    });
    const [agencyImgBase, setAgencyImgBase] = useState(`${defaultOrigin}/uploads/img/agency/`);

    useEffect(() => {
        if (!projectId) {
            toast.error("Project not found", "Missing projectId in URL.");
            navigate("/developer/project-management?tab=unpublished");
            return;
        }
        let isMounted = true;
        setIsLoading(true);
        developerService
            .getProjectDetails(projectId)
            .then((response) => {
                if (!isMounted) return;
                setProject((response.project || null) as Record<string, unknown> | null);
                setUnitProperties(Array.isArray(response.unitProperties) ? response.unitProperties : []);
            })
            .catch((error: unknown) => {
                if (!isMounted) return;
                const message = (error as { message?: string })?.message || "Failed to load project details.";
                toast.error("Load failed", message);
            })
            .finally(() => {
                if (!isMounted) return;
                setIsLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, [projectId, navigate]);
    useEffect(() => {
        let isMounted = true;
        developerService
            .getSupportedUrlsMasterData()
            .then((data) => {
                if (!isMounted) return;
                const source =
                    (data.supportedUrls as Record<string, unknown>) ||
                    (data.supportedurls as Record<string, unknown>) ||
                    {};
                const projectUrl = (source.projectUrl as Record<string, unknown>) || {};
                const agencyUrl =
                    (source.agencyUrl as Record<string, unknown>) ||
                    (source.agencyurl as Record<string, unknown>) ||
                    {};
                setMediaBase((prev) => ({
                    img: String(projectUrl.img || prev.img).replace(/\/?$/, "/"),
                    vid: String(projectUrl.vid || prev.vid).replace(/\/?$/, "/"),
                    doc: String(projectUrl.doc || prev.doc).replace(/\/?$/, "/"),
                }));
                setAgencyImgBase((prev) => String(agencyUrl.img || prev).replace(/\/?$/, "/"));
            })
            .catch(() => undefined);
        return () => {
            isMounted = false;
        };
    }, []);

    const projectName = useMemo(() => String(project?.projectName || "-"), [project]);
    const projectType = useMemo(() => String(project?.projectType || "-"), [project]);
    const descriptionHtml = useMemo(() => String(project?.description || ""), [project]);
    const aboutProject = useMemo(() => String(project?.aboutProject || "-"), [project]);
    const location = (project?.location || {}) as Record<string, unknown>;
    const paymentPlans = Array.isArray(project?.paymentPlans) ? project?.paymentPlans : [];
    const toMediaUrl = (value: unknown, folder: "img" | "vid" | "doc") => {
        const raw = typeof value === "string" ? value : "";
        if (!raw) return null;
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        const filename = raw.includes("/") ? raw.split("/").pop() || raw : raw;
        const base = folder === "img" ? mediaBase.img : folder === "vid" ? mediaBase.vid : mediaBase.doc;
        return `${base}${filename}`;
    };
    const imageUrls = (Array.isArray(project?.images) ? project.images : [])
        .map((img) => (img && typeof img === "object" ? toMediaUrl((img as { url?: unknown }).url, "img") : null))
        .filter((url): url is string => Boolean(url));
    const brochureFilename = typeof project?.brochure === "string" ? project.brochure : null;
    const brochureUrl = toMediaUrl(project?.brochure, "doc");
    const masterPlanRaw = Array.isArray(project?.masterPlan) ? project.masterPlan[0] : null;
    const masterPlanUrl = toMediaUrl(masterPlanRaw, "img");
    const videoUrl = toMediaUrl(project?.videoTour, "vid");
    const amenities = (Array.isArray(project?.amenities) ? project.amenities : [])
        .map((a) => (a && typeof a === "object" ? String((a as { name?: unknown }).name || "") : ""))
        .filter(Boolean);
    const toAgencyPortraitUrl = (picture: unknown) => {
        const raw = typeof picture === "string" ? picture.trim() : "";
        if (!raw) return `${agencyImgBase}agency01.png`;
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        const filename = raw.includes("/") ? raw.split("/").pop() || raw : raw;
        return `${agencyImgBase}${filename}`;
    };
    const agencies = (Array.isArray(project?.authorizedAgencies) ? project.authorizedAgencies : [])
        .map((agency) => {
            if (typeof agency === "string" && agency.trim()) {
                const short = agency.length > 8 ? `…${agency.slice(-6)}` : agency;
                return {
                    id: agency,
                    name: `Authorized agency ${short}`,
                    img: `${agencyImgBase}agency01.png`,
                };
            }
            if (!agency || typeof agency !== "object") return null;
            const a = agency as {
                _id?: unknown;
                agencyName?: unknown;
                name?: unknown;
                profilePicture?: unknown;
                logo?: unknown;
            };
            const id = String(a._id || "");
            const name = String(a.agencyName || a.name || "Agency");
            const portrait = a.profilePicture ?? a.logo;
            return {
                id: id || name,
                name,
                img: toAgencyPortraitUrl(portrait),
            };
        })
        .filter((x): x is { id: string; name: string; img: string } => Boolean(x));
    const launchPrice = (project?.launchPrice || {}) as { startingFrom?: number; currency?: string };
    const mapCoords = readProjectLocationLatLng(location, project);
    const onSaveChanges = async () => {
        const deleteIds = Array.from(new Set(pendingFaqDeleteIds));
        if (!projectId) return;
        if (!deleteIds.length) {
            toast.success("Saved", "No pending FAQ deletions.");
            return;
        }
        setIsSavingChanges(true);
        try {
            await Promise.all(deleteIds.map((id) => developerService.deleteProjectFaq(projectId, id)));
            setProject((prev) => {
                if (!prev) return prev;
                const prevFaqs = Array.isArray(prev.faqs) ? prev.faqs : [];
                const nextFaqs = prevFaqs.filter((faq) => {
                    if (!faq || typeof faq !== "object") return true;
                    const id = String((faq as { _id?: unknown })._id || "");
                    return !deleteIds.includes(id);
                });
                return { ...prev, faqs: nextFaqs };
            });
            setPendingFaqDeleteIds([]);
            toast.success("Saved", "FAQ deletions saved successfully.");
        } catch (error: unknown) {
            toast.error(
                "Save failed",
                (error as { message?: string })?.message || "Failed to save FAQ deletions."
            );
        } finally {
            setIsSavingChanges(false);
        }
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <DeveloperHeader
                title="Project detail"
                showBack={true}
                onBackClick={() => navigate(-1)}
            />

            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}

            {!project && !isLoading ? (
                <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.08)] p-[20px] text-[14px] text-[#707070]">
                    Unable to load project details.
                </div>
            ) : (
                <>
                    <ProjectHeader projectName={projectName} projectId={projectId} />
                    <ProjectDescription
                        projectId={projectId}
                        descriptionHtml={descriptionHtml}
                        aboutProject={aboutProject}
                        projectType={projectType}
                        locationAddress={String(location.address || "-")}
                        initialProgressStatus={String(project?.progressStatus || "")}
                        initialAnnouncementDate={typeof project?.projectAnnouncement === "string" ? project.projectAnnouncement : null}
                        initialExpectedCompletionDate={typeof project?.expectedCompletionDate === "string" ? project.expectedCompletionDate : null}
                        initialBookingOpenDate={typeof project?.bookingOpen === "string" ? project.bookingOpen : null}
                        initialConstructionStartedDate={typeof project?.constructionStarted === "string" ? project.constructionStarted : null}
                        initialLaunchDate={typeof project?.launchDate === "string" ? project.launchDate : null}
                        initialDeliveryDate={typeof project?.deliveryDate === "string" ? project.deliveryDate : null}
                        initialConstructionProgress={typeof project?.constructionProgress === "number" ? project.constructionProgress : undefined}
                        initialCompletionStatus={typeof project?.completionStatus === "string" ? project.completionStatus : undefined}
                        initialMarkAsSoldOut={String(project?.publishStatus || "").toLowerCase() === "soldout"}
                        projectPrice={typeof launchPrice.startingFrom === "number"
                            ? `${launchPrice.startingFrom} ${launchPrice.currency || "AED"}`
                            : "-"}
                        governmentFees={typeof project?.governmentFees === "number" ? String(project.governmentFees) : "-"}
                        unitProperties={
                            unitProperties.length > 0
                                ? unitProperties
                                : Array.isArray(project?.unitProperties)
                                  ? (project.unitProperties as Array<Record<string, unknown>>)
                                  : undefined
                        }
                    />
                    <PayMap
                        paymentPlans={paymentPlans as Array<Record<string, unknown>>}
                        brochureName={brochureFilename}
                        brochureUrl={brochureUrl}
                        latitude={mapCoords?.lat ?? null}
                        longitude={mapCoords?.lng ?? null}
                    />
                    <CommonSection
                        agencies={agencies}
                        amenities={amenities}
                        imageUrls={imageUrls}
                        masterPlanUrl={masterPlanUrl}
                        videoUrl={videoUrl}
                        aboutProject={aboutProject}
                    />
                    <Frq
                        projectId={projectId}
                        onPendingDeleteIdsChange={setPendingFaqDeleteIds}
                        initialFaqs={
                            Array.isArray(project?.faqs)
                                ? (project.faqs as Array<{ question?: string; answer?: string; _id?: string }>)
                                : []
                        }
                    />
                    {/* <div className="flex items-center justify-between gap-[10px] mt-[30px]">
                        <div className="flex items-center justify-end gap-[10px]">
                            <button className="cursor-pointer h-[44px] rounded-[10px] px-[20px] border border-[#222]  text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px]">Discard</button>
                            <button
                                onClick={onSaveChanges}
                                disabled={isSavingChanges}
                                className="cursor-pointer h-[44px] rounded-[10px] px-[20px] bg-[#EA3934] text-[#FFF] text-[14px] font-[Bold] inline-flex items-center gap-[5px] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isSavingChanges ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                        <button className="cursor-pointer h-[44px] rounded-[10px] px-[20px] text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px]">
                            <TrashIcon width={20} height={20} /> Delete All
                        </button>
                    </div> */}
                </>
            )}
        </div>
    );
};

export default UnPublishedDetail;
