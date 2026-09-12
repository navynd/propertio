import React, { useEffect, useMemo, useRef, useState } from "react";
import PFContainer from "../../Components/container/PFContainer";
import aboutbanner from "../../assets/img/aboutbanner.jpg";
import top1 from "../../assets/img/abouttop1.png";
import top2 from "../../assets/img/abouttop2.png";
import top3 from "../../assets/img/abouttop3.png";
import top4 from "../../assets/img/abouttop1.png";
import top5 from "../../assets/img/abouttop2.png";
import top6 from "../../assets/img/abouttop3.png";
import aboutImage from "../../assets/img/aboutimage.png";
import "../../assets/styles/Info/About.scss";
import { LeftArrowIcon, RightArrowIcon } from "../../Components/parts/icon";
import {
  aboutService,
  type AboutPageSettings,
  type AboutTimelineEntry,
} from "../../services/aboutService";

const DEFAULT_GALLERY = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80", // Modern luxury villa
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80", // Prime architectural residence
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80", // Luxury penthouse & waterfront
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80", // Contemporary luxury interior
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80", // Iconic skyline residence
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80", // Luxury modern estate
];

const DEFAULT_SETTINGS: AboutPageSettings = {
  heroEyebrow: "THE ESTATEHUB DISTINCTION",
  heroHeadline: "Redefining Luxury Real Estate Across The World's Prime Markets.",
  heroSubheadline:
    "From penthouses in Manhattan and private estates in Mayfair to waterfront sanctuaries in Dubai and Lake Como, Estatehub curates the world's most distinguished properties for discerning buyers and institutional investors.",
  bannerText: "PRIME GLOBAL REAL ESTATE • VERIFIED BROKERAGE NETWORK • BESPOKE ADVISORY • INSTITUTIONAL OFF-PLAN",
  businessSectionTitle: "Architecting the Future of Prime Property Discovery",
  businessParagraph1:
    "Estatehub stands as the premier international destination for verified luxury residential portfolios, off-plan developer developments, and private brokerage networks.",
  businessParagraph2:
    "Combining proprietary market intelligence with an invitation-only network of top-tier brokers and developers, we provide high-net-worth investors and buyers with seamless cross-border property acquisition and advisory.",
  businessCtaPrimaryLabel: "Meet our team",
  businessCtaPrimaryUrl: "/teams",
  businessCtaSecondaryLabel: "Explore prime listings",
  businessCtaSecondaryUrl: "/searchlisting",
  stat1Value: "$14B+",
  stat1Description:
    "Prime property transaction and advisory volume facilitated across international markets",
  stat2Value: "50+",
  stat2Description:
    "Tier-one global capital cities and ultra-luxury resort destinations represented worldwide",
  stat3Value: "100%",
  stat3Description:
    "Verified agency representation with rigorous title and developer due diligence standards",
  successSectionTitle: "Global Milestones",
  ctaHeadline: "Elevate Your Property Portfolio",
  ctaSubheadline:
    "Access vetted off-market residences, iconic penthouses, and global developments with Estatehub's trusted advisory network.",
  ctaButtonLabel: "Discover Prime Properties",
  ctaButtonUrl: "/searchlisting",
};

const DEFAULT_TIMELINE: AboutTimelineEntry[] = [
  {
    id: "1",
    month: "NOV",
    day: "15",
    year: "2024",
    title: "Global Intelligence & Valuation Engine Launch",
    description: "Rolled out proprietary cross-border real estate valuation and yield analytics across 50+ tier-1 capital markets.",
    displayOrder: 1,
  },
  {
    id: "2",
    month: "AUG",
    day: "10",
    year: "2024",
    title: "Private Client Advisory Network Established",
    description: "Inaugurated dedicated bespoke representation for ultra-high-net-worth acquisitions in London, New York, and Dubai.",
    displayOrder: 2,
  },
  {
    id: "3",
    month: "APR",
    day: "28",
    year: "2024",
    title: "Expansion into Prime European & US Metros",
    description: "Integrated over 3,000 verified luxury residences across Manhattan, Paris, Mayfair, and Zurich.",
    displayOrder: 3,
  },
  {
    id: "4",
    month: "JAN",
    day: "14",
    year: "2024",
    title: "Institutional Developer Partnership Tier",
    description: "Partnered with premier global developers to provide direct off-plan VIP allocations and digital masterplans.",
    displayOrder: 4,
  },
  {
    id: "5",
    month: "OCT",
    day: "01",
    year: "2023",
    title: "Founding of the Estatehub Global Marketplace",
    description: "Pioneered the transparent, verified luxury property discovery platform connecting elite brokerages worldwide.",
    displayOrder: 5,
  },
];

