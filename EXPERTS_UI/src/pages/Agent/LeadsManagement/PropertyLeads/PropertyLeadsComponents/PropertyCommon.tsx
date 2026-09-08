import { useState, useRef } from "react";
import videoPlay from "../../../../../assets/img/video.webm";
import home1img from "../../../../../assets/img/home1.png";
import home2img from "../../../../../assets/img/home2.png";
import home3img from "../../../../../assets/img/home3.png";
import home4img from "../../../../../assets/img/home4.png";
import home5img from "../../../../../assets/img/home5.png";
import home6img from "../../../../../assets/img/home6.png";
import { LeftArrowIcon, MarkerIcon, PlayIcon, RightArrowIcon, ThreeSixtyIcon } from "../../../../../components/CustomFile/icons";
import type { AgentInquiryDetailResponse } from "../../../../../services/agentService";


const GALLERY_PAGE_SIZE = 12;

const galleryImagess = [
    { id: 1, img: home1img },
    { id: 2, img: home2img },
    { id: 3, img: home3img },
    { id: 4, img: home4img },
    { id: 5, img: home5img },
    { id: 6, img: home6img },
    { id: 7, img: home6img },
    { id: 8, img: home4img },
    { id: 9, img: home2img },
    { id: 10, img: home1img },
    { id: 11, img: home3img },
    { id: 12, img: home5img },
    { id: 13, img: home1img },
    { id: 14, img: home6img },
    { id: 15, img: home5img },
    { id: 16, img: home4img },
    { id: 17, img: home3img },
    { id: 18, img: home2img },
    { id: 19, img: home1img },
    { id: 20, img: home6img },
    { id: 21, img: home5img },
    { id: 22, img: home4img },
    { id: 23, img: home3img },
    { id: 24, img: home2img },
    { id: 25, img: home1img },
    { id: 26, img: home6img },
    { id: 27, img: home5img },
    { id: 28, img: home4img },
    { id: 29, img: home3img },
    { id: 30, img: home2img },
    { id: 31, img: home1img },
    { id: 32, img: home6img },
    { id: 33, img: home5img },
    { id: 34, img: home4img },
    { id: 35, img: home3img },
    { id: 36, img: home2img },
    { id: 37, img: home1img },
    { id: 38, img: home6img },
];

const amenities = [
    "Balcony",
    "Central A/C",
    "Maids Room",
    "Pets Allowed",
    "View of Water",
    "Built in Wardrobes",
    "Kitchen Appliances",
    "Mezzanine",
    "Networked",
    "Private gym",
    "Private Jacuzzi",
];

type Props = {
    data: AgentInquiryDetailResponse | null;
    imageBaseUrl?: string;
    videoBaseUrl?: string;
};

const toMediaUrl = (value?: string | null, base?: string) => {
    if (!value) return "";
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return base ? `${base.replace(/\/?$/, "/")}${value}` : value;
};

const PropertyCommon = ({ data, imageBaseUrl, videoBaseUrl }: Props) => {
    const [galleryPage, setGalleryPage] = useState(0);
    const property = data?.property;
    const dynamicImages = (property?.images || []).map((img, index) => ({
        id: Number(img.order ?? index + 1),
        img: toMediaUrl(img.url, imageBaseUrl) || home1img,
    }));
    const renderGallery = dynamicImages.length ? dynamicImages : galleryImagess;
    const amenities = (property?.amenities || []).map((a) => a.name || "-");
    const videoUrl = toMediaUrl(property?.videoTour || "", videoBaseUrl) || videoPlay;

    const totalGalleryPages = Math.max(1, Math.ceil(renderGallery.length / GALLERY_PAGE_SIZE));
    const visibleGallery = renderGallery.slice(
        galleryPage * GALLERY_PAGE_SIZE,
        galleryPage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE
    );
    const canPrevGallery = galleryPage > 0;
    const canNextGallery = galleryPage < totalGalleryPages - 1;

    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlay = () => {
        if (!videoRef.current) return;
        (videoRef.current as HTMLVideoElement).play();
        setIsPlaying(true);
    };

    const handlePause = () => {
        if (!videoRef.current) return;
        (videoRef.current as HTMLVideoElement).pause();
        setIsPlaying(false);
    };

    return (
        <>
            {/* Map location and video */}
            <div className="flex flex-col gap-5 sm:gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
                    {/* Video */}
                    <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
                        <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Video</h2>
                        <div className="relative overflow-hidden rounded-[12px] bg-[#222]">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-cover cursor-pointer"
                                muted
                                loop
                                onClick={handlePause} // 👈 click video → pause
                            />

                            {!isPlaying && (
                                <button
                                    onClick={handlePlay}
                                    className="absolute inset-0 flex items-center justify-center bg-black/20"
                                >
                                    <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full">
                                        <PlayIcon />
                                    </span>
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Amenities */}
                    <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
                        <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Amenities</h2>
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {amenities.length ? amenities.map((label) => (
                                <span
                                    key={label}
                                    className="inline-flex items-center rounded-full border border-[rgba(34,34,34,0.12)] bg-white px-4 py-2 text-[12px] ms:text-[14px] font-[Regular] text-[#222]"
                                >
                                    {label}
                                </span>
                            )) : <span className="text-[13px] font-[SemiBold] text-[#707070]">No amenities</span>}
                        </div>
                    </section>
                </div>
            </div>

            {/* 360 video tour */}
            {!!property?.virtualTour360 && (
                <div className="flex flex-wrap items-center md:justify-between gap-[10px] bg-[#000000] rounded-[15px] md:p-[20px_30px] p-[20px]">
                    <div className="flex items-center gap-2">
                        <ThreeSixtyIcon />
                        <h2 className="text-[25px] font-[Bold] text-[#fff]">360 video tour available</h2>
                    </div>
                    <button
                        className="flex justify-center items-center h-[44px] px-[20px] rounded-[10px] bg-[#fff] text-[#222] text-[14px] font-[Bold]"
                        onClick={() => window.open(property.virtualTour360 || "", "_blank", "noopener,noreferrer")}
                    >
                        Check it
                    </button>
                </div>
            )}
            {/* Images */}
            <div className="rounded-[15px] bg-white  min-w-0">
                <div className="flex items-center justify-between gap-4 md:p-[20px_30px] p-[20px]">
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
        </>
    );
};

export default PropertyCommon;
