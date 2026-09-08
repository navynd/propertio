import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
    SearchIcon,
    EyeDarkIcon,
    LocationIcon,
    LeftArrowIcon,
    RightArrowIcon,
    WhatsappIcon,
    CallIcon,
    MessageIcon,
    DownArrowIcon,
} from "../../../../components/CustomFile/icons";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import home1img from "../../../../assets/img/home1.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import CloseDealModal from "./PropertyLeadsComponents/CloseDealModal";
import Loader from "../../../../components/Loader/loader";
import { agentService, type AgentInquiryListItem } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";

type MainKind = "new" | "attended" | "closed" | "closedSaleRent";
type LeadSource = "whatsapp" | "call" | "email";

type LeadSubItem = {
    id: string | number;
    propertyName: string;
    location: string;
    image: string;
    date?: string;
    attendedDate?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    whatsappNumber?: string;
    description?: string;
    message?: string;
    source?: LeadSource;
    closedDealAmount?: string;
    status?: string;
    commonstatus?: string;
    listingType?: "Rent" | "Buy";
    dealType?: "sale" | "rent";
};

type LeadSubTab = {
    id: string;
    label: string;
    subItems: LeadSubItem[];
};

type LeadSection = {
    id: number;
    name: string;
    subTabs: LeadSubTab[];
};

const mainKindFromSectionId = (sectionId: number): MainKind => {
    if (sectionId === 1) return "new";
    if (sectionId === 2) return "attended";
    if (sectionId === 3) return "closed";
    return "closedSaleRent";
};

const rowDate = (row: LeadSubItem) => row.attendedDate ?? row.date ?? "";

const rowData: LeadSection[] = [
    {
        id: 1,
        name: "New Inquiries",
        subTabs: [
            {
                id: "call",
                label: "Call Inquiry",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        commonstatus: "newinquiry",
                        status: "newcallinquiry",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        commonstatus: "newinquiry",
                        status: "newcallinquiry",
                    },
                ],
            },
            {
                id: "email",
                label: "Email Inquiry",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        description: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "newinquiry",
                        status: "newemailinquiry",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        description: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "newinquiry",
                        status: "newemailinquiry",
                    },
                ],
            },
            {
                id: "whatsapp",
                label: "WhatsApp Inquiry",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        whatsappNumber: "+(000) 1235 4678",
                        message: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "newinquiry",
                        status: "newwhatsappinquiry",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        whatsappNumber: "+(000) 1235 4678",
                        message: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "newinquiry",
                        status: "newwhatsappinquiry",
                    },
                ],
            },
        ],
    },
    {
        id: 2,
        name: "Attended Inquiries",
        subTabs: [
            {
                id: "call",
                label: "Call Inquiry",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        attendedDate: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        commonstatus: "attendedinquiry",
                        status: "attendedcallinquiry",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        attendedDate: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        commonstatus: "attendedinquiry",
                        status: "attendedcallinquiry",
                    },
                ],
            },
            {
                id: "email",
                label: "Email Inquiry",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        description: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "attendedinquiry",
                        status: "attendedemailinquiry",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        description: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "attendedinquiry",
                        status: "attendedemailinquiry",
                    },
                ],
            },
            {
                id: "whatsapp",
                label: "WhatsApp Inquiry",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        whatsappNumber: "+(000) 1235 4678",
                        message: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "attendedinquiry",
                        status: "attendedwhatsappinquiry",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        whatsappNumber: "+(000) 1235 4678",
                        message: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "attendedinquiry",
                        status: "attendedwhatsappinquiry",
                    },
                ],
            },
        ],
    },
    {
        id: 3,
        name: "Closed Inquiries",
        subTabs: [
            {
                id: "call",
                label: "Call Inquiry",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        commonstatus: "closedinquiry",
                        status: "closedcallinquiry",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        commonstatus: "closedinquiry",
                        status: "closedcallinquiry",
                    },
                ],
            },
            {
                id: "email",
                label: "Email Inquiry",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        description: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "closedinquiry",
                        status: "closedemailinquiry",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        description: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "closedinquiry",
                        status: "closedemailinquiry",
                    },
                ],
            },
            {
                id: "whatsapp",
                label: "WhatsApp Inquiry",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        whatsappNumber: "+(000) 1235 4678",
                        message: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "closedinquiry",
                        status: "closedwhatsappinquiry",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        customerName: "William turner",
                        whatsappNumber: "+(000) 1235 4678",
                        message: "Praesent ornare scelerisque ligula, ...",
                        commonstatus: "closedinquiry",
                        status: "closedwhatsappinquiry",
                    },
                ],
            },
        ],
    },
    {
        id: 4,
        name: "Closed Sale/Rent",
        subTabs: [
            {
                id: "sale",
                label: "Sale",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        source: "whatsapp",
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        closedDealAmount: "9,000,000 AED",
                        commonstatus: "closedsale",
                        status: "closedsale",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        source: "call",
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        closedDealAmount: "9,000,000 AED",
                        commonstatus: "closedsale",
                        status: "closedsale",
                    },
                    {
                        id: 3,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        source: "email",
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        closedDealAmount: "9,000,000 AED",
                        commonstatus: "closedsale",
                        status: "closedsale",
                    },
                ],
            },
            {
                id: "rent",
                label: "Rent",
                subItems: [
                    {
                        id: 1,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        source: "email",
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        closedDealAmount: "9,000,000 AED",
                        commonstatus: "closedsale",
                        status: "closedsale",
                    },
                    {
                        id: 2,
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm Jumeirah",
                        image: home1img,
                        source: "whatsapp",
                        date: "30 May 2025",
                        customerName: "William turner",
                        customerEmail: "williamturner@gmail.com",
                        customerPhone: "+(000) 1235 4678",
                        closedDealAmount: "9,000,000 AED",
                        commonstatus: "closedsale",
                        status: "closedsale",
                    },
                ],
            },
        ],
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

