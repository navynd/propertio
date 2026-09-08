import AgencyHeader from "../../../../components/Header/AgencyHeader";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import noUserImg from "../../../../assets/img/nouserimg.svg";
import {
  AgentsIcon,
  DownArrowIcon,
  DownloadIcon,
  PdfIcon,
  SuperAgentIcon,
  TickIcon,
} from "../../../../components/CustomFile/icons";
import CloseDealModal from "../../../Agent/LeadsManagement/ProjectLeads/CloseDealModal";
import StatusChangeModal from "./StatusChangeModal";
import { agencyService } from "../../../../services/agencyService";
import { toast } from "../../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../../services/apiClient";
import Loader from "../../../../components/Loader/loader";
type LeadStatusDisplay = string;

const defaultProjectLeadStatusOptions = [
  { name: "Available", value: "available" },
  { name: "Reserved", value: "reserved" },
  { name: "In progress", value: "in-progress" },
  { name: "Follow up", value: "follow-up" },
  { name: "Pre-close", value: "pre-close" },
];

function statusDotClass(status: string) {
  const s = status.trim().toLowerCase().replace(/\s+/g, "-");
  if (s === "available") return "bg-[#00A663]";
  if (s === "reserved") return "bg-[#C7A335]";
  if (s === "in-progress") return "bg-[#FF46A2]";
  if (s === "follow-up") return "bg-[#0832AE]";
  if (s === "pre-close" || s === "preclose") return "bg-[#EA3934]";
  if (s === "waiting-for-approval") return "bg-[#0832AE]";
  return "bg-[#EA3934]";
}

type UnitTileStatus =
  | "agentSold"
  | "soldOther"
  | "agentWorking"
  | "available"
  | "unavailable";

const unitLegend: {
  status: UnitTileStatus;
  label: string;
  swatchClass: string;
}[] = [
    {
      status: "agentSold",
      label: "Units Sold by your agent",
      swatchClass: "bg-[#0832AE]",
    },
    {
      status: "soldOther",
      label: "Units Sold by other",
      swatchClass: "bg-[#EA3934]",
    },
    {
      status: "agentWorking",
      label: "Agent working on",
      swatchClass: "bg-[#00A663]",
    },
    {
      status: "available",
      label: "Units available",
      swatchClass: "bg-[#F3F4F6] border border-[rgba(34,34,34,0.08)]",
    },
    {
      status: "unavailable",
      label: "Units unavailable",
      swatchClass: "bg-[#D1D5DB]",
    },
  ];

