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

        <div className="rounded-[15px] bg-white  min-w-0">
            {/* Table */}
            <div className="md:p-[0px_30px_30px_30px] p-[0px_20px_20px_20px]">
                <div className=" overflow-x-auto w-full scrollbar-hide">
                    <div className="min-w-[1400px] rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white">
                        <div className="grid grid-cols-[40px_2.2fr_1.2fr_2fr_1.8fr_1.8fr_1.2fr] gap-2 items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)]">
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
                            <p className="text-[14px] font-[Bold] text-[#222]">Project Announcement date</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Progress status</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Expected Completion date</p>
                            <p className="text-[14px] font-[Bold] text-[#222]">Actions</p>
                        </div>

                        {visibleRows.map((row, index) => (
                            <div
                                key={row.id} className={`grid grid-cols-[40px_2.2fr_1.2fr_2fr_1.8fr_1.8fr_1.2fr] gap-2 items-center px-[14px] py-[12px] ${index !== visibleRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}>
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
                                        className={`inline-flex items-center rounded-[5px] h-[21px] p-[6px_10px] text-[11px] font-[SemiBold] capitalize ${row.status === "Sold out"
                                            ? "bg-[#E80808] text-[#FFF]"
                                            : "bg-[#E80808] text-[#FFF]"
                                            }`}
                                    >
                                        {row.status}
                                    </span>
                                </div>
                                <p className="text-[12px] font-[Regular] text-[#222]">{row.createdDate}</p>
                                <div className="flex items-center">
                                    <span className="inline-flex items-center rounded-[6px] border border-[rgba(34,34,34,0.10)] p-[6px_10px] text-[12px] font-[SemiBold] text-[#222] leading-none">
                                        {row.Progresstatus}
                                    </span>
                                </div>
                                <p className="text-[12px] font-[Regular] text-[#222] whitespace-nowrap">{row.ExCompletDate}</p>
                                <div className="flex items-center justify-end gap-[6px]">
                                    <button onClick={() => {
                                        navigate("/developer/soldout-project-details");
                                    }} type="button" className="cursor-pointer p-[6px] rounded-[8px] text-[#707070]" aria-label="View">
                                        <EyeDarkIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px] text-[#707070]" aria-label="Team">
                                        <MultiUserIcon width={20} height={20} />
                                    </button>
                                    <button type="button" className="cursor-pointer p-[6px] rounded-[8px]  text-[#707070]" aria-label="Edit">
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

export default SoldOut;
