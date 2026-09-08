import { useEffect, useMemo, useRef, useState } from "react";
import {
  SearchIcon,
  DownArrowIcon,
  TrashIcon,
  EyeDarkIcon,
  EditIcon,
  LocationIcon,
  LeftArrowIcon,
  RightArrowIcon,
  TickIcon,
} from "../../../components/CustomFile/icons";
import AgencyHeader from "../../../components/Header/AgencyHeader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import home1img from "../../../assets/img/home1.png";
import home2img from "../../../assets/img/home2.png";
import home3img from "../../../assets/img/home3.png";
import profileimg from "../../../assets/img/user.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import mainbg from "../../../assets/img/mainbg.png";
import { agencyService } from "../../../services/agencyService";
import { toast } from "../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../services/apiClient";
import Loader from "../../../components/Loader/loader";
type ListingScope = "Active" | "Inactive" | "DealClosed";

const LISTING_SCOPE_TABS: { id: ListingScope; label: string }[] = [
  { id: "Active", label: "Active" },
  { id: "Inactive", label: "Inactive" },
  { id: "DealClosed", label: "Deal closed" },
];

function listingScopeLabel(scope: ListingScope): string {
  return LISTING_SCOPE_TABS.find((t) => t.id === scope)?.label ?? "Active";
}

type PropertyFor = "Buy" | "Rent" | "Commercial Buy" | "Commercial Rent";
type RowStatus = "Open" | "Closed" | "Inactive";

type ListingRow = {
  id: string;
  name: string;
  location: string;
  image: string;
  propertyFor: PropertyFor;
  createdDate: string;
  agentName: string;
  agentTitle: string;
  agentAvatar: string;
  status: RowStatus;
  activeScope: ListingScope;
};

const ALL_LISTING_TAB_ID = "all";

/** Master listing types shown as category filters (API uses `listingType` ObjectId). */
type ListingTypeTab = {
  id: string;
  name: string;
  slug: string;
};

const EXCLUDED_LISTING_SLUGS = new Set(["new-projects", "new-project"]);

function listingScopeFromSearchParams(params: URLSearchParams): ListingScope {
  const scopeParam = params.get("listingScope")?.trim();
  if (
    scopeParam === "Active" ||
    scopeParam === "Inactive" ||
    scopeParam === "DealClosed"
  ) {
    return scopeParam;
  }
  const statusParam = params.get("status");
  if (statusParam === "Closed") return "DealClosed";
  if (statusParam === "Open") return "Active";
  return "Active";
}

const ALL_LOCATIONS_ID = "all";

type PropertyLocationOption = {
  id: string;
  cityKey: string;
  displayName: string;
};

const TABLE_GRID =
  "grid grid-cols-[40px_minmax(0,2.9fr)_2fr_2fr_minmax(0,2.55fr)_1.3fr_minmax(108px,auto)] gap-2 items-center px-[14px] py-[12px]";

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

const mapApiToPropertyFor = (type: string): PropertyFor => {
  switch (type) {
    case "buy":
      return "Buy";
    case "rent":
      return "Rent";
    case "commercial-buy":
      return "Commercial Buy";
    case "commercial-rent":
      return "Commercial Rent";
    default:
      return "Buy";
  }
};

const formatDateForApi = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

function formatPropertyAddress(
  loc: Record<string, unknown> | null | undefined,
): string {
  if (!loc || typeof loc !== "object") return "-";
  const full = loc.fullAddress;
  if (typeof full === "string" && full.trim()) return full.trim();
  const building =
    typeof loc.building === "string" ? loc.building.trim() : "";
  const zone = typeof loc.zone === "string" ? loc.zone.trim() : "";
  const city = typeof loc.city === "string" ? loc.city.trim() : "";
  const emirate =
    typeof loc.emirate === "string" ? loc.emirate.trim() : "";
  const legacy =
    typeof loc.address === "string" ? loc.address.trim() : "";
  if (legacy) return legacy;
  const parts = [building, zone, city, emirate].filter(Boolean);
  return parts.length ? parts.join(", ") : "-";
}

