import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import profileimg from "../../../assets/img/profileless.png";
import { DownArrowIcon, SearchIcon, VerifiedIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage, isAbortError } from "../../../services/apiClient";
import { agentsService } from "../../../services/agentsService";
import type {
  AdminAgentDetail,
  AgentExperienceOption,
  AgentTypeOption,
  CountryOption,
  JobTitleOption,
  UpdateAgentPayload,
} from "../../../types/api";

type FormState = {
  fullName: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
  countryId: string;
  agentType: string;
  specializationId: string;
  experience: string;
  brokerLicenseNumber: string;
  aboutMe: string;
  isActive: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
};

const initialState: FormState = {
  fullName: "",
  email: "",
  phoneNumber: "",
  whatsappNumber: "",
  countryId: "",
  agentType: "agent",
  specializationId: "",
  experience: "",
  brokerLicenseNumber: "",
  aboutMe: "",
  isActive: true,
  emailNotifications: true,
  pushNotifications: true,
};

const splitPhoneNumber = (value: string, countries: CountryOption[]) => {
  const normalized = String(value || "").trim();
  if (!normalized) return { dialCode: "", local: "" };
  const sorted = [...countries]
    .map((c) => c.dialCode)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const matched = sorted.find((code) => normalized.startsWith(code));
  if (!matched) return { dialCode: "", local: normalized };
  const local = normalized.slice(matched.length).replace(/^\s+/, "");
  return { dialCode: matched, local };
};

const isVerifiedFlag = (value: unknown): boolean =>
  value === true || (typeof value === "string" && value.toLowerCase() === "true");

const formatAgentTypeLabel = (value?: string) => {
  if (value === "superagent") return "Super Agent";
  if (value === "agent") return "Agent";
  return value || "—";
};

