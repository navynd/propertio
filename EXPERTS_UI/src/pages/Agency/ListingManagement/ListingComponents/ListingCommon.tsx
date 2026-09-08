import { useState, useEffect, useRef } from "react";
import { LeftArrowIcon, MarkerIcon, PlayIcon, RightArrowIcon, ThreeSixtyIcon } from "../../../../components/CustomFile/icons";
import videoPlay from "../../../../assets/img/video.webm";
import mainbg from "../../../../assets/img/mainbg.png";
import {
    agencyService,
} from "../../../../services/agencyService";
import { API_BASE_URL } from "../../../../services/apiClient";

const GALLERY_PAGE_SIZE = 12;

type Agency = {
    name: string;
    img: string;
};
type ListingCommonProps = {
    listing: any;
};

const ListingCommon = ({ listing }: ListingCommonProps) => {
    const [galleryPage, setGalleryPage] = useState(0);
    const galleryImagess =
        listing?.images?.map((img: any, index: number) => ({
            id: index + 1,
            img: img?.url,
        })) || [];
    const [baseUrls, setBaseUrls] = useState({
        agent: "",
        property: "",
        propertyVideo: "",
    });


    const amenities = listing?.amenities || [];
    const totalGalleryPages = Math.max(1, Math.ceil(galleryImagess.length / GALLERY_PAGE_SIZE));
    const visibleGallery = galleryImagess.slice(
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
    /** OSM embed around Downtown Dubai — no API key required */
    const latitude = listing?.location?.coordinates?.coordinates?.[1];
    const longitude = listing?.location?.coordinates?.coordinates?.[0];

    // const MAP_EMBED_SRC =
    //     latitude && longitude
    //         ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`
    //         : "";

            const MAP_EMBED_SRC =
        "https://www.openstreetmap.org/export/embed.html?bbox=55.265%2C25.190%2C55.285%2C25.210&layer=mapnik";


    useEffect(() => {
        let isMounted = true;

        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");

        const fallbackImage = `${fallbackOrigin}/uploads/img/property/`;
        const fallbackVideo = `${fallbackOrigin}/uploads/video/property/`;

        agencyService
            .getMasterData(["supportedurls"])
            .then((data) => {
                if (!isMounted) return;

                const supported = data?.supportedUrls;

                setBaseUrls({
                    agent: supported?.agentUrl?.img?.trim() || fallbackImage,
                    property: supported?.propertyUrl?.img?.trim() || fallbackImage,
                    propertyVideo:
                        supported?.propertyUrl?.vid?.trim() || fallbackVideo,
                });
            })
            .catch(() => {
                if (!isMounted) return;

                setBaseUrls({
                    agent: fallbackImage,
                    property: fallbackImage,
                    propertyVideo: fallbackVideo,
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
            (type === "agent" ? baseUrls.agent : baseUrls.property) ||
            fallbackBase;

        const cleanBase = base.replace(/\/+$/, "");
        const cleanImage = image.replace(/^\/+/, "");

        return `${cleanBase}/${cleanImage}`;
    };

    const toVideoUrl = (video: string | null) => {
        if (!video) return "";

        if (video.startsWith("http")) return video;

        const cleanBase = baseUrls.propertyVideo.replace(/\/+$/, "");
        const cleanVideo = video.replace(/^\/+/, "");

        return `${cleanBase}/${cleanVideo}`;
    };
    const videoUrl = toVideoUrl(listing?.videoTour);
    const hasVideo = Boolean(videoUrl);
    const has360 = Boolean(String(listing?.virtualTour360 ?? "").trim());
    return (
        <>

            <div className="flex flex-col gap-5 sm:gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
                    {/* Videosection */}
                    <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
                        <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px] leading-[100%]">Video</h2>
                        {hasVideo ? (
                            <div className="relative overflow-hidden rounded-[12px] bg-[#222]">
                                <video
                                    ref={videoRef}
                                    src={videoUrl}
                                    className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-cover cursor-pointer"
                                    muted
                                    loop
                                    onClick={handlePause}
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
                        ) : (
                            <div className="h-[220px] sm:h-[260px] lg:h-[280px] rounded-[12px] bg-[#F5F5F5] border border-[rgba(34,34,34,0.08)] flex items-center justify-center px-4">
                                <p className="text-[14px] font-[Regular] text-[#707070] text-center">
                                    Video not available
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Map location */}
                    <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
                        <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px] leading-[100%]">Map location</h2>
                        <div className="relative overflow-hidden rounded-[12px] bg-[#F0F0F0]">
                            <iframe
                                title="Map"
                                src={MAP_EMBED_SRC}
                                className="w-full h-[220px] sm:h-[260px] lg:h-[280px] border-0"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[100%]">
                                <MarkerIcon width={36} height={36} />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            {/* Amenities */}
            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col gap-8 sm:gap-10 min-w-0">
                <section>
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Amenities</h2>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {amenities.map((item: any) => (
                            <span
                                key={item._id}
                                className="inline-flex items-center rounded-full border border-[rgba(34,34,34,0.12)] bg-white px-4 py-2 text-[12px] sm:text-[14px] font-[Regular] text-[#222]"
                            >
                                {item.name}
                            </span>
                        ))}
                    </div>
                </section>
            </div>
            {has360 && (
                <div className="flex flex-wrap items-center md:justify-between gap-[10px] bg-[#000000] rounded-[15px] md:p-[20px_30px] p-[20px]">
                    <div className="flex items-center gap-2">
                        <ThreeSixtyIcon />
                        <h2 className="text-[25px] font-[Bold] text-[#fff]">360 video tour available</h2>
                    </div>
                    <button onClick={() => window.open(listing?.virtualTour360, "_blank")} className="flex justify-center items-center h-[44px] px-[20px] rounded-[10px] bg-[#fff] text-[#222] text-[14px] font-[Bold]">Check it</button>
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
                    {visibleGallery.map((item: any) => (
                        <div
                            key={item.id}
                            className="relative aspect-square overflow-hidden rounded-[4px] bg-[#F0F0F0]"
                        >
                            <img src={toImageUrl(item.img, "property")} alt="" className="h-full w-full object-cover" />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default ListingCommon;
