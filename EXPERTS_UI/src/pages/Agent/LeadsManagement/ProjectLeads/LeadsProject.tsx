import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SearchIcon, EyeDarkIcon, LeftArrowIcon, RightArrowIcon, DownArrowIcon, TickIcon } from "../../../../components/CustomFile/icons";
import AgencyHeader from "../../../../components/Header/AgencyHeader";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import StatusChangeModal from "./StatusChangeModal";
import Loader from "../../../../components/Loader/loader";
import { agentService } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";
import home1img from "../../../../assets/img/home1.png";
import home2img from "../../../../assets/img/home2.png";
import home3img from "../../../../assets/img/home3.png";
import profileimg from "../../../../assets/img/user.png";
import noimg from "../../../../assets/img/nouserimg.svg";

type LeadStatus = string;

type LeadRow = {
    id: string | number;
    projectName: string;
    receivedText: string;
    location: string;
    image: string;
    layoutType?: string;
    unit?: string;
    unitId?: string;
    agentName: string;
    agentTitle: string;
    agentAvatar: string;
    customerName: string;
    customerPhone: string;
    customerAvatar?: string;
    TypeOfLead: string;
    status: LeadStatus;
    rawProjectLeadStatus?: string;
    isDealApprovalWaiting?: boolean;
};

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
                        projectName: "Omniyat Bespoke | Villa",
                        receivedText: "Received on 30 May 2025",
                        location: "Dubai, Palm jumeirah",
                        image: home1img,
                        layoutType: "TYPE A-1BHK",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        status: "Available",
                        TypeOfLead: "New inquiry",
                    },
                    {
                        id: 2,
                        projectName: "Omniyat Bespoke | Villa",
                        receivedText: "Received on 30 May 2025",
                        location: "Dubai, Palm jumeirah",
                        image: home2img,
                        layoutType: "TYPE A-1BHK",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        status: "Available",
                        TypeOfLead: "New inquiry",
                    },
                ],
            },
            {
                id: 2,
                name: "Attended inquiry",
                subItems: [
                    {
                        id: 1,
                        projectName: "Omniyat Bespoke | Villa",
                        receivedText: "Received on 30 May 2025",
                        location: "Dubai, Palm jumeirah",
                        image: home3img,
                        layoutType: "TYPE A-1BHK",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        status: "Reserved",
                        TypeOfLead: "Attended inquiry",
                    },
                    {
                        id: 2,
                        projectName: "Omniyat Bespoke | Villa",
                        receivedText: "Received on 30 May 2025",
                        location: "Dubai, Palm jumeirah",
                        image: home1img,
                        layoutType: "TYPE A-1BHK",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        status: "In-Progress",
                        TypeOfLead: "Attended inquiry",
                    },
                    {
                        id: 4,
                        projectName: "Omniyat Bespoke | Villa",
                        receivedText: "Received on 30 May 2025",
                        location: "Dubai, Palm jumeirah",
                        image: home3img,
                        layoutType: "TYPE A-1BHK",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        status: "PreClose",
                        TypeOfLead: "Attended inquiry",
                    },
                ],
            },
            {
                id: 3,
                name: "Closed inquiry",
                subItems: [
                    {
                        id: 1,
                        projectName: "Omniyat Bespoke | Villa",
                        receivedText: "Received on 30 May 2025",
                        location: "Dubai, Palm jumeirah",
                        image: home1img,
                        layoutType: "TYPE A-1BHK",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        status: "Inquiry closed",
                        TypeOfLead: "Closed inquiry",
                    },
                ],
            },
        ],
    },
    // {
    //     id: 2,
    //     name: "Close deal request",
    //     subItems: [
    //         {
    //             id: 1,
    //             name: "Close deal request",
    //             subItems: [
    //                 {
    //                     id: 1,
    //                     projectName: "Omniyat Bespoke | Villa",
    //                     receivedText: "Received on 30 May 2025",
    //                     location: "Dubai, Palm jumeirah",
    //                     image: home2img,
    //                     unit: "Unit - 001",
    //                     agentName: "William turner",
    //                     agentTitle: "Senior Property Consultant",
    //                     agentAvatar: profileimg,
    //                     customerName: "William turner",
    //                     customerPhone: "+(000) 1234 5468",
    //                     status: "Waiting for approval",
    //                     TypeOfLead: "Close deal request",
    //                 },
    //             ],
    //         },
    //     ],
    // },
    {
        id: 2,
        name: "Closed Deal",
        subItems: [
            {
                id: 1,
                name: "Closed Deal",
                subItems: [
                    {
                        id: 1,
                        projectName: "Omniyat Bespoke | Villa",
                        receivedText: "Received on 30 May 2025",
                        location: "Dubai, Palm jumeirah",
                        image: home3img,
                        layoutType: "TYPE A-1BHK",
                        agentName: "William turner",
                        agentTitle: "Senior Property Consultant",
                        agentAvatar: profileimg,
                        customerName: "William turner",
                        customerPhone: "+(000) 1234 5468",
                        status: "Deal closed",
                        TypeOfLead: "Closed Deal",
                    },
                ],
            },
        ],
    },
];

