import { useEffect, useMemo, useState } from "react";
import { LeftArrowIcon, RightArrowIcon, ThreeSixtyIcon } from "../../../../components/CustomFile/icons";
import type { AgentPropertyDetail } from "../../../../services/agentService";
import ProjectLocationMap from "../../../../components/ProjectLocationMap/ProjectLocationMap";
import {
    resolvePropertyImageUrl,
    resolvePropertyVideoUrl,
} from "../../../../utils/agentPropertyListingMedia";

const GALLERY_PAGE_SIZE = 12;

export type ListingCommonProps = {
    property: AgentPropertyDetail | null;
    propertyImageBaseUrl: string | null;
    /** From master `supportedUrls.propertyUrl.vid` (e.g. CloudFront); falls back to API origin if omitted. */
    propertyVideoBaseUrl: string | null;
};

const ListingCommon = ({ property, propertyImageBaseUrl, propertyVideoBaseUrl }: ListingCommonProps) => {
    const [galleryPage, setGalleryPage] = useState(0);

    useEffect(() => {
        setGalleryPage(0);
    }, [property?._id]);

    const sortedGallery = useMemo(() => {
        const imgs = property?.images?.length ? [...property.images] : [];
        imgs.sort((a, b) => {
            if (a?.isPrimary && !b?.isPrimary) return -1;
            if (!a?.isPrimary && b?.isPrimary) return 1;
            return Number(a?.order ?? 999) - Number(b?.order ?? 999);
        });
        return imgs
            .map((img, idx) => {
                const url = resolvePropertyImageUrl(img?.url, propertyImageBaseUrl);
                if (!url) return null;
                return { key: `${img?._id ?? img?.url ?? idx}`, url };
            })
            .filter((x): x is { key: string; url: string } => Boolean(x));
    }, [property?.images, propertyImageBaseUrl]);

    const totalGalleryPages = Math.max(1, Math.ceil(sortedGallery.length / GALLERY_PAGE_SIZE) || 1);
    const visibleGallery = sortedGallery.slice(
        galleryPage * GALLERY_PAGE_SIZE,
        galleryPage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE
    );
    const canPrevGallery = galleryPage > 0;
    const canNextGallery = galleryPage < totalGalleryPages - 1;

    const videoSrc = useMemo(
        () => resolvePropertyVideoUrl(property?.videoTour, propertyVideoBaseUrl),
        [property?.videoTour, propertyVideoBaseUrl]
    );

    const amenityLabels = (property?.amenities ?? [])
        .map((a) => a?.name?.trim())
        .filter((x): x is string => Boolean(x));

    const tour360 = property?.virtualTour360?.trim();
    const tour360IsUrl = tour360 ? /^https?:\/\//i.test(tour360) : false;

    return (
        <>
            <div className="flex flex-col gap-5 sm:gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
                    <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
                        <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px] leading-[100%]">Video</h2>
                        {videoSrc ? (
                            <div className="relative overflow-hidden rounded-[12px] bg-[#222]">
                                <video
                                    key={videoSrc}
                                    src={videoSrc}
                                    className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-cover"
                                    controls
                                    playsInline
                                    preload="metadata"
                                />
                            </div>
                        ) : (
                            <p className="text-[14px] text-[#707070]">No video uploaded for this listing.</p>
                        )}
                    </section>

                    <ProjectLocationMap
                        project={property as unknown as Record<string, unknown> | null}
                        title="Map location"
                        mapMinHeight="min-h-[220px] sm:min-h-[260px] lg:min-h-[280px]"
                    />
                </div>
            </div>

            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col gap-8 sm:gap-10 min-w-0">
                <section>
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px] leading-[100%]">Amenities</h2>
                    {amenityLabels.length ? (
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            {amenityLabels.map((label) => (
                                <span
                                    key={label}
                                    className="inline-flex items-center rounded-full border border-[rgba(34,34,34,0.12)] bg-white px-4 py-2 text-[12px] md:text-[14px] font-[Regular] text-[#222]"
                                >
                                    {label}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[14px] text-[#707070]">No amenities listed.</p>
                    )}
                </section>
            </div>

            {tour360 ? (
                <div className="flex flex-wrap items-center md:justify-between gap-[10px] bg-[#000000] rounded-[15px] md:p-[20px_30px] p-[20px]">
                    <div className="flex items-center gap-2 min-w-0">
                        <ThreeSixtyIcon />
                        <h2 className="text-[18px] sm:text-[22px] md:text-[25px] font-[Bold] text-[#fff] leading-tight">
                            360° tour available
                        </h2>
                    </div>
                    {tour360IsUrl ? (
                        <a
                            href={tour360}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex justify-center items-center h-[44px] px-[20px] rounded-[10px] bg-[#fff] text-[#222] text-[14px] font-[Bold] shrink-0"
                        >
                            Check it
                        </a>
                    ) : (
                        <span className="text-[13px] text-[#ccc]">Tour reference: {tour360}</span>
                    )}
                </div>
            ) : null}

            <div className="rounded-[15px] bg-white  min-w-0">
                <div className="flex items-center justify-between gap-4 md:p-[20px_30px] p-[20px]">
                    <h2 className="text-[20px] font-[Bold] text-[#222] ">Images</h2>
                    {sortedGallery.length > GALLERY_PAGE_SIZE ? (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                aria-label="Previous images"
                                disabled={!canPrevGallery}
                                onClick={() => setGalleryPage((p) => Math.max(0, p - 1))}
                                className="rotate-180 cursor-pointer flex h-9 w-9 items-center justify-center text-[#222] transition-opacity hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
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
                    ) : null}
                </div>
                {visibleGallery.length ? (
                    <div className="grid grid-cols-2 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-[3px] sm:gap-1 p-[0px_4px_4px_4px]">
                        {visibleGallery.map((item, index) => {
                            const columns =
                                window.innerWidth >= 1024
                                    ? 6
                                    : window.innerWidth >= 768
                                        ? 5
                                        : window.innerWidth >= 640
                                            ? 4
                                            : window.innerWidth >= 400
                                                ? 3
                                                : 2;

                            const isSecondRowFirstImage = index === columns;
                            const isSecondRowLastImage = index === (columns * 2) - 1;
                            return (
                                <div
                                    key={item.key}
                                    className={`relative aspect-square overflow-hidden rounded-[4px] bg-[#F0F0F0] ${isSecondRowFirstImage || isSecondRowLastImage ? 'rounded-[15px]' : ''}`}
                                >
                                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-[14px] text-[#707070] py-6">No images uploaded for this listing.</p>
                )}
            </div>
        </>
    );
};

export default ListingCommon;
