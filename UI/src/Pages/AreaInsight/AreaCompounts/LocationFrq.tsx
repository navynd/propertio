import React, { useEffect, useMemo, useState } from "react";
import { Rating } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { LeftArrowIcon, RightArrowIcon } from "../../../Components/parts/icon";
import com1 from "../../../assets/img/com1.jpg";
import com2 from "../../../assets/img/com2.jpg";
import com3 from "../../../assets/img/com3.jpg";
import com4 from "../../../assets/img/com4.jpg";
import com5 from "../../../assets/img/com5.jpg";
import "../../../assets/styles/AreaInsight/LocationFrq.scss";

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

const MOBILE_MAX = "767px";
const TABLET_MAX = "991px";

const LocationFrq: React.FC = () => {
    const [openId, setOpenId] = useState<number | null>(2);
    const isMobile = useMediaQuery(`(max-width:${MOBILE_MAX})`);
    const isTablet = useMediaQuery(`(max-width:${TABLET_MAX})`);

    const visibleAlsoCount = isMobile ? 1 : isTablet ? 2 : 4;
    const [alsoStart, setAlsoStart] = useState(0);

    const maxAlsoStart = Math.max(0, AlsoSearchData.length - visibleAlsoCount);

    useEffect(() => {
        setAlsoStart((s) => Math.min(s, maxAlsoStart));
    }, [maxAlsoStart]);

    const visibleAlso = useMemo(
        () => AlsoSearchData.slice(alsoStart, alsoStart + visibleAlsoCount),
        [alsoStart, visibleAlsoCount]
    );

    const goAlsoPrev = () => {
        setAlsoStart((i) => (i <= 0 ? maxAlsoStart : i - 1));
    };

    const goAlsoNext = () => {
        setAlsoStart((i) => (i >= maxAlsoStart ? 0 : i + 1));
    };

    const toggle = (id: number) => {
        setOpenId((current) => (current === id ? null : id));
    };

    const trackClass =
        visibleAlsoCount === 1
            ? "pf-location-also-search__track pf-location-also-search__track--single"
            : visibleAlsoCount === 2
                ? "pf-location-also-search__track pf-location-also-search__track--double"
                : "pf-location-also-search__track";

    return (
        <>
            <section
                className="pf-location-faq"
                aria-labelledby="location-faq-heading"
            >
                <h2 id="location-faq-heading" className="pf-location-faq__title">
                    Frequently asked questions
                </h2>

                <div className="pf-location-faq__list">
                    {FaqData.map((item) => {
                        const isOpen = openId === item.id;
                        const panelId = `faq-panel-${item.id}`;
                        const headerId = `faq-header-${item.id}`;

                        return (
                            <div
                                key={item.id}
                                className={
                                    isOpen
                                        ? "pf-location-faq__item pf-location-faq__item--open"
                                        : "pf-location-faq__item"
                                }
                            >
                                <button
                                    type="button"
                                    id={headerId}
                                    className="pf-location-faq__trigger"
                                    aria-expanded={isOpen}
                                    aria-controls={panelId}
                                    onClick={() => toggle(item.id)}
                                >
                                    <span className="pf-location-faq__question">
                                        {item.question}
                                    </span>
                                    <span className="pf-location-faq__icon" aria-hidden>
                                        {isOpen ? "−" : "+"}
                                    </span>
                                </button>
                                <div
                                    id={panelId}
                                    role="region"
                                    aria-labelledby={headerId}
                                    className="pf-location-faq__panel"
                                    hidden={!isOpen}
                                >
                                    {isOpen && (
                                        <p className="pf-location-faq__answer">
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
                className="pf-location-also-search"
                aria-labelledby="location-also-search-heading"
            >
                <div className="pf-location-also-search__header">
                    <h2
                        id="location-also-search-heading"
                        className="pf-location-also-search__title"
                    >
                        People also search for
                    </h2>
                    <p className="pf-location-also-search__subtitle">
                        People love these, and so will you! Explore the best areas in
                        Dubai.
                    </p>
                </div>

                <div className={trackClass}>
                    {visibleAlso.map((area) => (
                        <article
                            key={area.id}
                            className="pf-location-also-search__card"
                        >
                            <img
                                src={area.image}
                                alt=""
                                className="pf-location-also-search__card-img"
                            />
                            <div
                                className="pf-location-also-search__card-gradient"
                                aria-hidden
                            />
                            <div className="pf-location-also-search__card-meta">
                                <h3 className="pf-location-also-search__card-name">
                                    {area.name}
                                </h3>
                                <div className="pf-location-also-search__card-rating">
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
                                    <span className="pf-location-also-search__card-rating-text">
                                        {area.rating}/5 based on {area.reviewCount}{" "}
                                        reviews
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <div className="pf-location-also-search__footer">
                    <button
                        type="button"
                        className="pf-location-also-search__cta"
                    >
                        See all areas
                    </button>
                    <div className="pf-location-also-search__arrows">
                        <button
                            type="button"
                            className="pf-location-also-search__arrow"
                            onClick={goAlsoPrev}
                            aria-label="Previous areas"
                        >
                            <LeftArrowIcon width={20} height={20} fill="#111" />
                        </button>
                        <button
                            type="button"
                            className="pf-location-also-search__arrow"
                            onClick={goAlsoNext}
                            aria-label="Next areas"
                        >
                            <RightArrowIcon width={20} height={20} fill="#111" />
                        </button>
                    </div>
                </div>
            </section>
        </>
    );
};

export default LocationFrq;
