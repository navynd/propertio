import React, { useEffect, useMemo, useState } from "react";
import { Rating } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
    BathRoomIcon,
    BedRoomIcon,
    LeftArrowIcon,
    LocationIcon,
    RightArrowIcon,
    SqftIcon,
    SuperAgentStarIcon,
    VerifiedBadgeIcon,
} from "../../../Components/parts/icon";
import com1 from "../../../assets/img/com1.jpg";
import com2 from "../../../assets/img/com2.jpg";
import com3 from "../../../assets/img/com3.jpg";
import com4 from "../../../assets/img/com4.jpg";
import com5 from "../../../assets/img/drilldown05.png";
import "../../../assets/styles/AreaInsight/CommunitiesFrq.scss";

export type FaqItem = {
    id: number;
    question: string;
    answer: string;
};

export type AlsoSearchArea = {
    id: number;
    name: string;
    image: string;
    rating: number;
    reviewCount: number;
};

export type FeaturedPropertyCard = {
    id: number;
    title: string;
    image: string;
    location: string;
    beds: number;
    baths: number;
    sqft: string;
    price: string;
    propertyType: string;
    verified: boolean;
    superagent: boolean;
};

const AREA_FEATURED = "Palm Jumeirah";

const FaqData: FaqItem[] = [
    {
        id: 1,
        question: "Is it free to go to Palm Jumeirah?",
        answer:
            "Yes, visiting Palm Jumeirah is free. You can drive onto the island, stroll along The Pointe or the Boardwalk, and enjoy the public areas without any entry fee. However, access to beaches, clubs, and attractions like The View or Aquaventure Waterpark may involve separate charges.",
    },
    {
        id: 2,
        question: "What is special about Palm Jumeirah?",
        answer:
            "It is one of the world's largest man-made islands, shaped like a palm tree, and known for luxury waterfront living, five-star resorts such as Atlantis The Palm, private beaches, and panoramic views of the Arabian Gulf and Dubai skyline.",
    },
    {
        id: 3,
        question: "Is Palm Jumeirah expensive?",
        answer:
            "Property and rental prices on Palm Jumeirah are among the highest in Dubai, reflecting its beachfront location, prestige, and limited supply. Day-to-day costs vary: public areas are free to enjoy, while dining, hotels, and attractions span from mid-range to ultra-luxury.",
    },
    {
        id: 4,
        question: "Who owns Palm Jumeirah?",
        answer:
            "The island was developed by Nakheel, a Dubai government–linked master developer. Individual plots, apartments, and villas are owned by private buyers, investors, and hospitality groups under Dubai's freehold and leasehold regulations.",
    },
];

const AlsoSearchData: AlsoSearchArea[] = [
    {
        id: 1,
        name: "Burj Khalifa",
        image: com1,
        rating: 4.8,
        reviewCount: 28,
    },
    {
        id: 2,
        name: "Dubai Marina",
        image: com2,
        rating: 4.7,
        reviewCount: 42,
    },
    {
        id: 3,
        name: "Downtown Dubai",
        image: com3,
        rating: 4.9,
        reviewCount: 35,
    },
    {
        id: 4,
        name: "Business Bay",
        image: com4,
        rating: 4.6,
        reviewCount: 19,
    },
    {
        id: 5,
        name: "JBR",
        image: com5,
        rating: 4.8,
        reviewCount: 51,
    },
    {
        id: 6,
        name: "Dubai Hills",
        image: com2,
        rating: 4.7,
        reviewCount: 24,
    },
    {
        id: 7,
        name: "Arabian Ranches",
        image: com3,
        rating: 4.8,
        reviewCount: 31,
    },
    {
        id: 8,
        name: "City Walk",
        image: com4,
        rating: 4.5,
        reviewCount: 16,
    },
];

