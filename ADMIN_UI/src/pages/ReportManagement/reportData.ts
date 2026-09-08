export type ReportType = "property" | "agent" | "agency" | "user" | "review" | "project";
export type UserType = "developer" | "agency" | "agent" | "user";
export type ReportStatus =
    | "pending"
    | "under-review"
    | "reviewed"
    | "resolved"
    | "rejected"
    | "escalated";
export type ReportPriority = "low" | "medium" | "high" | "urgent";

export type InternalNote = {
    note: string;
    addedBy: string;
    addedAt: string;
};

export type Report = {
    id: string;
    reportedBy?: string;
    reporterEmail: string;
    reportType: ReportType;
    reportedItemId: string;
    reportedItemLabel: string;
    userType: UserType;
    reason: string;
    description: string;
    attachments: string[];
    status: ReportStatus;
    priority: ReportPriority;
    reviewedBy?: string;
    reviewNotes?: string;
    reviewedAt?: string;
    actionTaken?: string;
    resolution?: {
        status: string;
        notes: string;
        resolvedBy: string;
        resolvedAt: string;
    };
    internalNotes: InternalNote[];
    createdAt: string;
    updatedAt: string;
};

export const REPORT_STATUSES: ReportStatus[] = [
    "pending",
    "under-review",
    "reviewed",
    "resolved",
    "rejected",
    "escalated",
];

export const REPORT_PRIORITIES: ReportPriority[] = ["low", "medium", "high", "urgent"];

export const REPORT_TYPES: ReportType[] = [
    "property",
    "agent",
    "agency",
    "user",
    "review",
    "project",
];

export const USER_TYPES: UserType[] = ["developer", "agency", "agent", "user"];

export const formatLabel = (value: string) =>
    value
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

export const formatDate = (iso: string) => {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};
