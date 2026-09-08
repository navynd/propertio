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
    createdDate: string;
    units: number;
    priceAed: number;
};

const subTabs: ProjectTab[] = ["All", "New", "Off-plan"];

const projectRows: ProjectRow[] = [
    { id: 1, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "New", createdDate: "30 May 2025", units: 120, priceAed: 1500000 },
    { id: 2, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "off-plan", createdDate: "30 May 2025", units: 120, priceAed: 1500000 },
    { id: 3, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "New", createdDate: "30 May 2025", units: 120, priceAed: 1500000 },
    { id: 4, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "off-plan", createdDate: "30 May 2025", units: 120, priceAed: 1500000 },
    { id: 5, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "New", createdDate: "30 May 2025", units: 120, priceAed: 1500000 },

];

const UnPublished = () => {
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

        <div className="rounded-[15px] bg-white  min-w-0">
            {/* Sub-tabs */}
            <div className="md:p-[0px_30px] m-[0px_0px] border-b border-[rgba(34,34,34,0.10)] flex gap-[28px]">
                {subTabs.map((tab) => {
                    const active = activeSubTab === tab;
                    return (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveSubTab(tab)}
                            className={`relative p-[20px_30px] text-[13px] font-[Regular] transition-colors ${active ? "text-[#0832AE] font-[SemiBold]" : "text-[#222]"
                                }`}
                        >
                            {tab}
                            {active && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#0832AE]" />}
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="md:p-[30px] p-[20px]">
                <div className=" overflow-x-auto w-full scrollbar-hide">
                    <div className="min-w-[980px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                        <div className="grid grid-cols-[40px_2fr_1fr_1fr_1.2fr_1.2fr_1.2fr] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
                            <div className="flex justify-center">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAllVisible}
                                    className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] text-[#3182CE] accent-[#222] cursor-pointer"
                                />
                            </div>
                            <p className="text-[14px] font-[Bold] text-[#222]">Project Details</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Project status</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Created date</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Available units</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Price</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
                        </div>

                        {paginatedRows.map((row, index) => (
                            <div
                                key={row.id} className={`grid grid-cols-[40px_2fr_1fr_1fr_1.2fr_1.2fr_1.2fr] gap-2 items-center px-[14px] py-[12px] ${index !== paginatedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}>
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
                                        className={`inline-flex items-center rounded-[5px] p-[6px_10px] text-[11px] font-[SemiBold] capitalize ${row.status === "New"
                                            ? "bg-[rgba(0,166,99,0.10)] text-[#00A663]"
                                            : "bg-[rgba(234,57,52,0.10)] text-[#EA3934]"
                                            }`}
                                    >
                                        {row.status}
                                    </span>
                                </div>
                                <p className="text-[12px] font-[Regular] text-[#222]">{row.createdDate}</p>
                                <div className="flex items-center">
                                    <span className="inline-flex items-center rounded-[6px] border border-[rgba(34,34,34,0.10)] p-[6px_10px] text-[12px] font-[SemiBold] text-[#222] leading-none">
                                        {row.units}
                                    </span>
                                </div>
                                <p className="text-[12px] font-[Regular] text-[#222] whitespace-nowrap">{formatPrice(row.priceAed)}</p>
                                <div className="flex items-center justify-end gap-[6px]">
                                    <button onClick={() => navigate("/developer/unpublished-project-details")} type="button" className="cursor-pointer p-[6px] rounded-[8px] text-[#707070]" aria-label="View">
                                        <EyeDarkIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px] text-[#707070]" aria-label="Team">
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

export default UnPublished;
