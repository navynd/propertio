import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchIcon, PdfIcon, EditIcon, DownloadIcon } from "../../../../components/CustomFile/icons";
import PropertyUrlModal from "./PropertyUrlModal";
import { agentService, type AgentAllocatedPropertyItem } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";

type RowBase = {
    id: string;
    propertyTitle: string;
    pdfFileName: string;
    /** Relative path or full URL from API (`document` field) */
    documentPath?: string | null;
    receivedDate: string;
};

type NewRow = RowBase & { postedUrl?: string };
type UploadedRow = RowBase & { uploadedDate: string; propertyUrl: string };

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const getDocFileName = (documentUrl?: string | null) => {
    if (!documentUrl) return "-";
    const parts = documentUrl.split("/");
    return parts[parts.length - 1] || "-";
};

const mapPendingRow = (item: AgentAllocatedPropertyItem): NewRow => ({
    id: item.id,
    propertyTitle: item.title || "-",
    pdfFileName: getDocFileName(item.document),
    documentPath: item.document ?? null,
    receivedDate: formatDate(item.sentAt),
    postedUrl: item.listingLink || "",
});

const mapCompletedRow = (item: AgentAllocatedPropertyItem): UploadedRow => ({
    id: item.id,
    propertyTitle: item.title || "-",
    pdfFileName: getDocFileName(item.document),
    documentPath: item.document ?? null,
    receivedDate: formatDate(item.sentAt),
    uploadedDate: formatDate(item.completedAt),
    propertyUrl: item.listingLink || "-",
});

/** Allocated property PDFs are stored under the agency document CDN (see `supportedUrls.agencyUrl.doc`). */
const buildAllocationDocumentUrl = (docBase: string, apiDocument?: string | null) => {
    const raw = apiDocument?.trim();
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    if (!docBase.trim()) return null;
    return `${docBase.replace(/\/?$/, "/")}${raw.replace(/^\/+/, "")}`;
};

