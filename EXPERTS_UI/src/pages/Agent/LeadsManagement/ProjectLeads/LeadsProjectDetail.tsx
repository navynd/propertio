import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import noUserImg from "../../../../assets/img/nouserimg.svg";
import { DownArrowIcon, TickIcon } from "../../../../components/CustomFile/icons";
import CloseDealModal from "./CloseDealModal";
import StatusChangeModal from "./StatusChangeModal";
import Loader from "../../../../components/Loader/loader";
import { agentService, type AgentProjectLeadDetailResponse } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";

type LeadStatus = string;

function statusDotClass(status: LeadStatus) {
    const key = status.trim().toLowerCase().replace(/\s+/g, "-");
    if (key === "available") return "bg-[#00A663]";
    if (key === "reserved") return "bg-[#C7A335]";
    if (key === "in-progress") return "bg-[#FF46A2]";
    if (key === "follow-up") return "bg-[#0832AE]";
    if (key === "pre-close") return "bg-[#EA3934]";
    if (key === "waiting-for-approval") return "bg-[#0832AE]";
    return "bg-[#EA3934]";
}

const defaultProjectLeadStatusOptions = [
    { name: "Available", value: "available" },
    { name: "Reserved", value: "reserved" },
    { name: "In progress", value: "in-progress" },
    { name: "Follow up", value: "follow-up" },
    { name: "Pre-close", value: "pre-close" },
];

const propertyDetailCards = [
    { label: "Layout name", value: "TYPE A – 1BHK" },
    { label: "Number of beds", value: "2" },
    { label: "Number of units available", value: "20" },
    { label: "Number of units assigned", value: "15" },
    { label: "Property type", value: "Apartment" },
    { label: "Number of baths", value: "4" },
    { label: "Area of this property", value: "1,396 sqft" },
    { label: "Price", value: "4.8M AED" },
];

type UnitTileStatus = "agentSold" | "soldOther" | "agentWorking" | "available" | "unavailable";

const unitLegend: { status: UnitTileStatus; label: string; swatchClass: string }[] = [
    { status: "agentSold", label: "Units Sold by your agent", swatchClass: "bg-[#0832AE]" },
    { status: "soldOther", label: "Units Sold by other", swatchClass: "bg-[#EA3934]" },
    { status: "agentWorking", label: "Agent working on", swatchClass: "bg-[#00A663]" },
    { status: "available", label: "Units available", swatchClass: "bg-[#F3F4F6] border border-[rgba(34,34,34,0.08)]" },
    { status: "unavailable", label: "Units unavailable", swatchClass: "bg-[#D1D5DB]" },
];

