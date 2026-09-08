import { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, IconButton } from "@mui/material";
import { useNavigate } from "react-router-dom";

type BannerCarouselProps = {
  images: string[];
  titles?: string[];
  title?: string;
  buttonText?: string;
  buttonTexts?: string[];
  links?: string[];
  autoSlideInterval?: number;
};

function BannerCarousel({
  images,
  titles,
  title,
  buttonText = "Explore more",
  buttonTexts,
  links,
  autoSlideInterval = 5000,
}: BannerCarouselProps) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const slideCount = Math.max(images.length, 1);

  useEffect(() => {
    if (images.length <= 1) return undefined;

    intervalRef.current = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, autoSlideInterval);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [images.length, autoSlideInterval]);

  useEffect(() => {
    setCurrentSlide((prev) => Math.min(prev, Math.max(images.length - 1, 0)));
  }, [images.length]);

  const handleDotClick = (index: number) => {
    setCurrentSlide(index);
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    if (images.length > 1) {
      intervalRef.current = window.setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % images.length);
      }, autoSlideInterval);
    }
  };

  const currentButtonText =
    buttonTexts?.[currentSlide] || buttonText || "Explore more";
  const currentLink = links?.[currentSlide];

  const handleButtonClick = () => {
    if (!currentLink) return;
    if (/^https?:\/\//i.test(currentLink)) {
      window.open(currentLink, "_blank", "noopener,noreferrer");
      return;
    }
    navigate(currentLink);
  };

  if (!images.length) return null;

  return (
    <Box className="pf-search-listing__banner">
      <Box className="pf-search-listing__banner-carousel">
        <Box
          className="pf-search-listing__banner-track"
          sx={{
            width: `${slideCount * 100}%`,
            transform: `translateX(-${currentSlide * (100 / slideCount)}%)`,
          }}
        >
          {images.map((image, index) => (
            <Box key={index} className="pf-search-listing__banner-slide">
              <Box
                className="pf-search-listing__banner-image"
                sx={{
                  backgroundImage: `url(${image})`,
                }}
              >
                <Box className="pf-search-listing__banner-overlay" />
              </Box>
            </Box>
          ))}
        </Box>

        <Box className="pf-search-listing__banner-content">
          <Typography variant="h1" className="pf-search-listing__banner-title">
            {titles && titles[currentSlide] ? titles[currentSlide] : title || "Modern homes in UAE"}
          </Typography>
          <Button
            variant="outlined"
            className="pf-search-listing__banner-button"
            onClick={handleButtonClick}
            disabled={!currentLink}
          >
            {currentButtonText}
          </Button>
        </Box>

        {images.length > 1 && (
          <Box className="pf-search-listing__banner-indicators">
            {images.map((_, index) => (
              <IconButton
                key={index}
                className={`pf-search-listing__banner-dot ${
                  currentSlide === index ? "pf-search-listing__banner-dot--active" : ""
                }`}
                onClick={() => handleDotClick(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default BannerCarousel;
