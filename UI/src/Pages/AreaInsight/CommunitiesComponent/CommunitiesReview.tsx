import React, { useEffect, useMemo, useState } from "react";
import { Rating } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { LeftArrowIcon, RightArrowIcon } from "../../../Components/parts/icon";
import "../../../assets/styles/AreaInsight/CommunitiesReview.scss";
import { useNavigate } from "react-router-dom";

const MOBILE_MAX = "767px";
const TABLET_MAX = "991px";

const READ_MORE_MIN_CHARS = 190;

export type ResidentReview = {
    id: number;
    title: string;
    rating: number;
    propertyName: string;
    body: string;
    postedAgo: string;
    author: string;
};

/** Carousel source */
const ReviewsData: ResidentReview[] = [
    {
        id: 1,
        title: "Excellent amenities & beach access",
        rating: 4.8,
        propertyName: "Sofitel Luxury Residences",
        body: "Exceptional resort living with private beachfront access, impeccable concierge support, and temperature-controlled infinity pools. The location and service exceeded all expectations.",
        postedAgo: "5 days ago",
        author: "Susheel Hrishikesh",
    },
    {
        id: 2,
        title: "Tanzanite Tiara Residences",
        rating: 4.8,
        propertyName: "Tiara Residences",
        body: "Spacious layout with high ceilings and panoramic views of the Arabian Gulf. The building management is remarkably proactive and the grounds are pristine year-round.",
        postedAgo: "2 weeks ago",
        author: "Maria K.",
    },
    {
        id: 3,
        title: "Great sea views",
        rating: 4.9,
        propertyName: "Oceana Residences",
        body: "Quiet frond, friendly security, and sunset views every evening. Groceries and cafés on the trunk are a short drive away.",
        postedAgo: "1 month ago",
        author: "James T.",
    },
    {
        id: 4,
        title: "Family-friendly area",
        rating: 4.7,
        propertyName: "Shoreline Apartments",
        body: "Kids love the beach clubs and the boardwalk. We moved here last year and the community is welcoming with plenty of activities year-round.",
        postedAgo: "3 days ago",
        author: "Elena R.",
    },
    {
        id: 5,
        title: "Premium finishings",
        rating: 5,
        propertyName: "Atlantis The Royal Residences",
        body: "Interior quality and concierge services are outstanding. Maintenance responds quickly and the building standards feel truly five-star.",
        postedAgo: "6 days ago",
        author: "Omar A.",
    },
];

function previewText(full: string, maxChars: number): string {
    if (full.length <= maxChars) return full;
    const slice = full.slice(0, maxChars).trimEnd();
    const lastSpace = slice.lastIndexOf(" ");
    const base = lastSpace > 80 ? slice.slice(0, lastSpace) : slice;
    return `${base}…`;
}

const CommunitiesReview: React.FC = () => {
    const navigate = useNavigate();
    const isMobile = useMediaQuery(`(max-width:${MOBILE_MAX})`);
    const isTablet = useMediaQuery(`(max-width:${TABLET_MAX})`);

    const visibleCount = isMobile ? 1 : isTablet ? 2 : 3;

    const [startIndex, setStartIndex] = useState(0);
    const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});

    const maxStart = Math.max(0, ReviewsData.length - visibleCount);

    useEffect(() => {
        setStartIndex((s) => Math.min(s, maxStart));
    }, [maxStart]);

    const visibleReviews = useMemo(() => {
        return ReviewsData.slice(startIndex, startIndex + visibleCount);
    }, [startIndex, visibleCount]);

    const goPrev = () => {
        setStartIndex((i) => (i <= 0 ? maxStart : i - 1));
    };

    const goNext = () => {
        setStartIndex((i) => (i >= maxStart ? 0 : i + 1));
    };

    const toggleReadMore = (id: number) => {
        setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const trackClass =
        visibleCount === 1
            ? "pf-communities-review__track pf-communities-review__track--single"
            : visibleCount === 2
                ? "pf-communities-review__track pf-communities-review__track--double"
                : "pf-communities-review__track";

    return (
        <section
            className="pf-communities-review"
            aria-labelledby="communities-reviews-heading"
        >
            <h2
                id="communities-reviews-heading"
                className="pf-communities-review__title"
            >
                Reviews from residents
            </h2>

            <div className={trackClass}>
                {visibleReviews.map((item) => {
                    const isExpanded = expandedIds[item.id] === true;
                    const needsReadMore = item.body.length > READ_MORE_MIN_CHARS;
                    const displayBody =
                        !needsReadMore || isExpanded
                            ? item.body
                            : previewText(item.body, READ_MORE_MIN_CHARS);

                    return (
                        <article
                            key={item.id}
                            className="pf-communities-review__card"
                            onClick={() => navigate(`/reviewdetails`)}
                        >
                            <h3 className="pf-communities-review__card-title">
                                {item.title}
                            </h3>
                            <div className="pf-communities-review__rating-row">
                                <Rating
                                    name={`review-rating-${item.id}`}
                                    value={item.rating}
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
                                        fontSize: "16px",
                                    }}
                                />
                                <span className="pf-communities-review__rating-text">
                                    {item.rating}/5
                                </span>
                            </div>
                            <p className="pf-communities-review__property">
                                {item.propertyName}
                            </p>
                            <div className="pf-communities-review__body">
                                {displayBody}
                                {needsReadMore && (
                                    <>
                                        {" "}
                                        <button
                                            type="button"
                                            className="pf-communities-review__read-more"
                                            onClick={() => toggleReadMore(item.id)}
                                            aria-expanded={isExpanded}
                                        >
                                            {isExpanded ? "Read less" : "Read more"}
                                        </button>
                                    </>
                                )}
                            </div>
                            <footer className="pf-communities-review__footer">
                                Posted {item.postedAgo} by {item.author}
                            </footer>
                        </article>
                    );
                })}
            </div>

            <div className="pf-communities-review__nav-bottom">
                <button
                    type="button"
                    className="pf-communities-review__arrow"
                    onClick={goPrev}
                    aria-label="Previous reviews"
                >
                    <LeftArrowIcon width={20} height={20} fill="#111" />
                </button>
                <button
                    type="button"
                    className="pf-communities-review__arrow"
                    onClick={goNext}
                    aria-label="Next reviews"
                >
                    <RightArrowIcon width={20} height={20} fill="#111" />
                </button>
            </div>
        </section>
    );
};

export default CommunitiesReview;
