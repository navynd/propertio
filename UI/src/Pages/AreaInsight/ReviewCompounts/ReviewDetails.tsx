import React, { useState } from "react";
import { Rating, Typography } from "@mui/material";
import { GoogleMap, Marker } from "@react-google-maps/api";
import PFContainer from "../../../Components/container/PFContainer";
import { BreadcrumbsComponentThirdLevel } from "../../../Components/parts/component";
import {
    ExpandImageIcon,
    MailIcon,
    TelephoneIcon,
    WhatsappIcon,
} from "../../../Components/parts/icon";
import { useGoogleMapsLoader } from "../../../context/GoogleMapsLoaderContext";
import expertAvatar from "../../../assets/img/company_logos/C12.jpg";
import emaarLogo from "../../../assets/img/company_logos/2.png";
import palmMarkerIcon from "../../../assets/img/pin.svg";
import "../../../assets/styles/AreaInsight/Review/ReviewDetails.scss";
import WriteReviewModal from "./WriteReviewModal";

const BUILDING_NAME = "Tiara Residences";
const AREA_NAME = "Palm Jumeirah";

const MAP_CENTER: google.maps.LatLngLiteral = {
    lat: 25.1082,
    lng: 55.1418,
};

const GOOGLE_MAPS_URL = `https://www.google.com/maps?q=${MAP_CENTER.lat},${MAP_CENTER.lng}&z=16`;

const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    clickableIcons: false,
};

type ScoreItem = { label: string; score: number };

const SCORE_LEFT: ScoreItem[] = [
    { label: "Maintenance", score: 5 },
    { label: "Staff / Security", score: 3 },
    { label: "Gym / pool", score: 2 },
    { label: "Children friendly", score: 4 },
];

const SCORE_RIGHT: ScoreItem[] = [
    { label: "Noise", score: 3 },
    { label: "Traffic", score: 1 },
    { label: "Guest parking", score: 4 },
];

type ReviewEntry = {
    id: number;
    title: string;
    rating: number;
    body: string;
    postedAgo: string;
    author: string;
};

const REVIEWS_DATA: ReviewEntry[] = [
    {
        id: 1,
        title: "Tanzanite tiara residences",
        rating: 4.8,
        body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. The building management is responsive and the amenities are well maintained year round.",
        postedAgo: "5 days ago",
        author: "Susheel Hrishikesh",
    },
    {
        id: 2,
        title: "Excellent amenities",
        rating: 4.7,
        body: "Aliquam ipsum arcu, auctor non porta sed, mattis a leo. Proin lectus justo, elementum vitae magna sit amet, ultrices fermentum urna. Vestibulum in aliquam risus. Suspendisse ut facilisis risus. Quisque pellentesque tellus vitae ligula mattis, cursus mattis leo elementum. Aliquam erat volutpat. Morbi vel dapibus nisi, sit amet cursus justo. Nullam tempus vel ante a rutrum. Aenean quis est nec quam cursus ornare. Donec eu ullamcorper turpis. Donec non turpis nec turpis cursus dictum. Etiam molestie eros risus, vel finibus leo rutrum a. Aliquam eget velit nulla. Sed interdum cursus dui, sit amet luctus tortor malesuada id. Vestibulum nec magna finibus, finibus sapien a, porttitor magna.",
        postedAgo: "2 weeks ago",
        author: "Maria K.",
    },
    {
        id: 3,
        title: "Great location",
        rating: 4.9,
        body: "Proximity to Nakheel Mall and the beach makes day-to-day life very convenient. Parking can be busy on weekends but overall a solid choice on Palm Jumeirah.",
        postedAgo: "1 month ago",
        author: "James T.",
    },
    {
        id: 4,
        title: "Tanzanite tiara residences",
        rating: 4.9,
        body: "Quisque vel odio metus. Aliquam sit amet diam aliquet arcu dignissim faucibus vel ac lorem. Nam laoreet nec magna id euismod. Quisque sagittis justo vitae erat dignissim interdum ",
        postedAgo: "1 month ago",
        author: "James T.",
    },
    {
        id: 5,
        title: "Excellent amenities",
        rating: 4.7,
        body: "Aliquam ipsum arcu, auctor non porta sed, mattis a leo. Proin lectus justo, elementum vitae magna sit amet, ultrices fermentum urna. Vestibulum in aliquam risus. Suspendisse ut facilisis risus. Quisque pellentesque tellus vitae ligula mattis, cursus mattis leo elementum. Aliquam erat volutpat. Morbi vel dapibus nisi, sit amet cursus justo. Nullam tempus vel ante a rutrum. Aenean quis est nec quam cursus ornare. Donec eu ullamcorper turpis. Donec non turpis nec turpis cursus dictum. Etiam molestie eros risus, vel finibus leo rutrum a. Aliquam eget velit nulla. Sed interdum cursus dui, sit amet luctus tortor malesuada id. Vestibulum nec magna finibus, finibus sapien a, porttitor magna.",
        postedAgo: "2 weeks ago",
        author: "Maria K.",
    },
    {
        id: 6,
        title: "Greater living spce",
        rating: 4.9,
        body: "Quisque vel odio metus. Aliquam sit amet diam aliquet arcu dignissim faucibus vel ac lorem. Nam laoreet nec magna id euismod. Quisque sagittis justo vitae erat dignissim interdum ",
        postedAgo: "1 month ago",
        author: "James T.",
    },
];

