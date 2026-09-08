import profileless from "../../../assets/img/profileless.png";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DownArrowIcon,
  EditIcon,
  EyeDarkIcon,
  PlusUserIcon,
  SearchIcon,
  TrashIcon,
} from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import InviteAgentModal from "./InviteAgentModal";
import { agenciesService } from "../../../services/agenciesService";
import { agentsService } from "../../../services/agentsService";
import { apiClient, getApiErrorMessage } from "../../../services/apiClient";
import type {
  AdminAgentListItem,
  AgencyDropdownItem,
  AgentsListCounts,
  SupportedUrlsResponse,
} from "../../../types/api";
import { useToast } from "../../../context/ToastContext";

const tableGrid =
  "grid-cols-[1.2fr_1fr_1.2fr_1.1fr_0.9fr_1.15fr_1fr_1fr]";
const ITEMS_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 400;

const sortOptions = [
  "All",
  "Active",
  "Inactive",
  "Approval Pending",
  "Approval Declined",
  "Invited",
  "Invitation Expired",
] as const;

type SortOption = (typeof sortOptions)[number];

type AgentStatusLabel =
  | "Approval pending"
  | "Active"
  | "Inactive"
  | "Approval Declined"
  | "Invited"
  | "Invitation Expired";

const SORT_TO_API: Record<SortOption, string | undefined> = {
  All: undefined,
  Active: "active",
  Inactive: "inactive",
  "Approval Pending": "pending",
  "Approval Declined": "declined",
  Invited: "invited",
  "Invitation Expired": "expired",
};

const ALL_AGENCIES_VALUE = "";