const FeaturedPropertiesData: FeaturedPropertyCard[] = [
    {
        id: 1,
        title: "Omniyat Bespoke | Villa",
        image: com5,
        location: "Dubai, Palm Jumeirah",
        beds: 2,
        baths: 3,
        sqft: "3,832",
        price: "9,000,000 AED",
        propertyType: "VILLA",
        verified: true,
        superagent: true,
    },
    {
        id: 2,
        title: "Signature Villa — Frond K",
        image: com5,
        location: "Dubai, Palm Jumeirah",
        beds: 5,
        baths: 6,
        sqft: "8,200",
        price: "42,000,000 AED",
        propertyType: "VILLA",
        verified: true,
        superagent: true,
    },
    {
        id: 3,
        title: "Marina View Apartment",
        image: com5,
        location: "Dubai, Palm Jumeirah",
        beds: 3,
        baths: 2,
        sqft: "2,450",
        price: "5,500,000 AED",
        propertyType: "APARTMENT",
        verified: true,
        superagent: true,
    },
    {
        id: 4,
        title: "Garden Homes | Townhouse",
        image: com5,
        location: "Dubai, Palm Jumeirah",
        beds: 4,
        baths: 4,
        sqft: "4,100",
        price: "18,900,000 AED",
        propertyType: "VILLA",
        verified: true,
        superagent: true,
    },
    {
        id: 5,
        title: "Oceana Penthouse",
        image: com5,
        location: "Dubai, Palm Jumeirah",
        beds: 4,
        baths: 3,
        sqft: "3,200",
        price: "22,000,000 AED",
        propertyType: "APARTMENT",
        verified: true,
        superagent: true,
    },
    {
        id: 6,
        title: "Canal Cove Villa",
        image: com5,
        location: "Dubai, Palm Jumeirah",
        beds: 6,
        baths: 5,
        sqft: "6,500",
        price: "35,000,000 AED",
        propertyType: "VILLA",
        verified: true,
        superagent: true,
    },
];

const MOBILE_MAX = "767px";
const TABLET_MAX = "991px";

