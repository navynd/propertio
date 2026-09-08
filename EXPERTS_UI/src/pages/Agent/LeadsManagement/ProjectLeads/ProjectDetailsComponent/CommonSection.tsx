import { useRef, useState } from "react";
import home1img from "../../../../../assets/img/home1.png";
import home4img from "../../../../../assets/img/home4.png";
import { DownArrowIcon, LeftArrowIcon, PlayIcon, RightArrowIcon, ThreeSixtyIcon } from "../../../../../components/CustomFile/icons";
import type { AgentAllocatedProjectDetail } from "../../../../../services/agentService";


const GALLERY_PAGE_SIZE = 12;

type Agency = {
    name: string;
    img: string;
};

type CommonSectionProps = {
    project: AgentAllocatedProjectDetail | null;
    imageBaseUrl: string;
    videoBaseUrl: string;
    agencyImageBaseUrl: string;
};

const toAssetUrl = (value?: string, base?: string) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    const filename = value.includes("/") ? value.split("/").pop() || value : value;
    return base ? `${base.replace(/\/?$/, "/")}${filename}` : filename;
};

/** API may return a filename string or `{ url }` per entry. */
const resolveMediaRef = (entry: unknown): string | undefined => {
    if (typeof entry === "string" && entry.trim()) return entry.trim();
    if (entry && typeof entry === "object") {
        const url = (entry as { url?: unknown }).url;
        if (typeof url === "string" && url.trim()) return url.trim();
    }
    return undefined;
};

