import React, { useMemo, useState } from "react";
import {
    DownArrowIconBlack,
} from "../../../Components/parts/icon";
import "../../../assets/styles/AreaInsight/LocationDetails.scss";

type PoiItem = { name: string; distance: string };

type PoiCategory = {
    id: string;
    label: string;
    items: PoiItem[];
    moreItems: PoiItem[];
};

const POI_CATEGORIES: PoiCategory[] = [
    {
        id: "restaurants",
        label: "RESTAURANTS",
        items: [
            { name: "San Beach", distance: "205 m" },
            { name: "Akira Back", distance: "360 m" },
            { name: "Mott 32", distance: "490 m" },
        ],
        moreItems: [
            { name: "Zuma", distance: "620 m" },
            { name: "Nusr-Et", distance: "780 m" },
        ],
    },
    {
        id: "groceries",
        label: "GROCERIES",
        items: [
            { name: "Spinneys", distance: "120 m" },
            { name: "Choithrams", distance: "280 m" },
            { name: "Carrefour", distance: "410 m" },
        ],
        moreItems: [
            { name: "Waitrose", distance: "550 m" },
            { name: "Zoom", distance: "190 m" },
        ],
    },
    {
        id: "schools",
        label: "SCHOOLS",
        items: [
            { name: "GEMS Wellington", distance: "1.2 km" },
            { name: "Dubai College", distance: "2.1 km" },
            { name: "King's School", distance: "1.8 km" },
        ],
        moreItems: [
            { name: "Repton School", distance: "3.4 km" },
        ],
    },
    {
        id: "hospitals",
        label: "HOSPITALS",
        items: [
            { name: "Saudi German Hospital", distance: "2.5 km" },
            { name: "Mediclinic", distance: "3.1 km" },
            { name: "Al Zahra Hospital", distance: "4.0 km" },
        ],
        moreItems: [
            { name: "Aster Clinic", distance: "1.1 km" },
        ],
    },
    {
        id: "religious",
        label: "RELIGIOUS",
        items: [
            { name: "Mosque — Palm Jumeirah", distance: "800 m" },
            { name: "St. Mary’s Church", distance: "5.2 km" },
            { name: "Hindu Temple", distance: "6.1 km" },
        ],
        moreItems: [
            { name: "Gurudwara", distance: "7.0 km" },
        ],
    },
];

const LOCATION_NAME = "Seven Palm";

const LocationNearKey: React.FC = () => {
    const [imageIndex, setImageIndex] = useState(0);
    const [poiExpanded, setPoiExpanded] = useState<Record<string, boolean>>({});




    const togglePoiCategory = (id: string) => {
        setPoiExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <section className="pf-location-details__near-key" aria-label="Nearby and key information">
            <div className="pf-location-details__poi">
                <div className="pf-location-details__poi-header">
                    <h2 className="pf-location-details__poi-title">
                        Nearest points of interest
                    </h2>
                    <p className="pf-location-details__poi-disclaimer">
                        All distances are measured in straight lines. Actual travel
                        distances may vary.
                    </p>
                </div>

                <div className="pf-location-details__poi-grid">
                    {POI_CATEGORIES.map((cat) => {
                        const expanded = !!poiExpanded[cat.id];
                        const visibleItems = expanded
                            ? [...cat.items, ...cat.moreItems]
                            : cat.items;
                        return (
                            <div key={cat.id} className="pf-location-details__poi-card">
                                <div className="pf-location-details__poi-card-label">
                                    {cat.label}
                                </div>
                                <ul className="pf-location-details__poi-list">
                                    {visibleItems.map((item, idx) => (
                                        <li
                                            key={`${cat.id}-${idx}`}
                                            className="pf-location-details__poi-row"
                                        >
                                            <span className="pf-location-details__poi-name">
                                                {item.name}
                                            </span>
                                            <span className="pf-location-details__poi-distance">
                                                {item.distance}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                {cat.moreItems.length > 0 && (
                                    <button
                                        type="button"
                                        className={`pf-location-details__poi-read-more ${expanded ? "is-open" : ""}`}
                                        onClick={() => togglePoiCategory(cat.id)}
                                        aria-expanded={expanded}
                                    >
                                        {expanded ? "Read less" : "Read more"}
                                        <span className="pf-location-details__poi-read-more-icon">
                                            <DownArrowIconBlack width={10} height={6} />
                                        </span>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="pf-location-details__near-sidebar">
                <div className="pf-location-details__key-card">
                    <h2 className="pf-location-details__key-title">Key information</h2>

                    <div className="pf-location-details__key-block">
                        <div className="pf-location-details__key-block-title">
                            Length of stay
                        </div>
                        <div className="pf-location-details__key-rows">
                            <div className="pf-location-details__key-row">
                                <span>Short term</span>
                                <span>2.51%</span>
                            </div>
                            <div className="pf-location-details__key-row">
                                <span>Long term</span>
                                <span>97.49%</span>
                            </div>
                        </div>
                    </div>

                    <div className="pf-location-details__key-block">
                        <div className="pf-location-details__key-block-title">
                            Renewal rate
                        </div>
                        <div className="pf-location-details__key-rows">
                            <div className="pf-location-details__key-row">
                                <span>Avg</span>
                                <span>12.01%</span>
                            </div>
                        </div>
                    </div>

                    <div className="pf-location-details__key-block">
                        <div className="pf-location-details__key-block-title">
                            Rental yield
                        </div>
                        <div className="pf-location-details__key-rows">
                            <div className="pf-location-details__key-row">
                                <span>Avg</span>
                                <span>8.4%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pf-location-details__promo-card">
                    <div className="pf-location-details__promo-wave" aria-hidden />
                    <p className="pf-location-details__promo-text">
                        New Properties in {LOCATION_NAME}
                    </p>
                    <button type="button" className="pf-location-details__promo-btn">
                        See all
                    </button>
                </div>
            </div>
        </section>
    );
};

export default LocationNearKey;