const CommunitiesFrq: React.FC = () => {
    const [openId, setOpenId] = useState<number | null>(2);
    const isMobile = useMediaQuery(`(max-width:${MOBILE_MAX})`);
    const isTablet = useMediaQuery(`(max-width:${TABLET_MAX})`);

    const visibleSlideCount = isMobile ? 1 : isTablet ? 2 : 4;
    const [alsoStart, setAlsoStart] = useState(0);
    const [featuredStart, setFeaturedStart] = useState(0);

    const maxAlsoStart = Math.max(0, AlsoSearchData.length - visibleSlideCount);
    const maxFeaturedStart = Math.max(
        0,
        FeaturedPropertiesData.length - visibleSlideCount
    );

    useEffect(() => {
        setAlsoStart((s) => Math.min(s, maxAlsoStart));
    }, [maxAlsoStart]);

    useEffect(() => {
        setFeaturedStart((s) => Math.min(s, maxFeaturedStart));
    }, [maxFeaturedStart]);

    const visibleAlso = useMemo(
        () => AlsoSearchData.slice(alsoStart, alsoStart + visibleSlideCount),
        [alsoStart, visibleSlideCount]
    );

    const visibleFeatured = useMemo(
        () =>
            FeaturedPropertiesData.slice(
                featuredStart,
                featuredStart + visibleSlideCount
            ),
        [featuredStart, visibleSlideCount]
    );

    const goAlsoPrev = () => {
        setAlsoStart((i) => (i <= 0 ? maxAlsoStart : i - 1));
    };

    const goAlsoNext = () => {
        setAlsoStart((i) => (i >= maxAlsoStart ? 0 : i + 1));
    };

    const goFeaturedPrev = () => {
        setFeaturedStart((i) => (i <= 0 ? maxFeaturedStart : i - 1));
    };

    const goFeaturedNext = () => {
        setFeaturedStart((i) => (i >= maxFeaturedStart ? 0 : i + 1));
    };

    const toggle = (id: number) => {
        setOpenId((current) => (current === id ? null : id));
    };

    const alsoTrackClass =
        visibleSlideCount === 1
            ? "pf-communities-also-search__track pf-communities-also-search__track--single"
            : visibleSlideCount === 2
                ? "pf-communities-also-search__track pf-communities-also-search__track--double"
                : "pf-communities-also-search__track";

    const featuredTrackClass =
        visibleSlideCount === 1
            ? "pf-communities-featured__track pf-communities-featured__track--single"
            : visibleSlideCount === 2
                ? "pf-communities-featured__track pf-communities-featured__track--double"
                : "pf-communities-featured__track";

    return (
        <>
            <section
                className="pf-communities-faq"
                aria-labelledby="communities-faq-heading"
            >
                <h2 id="communities-faq-heading" className="pf-communities-faq__title">
                    Frequently asked questions
                </h2>

                <div className="pf-communities-faq__list">
                    {FaqData.map((item) => {
                        const isOpen = openId === item.id;
                        const panelId = `faq-panel-${item.id}`;
                        const headerId = `faq-header-${item.id}`;

                        return (
                            <div
                                key={item.id}
                                className={
                                    isOpen
                                        ? "pf-communities-faq__item pf-communities-faq__item--open"
                                        : "pf-communities-faq__item"
                                }
                            >
                                <button
                                    type="button"
                                    id={headerId}
                                    className="pf-communities-faq__trigger"
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    onClick={() => toggle(item.id)}
                                >
                                    <span className="pf-communities-faq__question">
                                        {item.question}
                                    </span>
                                    <span className="pf-communities-faq__icon" aria-hidden>
                                        {isOpen ? "−" : "+"}
                                    </span>
                                </button>
                                <div
                                    id={panelId}
                                    role="region"
                                    aria-labelledby={headerId}
                                    className="pf-communities-faq__panel"
                                    hidden={!isOpen}
                                >
                                    {isOpen && (
                                        <p className="pf-communities-faq__answer">
                                            {item.answer}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section
                className="pf-communities-also-search"
                aria-labelledby="communities-also-search-heading"
            >
                <div className="pf-communities-also-search__header">
                    <h2
                        id="communities-also-search-heading"
                        className="pf-communities-also-search__title"
                    >
                        People also search for
                    </h2>
                    <p className="pf-communities-also-search__subtitle">
                        People love these, and so will you! Explore the best areas in
                        Dubai.
                    </p>
                </div>

                <div className={alsoTrackClass}>
                    {visibleAlso.map((area) => (
                        <article
                            key={area.id}
                            className="pf-communities-also-search__card"
                        >
                            <img
                                src={area.image}
                                alt=""
                                className="pf-communities-also-search__card-img"
                            />
                            <div
                                className="pf-communities-also-search__card-gradient"
                                aria-hidden
                            />
                            <div className="pf-communities-also-search__card-meta">
                                <h3 className="pf-communities-also-search__card-name">
                                    {area.name}
                                </h3>
                                <div className="pf-communities-also-search__card-rating">
                                    <Rating
                                        name={`also-search-${area.id}`}
                                        value={area.rating}
                                        readOnly
                                        precision={0.1}
                                        size="small"
                                        sx={{
                                            "& .MuiRating-iconFilled": {
                                                color: "#FFCB2B",
                                            },
                                            "& .MuiRating-iconEmpty": {
                                                color: "rgba(255, 203, 43, 0.35)",
                                            },
                                            fontSize: "14px",
                                        }}
                                    />
                                    <span className="pf-communities-also-search__card-rating-text">
                                        {area.rating}/5 based on {area.reviewCount}{" "}
                                        reviews
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="pf-communities-also-search__footer">
                    <button
                        type="button"
                        className="pf-communities-also-search__cta"
                    >
                        See all areas
                    </button>
                    <div className="pf-communities-also-search__arrows">
                        <button
                            type="button"
                            className="pf-communities-also-search__arrow"
                            onClick={goAlsoPrev}
                            aria-label="Previous areas"
                        >
                            <LeftArrowIcon width={20} height={20} fill="#111" />
                        </button>
                        <button
                            type="button"
                            className="pf-communities-also-search__arrow"
                            onClick={goAlsoNext}
                            aria-label="Next areas"
                        >
                            <RightArrowIcon width={20} height={20} fill="#111" />
                        </button>
                    </div>
                </div>
            </section>

            <section
                className="pf-communities-featured"
                aria-labelledby="communities-featured-heading"
            >
                <div className="pf-communities-featured__header">
                    <h2
                        id="communities-featured-heading"
                        className="pf-communities-featured__title"
                    >
                        Explore properties in {AREA_FEATURED} that match your interest
                    </h2>
                    <p className="pf-communities-featured__subtitle">
                        People love these, and so will you! Explore the best areas in
                        Dubai.
                    </p>
                </div>

                <div className={featuredTrackClass}>
                    {visibleFeatured.map((p) => (
                        <article
                            key={p.id}
                            className="pf-communities-featured__card"
                        >
                            <div className="pf-communities-featured__media">
                                <img
                                    src={p.image}
                                    alt=""
                                    className="pf-communities-featured__img"
                                />
                                <div className="pf-communities-featured__badges">
                                    {p.verified && (
                                        <span className="pf-communities-featured__badge pf-communities-featured__badge--verified">
                                            <VerifiedBadgeIcon width={10} height={12} />
                                            VERIFIED
                                        </span>
                                    )}
                                    {p.superagent && (
                                        <span className="pf-communities-featured__badge pf-communities-featured__badge--superagent">
                                            <SuperAgentStarIcon width={9} height={10} />
                                            SUPERAGENT
                                        </span>
                                    )}
                                    <span className="pf-communities-featured__badge pf-communities-featured__badge--type">
                                        {p.propertyType}
                                    </span>
                                </div>
                            </div>
                            <div className="pf-communities-featured__body">
                                <h3 className="pf-communities-featured__card-title">
                                    {p.title}
                                </h3>
                                <div className="pf-communities-featured__location">
                                    <LocationIcon width={12} height={14} />
                                    <span>{p.location}</span>
                                </div>
                                <div className="pf-communities-featured__specs">
                                    <span className="pf-communities-featured__spec">
                                        <BedRoomIcon width={14} height={14} />
                                        {p.beds} Bed
                                    </span>
                                    <span className="pf-communities-featured__spec">
                                        <BathRoomIcon width={13} height={12} />
                                        {p.baths} Bath
                                    </span>
                                    <span className="pf-communities-featured__spec">
                                        <SqftIcon width={12} height={12} />
                                        {p.sqft} sqft
                                    </span>
                                </div>
                                <div className="pf-communities-featured__price-block">
                                    <span className="pf-communities-featured__price-label">
                                        Price
                                    </span>
                                    <span className="pf-communities-featured__price-value">
                                        {p.price}
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="pf-communities-featured__footer">
                    <button
                        type="button"
                        className="pf-communities-featured__cta"
                    >
                        See all Properties
                    </button>
                    <div className="pf-communities-featured__arrows">
                        <button
                            type="button"
                            className="pf-communities-featured__arrow"
                            onClick={goFeaturedPrev}
                            aria-label="Previous properties"
                        >
                            <LeftArrowIcon width={20} height={20} fill="#111" />
                        </button>
                        <button
                            type="button"
                            className="pf-communities-featured__arrow"
                            onClick={goFeaturedNext}
                            aria-label="Next properties"
                        >
                            <RightArrowIcon width={20} height={20} fill="#111" />
                        </button>
                    </div>
                </div>
            </section>
        </>
    );
};

export default CommunitiesFrq;
