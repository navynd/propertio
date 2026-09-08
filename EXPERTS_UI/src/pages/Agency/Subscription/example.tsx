import { useState } from "react";
import { EditIcon, KingIcon, RightArrowIcon } from "../../../components/CustomFile/icons";
import AgencyHeader from "../../../components/Header/AgencyHeader";

type SubscriptionSection = "overview" | "plans" | "cards";
type BillingCycle = "monthly" | "quarterly" | "yearly";

const subscriptionNav: { id: SubscriptionSection; label: string }[] = [
    { id: "overview", label: "Subscription Overview" },
    { id: "plans", label: "Subscription plans" },
    { id: "cards", label: "Manage debit/credit cards" },
];

const billingCycleOptions: { id: BillingCycle; label: string }[] = [
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "yearly", label: "Yearly" },
];

type PlanPrice = { line: string; isFree?: boolean };

type PlanDef = {
    id: string;
    name: string;
    durationBadge: string;
    description: string;
    prices: Record<BillingCycle, PlanPrice>;
    features: string[];
};

const subscriptionPlans: PlanDef[] = [
    {
        id: "starter",
        name: "Starter plan",
        durationBadge: "Plan duration 30days",
        description: "Plan suitable for startups",
        prices: {
            monthly: { line: "Free", isFree: true },
            quarterly: { line: "Free", isFree: true },
            yearly: { line: "Free", isFree: true },
        },
        features: [
            "Sed faucibus vitae pretium tortor",
            "Suspendisse at cursus ex",
            "Maecenas tempus tellus eget condimentum",
            "Nam quam nunc blandit vel luctus pulvinar",
        ],
    },
    {
        id: "basic",
        name: "Basic plan",
        durationBadge: "Plan duration 30days",
        description: "Plan suitable for startups",
        prices: {
            monthly: { line: "AED 390/month" },
            quarterly: { line: "AED 1,050/quarter" },
            yearly: { line: "AED 3,900/year" },
        },
        features: [
            "Sed faucibus vitae pretium tortor",
            "Suspendisse at cursus ex",
            "Maecenas tempus tellus eget condimentum",
            "Nam quam nunc blandit vel luctus pulvinar",
        ],
    },
    {
        id: "standard",
        name: "Standard plan",
        durationBadge: "Plan duration 30days",
        description: "Plan suitable for startups",
        prices: {
            monthly: { line: "AED 390/month" },
            quarterly: { line: "AED 1,050/quarter" },
            yearly: { line: "AED 3,900/year" },
        },
        features: [
            "Sed faucibus vitae pretium tortor",
            "Suspendisse at cursus ex",
            "Maecenas tempus tellus eget condimentum",
            "Nam quam nunc blandit vel luctus pulvinar",
        ],
    },
];

const billingDetailsRows = [
    { label: "Name", value: "William turner" },
    { label: "Email address", value: "williamturner@gmail.com" },
    { label: "Mobile number", value: "+(000) 1234 5678" },
    {
        label: "Billing address",
        value: "Flat 1203, Al Noor Tower, Sheikh Zayed Road, Dubai, United Arab Emirates",
    },
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
                        className={`w-full flex items-center justify-between gap-3 px-5 py-4 text-left text-[14px] border-b border-[rgba(34,34,34,0.08)] last:border-b-0 transition-colors ${isActive
                            ? "bg-[#E8F1FF] text-[#0832AE] font-[SemiBold] border-l-[3px] border-l-[#0832AE] pl-[17px]"
                            : "text-[#222] font-[Regular] hover:bg-[#FAFAFA]"
                            }`}
                    >
                        <span>{item.label}</span>
                        <RightArrowIcon width={8} height={12} fill={isActive ? "#0832AE" : "#B0B0B0"} />
                    </button>
                );
            })}
        </nav>
    );
}

