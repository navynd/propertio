import React, { useEffect, useMemo, useState } from "react";
import { Rating, Typography } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import { LeftArrowIcon, RightArrowIcon } from "../../../Components/parts/icon";
import "../../../assets/styles/AreaInsight/AllCommunitiesDetail.scss";
import com1 from "../../../assets/img/com1.jpg";
import com2 from "../../../assets/img/com2.jpg";
import com3 from "../../../assets/img/com3.jpg";
import com4 from "../../../assets/img/com4.jpg";
import com5 from "../../../assets/img/com5.jpg";

const MOBILE_CAROUSEL_MAX = "767px";

const DESKTOP_PROPERTY_CARDS_VISIBLE = 6;

const AREA_NAME = "Palm Jumeirah";

type PropertyLocationCard = {
    id: number;
    name: string;
    image: string;
    rating: number;
    ratingCount: number;
};

type PropertyLocationGroup = {
    name: string;
    data: PropertyLocationCard[];
};

/** Grouped carousel: each group is a tab (e.g. Apartment / Villa) */
const PropertiesData: PropertyLocationGroup[] = [
    {
        name: "Apartment location",
        data: [
            {
                id: 1,
                name: "Palm Jumeirah",
                image: com1,
                rating: 4.8,
                ratingCount: 45,
            },
            {
                id: 2,
                name: "Dubai Marina",
                image: com2,
                rating: 4.7,
                ratingCount: 32,
            },
            {
                id: 3,
                name: "Downtown",
                image: com3,
                rating: 4.6,
                ratingCount: 21,
            },
            {
                id: 4,
                name: "Business Bay",
                image: com4,
                rating: 4.5,
                ratingCount: 18,
            },
            {
                id: 5,
                name: "JBR",
                image: com5,
                rating: 4.9,
                ratingCount: 55,
            },
            {
                id: 6003,
                name: "Dubai Marina Villa",
                image: com3,
                rating: 4.8,
                ratingCount: 10,
            },
            {
                id: 6004,
                name: "Dubai Marina Villa",
                image: com3,
                rating: 4.8,
                ratingCount: 10,
            },
            {
                id: 6005,
                name: "Dubai Marina Villa",
                image: com3,
                rating: 4.8,
                ratingCount: 10,
            },
        ],
    },
    {
        name: "Villa location",
        data: [
            {
                id: 6001,
                name: "Palm Villa",
                image: com1,
                rating: 4.9,
                ratingCount: 12,
            },
            {
                id: 6002,
                name: "Beach Villa",
                image: com2,
                rating: 4.7,
                ratingCount: 8,
            },
        ],
    },
];

