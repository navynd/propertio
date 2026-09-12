import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Rating, Typography } from "@mui/material";
import { GoogleMap } from "@react-google-maps/api";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentFirstLevel } from "../../Components/parts/component";
import { DownArrowIconBlack, LeftArrowIcon, RightArrowIcon } from "../../Components/parts/icon";
import "../../assets/styles/AreaInsight/AreaInSight.scss";
import areaInsightBanner from "../../assets/img/areainsightbanner.jpg";
import icon1 from "../../assets/img/guidesicon.svg"
import icon2 from "../../assets/img/towericon.svg"
import icon3 from "../../assets/img/projecticon.svg"
import icon4 from "../../assets/img/developericon.svg"
import icon5 from "../../assets/img/histrical.svg"

import upIcon from '../../assets/img/upred.svg'
import downIcon from '../../assets/img/downgreen.svg'
import sideIcon from '../../assets/img/sideblue.svg'

import com1 from '../../assets/img/com1.jpg'
import com2 from '../../assets/img/com2.jpg'
import com3 from '../../assets/img/com3.jpg'
import com4 from '../../assets/img/com4.jpg'
import com5 from '../../assets/img/com5.jpg'
import com6 from '../../assets/img/com6.jpg'
import aboutTop1 from "../../assets/img/abouttop1.png";
import aboutTop2 from "../../assets/img/abouttop2.png";
import aboutTop3 from "../../assets/img/abouttop3.png";
import aboutTop4 from "../../assets/img/abouttop1.png";
import { useGoogleMapsLoader } from "../../context/GoogleMapsLoaderContext";
import { useNavigate } from "react-router-dom";

const LOCATIONS = ["All Destinations", "London", "New York", "Paris", "Dubai", "Miami", "Singapore"] as const;

const INSIGHT_TABS = [
    "Features",
    "Price map",
    "Communities",
    "Top buildings & sub-communities",
] as const;

type InsightTab = (typeof INSIGHT_TABS)[number];

const FEATURE_CARDS: {
    title: string;
    description: string;
    icon: string;
    path: string;
}[] = [
        {
            title: "Community Guides",
            description:
                "Not sure where to live yet in the city? View more details on all the different communities.",
            icon: icon2,
            path: "/allcommunities",
        },
        {
            title: "Towers and Compounds",
            description:
                "Not sure where to live yet in the city? View more details on all the different communities.",
            icon: icon2,
            path: "/towersandcompounds",
        },
        {
            title: "New projects",
            description:
                "Not sure where to live yet in the city? View more details on all the different communities.",
            icon: icon3,
            path: "/newprojectlisting",
        },
        {
            title: "Find developers",
            description:
                "Not sure where to live yet in the city? View more details on all the different communities.",
            icon: icon4,
            path: "/finddevelopers",
        },
        {
            title: "Historical transactions",
            description:
                "Not sure where to live yet in the city? View more details on all the different communities.",
            icon: icon5,
            path: "/transaction",
        },
    ];