function unitTileClass(status: UnitTileStatus) {
    if (status === "agentSold") return "bg-[#0832AE] text-white";
    if (status === "soldOther") return "bg-[#EA3934] text-white";
    if (status === "agentWorking") return "bg-[#00A663] text-white";
    if (status === "available") return "bg-[#F5F5F5] text-[#222] border border-[rgba(34,34,34,0.08)]";
    return "bg-[rgba(34,34,34,0.20)] text-[#222]";
}
const LeadsProjectDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<AgentProjectLeadDetailResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [projectImgBaseUrl, setProjectImgBaseUrl] = useState("");
    const [projectVideoBaseUrl, setProjectVideoBaseUrl] = useState("");
    const [projectDocBaseUrl, setProjectDocBaseUrl] = useState("");
    const [userImgBaseUrl, setUserImgBaseUrl] = useState("");
    const [isCloseDealModalOpen, setIsCloseDealModalOpen] = useState(false);
    const [isSubmittingCloseDeal, setIsSubmittingCloseDeal] = useState(false);
    const [isCloseInquiryConfirmOpen, setIsCloseInquiryConfirmOpen] = useState(false);
    const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
    const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
    const [status, setStatus] = useState<LeadStatus>("Available");
    const [projectLeadStatusOptions, setProjectLeadStatusOptions] = useState(defaultProjectLeadStatusOptions);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [isUnitOpen, setIsUnitOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState("");
    const unitDropdownRef = useRef<HTMLDivElement>(null);

    const humanize = (value?: string | null) =>
        (value || "")
            .split("-")
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");
    const toStatusValue = (label: string) => {
        const fromMaster = projectLeadStatusOptions.find((opt) => opt.name === label)?.value;
        if (fromMaster) return fromMaster as "available" | "reserved" | "in-progress" | "follow-up" | "pre-close";
        const normalized = label.trim().toLowerCase().replace(/\s+/g, "-");
        if (["available", "reserved", "in-progress", "follow-up", "pre-close"].includes(normalized)) {
            return normalized as "available" | "reserved" | "in-progress" | "follow-up" | "pre-close";
        }
        return null;
    };

    const loadDetail = async (leadId: string) => {
        setIsLoading(true);
        try {
            const [supportedRes, detail, masterRes] = await Promise.all([
                agentService.getSupportedUrlsMasterData(),
                agentService.getProjectLeadById(leadId),
                agentService.getProjectLeadMasterData(),
            ]);
            const anySupported = supportedRes as unknown as {
                supportedUrls?: {
                    projectUrl?: { img?: string; vid?: string; doc?: string };
                    userUrl?: { img?: string };
                };
                supportedurls?: {
                    projectUrl?: { img?: string; vid?: string; doc?: string };
                    userUrl?: { img?: string };
                };
                projectUrl?: { img?: string; vid?: string; doc?: string };
                userUrl?: { img?: string };
            };
            const projectUrl =
                anySupported?.supportedUrls?.projectUrl ||
                anySupported?.supportedurls?.projectUrl ||
                anySupported?.projectUrl ||
                {};
            const userUrl =
                anySupported?.supportedUrls?.userUrl ||
                anySupported?.supportedurls?.userUrl ||
                anySupported?.userUrl ||
                {};
            setProjectImgBaseUrl(projectUrl.img || "");
            setProjectVideoBaseUrl(projectUrl.vid || "");
            setProjectDocBaseUrl(projectUrl.doc || "");
            setUserImgBaseUrl(userUrl.img || "");
            setData(detail || null);
            const projectMaster = masterRes as unknown as {
                projectLeadStatuses?: Array<{ name?: string; value?: string }>;
                projectleadstatuses?: Array<{ name?: string; value?: string }>;
            };
            const statuses =
                projectMaster?.projectLeadStatuses ||
                projectMaster?.projectleadstatuses ||
                [];
            if (statuses.length) {
                setProjectLeadStatusOptions(
                    statuses
                        .filter((item) => item?.name?.trim() && item?.value?.trim())
                        .map((item) => ({ name: item.name!.trim(), value: item.value!.trim() }))
                );
            }
        } catch (error: unknown) {
            const message = (error as { message?: string })?.message || "Failed to fetch project lead detail.";
            toast.error("Load failed", message);
        } finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        if (!id) return;
        void loadDetail(id);
    }, [id]);

    const inquiry = data?.inquiry;
    const customer = data?.customer;
    const layoutInfo = data?.layoutInfo;
    const assignedUnit = data?.assignedUnit;
    const isStatusReadonly = Boolean(inquiry?.dealApproval?.isWaiting);

    const toAssetUrl = (raw: string | null | undefined, base: string) => {
        if (!raw) return "";
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        return base ? `${base.replace(/\/?$/, "/")}${raw}` : raw;
    };

    const projectName = useMemo(() => data?.project?.projectName || inquiry?.projectTitle || "--/--", [data?.project?.projectName, inquiry?.projectTitle]);
    const customerName = useMemo(() => customer?.name || "--/--", [customer?.name]);
    const customerEmail = useMemo(() => customer?.email || "--/--", [customer?.email]);
    const customerPhone = useMemo(() => customer?.phoneNumber || "--/--", [customer?.phoneNumber]);
    const customerDate = useMemo(
        () => (customer?.inquiredAt ? new Date(customer.inquiredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "--/--"),
        [customer?.inquiredAt]
    );
    const leadSource = useMemo(() => customer?.leadSource || "Whatsapp", [customer?.leadSource]);
    const floorPlanUrl = useMemo(
        () => toAssetUrl(layoutInfo?.floorPlan, projectImgBaseUrl),
        [layoutInfo?.floorPlan, projectImgBaseUrl]
    );

    const customerAvatar = useMemo(
        () => toAssetUrl(customer?.profilePicture, userImgBaseUrl) || noUserImg,
        [customer?.profilePicture, userImgBaseUrl]
    );

    const unitTiles = useMemo(() => {
        const raw = data?.units;
        if (Array.isArray(raw) && raw.length > 0) {
            return raw.map((u, i) => ({
                status: ((() => {
                    if (u?.displayState === "sold-by-your-agent") return "agentSold";
                    if (u?.displayState === "sold-by-other") return "soldOther";
                    if (u?.displayState === "agent-working-on") return "agentWorking";
                    if (u?.displayState === "unavailable") return "unavailable";
                    return "available";
                })()) as UnitTileStatus,
                label: u?.unitNumber ? `Unit-${u.unitNumber}` : `Unit-${String(i + 1).padStart(3, "0")}`,
            }));
        }
        return [];
    }, [data?.units]);

    const allowedUnits = useMemo(() => {
        const assignedId = assignedUnit?.id ? String(assignedUnit.id) : "";
        return (data?.units || []).filter((u) => {
            const unitId = u?.id ? String(u.id) : "";
            if (!unitId) return false;
            if (assignedId && unitId === assignedId) return true;
            return u?.status === "available";
        });
    }, [assignedUnit?.id, data?.units]);
    const unitOptions = useMemo(
        () =>
            allowedUnits
                .map((u) => (u?.unitNumber ? `Unit-${u.unitNumber}` : ""))
                .filter(Boolean),
        [allowedUnits]
    );
    const availableUnitOptions = useMemo(
        () =>
            allowedUnits
                .map((u) => (u?.unitNumber ? `Unit-${u.unitNumber}` : ""))
                .filter(Boolean),
        [allowedUnits]
    );
    const selectedUnitId = useMemo(() => {
        const unitNumber = selectedUnit.replace(/^Unit-/, "");
        if (!unitNumber) return "";
        const match = allowedUnits.find((u) => String(u?.unitNumber || "") === unitNumber);
        return match?.id ? String(match.id) : "";
    }, [allowedUnits, selectedUnit]);
    const getUnitIdFromLabel = (label: string) => {
        const unitNumber = label.replace(/^Unit-/, "");
        if (!unitNumber) return "";
        const match = allowedUnits.find((u) => String(u?.unitNumber || "") === unitNumber);
        return match?.id ? String(match.id) : "";
    };

    useEffect(() => {
        const raw = inquiry?.projectLeadStatus || "";
        if (!raw) return;
        const fromMaster = projectLeadStatusOptions.find((item) => item.value === raw)?.name;
        setStatus(fromMaster || humanize(raw));
    }, [inquiry?.projectLeadStatus, projectLeadStatusOptions]);

    useEffect(() => {
        if (unitOptions.length === 0) {
            setSelectedUnit("");
            return;
        }
        const assigned = assignedUnit?.unitNumber ? `Unit-${assignedUnit.unitNumber}` : "";
        if (!selectedUnit && assigned && unitOptions.includes(assigned)) {
            setSelectedUnit(assigned);
            return;
        }
        if (selectedUnit && !unitOptions.includes(selectedUnit)) {
            setSelectedUnit("");
        }
    }, [assignedUnit?.unitNumber, selectedUnit, unitOptions]);

    const requiresUnitStatus = (value: string) => {
        const key = value.trim().toLowerCase().replace(/\s+/g, "-");
        return ["reserved", "in-progress", "follow-up", "pre-close"].includes(key);
    };
    const filteredProjectLeadStatusOptions = useMemo(() => {
        // If any unit is selected/assigned, "Available" should not be selectable.
        const hasUnitSelected = selectedUnit.trim() !== "";
        if (!hasUnitSelected) return projectLeadStatusOptions;
        return projectLeadStatusOptions.filter(
            (opt) => opt.value.trim().toLowerCase() !== "available"
        );
    }, [projectLeadStatusOptions, selectedUnit]);
    const isPreCloseSaved = (inquiry?.projectLeadStatus || "").trim().toLowerCase() === "pre-close";

    useEffect(() => {
        if (!isUnitOpen) return;
        const onDocMouseDown = (e: MouseEvent) => {
            const el = unitDropdownRef.current;
            if (el && !el.contains(e.target as Node)) {
                setIsUnitOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, [isUnitOpen]);

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            {/* Project name bar */}
            <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px] items-center">
                <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
                    <span className="text-[#707070] font-[Regular]">Project Name : </span>
                    <span className="text-[#222] font-[Bold]">{projectName}</span>
                </p>

                <button
                    type="button"
                    onClick={() => navigate(`/agent/leads/view-project-details`, { state: { leadId: id } })}
                    className="cursor-pointer h-[44px] leading-[100%] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[14px] font-[Bold] transition-opacity hover:opacity-90"
                >
                    View project details
                </button>
            </div>

            {/* 3 cards row */}
            <div className="rounded-[15px] min-w-0">
                <div className={`grid gap-[18px] ${(inquiry?.status === "closed" || inquiry?.dealClosed?.isClosed) ? "md:grid-cols-1 grid-cols-1" : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-2"}`}>
                    {/* Customer details */}
                    <div className="rounded-[15px] bg-[#F5F5F5] md:p-[30px] p-[16px] border-[4px] border-[#FFF]">
                        <h3 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-[18px]">Customer details</h3>

                        <div className="flex items-center gap-[12px] mb-[18px]">
                            <div className="w-[60px] h-[60px] rounded-full overflow-hidden shrink-0  flex items-center justify-center">
                                <img src={customerAvatar} alt="customer" className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[15px] font-[Bold] text-[#222] truncate">{customerName}</p>
                                <p className="text-[12px] font-[Regular] text-[#707070] truncate">Inquired on {customerDate}</p>
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center justify-between gap-3 py-3 border-b border-[rgba(34,34,34,0.10)] text-[14px]">
                                <span className="text-[#222] font-[Regular]">Email address</span>
                                <span className="text-[#222] font-[Bold] truncate">{customerEmail}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 py-3 border-b border-[rgba(34,34,34,0.10)] text-[14px]">
                                <span className="text-[#222] font-[Regular]">Phone number</span>
                                <span className="text-[#222] font-[Bold] truncate">{customerPhone}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 py-3 border-b border-[rgba(34,34,34,0.10)] text-[14px]">
                                <span className="text-[#222] font-[Regular]">Date</span>
                                <span className="text-[#222] font-[Bold] truncate">{customerDate}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 py-3 text-[14px]">
                                <span className="text-[#222] font-[Regular]">Lead source</span>
                                <span className="text-[#222] font-[Bold] truncate">{leadSource}</span>
                            </div>
                        </div>
                        <div className="flex flex-col mt-[35px]">
                            {inquiry?.status === "new" && (
                                <button
                                    type="button"
                                    className="h-[44px] w-full rounded-[10px] bg-[#E7EBF7] border border-[#0832AE] text-[#0832AE] text-[14px] font-[Bold] transition-opacity"
                                >
                                    New Inquiry
                                </button>
                            )}
                            {inquiry?.status === "attended" && !inquiry?.dealApproval?.isWaiting && !inquiry?.dealClosed?.isClosed && (
                                <button
                                    type="button"
                                    className="h-[44px] w-full rounded-[10px] bg-[#E6F7F0] border border-[#00A663] text-[#00A663] text-[14px] font-[Bold] transition-opacity"
                                >
                                    Attended
                                </button>
                            )}
                            {inquiry?.status === "closed" && !inquiry?.dealClosed?.isClosed && (
                                <button
                                    type="button"
                                    className="h-[44px] w-full rounded-[10px] bg-[#FDE7E7] border border-[#E80808] text-[#E80808] text-[14px] font-[Bold] transition-opacity"
                                >
                                    Inquiry Closed
                                </button>
                            )}
                            {inquiry?.dealApproval?.isWaiting && (
                                <button
                                    type="button"
                                    className="h-[44px] w-full rounded-[10px] bg-[#FDE7E7] border border-[#E80808] text-[#E80808] text-[14px] font-[Bold] transition-opacity"
                                >
                                    Waiting for approval
                                </button>
                            )}
                            {inquiry?.dealClosed?.isClosed && (
                                <button
                                    type="button"
                                    className="h-[44px] w-full rounded-[10px] bg-[#00A663] text-[#FFF] text-[14px] font-[Bold] transition-opacity flex items-center justify-center gap-[5px]"
                                >
                                    <span className="w-[20px] h-[20px] bg-[#FFF] rounded-full flex items-center justify-center"><TickIcon width={10} height={10} fill="#00A663" /></span>Deal is closed
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Set status section */}
                    {inquiry?.status !== "closed" && !inquiry?.dealClosed?.isClosed && (
                        <div className="rounded-[15px] bg-[#F5F5F5] md:p-[30px] p-[16px] border-[4px] border-[#FFF]">
                            <h3 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-[18px]">Set status</h3>
                            {/* Project status */}
                            <div>
                                <p className="text-[12px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Project status <span className="text-[#EA3934]">*</span>
                                </p>

                                {/* Status dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        disabled={isStatusReadonly}
                                        onClick={() => {
                                            if (isStatusReadonly) return;
                                            setIsStatusOpen((o) => !o);
                                        }}
                                        className="h-[44px] w-full rounded-[10px] bg-white border border-[rgba(34,34,34,0.10)] px-[12px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center justify-between disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        <span className="inline-flex items-center gap-[8px]">
                                            {status !== "Inquiry closed" && status !== "Waiting for approval" && (
                                                <span className={`h-[6px] w-[6px] rounded-full ${statusDotClass(status)}`} />
                                            )}
                                            <span>{status}</span>
                                        </span>
                                        <DownArrowIcon width={10} height={6} />
                                    </button>
                                    {inquiry?.status === "attended" && (
                                        <p className="text-[12px] font-[Regular] text-[#707070] mt-[10px]">
                                            <span className="text-[#707070]">*</span>  This reserved status will be kept for 7 days
                                        </p>
                                    )}
                                    {isStatusOpen && (
                                        <div className="absolute left-0 right-0 top-[42px] z-30 bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                            {filteredProjectLeadStatusOptions.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        if (isStatusReadonly) return;
                                                        setStatus(opt.name);
                                                        setIsStatusOpen(false);
                                                    }}
                                                    className="w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] text-[#222]"
                                                >
                                                    <span className="inline-flex items-center gap-[8px]">
                                                        {opt.name !== "Waiting for approval" && (
                                                            <span className={`h-[6px] w-[6px] rounded-full ${statusDotClass(opt.name)}`} />
                                                        )}
                                                        {opt.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Units dropdown */}
                            {inquiry?.status === "attended" && (
                                <div className="mt-[30px]">
                                    <p className="text-[12px] font-[SemiBold] text-[#222] mb-[8px]">
                                        Units
                                    </p>
                                    <div className="relative" ref={unitDropdownRef}>
                                        <button
                                            type="button"
                                            disabled={isStatusReadonly}
                                            onClick={() => {
                                                if (isStatusReadonly) return;
                                                setIsUnitOpen((o) => !o);
                                            }}
                                            className="h-[44px] w-full rounded-[10px] bg-white border border-[rgba(34,34,34,0.10)] px-[12px] text-[12px] font-[SemiBold] text-[#222] inline-flex items-center justify-between cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            <span className={`text-[13px] font-[Regular] truncate ${selectedUnit ? "text-[#222]" : "text-[#707070]"}`}>
                                                {selectedUnit || "Select unit"}
                                            </span>
                                            <DownArrowIcon width={10} height={6} className={`transition-transform ${isUnitOpen ? "rotate-180" : ""}`} />
                                        </button>
                                        {isUnitOpen && (
                                            <div className="absolute left-0 right-0 top-[48px] z-30 bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px] max-h-[200px] overflow-y-auto">
                                                {unitOptions.map((unit) => (
                                                    <button
                                                        key={unit}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            if (isStatusReadonly) return;
                                                            setSelectedUnit(unit);
                                                            setIsUnitOpen(false);
                                                        }}
                                                        className="w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] text-[#222]"
                                                    >
                                                        {unit}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mt-[30px] flex items-center gap-[10px]">
                                <button
                                    type="button"
                                    disabled={isStatusReadonly || isSubmittingStatus}
                                    onClick={() => {
                                        if (!id || isStatusReadonly) return;
                                        setIsCloseInquiryConfirmOpen(true);
                                    }}
                                    className="h-[44px] leading-[100%] flex-1 px-[16px] rounded-[10px] border border-[#222] text-[#222] text-[14px] font-[Bold] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingStatus ? "Saving..." : "Close inquiry"}
                                </button>
                                <button
                                    type="button"
                                    disabled={isStatusReadonly || isSubmittingStatus}
                                    onClick={async () => {
                                        if (!id || isStatusReadonly) return;
                                        if (isPreCloseSaved) {
                                            setIsCloseDealModalOpen(true);
                                            return;
                                        }
                                        const needUnit = requiresUnitStatus(status);
                                        const hasValidUnit = selectedUnit.trim() !== "" && unitOptions.includes(selectedUnit);
                                        if (needUnit && !hasValidUnit) {
                                            setIsStatusChangeModalOpen(true);
                                            return;
                                        }
                                        const statusValue = toStatusValue(status);
                                        if (!statusValue) {
                                            toast.error("Invalid status", "Please select a valid status.");
                                            return;
                                        }
                                        setIsSubmittingStatus(true);
                                        try {
                                            await agentService.updateProjectLeadStatus(id, {
                                                type: "set-project-status",
                                                projectLeadStatus: statusValue,
                                                unitId: needUnit ? selectedUnitId : undefined,
                                            });
                                            toast.success("Updated", "Project lead status updated successfully.");
                                            await loadDetail(id);
                                        } catch (error: unknown) {
                                            const message = (error as { message?: string })?.message || "Failed to update status.";
                                            toast.error("Update failed", message);
                                        } finally {
                                            setIsSubmittingStatus(false);
                                        }
                                    }}
                                    className="h-[44px] flex-1 px-[16px] rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingStatus ? "Saving..." : isPreCloseSaved ? "Close deal" : "Save"}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Unit / layout: name bar + detail grid + floor plan (design match) */}
            <div className="flex flex-col gap-[16px]">
                <div className="rounded-[15px] bg-white md:p-[20px_30px] p-[16px]">
                    <p className="md:text-[20px] text-[16px] leading-[140%]">
                        <span className="text-[#707070] font-[Regular]">Name : </span>
                        <span className="text-[#222] font-[Bold]">{layoutInfo?.buildingName || "--/--"}</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
                    {[
                        { label: "Layout name", value: layoutInfo?.layoutName || "--/--" },
                        { label: "Number of beds", value: layoutInfo?.bedrooms ?? "--/--" },
                        { label: "Number of units available", value: layoutInfo?.availableUnits ?? "--/--" },
                        { label: "Number of units assigned", value: layoutInfo?.unitsAssigned ?? "--/--" },
                        { label: "Property type", value: layoutInfo?.propertyType || "--/--" },
                        { label: "Number of baths", value: layoutInfo?.bathrooms ?? "--/--" },
                        { label: "Area of this property", value: layoutInfo?.areaSqft != null ? `${layoutInfo.areaSqft} sqft` : "--/--" },
                        {
                            label: "Price",
                            value: layoutInfo?.startingPrice?.amount != null
                                ? `${Number(layoutInfo.startingPrice.amount).toLocaleString("en-US")} ${layoutInfo.startingPrice.currency || "AED"}`
                                : "--/--",
                        },
                    ].map((card) => (
                        <div
                            key={card.label}
                            className="rounded-[15px] bg-white md:p-[20px_30px] p-[16px]"
                        >
                            <p className="text-[12px] font-[Medium] text-[#222] mb-[6px]">{card.label}</p>
                            <p className="text-[16px] font-[Bold] text-[#222] leading-tight">{card.value}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
                    <h3 className="text-[16px] md:text-[20px] font-[Bold] text-[#222] mb-[16px]">Floor plan</h3>
                    <div className="max-w-[min(100%,540px)] w-full h-[360px]">
                        {floorPlanUrl ? (
                            <img
                                src={floorPlanUrl}
                                alt="Floor plan"
                                className="w-full h-full rounded-[12px] object-cover"
                            />
                        ) : (
                            <div className="w-full h-full rounded-[12px] bg-[#F5F5F5] flex items-center justify-center text-[13px] text-[#707070]">
                                Floor plan not available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Units — status grid + legend (design match) */}
            <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
                <h3 className="text-[16px] md:text-[20px] font-[Bold] text-[#222] mb-[14px]">Units</h3>

                <div className="flex flex-wrap gap-x-[20px] gap-y-[10px] mb-[20px]">
                    {unitLegend.map((item) => (
                        <span key={item.status} className="inline-flex items-center gap-[8px] text-[12px] font-[Regular] text-[#222]">
                            <span className={`h-[15px] w-[15px] shrink-0 rounded-[5px] ${item.swatchClass}`} />
                            {item.label}
                        </span>
                    ))}
                </div>

                <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
                    <div className="grid min-w-[600px] w-full grid-cols-7 gap-[8px] sm:min-w-0">
                        {unitTiles.map((tile) => (
                            <div
                                key={tile.label}
                                className={`rounded-[8px] min-h-[39px] px-[20px] flex items-center justify-center text-center text-[11px] sm:text-[12px] font-[SemiBold] leading-tight ${unitTileClass(tile.status)}`}
                            >
                                {tile.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <CloseDealModal
                isOpen={isCloseDealModalOpen}
                onClose={() => setIsCloseDealModalOpen(false)}
                customerName={customer?.name || ""}
                customerEmail={customer?.email || ""}
                customerPhone={customer?.phoneNumber || ""}
                isSubmitting={isSubmittingCloseDeal}
                onConfirmClose={async ({ dealAmount, currency, documentFile }) => {
                    if (!id) return false;
                    setIsSubmittingCloseDeal(true);
                    try {
                        const formData = new FormData();
                        formData.append("document", documentFile);
                        const uploadRes = await agentService.uploadProjectCloseDealDocument(formData);
                        const uploadedDoc = uploadRes?.document;
                        if (!uploadedDoc?.url || !uploadedDoc?.filename) {
                            toast.error("Upload failed", "Failed to upload deal document.");
                            return false;
                        }
                        await agentService.submitProjectLeadDeal(id, {
                            dealAmount,
                            currency: currency || "AED",
                            document: {
                                url: uploadedDoc.url,
                                filename: uploadedDoc.filename,
                                uploadedAt: uploadedDoc.uploadedAt,
                            },
                        });
                        toast.success("Submitted", "Deal submitted for approval.");
                        await loadDetail(id);
                        return true;
                    } catch (error: unknown) {
                        const message = (error as { message?: string })?.message || "Failed to submit deal.";
                        toast.error("Submit failed", message);
                        return false;
                    } finally {
                        setIsSubmittingCloseDeal(false);
                    }
                }}
            />
            <StatusChangeModal
                isOpen={isStatusChangeModalOpen}
                onClose={() => setIsStatusChangeModalOpen(false)}
                nextStatus={status}
                unitOptions={availableUnitOptions}
                onSave={async (modalUnit) => {
                    if (!id || isStatusReadonly || isSubmittingStatus) return false;
                    const statusValue = toStatusValue(status);
                    if (!statusValue) {
                        toast.error("Invalid status", "Please select a valid status.");
                        return false;
                    }
                    const unitIdFromModal = getUnitIdFromLabel(modalUnit);
                    if (!unitIdFromModal) {
                        toast.error("Unit required", "Please select an available unit.");
                        return false;
                    }
                    setSelectedUnit(modalUnit);
                    setIsSubmittingStatus(true);
                    try {
                        await agentService.updateProjectLeadStatus(id, {
                            type: "set-project-status",
                            projectLeadStatus: statusValue,
                            unitId: unitIdFromModal,
                        });
                        toast.success("Updated", "Project lead status updated successfully.");
                        await loadDetail(id);
                        return true;
                    } catch (error: unknown) {
                        const message = (error as { message?: string })?.message || "Failed to update status.";
                        toast.error("Update failed", message);
                        return false;
                    } finally {
                        setIsSubmittingStatus(false);
                    }
                }}
            />
            {isCloseInquiryConfirmOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-5"
                    onMouseDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (isSubmittingStatus) return;
                        setIsCloseInquiryConfirmOpen(false);
                    }}
                >
                    <div
                        className="relative w-full max-w-[550px] rounded-[15px] bg-white"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="p-[30px_24px] md:p-[40px_50px]">
                            <p className="text-center text-[15px] md:text-[20px] font-[Bold] text-[#222] leading-[150%] px-1">
                                Are you sure you want to close the inquiry?
                            </p>
                            <div className="mt-8 flex items-center justify-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCloseInquiryConfirmOpen(false)}
                                    disabled={isSubmittingStatus}
                                    className="h-[44px] px-[20px] w-auto rounded-[10px] border border-[#222] bg-white text-[14px] font-[Bold] text-[#222] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    No
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmittingStatus}
                                    onClick={async () => {
                                        if (!id || isStatusReadonly) return;
                                        setIsSubmittingStatus(true);
                                        try {
                                            await agentService.updateProjectLeadStatus(id, { type: "close-inquiry" });
                                            toast.success("Updated", "Inquiry closed successfully.");
                                            setIsCloseInquiryConfirmOpen(false);
                                            await loadDetail(id);
                                        } catch (error: unknown) {
                                            const message = (error as { message?: string })?.message || "Failed to close inquiry.";
                                            toast.error("Update failed", message);
                                        } finally {
                                            setIsSubmittingStatus(false);
                                        }
                                    }}
                                    className="h-[44px] px-[20px] w-auto rounded-[10px] bg-[#EA3934] text-[14px] font-[Bold] text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isSubmittingStatus ? "Saving..." : "Yes"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
        </div >
    );
};

export default LeadsProjectDetail;     
