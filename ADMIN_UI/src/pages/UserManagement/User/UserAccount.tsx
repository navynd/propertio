import { useCallback, useEffect, useRef, useState } from "react";
import { DownArrowIcon, EditIcon, SearchIcon, TrashIcon, EyeDarkIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Pagenation from "../../../components/Pagenation/Pagenation";
import Loader from "../../../components/Loader/loader";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { usersService } from "../../../services/usersService";
import { apiClient, getApiErrorMessage } from "../../../services/apiClient";
import type { AdminUserListItem, UsersListResponse } from "../../../types/api";
import profileless from "../../../assets/img/profileless.png";
import { useToast } from "../../../context/ToastContext";

const ITEMS_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 400;
const sortOptions = ["All", "Active", "Inactive", "Banned"] as const;
type SortOption = (typeof sortOptions)[number];
const SORT_TO_API: Record<SortOption, "all" | "active" | "inactive" | "banned"> = {
  All: "all",
  Active: "active",
  Inactive: "inactive",
  Banned: "banned",
};

const formatUserName = (user: AdminUserListItem) => {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "—";
};

const formatCountry = (user: AdminUserListItem) => {
  if (!user.country) return "—";
  if (typeof user.country === "string") return user.country;
  return user.country.name || user.country.code || "—";
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

function UserStatusBadge({
  isActive,
  isBanned,
}: {
  isActive?: boolean;
  isBanned?: boolean;
}) {
  if (isBanned) {
    return (
      <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center border border-[#ea393459] p-[6px_10px] text-[12px] font-[SemiBold] text-[#ea3934] bg-[#ea393414]">
        Banned
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="bg-[#00A663] rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF]">
        Active
      </span>
    );
  }
  return (
    <span className="rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] text-[#FFF] bg-[#E80808]">
      Inactive
    </span>
  );
}

const isPlaceholderProfilePicture = (
  filename: string | null | undefined
): boolean => {
  if (!filename || !String(filename).trim()) return true;
  const lower = String(filename).trim().toLowerCase();
  if (lower.includes("profileless.png") || lower.includes("profiless.png")) {
    return true;
  }
  const base = lower.split(/[/\\?#]/).pop() ?? "";
  return base === "profileless.png" || base === "profiless.png";
};

const resolveUserAvatarSrc = (
  user: AdminUserListItem,
  userImgBaseUrl: string
): string => {
  const raw = (user.profilePicture || "").trim();
  if (!raw || isPlaceholderProfilePicture(raw)) return profileless;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return raw;
  const base = (userImgBaseUrl || "").trim().replace(/\/+$/, "");
  if (!base) return profileless;
  return `${base}/${encodeURIComponent(raw)}`;
};

type SupportedUrlsResponse = {
  supportedUrls?: {
    userUrl?: {
      img?: string;
    };
  };
};

function UserAccount() {
  const navigate = useNavigate();
  const { push } = useToast();
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedSort, setSelectedSort] = useState<SortOption>("All");
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userImgBaseUrl, setUserImgBaseUrl] = useState("");
  const [listCounts, setListCounts] = useState<UsersListResponse["counts"]>();

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const loadSupportedUrls = async () => {
      try {
        const data = await apiClient.get<SupportedUrlsResponse>(
          "/master-data?types=supportedurls",
          { signal: controller.signal }
        );
        if (!mounted) return;
        setUserImgBaseUrl((data.supportedUrls?.userUrl?.img || "").trim());
      } catch {
        if (!mounted) return;
        setUserImgBaseUrl("");
      }
    };

    void loadSupportedUrls();

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

  const loadUsers = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersService.listUsers({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
        sortBy: SORT_TO_API[selectedSort],
      });
      if (signal.aborted) return;
      setUsers(data.users ?? []);
      setTotalPages(Math.max(1, data.pagination?.totalPages ?? 1));
      setTotalUsers(data.pagination?.totalUsers ?? 0);
      setListCounts(data.counts);
    } catch (err) {
      if (signal.aborted) return;
      setUsers([]);
      setTotalPages(1);
      setTotalUsers(0);
      setListCounts(undefined);
      setError(getApiErrorMessage(err, "Failed to load users"));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedSort]);

  useEffect(() => {
    const controller = new AbortController();
    void loadUsers(controller.signal);
    return () => controller.abort();
  }, [loadUsers]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewUser = (userId: string) => {
    navigate(`/useraccountdetail?id=${encodeURIComponent(userId)}`);
  };

  const handleDeleteUser = async (user: AdminUserListItem) => {
    const userLabel = formatUserName(user);
    const result = await Swal.fire({
      title: "Delete user account?",
      text: `This will permanently delete ${userLabel}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#EA3934",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await usersService.deleteUserById(user._id);
      push({
        type: "success",
        title: "User deleted",
        description: `${userLabel} has been deleted successfully.`,
      });
      const controller = new AbortController();
      await loadUsers(controller.signal);
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to delete user");
      push({
        type: "error",
        title: "Delete failed",
        description: message,
      });
    }
  };
  function StatCards({ counts }: { counts?: UsersListResponse["counts"] }) {
    const stats = [
      { label: "Total", value: counts?.totalUsers ?? 0, accent: "#222" },
      { label: "Active", value: counts?.activeUsers ?? 0, accent: "#00A663" },
      { label: "Inactive", value: counts?.inactiveUsers ?? 0, accent: "#EA3934" },
      { label: "Banned", value: counts?.bannedUsers ?? 0, accent: "#F59E0B" },
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
      <Header
        title="UserAccount"
        showBack={false}
        onBackClick={() => { }}
      />

      <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">

        <StatCards counts={listCounts} />
        <div className="flex items-center justify-between mb-[30px] gap-[10px]">
          <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[40px] w-full md:w-[280px]">
            <SearchIcon className="text-[#707070] shrink-0" />
            <input
              type="search"
              placeholder="Search here"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
            />
          </div>
          <div className="relative shrink-0" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen((open) => !open)}
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
              <div className="absolute right-0 top-[44px] w-full min-w-[160px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-20 flex flex-col">
                {sortOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelectedSort(option);
                      setCurrentPage(1);
                      setIsSortDropdownOpen(false);
                    }}
                    className={`px-[16px] py-[10px] text-left text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors ${selectedSort === option ? "text-[#3182CE] bg-[#F5F5F5]" : "text-[#222]"
                      }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-[20px] rounded-[10px] border border-[rgba(234,57,52,0.25)] bg-[#FFF5F5] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#EA3934]">
            {error}
          </div>
        )}

        <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
          <div className="min-w-[1400px]">
            <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
              <div className="grid grid-cols-[1.3fr_1fr_1.3fr_1.1fr_0.8fr_0.9fr_1fr] gap-[30px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                <p className="text-[14px] font-[SemiBold] text-[#222]">Name</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Phone</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Email</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Country</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Created At</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
              </div>

              <div>
                {loading ? (
                  <div className="px-[14px] py-[30px]">
                    <Loader size={80} />
                  </div>
                ) : users.length === 0 ? (
                  <div className="px-[14px] py-[40px] text-center text-[13px] font-[Medium] text-[#707070]">
                    {debouncedSearch ? "No users match your search." : "No users found."}
                  </div>
                ) : (
                  users.map((row, idx) => {
                    const avatarSrc = resolveUserAvatarSrc(row, userImgBaseUrl);
                    return (
                      <div
                        key={row._id}
                        className={`grid grid-cols-[1.3fr_1fr_1.3fr_1.1fr_0.8fr_0.9fr_1fr] gap-[30px] items-center px-[14px] py-[12px] ${idx !== users.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                      >
                        <div className="flex items-center gap-[10px]">
                          <img
                            src={avatarSrc}
                            alt=""
                            className="w-[40px] h-[40px] rounded-[12px] object-cover border border-[rgba(34,34,34,0.08)]"
                            onError={(e) => {
                              e.currentTarget.src = profileless;
                            }}
                          />
                          <p className="text-[12px] font-[Regular] text-[#222] truncate">
                            {formatUserName(row)}
                          </p>
                        </div>
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {row.phoneNumber || "—"}
                        </p>
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {row.email || "—"}
                        </p>
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {formatCountry(row)}
                        </p>
                        <UserStatusBadge isActive={row.isActive} isBanned={row.isBanned} />
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {formatCreatedAt(row.createdAt)}
                        </p>
                        <div className="flex items-center justify-start gap-[10px]">
                          <button
                            onClick={() => handleViewUser(row._id)}
                            type="button"
                            className="cursor-pointer p-[6px]"
                            aria-label="Edit user"
                          >
                            <EyeDarkIcon width={20} height={20} />
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer p-[6px]"
                            aria-label="Delete user"
                            onClick={() => handleDeleteUser(row)}
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
        </div>

        <Pagenation
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalUsers}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
}

export default UserAccount;
