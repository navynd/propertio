import React, { useMemo, useState } from "react";
import {
    DownArrowIconBlack,
    ExpandImageIcon,
    LeftArrowIcon,
    RightArrowIcon,
} from "../../../Components/parts/icon";
import "../../../assets/styles/AreaInsight/CommunitiesLife.scss";

const AREA_NAME = "Palm Jumeirah";


type LifestyleListItem = {
    name: string;
    description: string;
};

type LifestyleCategory = {
    category: string;
    items: LifestyleListItem[];
};

const LIFESTYLE_INTRO_P1 = `Life on Palm Jumeirah blends beachfront calm with world-class dining, resorts, and entertainment. Residents and visitors enjoy waterfront promenades, iconic landmarks, and easy access to Dubai’s best malls and leisure venues—all within a secure, master-planned island community.`;

const LIFESTYLE_INTRO_P2 = `Whether you prefer quiet boardwalk strolls, family days at the waterpark, or evenings at rooftop venues, the area offers something for every pace. Below you can explore what makes day-to-day living and leisure here so distinctive, category by category.`;

/** Lifestyle tab content — each group maps to a category tab + bullet list */
const LifestyleData: LifestyleCategory[] = [
    {
        category: "Landmarks",
        items: [
            {
                name: "Atlantis The Palm",
                description:
                    "A world-famous hotel and entertainment destination featuring world-class dining, an enormous aquarium, and direct beach access—often considered the signature landmark of the island.",
            },
            {
                name: "The Lost Chambers Aquarium",
                description:
                    "Home to thousands of marine species in themed chambers and tunnels, offering an immersive underwater experience for families and visitors of all ages.",
            },
            {
                name: "Aquaventure Waterpark",
                description:
                    "One of Dubai’s top family attractions, with slides, lazy rivers, and private beach areas—ideal for weekends and school holidays.",
            },
            {
                name: "The View at The Palm",
                description:
                    "An observation deck that provides panoramic views over the Palm, the Arabian Gulf, and the Dubai skyline from a striking height.",
            },
            {
                name: "Palm Jumeirah Boardwalk",
                description:
                    "A scenic 11 km path ideal for jogging, cycling, and sunset walks along the outer crescent with sea views on one side.",
            },
            {
                name: "Al Ittihad Park",
                description:
                    "A community park with over 60 species of native trees and shaded paths—a green lung on the trunk for picnics and quiet exercise.",
            },
        ],
    },
    {
        category: "Malls",
        items: [
            {
                name: "Nakheel Mall",
                description:
                    "A central retail and dining hub on the trunk with shops, a rooftop dining precinct, and cinema—convenient for residents nearby.",
            },
            {
                name: "The Pointe",
                description:
                    "An open-air waterfront destination at the tip of the Palm with restaurants, cafés, and views toward Atlantis and the sea.",
            },
            {
                name: "Golden Mile Galleria",
                description:
                    "A palm-lined retail strip along the trunk with supermarkets, services, and casual dining for everyday needs.",
            },
        ],
    },
    {
        category: "Restaurants and Cafes",
        items: [
            {
                name: "Waterfront dining",
                description:
                    "From fine dining to casual beach clubs, the fronds and crescent host chef-led venues with sunset views over the Gulf.",
            },
            {
                name: "Trunk cafés",
                description:
                    "Neighbourhood coffee shops and brunch spots along the Golden Mile and surrounding towers suit remote work and meet-ups.",
            },
        ],
    },
    {
        category: "Nightlife",
        items: [
            {
                name: "Beach clubs & lounges",
                description:
                    "Evening venues along the shore offer music, cocktails, and themed nights within resort and standalone club settings.",
            },
            {
                name: "Hotel bars",
                description:
                    "Five-star properties host rooftop and lobby bars with dress codes and skyline views for a more refined night out.",
            },
        ],
    },
    {
        category: "Hotels",
        items: [
            {
                name: "Resort hotels",
                description:
                    "Iconic stays include Atlantis The Palm, Atlantis The Royal, and other beachfront resorts with spas, pools, and private beach access.",
            },
            {
                name: "Serviced apartments",
                description:
                    "Extended-stay and branded residences cater to business travellers and families who want hotel services with more space.",
            },
        ],
    },
    {
        category: "Fitness Facilities & Outdoor Activities",
        items: [
            {
                name: "Gyms & studios",
                description:
                    "Residential towers and hotels include well-equipped gyms, yoga studios, and personal training options across the island.",
            },
            {
                name: "Water sports",
                description:
                    "Kayaking, paddleboarding, and boat charters launch from beaches and marinas along the crescent and fronds.",
            },
        ],
    },
    {
        category: "Beaches",
        items: [
            {
                name: "Public & hotel beaches",
                description:
                    "Soft sand and calm water stretch along the crescent; many stretches are managed by resorts with day-pass options.",
            },
            {
                name: "West Beach",
                description:
                    "A popular stretch with running track, volleyball, and family-friendly shallow water facing the Dubai Marina skyline.",
            },
        ],
    },
];

