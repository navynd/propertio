import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  SearchIcon,
  DownArrowIcon,
  TrashIcon,
  AgentsIcon,
  SuperAgentIcon,
  PlusUserIcon,
  EyeDarkIcon,
  EditIcon,
  TickIcon,
} from "../../../components/CustomFile/icons";
import mainbg from "../../../assets/img/mainbg.png";
import Pagenation from "../../../components/Pagenation/Pagenation";
import InviteAgentModal from "./InviteAgentModal";
import AgencyHeader from "../../../components/Header/AgencyHeader";
import {
  agencyService,
  type AgencyDashboardResponse,
  type AgencyProfileResponse,
  type SortByProjectMasterItem,

} from "../../../services/agencyService";

import { API_BASE_URL } from "../../../services/apiClient";
import Loader from "../../../components/Loader/loader";
type ProjectFilter = "All" | "Approval requests" | "Agent" | "Super agent";
const filterTabs: ProjectFilter[] = [
  "All",
  "Approval requests",
  "Agent",
  "Super agent",
];

export type AgentRoleLabel = "New Agent" | "Agent" | "Superagent";
export type AgentStatusLabel =
  | "Approval pending"
  | "Approval declined"
  | "Active"
  | "Inactive";

export type SuperAgentRow = {
  id: number;
  name: string;
  title: string;
  role: AgentRoleLabel;
  email: string;
  listings: string;
  languages: string[];
  status: AgentStatusLabel;
  defaultAvatar: string;
  phone: string;
  experience: string;
  license: string;
  nationality: string;
  linkedin: string;
};

const TABLE_GRID =
  "grid grid-cols-[40px_minmax(200px,2.2fr)_minmax(110px,1.3fr)_minmax(180px,1.8fr)_152px_minmax(200px,1.9fr)_minmax(120px,1fr)_minmax(108px,auto)] gap-2 items-center px-[14px] py-[12px]";

const AGENT_LIST_SORT_OPTIONS: { label: string; value: string }[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending approval", value: "pending" },
  { label: "Rejected", value: "rejected" },
];

const AGENT_SORT_VALUES = new Set(
  AGENT_LIST_SORT_OPTIONS.map((o) => o.value),
);

/** Query `tab` → UI filter (API uses slug values). */
const URL_TAB_TO_FILTER: Record<string, ProjectFilter> = {
  all: "All",
  "approval-requests": "Approval requests",
  agent: "Agent",
  superagent: "Super agent",
};

function filterFromSearchParams(params: URLSearchParams): ProjectFilter {
  const rawTab = params.get("tab")?.trim().toLowerCase();
  if (rawTab && URL_TAB_TO_FILTER[rawTab]) {
    return URL_TAB_TO_FILTER[rawTab];
  }
  return "All";
}

function sortFromSearchParams(params: URLSearchParams): string | null {
  const rawSort = params.get("sortBy")?.trim().toLowerCase();
  if (rawSort && AGENT_SORT_VALUES.has(rawSort)) {
    return rawSort;
  }
  return null;
}

export function RoleBadge({ role }: { role: AgentRoleLabel }) {
  const normalizedRole = role?.toLowerCase();

  if (normalizedRole === "new agent") {
    return (
      <span className="inline-flex rounded-[5px] bg-[rgba(0,166,99,0.10)] h-[21px] items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#00A663]">
        New Agent
      </span>
    );
  }

  if (normalizedRole === "agent") {
    return (
      <span className="inline-flex gap-1 rounded-[5px] bg-[#0832AE] h-[21px] items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-white">
        <AgentsIcon width={12} height={12} />
        Agent
      </span>
    );
  }

  return (
    <span className="inline-flex items-center justify-center gap-1 rounded-[5px] bg-[#EA3934] h-[21px] p-[6px_10px] text-[12px] font-[SemiBold] text-white">
      <SuperAgentIcon width={12} height={12} />
      Superagent
    </span>
  );
}

