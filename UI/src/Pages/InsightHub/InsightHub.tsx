import React, { useState } from "react";
import banner from "../../assets/img/insightbanner.png";
import bgone from "../../assets/img/card1.png";
import cardone from "../../assets/img/card1.png";
import cardtwo from "../../assets/img/card2.png";
import cardthree from "../../assets/img/card3.png";
import "../../assets/styles/Insighthub.scss";
import { Container } from "@mui/material";
import downarrow from "../../assets/img/downwhite.svg";
import { DownArrowIconBlack, RightArrowBlackIcon, RightArrowIcon } from "../../Components/parts/icon";
import { useNavigate } from "react-router-dom";

type Report = {
    id: number;
    image: string;
    title: string;
    date: string;
    tag: string;
    author: string;
    comments: string;
};
const recentReports: Report[] = [
    {
        id: 1,
        image: cardone,
        title: "UAE Q1 2025, Market Watch Quarterly Residential Real Estate Insights",
        date: "May 29, 2025",
        tag: "Quarterly Market Watch",
        author: "John Doe",
        comments: '25 comments',
    },
    {
        id: 2,
        image: cardtwo,
        title: "Dubai November 2024: The Official Sales Price Index",
        date: "May 29, 2025",
        tag: "Quarterly Market Watch",
        author: "John Doe",
        comments: '25 comments',
    },
    {
        id: 3,
        image: cardthree,
        title: "Dubai November 2024: The Official Rental Performance Index",
        date: "May 29, 2025",
        tag: "Quarterly Market Watch",
        author: "John Doe",
        comments: '25 comments',
    },
];

const featuredReports: Report[] = [
    {
        id: 101,
        image: cardtwo,
        title: "UAE 2024 Annual Market Report",
        date: "Jan 10, 2025",
        tag: "Annual Report",
        author: "John Doe",
        comments: '25 comments',
    },
    {
        id: 102,
        image: cardthree,
        title: "Dubai 2024 Mo'asher Highlights",
        date: "Dec 15, 2024",
        tag: "Mo'asher",
        author: "John Doe",
        comments: '25 comments',
    },
    {
        id: 103,
        image: cardone,
        title: "Investor's Guide to UAE Real Estate 2024",
        date: "Nov 01, 2024",
        tag: "Guides",
        author: "John Doe",
        comments: '25 comments',
    },
];

const InsightHub: React.FC = () => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState("UAE");

    // Tabs: Recently added / Featured
    const [activeTab, setActiveTab] = useState<"recent" | "featured">("recent");

    const [isReportTypeOpen, setIsReportTypeOpen] = useState(false);
    const [isPeriodicityOpen, setIsPeriodicityOpen] = useState(false);
    const [isYearOpen, setIsYearOpen] = useState(false);
    const [selectedReportType, setSelectedReportType] = useState("Report type");
    const [selectedPeriodicity, setSelectedPeriodicity] = useState("Periodicity");
    const [selectedYear, setSelectedYear] = useState("Year");

    const countries = ["UAE", "Egypt", "Qatar", "Bahrain", "KSA"];

    const navigate = useNavigate();

    const reportTypes = ["All reports", "Market Watch", "Mo'asher", "Guides"];
    const periodicities = ["All", "Monthly", "Quarterly", "Yearly"];
    const years = ["2025", "2024", "2023", "2022"];

    const handleToggleDropdown = () => {
        setIsDropdownOpen((prev) => !prev);
    };

    const handleSelectCountry = (country: string) => {
        setSelectedCountry(country);
        setIsDropdownOpen(false);
    };

    const toggleReportType = () => {
        setIsReportTypeOpen((prev) => !prev);
        setIsPeriodicityOpen(false);
        setIsYearOpen(false);
    };

    const togglePeriodicity = () => {
        setIsPeriodicityOpen((prev) => !prev);
        setIsReportTypeOpen(false);
        setIsYearOpen(false);
    };

    const toggleYear = () => {
        setIsYearOpen((prev) => !prev);
        setIsReportTypeOpen(false);
        setIsPeriodicityOpen(false);
    };

    const handleSelectReportType = (value: string) => {
        setSelectedReportType(value);
        setIsReportTypeOpen(false);
    };

    const handleSelectPeriodicity = (value: string) => {
        setSelectedPeriodicity(value);
        setIsPeriodicityOpen(false);
    };

    const handleSelectYear = (value: string) => {
        setSelectedYear(value);
        setIsYearOpen(false);
    };



    const handleReportClick = (report: Report) => {
        navigate(`/insighthub/${report.id}`, { state: { report } });
    };

    return (
        <>
            <main
                className="insight-hero"
                style={{ backgroundImage: `url(${banner})` }}
                role="main"
            >
                <Container>
                    <div className="insight-hero__overlay" />
                    <Container>
                        <div className="insight-hero__breadcrumb">
                            <span>Home</span>
                            <RightArrowIcon width="12" height="12" fill="#FFFFFF" />
                            <span>Insights hub</span>
                        </div>
                    </Container>
                    <div className="insight-hero__content">
                        <div className="insight-hero__left">
                            <div className="insight-hero__left-content">
                                <h1 className="insight-hero__title">
                                    Insights Hub
                                </h1>
                                {/*Dropdown section*/}
                                <div className="insight-hero__title-accent-wrapper">
                                    <button
                                        type="button"
                                        className="insight-hero__title-accent-container"
                                        onClick={handleToggleDropdown}
                                    >
                                        <p className="insight-hero__title-accent">
                                            {selectedCountry}
                                        </p>
                                        <img
                                            src={downarrow}
                                            alt="Select country"
                                            className="insight-hero__title-accent-image"
                                        />
                                    </button>

                                    {isDropdownOpen && (
                                        <div className="insight-hero__dropdown">
                                            {countries.map((country) => (
                                                <button
                                                    key={country}
                                                    type="button"
                                                    className="insight-hero__dropdown-item"
                                                    onClick={() => handleSelectCountry(country)}
                                                >
                                                    {country}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>


                            <p className="insight-hero__subtitle">
                                Explore Estatehub&apos;s one‑stop HUB for comprehensive
                                publications on UAE, Egypt, Qatar, Bahrain, and KSA real estate.
                                Stay informed with the latest trends, market analysis, and expert
                                insights in one convenient HUB.
                            </p>
                        </div>
                        {/*bgone section*/}
                        <div className="insight-hero__right">
                            <img
                                src={bgone}
                                alt="Market Watch report cover"
                                className="insight-hero__image"
                            />
                        </div>
                    </div>
                    {/*uae section*/}
                    <div className="insight-hero__highlight">
                        <div className="insight-hero__pill">Latest</div>
                        <h2 className="insight-hero__highlight-title">
                            UAE Q1 2025, Market Watch Quarterly <br></br> Residential Real Estate
                            Insights
                        </h2>
                        <p className="insight-hero__highlight-meta">
                            May 29, 2025 • Quarterly Market Watch
                        </p>

                        <div className="insight-hero__actions">
                            <button type="button" className="insight-hero__btn insight-hero__btn--primary">
                                Read more
                            </button>
                            <button type="button" className="insight-hero__btn insight-hero__btn--ghost">
                                Download PDF
                            </button>
                        </div>
                    </div>
                </Container>
            </main>

            {/* Reports list section */}
            <section className="insight-list">
                <Container>
                    <div className="insight-list__header">
                        <div className="insight-list__tabs">
                            <button
                                type="button"
                                className={
                                    "insight-list__tab" +
                                    (activeTab === "recent" ? " insight-list__tab--active" : "")
                                }
                                onClick={() => setActiveTab("recent")}
                            >
                                Recently added
                            </button>
                            <button
                                type="button"
                                className={
                                    "insight-list__tab" +
                                    (activeTab === "featured" ? " insight-list__tab--active" : "")
                                }
                                onClick={() => setActiveTab("featured")}
                            >
                                Featured
                            </button>
                        </div>

                        <div className="insight-list__filters">
                            <div className="insight-list__filter-wrapper">
                                <button
                                    type="button"
                                    className="insight-list__filter"
                                    onClick={toggleReportType}
                                >
                                    <span>{selectedReportType}</span>
                                    <DownArrowIconBlack width="10" height="10" fill="#707070" />
                                </button>
                                {isReportTypeOpen && (
                                    <div className="insight-list__filter-menu">
                                        {reportTypes.map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                className="insight-list__filter-option"
                                                onClick={() => handleSelectReportType(type)}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="insight-list__filter-wrapper">
                                <button
                                    type="button"
                                    className="insight-list__filter"
                                    onClick={togglePeriodicity}
                                >
                                    <span>{selectedPeriodicity}</span>
                                    <DownArrowIconBlack width="10" height="10" fill="#707070" />
                                </button>
                                {isPeriodicityOpen && (
                                    <div className="insight-list__filter-menu">
                                        {periodicities.map((p) => (
                                            <button
                                                key={p}
                                                type="button"
                                                className="insight-list__filter-option"
                                                onClick={() => handleSelectPeriodicity(p)}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="insight-list__filter-wrapper">
                                <button
                                    type="button"
                                    className="insight-list__filter"
                                    onClick={toggleYear}
                                >
                                    <span>{selectedYear}</span>
                                    <DownArrowIconBlack width="10" height="10" fill="#707070" />
                                </button>
                                {isYearOpen && (
                                    <div className="insight-list__filter-menu">
                                        {years.map((y) => (
                                            <button
                                                key={y}
                                                type="button"
                                                className="insight-list__filter-option"
                                                onClick={() => handleSelectYear(y)}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                    {/*Card section*/}
                    <div className="insight-list__grid">
                        {(activeTab === "recent" ? recentReports : featuredReports).map((report) => (
                            <article
                                key={report.id}
                                className="insight-card"
                                onClick={() => handleReportClick(report)}
                            >
                                <div className="insight-card__image-wrap">
                                    <img
                                        src={report.image}
                                        alt={report.title}
                                        className="insight-card__image"
                                    />
                                </div>

                                <div className="insight-card__body">
                                    <h3 className="insight-card__title">{report.title}</h3>
                                    <button className="insight-card__button">
                                        Download PDF
                                    </button>
                                </div>

                                <div className="insight-card__meta">
                                    <span>{report.date}</span>
                                    <span>•</span>
                                    <span>{report.tag}</span>
                                </div>
                            </article>
                        ))}
                    </div>
                </Container>
            </section>

        </>

    );
};

export default InsightHub;