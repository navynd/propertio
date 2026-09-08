import {
  DownArrowIcon,
  LinkedinIcon,
  SearchIcon,
  CancelIcon,
  VerifiedIcon,
} from "../../../components/CustomFile/icons";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import React, { useRef, useState, useEffect } from "react";
import Userimg from "../../../assets/img/user.png";
import AgencyHeader from "../../../components/Header/AgencyHeader";
import mainbg from "../../../assets/img/mainbg.png";
import {
  agencyService,
  type country,
  type JobTitle,
  type AgentType,
  type agentExperience,
  type SortByProjectMasterItem,
} from "../../../services/agencyService";
import { toast } from "../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../services/apiClient";
import Loader from "../../../components/Loader/loader";
import {
  buildProfilePictureUrl,
  hasUploadedProfilePicture,
} from "../../../utils/agentProfileMedia";

const MAX_PROFILE_IMAGE_BYTES = 15 * 1024 * 1024;

/** Agency edit: phone/email are verified elsewhere — do not send on update. */
const CONTACT_FIELDS_READ_ONLY = true;

function isInvitationDeclined(agent: any): boolean {
  if (!agent) return false;
  return String(agent.invitationStatus ?? "").toLowerCase() === "declined";
}

function normalizeDialCode(code: string): string {
  const s = String(code ?? "")
    .trim()
    .replace(/\s/g, "");
  if (!s) return "";
  return s.startsWith("+") ? s : `+${s}`;
}

/** Show local digits only (API stores full `phoneNumber` with code separately). */
function getDisplayPhoneLocal(agent: any): string {
  if (!agent) return "";
  const local = agent.phoneNumberWithoutCode;
  if (local != null && String(local).trim() !== "") {
    return String(local);
  }
  const code = normalizeDialCode(String(agent.phoneCode ?? ""));
  const full = String(agent.phoneNumber ?? "").trim();
  if (code && full.startsWith(code)) {
    return full.slice(code.length).trim();
  }
  const dCode = code.replace(/\D/g, "");
  const dFull = full.replace(/\D/g, "");
  if (dCode && dFull.startsWith(dCode)) {
    return dFull.slice(dCode.length);
  }
  return full.replace(/^\+/, "").trim();
}