const CommunitiesProperti: React.FC = () => {
    const [propertyGroupIndex, setPropertyGroupIndex] = useState(0);
    const [propertyDesktopStart, setPropertyDesktopStart] = useState(0);
    const [propertyMobileIndex, setPropertyMobileIndex] = useState(0);
    const isMobileProperties = useMediaQuery(`(max-width:${MOBILE_CAROUSEL_MAX})`);
    const filteredPropertyLocations = useMemo(
        () => PropertiesData[propertyGroupIndex]?.data ?? [],
        [propertyGroupIndex]
    );

    useEffect(() => {
        setPropertyDesktopStart(0);
        setPropertyMobileIndex(0);
    }, [propertyGroupIndex]);

    const maxPropertyDesktopStart = Math.max(
        0,
        filteredPropertyLocations.length - DESKTOP_PROPERTY_CARDS_VISIBLE
    );

    const visiblePropertyLocations = useMemo(() => {
        if (filteredPropertyLocations.length === 0) return [];
        if (isMobileProperties) {
            const idx = Math.min(
                propertyMobileIndex,
                filteredPropertyLocations.length - 1
            );
            const item = filteredPropertyLocations[idx];
            return item ? [item] : [];
        }
        const start = Math.min(propertyDesktopStart, maxPropertyDesktopStart);
        return filteredPropertyLocations.slice(
            start,
            start + DESKTOP_PROPERTY_CARDS_VISIBLE
        );
    }, [
        filteredPropertyLocations,
        isMobileProperties,
        propertyMobileIndex,
        propertyDesktopStart,
        maxPropertyDesktopStart,
    ]);

    const goPropertyPrev = () => {
        const len = filteredPropertyLocations.length;
        if (len === 0) return;
        if (isMobileProperties) {
            setPropertyMobileIndex((i) => (i <= 0 ? len - 1 : i - 1));
        } else {
            setPropertyDesktopStart((i) =>
                i <= 0 ? maxPropertyDesktopStart : i - 1
            );
        }
    };

    const goPropertyNext = () => {
        const len = filteredPropertyLocations.length;
        if (len === 0) return;
        if (isMobileProperties) {
            setPropertyMobileIndex((i) => (i >= len - 1 ? 0 : i + 1));
        } else {
            setPropertyDesktopStart((i) =>
                i >= maxPropertyDesktopStart ? 0 : i + 1
            );
        }
    };

    const activePropertyGroupName =
        PropertiesData[propertyGroupIndex]?.name ?? "";
    const propertyCtaLabel = activePropertyGroupName
        ? `See all ${activePropertyGroupName.toLowerCase()}`
        : "See all locations";
    return (

        <section
            className="pf-communities-detail__props-loc"
            aria-labelledby="community-props-loc-heading"
        >
            <h2
                id="community-props-loc-heading"
                className="pf-communities-detail__props-loc-title"
            >
                {AREA_NAME} properties location
            </h2>

            <div
                className="pf-communities-detail__props-loc-toggles"
                role="tablist"
                aria-label="Property type"
            >
                {PropertiesData.map((group, idx) => (
                    <button
                        key={`${idx}-${group.name}`}
                        type="button"
                        role="tab"
                        aria-selected={propertyGroupIndex === idx}
                        className={
                            propertyGroupIndex === idx
                                ? "pf-communities-detail__props-loc-toggle pf-communities-detail__props-loc-toggle--active"
                                : "pf-communities-detail__props-loc-toggle"
                        }
                        onClick={() => setPropertyGroupIndex(idx)}
                    >
                        {group.name}
                    </button>
                ))}
            </div>

            <div className="pf-communities-detail__props-loc-carousel">
                <button
                    type="button"
                    className="pf-communities-detail__props-loc-arrow pf-communities-detail__props-loc-arrow--prev"
                    onClick={goPropertyPrev}
                    aria-label="Previous properties"
                >
                    <LeftArrowIcon width={20} height={20} fill="#111" />
                </button>

                <div
                    className={
                        isMobileProperties
                            ? "pf-communities-detail__props-loc-track pf-communities-detail__props-loc-track--single"
                            : "pf-communities-detail__props-loc-track"
                    }
                >
                    {visiblePropertyLocations.map((item) => (
                        <article
                            key={item.id}
                            className="pf-communities-detail__props-loc-card"
                        >
                            <img
                                src={item.image}
                                alt={item.name}
                                className="pf-communities-detail__props-loc-card-img"
                            />
                            <div
                                className="pf-communities-detail__props-loc-card-gradient"
                                aria-hidden
                            />
                            <div className="pf-communities-detail__props-loc-card-meta">
                                <Typography
                                    component="span"
                                    className="pf-communities-detail__props-loc-card-title"
                                >
                                    {item.name}
                                </Typography>
                                <div className="pf-communities-detail__props-loc-card-rating">
                                    <Rating
                                        name={`prop-rating-${item.id}`}
                                        value={item.rating}
                                        readOnly
                                        precision={0.1}
                                        size="small"
                                        sx={{
                                            "& .MuiRating-iconFilled": {
                                                color: "#FFCB2B",
                                            },
                                            "& .MuiRating-iconEmpty": {
                                                color:
                                                    "rgba(255, 203, 43, 0.35)",
                                            },
                                            fontSize: "14px",
                                        }}
                                    />
                                    <span className="pf-communities-detail__props-loc-card-rating-text">
                                        {item.rating}/5
                                        <span className="pf-communities-detail__props-loc-card-rating-count">
                                            ({item.ratingCount})
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                <button
                    type="button"
                    className="pf-communities-detail__props-loc-arrow pf-communities-detail__props-loc-arrow--next"
                    onClick={goPropertyNext}
                    aria-label="Next properties"
                >
                    <RightArrowIcon width={20} height={20} fill="#111" />
                </button>
            </div>

            <div className="pf-communities-detail__props-loc-cta-wrap">
                <button
                    type="button"
                    className="pf-communities-detail__props-loc-cta"
                >
                    {propertyCtaLabel}
                </button>
            </div>
        </section>
    );
};

export default CommunitiesProperti;   
