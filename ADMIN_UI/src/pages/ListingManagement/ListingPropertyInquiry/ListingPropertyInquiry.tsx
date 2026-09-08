import { useEffect, useRef, useState, useMemo } from "react";
import profileless from "../../../assets/img/profileless.png";
import {
    DownArrowIcon,
    SearchIcon,
    LocationIcon,
    LeftArrowIcon,
    RightArrowIcon,
    WhatsappIcon,
    CallIcon,
    MessageIcon,
    TrashIcon,
} from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import { useNavigate } from "react-router-dom";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { agenciesService } from "../../../services/agenciesService";
import { agentsService } from "../../../services/agentsService";
import { propertiesService } from "../../../services/propertiesService";
import type {
    AgencyDropdownItem,
    AgentDropdownItem,
} from "../../../types/api";

import home1img from "../../../assets/img/home1.png";
import home2img from "../../../assets/img/home2.png";
import home3img from "../../../assets/img/home3.png";
import profileimg from "../../../assets/img/profileimg.png";

type LeadSource = "whatsapp" | "call" | "message";

type LeadRow = {
    id: number;
    propertyId: string;
    propertyName: string;
    location: string;
    image: string;
    sourceIcon: LeadSource;
    date: string;
    agentName: string;
    agentTitle: string;
    agentAvatar: string;
    agencyName: string;
    agencyTitle: string;
    agencyAvatar: string;
    customerName: string;
    customerPhone: string;
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

const isPlaceholderProfilePicture = (filename: string | null | undefined): boolean => {
    if (!filename || !String(filename).trim()) return true;
    const lower = String(filename).trim().toLowerCase();
    if (lower.includes("profileless.png")) return true;
    const base = lower.split(/[/\\?#]/).pop() ?? "";
    return base === "profileless.png";
};

const resolveProfileSrc = (
    filename: string | null | undefined,
    baseUrl: string,
    fallbackUrl?: string | null
): string => {
    const raw = (filename || "").trim();
    if (!raw || isPlaceholderProfilePicture(raw)) return profileless;
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = (baseUrl || "").trim().replace(/\/+$/, "");
    if (!base) return fallbackUrl?.trim() || profileless;
    return `${base}/${encodeURIComponent(raw)}`;
};

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
                        id: 1,
                        status: "New Inquiry",
                        propertyId: "1234567890",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        agencyName: "Omniyat",
                        agencyTitle: "Property Consultant",
                        agencyAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        closedDealAmount: "9,000,000 AED",
                        sourceIcon: "whatsapp",
                    },
                    {
                        id: 2,
                        status: "New Inquiry",
                        propertyId: "1234567890",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home2img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        agencyName: "Omniyat",
                        agencyTitle: "Property Consultant",
                        agencyAvatar: profileimg,
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
                        id: 1,
                        status: "Attended Inquiry",
                        propertyId: "1234567890",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home3img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        agencyName: "Omniyat",
                        agencyTitle: "Property Consultant",
                        agencyAvatar: profileimg,
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
                        id: 1,
                        status: "Closed Inquiry",
                        propertyId: "1234567890",
                        propertyName: "Omniyat Bespoke | Villa",
                        location: "Dubai, Palm jumeirah",
                        image: home1img,
                        date: "30 May 2025",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        agencyName: "Omniyat",
                        agencyTitle: "Property Consultant",
                        agencyAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        closedDealAmount: "9,000,000 AED",
                        sourceIcon: "whatsapp",
                    },
                ],
            },
        ],
    },
];

function sourceIconChip(sourceIcon: LeadSource) {
    if (sourceIcon === "whatsapp") return { bg: "bg-[#25D366]", Icon: WhatsappIcon };
    if (sourceIcon === "call") return { bg: "bg-[#EA3934]", Icon: CallIcon };
    return { bg: "bg-[#0832AE]", Icon: MessageIcon };
}

const TABLE_GRID_BASE =
    "grid grid-cols-[2.3fr_0.8fr_1.1fr_2fr_2fr_2fr_1fr_1fr] gap-2 items-center px-[14px] py-[12px]";

type LeadRowWithTab = LeadRow & { inquiryTab: string };