function StatusBadge({ status }: { status: AgentStatusLabel }) {
  if (status === "Approval pending") {
    return (
      <span className="inline-flex items-center justify-center rounded-[5px] h-[21px] border border-[rgba(34,34,34,0.10)] bg-white p-[6px_10px] text-[12px] font-[SemiBold] text-[#222]">
        Approval pending
      </span>
    );
  }
  if (status === "Approval declined") {
    return (
      <span className="inline-flex items-center justify-center rounded-[5px] h-[21px] border border-[rgba(234,57,52,0.35)] bg-[rgba(234,57,52,0.08)] p-[6px_10px] text-[12px] font-[SemiBold] text-[#EA3934]">
        Approval declined
      </span>
    );
  }
  if (status === "Active") {
    return (
      <span className="bg-[#00A663] inline-flex items-center justify-center rounded-[5px] h-[21px] border border-[rgba(34,34,34,0.10)] p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF]">
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center rounded-[5px] h-[21px] border border-[rgba(34,34,34,0.10)] p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] bg-[#E80808]">
      Inactive
    </span>
  );
}

const SuperAgent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isInviteAgentModalOpen, setIsInviteAgentModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ProjectFilter>(() =>
    filterFromSearchParams(searchParams),
  );
  const [search, setSearch] = useState("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  /** API `sortBy` bucket; null = not sent (default). */
  const [selectedSortBy, setSelectedSortBy] = useState<string | null>(() =>
    sortFromSearchParams(searchParams),
  );
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const fetchSeqRef = useRef(0);
  const [agentImageBaseUrl, setAgentImageBaseUrl] = useState<string | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [agents, setAgents] = useState<SuperAgentRow[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const mapAgent = (item: any): SuperAgentRow => {
    return {
      id: item._id,
      name: item.fullName,
      title: item.specialization?.title || "-",
      phone: item.phoneNumber,
      experience: "-", // not in API
      license: "-", // not in API
      nationality: item.nationality?.name || "-",
      linkedin: "",
      role:
        item.agentType === "superagent"
          ? "Superagent"
          : item.isVerified
            ? "Agent"
            : "New Agent",
      email: item.email,
      listings: String(item.listingsCount ?? 0),
      languages: item.languages?.map((l: any) => l.name) || [],
      status:
        item.invitationStatus === "declined"
          ? "Approval declined"
          : item.invitationStatus === "pending" ||
            (item.invitationStatus === "accepted" && !item.isVerified)
            ? "Approval pending"
            : item.isActive
              ? "Active"
              : "Inactive",
      defaultAvatar: item.profilePicture,
    };
  };

  useEffect(() => {
    setActiveFilter(filterFromSearchParams(searchParams));
    setSelectedSortBy(sortFromSearchParams(searchParams));
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFilterDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [currentPage, activeFilter, selectedSortBy, search]);

  const fetchAgents = async () => {
    const seq = ++fetchSeqRef.current;
    try {
      setLoading(true);

      const tabMap: any = {
        All: "all",
        "Approval requests": "approval-requests",
        Agent: "agent",
        "Super agent": "superagent",
      };

      // base params (always sent)
      const params: any = {
        tab: tabMap[activeFilter],
        page: currentPage,
        limit: itemsPerPage,
      };

      const searchValue = search.trim();
      if (searchValue) {
        params.search = searchValue;
      }

      if (selectedSortBy) {
        params.sortBy = selectedSortBy;
      }

      const res: any = await agencyService.getAgents(params);
      if (seq !== fetchSeqRef.current) return;
      const list = res.agents.map(mapAgent) || [];
      setAgents(list);
      setTotalItems(res?.pagination?.total ?? list.length);
    } catch (err) {
      if (seq !== fetchSeqRef.current) return;
      console.error("Agents API error", err);
      setTotalItems(0);
    } finally {
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/project/`;

    agencyService
      .getMasterData(["supportedurls"])
      .then((res) => {
        if (!isMounted) return;

        const agentImg =
          res?.supportedUrls?.agentUrl?.img ||
          fallback;

        setAgentImageBaseUrl(agentImg.replace(/\/?$/, "/"));
      })
      .catch(() => {
        if (!isMounted) return;
        setAgentImageBaseUrl(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, []);


  const toProjectImageUrl = (image: string | null) => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;
    const base = (agentImageBaseUrl || fallbackBase).replace(/\/?$/, "/");
    return `${base}${image}`;
  };

  const paginatedRows = agents;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, search, selectedSortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const allVisibleSelected =
    paginatedRows.length > 0 &&
    paginatedRows.every((r) => selectedIds.has(r.id));

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedRows.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedRows.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader title="Agents" showBack={false} onBackClick={() => { }} />

      <div className="relative rounded-[15px] bg-white min-w-0">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[15px] bg-white/60">
            <Loader size={80} margin={0} />
          </div>
        )}
        <div className="md:p-[30px] p-[20px] flex flex-col gap-[16px] xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="flex md:flex-row flex-col items-stretch md:items-center gap-[10px] w-full xl:w-auto">
            {/* Filter tabs */}
            <div className="hidden 2xl:flex flex-wrap items-center gap-[8px]">
              {filterTabs.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveFilter(label)}
                  className={`shrink-0 rounded-full px-[15px] h-[33px] text-[12px] font-[SemiBold] transition-colors flex items-center justify-center cursor-pointer ${activeFilter === label
                    ? "bg-[#222] text-white"
                    : "bg-white text-[#222] border border-[rgba(34,34,34,0.10)]"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Dropdown view (xl, lg, md, sm) */}
            <div className="relative flex 2xl:hidden" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen((o) => !o)}
                className="cursor-pointer inline-flex items-center justify-between gap-[10px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] w-[100px]"
              >
                <span className="truncate">{activeFilter}</span>
                <DownArrowIcon width={10} height={6} />
              </button>
              {isFilterDropdownOpen && (
                <div className="absolute left-0 top-[40px] z-20 w-[140px] bg-white border border-[rgba(34,34,34,0.10)] rounded-[12px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                  {filterTabs.map((label) => {
                    const active = activeFilter === label;
                    return (
                      <button
                        key={label}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setActiveFilter(label);
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${active ? "text-[#0832AE]" : "text-[#222]"
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {/* Search input */}
            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] sm:flex-1 w-full md:w-[310px]">
              <SearchIcon
                className="text-[#707070] shrink-0"
                width={18}
                height={18}
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search here"
                className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-[10px]">
            {/* Sort by dropdown */}
            <div className="flex items-center gap-[8px] shrink-0">
              <span className="text-[#222] text-[12px] font-[Regular] whitespace-nowrap">
                Sort by:
              </span>
              <div className="relative" ref={sortDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="flex items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.10)] bg-white rounded-full px-[14px] h-[33px] cursor-pointer w-[120px]"
                >
                  <span
                    className={`text-[12px] font-[SemiBold] truncate ${selectedSortBy ? "text-[#222]" : "text-[#707070] font-[Regular]"}`}
                  >
                    {selectedSortBy
                      ? AGENT_LIST_SORT_OPTIONS.find((o) => o.value === selectedSortBy)
                        ?.label ?? "Select"
                      : "Select"}
                  </span>
                  <DownArrowIcon width={10} height={6}
                    className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isSortDropdownOpen && (
                  <div className="absolute right-0 top-[44px] w-full min-w-[150px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-20 flex flex-col">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedSortBy(null);
                        setIsSortDropdownOpen(false);
                      }}
                      className={`px-[16px] py-[10px] text-left text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors ${selectedSortBy === null
                        ? "text-[#3182CE] bg-[#F5F5F5]"
                        : "text-[#222]"
                        }`}
                    >
                      Select
                    </button>
                    {AGENT_LIST_SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedSortBy(option.value);
                          setIsSortDropdownOpen(false);
                        }}
                        className={`px-[16px] py-[10px] text-left text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors  ${selectedSortBy === option.value
                          ? "text-[#3182CE] bg-[#F5F5F5]"
                          : "text-[#222]"
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              disabled
              className="flex items-center gap-[6px] px-[15px] h-[33px] rounded-full text-[12px] font-[SemiBold] text-[#222] bg-[#F5F5F5]"
            >
              <TrashIcon width={16} height={16} />
              Delete
            </button>
            <button
              type="button"
              onClick={() => setIsInviteAgentModalOpen(true)}
              className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#EA3934] text-[#FFF] px-[15px] h-[33px] text-[12px] font-[SemiBold] shrink-0"
            >
              <PlusUserIcon width={16} height={16} className="text-white" />
              Invite Agent
            </button>
          </div>
        </div>

        {/* Table — same shell as UnPublished.tsx */}
        <div className="md:p-[0px_30px_30px_30px] p-[0px_16px_16px_16px]">
          <div className="overflow-x-auto w-full scrollbar-hide">
            <div className="min-w-[1480px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
              <div
                className={`${TABLE_GRID} bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]`}
              >
                <div className="flex justify-center">
                  <label className="relative">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      className="peer hidden "
                    />
                    <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                      {allVisibleSelected ? <TickIcon width={10} height={10} /> : null}
                    </div>
                  </label>
                </div>

                <p className="text-[14px] font-[Bold] text-[#222]">
                  Agent details
                </p>
                <p className="text-[14px] font-[Bold] text-[#222]">Role</p>
                <p className="text-[14px] font-[Bold] text-[#222]">
                  Email Address
                </p>
                <p className="text-[14px] font-[Bold] text-[#222]">Listings</p>
                <p className="text-[14px] font-[Bold] text-[#222]">
                  Language known
                </p>
                <p className="text-[14px] font-[Bold] text-[#222]">Status</p>
                <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
              </div>

              {!loading && paginatedRows.length === 0 ? (
                <div className="px-4 py-10 text-center text-[14px] font-[Medium] text-[#707070]">
                  {activeFilter === "Approval requests" ? "No requests found" : "No data found"}
                </div>
              ) : (
                paginatedRows.map((row, index) => {
                  const shownLangs = row.languages.slice(0, 2);
                  const moreCount = Math.max(0, row.languages.length - 2);
                  return (
                    <div
                      key={row.id}
                      className={`${TABLE_GRID} ${index !== paginatedRows.length - 1
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
                      <div className="flex items-center gap-[12px] min-w-0">
                        <div className="h-[45px] w-[45px] shrink-0 overflow-hidden rounded-full border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5]">
                          <img
                            src={toProjectImageUrl(row.defaultAvatar)}
                            alt={row.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] mb-[4px] truncate">
                            {row.name}
                          </p>
                          <p className="text-[12px] font-[Regular] text-[#707070] leading-[1.2] truncate">
                            {row.title}
                          </p>
                        </div>
                      </div>
                      <div className="flex">
                        <RoleBadge role={row.role} />
                      </div>
                      <p className="text-[12px] font-[Regular] text-[#222] truncate">
                        {row.email}
                      </p>
                      <p className="text-[12px] font-[Regular] text-[#222]">
                        {row.listings}
                      </p>
                      <div className="flex flex-wrap items-center gap-1 min-w-0">
                        {shownLangs.map((lang, langIdx) => (
                          <span
                            key={`${row.id}-lang-${langIdx}`}
                            className="inline-flex items-center justify-center rounded-[5px] h-[21px] border border-[rgba(34,34,34,0.10)] bg-white p-[6px_10px] text-[12px] font-[SemiBold] text-[#222]"
                          >
                            {lang}
                          </span>
                        ))}
                        {moreCount > 0 && (
                          <span className="text-[11px] font-[Regular] text-[#707070] whitespace-nowrap">
                            +{moreCount} more
                          </span>
                        )}
                      </div>
                      <div className="flex">
                        <StatusBadge status={row.status} />
                      </div>
                      <div className="flex items-center justify-end gap-[6px]">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/agency/super-agent-details/${row.id}`, {})}
                          className="p-[6px] cursor-pointer text-[#707070]"
                          aria-label="View"
                        >
                          <EyeDarkIcon width={20} height={20} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/agency/super-agent-edit/${row.id}`,)}
                          className="p-[6px] cursor-pointer text-[#707070]"
                          aria-label="Edit"
                        >
                          <EditIcon width={20} height={20} stroke="#222" />
                        </button>
                        <button
                          type="button"
                          className="p-[6px] cursor-pointer text-[#E53E3E]"
                          aria-label="Delete"
                        >
                          <TrashIcon width={20} height={20} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
          <Pagenation
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
      <InviteAgentModal
        isOpen={isInviteAgentModalOpen}
        onClose={() => setIsInviteAgentModalOpen(false)}
      />
    </div>
  );
};

export default SuperAgent;