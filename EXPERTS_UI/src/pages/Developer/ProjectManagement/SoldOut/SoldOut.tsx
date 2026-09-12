import { useState } from "react";
import homeimg from "../../../../assets/img/home.png";
import { LocationIcon, EyeDarkIcon, MultiUserIcon, EditIcon, TrashIcon, } from "../../../../components/CustomFile/icons";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import { useNavigate } from "react-router-dom";

type ProjectStatus = "Sold out";

type ProjectRow = {
    id: number;
    name: string;
    location: string;
    status: ProjectStatus;
    createdDate: string;
    Progresstatus: string;
    ExCompletDate: string;
};

const projectRows: ProjectRow[] = [
    { id: 1, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "Sold out", createdDate: "30 May 2025", Progresstatus: 'Finished', ExCompletDate: '30 May 2025' },
    { id: 2, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "Sold out", createdDate: "30 May 2025", Progresstatus: 'Construction started', ExCompletDate: '30 May 2025' },
    { id: 3, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "Sold out", createdDate: "30 May 2025", Progresstatus: 'Project Announced', ExCompletDate: '30 May 2025' },
    { id: 4, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "Sold out", createdDate: "30 May 2025", Progresstatus: 'Finished', ExCompletDate: '30 May 2025' },
    { id: 5, name: "Omniyat Bespoke | Villa", location: "Dubai, Palm Jumeirah", status: "Sold out", createdDate: "30 May 2025", Progresstatus: 'Construction started', ExCompletDate: '30 May 2025' },

];

const SoldOut = () => {
    const navigate = useNavigate();
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const visibleRows = projectRows;



    const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.id));

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
                visibleRows.forEach((r) => next.delete(r.id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                visibleRows.forEach((r) => next.add(r.id));
                return next;
            });
        }
    };

    const formatPrice = (n: number) => `${n.toLocaleString("en-US")} AED`;

    return (

        <div className="rounded-[16px] bg-[#111111] border border-[#2A2A2A] min-w-0 overflow-hidden">
            {/* Table */}
            <div className="md:p-[30px] p-[20px]">
                <div className="overflow-x-auto w-full scrollbar-hide">
                    <div className="min-w-[980px] rounded-[16px] border border-[#2A2A2A] overflow-hidden bg-[#111111]">
                        <div className="grid grid-cols-[40px_2.2fr_1.2fr_2fr_1.8fr_1.8fr_1.2fr] gap-2 items-center px-[14px] py-[12px] bg-[#171717] border-b border-[#2A2A2A]">
                            <div className="flex justify-center">
                                <input
                                    type="checkbox"
                                    checked={allVisibleSelected}
                                    onChange={toggleSelectAllVisible}
                                    className="h-[15px] w-[15px] rounded border border-[#2A2A2A] accent-[#C9A96E] cursor-pointer"
                                />
                            </div>
                            <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Project Details</p>
                            <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Project status</p>
                            <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Project Announcement date</p>
                            <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Progress status</p>
                            <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Expected Completion date</p>
                            <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Actions</p>
                        </div>

                        {visibleRows.map((row, index) => (
                            <div
                                key={row.id} className={`grid grid-cols-[40px_2.2fr_1.2fr_2fr_1.8fr_1.8fr_1.2fr] gap-2 items-center px-[14px] py-[12px] hover:bg-[#171717]/60 transition-colors ${index !== visibleRows.length - 1 ? "border-b border-[#2A2A2A]" : ""}`}>
                                <div className="flex justify-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(row.id)}
                                        onChange={() => toggleRow(row.id)}
                                        className="h-[15px] w-[15px] rounded border border-[#2A2A2A] accent-[#C9A96E] cursor-pointer"
                                    />
                                </div>
                                <div className="flex items-center gap-[12px] min-w-0">
                                    <div className="w-[56px] h-[56px] rounded-[8px] overflow-hidden shrink-0 border border-[#2A2A2A] bg-[#171717]">
                                        <img src={homeimg} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[13px] font-[Bold] text-[#F5F0E8] leading-[1.3] mb-[4px] truncate">{row.name}</p>
                                        <p className="text-[12px] font-[Regular] text-[#A89880] flex items-center gap-[5px] leading-[1.2]">
                                            <span className="inline-flex shrink-0 text-[#C9A96E]">
                                                <LocationIcon width={11} height={15} />
                                            </span>
                                            <span className="truncate">{row.location}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex">
                                    <span
                                        className="inline-flex items-center rounded-[6px] h-[22px] px-2.5 text-[11px] font-[SemiBold] capitalize bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                    >
                                        {row.status}
                                    </span>
                                </div>
                                <p className="text-[12px] font-[Regular] text-[#F5F0E8]">{row.createdDate}</p>
                                <div className="flex items-center">
                                    <span className="inline-flex items-center rounded-[6px] border border-[#2A2A2A] bg-[#171717] px-2.5 py-1 text-[12px] font-[SemiBold] text-[#F5F0E8] leading-none">
                                        {row.Progresstatus}
                                    </span>
                                </div>
                                <p className="text-[12px] font-[Regular] text-[#F5F0E8] whitespace-nowrap">{row.ExCompletDate}</p>
                                <div className="flex items-center justify-end gap-[6px]">
                                    <button onClick={() => {
                                        navigate("/developer/soldout-project-details");
                                    }} type="button" className="cursor-pointer p-[6px] rounded-[8px] text-[#A89880] hover:text-[#C9A96E] hover:bg-[#171717] transition-colors" aria-label="View">
                                        <EyeDarkIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px] text-[#A89880] hover:text-[#C9A96E] hover:bg-[#171717] transition-colors" aria-label="Team">
                                        <MultiUserIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px] text-[#A89880] hover:text-[#C9A96E] hover:bg-[#171717] transition-colors" aria-label="Edit">
                                        <EditIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px] text-rose-400 hover:bg-rose-500/20 transition-colors" aria-label="Delete">
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

export default SoldOut;