function ExternalLinkIcon() {
    return (
        <svg
            className="pf-area-insight__feature-external-svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <path
                d="M7 17L17 7M17 7H9M17 7V15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

const AreaInSight: React.FC = () => {
    const navigate = useNavigate();
    const [location, setLocation] = useState<string>("All Destinations");
    const [locationOpen, setLocationOpen] = useState(false);
    const locationDropdownRef = useRef<HTMLDivElement>(null);
    const [activeInsightTab, setActiveInsightTab] = useState<InsightTab>("Features");
    const [priceMapMode, setPriceMapMode] = useState<"For rent" | "For sale">("For rent");
    const { isLoaded: isGoogleMapsLoaded } = useGoogleMapsLoader();

    const heroTitle = useMemo(() => `${location === "All Destinations" ? "Global Market" : location} Insights`, [location]);

    const communityPills = useMemo(
        () => [
            "Green Areas",
            "Budget-Friendly",
            "Luxury",
            "Family-Friendly",
            "Waterfront",
            "Sports Enclave",
            "Historic Charm",
            "Outdoor Enthusiasts",
        ],
        []
    );
    const [activeCommunityPill, setActiveCommunityPill] = useState<string>(
        "Luxury"
    );

    const popularCommunities = useMemo(
        () => [
            { title: "Mayfair, London", ratingText: "4.9/5", ratingValue: 4.9, image: com1 },
            { title: "Palm Jumeirah, Dubai", ratingText: "4.9/5", ratingValue: 4.9, image: com2 },
            { title: "Tribeca, New York", ratingText: "4.8/5", ratingValue: 4.8, image: com3 },
            { title: "8th Arrondissement, Paris", ratingText: "4.9/5", ratingValue: 4.9, image: com4 },
            { title: "South Beach, Miami", ratingText: "4.7/5", ratingValue: 4.7, image: com5 },
            { title: "Marina Bay, Singapore", ratingText: "4.8/5", ratingValue: 4.8, image: com6 },
        ],
        []
    );

    const communitiesCarouselRef = useRef<HTMLDivElement | null>(null);
    const [canScrollCommunitiesLeft, setCanScrollCommunitiesLeft] = useState(false);
    const [canScrollCommunitiesRight, setCanScrollCommunitiesRight] = useState(false);

    const updateCommunitiesScrollState = () => {
        const container = communitiesCarouselRef.current;
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        const maxScrollLeft = Math.max(scrollWidth - clientWidth, 0);
        setCanScrollCommunitiesLeft(scrollLeft > 0);
        setCanScrollCommunitiesRight(scrollLeft < maxScrollLeft - 1);
    };

    const scrollCommunities = (direction: "left" | "right") => {
        const container = communitiesCarouselRef.current;
        if (!container) return;
        const scrollAmount = direction === "left" ? -360 : 360;
        container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    };

    const handleLocationToggle = () => {
        setLocationOpen((prev) => !prev);
    };

    const handleLocationSelect = (value: string) => {
        setLocation(value);
        setLocationOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                locationDropdownRef.current &&
                !locationDropdownRef.current.contains(event.target as Node)
            ) {
                setLocationOpen(false);
            }
        };

        if (locationOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [locationOpen]);

    useEffect(() => {
        if (activeInsightTab !== "Communities") return;
        updateCommunitiesScrollState();

        const container = communitiesCarouselRef.current;
        if (!container) return;

        const handleScroll = () => updateCommunitiesScrollState();
        const handleResize = () => updateCommunitiesScrollState();

        container.addEventListener("scroll", handleScroll);
        window.addEventListener("resize", handleResize);

        return () => {
            container.removeEventListener("scroll", handleScroll);
            window.removeEventListener("resize", handleResize);
        };
    }, [activeInsightTab]);

    const topBuildingsPills = useMemo(
        () => [
            "Most popular areas",
            "Villa Sub-Communities",
            "Burj Khalifa View",
            "Family-Friendly",
            "Pet-Friendly Areas",
            "Close to Beaches",
        ],
        []
    );

    const [activeTopBuildingPill, setActiveTopBuildingPill] = useState<string>(
        "Most popular areas"
    );
    const [isTabsFixed, setIsTabsFixed] = useState(false);
    const [tabsHeight, setTabsHeight] = useState(0);
    const heroSectionRef = useRef<HTMLElement | null>(null);
    const tabsSectionRef = useRef<HTMLElement | null>(null);
    const tabsPlaceholderRef = useRef<HTMLDivElement | null>(null);
    const featuresSectionRef = useRef<HTMLDivElement | null>(null);
    const priceMapSectionRef = useRef<HTMLDivElement | null>(null);
    const communitiesSectionRef = useRef<HTMLDivElement | null>(null);
    const topBuildingsSectionRef = useRef<HTMLDivElement | null>(null);

    const TOP_BUILDINGS_PAGE_SIZE = 4;
    const [topBuildingsStartIndex, setTopBuildingsStartIndex] = useState(0);

    const topBuildings = useMemo(
        () => [
            {
                title: "One Hyde Park",
                ratingValue: 4.9,
                ratingText: "4.9/5 based on 42 reviews",
                image: aboutTop1,
                locationBadge: "London",
            },
            {
                title: "432 Park Avenue",
                ratingValue: 4.8,
                ratingText: "4.8/5 based on 38 reviews",
                image: aboutTop2,
                locationBadge: "New York",
            },
            {
                title: "Burj Khalifa Residences",
                ratingValue: 4.9,
                ratingText: "4.9/5 based on 65 reviews",
                image: aboutTop3,
                locationBadge: "Dubai",
            },
            {
                title: "Tour Odéon",
                ratingValue: 4.8,
                ratingText: "4.8/5 based on 29 reviews",
                image: aboutTop2,
                locationBadge: "Monaco",
            },
            {
                title: "111 West 57th Street",
                ratingValue: 4.8,
                ratingText: "4.8/5 based on 31 reviews",
                image: aboutTop1,
                locationBadge: "New York",
            },
            {
                title: "The Marq on Paterson Hill",
                ratingValue: 4.8,
                ratingText: "4.8/5 based on 24 reviews",
                image: aboutTop2,
                locationBadge: "Singapore",
            },
        ],
        []
    );
    const topBuildingsVisible = useMemo(
        () =>
            topBuildings.slice(
                topBuildingsStartIndex,
                topBuildingsStartIndex + TOP_BUILDINGS_PAGE_SIZE
            ),
        [topBuildings, topBuildingsStartIndex]
    );

    const canScrollTopLeft = topBuildingsStartIndex > 0;
    const canScrollTopRight =
        topBuildingsStartIndex + TOP_BUILDINGS_PAGE_SIZE < topBuildings.length;

    const goTopBuildingsLeft = () => {
        setTopBuildingsStartIndex((prev) => Math.max(0, prev - 1));
    };

    const goTopBuildingsRight = () => {
        setTopBuildingsStartIndex((prev) =>
            Math.min(
                prev + 1,
                Math.max(0, topBuildings.length - TOP_BUILDINGS_PAGE_SIZE)
            )
        );
    };

    const getTabSectionRef = (tab: InsightTab) => {
        if (tab === "Features") return featuresSectionRef;
        if (tab === "Price map") return priceMapSectionRef;
        if (tab === "Communities") return communitiesSectionRef;
        return topBuildingsSectionRef;
    };

    const scrollToInsightSection = (tab: InsightTab) => {
        const targetRef = getTabSectionRef(tab);
        const target = targetRef.current;
        if (!target) return;

        const stickyOffset = isTabsFixed ? tabsHeight + 14 : 96;
        const targetY =
            target.getBoundingClientRect().top + window.scrollY - stickyOffset;
        window.scrollTo({ top: Math.max(targetY, 0), behavior: "smooth" });
    };

    const handleInsightTabClick = (tab: InsightTab) => {
        setActiveInsightTab(tab);
        scrollToInsightSection(tab);
    };

    useEffect(() => {
        const updateTabsHeight = () => {
            if (!tabsSectionRef.current) return;
            setTabsHeight(tabsSectionRef.current.offsetHeight);
        };
        updateTabsHeight();
        window.addEventListener("resize", updateTabsHeight);
        return () => window.removeEventListener("resize", updateTabsHeight);
    }, []);

    // useEffect(() => {
    //     const onScroll = () => {
    //         const section = tabsSectionRef.current;
    //         if (!section) return;
    //         const threshold = section.offsetTop;
    //         const shouldFix = window.scrollY >= threshold;
    //         setIsTabsFixed(shouldFix);
    //     };

    //     window.addEventListener("scroll", onScroll, { passive: true });
    //     onScroll();
    //     return () => window.removeEventListener("scroll", onScroll);
    // }, []);

    useEffect(() => {
        const onScroll = () => {
            const hero = heroSectionRef.current;
            if (!hero) return;

            const heroBottom =
                hero.offsetTop + hero.offsetHeight;

            if (window.scrollY >= heroBottom) {
                setIsTabsFixed(true);
            } else {
                setIsTabsFixed(false);
            }
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const syncActiveTabOnScroll = () => {
            const sections: { tab: InsightTab; el: HTMLDivElement | null }[] = [
                { tab: "Features", el: featuresSectionRef.current },
                { tab: "Price map", el: priceMapSectionRef.current },
                { tab: "Communities", el: communitiesSectionRef.current },
                { tab: "Top buildings & sub-communities", el: topBuildingsSectionRef.current },
            ];

            const markerY = (isTabsFixed ? tabsHeight : 0) + 114;
            let currentTab: InsightTab = "Features";

            for (const section of sections) {
                if (!section.el) continue;
                const top = section.el.getBoundingClientRect().top;
                if (top <= markerY) {
                    currentTab = section.tab;
                }
            }

            if (currentTab !== activeInsightTab) {
                setActiveInsightTab(currentTab);
            }
        };

        window.addEventListener("scroll", syncActiveTabOnScroll, { passive: true });
        syncActiveTabOnScroll();
        return () => window.removeEventListener("scroll", syncActiveTabOnScroll);
    }, [activeInsightTab, isTabsFixed, tabsHeight]);

    return (
        <>
            <div className="pf-area-insight">
                <PFContainer>
                    <div className="pf-area-insight__breadcrumbs">
                        <BreadcrumbsComponentFirstLevel
                            breadcrumbTitle="Home"
                            breadcrumbSubTitle1="Area Insights"
                            breadcrumbLinkTitleTo="/"
                        />
                    </div>

                    <header className="pf-area-insight__header">
                        <div className="pf-area-insight__titles">
                            <h1 className="pf-area-insight__title">Explore area insights</h1>
                            <p className="pf-area-insight__subtitle">
                                Explore global property prices, market intelligence, and neighborhood insights.
                            </p>
                        </div>
                        <div className="pf-area-insight__location">
                            <Typography component="span" className="pf-area-insight__label">
                                Select location:
                            </Typography>
                            <Box
                                ref={locationDropdownRef}
                                className="pf-area-insight__custom-select pf-area-insight__location-dropdown"
                                style={{ position: "relative" }}
                            >
                                <Box
                                    className="pf-area-insight__select-btn"
                                    onClick={handleLocationToggle}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleLocationToggle();
                                        }
                                    }}
                                    aria-expanded={locationOpen}
                                    aria-haspopup="listbox"
                                    aria-label="Select location"
                                >
                                    <Typography
                                        className={`pf-area-insight__name ${location ? "selected" : ""}`}
                                    >
                                        {location}
                                    </Typography>
                                    <DownArrowIconBlack width={13} height={13} />
                                </Box>

                                {locationOpen && (
                                    <Box className="pf-area-insight__dropdown" role="listbox">
                                        {LOCATIONS.map((loc) => {
                                            const isActive = location === loc;
                                            return (
                                                <Box
                                                    key={loc}
                                                    className={`pf-area-insight__dropdown-item ${isActive ? "active" : ""}`}
                                                    onClick={() => handleLocationSelect(loc)}
                                                    role="option"
                                                    aria-selected={isActive}
                                                >
                                                    {loc}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Box>
                        </div>
                    </header>

                    <section ref={heroSectionRef}
                        className="pf-area-insight__hero"
                        style={{ backgroundImage: `url(${areaInsightBanner})` }}
                    >
                        <div className="pf-area-insight__hero-overlay" aria-hidden />
                        <h2 className="pf-area-insight__hero-title">{heroTitle}</h2>
                    </section>
                    <div
                        ref={tabsPlaceholderRef}
                        style={{ height: isTabsFixed ? `${tabsHeight}px` : 0 }}
                        aria-hidden
                    />
                    {/* Tabs Section */}
                    <section
                        ref={tabsSectionRef}
                        className={`pf-area-insight__insights ${isTabsFixed ? "is-fixed" : ""}`}
                        aria-label="Area insights categories"
                    >
                        <PFContainer>
                            <div className="pf-area-insight__tabs-wrap">
                                <nav className="pf-area-insight__tabs" role="tablist">
                                    {INSIGHT_TABS.map((tab) => (
                                        <button
                                            key={tab}
                                            type="button"
                                            role="tab"
                                            aria-selected={activeInsightTab === tab}
                                            className={`pf-area-insight__tab ${activeInsightTab === tab ? "is-active" : ""}`}
                                            onClick={() => handleInsightTabClick(tab)}
                                        >
                                            {tab}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </PFContainer>
                    </section>
                </PFContainer>
            </div>

            <PFContainer>
                <div className="pf-area-insight__tab-panels">
                    {/* Features */}
                    <div
                        ref={featuresSectionRef}
                        className="pf-area-insight__features"
                        role="tabpanel"
                        id="area-insight-panel-features"
                    >
                        <Typography component="h2" className="pf-area-insight__features-title">
                            Awesome features
                        </Typography>
                        <div className="pf-area-insight__feature-grid">
                            {FEATURE_CARDS.map((card) => (
                                <button
                                    key={card.title}
                                    type="button"
                                    className="pf-area-insight__feature-card"
                                    onClick={() => navigate(card.path)}
                                >
                                    <div className="pf-area-insight__feature-card-top">
                                        <span className="pf-area-insight__feature-icon-wrap">
                                            <img src={card.icon} alt="" />
                                        </span>
                                        <span className="pf-area-insight__feature-external" aria-hidden>
                                            <ExternalLinkIcon />
                                        </span>
                                    </div>
                                    <h3 className="pf-area-insight__feature-card-title">{card.title}</h3>
                                    <p className="pf-area-insight__feature-card-desc">{card.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>


                    {/* Price map */}
                    <div
                        ref={priceMapSectionRef}
                        className="pf-area-insight__price-map"
                        role="tabpanel"
                        id="area-insight-panel-price-map"
                    >
                        <div className="pf-area-insight__price-map-card">
                            <div className="pf-area-insight__price-map-left">
                                <div className="pf-area-insight__price-map-pills">
                                    <button
                                        type="button"
                                        className={`pf-area-insight__price-map-pill ${priceMapMode === "For rent" ? "is-active" : ""}`}
                                        onClick={() => setPriceMapMode("For rent")}
                                    >
                                        For rent
                                    </button>
                                    <button
                                        type="button"
                                        className={`pf-area-insight__price-map-pill ${priceMapMode === "For sale" ? "is-active" : ""}`}
                                        onClick={() => setPriceMapMode("For sale")}
                                    >
                                        For sale
                                    </button>
                                </div>

                                <button type="button" className="pf-area-insight__price-map-full">
                                    <span className="pf-area-insight__price-map-full-icon" aria-hidden>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                    See full map
                                </button>

                                {isGoogleMapsLoaded ? (
                                    <GoogleMap
                                        mapContainerClassName="pf-area-insight__price-map-canvas"
                                        center={{ lat: 25.2048, lng: 55.2708 }}
                                        zoom={11}
                                        options={{
                                            disableDefaultUI: true,
                                            zoomControl: false,
                                            fullscreenControl: false,
                                            streetViewControl: false,
                                            mapTypeControl: false,
                                        }}
                                    />
                                ) : (
                                    <div
                                        className="pf-area-insight__price-map-canvas pf-area-insight__price-map-canvas--fallback"
                                        aria-label="Price map area"
                                    />
                                )}

                                <div className="pf-area-insight__map-attribution" aria-hidden>
                                    <span className="pf-area-insight__map-attribution-icon">⟳</span>
                                </div>
                            </div>

                            <aside className="pf-area-insight__price-map-right">
                                <div className="pf-area-insight__price-map-title">{location === "All Destinations" ? "Global Market Price Overview" : `${location}'s price map`}</div>
                                <div className="pf-area-insight__price-map-stats">
                                    <div className="pf-area-insight__price-row">
                                        <div className="pf-area-insight__price-label">Highest</div>
                                        <div className="pf-area-insight__price-value">$120,000 / year</div>
                                        <img src={upIcon} alt="" className="pf-area-insight__price-arrow" />
                                    </div>
                                    <div className="pf-area-insight__price-row">
                                        <div className="pf-area-insight__price-label">Average</div>
                                        <div className="pf-area-insight__price-value">$45,000 / year</div>
                                        <img src={sideIcon} alt="" className="pf-area-insight__price-arrow" />
                                    </div>
                                    <div className="pf-area-insight__price-row">
                                        <div className="pf-area-insight__price-label">Lowest</div>
                                        <div className="pf-area-insight__price-value">$18,000 / year</div>
                                        <img src={downIcon} alt="" className="pf-area-insight__price-arrow" />
                                    </div>
                                </div>

                                <div className="pf-area-insight__price-map-note">
                                    * The data displayed is based on verified listing prices across prime global markets.
                                </div>
                            </aside>
                        </div>
                    </div>


                    {/* Communities section */}
                    <div
                        ref={communitiesSectionRef}
                        className="pf-area-insight__communities"
                        role="tabpanel"
                        id="area-insight-panel-communities"
                    >
                        <Typography
                            component="h2"
                            className="pf-area-insight__communities-title"
                        >
                            Discover popular communities
                        </Typography>
                        <Typography className="pf-area-insight__communities-subtitle">
                            Neighborhoods known for their lush greenery and parks. Great for nature lovers.
                        </Typography>

                        <div className="pf-area-insight__communities-pills">
                            {communityPills.map((pill) => (
                                <button
                                    key={pill}
                                    type="button"
                                    className={`pf-area-insight__communities-pill ${activeCommunityPill === pill ? "is-active" : ""
                                        }`}
                                    onClick={() => setActiveCommunityPill(pill)}
                                >
                                    {pill}
                                </button>
                            ))}
                        </div>

                        <div className="pf-area-insight__communities-carousel">
                            <button
                                type="button"
                                className="pf-area-insight__communities-arrow pf-area-insight__communities-arrow--left"
                                onClick={() => scrollCommunities("left")}
                                disabled={!canScrollCommunitiesLeft}
                                aria-label="Previous communities"
                            >
                                <LeftArrowIcon width={16} height={16} fill="#222" />
                            </button>

                            <div
                                className="pf-area-insight__communities-cards"
                                ref={communitiesCarouselRef}
                            >
                                {popularCommunities.map((c, idx) => (
                                    <button
                                        key={`${c.title}-${idx}`}
                                        type="button"
                                        className="pf-area-insight__community-card"
                                        onClick={() => navigate(`/allcommunitiesdetails`)}
                                    >
                                        <img
                                            src={c.image}
                                            alt={c.title}
                                            className="pf-area-insight__community-image"
                                        />
                                        <div className="pf-area-insight__community-overlay">
                                            <h3 className="pf-area-insight__community-title">
                                                {c.title}
                                            </h3>
                                            <div className="pf-area-insight__community-rating">
                                                <Rating
                                                    name={`community-rating-${idx}`}
                                                    value={c.ratingValue ?? Number(String(c.ratingText).split("/")[0])}
                                                    readOnly
                                                    precision={0.1}
                                                    sx={{
                                                        "& .MuiRating-iconFilled": {
                                                            color: "#FFCB2B",
                                                        },
                                                        "& .MuiRating-iconEmpty": {
                                                            color: "rgba(255, 203, 43, 0.28)",
                                                        },
                                                        fontSize: "14px",
                                                    }}
                                                />
                                                <span className="pf-area-insight__community-rating-text">
                                                    {c.ratingText}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                className="pf-area-insight__communities-arrow pf-area-insight__communities-arrow--right"
                                onClick={() => scrollCommunities("right")}
                                disabled={!canScrollCommunitiesRight}
                                aria-label="Next communities"
                            >
                                <RightArrowIcon width={16} height={16} fill="#222" />
                            </button>
                        </div>

                        <div className="pf-area-insight__communities-cta">
                            <button onClick={() => navigate(`/allcommunities`)} type="button" className="pf-area-insight__communities-see-all">
                                See all communities
                            </button>
                        </div>
                    </div>


                    {/*Top buildings & sub-communities*/}
                    <div
                        ref={topBuildingsSectionRef}
                        className="pf-area-insight__top-buildings"
                        role="tabpanel"
                        id="area-insight-panel-top-buildings"
                    >
                        <div className="pf-area-insight__top-buildings-header">
                            <Typography component="h2" className="pf-area-insight__top-buildings-title">
                                See top buildings &amp; sub-communities
                            </Typography>
                            <Typography component="p" className="pf-area-insight__top-buildings-desc">
                                Discover prestigious towers and master-planned sub-communities across prime global destinations.
                            </Typography>
                        </div>

                        <div className="pf-area-insight__top-buildings-pills">
                            {topBuildingsPills.map((pill) => (
                                <button
                                    key={pill}
                                    type="button"
                                    className={`pf-area-insight__top-buildings-pill ${activeTopBuildingPill === pill ? "is-active" : ""}`}
                                    onClick={() => setActiveTopBuildingPill(pill)}
                                >
                                    {pill}
                                </button>
                            ))}
                        </div>

                        <div className="pf-area-insight__top-buildings-cards-row">
                            <div
                                className="pf-area-insight__top-buildings-cards"
                            >
                                {topBuildingsVisible.map((b, idx) => (
                                    <button
                                        key={`${b.title}-${idx}`}
                                        type="button"
                                        className="pf-area-insight__top-building-card"
                                        onClick={() => navigate(`/locationdetails`)}
                                    >
                                        <img
                                            src={b.image}
                                            alt={b.title}
                                            className="pf-area-insight__top-building-image"
                                        />

                                        <div className="pf-area-insight__top-building-pill">
                                            {b.locationBadge}
                                        </div>

                                        <div className="pf-area-insight__top-building-overlay">
                                            <div className="pf-area-insight__top-building-name">
                                                {b.title}
                                            </div>
                                            <div className="pf-area-insight__top-building-rating">
                                                <Rating
                                                    name={`top-building-rating-${idx}`}
                                                    value={b.ratingValue ?? 4.8}
                                                    readOnly
                                                    precision={0.1}
                                                    sx={{
                                                        "& .MuiRating-iconFilled": {
                                                            color: "#FFCB2B",
                                                        },
                                                        "& .MuiRating-iconEmpty": {
                                                            color: "rgba(255, 203, 43, 0.28)",
                                                        },
                                                        fontSize: "14px",
                                                    }}
                                                />
                                                <span className="pf-area-insight__top-building-rating-text">
                                                    {b.ratingText}
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pf-area-insight__top-buildings-bottom">
                            <button
                                onClick={() => navigate(`/towersandcompounds`)}
                                type="button"
                                className="pf-area-insight__top-buildings-see-all"
                            >
                                See all buildings &amp; sub-communities
                            </button>

                            <div className="pf-area-insight__top-buildings-arrows">
                                <button
                                    type="button"
                                    className="pf-area-insight__top-buildings-arrow"
                                    onClick={goTopBuildingsLeft}
                                    disabled={!canScrollTopLeft}
                                    aria-label="Previous"
                                >
                                    <LeftArrowIcon width={22} height={22} fill="#222" />
                                </button>
                                <button
                                    type="button"
                                    className="pf-area-insight__top-buildings-arrow"
                                    onClick={goTopBuildingsRight}
                                    disabled={!canScrollTopRight}
                                    aria-label="Next"
                                >
                                    <RightArrowIcon width={22} height={22} fill="#222" />
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </PFContainer>
        </>

    );
};

export default AreaInSight;
