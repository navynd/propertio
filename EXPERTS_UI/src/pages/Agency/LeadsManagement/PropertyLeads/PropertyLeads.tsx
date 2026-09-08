import { useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon, EyeDarkIcon, LocationIcon, LeftArrowIcon, RightArrowIcon, WhatsappIcon, CallIcon, MessageIcon } from "../../../../components/CustomFile/icons";
import AgencyHeader from "../../../../components/Header/AgencyHeader";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import home1img from "../../../../assets/img/home1.png";
import home2img from "../../../../assets/img/home2.png";
import home3img from "../../../../assets/img/home3.png";
import profileimg from "../../../../assets/img/user.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    agencyService,
} from "../../../../services/agencyService";
import mainbg from "../../../../assets/img/mainbg.png";
import { toast } from "../../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../../services/apiClient";
import Loader from "../../../../components/Loader/loader";
type LeadSource = "whatsapp" | "call" | "message";

type LeadRow = {
    id: string;
    propertyName: string;
    location: string;
    image: string;
    sourceIcon: LeadSource;
    date: string;
    agentName: string;
    agentTitle: string;
    agentAvatar: string;
    customerName: string;
    customerPhone: string;
    customerAvatar?: string;
    closedDealAmount?: string;
    status: string;
};

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
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

type LeadsData = Array<{
    id: number;
    name: string;
    subItems: Array<{
        id: number;
        name: string;
        subItems: LeadRow[];
    }>;
}>;

const leads: LeadsData = [
    {
        id: 1,
        name: "Customer requests",
        subItems: [
            {
                id: 1,
                name: "New inquiry",
                subItems: [
                    {
                        id: "1",
                        status: "newinquiry",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        closedDealAmount: "9,000,000 AED",
                        sourceIcon: "whatsapp",
                    },
                    {
                        id: "2",
                        status: "newinquiry",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home2img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        closedDealAmount: "9,000,000 AED",
                        sourceIcon: "call",
                    },
                ],
            },
            {
                id: 2,
                name: "Attended inquiry",
                subItems: [
                    {
                        id: "1",
                        status: "attended",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home3img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        closedDealAmount: "9,000,000 AED",
                        sourceIcon: "message",
                    },
                ],
            },
            {
                id: 3,
                name: "Closed inquiry",
                subItems: [
                    {
                        id: "1",
                        status: "closedinquiry",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        closedDealAmount: "9,000,000 AED",
                        sourceIcon: "whatsapp",
                    },
                ],
            },
        ],
    },
    {
        id: 2,
        name: "Closed Sale/Rent",
        subItems: [
            {
                id: 1,
                name: "Sale",
                subItems: [
                    {
                        id: "1",
                        status: "closedsale",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        closedDealAmount: "9,000,000 AED",
                        sourceIcon: "whatsapp",
                    },
                ],
            },
            {
                id: 2,
                name: "Rent",
                subItems: [
                    {
                        id: "1",
                        status: "closedsale",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home2img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        closedDealAmount: "9,000,000 AED",
                        sourceIcon: "call",
                    },
                ],
            },
        ],
    },
];



function sourceIconChip(sourceIcon: LeadSource) {
    if (sourceIcon === "whatsapp") return { bg: "bg-[#25D366]", Icon: WhatsappIcon };
    if (sourceIcon === "call") return { bg: "bg-[#D4A373]", Icon: CallIcon };
    return { bg: "bg-[#0832AE]", Icon: MessageIcon };
}

const TABLE_GRID_BASE =
    "grid grid-cols-[2.3fr_1.2fr_1.2fr_2fr_2fr_1fr] gap-2 items-center px-[14px] py-[12px]";
const TABLE_GRID_CLOSED =
    "grid grid-cols-[2.3fr_0.8fr_1.1fr_2fr_2fr_1.3fr_1fr] gap-2 items-center px-[14px] py-[12px]";

const parseYmdToLocalDate = (raw: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    if (
        dt.getFullYear() !== y ||
        dt.getMonth() !== mo ||
        dt.getDate() !== d
    ) {
        return null;
    }
    return dt;
};