function StatCards({ totalInquiries, newInquiries, attendedInquiries, closedInquiries }: { totalInquiries: number, newInquiries: number, attendedInquiries: number, closedInquiries: number }) {
    const stats = [
        { label: "Total", value: totalInquiries, accent: "#222" },
        { label: "New Inquiry", value: newInquiries, accent: "#0832AE" },
        { label: "Attended Inquiry", value: attendedInquiries, accent: "#00A663" },
        { label: "Closed Inquiry", value: closedInquiries, accent: "#EA3934" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px] mb-[24px]">
            {stats.map((s) => (
                <div
                    key={s.label}
                    className="rounded-[12px] border border-[rgba(34,34,34,0.08)] bg-white p-[16px] flex flex-col gap-[6px]"
                >
                    <p className="text-[12px] font-[Medium] text-[#707070]">{s.label}</p>
                    <p
                        className="text-[28px] font-[Bold] leading-none"
                        style={{ color: s.accent }}
                    >
                        {s.value}
                    </p>
                </div>
            ))}
        </div>
    );
}

const matchesInquiryFilters = (
    row: LeadRowWithTab,
    q: string,
    selectedAgent: AgentDropdownItem | null,
    selectedAgency: AgencyDropdownItem | null
) => {
    if (selectedAgent) {
        const agentName = selectedAgent.fullName?.trim().toLowerCase() ?? "";
        if (agentName && row.agentName.trim().toLowerCase() !== agentName) return false;
    }
    if (selectedAgency) {
        const agencyName = selectedAgency.agencyName?.trim().toLowerCase() ?? "";
        if (agencyName && row.agencyName.trim().toLowerCase() !== agencyName) return false;
    }
    if (!q) return true;
    return (
        row.propertyId.toLowerCase().includes(q) ||
        row.propertyName.toLowerCase().includes(q) ||
        row.location.toLowerCase().includes(q) ||
        row.agentName.toLowerCase().includes(q) ||
        row.agencyName.toLowerCase().includes(q) ||
        row.customerName.toLowerCase().includes(q)
    );
};

