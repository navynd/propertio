import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CopyDarkIcon,
  TrashIcon,
  EditIcon,
  DownArrowIcon,
  PlusUserIcon,
  SearchIcon,
  EyeDarkIcon,
} from "../../../components/CustomFile/icons";
import profileimg from "../../../assets/img/user.png";
import { RoleBadge, type AgentRoleLabel } from "./SuperAgent";
import Pagenation from "../../../components/Pagenation/Pagenation";
import AgencyHeader from "../../../components/Header/AgencyHeader";
import mainbg from "../../../assets/img/mainbg.png";
import {
  agencyService,
  type SortByProjectMasterItem,

} from "../../../services/agencyService";
import { toast } from "../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../services/apiClient";
import Loader from "../../../components/Loader/loader";
import AllocateAgentModal from "../Allocation/PropertyAllocation/AllocateAgentModal";
const LISTINGS_ITEMS_PER_PAGE = 5;

/** Matches list view: accepted invite, awaiting agency verification (not invite-email `pending`). */
function isAgencyApprovalPending(agent: any): boolean {
  if (!agent) return false;
  const inv = String(agent.invitationStatus ?? "").toLowerCase();
  return inv === "accepted" && agent.isVerified !== true;
}

function isInvitationDeclined(agent: any): boolean {
  if (!agent) return false;
  return String(agent.invitationStatus ?? "").toLowerCase() === "declined";
}

/** Property listings block only for verified, non-declined agents */
function shouldShowAgentListings(agent: any): boolean {
  if (!agent) return false;
  if (isInvitationDeclined(agent)) return false;
  if (isAgencyApprovalPending(agent)) return false;
  return true;
}

type LocationState = { agent?: SuperAgentRow };
type SuperAgentRow = {
  _id?: string;
  id?: string;
  name: string;
  role: AgentRoleLabel;
  title: string;
  status: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  defaultAvatar?: string;
  languages?: string[];
};


