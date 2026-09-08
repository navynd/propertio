import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { DoubleStarIcon, DownLoadIcon, EditIcon, EyeDarkIcon, KingIcon, LeftArrowIcon, RightArrowIcon } from "../../../../components/CustomFile/icons";
import cardbg from "../../../../assets/img/Maskgroup.png";

const billingDetailsRows = [
    { label: "Name", value: "William turner" },
    { label: "Email address", value: "williamturner@gmail.com" },
    { label: "Mobile number", value: "+(000) 1234 5678" },
    {
        label: "Billing address",
        value: "Flat 1203, Al Noor Tower, Sheikh Zayed Road, Dubai, United Arab Emirates",
    },
];

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

const monthTitle = (date: Date) =>
    `${date.toLocaleString("en-US", { month: "long" })}(${date.getFullYear()})`;

const getCalendarCells = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [];

    for (let i = 0; i < firstDayIndex; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(day);
    while (cells.length < 42) cells.push(null);
    return cells;
};

type PaymentStatus = "paid" | "failed" | "processing";

type InvoiceRow = {
    id: string;
    planName: string;
    datePaid: string;
    amount: string;
    status: PaymentStatus;
};

const invoiceRows: InvoiceRow[] = [
    { id: "IN45696", planName: "Professional", datePaid: "30 May 2025", amount: "390 AED", status: "paid" },
    { id: "IN45697", planName: "Professional", datePaid: "28 Apr 2025", amount: "390 AED", status: "processing" },
    { id: "IN45698", planName: "Basic", datePaid: "15 Mar 2025", amount: "290 AED", status: "failed" },
    { id: "IN45699", planName: "Professional", datePaid: "02 Mar 2025", amount: "390 AED", status: "paid" },
    { id: "IN45700", planName: "Starter", datePaid: "10 Feb 2025", amount: "0 AED", status: "paid" },
];

const INVOICES_TABLE_GRID =
    "grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,0.8fr)_minmax(0,1.05fr)_minmax(108px,auto)] gap-2 items-center px-[14px] py-[12px]";

function paymentStatusBadgeClass(status: PaymentStatus) {
    switch (status) {
        case "paid":
            return "bg-[rgba(0,166,99,0.12)] text-[#00A663]";
        case "failed":
            return "bg-[rgba(234,57,52,0.12)] text-[#EA3934]";
        default:
            return "bg-[rgba(199,163,53,0.18)] text-[#9A6700]";
    }
}

function paymentStatusLabel(status: PaymentStatus) {
    if (status === "paid") return "Paid";
    if (status === "failed") return "Payment failed";
    return "Processing";
}

