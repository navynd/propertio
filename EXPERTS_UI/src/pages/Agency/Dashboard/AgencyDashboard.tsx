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
        iconBg: "bg-gradient-to-br from-[#C9A96E] to-[#9B7B42] text-[#0A0A0A]",
        badgeBg: "bg-[#00A663]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon1,
        navigateTo: "/agency/listings?listingScope=Active",
      },
      {
        title: "Total Agents",
        value: stats.totalAgents.count,
        badgeText: `${stats.totalAgents.change}%`,
        arrow: stats.totalAgents.direction,
        iconBg: "bg-gradient-to-br from-[#38BDF8] to-[#0284C7] text-[#0A0A0A]",
        badgeBg: "bg-[#00A663]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon2,
        navigateTo: "/agency/super-agent?sortBy=active",
      },
      {
        title: "Total Super Agents",
        value: stats.totalSuperAgents.count,
        badgeText: `${stats.totalSuperAgents.change}%`,
        arrow: stats.totalSuperAgents.direction,
        iconBg: "bg-gradient-to-br from-[#F59E0B] to-[#B45309] text-[#0A0A0A]",
        badgeBg: "bg-[#00A663]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon3,
        navigateTo: "/agency/super-agent?tab=superagent&sortBy=active",
      },
      {
        title: "Total Revenues by Sales",
        value: `${stats.totalRevenueBySales.amount} ${stats.totalRevenueBySales.currency}`,
        badgeText: `${stats.totalRevenueBySales.change}%`,
        arrow: stats.totalRevenueBySales.direction,
        iconBg: "bg-gradient-to-br from-[#4ADE80] to-[#16A34A] text-[#0A0A0A]",
        badgeBg: "bg-[#00A663]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon4,
      },
      {
        title: "Total Revenues by Rents",
        value: `${stats.totalRevenueByRent.amount} ${stats.totalRevenueByRent.currency}`,
        badgeText: `${stats.totalRevenueByRent.change}%`,
        arrow: stats.totalRevenueByRent.direction,
        iconBg: "bg-gradient-to-br from-[#EC4899] to-[#BE185D] text-[#0A0A0A]",
        badgeBg: "bg-[#00A663]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon5,
      },
      {
        title: "This Month Revenue",
        value: `${stats.thisMonthRevenueSalesAndRent.amount} ${stats.thisMonthRevenueSalesAndRent.currency}`,
        badgeText: `${stats.thisMonthRevenueSalesAndRent.change}%`,
        arrow: stats.thisMonthRevenueSalesAndRent.direction,
        iconBg: "bg-gradient-to-br from-[#10B981] to-[#047857] text-[#0A0A0A]",
        badgeBg: "bg-[#00A663]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon6,
      },
      {
        title: "Total Leads",
        value: stats.totalLeads.count,
        badgeText: `${stats.totalLeads.change}%`,
        arrow: stats.totalLeads.direction,
        iconBg: "bg-gradient-to-br from-[#FB923C] to-[#C2410C] text-[#0A0A0A]",
        badgeBg: "bg-[#00A663]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
        icon: AgencyIcon7,
        navigateTo: "/agency/leads/property",
      },
      {
        title: "This Month Leads",
        value: stats.thisMonthLeads.count,
        badgeText: `${stats.thisMonthLeads.change}%`,
        arrow: stats.thisMonthLeads.direction,
        iconBg: "bg-gradient-to-br from-[#F87171] to-[#DC2626] text-[#0A0A0A]",
        badgeBg: "bg-[#00A663]",
        cardBg: "linear-gradient(135deg, #171717 0%, #111111 100%)",
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
        className="relative p-[20px] md:p-[28px] h-auto rounded-[24px] gap-[20px] flex flex-col justify-between shadow-2xl overflow-hidden border border-[#2A2A2A]"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(23, 23, 23, 0.90) 100%), url(${mainbg})`,
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
                className={`flex flex-col justify-between rounded-[20px] p-[20px_20px_0px_20px] border border-[#2A2A2A] shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl ${go ? "cursor-pointer" : ""}`}
                style={{ background: card.cardBg }}
              >
                <div className="flex flex-col gap-[20px]">

                  {/* TITLE */}
                  <div className="flex items-center gap-2 text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider h-[30px]">
                    <span
                      className={`flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg shadow-sm ${card.iconBg}`}
                    >
                      <Icon width={13} height={13} />
                    </span>
                    <span className="line-clamp-2">
                      {card.title}
                    </span>
                  </div>

                  {/* VALUE */}
                  <div className="mt-auto flex flex-col justify-end md:text-[26px] text-[20px] text-[#F5F0E8] font-[Bold] leading-[1] w-full break-words h-[50px]">
                    {card.value}
                  </div>

                </div>

                {/* Badge */}
                <div className="flex justify-end mt-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-[Bold] mb-3 ${card.arrow === "up" ? "bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30" : "bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/30"}`}
                  >
                    {card.badgeText}
                    <span className="ml-[4px]">{card.arrow === "up" ? "▲" : "▼"}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Project and Location based projects */}
      <div className="relative mt-[20px] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-[20px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-[#0A0A0A]/70 backdrop-blur-sm">
            <Loader size={60} margin={0} />
          </div>
        )}
        {/* Projects */}
        <div className="rounded-[20px] md:p-[28px] p-[20px] bg-[#111111] border border-[#2A2A2A] shadow-xl min-w-0 overflow-hidden">
          {/* Project header */}
          <div className="flex flex-wrap gap-4 items-center justify-between mb-[20px]">
            <h2 className="text-[#F5F0E8] font-[Bold] text-[18px]">Assigned projects</h2>
            <div className="flex flex-wrap items-center gap-[16px] py-1">
              <div className="2xl:flex hidden flex-wrap items-center gap-[8px]">
                {projectTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] px-[16px] h-[34px] rounded-full shrink-0 transition-all ${activeTab === tab
                      ? "bg-[#C9A96E] text-[#0A0A0A] font-[Bold] shadow-md"
                      : "bg-[#171717] border border-[#2A2A2A] text-[#A89880] hover:text-[#F5F0E8] hover:border-[#C9A96E]/40"
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
                  className="cursor-pointer inline-flex items-center justify-between gap-[10px] rounded-full border border-[#2A2A2A] bg-[#171717] px-[14px] h-[34px] text-[12px] font-[SemiBold] text-[#F5F0E8] min-w-[100px]"
                >
                  <span className="truncate">{activeTab}</span>
                  <DownArrowIcon width={10} height={6} />
                </button>
                {isProjectDropdownOpen && (
                  <div className="absolute left-0 top-[40px] z-20 w-full bg-[#171717] border border-[#2A2A2A] rounded-[12px] shadow-2xl py-[6px] max-h-[200px] overflow-y-auto">
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
                          className={`w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#2A2A2A] cursor-pointer ${active ? "text-[#C9A96E] bg-[#2A2A2A]" : "text-[#F5F0E8]"
                            }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="w-[1px] h-[20px] bg-[#2A2A2A] hidden sm:block shrink-0"></div>
              <div className="flex items-center gap-[8px] shrink-0">
                <span className="text-[#A89880] text-[12px] font-[Medium]">
                  Sort by:
                </span>
                <div className="relative" ref={sortDropdownRef}>
                  <div
                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    className="flex items-center justify-between gap-[8px] border border-[#2A2A2A] bg-[#171717] rounded-full px-[14px] h-[34px] cursor-pointer min-w-[120px] text-[#F5F0E8] hover:border-[#C9A96E]/40 transition-colors"
                  >
                    <span className="text-[#F5F0E8] text-[12px] font-[SemiBold]">
                      {selectedSortLabel}
                    </span>
                    <DownArrowIcon
                      className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                    />
                  </div>

                  {isSortDropdownOpen && (
                    <div className="absolute right-0 top-[42px] w-full min-w-[150px] bg-[#171717] border border-[#2A2A2A] rounded-[12px] shadow-2xl py-[6px] z-20 flex flex-col">
                      {sortOptions.map((option) => (
                        <div
                          key={option.value}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            setSelectedSort(option.value);
                            setIsSortDropdownOpen(false);
                          }}
                          className={`px-[16px] py-[9px] text-[12px] font-[Medium] cursor-pointer hover:bg-[#2A2A2A] transition-colors ${selectedSort === option.value
                            ? "text-[#C9A96E] bg-[#2A2A2A]"
                            : "text-[#F5F0E8]"
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
            <div className="min-w-[1100px]">
              <div className="rounded-[16px] border border-[#2A2A2A] overflow-hidden bg-[#111111]">
                <div className="grid grid-cols-[1.8fr_1.2fr_1.2fr_1.4fr_1.2fr] gap-[20px] px-[16px] py-[14px] bg-[#171717] border-b border-[#2A2A2A]">
                  <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">
                    Property Details
                  </p>
                  <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">
                    Project status
                  </p>
                  <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">
                    Announced date
                  </p>
                  <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">
                    Progress status
                  </p>
                  <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">
                    Expected finish date
                  </p>
                </div>

                {projectRows.map((row, index) => (
                  <div
                    key={row.id}
                    className={`grid grid-cols-[1.8fr_1.2fr_1.2fr_1.4fr_1.2fr] gap-[20px] px-[16px] py-[14px] hover:bg-[#171717]/60 transition-colors ${index !== projectRows.length - 1
                      ? "border-b border-[#2A2A2A]"
                      : ""
                      }`}
                  >
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[56px] h-[56px] rounded-[8px] overflow-hidden shrink-0 border border-[#2A2A2A] bg-[#171717]">
                        <img
                          src={toProjectImageUrl(row.image)}
                          alt="home"
                          className="w-full h-full object-cover rounded-[8px]"
                        />
                      </div>
                      <div>
                        <p className="text-[13px] font-[Bold] text-[#F5F0E8] leading-[1.2] mb-[4px]">
                          {row.name}
                        </p>
                        <p className="text-[12px] text-[#A89880] leading-[1.2]">
                          {row.location}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <span
                        className={`inline-flex items-center rounded-[6px] px-2.5 py-1 text-[11px] font-[SemiBold] leading-none border ${row.projectStatus === "Off-plan"
                          ? "bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/30"
                          : "bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30"
                          }`}
                      >
                        {row.projectStatus}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <p className="text-[12px] font-[Regular] text-[#F5F0E8]">
                        {row.announcedDate}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-flex items-center rounded-[6px] border border-[#2A2A2A] bg-[#171717] px-2.5 py-1 text-[12px] font-[Medium] text-[#F5F0E8] leading-none">
                        {row.progress}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <p className="text-[12px] font-[Regular] text-[#F5F0E8]">
                        {row.expectedFinishDate}
                      </p>
                    </div>
                  </div>
                ))}
                {!projectRows.length && !loading && (
                  <div className="px-[16px] py-[28px] text-[13px] text-[#A89880] text-center">
                    No projects found.
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/agency/allocation/project")}
            className="mt-[20px] rounded-[10px] w-full h-[40px] bg-[#171717] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-[#F5F0E8] text-[13px] font-[Bold] cursor-pointer transition-colors"
          >
            View all
          </button>
        </div>

        {/* Location based projects */}
        <div className="rounded-[20px] bg-[#111111] border border-[#2A2A2A] shadow-xl min-w-0 p-[20px] flex flex-col">
          <h2 className="text-[#F5F0E8] font-[Bold] text-[18px] mb-[16px]">
            Location based projects
          </h2>
          <div>
            <div className="max-h-[480px] overflow-y-auto pr-[0px] flex flex-col gap-[8px]">
              {locationRows.map((item, index) => (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/agency/allocation/project?search=${encodeURIComponent(item.name)}`,
                    )
                  }
                  className="cursor-pointer rounded-[14px] bg-[#171717] hover:bg-[#2A2A2A] border border-[#2A2A2A] p-[16px] flex items-center justify-between text-left transition-colors group"
                >
                  <div>
                    <p className="text-[14px] font-[SemiBold] text-[#F5F0E8] group-hover:text-[#C9A96E] leading-[1.2] mb-[4px] w-[180px] truncate transition-colors">
                      {item.name}
                    </p>
                    <p className="text-[12px] font-[Regular] text-[#A89880]">
                      {item.listings} listings
                    </p>
                  </div>
                  <RightArrowIcon className="w-[8px] h-[12px] text-[#A89880] group-hover:text-[#C9A96E] group-hover:translate-x-0.5 transition-all" />
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

