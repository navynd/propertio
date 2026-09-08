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
            { label: "Dubai", value: "Dubai" },
            { label: "Abu Dhabi", value: "Abu Dhabi" },
            { label: "Sharjah", value: "Sharjah" },
        ],
        []
    );

    const [sortOpen, setSortOpen] = useState(false);
    const [locationOpen, setLocationOpen] = useState(false);
    const [sortValue, setSortValue] = useState<string>("featured");
    const [locationValue, setLocationValue] = useState<string>("Dubai");
    const [isReadMoreOpen, setIsReadMoreOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>("Popular");
    const [activeRecentSearch, setActiveRecentSearch] = useState<string | null>(null);
    const [communityCurrentPage, setCommunityCurrentPage] = useState<number>(1);

    const recentSearches = useMemo(
        () => ["Aenean vel", "Nulla egestas", "Felis", "Praesent sit amet"],
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
        locationOptions.find((o) => o.value === locationValue)?.label ?? "Dubai";

    const communityCards = useMemo(
        () => [
            {
                id: "palm-jumeirah",
                title: "Palm Jumeirah",
                description:
                    "Quisque sapien tellus, tincidunt id libero at, elementum pharetra mi. Curabitur malesuada dui sit ass...",
                ratingValue: 4.8,
                ratingText: "4.8/5",
                reviewsText: "based on 28 reviews",
                pricesDropdownLabel: "Prices for Apartments",
                forSale: "8,500,000 AED",
                forRent: "195,000 AED/year",
                noteText: "* Based on listing prices last 3 months.",
                image: cardImage,
                savedCount: 25,
            },
            {
                id: "palm-jumeirah-2",
                title: "Palm Jumeirah",
                description:
                    "Quisque sapien tellus, tincidunt id libero at, elementum pharetra mi. Cura bitur malesuada dui sit ass...",
                ratingValue: 4.8,
                ratingText: "4.8/5",
                reviewsText: "based on 28 reviews",
                pricesDropdownLabel: "Prices for Apartments",
                forSale: "8,500,000 AED",
                forRent: "195,000 AED/year",
                noteText: "* Based on listing prices last 3 months.",
                image: cardImage2,
                savedCount: 25,
            },
            {
                id: "palm-jumeirah-3",
                title: "Palm Jumeirah",
                description:
                    "Quisque sapien tellus, tincidunt id libero at, elementum pharetra mi. Curabitur malesuada dui sit ass...",
                ratingValue: 4.7,
                ratingText: "4.7/5",
                reviewsText: "based on 21 reviews",
                pricesDropdownLabel: "Prices for Apartments",
                forSale: "8,200,000 AED",
                forRent: "185,000 AED/year",
                noteText: "* Based on listing prices last 3 months.",
                image: cardImage,
                savedCount: 18,
            },
            {
                id: "palm-jumeirah-4",
                title: "Palm Jumeirah",
                description:
                    "Quisque sapien tellus, tincidunt id libero at, elementum pharetra mi. Cura bitur malesuada dui sit ass...",
                ratingValue: 4.6,
                ratingText: "4.6/5",
                reviewsText: "based on 19 reviews",
                pricesDropdownLabel: "Prices for Apartments",
                forSale: "7,900,000 AED",
                forRent: "175,000 AED/year",
                noteText: "* Based on listing prices last 3 months.",
                image: cardImage2,
                savedCount: 12,
            },
            {
                id: "palm-jumeirah-5",
                title: "Palm Jumeirah",
                description:
                    "Quisque sapien tellus, tincidunt id libero at, elementum pharetra mi. Curabitur malesuada dui sit ass...",
                ratingValue: 4.8,
                ratingText: "4.8/5",
                reviewsText: "based on 28 reviews",
                pricesDropdownLabel: "Prices for Apartments",
                forSale: "8,500,000 AED",
                forRent: "195,000 AED/year",
                noteText: "* Based on listing prices last 3 months.",
                image: cardImage,
                savedCount: 25,
            },
            {
                id: "palm-jumeirah-6",
                title: "Palm Jumeirah",
                description:
                    "Quisque sapien tellus, tincidunt id libero at, elementum pharetra mi. Cura bitur malesuada dui sit ass...",
                ratingValue: 4.5,
                ratingText: "4.5/5",
                reviewsText: "based on 16 reviews",
                pricesDropdownLabel: "Prices for Apartments",
                forSale: "7,600,000 AED",
                forRent: "160,000 AED/year",
                noteText: "* Based on listing prices last 3 months.",
                image: cardImage2,
                savedCount: 9,
            },
        ],
        [cardImage, cardImage2]
    );

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
                        breadcrumbSubTitle2="Area Insights"
                        breadcrumbLinkTitleTo="/"
                        breadcrumbLinkSubTitle1To="/areainsight"
                    />
                </div>

                <div className="pf-all-communities__layout">
                    <main className="pf-all-communities__main">
                        <div className="pf-all-communities__title-container">
                            <h1 className="pf-all-communities__title">
                                Best Areas to Live in<br></br>
                                <span className="pf-all-communities__city">Dubai</span>
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
                            Dubai is home to people from different backgrounds and thus, it offers
                            diverse neighborhoods to suit the various tastes and needs of its residents.
                        </p>

                        <p className="pf-all-communities__body">
                            From glittering skyscrapers to spacious villas and beachfront communities,
                            there are plenty of nice places to live in Dubai. Here, you&apos;ll find a mix
                            of luxury and comfort tailored for everyone. Families, couples and working
                            professionals can all find a home in Dubai that suits their lifestyle preferences.
                        </p>

                        <div className="pf-all-communities__body-container">
                            <p className="pf-all-communities__body">
                                The city&apos;s infrastructure makes commuting easy with excellent public transportation
                                options available. Moreover, numerous dining, entertainment, and shopping venues cater
                                to an array of interests, ensuring there&apos;s always something exciting around the corner.
                            </p>
                            {isReadMoreOpen && (
                                <p className="pf-all-communities__body">
                                    Quisque sapien tellus, tincidunt id libero at, elementum pharetra mi.
                                    Cura bitur malesuada dui sit ass...
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
                                            >
                                                Discover properties
                                            </button>
                                            <button
                                                type="button"
                                                className="pf-all-communities__learn-btn"
                                            >
                                                Learn more
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pf-all-communities__community-image-wrap" onClick={() => navigate(`/allcommunitiesdetails`)}>
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
                                placeholder="Search for community"
                            />
                        </div>

                        {/* Recent searches */}
                        <div className="pf-all-communities__block">
                            <div className="pf-all-communities__block-title">Recent searches</div>
                            <div className="pf-all-communities__chips">
                                {recentSearches.map((t) => {
                                    const isActive = activeRecentSearch === t;
                                    return (
                                        <button
                                            key={t}
                                            type="button"
                                            className={`pf-all-communities__chip ${isActive ? "is-active" : ""}`}
                                            onClick={() =>
                                                setActiveRecentSearch((prev) =>
                                                    prev === t ? null : t
                                                )
                                            }
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
