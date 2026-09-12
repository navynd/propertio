import React, { useEffect, useMemo, useRef, useState } from "react";
import { Box, Rating, Typography } from "@mui/material";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../Components/parts/component";
import { DownArrowIconBlack, SearchIcon } from "../../Components/parts/icon";
import cardImage from '../../assets/img/areacard1.jpg'
import cardImage2 from '../../assets/img/areacard1.jpg'
import likeIcon from "../../assets/img/gallerywhite.svg";
import PFPagination from "../../Components/pagination/PFPagination";
import "../../assets/styles/AreaInsight/AllCommunities.scss";
import { useNavigate } from "react-router-dom";

const AllCommunities: React.FC = () => {
    const navigate = useNavigate();
    const sortOptions = useMemo(
        () => [
            { label: "Featured", value: "featured" },
            { label: "Latest", value: "latest" },
            { label: "Most popular", value: "popular" },
        ],
        []
    );

    const locationOptions = useMemo(
        () => [
            { label: "All Destinations", value: "All" },
            { label: "Dubai", value: "Dubai" },
            { label: "London", value: "London" },
            { label: "New York", value: "New York" },
            { label: "Paris", value: "Paris" },
            { label: "Abu Dhabi", value: "Abu Dhabi" },
            { label: "Miami", value: "Miami" },
        ],
        []
    );

    const [sortOpen, setSortOpen] = useState(false);
    const [locationOpen, setLocationOpen] = useState(false);
    const [sortValue, setSortValue] = useState<string>("featured");
    const [locationValue, setLocationValue] = useState<string>("All");
    const [isReadMoreOpen, setIsReadMoreOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>("Popular");
    const [activeRecentSearch, setActiveRecentSearch] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [communityCurrentPage, setCommunityCurrentPage] = useState<number>(1);

    const recentSearches = useMemo(
        () => [
            "Palm Jumeirah",
            "Mayfair London",
            "Tribeca NYC",
            "Downtown Dubai",
            "Le Marais Paris",
            "South Beach Miami",
        ],
        []
    );

    const sortDropdownRef = useRef<HTMLDivElement>(null);
    const locationDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                sortOpen &&
                sortDropdownRef.current &&
                !sortDropdownRef.current.contains(event.target as Node)
            ) {
                setSortOpen(false);
            }
        };
        if (!sortOpen) return;
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [sortOpen]);

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

    const selectedSortLabel =
        sortOptions.find((o) => o.value === sortValue)?.label ?? "Featured";
    const selectedLocationLabel =
        locationOptions.find((o) => o.value === locationValue)?.label ?? "All Destinations";

    const allCommunityCards = useMemo(
        () => [
            {
                id: "palm-jumeirah",
                title: "Palm Jumeirah",
                city: "Dubai",
                category: "Luxury",
                description:
                    "Iconic waterfront living featuring world-class private beachfront villas, five-star resorts, and panoramic Arabian Gulf skyline views.",
                ratingValue: 4.9,
                ratingText: "4.9/5",
                reviewsText: "based on 142 reviews",
                pricesDropdownLabel: "Prices for Apartments & Villas",
                forSale: "AED 8,500,000",
                forRent: "AED 210,000/year",
                noteText: "* Based on verified market listings across top brokerages.",
                image: cardImage,
                savedCount: 128,
            },
            {
                id: "mayfair-london",
                title: "Mayfair",
                city: "London",
                category: "Luxury",
                description:
                    "London's most prestigious heritage district, renowned for Georgian garden squares, Michelin-starred culinary dining, and elite embassies.",
                ratingValue: 4.9,
                ratingText: "4.9/5",
                reviewsText: "based on 96 reviews",
                pricesDropdownLabel: "Prices for Prime Residences",
                forSale: "£4,250,000",
                forRent: "£9,800/month",
                noteText: "* Prime Central London registry market data.",
                image: cardImage2,
                savedCount: 94,
            },
            {
                id: "tribeca-new-york",
                title: "Tribeca & SoHo",
                city: "New York",
                category: "Popular",
                description:
                    "Manhattan's premier historic cobblestone district with iconic cast-iron architecture, designer boutiques, and luxury loft penthouses.",
                ratingValue: 4.8,
                ratingText: "4.8/5",
                reviewsText: "based on 118 reviews",
                pricesDropdownLabel: "Prices for Designer Condos",
                forSale: "$5,600,000",
                forRent: "$14,500/month",
                noteText: "* NYC Real Estate Board verified quarterly benchmark.",
                image: cardImage,
                savedCount: 87,
            },
            {
                id: "downtown-dubai",
                title: "Downtown Dubai",
                city: "Dubai",
                category: "Popular",
                description:
                    "The vibrant epicenter of Dubai, home to the Burj Khalifa, the Dubai Mall, and breathtaking fountain views surrounded by luxury towers.",
                ratingValue: 4.8,
                ratingText: "4.8/5",
                reviewsText: "based on 210 reviews",
                pricesDropdownLabel: "Prices for High-Rise Apartments",
                forSale: "AED 3,400,000",
                forRent: "AED 160,000/year",
                noteText: "* Based on DLD verified transactions.",
                image: cardImage2,
                savedCount: 156,
            },
            {
                id: "le-marais-paris",
                title: "Le Marais & 8th Arrondissement",
                city: "Paris",
                category: "Luxury",
                description:
                    "Haussmannian elegance steeped in rich Parisian culture, historic art galleries, serene courtyards, and world-class haute couture.",
                ratingValue: 4.9,
                ratingText: "4.9/5",
                reviewsText: "based on 84 reviews",
                pricesDropdownLabel: "Prices for Haussmannian Apartments",
                forSale: "€3,900,000",
                forRent: "€8,200/month",
                noteText: "* Notaires de France prime residential data.",
                image: cardImage,
                savedCount: 79,
            },
            {
                id: "south-beach-miami",
                title: "South Beach & Brickell",
                city: "Miami",
                category: "Lifestyle & Demographics",
                description:
                    "Sunny oceanfront luxury paired with Miami's vibrant international financial center, tropical modern penthouses, and marina access.",
                ratingValue: 4.7,
                ratingText: "4.7/5",
                reviewsText: "based on 73 reviews",
                pricesDropdownLabel: "Prices for Waterfront Condos",
                forSale: "$2,800,000",
                forRent: "$7,500/month",
                noteText: "* South Florida MLS verified benchmark.",
                image: cardImage2,
                savedCount: 65,
            },
        ],
        [cardImage, cardImage2]
    );

    const communityCards = useMemo(() => {
        return allCommunityCards.filter((card) => {
            const matchesCity = locationValue === "All" || card.city.toLowerCase() === locationValue.toLowerCase();
            const matchesSearch =
                !searchQuery ||
                card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                card.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCity && matchesSearch;
        });
    }, [allCommunityCards, locationValue, searchQuery]);

    const COMMUNITY_PAGE_SIZE = 2;
    const communityTotalPages = Math.max(
        1,
        Math.ceil(communityCards.length / COMMUNITY_PAGE_SIZE)
    );
    const communityVisibleCards = communityCards.slice(
        (communityCurrentPage - 1) * COMMUNITY_PAGE_SIZE,
        communityCurrentPage * COMMUNITY_PAGE_SIZE
    );

    return (
        <div className="pf-all-communities">
            <PFContainer>
                <div className="pf-all-communities__breadcrumb">
                    <BreadcrumbsComponentSecondLevel
                        breadcrumbTitle="Home"
                        breadcrumbSubTitle1="Area Insights"
                        breadcrumbSubTitle2="Global Communities"
                        breadcrumbLinkTitleTo="/"
                        breadcrumbLinkSubTitle1To="/areainsight"
                    />
                </div>

                <div className="pf-all-communities__layout">
                    <main className="pf-all-communities__main">
                        <div className="pf-all-communities__title-container">
                            <h1 className="pf-all-communities__title">
                                Prime Neighborhoods to Live in<br></br>
                                <span className="pf-all-communities__city">
                                    {locationValue === "All" ? "Top Global Destinations" : locationValue}
                                </span>
                            </h1>
                            <div className="pf-all-communities__title-row">
                                <div className="pf-all-communities__title-label">Sort by :</div>
                                <Box
                                    ref={sortDropdownRef}
                                    className="pf-agent-Service__custom-select"
                                    style={{ position: "relative" }}
                                >
                                    <Box
                                        className="pf-agent-Service__select-btn"
                                        onClick={() => {
                                            setSortOpen((p) => !p);
                                            setLocationOpen(false);
                                        }}
                                        role="button"
                                        tabIndex={0}
                                        aria-expanded={sortOpen}
                                        aria-haspopup="listbox"
                                        aria-label="Sort by"
                                    >
                                        <Typography className="pf-agent-Service__name selected">
                                            {selectedSortLabel}
                                        </Typography>
                                        <DownArrowIconBlack width={13} height={13} />
                                    </Box>

                                    {sortOpen && (
                                        <Box
                                            className="pf-agent-Service__dropdown"
                                            role="listbox"
                                        >
                                            {sortOptions.map((o) => {
                                                const isActive = sortValue === o.value;
                                                return (
                                                    <Box
                                                        key={o.value}
                                                        className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""}`}
                                                        onClick={() => {
                                                            setSortValue(o.value);
                                                            setSortOpen(false);
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
                        </div>


                        <p className="pf-all-communities__subtitle">
                            Discover the most coveted residential communities, historic districts, and iconic waterfront enclaves across the world&apos;s leading capital cities.
                        </p>

                        <p className="pf-all-communities__body">
                            From glittering skyscrapers and beachfront villas to historic brownstones and Haussmannian residences, our curated global community guides give you deep insights into neighborhood lifestyles, pricing trends, top schools, and transit links.
                        </p>

                        <div className="pf-all-communities__body-container">
                            <p className="pf-all-communities__body">
                                Each destination is evaluated with real-time transactional registry benchmarks, helping discerning international buyers, expatriates, and investors make informed property decisions with absolute confidence.
                            </p>
                            {isReadMoreOpen && (
                                <p className="pf-all-communities__body">
                                    Explore average rental yields, capital growth records, community amenities, and bespoke architectural developments with verified local brokerage representation.
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            className="pf-all-communities__read-more"
                            onClick={() => setIsReadMoreOpen((p) => !p)}
                        >
                            {isReadMoreOpen ? "Read less" : "Read more"}{" "}
                            <span className="pf-all-communities__read-more-arrow">
                                <DownArrowIconBlack />
                            </span>
                        </button>


                        {/*Card section*/}
                        <div className="pf-all-communities__cards" aria-label="Community listings">
                            {communityVisibleCards.map((c) => (
                                <div key={c.id} className="pf-all-communities__community-card">
                                    <div className="pf-all-communities__community-content">
                                        <h3 className="pf-all-communities__community-title">
                                            {c.title}
                                        </h3>
                                        <p className="pf-all-communities__community-description">
                                            {c.description}
                                        </p>

                                        <div className="pf-all-communities__community-rating">
                                            <Rating
                                                name={`${c.id}-rating`}
                                                value={c.ratingValue}
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
                                            <span className="pf-all-communities__community-rating-text">
                                                {c.ratingText}{" "}
                                                <span className="pf-all-communities__community-rating-reviews">
                                                    {c.reviewsText}
                                                </span>
                                            </span>
                                        </div>

                                        <div className="pf-all-communities__prices-dropdown">
                                            <div className="pf-all-communities__prices-dropdown-label">
                                                Prices for
                                            </div>
                                            <div className="pf-all-communities__prices-dropdown-label-value">
                                                Apartments
                                                <DownArrowIconBlack width={10} height={10} className="pf-all-communities__prices-dropdown-label-value-arrow" />
                                            </div>
                                        </div>

                                        <div className="pf-all-communities__prices-rows">
                                            <div className="pf-all-communities__price-row">
                                                <span className="pf-all-communities__price-label">
                                                    For sale
                                                </span>
                                                <span className="pf-all-communities__price-value">
                                                    {c.forSale}
                                                </span>
                                            </div>
                                            <div className="pf-all-communities__price-row">
                                                <span className="pf-all-communities__price-label">
                                                    For rent
                                                </span>
                                                <span className="pf-all-communities__price-value">
                                                    {c.forRent}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="pf-all-communities__listing-note">{c.noteText}</p>

                                        <div className="pf-all-communities__community-actions">
                                            <button
                                                type="button"
                                                className="pf-all-communities__discover-btn"
                                                onClick={() => navigate(`/searchlisting?destination=${encodeURIComponent(c.city)}`)}
                                            >
                                                Discover properties
                                            </button>
                                            <button
                                                type="button"
                                                className="pf-all-communities__learn-btn"
                                                onClick={() => navigate(`/allcommunitiesdetails`)}
                                            >
                                                Learn more
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        className="pf-all-communities__community-image-wrap"
                                        onClick={() => navigate(`/allcommunitiesdetails`)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <img
                                            src={c.image}
                                            alt={c.title}
                                            className="pf-all-communities__community-image"
                                        />
                                        <div className="pf-all-communities__community-saved">
                                            <img
                                                src={likeIcon}
                                                alt="saved"
                                                className="pf-all-communities__community-saved-icon"
                                            />
                                            {c.savedCount}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {communityTotalPages > 1 && (
                            <div className="pf-all-communities__pagination">
                                <PFPagination
                                    currentPage={communityCurrentPage}
                                    totalPages={communityTotalPages}
                                    onPageChange={setCommunityCurrentPage}
                                />
                            </div>
                        )}
                    </main>

                    <aside className="pf-all-communities__sidebar">
                        <div className="pf-all-communities__sidebar-row">
                            <Box
                                ref={locationDropdownRef}
                                className="pf-agent-Service__custom-select"
                                style={{ position: "relative" }}
                            >
                                <Box
                                    className="pf-agent-Service__select-btn"
                                    onClick={() => {
                                        setLocationOpen((p) => !p);
                                        setSortOpen(false);
                                    }}
                                    role="button"
                                    tabIndex={0}
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
                                    <Box
                                        className="pf-agent-Service__dropdown"
                                        role="listbox"
                                    >
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

                        <div className="pf-all-communities__search">
                            <SearchIcon className="pf-all-communities__search-icon" />
                            <input
                                type="text"
                                className="pf-all-communities__search-input"
                                placeholder="Search for community or city"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCommunityCurrentPage(1);
                                }}
                            />
                        </div>

                        {/* Recent searches */}
                        <div className="pf-all-communities__block">
                            <div className="pf-all-communities__block-title">Popular searches</div>
                            <div className="pf-all-communities__chips">
                                {recentSearches.map((t) => {
                                    const isActive = activeRecentSearch === t || searchQuery === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            className={`pf-all-communities__chip ${isActive ? "is-active" : ""}`}
                                            onClick={() => {
                                                if (searchQuery === t) {
                                                    setSearchQuery("");
                                                    setActiveRecentSearch(null);
                                                } else {
                                                    setSearchQuery(t);
                                                    setActiveRecentSearch(t);
                                                }
                                                setCommunityCurrentPage(1);
                                            }}
                                        >
                                            {t}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="pf-all-communities__block">
                            <div className="pf-all-communities__block-title">Categories</div>
                            <ul className="pf-all-communities__categories">
                                {[
                                    "Popular",
                                    "Budget-Friendly",
                                    "Eco & Sustainability",
                                    "Expats",
                                    "Family Friendly",
                                    "Green Areas",
                                    "Investment",
                                    "Lifestyle & Demographics",
                                    "Luxury",
                                    "Pet-Friendly",
                                    "Proximity",
                                    "Security & Safety",
                                    "Lifestyle & Demographics",
                                ].map((label) => {
                                    const isActive = activeCategory === label;
                                    return (
                                        <li
                                            key={label}
                                            className="pf-all-communities__category"
                                            onClick={() => setActiveCategory(label)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    setActiveCategory(label);
                                                }
                                            }}
                                            aria-pressed={isActive}
                                        >
                                            {isActive && (
                                                <span
                                                    className="pf-all-communities__category-arrow is-active"
                                                    aria-hidden
                                                >
                                                    ›
                                                </span>
                                            )}
                                            <span
                                                className={`pf-all-communities__category-text ${isActive ? "is-active" : ""
                                                    }`}
                                            >
                                                {label}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </aside>
                </div>
            </PFContainer>
        </div>
    );
};

export default AllCommunities;
