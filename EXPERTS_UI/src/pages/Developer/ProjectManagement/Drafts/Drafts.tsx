import { useEffect, useState } from "react";
import { EditIcon, TrashIcon } from "../../../../components/CustomFile/icons";
import Pagenation from "../../../../components/Pagenation/Pagenation";

type DraftRow = {
    id: number;
    title: string;
    createdDate: string;
    completedSteps: number;
    totalSteps: number;
};

const draftRows: DraftRow[] = [
    { id: 1, title: "Draft 1", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 2, title: "Draft 2", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 3, title: "Draft 3", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 4, title: "Draft 4", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 5, title: "Draft 5", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
    { id: 6, title: "Draft 6", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 7, title: "Draft 7", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 8, title: "Draft 8", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 9, title: "Draft 9", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 10, title: "Draft 10", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
    { id: 11, title: "Draft 11", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 12, title: "Draft 12", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 13, title: "Draft 13", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 14, title: "Draft 14", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 15, title: "Draft 15", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
    { id: 16, title: "Draft 16", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 17, title: "Draft 17", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 18, title: "Draft 18", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 19, title: "Draft 19", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 20, title: "Draft 20", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
    { id: 21, title: "Draft 21", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 22, title: "Draft 22", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 23, title: "Draft 23", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 24, title: "Draft 24", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 25, title: "Draft 25", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
    { id: 26, title: "Draft 26", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 27, title: "Draft 27", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 28, title: "Draft 28", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 29, title: "Draft 29", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 30, title: "Draft 30", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
    { id: 31, title: "Draft 31", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 32, title: "Draft 32", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 33, title: "Draft 33", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 34, title: "Draft 34", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 35, title: "Draft 35", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
    { id: 36, title: "Draft 36", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 37, title: "Draft 37", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 38, title: "Draft 38", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 39, title: "Draft 39", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 40, title: "Draft 40", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
    { id: 41, title: "Draft 41", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 42, title: "Draft 42", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 43, title: "Draft 43", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 44, title: "Draft 44", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 45, title: "Draft 45", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
    { id: 46, title: "Draft 46", createdDate: "30 May 2025", completedSteps: 2, totalSteps: 6 },
    { id: 47, title: "Draft 47", createdDate: "30 May 2025", completedSteps: 5, totalSteps: 6 },
    { id: 48, title: "Draft 48", createdDate: "30 May 2025", completedSteps: 4, totalSteps: 6 },
    { id: 49, title: "Draft 49", createdDate: "30 May 2025", completedSteps: 3, totalSteps: 6 },
    { id: 50, title: "Draft 50", createdDate: "30 May 2025", completedSteps: 6, totalSteps: 6 },
];

const Drafts = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedRows = draftRows.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(draftRows.length / itemsPerPage));
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, itemsPerPage]);

    return (
        <div className="rounded-[15px] bg-[#111111] border border-[#2A2A2A] min-w-0">
            <div className="md:p-[0px_30px_30px_30px] p-[0px_20px_20px_20px] flex flex-col gap-[15px]">
                {paginatedRows.map((item) => {
                    const progressPercent = (item.completedSteps / item.totalSteps) * 100;
                    return (
                        <div
                            key={item.id}
                            className="rounded-[15px] bg-[#171717] border border-[#2A2A2A] md:p-[30px] p-[20px] grid grid-cols-1 md:grid-cols-[auto_auto_auto] gap-[12px] items-center"
                        >
                            <div>
                                <p className="text-[14px] leading-[1.2] text-[#F5F0E8] font-[Bold] mb-[7px]">{item.title}</p>
                                <p className="text-[12px] leading-[1.2] text-[#A89880] font-[Regular]">
                                    Created on {item.createdDate}
                                </p>
                            </div>

                            <div className="min-w-0">
                                <p className="text-[12px] leading-[1.2] text-[#F5F0E8] font-[Regular] mb-[8px]">
                                    Remaining steps to complete : {item.completedSteps}/{item.totalSteps}
                                </p>
                                <div className="h-[6px] w-full rounded-full bg-[#2A2A2A] overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[#C9A96E]"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-[8px]">
                                <button
                                    type="button"
                                    className="p-[6px] rounded-[8px] hover:bg-[#2A2A2A] text-[#A89880] hover:text-[#C9A96E] transition-colors"
                                    aria-label={`Edit ${item.title}`}
                                >
                                    <EditIcon width={20} height={20} />
                                </button>
                                <button
                                    type="button"
                                    className="p-[6px] rounded-[8px] hover:bg-rose-500/20 text-[#A89880] hover:text-rose-400 transition-colors"
                                    aria-label={`Delete ${item.title}`}
                                >
                                    <TrashIcon width={20} height={20} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
                <Pagenation
                    currentPage={currentPage}
                    totalItems={draftRows.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
};

export default Drafts;