export default function AgentAccountDetail() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get("id")?.trim() || "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const agentTypeDropdownRef = useRef<HTMLDivElement>(null);
  const jobTitleDropdownRef = useRef<HTMLDivElement>(null);
  const experienceDropdownRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [agent, setAgent] = useState<AdminAgentDetail | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [agentTypes, setAgentTypes] = useState<AgentTypeOption[]>([]);
  const [jobTitles, setJobTitles] = useState<JobTitleOption[]>([]);
  const [experienceOptions, setExperienceOptions] = useState<AgentExperienceOption[]>([]);
  const [form, setForm] = useState<FormState>(initialState);
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [isAgentTypeDropdownOpen, setIsAgentTypeDropdownOpen] = useState(false);
  const [isJobTitleDropdownOpen, setIsJobTitleDropdownOpen] = useState(false);
  const [isExperienceDropdownOpen, setIsExperienceDropdownOpen] = useState(false);
  const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<CountryOption | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);

  const avatarSrc = useMemo(() => {
    const raw = (agent?.profilePicture || "").trim();
    if (!raw || raw.toLowerCase().includes("profileless.png")) return profileimg;
    if (/^https?:\/\//i.test(raw)) return raw;
    return agent?.profilePictureUrl || profileimg;
  }, [agent?.profilePicture, agent?.profilePictureUrl]);

  const isEmailVerified = useMemo(
    () => isVerifiedFlag((agent as unknown as Record<string, unknown> | null)?.isEmailVerified),
    [agent]
  );
  const isPhoneVerified = useMemo(() => {
    const source = agent as unknown as Record<string, unknown> | null;
    return isVerifiedFlag(source?.isPhoneVerified) || isVerifiedFlag(source?.isPhoneNumberVerified);
  }, [agent]);
  const isAgentVerified = useMemo(() => Boolean(agent?.isVerified), [agent?.isVerified]);
  const isApprovalPending = useMemo(
    () =>
      String(agent?.invitationStatus || "").toLowerCase() === "accepted" &&
      !Boolean(agent?.isVerified),
    [agent?.invitationStatus, agent?.isVerified]
  );

  const filteredPhoneCountries = useMemo(
    () =>
      countries.filter(
        (country) =>
          country.name.toLowerCase().includes(phoneSearchQuery.toLowerCase()) ||
          country.dialCode.includes(phoneSearchQuery)
      ),
    [countries, phoneSearchQuery]
  );
  const filteredCountries = useMemo(
    () =>
      countries.filter((country) =>
        country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
      ),
    [countries, countrySearchQuery]
  );

  const selectedAgentTypeLabel = useMemo(() => {
    const match = agentTypes.find((t) => t.value === form.agentType);
    return match?.name || formatAgentTypeLabel(form.agentType);
  }, [agentTypes, form.agentType]);

  const selectedJobTitleLabel = useMemo(() => {
    const match = jobTitles.find((j) => j._id === form.specializationId);
    return match?.title || "Select job title";
  }, [jobTitles, form.specializationId]);

  const selectedExperienceLabel = useMemo(() => {
    const match = experienceOptions.find((o) => o.value === form.experience);
    return match?.name || "Select experience";
  }, [experienceOptions, form.experience]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const updateForm = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const load = async () => {
      if (!agentId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const [details, countryList, types, titles, experienceRes] = await Promise.all([
          agentsService.getAgentById(agentId, controller.signal),
          agentsService.listMasterCountries(controller.signal),
          agentsService.getAgentTypes(controller.signal),
          agentsService.listJobTitles(controller.signal),
          agentsService.getAgentExperienceOptions(controller.signal),
        ]);
        if (!mounted) return;
        const nextAgent = details.agent;
        const phoneSplit = splitPhoneNumber(nextAgent?.phoneNumber || "", countryList);
        const nationalityId = nextAgent?.nationality?._id || "";
        const matchedCountry =
          countryList.find((c) => (c._id || "") === nationalityId) ||
          countryList.find((c) => c.dialCode === phoneSplit.dialCode) ||
          countryList.find((c) => c.code === "AE") ||
          countryList[0] ||
          null;
        setAgent(nextAgent);
        setCountries(countryList);
        setAgentTypes(types.agentTypes ?? []);
        setJobTitles(titles);
        setExperienceOptions(experienceRes.agentExperience ?? []);
        setSelectedCountry(matchedCountry);
        setSelectedPhoneCountry(matchedCountry);
        setForm({
          fullName: nextAgent?.fullName || "",
          email: nextAgent?.email || "",
          phoneNumber:
            nextAgent?.phoneNumberWithoutCode || phoneSplit.local || nextAgent?.phoneNumber || "",
          whatsappNumber: nextAgent?.whatsappNumber || "",
          countryId: nationalityId,
          agentType: nextAgent?.agentType || "agent",
          specializationId: nextAgent?.specialization?._id || "",
          experience: nextAgent?.experience != null ? String(nextAgent.experience) : "",
          brokerLicenseNumber: nextAgent?.brokerLicenseNumber || "",
          aboutMe: nextAgent?.aboutMe || nextAgent?.description || "",
          isActive: Boolean(nextAgent?.isActive),
          emailNotifications: Boolean(nextAgent?.preferences?.notificationSettings?.email),
          pushNotifications: Boolean(nextAgent?.preferences?.notificationSettings?.push),
        });
      } catch (err) {
        if (isAbortError(err)) return;
        push({
          type: "error",
          title: "Failed to load agent",
          description: getApiErrorMessage(err, "Unable to load agent details."),
        });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [agentId, push]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
        setIsPhoneDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (agentTypeDropdownRef.current && !agentTypeDropdownRef.current.contains(event.target as Node)) {
        setIsAgentTypeDropdownOpen(false);
      }
      if (jobTitleDropdownRef.current && !jobTitleDropdownRef.current.contains(event.target as Node)) {
        setIsJobTitleDropdownOpen(false);
      }
      if (experienceDropdownRef.current && !experienceDropdownRef.current.contains(event.target as Node)) {
        setIsExperienceDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!countries.length) return;
    const byId = countries.find((c) => (c._id || "") === form.countryId);
    if (byId) {
      setSelectedCountry(byId);
      if (!selectedPhoneCountry) setSelectedPhoneCountry(byId);
    }
  }, [countries, form.countryId, selectedPhoneCountry]);

  const onSave = async () => {
    if (!agentId) return;
    try {
      setSaving(true);
      const payload: UpdateAgentPayload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        phoneCode: selectedPhoneCountry?.dialCode || undefined,
        nationality: form.countryId || undefined,
        agentType: form.agentType,
        specialization: form.specializationId || undefined,
        brokerLicenseNumber: form.brokerLicenseNumber.trim(),
        experience: form.experience.trim() || undefined,
        whatsappNumber: form.whatsappNumber.trim(),
        aboutMe: form.aboutMe.trim(),
        isActive: form.isActive,
        preferences: {
          notificationSettings: {
            email: form.emailNotifications,
            push: form.pushNotifications,
          },
        },
      };
      const data = await agentsService.updateAgentById(agentId, payload);
      setAgent(data.agent);
      push({ type: "success", title: "Agent updated", description: "Agent account updated successfully." });
      navigate("/agentaccount");
    } catch (err) {
      push({
        type: "error",
        title: "Save failed",
        description: getApiErrorMessage(err, "Unable to update agent."),
      });
    } finally {
      setSaving(false);
    }
  };

  const onUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !agentId) return;
    try {
      setAvatarLoading(true);
      const data = await agentsService.updateAgentProfilePicture(agentId, file);
      if (data.agent) setAgent((prev) => ({ ...(prev || {}), ...data.agent }));
      push({ type: "success", title: "Photo updated", description: "Agent profile photo updated successfully." });
    } catch (err) {
      push({
        type: "error",
        title: "Upload failed",
        description: getApiErrorMessage(err, "Unable to update profile photo."),
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  const onDeleteAvatar = async () => {
    if (!agentId) return;
    const result = await Swal.fire({
      title: "Delete photo?",
      text: "This will remove the current agent profile photo.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#EA3934",
    });
    if (!result.isConfirmed) return;
    try {
      setAvatarLoading(true);
      const data = await agentsService.removeAgentProfilePicture(agentId);
      if (data.agent) setAgent((prev) => ({ ...(prev || {}), ...data.agent }));
      push({ type: "success", title: "Photo removed", description: "Agent profile photo removed successfully." });
    } catch (err) {
      push({
        type: "error",
        title: "Delete failed",
        description: getApiErrorMessage(err, "Unable to delete profile photo."),
      });
    } finally {
      setAvatarLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <Header title="Agent Detail" showBack={true} onBackClick={() => navigate(-1)} />
        <div className="rounded-[15px] bg-white min-h-[65vh] mt-[20px] flex items-center justify-center">
          <Loader size={80} />
        </div>
      </div>
    );
  }

  if (!agentId) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <Header title="Agent Detail" showBack={true} onBackClick={() => navigate(-1)} />
        <div className="rounded-[10px] border border-[rgba(234,57,52,0.25)] bg-[#FFF5F5] px-[14px] py-[12px] mt-[20px] text-[13px] font-[Medium] text-[#EA3934]">
          Missing agent id in URL.
        </div>
      </div>
    );
  }

  const stats = agent?.statistics;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header title="Agent Detail" showBack={true} onBackClick={() => navigate(-1)} />
      <div className="p-[20px] bg-[#fff] mt-[20px] rounded-[12px]">
        <div className="bg-[#fff] p-[20px] rounded-[12px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] mb-[20px]">
          <div className="flex items-center justify-between flex-wrap gap-[20px]">
            <div className="flex items-center gap-[16px]">
              <div className="w-[90px] h-[90px] rounded-full overflow-hidden border border-[rgba(34,34,34,0.10)] shrink-0">
                {avatarLoading ? (
                  <div className="h-full w-full flex items-center justify-center">
                    <Loader size={34} margin={0} />
                  </div>
                ) : (
                  <img
                    src={avatarSrc}
                    alt="Agent"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = profileimg;
                    }}
                  />
                )}
              </div>
              <div>
                <h3 className="text-[18px] font-[Bold] text-[#222]">
                  {form.fullName?.trim() || agent?.fullName?.trim() || "Agent"}
                </h3>
                <p className="text-[13px] font-[Regular] text-[#707070] mt-[4px]">
                  Upload and manage agent profile photo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-[12px] flex-wrap">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
              <button
                type="button"
                className="h-[42px] px-[18px] rounded-[10px] bg-[#222] text-[#fff] text-[14px] font-[Medium]"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
              >
                Change Photo
              </button>
              <button
                type="button"
                className="h-[42px] px-[18px] rounded-[10px] border border-[rgba(34,34,34,0.10)] text-[#EA3934] text-[14px] font-[Medium]"
                onClick={() => void onDeleteAvatar()}
                disabled={avatarLoading}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[20px]">
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Full Name</label>
            <input
              value={form.fullName}
              onChange={(e) => updateForm("fullName", e.target.value)}
              type="text"
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Email Address</label>
            <div className="relative">
              <input
                value={form.email}
                onChange={(e) => updateForm("email", e.target.value)}
                type="email"
                className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
              />
              {isEmailVerified && (
                <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[13px] font-[Bold]">
                  <VerifiedIcon className="w-[14px] h-[14px]" />
                  Verified
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Phone Number</label>
            <div className="flex items-center gap-[10px]">
              <div className="relative" ref={phoneDropdownRef}>
                <div
                  className="flex items-center gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none"
                  onClick={() => {
                    setIsPhoneDropdownOpen((prev) => !prev);
                    if (!isPhoneDropdownOpen) setPhoneSearchQuery("");
                  }}
                >
                  {selectedPhoneCountry?.flag ? (
                    <img
                      src={selectedPhoneCountry.flag}
                      alt={selectedPhoneCountry.code}
                      className="w-[20px] h-[14px] rounded-[2px] object-cover"
                    />
                  ) : (
                    <span className="text-[12px] text-[#707070] font-[Medium]">
                      {selectedPhoneCountry?.dialCode || "+--"}
                    </span>
                  )}
                  <DownArrowIcon className={`transition-transform ${isPhoneDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
                </div>
                {isPhoneDropdownOpen && (
                  <div className="absolute top-[50px] left-0 w-[260px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                    <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                      <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                          type="text"
                          placeholder="Search country..."
                          className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                          value={phoneSearchQuery}
                          onChange={(e) => setPhoneSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden flex-1 py-[8px]">
                      {filteredPhoneCountries.map((country) => (
                        <div
                          key={country.id}
                          className="flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5]"
                          onClick={() => {
                            setSelectedPhoneCountry(country);
                            setIsPhoneDropdownOpen(false);
                          }}
                        >
                          <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                          <span className="text-[13px] font-[Medium] text-[#222] truncate">
                            {country.name} ({country.dialCode})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) => updateForm("phoneNumber", e.target.value)}
                  className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
                />
                {isPhoneVerified && (
                  <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[13px] font-[Bold]">
                    <VerifiedIcon className="w-[14px] h-[14px]" />
                    Verified
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">WhatsApp Number</label>
            <input
              value={form.whatsappNumber}
              onChange={(e) => updateForm("whatsappNumber", e.target.value)}
              type="text"
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
            />
          </div> */}
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Country</label>
            <div className="relative w-full" ref={countryDropdownRef}>
              <div
                className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none"
                onClick={() => {
                  setIsCountryDropdownOpen((prev) => !prev);
                  if (!isCountryDropdownOpen) setCountrySearchQuery("");
                }}
              >
                <div className="flex items-center gap-[10px] min-w-0">
                  {selectedCountry?.flag ? (
                    <img src={selectedCountry.flag} alt={selectedCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                  ) : null}
                  <h4 className="text-[13px] font-[Medium] text-[#222] truncate">
                    {selectedCountry?.name || "Select Country"}
                  </h4>
                </div>
                <DownArrowIcon className={`mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
              </div>
              {isCountryDropdownOpen && (
                <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.10)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                  <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                    <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                      <SearchIcon className="text-[#707070] shrink-0" />
                      <input
                        type="text"
                        placeholder="Search country..."
                        className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                        value={countrySearchQuery}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto overflow-x-hidden flex-1 py-[8px]">
                    {filteredCountries.map((country) => (
                      <div
                        key={country.id}
                        className="flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5]"
                        onClick={() => {
                          setSelectedCountry(country);
                          updateForm("countryId", country._id || "");
                          setIsCountryDropdownOpen(false);
                        }}
                      >
                        <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                        <span className="text-[13px] font-[Medium] text-[#222] truncate">{country.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Agent Type</label>
            <div className="relative w-full" ref={agentTypeDropdownRef}>
              <div
                className="flex items-center justify-between border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none"
                onClick={() => setIsAgentTypeDropdownOpen((prev) => !prev)}
              >
                <span className="text-[13px] font-[Medium] text-[#222]">{selectedAgentTypeLabel}</span>
                <DownArrowIcon className={`transition-transform ${isAgentTypeDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
              </div>
              {isAgentTypeDropdownOpen && (
                <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 py-[8px]">
                  {(agentTypes.length ? agentTypes : [{ name: "Agent", value: "agent" }, { name: "Super Agent", value: "superagent" }]).map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      className="w-full text-left px-[14px] py-[8px] text-[13px] font-[Medium] text-[#222] hover:bg-[#F5F5F5]"
                      onClick={() => {
                        updateForm("agentType", type.value);
                        setIsAgentTypeDropdownOpen(false);
                      }}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Job Title</label>
            <div className="relative w-full" ref={jobTitleDropdownRef}>
              <div
                className="flex items-center justify-between border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none"
                onClick={() => setIsJobTitleDropdownOpen((prev) => !prev)}
              >
                <span className="text-[13px] font-[Medium] text-[#222] truncate">{selectedJobTitleLabel}</span>
                <DownArrowIcon className={`transition-transform ${isJobTitleDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
              </div>
              {isJobTitleDropdownOpen && (
                <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[220px] overflow-y-auto py-[8px]">
                  {jobTitles.map((title) => (
                    <button
                      key={title._id}
                      type="button"
                      className="w-full text-left px-[14px] py-[8px] text-[13px] font-[Medium] text-[#222] hover:bg-[#F5F5F5]"
                      onClick={() => {
                        updateForm("specializationId", title._id);
                        setIsJobTitleDropdownOpen(false);
                      }}
                    >
                      {title.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Experience (years)</label>
            <div className="relative w-full" ref={experienceDropdownRef}>
              <div
                className="flex items-center justify-between border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none"
                onClick={() => setIsExperienceDropdownOpen((prev) => !prev)}
              >
                <span className="text-[13px] font-[Medium] text-[#222] truncate">{selectedExperienceLabel}</span>
                <DownArrowIcon className={`transition-transform ${isExperienceDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
              </div>
              {isExperienceDropdownOpen && (
                <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[220px] overflow-y-auto py-[8px]">
                  {experienceOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className="w-full text-left px-[14px] py-[8px] text-[13px] font-[Medium] text-[#222] hover:bg-[#F5F5F5]"
                      onClick={() => {
                        updateForm("experience", option.value);
                        setIsExperienceDropdownOpen(false);
                      }}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Broker License</label>
            <input
              value={form.brokerLicenseNumber}
              onChange={(e) => updateForm("brokerLicenseNumber", e.target.value)}
              type="text"
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Agency</label>
            <input
              value={agent?.agency?.agencyName || "—"}
              type="text"
              readOnly
              disabled
              className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Agent Verified</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Agent Verified</span>
              <button
                type="button"
                disabled
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isAgentVerified ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"} opacity-50 cursor-not-allowed`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isAgentVerified ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Agent Status</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Agent Active</span>
              <button
                type="button"
                onClick={() => updateForm("isActive", !form.isActive)}
                disabled={isApprovalPending}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${form.isActive ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"} ${isApprovalPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${form.isActive ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Email Notification</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Email Notification</span>
              <button
                type="button"
                onClick={() => updateForm("emailNotifications", !form.emailNotifications)}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${form.emailNotifications ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"}`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${form.emailNotifications ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Push Notification</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Push Notification</span>
              <button
                type="button"
                onClick={() => updateForm("pushNotifications", !form.pushNotifications)}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${form.pushNotifications ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"}`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${form.pushNotifications ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">About Me</label>
            <textarea
              value={form.aboutMe}
              onChange={(e) => updateForm("aboutMe", e.target.value)}
              className="w-full h-[140px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none resize-none"
            />
          </div>

          {[
            ["Active Listings", stats?.activeListings],
            ["Total Listings", stats?.totalListings],
            ["Rent Properties", stats?.totalRentProperties],
            ["Sale Properties", stats?.totalSaleProperties],
            ["Total Inquiries", stats?.totalInquiries],
            ["New Inquiries", stats?.newInquiries],
            // ["Total Deals", stats?.totalDeals],
            // ["Deals Closed (Sale)", stats?.dealsClosedSales],
            // ["Deals Closed (Rent)", stats?.dealsClosedRent],
            // ["Revenue (Sale)", stats?.totalRevenueSales],
            // ["Revenue (Rent)", stats?.totalRevenueRent],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">{label}</label>
              <input
                type="number"
                value={value ?? 0}
                disabled
                readOnly
                className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[20px] mt-[20px]">
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Last Login</label>
            <input type="text" value={formatDateTime(agent?.lastLogin)} readOnly className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Last Active At</label>
            <input type="text" value={formatDateTime(agent?.lastActiveAt)} readOnly className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Created At</label>
            <input type="text" value={formatDateTime(agent?.createdAt)} readOnly className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Login Attempts</label>
            <input type="text" value={String(agent?.loginAttempts ?? 0)} readOnly className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none" />
          </div>
        </div>

        <div className="flex justify-end gap-[10px] mt-[24px]">
          <button type="button" className="h-[42px] px-[18px] rounded-[10px] border border-[rgba(34,34,34,0.10)] text-[#222] text-[14px] font-[Medium]" onClick={() => navigate("/agentaccount")} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="h-[42px] px-[18px] rounded-[10px] bg-[#6A3CA8] text-[#fff] text-[14px] font-[Medium]" onClick={() => void onSave()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
