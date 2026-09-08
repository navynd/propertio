import { useState, useRef, useEffect } from "react";
import mainbg from "../../../assets/img/mainbg.png";
import homeimg from "../../../assets/img/home.png";
import {
  AgencyIcon1,
  AgencyIcon2,
  AgencyIcon3,
  AgencyIcon4,
  AgencyIcon5,
  AgencyIcon6,
  AgencyIcon7,
  AgencyIcon8,
  RightArrowIcon,
  DownArrowIcon,
} from "../../../components/CustomFile/icons";
import AgencyHeader from "../../../components/Header/AgencyHeader";
import {
  agencyService,
  type AgencyDashboardResponse,
  type SortByProjectMasterItem,

} from "../../../services/agencyService";

import { toast } from "../../../services/toast";
import { API_BASE_URL } from "../../../services/apiClient";
import Loader from "../../../components/Loader/loader";
import { useAgencyLayout } from "../../../context/AgencyLayoutContext";
import { useNavigate } from "react-router-dom";

const projectTabs = ["All", "New", "Off-plan"] as const;
type TabType = "All" | "New" | "Off-plan";
type SortType = string;
const mapStatus = (status?: string | null): string => {
  const key = (status || "").trim().toLowerCase();
  if (key === "off-plan") return "Off-plan";
  return "New";
};

