import React, { useEffect, useMemo, useState } from "react";
import PFContainer from "../../Components/container/PFContainer";
import "../../assets/styles/Info/About.scss";
import { LeftArrowIcon, RightArrowIcon } from "../../Components/parts/icon";
import {
  aboutService,
  type AboutPageSettings,
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

const About: React.FC = () => {
  const [settings, setSettings] = useState<AboutPageSettings>(DEFAULT_SETTINGS);
  const [start, setStart] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await aboutService.getAbout();
        if (cancelled) return;
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
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

  const heroBanner = settings.heroBannerImage?.trim() || "";

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

      <div className="about-cta-section">
        <PFContainer>
          <div className="about-luxury-cta">
            <div className="about-luxury-cta__content">
              <span className="about-luxury-cta__badge">EXCLUSIVE ADVISORY</span>
              <h2 className="about-luxury-cta__title">{settings.ctaHeadline}</h2>
              <p className="about-luxury-cta__subtitle">{settings.ctaSubheadline}</p>
              <div className="about-luxury-cta__actions">
                <a href={settings.ctaButtonUrl || "/searchlisting"} className="about-luxury-cta__btn">
                  {settings.ctaButtonLabel || "Discover Prime Properties"}
                </a>
                <a href="/teams" className="about-luxury-cta__link">
                  Consult Private Client Team
                </a>
              </div>
            </div>
          </div>
        </PFContainer>
      </div>
    </div>
  );
};

export default About;