function CurrentPlanCard() {
    return (
        <div className="flex-1 min-w-0 rounded-[15px] overflow-hidden text-white relative min-h-[320px] flex flex-col justify-between p-6 md:p-8 bg-gradient-to-br from-[#1a5fd4] via-[#2563eb] to-[#0c4a9e] shadow-[0_12px_40px_rgba(37,99,235,0.25)]">
            <div className="pointer-events-none absolute inset-0 opacity-30">
                <div className="absolute -right-8 -top-16 w-48 h-48 rounded-full bg-white/20 blur-2xl" />
                <div className="absolute right-1/4 bottom-0 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
            </div>
            <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
                        <KingIcon width={22} height={22} />
                    </div>
                    <div>
                        <p className="text-[22px] md:text-[26px] font-[Bold] leading-tight">Professional</p>
                        <p className="text-[13px] text-white/80 mt-1">Your current plan</p>
                    </div>
                </div>
                <button
                    type="button"
                    className="self-start sm:self-auto text-[13px] font-[SemiBold] text-white/95 hover:text-white inline-flex items-center gap-1.5 shrink-0"
                >
                    <span className="text-[15px]" aria-hidden>
                        ✦
                    </span>
                    Upgrade Plan
                </button>
            </div>
            <div className="relative mt-8 space-y-2">
                <p className="text-[28px] md:text-[32px] font-[Bold] leading-tight">AED 390 /month</p>
                <p className="text-[14px] text-white/85">Plan expire on 30 May 2026</p>
            </div>
            <div className="relative flex flex-col sm:flex-row gap-3 mt-8">
                <button
                    type="button"
                    className="flex-1 h-[44px] rounded-[10px] bg-white text-[#222] text-[14px] font-[Bold] hover:bg-white/95 transition-opacity"
                >
                    Renew subscription
                </button>
                <button
                    type="button"
                    className="flex-1 h-[44px] rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold] hover:opacity-95 transition-opacity"
                >
                    Cancel subscription
                </button>
            </div>
        </div>
    );
}

