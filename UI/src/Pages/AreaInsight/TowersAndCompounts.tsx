import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Rating, Typography } from "@mui/material";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../Components/parts/component";
import {
    DownArrowIconBlack,
    LeftArrowIcon,
    RightArrowIcon,
    SearchIcon,
} from "../../Components/parts/icon";
import towercompountbg from "../../assets/img/towercompountbg.png";
import com1 from "../../assets/img/com1.jpg";
import com2 from "../../assets/img/com2.jpg";
import com3 from "../../assets/img/com3.jpg";
import com4 from "../../assets/img/com4.jpg";
import com5 from "../../assets/img/com5.jpg";
import com6 from "../../assets/img/com6.jpg";
import blog1 from "../../assets/img/blog1.jpg";
import blog2 from "../../assets/img/blog2.jpg";
import blog3 from "../../assets/img/blog3.jpg";
import blog4 from "../../assets/img/blog4.jpg";
import "../../assets/styles/AreaInsight/TowerCompount.scss";

/** Card row inside each tab’s `data` array (`name` = badge pill text). */
type TowerCardRow = {
    name: string;
    image: string;
    title: string;
    rating: number;
    reviewCount: number;
};

/** One tab / panel (`name` = tab key, shown as a readable label; `dec` = subtitle). */
type TowerTabGroup = {
    id: number;
    name: string;
    dec: string;
    data: TowerCardRow[];
};

