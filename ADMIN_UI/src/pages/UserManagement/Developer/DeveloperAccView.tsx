import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PdfIcon, DownloadIcon } from "../../../assets/icons";
import profileimg from "../../../assets/img/profileless.png";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { developersService } from "../../../services/developersService";
import { getApiErrorMessage } from "../../../services/apiClient";
import { useToast } from "../../../context/ToastContext";
import type { AdminDeveloperDetail, DeveloperProjectsSummary } from "../../../types/api";

const DeveloperAccView = () => {
  const navigate = useNavigate();
  const { push } = useToast();
  const [searchParams] = useSearchParams();
  const developerId = searchParams.get("id")?.trim() || "";

  const [developer, setDeveloper] = useState<AdminDeveloperDetail | null>(null);
  const [projectsSummary, setProjectsSummary] = useState<DeveloperProjectsSummary | null>(null);
  const [developerImgBaseUrl, setDeveloperImgBaseUrl] = useState("");
  const [developerDocBaseUrl, setDeveloperDocBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<"approve" | "reject" | null>(null);

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

  const resolveDeveloperAvatarSrc = (
    raw?: string | null,
    explicitUrl?: string | null
  ): string => {
    const value = (raw || "").trim();
    if (value && /^https?:\/\//i.test(value)) return value;
    const direct = (explicitUrl || "").trim();
    if (direct && /^https?:\/\//i.test(direct)) return direct;
    if (!value || value.toLowerCase().includes("profileless.png")) return profileimg;
    const base = (developerImgBaseUrl || "").trim().replace(/\/+$/, "");
    if (!base) return profileimg;
    return `${base}/${encodeURIComponent(value)}`;
  };

  const registrationDocument = useMemo(() => {
    const firstDoc = developer?.registrationDocuments?.[0] || "";
    const hasDocument = Boolean(firstDoc);
    const name = firstDoc.split("/").pop() || "—";
    const url = !hasDocument
      ? null
      : /^https?:\/\//i.test(firstDoc)
        ? firstDoc
        : `${(developerDocBaseUrl || "").replace(/\/+$/, "")}/${encodeURIComponent(firstDoc)}`;
    return { hasDocument, name, url, uploadedOn: hasDocument ? formatDateTime(developer?.createdAt) : "" };
  }, [developer, developerDocBaseUrl]);

  const canReview = useMemo(
    () =>
      String(developer?.invitationStatus || "").toLowerCase() === "accepted" &&
      !Boolean(developer?.isVerified),
    [developer?.invitationStatus, developer?.isVerified]
  );

  const statusText = useMemo(() => {
    const invitation = String(developer?.invitationStatus || "").toLowerCase();
    if (developer?.isVerified) return "Approved";
    if (invitation === "declined") return "Declined";
    if (invitation === "accepted") return "Pending Approval";
    if (invitation === "pending") return "Invited";
    if (invitation === "expired") return "Invitation Expired";
    return "—";
  }, [developer?.invitationStatus, developer?.isVerified]);
  const isDeclined = useMemo(
    () => String(developer?.invitationStatus || "").toLowerCase() === "declined",
    [developer?.invitationStatus]
  );

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const loadData = async () => {
      if (!developerId) {
        setError("Missing developer id in URL.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [details, urls] = await Promise.all([
          developersService.getDeveloperById(developerId, controller.signal),
          developersService.getSupportedUrls(controller.signal),
        ]);
        if (!mounted) return;
        setDeveloper(details.developer || null);
        setProjectsSummary(details.projectsSummary || null);
        setDeveloperImgBaseUrl((urls.supportedUrls?.developerUrl?.img || "").trim());
        setDeveloperDocBaseUrl((urls.supportedUrls?.developerUrl?.doc || "").trim());
      } catch (err) {
        if (!mounted) return;
        setError(getApiErrorMessage(err, "Failed to load developer details"));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void loadData();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [developerId]);

  const handleReviewAction = async (action: "approve" | "reject") => {
    if (!developerId) return;
    try {
      setActionLoading(action);
      const data = await developersService.verifyDeveloper(developerId, action);
      const updated = data.developer;
      if (updated) setDeveloper((prev) => ({ ...(prev || {}), ...updated }));
      push({
        type: "success",
        title: action === "approve" ? "Developer approved" : "Developer declined",
        description:
          action === "approve"
            ? "Developer verification approved successfully."
            : "Developer verification declined successfully.",
      });
      navigate("/developeraccount");
    } catch (err) {
      push({
        type: "error",
        title: "Action failed",
        description: getApiErrorMessage(err, "Unable to update developer verification status."),
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
      <div className="text-[14px] text-[#222] font-[Bold] min-w-0 sm:text-right sm:max-w-[min(100%,280px)] break-all">{value}</div>
    </div>
  );

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <Header title="Developer View" showBack={true} onBackClick={() => navigate(-1)} />

      {loading ? (
        <div className="rounded-[15px] bg-white min-h-[60vh] flex items-center justify-center">
          <Loader size={80} />
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-[10px] border border-[rgba(212, 163, 115,0.25)] bg-[#FFF5F5] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#D4A373]">
              {error}
            </div>
          )}
          <div className="rounded-[15px] bg-white overflow-hidden min-w-0">
            <div className="flex flex-col xl:flex-row xl:items-stretch">
              <div className="flex-1 min-w-0">
                <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] leading-tight mb-6">
                  Developer View
                </h2>
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                  <div className="shrink-0">
                    <div className="h-[210px] w-[210px] shrink-0 overflow-hidden rounded-[12px]">
                      <img
                        src={resolveDeveloperAvatarSrc(developer?.profilePicture || developer?.logo, developer?.profilePictureUrl)}
                        alt={developer?.name || "Developer"}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = profileimg;
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    {row("Developer Name", <span className="font-[Bold] text-[#222]">{developer?.name || "—"}</span>)}
                    {row("Email address", <span className="font-[Bold] text-[#222]">{developer?.email || "—"}</span>)}
                    {row("Phone number", <span className="font-[Bold] text-[#222]">{developer?.phoneNumber || "—"}</span>)}
                    {row("Nationality", <span className="font-[Bold] text-[#222]">{developer?.nationality?.name || developer?.nationality?.code || "—"}</span>)}
                    {row("Invitation Status", <span className="font-[Bold] text-[#222] capitalize">{developer?.invitationStatus || "—"}</span>)}
                    {row("Verification Status", <span className="font-[Bold] text-[#222]">{statusText}</span>)}
                    {row("Founded Year", <span className="font-[Bold] text-[#222]">{developer?.foundedYear ?? "—"}</span>)}
                    {row("Website", <span className="font-[Bold] text-[#222] break-all">{developer?.website || "—"}</span>)}
                    {row("Address", <span className="font-[Bold] text-[#222] break-words">{developer?.address?.fullAddress || "—"}</span>)}
                    {row("About Developer", <span className="font-[Bold] text-[#222] break-words">{developer?.aboutUs || developer?.description || developer?.shortDescription || "—"}</span>)}

                    <div className="p-[10px_0px] border-b border-[rgba(34,34,34,0.08)]">
                      <span className="text-[14px] text-[#222] font-[Regular] block mb-[10px]">
                        Registration Document
                      </span>
                      <div className="flex min-w-0 w-full items-center gap-4 rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white px-4 py-3">
                        <PdfIcon width={34} height={42} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-[SemiBold] text-[#222] break-all">
                            {registrationDocument.hasDocument
                              ? registrationDocument.name
                              : "Registration document not uploaded yet"}
                          </p>
                          {registrationDocument.hasDocument && (
                            <p className="text-[12px] text-[#707070] mt-1">
                              Uploaded on {registrationDocument.uploadedOn}
                            </p>
                          )}
                        </div>
                        {registrationDocument.url ? (
                          <a
                            href={registrationDocument.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(34,34,34,0.08)] bg-[#F5F5F5] transition hover:bg-[#ECECEC]"
                            aria-label="Open registration document in new tab"
                          >
                            <DownloadIcon width={14} height={14} />
                          </a>
                        ) : (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(34,34,34,0.06)] bg-[#FAFAFA] opacity-40" aria-hidden>
                            <DownloadIcon width={14} height={14} />
                          </span>
                        )}
                      </div>
                    </div>

                    {row("Created At", <span className="font-[Bold] text-[#222]">{formatDateTime(developer?.createdAt)}</span>)}
                    {row("Last Login", <span className="font-[Bold] text-[#222]">{formatDateTime(developer?.lastLogin)}</span>)}
                    {row("Last Active At", <span className="font-[Bold] text-[#222]">{formatDateTime(developer?.lastActiveAt)}</span>)}
                    {row("Login Attempts", <span className="font-[Bold] text-[#222]">{developer?.loginAttempts ?? 0}</span>)}
                    {row("Total Projects", <span className="font-[Bold] text-[#222]">{projectsSummary?.total ?? projectsSummary?.storedTotalProjects ?? 0}</span>)}
                    {row("Off-plan Projects", <span className="font-[Bold] text-[#222]">{projectsSummary?.offPlan ?? 0}</span>)}
                    {row("Completed Projects", <span className="font-[Bold] text-[#222]">{projectsSummary?.completedProjects ?? 0}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[15px] md:p-[22px] p-[20px] min-w-0 flex justify-end flex-wrap gap-[20px]">
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 w-full">
              {isDeclined ? (
                <div className="rounded-[10px] border border-[rgba(212, 163, 115,0.35)] bg-[rgba(212, 163, 115,0.08)] px-[16px] py-[16px] text-center w-full md:w-auto min-w-[180px]">
                  <p className="text-[14px] font-[Bold] text-[#D4A373]">Approval declined</p>
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
                    onClick={() => void handleReviewAction("reject")}
                    className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#222222] px-[14px] h-[38px] md:w-[120px] w-full text-[12px] font-[SemiBold] text-[#FFF] shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === "reject" ? "Declining..." : "Declined"}
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

export default DeveloperAccView;
