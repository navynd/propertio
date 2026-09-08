import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalenderIcon, DownArrowIcon, LeftArrowIcon, RightArrowIcon } from "../../../../components/CustomFile/icons";
import { useLocation } from "react-router-dom";
import { developerService } from "../../../../services/developerService";
import { toast } from "../../../../services/toast";
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

type ProgressOption = { name: string; value: string };
const defaultProgressOptions: ProgressOption[] = [
    { name: "Foundation", value: "foundation" },
    { name: "Structure", value: "structure" },
    { name: "Finishing", value: "finishing" },
    { name: "Handover", value: "handover" },
    { name: "Completed", value: "completed" },
];

const bulletPoints = [
    "Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum.",
    "Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem.",
    "Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus.",
    "Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt.",
];

const parsePositiveArea = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
    if (typeof value === "string" && value.trim()) {
        const n = Number.parseFloat(value);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
};

const collectAreasFromUnitProperties = (unitProperties: unknown): { sqm: number[]; sqft: number[] } => {
    const sqm: number[] = [];
    const sqft: number[] = [];
    if (!Array.isArray(unitProperties)) return { sqm, sqft };
    for (const raw of unitProperties) {
        if (!raw || typeof raw !== "object") continue;
        const p = raw as Record<string, unknown>;
        const ps = parsePositiveArea(p.areaSqm);
        if (ps != null) sqm.push(ps);
        const pf = parsePositiveArea(p.areaSqft);
        if (pf != null) sqft.push(pf);
        const layouts = p.layouts;
        if (!Array.isArray(layouts)) continue;
        for (const layout of layouts) {
            if (!layout || typeof layout !== "object") continue;
            const l = layout as Record<string, unknown>;
            const ls = parsePositiveArea(l.areaSqm);
            if (ls != null) sqm.push(ls);
            const lf = parsePositiveArea(l.areaSqft);
            if (lf != null) sqft.push(lf);
        }
    }
    return { sqm, sqft };
};

const formatAreaMinMax = (values: number[]): string => {
    if (!values.length) return "-";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const fmt = (n: number) =>
        Number.isInteger(n) ? n.toLocaleString("en-US") : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
    if (min === max) return fmt(min);
    return `${fmt(min)} – ${fmt(max)}`;
};

const detailRows: { label: string; value: ReactNode }[] = [
    {
        label: "Project Location",
        value: (
            <span className="font-[Bold] text-right max-w-[min(100%,280px)]">
                Sheikh Mohammed bin Rashid Blvd
                <br />
                Downtown Dubai, Dubai X9099X9
                <br />
                United Arab Emirates
            </span>
        ),
    },
    { label: "Project Status", value: <span className="font-[Bold]">New Projects</span> },
    { label: "Area of the property (Sq.m)", value: <span className="font-[Bold]">-</span> },
    { label: "Area of the property (Sq.ft)", value: <span className="font-[Bold]">-</span> },
    { label: "Government fees", value: <span className="font-[Bold]">10%</span> },
    { label: "Zone location", value: <span className="font-[Bold]">Downtown</span> },
    { label: "Property price", value: <span className="font-[Bold]">9,000,000 AED</span> },
];

type DatePickerKey = "announcement" | "completion";

type ProjectDescriptionProps = {
    projectId?: string;
    descriptionHtml?: string;
    aboutProject?: string;
    locationAddress?: string;
    projectType?: string;
    projectPrice?: string;
    governmentFees?: string;
    initialProgressStatus?: string;
    initialAnnouncementDate?: string | null;
    initialExpectedCompletionDate?: string | null;
    initialBookingOpenDate?: string | null;
    initialConstructionStartedDate?: string | null;
    initialLaunchDate?: string | null;
    initialDeliveryDate?: string | null;
    initialConstructionProgress?: number;
    initialCompletionStatus?: string;
    initialMarkAsSoldOut?: boolean;
    /** Project `unitProperties` from API — areas are min–max across properties and layouts. */
    unitProperties?: unknown;
};

