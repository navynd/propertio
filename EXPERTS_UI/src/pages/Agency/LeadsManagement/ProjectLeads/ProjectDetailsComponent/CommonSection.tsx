import companyimg from "../../../../../assets/img/company_logos/C10.jpg";
import companyimg2 from "../../../../../assets/img/company_logos/C11.jpg";
import companyimg3 from "../../../../../assets/img/company_logos/C12.jpg";
import companyimg4 from "../../../../../assets/img/company_logos/C13.jpg";
import companyimg5 from "../../../../../assets/img/company_logos/C14.jpg";
import companyimg6 from "../../../../../assets/img/company_logos/C15.jpg";

import { useState, useEffect } from "react";
import RichTextContent from "../../../../../components/RichTextContent/RichTextContent";
import home1img from "../../../../../assets/img/home1.png";
import home2img from "../../../../../assets/img/home2.png";
import home3img from "../../../../../assets/img/home3.png";
import home4img from "../../../../../assets/img/home4.png";
import home5img from "../../../../../assets/img/home5.png";
import home6img from "../../../../../assets/img/home6.png";
import {
  DownArrowIcon,
  LeftArrowIcon,
  PlayIcon,
  RightArrowIcon,
  ThreeSixtyIcon,
} from "../../../../../components/CustomFile/icons";

import mainbg from "../../../../../assets/img/mainbg.png";
import {
  agencyService,
  type SortByProjectMasterItem,
} from "../../../../../services/agencyService";
import { toast } from "../../../../../services/toast";
import { API_BASE_URL } from "../../../../../services/apiClient";
import Loader from "../../../../../components/Loader/loader";
import { resolveMediaRef } from "../../../../../utils/projectMediaUtils";

const GALLERY_PAGE_SIZE = 12;

type Agency = {
  name: string;
  img: string;
};