/** Tab label in UI: split camelCase → words (e.g. MostPopularAreas → Most Popular Areas). */
function tabLabelFromName(name: string): string {
    const spaced = name.replace(/([a-z])([A-Z])/g, "$1 $2");
    return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * All tabs + cards in your array format.
 * Extend by pushing more `{ id, name, dec, data: [...] }` objects.
 */
const Alldata: TowerTabGroup[] = [
    {
        id: 1,
        name: "MostPopularAreas",
        dec: "People love these, and so will you! Explore the best areas in Dubai.",
        data: [
            {
                name: "Downtown",
                image: com1,
                title: "Burj Khalifa",
                rating: 4.8,
                reviewCount: 28,
            },
            {
                name: "Waterfront",
                image: com2,
                title: "Dubai Marina",
                rating: 4.7,
                reviewCount: 34,
            },
            {
                name: "Island",
                image: com3,
                title: "Palm Jumeirah",
                rating: 4.9,
                reviewCount: 42,
            },
            {
                name: "Urban",
                image: com4,
                title: "Business Bay",
                rating: 4.6,
                reviewCount: 19,
            },
            {
                name: "Creek",
                image: com5,
                title: "Dubai Creek Harbour",
                rating: 4.5,
                reviewCount: 16,
            },
            {
                name: "Suburb",
                image: com6,
                title: "Arabian Ranches",
                rating: 4.7,
                reviewCount: 25,
            },
        ],
    },
    {
        id: 2,
        name: "AffordableAreas",
        dec: "Cut on housing costs with these budget-friendly places to live.",
        data: [
            {
                name: "Community",
                image: blog1,
                title: "Jumeirah Village Circle",
                rating: 4.5,
                reviewCount: 52,
            },
            {
                name: "Gardens",
                image: blog2,
                title: "Discovery Gardens",
                rating: 4.4,
                reviewCount: 38,
            },
            {
                name: "Sports",
                image: blog3,
                title: "Dubai Sports City",
                rating: 4.3,
                reviewCount: 29,
            },
            {
                name: "Central",
                image: blog4,
                title: "International City",
                rating: 4.2,
                reviewCount: 44,
            },
            {
                name: "North",
                image: com2,
                title: "Al Qusais",
                rating: 4.4,
                reviewCount: 21,
            },
            {
                name: "Historic",
                image: com4,
                title: "Deira",
                rating: 4.1,
                reviewCount: 33,
            },
        ],
    },
    {
        id: 3,
        name: "VillaSubCommunities",
        dec: "Get away from the hustle and bustle in villa-dominated districts.",
        data: [
            {
                name: "Golf",
                image: com6,
                title: "Arabian Ranches",
                rating: 4.8,
                reviewCount: 31,
            },
            {
                name: "Estates",
                image: com5,
                title: "The Villa",
                rating: 4.6,
                reviewCount: 18,
            },
            {
                name: "Park",
                image: com3,
                title: "Mudon",
                rating: 4.7,
                reviewCount: 24,
            },
            {
                name: "Luxury",
                image: com1,
                title: "Emirates Hills",
                rating: 4.9,
                reviewCount: 15,
            },
            {
                name: "Fairways",
                image: com2,
                title: "Jumeirah Golf Estates",
                rating: 4.8,
                reviewCount: 22,
            },
            {
                name: "Resort",
                image: com4,
                title: "Damac Hills",
                rating: 4.6,
                reviewCount: 27,
            },
        ],
    },
    {
        id: 4,
        name: "BurjKhalifaView",
        dec: "Iconic skyline views and premium towers around Downtown Dubai.",
        data: [
            {
                name: "Downtown",
                image: com1,
                title: "Burj Khalifa",
                rating: 4.9,
                reviewCount: 36,
            },
            {
                name: "Bay",
                image: com4,
                title: "Business Bay",
                rating: 4.7,
                reviewCount: 24,
            },
            {
                name: "Finance",
                image: blog1,
                title: "DIFC",
                rating: 4.6,
                reviewCount: 22,
            },
            {
                name: "Boulevard",
                image: com5,
                title: "Sheikh Mohammed Bin Rashid Blvd",
                rating: 4.8,
                reviewCount: 29,
            },
            {
                name: "Canal",
                image: com2,
                title: "Marasi Business Bay",
                rating: 4.5,
                reviewCount: 18,
            },
            {
                name: "Island",
                image: com3,
                title: "Palm Jumeirah",
                rating: 4.8,
                reviewCount: 41,
            },
        ],
    },
    {
        id: 5,
        name: "FamilyFriendly",
        dec: "Schools, parks, and calm streets ideal for families with children.",
        data: [
            {
                name: "Golf",
                image: com6,
                title: "Arabian Ranches",
                rating: 4.8,
                reviewCount: 33,
            },
            {
                name: "Community",
                image: blog2,
                title: "Mirdif",
                rating: 4.5,
                reviewCount: 27,
            },
            {
                name: "Park",
                image: com3,
                title: "Mudon",
                rating: 4.6,
                reviewCount: 20,
            },
            {
                name: "Town",
                image: blog3,
                title: "Town Square",
                rating: 4.4,
                reviewCount: 31,
            },
            {
                name: "Creek",
                image: com5,
                title: "Dubai Creek Harbour",
                rating: 4.5,
                reviewCount: 19,
            },
            {
                name: "Marina",
                image: com2,
                title: "Dubai Marina",
                rating: 4.5,
                reviewCount: 40,
            },
        ],
    },
    {
        id: 6,
        name: "PetFriendlyAreas",
        dec: "Walkable neighborhoods with green pockets and pet-welcoming communities.",
        data: [
            {
                name: "Greens",
                image: blog4,
                title: "The Greens",
                rating: 4.4,
                reviewCount: 26,
            },
            {
                name: "Walk",
                image: com2,
                title: "Jumeirah Village Circle",
                rating: 4.5,
                reviewCount: 48,
            },
            {
                name: "Trails",
                image: com6,
                title: "Arabian Ranches 2",
                rating: 4.7,
                reviewCount: 21,
            },
            {
                name: "Urban",
                image: com4,
                title: "City Walk",
                rating: 4.3,
                reviewCount: 17,
            },
            {
                name: "Beach",
                image: com1,
                title: "Jumeirah",
                rating: 4.6,
                reviewCount: 35,
            },
            {
                name: "Island",
                image: com3,
                title: "Palm Jumeirah",
                rating: 4.7,
                reviewCount: 39,
            },
        ],
    },
    {
        id: 7,
        name: "CloseToBeaches",
        dec: "Sun, sand, and sea — coastal communities minutes from the shore.",
        data: [
            {
                name: "Island",
                image: com3,
                title: "Palm Jumeirah",
                rating: 4.9,
                reviewCount: 45,
            },
            {
                name: "Walk",
                image: com2,
                title: "JBR",
                rating: 4.7,
                reviewCount: 52,
            },
            {
                name: "Marina",
                image: com1,
                title: "Dubai Marina",
                rating: 4.6,
                reviewCount: 38,
            },
            {
                name: "Harbour",
                image: blog1,
                title: "La Mer",
                rating: 4.4,
                reviewCount: 28,
            },
            {
                name: "Creek",
                image: com5,
                title: "Dubai Creek Harbour",
                rating: 4.5,
                reviewCount: 23,
            },
            {
                name: "Bluewaters",
                image: com4,
                title: "Bluewaters Island",
                rating: 4.6,
                reviewCount: 19,
            },
        ],
    },
];

const TowersAndCompounts: React.FC = () => {
    const locationOptions = useMemo(
        () => [
            { label: "Dubai", value: "Dubai" },
            { label: "Abu Dhabi", value: "Abu Dhabi" },
            { label: "Sharjah", value: "Sharjah" },
        ],
        []
    );
    const sectionGroups = useMemo(() => Alldata.slice(0, 6), []);

    const [locationOpen, setLocationOpen] = useState(false);
    const [locationValue, setLocationValue] = useState<string>("Dubai");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeGroupId, setActiveGroupId] = useState<number>(sectionGroups[0]?.id ?? 1);
    const [isTabsFixed, setIsTabsFixed] = useState(false);
    const [tabsHeight, setTabsHeight] = useState(0);

    const locationDropdownRef = useRef<HTMLDivElement>(null);
    const tabsSectionRef = useRef<HTMLElement | null>(null);
    const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});

    useEffect(() => {
        const updateTabsHeight = () => {
            if (!tabsSectionRef.current) return;
            setTabsHeight(tabsSectionRef.current.offsetHeight);
        };
        updateTabsHeight();
        window.addEventListener("resize", updateTabsHeight);
        return () => window.removeEventListener("resize", updateTabsHeight);
    }, []);

    useEffect(() => {
        const onScroll = () => {
            if (!tabsSectionRef.current) return;
            setIsTabsFixed(window.scrollY >= tabsSectionRef.current.offsetTop);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const syncActiveOnScroll = () => {
            const markerY = (isTabsFixed ? tabsHeight : 0) + 65 + 24;
            let currentId = sectionGroups[0]?.id ?? 1;
            for (const group of sectionGroups) {
                const el = sectionRefs.current[group.id];
                if (!el) continue;
                if (el.getBoundingClientRect().top <= markerY) {
                    currentId = group.id;
                }
            }
            if (currentId !== activeGroupId) {
                setActiveGroupId(currentId);
            }
        };
        window.addEventListener("scroll", syncActiveOnScroll, { passive: true });
        syncActiveOnScroll();
        return () => window.removeEventListener("scroll", syncActiveOnScroll);
    }, [activeGroupId, isTabsFixed, tabsHeight, sectionGroups]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                locationOpen &&
                locationDropdownRef.current &&
                !locationDropdownRef.current.contains(event.target as Node)
            ) {
                setLocationOpen(false);
            }
        };
        if (!locationOpen) return;
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [locationOpen]);

    const selectedLocationLabel =
        locationOptions.find((o) => o.value === locationValue)?.label ?? "Dubai";

    const handleSearch = () => {
        // Future: filter results or navigate with `searchQuery`
    };

    const setSectionRef = (id: number, el: HTMLDivElement | null) => {
        sectionRefs.current[id] = el;
    };

    const scrollToSection = (id: number) => {
        const target = sectionRefs.current[id];
        if (!target) return;
        const offset = (isTabsFixed ? tabsHeight : 0) + 65 + 12;
        const y = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    };

    const handleTabClick = (id: number) => {
        setActiveGroupId(id);
        scrollToSection(id);
    };

    return (
        <>
            <div className="pf-tower-compound">
                <PFContainer>
                    <div className="pf-tower-compound__breadcrumb">
                        <BreadcrumbsComponentSecondLevel
                            breadcrumbTitle="Home"
                            breadcrumbSubTitle1="Area Insights"
                            breadcrumbSubTitle2="Explore Dubai"
                            breadcrumbLinkTitleTo="/"
                            breadcrumbLinkSubTitle1To="/areainsight"
                        />
                    </div>

                    <header className="pf-tower-compound__header">
                        <div className="pf-tower-compound__header-text">
                            <h1 className="pf-tower-compound__title">
                                Residential areas in Dubai
                            </h1>
                            <p className="pf-tower-compound__subtitle">
                                Discover historical prices, reviews, and so much more.
                            </p>
                        </div>
                        <div className="pf-tower-compound__header-location">
                            <span className="pf-tower-compound__location-label">
                                Select location:
                            </span>
                            <Box
                                ref={locationDropdownRef}
                                className="pf-agent-Service__custom-select pf-tower-compound__location-select"
                                style={{ position: "relative" }}
                            >
                                <Box
                                    className="pf-agent-Service__select-btn"
                                    onClick={() => setLocationOpen((p) => !p)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            setLocationOpen((p) => !p);
                                        }
                                    }}
                                    aria-expanded={locationOpen}
                                    aria-haspopup="listbox"
                                    aria-label="Select location"
                                >
                                    <Typography className="pf-agent-Service__name selected">
                                        {selectedLocationLabel}
                                    </Typography>
                                    <DownArrowIconBlack width={13} height={13} />
                                </Box>

                                {locationOpen && (
                                    <Box className="pf-agent-Service__dropdown" role="listbox">
                                        {locationOptions.map((o) => {
                                            const isActive = locationValue === o.value;
                                            return (
                                                <Box
                                                    key={o.value}
                                                    className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""}`}
                                                    onClick={() => {
                                                        setLocationValue(o.value);
                                                        setLocationOpen(false);
                                                    }}
                                                    role="option"
                                                    aria-selected={isActive}
                                                >
                                                    {o.label}
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                )}
                            </Box>
                        </div>
                    </header>

                    <section
                        className="pf-tower-compound__hero"
                        style={{ backgroundImage: `url(${towercompountbg})` }}
                        aria-label="Search towers and compounds"
                    >
                        <div className="pf-tower-compound__hero-overlay" aria-hidden />
                        <div className="pf-tower-compound__hero-wave" aria-hidden />
                        <div className="pf-tower-compound__hero-inner">
                            <h2 className="pf-tower-compound__hero-title">Search here</h2>
                            <div className="pf-tower-compound__search-bar">
                                <SearchIcon className="pf-tower-compound__search-icon" />
                                <input
                                    type="search"
                                    className="pf-tower-compound__search-input"
                                    placeholder="Search for a tower or villa area"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleSearch();
                                        }
                                    }}
                                    aria-label="Search for a tower or villa area"
                                />
                                <button
                                    type="button"
                                    className="pf-tower-compound__search-btn"
                                    onClick={handleSearch}
                                >
                                    Search now
                                </button>
                            </div>
                        </div>
                    </section>
                    <div
                        style={{ height: isTabsFixed ? `${tabsHeight}px` : 0 }}
                        aria-hidden
                    />
                    <section
                        ref={tabsSectionRef}
                        className={`pf-tower-compound__tabs-stick ${isTabsFixed ? "is-fixed" : ""}`}
                        aria-label="Browse areas by category"
                    >
                        <PFContainer>
                            <div className="pf-tower-compound__areas-stack">
                                <div
                                    className="pf-tower-compound__areas-tabs"
                                    role="tablist"
                                    aria-label="Area categories"
                                >
                                    {sectionGroups.map((group) => {
                                        const isActive = activeGroupId === group.id;
                                        return (
                                            <button
                                                key={group.id}
                                                type="button"
                                                role="tab"
                                                id={`tower-tab-${group.id}`}
                                                aria-selected={isActive}
                                                tabIndex={isActive ? 0 : -1}
                                                className={`pf-tower-compound__areas-tab ${isActive ? "is-active" : ""}`}
                                                onClick={() => handleTabClick(group.id)}
                                            >
                                                {tabLabelFromName(group.name)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </PFContainer>
                    </section>
                </PFContainer>
            </div>

            <PFContainer>
                <div id="tower-areas-panel" className="pf-tower-compound__areas-sections">
                    {sectionGroups.map((group) => (
                        <TowerAreasSection
                            key={group.id}
                            group={group}
                            setSectionRef={setSectionRef}
                        />
                    ))}
                </div>
            </PFContainer>
        </>

    );
};

type TowerAreasSectionProps = {
    group: TowerTabGroup;
    setSectionRef: (id: number, el: HTMLDivElement | null) => void;
};

const TowerAreasSection: React.FC<TowerAreasSectionProps> = ({ group, setSectionRef }) => {
    const carouselRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = carouselRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        const max = scrollWidth - clientWidth;
        setCanScrollLeft(scrollLeft > 2);
        setCanScrollRight(scrollLeft < max - 2);
    }, []);

    useEffect(() => {
        const el = carouselRef.current;
        if (!el) return;
        updateScrollState();
        el.addEventListener("scroll", updateScrollState, { passive: true });
        window.addEventListener("resize", updateScrollState);
        return () => {
            el.removeEventListener("scroll", updateScrollState);
            window.removeEventListener("resize", updateScrollState);
        };
    }, [updateScrollState]);

    const scrollCards = (dir: "left" | "right") => {
        const el = carouselRef.current;
        if (!el) return;
        const step = Math.max(280, el.clientWidth * 0.75);
        el.scrollBy({ left: dir === "left" ? -step : step, behavior: "smooth" });
    };

    return (
        <div
            className="pf-tower-compound__areas-panel"
            id={`tower-section-${group.id}`}
            ref={(el) => setSectionRef(group.id, el)}
        >
            <div className="pf-tower-compound__areas-panel-head">
                <div className="pf-tower-compound__areas-panel-text">
                    <h2 className="pf-tower-compound__areas-panel-title">
                        {tabLabelFromName(group.name)}
                    </h2>
                    <p className="pf-tower-compound__areas-panel-subtitle">{group.dec}</p>
                </div>
                <div className="pf-tower-compound__areas-arrows">
                    <button
                        type="button"
                        className="pf-tower-compound__areas-arrow"
                        onClick={() => scrollCards("left")}
                        disabled={!canScrollLeft}
                        aria-label="Previous areas"
                    >
                        <LeftArrowIcon width={18} height={18} fill="#222" />
                    </button>
                    <button
                        type="button"
                        className="pf-tower-compound__areas-arrow"
                        onClick={() => scrollCards("right")}
                        disabled={!canScrollRight}
                        aria-label="Next areas"
                    >
                        <RightArrowIcon width={18} height={18} fill="#222" />
                    </button>
                </div>
            </div>

            <div className="pf-tower-compound__areas-carousel" ref={carouselRef}>
                {group.data.map((row, index) => {
                    const cardKey = `${group.id}-${index}`;
                    return (
                        <article key={cardKey} className="pf-tower-compound__area-card">
                            <img
                                src={row.image}
                                alt={row.title}
                                className="pf-tower-compound__area-card-image"
                            />
                            <span className="pf-tower-compound__area-card-badge">{row.name}</span>
                            <div className="pf-tower-compound__area-card-gradient" aria-hidden />
                            <div className="pf-tower-compound__area-card-body">
                                <h3 className="pf-tower-compound__area-card-title">{row.title}</h3>
                                <div className="pf-tower-compound__area-card-rating">
                                    <Rating
                                        name={`${cardKey}-rating`}
                                        value={row.rating}
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
                                    <span className="pf-tower-compound__area-card-rating-text">
                                        {row.rating.toFixed(1)}/5 based on {row.reviewCount} reviews
                                    </span>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default TowersAndCompounts;