const CommonSection = ({ project, imageBaseUrl, videoBaseUrl, agencyImageBaseUrl }: CommonSectionProps) => {
    const [galleryPage, setGalleryPage] = useState(0);
    const [openFaqId, setOpenFaqId] = useState<number | null>(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const galleryImagess = (project?.images || []).map((item, idx) => ({
        id: Number(item._id || idx + 1),
        img: toAssetUrl(item.url, imageBaseUrl),
    }));
    const agencies: Agency[] = (project?.authorizedAgencies || []).map((agency) => ({
        name: agency.agencyName || "-",
        img: toAssetUrl(agency.profilePicture, agencyImageBaseUrl),
    }));
    const faqItems = (project?.faqs || []).map((faq, idx) => ({
        id: idx,
        question: faq.question || "-",
        answer: faq.answer || "-",
    }));
    const amenities = (project?.amenities || []).map((item) => item.name || "-");
    const masterPlanImage = toAssetUrl(
        resolveMediaRef(Array.isArray(project?.masterPlan) ? project.masterPlan[0] : undefined),
        imageBaseUrl
    );
    const videoPoster = toAssetUrl(project?.images?.[0]?.url, imageBaseUrl);
    const videoUrl = toAssetUrl(project?.videoTour || "", videoBaseUrl);
    const virtualTour360Url = (project?.virtualTour360 || "").trim();
    const totalGalleryPages = Math.max(1, Math.ceil(galleryImagess.length / GALLERY_PAGE_SIZE));
    const visibleGallery = galleryImagess.slice(
        galleryPage * GALLERY_PAGE_SIZE,
        galleryPage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE
    );
    const canPrevGallery = galleryPage > 0;
    const canNextGallery = galleryPage < totalGalleryPages - 1;

    return (
        <>
            {/* Authorized agencies */}
            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col gap-8 sm:gap-10 min-w-0">
                <section>
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Authorized agencies</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {agencies.map((agency) => (
                            <div
                                key={agency.name}
                                className="flex items-center gap-3 rounded-[10px] bg-[#F5F5F5] h-[90px] p-[6px_10px_6px_4px]"
                            >
                                <img
                                    src={agency.img}
                                    alt=""
                                    className="h-[85px] w-[85px] shrink-0 rounded-[10px] object-cover"
                                />
                                <span className="text-[15px] font-[Bold] text-[#222] leading-[165%]">{agency.name}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            {/* Amenities */}
            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col gap-8 sm:gap-10 min-w-0">
                <section>
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Amenities</h2>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {amenities.map((label) => (
                            <span
                                key={label}
                                className="inline-flex items-center rounded-full border border-[rgba(34,34,34,0.12)] bg-white px-4 py-2 text-[12px] sm:text-[13px] font-[Regular] text-[#707070]"
                            >
                                {label}
                            </span>
                        ))}
                    </div>
                </section>
            </div>
            {/* 360 video tour available */}
            {virtualTour360Url && (
                <div className="flex flex-wrap items-center md:justify-between gap-[10px] bg-[#000000] rounded-[15px] md:p-[20px_30px] p-[10px]">
                    <div className="flex items-center gap-2">
                        <ThreeSixtyIcon />
                        <h2 className="text-[25px] font-[Bold] text-[#fff]">360 video tour available</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => window.open(virtualTour360Url, "_blank", "noopener,noreferrer")}
                        className="flex justify-center items-center h-[44px] px-[20px] rounded-[10px] bg-[#fff] text-[#222] text-[14px] font-[Bold]"
                    >
                        Check it
                    </button>
                </div>
            )}
            {/* Images */}
            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
                <div className="flex items-center justify-between gap-4 mb-4 sm:mb-5">
                    <h2 className="text-[20px] font-[Bold] text-[#222]">Images</h2>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            aria-label="Previous images"
                            disabled={!canPrevGallery}
                            onClick={() => setGalleryPage((p) => Math.max(0, p - 1))}
                            className="rotate-180 cursor-pointer flex h-9 w-9 items-center justify-center  text-[#222] transition-opacity hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                            <LeftArrowIcon width={8} height={14} fill="#222222" />
                        </button>
                        <button
                            type="button"
                            aria-label="Next images"
                            disabled={!canNextGallery}
                            onClick={() => setGalleryPage((p) => Math.min(totalGalleryPages - 1, p + 1))}
                            className="cursor-pointer flex h-9 w-9 items-center justify-center bg-white text-[#222] transition-opacity hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
                        >
                            <RightArrowIcon width={8} height={14} fill="#222222" />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-[3px] sm:gap-1">
                    {visibleGallery.map((item) => (
                        <div
                            key={item.id}
                            className="relative aspect-square overflow-hidden rounded-[4px] bg-[#F0F0F0]"
                        >
                            <img src={item.img} alt="" className="h-full w-full object-cover" />
                        </div>
                    ))}
                </div>
            </div>
            {/* Masterplan */}
            <div className="flex flex-col gap-5 sm:gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
                    <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
                        <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Masterplan</h2>
                        <div className="overflow-hidden rounded-[12px] bg-[#F0F0F0]">
                            {masterPlanImage ? (
                                <img
                                    src={masterPlanImage}
                                    alt=""
                                    onClick={() => window.open(masterPlanImage, "_blank", "noopener,noreferrer")}
                                    role="button"
                                    tabIndex={0}
                                    className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-cover cursor-pointer"
                                />
                            ) : (
                                <div className="w-full h-[220px] sm:h-[260px] lg:h-[280px] flex items-center justify-center text-[13px] text-[#707070]">
                                    Master plan not available
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
                        <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Video</h2>
                        <div className="relative overflow-hidden rounded-[12px] bg-[#F0F0F0]">
                            {videoUrl ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        src={videoUrl}
                                        className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-cover"
                                        controls
                                        poster={videoPoster || undefined}
                                        onPlay={() => setIsVideoPlaying(true)}
                                        onPause={() => setIsVideoPlaying(false)}
                                        onEnded={() => setIsVideoPlaying(false)}
                                    />
                                    {!isVideoPlaying && (
                                        <button
                                            type="button"
                                            aria-label="Play video"
                                            onClick={() => {
                                                if (!videoRef.current) return;
                                                void videoRef.current.play();
                                            }}
                                            className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors"
                                        >
                                            <span className="flex h-[56px] w-[56px] sm:h-[60px] sm:w-[60px] items-center justify-center rounded-full cursor-pointer">
                                                <PlayIcon />
                                            </span>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="w-full h-[220px] sm:h-[260px] lg:h-[280px] flex items-center justify-center text-[13px] text-[#707070]">
                                    Video not available
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
            {/* About the project */}
            <div className="rounded-[15px] bg-white p-5 md:p-[30px] p-[20px] min-w-0">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">About the project</h2>
                <div className="flex flex-col gap-4 text-[14px] font-[Regular] text-[#222] leading-[165%]">
                    <p>
                        {project?.aboutProject || "--/--"}
                    </p>
                </div>
            </div>
            {/* Frequently asked questions */}
            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Frequently asked questions</h2>
                {faqItems.length === 0 ? (
                    <p className="text-[14px] font-[Regular] text-[#707070]">No FAQ available</p>
                ) : (
                    <div className="flex flex-col gap-[10px]">
                        {faqItems.map((item) => {
                            const isOpen = openFaqId === item.id;
                            return (
                                <div key={item.id} className="min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaqId((prev) => (prev === item.id ? null : item.id))}
                                        className={`flex w-full items-center justify-between gap-3 bg-[#F5F5F5] px-4 py-[14px] text-left transition-colors ${isOpen ? "rounded-t-[10px]" : "rounded-[10px]"}`}
                                    >
                                        <span className="text-[15px] font-[Bold] text-[#222] leading-[150%] pr-2">{item.question}</span>
                                        <span className={`shrink-0 text-[#222] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                                            <DownArrowIcon width={12} height={7} />
                                        </span>
                                    </button>
                                    {isOpen && (
                                        <div className="rounded-b-[10px] border border-[rgba(34,34,34,0.10)] border-t-0 bg-white px-4 py-4 text-[14px] font-[Regular] text-[#222] leading-[165%]">
                                            {item.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </>
    );
};

export default CommonSection;
