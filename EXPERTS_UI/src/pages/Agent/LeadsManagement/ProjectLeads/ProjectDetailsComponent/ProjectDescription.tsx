import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalenderIcon, DownArrowIcon, LeftArrowIcon, RightArrowIcon } from "../../../../../components/CustomFile/icons";
import { useLocation } from "react-router-dom";
const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

const monthTitle = (date: Date) =>
    `${date.toLocaleString("en-US", { month: "long" })}(${date.getFullYear()})`;

const getCalendarCells = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const cells: Array<number | null> = [];

    for (let i = 0; i < firstDayIndex; i += 1) cells.push(null);
    for (let day = 1; day <= totalDays; day += 1) cells.push(day);
    while (cells.length < 42) cells.push(null);
    return cells;
};

const progressOptions = ["Foundation", "Structure", "Finishing", "Handover", "Completed"];

type ProjectDescriptionProps = {
    project?: {
        description?: string | null;
        aboutProject?: string | null;
        location?: { address?: string | null; city?: string | null; zone?: string | null } | null;
        completionStatus?: string | null;
        launchPrice?: { startingFrom?: number | null; currency?: string | null } | null;
        governmentFees?: number | null;
    } | null;
};

type DatePickerKey = "announcement" | "completion";

function ProjectDescription({ project }: ProjectDescriptionProps) {
    const location = useLocation();
    const isUnpublished = location.pathname === "/agent/leads/view-project-details";
    const [soldOut, setSoldOut] = useState(false);
    const [progressStatus, setProgressStatus] = useState("");
    const [announcementDate, setAnnouncementDate] = useState<Date | null>(null);
    const [completionDate, setCompletionDate] = useState<Date | null>(null);
    const [activePicker, setActivePicker] = useState<DatePickerKey | null>(null);
    const [displayMonth, setDisplayMonth] = useState(new Date(2026, 11, 1));
    const [progressOpen, setProgressOpen] = useState(false);

    const shellRef = useRef<HTMLDivElement>(null);

    const calendarCells = getCalendarCells(displayMonth);

    const shiftMonth = (direction: -1 | 1) => {
        setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const openPicker = (key: DatePickerKey) => {
        setActivePicker((prev) => (prev === key ? null : key));
        setProgressOpen(false);
        const source =
            key === "announcement"
                ? announcementDate ?? new Date(2026, 11, 1)
                : completionDate ?? new Date(2026, 11, 1);
        setDisplayMonth(new Date(source.getFullYear(), source.getMonth(), 1));
    };

    const selectDate = (day: number) => {
        const selected = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
        if (activePicker === "announcement") setAnnouncementDate(selected);
        if (activePicker === "completion") setCompletionDate(selected);
        setActivePicker(null);
    };

    useEffect(() => {
        const onDown = (event: MouseEvent) => {
            if (!shellRef.current?.contains(event.target as Node)) {
                setActivePicker(null);
                setProgressOpen(false);
            }
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, []);

    const detailRows: { label: string; value: ReactNode }[] = [
        {
            label: "Project Location",
            value: (
                <span className="font-[Bold] text-right max-w-[min(100%,280px)]">
                    {project?.location?.address || "--/--"}
                </span>
            ),
        },
        {
            label: "Project Status",
            value: <span className="font-[Bold]">{project?.completionStatus || "--/--"}</span>,
        },
        {
            label: "Government fees",
            value: <span className="font-[Bold]">{project?.governmentFees != null ? `${project.governmentFees}%` : "--/--"}</span>,
        },
        {
            label: "Zone location",
            value: <span className="font-[Bold]">{project?.location?.zone || "--/--"}</span>,
        },
        {
            label: "Property price",
            value: (
                <span className="font-[Bold]">
                    {project?.launchPrice?.startingFrom != null
                        ? `${Number(project.launchPrice.startingFrom).toLocaleString("en-US")} ${project?.launchPrice?.currency || "AED"}`
                        : "--/--"}
                </span>
            ),
        },
    ];

    const renderCalendar = (selected: Date | null) => (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-30 rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between mb-[20px]">
                <button type="button" onClick={() => shiftMonth(-1)} className="text-[16px] font-[SemiBold] text-[#222] rotate-180">
                    <LeftArrowIcon width={14} height={14} />
                </button>
                <p className="text-[16px] font-[Bold] text-[#222]">{monthTitle(displayMonth)}</p>
                <button type="button" onClick={() => shiftMonth(1)} className="text-[16px] font-[SemiBold] text-[#222]">
                    <RightArrowIcon width={14} height={14} />
                </button>
            </div>
            <div className="grid grid-cols-7 gap-y-[6px] text-center">
                {weekDays.map((day, index) => (
                    <span key={`pd-day-${day}-${index}`} className="text-[13px] font-[SemiBold] text-[#222]">
                        {day}
                    </span>
                ))}
                {calendarCells.map((day, idx) => {
                    if (!day) {
                        return (
                            <span
                                key={`pd-blank-${idx}`}
                                className="h-[30px] w-[30px] mx-auto rounded-full border border-[rgba(34,34,34,0.10)] bg-[#FAFAFA]"
                            />
                        );
                    }
                    const isSelected =
                        !!selected &&
                        selected.getDate() === day &&
                        selected.getMonth() === displayMonth.getMonth() &&
                        selected.getFullYear() === displayMonth.getFullYear();
                    return (
                        <button
                            key={`pd-${day}-${idx}`}
                            type="button"
                            onClick={() => selectDate(day)}
                            className={`cursor-pointer h-[30px] w-[30px] mx-auto rounded-full text-[12px] font-[SemiBold] border transition-colors ${isSelected
                                ? "bg-[#D4A373] text-white border-[#D4A373]"
                                : "text-[#707070] border-[rgba(34,34,34,0.10)] hover:bg-[#F2F2F2]"
                                }`}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div
            ref={shellRef}
            className="rounded-[15px] bg-white overflow-hidden min-w-0"
        >
            <div className="flex flex-col lg:flex-col lg:items-stretch xl:flex-row xl:items-stretch">
                {/* Left — description + details */}
                <div className="flex-1 min-w-0 md:p-[30px] p-[20px] ">
                    <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] leading-tight mb-4">Project description</h2>
                    <p className="text-[14px] font-[Regular] text-[#222] leading-[160%] mb-4">
                        {project?.description
                            ? project.description.replace(/<[^>]*>/g, "")
                            : "No project description available."}
                    </p>
                    <div className={`${isUnpublished ? "w-[min(100%,580px)] max-w-full" : "w-full"}`}>
                        <div className="flex flex-col">
                            {detailRows.map((row) => (
                                <div
                                    key={row.label}
                                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-3 border-b border-[rgba(34,34,34,0.08)] last:border-b-0 text-[14px]"
                                >
                                    <span className="text-[14px] text-[#222] font-[Regular] shrink-0">{row.label}</span>
                                    <div className="text-[14px] text-[#222] font-[Bold] sm:text-right min-w-0">{row.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right — sidebar */}
                {!isUnpublished && (
                    <div className="w-auto xl:w-[min(100%,380px)] shrink-0 m-[4px] flex flex-col">

                    </div>
                )}
            </div>
        </div >
    );
}

export default ProjectDescription;