const CommonSection = ({ leads }: { leads: any }) => {
  console.log("lead detail", JSON.stringify(leads));
  const [galleryPage, setGalleryPage] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<number | null>(0);
  const galleryImagess = leads?.project?.images || [];
  const totalGalleryPages = Math.max(
    1,
    Math.ceil(galleryImagess.length / GALLERY_PAGE_SIZE),
  );
  const visibleGallery = galleryImagess.slice(
    galleryPage * GALLERY_PAGE_SIZE,
    galleryPage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE,
  );
  const canPrevGallery = galleryPage > 0;
  const canNextGallery = galleryPage < totalGalleryPages - 1;
  const [isPlaying, setIsPlaying] = useState(false);
  const [baseUrls, setBaseUrls] = useState({
    agency: "",
    project: "",
    projectVideo: "",
  });
  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/project/`;

    agencyService
      .getMasterData(["supportedurls"])
      .then((data) => {
        if (!isMounted) return;

        const supported = data?.supportedUrls;

        setBaseUrls({
          agency: supported?.agencyUrl?.img?.trim() || fallback,
          project: supported?.projectUrl?.img?.trim() || fallback,
          projectVideo:
            supported?.projectUrl?.vid?.trim() ||
            `${fallbackOrigin}/uploads/video/project/`,
        });
      })
      .catch(() => {
        if (!isMounted) return;

        setBaseUrls({
          agency: fallback,
          project: fallback,
          projectVideo: `${fallbackOrigin}/uploads/video/project/`,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const toImageUrl = (image: string | null, type: "agency" | "project") => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;

    const base =
      (type === "agency" ? baseUrls.agency : baseUrls.project) || fallbackBase;

    const cleanBase = base.replace(/\/+$/, "");
    const cleanImage = image.replace(/^\/+/, "");

    return `${cleanBase}/${cleanImage}`;
  };

  const toVideoUrl = (video: string | null) => {
    if (!video) return "";

    if (video.startsWith("http")) return video;

    const cleanBase = baseUrls.projectVideo.replace(/\/+$/, "");
    const cleanVideo = video.replace(/^\/+/, "");

    return `${cleanBase}/${cleanVideo}`;
  };

  const masterPlanImage = resolveMediaRef(
    Array.isArray(leads?.project?.masterPlan) ? leads.project.masterPlan[0] : undefined,
  );

  const mediaEmptyStateClass =
    "flex h-[220px] sm:h-[260px] lg:h-[280px] w-full shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-dashed border-[rgba(34,34,34,0.12)] bg-[#FAFAFA] px-4 text-center text-[14px] font-[Regular] text-[#707070]";

  return (
    <>
      {/* Authorized agencies */}
      <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col gap-8 sm:gap-10 min-w-0">
        <section>
          <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">
            Authorized agencies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {leads?.project?.authorizedAgencies?.map((agency: any) => (
              <div
                key={agency.agencyName}
                className="flex items-center gap-3 rounded-[10px] bg-[#F5F5F5] h-[90px] p-[6px_10px_6px_4px]"
              >
                <img
                  src={toImageUrl(agency.logo, "agency")}
                  alt=""
                  className="h-[85px] w-[85px] shrink-0 rounded-[10px] object-cover"
                />
                <span className="text-[15px] font-[Bold] text-[#222] leading-[165%]">
                  {agency.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
      {/* Amenities */}
      <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col gap-8 sm:gap-10 min-w-0">
        <section>
          <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">
            Amenities
          </h2>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {leads?.project?.amenities?.map((item: any) => (
              <span
                key={item._id}
                className="inline-flex items-center rounded-full border border-[rgba(34,34,34,0.12)] bg-white px-4 py-2 text-[12px] sm:text-[13px] font-[Regular] text-[#707070]"
              >
                {item.name}
              </span>
            ))}
          </div>
        </section>
      </div>
      {/* 360 video tour available */}
      <div className="flex flex-wrap items-center md:justify-between gap-[10px] bg-[#000000] rounded-[15px] md:p-[30px] p-[20px]">
        <div className="flex items-center gap-2">
          <ThreeSixtyIcon />
          <h2 className="text-[25px] font-[Bold] text-[#fff]">
            360 video tour available
          </h2>
        </div>
        <button 
         onClick={() => window.open(leads?.project?.virtualTour360, "_blank")}
        className="flex justify-center items-center h-[44px] px-[20px] rounded-[10px] bg-[#fff] text-[#222] text-[14px] font-[Bold]">
          Check it
        </button>
      </div>
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
              onClick={() =>
                setGalleryPage((p) => Math.min(totalGalleryPages - 1, p + 1))
              }
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
              <img
                src={toImageUrl(item.url, "project")}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
      {/* Masterplan */}
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 min-w-0">
          <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
            <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">
              Masterplan
            </h2>
            {masterPlanImage ? (
              <div className="overflow-hidden rounded-[12px] bg-[#F0F0F0]">
                <img
                  src={toImageUrl(masterPlanImage, "project")}
                  alt=""
                  className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-cover"
                />
              </div>
            ) : (
              <div className={mediaEmptyStateClass}>
                Master plan is not available.
              </div>
            )}
          </section>

          <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col">
            <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">
              Video
            </h2>
            <div className="relative overflow-hidden rounded-[12px] bg-[#F0F0F0]">
              <video
                src={toVideoUrl(leads?.project?.videoTour)}
                controls
                className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {!isPlaying && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="flex h-[56px] w-[56px] sm:h-[60px] sm:w-[60px] items-center justify-center rounded-full">
                    <PlayIcon />
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      {/* About the project */}
      <div className="rounded-[15px] bg-white p-5 md:p-[30px] p-[20px] min-w-0">
        <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">
          About the project
        </h2>
        <div className="flex flex-col gap-4 text-[14px] font-[Regular] text-[#222] leading-[165%]">
           <RichTextContent content={leads?.project?.aboutProject} />
        </div>
      </div>
      {/* Frequently asked questions */}
      <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
        <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">
          Frequently asked questions
        </h2>
        <div className="flex flex-col gap-[10px]">
          {leads?.project?.faqs?.map((item: any, index: number) => {
            const isOpen = openFaqId === item.id;
            return (
              <div key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() =>
                    setOpenFaqId((prev) => (prev === item.id ? null : item.id))
                  }
                  className={`flex w-full items-center justify-between gap-3 bg-[#F5F5F5] px-4 py-[14px] text-left transition-colors ${isOpen ? "rounded-t-[10px]" : "rounded-[10px]"}`}
                >
                  <span className="text-[15px] font-[Bold] text-[#222] leading-[150%] pr-2">
                    {item.question}
                  </span>
                  <span
                    className={`shrink-0 text-[#222] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  >
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
      </div>
    </>
  );
};

export default CommonSection;
