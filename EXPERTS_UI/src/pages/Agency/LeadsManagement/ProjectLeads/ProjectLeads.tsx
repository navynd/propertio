import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  SearchIcon,
  EyeDarkIcon,
  LeftArrowIcon,
  RightArrowIcon,
  DownArrowIcon,
  TickIcon,
} from "../../../../components/CustomFile/icons";
import AgencyHeader from "../../../../components/Header/AgencyHeader";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import Loader from "../../../../components/Loader/loader";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import StatusChangeModal from "./StatusChangeModal";

import noimg from "../../../../assets/img/nouserimg.svg";
import mainbg from "../../../../assets/img/mainbg.png";
import {
  agencyService,
  type ProjectLeadsResponse,
} from "../../../../services/agencyService";
import { API_BASE_URL, getApiErrorMessage } from "../../../../services/apiClient";
import { toast } from "../../../../services/toast";
type LeadStatus =
  | "Available"
  | "Reserved"
  | "In-Progress"
  | "Follow up"
  | "PreClose"
  | "Waiting for approval"
  | "Inquiry closed"
  | "Deal closed";

type LeadRow = {
  id: string;
  projectName: string;
  receivedText: string;
  location: string;
  image?: string | null;
  layoutType?: string;
  unit?: {
    id: string;
    unitNumber: string;
    status: string;
  };
  agentName: string;
  agentTitle: string;
  agentAvatar?: string | null;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string | null;
  TypeOfLead: string;
  status: LeadStatus;
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

function statusDotClass(status: LeadStatus) {
  const key = status.trim().toLowerCase().replace(/\s+/g, "-");
  if (key === "available") return "bg-[#00A663]";
  if (key === "reserved") return "bg-[#C7A335]";
  if (key === "in-progress") return "bg-[#FF46A2]";
  if (key === "follow-up") return "bg-[#0832AE]";
  if (key === "pre-close" || key === "preclose") return "bg-[#D4A373]";
  if (key === "waiting-for-approval") return "bg-[#0832AE]";
  if (key === "deal-closed") return "bg-[#00A663]";
  return "bg-[#D4A373]";
}

function statusPillClass(status: LeadStatus) {
  const key = status.trim().toLowerCase().replace(/\s+/g, "-");
  if (key === "waiting-for-approval") return "bg-[#0832AE] text-white";
  if (key === "deal-closed") return "bg-[#00A663] text-white";
  if (key === "inquiry-closed")
    return "bg-[rgba(212, 163, 115,0.10)] text-[#D4A373]";
  return "bg-white border border-[rgba(34,34,34,0.10)] text-[#222]";
}

function toStartOfDayIso(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return x.toISOString();
}

function toEndOfDayIso(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return x.toISOString();
}

function findLeadTabByParam(
  leadTabs: Array<{ name?: string; value?: string }>,
  tabParam: string,
) {
  const key = tabParam.trim().toLowerCase();
  if (!key) return null;
  return (
    leadTabs.find(
      (t) =>
        String(t.value ?? "").toLowerCase() === key ||
        String(t.name ?? "").toLowerCase() === key,
    ) ?? null
  );
}

function resolveRowStatus(
  item: Record<string, unknown>,
  ctx: { tab: string; subTab: string },
): LeadStatus {
  if (ctx.tab === "close-deal-request" && (item.dealApproval as { isWaiting?: boolean })?.isWaiting === true) {
    return "Waiting for approval";
  }
  if (ctx.tab === "closed-deal" && item.dealClosed) {
    return "Deal closed";
  }
  if (ctx.tab === "customer-requests" && ctx.subTab === "closed") {
    return "Inquiry closed";
  }

  const statusMap: Record<string, LeadStatus> = {
    available: "Available",
    reserved: "Reserved",
    "in-progress": "In-Progress",
    "follow-up": "Follow up",
    followup: "Follow up",
    "pre-close": "PreClose",
    closed: "Inquiry closed",
  };

  const pls = item.projectLeadStatus as string | undefined;
  if (pls === "available") return "Available";
  if (pls && statusMap[pls]) return statusMap[pls];
  if (item.status === "closed") return "Inquiry closed";
  return "Available";
}

function mapApiToRow(
  item: Record<string, unknown>,
  ctx: { tab: string; subTab: string },
): LeadRow {
  const project = item.project as
    | {
      title?: string;
      receivedOn?: string;
      location?: { address?: string };
      image?: { url?: string } | null;
    }
    | null
    | undefined;

  const rawUnit = item.unit as LeadRow["unit"] | string | null | undefined;
  const unit =
    rawUnit &&
      typeof rawUnit === "object" &&
      "unitNumber" in rawUnit &&
      rawUnit.unitNumber != null
      ? {
        id: String(rawUnit.id ?? ""),
        unitNumber: String(rawUnit.unitNumber),
        status: String(rawUnit.status ?? ""),
      }
      : undefined;

  const agent = item.agent as
    | { fullName?: string; profilePicture?: string | null; isSuperAgent?: boolean }
    | null
    | undefined;

  const customer = item.customer as
    | { name?: string; phoneNumber?: string; profilePicture?: string | null }
    | null
    | undefined;

  const received = project?.receivedOn
    ? new Date(project.receivedOn).toLocaleDateString("en-GB")
    : "-";

  return {
    id: String(item.id ?? ""),
    projectName: project?.title || "-",
    receivedText: `Received on ${received}`,
    location: project?.location?.address || "-",
    image: project?.image && typeof project.image === "object" ? project.image.url : undefined,
    layoutType: (item.layoutType as { layoutName?: string } | null)?.layoutName || "-",
    unit,
    agentName: agent?.fullName || "-",
    agentTitle: agent?.isSuperAgent ? "Super Agent" : "Agent",
    agentAvatar: agent?.profilePicture,
    customerName: customer?.name || "-",
    customerPhone: customer?.phoneNumber || "-",
    customerAvatar: customer?.profilePicture,
    status: resolveRowStatus(item, ctx),
    TypeOfLead: String(item.status ?? ""),
  };
}

const ProjectLeads = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const lastAppliedNavKeyRef = useRef<string | null>(null);
  const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);

  const [mainTab, setMainTab] = useState<string>("");
  const [subTab, setSubTab] = useState<string>("new");
  const [search, setSearch] = useState(
    () => searchParams.get("search")?.trim() ?? "",
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isMainTabDropdownOpen, setIsMainTabDropdownOpen] = useState(false);
  const mainTabDropdownRef = useRef<HTMLDivElement>(null);
  const [apiRows, setApiRows] = useState<LeadRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [leadTabs, setLeadTabs] = useState<any[]>([]);
  const [masterSubTabs, setMasterSubTabs] = useState<any[]>([]);
  const [statusOptions, setStatusOptions] = useState<
    { name: string; value: string }[]
  >([]);

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
  const [activeDatePicker, setActiveDatePicker] = useState<
    "from" | "to" | null
  >(null);
  const [displayMonth, setDisplayMonth] = useState(() => new Date());
  const fromDateRef = useRef<HTMLDivElement>(null);
  const toDateRef = useRef<HTMLDivElement>(null);

  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const openStatusTriggerRef = useRef<HTMLButtonElement | null>(null);
  const statusRowMenuPortalRef = useRef<HTMLDivElement | null>(null);
  const [isHeaderStatusOpen, setIsHeaderStatusOpen] = useState(false);
  const [headerStatusFilter, setHeaderStatusFilter] = useState<
    null | (typeof statusOptions)[number]
  >(null);
  const [openStatusRowId, setOpenStatusRowId] = useState<string | null>(null);
  const [rowStatusOverride, setRowStatusOverride] = useState<
    Record<string, LeadStatus>
  >({});
  const [statusChangeLeadId, setStatusChangeLeadId] = useState<string | null>(
    null,
  );
  const [statusChangeNextStatusName, setStatusChangeNextStatusName] =
    useState("");
  const [statusChangeNextStatusValue, setStatusChangeNextStatusValue] =
    useState("");
  const [statusChangeUnits, setStatusChangeUnits] = useState<
    Array<{ id: string; label: string }>
  >([]);
  const [statusRowMenuRect, setStatusRowMenuRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [imageBaseUrls, setImageBaseUrls] = useState({
    agent: "",
    project: "",
    user: "",
  });
  const [leadListCounts, setLeadListCounts] =
    useState<ProjectLeadsResponse["counts"]>(undefined);

  useEffect(() => {
    if (masterSubTabs.length) {
      setSubTab(masterSubTabs[0].value);
    }
  }, [masterSubTabs]);

  const mainTabApiValue = useMemo(() => {
    if (!leadTabs.length || !mainTab) return "";
    const t = leadTabs.find((x) => x.name === mainTab);
    return (t?.value as string | undefined) ?? "";
  }, [leadTabs, mainTab]);

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
      if (
        mainTabDropdownRef.current &&
        !mainTabDropdownRef.current.contains(target)
      ) {
        setIsMainTabDropdownOpen(false);
      }
      const inTableBody = statusDropdownRef.current?.contains(target) ?? false;
      const inRowStatusPortal =
        statusRowMenuPortalRef.current?.contains(target) ?? false;
      if (!inTableBody && !inRowStatusPortal) {
        setIsHeaderStatusOpen(false);
        setOpenStatusRowId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setIsHeaderStatusOpen(false);
    setHeaderStatusFilter(null);
    setOpenStatusRowId(null);
  }, [mainTab, subTab, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, headerStatusFilter, isFromDateSelected, isToDateSelected]);

  const activeSubItems = masterSubTabs;

  useEffect(() => {
    if (!leadTabs.length || !mainTabApiValue) return;

    let cancelled = false;

    const fetchLeads = async () => {
      try {
        setLoading(true);

        const tab = mainTabApiValue;
        const params: {
          tab: string;
          page: number;
          limit: number;
          counts: boolean;
          startDate?: string;
          endDate?: string;
          subTab?: string;
          projectLeadStatus?: string;
          search?: string;
        } = {
          tab,
          page: currentPage,
          limit: itemsPerPage,
          counts: true,
        };
        if (isFromDateSelected) params.startDate = toStartOfDayIso(fromDate);
        if (isToDateSelected) params.endDate = toEndOfDayIso(toDate);

        if (tab === "customer-requests") {
          params.subTab = subTab;
          if (subTab === "attended" && headerStatusFilter?.value) {
            params.projectLeadStatus = headerStatusFilter.value;
          }
        }

        const q = search.trim();
        if (q) params.search = q;

        const data = await agencyService.getProjectLeads(params);

        if (cancelled) return;

        const ctx = { tab, subTab };
        const mapped = (data.inquiries || []).map((item) =>
          mapApiToRow(item as Record<string, unknown>, ctx),
        );

        setApiRows(mapped);
        setTotalItems(data.pagination?.total ?? 0);
        setLeadListCounts(data.counts);
      } catch (err) {
        if (!cancelled) console.error("API error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchLeads();

    return () => {
      cancelled = true;
    };
  }, [
    leadTabs.length,
    mainTabApiValue,
    subTab,
    currentPage,
    search,
    fromDate,
    toDate,
    isFromDateSelected,
    isToDateSelected,
    headerStatusFilter,
    itemsPerPage,
  ]);

  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackProject = `${fallbackOrigin}/uploads/img/project/`;
    const fallbackUser = `${fallbackOrigin}/uploads/img/user/`;

    const fetchMasterData = async () => {
      try {
        const res = await agencyService.getMasterData([
          "supportedurls",
          "projectLeadStatuses",
          "projectLeadTabs",
          "projectLeadSubTabs",
        ]);

        if (!isMounted) return;

        // ---------------- supported urls ----------------
        const supported = res?.supportedUrls;

        setImageBaseUrls({
          agent: supported?.agentUrl?.img?.trim() || fallbackProject,
          project: supported?.projectUrl?.img?.trim() || fallbackProject,
          user: supported?.userUrl?.img?.trim() || fallbackUser,
        });

        // ---------------- lead statuses ----------------
        if (Array.isArray(res?.projectLeadStatuses)) {
          setStatusOptions(res.projectLeadStatuses);
        }

        // ---------------- main tabs ----------------
        if (Array.isArray(res?.projectLeadTabs)) {
          setLeadTabs(res.projectLeadTabs);
        }

        // ---------------- sub tabs ----------------
        if (Array.isArray(res?.projectLeadSubTabs)) {
          setMasterSubTabs(res.projectLeadSubTabs);
        }
      } catch (error) {
        console.log("master data error", error);

        if (!isMounted) return;

        setImageBaseUrls({
          agent: fallbackProject,
          project: fallbackProject,
          user: fallbackUser,
        });
      }
    };

    fetchMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const toImageUrl = (
    image: string | null,
    type: "agent" | "project" | "user",
  ) => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackProjectBase = `${fallbackOrigin}/uploads/img/project/`;
    const fallbackUserBase = `${fallbackOrigin}/uploads/img/user/`;

    const base =
      (type === "agent"
        ? imageBaseUrls.agent
        : type === "user"
          ? imageBaseUrls.user
          : imageBaseUrls.project) ||
      (type === "user" ? fallbackUserBase : fallbackProjectBase);

    const cleanBase = base.replace(/\/+$/, "");
    const cleanImage = image.replace(/^\/+/, "");

    return `${cleanBase}/${cleanImage}`;
  };

  useEffect(() => {
    if (!leadTabs.length) return;

    const tabParam = searchParams.get("tab")?.trim() ?? "";
    const searchParam = searchParams.get("search")?.trim() ?? "";
    const hasDeepLink = Boolean(tabParam || searchParam);

    if (hasDeepLink && lastAppliedNavKeyRef.current !== location.key) {
      lastAppliedNavKeyRef.current = location.key;
      if (tabParam) {
        const match = findLeadTabByParam(leadTabs, tabParam);
        if (match?.name) setMainTab(String(match.name));
      }
      if (searchParam) {
        setSearch(searchParam);
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        });
      }
    }

    setMainTab((prev) => prev || leadTabs[0]?.name || "");
  }, [leadTabs, searchParams, location.key]);

  useEffect(() => {
    if (masterSubTabs.length > 0 && !subTab) {
      setSubTab(masterSubTabs[0].value);
    }
  }, [masterSubTabs]);

  const calendarCells = getCalendarCells(displayMonth);

  const shiftMonth = (direction: -1 | 1) => {
    setDisplayMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1),
    );
  };

  const openDatePicker = (type: "from" | "to") => {
    setActiveDatePicker((prev) => (prev === type ? null : type));
    const sourceDate = type === "from" ? fromDate : toDate;
    setDisplayMonth(
      new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1),
    );
  };

  const selectDate = (day: number) => {
    const selectedDate = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth(),
      day,
    );
    if (activeDatePicker === "from") {
      selectedDate.setHours(0, 0, 0, 0);
      setFromDate(selectedDate);
      setIsFromDateSelected(true);
    }
    if (activeDatePicker === "to") {
      selectedDate.setHours(23, 59, 59, 999);
      setToDate(selectedDate);
      setIsToDateSelected(true);
    }
    setActiveDatePicker(null);
  };

  const renderDatePicker = (
    type: "from" | "to",
    selectedDate: Date,
    side: "left" | "right",
    isSelected: boolean,
  ) => (
    <div className="relative" ref={type === "from" ? fromDateRef : toDateRef}>
      <button
        type="button"
        onClick={() => openDatePicker(type)}
        className="cursor-pointer h-[33px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center"
      >
        {isSelected
          ? formatDisplayDate(selectedDate)
          : type === "from"
            ? "From date"
            : "To date"}
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
            <p className="text-[16px] font-[Bold] text-[#222]">
              {monthTitle(displayMonth)}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="text-[16px] font-[SemiBold] text-[#222] px-[6px]"
            >
              <RightArrowIcon width={14} height={14} />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-y-[6px] text-center">
            {weekDays.map((d, index) => (
              <span
                key={`${type}-day-${d}-${index}`}
                className="text-[13px] font-[SemiBold] text-[#222]"
              >
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
              const isDaySelected =
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === displayMonth.getMonth() &&
                selectedDate.getFullYear() === displayMonth.getFullYear();
              return (
                <button
                  key={`${type}-${day}-${idx}`}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`h-[30px] w-[30px] mx-auto rounded-full text-[12px] font-[SemiBold] border transition-colors ${isDaySelected
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

  const paginatedRows = apiRows;
  const activeStatusRow = useMemo(
    () => paginatedRows.find((row) => row.id === openStatusRowId) || null,
    [openStatusRowId, paginatedRows],
  );

  const requiresUnitForStatus = (value: string) => {
    const key = value.trim().toLowerCase().replace(/\s+/g, "-");
    return ["reserved", "in-progress", "follow-up", "pre-close"].includes(key);
  };

  const filteredStatusOptions = useMemo(() => {
    if (mainTabApiValue === "customer-requests" && subTab === "attended") {
      return statusOptions.filter(
        (opt) => opt.value.trim().toLowerCase() !== "available",
      );
    }
    return statusOptions;
  }, [mainTabApiValue, statusOptions, subTab]);

  const applyProjectLeadStatus = async (
    leadId: string,
    statusValue: string,
    statusName: string,
    unitId?: string,
  ) => {
    try {
      setActionLoading(true);
      await agencyService.updateAgencyProjectLeadStatus(leadId, {
        type: "set-project-status",
        projectLeadStatus: statusValue as
          | "available"
          | "reserved"
          | "in-progress"
          | "follow-up"
          | "pre-close",
        unitId: unitId || undefined,
      });
      setRowStatusOverride((prev) => ({
        ...prev,
        [leadId]: statusName as LeadStatus,
      }));
      toast.success("Updated", "Lead status updated successfully.");
      setIsStatusChangeModalOpen(false);
      setStatusChangeUnits([]);
      setStatusChangeLeadId(null);
      setStatusChangeNextStatusValue("");
      setStatusChangeNextStatusName("");
      return true;
    } catch (error: unknown) {
      toast.error(
        "Update failed",
        getApiErrorMessage(error, "Failed to update project lead status."),
      );
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const isCloseDealRequest = mainTab === "Close deal request";
  const tableGrid = isCloseDealRequest
    ? "grid grid-cols-[2.3fr_1.1fr_2.2fr_2fr_1.7fr_1fr] gap-2 items-center px-[14px] py-[12px]"
    : "grid grid-cols-[2.3fr_1.1fr_2.2fr_2fr_1.7fr_1fr] gap-2 items-center px-[14px] py-[12px]";

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader
        title="Project leads"
        showBack={false}
        onBackClick={() => { }}
      />
      <div className="rounded-[15px] bg-white min-w-0 md:p-[30px] p-[20px] flex flex-col gap-[18px]">
        {/* Top tabs + search + date */}
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <div className="flex flex-wrap items-center gap-[10px]">
            {/*tab section*/}
            <div className="hidden 2xl:flex flex-wrap items-center gap-[10px]">
              {leadTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setMainTab(t.name)}
                  className={`cursor-pointer rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${mainTab === t.name
                      ? "bg-[#222] text-white"
                      : "bg-white border border-[#EAEAEA] text-[#222]"
                    }`}
                >
                  {t.name}
                  {leadListCounts && t.value === "close-deal-request"
                    ? ` (${leadListCounts.closeDealRequest})`
                    : null}
                  {leadListCounts && t.value === "closed-deal"
                    ? ` (${leadListCounts.closedDeal})`
                    : null}
                </button>
              ))}
            </div>
            {/* dropdown view (xl, lg, md, sm) */}
            <div className="relative flex 2xl:hidden" ref={mainTabDropdownRef}>
              <button
                type="button"
                onClick={() => setIsMainTabDropdownOpen((o) => !o)}
                className="cursor-pointer inline-flex items-center justify-between gap-[10px] rounded-full border border-[#EAEAEA] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] min-w-[210px]"
              >
                <span className="truncate">{mainTab}</span>
                <DownArrowIcon width={10} height={6} />
              </button>
              {isMainTabDropdownOpen && (
                <div className="absolute left-0 top-[40px] z-30 w-full bg-white border border-[rgba(34,34,34,0.10)] rounded-[12px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                  {leadTabs.map((t) => {
                    const active = mainTab === t.name;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setMainTab(t.name);
                          setIsMainTabDropdownOpen(false);
                        }}
                        className={`w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${active ? "text-[#0832AE]" : "text-[#222]"}`}
                      >
                        {t.name}
                        {leadListCounts && t.value === "close-deal-request"
                          ? ` (${leadListCounts.closeDealRequest})`
                          : null}
                        {leadListCounts && t.value === "closed-deal"
                          ? ` (${leadListCounts.closedDeal})`
                          : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] w-full sm:w-[280px]">
              <SearchIcon className="text-[#707070] shrink-0" />
              <input
                ref={searchInputRef}
                type="search"
                placeholder="Search here"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-[10px]">
            {renderDatePicker("from", fromDate, "right", isFromDateSelected)}
            <span className="text-[12px] text-[#707070]">to</span>
            {renderDatePicker("to", toDate, "right", isToDateSelected)}
          </div>
        </div>

        {/* Secondary tabs — horizontal scroll on small / many tabs */}
        {mainTab === "Customer requests" && (
          <div className="-mx-[20px] border-b border-[rgba(34,34,34,0.10)] px-[20px] md:-mx-[30px] md:px-[30px] overflow-x-auto overflow-y-hidden scrollbar-hide">
            <div className="flex min-w-full w-max flex-nowrap gap-[28px]">
              {activeSubItems.map((tab) => {
                const active = subTab === tab.value;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubTab(tab.value)}
                    className={`relative shrink-0 cursor-pointer whitespace-nowrap p-[20px_30px] text-[13px] transition-colors ${active
                        ? "text-[#0832AE] font-[SemiBold]"
                        : "text-[#222] font-[Regular]"
                      }`}
                  >
                    {(() => {
                      const subLabel =
                        tab.value === "new"
                          ? "New inquiry"
                          : tab.value === "attended"
                            ? "Attended inquiry"
                            : tab.value === "closed"
                              ? "Closed inquiry"
                              : tab.name;
                      const subCount =
                        leadListCounts && tab.value === "new"
                          ? leadListCounts.new
                          : leadListCounts && tab.value === "attended"
                            ? leadListCounts.attended
                            : leadListCounts && tab.value === "closed"
                              ? leadListCounts.closed
                              : undefined;
                      return (
                        <>
                          {subLabel}
                          {subCount !== undefined ? ` (${subCount})` : ""}
                        </>
                      );
                    })()}
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
          <div className="min-w-[1260px]">
            <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] bg-white">
              <div
                className={`${tableGrid} bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}
              >
                <p className="text-[14px] font-[SemiBold] text-[#222]">
                  Project they inquire
                </p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">
                  {isCloseDealRequest ? "Unit" : "Layout type"}
                </p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Agent</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">
                  Customer
                </p>
                <div className="relative">
                  {mainTab === "Customer requests" && subTab === "attended" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsHeaderStatusOpen((o) => !o)}
                        className="cursor-pointer inline-flex items-center gap-[6px] text-[14px] font-[SemiBold] text-[#222]"
                      >
                        {headerStatusFilter
                          ? `Status: ${headerStatusFilter.name}`
                          : "Status"}
                        <DownArrowIcon width={10} height={6} />
                      </button>
                      {isHeaderStatusOpen && (
                        <div className="absolute left-0 top-[28px] z-30 w-[180px] bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setHeaderStatusFilter(null);
                              setIsHeaderStatusOpen(false);
                            }}
                            className="w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] text-[#222]"
                          >
                            All statuses
                          </button>
                          {statusOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setHeaderStatusFilter(opt);
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
                    <p className="text-[14px] font-[SemiBold] text-[#222]">
                      Status
                    </p>
                  )}
                </div>
                <p className="text-[14px] font-[SemiBold] text-[#222]">
                  Actions
                </p>
              </div>

              <div ref={statusDropdownRef} className="w-full min-w-[1260px]">
                {loading ? (
                  <div
                    className={`${tableGrid} border-t border-[rgba(34,34,34,0.06)] items-stretch`}
                    aria-busy="true"
                    aria-live="polite"
                  >
                    <div className="col-span-full flex flex-col items-center justify-center gap-3 py-[48px] min-h-[260px]">
                      <Loader size={72} margin={0} />
                      <p className="text-[13px] font-[Regular] text-[#707070]">
                        Loading leads...
                      </p>
                    </div>
                  </div>
                ) : paginatedRows.length === 0 ? (
                  <div
                    className={`${tableGrid} border-t border-[rgba(34,34,34,0.06)] items-stretch`}
                    role="status"
                  >
                    <div className="col-span-full flex flex-col items-center justify-center gap-2 py-[48px] px-[20px] min-h-[260px] text-center">
                      <p className="text-[16px] font-[Bold] text-[#222]">
                        No data found
                      </p>
                      <p className="text-[13px] font-[Regular] text-[#707070] max-w-[360px]">
                        Try changing tab, search, or date range.
                      </p>
                    </div>
                  </div>
                ) : (
                  paginatedRows.map((row, index) => {
                    const statusValue = rowStatusOverride[row.id] ?? row.status;
                    const canEditStatus =
                      mainTab === "Customer requests" &&
                      (subTab === "attended" || subTab === "new");
                    return (
                      <div
                        key={row.id}
                        className={`${tableGrid} ${index !== paginatedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                      >
                        {/* Project cell — same image style as ListingManagement */}
                        <div className="flex items-center gap-[10px] min-w-0">
                          <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-[#F5F5F5]">
                            <img
                              src={toImageUrl(row.image ?? null, "project")}
                              alt=""
                              className="h-full w-full object-cover rounded-[8px]"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] truncate mb-[4px]">
                              {row.projectName}
                            </p>
                            <p className="text-[12px] font-[Regular] text-[#707070] leading-[1.2] truncate">
                              {row.receivedText}
                            </p>
                          </div>
                        </div>

                        {/* Layout type / Unit */}
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {isCloseDealRequest
                            ? (row.unit?.unitNumber ?? "-")
                            : (row.layoutType ?? "-")}
                        </p>

                        {/* Agent */}
                        <div className="flex items-center gap-[10px] min-w-0">
                          <div className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-full border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5]">
                            <img
                              src={toImageUrl(row.agentAvatar ?? null, "agent")}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">
                              {row.agentName}
                            </p>
                            <p className="text-[12px] font-[Regular] text-[#707070] truncate">
                              {row.agentTitle}
                            </p>
                          </div>
                        </div>

                        {/* Customer */}
                        <div className="flex items-center gap-[10px] min-w-0">
                          <div className="w-[44px] h-[44px] shrink-0 overflow-hidden rounded-full">
                            <img
                              src={
                                row.customerAvatar
                                  ? toImageUrl(row.customerAvatar, "user")
                                  : noimg
                              }
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">
                              {row.customerName}
                            </p>
                            <p className="text-[12px] font-[Regular] text-[#707070] truncate">
                              {row.customerPhone}
                            </p>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="relative">
                          <button
                            ref={
                              openStatusRowId === row.id
                                ? openStatusTriggerRef
                                : undefined
                            }
                            type="button"
                            disabled={!canEditStatus}
                            onClick={() =>
                              setOpenStatusRowId((prev) =>
                                prev === row.id ? null : row.id,
                              )
                            }
                            className={`inline-flex items-center justify-between gap-[10px]  px-[12px] ${subTab === "closed" || statusValue === "Waiting for approval" || statusValue === "Deal closed" ? "w-auto rounded-[5px] h-[21px]" : "w-[160px] h-[33px] rounded-full"}  text-[12px] font-[SemiBold] ${statusPillClass(statusValue)} ${canEditStatus ? "cursor-pointer" : "cursor-default"}`}
                          >
                            <span className="inline-flex items-center gap-[8px]">
                              {statusValue !== "Inquiry closed" &&
                                statusValue !== "Waiting for approval" &&
                                statusValue !== "Deal closed" && (
                                  <span
                                    className={`h-[6px] w-[6px] rounded-full ${statusDotClass(statusValue)}`}
                                  />
                                )}
                              <span className="whitespace-nowrap">
                                {statusValue}
                              </span>
                            </span>
                            {canEditStatus && (
                              <DownArrowIcon width={10} height={6} />
                            )}
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-start gap-[6px]">
                          <button
                            type="button"
                            onClick={() => {
                              // keep hook for future detail page
                              navigate(
                                `/agency/leads/project-details/${row.id}`
                              );
                            }}
                            className="cursor-pointer p-[6px] rounded-[8px]"
                            aria-label="View"
                          >
                            <EyeDarkIcon width={20} height={20} />
                          </button>
                          {isCloseDealRequest && (
                            <button
                              type="button"
                              className="cursor-pointer p-[6px] rounded-[8px]"
                              aria-label="Approve"
                            >
                              <TickIcon
                                width={18}
                                height={15}
                                fill="#222"
                                strokeWidth={0.5}
                              />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
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
                  if (requiresUnitForStatus(nextStatusValue)) {
                    const rowUnitId = currentRow?.unit?.id?.trim();
                    if (rowUnitId) {
                      void applyProjectLeadStatus(
                        openStatusRowId,
                        nextStatusValue,
                        nextStatusName,
                        rowUnitId,
                      );
                      setOpenStatusRowId(null);
                      return;
                    }
                    void (async () => {
                      try {
                        setActionLoading(true);
                        const unitRes =
                          await agencyService.getProjectLeadAvailableUnits(
                            openStatusRowId,
                          );
                        const units = (unitRes?.units || [])
                          .filter((item) => item?.id && item?.unitNumber)
                          .map((item) => ({
                            id: String(item.id),
                            label: `Unit-${item.unitNumber}`,
                          }));
                        setStatusChangeUnits(units);
                        if (units.length === 0) {
                          toast.error(
                            "No units",
                            "No available units found for this lead.",
                          );
                          return;
                        }
                        setIsStatusChangeModalOpen(true);
                      } catch (error: unknown) {
                        toast.error(
                          "Load failed",
                          getApiErrorMessage(
                            error,
                            "Failed to fetch available units.",
                          ),
                        );
                      } finally {
                        setActionLoading(false);
                      }
                    })();
                  } else {
                    void applyProjectLeadStatus(
                      openStatusRowId,
                      nextStatusValue,
                      nextStatusName,
                    );
                  }
                  setOpenStatusRowId(null);
                }}
                className="w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] text-[#222] hover:bg-[#F5F5F5]"
              >
                <span className="inline-flex items-center gap-[8px]">
                  <span
                    className={`h-[6px] w-[6px] rounded-full ${statusDotClass(opt.name as LeadStatus)}`}
                  />
                  {opt.name}
                </span>
              </button>
            ))}
          </div>,
          document.body,
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
          const selected = statusChangeUnits.find(
            (unit) => unit.label === selectedUnit,
          );
          if (!selected?.id) {
            toast.error("Validation failed", "Please select a unit.");
            return false;
          }
          if (!statusChangeLeadId || !statusChangeNextStatusValue)
            return false;
          return applyProjectLeadStatus(
            statusChangeLeadId,
            statusChangeNextStatusValue,
            statusChangeNextStatusName,
            selected.id,
          );
        }}
      />
      {actionLoading && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
          <Loader size={90} margin={0} />
        </div>
      )}
    </div>
  );
};

export default ProjectLeads;
