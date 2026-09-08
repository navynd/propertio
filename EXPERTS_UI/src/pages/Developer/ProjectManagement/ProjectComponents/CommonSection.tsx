import { useMemo, useState } from "react";
import { LeftArrowIcon, RightArrowIcon, ThreeSixtyIcon } from "../../../../components/CustomFile/icons";


const GALLERY_PAGE_SIZE = 12;

type Agency = {
    id?: string;
    name: string;
    img: string;
};
type CommonSectionProps = {
    agencies?: Agency[];
    amenities?: string[];
    imageUrls?: string[];
    masterPlanUrl?: string | null;
    videoUrl?: string | null;
    aboutProject?: string;
};

const CommonSection = ({
    agencies: agenciesProp,
    amenities: amenitiesProp,
    imageUrls,
    masterPlanUrl,
    videoUrl,
    aboutProject,
}: CommonSectionProps) => {
    const [galleryPage, setGalleryPage] = useState(0);
    const renderAgencies = agenciesProp || [];
    const renderAmenities = amenitiesProp || [];
    const renderImages = useMemo(
        () =>
            imageUrls && imageUrls.length
                ? imageUrls.map((img, idx) => ({ id: idx + 1, img }))
                : [],
        [imageUrls]
    );
    const totalGalleryPages = Math.max(1, Math.ceil(renderImages.length / GALLERY_PAGE_SIZE));
    const visibleGallery = renderImages.slice(
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
                        {renderAgencies.length ? renderAgencies.map((agency) => (
                            <div
                                key={agency.id || agency.name}
                                className="flex items-center gap-3 rounded-[10px] bg-[#F5F5F5] h-[83px] p-[6px_10px_6px_4px]"
                            >
                                <img
                                    src={agency.img}
                                    alt=""
                                    className="h-[76px] w-[76px] shrink-0 rounded-[10px] object-cover"
                                />
                                <span className="text-[15px] font-[Bold] text-[#222] leading-[165%]">{agency.name}</span>
                            </div>
                        )) : (
                            <p className="text-[13px] text-[#707070]">Authorized agency not available</p>
                        )}
                    </div>
                </section>
            </div>
            {/* Amenities */}
            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col gap-8 sm:gap-10 min-w-0">
                <section>
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Amenities</h2>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                        {renderAmenities.length ? renderAmenities.map((label) => (
                            <span
                                key={label}
                                className="inline-flex items-center rounded-full border border-[rgba(34,34,34,0.12)] bg-white px-4 py-2 text-[12px] sm:text-[13px] font-[Regular] text-[#707070]"
                            >
                                {label}
                            </span>
                        )) : (
                            <p className="text-[13px] text-[#707070]">Amenities not available</p>
                        )}
                    </div>
                </section>
            </div>
            {/* 360 video tour available */}
            <div className="flex flex-wrap items-center md:justify-between gap-[10px] bg-[#000000] rounded-[15px] md:p-[15px_30px] p-[10px]">
                <div className="flex items-center gap-2">
                    <ThreeSixtyIcon />
                    <h2 className="text-[25px] font-[Bold] text-[#fff]">360 video tour available</h2>
                </div>
                <button className="flex justify-center items-center h-[44px] px-[20px] rounded-[10px] bg-[#fff] text-[#222] text-[14px] font-[Bold]">Check it</button>
            </div>
            {/* Images */}
            <div className="rounded-[15px] bg-white  min-w-0">
                <div className="md:p-[20px_30px_20px_30px] p-[20px] flex items-center justify-between gap-4">
                    <h2 className=" text-[20px] font-[Bold] text-[#222]">Images</h2>
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
                    {visibleGallery.length ? visibleGallery.map((item) => (
                        <div
                            key={item.id}
                            className="relative aspect-square overflow-hidden rounded-[4px] bg-[#F0F0F0]"
                        >
                            <img src={item.img} alt="" className="h-full w-full object-cover" />
                        </div>
                    )) : (
                        <p className="text-[13px] text-[#707070] col-span-full">Images not available</p>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-5 sm:gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
                    <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
                        <h2 className="text-[20px] font-[SemiBold] text-[#222] mb-[20px] leading-[100%]">Masterplan</h2>
                        <div className="overflow-hidden rounded-[12px] bg-[#F0F0F0]">
                            {masterPlanUrl ? (
                                <img src={masterPlanUrl} alt="" className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-cover" />
                            ) : (
                                <div className="w-full h-[220px] sm:h-[260px] lg:h-[280px] flex items-center justify-center text-[13px] text-[#707070]">Master plan not available</div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
                        <h2 className="text-[20px] font-[SemiBold] text-[#222] mb-[20px] leading-[100%]">Video</h2>
                        <div className="relative overflow-hidden rounded-[12px] bg-[#F0F0F0]">
                            {videoUrl ? (
                                <video
                                    src={videoUrl}
                                    className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-contain bg-black"
                                    controls
                                    playsInline
                                    preload="metadata"
                                />
                            ) : (
                                <div className="w-full h-[220px] sm:h-[260px] lg:h-[280px] flex items-center justify-center text-[13px] text-[#707070]">Video not available</div>
                            )}
                        </div>
                    </section>
                </div>

                <section className="rounded-[15px] bg-white p-5 md:p-[30px] p-[20px] min-w-0">
                    <h2 className="text-[20px] font-[SemiBold] text-[#222] mb-[20px]">About the project</h2>
                    <div className="flex flex-col gap-4 text-[14px] font-[Regular] text-[#222] leading-[165%]">
                        <p>{aboutProject || "No about project content available."}</p>
                    </div>
                </section>
            </div>
        </>
    );
};

export default CommonSection;
