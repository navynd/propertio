import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import homeimg from "../../../assets/img/home.png";
import { SearchIcon, TrashIcon, EyeDarkIcon } from "../../../components/CustomFile/icons";
import Pagenation from "../../../components/Pagenation/Pagenation";
import Loader from "../../../components/Loader/loader";
import HoverTooltip from "../../../components/HoverTooltip/HoverTooltip";
import {
    agentService,
    type AgentNotificationItem,
} from "../../../services/agentService";
import { getApiErrorMessage } from "../../../services/apiClient";
import { toast } from "../../../services/toast";

type NotificationStatusTab = { name: string; value: string };

const ITEMS_PER_PAGE = 10;

const formatDealAmount = (amount?: number, currency?: string) => {
    if (amount == null || Number.isNaN(Number(amount))) return "--/--";
    const cur = currency?.trim() || "AED";
    return `${Number(amount).toLocaleString("en-US")} ${cur}`;
};

const formatCreatedAt = (value?: string) => {
    if (!value) return "--/--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--/--";
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatReadStatus = (isRead?: boolean) => (isRead ? "Read" : "Unread");

const DEFAULT_NOTIFICATION_IMAGE = "notificationbell.png";

const toNotificationImageUrl = (
    raw: string | undefined,
    projectBase: string,
    propertyBase: string,
    itemType?: string,
) => {
    const trimmed = raw?.trim() || DEFAULT_NOTIFICATION_IMAGE;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    const base =
        itemType?.trim().toLowerCase() === "property" ? propertyBase : projectBase;
    const cleanBase = (base || "").replace(/\/?$/, "/");
    const file = trimmed.replace(/^\/+/, "").replace(/^img\/(project|property)\//i, "");
    return cleanBase ? `${cleanBase}${file}` : "";
};

const getNotificationDisplayName = (row: AgentNotificationItem) => {
    const meta = row.metadata;
    return (
        meta?.projectName?.trim() ||
        meta?.propertyName?.trim() ||
        meta?.title?.trim() ||
        "--/--"
    );
};

const isPropertyAllocationNotification = (row: AgentNotificationItem) => {
    const meta = row.metadata;
    if (meta?.allocationId) return true;

    const title = row.title?.trim().toLowerCase() ?? "";
    return title.includes("property allocation");
};

const isDealApprovedNotification = (row: AgentNotificationItem) => {
    if (row.metadata?.decision?.trim().toLowerCase() === "approved") return true;
    const title = row.title?.trim().toLowerCase() ?? "";
    return title.includes("deal approved");
};

const extractInquirySearchFromMessage = (message?: string) => {
    if (!message?.trim()) return "";
    const match = message.trim().match(/\babout\s+(.+)$/i);
    return match?.[1]?.trim() || "";
};

const isInquiryNotification = (row: AgentNotificationItem) =>
    row.notificationType === "inquiry" || row.relatedItem?.itemType === "inquiry";

const isProjectInquiryNotification = (row: AgentNotificationItem) => {
    const meta = row.metadata;
    if (meta?.inquiryCategory === "project") return true;
    if (meta?.projectId || meta?.projectName) return true;
    const title = row.title?.trim().toLowerCase() ?? "";
    return title.includes("(project)");
};

const getInquiryContactType = (
    row: AgentNotificationItem,
): "whatsapp" | "call" | "email" | null => {
    const title = row.title?.trim().toLowerCase() ?? "";
    if (title.includes("whatsapp")) return "whatsapp";
    if (title.includes("call")) return "call";
    if (title.includes("email")) return "email";
    return null;
};

const isProjectUnitAssignmentNotification = (row: AgentNotificationItem) => {
    const meta = row.metadata;
    const mode = meta?.mode?.trim().toLowerCase();
    if (mode === "assigned" || mode === "updated" || mode === "cancelled") return true;
    if (
        typeof meta?.unitsAssigned === "number" ||
        typeof meta?.addedUnits === "number" ||
        typeof meta?.removedUnits === "number"
    ) {
        return true;
    }
    const title = row.title?.trim().toLowerCase() ?? "";
    return title.includes("project unit assignment");
};

const AgentNotification = () => {
    const navigate = useNavigate();
    const [statusTabs, setStatusTabs] = useState<NotificationStatusTab[]>([]);
    const [selectedValue, setSelectedValue] = useState("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [notifications, setNotifications] = useState<AgentNotificationItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [projectImgBase, setProjectImgBase] = useState("");
    const [propertyImgBase, setPropertyImgBase] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const loadStatusTabs = async () => {
            try {
                const data = await agentService.getNotificationStatusMasterData();
                if (!isMounted) return;
                const rows = (data?.notificationStatus || []).filter(
                    (item) => item?.name?.trim() && item?.value?.trim(),
                );
                setStatusTabs(rows);
                setSelectedValue((current) =>
                    rows.some((item) => item.value === current)
                        ? current
                        : rows[0]?.value ?? "",
                );
            } catch {
                if (!isMounted) return;
                setStatusTabs([]);
                setSelectedValue("");
            }
        };
        void loadStatusTabs();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        agentService
            .getSupportedUrlsMasterData()
            .then((res) => {
                const source =
                    (res?.supportedUrls as Record<string, unknown>) ||
                    (res?.supportedurls as Record<string, unknown>) ||
                    {};
                const projectUrl =
                    (source.projectUrl as { img?: string }) ||
                    (source.projecturl as { img?: string });
                const propertyUrl =
                    (source.propertyUrl as { img?: string }) ||
                    (source.propertyurl as { img?: string });
                if (projectUrl?.img) {
                    setProjectImgBase(String(projectUrl.img).replace(/\/?$/, "/"));
                }
                if (propertyUrl?.img) {
                    setPropertyImgBase(String(propertyUrl.img).replace(/\/?$/, "/"));
                }
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearch(searchInput.trim());
            setCurrentPage(1);
        }, 400);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const fetchNotifications = useCallback(async () => {
        if (!selectedValue) return;
        setIsLoading(true);
        try {
            const data = await agentService.getNotifications({
                tab: selectedValue,
                search: search || undefined,
                page: currentPage,
                limit: ITEMS_PER_PAGE,
            });
            setNotifications(data?.notifications ?? []);
            setTotalItems(data?.pagination?.total ?? 0);
            setSelectedIds(new Set());
        } catch (error: unknown) {
            toast.error("Load failed", getApiErrorMessage(error, "Failed to load notifications."));
            setNotifications([]);
            setTotalItems(0);
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, search, selectedValue]);

    useEffect(() => {
        void fetchNotifications();
    }, [fetchNotifications]);

    const allSelected =
        notifications.length > 0 &&
        notifications.every((row) => selectedIds.has(row.id));

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
                notifications.forEach((row) => next.delete(row.id));
            } else {
                notifications.forEach((row) => next.add(row.id));
            }
            return next;
        });
    };

    const handleView = (row: AgentNotificationItem) => {
        const notificationId = row.id?.trim();
        if (notificationId && !row.isRead) {
            void agentService.markNotificationAsRead(notificationId);
            setNotifications((prev) =>
                prev.map((item) =>
                    item.id === notificationId ? { ...item, isRead: true } : item,
                ),
            );
        }

        if (isPropertyAllocationNotification(row)) {
            const searchText = row.metadata?.title?.trim() || "";
            const params = new URLSearchParams();
            if (searchText) params.set("search", searchText);
            const query = params.toString();
            navigate(
                query ? `/agent/allocated/property?${query}` : "/agent/allocated/property",
            );
            return;
        }

        if (isProjectUnitAssignmentNotification(row)) {
            const searchText = row.metadata?.projectName?.trim() || "";
            const params = new URLSearchParams();
            if (searchText) params.set("search", searchText);
            const query = params.toString();
            navigate(
                query ? `/agent/allocated/project?${query}` : "/agent/allocated/project",
            );
            return;
        }

        if (isDealApprovedNotification(row)) {
            const params = new URLSearchParams();
            params.set("tab", "closed-deal");
            const searchText = row.metadata?.projectName?.trim() || "";
            if (searchText) params.set("search", searchText);
            navigate(`/agent/leads/project?${params.toString()}`);
            return;
        }

        if (isInquiryNotification(row)) {
            if (isProjectInquiryNotification(row)) {
                const searchText =
                    row.metadata?.projectName?.trim() ||
                    extractInquirySearchFromMessage(row.message);
                const params = new URLSearchParams();
                if (searchText) params.set("search", searchText);
                const query = params.toString();
                navigate(
                    query ? `/agent/leads/project?${query}` : "/agent/leads/project",
                );
                return;
            }

            const params = new URLSearchParams({ section: "new" });
            const contactType = getInquiryContactType(row);
            if (contactType) params.set("contactType", contactType);
            const searchText =
                row.metadata?.propertyName?.trim() ||
                extractInquirySearchFromMessage(row.message);
            if (searchText) params.set("search", searchText);
            navigate(`/agent/leads/property?${params.toString()}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (deletingId) return;
        setDeletingId(id);
        try {
            await agentService.deleteNotifications([id]);
            toast.success("Deleted", "Notification removed successfully.");
            await fetchNotifications();
        } catch (error: unknown) {
            toast.error("Delete failed", getApiErrorMessage(error, "Failed to delete notification."));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
                <div className="rounded-[15px] bg-white min-w-0 md:p-[30px] p-[20px] flex flex-col gap-[30px]">
                    <div className="flex items-center flex-wrap justify-between gap-[12px]">
                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[40px] w-full lg:max-w-[300px]">
                            <SearchIcon className="text-[#707070] shrink-0" />
                            <input
                                type="search"
                                placeholder="Search here"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-[10px]">
                            <div className="flex flex-wrap items-center gap-[8px]">
                                {statusTabs.map((tab) => (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        onClick={() => {
                                            setSelectedValue(tab.value);
                                            setCurrentPage(1);
                                        }}
                                        className={`rounded-full px-[16px] h-[33px] text-[12px] font-[SemiBold] ${selectedValue === tab.value
                                            ? "bg-[#222] text-white"
                                            : "bg-white border border-[rgba(34,34,34,0.10)] text-[#222]"
                                            }`}
                                    >
                                        {tab.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto w-full scrollbar-hide">
                        <div className="min-w-[1000px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                            <div className="grid grid-cols-[40px_1.4fr_1fr_1.6fr_1fr_0.9fr_72px] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                                <div className="flex justify-center">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        disabled={notifications.length === 0}
                                        className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer disabled:opacity-40"
                                    />
                                </div>
                                <p className="text-[14px] font-[Bold] text-[#222]">Project details</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Title</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Message</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Deal amount</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">Date</p>
                                <span className="sr-only">Actions</span>
                            </div>

                            {!isLoading && notifications.length === 0 ? (
                                <div className="px-[14px] py-[28px] text-center">
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">
                                        No notifications found
                                    </p>
                                    <p className="mt-[6px] text-[13px] font-[Regular] text-[#707070]">
                                        {search.trim() || (selectedValue && selectedValue !== "all")
                                            ? "Try changing the date filter or search."
                                            : "You have no notifications yet."}
                                    </p>
                                </div>
                            ) : (
                                notifications.map((row, index) => {
                                    const meta = row.metadata;
                                    const displayName = getNotificationDisplayName(row);
                                    const itemType = row.relatedItem?.itemType;
                                    const imageUrl =
                                        toNotificationImageUrl(
                                            meta?.image,
                                            projectImgBase,
                                            propertyImgBase,
                                            itemType,
                                        ) || homeimg;

                                    return (
                                        <div
                                            key={row.id}
                                            className={`grid grid-cols-[40px_1.4fr_1fr_1.6fr_1fr_0.9fr_48px] gap-2 items-center px-[14px] py-[12px] ${index !== notifications.length - 1
                                                ? "border-b border-[rgba(34,34,34,0.08)]"
                                                : ""
                                                }`}
                                        >
                                            <div className="flex justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(row.id)}
                                                    onChange={() => toggleRow(row.id)}
                                                    className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                                                />
                                            </div>

                                            <div className="flex items-center gap-[12px] min-w-0">
                                                <div className="w-[56px] h-[56px] rounded-[8px] overflow-hidden shrink-0 bg-[#F5F5F5]">
                                                    <img
                                                        src={imageUrl}
                                                        alt={displayName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = homeimg;
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-[6px] min-w-0">
                                                    <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] truncate">
                                                        {displayName}
                                                    </p>
                                                    <span
                                                        className={`inline-flex w-fit items-center rounded-full px-[10px] h-[22px] text-[10px] font-[SemiBold] ${row.isRead
                                                            ? "bg-[#E8F5E9] text-[#2E7D32]"
                                                            : "bg-[#FFF3E0] text-[#E65100]"
                                                            }`}
                                                    >
                                                        {formatReadStatus(row.isRead)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <HoverTooltip
                                                    content={row.title?.trim() || "--/--"}
                                                >
                                                    <p className="text-[12px] font-[Regular] text-[#222] truncate cursor-default">
                                                        {row.title?.trim() || "--/--"}
                                                    </p>
                                                </HoverTooltip>
                                            </div>
                                            <div className="min-w-0">
                                                <HoverTooltip
                                                    content={row.message?.trim() || "--/--"}
                                                >
                                                    <p className="text-[12px] font-[Regular] text-[#222] truncate cursor-default">
                                                        {row.message?.trim() || "--/--"}
                                                    </p>
                                                </HoverTooltip>
                                            </div>
                                            <p className="text-[12px] font-[Regular] text-[#222]">
                                                {formatDealAmount(meta?.dealAmount, meta?.currency)}
                                            </p>
                                            <p className="text-[12px] font-[Regular] text-[#222]">
                                                {formatCreatedAt(row.createdAt)}
                                            </p>
                                            <div className="flex items-center justify-center gap-[2px]">
                                                <button
                                                    type="button"
                                                    onClick={() => handleView(row)}
                                                    className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9]"
                                                    aria-label="View"
                                                >
                                                    <EyeDarkIcon width={20} height={20} />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={deletingId === row.id}
                                                    onClick={() => void handleDelete(row.id)}
                                                    className="cursor-pointer p-[6px] rounded-[8px] hover:bg-[#F1F5F9] disabled:opacity-50"
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

                    <div className="px-[20px] md:px-[20px] pb-[20px]">
                        <Pagenation
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </div>
            </div>

            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
        </>
    );
};

export default AgentNotification;
