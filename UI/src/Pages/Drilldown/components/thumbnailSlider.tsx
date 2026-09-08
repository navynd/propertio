import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import {
  RightArrowIcon,
  LeftArrowIcon,
  ExpandImageIcon,
  Image360Icon,
  VideoIcon,
  BoldLocationIcon,
  ImageIcon,
  ModalCloseIcon,
} from "../../../Components/parts/icon";
import drilldown02 from "../../../assets/img/drilldown02.png";
import drilldown04 from "../../../assets/img/drilldown04.png";
import drilldown05 from "../../../assets/img/drilldown05.png";
import { useNavigate } from "react-router-dom";
type ThumbnailSliderProps = {
  images?: string[];
  imagesCount?: number;
  virtualTour360Url?: string;
  videoTourUrl?: string;
  onLocationClick?: () => void;
};

type SliderMediaItem = {
  kind: "image" | "video";
  url: string;
};

type FullscreenCategory = "images" | "video" | "360";

const fallbackImages = [
  drilldown02,
  drilldown04,
  drilldown05,
  drilldown02,
  drilldown04,
  drilldown05,
  drilldown02,
  drilldown04,
  drilldown05,
];

function ThumbnailSlider({
  images,
  imagesCount,
  virtualTour360Url,
  videoTourUrl,
  onLocationClick,
}: ThumbnailSliderProps) {
  const navigate = useNavigate();
  const normalizedVirtualTour360Url = useMemo(() => {
    if (typeof virtualTour360Url !== "string") return "";
    const raw = virtualTour360Url.trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, "")}`;
  }, [virtualTour360Url]);
  const hasVirtualTour360 = normalizedVirtualTour360Url.length > 0;
  const normalizedVideoTourUrl = useMemo(() => {
    if (typeof videoTourUrl !== "string") return "";
    const raw = videoTourUrl.trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://${raw.replace(/^\/+/, "")}`;
  }, [videoTourUrl]);

  const sliderMedia = useMemo<SliderMediaItem[]>(() => {
    const imageItems = (images ?? [])
      .filter((u) => typeof u === "string" && u.trim())
      .map((u) => ({ kind: "image" as const, url: u.trim() }));

    if (normalizedVideoTourUrl) {
      return [...imageItems, { kind: "video", url: normalizedVideoTourUrl }];
    }

    if (imageItems.length) return imageItems;

    return fallbackImages.map((u) => ({ kind: "image" as const, url: u }));
  }, [images, normalizedVideoTourUrl]);

  const [activeSlide, setActiveSlide] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [fullscreenImageIndex, setFullscreenImageIndex] = useState(0);
  const [fullscreenCategory, setFullscreenCategory] =
    useState<FullscreenCategory>("images");
  const visibleCount = 5;

  const imageSlides = useMemo(
    () => sliderMedia.filter((item) => item.kind === "image"),
    [sliderMedia]
  );
  const videoSlideUrl = useMemo(() => {
    if (normalizedVideoTourUrl) return normalizedVideoTourUrl;
    return sliderMedia.find((item) => item.kind === "video")?.url ?? "";
  }, [normalizedVideoTourUrl, sliderMedia]);
  const hasVideoSlide = videoSlideUrl.length > 0;

  const fullscreenCategories = useMemo(
    () =>
      [
        imageSlides.length > 0 ? ("images" as const) : null,
        hasVideoSlide ? ("video" as const) : null,
        hasVirtualTour360 ? ("360" as const) : null,
      ].filter(Boolean) as FullscreenCategory[],
    [imageSlides.length, hasVideoSlide, hasVirtualTour360]
  );

  const fullscreenCurrentImage =
    imageSlides[fullscreenImageIndex] ?? imageSlides[0] ?? null;

  const clampStart = (index: number) => {
    const limit = sliderMedia.length - visibleCount;
    if (limit < 0) return 0;
    if (index < 0) return limit;
    if (index > limit) return 0;
    return index;
  };

  const handlePrevSlide = () => {
    const nextSlide = activeSlide === 0 ? sliderMedia.length - 1 : activeSlide - 1;
    setActiveSlide(nextSlide);
    if (nextSlide < startIndex) {
      setStartIndex(clampStart(nextSlide));
    }
  };

  const handleNextSlide = () => {
    const nextSlide =
      activeSlide === sliderMedia.length - 1 ? 0 : activeSlide + 1;
    setActiveSlide(nextSlide);
    if (nextSlide >= startIndex + visibleCount) {
      setStartIndex(clampStart(nextSlide - visibleCount + 1));
    }
  };

  const handleOpenVirtualTour = () => {
    if (!normalizedVirtualTour360Url) return;
    window.open(normalizedVirtualTour360Url, "_blank", "noopener,noreferrer");
  };

  const openFullscreenFromActiveSlide = () => {
    const active = sliderMedia[activeSlide];
    if (active?.kind === "video" && hasVideoSlide) {
      setFullscreenCategory("video");
    } else {
      setFullscreenCategory("images");
      const activeImageIndex = imageSlides.findIndex(
        (item) => item.kind === "image" && item.url === active?.url
      );
      setFullscreenImageIndex(activeImageIndex >= 0 ? activeImageIndex : 0);
    }
    setShowFullscreen(true);
  };

  return (
    <>
      <Box className="pf-property-drilldown__main-image-section">
        {sliderMedia[activeSlide]?.kind === "video" ? (
          <video
            src={sliderMedia[activeSlide].url}
            className="pf-property-drilldown__main-image"
            controls
            playsInline
            preload="metadata"
          />
        ) : (
          <img
            src={sliderMedia[activeSlide]?.url}
            alt={`Property slide ${activeSlide + 1}`}
            className="pf-property-drilldown__main-image"
          />
        )}
        <Box className="pf-property-drilldown__main-image-action-top">
          <IconButton
            className="pf-property-drilldown__main-image-action"
            aria-label="Expand image"
            onClick={openFullscreenFromActiveSlide}
          >
            <ExpandImageIcon width={18} height={18} />
          </IconButton>
        </Box>
        {hasVirtualTour360 && (
          <Box
            className="pf-property-drilldown__main-image-action-bottom"
            onClick={handleOpenVirtualTour}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleOpenVirtualTour();
              }
            }}
            sx={{ cursor: "pointer", zIndex: 6 }}
          >
            <IconButton
              className="pf-property-drilldown__main-image-action"
              aria-label="360 tour"
            >
              <Image360Icon width={26} height={22} />
            </IconButton>
          </Box>
        )}
        <Box className="pf-property-listing-card__bottom-buttons">
          <Button
            className="pf-property-listing-card__location-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onLocationClick) {
                onLocationClick();
                return;
              }
              navigate("/mapview");
            }}
            startIcon={
              <BoldLocationIcon width={15} height={18} stroke="#222222" />
            }
          >
            Location
          </Button>
          <Button
            className="pf-property-listing-card__photo-count-btn"
            startIcon={<ImageIcon width={15} height={18} fill="#ffffff" />}
          >
            {typeof imagesCount === "number" && imagesCount > 0
              ? imagesCount
              : sliderMedia.length}
          </Button>
        </Box>
      </Box>
      <Box className="pf-property-drilldown__image-thumbnails">
        <IconButton
          className="pf-property-drilldown__thumbnail-arrow pf-property-drilldown__thumbnail-arrow--left"
          onClick={handlePrevSlide}
          aria-label="Previous thumbnail"
        >
          <LeftArrowIcon width={30} height={30} fill="#222222" />
        </IconButton>
        <Box className="pf-property-drilldown__thumbnail-track">
          {sliderMedia
            .slice(startIndex, startIndex + visibleCount)
            .map((slide, index) => {
              const actualIndex = startIndex + index;
              return (
                <Box
                  key={`${slide.url}-${actualIndex}`}
                  className={`pf-property-drilldown__thumbnail ${actualIndex === activeSlide
                    ? "pf-property-drilldown__thumbnail--active"
                    : ""
                    }`}
                  onClick={() => setActiveSlide(actualIndex)}
                >
                  {slide.kind === "video" ? (
                    <>
                      <video
                        src={slide.url}
                        className="pf-property-drilldown__thumbnail-image"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <span className="pf-property-drilldown__thumbnail-video-icon">
                        <VideoIcon width={20} height={20} fill="#ffffff" />
                      </span>
                    </>
                  ) : (
                    <img
                      src={slide.url}
                      alt={`Thumbnail ${actualIndex + 1}`}
                      className="pf-property-drilldown__thumbnail-image"
                    />
                  )}
                </Box>
              );
            })}
        </Box>
        <IconButton
          className="pf-property-drilldown__thumbnail-arrow pf-property-drilldown__thumbnail-arrow--right"
          onClick={handleNextSlide}
          aria-label="Next thumbnail"
        >
          <RightArrowIcon width={30} height={30} fill="#222222" />
        </IconButton>
      </Box>
      {showFullscreen && (
        <Box className="pf-property-drilldown__fullscreen-overlay">
          <IconButton
            className="pf-property-drilldown__fullscreen-close"
            onClick={() => setShowFullscreen(false)}
          >
            <ModalCloseIcon width={16} height={16} fill="#ffffff" />
          </IconButton>

          {fullscreenCategories.length > 0 && (
            <Box
              sx={{
                position: "absolute",
                top: 16,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 11,
                display: "flex",
                gap: 1,
                background: "rgba(0,0,0,0.45)",
                borderRadius: "999px",
                padding: "4px",
              }}
            >
              {fullscreenCategories.map((cat) => (
                <Button
                  key={cat}
                  type="button"
                  size="small"
                  onClick={() => setFullscreenCategory(cat)}
                  sx={{
                    minWidth: 0,
                    color: "#fff",
                    borderRadius: "999px",
                    textTransform: "none",
                    fontSize: 12,
                    lineHeight: 1,
                    px: 1.25,
                    py: 0.75,
                    background:
                      fullscreenCategory === cat ? "rgba(255,255,255,0.24)" : "transparent",
                  }}
                  startIcon={
                    cat === "images" ? (
                      <ImageIcon width={14} height={14} fill="#ffffff" />
                    ) : cat === "video" ? (
                      <VideoIcon width={14} height={14} fill="#ffffff" />
                    ) : (
                      <Image360Icon width={16} height={14} />
                    )
                  }
                >
                  {cat === "images"
                    ? "Images"
                    : cat === "video"
                      ? "Video"
                      : "360 View"}
                </Button>
              ))}
            </Box>
          )}

          {fullscreenCategory === "images" && imageSlides.length > 0 ? (
            <>
              <IconButton
                className="pf-property-drilldown__fullscreen-arrow pf-property-drilldown__fullscreen-arrow--left"
                onClick={() =>
                  setFullscreenImageIndex((prev) =>
                    prev === 0 ? imageSlides.length - 1 : prev - 1
                  )
                }
              >
                <LeftArrowIcon width={20} height={25} fill="#fff" />
              </IconButton>
              <img
                src={fullscreenCurrentImage?.url}
                alt="Fullscreen property"
                className="pf-property-drilldown__fullscreen-image"
              />
              <IconButton
                className="pf-property-drilldown__fullscreen-arrow pf-property-drilldown__fullscreen-arrow--right"
                onClick={() =>
                  setFullscreenImageIndex((prev) =>
                    prev === imageSlides.length - 1 ? 0 : prev + 1
                  )
                }
              >
                <RightArrowIcon width={20} height={25} fill="#fff" />
              </IconButton>
            </>
          ) : fullscreenCategory === "video" && hasVideoSlide ? (
            <video
              src={videoSlideUrl}
              className="pf-property-drilldown__fullscreen-image"
              controls
              playsInline
              preload="metadata"
              autoPlay
            />
          ) : fullscreenCategory === "360" && hasVirtualTour360 ? (
            <iframe
              src={normalizedVirtualTour360Url}
              title="360 view"
              className="pf-property-drilldown__fullscreen-image"
              style={{ border: 0 }}
              allowFullScreen
            />
          ) : (
            <img
              src={fullscreenCurrentImage?.url}
              alt="Fullscreen media"
              className="pf-property-drilldown__fullscreen-image"
            />
          )}
        </Box>
      )}
    </>
  );
}

export default ThumbnailSlider;

