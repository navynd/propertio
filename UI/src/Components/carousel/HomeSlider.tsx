import { useEffect, useRef } from "react";
import First from "../../assets/img/company_logos/1.png";
import Second from "../../assets/img/company_logos/2.png";
import Third from "../../assets/img/company_logos/3.png";
import Four from "../../assets/img/company_logos/4.png";
import Five from "../../assets/img/company_logos/5.png";
import Six from "../../assets/img/company_logos/6.png";
import Seven from "../../assets/img/company_logos/7.png";
import Eight from "../../assets/img/company_logos/8.png";
import Nine from "../../assets/img/company_logos/9.png";
import { Divider } from "@mui/material";

const defaultLogos = [
  First,
  Second,
  Third,
  Four,
  Five,
  Six,
  Seven,
  Eight,
  Nine,
  Four,
];

type HomeSliderProps = {
  logos?: string[]; // Accept logos as prop for API integration
};

function HomeSlider({ logos = defaultLogos }: HomeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // For infinite scroll effect, we need to duplicate the array once for seamless looping
  // This is only for visual effect - API/data should provide single set
  // Component handles duplication internally so user doesn't need to duplicate in their data
  const displayLogos = [...logos, ...logos];
  
  useEffect(() => {
    const track = trackRef.current;
    const container = containerRef.current;
    if (!track || !container || logos.length === 0) return;

    let animationId: number;
    let translateX = 0;
    const speed = 0.5; // pixels per frame (adjust for speed: 0.3 = slower, 0.7 = faster)
    let isPaused = false;
    let oneSetWidth = 0;

    // Calculate the width of one set (half the total since we have 2 copies for seamless loop)
    const calculateSetWidth = () => {
      if (track) {
        // Total width divided by 2 gives us one set's width
        oneSetWidth = track.scrollWidth / 2;
      }
    };

    // Initial calculation and recalculate on resize
    const resizeObserver = new ResizeObserver(() => {
      // Wait a frame for DOM to update
      requestAnimationFrame(() => {
        calculateSetWidth();
      });
    });
    
    calculateSetWidth();
    resizeObserver.observe(track);

    const animate = () => {
      if (!isPaused && oneSetWidth > 0) {
        translateX -= speed;
        
        // When we've moved exactly one set's width, reset seamlessly
        // The second copy is identical, so resetting is invisible
        if (Math.abs(translateX) >= oneSetWidth) {
          // Reset position back to 0 - seamless because duplicate set shows same content
          translateX = 0;
        }
        
        track.style.transform = `translateX(${translateX}px)`;
      }
      
      animationId = requestAnimationFrame(animate);
    };

    // Handle hover pause
    const handleMouseEnter = () => {
      isPaused = true;
    };
    
    const handleMouseLeave = () => {
      isPaused = false;
    };

    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Start animation after a short delay to ensure DOM is ready
    const startTimeout = setTimeout(() => {
      calculateSetWidth();
      animationId = requestAnimationFrame(animate);
    }, 100);

    return () => {
      clearTimeout(startTimeout);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      resizeObserver.disconnect();
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [logos]);

  // Don't render if no logos
  if (!logos || logos.length === 0) {
    return null;
  }

  return (
    <div className="pf-home-slider" ref={containerRef} aria-label="Developer logos carousel">
      <div className="pf-home-slider__track" ref={trackRef}>
        {displayLogos.map((logo, index) => (
          <div className="pf-home-slider__item" key={`${logo}-${index}`}>
            <img src={logo} alt="developer logo" loading="lazy" />
          </div>
        ))}
      </div>
      <Divider className="pf-footer__divider" />
    </div>
    
  );
}

export default HomeSlider;
