import { useState } from "react";
import { RightArrowIcon } from "../../../components/CustomFile/icons";
import AgencyHeader from "../../../components/Header/AgencyHeader";
import DebitCard from "./SubscriptionComponents/DebitCard";
import OverView from "./SubscriptionComponents/OverView";
import Plans from "./SubscriptionComponents/Plans";
type SubscriptionSection = "overview" | "plans" | "cards";

const subscriptionNav: { id: SubscriptionSection; label: string }[] = [
    { id: "overview", label: "Subscription Overview" },
    { id: "plans", label: "Subscription plans" },
    { id: "cards", label: "Manage debit/credit cards" },
];

function SubscriptionSidebar({
    active,
    onSelect,
}: {
    active: SubscriptionSection;
    onSelect: (id: SubscriptionSection) => void;
}) {
    return (
        <nav className="w-full lg:w-[min(100%,300px)] shrink-0 rounded-[15px] bg-white border border-[rgba(34,34,34,0.08)] overflow-hidden">
            {subscriptionNav.map((item) => {
                const isActive = active === item.id;
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item.id)}
                        className={`cursor-pointer w-full flex items-center justify-between gap-3 px-5 py-4 text-left text-[13px] border-b border-[rgba(34,34,34,0.08)] last:border-b-0 transition-colors border-l-[3px] box-border ${isActive
                            ? "bg-[rgba(8,50,174,0.10)] text-[#0832AE] font-[Medium] border-l-[#0832AE]"
                            : "text-[#222] font-[Regular] border-l-transparent hover:bg-[#FAFAFA]"
                            }`}
                    >
                        <span className="min-w-0">{item.label}</span>
                        <RightArrowIcon width={8} height={12} fill={isActive ? "#0832AE" : "#B0B0B0"} className="shrink-0" />
                    </button>
                );
            })}
        </nav>
    );
}

const Subscription = () => {
    const [section, setSection] = useState<SubscriptionSection>("overview");

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px] bg-[#F5F5F5] min-h-screen">
            <AgencyHeader title="Subscription" showBack={false} onBackClick={() => { }} />

            <div className="flex flex-col lg:flex-row gap-5 items-stretch lg:items-start">
                <SubscriptionSidebar active={section} onSelect={setSection} />

                <div className="flex-1 min-w-0 w-full flex flex-col gap-5">
                    {section === "overview" && <OverView />}
                    {section === "plans" && (
                        <div className="min-w-0">
                            <Plans />
                        </div>
                    )}
                    {section === "cards" && <DebitCard />}
                </div>
            </div>
        </div>
    );
};

export default Subscription;
