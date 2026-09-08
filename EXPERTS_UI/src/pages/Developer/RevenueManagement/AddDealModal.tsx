import { useEffect, useRef, useState } from "react";
import { CalenderIcon, CancelIcon, DownArrowIcon, LeftArrowIcon, RightArrowIcon } from "../../../components/CustomFile/icons";
import {
    developerService,
    type RevenueDropdownAgencyItem,
    type RevenueDropdownLayoutItem,
    type RevenueDropdownProjectItem,
    type RevenueDropdownUnitItem,
} from "../../../services/developerService";
import { toast } from "../../../services/toast";

interface AddDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

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

const AddDealModal = ({ isOpen, onClose, onSaved }: AddDealModalProps) => {
    const [projectName, setProjectName] = useState("");
    const [agencyName, setAgencyName] = useState("");
    const [dealClosedDate, setDealClosedDate] = useState<Date | null>(null);
    const [dealAmount, setDealAmount] = useState("");
    const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
    const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [displayMonth, setDisplayMonth] = useState(new Date(2026, 11, 1));
    const projectDropdownRef = useRef<HTMLDivElement>(null);
    const agencyDropdownRef = useRef<HTMLDivElement>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState("");
    const [unit, setUnit] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const [selectedAgencyId, setSelectedAgencyId] = useState("");
    const [selectedLayoutId, setSelectedLayoutId] = useState("");
    const [selectedUnitId, setSelectedUnitId] = useState("");
    const [projectOptions, setProjectOptions] = useState<RevenueDropdownProjectItem[]>([]);
    const [agencyOptions, setAgencyOptions] = useState<RevenueDropdownAgencyItem[]>([]);
    const [layoutOptions, setLayoutOptions] = useState<RevenueDropdownLayoutItem[]>([]);
    const [unitOptions, setUnitOptions] = useState<RevenueDropdownUnitItem[]>([]);
    const [isLoadingProjects, setIsLoadingProjects] = useState(false);
    const [isLoadingAgencies, setIsLoadingAgencies] = useState(false);
    const [isLoadingLayouts, setIsLoadingLayouts] = useState(false);
    const [isLoadingUnits, setIsLoadingUnits] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");

    const [isLayoutDropdownOpen, setIsLayoutDropdownOpen] = useState(false);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);

    const layoutDropdownRef = useRef<HTMLDivElement>(null);
    const unitDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        let mounted = true;
        setIsLoadingProjects(true);
        developerService
            .getRevenueDropdown({ type: "projects" })
            .then((res) => {
                if (!mounted) return;
                setProjectOptions((res.items || []) as RevenueDropdownProjectItem[]);
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                toast.error("Failed to load projects", (error as { message?: string })?.message || "Could not fetch projects.");
                setProjectOptions([]);
            })
            .finally(() => {
                if (!mounted) return;
                setIsLoadingProjects(false);
            });
        return () => {
            mounted = false;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!selectedProjectId) {
            setAgencyOptions([]);
            return;
        }
        let mounted = true;
        setIsLoadingAgencies(true);
        developerService
            .getRevenueDropdown({ type: "agencies", projectId: selectedProjectId })
            .then((res) => {
                if (!mounted) return;
                setAgencyOptions((res.items || []) as RevenueDropdownAgencyItem[]);
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                toast.error("Failed to load agencies", (error as { message?: string })?.message || "Could not fetch agencies.");
                setAgencyOptions([]);
            })
            .finally(() => {
                if (!mounted) return;
                setIsLoadingAgencies(false);
            });
        return () => {
            mounted = false;
        };
    }, [selectedProjectId]);

    useEffect(() => {
        if (!selectedProjectId || !selectedAgencyId) {
            setLayoutOptions([]);
            return;
        }
        let mounted = true;
        setIsLoadingLayouts(true);
        developerService
            .getRevenueDropdown({ type: "layouts", projectId: selectedProjectId, agencyId: selectedAgencyId })
            .then((res) => {
                if (!mounted) return;
                setLayoutOptions((res.items || []) as RevenueDropdownLayoutItem[]);
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                toast.error("Failed to load layouts", (error as { message?: string })?.message || "Could not fetch layouts.");
                setLayoutOptions([]);
            })
            .finally(() => {
                if (!mounted) return;
                setIsLoadingLayouts(false);
            });
        return () => {
            mounted = false;
        };
    }, [selectedProjectId, selectedAgencyId]);

    useEffect(() => {
        if (!selectedProjectId || !selectedAgencyId || !selectedLayoutId) {
            setUnitOptions([]);
            return;
        }
        let mounted = true;
        setIsLoadingUnits(true);
        developerService
            .getRevenueDropdown({
                type: "units",
                projectId: selectedProjectId,
                agencyId: selectedAgencyId,
                layoutId: selectedLayoutId,
            })
            .then((res) => {
                if (!mounted) return;
                setUnitOptions((res.items || []) as RevenueDropdownUnitItem[]);
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                toast.error("Failed to load units", (error as { message?: string })?.message || "Could not fetch units.");
                setUnitOptions([]);
            })
            .finally(() => {
                if (!mounted) return;
                setIsLoadingUnits(false);
            });
        return () => {
            mounted = false;
        };
    }, [selectedProjectId, selectedAgencyId, selectedLayoutId]);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
                setIsProjectDropdownOpen(false);
            }
            if (agencyDropdownRef.current && !agencyDropdownRef.current.contains(event.target as Node)) {
                setIsAgencyDropdownOpen(false);
            }
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
            if (layoutDropdownRef.current && !layoutDropdownRef.current.contains(event.target as Node)) {
                setIsLayoutDropdownOpen(false);
            }
            if (unitDropdownRef.current && !unitDropdownRef.current.contains(event.target as Node)) {
                setIsUnitDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const calendarCells = getCalendarCells(displayMonth);

    const shiftMonth = (direction: -1 | 1) => {
        setDisplayMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const openDatePicker = () => {
        setIsDatePickerOpen((prev) => !prev);
        const sourceDate = dealClosedDate ?? new Date(2026, 11, 1);
        setDisplayMonth(new Date(sourceDate.getFullYear(), sourceDate.getMonth(), 1));
        setIsProjectDropdownOpen(false);
        setIsAgencyDropdownOpen(false);

    };
    useEffect(() => {
        if (isDatePickerOpen) {
            datePickerRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        }
    }, [isDatePickerOpen]);
    const selectDate = (day: number) => {
        const selectedDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
        setDealClosedDate(selectedDate);
        setIsDatePickerOpen(false);
    };

    const resetForm = () => {
        setProjectName("");
        setAgencyName("");
        setLayout("");
        setUnit("");
        setDealClosedDate(null);
        setDealAmount("");
        setCustomerName("");
        setCustomerPhone("");
        setCustomerEmail("");
        setSelectedProjectId("");
        setSelectedAgencyId("");
        setSelectedLayoutId("");
        setSelectedUnitId("");
        setAgencyOptions([]);
        setLayoutOptions([]);
        setUnitOptions([]);
    };

    const handleSave = async () => {
        if (!selectedProjectId) return toast.error("Project is required", "Please select a project.");
        if (!selectedAgencyId) return toast.error("Agency is required", "Please select an agency.");
        if (!selectedLayoutId) return toast.error("Layout is required", "Please select a layout.");
        if (!selectedUnitId) return toast.error("Unit is required", "Please select a unit.");
        if (!dealClosedDate) return toast.error("Closed date is required", "Please select deal closed date.");

        const parsedAmount = Number(String(dealAmount).replace(/,/g, "").trim());
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
            return toast.error("Invalid deal amount", "Please enter a valid deal amount.");
        }

        const customer = {
            name: customerName.trim() || undefined,
            phoneNumber: customerPhone.trim() || undefined,
            email: customerEmail.trim() || undefined,
        };

        setIsSaving(true);
        try {
            await developerService.createRevenue({
                projectId: selectedProjectId,
                agencyId: selectedAgencyId,
                layoutId: selectedLayoutId,
                unitId: selectedUnitId,
                dealAmount: parsedAmount,
                closedDate: dealClosedDate.toISOString(),
                currency: "AED",
                customer: (customer.name || customer.phoneNumber || customer.email) ? customer : undefined,
            });
            toast.success("Deal added successfully");
            resetForm();
            onClose();
            onSaved?.();
        } catch (error: unknown) {
            toast.error("Failed to add deal", (error as { message?: string })?.message || "Could not save deal.");
        } finally {
            setIsSaving(false);
        }
    };
    useEffect(() => {
        if (!isOpen) {
            resetForm();

            setIsProjectDropdownOpen(false);
            setIsAgencyDropdownOpen(false);
            setIsLayoutDropdownOpen(false);
            setIsUnitDropdownOpen(false);
            setIsDatePickerOpen(false);
        }
    }, [isOpen]);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center md:items-center items-end z-[9999]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            {/* Modal container */}
            <div className="relative bg-white w-full md:max-w-[480px] h-auto transform transition-all duration-300 rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header fixed */}
                <div className="shrink-0 flex justify-end  p-[20px_20px_0px_20px] ">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center"
                    >
                        <CancelIcon width={14} height={14} />
                    </button>
                </div>

                {/* Content section */}
                <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_50px]">
                    <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1]">
                        Add deal
                    </h2>
                    <div className="flex flex-col gap-[24px] mt-[35px]">
                        {/* Project name */}
                        <div ref={projectDropdownRef} className="relative">
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Project name</label>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!projectOptions.length) return;
                                    setIsProjectDropdownOpen((prev) => !prev);
                                    setIsAgencyDropdownOpen(false);
                                }}
                                className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
                                disabled={!projectOptions.length || isLoadingProjects}
                            >
                                <span className={`text-[14px] font-[Regular] ${projectName ? "text-[#222]" : "text-[#707070]"}`}>
                                    {isLoadingProjects ? "Loading projects..." : (projectName || "Select project name")}
                                </span>
                                <DownArrowIcon width={11} height={7} className={`transition-transform ${isProjectDropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isProjectDropdownOpen && (
                                <div className="absolute top-[80px] left-0 w-full z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                    {projectOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onMouseDown={(event) => {
                                                event.preventDefault();
                                                setProjectName(option.projectName);
                                                setSelectedProjectId(option.id);
                                                setAgencyName("");
                                                setLayout("");
                                                setUnit("");
                                                setSelectedAgencyId("");
                                                setSelectedLayoutId("");
                                                setSelectedUnitId("");
                                                setAgencyOptions([]);
                                                setLayoutOptions([]);
                                                setUnitOptions([]);
                                                setIsProjectDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${projectName === option.projectName ? "text-[#EA3934] bg-[#FDF2F2]" : "text-[#222]"}`}
                                        >
                                            {option.projectName}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Agency name */}
                        <div ref={agencyDropdownRef} className="relative">
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Agency Name</label>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!selectedProjectId) return;
                                    setIsAgencyDropdownOpen((prev) => !prev);
                                    setIsProjectDropdownOpen(false);
                                }}
                                className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
                                disabled={!selectedProjectId || isLoadingAgencies}
                            >
                                <span className={`text-[14px] font-[Regular] ${agencyName ? "text-[#222]" : "text-[#707070]"}`}>
                                    {isLoadingAgencies ? "Loading agencies..." : (agencyName || "Select Agency")}
                                </span>
                                <DownArrowIcon width={11} height={7} className={`transition-transform ${isAgencyDropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isAgencyDropdownOpen && (
                                <div className="absolute top-[80px] left-0 w-full z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                    {agencyOptions.length === 0 ? (
                                        <div className="px-[14px] py-[9px] text-[13px] font-[Regular] text-[#707070]">
                                            Agency not assigned yet
                                        </div>
                                    ) : (
                                        agencyOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onMouseDown={(event) => {
                                                    event.preventDefault();
                                                    setAgencyName(option.agencyName);
                                                    setSelectedAgencyId(option.id);
                                                    setLayout("");
                                                    setUnit("");
                                                    setSelectedLayoutId("");
                                                    setSelectedUnitId("");
                                                    setLayoutOptions([]);
                                                    setUnitOptions([]);
                                                    setIsAgencyDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${agencyName === option.agencyName ? "text-[#EA3934] bg-[#FDF2F2]" : "text-[#222]"}`}
                                            >
                                                {option.agencyName}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Layout dropdown */}
                        <div ref={layoutDropdownRef} className="relative">
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                Layout
                            </label>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!selectedAgencyId) return;
                                    setIsLayoutDropdownOpen((prev) => !prev);
                                    setIsUnitDropdownOpen(false);
                                }}
                                className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
                                disabled={!selectedAgencyId || isLoadingLayouts}
                            >
                                <span className={`text-[14px] font-[Regular] ${layout ? "text-[#222]" : "text-[#707070]"}`}>
                                    {isLoadingLayouts ? "Loading layouts..." : (layout || "Select layout")}
                                </span>

                                <DownArrowIcon
                                    width={11}
                                    height={7}
                                    className={`transition-transform ${isLayoutDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {isLayoutDropdownOpen && (
                                <div className="absolute top-[80px] left-0 w-full z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                    {layoutOptions.length === 0 ? (
                                        <div className="px-[14px] py-[9px] text-[13px] font-[Regular] text-[#707070]">
                                            Layout not assigned yet
                                        </div>
                                    ) : (
                                        layoutOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    const label = [option.layoutName, option.propertyType].filter(Boolean).join(" / ");
                                                    setLayout(label || option.layoutName);
                                                    setSelectedLayoutId(option.id);
                                                    setUnit("");
                                                    setSelectedUnitId("");
                                                    setUnitOptions([]);
                                                    setIsLayoutDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${layout.includes(option.layoutName) ? "text-[#EA3934] bg-[#FDF2F2]" : "text-[#222]"
                                                    }`}
                                            >
                                                {[option.layoutName, option.buildingName, option.propertyType].filter(Boolean).join(" / ")}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Unit dropdown */}
                        <div ref={unitDropdownRef} className="relative">
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                Unit
                            </label>

                            <button
                                type="button"
                                onClick={() => {
                                    if (!selectedLayoutId) return;
                                    setIsUnitDropdownOpen((prev) => !prev);
                                    setIsLayoutDropdownOpen(false);
                                }}
                                className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
                                disabled={!selectedLayoutId || isLoadingUnits}
                            >
                                <span className={`text-[14px] font-[Regular] ${unit ? "text-[#222]" : "text-[#707070]"}`}>
                                    {isLoadingUnits ? "Loading units..." : (unit || "Select unit")}
                                </span>

                                <DownArrowIcon
                                    width={11}
                                    height={7}
                                    className={`transition-transform ${isUnitDropdownOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {isUnitDropdownOpen && (
                                <div className="absolute top-[80px] left-0 w-full z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                    {unitOptions.length === 0 ? (
                                        <div className="px-[14px] py-[9px] text-[13px] font-[Regular] text-[#707070]">
                                            Agent not assigned yet
                                        </div>
                                    ) : (
                                        unitOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    const unitLabel = option.unitNumber ? `Unit ${option.unitNumber}` : (option.unitId || "Unit");
                                                    setUnit(unitLabel);
                                                    setSelectedUnitId(option.id);
                                                    setIsUnitDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${unit.includes(String(option.unitNumber || option.unitId || "")) ? "text-[#EA3934] bg-[#FDF2F2]" : "text-[#222]"
                                                    }`}
                                            >
                                                {option.unitNumber ? `Unit ${option.unitNumber}` : (option.unitId || "Unit")}
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Deal closed date */}
                        <div ref={datePickerRef} className="relative">
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Deal closed date</label>
                            <button
                                type="button"
                                onClick={openDatePicker}
                                className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
                            >
                                <span className={`text-[14px] font-[Regular] ${dealClosedDate ? "text-[#222]" : "text-[#707070]"}`}>
                                    {dealClosedDate ? formatDisplayDate(dealClosedDate) : "Select"}
                                </span>
                                <span className="inline-flex h-[24px] w-[24px] items-center justify-center">
                                    <CalenderIcon width={20} height={20} />
                                </span>
                            </button>
                            {isDatePickerOpen && (
                                <div className="absolute top-[80px] left-0 w-full z-30 rounded-[12px]  border border-[rgba(34,34,34,0.10)] bg-white md:p-[28px] p-[20px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
                                    <div className="flex items-center justify-between mb-[30px]">
                                        <button type="button" onClick={() => shiftMonth(-1)} className="text-[16px] font-[SemiBold] text-[#222]  rotate-180">
                                            <LeftArrowIcon width={14} height={14} />
                                        </button>
                                        <p className="text-[16px] font-[Bold] text-[#222]">{monthTitle(displayMonth)}</p>
                                        <button type="button" onClick={() => shiftMonth(1)} className="text-[16px] font-[SemiBold] text-[#222]">
                                            <RightArrowIcon width={14} height={14} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-y-[6px] text-center">
                                        {weekDays.map((day, index) => (
                                            <span key={`modal-day-${day}-${index}`} className="text-[13px] font-[SemiBold] text-[#222]">{day}</span>
                                        ))}
                                        {calendarCells.map((day, idx) => {
                                            if (!day) {
                                                return (
                                                    <span
                                                        key={`modal-blank-${idx}`}
                                                        className="h-[30px] w-[30px] mx-auto rounded-full border border-[rgba(34,34,34,0.10)] bg-[#FAFAFA]"
                                                    />
                                                );
                                            }
                                            const isSelected =
                                                !!dealClosedDate &&
                                                dealClosedDate.getDate() === day &&
                                                dealClosedDate.getMonth() === displayMonth.getMonth() &&
                                                dealClosedDate.getFullYear() === displayMonth.getFullYear();
                                            return (
                                                <button
                                                    key={`modal-${day}-${idx}`}
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
                            )}
                        </div>

                        {/* Deal amount */}
                        <div>
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Deal amount</label>
                            <div className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between">
                                <input
                                    type="text"
                                    value={dealAmount}
                                    onChange={(event) => setDealAmount(event.target.value)}
                                    placeholder="Enter deal amount"
                                    className="w-full text-[13px] font-[Regular] text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] placeholder:text-[#707070] focus:outline-none bg-transparent"
                                />
                                <span className="text-[14px] font-[Regular] text-[#222] pl-[10px]">AED</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                User Name  <span className="text-[#8F8F8F] text-[12px] font-[Medium] "> : (Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(event) => setCustomerName(event.target.value)}
                                placeholder="Enter Name"
                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center text-[13px] font-[Regular] text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] placeholder:text-[#707070] focus:outline-none bg-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                Phone Number  <span className="text-[#8F8F8F] text-[12px] font-[Medium] "> : (Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={customerPhone}
                                onChange={(event) => setCustomerPhone(event.target.value)}
                                placeholder="+91"
                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center text-[13px] font-[Regular] text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] placeholder:text-[#707070] focus:outline-none bg-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                Email  <span className="text-[#8F8F8F] text-[12px] font-[Medium] "> : (Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={customerEmail}
                                onChange={(event) => setCustomerEmail(event.target.value)}
                                placeholder="***@gmail.com"
                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center text-[13px] font-[Regular] text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] placeholder:text-[#707070] focus:outline-none bg-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Save button fixed bottom */}
                <div className="shrink-0  p-[20px_20px_20px_20px] md:p-[30px_50px_60px_50px]">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="h-[44px] w-full rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddDealModal;

