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
                className="mr-[20px] rotate-180 text-[14px] font-[SemiBold] text-[#222] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
            >
                <LeftArrowIcon width={15} height={15} className="" />
            </button>

            {showLeadingFirstPage && (
                <button
                    type="button"
                    onClick={() => goToPage(1)}
                    className={`h-[40px] min-w-[40px] px-[8px] rounded-[8px] text-[13px] font-[SemiBold] border ${currentPage === 1
                        ? "bg-[#0832AE] border-[#0832AE] text-white"
                        : "bg-white border-[rgba(34,34,34,0.10)] text-[#222]"
                        }`}
                >
                    1
                </button>
            )}

            {showLeadingEllipsis && (
                <span className="text-[13px] font-[SemiBold] text-[#707070] px-[4px]">....</span>
            )}

            {visiblePages.map((page) => (
                <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page)}
                    className={`h-[40px] min-w-[40px] px-[8px] rounded-[8px] text-[18px] font-[SemiBold] border ${currentPage === page
                        ? "bg-[#D4A373] border-[#D4A373] text-white"
                        : "bg-white border-[rgba(34,34,34,0.10)] text-[#222]"
                        }`}
                >
                    {page}
                </button>
            ))}

            {showTrailingEllipsis && (
                <span className="text-[13px] font-[SemiBold] text-[#707070] px-[4px]">....</span>
            )}

            {showTrailingLastPage && (
                <button
                    type="button"
                    onClick={() => goToPage(resolvedTotalPages)}
                    className={`h-[40px] min-w-[40px] px-[8px] rounded-[8px] text-[18px] font-[SemiBold] border ${currentPage === resolvedTotalPages
                        ? "bg-[#D4A373] border-[#D4A373] text-white"
                        : "bg-white border-[rgba(34,34,34,0.10)] text-[#222]"
                        }`}
                >
                    {resolvedTotalPages}
                </button>
            )}

            <button
                type="button"
                onClick={goNext}
                disabled={currentPage === resolvedTotalPages}
                className="ml-[20px] text-[14px] font-[SemiBold] text-[#222] disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
            >
                <RightArrowIcon width={15} height={15} />
            </button>
        </div>
    );
};

export default Pagenation;