const statusOptions: string[] = [
    "Available",
    "Reserved",
    "In-Progress",
    "Follow up",
    "PreClose",
];

function statusDotClass(status: LeadStatus) {
    const key = status.trim().toLowerCase().replace(/\s+/g, "-");
    if (key === "available") return "bg-[#00A663]";
    if (key === "reserved") return "bg-[#C7A335]";
    if (key === "in-progress") return "bg-[#FF46A2]";
    if (key === "follow-up") return "bg-[#0832AE]";
    if (key === "pre-close") return "bg-[#EA3934]";
    if (key === "waiting-for-approval") return "bg-[#0832AE]";
    if (key === "deal-closed") return "bg-[#00A663]";
    return "bg-[#EA3934]";
}

function statusPillClass(status: LeadStatus) {
    const key = status.trim().toLowerCase().replace(/\s+/g, "-");
    if (key === "waiting-for-approval") return "bg-[#0832AE] text-white";
    if (key === "deal-closed") return "bg-[#00A663] text-white";
    if (key === "inquiry-closed") return "bg-[rgba(234,57,52,0.10)] text-[#EA3934]";
    return "bg-white border border-[rgba(34,34,34,0.10)] text-[#222]";
}

const LeadsProject = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const lastAppliedNavKeyRef = useRef<string | null>(null);
    const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
    const defaultMain = leads[0]?.name ?? "";
    const [mainTab, setMainTab] = useState<string>(() => {
        const tabParam = new URLSearchParams(window.location.search).get("tab")?.trim() ?? "";
        if (tabParam === "closed-deal") return "Closed Deal";
        if (tabParam === "customer-requests") return "Customer requests";
        return defaultMain;
    });
    const [subTab, setSubTab] = useState<string>("new");
    const [projectLeadSubTabs, setProjectLeadSubTabs] = useState<Array<{ name: string; value: string }>>([
        { name: "New inquiry", value: "new" },
        { name: "Attended inquiry", value: "attended" },
        { name: "Closed inquiry", value: "closed" },
    ]);
    const [projectLeadStatuses, setProjectLeadStatuses] = useState<Array<{ name: string; value: string }>>(
        statusOptions.map((name) => ({ name, value: name.toLowerCase().replace(/\s+/g, "-") }))
    );
    const [apiRows, setApiRows] = useState<LeadRow[]>([]);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState(
        () => searchParams.get("search")?.trim() ?? "",
    );
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isLoading, setIsLoading] = useState(false);
    const [projectImgBaseUrl, setProjectImgBaseUrl] = useState("");
    const [agentImgBaseUrl, setAgentImgBaseUrl] = useState("");
    const [userImgBaseUrl, setUserImgBaseUrl] = useState("");

    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [toDate, setToDate] = useState(() => {
        const d = new Date();
        d.setHours(23, 59, 59, 999);
        return d;
    });
    const [isFromDateSelected, setIsFromDateSelected] = useState(false);
    const [isToDateSelected, setIsToDateSelected] = useState(false);
    const [activeDatePicker, setActiveDatePicker] = useState<"from" | "to" | null>(null);
    const [displayMonth, setDisplayMonth] = useState(() => new Date());
    const fromDateRef = useRef<HTMLDivElement>(null);
    const toDateRef = useRef<HTMLDivElement>(null);

    const statusDropdownRef = useRef<HTMLDivElement>(null);
    const openStatusTriggerRef = useRef<HTMLButtonElement | null>(null);
    const statusRowMenuPortalRef = useRef<HTMLDivElement | null>(null);
    const [isHeaderStatusOpen, setIsHeaderStatusOpen] = useState(false);
    const [headerStatusFilter, setHeaderStatusFilter] = useState<string | null>(null);
    const [openStatusRowId, setOpenStatusRowId] = useState<string | null>(null);
    const [statusRowMenuRect, setStatusRowMenuRect] = useState<{ top: number; left: number; width: number } | null>(null);
    const [statusChangeLeadId, setStatusChangeLeadId] = useState<string>("");
    const [statusChangeNextStatusName, setStatusChangeNextStatusName] = useState<string>("");
    const [statusChangeNextStatusValue, setStatusChangeNextStatusValue] = useState<string>("");
    const [statusChangeUnits, setStatusChangeUnits] = useState<Array<{ id: string; label: string }>>([]);

    useLayoutEffect(() => {
        if (openStatusRowId == null) {
            setStatusRowMenuRect(null);
            return;
        }
        const update = () => {
            const el = openStatusTriggerRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const width = 180;
            setStatusRowMenuRect({
                top: r.bottom + 4,
                left: Math.max(8, r.right - width),
                width,
            });
        };
        update();
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
        };
    }, [openStatusRowId]);

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                fromDateRef.current &&
                !fromDateRef.current.contains(target) &&
                toDateRef.current &&
                !toDateRef.current.contains(target)
            ) {
                setActiveDatePicker(null);
            }
            const inTableBody = statusDropdownRef.current?.contains(target) ?? false;
            const inRowStatusPortal = statusRowMenuPortalRef.current?.contains(target) ?? false;
            if (!inTableBody && !inRowStatusPortal) {
                setIsHeaderStatusOpen(false);
                setOpenStatusRowId(null);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    useEffect(() => {
        const tabParam = searchParams.get("tab")?.trim() ?? "";
        const searchParam = searchParams.get("search")?.trim() ?? "";
        const hasDeepLink = Boolean(tabParam || searchParam);

        if (hasDeepLink && lastAppliedNavKeyRef.current !== location.key) {
            lastAppliedNavKeyRef.current = location.key;
            if (tabParam === "closed-deal") {
                setMainTab("Closed Deal");
            } else if (tabParam === "customer-requests") {
                setMainTab("Customer requests");
            }
            if (searchParam) {
                setSearch(searchParam);
            }
        }
    }, [searchParams, location.key]);

    useEffect(() => {
        const loadProjectLeadMaster = async () => {
            try {
                const response = await agentService.getProjectLeadMasterData();
                const subTabs = response.projectLeadSubTabs || response.projectleadsubtabs || [];
                const statuses = response.projectLeadStatuses || response.projectleadstatuses || [];

                if (subTabs.length) {
                    setProjectLeadSubTabs(
                        subTabs
                            .filter((item) => item?.name?.trim() && item?.value?.trim())
                            .map((item) => ({ name: item.name.trim(), value: item.value.trim() }))
                    );
                }
                if (statuses.length) {
                    setProjectLeadStatuses(
                        statuses
                            .filter((item) => item?.name?.trim() && item?.value?.trim())
                            .map((item) => ({ name: item.name.trim(), value: item.value.trim() }))
                    );
                }
            } catch {
                // keep fallback static values
            }
        };
        void loadProjectLeadMaster();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        setIsHeaderStatusOpen(false);
        setHeaderStatusFilter(null);
        setOpenStatusRowId(null);
    }, [mainTab, subTab, search, isFromDateSelected, isToDateSelected, fromDate, toDate]);

    useEffect(() => {
        if (mainTab !== "Customer requests") return;
        if (projectLeadSubTabs.some((s) => s.value === subTab)) return;
        setSubTab(projectLeadSubTabs[0]?.value ?? "new");
    }, [mainTab, projectLeadSubTabs, subTab]);

    useEffect(() => {
        const loadSupportedUrls = async () => {
            try {
                const supportedRes = await agentService.getSupportedUrlsMasterData();
                const anySupported = supportedRes as unknown as {
                    supportedUrls?: { projectUrl?: { img?: string }; agentUrl?: { img?: string }; userUrl?: { img?: string } };
                    supportedurls?: { projectUrl?: { img?: string }; agentUrl?: { img?: string }; userUrl?: { img?: string } };
                    projectUrl?: { img?: string };
                    agentUrl?: { img?: string };
                    userUrl?: { img?: string };
                };
                const projectBase =
                    anySupported?.supportedUrls?.projectUrl?.img ||
                    anySupported?.supportedurls?.projectUrl?.img ||
                    anySupported?.projectUrl?.img ||
                    "";
                const agentBase =
                    anySupported?.supportedUrls?.agentUrl?.img ||
                    anySupported?.supportedurls?.agentUrl?.img ||
                    anySupported?.agentUrl?.img ||
                    "";
                const userBase =
                    anySupported?.supportedUrls?.userUrl?.img ||
                    anySupported?.supportedurls?.userUrl?.img ||
                    anySupported?.userUrl?.img ||
                    "";
                setProjectImgBaseUrl(projectBase);
                setAgentImgBaseUrl(agentBase);
                setUserImgBaseUrl(userBase);
            } catch {
                setProjectImgBaseUrl("");
                setAgentImgBaseUrl("");
                setUserImgBaseUrl("");
            }
        };
        void loadSupportedUrls();
    }, []);

    useEffect(() => {
        const tabParam = mainTab === "Closed Deal" ? "closed-deal" : "customer-requests";
        const statusParam =
            mainTab === "Customer requests" && subTab === "attended" && headerStatusFilter
                ? projectLeadStatuses.find((opt) => opt.name === headerStatusFilter)?.value || undefined
                : undefined;

        const formatStatusText = (value?: string | null) => {
            if (!value) return "-";
            return value
                .split("-")
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                .join(" ");
        };
        const formatAgentType = (value?: string | null) => {
            if (!value) return "Agent";
            const normalized = value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
            return normalized
                .split(" ")
                .filter(Boolean)
                .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
                .join(" ");
        };

        const mapLead = (item: {
            id: string;
            project?: { title?: string; image?: string | null; location?: { address?: string; city?: string; zone?: string; fullAddress?: string } | null; receivedOn?: string } | null;
            layoutType?: { layoutName?: string } | null;
            unit?: { id?: string; unitNumber?: string } | null;
            customer?: { name?: string; phoneNumber?: string; profilePicture?: string | null } | null;
            agent?: { fullName?: string; agentType?: string; profilePicture?: string | null } | null;
            projectLeadStatus?: string | null;
            dealClosed?: { dealType?: string } | null;
            dealApproval?: { isWaiting?: boolean } | null;
        }): LeadRow => {
            const toUrl = (raw: string | null | undefined, baseUrl: string, fallback: string) => {
                if (!raw) return fallback;
                if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
                return baseUrl ? `${baseUrl.replace(/\/?$/, "/")}${raw}` : fallback;
            };
            const rawImage = item.project?.image || "";
            const image =
                rawImage && !rawImage.startsWith("http")
                    ? projectImgBaseUrl
                        ? `${projectImgBaseUrl.replace(/\/?$/, "/")}${rawImage}`
                        : rawImage
                    : rawImage || home1img;
            const receivedAt = item.project?.receivedOn;
            const receivedText = receivedAt
                ? `Received on ${new Date(receivedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`
                : "-";
            const leadStatus =
                mainTab === "Closed Deal"
                    ? "Deal closed"
                    : subTab === "closed"
                        ? "Inquiry closed"
                        : formatStatusText(item.projectLeadStatus) || "-";
            return {
                id: String(item.id),
                projectName: item.project?.title || "Untitled",
                receivedText,
                location:
                    item.project?.location?.fullAddress ||
                    item.project?.location?.address ||
                    [item.project?.location?.city, item.project?.location?.zone].filter(Boolean).join(", ") ||
                    "-",
                image,
                layoutType: item.layoutType?.layoutName || "-",
                unit: item.unit?.unitNumber ? `Unit - ${item.unit.unitNumber}` : "-",
                unitId: item.unit?.id ? String(item.unit.id) : undefined,
                agentName: item.agent?.fullName || "You",
                agentTitle: formatAgentType(item.agent?.agentType),
                agentAvatar: toUrl(item.agent?.profilePicture, agentImgBaseUrl || userImgBaseUrl, profileimg),
                customerName: item.customer?.name || "-",
                customerPhone: item.customer?.phoneNumber || "-",
                customerAvatar: toUrl(item.customer?.profilePicture, userImgBaseUrl || agentImgBaseUrl, noimg),
                TypeOfLead: subTab,
                status: leadStatus,
                rawProjectLeadStatus: item.projectLeadStatus || undefined,
                isDealApprovalWaiting: Boolean(item.dealApproval?.isWaiting),
            };
        };

        const fetchLeads = async () => {
            setIsLoading(true);
            try {
                const response = await agentService.getProjectLeads({
                    tab: tabParam,
                    subTab: mainTab === "Customer requests" ? (subTab as "new" | "attended" | "closed") : undefined,
                    projectLeadStatus: statusParam,
                    search,
                    startDate: isFromDateSelected ? fromDate.toISOString() : undefined,
                    endDate: isToDateSelected ? toDate.toISOString() : undefined,
                    page: currentPage,
                    limit: itemsPerPage,
                    counts: true,
                });
                setApiRows((response.inquiries || []).map(mapLead));
                setTotalItems(response.pagination?.total || 0);
            } catch (error: unknown) {
                setApiRows([]);
                setTotalItems(0);
                const message = (error as { message?: string })?.message || "Failed to fetch project leads.";
                toast.error("Load failed", message);
            } finally {
                setIsLoading(false);
            }
        };
        void fetchLeads();
    }, [
        currentPage,
        fromDate,
        headerStatusFilter,
        isFromDateSelected,
        isToDateSelected,
        mainTab,
        projectImgBaseUrl,
        agentImgBaseUrl,
        userImgBaseUrl,
        projectLeadStatuses,
        search,
        subTab,
        toDate,
    ]);

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

    const renderDatePicker = (type: "from" | "to", selectedDate: Date, side: "left" | "right", isSelected: boolean) => (
        <div className="relative" ref={type === "from" ? fromDateRef : toDateRef}>
            <button
                type="button"
                onClick={() => openDatePicker(type)}
                className="cursor-pointer h-[33px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center"
            >
                {isSelected ? formatDisplayDate(selectedDate) : type === "from" ? "From date" : "To date"}
            </button>
            {activeDatePicker === type && (
                <div className={`absolute right-0 top-[40px] z-20 h-[320px] w-[280px] rounded-[12px] bg-white p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}>
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

    const [rowStatusOverride, setRowStatusOverride] = useState<Record<string, LeadStatus>>({});

    const visibleRows = useMemo(() => {
        return apiRows.map((r) => ({ ...r, status: rowStatusOverride[String(r.id)] ?? r.status }));
    }, [apiRows, rowStatusOverride]);

    const paginatedRows = visibleRows;
    const activeStatusRow = useMemo(
        () => visibleRows.find((row) => String(row.id) === openStatusRowId) || null,
        [openStatusRowId, visibleRows]
    );
    const filteredStatusOptions = useMemo(() => {
        // In attended inquiry, "Available" should not be selectable.
        if (mainTab === "Customer requests" && subTab === "attended") {
            return projectLeadStatuses.filter(
                (opt) => opt.value.trim().toLowerCase() !== "available"
            );
        }
        return projectLeadStatuses;
    }, [mainTab, projectLeadStatuses, subTab]);

    const requiresUnitStatus = (value: string) => {
        const key = value.trim().toLowerCase().replace(/\s+/g, "-");
        return ["reserved", "in-progress", "follow-up", "pre-close"].includes(key);
    };

    const applyProjectLeadStatus = async (leadId: string, statusValue: string, statusName: string, unitId?: string) => {
        try {
            setIsLoading(true);
            await agentService.updateProjectLeadStatus(leadId, {
                type: "set-project-status",
                projectLeadStatus: statusValue as "available" | "reserved" | "in-progress" | "follow-up" | "pre-close",
                unitId: unitId || undefined,
            });
            setRowStatusOverride((prev) => ({ ...prev, [leadId]: statusName }));
            toast.success("Updated", "Lead status updated successfully.");
            return true;
        } catch (error: unknown) {
            const message = (error as { message?: string })?.message || "Failed to update project lead status.";
            toast.error("Update failed", message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const isCloseDealRequest = mainTab === "Closed Deal";
    const tableGrid = isCloseDealRequest
        ? "grid grid-cols-[2.3fr_1.1fr_2.2fr_2fr_1.7fr_1fr] gap-2 items-center px-[14px] py-[12px]"
        : "grid grid-cols-[2.3fr_1.1fr_2.2fr_2fr_1.7fr_1fr] gap-2 items-center px-[14px] py-[12px]";

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="rounded-[15px] bg-white min-w-0 md:p-[30px] p-[20px] flex flex-col gap-[18px]">
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

                        {renderDatePicker("from", fromDate, "left", isFromDateSelected)}
                        <span className="text-[12px] text-[#707070]">to</span>
                        {renderDatePicker("to", toDate, "right", isToDateSelected)}
                    </div>
                </div>

                {/* Secondary tabs — horizontal scroll on small / many tabs */}
                {mainTab === "Customer requests" && (
                    <div className="-mx-[20px] border-b border-[rgba(34,34,34,0.10)] px-[20px] md:-mx-[30px] md:px-[30px] overflow-x-auto overflow-y-hidden scrollbar-hide">
                        <div className="flex min-w-full w-max flex-nowrap gap-[28px]">
                            {projectLeadSubTabs.map((tab) => {
                                const active = subTab === tab.value;
                                return (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => setSubTab(tab.value)}
                                        className={`relative shrink-0 cursor-pointer whitespace-nowrap p-[20px_30px] text-[13px] transition-colors ${active ? "text-[#0832AE] font-[SemiBold]" : "text-[#222] font-[Regular]"
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
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto w-full scrollbar-hide">
                    <div className={`min-w-[1260px] ${paginatedRows.length === 0 ? "h-[260px]" : ""} `}>
                        <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] bg-white">
                            <div className={`${tableGrid} bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Project they inquire</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">{isCloseDealRequest ? "Unit" : "Layout type"}</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Agent</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Customer</p>
                                <div className="relative">
                                    {mainTab === "Customer requests" && subTab === "attended" ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setIsHeaderStatusOpen((o) => !o)}
                                                className="cursor-pointer inline-flex items-center gap-[6px] text-[14px] font-[SemiBold] text-[#222]"
                                            >
                                                Status <DownArrowIcon width={10} height={6} />
                                            </button>
                                            {isHeaderStatusOpen && (
                                                <div className="absolute left-0 top-[28px] z-30 w-[180px] bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                                    {projectLeadStatuses.map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault();
                                                                setHeaderStatusFilter(opt.name);
                                                                setIsHeaderStatusOpen(false);
                                                            }}
                                                            className="w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] text-[#222]"
                                                        >
                                                            <span className="inline-flex items-center">

                                                                {opt.name}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                                    )}
                                </div>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                            </div>

                            <div ref={statusDropdownRef}>
                                {paginatedRows.length > 0 ? paginatedRows.map((row, index) => {
                                    const statusValue = row.status;
                                    const canEditStatus = !(
                                        (mainTab === "Customer requests" && subTab === "closed") ||
                                        statusValue === "Inquiry closed" ||
                                        statusValue === "Deal closed" ||
                                        statusValue === "Waiting for approval"
                                    );
                                    return (
                                        <div
                                            key={row.id}
                                            className={`${tableGrid} ${index !== paginatedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                        >
                                            <div className="flex items-center gap-[10px] min-w-0">
                                                <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-[#F5F5F5]">
                                                    <img src={row.image} alt="" className="h-full w-full object-cover rounded-[8px]" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] truncate mb-[4px]">{row.projectName}</p>
                                                    <p className="text-[12px] font-[Regular] text-[#707070] leading-[1.2] truncate">{row.receivedText}</p>
                                                </div>
                                            </div>


                                            <p className="text-[12px] font-[Regular] text-[#222] truncate">
                                                {isCloseDealRequest ? row.unit ?? "-" : row.layoutType ?? "-"}
                                            </p>


                                            <div className="flex items-center gap-[10px] min-w-0">
                                                <div className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-full border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5]">
                                                    <img src={row.agentAvatar} alt="" className="h-full w-full object-cover" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">{row.agentName}</p>
                                                    <p className="text-[12px] font-[Regular] text-[#707070] truncate">{row.agentTitle}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-[10px] min-w-0">
                                                <div className="w-[44px] h-[44px] shrink-0 overflow-hidden rounded-full" >
                                                    <img src={row.customerAvatar || noimg} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">{row.customerName}</p>
                                                    <p className="text-[12px] font-[Regular] text-[#707070] truncate">{row.customerPhone}</p>
                                                </div>
                                            </div>


                                            <div className="relative">
                                                <button
                                                    ref={openStatusRowId === String(row.id) ? openStatusTriggerRef : undefined}
                                                    type="button"
                                                    onClick={() => {
                                                        if (!canEditStatus) return;
                                                        setOpenStatusRowId((prev) => (prev === String(row.id) ? null : String(row.id)));
                                                    }}
                                                    className={`inline-flex items-center justify-between gap-[10px]  px-[12px] ${subTab === "closed" || statusValue === "Waiting for approval" || statusValue === "Deal closed" ? "w-auto rounded-[5px] h-[21px]" : "w-[160px] h-[33px] rounded-full"}  text-[12px] font-[SemiBold] ${statusPillClass(statusValue)} ${canEditStatus ? "cursor-pointer" : "cursor-default"}`}
                                                >
                                                    <span className="inline-flex items-center gap-[8px]">
                                                        {statusValue !== "Inquiry closed" && statusValue !== "Waiting for approval" && statusValue !== "Deal closed" && (
                                                            <span className={`h-[6px] w-[6px] rounded-full ${statusDotClass(statusValue)}`} />
                                                        )}
                                                        <span className="whitespace-nowrap">{statusValue}</span>
                                                    </span>
                                                    {canEditStatus && <DownArrowIcon width={10} height={6} />}
                                                </button>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center justify-start gap-[6px]">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        // keep hook for future detail page
                                                        navigate(`/agent/leads/project-details/${row.id}`, { state: row });
                                                    }}
                                                    className="cursor-pointer p-[6px] rounded-[8px]"
                                                    aria-label="View"
                                                >
                                                    <EyeDarkIcon width={20} height={20} />
                                                </button>
                                                {isCloseDealRequest && row.isDealApprovalWaiting && (
                                                    <button
                                                        type="button"
                                                        className="cursor-pointer p-[6px] rounded-[8px]"
                                                        aria-label="Approve"
                                                    >
                                                        <TickIcon width={18} height={15} fill="#222" strokeWidth={0.5} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="px-[14px] py-[20px] text-center text-[13px] font-[Regular] text-[#707070]">
                                        No project leads found
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                {paginatedRows.length !== 0 && (
                    <Pagenation
                        currentPage={currentPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}

            {openStatusRowId != null &&
                statusRowMenuRect &&
                createPortal(
                    <div
                        ref={statusRowMenuPortalRef}
                        className="fixed z-[100] max-h-[180px] overflow-y-auto rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white py-[6px] shadow-[0_6px_16px_rgba(0,0,0,0.12)]"
                        style={{
                            top: statusRowMenuRect.top,
                            left: statusRowMenuRect.left,
                            width: statusRowMenuRect.width,
                        }}
                    >
                        {filteredStatusOptions.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    if (!openStatusRowId) return;
                                    const currentRow = activeStatusRow;
                                    const nextStatusName = opt.name.trim();
                                    const nextStatusValue = opt.value.trim().toLowerCase();
                                    setStatusChangeLeadId(openStatusRowId);
                                    setStatusChangeNextStatusName(nextStatusName);
                                    setStatusChangeNextStatusValue(nextStatusValue);
                                    if (requiresUnitStatus(nextStatusValue)) {
                                        if (currentRow?.unitId) {
                                            void applyProjectLeadStatus(
                                                openStatusRowId,
                                                nextStatusValue,
                                                nextStatusName,
                                                currentRow.unitId
                                            );
                                            setOpenStatusRowId(null);
                                            return;
                                        }
                                        void (async () => {
                                            try {
                                                setIsLoading(true);
                                                const unitRes = await agentService.getProjectLeadAvailableUnits(openStatusRowId);
                                                const units = (unitRes?.units || [])
                                                    .filter((item) => item?.id && item?.unitNumber)
                                                    .map((item) => ({ id: String(item.id), label: `Unit-${item.unitNumber}` }));
                                                setStatusChangeUnits(units);
                                                if (units.length === 0) {
                                                    toast.error("No units", "No available units found for this lead.");
                                                    return;
                                                }
                                    setIsStatusChangeModalOpen(true);
                                            } catch (error: unknown) {
                                                const message =
                                                    (error as { message?: string })?.message || "Failed to fetch available units.";
                                                toast.error("Load failed", message);
                                            } finally {
                                                setIsLoading(false);
                                            }
                                        })();
                                    } else {
                                        void applyProjectLeadStatus(openStatusRowId, nextStatusValue, nextStatusName);
                                    }
                                    setOpenStatusRowId(null);
                                }}
                                className="w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] text-[#222] hover:bg-[#F5F5F5]"
                            >
                                <span className="inline-flex items-center gap-[8px]">
                                    <span className={`h-[6px] w-[6px] rounded-full ${statusDotClass(opt.name)}`} />
                                    {opt.name}
                                </span>
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
            <StatusChangeModal
                isOpen={isStatusChangeModalOpen}
                onClose={() => {
                    setIsStatusChangeModalOpen(false);
                    setStatusChangeUnits([]);
                }}
                nextStatus={statusChangeNextStatusName}
                unitOptions={statusChangeUnits.map((unit) => unit.label)}
                onSave={async (selectedUnit) => {
                    const selected = statusChangeUnits.find((unit) => unit.label === selectedUnit);
                    if (!selected?.id) {
                        toast.error("Validation failed", "Please select a unit.");
                        return false;
                    }
                    if (!statusChangeLeadId || !statusChangeNextStatusValue) return false;
                    return applyProjectLeadStatus(
                        statusChangeLeadId,
                        statusChangeNextStatusValue,
                        statusChangeNextStatusName,
                        selected.id
                    );
                }}
            />
        </div >
    );
};

export default LeadsProject;