function datesFromSearchParams(params: URLSearchParams): {
    from: Date | null;
    to: Date | null;
} {
    const s = params.get("startDate");
    const e = params.get("endDate");
    return {
        from: s ? parseYmdToLocalDate(s) : null,
        to: e ? parseYmdToLocalDate(e) : null,
    };
}

const PropertyLeads = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fetchSeqRef = useRef(0);
    const defaultMain = leads[0]?.name ?? "";
    const defaultSub = leads[0]?.subItems?.[0]?.name ?? "";
    const [mainTab, setMainTab] = useState<string>(defaultMain);
    const [subTab, setSubTab] = useState<string>(defaultSub);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const [apiLeads, setApiLeads] = useState<LeadRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fromDate, setFromDate] = useState<Date | null>(
        () => datesFromSearchParams(searchParams).from,
    );
    const [toDate, setToDate] = useState<Date | null>(
        () => datesFromSearchParams(searchParams).to,
    );
    const [activeDatePicker, setActiveDatePicker] = useState<"from" | "to" | null>(null);
    const [displayMonth, setDisplayMonth] = useState(() => {
        const n = new Date();
        return new Date(n.getFullYear(), n.getMonth(), 1);
    });
    const fromDateRef = useRef<HTMLDivElement>(null);
    const toDateRef = useRef<HTMLDivElement>(null);
    const [imageBaseUrls, setImageBaseUrls] = useState({
        agent: "",
        property: "",
        user: "",
    });

    useEffect(() => {
        const { from, to } = datesFromSearchParams(searchParams);
        setFromDate(from);
        setToDate(to);
    }, [searchParams]);

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

    useEffect(() => {
        setCurrentPage(1);
    }, [mainTab, subTab, search, fromDate, toDate]);

    const activeMain = useMemo(() => leads.find((m) => m.name === mainTab) ?? leads[0], [mainTab]);
    const activeSubItems = activeMain?.subItems ?? [];

    useEffect(() => {
        if (!activeMain) return;
        if (activeSubItems.some((s) => s.name === subTab)) return;
        setSubTab(activeSubItems[0]?.name ?? "");
    }, [activeMain, activeSubItems, subTab]);

    const activeSub = useMemo(
        () => activeSubItems.find((s) => s.name === subTab) ?? activeSubItems[0],
        [activeSubItems, subTab]
    );

    const calendarCells = getCalendarCells(displayMonth);

    const shiftMonth = (direction: -1 | 1) => {
        setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const formatDateForApi = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    const getTabParams = (): {
        status?: "new" | "attended" | "closed" | "closed-sale-rent";
        transactionType?: "sale" | "rent";
    } => {
        if (mainTab === "Customer requests") {
            return {
                status:
                    subTab === "New inquiry"
                        ? "new"
                        : subTab === "Attended inquiry"
                            ? "attended"
                            : "closed",
            };
        }
        return {
            status: "closed-sale-rent",
            transactionType: subTab === "Sale" ? "sale" : "rent",
        };
    };

    useEffect(() => {
        const fetchLeads = async () => {
            const seq = ++fetchSeqRef.current;
            try {
                setLoading(true);

                const { status, transactionType } = getTabParams();

                const res = await agencyService.getPropertyLeads({
                    status,
                    transactionType,
                    search: search.trim() || undefined,
                    ...(fromDate ? { startDate: formatDateForApi(fromDate) } : {}),
                    ...(toDate ? { endDate: formatDateForApi(toDate) } : {}),
                    page: currentPage,
                    limit: itemsPerPage,
                    counts: true,
                });

                const list = res.inquiries || [];
                const mapped = list.map(mapInquiryToLead);

                if (seq !== fetchSeqRef.current) return;
                setApiLeads(mapped);
                setTotal(res?.pagination?.total ?? mapped.length);
            } catch (err) {
                if (seq !== fetchSeqRef.current) return;
                console.error("API ERROR:", err);
                setApiLeads([]);
                setTotal(0);
                toast.error(
                    "Could not load property leads",
                    getApiErrorMessage(err, "Please try again."),
                );
            } finally {
                if (seq === fetchSeqRef.current) setLoading(false);
            }
        };

        fetchLeads();
    }, [mainTab, subTab, currentPage, search, fromDate, toDate]);

    const mapInquiryToLead = (item: any): LeadRow => {
        const primaryImage =
            item.subject?.images?.find((img: any) => img.isPrimary)?.url ||
            item.subject?.images?.[0]?.url ||
            "";



        return {
            id: String(item.id),
            propertyName: item.subject?.title || "-",
            location: item.subject?.location?.fullAddress || "-",
            image: primaryImage,

            sourceIcon:
                item.inquiryType === "whatsapp"
                    ? "whatsapp"
                    : item.inquiryType === "call"
                        ? "call"
                        : "message",

            date: formatDisplayDate(
                new Date(item.closedAt || item.attendedAt || item.inquiredAt || Date.now())
            ),

            agentName: item.agent?.fullName || "-",
            agentTitle: item.agent?.position || item.agent?.specialization?.title || "-",
            agentAvatar: item.agent?.profilePicture || profileimg,

            customerName: item.customer?.name || "-",
            customerPhone: item.customer?.phoneNumber || "-",
            customerAvatar:
                item.customer?.profilePicture ||
                item.customer?.profile_picture ||
                "profileless.png",

            closedDealAmount: item.dealClosed?.dealAmount
                ? `${item.dealClosed.dealAmount}`
                : undefined,

            status: item.status,
        };
    };

    useEffect(() => {
        let isMounted = true;

        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallbackProperty = `${fallbackOrigin}/uploads/img/property/`;
        const fallbackUser = `${fallbackOrigin}/uploads/img/user/`;

        agencyService
            .getMasterData(["supportedurls"])
            .then((data) => {
                if (!isMounted) return;

                const supported = data?.supportedUrls;

                setImageBaseUrls({
                    agent: supported?.agentUrl?.img?.trim() || fallbackProperty,
                    property: supported?.propertyUrl?.img?.trim() || fallbackProperty,
                    user: supported?.userUrl?.img?.trim() || fallbackUser,
                });

            })
            .catch(() => {
                if (!isMounted) return;

                setImageBaseUrls({
                    agent: fallbackProperty,
                    property: fallbackProperty,
                    user: fallbackUser,
                });
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const toImageUrl = (image: string | null, type: "agent" | "property" | "user") => {
        let resolved = image?.trim() ?? "";
        if (type === "user" && !resolved) resolved = "profileless.png";
        if (!resolved) return mainbg;
        if (resolved.startsWith("http")) return resolved;

        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallbackProperty = `${fallbackOrigin}/uploads/img/property/`;
        const fallbackUser = `${fallbackOrigin}/uploads/img/user/`;

        const base =
            type === "agent"
                ? imageBaseUrls.agent || fallbackProperty
                : type === "property"
                    ? imageBaseUrls.property || fallbackProperty
                    : imageBaseUrls.user || fallbackUser;

        const cleanBase = base.replace(/\/+$/, "");
        const cleanImage = resolved.replace(/^\/+/, "");

        return `${cleanBase}/${cleanImage}`;
    };

    const openDatePicker = (type: "from" | "to") => {
        setActiveDatePicker((prev) => (prev === type ? null : type));
        const sourceDate = type === "from" ? fromDate ?? new Date() : toDate ?? new Date();
        setDisplayMonth(new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1));
    };

    const selectDate = (day: number) => {
        const selectedDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
        if (activeDatePicker === "from") setFromDate(selectedDate);
        if (activeDatePicker === "to") setToDate(selectedDate);
        setActiveDatePicker(null);
    };

    const renderDatePicker = (type: "from" | "to", selectedDate: Date | null, side: "left" | "right") => (
        <div className="relative" ref={type === "from" ? fromDateRef : toDateRef}>
            <button
                type="button"
                onClick={() => openDatePicker(type)}
                className="cursor-pointer h-[33px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center"
            >
                {selectedDate ? formatDisplayDate(selectedDate) : type === "from" ? "From date" : "To date"}
            </button>
            {activeDatePicker === type && (
                <div className={`absolute ${side}-0 top-[40px] z-20 h-[320px] w-[280px] rounded-[12px] bg-white p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}>
                    <div className="flex items-center justify-between mb-[16px]">
                        <button type="button" onClick={() => shiftMonth(-1)} className="text-[16px] font-[SemiBold] text-[#222] px-[6px] rotate-180">
                            <LeftArrowIcon width={14} height={14} />
                        </button>
                        <p className="text-[16px] font-[Bold] text-[#222]">{monthTitle(displayMonth)}</p>
                        <button type="button" onClick={() => shiftMonth(1)} className="text-[16px] font-[SemiBold] text-[#222] px-[6px]">
                            <RightArrowIcon width={14} height={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-[6px] text-center">
                        {weekDays.map((d, index) => (
                            <span key={`${type}-day-${d}-${index}`} className="text-[13px] font-[SemiBold] text-[#222]">
                                {d}
                            </span>
                        ))}
                        {calendarCells.map((day, idx) => {
                            if (!day) {
                                return (
                                    <span
                                        key={`${type}-blank-${idx}`}
                                        className="h-[30px] w-[30px] mx-auto rounded-full border border-[rgba(34,34,34,0.10)] bg-[#FAFAFA]"
                                    />
                                );
                            }
                            const isSelected =
                                !!selectedDate &&
                                selectedDate.getDate() === day &&
                                selectedDate.getMonth() === displayMonth.getMonth() &&
                                selectedDate.getFullYear() === displayMonth.getFullYear();
                            return (
                                <button
                                    key={`${type}-${day}-${idx}`}
                                    type="button"
                                    onClick={() => selectDate(day)}
                                    className={`h-[30px] w-[30px] mx-auto rounded-full text-[12px] font-[SemiBold] border transition-colors ${isSelected
                                        ? "bg-[#D4A373] text-white border-[#D4A373]"
                                        : "text-[#707070] border-[rgba(34,34,34,0.10)] hover:bg-[#F2F2F2]"
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

    const paginatedRows = apiLeads;
    const gridClass = mainTab === "Closed Sale/Rent" ? TABLE_GRID_CLOSED : TABLE_GRID_BASE;

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <AgencyHeader title="Property leads" showBack={false} onBackClick={() => { }} />
            <div className="rounded-[15px] bg-white min-w-0 md:p-[30px] p-[16px] flex flex-col gap-[18px]">
                {/* Top tabs + search + date */}
                <div className="flex flex-wrap items-center justify-between gap-[12px]">
                    <div className="flex flex-wrap items-center gap-[10px]">
                        <div className="flex flex-wrap items-center gap-[10px]">
                            {leads.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setMainTab(t.name)}
                                    className={`cursor-pointer rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${mainTab === t.name ? "bg-[#222] text-white" : "bg-white border border-[#EAEAEA] text-[#222]"
                                        }`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] w-full sm:w-[280px]">
                            <SearchIcon className="text-[#707070] shrink-0" />
                            <input
                                type="search"
                                placeholder="Search here"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-[10px]">

                        {renderDatePicker("from", fromDate, "left")}
                        <span className="text-[12px] text-[#707070]">to</span>
                        {renderDatePicker("to", toDate, "right")}
                    </div>
                </div>

                {/* Secondary tabs */}
                <div className="border-b border-[rgba(34,34,34,0.10)] flex gap-[28px] -mx-[20px] px-[20px] md:-mx-[30px] md:px-[30px]">
                    {activeSubItems.map((tab) => {
                        const active = subTab === tab.name;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSubTab(tab.name)}
                                className={`relative cursor-pointer p-[20px_30px] text-[13px]  transition-colors ${active ? "text-[#0832AE] font-[SemiBold]" : "text-[#222] font-[Regular]"
                                    }`}
                            >
                                {tab.name}
                                {active && (
                                    <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#0832AE]" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Table */}
                <div className="overflow-x-auto w-full scrollbar-hide">
                    <div className="min-w-[1340px]">
                        <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                            <div className={`${gridClass} bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Source</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">
                                    {mainTab === "Customer requests"
                                        ? subTab === "Attended inquiry"
                                            ? "Attended Date"
                                            : subTab === "Closed inquiry"
                                                ? "Closed Date"
                                                : "Date"
                                        : "Closed Date"}
                                </p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Agent</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Customer</p>
                                {mainTab === "Closed Sale/Rent" && (
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Closed deal amount</p>
                                )}
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                            </div>

                            {loading ? (
                                <div
                                    className="flex flex-col items-center justify-center gap-3 py-[48px] min-h-[260px] border-t border-[rgba(34,34,34,0.06)]"
                                    aria-busy="true"
                                    aria-live="polite"
                                >
                                    <Loader size={72} margin={0} />
                                    <p className="text-[13px] font-[Regular] text-[#707070]">Loading leads...</p>
                                </div>
                            ) : paginatedRows.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-[48px] px-[20px] min-h-[260px] text-center border-t border-[rgba(34,34,34,0.06)]">
                                    <p className="text-[16px] font-[Bold] text-[#222]">No leads found</p>
                                    <p className="text-[13px] font-[Regular] text-[#707070] max-w-[360px]">
                                        Try changing tab, search, or date range.
                                    </p>
                                </div>
                            ) : paginatedRows.map((row, index) => {
                                const chip = sourceIconChip(row.sourceIcon);
                                return (
                                    <div
                                        key={row.id}
                                        className={`${gridClass} ${index !== paginatedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                    >
                                        {/* Property cell — same image style as ListingManagement */}
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-[#F5F5F5]">
                                                <img src={toImageUrl(row.image, "property")} alt="" className="h-full w-full object-cover rounded-[8px]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] mb-[4px] truncate">{row.propertyName}</p>
                                                <p className="text-[12px] text-[#707070] leading-[1.2] flex items-center gap-[5px] min-w-0">
                                                    <span className="inline-flex shrink-0">
                                                        <LocationIcon width={11} height={15} />
                                                    </span>
                                                    <span className="truncate">{row.location}</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Source */}
                                        <div className="flex items-center">
                                            <span className={`inline-flex items-center justify-center h-[33px] w-[33px] rounded-[10px] ${chip.bg}`}>
                                                <chip.Icon width={14} height={14} />
                                            </span>
                                        </div>

                                        {/* Date */}
                                        <p className="text-[12px] font-[Regular] text-[#222]">{row.date}</p>

                                        {/* Agent */}
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <div className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-full border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5]">
                                                <img src={toImageUrl(row.agentAvatar, "agent")} alt="" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">{row.agentName}</p>
                                                <p className="text-[12px] font-[Regular] text-[#707070] truncate">{row.agentTitle}</p>
                                            </div>
                                        </div>

                                        {/* Customer */}
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <div className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-full bg-[#E6E6E6]">
                                                <img src={toImageUrl(row.customerAvatar, "user")} alt="" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">{row.customerName}</p>
                                                <p className="text-[12px] font-[Regular] text-[#707070] truncate">{row.customerPhone}</p>
                                            </div>
                                        </div>

                                        {/* Closed deal amount */}
                                        {mainTab === "Closed Sale/Rent" && (
                                            <p className="text-[12px] font-[Regular] text-[#222] whitespace-nowrap">{row.closedDealAmount ?? "-"}</p>
                                        )}

                                        {/* Actions */}
                                        <div className="flex items-center justify-start gap-[6px]">
                                            <button onClick={() => navigate(`/agency/leads/property-details/${row.id}`, { state: row })} type="button" className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9]" aria-label="View">
                                                <EyeDarkIcon width={20} height={20} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <Pagenation
                    currentPage={currentPage}
                    totalItems={total}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

export default PropertyLeads;