function unitTileClass(status: UnitTileStatus) {
  if (status === "agentSold") return "bg-[#0832AE] text-white";
  if (status === "soldOther") return "bg-[#EA3934] text-white";
  if (status === "agentWorking") return "bg-[#00A663] text-white";
  if (status === "available")
    return "bg-[#F5F5F5] text-[#222] border border-[rgba(34,34,34,0.08)]";
  return "bg-[rgba(34,34,34,0.20)] text-[#222]";
}
const mapDisplayState = (state?: string): UnitTileStatus => {
  switch (state) {
    case "agent-working-on":
      return "agentWorking";
    case "sold-by-your-agent":
    case "sold-by-agent":
      return "agentSold";
    case "sold-by-other":
      return "soldOther";
    case "available":
      return "available";
    default:
      return "unavailable";
  }
};
const ProjectLeadsDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const unitDropdownRef = useRef<HTMLDivElement>(null);

  const [leadDetail, setLeadDetail] = useState<any>(null);
  const [imageBaseUrls, setImageBaseUrls] = useState({
    agent: "",
    user: "",
    project: "",
  });
  const [projectImgBaseUrl, setProjectImgBaseUrl] = useState("");
  const [status, setStatus] = useState<LeadStatusDisplay>("Available");
  const [loading, setLoading] = useState(false);
  const [projectLeadStatusOptions, setProjectLeadStatusOptions] = useState(
    defaultProjectLeadStatusOptions,
  );

  const [isCloseDealModalOpen, setIsCloseDealModalOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [isStatusChangeModalOpen, setIsStatusChangeModalOpen] = useState(false);
  const [isCloseInquiryConfirmOpen, setIsCloseInquiryConfirmOpen] =
    useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [isSubmittingCloseDeal, setIsSubmittingCloseDeal] = useState(false);
  const [isSubmittingApprove, setIsSubmittingApprove] = useState(false);
  const [isDeclineReasonOpen, setIsDeclineReasonOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const inquiry = leadDetail?.inquiry;
  const customer = leadDetail?.customer;
  const layoutInfo = leadDetail?.layoutInfo;
  const assignedUnit = leadDetail?.assignedUnit;
  const isStatusReadonly = Boolean(inquiry?.dealApproval?.isWaiting);

  const toAssetUrl = (raw: string | null | undefined, base: string) => {
    if (!raw) return "";
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const cleanBase = base.replace(/\/+$/, "");
    const cleanImage = String(raw).replace(/^\/+/, "");
    return `${cleanBase}/${cleanImage}`;
  };

  const humanize = (value?: string | null) =>
    (value || "")
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  /** Lead source row: show channel (inquiryType), not internal source slugs like project-listing. */
  const formatInquiryTypeForLeadSource = (raw?: string | null) => {
    if (!raw?.trim()) return "";
    const k = raw.trim().toLowerCase().replace(/\s+/g, "-");
    const labels: Record<string, string> = {
      whatsapp: "WhatsApp",
      call: "Call",
      email: "Email",
      sms: "SMS",
      phone: "Phone",
      website: "Website",
      walkin: "Walk-in",
      "walk-in": "Walk-in",
      linkedin: "LinkedIn",
      instagram: "Instagram",
      facebook: "Facebook",
    };
    return labels[k] ?? humanize(raw);
  };

  const toStatusValue = (label: string) => {
    const fromMaster = projectLeadStatusOptions.find(
      (opt) => opt.name === label,
    )?.value;
    if (fromMaster) return fromMaster;
    const normalized = label.trim().toLowerCase().replace(/\s+/g, "-");
    if (
      [
        "available",
        "reserved",
        "in-progress",
        "follow-up",
        "pre-close",
      ].includes(normalized)
    ) {
      return normalized;
    }
    return null;
  };

  const requiresUnitStatus = (value: string) => {
    const key = value.trim().toLowerCase().replace(/\s+/g, "-");
    return ["reserved", "in-progress", "follow-up", "pre-close"].includes(key);
  };

  const loadDetail = async (leadId: string) => {
    setLoading(true);
    try {
      const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
      const fallbackProject = `${fallbackOrigin}/uploads/img/project/`;
      const fallbackUser = `${fallbackOrigin}/uploads/img/user/`;

      const [masterRes, detail] = await Promise.all([
        agencyService.getMasterData([
          "supportedurls",
          "projectLeadStatuses",
          "projectLeadTabs",
          "projectLeadSubTabs",
        ]),
        agencyService.getProjectLeadById(leadId),
      ]);

      const supported = masterRes?.supportedUrls;
      setImageBaseUrls({
        agent: supported?.agentUrl?.img?.trim() || fallbackProject,
        user: supported?.userUrl?.img?.trim() || fallbackUser,
        project: supported?.projectUrl?.img?.trim() || fallbackProject,
      });
      setProjectImgBaseUrl(supported?.projectUrl?.img?.trim() || fallbackProject);

      const masterAny = masterRes as Record<string, unknown>;
      const statusRows =
        (masterAny.projectLeadStatuses as unknown) ||
        masterAny.projectleadstatuses;
      if (Array.isArray(statusRows)) {
        const rows = statusRows
          .filter(
            (item: { name?: string; value?: string }) =>
              item?.name?.trim() && item?.value?.trim(),
          )
          .map((item: { name: string; value: string }) => ({
            name: item.name.trim(),
            value: item.value.trim(),
          }));
        if (rows.length) setProjectLeadStatusOptions(rows);
      }

      setLeadDetail(detail || null);
    } catch (error: unknown) {
      toast.error("Load failed", getApiErrorMessage(error, "Failed to load lead."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    void loadDetail(id);
  }, [id, location.key]);

  const projectName = useMemo(
    () => leadDetail?.project?.projectName || inquiry?.projectTitle || "--/--",
    [leadDetail?.project?.projectName, inquiry?.projectTitle],
  );

  const agentName = useMemo(
    () => leadDetail?.agent?.fullName || "--/--",
    [leadDetail?.agent?.fullName],
  );

  const agentTitle = useMemo(() => {
    const a = leadDetail?.agent;
    if (!a) return "Property consultant";
    if (a.isSuperAgent || a.agentType === "superagent") return "Super agent";
    if (a.agentType === "company") return "Company agent";
    return "Property consultant";
  }, [leadDetail?.agent]);

  const agentEmail = useMemo(
    () => leadDetail?.agent?.email || "--/--",
    [leadDetail?.agent?.email],
  );

  const agentPhone = useMemo(
    () => leadDetail?.agent?.phoneNumber || "--/--",
    [leadDetail?.agent?.phoneNumber],
  );

  const customerName = useMemo(
    () => customer?.name || "--/--",
    [customer?.name],
  );

  const customerEmail = useMemo(
    () => customer?.email || "--/--",
    [customer?.email],
  );

  const customerPhone = useMemo(
    () => customer?.phoneNumber || "--/--",
    [customer?.phoneNumber],
  );

  const customerDate = useMemo(
    () =>
      customer?.inquiredAt
        ? new Date(customer.inquiredAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        : "--/--",
    [customer?.inquiredAt],
  );

  const leadSource = useMemo(
    () =>
      formatInquiryTypeForLeadSource(inquiry?.inquiryType) ||
      formatInquiryTypeForLeadSource(customer?.leadSource) ||
      "WhatsApp",
    [inquiry?.inquiryType, customer?.leadSource],
  );

  /** Prefer human unit number; else catalogue `unitId`; never raw Mongo id in UI. */
  const assignedUnitDisplay = useMemo(() => {
    const u = assignedUnit as {
      unitNumber?: string | number | null;
      unitId?: string | null;
    } | null;
    const custNum = (customer as { unitNumber?: string | null } | undefined)
      ?.unitNumber;
    if (u?.unitNumber != null && String(u.unitNumber).trim() !== "") {
      return `Unit ${String(u.unitNumber).trim()}`;
    }
    if (custNum != null && String(custNum).trim() !== "") {
      return `Unit ${String(custNum).trim()}`;
    }
    if (u?.unitId != null && String(u.unitId).trim() !== "") {
      return String(u.unitId).trim();
    }
    return "";
  }, [assignedUnit, customer]);

  const dealSummaryAmountDisplay = useMemo(() => {
    const waiting = Boolean(inquiry?.dealApproval?.isWaiting);
    const da = inquiry?.dealApproval as
      | { dealAmount?: number | null; currency?: string | null }
      | null
      | undefined;
    if (waiting && da) {
      const amt =
        da.dealAmount ??
        (customer as { dealAmount?: number | null } | undefined)?.dealAmount;
      if (amt == null || Number.isNaN(Number(amt))) return "";
      const cur =
        (da.currency && String(da.currency).trim()) || "AED";
      return `${Number(amt).toLocaleString("en-US")} ${cur}`;
    }

    const dc = inquiry?.dealClosed as
      | {
        isClosed?: boolean;
        dealAmount?: number | null;
        dealClosureRef?: { currency?: string | null } | null;
      }
      | null
      | undefined;
    if (!dc?.isClosed) return "";
    const amt =
      dc.dealAmount ??
      (customer as { dealAmount?: number | null } | undefined)?.dealAmount;
    if (amt == null || Number.isNaN(Number(amt))) return "";
    const cur =
      (dc.dealClosureRef?.currency &&
        String(dc.dealClosureRef.currency).trim()) ||
      "AED";
    return `${Number(amt).toLocaleString("en-US")} ${cur}`;
  }, [inquiry?.dealApproval, inquiry?.dealClosed, customer]);

  const customerAvatar = useMemo(() => {
    const raw = (customer as { profilePicture?: string | null } | undefined)
      ?.profilePicture;
    const url = toAssetUrl(raw || null, imageBaseUrls.user);
    return url || noUserImg;
  }, [customer, imageBaseUrls.user]);

  const unitTiles = useMemo(() => {
    const raw = leadDetail?.units;
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map(
        (
          u: {
            displayState?: string;
            unitNumber?: string;
          },
          i: number,
        ) => ({
          status: mapDisplayState(u?.displayState),
          label: u?.unitNumber
            ? `Unit-${u.unitNumber}`
            : `Unit-${String(i + 1).padStart(3, "0")}`,
        }),
      );
    }
    return [];
  }, [leadDetail?.units]);

  const allowedUnits = useMemo(() => {
    const agentUnits = leadDetail?.agentUnits;
    return Array.isArray(agentUnits) ? agentUnits : [];
  }, [leadDetail?.agentUnits]);

  const unitOptions = useMemo(
    () =>
      allowedUnits
        .map((u: { unitNumber?: string }) =>
          u?.unitNumber ? `Unit-${u.unitNumber}` : "",
        )
        .filter(Boolean),
    [allowedUnits],
  );

  const selectedUnitId = useMemo(() => {
    const unitNumber = selectedUnit.replace(/^Unit-/, "");
    if (!unitNumber) return "";
    const match = allowedUnits.find(
      (u: { unitNumber?: string }) =>
        String(u?.unitNumber || "") === unitNumber,
    );
    return match?.id ? String(match.id) : "";
  }, [allowedUnits, selectedUnit]);

  const getUnitIdFromLabel = (label: string) => {
    const unitNumber = label.replace(/^Unit-/, "");
    if (!unitNumber) return "";
    const match = allowedUnits.find(
      (u: { unitNumber?: string }) =>
        String(u?.unitNumber || "") === unitNumber,
    );
    return match?.id ? String(match.id) : "";
  };

  const filteredProjectLeadStatusOptions = useMemo(() => {
    const hasUnitSelected = selectedUnit.trim() !== "";
    if (!hasUnitSelected) return projectLeadStatusOptions;
    return projectLeadStatusOptions.filter(
      (opt) => opt.value.trim().toLowerCase() !== "available",
    );
  }, [projectLeadStatusOptions, selectedUnit]);

  const isPreCloseSaved =
    (inquiry?.projectLeadStatus || "").trim().toLowerCase() === "pre-close";

  useEffect(() => {
    const raw = inquiry?.projectLeadStatus || "";
    if (!raw) return;
    const fromMaster = projectLeadStatusOptions.find(
      (item) => item.value === raw,
    )?.name;
    setStatus(fromMaster || humanize(raw));
  }, [inquiry?.projectLeadStatus, projectLeadStatusOptions]);

  useEffect(() => {
    if (unitOptions.length === 0) {
      setSelectedUnit("");
      return;
    }
    const assigned = assignedUnit?.unitNumber
      ? `Unit-${assignedUnit.unitNumber}`
      : "";
    if (!selectedUnit && assigned && unitOptions.includes(assigned)) {
      setSelectedUnit(assigned);
      return;
    }
    if (selectedUnit && !unitOptions.includes(selectedUnit)) {
      setSelectedUnit("");
    }
  }, [assignedUnit?.unitNumber, selectedUnit, unitOptions]);

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

  const toImageUrl = (image: string | null, type: "agent" | "user") => {
    if (!image) return type === "user" ? noUserImg : noUserImg;
    if (image.startsWith("http")) return image;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;

    const base =
      (type === "agent" ? imageBaseUrls.agent : imageBaseUrls.user) ||
      fallbackBase;

    const cleanBase = base.replace(/\/+$/, "");
    const cleanImage = image.replace(/^\/+/, "");

    return `${cleanBase}/${cleanImage}`;
  };

  const dealDoc = inquiry?.dealApproval?.document;
  const dealDocHref = dealDoc?.url
    ? dealDoc.url.startsWith("http")
      ? dealDoc.url
      : toAssetUrl(dealDoc.url, imageBaseUrls.project || projectImgBaseUrl)
    : "";

  const isTerminalLayout =
    inquiry?.status === "closed" || Boolean(inquiry?.dealClosed?.isClosed);
  const showSetStatus =
    inquiry?.status !== "closed" && !inquiry?.dealClosed?.isClosed;
  const showVerifyCard = Boolean(inquiry?.dealApproval?.isWaiting);

  const floorPlanImageUrl = useMemo(() => {
    const raw = layoutInfo?.floorPlan as string | null | undefined;
    if (raw == null || String(raw).trim() === "") return "";
    const url = toAssetUrl(raw, projectImgBaseUrl);
    return typeof url === "string" && url.trim() !== "" ? url : "";
  }, [layoutInfo?.floorPlan, projectImgBaseUrl]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      {/* Header */}
      <AgencyHeader
        title="Leads detail"
        showBack={true}
        onBackClick={() => navigate(-1)}
      />

      {/* Project name bar */}
      <div className="rounded-[15px] bg-white md:p-[15px_30px] p-[15px_20px] min-w-0 flex justify-between flex-wrap gap-[20px] items-center">
        <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
          <span className="text-[#707070] font-[Regular]">Project Name : </span>
          <span className="text-[#222] font-[Bold]">{projectName}</span>
        </p>

        <button
          type="button"
          onClick={() => navigate(`/agency/leads/view-project-details/${id}`)}
          className="cursor-pointer h-[44px] leading-[100%] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[14px] font-[Bold] transition-opacity hover:opacity-90"
        >
          View project details
        </button>
      </div>

      {/* 3 cards row */}
      <div className="rounded-[15px] min-w-0">
        <div
          className={`grid gap-[18px] ${isTerminalLayout ? "md:grid-cols-2 grid-cols-1" : "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"}`}
        >
          {/* Assigned agent */}
          <div className="rounded-[15px] bg-[#F5F5F5] md:p-[30px] p-[16px] border-[4px] border-[#FFF]">
            <h3 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-[18px]">
              Assigned agent
            </h3>

            <div className="mt-[18px] flex items-center gap-[12px] mb-[18px]">
              <div className="w-[54px] h-[54px] rounded-full overflow-hidden shrink-0 border border-[rgba(34,34,34,0.10)] bg-white">
                <img
                  src={toImageUrl(leadDetail?.agent?.profilePicture, "agent")}
                  alt="agent"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex flex-col gap-[5px]">
                {leadDetail?.agent?.isSuperAgent ? (
                  <span className="flex items-center justify-center gap-1 bg-[#EA3934] w-fit h-[21px] p-[6px_7px] text-[10px] font-[SemiBold] text-white text-uppercase ">
                    <SuperAgentIcon width={10} height={10} />
                    SUPER AGENT
                  </span>
                ) : <span className="flex items-center justify-center gap-1 bg-[#0832AE] w-fit h-[21px] p-[6px_7px] text-[10px] font-[SemiBold] text-white text-uppercase ">
                  <AgentsIcon width={10} height={10} />
                  AGENT
                </span>}

                <span className="text-[15px] text-[#222] font-[Bold] truncate">
                  {agentName}
                </span>
                <span className="text-[12px] text-[#707070] font-[Regular] truncate">
                  {agentTitle}
                </span>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-3 py-3 border-b border-[rgba(34,34,34,0.10)] text-[13px]">
                <span className="text-[#222] font-[Regular]">
                  Email address
                </span>
                <span className="text-[#222] font-[Bold] truncate">
                  {agentEmail}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 py-3 text-[14px]">
                <span className="text-[#222] font-[Regular]">Phone number</span>
                <span className="text-[#222] font-[Bold] truncate">
                  {agentPhone}
                </span>
              </div>
            </div>
          </div>

          {/* Customer details */}
          <div className="rounded-[15px] bg-[#F5F5F5] md:p-[30px] p-[16px] border-[4px] border-[#FFF]">
            <h3 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-[18px]">
              Customer details
            </h3>

            <div className="flex items-center gap-[12px] mb-[18px]">
              <div className="w-[60px] h-[60px] rounded-full overflow-hidden shrink-0  flex items-center justify-center">
                <img
                  src={customerAvatar}
                  alt="customer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-[Bold] text-[#222] truncate">
                  {customerName}
                </p>
                <p className="text-[12px] font-[Regular] text-[#707070] truncate">
                  Inquired on {customerDate}
                </p>
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-3 py-3 border-b border-[rgba(34,34,34,0.10)] text-[14px]">
                <span className="text-[#222] font-[Regular]">
                  Email address
                </span>
                <span className="text-[#222] font-[Bold] truncate">
                  {customerEmail}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 py-3 border-b border-[rgba(34,34,34,0.10)] text-[14px]">
                <span className="text-[#222] font-[Regular]">Phone number</span>
                <span className="text-[#222] font-[Bold] truncate">
                  {customerPhone}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 py-3 border-b border-[rgba(34,34,34,0.10)] text-[14px]">
                <span className="text-[#222] font-[Regular]">Date</span>
                <span className="text-[#222] font-[Bold] truncate">
                  {customerDate}
                </span>
              </div>
              <div
                className={`flex items-center justify-between gap-3 py-3 text-[14px] ${inquiry?.dealClosed?.isClosed ||
                  inquiry?.dealApproval?.isWaiting
                  ? "border-b border-[rgba(34,34,34,0.10)]"
                  : ""
                  }`}
              >
                <span className="text-[#222] font-[Regular]">Lead source</span>
                <span className="text-[#222] font-[Bold] truncate">
                  {leadSource}
                </span>
              </div>
              {inquiry?.dealClosed?.isClosed ||
                inquiry?.dealApproval?.isWaiting ? (
                <>
                  <div className="flex items-center justify-between gap-3 py-3 border-b border-[rgba(34,34,34,0.10)] text-[14px]">
                    <span className="text-[#222] font-[Regular]">Unit</span>
                    <span className="text-[#222] font-[Bold] truncate">
                      {assignedUnitDisplay || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 py-3 text-[14px]">
                    <span className="text-[#222] font-[Regular]">
                      Deal amount
                    </span>
                    <span className="text-[#222] font-[Bold] truncate">
                      {dealSummaryAmountDisplay || "—"}
                    </span>
                  </div>
                </>
              ) : null}
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
              {inquiry?.status === "attended" &&
                !inquiry?.dealApproval?.isWaiting &&
                !inquiry?.dealClosed?.isClosed && (
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
                  <span className="w-[20px] h-[20px] bg-[#FFF] rounded-full flex items-center justify-center">
                    <TickIcon width={10} height={10} fill="#00A663" />
                  </span>
                  Deal is closed
                </button>
              )}
            </div>
          </div>

          {/* Set status */}
          {showSetStatus && !showVerifyCard && (
            <div className="rounded-[15px] bg-[#F5F5F5] md:p-[30px] p-[16px] border-[4px] border-[#FFF]">
              <h3 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-[18px]">
                Set status
              </h3>

              <div>
                <p className="text-[12px] font-[SemiBold] text-[#222] mb-[8px]">
                  Project status <span className="text-[#EA3934]">*</span>
                </p>

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
                      {status !== "Inquiry closed" &&
                        status !== "Waiting for approval" && (
                          <span
                            className={`h-[6px] w-[6px] rounded-full ${statusDotClass(status)}`}
                          />
                        )}
                      <span>{status}</span>
                    </span>
                    <DownArrowIcon width={10} height={6} />
                  </button>
                  {inquiry?.status === "attended" && inquiry?.statusHelperText ? (
                    <p className="text-[12px] font-[Regular] text-[#707070] mt-[10px]">
                      <span className="text-[#707070]">*</span> {inquiry.statusHelperText}
                    </p>
                  ) : inquiry?.status === "attended" ? (
                    <p className="text-[12px] font-[Regular] text-[#707070] mt-[10px]">
                      <span className="text-[#707070]">*</span> This reserved status will be kept for 7 days
                    </p>
                  ) : null}
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
                              <span
                                className={`h-[6px] w-[6px] rounded-full ${statusDotClass(opt.name)}`}
                              />
                            )}
                            {opt.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

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
                      <span
                        className={`text-[13px] font-[Regular] truncate ${selectedUnit ? "text-[#222]" : "text-[#707070]"}`}
                      >
                        {selectedUnit || "Select unit"}
                      </span>
                      <DownArrowIcon
                        width={10}
                        height={6}
                        className={`transition-transform ${isUnitOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isUnitOpen && (
                      <div className="absolute left-0 right-0 top-[48px] z-30 bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px] max-h-[200px] overflow-y-auto">
                        {unitOptions.map((unit: string) => (
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
                    const hasValidUnit =
                      selectedUnit.trim() !== "" &&
                      unitOptions.includes(selectedUnit);
                    if (needUnit && !hasValidUnit) {
                      setIsStatusChangeModalOpen(true);
                      return;
                    }
                    const statusValue = toStatusValue(status);
                    if (!statusValue) {
                      toast.error(
                        "Invalid status",
                        "Please select a valid status.",
                      );
                      return;
                    }
                    setIsSubmittingStatus(true);
                    try {
                      await agencyService.updateAgencyProjectLeadStatus(id, {
                        type: "set-project-status",
                        projectLeadStatus: statusValue as
                          | "available"
                          | "reserved"
                          | "in-progress"
                          | "follow-up"
                          | "pre-close",
                        unitId: needUnit ? selectedUnitId : undefined,
                      });
                      toast.success(
                        "Updated",
                        "Project lead status updated successfully.",
                      );
                      await loadDetail(id);
                    } catch (error: unknown) {
                      toast.error(
                        "Update failed",
                        getApiErrorMessage(
                          error,
                          "Failed to update status.",
                        ),
                      );
                    } finally {
                      setIsSubmittingStatus(false);
                    }
                  }}
                  className="h-[44px] flex-1 px-[16px] rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold] transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmittingStatus
                    ? "Saving..."
                    : isPreCloseSaved
                      ? "Close deal"
                      : "Save"}
                </button>
              </div>
            </div>
          )}

          {showVerifyCard && (
            <div className="rounded-[15px] bg-[#F5F5F5] md:p-[30px] p-[16px] border-[4px] border-[#FFF]">
              <h3 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-[18px]">
                Verify and approve
              </h3>

              <p className="text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                Uploaded document
              </p>

              {dealDoc?.filename ? (
                <div className="rounded-[10px] bg-white shadow-[0_-1px_18px_0px_rgba(0,0,0,0.10)] p-[25px_20px] flex items-center gap-4 min-w-0">
                  <span className="shrink-0 inline-flex">
                    <PdfIcon width={34} height={42} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-[Bold] text-[#222] truncate">
                      {dealDoc.filename}
                    </p>
                    <p className="text-[12px] font-[Regular] text-[#707070] mt-1">
                      {inquiry?.dealApproval?.submittedAt
                        ? `Uploaded on ${new Date(inquiry.dealApproval.submittedAt).toLocaleDateString("en-GB")}`
                        : "Uploaded document"}
                    </p>
                  </div>
                  {dealDocHref ? (
                    <a
                      href={dealDocHref}
                      target="_blank"
                      rel="noreferrer"
                      download={dealDoc.filename}
                      aria-label="Download document"
                      className="cursor-pointer shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-[10px] bg-[#F5F5F5] border border-[rgba(34,34,34,0.08)] flex items-center justify-center hover:bg-[#EBEBEB] transition-colors"
                    >
                      <DownloadIcon width={14} height={14} />
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-[14px] text-[#707070]">No document uploaded.</p>
              )}

              <div className="mt-[33px] flex flex-col items-center gap-[10px]">
                <button
                  type="button"
                  disabled={isSubmittingApprove}
                  onClick={async () => {
                    if (!id) return;
                    setIsSubmittingApprove(true);
                    try {
                      await agencyService.approveAgencyProjectLeadDeal(id, {
                        action: "approve",
                        dealType: "sale",
                      });
                      toast.success("Approved", "Deal approved successfully.");
                      await loadDetail(id);
                    } catch (error: unknown) {
                      toast.error(
                        "Approve failed",
                        getApiErrorMessage(error, "Could not approve deal."),
                      );
                    } finally {
                      setIsSubmittingApprove(false);
                    }
                  }}
                  className="w-full h-[44px] px-[16px] rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold] transition-opacity disabled:opacity-60"
                >
                  {isSubmittingApprove ? "Saving..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={isSubmittingApprove}
                  onClick={() => {
                    setDeclineReason("");
                    setIsDeclineReasonOpen(true);
                  }}
                  className="w-full h-[44px] leading-[100%] px-[16px] rounded-[10px] border border-[#222] text-[#222] text-[14px] font-[Bold] disabled:opacity-60"
                >
                  Decline
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
            <span className="text-[#222] font-[Bold]">
              {layoutInfo?.buildingName || "--/--"}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[14px]">
          {[
            {
              label: "Layout name",
              value: layoutInfo?.layoutName || "--/--",
            },
            {
              label: "Number of beds",
              value: layoutInfo?.bedrooms ?? "--/--",
            },
            {
              label: "Number of units available",
              value: layoutInfo?.availableUnits ?? "--/--",
            },
            {
              label: "Number of units assigned",
              value: layoutInfo?.unitsAssigned ?? "--/--",
            },
            {
              label: "Property type",
              value: layoutInfo?.propertyType || "--/--",
            },
            {
              label: "Number of baths",
              value: layoutInfo?.bathrooms ?? "--/--",
            },
            {
              label: "Area of this property",
              value:
                layoutInfo?.areaSqft != null
                  ? `${layoutInfo.areaSqft} sqft`
                  : "--/--",
            },
            {
              label: "Price",
              value:
                layoutInfo?.startingPrice?.amount != null
                  ? `${Number(layoutInfo.startingPrice.amount).toLocaleString("en-US")} ${layoutInfo.startingPrice.currency || "AED"}`
                  : "--/--",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-[15px] bg-white md:p-[20px_30px] p-[16px]"
            >
              <p className="text-[12px] font-[Medium] text-[#222] mb-[6px]">
                {card.label}
              </p>
              <p className="text-[16px] font-[Bold] text-[#222] leading-tight">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
          <h3 className="text-[16px] md:text-[20px] font-[Bold] text-[#222] mb-[16px]">
            Floor plan
          </h3>
          <div className="max-w-[min(100%,540px)] w-full h-[360px]">
            {floorPlanImageUrl ? (
              <img
                src={floorPlanImageUrl}
                alt="Floor plan"
                className="w-full h-full rounded-[12px] object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5]">
                <p className="px-6 text-center text-[15px] font-[Medium] text-[#707070]">
                  Floor plan not available
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Units — status grid + legend (design match) */}
      <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
        <h3 className="text-[16px] md:text-[20px] font-[Bold] text-[#222] mb-[14px]">
          Units
        </h3>

        <div className="flex flex-wrap gap-x-[20px] gap-y-[10px] mb-[20px]">
          {unitLegend.map((item) => (
            <span
              key={item.status}
              className="inline-flex items-center gap-[8px] text-[12px] font-[Regular] text-[#222]"
            >
              <span
                className={`h-[15px] w-[15px] shrink-0 rounded-[5px] ${item.swatchClass}`}
              />
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
            const uploadRes =
              await agencyService.uploadAgencyProjectCloseDealDocument(formData);
            const uploadedDoc = uploadRes?.document;
            if (!uploadedDoc?.url || !uploadedDoc?.filename) {
              toast.error("Upload failed", "Failed to upload deal document.");
              return false;
            }
            await agencyService.submitAgencyProjectLeadDeal(id, {
              dealAmount,
              currency: currency || "AED",
              dealType: "sale",
              document: {
                url: uploadedDoc.url,
                filename: uploadedDoc.filename,
                uploadedAt: uploadedDoc.uploadedAt,
              },
            });
            toast.success("Submitted", "Deal closed successfully.");
            await loadDetail(id);
            return true;
          } catch (error: unknown) {
            toast.error(
              "Submit failed",
              getApiErrorMessage(error, "Failed to submit deal."),
            );
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
        unitOptions={unitOptions}
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
            await agencyService.updateAgencyProjectLeadStatus(id, {
              type: "set-project-status",
              projectLeadStatus: statusValue as
                | "available"
                | "reserved"
                | "in-progress"
                | "follow-up"
                | "pre-close",
              unitId: unitIdFromModal,
            });
            toast.success(
              "Updated",
              "Project lead status updated successfully.",
            );
            await loadDetail(id);
            return true;
          } catch (error: unknown) {
            toast.error(
              "Update failed",
              getApiErrorMessage(error, "Failed to update status."),
            );
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
                      await agencyService.updateAgencyProjectLeadStatus(id, {
                        type: "close-inquiry",
                      });
                      toast.success("Updated", "Inquiry closed successfully.");
                      setIsCloseInquiryConfirmOpen(false);
                      await loadDetail(id);
                    } catch (error: unknown) {
                      toast.error(
                        "Update failed",
                        getApiErrorMessage(
                          error,
                          "Failed to close inquiry.",
                        ),
                      );
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
      {isDeclineReasonOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-5"
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (isSubmittingApprove) return;
            setIsDeclineReasonOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-[520px] rounded-[15px] bg-white p-6 md:p-8"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <p className="text-[16px] font-[Bold] text-[#222] mb-3">
              Decline deal
            </p>
            <p className="text-[13px] text-[#707070] mb-3">
              Please provide a reason for declining (required).
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={4}
              className="w-full rounded-[10px] border border-[rgba(34,34,34,0.12)] p-3 text-[14px] outline-none focus:border-[#0832AE]"
              placeholder="Reason..."
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isSubmittingApprove}
                onClick={() => setIsDeclineReasonOpen(false)}
                className="h-[44px] px-5 rounded-[10px] border border-[#222] text-[14px] font-[Bold]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingApprove}
                onClick={async () => {
                  if (!id?.trim()) return;
                  const reason = declineReason.trim();
                  if (!reason) {
                    toast.error(
                      "Reason required",
                      "Please enter a decline reason.",
                    );
                    return;
                  }
                  setIsSubmittingApprove(true);
                  try {
                    await agencyService.approveAgencyProjectLeadDeal(id, {
                      action: "decline",
                      declinedReason: reason,
                    });
                    toast.success("Declined", "Deal request declined.");
                    setIsDeclineReasonOpen(false);
                    await loadDetail(id);
                  } catch (error: unknown) {
                    toast.error(
                      "Decline failed",
                      getApiErrorMessage(error, "Could not decline deal."),
                    );
                  } finally {
                    setIsSubmittingApprove(false);
                  }
                }}
                className="h-[44px] px-5 rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold] disabled:opacity-60"
              >
                {isSubmittingApprove ? "Saving..." : "Submit decline"}
              </button>
            </div>
          </div>
        </div>
      )}
      {loading && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
          <Loader size={90} margin={0} />
        </div>
      )}
    </div>
  );
};

export default ProjectLeadsDetail;
