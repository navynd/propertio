import { LeftArrowIcon, RightArrowIcon } from "../CustomFile/icons";

type PagenationProps = {
    currentPage: number;
    totalPages?: number;
    totalItems?: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
};

const Pagenation = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage = 5,
    onPageChange,
}: PagenationProps) => {
    const resolvedTotalPages =
        typeof totalPages === "number"
            ? Math.max(1, totalPages)
            : Math.max(1, Math.ceil((totalItems ?? 0) / itemsPerPage));

    const goToPage = (page: number) => {
        const safePage = Math.max(1, Math.min(page, resolvedTotalPages));
        onPageChange(safePage);
    };

    const goPrev = () => {
        if (currentPage > 1) goToPage(currentPage - 1);
    };

    const goNext = () => {
        if (currentPage < resolvedTotalPages) goToPage(currentPage + 1);
    };

    const isNearEnd = currentPage >= resolvedTotalPages - 2;
    const visiblePages =
        resolvedTotalPages <= 4
            ? Array.from({ length: resolvedTotalPages }, (_, i) => i + 1)
            : isNearEnd
                ? [resolvedTotalPages - 2, resolvedTotalPages - 1, resolvedTotalPages]
                : (() => {
                    const maxStart = resolvedTotalPages - 2;
                    const start = Math.max(1, Math.min(currentPage, maxStart));
                    return [start, start + 1, start + 2];
                })();

    const showLeadingFirstPage = resolvedTotalPages > 4 && isNearEnd && !visiblePages.includes(1);
    const showLeadingEllipsis = showLeadingFirstPage;
    const lastVisible = visiblePages[visiblePages.length - 1];
    const showTrailingEllipsis = resolvedTotalPages > 4 && !isNearEnd && lastVisible < resolvedTotalPages - 1;
    const showTrailingLastPage = resolvedTotalPages > 4 && !isNearEnd && !visiblePages.includes(resolvedTotalPages);

    return (
        <div className="w-full flex items-center justify-center gap-[8px] py-[6px]">
            <button
                type="button"
                onClick={goPrev}
                disabled={currentPage === 1}
                className="mr-[20px] rotate-180 text-[14px] font-[SemiBold] text-[#A89880] hover:text-[#C9A96E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Previous page"
            >
                <LeftArrowIcon width={15} height={15} className="" />
            </button>

            {showLeadingFirstPage && (
                <button
                    type="button"
                    onClick={() => goToPage(1)}
                    className={`h-[40px] min-w-[40px] px-[8px] rounded-[8px] text-[13px] font-[SemiBold] border transition-colors ${currentPage === 1
                        ? "bg-[#C9A96E] border-[#C9A96E] text-[#0A0A0A]"
                        : "bg-[#171717] border-[#2A2A2A] text-[#A89880] hover:text-[#F5F0E8] hover:border-[#C9A96E]/40"
                        }`}
                >
                    1
                </button>
            )}

            {showLeadingEllipsis && (
                <span className="text-[13px] font-[SemiBold] text-[#A89880] px-[4px]">....</span>
            )}

            {visiblePages.map((page) => (
                <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page)}
                    className={`h-[40px] min-w-[40px] px-[8px] rounded-[8px] text-[14px] font-[SemiBold] border transition-colors ${currentPage === page
                        ? "bg-[#C9A96E] border-[#C9A96E] text-[#0A0A0A] font-[Bold]"
                        : "bg-[#171717] border-[#2A2A2A] text-[#A89880] hover:text-[#F5F0E8] hover:border-[#C9A96E]/40"
                        }`}
                >
                    {page}
                </button>
            ))}

            {showTrailingEllipsis && (
                <span className="text-[13px] font-[SemiBold] text-[#A89880] px-[4px]">....</span>
            )}

            {showTrailingLastPage && (
                <button
                    type="button"
                    onClick={() => goToPage(resolvedTotalPages)}
                    className={`h-[40px] min-w-[40px] px-[8px] rounded-[8px] text-[14px] font-[SemiBold] border transition-colors ${currentPage === resolvedTotalPages
                        ? "bg-[#C9A96E] border-[#C9A96E] text-[#0A0A0A] font-[Bold]"
                        : "bg-[#171717] border-[#2A2A2A] text-[#A89880] hover:text-[#F5F0E8] hover:border-[#C9A96E]/40"
                        }`}
                >
                    {resolvedTotalPages}
                </button>
            )}

            <button
                type="button"
                onClick={goNext}
                disabled={currentPage === resolvedTotalPages}
                className="ml-[20px] text-[14px] font-[SemiBold] text-[#A89880] hover:text-[#C9A96E] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Next page"
            >
                <RightArrowIcon width={15} height={15} className="" />
            </button>
        </div>
    );
};

export default Pagenation;
