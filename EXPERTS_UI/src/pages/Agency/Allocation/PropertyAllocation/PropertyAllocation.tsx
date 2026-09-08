import { useEffect, useRef, useState, type RefObject } from "react";
import {
  SearchIcon,
  DownArrowIcon,
  TrashIcon,
  EyeDarkIcon,
  EditIcon,
  PlusIcon,
  LocationIcon,
  LeftArrowIcon,
  RightArrowIcon,
  PdfIcon,
  TickIcon,
  DownloadIcon,
  DownLoadIcon,
} from "../../../../components/CustomFile/icons";
import AgencyHeader from "../../../../components/Header/AgencyHeader";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import homeimg from "../../../../assets/img/user.png";
import AllocateAgentModal from "./AllocateAgentModal";
import mainbg from "../../../../assets/img/mainbg.png";
import {
  agencyService,
  type SortByProjectMasterItem,
} from "../../../../services/agencyService";
import { toast } from "../../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../../services/apiClient";
import Loader from "../../../../components/Loader/loader";
import { StrikethroughIcon } from "@radix-ui/react-icons";
type AllocationTab = "All" | "Assigned" | "Posted";

const allocationTabs: AllocationTab[] = ["All", "Assigned", "Posted"];

type RevenueRow = {
  id: string;
  propertyname: string;
  propertyDocument: string;
  agentName: string;
  location: string;
  assignedDate: string;
  /** ISO string from API `sentAt` — used for date-range filtering */
  sentAt: string;
  profilePicture: string;
  allocationStatus: "Assigned" | "Posted";
};

const getDocFileName = (value?: string | null) => {
  if (!value) return "-";
  const parts = value.split("/");
  return parts[parts.length - 1] || "-";
};

const buildAgencyDocumentUrl = (docBase: string, rawPath?: string | null) => {
  const raw = rawPath?.trim();
  if (!raw || raw.toLowerCase() === "no file") return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (!docBase.trim()) return null;
  return `${docBase.replace(/\/?$/, "/")}${raw.replace(/^\/+/, "")}`;
};

const statusMap: Record<AllocationTab, string | undefined> = {
  All: undefined,
  Assigned: "pending",
  Posted: "completed",
};
const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

const formatDisplayDate = (date: Date | null) => {
  if (!date) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};
const formatDateForAPI = (date: Date | null) => {
  if (!date) return undefined;
  return date.toISOString().split("T")[0]; // "YYYY-MM-DD"
};

