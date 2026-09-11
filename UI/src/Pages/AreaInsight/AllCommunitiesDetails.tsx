import React, { useEffect, useMemo, useRef, useState } from "react";
import { Rating, Typography } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { GoogleMap, Marker } from "@react-google-maps/api";
import PFContainer from "../../Components/container/PFContainer";
import { useGoogleMapsLoader } from "../../context/GoogleMapsLoaderContext";
import { BreadcrumbsComponentThirdLevel } from "../../Components/parts/component";
import {
    DownArrowIconBlack,
    ExpandImageIcon,
    LeftArrowIcon,
    RightArrowIcon,
} from "../../Components/parts/icon";
import "../../assets/styles/AreaInsight/AllCommunitiesDetail.scss";
import com1 from "../../assets/img/com1.jpg";
import com2 from "../../assets/img/com2.jpg";
import com3 from "../../assets/img/com3.jpg";
import com4 from "../../assets/img/com4.jpg";
import com5 from "../../assets/img/com5.jpg";
import palmMarkerIcon from "../../assets/img/pin.svg";
import CommunitiesProperti from "./CommunitiesComponent/CommunitiesProperti";
import CommunitiesPriceInsight from "./CommunitiesComponent/CommunitiesPropertyInsight";
import CommunitiesLifestyle from "./CommunitiesComponent/CommunitiesLifestyle";
import CommunitiesReview from "./CommunitiesComponent/CommunitiesReview";
import CommunitiesAmunities from "./CommunitiesComponent/ComunitiesAmunities";
import CommunitiesFrq from "./CommunitiesComponent/Communities.Frq";
import CommunitiesPropertyInsight from "./CommunitiesComponent/CommunitiesPropertyInsight";
import CommunitiesPrice from "./CommunitiesComponent/CommunitiesPrice";


const AREA_NAME = "Palm Jumeirah";

const HERO_TAGS = [
    "One of the most luxurious areas in Dubai",
    "Beachfront",
    "Family-Friendly",
] as const;

const GALLERY_IMAGES = [com1, com2, com3, com4, com5];

const VISIBLE_SLIDES = 3;

const MOBILE_CAROUSEL_MAX = "767px";

const DETAIL_TABS = [
    { id: "about", label: "About" },
    { id: "location", label: "Location" },
    { id: "properties", label: "Properties" },
    { id: "price-insights", label: "Price Insights" },
    { id: "lifestyle", label: "Lifestyle" },
    { id: "reviews", label: "Reviews" },
    { id: "amenities", label: "Amenities" },
    { id: "faq", label: "FAQ" },
] as const;

type DetailTabId = (typeof DETAIL_TABS)[number]["id"];

const ABOUT_INTRO_P1 = `Palm Jumeirah is the world's  world's most luxurious hotels, including Atlantis The Palm, its famous aquarium and water park, the ultra-luxurious Atlantis The Royal, and the elegant Waldorf Astoria. Offering stunning waterfront views of both the sea and the Dubai skyline, Palm Jumeirah provides a scenic setting for relaxation and entertainment.`;

const ABOUT_INTRO_P2 = `From Atlantis, The Palm to private villa fronds, the area blends resort-style amenities with established neighbourhoods favoured by buyers and investors worldwide. Nakheel's vision continues to shape new developments alongside waterfront towers, townhouses, and signature landmarks that define Dubai's skyline and lifestyle.`;

/** Palm Jumeirah — approximate center for map & marker */
const PALM_JUMEIRAH_CENTER: google.maps.LatLngLiteral = {
    lat: 25.1124,
    lng: 55.139,
};

const PALM_JUMEIRAH_GOOGLE_MAPS_URL = `https://www.google.com/maps?q=${PALM_JUMEIRAH_CENTER.lat},${PALM_JUMEIRAH_CENTER.lng}&z=14`;

const LOCATION_TRANSPORT_CHIPS = [
    { id: "location", label: "Location" },
    { id: "nearby", label: "Nearby Areas" },
    { id: "attractions", label: "Attractions" },
    { id: "monorail", label: "Monorail" },
    { id: "tram", label: "Tram Station" },
    { id: "parking", label: "Parking" },
    { id: "bus", label: "Bus station and routes" },
] as const;

type LocationChipId = (typeof LOCATION_TRANSPORT_CHIPS)[number]["id"];

