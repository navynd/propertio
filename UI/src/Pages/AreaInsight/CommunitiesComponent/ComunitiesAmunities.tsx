import React, { useState } from "react";
import "../../../assets/styles/AreaInsight/CommunitiesAmunities.scss";

const AREA_NAME = "Palm Jumeirah";

type AmenitySection = {
    title: string;
    items: string[];
};

type AmenityCategory = {
    category: string;
    description: string;
    sections: AmenitySection[];
};

const AmenitiesData: AmenityCategory[] = [
    {
        category: "Schools and Nurseries",
        description:
            "Palm Jumeirah is home to several nurseries and is within easy reach of well-regarded international schools across Dubai. Families can choose from early-years settings on the island to larger campuses a short drive away, with curricula ranging from British and American to IB pathways.",
        sections: [
            {
                title: `Schools near ${AREA_NAME}:`,
                items: [
                    "American School of Dubai",
                    "Regent International School",
                    "GEMS Wellington International School",
                    "The International School of Choueifat",
                ],
            },
            {
                title: `Nurseries near ${AREA_NAME}:`,
                items: [
                    "Blossom Palm Jumeirah Nursery",
                    "Redwood Montessori Nursery",
                    "Asya’s Nursery",
                    "Jumeirah International Nurseries",
                ],
            },
        ],
    },
    {
        category: "Hospitals and Clinics",
        description:
            "Residents benefit from nearby hospitals, multi-specialty clinics, and dental centres across Al Sufouh, Dubai Marina, and Jumeirah. Emergency care, paediatrics, and family medicine are all accessible within a short drive from the island.",
        sections: [
            {
                title: "Hospitals within easy reach:",
                items: [
                    "Saudi German Hospital Dubai",
                    "Al Zahra Hospital Dubai",
                    "Mediclinic Meadows",
                ],
            },
            {
                title: "Clinics and medical centres:",
                items: [
                    "Aster Clinic — Al Barsha",
                    "Prime Medical Center — Barsha Heights",
                    "Mediclinic Ibn Battuta",
                ],
            },
        ],
    },
    {
        category: "Supermarkets",
        description:
            "Daily groceries are convenient thanks to stores on the trunk and in neighbouring communities. Larger hypermarkets and organic specialists are a few minutes away by car.",
        sections: [
            {
                title: `Supermarkets on and near ${AREA_NAME}:`,
                items: [
                    "Spinneys — Golden Mile Galleria",
                    "Choithrams — Nakheel Mall",
                    "Carrefour — Marina / nearby malls",
                    "Waitrose — select locations nearby",
                ],
            },
        ],
    },
    {
        category: "Places of Worship",
        description:
            "Churches, temples, and gurdwaras serving Dubai’s diverse communities are located in Jebel Ali, Jumeirah, and Al Barsha—typically 15–25 minutes by car from Palm Jumeirah.",
        sections: [
            {
                title: "Notable places of worship (wider Dubai):",
                items: [
                    "St. Francis of Assisi Catholic Church — Jebel Ali",
                    "Hindu Temple — Jebel Ali",
                    "Gurunanak Darbar Sikh Gurudwara — Jebel Ali",
                    "Emirates Baptist Church — Al Barsha",
                ],
            },
        ],
    },
    {
        category: "Beauty Salons",
        description:
            "From hotel spas to neighbourhood salons, you’ll find hair, nails, and wellness services along the Golden Mile, in Nakheel Mall, and in nearby Dubai Marina.",
        sections: [
            {
                title: "Salons and spas (examples):",
                items: [
                    "Nail and hair studios — Golden Mile Galleria",
                    "Hotel spa services — major Palm resorts",
                    "Ladies’ salons — Nakheel Mall",
                    "Barbers and men’s grooming — Marina / Palm trunk",
                ],
            },
        ],
    },
];

const CommunitiesAmunities: React.FC = () => {
    const [activeIndex, setActiveIndex] = useState(0);
    const active = AmenitiesData[activeIndex];

    return (
        <section
            className="pf-communities-amenities"
            aria-labelledby="communities-amenities-heading"
        >
            <article className="pf-communities-amenities__card">
                <h2
                    id="communities-amenities-heading"
                    className="pf-communities-amenities__title"
                >
                    Amenities in {AREA_NAME}
                </h2>
                <p className="pf-communities-amenities__intro">
                    Discover schools, healthcare, retail, and everyday services around{" "}
                    {AREA_NAME}. Use the tabs below to explore what is available in each
                    category.
                </p>

                <div
                    className="pf-communities-amenities__tabs-wrap"
                    role="tablist"
                    aria-label="Amenity categories"
                >
                    <div className="pf-communities-amenities__tabs-scroll">
                        {AmenitiesData.map((group, idx) => {
                            const isActive = activeIndex === idx;
                            return (
                                <button
                                    key={group.category}
                                    type="button"
                                    role="tab"
                                    id={`amenities-tab-${idx}`}
                                    aria-selected={isActive}
                                    aria-controls={`amenities-panel-${idx}`}
                                    className={
                                        isActive
                                            ? "pf-communities-amenities__tab pf-communities-amenities__tab--active"
                                            : "pf-communities-amenities__tab"
                                    }
                                    onClick={() => setActiveIndex(idx)}
                                >
                                    {group.category}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {active && (
                    <div
                        className="pf-communities-amenities__panel"
                        role="tabpanel"
                        id={`amenities-panel-${activeIndex}`}
                        aria-labelledby={`amenities-tab-${activeIndex}`}
                    >
                        <p className="pf-communities-amenities__description">
                            {active.description}
                        </p>
                        {active.sections.map((block) => (
                            <div
                                key={block.title}
                                className="pf-communities-amenities__block"
                            >
                                <h3 className="pf-communities-amenities__subheading">
                                    {block.title}
                                </h3>
                                <ul className="pf-communities-amenities__list">
                                    {block.items.map((item) => (
                                        <li
                                            key={item}
                                            className="pf-communities-amenities__list-item"
                                        >
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </article>
        </section>
    );
};

export default CommunitiesAmunities;