/** Table display: "30 Nov 2025" */
const formatAssignedDateLabel = (d: Date) => {
  const day = d.getDate();
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

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
const PropertyAllocation = () => {
  const [isAllocateAgentModalOpen, setIsAllocateAgentModalOpen] =
    useState(false);
  const [activeSubTab, setActiveSubTab] = useState<AllocationTab>("All");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Featured");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [activeDatePicker, setActiveDatePicker] = useState<
    "from" | "to" | null
  >(null);
  const [displayMonth, setDisplayMonth] = useState(new Date(2026, 11, 1));
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const fromDateRef = useRef<HTMLDivElement>(null);
  const toDateRef = useRef<HTMLDivElement>(null);
  const [sortOptions, setSortOptions] = useState<SortByProjectMasterItem[]>([]);
  const itemsPerPage = 5;
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [editAllocationId, setEditAllocationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [imageBaseUrls, setImageBaseUrls] = useState({
    agent: "",
    project: "",
    agencyDoc: "",
  });
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
      if (
        fromDateRef.current &&
        !fromDateRef.current.contains(event.target as Node) &&
        toDateRef.current &&
        !toDateRef.current.contains(event.target as Node)
      ) {
        setActiveDatePicker(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    void fetchProperties();
  }, [activeSubTab, currentPage, fromDate, toDate, selectedSort, search]);

  const fetchProperties = async () => {
    try {
      setLoading(true);

      const res = await agencyService.getProperties({
        status: statusMap[activeSubTab],
        startDate: formatDateForAPI(fromDate),
        endDate: formatDateForAPI(toDate),
        search: search.trim() || undefined,
        page: currentPage,
        limit: itemsPerPage,
      });

      const apiData = res;

      if (!apiData?.allocations) {
        setRows([]);
        setTotalItems(0);
        return;
      }

      setTotalItems(apiData.pagination?.total || 0);

      const mapped: RevenueRow[] = apiData.allocations.map((item: any) => {
        const sent = new Date(item.sentAt);
        return {
          id: String(item._id || item.id),
          propertyname: item.title,
          propertyDocument: item.document || "No file",
          agentName: item.agent?.name || "-",
          profilePicture: item.agent?.profilePicture,
          location: "-",
          assignedDate: Number.isNaN(sent.getTime())
            ? "—"
            : formatAssignedDateLabel(sent),
          sentAt: Number.isNaN(sent.getTime())
            ? new Date(0).toISOString()
            : sent.toISOString(),
          allocationStatus: item.status === "completed" ? "Posted" : "Assigned",
        };
      });

      setRows(mapped);
    } catch (err) {
      setRows([]);
      setTotalItems(0);
      toast.error(
        "Could not load allocations",
        getApiErrorMessage(err, "Something went wrong. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSortMaster = async () => {
      try {
        const res = await agencyService.getMasterData(["sortbyproject"]);

        const data = res?.sortByProject || [];

        //console.log("RES.DATA:", data);

        setSortOptions(data);

        if (data.length > 0) {
          setSelectedSort(data[0].value);
        }
      } catch (err) {
        console.error("Sort master fetch error:", err);
      }
    };

    loadSortMaster();
  }, []);

  const showEmptyTable = !loading && rows.length === 0;
  const emptyFromFilters =
    showEmptyTable &&
    Boolean(search.trim() || fromDate || toDate || activeSubTab !== "All");

  const paginatedRows = rows;

  const allSelected =
    paginatedRows.length > 0 &&
    paginatedRows.every((row) => selectedIds.has(row.id));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeSubTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, fromDate, toDate, selectedSort]);

  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/project/`;

    agencyService
      .getMasterData(["supportedurls"])
      .then((data) => {
        if (!isMounted) return;

        const supported = data?.supportedUrls;

        setImageBaseUrls({
          agent: supported?.agentUrl?.img?.trim() || fallback,
          project: supported?.projectUrl?.img?.trim() || fallback,
          agencyDoc: supported?.agencyUrl?.doc?.trim() || "",
        });
      })
      .catch(() => {
        if (!isMounted) return;

        setImageBaseUrls({
          agent: fallback,
          project: fallback,
          agencyDoc: "",
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const toImageUrl = (image: string | null, type: "agent" | "project") => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;

    const base =
      (type === "agent" ? imageBaseUrls.agent : imageBaseUrls.project) ||
      fallbackBase;

    const cleanBase = base.replace(/\/+$/, "");
    const cleanImage = image.replace(/^\/+/, "");

    return `${cleanBase}/${cleanImage}`;
  };

  const downloadAllocationDocument = (rawPath?: string | null) => {
    const docUrl = buildAgencyDocumentUrl(imageBaseUrls.agencyDoc, rawPath);
    if (!docUrl) {
      toast.error("Download unavailable", "No allocation document found.");
      return;
    }
    const fileName = getDocFileName(rawPath);
    const a = window.document.createElement("a");
    a.href = docUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download =
      fileName && fileName !== "-" ? fileName : "allocation-document.pdf";
    window.document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        paginatedRows.forEach((row) => next.delete(row.id));
      } else {
        paginatedRows.forEach((row) => next.add(row.id));
      }
      return next;
    });
  };
  const calendarCells = getCalendarCells(displayMonth);

  const shiftMonth = (direction: -1 | 1) => {
    setDisplayMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1),
    );
  };

  const openDatePicker = (type: "from" | "to") => {
    setActiveDatePicker((prev) => (prev === type ? null : type));

    const sourceDate =
      type === "from" ? fromDate || new Date() : toDate || new Date();

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
      setFromDate(selectedDate);
    } else if (activeDatePicker === "to") {
      setToDate(selectedDate);
    }
    setActiveDatePicker(null);
  };
  // const formatShortDate = (date: Date | null) => {
  //   if (!date) return "";
  //   return date.toLocaleDateString("en-US", {
  //     day: "2-digit",
  //     month: "short",
  //   });
  // };
  const formatShortDate = (date: Date | null) => {
    if (!date) return "";

    const day = String(date.getDate()).padStart(2, "0");

    const month = date
      .toLocaleString("en-US", { month: "short" })
      .toLowerCase();

    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  };
  const renderDatePicker = (
    type: "from" | "to",
    selectedDate: Date | null,
    side: "left" | "right",
    ref: RefObject<HTMLDivElement | null>,
  ) => (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => openDatePicker(type)}
        className="cursor-pointer h-[33px] rounded-full border border-[rgba(34,34,34,0.10)] px-[12px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center gap-[6px]"
      >
        {selectedDate
          ? formatShortDate(selectedDate)
          : type === "from"
            ? "From date"
            : "To date"}
      </button>
      {activeDatePicker === type && (
        <div
          className={`absolute ${side}-0 top-[40px] z-9 h-[320px] w-[280px] rounded-[12px]  bg-white p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}
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
            {weekDays.map((day, index) => (
              <span
                key={`${type}-day-${day}-${index}`}
                className="text-[13px] font-[SemiBold] text-[#222]"
              >
                {day}
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
                selectedDate &&
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
        title="Property allocation"
        showBack={false}
        onBackClick={() => { }}
      />
      {/* Property Allocation */}
      <div className="rounded-[15px] bg-white min-w-0 md:p-[30px] p-[20px] flex flex-col gap-[30px]">
        {/* header */}
        <div className="flex items-center flex-wrap justify-between gap-[12px]">
          {/* Search */}
          <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] w-full lg:w-[200px] xl:w-[300px]">
            <SearchIcon className="text-[#707070] shrink-0" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search here"
              className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-[10px]">
            {/* Date range from */}
            {renderDatePicker("from", fromDate, "left", fromDateRef)}
            {/* Date range to */}
            <span className="text-[12px] text-[#707070]">to</span>
            {renderDatePicker("to", toDate, "right", toDateRef)}

            <div className="w-[1px] h-[18px] bg-[rgba(34,34,34,0.10)] mx-[2px]" />

            {/* Sort by */}
            {/* <div className="flex items-center gap-[8px] shrink-0">
              <span className="text-[#222] text-[12px] font-[Regular] whitespace-nowrap">
                Sort by:
              </span>
              <div className="relative" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="flex items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.10)] bg-white rounded-full px-[12px] h-[33px] cursor-pointer w-[100px]"
                >
                  <span className="text-[#222] text-[12px] font-[SemiBold] truncate">
                    {selectedSort}
                  </span>
                  <DownArrowIcon
                    className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isSortDropdownOpen && (
                  <div className="absolute right-0 top-[40px] w-full min-w-[130px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-20 flex flex-col">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedSort(option.value);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`px-[12px] py-[8px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${selectedSort === option.name
                          ? "text-[#0832AE] bg-[#F5F5F5]"
                          : "text-[#222]"
                          }`}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div> */}

            {/* Delete button */}
            <button
              type="button"
              disabled
              className="cursor-pointer opacity-50 flex items-center gap-[6px] px-[12px] h-[33px] rounded-full text-[12px] font-[SemiBold] text-[#222] bg-[#F5F5F5]"
            >
              <TrashIcon width={16} height={16} />
              Delete
            </button>

            {/* Add Deal button */}
            <button
              type="button"
              onClick={() => {
                setEditAllocationId(null);
                setIsAllocateAgentModalOpen(true);
              }}
              className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#EA3934] text-[#FFF] px-[14px] h-[33px] text-[12px] font-[SemiBold] shrink-0"
            >
              <PlusIcon width={16} height={16} />
              Allocate to agent
            </button>
          </div>
        </div>

        {/* Sub-tabs — same pattern as UnPublished.tsx */}
        <div className="border-b border-[rgba(34,34,34,0.10)] flex gap-[28px] -mx-[20px] px-[20px] md:-mx-[30px] md:px-[30px]">
          {allocationTabs.map((tab) => {
            const active = activeSubTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveSubTab(tab)}
                className={`cursor-pointer relative p-[20px_30px] text-[13px] font-[Regular] transition-colors ${active ? "text-[#0832AE] font-[SemiBold]" : "text-[#222]"
                  }`}
              >
                {tab}
                {active && (
                  <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#0832AE]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full scrollbar-hide">
          <div className="min-w-[1320px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
            <div className="grid grid-cols-[40px_1.7fr_1.9fr_1.5fr_1.8fr_1fr] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">

              <div className="flex justify-center">
                <label
                  className={`relative ${loading || paginatedRows.length === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    disabled={loading || paginatedRows.length === 0}
                    className="peer hidden "
                  />
                  <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                    {allSelected ? <TickIcon width={10} height={10} /> : null}
                  </div>
                </label>
              </div>
              <p className="text-[14px] font-[Bold] text-[#222]">
                Property name
              </p>
              <p className="text-[14px] font-[Bold] text-[#222]">
                Property Document
              </p>
              <p className="text-[14px] font-[Bold] text-[#222]">
                Assigned date
              </p>
              <p className="text-[14px] font-[Bold] text-[#222]">
                Assigned agent
              </p>
              <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
            </div>

            {loading ? (
              <div
                className="flex flex-col items-center justify-center gap-3 py-[48px] min-h-[280px]"
                aria-busy="true"
                aria-live="polite"
              >
                <Loader size={72} margin={0} />
                <p className="text-[13px] font-[Regular] text-[#707070]">
                  Loading allocations…
                </p>
              </div>
            ) : showEmptyTable ? (
              <div className="flex flex-col items-center justify-center gap-2 py-[48px] px-[20px] min-h-[280px] text-center border-t border-[rgba(34,34,34,0.06)]">
                <p className="text-[16px] font-[Bold] text-[#222]">
                  {emptyFromFilters ? "No matching results" : "No data found"}
                </p>
                <p className="text-[13px] font-[Regular] text-[#707070] max-w-[360px]">
                  {emptyFromFilters
                    ? "Try a different search or date range, or switch tab."
                    : "You have no property allocations yet. Use “Allocate to agent” to create one."}
                </p>
              </div>
            ) : (
              paginatedRows.map((row, index) => (
                <div
                  key={row.id}
                  className={`grid grid-cols-[40px_1.7fr_1.9fr_1.5fr_1.8fr_1fr] gap-2 items-center px-[14px] py-[12px] ${index !== paginatedRows.length - 1
                    ? "border-b border-[rgba(34,34,34,0.08)]"
                    : ""
                    }`}
                >

                  <div className="flex justify-center">
                    <label className="relative">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        className="peer hidden "
                      />
                      <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                        {selectedIds.has(row.id) ? <TickIcon width={10} height={10} /> : null}
                      </div>
                    </label>
                  </div>
                  <p className="text-[12px] font-[Bold] text-[#222] w-[200px] truncate">
                    {row.propertyname}
                  </p>
                  <div className="flex items-center gap-[6px]">
                    <PdfIcon width={16} height={16} />
                    <p className="text-[12px] font-[Regular] text-[#222] w-[200px] truncate">
                      {getDocFileName(row.propertyDocument)}
                    </p>
                  </div>

                  <p className="text-[12px] font-[Regular] text-[#222]">
                    {row.assignedDate}
                  </p>

                  <div className="flex items-center gap-[12px] min-w-0">
                    <div className="w-[45px] h-[45px] rounded-full overflow-hidden shrink-0">
                      <img
                        src={toImageUrl(row.profilePicture, "agent")}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] mb-[4px] truncate">
                        {row.agentName}
                      </p>
                      <p className="text-[12px] font-[Regular] text-[#707070] flex items-center gap-[5px] leading-[1.2]">
                        Senior Property Consultant
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-start gap-[6px]">
                    <button
                      type="button"
                      onClick={() => downloadAllocationDocument(row.propertyDocument)}
                      disabled={!buildAgencyDocumentUrl(imageBaseUrls.agencyDoc, row.propertyDocument)}
                      className="cursor-pointer p-[6px] rounded-[8px] disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="View"
                    >
                      <DownLoadIcon width={20} height={20} fill="#222" />
                    </button>
                    {row.allocationStatus === "Posted" && (
                      <button
                        type="button"
                        className="cursor-pointer p-[6px] rounded-[8px] "
                        aria-label="View"
                      >
                        <EyeDarkIcon width={20} height={20} />
                      </button>
                    )}
                    {row.allocationStatus === "Assigned" && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditAllocationId(row.id);
                          setIsAllocateAgentModalOpen(true);
                        }}
                        className="cursor-pointer p-[6px] rounded-[8px] "
                        aria-label="Edit"
                      >
                        <EditIcon width={20} height={20} />
                      </button>
                    )}
                    <button
                      type="button"
                      className="cursor-pointer p-[6px] rounded-[8px]"
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

        {/* Pagenation */}
        <div className="px-[20px] md:px-[20px] pb-[20px]">
          <Pagenation
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div >
      <AllocateAgentModal
        isOpen={isAllocateAgentModalOpen}
        allocationId={editAllocationId}
        onSuccess={fetchProperties}
        onClose={() => {
          setIsAllocateAgentModalOpen(false);
          setEditAllocationId(null);
        }}
      />
    </div >
  );
};

export default PropertyAllocation;