/** e.g. "construction started" → "Construction Started" */
function formatDashboardStatusLabel(value: string): string {
  const s = value.trim();
  if (!s) return s;
  return s
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/** Progress column: default "Project Announced"; title case each word. */
function formatProgressStatusDisplay(value: string | null | undefined): string {
  const s = String(value ?? "")
    .trim()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = s || "Project Announced";
  return base
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** e.g. "30 May 2025" (3-letter month) */
function formatAgencyDashboardDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toYmdLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function thisMonthDateRangeQuery() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `startDate=${encodeURIComponent(toYmdLocal(first))}&endDate=${encodeURIComponent(toYmdLocal(last))}`;
}

function AgencyDashboard() {
  const navigate = useNavigate();
  const { shellHeader } = useAgencyLayout();
  const [activeTab, setActiveTab] = useState<TabType>("All");
  const [selectedSort, setSelectedSort] = useState<string>("featured");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [dashboardData, setDashboardData] =
    useState<AgencyDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const stats = dashboardData?.stats;
  const [sortOptions, setSortOptions] = useState<SortByProjectMasterItem[]>([]);
  const [projectImageBaseUrl, setProjectImageBaseUrl] = useState<string | null>(
    null,
  );
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const metricCards = stats
    ? [
      {
        title: "Total Active listings",
        value: stats.totalActiveListings.count,
        badgeText: `${stats.totalActiveListings.change}%`,
        arrow: stats.totalActiveListings.direction,
        iconBg: "bg-[#D4A373]",
        badgeBg: "bg-[#00A663]",
        cardBg:
          "linear-gradient(180deg,rgba(212, 163, 115, 0) 42.64%,rgba(212, 163, 115, 0.2) 100%), #ffffff",
        icon: AgencyIcon1,
        navigateTo: "/agency/listings?listingScope=Active",
      },
      {
        title: "Total Agents",
        value: stats.totalAgents.count,
        badgeText: `${stats.totalAgents.change}%`,
        arrow: stats.totalAgents.direction,
        iconBg: "bg-[#0832AE]",
        badgeBg: "bg-[#00A663]",
        cardBg:
          "linear-gradient(180deg,rgba(8, 50, 174, 0) 42.64%,rgba(8, 50, 174, 0.2) 100%), #ffffff",
        icon: AgencyIcon2,
        navigateTo: "/agency/super-agent?sortBy=active",
      },
      {
        title: "Total Super Agents",
        value: stats.totalSuperAgents.count,
        badgeText: `${stats.totalSuperAgents.change}%`,
        arrow: stats.totalSuperAgents.direction,
        iconBg: "bg-[#FF7A00]",
        badgeBg: "bg-[#00A663]",
        cardBg:
          "linear-gradient(180deg,rgba(142, 104, 226, 0) 42.64%,rgba(142, 104, 226, 0.2) 100%), #ffffff",
        icon: AgencyIcon3,
        navigateTo: "/agency/super-agent?tab=superagent&sortBy=active",
      },
      {
        title: "Total Revenues by Sales",
        value: `${stats.totalRevenueBySales.amount} ${stats.totalRevenueBySales.currency}`,
        badgeText: `${stats.totalRevenueBySales.change}%`,
        arrow: stats.totalRevenueBySales.direction,
        iconBg: "bg-[#00C853]",
        badgeBg: "bg-[#00A663]",
        cardBg:
          "linear-gradient(180deg,rgba(199, 163, 53, 0) 42.64%,rgba(199, 163, 53, 0.2) 100%), #ffffff",
        icon: AgencyIcon4,
      },
      {
        title: "Total Revenues by Rents",
        value: `${stats.totalRevenueByRent.amount} ${stats.totalRevenueByRent.currency}`,
        badgeText: `${stats.totalRevenueByRent.change}%`,
        arrow: stats.totalRevenueByRent.direction,
        iconBg: "bg-[#FF46A2]",
        badgeBg: "bg-[#00A663]",
        cardBg:
          "linear-gradient(180deg,rgba(255, 70, 162, 0) 42.64%,rgba(255, 70, 162, 0.2) 100%), #ffffff",
        icon: AgencyIcon5,
      },
      {
        title: "This Month Revenue",
        value: `${stats.thisMonthRevenueSalesAndRent.amount} ${stats.thisMonthRevenueSalesAndRent.currency}`,
        badgeText: `${stats.thisMonthRevenueSalesAndRent.change}%`,
        arrow: stats.thisMonthRevenueSalesAndRent.direction,
        iconBg: "bg-[#00C853]",
        badgeBg: "bg-[#00A663]",
        cardBg:
          "linear-gradient(180deg,rgba(0, 166, 99, 0) 42.64%,rgba(0, 166, 99, 0.2) 100%), #ffffff",
        icon: AgencyIcon6,
      },
      {
        title: "Total Leads",
        value: stats.totalLeads.count,
        badgeText: `${stats.totalLeads.change}%`,
        arrow: stats.totalLeads.direction,
        iconBg: "bg-[#F28D6A]",
        badgeBg: "bg-[#00A663]",
        cardBg:
          "linear-gradient(180deg,rgba(242, 141, 106, 0) 42.64%,rgba(242, 141, 106, 0.2) 100%), #ffffff",
        icon: AgencyIcon7,
        navigateTo: "/agency/leads/property",
      },
      {
        title: "This Month Leads",
        value: stats.thisMonthLeads.count,
        badgeText: `${stats.thisMonthLeads.change}%`,
        arrow: stats.thisMonthLeads.direction,
        iconBg: "bg-[#E80808]",
        badgeBg: "bg-[#00A663]",
        cardBg:
          "linear-gradient(180deg,rgba(232, 8, 8, 0) 42.64%,rgba(232, 8, 8, 0.2) 100%), #ffffff",
        icon: AgencyIcon8,
        navigateTo: `/agency/leads/property?${thisMonthDateRangeQuery()}`,
      },
    ]
    : [];

  const locationRows =
    dashboardData?.listingsByLocation?.map((item) => ({
      name: item.location,
      listings: item.count,
    })) ?? [];
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const projectRows = (dashboardData?.projects?.items ?? []).map((item) => ({
    id: item.projectId,
    name: item.projectName,
    image: item.image,

    location:
      `${item.location.city ?? ""}${item.location.zone ? ", " + item.location.zone : ""}`.trim(),

    projectStatus: formatDashboardStatusLabel(mapStatus(item.projectStatus)),
    progress: formatProgressStatusDisplay(item.progressStatus),

    announcedDate: formatAgencyDashboardDate(item.announcedDate),

    expectedFinishDate: formatAgencyDashboardDate(item.expectedFinishDate),
  }));

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const tabMap: Record<TabType, string> = {
        All: "all",
        New: "new",
        "Off-plan": "off-plan",
      };

      const data = await agencyService.getDashboard({
        projectTab: tabMap[activeTab],
        sortBy: selectedSort,
        page: page,
        limit: 5,
      });

      setDashboardData(data);
    } catch (error) {
      console.error("Dashboard API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeTab, selectedSort, page]);

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

  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;

    agencyService
      .getMasterData(["supportedurls"])
      .then((res) => {
        console.log("FULL RESPONSE:", res);

        if (!isMounted) return;

        const projectImgBase =
          res?.supportedUrls?.projectUrl?.img ||
          fallbackBase;

        setProjectImageBaseUrl(projectImgBase.replace(/\/?$/, "/"));
      })
      .catch(() => {
        if (!isMounted) return;
        setProjectImageBaseUrl(fallbackBase);
      });

    return () => {
      isMounted = false;
    };
  }, []);
  const selectedSortLabel =
    sortOptions.find((o) => o.value === selectedSort)?.name || "Featured";
  const toProjectImageUrl = (image: string | null) => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;

    const base = (projectImageBaseUrl || "").replace(/\/?$/, "/");

    return `${base}${image}`;
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      {/* Content */}
      <div
        className="relative p-[20px]  h-auto rounded-[15px] gap-[20px] flex flex-col justify-between"
        style={{
          backgroundImage: `url(${mainbg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <AgencyHeader
          title="Dashboard"
          showBack={false}
          onBackClick={() => { }}
          profileImage={shellHeader.profileImage}
          verified={shellHeader.verified}
        />

        {/* <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 md:mt-[80px]">
          {metricCards.map((card) => {
            const Icon = card.icon;
            const badgeBg =
              card.arrow === "up" ? "bg-[#00C853]" : "bg-[#FF1744]";
            return (
              <div
                key={card.title}
                className={`flex flex-col justify-between rounded-[15px] p-[20px_20px_0px_20px]`}
                style={{
                  background: card.cardBg,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-[12px] font-[Medium] text-[#222]">
                      <span
                        className={`flex flex-shrink-0 h-6 w-6 items-center justify-center rounded-full ${card.iconBg}`}
                      >
                        <Icon
                          className="flex-shrink-0 h-3.5 w-3.5"
                          width={12}
                          height={12}
                        />
                      </span>
                      {card.title}
                    </p>
                    <p className="text-[30px] text-[#222] font-semibold">
                      {card.value}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <span
                    className={`inline-flex items-center min-w-[30px] rounded-[10px_10px_0px_0px] p-[6px_6px_2px_6px] text-[10px] font-[SemiBold] text-white ${badgeBg}`}
                  >
                    {card.badgeText}
                    {card.arrow === "up" ? (
                      <span className="ml-[4px]">▲</span>
                    ) : (
                      <span className="ml-[4px]">▼</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div> */}


        <div className="grid gap-[10px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:mt-[50px]">
          {metricCards.map((card) => {
            const Icon = card.icon;
            const go = card.navigateTo
              ? () => navigate(card.navigateTo)
              : undefined;
            return (
              <div
                key={card.title}
                role={go ? "button" : undefined}
                tabIndex={go ? 0 : undefined}
                onClick={go}
                onKeyDown={
                  go
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          go();
                        }
                      }
                    : undefined
                }
                className={`flex flex-col justify-between rounded-[15px] p-[25px_25px_0px_25px] ${go ? "cursor-pointer transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0832AE]/35" : ""}`}
                style={{ background: card.cardBg }}
              >
                <div className="flex flex-col gap-[25px]">

                  {/* ✅ TITLE FIXED HEIGHT */}
                  <div className="flex items-center gap-2 text-[12px] font-[Medium] text-[#222] h-[30px]">
                    <span
                      className={`flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full ${card.iconBg}`}
                    >
                      <Icon width={12} height={12} />
                    </span>
                    <span className="line-clamp-2">
                      {card.title}
                    </span>
                  </div>

                  {/* ✅ VALUE FIXED HEIGHT */}
                  <div className="mt-auto flex flex-col justify-end md:text-[28px] text-[20px] text-[#222] font-semibold leading-[1] md:w-[180px] lg:w-[150px] xl:w-[180px] w-full break-words h-[55px]">
                    {card.value}
                  </div>

                </div>

                {/* Badge */}
                <div className="flex justify-end">
                  <span
                    className={`inline-flex items-center min-w-[30px] rounded-[10px_10px_0px_0px] p-[6px_6px_2px_6px] text-[10px] font-[SemiBold] text-white ${card.badgeBg}`}
                  >
                    {card.badgeText}
                    {card.arrow === "up" ? (
                      <span className="ml-[4px]">▲</span>
                    ) : (
                      <span className="ml-[4px]">▼</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Project and Location based projects */}
      <div className="relative mt-[14px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-[14px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[15px] bg-white/60">
            <Loader size={80} margin={0} />
          </div>
        )}
        {/* Projects */}
        <div className="bg-[#F5F5F5] rounded-[15px] md:p-[30px] p-[20px] bg-[#fff] min-w-0 overflow-hidden">
          {/* Project header */}
          <div className="flex flex-wrap gap-4 items-center justify-between mb-[16px]">
            <h2 className="text-[#222] font-[Bold] text-[20px]">Assigned projects</h2>
            <div className="flex flex-wrap items-center gap-[16px] py-1">
              <div className="2xl:flex hidden flex-wrap items-center gap-[10px]">
                {projectTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] p-[0px_15px] h-[33px] rounded-full shrink-0 transition-colors ${activeTab === tab
                      ? "bg-[#222] text-[#fff]"
                      : "bg-[#fff] border border-[#EAEAEA] text-[#222] hover:bg-[#F5F5F5]"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {/* Dropdown view (xl, lg, md, sm) */}
              <div className="relative flex 2xl:hidden" ref={projectDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProjectDropdownOpen((o) => !o)}
                  className="cursor-pointer inline-flex items-center justify-between gap-[10px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] min-w-[100px]"
                >
                  <span className="truncate">{activeTab}</span>
                  <DownArrowIcon width={10} height={6} />
                </button>
                {isProjectDropdownOpen && (
                  <div className="absolute left-0 top-[40px] z-20 w-full bg-white border border-[rgba(34,34,34,0.10)] rounded-[12px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px] max-h-[200px] overflow-y-auto">
                    {projectTabs.map((label) => {
                      const active = activeTab === label;
                      return (
                        <button
                          key={label}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setActiveTab(label);
                            setIsProjectDropdownOpen(false);
                          }}
                          className={`w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] cursor-pointer ${active ? "text-[#0832AE]" : "text-[#222]"
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="w-[1px] h-[20px] bg-gray-300 hidden sm:block shrink-0"></div>
              <div className="flex items-center gap-[8px] shrink-0">
                <span className="text-[#707070] text-[13px] font-[Medium]">
                  Sort by:
                </span>
                <div className="relative" ref={sortDropdownRef}>
                  <div
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="flex items-center justify-between gap-[8px] border border-[#EAEAEA] bg-white rounded-full px-[16px] h-[33px] cursor-pointer min-w-[120px]"
                  >
                    <span className="text-[#222] text-[13px] font-[Medium]">
                      {selectedSortLabel}
                    </span>
                    <DownArrowIcon
                      className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>

                  {isSortDropdownOpen && (
                    <div className="absolute right-0 top-[45px] w-full min-w-[150px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-10 flex flex-col">
                      {sortOptions.map((option) => (
                        <div
                          key={option.value}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            setSelectedSort(option.value);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`px-[16px] py-[10px] text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors ${selectedSort === option.value
                            ? "text-[#00A663] bg-[#F5F5F5]"
                            : "text-[#222]"
                            }`}
                        >
                          {option.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Project table */}
          <div className="overflow-x-auto w-full scrollbar-hide">
            <div className="min-w-[1290px]">
              <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                <div className="grid grid-cols-[1.8fr_1.2fr_1.2fr_1.4fr_1.2fr] gap-[20px] px-[14px] py-[10px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                  <p className="text-[14px] font-[SemiBold] text-[#222]">
                    Property Details
                  </p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">
                    Project status
                  </p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">
                    Announced date
                  </p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">
                    Progress status
                  </p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">
                    Expected finish date
                  </p>
                </div>

                {projectRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[1.8fr_1.2fr_1.2fr_1.4fr_1.2fr] gap-[20px] px-[14px] py-[10px] ${index !== projectRows.length - 1
                      ? "border-b border-[rgba(34,34,34,0.08)]"
                      : ""
                      }`}
                  >
                    <div className="flex items-center gap-[10px]">
                      <div className="w-[60px] h-[60px] rounded-[8px] bg-cover bg-center shrink-0">
                        <img
                          src={toProjectImageUrl(row.image)}
                          alt="home"
                          className="w-full h-full object-cover rounded-[8px]"
                        />
                      </div>
                      <div>
                        <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] mb-[4px]">
                          {row.name}
                        </p>
                        <p className="text-[12px] text-[#707070] leading-[1.2]">
                          {row.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center rounded-[6px] p-[6px_10px] text-[12px] font-[Medium] leading-none ${row.projectStatus === "Off-plan"
                          ? "bg-[rgba(212, 163, 115,0.10)] text-[#D4A373]"
                          : "bg-[rgba(0,166,99,0.10)] text-[#00A663]"
                          }`}
                      >
                        {row.projectStatus}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <p className="text-[12px] font-[Regular] text-[#222]">
                        {row.announcedDate}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-flex items-center rounded-[6px] border border-[rgba(34,34,34,0.10)] p-[6px_10px] text-[12px] font-[Medium] text-[#222] leading-none">
                        {row.progress}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <p className="text-[12px] font-[Regular] text-[#222]">
                        {row.expectedFinishDate}
                      </p>
                    </div>
                  </div>
                ))}
                {!projectRows.length && !loading && (
                  <div className="px-[14px] py-[18px] text-[12px] text-[#707070]">
                    No projects found.
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/agency/allocation/project")}
            className="mt-[20px] rounded-[5px] w-full h-[37px] bg-[rgba(34,34,34,0.10)] text-[#222] text-[14px] font-[SemiBold] cursor-pointer hover:bg-[rgba(34,34,34,0.14)] transition-colors"
          >
            View all
          </button>
        </div>

        {/* Location based projects */}
        <div className="rounded-[15px] bg-[#fff]  min-w-0">
          <h2 className="text-[#222] font-[Bold] text-[20px] md:p-[30px_30px_20px_30px] p-[20px]">
            Location based projects
          </h2>
          <div>
            <div className="max-h-[480px] overflow-y-auto  pr-[0px] flex flex-col gap-[8px] ">
              {locationRows.map((item, index) => (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/agency/allocation/project?search=${encodeURIComponent(item.name)}`,
                    )
                  }
                  className={`cursor-pointer rounded-[12px] bg-white shadow-[0_6px_18px_0_#f1f1f1]  p-[20px] m-[0px_20px] flex items-center justify-between text-left hover:bg-[#fafafa] transition-colors
                    ${index === 0 ? "mt-[5px]" : ""} ${index === locationRows.length - 1 ? "mb-[5px]" : ""}`}
                >
                  <div>
                    <p className="text-[15px] font-[SemiBold] text-[#222] leading-[1.2] mb-[3px] w-[190px] truncate">
                      {item.name}
                    </p>
                    <p className="text-[12px] font-[Regular] text-[#707070]">
                      {item.listings} listings
                    </p>
                  </div>
                  <RightArrowIcon className="w-[8px] h-[12px]" />
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default AgencyDashboard;