const resolveImage = (url: string | undefined, fallback: string) => {
  const trimmed = String(url || "").trim();
  return trimmed || fallback;
};

const renderStatValue = (value: string) => {
  const percentMatch = value.match(/^(.+?)(%)$/);
  if (percentMatch) {
    return (
      <>
        {percentMatch[1]}
        <span>{percentMatch[2]}</span>
      </>
    );
  }
  return value;
};

const renderMultiline = (text: string) =>
  text.split("\n").map((line, index, lines) => (
    <React.Fragment key={index}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </React.Fragment>
  ));

const renderSuccessTitle = (title: string) => {
  const parts = title.trim().split(/\s+/);
  if (parts.length <= 1) return title;
  return (
    <>
      {parts[0]}
      <br />
      {parts.slice(1).join(" ")}
    </>
  );
};

const About: React.FC = () => {
  const [settings, setSettings] = useState<AboutPageSettings>(DEFAULT_SETTINGS);
  const [timeline, setTimeline] = useState<AboutTimelineEntry[]>(DEFAULT_TIMELINE);
  const [start, setStart] = useState(0);
  const successRightRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await aboutService.getAbout();
        if (cancelled) return;
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        if (data.timeline?.length) {
          setTimeline(data.timeline);
        }
      } catch {
        // Keep defaults when API is unavailable.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const metaTitle = settings.seo?.metaTitle?.trim();
    if (metaTitle) {
      document.title = metaTitle;
    }
  }, [settings.seo?.metaTitle]);

  const sliderImages = useMemo(() => {
    const fromApi = (settings.heroGalleryImages || []).map((url) => url.trim()).filter(Boolean);
    if (fromApi.length >= 3) {
      const images = [...fromApi];
      while (images.length < 6) {
        images.push(...fromApi);
      }
      return images.slice(0, 6);
    }
    return DEFAULT_GALLERY;
  }, [settings.heroGalleryImages]);

  const successItems = useMemo(
    () =>
      timeline.map((item) => ({
        month: item.month,
        day: item.day,
        year: item.year,
        title: item.title,
        desc: item.description,
      })),
    [timeline]
  );

  const [successIdxs, setSuccessIdxs] = useState<[number, number, number]>([1, 2, 3]);

  useEffect(() => {
    if (successItems.length >= 4) {
      setSuccessIdxs([1, 2, 3]);
    } else if (successItems.length === 3) {
      setSuccessIdxs([0, 1, 2]);
    } else if (successItems.length === 2) {
      setSuccessIdxs([0, 1, 1]);
    } else if (successItems.length === 1) {
      setSuccessIdxs([0, 0, 0]);
    }
  }, [successItems.length]);

  const visible = sliderImages.slice(start, start + 3);

  const bannerMarquee = useMemo(() => {
    const text = (settings.bannerText || DEFAULT_SETTINGS.bannerText || "").trim();
    return Array(12).fill(`${text} * `).join("");
  }, [settings.bannerText]);

  const next = () => {
    if (start + 3 < sliderImages.length) {
      setStart(start + 1);
    }
  };

  const prev = () => {
    if (start > 0) {
      setStart(start - 1);
    }
  };

  useEffect(() => {
    const el = successRightRef.current;
    if (!el || successItems.length < 2) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (wheelLockRef.current) return;
      wheelLockRef.current = true;
      window.setTimeout(() => {
        wheelLockRef.current = false;
      }, 180);

      const isWheelUp = e.deltaY < 0;

      setSuccessIdxs(([top, center, bottom]) => {
        if (isWheelUp) {
          if (bottom >= successItems.length - 1) return [top, center, bottom];
          return [top + 1, center + 1, bottom + 1];
        }

        if (top <= 0) return [top, center, bottom];
        return [top - 1, center - 1, bottom - 1];
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel as EventListener);
    };
  }, [successItems.length]);

  const heroBanner = settings.heroBannerImage?.trim() || "";
  const ctaBackground = resolveImage(settings.ctaBackgroundImage, aboutImage);

  const stats = [
    { value: settings.stat1Value || "", description: settings.stat1Description || "" },
    { value: settings.stat2Value || "", description: settings.stat2Description || "" },
    { value: settings.stat3Value || "", description: settings.stat3Description || "" },
  ];

  return (
    <div className="about-page">
      <section
        className="about-hero"
        style={heroBanner ? { backgroundImage: `url(${heroBanner})` } : undefined}
      >
        <div className="about-hero__overlay">
          <div className="about-hero__content">
            <span className="about-hero__eyebrow-badge">ESTATEHUB GLOBAL</span>
            <p className="about-hero__eyebrow">{settings.heroEyebrow || "THE ESTATEHUB DISTINCTION"}</p>

            <h1 className="about-hero__title">
              {renderMultiline(settings.heroHeadline || DEFAULT_SETTINGS.heroHeadline || "")}
            </h1>

            <p className="about-hero__subtitle">
              {settings.heroSubheadline || DEFAULT_SETTINGS.heroSubheadline}
            </p>
          </div>

          <div className="about-slider">
            {visible.map((img, i) => (
              <div
                className={`about-slider__item ${
                  i === 1 ? "about-slider__item--center" : "about-slider__item--side"
                }`}
                key={`${start}-${i}`}
              >
                {i === 0 && (
                  <button className="about-slider__arrow left" onClick={prev} type="button">
                    <LeftArrowIcon fill="#000" width={20} height={20} />
                  </button>
                )}

                <img src={img} alt="" />

                {i === 2 && (
                  <button className="about-slider__arrow right" onClick={next} type="button">
                    <RightArrowIcon fill="#000" width={20} height={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="about-slider-title">
            <h5 className="about-slider-title__text">{bannerMarquee}</h5>
          </div>
        </div>
      </section>

      <PFContainer>
        <section className="about-business">
          <div className="about-business__content">
            <div className="about-business__left">
              <h3>{settings.businessSectionTitle}</h3>
            </div>
            <div className="about-business__right">
              <p className="about-business__right-texts">{settings.businessParagraph1}</p>
              <p className="about-business__right-text">{settings.businessParagraph2}</p>
              <div className="about-business__actions">
                <a
                  href={settings.businessCtaPrimaryUrl || "/teams"}
                  className="about-business__btn-primary"
                >
                  {settings.businessCtaPrimaryLabel || "Meet our team"}
                </a>
                <a
                  href={settings.businessCtaSecondaryUrl || "/searchlisting"}
                  className="about-business__btn-link"
                >
                  {settings.businessCtaSecondaryLabel || "Find properties"}{" "}
                  <span className="about-business__btn-link-icon">
                    <RightArrowIcon width={20} height={20} />
                  </span>
                </a>
              </div>
            </div>
          </div>

          <div className="about-business__stats">
            {stats.map((stat, index) => (
              <div className="about-business__stat" key={index}>
                <h4>{renderStatValue(stat.value)}</h4>
                <p>{stat.description}</p>
              </div>
            ))}
          </div>
        </section>
      </PFContainer>

      <div className="about-container">
        <div className="about-success">
          <PFContainer>
            <section className="success">
              <div className="success__left">
                <h2>{renderSuccessTitle(settings.successSectionTitle || "Our Success")}</h2>
              </div>

              <div
                className="success__right"
                ref={successRightRef}
                tabIndex={0}
                aria-label="Our Success timeline (scroll to navigate)"
              >
                <div className="success__line" />

                <div className="success-items">
                  {successIdxs.map((idx, pos) => {
                    const item = successItems[idx];
                    if (!item) return null;

                    const isActive = pos === 1;

                    return (
                      <div key={`${idx}-${pos}`} className={`success-item ${isActive ? "active" : ""}`}>
                        <div className="success-date">
                          <span className={`success-date__month ${isActive ? "active" : ""}`}>
                            {item.month}
                          </span>
                          <span className={`success-date__day ${isActive ? "active" : ""}`}>
                            {item.day}
                          </span>
                          <span className={`success-date__year ${isActive ? "active" : ""}`}>
                            {item.year}
                          </span>
                        </div>

                        <div className="success-dot" />

                        <div className="success-content">
                          <h4>{item.title}</h4>
                          <p>{item.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </PFContainer>
        </div>

        <div className="about-cta-container">
          <section className="about-cta" aria-labelledby="about-cta-heading">
            <div
              className="about-cta__bg"
              style={{ backgroundImage: `url(${ctaBackground})` }}
              aria-hidden
            />
            <div className="about-cta__gradient" aria-hidden />
            <div className="about-cta__inner">
              <h2 id="about-cta-heading" className="about-cta__title">
                {settings.ctaHeadline}
              </h2>
              <p className="about-cta__subtitle">{settings.ctaSubheadline}</p>
              <a href={settings.ctaButtonUrl || "/searchlisting"} className="about-cta__btn">
                {settings.ctaButtonLabel || "Discover Properties"}
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default About;
