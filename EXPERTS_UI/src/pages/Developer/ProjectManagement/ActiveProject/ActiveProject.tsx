import { useEffect, useState } from "react";
import homeimg from "../../../../assets/img/home.png";
import { LocationIcon, EyeDarkIcon, MultiUserIcon, EditIcon, TrashIcon, } from "../../../../components/CustomFile/icons";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import { useNavigate } from "react-router-dom";
type ProjectTab = "All" | "New" | "Off-plan";
type ProjectStatus = "New" | "off-plan";

type ProjectRow = {
    id: number;
    name: string;
    location: string;
    status: ProjectStatus;
    projectAnnouncementDate: string;
    progressStatus: string;
    expectedCompletionDate: string;
};

const subTabs: ProjectTab[] = ["All", "New", "Off-plan"];

const projectRows: ProjectRow[] = [
    { id: 1, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "New", projectAnnouncementDate: "30 May 2025", progressStatus: 'Construction started', expectedCompletionDate: '30 May 2025' },
    { id: 2, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "off-plan", projectAnnouncementDate: "30 May 2025", progressStatus: 'Booking open', expectedCompletionDate: '30 May 2025' },
    { id: 3, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "New", projectAnnouncementDate: "30 May 2025", progressStatus: 'Project Announced', expectedCompletionDate: '30 May 2025' },
    { id: 4, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "off-plan", projectAnnouncementDate: "30 May 2025", progressStatus: 'Construction started', expectedCompletionDate: '30 May 2025' },
    { id: 5, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "New", projectAnnouncementDate: "30 May 2025", progressStatus: 'Booking open', expectedCompletionDate: '30 May 2025' },

];

const ActiveProject = () => {
    const [activeSubTab, setActiveSubTab] = useState<ProjectTab>("All");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const navigate = useNavigate();
    const visibleRows = projectRows.filter((row) => {
        if (activeSubTab === "All") return true;
        if (activeSubTab === "New") return row.status === "New";
        return row.status === "off-plan";
    });

    const totalPages = Math.max(1, Math.ceil(visibleRows.length / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRows = visibleRows.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeSubTab]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const allVisibleSelected = paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.id));

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

    const formatPrice = (n: number) => `${n.toLocaleString("en-US")} AED`;

    return (

        <div className="rounded-[20px] bg-white min-w-0">
            {/* Sub-tabs */}
            <div className="px-6 border-b border-[#F1F5F9] flex gap-6">
                {subTabs.map((tab) => {
                    const active = activeSubTab === tab;
                    return (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveSubTab(tab)}
                            className={`relative py-3.5 px-2 text-[13px] font-[SemiBold] cursor-pointer transition-colors ${active ? "text-[#0F172A]" : "text-[#94A3B8] hover:text-[#475569]"
                                }`}
                        >
                            {tab}
                            {active && <span className="absolute left-0 right-0 bottom-0 h-[2.5px] rounded-t-full bg-[#D4A373]" />}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="p-6">
                <div className="overflow-x-auto w-full scrollbar-hide">
                    <div className="min-w-[1100px] rounded-[16px] border border-[#E2E8F0] overflow-hidden bg-white shadow-sm">
                        <div className="grid grid-cols-[40px_2.4fr_1.4fr_2fr_1.6fr_2fr_1.2fr] gap-3 items-center px-4 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0]">
                            <div className="flex justify-center">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAllVisible}
                                    className="h-4 w-4 rounded border-slate-300 text-[#D4A373] accent-[#D4A373] cursor-pointer"
                                />
                            </div>
                            <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Project Details</p>
                            <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Status</p>
                            <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Announced</p>
                            <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Progress</p>
                            <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Expected</p>
                            <p className="text-[12px] font-[Bold] text-[#475569] uppercase tracking-wider">Actions</p>
                        </div>

                        {paginatedRows.map((row, index) => (
                            <div
                                key={row.id} className={`grid grid-cols-[40px_2.4fr_1.4fr_2fr_1.6fr_2fr_1.2fr] gap-2 items-center px-[14px] py-[12px] ${index !== paginatedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}>
                                <div className="flex justify-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(row.id)}
                                        onChange={() => toggleRow(row.id)}
                                        className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] text-[#3182CE] accent-[#222] cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center gap-[12px] min-w-0">
                                    <div className="w-[56px] h-[56px] rounded-[8px] overflow-hidden shrink-0">
                                        <img src={homeimg} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-[Bold] text-[#222] leading-[1.3] mb-[4px] truncate">{row.name}</p>
                                        <p className="text-[12px] font-[Regular] text-[#707070] flex items-center gap-[5px] leading-[1.2]">
                                            <span className="inline-flex shrink-0">
                                                <LocationIcon width={11} height={15} />
                                            </span>
                                            <span className="truncate">{row.location}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex">
                                    <span
                                        className={`inline-flex items-center h-[21px] rounded-[5px] p-[6px_10px] text-[11px] font-[SemiBold] capitalize ${row.status === "New"
                                            ? "bg-[rgba(0,166,99,0.10)] text-[#00A663]"
                                            : "bg-[rgba(212, 163, 115,0.10)] text-[#D4A373]"
                                            }`}
                                    >
                                        {row.status}
                                    </span>
                                </div>
                                <p className="text-[12px] font-[Regular] text-[#222]">{row.projectAnnouncementDate}</p>
                                <div className="flex items-center">
                                    <span className="inline-flex items-center rounded-[6px] border border-[rgba(34,34,34,0.10)] p-[6px_10px] text-[12px] font-[SemiBold] text-[#222] leading-none">
                                        {row.progressStatus}
                                    </span>
                                </div>
                                <p className="text-[12px] font-[Regular] text-[#222] whitespace-nowrap">{row.expectedCompletionDate}</p>
                                <div className="flex items-center justify-end gap-[6px]">
                                    <button onClick={() => navigate("/developer/active-project-details")} type="button" className="cursor-pointer p-[6px] rounded-[8px]  text-[#707070]" aria-label="View">
                                        <EyeDarkIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px]  text-[#707070]" aria-label="Team">
                                        <MultiUserIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px] text-[#707070]" aria-label="Edit">
                                        <EditIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px] text-[#E53E3E]" aria-label="Delete">
                                        <TrashIcon width={20} height={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            {/* Pagination */}
            <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
                <Pagenation
                    currentPage={currentPage}
                    totalItems={visibleRows.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>

        </div>
    );
};

export default ActiveProject;
