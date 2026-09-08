import { useMemo, useState } from "react";
import { DownloadIcon, PdfIcon } from "../../../../components/CustomFile/icons";
import { PayMapGoogleMap } from "./PayMapGoogleMap";
import { toMapEmbedSrc } from "../../../../utils/projectLocationUtils";

const TAB_ACTIVE = "text-[#0832AE] font-[SemiBold] border-[#0832AE]";
const TAB_INACTIVE = "text-[#222] font-[Regular] border-transparent";

type PaymentCard = {
    percent: string;
    title: string;
    subtitle?: string;
};

type PlanInput = {
    planName?: string;
    downPayment?: { percentage?: number };
    duringConstruction?: { percentage?: number; installments?: Array<unknown> };
    onHandover?: { percentage?: number };
};

type PayMapProps = {
    paymentPlans?: PlanInput[];
    brochureName?: string | null;
    brochureUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
};

function PayMap({ paymentPlans, brochureName, brochureUrl, latitude, longitude }: PayMapProps) {
    const normalizedPlans = useMemo(() => (paymentPlans || []).map((plan, index) => [
        {
            percent: `${plan.downPayment?.percentage ?? 0}%`,
            title: "Down payment",
            subtitle: "At sales launch",
        },
        {
            percent: `${plan.duringConstruction?.percentage ?? 0}%`,
            title: "During construction",
            subtitle: `${Array.isArray(plan.duringConstruction?.installments) ? plan.duringConstruction?.installments?.length || 0 : 0} installments`,
        },
        {
            percent: `${plan.onHandover?.percentage ?? 0}%`,
            title: "On handover",
            subtitle: plan.planName || `Option ${index + 1}`,
        },
    ]), [paymentPlans]);
    const tabCount = normalizedPlans.length;
    const [activeTab, setActiveTab] = useState(1);
    const cards = tabCount > 0 ? (normalizedPlans[Math.min(activeTab - 1, tabCount - 1)] as PaymentCard[]) : [];
    const hasValidCoords =
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        Math.abs(latitude) <= 90 &&
        Math.abs(longitude) <= 180;
    const mapSrc = hasValidCoords ? toMapEmbedSrc(latitude, longitude) : null;
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
    const useGoogleMap = hasValidCoords && Boolean(googleMapsApiKey.trim());

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="flex flex-col gap-[20px]">
                {/* Uploaded brochure — top left */}
                <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col">
                    <h2 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-4">Uploaded brochure</h2>
                    <div className="rounded-[10px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)] p-[25px_20px] flex items-center gap-4 min-w-0">
                        <span className="shrink-0 inline-flex">
                            <PdfIcon width={34} height={42} />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[15px] font-[Bold] text-[#222] truncate">{brochureName || "No brochure uploaded"}</p>
                            <p className="text-[12px] font-[Regular] text-[#707070] mt-1">Uploaded brochure</p>
                        </div>
                        <a
                            href={brochureUrl || undefined}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Download brochure"
                            className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-[10px] border border-[rgba(34,34,34,0.08)] flex items-center justify-center transition-colors ${brochureUrl ? "cursor-pointer bg-[#F5F5F5] hover:bg-[#EBEBEB]" : "pointer-events-none bg-[#FAFAFA] opacity-40"}`}
                        >
                            <DownloadIcon width={14} height={14} />
                        </a>
                    </div>
                </section>
                {/* Payment plan — bottom left */}
                <section className="rounded-[15px] bg-white  flex flex-col">
                    <h2 className="md:p-[30px_30px_15px_30px] p-[20px] md:text-[20px] text-[16px] font-[Bold] text-[#222]">Payment plan</h2>
                    <div className="md:p-[0px_30px_0px_30px] p-[0px_20px_0px_20px] flex border-b border-[rgba(34,34,34,0.08)] mb-5">
                        {Array.from({ length: tabCount }, (_, idx) => idx + 1).map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`cursor-pointer p-[20px_30px] text-[13px] font-[Regular] border-b-[3px] -mb-px transition-colors ${activeTab === tab ? TAB_ACTIVE : TAB_INACTIVE
                                    }`}
                            >
                                Option {tab}
                            </button>
                        ))}
                    </div>
                    {/* Payment plan cards */}
                    {/* <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:p-[0px_30px_30px_30px] p-[0px_20px_20px_20px]">
                        {cards.length ? cards.map((card) => (
                            <div
                                key={`${activeTab}-${card.percent}-${card.title}`}
                                className="flex-1  rounded-[10px] bg-[#F5F5F5] p-[18px] min-w-0"
                            >
                                <p className="text-[17px] font-[Bold] text-[#222] leading-none mb-2 text-center">{card.percent}</p>
                                <p className="text-[14px] font-[Medium] text-[#222] text-center mb-1">{card.title}</p>
                                {card.subtitle ? (
                                    <p className="text-[12px] font-[Regular] text-[#707070] text-center">{card.subtitle}</p>
                                ) : null}
                            </div>
                        )) : (
                            <div className="text-[13px] text-[#707070]">Payment plan not available</div>
                        )}
                    </div> */}
                    {/* Payment plan cards — ALWAYS scroll */}
                    <div className="overflow-x-auto scrollbar-hide md:p-[0px_0px_30px_0px] md:m-[0px_30px_0px_30px] p-[0px_0px_20px_0px] m-[0px_20px_0px_20px]">
                        <div className="flex gap-3 sm:gap-4 flex-nowrap">
                            {cards.length ? (
                                cards.map((card) => (
                                    <div
                                        key={`${activeTab}-${card.percent}-${card.title}`}
                                        className="flex-shrink-0 min-w-[180px] rounded-[10px] bg-[#F5F5F5] p-[18px]">
                                        <p className="text-[17px] font-[Bold] text-[#222] mb-[3px] text-center whitespace-nowrap">
                                            {card.percent}
                                        </p>
                                        <p className="text-[14px] font-[Medium] text-[#222] text-center mb-1 whitespace-nowrap">
                                            {card.title}
                                        </p>
                                        {card.subtitle && (
                                            <p className="text-[12px] font-[Regular] text-[#707070] text-center whitespace-nowrap">
                                                {card.subtitle}
                                            </p>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-[13px] text-[#707070]">
                                    Payment plan not available
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
            {/* Map — right column, full height */}
            <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col">
                <h2 className="text-[16px] md:text-[20px] font-[Bold] text-[#222] mb-4 shrink-0">Map location</h2>
                <div className="relative flex-1 min-h-[240px] lg:min-h-[320px] rounded-[15px] overflow-hidden bg-[#E8E8E8]">
                    {hasValidCoords && useGoogleMap ? (
                        <div className="absolute inset-0 min-h-[240px] lg:min-h-[320px]">
                            <PayMapGoogleMap latitude={latitude} longitude={longitude} />
                        </div>
                    ) : hasValidCoords && mapSrc ? (
                        <iframe
                            title="Project location map"
                            src={mapSrc}
                            className="absolute inset-0 h-full w-full border-0"
                            loading="lazy"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[13px] font-[Regular] text-[#707070]">
                            Location is not available
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default PayMap;
