import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { DownArrowIcon, EditIcon, PlusUserIcon, SearchIcon, TrashIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Pagenation from "../../../components/Pagenation/Pagenation";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { jobTitlesService } from "../../../services/jobTitlesService";
import type { JobTitleListCounts, JobTitleRecord } from "../../../types/api";
import JobTitleModal, { type JobTitleFormPayload } from "./JobTitleModal";
import { formatJobTitleDate } from "./jobTitleData";

const tableGrid = "grid-cols-[1.2fr_1.6fr_0.75fr_0.9fr_0.7fr]";
const ITEMS_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 400;
const statusFilterOptions = ["all", "active", "inactive"] as const;
type StatusFilter = (typeof statusFilterOptions)[number];

const statusBadgeClass =
    "rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center p-[6px_10px] text-[12px] font-[SemiBold] whitespace-nowrap";

function StatusBadge({ isActive }: { isActive: boolean }) {
    if (isActive) {
        return (
            <span className={`${statusBadgeClass} bg-[#00A663] text-[#FFF]`}>
                Active
            </span>
        );
    }
    return (
        <span className={`${statusBadgeClass} bg-[#E80808] text-[#FFF]`}>
            Inactive
        </span>
    );
}

function StatCards({ counts }: { counts?: JobTitleListCounts }) {
    const stats = [
        { label: "Total", value: counts?.totalJobTitles ?? 0, accent: "#222" },
        { label: "Active", value: counts?.activeJobTitles ?? 0, accent: "#00A663" },
        { label: "Inactive", value: counts?.inactiveJobTitles ?? 0, accent: "#EA3934" },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px] mb-[24px]">
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

function JobTitle() {
    const { push } = useToast();
    const [rows, setRows] = useState<JobTitleRecord[]>([]);
    const [listCounts, setListCounts] = useState<JobTitleListCounts>();
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<JobTitleRecord | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const statusRef = useRef<HTMLDivElement>(null);

    const statusLabel =
        statusFilter === "all"
            ? "All"
            : statusFilter === "active"
                ? "Active"
                : "Inactive";

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
            setCurrentPage(1);
        }, SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    useEffect(() => {
        const onMouseDown = (e: MouseEvent) => {
            if (statusRef.current?.contains(e.target as Node)) return;
            setIsStatusOpen(false);
        };
        document.addEventListener("mousedown", onMouseDown);
        return () => document.removeEventListener("mousedown", onMouseDown);
    }, []);

    const fetchRows = useCallback(async () => {
        setLoading(true);
        try {
            const data = await jobTitlesService.listJobTitles({
                page: currentPage,
                limit: ITEMS_PER_PAGE,
                search: debouncedSearch || undefined,
                isActive:
                    statusFilter === "active"
                        ? true
                        : statusFilter === "inactive"
                            ? false
                            : undefined,
            });
            setRows(data.jobTitles ?? []);
            setTotalPages(Math.max(1, data.pagination?.totalPages ?? 1));
            setTotalItems(data.pagination?.totalJobTitles ?? 0);
            setListCounts(data.counts);
        } catch (error) {
            push({
                type: "error",
                title: "Failed to load job titles",
                description: getApiErrorMessage(error, "Unable to fetch job titles."),
            });
            setRows([]);
            setTotalPages(1);
            setTotalItems(0);
            setListCounts(undefined);
        } finally {
            setLoading(false);
        }
    }, [currentPage, debouncedSearch, statusFilter, push]);

    useEffect(() => {
        void fetchRows();
    }, [fetchRows, refreshKey]);

    const openAddModal = () => {
        setEditingRecord(null);
        setIsModalOpen(true);
    };

    const openEditModal = (record: JobTitleRecord) => {
        setEditingRecord(record);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRecord(null);
    };

    const handleSave = async (payload: JobTitleFormPayload, editingId?: string) => {
        try {
            if (editingId) {
                await jobTitlesService.updateJobTitle(editingId, payload);
                push({
                    type: "success",
                    title: "Job title updated",
                    description: "Changes saved successfully.",
                });
            } else {
                await jobTitlesService.createJobTitle(payload);
                push({
                    type: "success",
                    title: "Job title created",
                    description: "New job title added successfully.",
                });
            }
            setRefreshKey((k) => k + 1);
        } catch (error) {
            push({
                type: "error",
                title: editingId ? "Update failed" : "Create failed",
                description: getApiErrorMessage(error, "Could not save job title."),
            });
        }
    };

    const handleDelete = async (record: JobTitleRecord) => {
        const result = await Swal.fire({
            title: "Delete job title?",
            text: `Remove "${record.title}"? This cannot be undone.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Delete",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#EA3934",
            reverseButtons: true,
        });
        if (!result.isConfirmed) return;

        try {
            await jobTitlesService.deleteJobTitle(record._id);
            push({
                type: "success",
                title: "Job title deleted",
                description: `${record.title} has been removed.`,
            });
            setRefreshKey((k) => k + 1);
        } catch (error) {
            push({
                type: "error",
                title: "Delete failed",
                description: getApiErrorMessage(error, "Could not delete job title."),
            });
        }
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Job Titles" showBack={false} onBackClick={() => { }} />

            <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
                <StatCards counts={listCounts} />

                <div className="flex flex-wrap items-center justify-between gap-[10px] mb-[24px]">
                    <div className="flex flex-wrap items-center gap-[10px] flex-1 min-w-0">
                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[40px] w-full md:w-[280px]">
                            <SearchIcon className="text-[#707070] shrink-0" />
                            <input
                                type="search"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Search title or description"
                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                            />
                        </div>

                        <div className="relative shrink-0" ref={statusRef}>
                            <button
                                type="button"
                                onClick={() => setIsStatusOpen((o) => !o)}
                                className="flex items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.12)] bg-white rounded-[15px] px-[14px] h-[40px] cursor-pointer min-w-[140px]"
                            >
                                <span className="text-[#222] text-[13px] font-[Regular] truncate">
                                    Status: {statusLabel}
                                </span>
                                <DownArrowIcon
                                    width={11}
                                    height={7}
                                    className={`shrink-0 transition-transform ${isStatusOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {isStatusOpen && (
                                <div className="absolute left-0 top-[48px] z-30 min-w-[160px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white py-[6px] shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
                                    {statusFilterOptions.map((opt) => (
                                        <button
                                            key={opt}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setStatusFilter(opt);
                                                setCurrentPage(1);
                                                setIsStatusOpen(false);
                                            }}
                                            className={`w-full px-[14px] py-[9px] text-left text-[13px] font-[Medium] hover:bg-[#F5F5F5] capitalize ${statusFilter === opt ? "text-[#6A3CA8] bg-[#F5F5F5]" : "text-[#222]"}`}
                                        >
                                            {opt === "all" ? "All" : opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openAddModal}
                        className="h-[40px] px-[18px] rounded-[15px] bg-[#6A3CA8] text-white text-[13px] font-[SemiBold] inline-flex items-center gap-[8px] cursor-pointer shrink-0"
                    >
                        <PlusUserIcon width={16} height={16} className="text-white" />
                        Add Job Title
                    </button>
                </div>

                <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
                    <div className="min-w-[900px]">
                        <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                            <div
                                className={`grid ${tableGrid} gap-[20px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}
                            >
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Title</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Description</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                                {/* <p className="text-[14px] font-[SemiBold] text-[#222]">Created</p> */}
                                <p className="text-[14px] font-[SemiBold] text-[#222]">updatedAt</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                            </div>

                            <div>
                                {loading ? (
                                    <div className="px-[14px] py-[30px] flex justify-center">
                                        <Loader size={80} />
                                    </div>
                                ) : rows.length === 0 ? (
                                    <p className="px-[14px] py-[24px] text-[13px] text-[#707070] text-center">
                                        No job titles found
                                    </p>
                                ) : (
                                    rows.map((row, idx) => (
                                        <div
                                            key={row._id}
                                            className={`grid ${tableGrid} gap-[20px] items-center px-[14px] py-[12px] ${idx !== rows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                        >
                                            <p className="text-[12px] font-[SemiBold] text-[#222] truncate">
                                                {row.title}
                                            </p>
                                            <p className="text-[12px] font-[Regular] text-[#707070] truncate">
                                                {row.description?.trim() || "—"}
                                            </p>
                                            <StatusBadge isActive={row.isActive !== false} />
                                            {/* <p className="text-[12px] font-[Regular] text-[#222] truncate">
                                                {formatJobTitleDate(row.createdAt)}
                                            </p> */}
                                            <p className="text-[12px] font-[Regular] text-[#222] truncate">
                                                {formatJobTitleDate(row.updatedAt)}
                                            </p>
                                            <div className="flex items-center justify-start gap-[10px]">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(row)}
                                                    className="cursor-pointer p-[6px]"
                                                    aria-label="Edit"
                                                >
                                                    <EditIcon width={20} height={20} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cursor-pointer p-[6px]"
                                                    aria-label="Delete"
                                                    onClick={() => handleDelete(row)}
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
                </div>

                <Pagenation
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={ITEMS_PER_PAGE}
                    onPageChange={setCurrentPage}
                />
            </div>

            <JobTitleModal
                isOpen={isModalOpen}
                onClose={closeModal}
                editingRecord={editingRecord}
                onSave={handleSave}
            />
        </div>
    );
}

export default JobTitle;
