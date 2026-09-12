import React, { useMemo, useState } from "react";
import { Rating, Typography } from "@mui/material";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentFourLevel } from "../../Components/parts/component";
import {
    DownArrowIconBlack,
    ExpandImageIcon,
    ImageIcon,
    LeftArrowIcon,
    LocationIcon,
    RightArrowIcon,
    VerifiedBadgeIcon,
} from "../../Components/parts/icon";
import com1 from "../../assets/img/drilldown02.png";
import com2 from "../../assets/img/drilldown04.png";
import com3 from "../../assets/img/drilldown01.png";
import "../../assets/styles/AreaInsight/LocationDetails.scss";
import LocationNearKey from "./AreaCompounts/LocationNearKey";
import LocationPriceInsights from "./AreaCompounts/LocationPriceInsights";
import LocationAreaBarCharts from "./AreaCompounts/LocationAreaBarCharts";
import LocationFrq from "./AreaCompounts/LocationFrq";


const GALLERY_IMAGES = [com1, com2, com3];
const IMAGE_COUNT = 25;

const UNIT_ROWS = [
    { id: "studio", label: "Studio", available: 14 },
    { id: "1bed", label: "1 Bed apartment", available: 37 },
    { id: "2bed", label: "2 Beds apartment", available: 4 },
    { id: "3bed", label: "3 Beds apartment", available: 1 },
] as const;

const LOCATION_NAME = "Seven Palm";

const LocationDetails: React.FC = () => {
    const [imageIndex, setImageIndex] = useState(0);


    const currentImage = GALLERY_IMAGES[imageIndex] ?? GALLERY_IMAGES[0];

    const goPrev = () => {
        setImageIndex((i) => (i <= 0 ? GALLERY_IMAGES.length - 1 : i - 1));
    };

    const goNext = () => {
        setImageIndex((i) => (i >= GALLERY_IMAGES.length - 1 ? 0 : i + 1));
    };

    const subtitle = useMemo(
        () => `All available in ${LOCATION_NAME}`,
        []
    );



    return (
        <div className="pf-location-details">
            <PFContainer>
                <div className="pf-location-details__breadcrumb">
                    <BreadcrumbsComponentFourLevel
                        breadcrumbTitle="Home"
                        breadcrumbLinkTitleTo="/"
                        breadcrumbSubTitle1="Area Insights"
                        breadcrumbLinkSubTitle1To="/areainsight"
                        breadcrumbSubTitle2="Global Communities"
                        breadcrumbLinkSubTitle2To="/allcommunities"
                        breadcrumbSubTitle3="Prime Residences"
                        breadcrumbLinkSubTitle3To="/towersandcompounds"
                        breadcrumbSubTitle4={LOCATION_NAME}
                    />
                </div>

                <div className="pf-location-details__grid">
                    <div className="pf-location-details__gallery">
                        <div className="pf-location-details__gallery-main">
                            <img
                                src={currentImage}
                                alt={`${LOCATION_NAME} — photo ${imageIndex + 1}`}
                                className="pf-location-details__gallery-image"
                            />

                            <button
                                type="button"
                                className="pf-location-details__gallery-arrow pf-location-details__gallery-arrow--left"
                                onClick={goPrev}
                                aria-label="Previous image"
                            >
                                <LeftArrowIcon width={20} height={20} fill="#222" />
                            </button>
                            <button
                                type="button"
                                className="pf-location-details__gallery-arrow pf-location-details__gallery-arrow--right"
                                onClick={goNext}
                                aria-label="Next image"
                            >
                                <RightArrowIcon width={20} height={20} fill="#222" />
                            </button>

                            <button
                                type="button"
                                className="pf-location-details__gallery-expand"
                                aria-label="Expand image"
                            >
                                <ExpandImageIcon width={18} height={18} />
                            </button>

                            <div className="pf-location-details__gallery-bottom">
                                <button
                                    type="button"
                                    className="pf-location-details__location-btn"
                                >
                                    <LocationIcon width={14} height={18} />
                                    <span>Location</span>
                                </button>
                                <div className="pf-location-details__image-count">
                                    <ImageIcon width={16} height={16} />
                                    <span>{IMAGE_COUNT}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside className="pf-location-details__card">
                        <div className="pf-location-details__card-header">
                            <span className="pf-location-details__verified">
                                <VerifiedBadgeIcon width={12} height={12} />
                                <span>VERIFIED</span>
                            </span>
                            <h1 className="pf-location-details__title">{LOCATION_NAME}</h1>
                            <div className="pf-location-details__rating-row">
                                <Rating
                                    name="location-rating"
                                    value={4.8}
                                    readOnly
                                    precision={0.1}
                                    sx={{
                                        "& .MuiRating-iconFilled": {
                                            color: "#FFCB2B",
                                        },
                                        "& .MuiRating-iconEmpty": {
                                            color: "rgba(255, 203, 43, 0.28)",
                                        },
                                        fontSize: "18px",
                                    }}
                                />
                                <Typography
                                    component="span"
                                    className="pf-location-details__rating-text"
                                >
                                    4.8/5 based on 25 reviews
                                </Typography>
                            </div>
                        </div>

                        <h2 className="pf-location-details__availability-title">
                            {subtitle}
                        </h2>

                        <ul className="pf-location-details__unit-list">
                            {UNIT_ROWS.map((row) => (
                                <li key={row.id} className="pf-location-details__unit-row">
                                    <div className="pf-location-details__unit-text">
                                        <span className="pf-location-details__unit-label">
                                            {row.label}
                                        </span>
                                        <span className="pf-location-details__unit-count">
                                            {row.available} Available
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="pf-location-details__unit-chevron"
                                        aria-label={`View ${row.label}`}
                                    >
                                        <RightArrowIcon width={14} height={14} fill="#fff" />
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <button type="button" className="pf-location-details__see-all">
                            See all
                        </button>
                    </aside>
                </div>

                <LocationPriceInsights />

                <LocationAreaBarCharts locationName={LOCATION_NAME} />

                <div>
                    <LocationNearKey />
                </div>
                <div>
                    <LocationFrq />
                </div>
            </PFContainer>
        </div>
    );
};

export default LocationDetails;