const CommunitiesLifestyle: React.FC = () => {
    const [lifestyleCategoryIndex, setLifestyleCategoryIndex] = useState(0);

    return (

        <section
            className="pf-communities-detail__lifestyle-section"
            aria-labelledby="community-lifestyle-heading"
        >
            <article className="pf-communities-detail__lifestyle-card">
                <h2
                    id="community-lifestyle-heading"
                    className="pf-communities-detail__lifestyle-heading"
                >
                    Lifestyle in {AREA_NAME}
                </h2>
                <div className="pf-communities-detail__lifestyle-intro">
                    <p className="pf-communities-detail__lifestyle-intro-p">
                        {LIFESTYLE_INTRO_P1}
                    </p>
                    <p className="pf-communities-detail__lifestyle-intro-p">
                        {LIFESTYLE_INTRO_P2}
                    </p>
                </div>

                <div
                    className="pf-communities-detail__lifestyle-tabs-wrap"
                    role="tablist"
                    aria-label="Lifestyle categories"
                >
                    <div className="pf-communities-detail__lifestyle-tabs-scroll">
                        {LifestyleData.map((group, idx) => {
                            const isCatActive = lifestyleCategoryIndex === idx;
                            const tabId = `lifestyle-cat-${idx}`;
                            const panelId = `lifestyle-panel-${idx}`;
                            return (
                                <button
                                    key={group.category}
                                    type="button"
                                    role="tab"
                                    id={tabId}
                                    aria-selected={isCatActive}
                                    aria-controls={panelId}
                                    className={
                                        isCatActive
                                            ? "pf-communities-detail__lifestyle-tab pf-communities-detail__lifestyle-tab--active"
                                            : "pf-communities-detail__lifestyle-tab"
                                    }
                                    onClick={() => setLifestyleCategoryIndex(idx)}
                                >
                                    {group.category}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div
                    className="pf-communities-detail__lifestyle-panel"
                    role="tabpanel"
                    id={`lifestyle-panel-${lifestyleCategoryIndex}`}
                    aria-labelledby={`lifestyle-cat-${lifestyleCategoryIndex}`}
                >
                    <ul className="pf-communities-detail__lifestyle-list">
                        {(
                            LifestyleData[lifestyleCategoryIndex]?.items ?? []
                        ).map((item, itemIdx) => (
                            <li
                                key={`${lifestyleCategoryIndex}-${itemIdx}-${item.name}`}
                                className="pf-communities-detail__lifestyle-list-item"
                            >
                                <span className="pf-communities-detail__lifestyle-list-bullet" aria-hidden>
                                    •
                                </span>
                                <span className="pf-communities-detail__lifestyle-list-text">
                                    <strong className="pf-communities-detail__lifestyle-list-name">
                                        {item.name}
                                    </strong>
                                    : {item.description}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </article>
        </section>


    );
};

export default CommunitiesLifestyle;           