function BillingDetailsCard() {
    return (
        <div className="w-full xl:w-[min(100%,380px)] shrink-0 rounded-[15px] bg-white border border-[rgba(34,34,34,0.08)] p-6 md:p-8">
            <div className="flex items-start justify-between gap-3 mb-6">
                <h3 className="text-[18px] md:text-[20px] font-[Bold] text-[#222]">Billing details</h3>
                <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-[13px] font-[SemiBold] text-[#0832AE] hover:opacity-90"
                >
                    <EditIcon width={16} height={16} />
                    Edit
                </button>
            </div>
            <div className="flex flex-col">
                {billingDetailsRows.map((row) => (
                    <div
                        key={row.label}
                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 py-3 border-b border-[rgba(34,34,34,0.08)] last:border-b-0 text-[14px]"
                    >
                        <span className="text-[#222] font-[Regular] shrink-0">{row.label}</span>
                        <span className="text-[#222] font-[Bold] sm:text-right max-w-full sm:max-w-[240px]">{row.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PlansSection({ cycle, onCycleChange }: { cycle: BillingCycle; onCycleChange: (c: BillingCycle) => void }) {
    return (
        <div className="flex flex-col gap-6 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222]">Subscription plans</h2>
                <div className="inline-flex items-center gap-1 p-1 rounded-full bg-[#F0F0F0] w-fit">
                    {billingCycleOptions.map((opt) => {
                        const active = cycle === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => onCycleChange(opt.id)}
                                className={`px-4 py-2 rounded-full text-[12px] font-[SemiBold] transition-colors ${active ? "bg-[#222] text-white" : "text-[#707070] hover:text-[#222]"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {subscriptionPlans.map((plan) => {
                    const price = plan.prices[cycle];
                    return (
                        <div
                            key={plan.id}
                            className="rounded-[12px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white flex flex-col"
                        >
                            <div className="bg-[#F5F5F5] p-5 relative">
                                <span className="absolute top-4 right-4 text-[10px] font-[SemiBold] text-[#707070] bg-white/90 px-2 py-1 rounded-full border border-[rgba(34,34,34,0.06)]">
                                    {plan.durationBadge}
                                </span>
                                <div className="h-11 w-11 rounded-full bg-white border border-[rgba(34,34,34,0.08)] flex items-center justify-center mb-3">
                                    <KingIcon width={20} height={20} />
                                </div>
                                <p className="text-[16px] font-[Bold] text-[#222] mb-2">{plan.name}</p>
                                <p
                                    className={`text-[22px] font-[Bold] mb-1 leading-tight ${price.isFree ? "text-[#0832AE]" : "text-[#222]"}`}
                                >
                                    {price.line}
                                </p>
                                <p className="text-[12px] text-[#707070] mb-4">{plan.description}</p>
                                <button
                                    type="button"
                                    className="w-full h-[42px] rounded-[10px] bg-[#EA3934] text-white text-[13px] font-[Bold] hover:opacity-95 transition-opacity"
                                >
                                    Select this plan
                                </button>
                            </div>
                            <div className="p-5 flex-1">
                                <ul className="list-disc pl-5 space-y-2 text-[13px] text-[#222] font-[Regular] leading-[160%]">
                                    {plan.features.map((f, i) => (
                                        <li key={i}>{f}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PaymentCardVisual() {
    return (
        <div className="relative w-full max-w-[400px] aspect-[1.58/1] rounded-[16px] bg-[#0a0a0a] text-white overflow-hidden shadow-lg">
            <div className="absolute -right-6 -top-10 w-32 h-32 rounded-full bg-[#EA3934]/90" />
            <div className="absolute -bottom-8 left-1/3 w-40 h-40 rounded-full bg-[#22c55e]/80" />
            <div className="relative p-6 h-full flex flex-col justify-between">
                <div>
                    <p className="text-[22px] font-[Bold] tracking-[0.2em] italic text-white">VISA</p>
                </div>
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Card number</p>
                        <p className="text-[16px] md:text-[18px] font-[SemiBold] tracking-widest">**** **** **** 2345</p>
                    </div>
                    <div className="flex justify-between gap-4">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Card holder name</p>
                            <p className="text-[14px] font-[Bold]">William turner</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">Expire date</p>
                            <p className="text-[14px] font-[Bold]">05/27</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CardsSection() {
    return (
        <div className="flex flex-col gap-5 min-w-0">
            <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.08)] px-5 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222]">Manage debit/credit cards</h2>
                <button
                    type="button"
                    className="h-[40px] px-5 rounded-[10px] bg-[#EA3934] text-white text-[13px] font-[Bold] whitespace-nowrap hover:opacity-95 transition-opacity"
                >
                    + Add debit/credit card
                </button>
            </div>
            <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.08)] p-6 md:p-8">
                <h3 className="text-[16px] font-[Bold] text-[#222] mb-6">Card using for payments</h3>
                <PaymentCardVisual />
            </div>
        </div>
    );
}

const Subscription = () => {
    const [section, setSection] = useState<SubscriptionSection>("overview");
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px] bg-[#F5F5F5] min-h-screen">
            <AgencyHeader title="Subscription" showBack={false} onBackClick={() => { }} />

            <div className="flex flex-col lg:flex-row gap-5 items-start">
                <SubscriptionSidebar active={section} onSelect={setSection} />

                <div className="flex-1 min-w-0 w-full flex flex-col gap-5">
                    {section === "overview" && (
                        <div className="flex flex-col xl:flex-row gap-5">
                            <CurrentPlanCard />
                            <BillingDetailsCard />
                        </div>
                    )}
                    {section === "plans" && (
                        <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.08)] p-5 md:p-8">
                            <PlansSection cycle={billingCycle} onCycleChange={setBillingCycle} />
                        </div>
                    )}
                    {section === "cards" && <CardsSection />}
                </div>
            </div>
        </div>
    );
};

export default Subscription;