const LOCATION_TEXT_P1 = `Palm Jumeirah is well connected to the rest of Dubai by road, with Sheikh Zayed Road and the monorail providing direct access to key business and leisure districts. The Palm Monorail links the trunk to Atlantis The Palm, making it easy for residents and visitors to move along the island.`;

const LOCATION_TEXT_P2 = `Public transport options include tram connections towards Dubai Marina, bus routes along the fronds and trunk, and taxi stands near major hotels and retail hubs. Parking is widely available across residential towers, villas, and commercial areas, with paid and visitor options near beaches and attractions.`;

const KEY_HIGHLIGHTS = [
    "One of the world's largest man-made islands",
    "Upscale lifestyle",
    "Home to 5-star resorts and private beaches",
    "One of the most popular and prestigious areas for buyers and investors",
    "Developed by Nakheel",
    "Luxurious villas and apartments with sea views",
    "Home to Atlantis The Palm and fine-dining restaurants",
] as const;

const palmMapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
};

const AllCommunitiesDetails: React.FC = () => {
    const { isLoaded, loadError, googleMapsApiKey } = useGoogleMapsLoader();

    const isMobileGallery = useMediaQuery(`(max-width:${MOBILE_CAROUSEL_MAX})`);

    const [startIndex, setStartIndex] = useState(0);
    /** Single-image carousel on ≤767px */
    const [mobileSlideIndex, setMobileSlideIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<DetailTabId>("about");
    const [isTabsFixed, setIsTabsFixed] = useState(false);
    const [tabsTop, setTabsTop] = useState(0);
    const [tabsHeight, setTabsHeight] = useState(0);
    const [aboutExpanded, setAboutExpanded] = useState(false);
    const [locationChip, setLocationChip] = useState<LocationChipId>("location");
    const [locationExpanded, setLocationExpanded] = useState(false);

    const isMobileProperties = useMediaQuery(`(max-width:${MOBILE_CAROUSEL_MAX})`);
    const [propertyGroupIndex, setPropertyGroupIndex] = useState(0);
    const [propertyDesktopStart, setPropertyDesktopStart] = useState(0);
    const [propertyMobileIndex, setPropertyMobileIndex] = useState(0);
    const tabsNavRef = useRef<HTMLElement | null>(null);
    const tabsPlaceholderRef = useRef<HTMLDivElement | null>(null);
    const sectionRefs = useRef<Record<DetailTabId, HTMLElement | null>>({
        about: null,
        location: null,
        properties: null,
        "price-insights": null,
        lifestyle: null,
        reviews: null,
        amenities: null,
        faq: null,
    });


    useEffect(() => {
        setPropertyDesktopStart(0);
        setPropertyMobileIndex(0);
    }, [propertyGroupIndex]);


    const maxStart = Math.max(0, GALLERY_IMAGES.length - VISIBLE_SLIDES);
    const lastMobileIndex = GALLERY_IMAGES.length - 1;

    const visibleImages = useMemo(() => {
        if (isMobileGallery) {
            const src = GALLERY_IMAGES[mobileSlideIndex];
            return src !== undefined ? [src] : [];
        }
        return GALLERY_IMAGES.slice(startIndex, startIndex + VISIBLE_SLIDES);
    }, [isMobileGallery, mobileSlideIndex, startIndex]);

    const photoOffset = isMobileGallery ? mobileSlideIndex : startIndex;

    const goPrev = () => {
        if (isMobileGallery) {
            setMobileSlideIndex((i) => (i <= 0 ? lastMobileIndex : i - 1));
        } else {
            setStartIndex((i) => (i <= 0 ? maxStart : i - 1));
        }
    };

    const goNext = () => {
        if (isMobileGallery) {
            setMobileSlideIndex((i) => (i >= lastMobileIndex ? 0 : i + 1));
        } else {
            setStartIndex((i) => (i >= maxStart ? 0 : i + 1));
        }
    };

    const setSectionRef =
        (tabId: DetailTabId) => (el: HTMLElement | null) => {
            sectionRefs.current[tabId] = el;
        };

    const scrollToSection = (tabId: DetailTabId) => {
        const target = sectionRefs.current[tabId];
        if (!target) return;

        const navHeight = tabsNavRef.current?.offsetHeight ?? tabsHeight;
        const stickyTopOffset = 65; // aligns with app header height
        const offset = navHeight + stickyTopOffset + 12;
        const y = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    };

    const handleTabClick = (tabId: DetailTabId) => {
        setActiveTab(tabId);
        scrollToSection(tabId);
    };

    useEffect(() => {
        const measureTabs = () => {
            const tabsEl = tabsNavRef.current;
            if (!tabsEl) return;
            const rect = tabsEl.getBoundingClientRect();
            setTabsHeight(rect.height);
            setTabsTop(rect.top + window.scrollY);
        };
        measureTabs();
        window.addEventListener("resize", measureTabs);
        return () => window.removeEventListener("resize", measureTabs);
    }, []);

    useEffect(() => {
        const onScroll = () => {
            const fixedTop = 65;
            setIsTabsFixed(window.scrollY >= tabsTop - fixedTop);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, [tabsTop]);

    useEffect(() => {
        const syncActiveTabOnScroll = () => {
            const navHeight = tabsNavRef.current?.offsetHeight ?? tabsHeight;
            const markerY = navHeight + 65 + 24;
            const orderedTabs: DetailTabId[] = [
                "about",
                "location",
                "properties",
                "price-insights",
                "lifestyle",
                "reviews",
                "amenities",
                "faq",
            ];

            let current: DetailTabId = "about";
            for (const tabId of orderedTabs) {
                const el = sectionRefs.current[tabId];
                if (!el) continue;
                if (el.getBoundingClientRect().top <= markerY) {
                    current = tabId;
                }
            }

            if (current !== activeTab) {
                setActiveTab(current);
            }
        };

        window.addEventListener("scroll", syncActiveTabOnScroll, { passive: true });
        syncActiveTabOnScroll();
        return () => window.removeEventListener("scroll", syncActiveTabOnScroll);
    }, [activeTab, tabsHeight]);

    return (
        <>
            <div className="pf-communities-detail">
                <PFContainer>
                    <div className="pf-communities-detail__breadcrumb">
                        <BreadcrumbsComponentThirdLevel
                            breadcrumbTitle="Home"
                            breadcrumbLinkTitleTo="/"
                            breadcrumbSubTitle1="Area Insights"
                            breadcrumbLinkSubTitle1To="/areainsight"
                            breadcrumbSubTitle2="Area Insights"
                            breadcrumbLinkSubTitle2To="/allcommunities"
                            breadcrumbSubTitle3={AREA_NAME}
                        />
                    </div>

                    <header className="pf-communities-detail__hero">
                        <div className="pf-communities-detail__hero-main">
                            <h1 className="pf-communities-detail__title">{AREA_NAME}</h1>
                            <div className="pf-communities-detail__rating-row">
                                <Rating
                                    name="area-rating"
                                    value={4.8}
                                    readOnly
                                    precision={0.1}
                                    sx={{
                                        "& .MuiRating-iconFilled": {
                                            color: "#FFCB2B",
                                        },
                                        "& .MuiRating-iconEmpty": {
                                            color: "rgba(255, 203, 43, 0.28)",
                                        },
                                        fontSize: "20px",
                                    }}
                                />
                                <Typography
                                    component="span"
                                    className="pf-communities-detail__rating-text"
                                >
                                    4.8/5 based on 45 Ratings
                                </Typography>
                            </div>
                        </div>
                        <div className="pf-communities-detail__tags" role="list">
                            {HERO_TAGS.map((tag) => (
                                <span key={tag} className="pf-communities-detail__tag" role="listitem">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </header>
                </PFContainer>
                <div className="pf-communities-detail__carousel">
                    <button
                        type="button"
                        className="pf-communities-detail__carousel-btn pf-communities-detail__carousel-btn--prev"
                        onClick={goPrev}
                        aria-label="Previous images"
                    >
                        <LeftArrowIcon width={18} height={18} fill="#222" />
                    </button>
                    <div
                        className={
                            isMobileGallery
                                ? "pf-communities-detail__carousel-track pf-communities-detail__carousel-track--single"
                                : "pf-communities-detail__carousel-track"
                        }
                    >
                        {visibleImages.map((src, idx) => (
                            <div
                                key={`${photoOffset}-${idx}`}
                                className={
                                    !isMobileGallery && idx === 1
                                        ? "pf-communities-detail__carousel-slide pf-communities-detail__carousel-slide--center"
                                        : "pf-communities-detail__carousel-slide"
                                }
                            >
                                <img
                                    src={src}
                                    alt={`${AREA_NAME} — photo ${photoOffset + idx + 1}`}
                                    className="pf-communities-detail__carousel-img"
                                />
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="pf-communities-detail__carousel-btn pf-communities-detail__carousel-btn--next"
                        onClick={goNext}
                        aria-label="Next images"
                    >
                        <RightArrowIcon width={18} height={18} fill="#222" />
                    </button>
                </div>
                <div
                    ref={tabsPlaceholderRef}
                    style={{ height: isTabsFixed ? `${tabsHeight}px` : 0 }}
                    aria-hidden
                />
                <section
                    className={`pf-communities-detail__tabs-stick ${isTabsFixed ? "is-fixed" : ""}`}
                    aria-label="Community sections"
                >
                    <PFContainer>
                        {/* Tabs Section */}
                        <nav
                            ref={tabsNavRef}
                            className="pf-communities-detail__tabs-nav"
                            aria-label="Community sections"
                        >
                            <div
                                className="pf-communities-detail__tabs-scroll"
                                role="tablist"
                            >
                                {DETAIL_TABS.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            role="tab"
                                            id={`community-tab-${tab.id}`}
                                            aria-selected={isActive}
                                            className={
                                                isActive
                                                    ? "pf-communities-detail__tab pf-communities-detail__tab--active"
                                                    : "pf-communities-detail__tab"
                                            }
                                            onClick={() => handleTabClick(tab.id)}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </nav>
                    </PFContainer>
                </section>
            </div>

            <PFContainer>

                {/* About */}
                <section
                    ref={setSectionRef("about")}
                    className="pf-communities-detail__about-section"
                    aria-labelledby="community-about-heading"
                >
                    <div className="pf-communities-detail__about-grid">
                        <article className="pf-communities-detail__about-card">
                            <h2
                                id="community-about-heading"
                                className="pf-communities-detail__card-title"
                            >
                                About {AREA_NAME}
                            </h2>
                            <div
                                className={
                                    aboutExpanded
                                        ? "pf-communities-detail__about-body pf-communities-detail__about-body--expanded"
                                        : "pf-communities-detail__about-body"
                                }
                            >
                                <p className="pf-communities-detail__about-p">
                                    {ABOUT_INTRO_P1}
                                </p>
                                <p className="pf-communities-detail__about-p">
                                    {ABOUT_INTRO_P2}
                                </p>
                                {!aboutExpanded && (
                                    <div
                                        className="pf-communities-detail__about-fade"
                                        aria-hidden
                                    />
                                )}
                            </div>
                            <button
                                type="button"
                                className="pf-communities-detail__read-more"
                                onClick={() => setAboutExpanded((v) => !v)}
                                aria-expanded={aboutExpanded}
                            >
                                {aboutExpanded ? "Read less" : "Read more"}
                                <DownArrowIconBlack
                                    width={12}
                                    height={12}
                                    fill="#1F3D51"
                                    className={
                                        aboutExpanded
                                            ? "pf-communities-detail__read-more-icon pf-communities-detail__read-more-icon--up"
                                            : "pf-communities-detail__read-more-icon"
                                    }
                                />
                            </button>
                        </article>

                        <aside className="pf-communities-detail__highlights-card">
                            <h2 className="pf-communities-detail__card-title">
                                Key highlights
                            </h2>
                            <ul className="pf-communities-detail__highlights-list">
                                {KEY_HIGHLIGHTS.map((item) => (
                                    <li
                                        key={item}
                                        className="pf-communities-detail__highlights-item"
                                    >
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </aside>
                    </div>
                </section>

                {/* Location */}

                <section
                    ref={setSectionRef("location")}
                    className="pf-communities-detail__location-section"
                    aria-labelledby="community-location-heading"
                >
                    <article className="pf-communities-detail__location-card">
                        <div className="pf-communities-detail__location-map">
                            {!googleMapsApiKey ? (
                                <div className="pf-communities-detail__location-map-fallback">
                                    Set{" "}
                                    <code>VITE_GOOGLE_MAPS_API_KEY</code> in your
                                    environment to display the map.
                                </div>
                            ) : loadError ? (
                                <div className="pf-communities-detail__location-map-fallback">
                                    We couldn&apos;t load Google Maps. Check your API
                                    key and network connection.
                                </div>
                            ) : !isLoaded ? (
                                <div className="pf-communities-detail__location-map-fallback">
                                    Loading Google Maps…
                                </div>
                            ) : (
                                <GoogleMap
                                    mapContainerClassName="pf-communities-detail__location-map-canvas"
                                    center={PALM_JUMEIRAH_CENTER}
                                    zoom={13}
                                    options={palmMapOptions}
                                >
                                    <Marker
                                        position={PALM_JUMEIRAH_CENTER}
                                        icon={palmMarkerIcon}
                                    />
                                </GoogleMap>
                            )}
                            <button
                                type="button"
                                className="pf-communities-detail__see-full-map"
                                onClick={() =>
                                    window.open(
                                        PALM_JUMEIRAH_GOOGLE_MAPS_URL,
                                        "_blank",
                                        "noopener,noreferrer"
                                    )
                                }
                            >
                                <ExpandImageIcon width={14} height={14} />
                                <span>See full map</span>
                            </button>
                        </div>

                        <div className="pf-communities-detail__location-panel">
                            <h2
                                id="community-location-heading"
                                className="pf-communities-detail__location-title"
                            >
                                Location &amp; Transportation in {AREA_NAME}
                            </h2>

                            <div
                                className="pf-communities-detail__loc-chips"
                                role="tablist"
                                aria-label="Location filters"
                            >
                                {LOCATION_TRANSPORT_CHIPS.map((chip) => {
                                    const isChipActive = locationChip === chip.id;
                                    return (
                                        <button
                                            key={chip.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={isChipActive}
                                            className={
                                                isChipActive
                                                    ? "pf-communities-detail__loc-chip pf-communities-detail__loc-chip--active"
                                                    : "pf-communities-detail__loc-chip"
                                            }
                                            onClick={() => setLocationChip(chip.id)}
                                        >
                                            {chip.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div
                                className={
                                    locationExpanded
                                        ? "pf-communities-detail__location-body pf-communities-detail__location-body--expanded"
                                        : "pf-communities-detail__location-body"
                                }
                            >
                                <p className="pf-communities-detail__location-p">
                                    {LOCATION_TEXT_P1}
                                </p>
                                <p className="pf-communities-detail__location-p">
                                    {LOCATION_TEXT_P2}
                                </p>
                                {!locationExpanded && (
                                    <div
                                        className="pf-communities-detail__location-fade"
                                        aria-hidden
                                    />
                                )}
                            </div>

                            <button
                                type="button"
                                className="pf-communities-detail__read-more pf-communities-detail__read-more--dark"
                                onClick={() => setLocationExpanded((v) => !v)}
                                aria-expanded={locationExpanded}
                            >
                                {locationExpanded ? "Read less" : "Read more"}
                                <DownArrowIconBlack
                                    width={12}
                                    height={12}
                                    fill="#111"
                                    className={
                                        locationExpanded
                                            ? "pf-communities-detail__read-more-icon pf-communities-detail__read-more-icon--up"
                                            : "pf-communities-detail__read-more-icon"
                                    }
                                />
                            </button>
                        </div>
                    </article>
                </section>


                {/* Properties */}
                <section ref={setSectionRef("properties")}>
                    <div>
                        <CommunitiesProperti />
                    </div>
                    <div>
                        <CommunitiesPropertyInsight />
                    </div>
                </section>

                {/* Price Insights */}
                <section ref={setSectionRef("price-insights")}>
                    <CommunitiesPrice />
                </section>


                {/* Lifestyle */}
                <section ref={setSectionRef("lifestyle")}>
                    <CommunitiesLifestyle />
                </section>

                {/* Reviews */}
                <section ref={setSectionRef("reviews")}>
                    <CommunitiesReview />
                </section>

                {/* Amenities */}
                <section ref={setSectionRef("amenities")}>
                    <CommunitiesAmunities />
                </section>

                {/* FAQ */}
                <section ref={setSectionRef("faq")}>
                    <CommunitiesFrq />
                </section>

            </PFContainer>
        </>

    );
};

export default AllCommunitiesDetails;
