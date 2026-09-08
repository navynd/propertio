import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import profileless from "../../../assets/img/profileless.png";
import { DownArrowIcon, EditIcon, EyeDarkIcon, PlusUserIcon, SearchIcon, TrashIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { agenciesService } from "../../../services/agenciesService";
import type { AdminAgencyListItem, AgenciesListCounts } from "../../../types/api";
import InviteAgencyModal from "./InviteAgencyModal";

const tableGrid = "grid-cols-[1.3fr_1fr_1.3fr_1.1fr_1.25fr_1fr_1fr]";
const ITEMS_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 400;
const sortOptions = ["All", "Active", "Inactive", "Approval Pending", "Approval Declined", "Invited", "Invitation Expired"] as const;
type SortOption = (typeof sortOptions)[number];
type AgencyStatusLabel = "Approval pending" | "Active" | "Inactive" | "Approval Declined" | "Invited" | "Invitation Expired";

const SORT_TO_API: Record<SortOption, string | undefined> = {
  All: undefined,
  Active: "active",
  Inactive: "inactive",
  "Approval Pending": "pending",
  "Approval Declined": "declined",
  Invited: "invited",
  "Invitation Expired": "expired",
};

const resolveAgencyAvatarSrc = (agency: AdminAgencyListItem): string => {
  const raw = (agency.profilePicture || "").trim();
  if (!raw || raw.toLowerCase().includes("profileless.png")) return profileless;
  if (/^https?:\/\//i.test(raw)) return raw;
  return agency.profilePictureUrl?.trim() || profileless;
};

const formatCountry = (agency: AdminAgencyListItem) => {
  if (!agency.nationality) return "—";
  if (typeof agency.nationality === "string") return agency.nationality;
  return agency.nationality.name || agency.nationality.code || "—";
};

const formatCreatedAt = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const getAgencyStatusLabel = (agency: AdminAgencyListItem): AgencyStatusLabel => {
  const inv = String(agency.invitationStatus || "").toLowerCase();
  if (inv === "pending") return "Invited";
  if (inv === "expired") return "Invitation Expired";
  if (inv === "declined") return "Approval Declined";
  if (inv === "accepted") {
    if (!agency.isVerified) return "Approval pending";
    return agency.isActive ? "Active" : "Inactive";
  }
  return "Inactive";
};

function StatusBadge({ status }: { status: AgencyStatusLabel }) {
  if (status === "Approval pending") return <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center border border-[rgba(34,34,34,0.10)] bg-white p-[6px_10px] text-[12px] font-[SemiBold] text-[#222] whitespace-nowrap">Approval pending</span>;
  if (status === "Active") return <span className="bg-[#00A663] rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] whitespace-nowrap">Active</span>;
  if (status === "Approval Declined") return <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center border border-[#ea393459] p-[6px_10px] text-[12px] font-[SemiBold] text-[#ea3934] bg-[#ea393414] whitespace-nowrap">Approval Declined</span>;
  if (status === "Invited") return <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] bg-[#8ACBD0] whitespace-nowrap">Invited</span>;
  if (status === "Invitation Expired") return <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] bg-[#FF6B35] whitespace-nowrap">Invitation Expired</span>;
  return <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] bg-[#E80808] whitespace-nowrap">Inactive</span>;
}

export default function AgencyAccount() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [rows, setRows] = useState<AdminAgencyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("All");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [listCounts, setListCounts] = useState<AgenciesListCounts>();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCurrentPage(1);
      setSearchQuery(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(event.target as Node)) setIsSortOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await agenciesService.listAgencies({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchQuery || undefined,
        sortBy: SORT_TO_API[sortBy],
      });
      setRows(data.agencies || []);
      setTotalItems(data.pagination?.totalAgencies || 0);
      setListCounts(data.counts);
    } catch (error) {
      push({ type: "error", title: "Failed to load agencies", description: getApiErrorMessage(error, "Unable to fetch agencies right now.") });
      setRows([]);
      setTotalItems(0);
      setListCounts(undefined);
    } finally {
      setLoading(false);
    }
  }, [currentPage, push, searchQuery, sortBy]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows, refreshKey]);

  const handleDelete = async (agency: AdminAgencyListItem) => {
    const result = await Swal.fire({
      title: "Delete agency?",
      text: `This will permanently delete ${agency.agencyName || "this agency"}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      confirmButtonColor: "#EA3934",
    });
    if (!result.isConfirmed || !agency._id) return;
    try {
      await agenciesService.deleteAgencyById(agency._id);
      push({ type: "success", title: "Agency deleted", description: "Agency has been deleted successfully." });
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      push({ type: "error", title: "Delete failed", description: getApiErrorMessage(error, "Failed to delete agency.") });
    }
  };

  const getViewPath = (agency: AdminAgencyListItem) => {
    const status = getAgencyStatusLabel(agency);
    return ["Approval pending", "Approval Declined", "Invited", "Invitation Expired"].includes(status)
      ? `/agencyaccountview?id=${agency._id}`
      : `/agencyaccountdetail?id=${agency._id}`;
  };
  const showEditButton = (agency: AdminAgencyListItem) => getAgencyStatusLabel(agency) === "Approval pending";
  const handleSortDropdown = (option: SortOption) => {
    setSortBy(option);
    setCurrentPage(1);
    setIsSortOpen(false);
  };
  function StatCards({ counts }: { counts?: AgenciesListCounts }) {
    const stats = [
      { label: "Total", value: counts?.totalAgencies ?? 0, accent: "#222" },
      { label: "Active", value: counts?.activeAgencies ?? 0, accent: "#00A663" },
      { label: "Inactive", value: counts?.inactiveAgencies ?? 0, accent: "#EA3934" },
      { label: "Approval Pending", value: counts?.approvalPendingAgencies ?? 0, accent: "#F59E0B" },
      // { label: "Approval Declined", value: counts?.declinedAgencies ?? 0, accent: "#EA3934" },
      // { label: "Invited", value: counts?.invitedAgencies ?? 0, accent: "#00A663" },
      // { label: "Invitation Expired", value: counts?.expiredAgencies ?? 0, accent: "#EA3934" },
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
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header title="AgencyAccount" showBack={false} onBackClick={() => { }} />
      <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">

        <StatCards counts={listCounts} />
        <div className="flex md:flex-row flex-col items-center justify-between mb-[30px] gap-[10px]">
          <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[37px] w-full md:w-[280px]">
            <SearchIcon className="text-[#707070] shrink-0" />
            <input type="search" placeholder="Search here" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none" />
          </div>
          <div className="flex flex-wrap md:items-center gap-[10px]">
            <div className="flex md:items-center gap-[8px] shrink-0">
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsSortOpen((open) => !open)}
                  className="flex items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.10)] bg-white rounded-full px-[14px] h-[37px] cursor-pointer w-[120px]"
                >
                  <span className="text-[#222] text-[12px] font-[SemiBold] truncate">
                    {sortBy}
                  </span>
                  <DownArrowIcon
                    className={`transition-transform duration-200 ${isSortOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isSortOpen && (
                  <div className="absolute left-0 top-[44px] w-full min-w-[180px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-20 flex flex-col">
                    {sortOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSortDropdown(option);
                        }}
                        className={`px-[16px] py-[10px] text-left text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors ${sortBy === option
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
                Invite Agency
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
          <div className="min-w-[1220px]">
            <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
              <div className={`grid ${tableGrid} gap-[30px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Name</p><p className="text-[14px] font-[SemiBold] text-[#222]">Phone</p><p className="text-[14px] font-[SemiBold] text-[#222]">Email</p><p className="text-[14px] font-[SemiBold] text-[#222]">Country</p><p className="text-[14px] font-[SemiBold] text-[#222]">Status</p><p className="text-[14px] font-[SemiBold] text-[#222]">Created At</p><p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-[60px]"><Loader size={64} margin={0} /></div>
              ) : rows.length === 0 ? (
                <div className="px-[14px] py-[40px] text-center text-[13px] font-[Medium] text-[#707070]">No agencies found</div>
              ) : (
                rows.map((row, idx) => {
                  const status = getAgencyStatusLabel(row);
                  return (
                    <div key={row._id} className={`grid ${tableGrid} gap-[30px] items-center px-[14px] py-[12px] ${idx !== rows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}>
                      <div className="flex items-center gap-[10px]"><img src={resolveAgencyAvatarSrc(row)} alt={row.agencyName || "Agency"} className="w-[40px] h-[40px] rounded-[12px] object-cover border border-[rgba(34,34,34,0.08)]" onError={(e) => { e.currentTarget.src = profileless; }} /><p className="text-[12px] font-[Regular] text-[#222] truncate">{row.agencyName || "—"}</p></div>
                      <p className="text-[12px] font-[Regular] text-[#222] truncate">{row.phoneNumber || "—"}</p>
                      <p className="text-[12px] font-[Regular] text-[#222] truncate">{row.email || "—"}</p>
                      <p className="text-[12px] font-[Regular] text-[#222] truncate">{formatCountry(row)}</p>
                      <div className="min-w-0"><StatusBadge status={status} /></div>
                      <p className="text-[12px] font-[Regular] text-[#222] truncate">{formatCreatedAt(row.createdAt)}</p>
                      <div className="flex items-center justify-start gap-[10px]">
                        {showEditButton(row) && <button type="button" className="cursor-pointer p-[6px]" aria-label="Edit" onClick={() => navigate(`/agencyaccountdetail?id=${row._id}`)}><EditIcon width={20} height={20} /></button>}
                        <button type="button" className="cursor-pointer p-[6px]" aria-label="View" onClick={() => navigate(getViewPath(row))}><EyeDarkIcon width={20} height={20} /></button>
                        <button type="button" className="cursor-pointer p-[6px]" aria-label="Delete" onClick={() => void handleDelete(row)}><TrashIcon width={20} height={20} /></button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <Pagenation currentPage={currentPage} totalItems={totalItems} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
      </div>
      <InviteAgencyModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onInviteSuccess={() => setRefreshKey((prev) => prev + 1)} />
    </div>
  );
}
