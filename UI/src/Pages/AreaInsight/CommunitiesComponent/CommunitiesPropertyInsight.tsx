import React from "react";
import { LocationIcon, WhatsappIcon } from "../../../Components/parts/icon";
import "../../../assets/styles/AreaInsight/CommunitiesPropertyInsight.scss";
import com1 from "../../../assets/img/com1.jpg";
import com2 from "../../../assets/img/com2.jpg";
import com3 from "../../../assets/img/com3.jpg";
import com4 from "../../../assets/img/com4.jpg";
import com5 from "../../../assets/img/com5.jpg";
import logo1 from "../../../assets/img/company_logos/2.png";
import logo2 from "../../../assets/img/company_logos/3.png";
import logo3 from "../../../assets/img/company_logos/4.png";

const AREA_NAME = "Palm Jumeirah";

export type NewProjectCard = {
    id: number;
    name: string;
    image: string;
    developerLogo: string;
    location: string;
    status: string;
    deliveryDate: string;
    saleDate: string;
    paymentPlan: string;
    bedrooms: number;
    type: string;
    bathrooms: number;
    launchPrice: string;
};

const PropertiesData: NewProjectCard[] = [
    {
        id: 1,
        name: "Rosehill by Emaar",
        image: com1,
        developerLogo: logo1,
        location: "Dubai, Dubai Hills Estate, Rosehill",
        status: "OFF-PLAN",
        deliveryDate: "DELIVERY DATE : Q1 2029",
        saleDate: "SALE STARTED : 21 MARCH 2025",
        paymentPlan: "2 PAYMENT PLAN AVAILABLE",
        bedrooms: 4,
        type: "Villa",
        bathrooms: 2,
        launchPrice: "9M AED",
    },
    {
        id: 2,
        name: "Marina Heights Tower",
        image: com2,
        developerLogo: logo2,
        location: "Dubai, Dubai Marina, Marina Walk",
        status: "OFF-PLAN",
        deliveryDate: "DELIVERY DATE : Q3 2028",
        saleDate: "SALE STARTED : 15 JAN 2025",
        paymentPlan: "3 PAYMENT PLAN AVAILABLE",
        bedrooms: 3,
        type: "Apartment",
        bathrooms: 2,
        launchPrice: "4.2M AED",
    },
    {
        id: 3,
        name: "Palm Breeze Residences",
        image: com3,
        developerLogo: logo3,
        location: "Dubai, Palm Jumeirah, East Crescent",
        status: "OFF-PLAN",
        deliveryDate: "DELIVERY DATE : Q4 2029",
        saleDate: "SALE STARTED : 02 FEB 2025",
        paymentPlan: "2 PAYMENT PLAN AVAILABLE",
        bedrooms: 5,
        type: "Villa",
        bathrooms: 4,
        launchPrice: "18M AED",
    },
    {
        id: 4,
        name: "Creek Horizon",
        image: com4,
        developerLogo: logo1,
        location: "Dubai, Dubai Creek Harbour",
        status: "OFF-PLAN",
        deliveryDate: "DELIVERY DATE : Q2 2030",
        saleDate: "SALE STARTED : 10 MAR 2025",
        paymentPlan: "4 PAYMENT PLAN AVAILABLE",
        bedrooms: 2,
        type: "Apartment",
        bathrooms: 2,
        launchPrice: "2.1M AED",
    },
    {
        id: 5,
        name: "Al Barari Grove",
        image: com5,
        developerLogo: logo2,
        location: "Dubai, Al Barari",
        status: "OFF-PLAN",
        deliveryDate: "DELIVERY DATE : Q1 2030",
        saleDate: "SALE STARTED : 28 FEB 2025",
        paymentPlan: "2 PAYMENT PLAN AVAILABLE",
        bedrooms: 6,
        type: "Villa",
        bathrooms: 5,
        launchPrice: "24M AED",
    },
];

const CommunitiesPropertyInsight: React.FC = () => {
    return (
        <section
            className="pf-communities-new-projects"
            aria-label="New projects"
        >
            <div className="pf-communities-new-projects__row">
                <div className="pf-communities-new-projects__cta-card">
                    <div className="pf-communities-new-projects__cta-inner">
                        <h2 className="pf-communities-new-projects__cta-title">
                            Explore new projects in {AREA_NAME}
                        </h2>
                        <button type="button" className="pf-communities-new-projects__cta-btn">
                            See all projects
                        </button>
                    </div>
                </div>

                <div className="pf-communities-new-projects__carousel">
                    <div className="pf-communities-new-projects__track">
                        {PropertiesData.map((item) => (
                            <article
                                key={item.id}
                                className="pf-communities-new-projects__card"
                            >
                                <div className="pf-communities-new-projects__card-media">
                                    <img
                                        src={item.image}
                                        alt=""
                                        className="pf-communities-new-projects__card-img"
                                    />
                                    <div className="pf-communities-new-projects__card-logo">
                                        <img src={item.developerLogo} alt="" />
                                    </div>
                                    <div className="pf-communities-new-projects__card-badges">
                                        <span className="pf-communities-new-projects__badge pf-communities-new-projects__badge--offplan">
                                            {item.status}
                                        </span>
                                        <span className="pf-communities-new-projects__badge pf-communities-new-projects__badge--delivery">
                                            {item.deliveryDate}
                                        </span>
                                        <span className="pf-communities-new-projects__badge pf-communities-new-projects__badge--sale">
                                            {item.saleDate}
                                        </span>
                                        <span className="pf-communities-new-projects__badge pf-communities-new-projects__badge--payment">
                                            {item.paymentPlan}
                                        </span>
                                    </div>
                                </div>

                                <div className="pf-communities-new-projects__card-body">
                                    <h3 className="pf-communities-new-projects__card-title">
                                        {item.name}
                                    </h3>
                                    <div className="pf-communities-new-projects__card-location">
                                        <LocationIcon width={12} height={14} />
                                        <span>{item.location}</span>
                                    </div>
                                    <ul className="pf-communities-new-projects__card-features">
                                        <li className="pf-communities-new-projects__card-feature">
                                            {item.bedrooms} bedrooms
                                        </li>
                                        <li className="pf-communities-new-projects__card-feature">
                                            {item.type}
                                        </li>
                                        <li className="pf-communities-new-projects__card-feature">
                                            {item.bathrooms} bathrooms
                                        </li>
                                        <li
                                            className="pf-communities-new-projects__card-feature pf-communities-new-projects__card-feature--more"
                                        >
                                            + view more features
                                        </li>
                                    </ul>
                                </div>

                                <div className="pf-communities-new-projects__card-footer">
                                    <div>
                                        <div className="pf-communities-new-projects__launch-label">
                                            Launch price
                                        </div>
                                        <div className="pf-communities-new-projects__launch-price">
                                            {item.launchPrice}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="pf-communities-new-projects__wa-btn"
                                        aria-label={`WhatsApp about ${item.name}`}
                                    >
                                        <WhatsappIcon width={17} height={17} />
                                        Whatsapp
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CommunitiesPropertyInsight;
