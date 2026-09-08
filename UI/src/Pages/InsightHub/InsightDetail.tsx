import React from "react";
import { Container } from "@mui/material";
import { useParams, useLocation } from "react-router-dom";
import "../../assets/styles/Insighthub.scss";
import { BreadcrumbsComponentSecondLevel } from "../../Components/parts/component";

type Report = {
    id: number;
    image: string;
    title: string;
    date: string;
    author: string;
    comments: string;
};

const InsightDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const stateReport = (location.state as { report?: Report } | null)?.report;
    const report = stateReport;
    console.log("report", report);

    if (!report) {
        return (
            <main className="insight-detail">
                <Container>
                    <p>Report not found.</p>
                </Container>
            </main>
        );
    }

    return (
        <main className="insight-detail">
            <Container>
                {/* Breadcrumbs section */}
                <BreadcrumbsComponentSecondLevel
                    breadcrumbTitle="Home"
                    breadcrumbSubTitle1="Insight hub"
                    breadcrumbSubTitle2={report.title}
                    breadcrumbLinkTitleTo="/"
                    breadcrumbLinkSubTitle1To="/insighthub"
                    breadcrumbLinkSubTitle2To={`/insighthub/${report.id}`}
                />

                <section className="insight-detail__header">
                    <div className="insight-detail__text">
                        <h1 className="insight-detail__title">{report.title}</h1>
                        <div className="insight-detail__meta">
                            <span>{report.author}</span>
                            <span>•</span>
                            <span>{report.date}</span>
                            <span>•</span>
                            <span>{report.comments}</span>
                        </div>

                        <h2 className="insight-detail__subtitle">Abu Dhabi Highlights</h2>
                        <ul className="insight-detail__list">
                            <li className="insight-detail__list-item">
                                Abu Dhabi’s real estate market saw a notable slowdown in Q1 2025, with total sales transactions falling by 35% in volume and 24% in value year-on-year. The downturn was primarily driven by a sharp contraction in Off-plan sales, which dropped by 52% in volume and 50% in value compared to the same period last year likely reflecting fewer project launches.
                            </li>
                            <li className="insight-detail__list-item">
                                Total ready sales transactions continued to show healthy growth in Q1 2025, with value increasing by 75% year-on-year, supported by a more modest 9% rise in volume. The wide gap between volume and value suggests the presence of large commercial deals. Even excluding these, the residential ready market performed well, posting a 33% increase in value alongside a 5% rise in volume — potentially indicating upward pressure on prices.
                            </li>
                            <li className="insight-detail__list-item">
                                The off-plan market in Q1 2025 registered approximately 1,332 off-plan sales transactions, reflecting a sharp 52% decline in volume compared to 2,791 transactions in Q1 2024. The value of these transactions also decreased by 50%, reaching AED 4.9 bn, down from AED 9.9 bn. Despite the overall slowdown, off-plan transactions accounted for 53% of total transactions during the quarter.
                            </li>
                        </ul>

                        <h2 className="insight-detail__subtitle">Dubai Highlights</h2>
                        <ul className="insight-detail__list">
                            <li className="insight-detail__list-item">
                                In Q1 2025, the Dubai real estate market concentrated around the top 10 areas, which collectively accounted for 49% of total transaction volume. Dubai Land emerged as the leading community in terms of both volume and value, contributing approximately 12% of total transactions and 9% of total transaction value. The area moved up from 14th place in Q1 2024 to first place in Q1 2025, driven by its strategic appeal for long-term investment.
                            </li>
                            <li className="insight-detail__list-item">
                                Among the top 10 areas, Jumeirah Village Circle (JVC), which was the top performing community in Q1 2024, recorded a decline of 12% in transaction volume and 6% in value. This drop was influenced by the drop of the off-plan transaction volume by 18% and transaction value by 4%. Additionally, The Valley witnessed notable growth, climbing from 31st place in Q1 2024 to 7th place in Q1 2025 in terms of volume, while in terms of transaction value, it jumped from 26th place to 4th place, ranking just after Dubai Land, Business Bay, and Palm Jabal Ali.
                            </li>
                        </ul>
                    </div>

                    <aside className="insight-detail__side">
                        <div className="insight-detail__card">
                            <div className="insight-detail__card-image">
                                <img
                                    src={report.image}
                                    alt={report.title}
                                    className="insight-detail__image"
                                />
                            </div>
                        </div>
                        <button className="insight-detail__download">Download PDF</button>
                    </aside>
                </section>
            </Container>
        </main>
    );
};

export default InsightDetail;