function ScoreBar({ label, score }: ScoreItem) {
    const pct = Math.min(100, Math.max(0, (score / 5) * 100));
    return (
        <div className="pf-review-details__score-row">
            <span className="pf-review-details__score-label">{label}</span>
            <div className="pf-review-details__score-bar-track" aria-hidden>
                <div
                    className="pf-review-details__score-bar-fill"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="pf-review-details__score-num">{score}</span>
        </div>
    );
}

const ReviewDetails: React.FC = () => {
    const { isLoaded, loadError, googleMapsApiKey } = useGoogleMapsLoader();
    const [writeReviewModalOpen, setWriteReviewModalOpen] = useState(false);

    const overallRating = 4.8;
    const ratingCount = 45;

    return (
        <div className="pf-review-details">
            <PFContainer>
                <div className="pf-review-details__breadcrumb">
                    <BreadcrumbsComponentThirdLevel
                        breadcrumbTitle="Home"
                        breadcrumbLinkTitleTo="/"
                        breadcrumbSubTitle1="Area Insights"
                        breadcrumbLinkSubTitle1To="/areainsight"
                        breadcrumbSubTitle2={AREA_NAME}
                        breadcrumbLinkSubTitle2To="/allcommunitiesdetails"
                        breadcrumbSubTitle3={BUILDING_NAME}
                    />
                </div>

                <div className="pf-review-details__layout">
                    <div className="pf-review-details__main">
                        <header className="pf-review-details__header">
                            <h1 className="pf-review-details__title">{BUILDING_NAME}</h1>
                            <div className="pf-review-details__rating-row">
                                <Rating
                                    name="building-rating"
                                    value={overallRating}
                                    readOnly
                                    precision={0.1}
                                    sx={{
                                        "& .MuiRating-iconFilled": { color: "#FFCB2B" },
                                        "& .MuiRating-iconEmpty": {
                                            color: "rgba(255, 203, 43, 0.28)",
                                        },
                                        fontSize: "22px",
                                    }}
                                />
                                <Typography
                                    component="span"
                                    className="pf-review-details__rating-text"
                                >
                                    {overallRating}/5 based on {ratingCount} Ratings
                                </Typography>
                            </div>
                        </header>

                        <section
                            className="pf-review-details__section"
                            aria-labelledby="score-breakdown-heading"
                        >
                            <h2
                                id="score-breakdown-heading"
                                className="pf-review-details__section-title"
                            >
                                Score breakdown
                            </h2>
                            <div className="pf-review-details__score-grid">
                                <div className="pf-review-details__score-col">
                                    {SCORE_LEFT.map((item) => (
                                        <ScoreBar key={item.label} {...item} />
                                    ))}
                                </div>
                                <div className="pf-review-details__score-col">
                                    {SCORE_RIGHT.map((item) => (
                                        <ScoreBar key={item.label} {...item} />
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section
                            className="pf-review-details__section"
                            aria-labelledby="resident-reviews-heading"
                        >
                            <h2
                                id="resident-reviews-heading"
                                className="pf-review-details__section-title"
                            >
                                Resident reviews
                            </h2>
                            <ul className="pf-review-details__reviews-list">
                                {REVIEWS_DATA.map((rev) => (
                                    <li key={rev.id}>
                                        <article className="pf-review-details__review-card">
                                            <h3 className="pf-review-details__review-title">
                                                {rev.title}
                                            </h3>
                                            <div className="pf-review-details__review-rating">
                                                <Rating
                                                    name={`rev-${rev.id}`}
                                                    value={rev.rating}
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
                                                <span className="pf-review-details__review-rating-text">
                                                    {rev.rating}/5
                                                </span>
                                            </div>
                                            <p className="pf-review-details__review-body">
                                                {rev.body}
                                            </p>
                                            <footer className="pf-review-details__review-meta">
                                                <span className="pf-review-details__review-meta-text">Posted {rev.postedAgo} by </span>  {rev.author}
                                            </footer>
                                        </article>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    <aside className="pf-review-details__sidebar">
                        <div className="pf-review-details__map-card">
                            <div className="pf-review-details__map-wrap">
                                {!googleMapsApiKey ? (
                                    <div className="pf-review-details__map-fallback">
                                        Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to show the
                                        map.
                                    </div>
                                ) : loadError ? (
                                    <div className="pf-review-details__map-fallback">
                                        Could not load Google Maps.
                                    </div>
                                ) : !isLoaded ? (
                                    <div className="pf-review-details__map-fallback">
                                        Loading map…
                                    </div>
                                ) : (
                                    <GoogleMap
                                        mapContainerClassName="pf-review-details__map-canvas"
                                        center={MAP_CENTER}
                                        zoom={15}
                                        options={mapOptions}
                                    >
                                        <Marker position={MAP_CENTER} icon={palmMarkerIcon} />
                                    </GoogleMap>
                                )}
                                <button
                                    type="button"
                                    className="pf-review-details__see-map"
                                    onClick={() =>
                                        window.open(
                                            GOOGLE_MAPS_URL,
                                            "_blank",
                                            "noopener,noreferrer"
                                        )
                                    }
                                >
                                    <ExpandImageIcon width={14} height={14} />
                                    <span>See full map</span>
                                </button>
                            </div>
                            <div className="pf-review-details__map-actions-wrap">
                                <div className="pf-review-details__map-actions">
                                    <button
                                        type="button"
                                        className="pf-review-details__outline-btn"
                                    >
                                        Properties for rent
                                    </button>
                                    <button
                                        type="button"
                                        className="pf-review-details__outline-btn"
                                    >
                                        Properties for sale
                                    </button>
                                </div>
                                <button onClick={() => setWriteReviewModalOpen(true)} type="button" className="pf-review-details__cta-review">
                                    Write a review
                                </button>
                            </div>
                        </div>

                        <div className="pf-review-details__expert-card">
                            <h2 className="pf-review-details__expert-title">
                                Building expert
                            </h2>
                            <div className="pf-review-details__expert-profile">
                                <img
                                    src={expertAvatar}
                                    alt=""
                                    className="pf-review-details__expert-avatar"
                                />
                                <div className="pf-review-details__expert-info">
                                    <p className="pf-review-details__expert-name">
                                        Jackson crosland
                                    </p>
                                    <p className="pf-review-details__expert-listings">
                                        10 Listing
                                    </p>
                                </div>
                                <div className="pf-review-details__expert-logo-wrap">
                                    <img
                                        src={emaarLogo}
                                        alt="Emaar"
                                        className="pf-review-details__expert-logo"
                                    />
                                </div>
                            </div>
                            <div className="pf-review-details__expert-actions">
                                <button
                                    type="button"
                                    className="pf-review-details__expert-btn"
                                >
                                    <TelephoneIcon width={14} height={14} />
                                    Contact
                                </button>
                                <button
                                    type="button"
                                    className="pf-review-details__expert-btn"
                                >
                                    <MailIcon width={14} height={12} />
                                    Mail us
                                </button>
                                <button
                                    type="button"
                                    className="pf-review-details__expert-btn pf-review-details__expert-btn--whatsapp"
                                >
                                    <WhatsappIcon width={18} height={18} />
                                    Whatsapp
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </PFContainer>
            <WriteReviewModal
                open={writeReviewModalOpen}
                onClose={() => setWriteReviewModalOpen(false)}
                buildingName={BUILDING_NAME}
            />
        </div>
    );
};

export default ReviewDetails;
