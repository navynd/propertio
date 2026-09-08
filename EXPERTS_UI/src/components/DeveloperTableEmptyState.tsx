/** Shared empty body for developer list / grid “tables” (header + rows). */
export function DeveloperTableEmptyState({
    message,
    className = "",
}: {
    message: string;
    className?: string;
}) {
    return (
        <div
            className={`px-[16px] py-[22px] text-center text-[13px] font-[Regular] leading-[1.45] text-[#707070] bg-white ${className}`}
            role="status"
        >
            {message}
        </div>
    );
}
