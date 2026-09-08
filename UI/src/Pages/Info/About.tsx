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

const DEFAULT_GALLERY = [top1, top2, top3, top4, top5, top6];

const DEFAULT_SETTINGS: AboutPageSettings = {
  heroEyebrow: "ABOUT US",
  heroHeadline: "To motivate and inspire people to get living the life they deserve.",
  heroSubheadline:
    "When you look for a property, it's not just a better home you seek, it's a better future.",
  bannerText: "Unlock your potential",
  businessSectionTitle: "How can we help for your business?",
  businessParagraph1:
    "Phasellus at urna sit amet lacus finibus auctor et posuere elit. In imperdiet dui eu neque elementum feugiat.",
  businessParagraph2:
    "Donec massa dui, tincidunt eu auctor pretium, dignissim id elit. Donec fringilla arcu vel nisl feugiat viverra.",
  businessCtaPrimaryLabel: "Meet our team",
  businessCtaPrimaryUrl: "/teams",
  businessCtaSecondaryLabel: "Find properties",
  businessCtaSecondaryUrl: "/searchlisting",
  stat1Value: "100%",
  stat1Description:
    "Trust worthy for real estate business growth and individual property selling",
  stat2Value: "90%",
  stat2Description: "Dubai properties listed here are verified and ready for you to own and use.",
  stat3Value: "10k+",
  stat3Description: "Real estate companies and Agents are registered here for there growth",
  successSectionTitle: "Our Success",
  ctaHeadline: "Ready to Invest or Move?",
  ctaSubheadline:
    "Verified listings, trusted agents, and real opportunities — all in one place.",
  ctaButtonLabel: "Discover Properties",
  ctaButtonUrl: "/searchlisting",
};

const DEFAULT_TIMELINE: AboutTimelineEntry[] = [
  {
    id: "1",
    month: "MAY",
    day: "22",
    year: "2024",
    title: "New milestone reached across the region",
    description: "Molumulk surpasses record engagement and marketplace growth.",
    displayOrder: 1,
  },
  {
    id: "2",
    month: "MAY",
    day: "20",
    year: "2024",
    title: "Announcing one of the largest investment rounds for a tech",
    description: "Permira leads an investment of $525m, with participation from Blackstone Growth.",
    displayOrder: 2,
  },
  {
    id: "3",
    month: "MAY",
    day: "12",
    year: "2024",
    title: "Unveiling the first owned White Paper",
    description: "PF Connect event in Dubai revealed first white paper.",
    displayOrder: 3,
  },
  {
    id: "4",
    month: "MAY",
    day: "05",
    year: "2024",
    title: "Buyback of Shares from BECO Capital",
    description: "Molumulk raised US$90 million debt financing.",
    displayOrder: 4,
  },
  {
    id: "5",
    month: "MAY",
    day: "02",
    year: "2024",
    title: "Expanding product capabilities",
    description: "New tools launched to help home-seekers make faster decisions.",
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

  const heroBanner = resolveImage(settings.heroBannerImage, aboutbanner);
  const ctaBackground = resolveImage(settings.ctaBackgroundImage, aboutImage);

  const stats = [
    { value: settings.stat1Value || "", description: settings.stat1Description || "" },
    { value: settings.stat2Value || "", description: settings.stat2Description || "" },
    { value: settings.stat3Value || "", description: settings.stat3Description || "" },
  ];

  return (
    <div className="about-page">
      <section className="about-hero" style={{ backgroundImage: `url(${heroBanner})` }}>
        <div className="about-hero__overlay">
          <div className="about-hero__content">
            <p className="about-hero__eyebrow">{settings.heroEyebrow || "ABOUT US"}</p>

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