function ListingPropertyInquiry() {
    const navigate = useNavigate();
    const defaultMain = leads[0]?.name ?? "";
    const defaultSub = leads[0]?.subItems?.[0]?.name ?? "";
    const [mainTab, setMainTab] = useState<string>(defaultMain);
    const [subTab, setSubTab] = useState<string>(defaultSub);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const [fromDate, setFromDate] = useState(new Date(2025, 11, 1));
    const [toDate, setToDate] = useState(new Date(2025, 11, 12));
    const [activeDatePicker, setActiveDatePicker] = useState<"from" | "to" | null>(null);
    const [displayMonth, setDisplayMonth] = useState(new Date(2026, 11, 1));
    const fromDateRef = useRef<HTMLDivElement>(null);
    const toDateRef = useRef<HTMLDivElement>(null);

    const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<AgentDropdownItem | null>(null);
    const [agentSearch, setAgentSearch] = useState("");
    const [agentOptions, setAgentOptions] = useState<AgentDropdownItem[]>([]);
    const agentDropdownRef = useRef<HTMLDivElement>(null);

    const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState<AgencyDropdownItem | null>(null);
    const [agencySearch, setAgencySearch] = useState("");
    const [agencyOptions, setAgencyOptions] = useState<AgencyDropdownItem[]>([]);
    const agencyDropdownRef = useRef<HTMLDivElement>(null);

    const [agentImgBaseUrl, setAgentImgBaseUrl] = useState("");
    const [agencyImgBaseUrl, setAgencyImgBaseUrl] = useState("");

    const filteredAgents = useMemo(() => {
        const q = agentSearch.trim().toLowerCase();
        if (!q) return agentOptions;
        return agentOptions.filter(
            (a) =>
                (a.fullName || "").toLowerCase().includes(q) ||
                (a.email || "").toLowerCase().includes(q) ||
                (a.agency?.agencyName || "").toLowerCase().includes(q)
        );
    }, [agentSearch, agentOptions]);

    const filteredAgency = useMemo(() => {
        const q = agencySearch.trim().toLowerCase();
        if (!q) return agencyOptions;
        return agencyOptions.filter((a) =>
            (a.agencyName || "").toLowerCase().includes(q)
        );
    }, [agencySearch, agencyOptions]);

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
        let mounted = true;
        const controller = new AbortController();
        const loadUrls = async () => {
            try {
                const urls = await propertiesService.getSupportedUrls(controller.signal);
                if (!mounted) return;
                setAgentImgBaseUrl((urls.supportedUrls?.agentUrl?.img || "").trim());
                setAgencyImgBaseUrl((urls.supportedUrls?.agencyUrl?.img || "").trim());
            } catch {
                if (mounted) {
                    setAgentImgBaseUrl("");
                    setAgencyImgBaseUrl("");
                }
            }
        };
        void loadUrls();
        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();
        const loadAgencies = async () => {
            try {
                const data = await agenciesService.listAgenciesForDropdown(
                    undefined,
                    controller.signal
                );
                if (!mounted) return;
                setAgencyOptions(data.agencies || []);
            } catch {
                if (mounted) setAgencyOptions([]);
            }
        };
        void loadAgencies();
        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();
        const loadAgents = async () => {
            try {
                const data = await agentsService.listAgentsForDropdown(
                    undefined,
                    controller.signal
                );
                if (!mounted) return;
                setAgentOptions(data.agents ?? []);
            } catch {
                if (mounted) setAgentOptions([]);
            }
        };
        void loadAgents();
        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        if (!isAgentDropdownOpen && !isAgencyDropdownOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (agentDropdownRef.current?.contains(t)) return;
            if (agencyDropdownRef.current?.contains(t)) return;
            setIsAgentDropdownOpen(false);
            setIsAgencyDropdownOpen(false);
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [isAgentDropdownOpen, isAgencyDropdownOpen]);

    useEffect(() => {
        setCurrentPage(1);
    }, [mainTab, subTab, search, selectedAgent, selectedAgency]);

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

    const openDatePicker = (type: "from" | "to") => {
        setActiveDatePicker((prev) => (prev === type ? null : type));
        const sourceDate = type === "from" ? fromDate : toDate;
        setDisplayMonth(new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1));
    };

    const selectDate = (day: number) => {
        const selectedDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
        if (activeDatePicker === "from") setFromDate(selectedDate);
        if (activeDatePicker === "to") setToDate(selectedDate);
        setActiveDatePicker(null);
    };

    const renderDatePicker = (type: "from" | "to", selectedDate: Date, side: "left" | "right") => (
        <div className="relative" ref={type === "from" ? fromDateRef : toDateRef}>
            <button
                type="button"
                onClick={() => openDatePicker(type)}
                className="cursor-pointer h-[33px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center"
            >
                {formatDisplayDate(selectedDate)}
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
                                selectedDate.getDate() === day &&
                                selectedDate.getMonth() === displayMonth.getMonth() &&
                                selectedDate.getFullYear() === displayMonth.getFullYear();
                            return (
                                <button
                                    key={`${type}-${day}-${idx}`}
                                    type="button"
                                    onClick={() => selectDate(day)}
                                    className={`h-[30px] w-[30px] mx-auto rounded-full text-[12px] font-[SemiBold] border transition-colors ${isSelected
                                        ? "bg-[#EA3934] text-white border-[#EA3934]"
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

    const allInquiryRows = useMemo<LeadRowWithTab[]>(() => {
        return leads.flatMap((main) =>
            main.subItems.flatMap((sub) =>
                sub.subItems.map((row) => ({
                    ...row,
                    inquiryTab: sub.name,
                }))
            )
        );
    }, []);

    const inquiryCounts = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = allInquiryRows.filter((row) =>
            matchesInquiryFilters(row, q, selectedAgent, selectedAgency)
        );
        return {
            totalInquiries: filtered.length,
            newInquiries: filtered.filter((r) => r.inquiryTab === "New inquiry").length,
            attendedInquiries: filtered.filter((r) => r.inquiryTab === "Attended inquiry").length,
            closedInquiries: filtered.filter((r) => r.inquiryTab === "Closed inquiry").length,
        };
    }, [allInquiryRows, search, selectedAgent, selectedAgency]);

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rows = (activeSub?.subItems ?? []).map((row) => ({
            ...row,
            inquiryTab: subTab,
        })) as LeadRowWithTab[];
        return rows.filter((row) =>
            matchesInquiryFilters(row, q, selectedAgent, selectedAgency)
        );
    }, [activeSub, search, selectedAgent, selectedAgency, subTab]);

    const paginatedRows = visibleRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const gridClass = TABLE_GRID_BASE;



    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header
                title="Listing Property Inquiry"
                showBack={true}
                onBackClick={() => navigate(-1)}
            />
            <div className="mt-[20px] rounded-[15px] bg-white min-w-0 p-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] flex flex-col gap-[18px]">

                <StatCards totalInquiries={inquiryCounts.totalInquiries} newInquiries={inquiryCounts.newInquiries} attendedInquiries={inquiryCounts.attendedInquiries} closedInquiries={inquiryCounts.closedInquiries} />

                {/* Top tabs + search + date */}
                <div className="flex justify-between flex-wrap items-center gap-[10px] flex-1 min-w-0">
                    <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[36px] w-full md:w-[240px]">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                            type="search"
                            placeholder="Search here"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-[10px]">
                        {/* Agent dropdown */}
                        <div className="relative" ref={agentDropdownRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAgentDropdownOpen((prev) => !prev);
                                    setIsAgencyDropdownOpen(false);
                                }}
                                className="cursor-pointer md:w-[250px] w-full h-[36px] truncate rounded-[15px] border border-[rgba(34,34,34,0.12)] px-[14px] text-left text-[14px] font-[Regular] flex items-center justify-between gap-[30px] bg-white"
                            >
                                <span
                                    className={
                                        selectedAgent ? "text-[#222] font-[Medium]" : "text-[#707070]"
                                    }
                                >
                                    {selectedAgent?.fullName || "Select agent"}
                                </span>
                                <DownArrowIcon
                                    width={11}
                                    height={7}
                                    className={`shrink-0 transition-transform ${isAgentDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {isAgentDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full z-40 w-[250px] mt-[8px] rounded-[10px] bg-white py-[12px] shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                    <div className="px-[12px] mb-[10px]">
                                        <div className="flex items-center gap-[10px] h-[40px] rounded-[10px] px-[12px] bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                            <SearchIcon className="text-[#707070] shrink-0" />
                                            <input
                                                type="search"
                                                value={agentSearch}
                                                onChange={(e) => setAgentSearch(e.target.value)}
                                                placeholder="Search agent"
                                                className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto px-[12px] scrollbar-hide">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedAgent(null);
                                                setIsAgentDropdownOpen(false);
                                                setAgentSearch("");
                                            }}
                                            className="w-full text-left py-[10px] text-[12px] font-[Medium] text-[#707070] border-b border-[rgba(34,34,34,0.08)]"
                                        >
                                            All agents
                                        </button>
                                        {filteredAgents.length === 0 ? (
                                            <p className="text-[12px] text-[#707070] py-[12px] text-center">
                                                No agents found
                                            </p>
                                        ) : (
                                            filteredAgents.map((agent) => (
                                                <button
                                                    key={agent._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedAgent(agent);
                                                        setIsAgentDropdownOpen(false);
                                                        setAgentSearch("");
                                                    }}
                                                    className="w-full text-left flex gap-[12px] items-start py-[12px] border-b border-[rgba(34,34,34,0.08)] rounded-[6px] px-[4px] -mx-[4px] transition-colors"
                                                >
                                                    <img
                                                        src={resolveProfileSrc(
                                                            agent.profilePicture,
                                                            agentImgBaseUrl
                                                        )}
                                                        alt=""
                                                        className="h-[40px] w-[40px] rounded-full object-cover shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0 pt-[2px]">
                                                        <p className="text-[12px] font-[Bold] text-[#222] leading-tight">
                                                            {agent.fullName || "—"}
                                                        </p>
                                                        <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px] leading-tight truncate">
                                                            {agent.agency?.agencyName ||
                                                                agent.email ||
                                                                "—"}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Agency dropdown */}
                        <div className="relative" ref={agencyDropdownRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsAgencyDropdownOpen((prev) => !prev);
                                    setIsAgentDropdownOpen(false);
                                }}
                                className="cursor-pointer md:w-[250px] w-full h-[36px] truncate rounded-[15px] border border-[rgba(34,34,34,0.12)] px-[14px] text-left text-[14px] font-[Regular] flex items-center justify-between gap-[30px] bg-white"
                            >
                                <span
                                    className={
                                        selectedAgency
                                            ? "text-[#222] font-[Medium]"
                                            : "text-[#707070]"
                                    }
                                >
                                    {selectedAgency?.agencyName || "Select agency"}
                                </span>
                                <DownArrowIcon
                                    width={11}
                                    height={7}
                                    className={`shrink-0 transition-transform duration-200 ${isAgencyDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {isAgencyDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full z-40 w-[250px] mt-[8px] rounded-[10px] bg-white py-[12px] shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                    <div className="px-[12px] mb-[10px]">
                                        <div className="flex items-center gap-[10px] h-[40px] rounded-[10px] px-[12px] bg-white shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                            <SearchIcon className="text-[#707070] shrink-0" />
                                            <input
                                                type="search"
                                                value={agencySearch}
                                                onChange={(e) => setAgencySearch(e.target.value)}
                                                placeholder="Search agency"
                                                className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto px-[12px] scrollbar-hide">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedAgency(null);
                                                setIsAgencyDropdownOpen(false);
                                                setAgencySearch("");
                                            }}
                                            className="w-full text-left py-[10px] text-[12px] font-[Medium] text-[#707070] border-b border-[rgba(34,34,34,0.08)]"
                                        >
                                            All agencies
                                        </button>
                                        {filteredAgency.length === 0 ? (
                                            <p className="text-[12px] text-[#707070] py-[12px] text-center">
                                                No agency found
                                            </p>
                                        ) : (
                                            filteredAgency.map((agency) => (
                                                <button
                                                    key={agency._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedAgency(agency);
                                                        setIsAgencyDropdownOpen(false);
                                                        setAgencySearch("");
                                                    }}
                                                    className="w-full text-left flex gap-[12px] items-start py-[12px] border-b border-[rgba(34,34,34,0.08)] rounded-[6px] px-[4px] -mx-[4px]"
                                                >
                                                    <img
                                                        src={resolveProfileSrc(
                                                            agency.profilePicture,
                                                            agencyImgBaseUrl,
                                                            agency.profilePictureUrl
                                                        )}
                                                        alt=""
                                                        className="h-[40px] w-[40px] rounded-full object-cover shrink-0"
                                                    />
                                                    <div className="flex-1 min-w-0 pt-[2px]">
                                                        <p className="text-[12px] font-[Bold] text-[#222] leading-tight">
                                                            {agency.agencyName || "—"}
                                                        </p>
                                                        <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px] leading-tight truncate">
                                                            {agency.email || "—"}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Date picker */}
                <div className="flex items-center gap-[10px] justify-end mt-[15px]">
                    <div className="flex flex-wrap items-center gap-[10px] shrink-0">
                        {renderDatePicker("from", fromDate, "right")}
                        <span className="text-[12px] text-[#707070]">to</span>
                        {renderDatePicker("to", toDate, "right")}
                    </div>
                </div>
                {/* Secondary tabs */}
                <div className="border-b border-[rgba(34,34,34,0.10)] flex gap-[28px] -mx-[18px] px-[20px] md:-mx-[18px] md:px-[30px]">
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
                    <div className="min-w-[1640px]">
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
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Agency</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Customer</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                            </div>

                            {paginatedRows.map((row, index) => {
                                const chip = sourceIconChip(row.sourceIcon);
                                return (
                                    <div
                                        key={row.id}
                                        className={`${gridClass} ${index !== paginatedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                    >
                                        {/* Property cell — same image style as ListingManagement */}
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-[#F5F5F5]">
                                                <img src={row.image} alt="" className="h-full w-full object-cover rounded-[8px]" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Regular] text-[#707070] leading-[1.2] truncate mb-[4px]">{row.propertyId}</p>
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
                                                <img src={row.agentAvatar} alt="" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">{row.agentName}</p>
                                                <p className="text-[12px] font-[Regular] text-[#707070] truncate">{row.agentTitle}</p>
                                            </div>
                                        </div>
                                        {/* Agency */}
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <div className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-full border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5]">
                                                <img src={row.agencyAvatar} alt="" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">{row.agencyName}</p>
                                                <p className="text-[12px] font-[Regular] text-[#707070] truncate">{row.agencyTitle}</p>
                                            </div>
                                        </div>

                                        {/* Customer */}
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <div className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-full bg-[#E6E6E6]" />
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">{row.customerName}</p>
                                                <p className="text-[12px] font-[Regular] text-[#707070] truncate">{row.customerPhone}</p>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <span className={`h-[32px] px-[10px] flex items-center justify-center text-[12px] font-[Medium] ${row.status === "New Inquiry" ? " rounded-[10px] bg-[#E7EBF7] border border-[#0832AE] text-[#0832AE]" : row.status === "Attended Inquiry" ? "rounded-[10px] bg-[#E6F7F0] border border-[#00A663] text-[#00A663]" : "rounded-[10px] bg-[#FDE7E7] border border-[#E80808] text-[#E80808]"}`}>{row.status}</span>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center justify-start gap-[6px]">
                                            <button type="button" className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9]" aria-label="View">
                                                <TrashIcon width={20} height={20} />
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
                    totalItems={visibleRows.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}

export default ListingPropertyInquiry;
