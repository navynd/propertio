import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import homeimg from "../../../assets/img/home.png";
import { SearchIcon, TrashIcon, EyeDarkIcon } from "../../../components/CustomFile/icons";
import DeveloperHeader from "../../../components/Header/DeveloperHeader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import Loader from "../../../components/Loader/loader";
import HoverTooltip from "../../../components/HoverTooltip/HoverTooltip";
import {
    developerService,
    type DeveloperNotificationItem,
} from "../../../services/developerService";
import { getApiErrorMessage } from "../../../services/apiClient";
import { toast } from "../../../services/toast";

type NotificationStatusTab = { name: string; value: string };

const ITEMS_PER_PAGE = 10;

const formatDealAmount = (
    amount?: number,
    currency?: string,
) => {
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

const toProjectImageUrl = (raw: string | undefined, base: string) => {
    if (!raw?.trim()) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const cleanBase = base.replace(/\/?$/, "/");
    return `${cleanBase}${raw.replace(/^\/+/, "")}`;
};

const getNotificationProjectId = (row: DeveloperNotificationItem) => {
    const fromMetadata = row.metadata?.projectId?.trim();
    if (fromMetadata) return fromMetadata;
    const itemType = row.relatedItem?.itemType?.trim().toLowerCase();
    const itemId = row.relatedItem?.itemId?.trim();
    if (itemType === "project" && itemId) return itemId;
    return null;
};

const DeveloperNotification = () => {
    const navigate = useNavigate();
    const [statusTabs, setStatusTabs] = useState<NotificationStatusTab[]>([]);
    const [selectedValue, setSelectedValue] = useState("");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [notifications, setNotifications] = useState<DeveloperNotificationItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [projectImgBase, setProjectImgBase] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        const loadStatusTabs = async () => {
            try {
                const data = await developerService.getNotificationStatusMasterData();
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
        developerService
            .getSupportedUrlsMasterData()
            .then((res) => {
                const source =
                    (res as { supportedUrls?: { projectUrl?: { img?: string } } })?.supportedUrls ||
                    (res as { supportedurls?: { projectUrl?: { img?: string } } })?.supportedurls ||
                    res;
                const img = (source as { projectUrl?: { img?: string } })?.projectUrl?.img;
                if (img) setProjectImgBase(String(img).replace(/\/?$/, "/"));
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
            const data = await developerService.getNotifications({
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

    const handleView = (row: DeveloperNotificationItem) => {
        const projectId = getNotificationProjectId(row);
        if (!projectId) {
            toast.error("Unavailable", "Project ID not found for this notification.");
            return;
        }
        const notificationId = row.id?.trim();
        if (notificationId && !row.isRead) {
            void developerService.markNotificationAsRead(notificationId);
        }
        navigate(
            `/developer/revenue-details?projectId=${encodeURIComponent(projectId)}`,
        );
    };

    const handleDelete = async (id: string) => {
        if (deletingId) return;
        setDeletingId(id);
        try {
            await developerService.deleteNotifications([id]);
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
                <DeveloperHeader title="Notification" showBack={false} onBackClick={() => { }} />

                <div className="rounded-[20px] bg-[#111111] border border-[#2A2A2A] shadow-xl min-w-0 md:p-[30px] p-[20px] flex flex-col gap-[24px]">
                    <div className="flex items-center flex-wrap justify-between gap-[12px]">
                        <div className="flex items-center gap-[10px] bg-[#171717] border border-[#2A2A2A] rounded-full px-[16px] h-[40px] w-full lg:max-w-[320px] focus-within:border-[#C9A96E] transition-colors">
                            <SearchIcon className="text-[#A89880] shrink-0" />
                            <input
                                type="search"
                                placeholder="Search here"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full bg-transparent text-[13px] font-[Regular] text-[#F5F0E8] placeholder:text-[#6B6259] focus:outline-none"
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
                                        className={`rounded-full px-[18px] h-[36px] text-[12px] font-[SemiBold] transition-all cursor-pointer ${selectedValue === tab.value
                                            ? "bg-[#C9A96E] text-[#0A0A0A] font-[Bold] shadow-md"
                                            : "bg-[#171717] border border-[#2A2A2A] text-[#A89880] hover:text-[#F5F0E8] hover:border-[#C9A96E]/40"
                                            }`}
                                    >
                                        {tab.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto w-full scrollbar-hide">
                        <div className="min-w-[1000px] rounded-[16px] border border-[#2A2A2A] overflow-hidden bg-[#111111]">
                            <div className="grid grid-cols-[40px_1.4fr_1fr_1.6fr_1fr_0.9fr_72px] gap-2 items-center px-[16px] py-[14px] bg-[#171717] border-b border-[#2A2A2A]">
                                <div className="flex justify-center">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        disabled={notifications.length === 0}
                                        className="h-[15px] w-[15px] rounded border border-[#2A2A2A] bg-[#0A0A0A] accent-[#C9A96E] cursor-pointer disabled:opacity-40"
                                    />
                                </div>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Project details</p>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Title</p>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Message</p>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Deal amount</p>
                                <p className="text-[12px] font-[Bold] text-[#A89880] uppercase tracking-wider">Date</p>
                                <span className="sr-only">Actions</span>
                            </div>

                            {!isLoading && notifications.length === 0 ? (
                                <div className="px-[14px] py-[36px] text-center">
                                    <p className="text-[15px] font-[SemiBold] text-[#F5F0E8]">
                                        No notifications found
                                    </p>
                                    <p className="mt-[6px] text-[13px] font-[Regular] text-[#A89880]">
                                        {search.trim() || (selectedValue && selectedValue !== "all")
                                            ? "Try changing the date filter or search."
                                            : "You have no notifications yet."}
                                    </p>
                                </div>
                            ) : (
                                notifications.map((row, index) => {
                                    const meta = row.metadata;
                                    const projectName =
                                        meta?.projectName?.trim() || "--/--";
                                    const imageUrl =
                                        toProjectImageUrl(meta?.image, projectImgBase) || homeimg;

                                    return (
                                        <div
                                            key={row.id}
                                            className={`grid grid-cols-[40px_1.4fr_1fr_1.6fr_1fr_0.9fr_48px] gap-2 items-center px-[16px] py-[14px] hover:bg-[#171717]/60 transition-colors ${index !== notifications.length - 1
                                                ? "border-b border-[#2A2A2A]"
                                                : ""
                                                }`}
                                        >
                                            <div className="flex justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(row.id)}
                                                    onChange={() => toggleRow(row.id)}
                                                    className="h-[15px] w-[15px] rounded border border-[#2A2A2A] bg-[#0A0A0A] accent-[#C9A96E] cursor-pointer"
                                                />
                                            </div>

                                            <div className="flex items-center gap-[12px] min-w-0">
                                                <div className="w-[56px] h-[56px] rounded-[8px] overflow-hidden shrink-0 bg-[#171717] border border-[#2A2A2A]">
                                                    <img
                                                        src={imageUrl}
                                                        alt={projectName}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.currentTarget.src = homeimg;
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-[6px] min-w-0">
                                                    <p className="text-[13px] font-[Bold] text-[#F5F0E8] leading-[1.3] truncate">
                                                        {projectName}
                                                    </p>
                                                    <span
                                                        className={`inline-flex w-fit items-center rounded-full px-[10px] h-[22px] text-[10px] font-[SemiBold] border ${row.isRead
                                                            ? "bg-[#4ADE80]/10 text-[#4ADE80] border-[#4ADE80]/30"
                                                            : "bg-[#C9A96E]/10 text-[#C9A96E] border-[#C9A96E]/30"
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
                                                    <p className="text-[12px] font-[Regular] text-[#F5F0E8] truncate cursor-default">
                                                        {row.title?.trim() || "--/--"}
                                                    </p>
                                                </HoverTooltip>
                                            </div>
                                            <div className="min-w-0">
                                                <HoverTooltip
                                                    content={row.message?.trim() || "--/--"}
                                                >
                                                    <p className="text-[12px] font-[Regular] text-[#A89880] truncate cursor-default">
                                                        {row.message?.trim() || "--/--"}
                                                    </p>
                                                </HoverTooltip>
                                            </div>
                                            <p className="text-[12px] font-[Regular] text-[#F5F0E8]">
                                                {formatDealAmount(meta?.dealAmount, meta?.currency)}
                                            </p>
                                            <p className="text-[12px] font-[Regular] text-[#A89880]">
                                                {formatCreatedAt(row.createdAt)}
                                            </p>
                                            <div className="flex items-center justify-center gap-[4px]">
                                                <button
                                                    type="button"
                                                    onClick={() => handleView(row)}
                                                    disabled={!getNotificationProjectId(row)}
                                                    className="cursor-pointer p-[8px] rounded-[8px] bg-[#171717] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-[#A89880] hover:text-[#C9A96E] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                    aria-label="View"
                                                >
                                                    <EyeDarkIcon width={18} height={18} />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={deletingId === row.id}
                                                    onClick={() => void handleDelete(row.id)}
                                                    className="cursor-pointer p-[8px] rounded-[8px] bg-[#171717] hover:bg-[#F87171]/20 border border-[#2A2A2A] text-[#F87171] transition-colors disabled:opacity-40"
                                                    aria-label="Delete"
                                                >
                                                    <TrashIcon width={18} height={18} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="px-[20px] md:px-[20px] pb-[10px]">
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

export default DeveloperNotification;