function agentSpecializationLabel(agent: Record<string, unknown> | null | undefined): string {
  if (!agent || typeof agent !== "object") return "-";
  const sp = agent.specialization;
  if (sp && typeof sp === "object" && "title" in sp) {
    const t = (sp as { title?: unknown }).title;
    if (typeof t === "string" && t.trim()) return t.trim();
  }
  if (typeof sp === "string" && sp.trim()) return sp.trim();
  const at = agent.agentType;
  if (at && typeof at === "object" && "name" in at) {
    const n = (at as { name?: unknown }).name;
    if (typeof n === "string" && n.trim()) return n.trim();
  }
  return "-";
}

function formatListingPublishedCell(iso: string | undefined | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return formatDisplayDate(d);
}

/** Read deal state: prefer API `dealStatus`, else infer from `dealInfo.dealClosedDate` (same rules as backend). */
function getDealStatusFromItem(item: Record<string, unknown>): string {
  const direct = item.dealStatus;
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const propertyStatus = String(item.status ?? "").toLowerCase();
  if (propertyStatus === "sold" || propertyStatus === "rented") {
    return "deal-close";
  }

  const dealInfo = item.dealInfo as Record<string, unknown> | undefined;
  const closed = dealInfo?.dealClosedDate;
  if (closed != null && closed !== "") {
    const t = new Date(String(closed)).getTime();
    if (!Number.isNaN(t)) return "deal-close";
  }
  return "deal-open";
}

/** API `dealStatus`: deal-open | deal-close */
function rowStatusFromDeal(
  listingScope: ListingScope,
  propertyStatus: string,
  dealStatus: string,
): RowStatus {
  if (listingScope === "Inactive" || propertyStatus === "inactive") {
    return "Inactive";
  }
  if (listingScope === "DealClosed") return "Closed";
  const ds = dealStatus.toLowerCase();
  if (ds === "deal-close" || ds === "deal-closed") return "Closed";
  return "Open";
}

function propertyForBadgeClass(forType: PropertyFor) {
  switch (forType) {
    case "Buy":
      return "bg-[rgba(0,166,99,0.10)] text-[#00A663]";
    case "Rent":
      return "bg-[rgba(234,57,52,0.10)] text-[#EA3934]";
    case "Commercial Buy":
      return "bg-[rgba(255,70,162,0.10)] text-[#FF46A2]";
    default:
      return "bg-[rgba(199,163,53,0.10)] text-[#C7A335]";
  }
}

function statusBadgeClass(status: RowStatus) {
  if (status === "Open") return "bg-[#00A663] text-[#FFF]";
  if (status === "Closed") return "bg-[#E80808] text-[#FFF]";
  if (status === "Inactive") return "bg-[#E80808] text-[#FFF]";
  return "border border-[rgba(34,34,34,0.10)] text-[#FFF] bg-[#E80808]";
}

const ListingManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [listingScope, setListingScope] = useState<ListingScope>(() =>
    listingScopeFromSearchParams(searchParams),
  );
  const [categoryTab, setCategoryTab] = useState(ALL_LISTING_TAB_ID);
  const [search, setSearch] = useState("");
  const fetchSeqRef = useRef(0);
  const [propertyLocations, setPropertyLocations] = useState<
    PropertyLocationOption[]
  >([]);
  const [selectedLocationId, setSelectedLocationId] =
    useState<string>(ALL_LOCATIONS_ID);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);
  const [isListingScopeDropdownOpen, setIsListingScopeDropdownOpen] =
    useState(false);
  const listingScopeDropdownRef = useRef<HTMLDivElement>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [activeDatePicker, setActiveDatePicker] = useState<
    "from" | "to" | null
  >(null);
  const [displayMonth, setDisplayMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const fromDateRef = useRef<HTMLDivElement>(null);
  const toDateRef = useRef<HTMLDivElement>(null);
  const [listingTabs, setListingTabs] = useState<ListingTypeTab[]>([
    { id: ALL_LISTING_TAB_ID, name: "All", slug: "all" },
  ]);
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  /** When set, matches API `pagination.totalPages` for accurate pager. */
  const [apiTotalPages, setApiTotalPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageBaseUrls, setImageBaseUrls] = useState({
    agent: "",
    property: "",
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setListingScope(listingScopeFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set("listingScope", listingScope);
    params.delete("status");
    const next = params.toString();
    if (next !== searchParams.toString()) {
      navigate({ search: next }, { replace: true });
    }
  }, [listingScope, navigate, searchParams]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        locationDropdownRef.current &&
        !locationDropdownRef.current.contains(e.target as Node)
      ) {
        setIsLocationDropdownOpen(false);
      }
      if (
        listingScopeDropdownRef.current &&
        !listingScopeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsListingScopeDropdownOpen(false);
      }
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
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
    const fetchListingTypes = async () => {
      try {
        const res = await agencyService.getMasterData(["listingtypes"]);

        const list = res?.listingTypes || [];

        const apiTabs: ListingTypeTab[] = list
          .filter((item: { isActive?: boolean }) => item.isActive)
          .filter((item: { slug?: string }) => {
            const s = String(item.slug ?? "").toLowerCase();
            return !EXCLUDED_LISTING_SLUGS.has(s);
          })
          .sort(
            (a: { displayOrder?: number }, b: { displayOrder?: number }) =>
              (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
          )
          .map((item: { _id?: string; name?: string; slug?: string }) => ({
            id: String(item._id ?? ""),
            name: String(item.name ?? ""),
            slug: String(item.slug ?? ""),
          }))
          .filter((tab) => tab.id.length === 24);

        setListingTabs([
          { id: ALL_LISTING_TAB_ID, name: "All", slug: "all" },
          ...apiTabs,
        ]);
      } catch (err) {
        console.error("Listing types fetch error:", err);
      }
    };

    fetchListingTypes();
  }, []);

  useEffect(() => {
    const fetchPropertyLocations = async () => {
      try {
        const res = await agencyService.getMasterData(["propertylocations"]);
        const list = res?.propertyLocations ?? [];
        const mapped: PropertyLocationOption[] = list
          .map((item: { _id?: string; cityKey?: string; displayName?: string }) => ({
            id: String(item._id ?? ""),
            cityKey: String(item.cityKey ?? "").trim(),
            displayName: String(item.displayName ?? "").trim() || String(item.cityKey ?? ""),
          }))
          .filter((loc) => loc.id.length === 24 && loc.cityKey.length > 0);
        setPropertyLocations(mapped);
      } catch (err) {
        console.error("Property locations fetch error:", err);
      }
    };

    void fetchPropertyLocations();
  }, []);

  useEffect(() => {
    if (
      selectedLocationId !== ALL_LOCATIONS_ID &&
      !propertyLocations.some((l) => l.id === selectedLocationId)
    ) {
      setSelectedLocationId(ALL_LOCATIONS_ID);
    }
  }, [propertyLocations, selectedLocationId]);

  useEffect(() => {
    if (
      categoryTab !== ALL_LISTING_TAB_ID &&
      !listingTabs.some((t) => t.id === categoryTab)
    ) {
      setCategoryTab(ALL_LISTING_TAB_ID);
    }
  }, [listingTabs, categoryTab]);

  const fetchListings = async () => {
    const seq = ++fetchSeqRef.current;
    try {
      setLoading(true);

      const selectedLoc =
        selectedLocationId !== ALL_LOCATIONS_ID
          ? propertyLocations.find((l) => l.id === selectedLocationId)
          : undefined;
      const cityKeyFilter = selectedLoc?.cityKey?.trim();

      const statusParam =
        listingScope === "Inactive"
          ? "inactive"
          : listingScope === "DealClosed"
            ? "sold,rented"
            : "active";

      const res = await agencyService.getAgentProperties({
        page: currentPage,
        limit: itemsPerPage,
        status: statusParam,
        search: search.trim() || undefined,
        listingType:
          categoryTab !== ALL_LISTING_TAB_ID ? categoryTab : undefined,
        ...(cityKeyFilter
          ? { city: cityKeyFilter, zone: cityKeyFilter }
          : {}),
        ...(fromDate ? { startDate: formatDateForApi(fromDate) } : {}),
        ...(toDate ? { endDate: formatDateForApi(toDate) } : {}),
      });

      const items = res?.items || [];
      const pagination: { total?: number; totalPages?: number } =
        res?.pagination || {};

      const mapped: ListingRow[] = items.map((item: Record<string, unknown>) => {
        const images = (item.images as unknown[]) || [];

        const primaryImage =
          images.find(
            (img: unknown) =>
              typeof img === "object" &&
              img !== null &&
              (img as { isPrimary?: boolean }).isPrimary === true,
          ) || images[0];

        const lt = item.listingType;
        const listingSlug =
          typeof lt === "string"
            ? lt
            : (lt as { slug?: string } | undefined)?.slug ?? "";

        const loc = item.location as Record<string, unknown> | undefined;
        const agent = item.agent as Record<string, unknown> | undefined;
        const primaryUrl =
          primaryImage &&
            typeof primaryImage === "object" &&
            primaryImage !== null
            ? String((primaryImage as { url?: string }).url ?? "")
            : "";

        return {
          id: String(item._id),
          name: String(item.title ?? ""),
          location: formatPropertyAddress(loc),
          image: primaryUrl || home1img,
          propertyFor: mapApiToPropertyFor(listingSlug),
          createdDate: formatListingPublishedCell(
            (item.publishedAt ?? item.createdAt) as string | undefined,
          ),
          agentName:
            agent && typeof agent.fullName === "string"
              ? agent.fullName
              : "-",
          agentTitle: agentSpecializationLabel(agent),
          agentAvatar:
            agent && typeof agent.profilePicture === "string"
              ? agent.profilePicture
              : profileimg,
          status: rowStatusFromDeal(
            listingScope,
            String(item.status ?? ""),
            getDealStatusFromItem(item),
          ),
          activeScope: item.status === "inactive" ? "Inactive" : "Active",
        };
      });

      if (seq !== fetchSeqRef.current) return;
      setRows(mapped);
      const total = Number(pagination.total);
      setTotalItems(Number.isFinite(total) ? total : 0);
      const tp = pagination.totalPages;
      setApiTotalPages(typeof tp === "number" && tp >= 1 ? tp : null);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error("Fetch listings error:", err);
      setRows([]);
      setTotalItems(0);
      setApiTotalPages(null);
      toast.error(
        "Could not load listings",
        getApiErrorMessage(err, "Please try again in a moment."),
      );
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  };
  useEffect(() => {
    void fetchListings();
  }, [
    currentPage,
    categoryTab,
    listingScope,
    search,
    selectedLocationId,
    propertyLocations,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/property/`;

    agencyService
      .getMasterData(["supportedurls"])
      .then((data) => {
        if (!isMounted) return;

        const supported = data?.supportedUrls;

        setImageBaseUrls({
          agent: supported?.agentUrl?.img?.trim() || fallback,
          property: supported?.propertyUrl?.img?.trim() || fallback,
        });
      })
      .catch(() => {
        if (!isMounted) return;

        setImageBaseUrls({
          agent: fallback,
          property: fallback,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const toImageUrl = (image: string | null, type: "agent" | "property") => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;

    const base =
      (type === "agent" ? imageBaseUrls.agent : imageBaseUrls.property) ||
      fallbackBase;

    const cleanBase = base.replace(/\/+$/, "");
    const cleanImage = image.replace(/^\/+/, "");

    return `${cleanBase}/${cleanImage}`;
  };

  const categoryDisplayName = useMemo(() => {
    return listingTabs.find((tab) => tab.id === categoryTab)?.name ?? "All";
  }, [listingTabs, categoryTab]);

  const locationDisplayName = useMemo(() => {
    if (selectedLocationId === ALL_LOCATIONS_ID) return "All locations";
    return (
      propertyLocations.find((l) => l.id === selectedLocationId)
        ?.displayName ?? "All locations"
    );
  }, [propertyLocations, selectedLocationId]);

  const totalPages = useMemo(() => {
    if (apiTotalPages != null && apiTotalPages >= 1) return apiTotalPages;
    return Math.max(1, Math.ceil(totalItems / itemsPerPage));
  }, [apiTotalPages, totalItems, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    listingScope,
    categoryTab,
    search,
    selectedLocationId,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedRows = rows;
  const allPageSelected =
    !loading &&
    paginatedRows.length > 0 &&
    paginatedRows.every((r) => selectedIds.has(r.id));

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) paginatedRows.forEach((r) => next.delete(r.id));
      else paginatedRows.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const canDelete = selectedIds.size > 0;

  const calendarCells = getCalendarCells(displayMonth);

  const shiftMonth = (direction: -1 | 1) => {
    setDisplayMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1),
    );
  };

  const openDatePicker = (type: "from" | "to") => {
    setActiveDatePicker((prev) => (prev === type ? null : type));
    const sourceDate =
      type === "from" ? fromDate ?? new Date() : toDate ?? new Date();
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
    if (activeDatePicker === "from") setFromDate(selectedDate);
    if (activeDatePicker === "to") setToDate(selectedDate);
    setActiveDatePicker(null);
  };

  const renderDatePicker = (
    type: "from" | "to",
    selectedDate: Date | null,
    side: "left" | "right",
  ) => (
    <div className="relative" ref={type === "from" ? fromDateRef : toDateRef}>
      <button
        type="button"
        onClick={() => openDatePicker(type)}
        className="cursor-pointer h-[33px] rounded-full bg-white px-[12px] text-[12px] font-[SemiBold] inline-flex items-center"
      >
        <span className={selectedDate ? "text-[#222]" : "text-[#707070]"}>
          {selectedDate
            ? formatDisplayDate(selectedDate)
            : type === "from"
              ? "From date"
              : "To date"}
        </span>
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
  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader
        title="Listing management"
        showBack={false}
        onBackClick={() => { }}
      />

      <div className="rounded-[15px] bg-white min-w-0 md:p-[30px] p-[16px] flex flex-col gap-[20px]">
        <div className="flex flex-wrap items-center justify-between gap-[10px]">
          {/* active and inactive listing section */}
          <div className="flex items-center gap-[10px]">
            {/* 2xl+ show buttons */}
            <div className="hidden 2xl:flex flex-wrap items-center gap-[10px]">
              <button
                type="button"
                onClick={() => setListingScope("Active")}
                className={`cursor-pointer rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${listingScope === "Active"
                  ? "bg-[#222] text-white"
                  : "bg-white border border-[#EAEAEA] text-[#222]"
                  }`}
              >
                Active 
              </button>
              <button
                type="button"
                onClick={() => setListingScope("Inactive")}
                className={`cursor-pointer rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${listingScope === "Inactive"
                  ? "bg-[#222] text-white"
                  : "bg-white border border-[#EAEAEA] text-[#222]"
                  }`}
              >
                Inactive
              </button>
              <button
                type="button"
                onClick={() => setListingScope("DealClosed")}
                className={`cursor-pointer rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${listingScope === "DealClosed"
                  ? "bg-[#222] text-white"
                  : "bg-white border border-[#EAEAEA] text-[#222]"
                  }`}
              >
                Deal closed
              </button>
            </div>
            {/* xl/lg/md/sm show dropdown */}
            <div
              className="relative flex 2xl:hidden"
              ref={listingScopeDropdownRef}
            >
              <button
                type="button"
                onClick={() => setIsListingScopeDropdownOpen((o) => !o)}
                className="cursor-pointer inline-flex items-center justify-between gap-[10px] rounded-full border border-[#EAEAEA] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] w-[150px]"
              >
                <span className="truncate">{listingScopeLabel(listingScope)}</span>
                <DownArrowIcon width={10} height={6} />
              </button>
              {isListingScopeDropdownOpen && (
                <div className="absolute left-0 top-[40px] z-30 w-full min-w-[150px] bg-white border border-[rgba(34,34,34,0.10)] rounded-[12px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                  {LISTING_SCOPE_TABS.map((tab) => {
                    const active = listingScope === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setListingScope(tab.id);
                          setIsListingScopeDropdownOpen(false);
                        }}
                        className={`w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${active ? "text-[#0832AE]" : "text-[#222]"}`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] w-full md:w-[340px]">
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

          {/* Filter section */}
          <div className="flex flex-col gap-[14px] lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-[10px]">
              {/*category tab section*/}
              {/* 2xl+ show category tabs */}
              <div className="hidden 2xl:flex flex-wrap items-center gap-[10px]">
                {listingTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryTab(tab.id)}
                    className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] px-[15px] h-[33px] rounded-full shrink-0 transition-colors ${categoryTab === tab.id
                      ? "bg-[#222] text-[#fff]"
                      : "bg-[#fff] border border-[#EAEAEA] text-[#222] hover:bg-[#F5F5F5]"
                      }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>
              {/* xl/lg/md/sm show category dropdown */}
              <div
                className="relative flex 2xl:hidden"
                ref={categoryDropdownRef}
              >
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen((o) => !o)}
                  className="cursor-pointer inline-flex items-center justify-between gap-[10px] rounded-full border border-[#EAEAEA] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] w-[100px]"
                >
                  <span className="truncate text-start w-[60px]">{categoryDisplayName}</span>
                  <DownArrowIcon width={10} height={6} />
                </button>
                {isCategoryDropdownOpen && (
                  <div className="absolute left-0 top-[40px] z-30 w-[220px] max-w-[85vw] bg-white border border-[rgba(34,34,34,0.10)] rounded-[12px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                    {listingTabs.map((tab) => {
                      const active = categoryTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setCategoryTab(tab.id);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${active ? "text-[#0832AE]" : "text-[#222]"}`}
                        >
                          {tab.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/*Delete button*/}
              <button
                type="button"
                disabled={!canDelete}
                className={`flex items-center gap-[6px] px-[12px] h-[33px] rounded-full text-[12px] font-[SemiBold] ${canDelete
                  ? "cursor-pointer text-[#222] bg-[#F5F5F5] hover:bg-[#EAEAEA]"
                  : "cursor-not-allowed opacity-50 text-[#222] bg-[#F5F5F5]"
                  }`}
              >
                <TrashIcon width={16} height={16} />
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Date filter section */}
        <div className="p-[5px] bg-[#F5F5F5] xl:rounded-full rounded-[10px] flex flex-col gap-[12px] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div
            className="relative w-full sm:max-w-[280px]"
            ref={locationDropdownRef}
          >
            <button
              type="button"
              onClick={() => setIsLocationDropdownOpen((o) => !o)}
              className="cursor-pointer h-[33px] w-full rounded-full bg-white px-[14px] flex items-center justify-between text-left text-[13px] font-[Regular] text-[#222]"
            >
              <span
                className={
                  selectedLocationId === ALL_LOCATIONS_ID
                    ? "text-[#707070]"
                    : "text-[#222]"
                }
              >
                {locationDisplayName}
              </span>
              <DownArrowIcon
                className={`shrink-0 transition-transform ${isLocationDropdownOpen ? "rotate-180" : ""}`}
                width={11}
                height={7}
              />
            </button>
            {isLocationDropdownOpen && (
              <div className="absolute left-0 right-0 top-[44px] z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelectedLocationId(ALL_LOCATIONS_ID);
                    setIsLocationDropdownOpen(false);
                  }}
                  className={`w-full text-left px-[14px] py-[9px] text-[13px] font-[Medium] hover:bg-[#F5F5F5] ${selectedLocationId === ALL_LOCATIONS_ID
                    ? "text-[#EA3934] bg-[#FDF2F2]"
                    : "text-[#222]"
                    }`}
                >
                  All locations
                </button>
                {propertyLocations.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedLocationId(loc.id);
                      setIsLocationDropdownOpen(false);
                    }}
                    className={`w-full text-left px-[14px] py-[9px] text-[13px] font-[Medium] hover:bg-[#F5F5F5] ${selectedLocationId === loc.id
                      ? "text-[#EA3934] bg-[#FDF2F2]"
                      : "text-[#222]"
                      }`}
                  >
                    {loc.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/*Created date filter section*/}
          <div className="flex flex-wrap items-center gap-[8px] text-[12px]">
            <span className="text-[#222] font-[Regular] whitespace-nowrap">
              Created date:
            </span>
            {/*From date */}
            {renderDatePicker("from", fromDate, "right")}
            <span className="text-[#707070]">to</span>
            {/*To date */}
            {renderDatePicker("to", toDate, "right")}
          </div>
        </div>
        {/* Table section */}
        <div className="overflow-x-auto w-full scrollbar-hide">
          <div className="min-w-[1310px]">
            <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
              <div
                className={`${TABLE_GRID} bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)] flex gap-[20px]`}
              >
                <div className="flex justify-center">
                  <label
                    className={`relative ${loading || paginatedRows.length === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  >  <input
                      type="checkbox"
                      className="peer hidden "
                      disabled={loading || paginatedRows.length === 0}
                      checked={allPageSelected}
                      onChange={toggleSelectAllPage}
                    />
                    <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                      {allPageSelected ? <TickIcon width={10} height={10} /> : null}
                    </div>
                  </label>
                </div>
                {/* <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAllPage}
                    disabled={loading || paginatedRows.length === 0}
                    className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Select all"
                  />
                </div> */}
                <p className="text-[14px] font-[SemiBold] text-[#222]">
                  Property Details
                </p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">
                  Property for
                </p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">
                  Created date
                </p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Agent</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">
                  Status
                </p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">
                  Actions
                </p>
              </div>

              {loading ? (
                <div
                  className="flex flex-col items-center justify-center gap-3 py-[48px] min-h-[280px] border-t border-[rgba(34,34,34,0.06)]"
                  aria-busy="true"
                  aria-live="polite"
                >
                  <Loader size={72} margin={0} />
                  <p className="text-[13px] font-[Regular] text-[#707070]">
                    Loading listings…
                  </p>
                </div>
              ) : paginatedRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-[48px] px-[20px] min-h-[280px] text-center border-t border-[rgba(34,34,34,0.06)]">
                  <p className="text-[16px] font-[Bold] text-[#222]">
                    No listings found
                  </p>
                  <p className="text-[13px] font-[Regular] text-[#707070] max-w-[360px]">
                    Try changing filters, search, or date range.
                  </p>
                </div>
              ) : (
                paginatedRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={`${TABLE_GRID} flex gap-[20px] ${index !== paginatedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                  >
                    <div className="flex justify-center">
                      <label
                        className={`relative ${loading || paginatedRows.length === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          disabled={loading || paginatedRows.length === 0}
                          className="peer hidden "
                        />
                        <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                          {selectedIds ? <TickIcon width={10} height={10} /> : null}
                        </div>
                      </label>
                    </div>
                    {/* <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                        aria-label={`Select ${row.name}`}
                      />
                    </div> */}
                    {/* Same cell layout as SuperAgentDetail Agent Listing */}
                    <div className="flex items-center gap-[10px] min-w-0">
                      <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[8px] bg-[#F5F5F5]">
                        <img
                          src={toImageUrl(row.image, "property")}
                          alt=""
                          className="h-full w-full object-cover rounded-[8px]"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] mb-[4px] truncate">
                          {row.name}
                        </p>
                        <p className="text-[12px] text-[#707070] leading-[1.2] flex items-center gap-[5px] min-w-0">
                          <span className="inline-flex shrink-0">
                            <LocationIcon width={11} height={15} />
                          </span>
                          <span className="truncate">{row.location}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center rounded-[6px] px-[10px] py-[6px] text-[12px] font-[SemiBold] leading-none ${propertyForBadgeClass(row.propertyFor)}`}
                      >
                        {row.propertyFor}
                      </span>
                    </div>

                    <p className="text-[12px] font-[Regular] text-[#222]">
                      {row.createdDate}
                    </p>

                    <div className="flex items-center gap-[10px] min-w-0">
                      <div className="h-[44px] w-[44px] shrink-0 overflow-hidden rounded-full border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5]">
                        <img
                          src={toImageUrl(row.agentAvatar, "agent")}
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

                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center rounded-[6px] px-[10px] py-[6px] text-[12px] font-[SemiBold] leading-none ${statusBadgeClass(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-[6px]">
                      <button
                        onClick={() =>
                          navigate(`/agency/listing-details/${row.id}`)
                        }
                        type="button"
                        className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9]"
                        aria-label="View"
                      >
                        <EyeDarkIcon width={20} height={20} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigate("/agency/listings/edit-property", {
                            state: { propertyId: row.id },
                          })
                        }
                        className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9]"
                        aria-label="Edit"
                      >
                        <EditIcon width={20} height={20} stroke="#222" />
                      </button>
                      <button
                        type="button"
                        className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9]"
                        aria-label="Delete"
                      >
                        <TrashIcon width={20} height={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <Pagenation
          currentPage={currentPage}
          totalItems={totalItems}
          totalPages={apiTotalPages ?? undefined}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default ListingManagement;