const SuperAgentDetail = () => {
  const navigate = useNavigate();


  const shellRef = useRef<HTMLDivElement>(null);
  const [listingTabs, setListingTabs] = useState<
    { id?: string; name: string; slug: string }[]
  >([{ name: "All", slug: "all" }]);
  const [activateAgent, setActivateAgent] = useState(false);
  const [jobRole, setJobRole] = useState<{ _id: string; title: string } | null>(null);
  const [agentType, setAgentType] = useState<{
    label: string;
    value: string;
  } | null>(null);
  const [openDropdown, setOpenDropdown] = useState<null | "job" | "agent">(
    null,
  );
  const [activeAgentListingsTab, setActiveAgentListingsTab] = useState("all");
  const [selectedListingIds, setSelectedListingIds] = useState<Set<number>>(
    new Set(),
  );
  const [listingsPage, setListingsPage] = useState(1);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState("Featured");
  const [listingSearch, setListingSearch] = useState("");
  const [debouncedListingSearch, setDebouncedListingSearch] = useState("");
  const [sortOptions, setSortOptions] = useState<SortByProjectMasterItem[]>([]);
  const selectedSortLabel =
    sortOptions.find((option) => option.value === selectedSort)?.name || selectedSort;
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [agentData, setAgentData] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(false);
  const [listingLoading, setListingLoading] = useState(false);
  const [listingTotalItems, setListingTotalItems] = useState(0);
  const [imageBaseUrls, setImageBaseUrls] = useState({
    agent: "",
    property: "",
  });
  const { id: agentId } = useParams();
  const [propertyListings, setPropertyListings] = useState<any[]>([]);
  const [jobRoleOptions, setJobRoleOptions] = useState<any[]>([]);
  const [agentTypeOptions, setAgentTypeOptions] = useState<any[]>([]);
  const [isListingDropdownOpen, setIsListingDropdownOpen] = useState(false);
  const listingDropdownRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [verifyAction, setVerifyAction] = useState<null | "approve" | "decline">(
    null,
  );
  const verifyBusy = verifyAction !== null;
  const [isAllocateAgentModalOpen, setIsAllocateAgentModalOpen] =
    useState(false);

  const approvalPending = isAgencyApprovalPending(agentData);
  const invitationDeclined = isInvitationDeclined(agentData);
  const showAgentListingsSection = shouldShowAgentListings(agentData);





  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node))
        setOpenDropdown(null);
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
      if (
        listingDropdownRef.current &&
        !listingDropdownRef.current.contains(event.target as Node)
      ) {
        setIsListingDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // const copyLinkedIn = async () => {
  //   const url = agentData?.socialLinks?.linkedin ?? "";
  //   if (!url) return;
  //   try {
  //     await navigator.clipboard.writeText(url);
  //   } catch {
  //     /* ignore */
  //   }
  // };
  const copyLinkedIn = async () => {
    const url = agentData?.socialLinks?.linkedin ?? "";

    if (!url) {
      toast.error("No link", "LinkedIn URL not available.");
      return;
    }

    try {
      await navigator.clipboard.writeText(url);

      toast.success(
        "Copied",
        "LinkedIn URL copied successfully.",
      );
    } catch (error) {
      toast.error(
        "Copy failed",
        "Unable to copy LinkedIn URL.",
      );
    }
  };
  const avatarSrc = agentData?.profilePicture ?? profileimg;
  const displayName = agentData?.fullName ?? "—";
  const languagesDisplay = Array.isArray(agentData?.languages)
    ? agentData.languages
      .map((l: any) => l?.name)
      .filter(Boolean)
      .join(", ")
    : "—";
  const linkedinUrl = agentData?.socialLinks?.linkedin ?? "";

  const normalizedListings = propertyListings.map((item: any) => ({
    id: item._id,
    name: item.title,
    image:
      item.images?.find((i: any) => i.isPrimary)?.url ||
      item.images?.[0]?.url,
    location: item.location?.fullAddress,
    projectStatus: item.listingType?.name || item.listingType?.slug || "-",
    Beds: item.bedrooms,
    Baths: item.bathrooms,
    AED: item.price,
    status: item.status,
  }));

  const normalizeStatusLabel = (value: string) => {
    const status = String(value || "").trim().toLowerCase();
    if (status === "active") return "Active";
    if (status === "inactive") return "Inactive";
    if (status === "sold") return "Sold";
    if (status === "rented") return "Rented";
    if (status === "pending") return "Pending";
    return value || "-";
  };

  const visibleListings = useMemo(() => normalizedListings, [normalizedListings]);

  useEffect(() => {
    setListingsPage(1);
  }, [activeAgentListingsTab]);

  useEffect(() => {
    setListingsPage(1);
  }, [listingSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedListingSearch(listingSearch.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [listingSearch]);

  const paginatedListings = visibleListings;

  const allPageListingsSelected =
    paginatedListings.length > 0 &&
    paginatedListings.every((r) => selectedListingIds.has(r.id));

  const toggleSelectAllPageListings = () => {
    setSelectedListingIds((prev) => {
      const next = new Set(prev);
      if (allPageListingsSelected) {
        paginatedListings.forEach((r) => next.delete(r.id));
      } else {
        paginatedListings.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const toggleListingRowSelection = (id: number) => {
    setSelectedListingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


  useEffect(() => {
    if (!agentId) return;

    const fetchAgentData = async () => {
      try {
        setPageLoading(true);
        const agentRes = await agencyService.getAgentById(agentId, {
          listPage: listingsPage,
          listLimit: LISTINGS_ITEMS_PER_PAGE,
        });
        setAgentData(agentRes.agent);
        setActivateAgent(Boolean(agentRes?.agent?.isActive));
      } catch (err) {
        console.error("Agent API error", err);
      } finally {
        setPageLoading(false);
      }
    };

    fetchAgentData();
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    const agentDocId = agentData?._id != null ? String(agentData._id) : "";
    if (!agentData || agentDocId !== String(agentId)) {
      setPropertyListings([]);
      setListingTotalItems(0);
      setListingLoading(false);
      return;
    }
    if (!shouldShowAgentListings(agentData)) {
      setPropertyListings([]);
      setListingTotalItems(0);
      setListingLoading(false);
      return;
    }

    const fetchAgentProperties = async () => {
      const activeListingTab = listingTabs.find(
        (tab) => tab.slug === activeAgentListingsTab,
      );
      try {
        setListingLoading(true);
        const propertyRes = await agencyService.getAgentProperties({
          agentId,
          page: listingsPage,
          limit: LISTINGS_ITEMS_PER_PAGE,
          sortBy: selectedSort,
          search: debouncedListingSearch || undefined,
          listingType:
            activeAgentListingsTab !== "all" ? activeListingTab?.id : undefined,
        });
        setPropertyListings(propertyRes?.items || []);
        setListingTotalItems(propertyRes?.pagination?.total || 0);
      } catch (err) {
        console.error("Property API error", err);
        setPropertyListings([]);
        setListingTotalItems(0);
      } finally {
        setListingLoading(false);
      }
    };

    fetchAgentProperties();
  }, [
    agentId,
    agentData,
    activeAgentListingsTab,
    listingsPage,
    selectedSort,
    listingTabs,
    debouncedListingSearch,
  ]);
  useEffect(() => {
    let isMounted = true;

    const loadMasterData = async () => {
      try {
        const res = await agencyService.getMasterData([
          "listingtypes",
          "sortbyproject",
          "supportedurls",
          "jobtitles",
          "agenttypes",
        ]);

        if (!isMounted) return;

        /** ---------------- Listing Tabs ---------------- */
        const listingTypes = res?.listingTypes || [];

        const apiTabs = listingTypes
          .filter((item: any) => item.isActive)
          .filter((item: any) => item.slug !== "new-projects")
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
          .map((item: any) => ({
            id: item._id,
            name: item.name,
            slug: item.slug,
          }));

        setListingTabs([{ name: "All", slug: "all" }, ...apiTabs]);

        /** ---------------- Sort Options ---------------- */
        const sortData = res?.sortByProject || [];
        setSortOptions(sortData);

        if (sortData.length > 0) {
          setSelectedSort(sortData[0].value);
        }

        /** ---------------- Image Base URLs ---------------- */
        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallback = `${fallbackOrigin}/uploads/img/property/`;

        const supported = res?.supportedUrls;

        setImageBaseUrls({
          agent: supported?.agentUrl?.img?.trim() || fallback,
          property: supported?.propertyUrl?.img?.trim() || fallback,
        });

        /** ---------------- Job Roles ---------------- */
        const jobRoles = res?.jobTitles || [];
        setJobRoleOptions(jobRoles);

        /** ---------------- Agent Types ---------------- */
        const agentTypes = res?.agentTypes || [];
        setAgentTypeOptions(
          agentTypes.map((a: any) => ({
            label: a.name,
            value: a.value,
          }))
        );

      } catch (err) {
        console.error("Master data error:", err);
      }
    };

    loadMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleActivateToggle = async () => {
    if (
      !agentId ||
      isTogglingActive ||
      isInvitationDeclined(agentData) ||
      isAgencyApprovalPending(agentData)
    ) {
      return;
    }
    const previous = activateAgent;
    const next = !activateAgent;
    setActivateAgent(next);
    setIsTogglingActive(true);
    try {
      const res = await agencyService.updateAgent(agentId, { isActive: next });
      const updated = res?.agent || res?.data?.agent || res?.data;
      if (!updated) {
        throw new Error("Invalid update response from server.");
      }
      setAgentData((prev: any) =>
        prev ? { ...prev, isActive: updated.isActive } : updated,
      );
      setActivateAgent(Boolean(updated.isActive));
      toast.success("Saved", "Agent updated successfully.");
    } catch (err) {
      setActivateAgent(previous);
      toast.error(
        "Could not update",
        getApiErrorMessage(err, "Could not update activation status."),
      );
    } finally {
      setIsTogglingActive(false);
    }
  };

  const handleSave = async () => {
    if (!agentId || isInvitationDeclined(agentData)) return;
    if (!jobRole?._id) {
      toast.error("Validation required", "Please select agent job role.");
      return;
    }
    if (!agentType?.value) {
      toast.error("Validation required", "Please select agent type.");
      return;
    }

    const payload = {
      isActive: activateAgent,

      // 👇 only value (NO id)
      agentType: agentType?.value || "",

      specialization: jobRole?._id || "",
    };

    try {
      setIsSaving(true);
      const res = await agencyService.updateAgent(agentId, payload);
      const updated = res?.agent || res?.data?.agent || res?.data;
      if (!updated) {
        throw new Error("Invalid update response from server.");
      }

      // update UI state directly
      setAgentData(updated);

      const matchedAgentType = agentTypeOptions.find(
        (a) => a.value === updated.agentType
      );

      setAgentType(matchedAgentType || null);
      setActivateAgent(updated.isActive);
      setAgentData((prev: any) => ({
        ...prev,
        agentType: updated.agentType,
        specialization: updated.specialization,
        status: updated.status,
      }));

      // sync job role dropdown (IMPORTANT FIX)
      const matchedJobRole = jobRoleOptions.find(
        (j) => j._id === updated.specialization?._id
      );
      setJobRole(matchedJobRole || null);

      toast.success("Saved", "Agent updated successfully.");
    } catch (err) {
      toast.error(
        "Could not save",
        getApiErrorMessage(err, "Failed to update agent details."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleApproveAgent = async () => {
    if (!agentId || verifyBusy) return;
    if (!jobRole?._id) {
      toast.error("Validation required", "Please select agent job role.");
      return;
    }
    if (!agentType?.value) {
      toast.error("Validation required", "Please select agent type.");
      return;
    }
    setVerifyAction("approve");
    try {
      const data = await agencyService.verifyAgent(agentId, {
        action: "approve",
        specializationId: jobRole._id,
        agentType: agentType.value,
        isActive: true,
      });
      const agent = data?.agent;
      if (agent) {
        setAgentData(agent);
        setActivateAgent(Boolean(agent.isActive));
        const specId =
          typeof agent.specialization === "object"
            ? agent.specialization?._id
            : agent.specialization;
        const matchedJob = jobRoleOptions.find((j) => j._id === specId);
        setJobRole(matchedJob || null);
        const matchedType = agentTypeOptions.find((a) => a.value === agent.agentType);
        setAgentType(matchedType || null);
      }
      toast.success("Verified", "Agent verified successfully.");
    } catch (err) {
      toast.error(
        "Could not approve",
        getApiErrorMessage(err, "Could not approve this agent."),
      );
    } finally {
      setVerifyAction(null);
    }
  };

  const handleDeclineAgent = async () => {
    if (!agentId || verifyBusy) return;
    setVerifyAction("decline");
    try {
      await agencyService.verifyAgent(agentId, { action: "decline" });
      toast.success("Declined", "Agent verification declined.");
      navigate("/agency/super-agent");
    } catch (err) {
      toast.error(
        "Could not decline",
        getApiErrorMessage(err, "Could not decline this agent."),
      );
    } finally {
      setVerifyAction(null);
    }
  };

  useEffect(() => {
    if (!agentData || !agentTypeOptions.length) return;

    const matched = agentTypeOptions.find(
      (opt) => opt.value === agentData.agentType
    );

    setAgentType(matched ?? null);
  }, [agentData, agentTypeOptions]);

  useEffect(() => {
    if (!agentData || !jobRoleOptions.length) return;

    const specializationId =
      typeof agentData.specialization === "object"
        ? agentData.specialization?._id
        : agentData.specialization;

    const matched = jobRoleOptions.find(
      (j) => j._id === specializationId
    );

    setJobRole(matched || null);
  }, [agentData, jobRoleOptions]);

  const toImageUrl = (image: string | null, type: "agent" | "property") => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/property/`;

    const base =
      (type === "agent" ? imageBaseUrls.agent : imageBaseUrls.property) ||
      fallbackBase;

    const cleanBase = base.replace(/\/+$/, "");
    const cleanImage = image.replace(/^\/+/, "");

    return `${cleanBase}/${cleanImage}`;
  };
  const row = (label: string, value: ReactNode) => (
    <div
      key={label}
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 p-[10px_0px] border-b border-[rgba(34,34,34,0.08)] last:border-b-0 text-[14px]"
    >
      <span className="text-[14px] text-[#222] font-[Regular] shrink-0">
        {label}
      </span>
      <div className="text-[14px] text-[#222] font-[Bold] min-w-0 sm:text-right sm:max-w-[min(100%,280px)] break-all">
        {value}
      </div>
    </div>
  );

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader
        title="Agent Details"
        showBack={true}
        onBackClick={() => navigate(-1)}
      />
      {pageLoading && !agentData ? (
        <div className="rounded-[15px] bg-white min-h-[200px] flex items-center justify-center">
          <Loader size={80} margin={0} />
        </div>
      ) : (
        <>
          {/*Agent Header*/}
          <div className="rounded-[15px] bg-white md:p-[21px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
            <p className="md:text-[18px] text-[16px] leading-[140%] shrink-0">
              <span className="text-[#707070] font-[Regular]">Agent Name :</span>
              <span className="text-[#222] font-[Bold]"> {displayName}</span>
            </p>
            {!approvalPending && !invitationDeclined && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
                <button
                  type="button"
                  onClick={() => navigate(`/agency/super-agent-edit/${agentId}`)}
                  className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                >
                  <EditIcon width={20} height={20} stroke="#222222" />
                  Edit
                </button>
                <button
                  type="button"
                  className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                >
                  <TrashIcon width={20} height={20} />
                  Delete
                </button>
              </div>
            )}
          </div>
          {/* Agent details */}
          <div
            ref={shellRef}
            className="rounded-[15px] bg-white overflow-hidden min-w-0"
          >
            <div className="flex flex-col xl:flex-row xl:items-stretch">
              <div className="flex-1 min-w-0 md:p-[30px] p-[20px]">
                <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] leading-tight mb-6">
                  Agent details
                </h2>
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                  <div className="shrink-0">
                    <div className="h-[210px] w-[210px] shrink-0 overflow-hidden rounded-[12px]">
                      <img
                        src={toImageUrl(avatarSrc, "agent")}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    {row(
                      "Job role",
                      <span className="font-[Bold] text-[#222]">
                        {jobRole?.title || agentData?.specialization?.title || "—"}
                      </span>,
                    )}
                    {row(
                      "Agent type",
                      agentData ? (
                        <RoleBadge role={agentData?.agentType ?? "—"} />
                      ) : (
                        "—"
                      ),
                    )}
                    {row(
                      "Email address",
                      <span className="font-[Bold] text-[#222]">
                        {agentData?.email ?? "—"}
                      </span>,
                    )}
                    {row(
                      "Phone number",
                      <span className="font-[Bold] text-[#222]">
                        {agentData?.phoneNumber ?? "—"}
                      </span>,
                    )}
                    {row(
                      "Experience",
                      <span className="font-[Bold] text-[#222]">
                        {agentData?.experience ?? "—"}
                      </span>,
                    )}
                    {row(
                      "Dubai Broker License (BRN)",
                      <span className="font-[Bold] text-[#222]">
                        {agentData?.brokerLicenseNumber ?? "—"}
                      </span>,
                    )}
                    {row(
                      "Nationality",
                      <span className="font-[Bold] text-[#222]">
                        {agentData?.nationality?.name ?? "—"}
                      </span>,
                    )}
                    {row(
                      "Language known",
                      <span className="font-[Bold] text-[#222] sm:text-right">
                        {languagesDisplay}
                      </span>,
                    )}
                    {row(
                      "Linkedin",
                      linkedinUrl ? (
                        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3 min-w-0">
                          <span className="font-[Bold] text-[#222] text-[13px] break-all sm:text-right sm:max-w-[min(100%,280px)]">
                            {linkedinUrl}
                          </span>
                          <button
                            type="button"
                            onClick={copyLinkedIn}
                            disabled={invitationDeclined}
                            className="cursor-pointer inline-flex shrink-0 items-center justify-center gap-[6px]  px-[12px] h-[21px] text-[12px] font-[SemiBold] text-[#0832AE] border-l border-[rgba(34,34,34,0.10)] disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <CopyDarkIcon width={13} height={13} fill="#0832AE" />
                            COPY
                          </button>
                        </div>
                      ) : (
                        "—"
                      ),
                    )}
                  </div>
                </div>
              </div>

              <div className="w-auto xl:w-[min(100%,380px)] shrink-0 m-[4px] flex flex-col">
                <div className="rounded-[15px] bg-[#F5F5F5] md:p-[15px_30px] p-[10px_20px] mb-[6px] flex items-center justify-between gap-3">
                  <span className="text-[15px] font-[Bold] text-[#222] flex items-center gap-2 min-w-0">
                    Activate Agent
                    {isTogglingActive && (
                      <span className="text-[12px] font-[SemiBold] text-[#707070] shrink-0">
                        Saving…
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={activateAgent}
                    aria-busy={isTogglingActive}
                    disabled={
                      isTogglingActive ||
                      invitationDeclined ||
                      approvalPending ||
                      isSaving
                    }
                    onClick={handleActivateToggle}
                    className={`relative shrink-0 h-[26px] w-[48px] rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${activateAgent ? "bg-[#D4A373]" : "bg-[#D4D4D4]"
                      }`}
                  >
                    <span
                      className={`absolute top-[3px] left-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${activateAgent ? "translate-x-[22px]" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                <div className="h-full rounded-[15px] bg-[#F5F5F5] md:p-[39px_30px] p-[10px_20px] ">
                  <h3 className="text-[18px] font-[Bold] text-[#222] mb-[28px]">
                    Fill up the details
                  </h3>
                  <div className="flex flex-col justify-between h-[88%]">
                    <div className="flex flex-col gap-5">
                      <div className="relative">
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-2">
                          Agent job role <span className="text-[#D4A373]">*</span>
                        </label>
                        <button
                          type="button"
                          disabled={invitationDeclined || isSaving || verifyBusy}
                          onClick={() =>
                            !invitationDeclined &&
                            !isSaving &&
                            !verifyBusy &&
                            setOpenDropdown((d) => (d === "job" ? null : "job"))
                          }
                          className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[14px] flex items-center justify-between text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <span
                            className={`text-[14px] font-[Regular] ${jobRole ? "text-[#222]" : "text-[#707070]"
                              }`}
                          >
                            {jobRole?.title || "Select"}
                          </span>
                          <DownArrowIcon
                            width={11}
                            height={7}
                            className={`transition-transform shrink-0 ${openDropdown === "job" ? "rotate-180" : ""}`}
                          />
                        </button>
                        {openDropdown === "job" &&
                          !invitationDeclined &&
                          !isSaving &&
                          !verifyBusy && (
                            <div className="absolute top-full left-0 right-0 mt-2 z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                              {jobRoleOptions.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setJobRole(option);
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${jobRole?._id === option._id
                                    ? "text-[#D4A373] bg-[#FDF2F2]"
                                    : "text-[#222]"
                                    }`}
                                >
                                  {option.title}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>

                      <div className="relative">
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-2">
                          Agent type <span className="text-[#D4A373]">*</span>
                        </label>
                        <button
                          type="button"
                          disabled={invitationDeclined || isSaving || verifyBusy}
                          onClick={() =>
                            !invitationDeclined &&
                            !isSaving &&
                            !verifyBusy &&
                            setOpenDropdown((d) => (d === "agent" ? null : "agent"))
                          }
                          className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[14px] flex items-center justify-between text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <span className={`text-[14px] font-[Regular] ${agentType ? "text-[#222]" : "text-[#707070]"}`}>
                            {agentType?.label || "Select"}
                          </span>
                          <DownArrowIcon
                            width={11}
                            height={7}
                            className={`transition-transform shrink-0 ${openDropdown === "agent" ? "rotate-180" : ""}`}
                          />
                        </button>
                        {openDropdown === "agent" &&
                          !invitationDeclined &&
                          !isSaving &&
                          !verifyBusy && (
                            <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                              {agentTypeOptions.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setAgentType(option);
                                    setOpenDropdown(null);
                                  }}
                                  className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${agentType?.value === option.value
                                    ? "text-[#D4A373] bg-[#FDF2F2]"
                                    : "text-[#222]"
                                    }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                    <div>
                      {approvalPending && !invitationDeclined && (
                        <div className="flex items-center gap-[10px] w-full lg:w-auto lg:justify-end">
                          <button
                            type="button"
                            disabled={verifyBusy}
                            onClick={handleDeclineAgent}
                            className="cursor-pointer h-[44px] w-full rounded-[10px] bg-[#222] text-white text-[14px] font-[Bold] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {verifyAction === "decline" ? "Declining…" : "Decline"}
                          </button>
                          <button
                            type="button"
                            disabled={verifyBusy}
                            onClick={handleApproveAgent}
                            className="cursor-pointer h-[44px] w-full rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {verifyAction === "approve" ? "Approving…" : "Approve"}
                          </button>
                        </div>
                      )}
                      {invitationDeclined && (
                        <div className="rounded-[10px] border border-[rgba(212, 163, 115,0.35)] bg-[rgba(212, 163, 115,0.08)] px-[16px] py-[16px] text-center">
                          <p className="text-[14px] font-[Bold] text-[#D4A373]">Approval declined</p>
                        </div>
                      )}
                      {!approvalPending && !invitationDeclined && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={handleSave}
                          className="cursor-pointer h-[44px] w-full rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] hover:opacity-95 transition-opacity disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/*Agent About*/}
          <div className="rounded-[15px] bg-white p-5 md:p-[30px] p-[16px] min-w-0">
            <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">
              Agent description
            </h2>
            <div className="flex flex-col gap-4 text-[14px] font-[Regular] text-[#222] leading-[165%]">
              <p className="text-[14px] font-[Regular] text-[#222] leading-[165%]">
                {agentData?.aboutMe}
              </p>
            </div>
          </div>
          {/* Agent Listing — hidden for approval queue and declined invitations */}
          {showAgentListingsSection && (
            <div className="relative rounded-[15px] md:p-[30px] p-[20px] bg-[#fff] min-w-0 overflow-hidden">
              {listingLoading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[15px] bg-white/60">
                  <Loader size={80} margin={0} />
                </div>
              )}
              {/* Project header */}
              <div className="flex flex-wrap gap-4 items-center justify-between mb-[16px]">
                <h2 className="text-[#222] font-[Bold] text-[20px]">Agent Listing</h2>

              </div>
              <div className="flex flex-wrap items-center gap-[16px] py-1">
                {/* Search input */}
                <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] sm:flex-1 w-full md:w-[200px]">
                  <SearchIcon
                    className="text-[#707070] shrink-0"
                    width={18}
                    height={18}
                  />
                  <input
                    type="search"
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    placeholder="Search here"
                    className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] placeholder:text-[#94A3B8] focus:outline-none"
                  />
                </div>
                <div className="hidden 2xl:flex items-center gap-[10px]">
                  {listingTabs.map((tab) => (
                    <button
                      key={tab.slug}
                      onClick={() => setActiveAgentListingsTab(tab.slug)}
                      className={`cursor-pointer flex items-center justify-center text-[12px] font-[SemiBold] p-[0px_15px] h-[33px] rounded-full shrink-0 transition-colors ${activeAgentListingsTab === tab.slug
                        ? "bg-[#222] text-[#fff]"
                        : "bg-[#fff] border border-[#EAEAEA] text-[#222] hover:bg-[#F5F5F5]"
                        }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
                {/* Dropdown view (xl, lg, md, sm) */}
                <div className="relative flex 2xl:hidden" ref={listingDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsListingDropdownOpen((o) => !o)}
                    className="cursor-pointer inline-flex items-center justify-between gap-[10px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] min-w-[140px]"
                  >
                    <span className="truncate">{listingTabs.find((tab: any) => tab.slug === activeAgentListingsTab)?.name || "Select"}</span>
                    <DownArrowIcon width={10} height={6} />
                  </button>
                  {isListingDropdownOpen && (
                    <div className="absolute left-0 top-[40px] z-20 w-full bg-white border border-[rgba(34,34,34,0.10)] rounded-[12px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                      {listingTabs.map((label: any) => {
                        const active = activeAgentListingsTab === label.slug;
                        return (
                          <button
                            key={label.slug}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setActiveAgentListingsTab(label.slug);
                              setIsListingDropdownOpen(false);
                            }}
                            className={`w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] ${active ? "text-[#0832AE]" : "text-[#222]"
                              }`}
                          >
                            {label.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="w-[1px] h-[20px] bg-gray-300 hidden sm:block shrink-0"></div>
                <div className="flex items-center gap-[8px] shrink-0">
                  <span className="text-[#707070] text-[13px] font-[Medium]">
                    Sort by:
                  </span>
                  <div className="relative" ref={sortDropdownRef}>
                    <div
                      onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                      className="flex items-center justify-between gap-[8px] border border-[#EAEAEA] bg-white rounded-full px-[16px] h-[33px] cursor-pointer w-[120px]"
                    >
                      <span className="text-[#222] text-[13px] font-[Medium] truncate">
                        {selectedSortLabel}
                      </span>
                      <DownArrowIcon width={10} height={6}
                        className={`transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </div>

                    {isSortDropdownOpen && (
                      <div className="absolute right-0 top-[45px] w-full min-w-[150px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-10 flex flex-col max-h-[200px] overflow-y-auto">
                        {sortOptions.map((option) => (
                          <div
                            key={option.value}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedSort(option.value);
                              setIsSortDropdownOpen(false);
                            }}
                            className={`px-[16px] py-[10px] text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors ${selectedSort === option.value ? "text-[#00A663] bg-[#F5F5F5]" : "text-[#222]"}`}
                          >
                            {option.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-[10px]">
                  <button
                    type="button"
                    disabled
                    className="flex items-center gap-[6px] px-[15px] h-[33px] rounded-full text-[12px] font-[SemiBold] text-[#222] bg-[#F5F5F5] opacity-50"
                  >
                    <TrashIcon width={16} height={16} />
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAllocateAgentModalOpen(true)}
                    className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#D4A373] text-[#FFF] px-[15px] h-[33px] text-[12px] font-[SemiBold] shrink-0"
                  >
                    <PlusUserIcon width={16} height={16} className="text-white" />
                    Allocate Property
                  </button>
                </div>

              </div>
              {/*Table section*/}
              <div className="overflow-x-auto w-full scrollbar-hide mt-[20px]">
                <div className="min-w-[1430px]">
                  <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                    <div className="grid grid-cols-[40px_2.3fr_1.4fr_1.4fr_1.4fr_1.4fr_1.4fr_1.4fr] gap-[20px] items-center px-[14px] py-[10px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={allPageListingsSelected}
                          onChange={toggleSelectAllPageListings}
                          className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                          aria-label="Select all properties"
                        />
                      </div>
                      <p className="text-[14px] font-[SemiBold] text-[#222]">
                        Property Details
                      </p>
                      <p className="text-[14px] font-[SemiBold] text-[#222]">
                        Property for
                      </p>
                      <p className="text-[14px] font-[SemiBold] text-[#222]">
                        Beds
                      </p>
                      <p className="text-[14px] font-[SemiBold] text-[#222]">
                        Baths
                      </p>
                      <p className="text-[14px] font-[SemiBold] text-[#222]">AED</p>
                      <p className="text-[14px] font-[SemiBold] text-[#222]">
                        Status
                      </p>
                      <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                    </div>

                    {!listingLoading && paginatedListings.length === 0 ? (
                      <div className="px-[14px] py-[24px] text-center text-[14px] font-[Medium] text-[#707070]">
                        No properties found for this agent yet.
                      </div>
                    ) : (
                      paginatedListings.map((row, index) => {
                        const statusLabel = normalizeStatusLabel(row.status);
                        return (
                          <div
                            key={row.id}
                            className={`grid grid-cols-[40px_2.3fr_1.4fr_1.4fr_1.4fr_1.4fr_1.4fr_1.4fr] gap-[20px] items-center px-[14px] py-[10px] ${index !== paginatedListings.length - 1
                              ? "border-b border-[rgba(34,34,34,0.08)]"
                              : ""
                              }`}
                          >
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={selectedListingIds.has(row.id)}
                                onChange={() => toggleListingRowSelection(row.id)}
                                className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)] accent-[#222] cursor-pointer"
                                aria-label={`Select ${row.name}`}
                              />
                            </div>
                            <div className="flex items-center gap-[10px] min-w-0">
                              <div className="w-[60px] h-[60px] rounded-[8px] bg-cover bg-center shrink-0">
                                <img
                                  src={toImageUrl(row.image, "property")}
                                  alt="home"
                                  className="w-full h-full object-cover rounded-[8px]"
                                />
                              </div>
                              <div>
                                <p className="text-[12px] font-[SemiBold] text-[#222] leading-[1.2] mb-[4px]">
                                  {row.name}
                                </p>
                                <p className="text-[12px] text-[#707070] leading-[1.2]">
                                  {row.location}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center">
                              <span
                                className={`inline-flex items-center rounded-[6px] p-[6px_10px] text-[12px] font-[SemiBold] leading-none ${row.projectStatus === "Buy"
                                  ? "bg-[rgba(0,166,99,0.10)] text-[#00A663]"
                                  : row.projectStatus === "Rent"
                                    ? "bg-[rgba(212, 163, 115,0.10)] text-[#D4A373]"
                                    : row.projectStatus === "Commercial Buy"
                                      ? "bg-[rgba(255,70,162,0.10)] text-[#FF46A2]"
                                      : row.projectStatus === "Commercial Rent"
                                        ? "bg-[rgba(199,163,53,0.10)] text-[#C7A335]"
                                        : "bg-[rgba(212, 163, 115,0.10)] text-[#D4A373]"
                                  }`}
                              >
                                {row.projectStatus}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <p className="text-[12px] font-[Regular] text-[#222]">
                                {row.Beds}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <p className="text-[12px] font-[Regular] text-[#222]">
                                {row.Baths}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <p className="text-[12px] font-[Regular] text-[#222]">
                                {row.AED}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <span
                                className={`inline-flex items-center rounded-[6px] p-[6px_10px] text-[12px] font-[SemiBold] leading-none ${statusLabel === "Active"
                                  ? "bg-[#00A663] text-[#FFF]"
                                  : statusLabel === "Sold"
                                    ? "border border-[rgba(34, 34, 34, 0.10)] text-[#222]"
                                    : statusLabel === "Inactive"
                                      ? "bg-[#E80808] text-[#FFF]"
                                      : statusLabel === "Rented"
                                        ? "border border-[rgba(34, 34, 34, 0.10)] text-[#222]"
                                        : statusLabel === "Pending"
                                          ? "border border-[rgba(34, 34, 34, 0.10)] text-[#222]"
                                          : "bg-[#00A663] text-[#FFF]"
                                  }`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-[10px]">
                              <button type="button" className="flex items-center gap-[6px]">
                                <EyeDarkIcon width={20} height={20} />
                              </button>
                              <button type="button" className="flex items-center gap-[6px] ">
                                <TrashIcon width={20} height={20} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              <div className="px-0 pt-[16px] pb-[4px]">
                <Pagenation
                  currentPage={listingsPage}
                  totalItems={listingTotalItems}
                  itemsPerPage={LISTINGS_ITEMS_PER_PAGE}
                  onPageChange={setListingsPage}
                />
              </div>
            </div>
          )}
        </>
      )}
      <AllocateAgentModal
        isOpen={isAllocateAgentModalOpen}
        onClose={() => setIsAllocateAgentModalOpen(false)}
        initialAgentId={agentId}
        initialAgentName={displayName !== "—" ? displayName : ""}
        initialAgentTypeValue={agentData?.agentType || agentType?.value || ""}
        initialAgentTypeName={agentType?.label || ""}
        onSuccess={() => {
          if (!agentId) return;
          void agencyService
            .getAgentById(agentId, {
              listPage: listingsPage,
              listLimit: LISTINGS_ITEMS_PER_PAGE,
            })
            .then((agentRes) => {
              setAgentData(agentRes.agent);
            })
            .catch(() => undefined);
          const activeListingTab = listingTabs.find(
            (tab) => tab.slug === activeAgentListingsTab,
          );
          void agencyService
            .getAgentProperties({
              agentId,
              page: listingsPage,
              limit: LISTINGS_ITEMS_PER_PAGE,
              sortBy: selectedSort,
              search: debouncedListingSearch || undefined,
              listingType:
                activeAgentListingsTab !== "all"
                  ? activeListingTab?.id
                  : undefined,
            })
            .then((propertyRes) => {
              setPropertyListings(propertyRes?.items || []);
              setListingTotalItems(propertyRes?.pagination?.total || 0);
            })
            .catch(() => undefined);
        }}
      />
    </div>
  );
};

export default SuperAgentDetail;