function ProjectDescription({
    projectId,
    descriptionHtml,
    aboutProject,
    locationAddress,
    projectType,
    projectPrice,
    governmentFees,
    initialProgressStatus,
    initialAnnouncementDate,
    initialExpectedCompletionDate,
    initialBookingOpenDate,
    initialConstructionStartedDate,
    initialLaunchDate,
    initialDeliveryDate,
    initialConstructionProgress,
    initialCompletionStatus,
    initialMarkAsSoldOut,
    unitProperties,
}: ProjectDescriptionProps) {
    const location = useLocation();
    const isUnpublished = location.pathname === "/developer/unpublished-project-details";
    const isSoldOut = location.pathname === "/developer/soldout-project-details";
    const [soldOut, setSoldOut] = useState(isSoldOut ? true : Boolean(initialMarkAsSoldOut));
    const [progressStatus, setProgressStatus] = useState("");
    const [announcementDate, setAnnouncementDate] = useState<Date | null>(null);
    const [completionDate, setCompletionDate] = useState<Date | null>(null);
    const [activePicker, setActivePicker] = useState<DatePickerKey | null>(null);
    const [displayMonth, setDisplayMonth] = useState(new Date(2026, 11, 1));
    const [progressOpen, setProgressOpen] = useState(false);
    const [progressOptions, setProgressOptions] = useState<ProgressOption[]>(defaultProgressOptions);
    const [isSavingProgress, setIsSavingProgress] = useState(false);
    const selectedProgressName = useMemo(
        () => progressOptions.find((option) => option.value === progressStatus)?.name || progressStatus,
        [progressOptions, progressStatus]
    );
    const areaRangeDisplay = useMemo(() => {
        const { sqm, sqft } = collectAreasFromUnitProperties(unitProperties);
        return {
            sqm: formatAreaMinMax(sqm),
            sqft: formatAreaMinMax(sqft),
        };
    }, [unitProperties]);

    const mappedDetailRows = useMemo(
        () =>
            detailRows.map((row) => {
                if (row.label === "Project Location" && locationAddress) {
                    return {
                        ...row,
                        value: <span className="font-[Bold] text-right max-w-[min(100%,280px)]">{locationAddress}</span>,
                    };
                }
                if (row.label === "Project Status" && projectType) {
                    return { ...row, value: <span className="font-[Bold]">{projectType}</span> };
                }
                if (row.label === "Area of the property (Sq.m)") {
                    return { ...row, value: <span className="font-[Bold]">{areaRangeDisplay.sqm}</span> };
                }
                if (row.label === "Area of the property (Sq.ft)") {
                    return { ...row, value: <span className="font-[Bold]">{areaRangeDisplay.sqft}</span> };
                }
                if (row.label === "Government fees" && governmentFees) {
                    return { ...row, value: <span className="font-[Bold]">{governmentFees}</span> };
                }
                if (row.label === "Property price" && projectPrice) {
                    return { ...row, value: <span className="font-[Bold]">{projectPrice}</span> };
                }
                return row;
            }),
        [areaRangeDisplay, governmentFees, locationAddress, projectPrice, projectType]
    );

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
        let mounted = true;
        developerService
            .getProjectProgressStatusMasterData()
            .then((data) => {
                if (!mounted) return;
                const options = data.projectProgressStatus || data.projectprogressstatus || [];
                const mapped = options
                    .map((item) => ({
                        name: String(item?.name || "").trim(),
                        value: String(item?.value || "").trim(),
                    }))
                    .filter((item) => item.name && item.value);
                if (mapped.length) setProgressOptions(mapped);
            })
            .catch(() => undefined);
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!initialProgressStatus) return;
        const normalized = initialProgressStatus.trim().toLowerCase();
        const matched = progressOptions.find(
            (option) =>
                option.value.toLowerCase() === normalized ||
                option.name.toLowerCase() === normalized
        );
        setProgressStatus(matched?.value || initialProgressStatus);
    }, [initialProgressStatus, progressOptions]);

    useEffect(() => {
        if (!initialAnnouncementDate) return;
        const parsed = new Date(initialAnnouncementDate);
        if (!Number.isNaN(parsed.getTime())) setAnnouncementDate(parsed);
    }, [initialAnnouncementDate]);

    useEffect(() => {
        if (!initialExpectedCompletionDate) return;
        const parsed = new Date(initialExpectedCompletionDate);
        if (!Number.isNaN(parsed.getTime())) setCompletionDate(parsed);
    }, [initialExpectedCompletionDate]);

    useEffect(() => {
        if (typeof initialMarkAsSoldOut === "boolean") {
            setSoldOut(initialMarkAsSoldOut);
        }
    }, [initialMarkAsSoldOut]);

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
                                ? "bg-[#EA3934] text-white border-[#EA3934]"
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

    const handleSaveProgress = async () => {
        if (!projectId) {
            toast.error("Save failed", "Project ID is missing.");
            return;
        }
        if (!progressStatus || !announcementDate) {
            toast.error("Validation", "Progress status and project announcement date are required.");
            return;
        }

        setIsSavingProgress(true);
        try {
            await developerService.updateProjectProgress({
                projectId,
                progressStatus,
                projectAnnouncement: announcementDate.toISOString(),
                expectedCompletionDate: completionDate ? completionDate.toISOString() : null,
                expectedCompletion: completionDate ? completionDate.toISOString() : null,
                bookingOpen: initialBookingOpenDate || null,
                constructionStarted: initialConstructionStartedDate || null,
                launchDate: initialLaunchDate || null,
                deliveryDate: initialDeliveryDate || null,
                constructionProgress:
                    typeof initialConstructionProgress === "number" ? initialConstructionProgress : undefined,
                completionStatus: initialCompletionStatus,
                markAsSoldOut: soldOut,
            });
            toast.success("Saved", "Project progress updated successfully.");
        } catch (error: unknown) {
            toast.error(
                "Save failed",
                (error as { message?: string })?.message || "Unable to update project progress."
            );
        } finally {
            setIsSavingProgress(false);
        }
    };

    return (
        <div
            ref={shellRef}
            className="rounded-[15px] bg-white  min-w-0"
        >
            <div className="flex flex-col lg:flex-col lg:items-stretch xl:flex-row xl:items-stretch">
                {/* Left — description + details */}
                <div className="flex-1 min-w-0 md:p-[30px] p-[20px] ">
                    <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] leading-tight mb-4">Project description</h2>
                    <p className="text-[14px] font-[Regular] text-[#222] leading-[160%] mb-4">
                        {aboutProject || "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim."}
                    </p>
                    <div className={`${isUnpublished ? "w-[min(100%,580px)] max-w-full" : "w-full"}`}>
                        {descriptionHtml ? (
                            <div
                                className="text-[14px] font-[Regular] text-[#222] leading-[160%] mb-8"
                                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                            />
                        ) : (
                            <>
                                <p className="text-[15px] font-[Bold] text-[#222] leading-[160%] mb-3">
                                    Etiam neque tellus, mattis sed tempor eu, dictum laoreet mi.
                                </p>
                                <ul className="list-disc pl-5 space-y-2 text-[14px] font-[Regular] text-[#707070] leading-[160%] mb-8">
                                    {bulletPoints.map((text, i) => (
                                        <li key={i} className="text-[14px] font-[Regular] text-[#222] leading-[160%]">{text}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                        <div className="h-px w-full bg-[rgba(34,34,34,0.10)] mb-6" />
                        <div className="flex flex-col">
                            {mappedDetailRows.map((row) => (
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
                        <div className="rounded-[15px] bg-[#F5F5F5] md:p-[15px_30px] p-[10px_20px] mb-[6px] flex items-center justify-between gap-3">
                            <span className="text-[15px] font-[Bold] text-[#222]">Mark as sold out</span>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={soldOut}
                                onClick={() => setSoldOut((v) => !v)}
                                className={`relative shrink-0 h-[26px] w-[48px] rounded-full transition-colors ${soldOut ? "bg-[#EA3934]" : "bg-[#D4D4D4]"
                                    }`}
                            >
                                <span
                                    className={`absolute top-[3px] left-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${soldOut ? "translate-x-[22px]" : "translate-x-0"
                                        }`}
                                />
                            </button>
                        </div>

                        <div className={`h-full rounded-[15px]  md:p-[39px_30px] p-[10px_20px] ${isSoldOut ? "bg-[#F5F5F5] opacity-50" : "bg-[#F5F5F5]"}`}>
                            <h3 className="text-[20px] font-[Bold] text-[#222] mb-[28px]">Fill up the details</h3>
                            <div className="flex flex-col gap-5">
                                {/* Progress status */}
                                <div className="relative">
                                    <label className="block text-[14px] font-[SemiBold] text-[#222] mb-2">
                                        Progress status <span className="text-[#EA3934]">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProgressOpen((o) => !o);
                                            setActivePicker(null);
                                        }}
                                        className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[14px] flex items-center justify-between text-left"
                                    >
                                        <span className={`text-[14px] font-[Regular] ${progressStatus ? "text-[#222]" : "text-[#707070]"}`}>
                                            {selectedProgressName || "Select progress status"}
                                        </span>
                                        <DownArrowIcon width={11} height={7} className={`transition-transform shrink-0 ${progressOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {progressOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                            {progressOptions.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setProgressStatus(option.value);
                                                        setProgressOpen(false);
                                                    }}
                                                    className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${progressStatus === option.value ? "text-[#EA3934] bg-[#FDF2F2]" : "text-[#222]"
                                                        }`}
                                                >
                                                    {option.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {/* Project announcement date */}
                                <div className="relative">
                                    <label className="block text-[14px] font-[SemiBold] text-[#222] mb-2">
                                        Project announcement date <span className="text-[#EA3934]">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => openPicker("announcement")}
                                        className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[14px] flex items-center justify-between text-left"
                                    >
                                        <span className={`text-[14px] font-[Regular] ${announcementDate ? "text-[#222]" : "text-[#707070]"}`}>
                                            {announcementDate ? formatDisplayDate(announcementDate) : "Select"}
                                        </span>
                                        <span className="inline-flex h-[24px] w-[24px] items-center justify-center shrink-0">
                                            <CalenderIcon width={20} height={20} />
                                        </span>
                                    </button>
                                    {activePicker === "announcement" && renderCalendar(announcementDate)}
                                </div>
                                {/* Expected completion date */}
                                <div className="relative">
                                    <label className="block text-[14px] font-[SemiBold] text-[#222] mb-2">Expected Completion date</label>
                                    <button
                                        type="button"
                                        onClick={() => openPicker("completion")}
                                        className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[14px] flex items-center justify-between text-left"
                                    >
                                        <span className={`text-[14px] font-[Regular] ${completionDate ? "text-[#222]" : "text-[#707070]"}`}>
                                            {completionDate ? formatDisplayDate(completionDate) : "Select"}
                                        </span>
                                        <span className="inline-flex h-[24px] w-[24px] items-center justify-center shrink-0">
                                            <CalenderIcon width={20} height={20} />
                                        </span>
                                    </button>
                                    {activePicker === "completion" && renderCalendar(completionDate)}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleSaveProgress}
                                disabled={isSavingProgress}
                                className="mt-[40px] h-[44px] w-full rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold] hover:opacity-95 transition-opacity"
                            >
                                {isSavingProgress ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}

export default ProjectDescription;