type Language = {
  _id: string;
  name: string;
};
const SuperAgentEdit = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [serverProfilePictureUrl, setServerProfilePictureUrl] = useState<
    string | null
  >(null);
  const [profilePictureFilename, setProfilePictureFilename] = useState<
    string | null
  >(null);
  const [activateAgent, setActivateAgent] = useState(false);
  // Country dropdown states
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<country | null>(null);
  const [countryOptions, setCountryOptions] = useState<country[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isJobTitleDropdownOpen, setIsJobTitleDropdownOpen] = useState(false);
  const [selectedJobTitle, setSelectedJobTitle] = useState<JobTitle | null>(
    null,
  );
  const jobTitleDropdownRef = useRef<HTMLDivElement>(null);
  const [isAgentTypeDropdownOpen, setIsAgentTypeDropdownOpen] = useState(false);
  const [selectedAgentType, setSelectedAgentType] = useState("");
  const agentTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [isExperienceDropdownOpen, setIsExperienceDropdownOpen] =
    useState(false);
  const [selectedExperience, setSelectedExperience] = useState("");
  const experienceDropdownRef = useRef<HTMLDivElement>(null);
  const [isNationalityDropdownOpen, setIsNationalityDropdownOpen] =
    useState(false);
  const [nationalitySearchQuery, setNationalitySearchQuery] = useState("");
  const [selectedNationality, setSelectedNationality] =
    useState<country | null>(null);
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const [agentData, setAgentData] = useState<any>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [discardLoading, setDiscardLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const location = useLocation();
  const { id } = useParams();
  const [jobTitleOptions, setJobTitleOptions] = useState<JobTitle[]>([]);
  const [agentTypeOptions, setAgentTypeOptions] = useState<AgentType[]>([]);
  const [languageOptions, setLanguageOptions] = useState<Language[]>([]);

  const [imageBaseUrls, setImageBaseUrls] = useState({
    agent: "",
    property: "",
  });

  const [selectedLanguages, setSelectedLanguages] = useState<any[]>([]);
  const [experienceOptions, setExperienceOptions] = useState<agentExperience[]>(
    [],
  );

  const removeLanguage = (language: any) => {
    setSelectedLanguages((prev) => prev.filter((l) => l._id !== language._id));
  };
  const addLanguage = (language: any) => {
    setSelectedLanguages((prev) =>
      prev.some((l) => l._id === language._id) ? prev : [...prev, language],
    );
    setIsLanguageDropdownOpen(false);
  };
  const filteredCountries = countryOptions.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.phoneCode.includes(searchQuery),
  );
  const filteredNationalities = countryOptions.filter((country) =>
    country.name.toLowerCase().includes(nationalitySearchQuery.toLowerCase()),
  );
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCountryDropdownOpen(false);
      }
      if (
        jobTitleDropdownRef.current &&
        !jobTitleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsJobTitleDropdownOpen(false);
      }
      if (
        agentTypeDropdownRef.current &&
        !agentTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAgentTypeDropdownOpen(false);
      }
      if (
        experienceDropdownRef.current &&
        !experienceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExperienceDropdownOpen(false);
      }
      if (
        nationalityDropdownRef.current &&
        !nationalityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNationalityDropdownOpen(false);
      }
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsLanguageDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const syncProfilePictureFromServer = (
    profilePicture: string | null | undefined,
  ) => {
    const pic = profilePicture ? String(profilePicture).trim() : null;
    setProfilePictureFilename(pic);
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const base = (
      imageBaseUrls.agent || `${fallbackOrigin}/uploads/img/agents/`
    ).replace(/\/?$/, "/");
    setServerProfilePictureUrl(buildProfilePictureUrl(base, pic));
  };

  const handleAddPhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!id) {
      toast.error(
        "Missing agent",
        "Wait for the agent profile to finish loading.",
      );
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file", "Only image files are allowed.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_BYTES) {
      toast.error(
        "File too large",
        `Use an image under ${Math.round(MAX_PROFILE_IMAGE_BYTES / (1024 * 1024))} MB.`,
      );
      event.target.value = "";
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    try {
      setIsUploadingPhoto(true);
      await agencyService.uploadAgentProfilePicture(id, { file });

      const res = await agencyService.getAgentById(id);
      applyAgentFromServer(res?.agent ?? null);
      toast.success("Photo updated", "Profile picture uploaded successfully.");
    } catch (err) {
      console.error(err);
      toast.error(
        "Upload failed",
        getApiErrorMessage(err, "Failed to upload profile picture."),
      );
    } finally {
      setIsUploadingPhoto(false);
      URL.revokeObjectURL(imageUrl);
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async () => {
    if (selectedImage?.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (!id) {
      toast.error(
        "Missing agent",
        "Wait for the agent profile to finish loading.",
      );
      return;
    }

    try {
      setIsUploadingPhoto(true);
      await agencyService.uploadAgentProfilePicture(id, {
        removeProfilePicture: true,
      });

      const res = await agencyService.getAgentById(id);
      applyAgentFromServer(res?.agent ?? null);
      toast.success("Photo removed", "Profile picture deleted.");
    } catch (err) {
      console.error(err);
      toast.error(
        "Delete failed",
        getApiErrorMessage(err, "Could not remove profile picture."),
      );
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
          "languages",
          "countries",
          "agentexperience",
        ]);

        if (!isMounted) return;

        /** ---------------- Listing Tabs ---------------- */
        const listingTypes = res?.listingTypes || [];

        const apiTabs = listingTypes
          .filter((item: any) => item.isActive)
          .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
          .map((item: any) => ({
            name: item.name,
            slug: item.slug,
          }));

        /** ---------------- Job Roles ---------------- */
        const jobRoles = res?.jobTitles || [];
        setJobTitleOptions(jobRoles);

        /** ---------------- Agent Types ---------------- */
        const agentTypes = res?.agentTypes || [];
        setAgentTypeOptions(agentTypes);

        /** ---------------- Languages ---------------- */
        const languages = res?.languages || [];
        setLanguageOptions(languages);
        /** ---------------- Experience ---------------- */
        const expereinces = res?.agentExperience || [];
        setExperienceOptions(expereinces);

        /** ---------------- Countries ---------------- */

        const countries = res?.countries || [];

        const activeCountries = countries
          .filter((c: any) => c.isActive)
          .sort(
            (a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0),
          );

        setCountryOptions(activeCountries);

        // ✅ Set default country (example: AE)
        const defaultCountry =
          activeCountries.find((c: any) => c.code === "AE") ||
          activeCountries[0];

        setSelectedCountry(defaultCountry);

        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallback = `${fallbackOrigin}/uploads/img/property/`;

        const supported = res?.supportedUrls;

        setImageBaseUrls({
          agent: supported?.agentUrl?.img?.trim() || fallback,
          property: supported?.propertyUrl?.img?.trim() || fallback,
        });
      } catch (err) {
        console.error("Master data error:", err);
      }
    };

    loadMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const closeAllDropdowns = () => {
    setIsCountryDropdownOpen(false);
    setIsJobTitleDropdownOpen(false);
    setIsAgentTypeDropdownOpen(false);
    setIsExperienceDropdownOpen(false);
    setIsNationalityDropdownOpen(false);
    setIsLanguageDropdownOpen(false);
  };

  const applyAgentFromServer = (data: any | null) => {
    if (!data) {
      setAgentData(null);
      return;
    }
    setAgentData(data);
    setSelectedAgentType(data?.agentType || "");
    setSelectedExperience(data?.experience || "");
    setActivateAgent(Boolean(data?.isActive));
    syncProfilePictureFromServer(data?.profilePicture);
    setSelectedImage(null);
    setSearchQuery("");
    setNationalitySearchQuery("");
    closeAllDropdowns();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadAgentFromServer = async () => {
    if (!id) return null;
    const res = await agencyService.getAgentById(id);
    applyAgentFromServer(res?.agent ?? null);
    return res?.agent ?? null;
  };

  useEffect(() => {
    if (!id) {
      setPageLoading(false);
      return;
    }

    let cancelled = false;

    const fetchAgent = async () => {
      setPageLoading(true);
      try {
        await loadAgentFromServer();
      } catch (err) {
        console.error("Error fetching agent:", err);
        if (!cancelled) {
          setAgentData(null);
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    void fetchAgent();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDiscard = async () => {
    if (!id || discardLoading || saveLoading || pageLoading) return;

    setDiscardLoading(true);
    try {
      await loadAgentFromServer();
      toast.success("Discarded", "Your changes were discarded.");
    } catch (err) {
      console.error(err);
      toast.error(
        "Could not discard",
        getApiErrorMessage(err, "Failed to reload agent details."),
      );
    } finally {
      setDiscardLoading(false);
    }
  };

  useEffect(() => {
    if (!agentData || !countryOptions.length) return;
    const raw = agentData.phoneCode;
    if (raw == null || String(raw).trim() === "") return;
    const target = normalizeDialCode(String(raw));
    const found = countryOptions.find(
      (c) => normalizeDialCode(String(c.phoneCode ?? "")) === target,
    );
    if (found) {
      setSelectedCountry(found);
    }
  }, [agentData, countryOptions]);

  const handleSave = async () => {
    if (!id || saveLoading) return;

    setSaveLoading(true);
    try {
      const payload = {
        fullName: agentData?.fullName,
        brokerLicenseNumber: agentData?.brokerLicenseNumber,

        aboutMe: agentData?.aboutMe,

        isActive: activateAgent,
        agentType: selectedAgentType,

        jobTitle: selectedJobTitle?._id,

        experience: selectedExperience,

        languages: selectedLanguages.map((l) => l._id),

        nationality: selectedNationality?._id,
        linkedinUrl: agentData?.socialLinks?.linkedin,
      };

      await agencyService.updateAgent(id!, payload);

      toast.success("Saved", "Agent updated successfully.");
      navigate("/agency/super-agent");
    } catch (err) {
      console.error(err);
      toast.error(
        "Could not save",
        getApiErrorMessage(err, "Failed to update agent."),
      );
    } finally {
      setSaveLoading(false);
    }
  };

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

  useEffect(() => {
    if (!agentData?.nationality || !countryOptions.length) return;

    const found = countryOptions.find(
      (c) =>
        c._id === agentData.nationality?._id ||
        c.name.toLowerCase().trim() ===
        agentData.nationality?.name?.toLowerCase().trim(),
    );

    if (found) {
      setSelectedNationality(found);
    }
  }, [agentData, countryOptions]);

  useEffect(() => {
    if (!agentData || !jobTitleOptions.length) return;

    const found = jobTitleOptions.find(
      (j) => j._id === agentData?.specialization._id,
    );

    setSelectedJobTitle(found || null);
  }, [agentData, jobTitleOptions]);

  useEffect(() => {
    if (!agentData?.languages || !languageOptions.length) return;

    const languageIds = agentData.languages.map((l: any) =>
      typeof l === "string" ? l : l._id,
    );

    const mapped = languageOptions.filter((lang) =>
      languageIds.includes(lang._id),
    );

    setSelectedLanguages(mapped);
  }, [agentData, languageOptions]);

  useEffect(() => {
    if (!imageBaseUrls.agent) return;
    syncProfilePictureFromServer(
      profilePictureFilename ?? agentData?.profilePicture ?? null,
    );
  }, [imageBaseUrls.agent]);

  const handleToggleAgent = async () => {
    if (!id || isInvitationDeclined(agentData)) return;

    const newStatus = !activateAgent;

    // ✅ Optimistic UI update
    setActivateAgent(newStatus);

    try {
      await agencyService.updateAgent(id, {
        isActive: newStatus,
      });

      toast.success("Saved", "Agent updated successfully.");
    } catch (err) {
      console.error(err);

      // ❌ revert if failed
      setActivateAgent(!newStatus);

      toast.error(
        "Could not update",
        getApiErrorMessage(err, "Could not update activation status."),
      );
    }
  };

  const agentTypeTriggerText = (() => {
    if (!selectedAgentType) return "Select agent type";
    const label = agentTypeOptions.find((o) => o.value === selectedAgentType)
      ?.name;
    if (label) return label;
    if (agentTypeOptions.length === 0) return "…";
    return selectedAgentType;
  })();

  const invitationDeclined = isInvitationDeclined(agentData);

  const hasRealProfilePhoto =
    Boolean(selectedImage?.startsWith("blob:")) ||
    hasUploadedProfilePicture(profilePictureFilename);

  const profileImageSrc = selectedImage ?? serverProfilePictureUrl ?? Userimg;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader
        title="Edit Agent"
        showBack={true}
        onBackClick={() => navigate(-1)}
      />
      {pageLoading ? (
        <div className="rounded-[15px] bg-white min-h-[280px] flex items-center justify-center">
          <Loader size={80} margin={0} />
        </div>
      ) : (
        <div className="bg-[#F5F5F5]">
          {/* Main Card */}
          <div className="bg-white rounded-[15px] p-[4px] flex flex-col md:flex-row">
            {/* Left Side (Forms) */}
            <div className="flex-1 flex flex-col relative w-full md:p-[24px] p-[16px]">
              {/* Notice */}
              <h4 className="text-[#222] text-[20px] font-[Bold] mb-[18px]">
                Agent Details
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[30px] gap-y-[24px]">
                {/* Col 1 */}
                <div className="flex flex-col gap-[20px]">
                  {/* Agency Name / Agent Name (typo preserved as in design "Agenct Name") */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Agenct Name <span className="text-[#EA3934]">*</span>
                    </label>
                    <input
                      type="text"
                      value={agentData?.fullName || ""}
                      onChange={(e) =>
                        setAgentData({ ...agentData, fullName: e.target.value })
                      }
                      placeholder="Enter Name"
                      className="w-full border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                    />
                  </div>
                  {/* Agent Role */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Agent job role<span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="relative" ref={jobTitleDropdownRef}>
                      <div
                        className="w-full h-[44px] rounded-[10px] border border-[#EAEAEA] px-[16px] text-[14px] font-[Regular] flex items-center justify-between cursor-pointer"
                        onClick={() =>
                          setIsJobTitleDropdownOpen(!isJobTitleDropdownOpen)
                        }
                      >
                        <span
                          className={
                            selectedJobTitle ? "text-[#222]" : "text-[#AAAAAA]"
                          }
                        >
                          {selectedJobTitle?.title || "Select job title"}
                        </span>
                        <DownArrowIcon
                          className={`transition-transform ${isJobTitleDropdownOpen ? "rotate-180" : ""}`}
                          width={12}
                          height={12}
                          fill="#707070"
                        />
                      </div>
                      {isJobTitleDropdownOpen && (
                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 p-[6px]">
                          {jobTitleOptions.map((option) => (
                            <div
                              key={option._id}
                              className={`px-[14px] py-[10px] cursor-pointer rounded-[8px] hover:bg-[#F5F5F5] ${selectedJobTitle?._id === option._id ? "bg-[#F5F5F5]" : ""}`}
                              onClick={() => {
                                setSelectedJobTitle(option);
                                setIsJobTitleDropdownOpen(false);
                              }}
                            >
                              <span className="text-[13px] font-[Regular] text-[#222]">
                                {option.title}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agent type */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Agent type <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="relative" ref={agentTypeDropdownRef}>
                      <div
                        className="w-full h-[44px] rounded-[10px] border border-[#EAEAEA] px-[16px] text-[14px] font-[Regular] flex items-center justify-between cursor-pointer"
                        onClick={() =>
                          setIsAgentTypeDropdownOpen(!isAgentTypeDropdownOpen)
                        }
                      >
                        <span
                          className={
                            selectedAgentType
                              ? "text-[#222]"
                              : "text-[#AAAAAA]"
                          }
                        >
                          {agentTypeTriggerText}
                        </span>
                        <DownArrowIcon
                          className={`transition-transform ${isAgentTypeDropdownOpen ? "rotate-180" : ""}`}
                          width={12}
                          height={12}
                          fill="#707070"
                        />
                      </div>
                      {isAgentTypeDropdownOpen && (
                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 p-[6px]">
                          {agentTypeOptions.map((option) => (
                            <div
                              key={option._id}
                              className={`px-[14px] py-[10px] cursor-pointer rounded-[8px] hover:bg-[#F5F5F5] ${selectedAgentType === option.value ? "bg-[#F5F5F5]" : ""}`}
                              onClick={() => {
                                setSelectedAgentType(option.value);
                                setIsAgentTypeDropdownOpen(false);
                              }}
                            >
                              <span className="text-[13px] font-[Regular] text-[#222]">
                                {option.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Phone Number <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="flex gap-[10px] bg-white rounded-[10px] h-[44px] items-center mb-[10px]">
                      <div className="relative h-full" ref={dropdownRef}>
                        <div
                          className={`flex items-center gap-[6px] p-[0px_10px_0px_10px] h-full border border-[#EAEAEA] rounded-[10px] ${CONTACT_FIELDS_READ_ONLY
                            ? "cursor-not-allowed bg-[#F5F5F5] opacity-90"
                            : "cursor-pointer"
                            }`}
                          onClick={() => {
                            if (CONTACT_FIELDS_READ_ONLY) return;
                            setIsCountryDropdownOpen(!isCountryDropdownOpen);
                          }}
                        >
                          <img
                            src={selectedCountry?.flag}
                            alt={selectedCountry?.code}
                            className="w-[20px] h-[14px] rounded-[2px] object-cover"
                          />
                          <DownArrowIcon
                            className={`flex-shrink-0 mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
                            width={10}
                            height={14}
                          />
                        </div>

                        {isCountryDropdownOpen && (
                          <div className="absolute top-[50px] left-0 w-[260px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                            <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                              <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                                <SearchIcon className="text-[#707070] shrink-0" />
                                <input
                                  type="text"
                                  placeholder="Search country..."
                                  className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="overflow-y-auto flex-1 p-[6px] scrollbar-hide">
                              {filteredCountries.length > 0 ? (
                                filteredCountries.map((country) => (
                                  <div
                                    key={country._id}
                                    className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedCountry?._id === country._id ? "bg-[#F5F5F5]" : ""}`}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSelectedCountry(country);
                                      setIsCountryDropdownOpen(false);
                                      setSearchQuery("");
                                    }}
                                  >
                                    <img
                                      src={country?.flag}
                                      alt={country?.code}
                                      className="w-[20px] h-[14px] rounded-[2px] object-cover"
                                    />
                                    <span className="text-[13px] font-[Regular] text-[#222]">
                                      {country?.name}
                                    </span>
                                    <span className="text-[13px] font-[Medium] text-[#707070] ml-auto">
                                      {country?.phoneCode}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <div className="px-[14px] py-[12px] text-center text-[13px] text-[#707070]">
                                  No countries found
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <input
                          type="text"
                          readOnly={CONTACT_FIELDS_READ_ONLY}
                          disabled={CONTACT_FIELDS_READ_ONLY}
                          value={getDisplayPhoneLocal(agentData)}
                          placeholder="Enter phone number"
                          className={`w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] disabled:cursor-not-allowed disabled:bg-[#F5F5F5] ${agentData?.isPhoneVerified ? "pr-[90px]" : "pr-[14px]"
                            }`}
                        />
                        {agentData?.isPhoneVerified === true && (
                          <div className="pointer-events-none absolute right-[10px] top-1/2 flex -translate-y-1/2 items-center gap-[4px] text-[14px] font-[Bold] text-[#00A663]">
                            <VerifiedIcon className="h-[14px] w-[14px]" /> Verified
                          </div>
                        )}
                      </div>
                    </div>
                    {/* <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] h-[44px] pl-[16px] pr-[4px]">
                    <input
                      type="text"
                      placeholder="Enter otp"
                      className="w-full  rounded-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                    />
                    <button className="bg-[rgba(34,34,34,0.10)] text-[#222] font-[SemiBold] text-[12px] h-[32px] px-[16px] rounded-[10px] shrink-0 hover:bg-[#EAEAEA] transition-colors">
                      Verify
                    </button>
                  </div> */}
                  </div>

                  {/* Email Id */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Email Id <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="relative mb-[5px]">
                      <input
                        type="email"
                        readOnly={CONTACT_FIELDS_READ_ONLY}
                        disabled={CONTACT_FIELDS_READ_ONLY}
                        value={agentData?.email || ""}
                        placeholder="Enter Email address"
                        className={`w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] disabled:cursor-not-allowed disabled:bg-[#F5F5F5] ${agentData?.isEmailVerified ? "pr-[90px]" : "pr-[14px]"
                          }`}
                      />
                      {agentData?.isEmailVerified === true && (
                        <div className="pointer-events-none absolute right-[10px] top-1/2 flex -translate-y-1/2 items-center gap-[4px] text-[14px] font-[Bold] text-[#00A663]">
                          <VerifiedIcon className="h-[14px] w-[14px]" /> Verified
                        </div>
                      )}
                    </div>
                    {/* <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] h-[44px] pl-[16px] pr-[4px]">
                    <input
                      type="text"
                      placeholder="Enter otp"
                      className="w-full  rounded-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                    />
                    <button className="bg-[rgba(34,34,34,0.10)] text-[#222] font-[SemiBold] text-[12px] h-[32px] px-[16px] rounded-[10px] shrink-0 hover:bg-[#EAEAEA] transition-colors">
                      Verify
                    </button>
                  </div> */}
                  </div>

                  {/* Experience */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Experience <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="relative" ref={experienceDropdownRef}>
                      <div
                        className="w-full h-[44px] rounded-[10px] border border-[#EAEAEA] px-[16px] text-[14px] font-[Regular] flex items-center justify-between cursor-pointer"
                        onClick={() =>
                          setIsExperienceDropdownOpen(!isExperienceDropdownOpen)
                        }
                      >
                        <span
                          className={
                            selectedExperience ? "text-[#222]" : "text-[#AAAAAA]"
                          }
                        >
                          {selectedExperience || "Select year of experience"}
                        </span>
                        <DownArrowIcon
                          className={`transition-transform ${isExperienceDropdownOpen ? "rotate-180" : ""}`}
                          width={12}
                          height={12}
                          fill="#707070"
                        />
                      </div>
                      {isExperienceDropdownOpen && (
                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 p-[6px]">
                          {experienceOptions.map((option) => (
                            <div
                              key={option.value}
                              className={`px-[14px] py-[10px] cursor-pointer rounded-[8px] hover:bg-[#F5F5F5] ${selectedExperience === option.name ? "bg-[#F5F5F5]" : ""}`}
                              onClick={() => {
                                setSelectedExperience(option.value);
                                setIsExperienceDropdownOpen(false);
                              }}
                            >
                              <span className="text-[13px] font-[Regular] text-[#222]">
                                {option.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BRN */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Dubai Broker License (BRN){" "}
                      <span className="text-[#EA3934]">*</span>
                    </label>
                    <input
                      type="text"
                      value={agentData?.brokerLicenseNumber || ""}
                      onChange={(e) =>
                        setAgentData({
                          ...agentData,
                          brokerLicenseNumber: e.target.value,
                        })
                      }
                      placeholder="Enter Dubai Broker License (BRN)"
                      className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px]  h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                    />
                  </div>

                  {/* Nationality */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Nationality <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="relative" ref={nationalityDropdownRef}>
                      <div
                        className="w-full h-[44px] rounded-[10px] border border-[#EAEAEA] px-[16px] flex items-center justify-between cursor-pointer"
                        onClick={() =>
                          setIsNationalityDropdownOpen(!isNationalityDropdownOpen)
                        }
                      >
                        {selectedNationality ? (
                          <div className="flex items-center gap-[10px]">
                            <img
                              src={selectedNationality?.flag}
                              alt={selectedNationality?.code}
                              className="w-[20px] h-[14px] rounded-[2px] object-cover"
                            />
                            <span className="text-[14px] font-[Regular] text-[#222]">
                              {selectedNationality.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[14px] font-[Regular] text-[#AAAAAA]">
                            Select Nationality
                          </span>
                        )}
                        <DownArrowIcon
                          className={`transition-transform ${isNationalityDropdownOpen ? "rotate-180" : ""}`}
                          width={12}
                          height={12}
                          fill="#707070"
                        />
                      </div>
                      {isNationalityDropdownOpen && (
                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[180px] overflow-hidden flex flex-col">
                          <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                              <SearchIcon className="text-[#707070] shrink-0" />
                              <input
                                type="text"
                                placeholder="Search nationality..."
                                className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                value={nationalitySearchQuery}
                                onChange={(e) =>
                                  setNationalitySearchQuery(e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto flex-1 p-[6px] scrollbar-hide">
                            {filteredNationalities.length > 0 ? (
                              filteredNationalities.map((country) => (
                                <div
                                  key={country._id}
                                  className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedNationality?._id === country._id ? "bg-[#F5F5F5]" : ""}`}
                                  onClick={() => {
                                    setSelectedNationality(country);
                                    setIsNationalityDropdownOpen(false);
                                    setNationalitySearchQuery("");
                                  }}
                                >
                                  <img
                                    src={country.flag}
                                    alt={country.code}
                                    className="w-[20px] h-[14px] rounded-[2px] object-cover"
                                  />
                                  <span className="text-[13px] font-[Regular] text-[#222]">
                                    {country.name}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="px-[14px] py-[12px] text-center text-[13px] text-[#707070]">
                                No nationalities found
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Col 2 */}
                <div className="flex flex-col gap-[20px]">
                  {/* Languages */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Language known <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="relative" ref={languageDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsLanguageDropdownOpen((prev) => !prev)}
                        className="w-full h-[44px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-left text-[14px] font-[Regular] text-[#707070] flex items-center justify-between cursor-pointer bg-white"
                      >
                        Select languages
                        <DownArrowIcon
                          width={11}
                          height={7}
                          className={`transition-transform shrink-0 ${isLanguageDropdownOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isLanguageDropdownOpen && (
                        <div className="absolute left-0 top-[52px] z-30 w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] py-[6px] max-h-[220px] overflow-y-auto scrollbar-hide">
                          {languageOptions.map((option) => {
                            const isSelected = selectedLanguages.some(
                              (l) => l._id === option._id,
                            );
                            return (
                              <button
                                key={option._id}
                                type="button"
                                onClick={() => addLanguage(option)}
                                className={`w-full text-left px-[14px] py-[9px] text-[12px] font-[SemiBold] transition-colors ${isSelected
                                  ? "bg-[#F5F7FF] text-[#0832AE]"
                                  : "text-[#222] hover:bg-[#F5F5F5]"
                                  }`}
                              >
                                {option.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* Selected languages (same pattern as AssignAgencies chips) */}
                    {selectedLanguages.length > 0 && (
                      <div className="flex flex-wrap gap-[6px] mt-[6px]">
                        {selectedLanguages.map((language) => (
                          <span
                            key={language._id}
                            className="inline-flex items-center gap-[6px] h-[21px] rounded-[5px] bg-[#222] text-white px-[8px] text-[12px] font-[SemiBold]"
                          >
                            {language.name}
                            <button
                              type="button"
                              onClick={() => removeLanguage(language)}
                              className="cursor-pointer text-white/90 leading-none"
                              aria-label={`Remove ${language}`}
                            >
                              <CancelIcon width={6} height={6} stroke="#FFFFFF" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Description */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      Description <span className="text-[#EA3934]">*</span>
                    </label>
                    <textarea
                      placeholder="Enter description"
                      value={agentData?.aboutMe || ""}
                      onChange={(e) =>
                        setAgentData({ ...agentData, aboutMe: e.target.value })
                      }
                      className="w-full h-[220px] border border-[rgba(34,34,34,0.10)] rounded-[10px] pt-[14px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] resize-none"
                    ></textarea>
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                      LinkedIn <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={agentData?.socialLinks?.linkedin || ""}
                        onChange={(e) =>
                          setAgentData({
                            ...agentData,
                            socialLinks: {
                              ...agentData?.socialLinks,
                              linkedin: e.target.value,
                            },
                          })
                        }
                        placeholder="Enter URL"
                        className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                      />
                      <div className="absolute right-[16px] top-1/2 -translate-y-1/2 pointer-events-none text-[#0077b5]">
                        <LinkedinIcon width={16} height={16} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div className="flex items-center justify-between lg:col-span-2 pt-[20px] mt-[10px]">
                <button
                  type="button"
                  onClick={() => void handleDiscard()}
                  disabled={discardLoading || saveLoading || pageLoading}
                  className="border border-[#222] text-[#222] text-[14px] font-[Bold] rounded-[10px] px-[20px] h-[44px] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {discardLoading ? "Discarding…" : "Discard"}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveLoading || discardLoading}
                  className="bg-[#EA3934] text-white text-[14px] font-[Bold] rounded-[10px] px-[20px] h-[44px] transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saveLoading ? "Saving…" : "Save the changes"}
                </button>
              </div>
            </div>

            {/* Right Side (Profile Picture) */}
            <div className="w-auto xl:w-[min(100%,380px)] shrink-0 m-[4px] flex flex-col">
              <div className="rounded-[15px] bg-[#F5F5F5] md:p-[15px_30px] p-[10px_20px] mb-[6px] flex items-center justify-between gap-3">
                <span className="text-[15px] font-[Bold] text-[#222]">
                  Activate Agent
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={activateAgent}
                  aria-disabled={invitationDeclined}
                  disabled={invitationDeclined}
                  onClick={handleToggleAgent}
                  className={`relative shrink-0 h-[26px] w-[48px] rounded-full transition-colors ${invitationDeclined ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${activateAgent ? "bg-[#EA3934]" : "bg-[#D4D4D4]"
                    }`}
                >
                  <span
                    className={`absolute top-[3px] left-[3px] h-[20px] w-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${activateAgent ? "translate-x-[22px]" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>
              <div className="relative h-full rounded-[15px] bg-[#F5F5F5] md:p-[39px_30px] p-[10px_20px]">
                {isUploadingPhoto && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[15px] bg-white/70">
                    <Loader size={56} margin={0} />
                  </div>
                )}
                <h3 className="text-[#222] font-[Bold] text-[20px] mb-[50px] w-full text-center">
                  Agent profile photo
                </h3>

                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="flex items-center justify-center">
                  <div className="w-[180px] h-[180px] mb-[50px] shrink-0 rounded-full border-2 border-white bg-[rgba(34,34,34,0.10)] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)] overflow-hidden">
                    <img
                      src={profileImageSrc}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-[10px] w-full justify-center">
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    className="bg-[#0832AE] text-white font-[SemiBold] text-[12px] px-[10px] h-[34px] rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleAddPhotoClick}
                  >
                    {hasRealProfilePhoto ? "Change photo" : "Add photo"}
                  </button>
                  <button
                    type="button"
                    disabled={isUploadingPhoto || !hasRealProfilePhoto}
                    className="bg-[#FFF] text-[#222] font-[SemiBold] text-[12px] px-[10px] h-[34px] rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleDeletePhoto}
                  >
                    Delete photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAgentEdit;