function CurrentPlanCard() {
    return (
        <div
            className="w-full min-w-0 lg:flex-1 lg:min-w-[min(100%,18rem)] xl:w-[50%] rounded-[20px] text-white relative min-h-[min(100%,320px)] flex flex-col justify-between p-6 md:p-8 shadow-[0_12px_40px_rgba(12,45,107,0.35)] bg-cover bg-center"
            style={{ backgroundImage: `url(${cardbg})` }}
        >
            <div className="relative z-[1] flex flex-wrap lg:items-center lg:justify-center items-start justify-between gap-3 gap-y-3">
                <div className="flex min-w-0 2xl:flex-1 2xl:basis-[min(100%,12rem)] lg:items-center lg:justify-center items-start gap-3">
                    <div className="h-[55px] w-[55px] rounded-full bg-[rgba(255,255,255,0.10)] flex items-center justify-center shrink-0 border border-[rgba(255,255,255,0.10)]">
                        <KingIcon width={22} height={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[16px] md:text-[20px] font-[Bold] leading-tight break-words">
                            Professional
                        </p>
                        <p className="text-[12px] font-[Medium] text-[rgba(255,255,255,0.70)] mt-1">
                            Your current plan
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    className="inline-flex shrink-0 items-center gap-1.5 self-start text-[13px] font-[SemiBold] text-white/95 hover:text-white whitespace-nowrap"
                >
                    <DoubleStarIcon width={20} height={20} /> Upgrade Plan
                </button>
            </div>

            <div className="relative z-[1] mt-6 md:mt-8 space-y-2 min-w-0">
                <p className="text-[22px] md:text-[30px] text-[#FFF] font-[Bold] leading-tight tracking-tight break-words lg:text-center 2xl:text-left">
                    AED 390
                    <span className="text-[14px] font-[Regular]">/month</span>
                </p>
                <p className="text-[12px] text-[#FFF] font-[Medium] lg:text-center 2xl:text-left">
                    Plan expire on 30 May 2026
                </p>
            </div>

            <div className="relative z-[1] mt-6 flex min-w-0 flex-wrap gap-3 md:mt-8">
                <button className="min-h-[44px] min-w-[min(100%,10rem)] flex-1 rounded-[10px] bg-white px-3 py-2.5 text-[14px] font-[Bold] text-[#222] hover:bg-white/95">
                    Renew subscription
                </button>

                <button className="min-h-[44px] min-w-[min(100%,10rem)] flex-1 rounded-[10px] bg-[#EA3934] px-3 py-2.5 text-[14px] font-[Bold] text-white hover:opacity-95">
                    Cancel subscription
                </button>
            </div>
        </div>
    );
}

function BillingDetailsCard() {
    return (
        <div className="w-full shrink-0 rounded-[20px] border border-[rgba(34,34,34,0.08)] bg-white p-6 md:p-8 flex flex-col min-h-0 lg:w-[380px] xl:w-[50%] lg:self-stretch">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3 md:mb-6">
                <h3 className="text-[18px] md:text-[20px] font-[Bold] text-[#222]">Billing details</h3>
                <button
                    type="button"
                    className="inline-flex items-center h-[33px] px-[14px] gap-1.5 text-[12px] font-[SemiBold] text-[#222] bg-[#F5F5F5] rounded-[50px] shrink-0 "
                >
                    <EditIcon width={16} height={16} stroke="#222222" />
                    Edit
                </button>
            </div>
            <div className="flex flex-1 flex-col">
                {billingDetailsRows.map((row) => (
                    <div
                        key={row.label}
                        className="flex items-start justify-between gap-4 border-b border-[rgba(34,34,34,0.08)] py-3 text-[14px] last:border-b-0"
                    >
                        <span className="shrink-0 font-[Regular] text-[14px] text-[#222]">{row.label}</span>
                        <span className="max-w-[min(240px,calc(100%-9rem))] min-w-0 text-right font-[Bold] text-[14px] leading-snug text-[#222] break-words">
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function InvoicesSection() {
    const [fromDate, setFromDate] = useState(new Date(2025, 11, 1));
    const [toDate, setToDate] = useState(new Date(2025, 11, 12));
    const [activeDatePicker, setActiveDatePicker] = useState<"from" | "to" | null>(null);
    const [displayMonth, setDisplayMonth] = useState(new Date(2025, 11, 1));
    const fromDateRef = useRef<HTMLDivElement>(null);
    const toDateRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (
                fromDateRef.current &&
                !fromDateRef.current.contains(e.target as Node) &&
                toDateRef.current &&
                !toDateRef.current.contains(e.target as Node)
            ) {
                setActiveDatePicker(null);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const calendarCells = getCalendarCells(displayMonth);

    const shiftMonth = (direction: -1 | 1) => {
        setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const openDatePicker = (type: "from" | "to") => {
        setActiveDatePicker((prev) => (prev === type ? null : type));
        const sourceDate = type === "from" ? fromDate : toDate;
        setDisplayMonth(new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1));
    };

    const selectDate = (day: number) => {
        const selectedDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
        if (activeDatePicker === "from") {
            setFromDate(selectedDate);
        } else if (activeDatePicker === "to") {
            setToDate(selectedDate);
        }
        setActiveDatePicker(null);
    };

    const renderDatePicker = (
        type: "from" | "to",
        selectedDate: Date,
        side: "left" | "right",
        ref: RefObject<HTMLDivElement | null>
    ) => (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => openDatePicker(type)}
                className="inline-flex h-[33px] cursor-pointer items-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[12px] font-[SemiBold] text-[#222]"
            >
                {formatDisplayDate(selectedDate)}
            </button>
            {activeDatePicker === type && (
                <div
                    className={`absolute top-[40px] z-20 h-[320px] w-[280px] rounded-[12px] bg-white p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)] ${side === "left" ? "left-0" : "right-0"}`}
                >
                    <div className="mb-[16px] flex items-center justify-between">
                        <button type="button" onClick={() => shiftMonth(-1)} className="px-[6px] text-[16px] font-[SemiBold] text-[#222] rotate-180">
                            <LeftArrowIcon width={14} height={14} />
                        </button>
                        <p className="text-[16px] font-[Bold] text-[#222]">{monthTitle(displayMonth)}</p>
                        <button type="button" onClick={() => shiftMonth(1)} className="px-[6px] text-[16px] font-[SemiBold] text-[#222]">
                            <RightArrowIcon width={14} height={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-[6px] text-center">
                        {weekDays.map((day, index) => (
                            <span key={`${type}-wd-${day}-${index}`} className="text-[13px] font-[SemiBold] text-[#222]">
                                {day}
                            </span>
                        ))}
                        {calendarCells.map((day, idx) => {
                            if (!day) {
                                return (
                                    <span
                                        key={`${type}-blank-${idx}`}
                                        className="mx-auto h-[30px] w-[30px] rounded-full border border-[rgba(34,34,34,0.10)] bg-[#FAFAFA]"
                                    />
                                );
                            }
                            const isSelected =
                                selectedDate.getDate() === day &&
                                selectedDate.getMonth() === displayMonth.getMonth() &&
                                selectedDate.getFullYear() === displayMonth.getFullYear();
                            return (
                                <button
                                    key={`${type}-${day}-${idx}`}
                                    type="button"
                                    onClick={() => selectDate(day)}
                                    className={`mx-auto h-[30px] w-[30px] rounded-full border text-[12px] font-[SemiBold] transition-colors ${isSelected
                                        ? "border-[#EA3934] bg-[#EA3934] text-white"
                                        : "border-[rgba(34,34,34,0.10)] text-[#707070] hover:bg-[#F2F2F2]"
                                        }`}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="min-w-0 rounded-[15px] border border-[rgba(34,34,34,0.08)] bg-white p-[20px] md:p-[30px]">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:mb-6">
                <h3 className="text-[18px] font-[Bold] text-[#222] md:text-[20px]">Invoices</h3>
                <div className="flex flex-wrap items-center gap-[10px]">
                    {renderDatePicker("from", fromDate, "left", fromDateRef)}
                    <span className="text-[12px] text-[#707070]">to</span>
                    {renderDatePicker("to", toDate, "right", toDateRef)}
                </div>
            </div>

            <div className="w-full overflow-x-auto scrollbar-hide">
                <div className="min-w-[900px]">
                    <div className="overflow-hidden rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white">
                        <div className={`${INVOICES_TABLE_GRID} border-b border-[rgba(34,34,34,0.10)] bg-[#F5F5F5]`}>
                            <p className="text-[14px] font-[Bold] text-[#222]">Invoice id</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Plan Name</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Date paid</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Paid amount</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Payment status</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
                        </div>

                        {invoiceRows.map((row, index) => (
                            <div
                                key={row.id}
                                className={`${INVOICES_TABLE_GRID} ${index !== invoiceRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                            >
                                <p className="text-[12px] font-[Bold] text-[#222]">{row.id}</p>
                                <p className="text-[12px] font-[Regular] text-[#222]">{row.planName}</p>
                                <p className="text-[12px] font-[Regular] text-[#222]">{row.datePaid}</p>
                                <p className="whitespace-nowrap text-[12px] font-[Regular] text-[#222]">{row.amount}</p>
                                <div className="flex items-center">
                                    <span
                                        className={`inline-flex items-center rounded-full px-[10px] py-[6px] text-[11px] font-[SemiBold] leading-none md:text-[12px] ${paymentStatusBadgeClass(row.status)}`}
                                    >
                                        {paymentStatusLabel(row.status)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-[6px]">
                                    <button type="button" className="cursor-pointer rounded-[8px] p-[6px] hover:bg-[#F1F5F9]" aria-label="View invoice">
                                        <EyeDarkIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer rounded-[8px] p-[6px] hover:bg-[#F1F5F9]" aria-label="Download invoice">

                                        {row.status === "failed" ? (
                                            <DownLoadIcon width={20} height={20} fill="#707070" />
                                        ) : (
                                            <DownLoadIcon width={20} height={20} fill="#222222" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const OverView = () => {
    return (
        <div className="flex min-w-0 flex-col gap-5">
            <div className="flex min-w-0 flex-col items-stretch gap-5 lg:flex-row lg:flex-wrap">
                <CurrentPlanCard />
                <BillingDetailsCard />
            </div>
            <InvoicesSection />
        </div>
    );
};

export default OverView;
