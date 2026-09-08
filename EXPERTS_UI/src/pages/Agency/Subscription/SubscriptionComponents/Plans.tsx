import { useState } from "react";
import { KingIcon } from "../../../../components/CustomFile/icons";

type BillingCycle = "monthly" | "quarterly" | "yearly";

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
    status: string;
};

const subscriptionPlans: PlanDef[] = [
    {
        id: "starter",
        name: "Starter plan",
        durationBadge: "Plan duration 30days",
        description: "Plan suitable for startups",
        status: "currentplan",
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
        status: "",
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
        status: "",
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

function formatPriceDisplay(line: string, isFree?: boolean) {
    if (isFree) {
        return <span className="text-[22px] font-[Bold] leading-tight text-[#0832AE] md:text-[30px]">{line}</span>;
    }
    const slash = line.indexOf("/");
    if (slash > 0) {
        const main = line.slice(0, slash);
        const suffix = line.slice(slash);
        return (
            <span className="leading-tight text-[#222]">
                <span className="text-[22px] font-[Bold] text-[#222] md:text-[30px]">{main}</span>
                <span className="text-[14px] font-[Regular] text-[#707070] md:text-[14px]">{suffix}</span>
            </span>
        );
    }
    return <span className="text-[22px] font-[Bold] leading-tight text-[#222] md:text-[24px]">{line}</span>;
}

export default function Plans() {
    const [cycle, setCycle] = useState<BillingCycle>("monthly");

    return (
        <div className="flex min-w-0 flex-col gap-6 md:gap-8">
            <div className="p-[20px] bg-[#FFF] rounded-[15px] flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-[18px] font-[Bold] text-[#222] md:text-[20px]">Subscription plans</h2>
                <div
                    className="inline-flex max-w-full flex-wrap items-center gap-1"
                    role="group"
                    aria-label="Billing cycle"
                >
                    {billingCycleOptions.map((opt) => {
                        const active = cycle === opt.id;
                        return (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setCycle(opt.id)}
                                className={`rounded-full px-4 py-2 text-[12px] font-[SemiBold] transition-colors whitespace-nowrap ${active
                                    ? "bg-[#222] text-white shadow-sm"
                                    : "border border-[#E0E0E0] bg-white text-[#222] hover:border-[#D0D0D0]"
                                    }`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-wrap gap-5 bg-[#F5F5F5]">
                {subscriptionPlans.map((plan) => {
                    const price = plan.prices[cycle];
                    return (
                        <div
                            key={plan.id}
                            className="flex min-w-[min(100%,17.5rem)] flex-1 basis-[260px] flex-col overflow-hidden rounded-[14px] border-[4px] border-[#FFF] bg-white"
                        >
                            <div className="relative bg-[#F5F5F5] rounded-[12px] md:p-[20px] p-[10px]">
                                <span className="absolute top-4 right-4 max-w-[calc(100%-2rem)] rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white px-2.5 py-1 text-right text-[12px] font-[SemiBold] leading-tight text-[#222]">
                                    {plan.durationBadge}
                                </span>
                                <div className="mb-4 mt-[20px] flex items-center gap-3 pt-1">
                                    <div className="flex w-[55px] h-[55px] shrink-0 items-center justify-center rounded-full bg-white">
                                        <KingIcon width={27} height={27} />
                                    </div>
                                    <p className="text-[15px] font-[Medium] text-[#222]">{plan.name}</p>
                                </div>
                                <div className="mb-1">{formatPriceDisplay(price.line, price.isFree)}</div>
                                <p className="mb-5 text-[12px] font-[Medium] leading-snug text-[#222]">{plan.description}</p>
                                {plan.status === "currentplan" ? (
                                    <button
                                        type="button"
                                        className="h-[44px] w-full rounded-[10px] bg-[#FFF] text-[14px] font-[Bold] text-[#222"
                                    >
                                        Current plan
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="h-[44px] w-full rounded-[10px] bg-[#D4A373] text-[14px] font-[Bold] text-white"
                                    >
                                        Select this plan
                                    </button>
                                )}
                            </div>
                            <div className="min-w-0 flex-1 bg-white px-5 py-5 md:px-6 md:py-6">
                                <ul className="list-disc space-y-2.5 pl-5 text-[14px] font-[Regular] leading-[160%] text-[#222] marker:text-[#222]">
                                    {plan.features.map((f, i) => (
                                        <li key={i} className="break-words pl-0.5">
                                            {f}
                                        </li>
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