function sourceIconChip(source: LeadSource) {
    if (source === "whatsapp") return { bg: "bg-[#25D366]", Icon: WhatsappIcon };
    if (source === "call") return { bg: "bg-[#D4A373]", Icon: CallIcon };
    return { bg: "bg-[#0832AE]", Icon: MessageIcon };
}

const inferDealType = (value?: string): "sale" | "rent" => {
    const normalized = (value || "").trim().toLowerCase();
    if (["rent", "rental", "for-rent"].includes(normalized)) return "rent";
    return "sale";
};

const inferListingBadge = (value?: string): "Rent" | "Buy" => (inferDealType(value) === "rent" ? "Rent" : "Buy");

const LeadsProperty = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isCloseDealModalOpen, setIsCloseDealModalOpen] = useState(false);
    const [selectedCloseDealLead, setSelectedCloseDealLead] = useState<LeadSubItem | null>(null);
    const [isCloseDealSubmitting, setIsCloseDealSubmitting] = useState(false);

    const [mainSectionId, setMainSectionId] = useState(rowData[0].id);
    const [subTabId, setSubTabId] = useState(rowData[0].subTabs[0].id);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [fromDate, setFromDate] = useState(new Date(2025, 11, 1));
    const [toDate, setToDate] = useState(new Date(2025, 11, 12));
    const [isFromDateSelected, setIsFromDateSelected] = useState(false);
    const [isToDateSelected, setIsToDateSelected] = useState(false);
    const [activeDatePicker, setActiveDatePicker] = useState<"from" | "to" | null>(null);
    const [displayMonth, setDisplayMonth] = useState(new Date(2025, 11, 1));
    const fromDateRef = useRef<HTMLDivElement>(null);
    const toDateRef = useRef<HTMLDivElement>(null);
    const [isSectionDropdownOpen, setIsSectionDropdownOpen] = useState(false);  // ✅ For section dropdown  
    const sectionDropdownRef = useRef<HTMLDivElement>(null);  // ✅ For section dropdown  
    const [inquiryStatusLabels, setInquiryStatusLabels] = useState<Record<string, string>>({
        new: "New Inquiries",
        attended: "Attended Inquiries",
        closed: "Closed Inquiries",
        "closed-sale-rent": "Closed Sale/Rent",
    });
    const [inquiryTypeLabels, setInquiryTypeLabels] = useState<Record<string, string>>({
        call: "Call Inquiry",
        email: "Email Inquiry",
        whatsapp: "WhatsApp Inquiry",
    });
    const [leadSections, setLeadSections] = useState<LeadSection[]>(rowData);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isStatusUpdatingId, setIsStatusUpdatingId] = useState<string | null>(null);
    const handleSectionClickOutside = (event: MouseEvent) => {
        if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(event.target as Node)) {
            setIsSectionDropdownOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleSectionClickOutside);
        return () => document.removeEventListener("mousedown", handleSectionClickOutside);
    }, []); // ✅ Cleanup   

    /** Deep-link from dashboard (e.g. `?section=new&contactType=call|whatsapp|email&search=...`). */
    useEffect(() => {
        const section = searchParams.get("section");
        const contact = searchParams.get("contactType");
        const q = searchParams.get("search");

        let applied = false;
        if (section === "new") {
            setMainSectionId(1);
            applied = true;
        }
        if (contact === "call" || contact === "whatsapp" || contact === "email") {
            setSubTabId(contact);
            applied = true;
        }
        if (q != null && q !== "") {
            setSearch(q);
            applied = true;
        }
        if (applied) setCurrentPage(1);
    }, [searchParams]);

    useEffect(() => {
        const loadMasterData = async () => {
            try {
                const response = await agentService.getInquiryMasterData();
                const statusList = response.inquiryStatus || response.inquirystatus || [];
                const typeList = response.inquiryTypes || response.inquirytypes || [];

                if (statusList.length) {
                    const nextStatus: Record<string, string> = {};
                    statusList.forEach((item) => {
                        if (item.value?.trim()) nextStatus[item.value.trim()] = item.name || item.value;
                    });
                    setInquiryStatusLabels((prev) => ({ ...prev, ...nextStatus }));
                }

                if (typeList.length) {
                    const nextType: Record<string, string> = {};
                    typeList.forEach((item) => {
                        if (item.value?.trim()) nextType[item.value.trim()] = item.name || item.value;
                    });
                    setInquiryTypeLabels((prev) => ({ ...prev, ...nextType }));
                }
            } catch {
                // keep fallback labels
            }
        };
        void loadMasterData();
    }, []);

    const sectionDisplayName = (section: LeadSection) => {
        const kind = mainKindFromSectionId(section.id);
        if (kind === "closedSaleRent") return inquiryStatusLabels["closed-sale-rent"] || section.name;
        return inquiryStatusLabels[kind] || section.name;
    };

    const subTabDisplayName = (tab: LeadSubTab) => {
        if (tab.id === "sale" || tab.id === "rent") return tab.label;
        return inquiryTypeLabels[tab.id] || tab.label;
    };

    const activeMain = useMemo(() => leadSections.find((s) => s.id === mainSectionId) ?? leadSections[0], [leadSections, mainSectionId]);
    const activeSub = useMemo(
        () => activeMain.subTabs.find((t) => t.id === subTabId) ?? activeMain.subTabs[0],
        [activeMain, subTabId]
    );
    const mainKind = mainKindFromSectionId(activeMain.id);

    useEffect(() => {
        const section = leadSections.find((s) => s.id === mainSectionId);
        if (!section?.subTabs.length) return;
        const valid = section.subTabs.some((t) => t.id === subTabId);
        if (!valid) {
            setSubTabId(section.subTabs[0].id);
        }
    }, [leadSections, mainSectionId, subTabId]);

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
    }, [mainSectionId, subTabId, search]);

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
            setIsFromDateSelected(true);
        }
        if (activeDatePicker === "to") {
            setToDate(selectedDate);
            setIsToDateSelected(true);
        }
        setActiveDatePicker(null);
    };

    const renderDatePicker = (
        type: "from" | "to",
        selectedDate: Date,
        side: "left" | "right",
        isSelected: boolean
    ) => (
        <div className="relative" ref={type === "from" ? fromDateRef : toDateRef}>
            <button
                type="button"
                onClick={() => openDatePicker(type)}
                className="cursor-pointer h-[33px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center"
            >
                {isSelected ? formatDisplayDate(selectedDate) : type === "from" ? "Start date" : "End date"}
            </button>
            {activeDatePicker === type && (
                <div
                    className={`absolute ${side}-0 top-[40px] z-20 h-[320px] w-[280px] rounded-[12px] bg-white p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}
                >
                    <div className="flex items-center justify-between mb-[16px]">
                        <button
                            type="button"
                            onClick={() => shiftMonth(-1)}
                            className="text-[16px] font-[SemiBold] text-[#222] px-[6px] rotate-180"
                        >
                            <LeftArrowIcon width={14} height={14} />
                        </button>
                        <p className="text-[16px] font-[Bold] text-[#222]">{monthTitle(displayMonth)}</p>
                        <button type="button" onClick={() => shiftMonth(1)} className="text-[16px] font-[SemiBold] text-[#222] px-[6px]">
                            <RightArrowIcon width={14} height={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-7 gap-y-[6px] text-center">
                        {weekDays.map((d, index) => (
                            <span key={`${type}-wd-${index}`} className="text-[13px] font-[SemiBold] text-[#222]">
                                {d}
                            </span>
                        ))}
                        {calendarCells.map((day, idx) => {
                            if (!day) {
                                return (
                                    <span
                                        key={`${type}-b-${idx}`}
                                        className="h-[30px] w-[30px] mx-auto rounded-full border border-[rgba(34,34,34,0.10)] bg-[#FAFAFA]"
                                    />
                                );
                            }
                            const isSelected =
                                selectedDate.getDate() === day &&
                                selectedDate.getMonth() === displayMonth.getMonth() &&
                                selectedDate.getFullYear() === displayMonth.getFullYear();
                            return (
                                <button
                                    key={`${type}-d-${day}-${idx}`}
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

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rows = activeSub?.subItems ?? [];
        return rows.filter((row) => {
            if (!q) return true;
            return (
                row.propertyName.toLowerCase().includes(q) ||
                row.location.toLowerCase().includes(q) ||
                row.customerName.toLowerCase().includes(q) ||
                (row.customerEmail?.toLowerCase().includes(q) ?? false) ||
                (row.customerPhone?.toLowerCase().includes(q) ?? false) ||
                (row.whatsappNumber?.toLowerCase().includes(q) ?? false) ||
                (row.description?.toLowerCase().includes(q) ?? false) ||
                (row.message?.toLowerCase().includes(q) ?? false)
            );
        });
    }, [activeSub, search]);

    const paginatedRows = visibleRows;

    useEffect(() => {
        const status = mainKind === "closedSaleRent" ? "closed-sale-rent" : mainKind;
        const type =
            mainKind === "closedSaleRent"
                ? undefined
                : (subTabId as "call" | "email" | "whatsapp");
        const transactionType =
            mainKind === "closedSaleRent"
                ? (subTabId as "sale" | "rent")
                : undefined;

        const mapInquiry = (item: AgentInquiryListItem, imageBase: string): LeadSubItem => {
            const location = item.subject?.location;
            const title = item.subject?.title || "Untitled";
            const imageUrl = item.subject?.images?.[0]?.url || "";
            const leadImage =
                imageUrl && !imageUrl.startsWith("http")
                    ? imageBase
                        ? `${imageBase.replace(/\/?$/, "/")}${imageUrl}`
                        : imageUrl
                    : imageUrl || home1img;
            const dateValue =
                mainKind === "attended"
                    ? item.attendedAt || item.inquiredAt
                    : mainKind === "closedSaleRent"
                        ? item.dealClosed?.closedDate || item.closedAt || item.inquiredAt
                        : mainKind === "closed"
                            ? item.closedAt || item.inquiredAt
                            : item.inquiredAt;

            const listingTypeRaw =
                typeof item.subject?.listingType === "string"
                    ? item.subject.listingType
                    : item.subject?.listingType?.slug || item.subject?.listingType?.name || "";
            const dealType = inferDealType(listingTypeRaw);
            return {
                id: String(item.id),
                propertyName: title,
                location: location?.fullAddress || [location?.city, location?.zone].filter(Boolean).join(", ") || "-",
                image: leadImage,
                date: dateValue ? new Date(dateValue).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-",
                attendedDate: item.attendedAt
                    ? new Date(item.attendedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                    : undefined,
                customerName: item.customer?.name || "-",
                customerEmail: item.customer?.email || "-",
                customerPhone: item.customer?.phoneNumber || "-",
                whatsappNumber: item.customer?.phoneNumber || "-",
                description: item.message || "-",
                message: item.message || "-",
                source: item.inquiryType,
                closedDealAmount:
                    item.dealClosed?.dealAmount != null
                        ? `${item.dealClosed.dealAmount.toLocaleString("en-US")} AED`
                        : "-",
                commonstatus: item.status,
                status: item.status,
                listingType: inferListingBadge(listingTypeRaw),
                dealType,
            };
        };

        const fetchLeads = async () => {
            setIsLoading(true);
            try {
                const [urlRes, response] = await Promise.all([
                    agentService.getSupportedUrlsMasterData(),
                    agentService.getInquiries({
                        status: status as "new" | "attended" | "closed" | "closed-sale-rent",
                        type,
                        transactionType,
                        search,
                        startDate: isFromDateSelected ? fromDate.toISOString().slice(0, 10) : undefined,
                        endDate: isToDateSelected ? toDate.toISOString().slice(0, 10) : undefined,
                        page: currentPage,
                        limit: itemsPerPage,
                        counts: true,
                    }),
                ]);
                const anySupported = urlRes as unknown as {
                    supportedUrls?: { propertyUrl?: { img?: string } };
                    supportedurls?: { propertyUrl?: { img?: string } };
                    propertyUrl?: { img?: string };
                };
                const imgBase =
                    anySupported?.supportedUrls?.propertyUrl?.img ||
                    anySupported?.supportedurls?.propertyUrl?.img ||
                    anySupported?.propertyUrl?.img ||
                    "";

                const mappedItems = (response.inquiries || []).map((item) => mapInquiry(item, imgBase));
                setTotalItems(response.pagination?.total || 0);
                setLeadSections((prev) =>
                    prev.map((section) => ({
                        ...section,
                        subTabs: section.subTabs.map((tab) =>
                            section.id === mainSectionId && tab.id === subTabId
                                ? { ...tab, subItems: mappedItems }
                                : tab
                        ),
                    }))
                );
            } catch {
                setLeadSections((prev) =>
                    prev.map((section) => ({
                        ...section,
                        subTabs: section.subTabs.map((tab) =>
                            section.id === mainSectionId && tab.id === subTabId
                                ? { ...tab, subItems: [] }
                                : tab
                        ),
                    }))
                );
                setTotalItems(0);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchLeads();
    }, [currentPage, fromDate, isFromDateSelected, isToDateSelected, mainKind, mainSectionId, search, subTabId, toDate]);

    type TableLayout =
        | "newCall"
        | "newEmail"
        | "newWhatsapp"
        | "attendedCall"
        | "attendedEmail"
        | "attendedWhatsapp"
        | "closedCall"
        | "closedEmail"
        | "closedWhatsapp"
        | "closedSaleRent";

    const tableLayout: TableLayout = useMemo(() => {
        if (mainKind === "closedSaleRent") return "closedSaleRent";
        if (mainKind === "new") {
            if (subTabId === "email") return "newEmail";
            if (subTabId === "whatsapp") return "newWhatsapp";
            return "newCall";
        }
        if (mainKind === "attended") {
            if (subTabId === "email") return "attendedEmail";
            if (subTabId === "whatsapp") return "attendedWhatsapp";
            return "attendedCall";
        }
        if (subTabId === "email") return "closedEmail";
        if (subTabId === "whatsapp") return "closedWhatsapp";
        return "closedCall";
    }, [mainKind, subTabId]);

    const gridClass = useMemo(() => {
        switch (tableLayout) {
            case "newCall":
                return "grid grid-cols-[1.5fr_0.75fr_1fr_1.4fr_1.2fr_1.15fr] gap-3 items-center px-[14px] py-[14px]";
            case "newEmail":
                return "grid grid-cols-[1.5fr_0.7fr_1fr_1.3fr_1.1fr_1.4fr_1.2fr] gap-3 items-center px-[14px] py-[14px]";
            case "newWhatsapp":
                return "grid grid-cols-[1.5fr_0.75fr_1fr_1.2fr_1.5fr_1.2fr] gap-3 items-center px-[14px] py-[14px]";
            case "attendedCall":
                return "grid grid-cols-[1.5fr_0.85fr_1fr_1.35fr_1.15fr_1.5fr] gap-3 items-center px-[14px] py-[14px]";
            case "attendedEmail":
                return "grid grid-cols-[1.5fr_0.75fr_1fr_1.2fr_1fr_1.25fr_1.6fr] gap-3 items-center px-[14px] py-[14px]";
            case "attendedWhatsapp":
                return "grid grid-cols-[1.5fr_0.8fr_1fr_1.15fr_1.4fr_1.45fr] gap-3 items-center px-[14px] py-[14px]";
            case "closedCall":
            case "closedEmail":
                return "grid grid-cols-[1.5fr_0.75fr_1fr_1.4fr_1.2fr_0.65fr] gap-3 items-center px-[14px] py-[14px]";
            case "closedWhatsapp":
                return "grid grid-cols-[1.5fr_0.75fr_1fr_1.2fr_1.45fr_0.65fr] gap-3 items-center px-[14px] py-[14px]";
            case "closedSaleRent":
                return "grid grid-cols-[1.5fr_0.55fr_0.85fr_1fr_1.35fr_1.15fr_1.1fr_0.65fr] gap-3 items-center px-[14px] py-[14px]";
            default:
                return "grid gap-3 items-center px-[14px] py-[14px]";
        }
    }, [tableLayout]);

    const dateHeader =
        mainKind === "attended" ? "Attended Date" : mainKind === "closedSaleRent" ? "Closed date" : "Date";

    const propertyCell = (row: LeadSubItem) => (
        <div className="flex items-center gap-[10px] min-w-0">
            <div className="h-[56px] w-[56px] shrink-0 overflow-hidden rounded-[10px] bg-[#F5F5F5]">
                <img src={row.image} alt="" className="h-full w-full object-cover rounded-[10px]" />
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
    );

    const renderActions = (row: LeadSubItem) => {
        const rowId = String(row.id || "");
        const isUpdatingThisRow = isStatusUpdatingId === rowId;

        const eye = (
            <button
                type="button"
                onClick={() => navigate(`/agent/leads/property-details/${row.id}`, { state: row })}
                className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] shrink-0"
                aria-label="View"
            >
                <EyeDarkIcon width={20} height={20} />
            </button>
        );

        if (mainKind === "new") {
            return (
                <div className="flex items-center gap-2 justify-start">
                    {eye}
                    <button
                        type="button"
                        disabled={isUpdatingThisRow}
                        onClick={async () => {
                            setIsStatusUpdatingId(rowId);
                            try {
                                await agentService.updateInquiryStatus(rowId, { type: "attend" });
                                toast.success("Updated", "Inquiry marked as attended.");
                                setLeadSections((prev) =>
                                    prev.map((section) => ({
                                        ...section,
                                        subTabs: section.subTabs.map((tab) =>
                                            section.id === mainSectionId && tab.id === subTabId
                                                ? {
                                                    ...tab,
                                                    subItems: tab.subItems.filter((item) => String(item.id) !== rowId),
                                                }
                                                : tab
                                        ),
                                    }))
                                );
                                setTotalItems((prev) => Math.max(0, prev - 1));
                            } catch (error: unknown) {
                                const message =
                                    (error as { message?: string })?.message || "Failed to update inquiry status.";
                                toast.error("Update failed", message);
                            } finally {
                                setIsStatusUpdatingId(null);
                            }
                        }}
                        className="cursor-pointer rounded-full bg-[#E54D42] px-[14px] py-[8px] text-[11px] font-[SemiBold] text-white whitespace-nowrap hover:opacity-95"
                    >
                        {isUpdatingThisRow ? "Updating..." : "Move to attended"}
                    </button>
                </div>
            );
        }

        if (mainKind === "attended") {
            return (
                <div className="flex items-center gap-2 justify-start">
                    {eye}
                    <button
                        type="button"
                        disabled={isUpdatingThisRow}
                        onClick={async () => {
                            setIsStatusUpdatingId(rowId);
                            try {
                                await agentService.updateInquiryStatus(rowId, { type: "close-inquiry" });
                                toast.success("Updated", "Inquiry closed successfully.");
                                setLeadSections((prev) =>
                                    prev.map((section) => ({
                                        ...section,
                                        subTabs: section.subTabs.map((tab) =>
                                            section.id === mainSectionId && tab.id === subTabId
                                                ? {
                                                    ...tab,
                                                    subItems: tab.subItems.filter((item) => String(item.id) !== rowId),
                                                }
                                                : tab
                                        ),
                                    }))
                                );
                                setTotalItems((prev) => Math.max(0, prev - 1));
                            } catch (error: unknown) {
                                const message =
                                    (error as { message?: string })?.message || "Failed to close inquiry.";
                                toast.error("Update failed", message);
                            } finally {
                                setIsStatusUpdatingId(null);
                            }
                        }}
                        className="cursor-pointer rounded-full bg-[#0832AE] px-[12px] py-[8px] text-[11px] font-[SemiBold] text-white whitespace-nowrap hover:opacity-95"
                    >
                        {isUpdatingThisRow ? "Updating..." : "Close inquiry"}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedCloseDealLead(row);
                            setIsCloseDealModalOpen(true);
                        }}
                        className="cursor-pointer rounded-full bg-[#E54D42] px-[12px] py-[8px] text-[11px] font-[SemiBold] text-white whitespace-nowrap hover:opacity-95"
                    >
                        Close the deal
                    </button>
                </div>
            );
        }

        return <div className="flex items-center justify-start">{eye}</div>;
    };

    const renderHeaderRow = () => {
        switch (tableLayout) {
            case "newCall":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Date</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer email</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer phone</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            case "newEmail":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Date</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer name</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer email</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer phone</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Description</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            case "newWhatsapp":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Date</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer name</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Whatsapp number</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Message</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            case "attendedCall":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">{dateHeader}</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer name</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer email</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer phone</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            case "attendedEmail":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">{dateHeader}</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer name</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer email</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer phone</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Description</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            case "attendedWhatsapp":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">{dateHeader}</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer name</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Whatsapp number</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Message</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            case "closedCall":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Date</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer email</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer phone</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            case "closedEmail":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Date</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer name</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer email</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer phone</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            case "closedWhatsapp":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Date</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer name</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Whatsapp number</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Message</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            case "closedSaleRent":
                return (
                    <>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property they inquire</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Source</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Closed date</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer name</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer email</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Customer phone</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Closed deal amount</p>
                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </>
                );
            default:
                return null;
        }
    };

    const renderDataRow = (row: LeadSubItem, index: number, total: number) => {
        const border = index !== total - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : "";
        const textCell = (children: ReactNode) => (
            <p className="text-[12px] font-[Regular] text-[#222] min-w-0 break-words">{children}</p>
        );

        const body = () => {
            switch (tableLayout) {
                case "newCall":
                    return (
                        <>
                            {propertyCell(row)}
                            {textCell(row.date ?? "")}
                            {textCell(row.customerName)}
                            {textCell(row.customerEmail ?? "")}
                            {textCell(row.customerPhone ?? "")}
                            {renderActions(row)}
                        </>
                    );
                case "newEmail":
                    return (
                        <>
                            {propertyCell(row)}
                            {textCell(row.date ?? "")}
                            {textCell(row.customerName)}
                            {textCell(row.customerEmail ?? "")}
                            {textCell(row.customerPhone ?? "")}
                            {textCell(row.description ?? "")}
                            {renderActions(row)}
                        </>
                    );
                case "newWhatsapp":
                    return (
                        <>
                            {propertyCell(row)}
                            {textCell(row.date ?? "")}
                            {textCell(row.customerName)}
                            {textCell(row.whatsappNumber ?? row.customerPhone ?? "")}
                            {textCell(row.message ?? "")}
                            {renderActions(row)}
                        </>
                    );
                case "attendedCall":
                    return (
                        <>
                            {propertyCell(row)}
                            {textCell(rowDate(row))}
                            {textCell(row.customerName)}
                            {textCell(row.customerEmail ?? "")}
                            {textCell(row.customerPhone ?? "")}
                            {renderActions(row)}
                        </>
                    );
                case "attendedEmail":
                    return (
                        <>
                            {propertyCell(row)}
                            {textCell(rowDate(row))}
                            {textCell(row.customerName)}
                            {textCell(row.customerEmail ?? "")}
                            {textCell(row.customerPhone ?? "")}
                            {textCell(row.description ?? "")}
                            {renderActions(row)}
                        </>
                    );
                case "attendedWhatsapp":
                    return (
                        <>
                            {propertyCell(row)}
                            {textCell(rowDate(row))}
                            {textCell(row.customerName)}
                            {textCell(row.whatsappNumber ?? row.customerPhone ?? "")}
                            {textCell(row.message ?? "")}
                            {renderActions(row)}
                        </>
                    );
                case "closedCall":
                    return (
                        <>
                            {propertyCell(row)}
                            {textCell(row.date ?? "")}
                            {textCell(row.customerName)}
                            {textCell(row.customerEmail ?? "")}
                            {textCell(row.customerPhone ?? "")}
                            {renderActions(row)}
                        </>
                    );
                case "closedEmail":
                    return (
                        <>
                            {propertyCell(row)}
                            {textCell(row.date ?? "")}
                            {textCell(row.customerName)}
                            {textCell(row.customerEmail ?? "")}
                            {textCell(row.customerPhone ?? "")}
                            {renderActions(row)}
                        </>
                    );
                case "closedWhatsapp":
                    return (
                        <>
                            {propertyCell(row)}
                            {textCell(row.date ?? "")}
                            {textCell(row.customerName)}
                            {textCell(row.whatsappNumber ?? row.customerPhone ?? "")}
                            {textCell(row.message ?? "")}
                            {renderActions(row)}
                        </>
                    );
                case "closedSaleRent": {
                    const src = row.source ?? "whatsapp";
                    const chip = sourceIconChip(src);
                    return (
                        <>
                            {propertyCell(row)}
                            <div className="flex items-center">
                                <span className={`inline-flex items-center justify-center h-[33px] w-[33px] rounded-[10px] ${chip.bg}`}>
                                    <chip.Icon width={14} height={14} />
                                </span>
                            </div>
                            {textCell(row.date ?? "")}
                            {textCell(row.customerName)}
                            {textCell(row.customerEmail ?? "")}
                            {textCell(row.customerPhone ?? "")}
                            {textCell(row.closedDealAmount ?? "-")}
                            {renderActions(row)}
                        </>
                    );
                }
                default:
                    return null;
            }
        };

        return (
            <div key={row.id} className={`${gridClass} ${border}`}>
                {body()}
            </div>
        );
    };

    const minTableWidth =
        tableLayout === "closedSaleRent"
            ? "min-w-[1300px]"
            : tableLayout === "newEmail" || tableLayout === "attendedEmail"
                ? "min-w-[1380px]"
                : "min-w-[1380px]";

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="rounded-[15px] bg-white min-w-0 md:p-[30px] p-[16px] flex flex-col gap-[18px]">
                <div className="flex flex-wrap items-center justify-between gap-[12px]">
                    <div className="flex flex-wrap items-center gap-[10px]">
                        {/* <div className="flex flex-wrap items-center gap-[10px]">
                            {rowData.map((section) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    onClick={() => setMainSectionId(section.id)}
                                    className={`cursor-pointer rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${mainSectionId === section.id ? "bg-[#222] text-white" : "bg-white border border-[#EAEAEA] text-[#222]"
                                        }`}
                                >
                                    {section.name}
                                </button>
                            ))}
                        </div> */}
                        <div className="flex items-center gap-[10px]">

                            {/* ✅ Tabs (ONLY 2XL) */}
                            <div className="hidden 2xl:flex items-center gap-[10px]">
                                {leadSections.map((section) => (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => setMainSectionId(section.id)}
                                        className={`cursor-pointer rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${mainSectionId === section.id
                                            ? "bg-[#222] text-white"
                                            : "bg-white border border-[#EAEAEA] text-[#222]"
                                            }`}
                                    >
                                        {sectionDisplayName(section)}
                                    </button>
                                ))}
                            </div>

                            {/* ✅ Dropdown (SM → XL) */}
                            <div className="block 2xl:hidden relative">
                                <div
                                    onClick={() => setIsSectionDropdownOpen(!isSectionDropdownOpen)}
                                    className="flex items-center justify-between gap-[8px] border border-[#EAEAEA] bg-white rounded-full px-[16px] h-[33px] cursor-pointer w-[170px]"
                                >
                                    <span className="text-[#222] text-[13px] font-[Medium] truncate">
                                        {sectionDisplayName(leadSections.find(r => r.id === mainSectionId) || leadSections[0]) || "All"}
                                    </span>
                                    <DownArrowIcon width={11} height={11}
                                        className={`transition-transform duration-200 ${isSectionDropdownOpen ? "rotate-180" : ""
                                            }`}
                                    />
                                </div>

                                {isSectionDropdownOpen && (
                                    <div className="absolute left-0 top-[45px] w-full min-w-[150px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-10 flex flex-col">
                                        {leadSections.map((section) => (
                                            <div
                                                key={section.id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setMainSectionId(section.id);
                                                    setIsSectionDropdownOpen(false);
                                                }}
                                                className={`px-[16px] py-[10px] text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] ${mainSectionId === section.id
                                                    ? "text-[#00A663] bg-[#F5F5F5]"
                                                    : "text-[#222]"
                                                    }`}
                                            >
                                                {sectionDisplayName(section)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] w-auto md:w-[320px]">
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

                    <div className="flex flex-wrap items-center gap-[10px] shrink-0">
                        {renderDatePicker("from", fromDate, "left", isFromDateSelected)}
                        <span className="text-[12px] text-[#707070]">to</span>
                        {renderDatePicker("to", toDate, "right", isToDateSelected)}
                    </div>
                </div>

                <div className="border-b border-[rgba(34,34,34,0.10)] flex gap-[28px] -mx-[20px] px-[20px] md:-mx-[30px] md:px-[30px]">
                    {activeMain.subTabs.map((tab) => {
                        const active = subTabId === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSubTabId(tab.id)}
                                className={`relative cursor-pointer p-[20px_30px] text-[13px] transition-colors ${active ? "text-[#0832AE] font-[SemiBold]" : "text-[#222] font-[Regular]"
                                    }`}
                            >
                                {subTabDisplayName(tab)}
                                {active && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#0832AE]" />}
                            </button>
                        );
                    })}
                </div>

                <div className="overflow-x-auto w-full scrollbar-hide">
                    <div className={minTableWidth}>
                        <div className="rounded-[12px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                            <div className={`${gridClass} bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}>{renderHeaderRow()}</div>
                            {paginatedRows.length > 0 ? (
                                paginatedRows.map((row, index) => renderDataRow(row, index, paginatedRows.length))
                            ) : (
                                <div className="px-[14px] py-[20px] text-center text-[13px] font-[Regular] text-[#707070]">
                                    No inquiries found
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Pagenation
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
            <CloseDealModal
                isOpen={isCloseDealModalOpen}
                onClose={() => {
                    if (isCloseDealSubmitting) return;
                    setIsCloseDealModalOpen(false);
                    setSelectedCloseDealLead(null);
                }}
                isSubmitting={isCloseDealSubmitting}
                lead={
                    selectedCloseDealLead
                        ? {
                            customerName: selectedCloseDealLead.customerName || "-",
                            customerEmail: selectedCloseDealLead.customerEmail || "-",
                            customerPhone: selectedCloseDealLead.customerPhone || selectedCloseDealLead.whatsappNumber || "-",
                            propertyName: selectedCloseDealLead.propertyName || "-",
                            propertyImage: selectedCloseDealLead.image || "",
                            listingType: selectedCloseDealLead.listingType || "Buy",
                        }
                        : undefined
                }
                onSubmit={async ({ dealAmount }) => {
                    if (!selectedCloseDealLead?.id) {
                        toast.error("Missing inquiry", "Inquiry ID not found.");
                        return;
                    }
                    setIsCloseDealSubmitting(true);
                    try {
                        await agentService.closeInquiryDeal(String(selectedCloseDealLead.id), {
                            dealType: selectedCloseDealLead.dealType || "sale",
                            dealAmount,
                            currency: "AED",
                        });
                        toast.success("Updated", "Deal closed successfully.");
                        setLeadSections((prev) =>
                            prev.map((section) => ({
                                ...section,
                                subTabs: section.subTabs.map((tab) =>
                                    section.id === mainSectionId && tab.id === subTabId
                                        ? {
                                            ...tab,
                                            subItems: tab.subItems.filter(
                                                (item) => String(item.id) !== String(selectedCloseDealLead.id)
                                            ),
                                        }
                                        : tab
                                ),
                            }))
                        );
                        setTotalItems((prev) => Math.max(0, prev - 1));
                        setIsCloseDealModalOpen(false);
                        setSelectedCloseDealLead(null);
                    } catch (error: unknown) {
                        const message = (error as { message?: string })?.message || "Failed to close deal.";
                        toast.error("Update failed", message);
                    } finally {
                        setIsCloseDealSubmitting(false);
                    }
                }}
            />
        </div>
    );
};

export default LeadsProperty;