const isPlaceholderProfilePicture = (filename: string | null | undefined): boolean => {
  if (!filename || !String(filename).trim()) return true;
  const lower = String(filename).trim().toLowerCase();
  if (lower.includes("profileless.png")) return true;
  const base = lower.split(/[/\\?#]/).pop() ?? "";
  return base === "profileless.png";
};

const resolveAgentAvatarSrc = (
  agent: AdminAgentListItem,
  agentImgBaseUrl: string
): string => {
  const raw = (agent.profilePicture || "").trim();
  if (!raw || isPlaceholderProfilePicture(raw)) return profileless;
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (agentImgBaseUrl || "").trim().replace(/\/+$/, "");
  if (!base) return agent.profilePictureUrl?.trim() || profileless;
  return `${base}/${encodeURIComponent(raw)}`;
};

const resolveAgencyAvatarSrc = (
  agency: AdminAgentListItem["agency"],
  agencyImgBaseUrl: string
): string => {
  if (!agency) return profileless;
  const raw = (agency.profilePicture || "").trim();
  if (!raw || isPlaceholderProfilePicture(raw)) return profileless;
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (agencyImgBaseUrl || "").trim().replace(/\/+$/, "");
  if (!base) return agency.profilePictureUrl?.trim() || profileless;
  return `${base}/${encodeURIComponent(raw)}`;
};

const formatAgentType = (value?: string) => {
  if (!value) return "—";
  if (value === "superagent") return "Super Agent";
  return "Agent";
};

const formatCreatedAt = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getAgentStatusLabel = (agent: AdminAgentListItem): AgentStatusLabel => {
  const inv = String(agent.invitationStatus || "").toLowerCase();
  if (inv === "pending") return "Invited";
  if (inv === "expired") return "Invitation Expired";
  if (inv === "declined") return "Approval Declined";
  if (inv === "accepted") {
    if (!agent.isVerified) return "Approval pending";
    return agent.isActive ? "Active" : "Inactive";
  }
  return "Inactive";
};

function StatusBadge({ status }: { status: AgentStatusLabel }) {
  if (status === "Approval pending") {
    return (
      <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center border border-[rgba(34,34,34,0.10)] bg-white p-[6px_10px] text-[12px] font-[SemiBold] text-[#222] whitespace-nowrap">
        Approval pending
      </span>
    );
  }
  if (status === "Active") {
    return (
      <span className="bg-[#00A663] rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] whitespace-nowrap">
        Active
      </span>
    );
  }
  if (status === "Approval Declined") {
    return (
      <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center border border-[#ea393459] p-[6px_10px] text-[12px] font-[SemiBold] text-[#ea3934] bg-[#ea393414] whitespace-nowrap">
        Approval Declined
      </span>
    );
  }
  if (status === "Invited") {
    return (
      <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] bg-[#8ACBD0] whitespace-nowrap">
        Invited
      </span>
    );
  }
  if (status === "Invitation Expired") {
    return (
      <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] bg-[#FF6B35] whitespace-nowrap">
        Invitation Expired
      </span>
    );
  }
  return (
    <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] bg-[#E80808] whitespace-nowrap">
      Inactive
    </span>
  );
}

export default function AgentAccount() {
  const navigate = useNavigate();
  const { push } = useToast();
  const agencyDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const [agencyOptions, setAgencyOptions] = useState<AgencyDropdownItem[]>([]);
  const [selectedAgencyId, setSelectedAgencyId] = useState(ALL_AGENCIES_VALUE);
  const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);

  const [selectedSort, setSelectedSort] = useState<SortOption>("All");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [agents, setAgents] = useState<AdminAgentListItem[]>([]);
  const [totalAgents, setTotalAgents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentImgBaseUrl, setAgentImgBaseUrl] = useState("");
  const [agencyImgBaseUrl, setAgencyImgBaseUrl] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [listCounts, setListCounts] = useState<AgentsListCounts>();

  const selectedAgencyLabel =
    selectedAgencyId === ALL_AGENCIES_VALUE
      ? "All Agencies"
      : agencyOptions.find((a) => a._id === selectedAgencyId)?.agencyName || "All Agencies";

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const loadUrls = async () => {
      try {
        const data = await apiClient.get<SupportedUrlsResponse>(
          "/master-data?types=supportedurls",
          { signal: controller.signal }
        );
        if (!mounted) return;
        setAgentImgBaseUrl((data.supportedUrls?.agentUrl?.img || "").trim());
        setAgencyImgBaseUrl((data.supportedUrls?.agencyUrl?.img || "").trim());
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
        const data = await agenciesService.listAgenciesForDropdown(undefined, controller.signal);
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
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!isAgencyDropdownOpen && !isSortDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (agencyDropdownRef.current?.contains(target)) return;
      if (sortDropdownRef.current?.contains(target)) return;
      setIsAgencyDropdownOpen(false);
      setIsSortDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAgencyDropdownOpen, isSortDropdownOpen]);

  const loadAgents = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const data = await agentsService.listAgents({
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch || undefined,
          sortBy: SORT_TO_API[selectedSort],
          agency: selectedAgencyId || undefined,
        });
        if (signal.aborted) return;
        setAgents(data.agents ?? []);
        setTotalAgents(data.pagination?.totalAgents ?? 0);
        setListCounts(data.counts);
      } catch (err) {
        if (signal.aborted) return;
        setAgents([]);
        setTotalAgents(0);
        setListCounts(undefined);
        setError(getApiErrorMessage(err, "Failed to load agents"));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [currentPage, debouncedSearch, selectedSort, selectedAgencyId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadAgents(controller.signal);
    return () => controller.abort();
  }, [loadAgents, refreshKey]);

  const handleAgencySelect = (agencyId: string) => {
    setSelectedAgencyId(agencyId);
    setCurrentPage(1);
    setIsAgencyDropdownOpen(false);
  };

  const handleSortSelect = (option: SortOption) => {
    setSelectedSort(option);
    setCurrentPage(1);
    setIsSortDropdownOpen(false);
  };

  const handleDeleteAgent = async (agent: AdminAgentListItem) => {
    const label = (agent.fullName || agent.email || "this agent").trim();
    const result = await Swal.fire({
      title: "Delete agent account?",
      text: `This will permanently delete ${label}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#EA3934",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    try {
      await agentsService.deleteAgentById(agent._id);
      push({
        type: "success",
        title: "Agent deleted",
        description: `${label} has been deleted successfully.`,
      });
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      push({
        type: "error",
        title: "Delete failed",
        description: getApiErrorMessage(err, "Failed to delete agent"),
      });
    }
  };

  const getViewPath = (agent: AdminAgentListItem) => {
    const status = getAgentStatusLabel(agent);
    return ["Approval pending", "Approval Declined", "Invited", "Invitation Expired"].includes(status)
      ? `/agentaccountview?id=${agent._id}`
      : `/agentaccountdetail?id=${agent._id}`;
  };
  const showEditButton = (agent: AdminAgentListItem) =>
    getAgentStatusLabel(agent) === "Approval pending";
  function StatCards({ counts }: { counts?: AgentsListCounts }) {
    const stats = [
      { label: "Total", value: counts?.totalAgents ?? 0, accent: "#222" },
      { label: "Active", value: counts?.activeAgents ?? 0, accent: "#00A663" },
      { label: "Inactive", value: counts?.inactiveAgents ?? 0, accent: "#EA3934" },
      { label: "Approval Pending", value: counts?.approvalPendingAgents ?? 0, accent: "#F59E0B" },
      // { label: "Approval Declined", value: counts?.declinedAgents ?? 0, accent: "#EA3934" },
      // { label: "Invited", value: counts?.invitedAgents ?? 0, accent: "#00A663" },
      // { label: "Invitation Expired", value: counts?.expiredAgents ?? 0, accent: "#EA3934" },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-[14px] mb-[24px]">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-[12px] border border-[rgba(34,34,34,0.08)] bg-white p-[16px] flex flex-col gap-[6px]"
          >
            <p className="text-[12px] font-[Medium] text-[#707070]">{s.label}</p>
            <p className="text-[28px] font-[Bold] leading-none" style={{ color: s.accent }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <Header title="Agent Account" showBack={false} onBackClick={() => { }} />

        <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
          <StatCards counts={listCounts} />
          <div className="flex md:flex-row flex-col items-center justify-between mb-[30px] gap-[10px] overflow-visible">
            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[37px] w-full md:w-[280px] shrink-0">
              <SearchIcon className="text-[#707070] shrink-0" />
              <input
                type="search"
                placeholder="Search here"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap md:items-center gap-[10px] w-full md:w-auto overflow-visible">
              <div className="relative shrink-0 w-[200px]" ref={agencyDropdownRef}>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setIsSortDropdownOpen(false);
                    setIsAgencyDropdownOpen((open) => !open);
                  }}
                  className="flex w-full items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.10)] bg-white rounded-full px-[14px] h-[37px] cursor-pointer"
                >
                  <span className="text-[#222] text-[12px] font-[SemiBold] truncate">
                    {selectedAgencyLabel}
                  </span>
                  <DownArrowIcon
                    className={`shrink-0 transition-transform duration-200 ${isAgencyDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isAgencyDropdownOpen && (
                  <div className="absolute left-0 top-[calc(100%+7px)] w-full min-w-[200px] max-h-[240px] overflow-y-auto bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-50">
                    {selectedAgencyId !== ALL_AGENCIES_VALUE && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAgencySelect(ALL_AGENCIES_VALUE);
                        }}
                        className="w-full px-[16px] py-[10px] text-left text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] text-[#222]"
                      >
                        All Agencies
                      </button>
                    )}
                    {agencyOptions.length === 0 ? (
                      <p className="px-[16px] py-[10px] text-[13px] font-[Regular] text-[#707070]">
                        No agencies available
                      </p>
                    ) : (
                      agencyOptions.map((agency) => (
                        <button
                          key={agency._id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleAgencySelect(agency._id);
                          }}
                          className={`w-full px-[16px] py-[10px] text-left text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors truncate ${selectedAgencyId === agency._id
                            ? "text-[#3182CE] bg-[#F5F5F5]"
                            : "text-[#222]"
                            }`}
                        >
                          {agency.agencyName || agency.email}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="relative shrink-0" ref={sortDropdownRef}>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    setIsAgencyDropdownOpen(false);
                    setIsSortDropdownOpen((open) => !open);
                  }}
                  className="flex items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.10)] bg-white rounded-full px-[14px] h-[37px] cursor-pointer w-[120px]"
                >
                  <span className="text-[#222] text-[12px] font-[SemiBold] truncate">
                    {selectedSort}
                  </span>
                  <DownArrowIcon
                    className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isSortDropdownOpen && (
                  <div className="absolute left-0 top-[calc(100%+7px)] w-full min-w-[180px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-50 flex flex-col">
                    {sortOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSortSelect(option);
                        }}
                        className={`px-[16px] py-[10px] text-left text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors ${selectedSort === option
                          ? "text-[#3182CE] bg-[#F5F5F5]"
                          : "text-[#222]"
                          }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#6A3CA8] text-[#FFF] px-[15px] h-[37px] text-[12px] font-[SemiBold] shrink-0"
              >
                <PlusUserIcon width={16} height={16} className="text-white" />
                Invite Agent
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-[20px] rounded-[10px] border border-[rgba(234,57,52,0.25)] bg-[#FFF5F5] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#EA3934]">
              {error}
            </div>
          )}

          <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
            <div className="min-w-[1320px]">
              <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                <div
                  className={`grid ${tableGrid} gap-[20px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}
                >
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Name</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Phone</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Email</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Agency</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Type</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Created At</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-[60px]">
                    <Loader size={64} margin={0} />
                  </div>
                ) : agents.length === 0 ? (
                  <div className="px-[14px] py-[40px] text-center text-[13px] font-[Medium] text-[#707070]">
                    No agents found
                  </div>
                ) : (
                  agents.map((row, idx) => {
                    const status = getAgentStatusLabel(row);
                    return (
                      <div
                        key={row._id}
                        className={`grid ${tableGrid} gap-[20px] items-center px-[14px] py-[12px] ${idx !== agents.length - 1
                          ? "border-b border-[rgba(34,34,34,0.08)]"
                          : ""
                          }`}
                      >
                        <div className="flex items-center gap-[10px] min-w-0">
                          <img
                            src={resolveAgentAvatarSrc(row, agentImgBaseUrl)}
                            alt={row.fullName || "Agent"}
                            className="w-[40px] h-[40px] rounded-[12px] object-cover border border-[rgba(34,34,34,0.08)] shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = profileless;
                            }}
                          />
                          <p className="text-[12px] font-[Regular] text-[#222] truncate">
                            {row.fullName || "—"}
                          </p>
                        </div>
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {row.phoneNumber || "—"}
                        </p>
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {row.email || "—"}
                        </p>
                        <div className="flex items-center gap-[10px] min-w-0">
                          <img
                            src={resolveAgencyAvatarSrc(row.agency, agencyImgBaseUrl)}
                            alt={row.agency?.agencyName || "Agency"}
                            className="w-[40px] h-[40px] rounded-[12px] object-cover border border-[rgba(34,34,34,0.08)] shrink-0"
                            onError={(e) => {
                              e.currentTarget.src = profileless;
                            }}
                          />
                          <p className="text-[12px] font-[Regular] text-[#222] truncate">
                            {row.agency?.agencyName || "—"}
                          </p>
                        </div>
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {formatAgentType(row.agentType)}
                        </p>
                        <div className="min-w-0">
                          <StatusBadge status={status} />
                        </div>
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {formatCreatedAt(row.createdAt)}
                        </p>
                        <div className="flex items-center justify-start gap-[10px]">
                          {showEditButton(row) && (
                            <button
                              type="button"
                              className="cursor-pointer p-[6px]"
                              aria-label="Edit"
                              onClick={() => navigate(`/agentaccountdetail?id=${row._id}`)}
                            >
                              <EditIcon width={20} height={20} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="cursor-pointer p-[6px]"
                            aria-label="View"
                            onClick={() => navigate(getViewPath(row))}
                          >
                            <EyeDarkIcon width={20} height={20} />
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer p-[6px]"
                            aria-label="Delete"
                            onClick={() => void handleDeleteAgent(row)}
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

          <Pagenation
            currentPage={currentPage}
            totalItems={totalAgents}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <InviteAgentModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        defaultAgencyId={selectedAgencyId || undefined}
        onInviteSuccess={() => setRefreshKey((prev) => prev + 1)}
      />
    </>
  );
}