const AllocatedProperty = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [tab, setTab] = useState<"New" | "Uploaded">("New");
    const [search, setSearch] = useState(() => searchParams.get("search")?.trim() || "");
    const [postedUrls, setPostedUrls] = useState<Record<string, string>>({});
    const [uploadedUrls, setUploadedUrls] = useState<Record<string, string>>({});
    const [editingUploadedRowId, setEditingUploadedRowId] = useState<string | null>(null);
    const [pendingRows, setPendingRows] = useState<NewRow[]>([]);
    const [completedRows, setCompletedRows] = useState<UploadedRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCompletingId, setIsCompletingId] = useState<string | null>(null);
    const [isEditingUploadedSaving, setIsEditingUploadedSaving] = useState(false);
    const [agencyDocBaseUrl, setAgencyDocBaseUrl] = useState("");

    useEffect(() => {
        let mounted = true;
        agentService
            .getSupportedUrlsMasterData()
            .then((res) => {
                const anyRes = res as unknown as {
                    supportedUrls?: { agencyUrl?: { doc?: string } };
                    supportedurls?: { agencyUrl?: { doc?: string } };
                };
                const doc =
                    anyRes?.supportedUrls?.agencyUrl?.doc ||
                    anyRes?.supportedurls?.agencyUrl?.doc ||
                    "";
                if (mounted) setAgencyDocBaseUrl(doc.trim());
            })
            .catch(() => {
                if (mounted) setAgencyDocBaseUrl("");
            });
        return () => {
            mounted = false;
        };
    }, []);

    const canDownloadRow = (documentPath?: string | null) => {
        const t = documentPath?.trim() ?? "";
        if (!t) return false;
        if (t.startsWith("http://") || t.startsWith("https://")) return true;
        return agencyDocBaseUrl.trim().length > 0;
    };

    const downloadAllocationPdf = (documentPath?: string | null, displayFileName?: string) => {
        const url = buildAllocationDocumentUrl(agencyDocBaseUrl, documentPath);
        if (!url) {
            toast.error(
                "Download unavailable",
                documentPath ? "Could not resolve document URL. Try again later." : "No PDF attached to this allocation.",
            );
            return;
        }
        const safeName =
            displayFileName && displayFileName !== "-"
                ? displayFileName.replace(/[^\w.\-()[\] ]+/g, "_")
                : "property-document.pdf";
        const a = window.document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.download = safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`;
        window.document.body.appendChild(a);
        a.click();
        a.remove();
    };

    useEffect(() => {
        const urlSearch = searchParams.get("search")?.trim() || "";
        setSearch((current) => (current === urlSearch ? current : urlSearch));
    }, [searchParams]);

    useEffect(() => {
        let mounted = true;
        const status = tab === "New" ? "pending" : "completed";
        setIsLoading(true);
        agentService
            .getAllocatedProperties({
                status,
                search,
                page: 1,
                limit: 10,
            })
            .then((res) => {
                if (!mounted) return;
                if (tab === "New") {
                    const rows = (res.allocations || []).map(mapPendingRow);
                    setPendingRows(rows);
                    setPostedUrls(
                        rows.reduce<Record<string, string>>((acc, row) => {
                            acc[row.id] = row.postedUrl || "";
                            return acc;
                        }, {})
                    );
                } else {
                    const rows = (res.allocations || []).map(mapCompletedRow);
                    setCompletedRows(rows);
                    setUploadedUrls(
                        rows.reduce<Record<string, string>>((acc, row) => {
                            acc[row.id] = row.propertyUrl || "";
                            return acc;
                        }, {})
                    );
                }
            })
            .catch((error: unknown) => {
                const message = (error as { message?: string })?.message || "Failed to fetch allocated properties.";
                toast.error("Load failed", message);
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [tab, search]);

    const visibleNewRows = useMemo(() => pendingRows, [pendingRows]);

    const visibleUploadedRows = useMemo(() => {
        return completedRows.map((r) => ({ ...r, propertyUrl: uploadedUrls[r.id] ?? r.propertyUrl }));
    }, [completedRows, uploadedUrls]);

    const editingUploadedRow = useMemo(() => {
        if (editingUploadedRowId == null) return null;
        const base = completedRows.find((r) => r.id === editingUploadedRowId);
        if (!base) return null;
        return { ...base, propertyUrl: uploadedUrls[base.id] ?? base.propertyUrl };
    }, [editingUploadedRowId, uploadedUrls, completedRows]);

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col gap-[30px]">
                {/* Top tabs + search */}
                <div className="flex flex-wrap items-center justify-between gap-[12px]">
                    <div className="flex items-center gap-[10px]">
                        {(["New", "Uploaded"] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={`cursor-pointer rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${tab === t ? "bg-[#222] text-white" : "bg-white border border-[#EAEAEA] text-[#222]"}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] w-full sm:w-[320px]">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                            type="search"
                            placeholder="Search here"
                            value={search}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSearch(value);
                                const next = new URLSearchParams(searchParams);
                                const trimmed = value.trim();
                                if (trimmed) next.set("search", trimmed);
                                else next.delete("search");
                                setSearchParams(next, { replace: true });
                            }}
                            className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto w-full scrollbar-hide">
                    <div className="min-w-[1480px]">
                        <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                            {tab === "Uploaded" ? (
                                <>
                                    <div className="grid grid-cols-[1fr_1.2fr_0.9fr_0.9fr_1.8fr_0.4fr] gap-[40px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property title</p>
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">PDF file</p>
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Received date</p>
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Uploaded date</p>
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property URL</p>
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                                    </div>

                                    {visibleUploadedRows.map((row, idx) => (
                                        <div
                                            key={row.id}
                                            className={`grid grid-cols-[1fr_1.2fr_0.9fr_0.9fr_1.8fr_0.4fr] gap-[20px] items-center px-[14px] py-[12px] ${idx !== visibleUploadedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                        >
                                            <p className="text-[12px] font-[Bold] text-[#222] w-[200px] truncate">{row.propertyTitle}</p>
                                            <div className="min-w-0 flex items-center gap-[8px]">
                                                <PdfIcon width={16} height={16} />
                                                <p className="text-[12px] font-[Regular] text-[#222] w-[200px] truncate">{row.pdfFileName}</p>
                                            </div>
                                            <p className="text-[12px] font-[Regular] text-[#222]">{row.receivedDate}</p>
                                            <p className="text-[12px] font-[Regular] text-[#222]">{row.uploadedDate}</p>
                                            <div className="min-w-0 inline-flex items-center h-[21px] rounded-[5px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px]">
                                                <span className="  text-[12px] font-[Regular] text-[#707070] truncate">
                                                    {uploadedUrls[row.id] ?? row.propertyUrl}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-start gap-[6px]">
                                                <button
                                                    type="button"
                                                    aria-label="Download PDF"
                                                    disabled={!canDownloadRow(row.documentPath)}
                                                    onClick={() =>
                                                        downloadAllocationPdf(row.documentPath, row.pdfFileName)
                                                    }
                                                    className="cursor-pointer inline-flex items-center justify-start p-[6px] w-fit disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <DownloadIcon width={15} height={15} fill="#707070" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cursor-pointer inline-flex items-center justify-start p-[6px] w-fit"
                                                    aria-label="Edit"
                                                    onClick={() => setEditingUploadedRowId(row.id)}
                                                >
                                                    <EditIcon width={20} height={20} />
                                                </button>
                                            </div>

                                        </div>
                                    ))}
                                    {visibleUploadedRows.length === 0 && !isLoading && (
                                        <div className="px-[14px] py-[14px] text-[12px] text-[#707070]">No uploaded properties found.</div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-[1.2fr_2fr_1.2fr_2.6fr_0.6fr] gap-[20px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Property title</p>
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">PDF file</p>
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Received date</p>
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Paste property link</p>
                                        <p className="text-[14px] font-[SemiBold] text-[#222]">Action</p>
                                    </div>

                                    {visibleNewRows.map((row, idx) => (
                                        <div
                                            key={row.id}
                                            className={`grid grid-cols-[1.2fr_2fr_1.2fr_2.6fr_0.6fr] gap-[20px] items-center px-[14px] py-[12px] ${idx !== visibleNewRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                        >
                                            <p className="text-[12px] font-[Bold] text-[#222] w-[200px] truncate">{row.propertyTitle}</p>
                                            <div className="min-w-0 flex items-center gap-[8px]">
                                                <PdfIcon width={16} height={16} />
                                                <p className="text-[12px] font-[Regular] text-[#222] w-[200px] truncate">{row.pdfFileName}</p>
                                            </div>
                                            <p className="text-[12px] font-[Regular] text-[#222]">{row.receivedDate}</p>
                                            <div className="flex items-center justify-start gap-[6px]">
                                                <div className="min-w-0">
                                                    <input
                                                        value={postedUrls[row.id] ?? ""}
                                                        onChange={(e) => setPostedUrls((prev) => ({ ...prev, [row.id]: e.target.value }))}
                                                        placeholder="posted url"
                                                        className="h-[33px] w-[330px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    disabled={isCompletingId === row.id}
                                                    onClick={async () => {
                                                        const listingLink = (postedUrls[row.id] || "").trim();
                                                        if (!listingLink) {
                                                            toast.error("Validation required", "Please paste property link before completing.");
                                                            return;
                                                        }
                                                        setIsCompletingId(row.id);
                                                        try {
                                                            await agentService.completeAllocatedProperty(row.id, { listingLink });
                                                            toast.success("Completed", "Property marked as uploaded.");
                                                            setPendingRows((prev) => prev.filter((item) => item.id !== row.id));
                                                            if (tab === "New") {
                                                                const completed: UploadedRow = {
                                                                    id: row.id,
                                                                    propertyTitle: row.propertyTitle,
                                                                    pdfFileName: row.pdfFileName,
                                                                    documentPath: row.documentPath,
                                                                    receivedDate: row.receivedDate,
                                                                    uploadedDate: formatDate(new Date().toISOString()),
                                                                    propertyUrl: listingLink,
                                                                };
                                                                setCompletedRows((prev) => [completed, ...prev]);
                                                                setUploadedUrls((prev) => ({ ...prev, [row.id]: listingLink }));
                                                            }
                                                        } catch (error: unknown) {
                                                            const message =
                                                                (error as { message?: string })?.message ||
                                                                "Failed to complete allocation.";
                                                            toast.error("Complete failed", message);
                                                        } finally {
                                                            setIsCompletingId(null);
                                                        }
                                                    }}
                                                    className="h-[33px] w-auto px-[15px] rounded-full bg-[#D4A373] text-white text-[12px] font-[SemiBold] cursor-pointer"
                                                >
                                                    {isCompletingId === row.id ? "Completing..." : "Complete"}
                                                </button>
                                            </div>
                                            <button
                                                type="button"
                                                aria-label="Download PDF"
                                                disabled={!canDownloadRow(row.documentPath)}
                                                onClick={() =>
                                                    downloadAllocationPdf(row.documentPath, row.pdfFileName)
                                                }
                                                className="cursor-pointer inline-flex items-center justify-start p-[6px] w-fit disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <DownloadIcon width={15} height={15} fill="#707070" />
                                            </button>
                                        </div>
                                    ))}
                                    {visibleNewRows.length === 0 && !isLoading && (
                                        <div className="px-[14px] py-[14px] text-[12px] text-[#707070]">No new properties found.</div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {(isLoading || isCompletingId !== null || isEditingUploadedSaving) && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}

            <PropertyUrlModal
                isOpen={editingUploadedRowId != null}
                value={editingUploadedRow?.propertyUrl}
                onClose={() => setEditingUploadedRowId(null)}
                isSaving={isEditingUploadedSaving}
                onSave={async (nextUrl) => {
                    if (editingUploadedRowId == null) return;
                    const listingLink = nextUrl.trim();
                    if (!listingLink) {
                        toast.error("Validation required", "Please enter property URL.");
                        return;
                    }
                    setIsEditingUploadedSaving(true);
                    try {
                        await agentService.completeAllocatedProperty(editingUploadedRowId, { listingLink });
                        setUploadedUrls((prev) => ({ ...prev, [editingUploadedRowId]: listingLink }));
                        setCompletedRows((prev) =>
                            prev.map((row) =>
                                row.id === editingUploadedRowId ? { ...row, propertyUrl: listingLink } : row
                            )
                        );
                        toast.success("Saved", "Property URL updated successfully.");
                        setEditingUploadedRowId(null);
                    } catch (error: unknown) {
                        const message =
                            (error as { message?: string })?.message || "Failed to update property URL.";
                        toast.error("Update failed", message);
                    } finally {
                        setIsEditingUploadedSaving(false);
                    }
                }}
            />
        </div>
    );
};

export default AllocatedProperty;
