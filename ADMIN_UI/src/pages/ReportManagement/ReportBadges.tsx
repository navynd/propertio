import type { ReportPriority, ReportStatus } from "./reportData";
import { formatLabel } from "./reportData";

const statusStyles: Record<ReportStatus, string> = {
    pending: "border border-[rgba(34,34,34,0.10)] bg-white text-[#222]",
    "under-review": "bg-[#F59E0B] text-[#FFF]",
    reviewed: "bg-[#3182CE] text-[#FFF]",
    resolved: "bg-[#00A663] text-[#FFF]",
    rejected: "border border-[#ea393459] text-[#ea3934] bg-[#ea393414]",
    escalated: "bg-[#6A3CA8] text-[#FFF]",
};

const priorityStyles: Record<ReportPriority, string> = {
    low: "border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5] text-[#707070]",
    medium: "border border-[rgba(49,130,206,0.3)] bg-[#EBF8FF] text-[#3182CE]",
    high: "border border-[rgba(245,158,11,0.4)] bg-[#FFFBEB] text-[#D97706]",
    urgent: "bg-[#EA3934] text-[#FFF]",
};

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
    return (
        <span
            className={`rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center px-[10px] text-[11px] font-[SemiBold] whitespace-nowrap ${statusStyles[status]}`}
        >
            {formatLabel(status)}
        </span>
    );
}

export function ReportPriorityBadge({ priority }: { priority: ReportPriority }) {
    return (
        <span
            className={`rounded-[5px] h-[25px] w-fit text-center flex items-center justify-center px-[10px] text-[11px] font-[SemiBold] capitalize whitespace-nowrap ${priorityStyles[priority]}`}
        >
            {priority}
        </span>
    );
}

export function ReportTypeBadge({ type }: { type: string }) {
    return (
        <span className="rounded-[5px] h-[25px] w-fit flex items-center justify-center px-[10px] text-[11px] font-[SemiBold] capitalize bg-[#F3E8FF] text-[#6A3CA8] whitespace-nowrap">
            {type}
        </span>
    );
}
