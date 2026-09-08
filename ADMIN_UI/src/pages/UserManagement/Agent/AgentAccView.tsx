import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import profileimg from "../../../assets/img/profileless.png";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { agentsService } from "../../../services/agentsService";
import { getApiErrorMessage, isAbortError } from "../../../services/apiClient";
import { useToast } from "../../../context/ToastContext";
import type { AdminAgentDetail, AgentExperienceOption } from "../../../types/api";

const formatAgentType = (value?: string) => {
  if (!value) return "—";
  if (value === "superagent") return "Super Agent";
  return "Agent";
};

const formatExperience = (
  value: string | number | null | undefined,
  options: AgentExperienceOption[]
) => {
  if (value == null || value === "") return "—";
  const key = String(value);
  return options.find((o) => o.value === key)?.name || key;
};

const AgentAccView = () => {
  const navigate = useNavigate();
  const { push } = useToast();
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get("id")?.trim() || "";

  const [agent, setAgent] = useState<AdminAgentDetail | null>(null);
  const [agentImgBaseUrl, setAgentImgBaseUrl] = useState("");
  const [experienceOptions, setExperienceOptions] = useState<AgentExperienceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"approve" | "decline" | null>(null);

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const resolveAgentAvatarSrc = (raw?: string | null, explicitUrl?: string | null): string => {
    const value = (raw || "").trim();
    if (value && /^https?:\/\//i.test(value)) return value;
    const direct = (explicitUrl || "").trim();
    if (direct && /^https?:\/\//i.test(direct)) return direct;
    if (!value || value.toLowerCase().includes("profileless.png")) return profileimg;
    const base = (agentImgBaseUrl || "").trim().replace(/\/+$/, "");
    if (!base) return profileimg;
    return `${base}/${encodeURIComponent(value)}`;
  };

  const canReview = useMemo(
    () =>
      String(agent?.invitationStatus || "").toLowerCase() === "accepted" &&
      !Boolean(agent?.isVerified),
    [agent?.invitationStatus, agent?.isVerified]
  );

  const statusText = useMemo(() => {
    const invitation = String(agent?.invitationStatus || "").toLowerCase();
    if (agent?.isVerified) return "Approved";
    if (invitation === "declined") return "Declined";
    if (invitation === "accepted") return "Pending Approval";
    if (invitation === "pending") return "Invited";
    if (invitation === "expired") return "Invitation Expired";
    return "—";
  }, [agent?.invitationStatus, agent?.isVerified]);

  const isDeclined = useMemo(
    () => String(agent?.invitationStatus || "").toLowerCase() === "declined",
    [agent?.invitationStatus]
  );

  const yesNo = (value?: boolean) => (value ? "Yes" : "No");
  const onOff = (value?: boolean) => (value ? "On" : "Off");

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const loadData = async () => {
      if (!agentId) {
        setError("Missing agent id in URL.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [details, urls, experienceRes] = await Promise.all([
          agentsService.getAgentById(agentId, controller.signal),
          agentsService.getSupportedUrls(controller.signal),
          agentsService.getAgentExperienceOptions(controller.signal),
        ]);
        if (!mounted) return;
        setAgent(details.agent || null);
        setAgentImgBaseUrl((urls.supportedUrls?.agentUrl?.img || "").trim());
        setExperienceOptions(experienceRes.agentExperience ?? []);
      } catch (err) {
        if (!mounted || isAbortError(err)) return;
        setError(getApiErrorMessage(err, "Failed to load agent details"));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadData();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [agentId]);

  const handleReviewAction = async (action: "approve" | "decline") => {
    if (!agentId) return;
    if (action === "approve") {
      const specializationId = agent?.specialization?._id?.trim();
      if (!specializationId) {
        push({
          type: "error",
          title: "Job title required",
          description:
            "This agent has no job title. Open agent detail, set job title and agent type, then approve.",
        });
        return;
      }
    }
    try {
      setActionLoading(action);
      const data = await agentsService.verifyAgent(
        agentId,
        action === "approve"
          ? {
              action,
              specializationId: agent?.specialization?._id?.trim(),
              agentType: agent?.agentType?.trim() || "agent",
            }
          : { action }
      );
      const updated = data.agent;
      if (updated) setAgent((prev) => ({ ...(prev || {}), ...updated }));
      push({
        type: "success",
        title: action === "approve" ? "Agent approved" : "Agent declined",
        description:
          action === "approve"
            ? "Agent verification approved successfully."
            : "Agent verification declined successfully.",
      });
      navigate("/agentaccount");
    } catch (err) {
      push({
        type: "error",
        title: "Action failed",
        description: getApiErrorMessage(err, "Unable to update agent verification status."),
      });
    } finally {
      setActionLoading(null);
    }
  };

  const row = (label: string, value: ReactNode) => (
    <div
      key={label}
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 p-[10px_0px] border-b border-[rgba(34,34,34,0.08)] last:border-b-0 text-[14px]"
    >
      <span className="text-[14px] text-[#222] font-[Regular] shrink-0">{label}</span>
      <div className="text-[14px] text-[#222] font-[Bold] min-w-0 sm:text-right sm:max-w-[min(100%,280px)] break-all">
        {value}
      </div>
    </div>
  );

  const stats = agent?.statistics;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <Header title="Agent View" showBack={true} onBackClick={() => navigate(-1)} />

      {loading ? (
        <div className="rounded-[15px] bg-white min-h-[60vh] flex items-center justify-center">
          <Loader size={80} />
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-[10px] border border-[rgba(234,57,52,0.25)] bg-[#FFF5F5] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#EA3934]">
              {error}
            </div>
          )}
          <div className="rounded-[15px] bg-white overflow-hidden min-w-0 p-[20px]">
            <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] leading-tight mb-6">
              Agent View
            </h2>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
              <div className="shrink-0">
                <div className="h-[210px] w-[210px] shrink-0 overflow-hidden rounded-[12px]">
                  <img
                    src={resolveAgentAvatarSrc(agent?.profilePicture, agent?.profilePictureUrl)}
                    alt={agent?.fullName || "Agent"}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = profileimg;
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                {row("Full Name", agent?.fullName || "—")}
                {row("Email address", agent?.email || "—")}
                {row("Phone number", agent?.phoneNumber || "—")}
                {row("WhatsApp", agent?.whatsappNumber || "—")}
                {row("Country", agent?.nationality?.name || agent?.nationality?.code || "—")}
                {row("Agent Type", formatAgentType(agent?.agentType))}
                {row("Job Title", agent?.specialization?.title || "—")}
                {row("Experience", formatExperience(agent?.experience, experienceOptions))}
                {row("Broker License", agent?.brokerLicenseNumber || "—")}
                {row("Agency", agent?.agency?.agencyName || "—")}
                {row("Agent Verified", yesNo(agent?.isVerified))}
                {row("Agent Status", agent?.isActive ? "Active" : "Inactive")}
                {row("Email Notification", onOff(agent?.preferences?.notificationSettings?.email))}
                {row("Push Notification", onOff(agent?.preferences?.notificationSettings?.push))}
                {row("Invitation Status", <span className="capitalize">{agent?.invitationStatus || "—"}</span>)}
                {row("Verification Status", statusText)}
                {row("About Me", <span className="break-words">{agent?.aboutMe || agent?.description || "—"}</span>)}
                {row("Active Listings", stats?.activeListings ?? 0)}
                {row("Total Listings", stats?.totalListings ?? 0)}
                {row("Total Inquiries", stats?.totalInquiries ?? 0)}
                {row("New Inquiries", stats?.newInquiries ?? 0)}
                {row("Total Deals", stats?.totalDeals ?? 0)}
                {row("Created At", formatDateTime(agent?.createdAt))}
                {row("Last Login", formatDateTime(agent?.lastLogin))}
                {row("Last Active At", formatDateTime(agent?.lastActiveAt))}
                {row("Login Attempts", agent?.loginAttempts ?? 0)}
              </div>
            </div>
          </div>

          <div className="rounded-[15px] md:p-[22px] p-[20px] min-w-0 flex justify-end flex-wrap gap-[20px] bg-white">
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 w-full">
              {isDeclined ? (
                <div className="rounded-[10px] border border-[rgba(234,57,52,0.35)] bg-[rgba(234,57,52,0.08)] px-[16px] py-[16px] text-center w-full md:w-auto min-w-[180px]">
                  <p className="text-[14px] font-[Bold] text-[#EA3934]">Approval declined</p>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!canReview || actionLoading !== null}
                    onClick={() => void handleReviewAction("approve")}
                    className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#6A3CA8] px-[14px] h-[38px] md:w-[120px] w-full text-[12px] font-[SemiBold] text-[#FFF] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === "approve" ? "Approving..." : "Approved"}
                  </button>
                  <button
                    type="button"
                    disabled={!canReview || actionLoading !== null}
                    onClick={() => void handleReviewAction("decline")}
                    className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#222222] px-[14px] h-[38px] md:w-[120px] w-full text-[12px] font-[SemiBold] text-[#FFF] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === "decline" ? "Declining..." : "Declined"}
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AgentAccView;
