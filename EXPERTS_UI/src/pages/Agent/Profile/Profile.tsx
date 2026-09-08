import React, { useRef, useState, useEffect, useMemo, useCallback } from "react";
import userImg from '../../../assets/img/user.png'
import { VerifiedIcon, EyeIcon, DownArrowIcon, SearchIcon, CancelIcon } from "../../../components/CustomFile/icons";
import { useAgentLayout } from "../../../context/AgentLayoutContext";
import Loader from "../../../components/Loader/loader";
import {
    agentService,
    type AgentCountryMasterItem,
    type AgentJobTitleMasterItem,
    type AgentExperienceMasterItem,
    type AgentLanguageMasterItem,
    type AgentProfileData,
    type AgentSupportedUrlsMasterData,
    type AgentUpdateProfileBody,
} from "../../../services/agentService";
import { API_BASE_URL, ApiError } from "../../../services/apiClient";
import { authStorage } from "../../../services/authStorage";
import { toast } from "../../../services/toast";
import {
    buildProfilePictureUrl,
    hasUploadedProfilePicture,
} from "../../../utils/agentProfileMedia";

/** UI row for country master (phone + nationality) */
type ProfileCountry = {
    id: string;
    name: string;
    code: string;
    dialCode: string;
    flag: string;
    displayOrder: number;
};

const normalizeDialCode = (raw?: string | null) => {
    const t = String(raw ?? "").trim();
    if (!t) return "";
    return t.startsWith("+") ? t : `+${t}`;
};

const mapCountryToProfile = (c: AgentCountryMasterItem): ProfileCountry => {
    const code = String(c.code ?? "").trim().toUpperCase();
    const flag =
        (c.flag && String(c.flag).trim()) ||
        (code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : "");
    return {
        id: String(c._id),
        name: String(c.name ?? "").trim() || code,
        code,
        dialCode: normalizeDialCode(c.phoneCode),
        flag,
        displayOrder: typeof c.displayOrder === "number" ? c.displayOrder : 9999,
    };
};

const sortCountries = (list: ProfileCountry[]) =>
    [...list].sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
        return a.name.localeCompare(b.name);
    });

const specializationToJobTitleId = (raw: AgentProfileData["specialization"]): string => {
    if (!raw) return "";
    if (typeof raw === "string") return raw.trim();
    if (typeof raw === "object" && raw !== null && "_id" in raw && (raw as { _id?: string })._id) {
        return String((raw as { _id: string })._id);
    }
    return "";
};

const nationalityToProfileCountry = (
    nat: AgentProfileData["nationality"],
    list: ProfileCountry[]
): ProfileCountry | null => {
    if (!nat) return null;
    if (typeof nat === "string") {
        const id = nat.trim();
        return id ? list.find((c) => c.id === id) ?? null : null;
    }
    const row = nat as AgentCountryMasterItem;
    const id = String(row._id ?? "").trim();
    if (id) {
        const existing = list.find((c) => c.id === id);
        if (existing) return existing;
    }
    return mapCountryToProfile(row);
};

const resolvePhoneCountryAndLocal = (
    profile: AgentProfileData,
    countries: ProfileCountry[]
): { country: ProfileCountry | null; localDigits: string } => {
    const sorted = [...countries].filter((c) => c.dialCode).sort((a, b) => b.dialCode.length - a.dialCode.length);
    const pc = normalizeDialCode(profile.phoneCode);
    const localFromFields = String(profile.phoneNumberWithoutCode ?? "").replace(/\D/g, "");
    if (pc && localFromFields) {
        const match = sorted.find((c) => normalizeDialCode(c.dialCode) === pc);
        if (match) return { country: match, localDigits: localFromFields };
    }
    const full = String(profile.phoneNumber ?? "").trim();
    if (!full) return { country: null, localDigits: "" };
    const withPlus = full.startsWith("+") ? full : `+${full.replace(/\D/g, "")}`;
    for (const c of sorted) {
        if (withPlus.startsWith(c.dialCode)) {
            return {
                country: c,
                localDigits: withPlus.slice(c.dialCode.length).replace(/\D/g, ""),
            };
        }
    }
    return { country: null, localDigits: withPlus.replace(/\D/g, "") };
};

const extractAgentImageBase = (data: AgentSupportedUrlsMasterData | null, defaultOrigin: string): string => {
    const fallback = `${defaultOrigin}/uploads/img/agents/`;
    if (!data) return fallback.replace(/\/?$/, "/");
    const source =
        (data.supportedUrls as Record<string, unknown>) ||
        (data.supportedurls as Record<string, unknown>) ||
        {};
    const agentUrl =
        (source.agentUrl as Record<string, unknown>) ||
        (source.agenturl as Record<string, unknown>) ||
        {};
    return String(agentUrl.img || fallback).replace(/\/?$/, "/");
};

/** Pre-upload guard; server enforces multer `MAX_IMAGE_SIZE` / image mimetype. */
const MAX_AGENT_PROFILE_IMAGE_BYTES = 15 * 1024 * 1024;

const Profile = () => {
    const { refreshAgentHeader } = useAgentLayout();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    // Country dropdown states 
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [countriesList, setCountriesList] = useState<ProfileCountry[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<ProfileCountry | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isJobTitleDropdownOpen, setIsJobTitleDropdownOpen] = useState(false);
    const [jobTitles, setJobTitles] = useState<AgentJobTitleMasterItem[]>([]);
    const [selectedJobTitleId, setSelectedJobTitleId] = useState<string>("");
    const jobTitleDropdownRef = useRef<HTMLDivElement>(null);
    const [isExperienceDropdownOpen, setIsExperienceDropdownOpen] = useState(false);
    const [experienceOptions, setExperienceOptions] = useState<AgentExperienceMasterItem[]>([]);
    const [selectedExperienceValue, setSelectedExperienceValue] = useState<string>("");
    const experienceDropdownRef = useRef<HTMLDivElement>(null);
    const [isNationalityDropdownOpen, setIsNationalityDropdownOpen] = useState(false);
    const [nationalitySearchQuery, setNationalitySearchQuery] = useState("");
    const [selectedNationality, setSelectedNationality] = useState<ProfileCountry | null>(null);
    const nationalityDropdownRef = useRef<HTMLDivElement>(null);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const [languages, setLanguages] = useState<AgentLanguageMasterItem[]>([]);
    const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
    const languageDropdownRef = useRef<HTMLDivElement>(null);

    const defaultOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneLocal, setPhoneLocal] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [description, setDescription] = useState("");
    const [brokerLicense, setBrokerLicense] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [serverProfilePictureUrl, setServerProfilePictureUrl] = useState<string | null>(null);
    const [profilePictureFilename, setProfilePictureFilename] = useState<string | null>(null);
    const agentImgBaseRef = useRef(`${defaultOrigin}/uploads/img/agents/`);
    const [agentId, setAgentId] = useState("");
    const [isWhatsappPrimary, setIsWhatsappPrimary] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    const applyAgentProfileData = useCallback((p: AgentProfileData, mapped: ProfileCountry[]) => {
        const ae = mapped.find((c) => c.code === "AE") ?? mapped[0] ?? null;
        const imgBase = agentImgBaseRef.current;
        setAgentId(String(p.id ?? p._id ?? "").trim());
        setIsWhatsappPrimary(Boolean(p.isWhatsappPrimary));
        setFullName(String(p.fullName ?? "").trim());
        setEmail(String(p.email ?? "").trim());
        setLinkedin(String(p.socialLinks?.linkedin ?? "").trim());
        setDescription(String(p.description ?? p.aboutMe ?? "").trim());
        setBrokerLicense(String(p.brokerLicenseNumber ?? "").trim());
        setIsEmailVerified(Boolean(p.isEmailVerified));
        setIsPhoneVerified(Boolean(p.isPhoneVerified));

        const phoneRes = resolvePhoneCountryAndLocal(p, mapped);
        setSelectedCountry(phoneRes.country ?? ae);
        setPhoneLocal(phoneRes.localDigits);

        setSelectedNationality(nationalityToProfileCountry(p.nationality, mapped));

        setSelectedJobTitleId(specializationToJobTitleId(p.specialization));
        const expVal = p.experience != null && p.experience !== "" ? String(p.experience) : "";
        setSelectedExperienceValue(expVal);

        const langIds = (p.languages ?? [])
            .map((x) => (typeof x === "string" ? x : String((x as { _id?: string })?._id ?? "")))
            .filter(Boolean);
        setSelectedLanguageIds(langIds);

        const pic = p.profilePicture ? String(p.profilePicture).trim() : null;
        setProfilePictureFilename(pic);
        setServerProfilePictureUrl(buildProfilePictureUrl(imgBase, pic));
    }, []);

    const filteredCountries = countriesList.filter(
        (country) =>
            country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            country.dialCode.includes(searchQuery) ||
            country.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const filteredNationalities = countriesList.filter((country) =>
        country.name.toLowerCase().includes(nationalitySearchQuery.toLowerCase())
    );

    const selectedJobTitleLabel =
        jobTitles.find((j) => j._id === selectedJobTitleId)?.title ?? "";
    const selectedExperienceLabel =
        experienceOptions.find((e) => e.value === selectedExperienceValue)?.name ?? "";
    const selectedLanguageItems = useMemo(
        () =>
            selectedLanguageIds
                .map((id) => languages.find((lang) => lang._id === id))
                .filter((lang): lang is AgentLanguageMasterItem => Boolean(lang)),
        [languages, selectedLanguageIds]
    );

    const addLanguage = (languageId: string) => {
        setSelectedLanguageIds((prev) => (prev.includes(languageId) ? prev : [...prev, languageId]));
        setIsLanguageDropdownOpen(false);
    };

    const removeLanguage = (languageId: string) => {
        setSelectedLanguageIds((prev) => prev.filter((id) => id !== languageId));
    };

    useEffect(() => {
        let mounted = true;
        setIsProfileLoading(true);
        Promise.all([
            agentService.getCountriesMasterData(),
            agentService.getJobTitlesMasterData(),
            agentService.getAgentExperienceMasterData(),
            agentService.getLanguagesMasterData(),
            agentService.getSupportedUrlsMasterData().catch(() => null),
        ])
            .then(async ([countriesRes, jobRes, expRes, langRes, urlsRes]) => {
                if (!mounted) return;
                const raw = countriesRes?.countries ?? [];
                const mapped = sortCountries(raw.map(mapCountryToProfile));
                setCountriesList(mapped);
                const ae = mapped.find((c) => c.code === "AE") ?? mapped[0] ?? null;

                const titles = jobRes?.jobTitles ?? jobRes?.jobtitles ?? [];
                setJobTitles(titles);

                const exp = expRes?.agentExperience ?? expRes?.agentexperience ?? [];
                setExperienceOptions(exp);

                setLanguages(langRes?.languages ?? []);

                const imgBase = extractAgentImageBase(urlsRes, defaultOrigin);
                agentImgBaseRef.current = imgBase;

                let profile: AgentProfileData | null = null;
                try {
                    profile = await agentService.getProfile();
                } catch {
                    toast.error("Profile", "Could not load your profile. Check your session and try again.");
                }

                if (!mounted) return;

                if (profile) {
                    applyAgentProfileData(profile, mapped);
                } else {
                    setAgentId("");
                    setIsWhatsappPrimary(false);
                    setSelectedCountry(ae);
                    setServerProfilePictureUrl(null);
                }
            })
            .catch((err: unknown) => {
                const message =
                    (err as { message?: string })?.message || "Unable to load profile options.";
                toast.error("Master data load failed", message);
            })
            .finally(() => {
                if (mounted) setIsProfileLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [defaultOrigin, applyAgentProfileData]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
            if (jobTitleDropdownRef.current && !jobTitleDropdownRef.current.contains(event.target as Node)) {
                setIsJobTitleDropdownOpen(false);
            }
            if (experienceDropdownRef.current && !experienceDropdownRef.current.contains(event.target as Node)) {
                setIsExperienceDropdownOpen(false);
            }
            if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
                setIsNationalityDropdownOpen(false);
            }
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
                setIsLanguageDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAddPhotoClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    /** Backend: `req.body.agentId || req.body.id` (see `agentAuthController.uploadProfilePicture`). */
    const resolveUploadAgentId = () => {
        const fromState = agentId.trim();
        if (fromState) return fromState;
        const u = authStorage.getUser();
        if (u?.role === "agent" && String(u.id ?? "").trim()) return String(u.id).trim();
        return "";
    };

    const appendAgentIdentityToFormData = (fd: FormData, id: string) => {
        fd.append("agentId", id);
        fd.append("id", id);
    };

    const uploadErrorMessage = (err: unknown, fallback: string) =>
        err instanceof ApiError ? err.message : (err as Error)?.message || fallback;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const resolvedId = resolveUploadAgentId();
        if (!resolvedId) {
            toast.error("Missing agent", "Sign in again or wait for your profile to finish loading.");
            event.target.value = "";
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast.error("Invalid file", "Only image files are allowed.");
            event.target.value = "";
            return;
        }
        if (file.size > MAX_AGENT_PROFILE_IMAGE_BYTES) {
            toast.error("File too large", `Use an image under ${Math.round(MAX_AGENT_PROFILE_IMAGE_BYTES / (1024 * 1024))} MB.`);
            event.target.value = "";
            return;
        }

        const imageUrl = URL.createObjectURL(file);
        setSelectedImage(imageUrl);
        try {
            setIsUploadingPhoto(true);
            const formData = new FormData();
            appendAgentIdentityToFormData(formData, resolvedId);
            formData.append("profilePicture", file);
            await agentService.uploadProfilePicture(formData);
            const refreshed = await agentService.getProfile();
            applyAgentProfileData(refreshed, countriesList);
            void refreshAgentHeader();
            toast.success("Photo updated", "Profile picture uploaded successfully.");
        } catch (err: unknown) {
            toast.error("Upload failed", uploadErrorMessage(err, "Failed to upload profile picture."));
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
        const resolvedId = resolveUploadAgentId();
        if (!resolvedId) {
            toast.error("Missing agent", "Sign in again or wait for your profile to finish loading.");
            return;
        }
        try {
            setIsUploadingPhoto(true);
            const formData = new FormData();
            appendAgentIdentityToFormData(formData, resolvedId);
            formData.append("removeProfilePicture", "true");
            await agentService.uploadProfilePicture(formData);
            const refreshed = await agentService.getProfile();
            applyAgentProfileData(refreshed, countriesList);
            void refreshAgentHeader();
            toast.success("Photo removed", "Profile picture deleted.");
        } catch (err: unknown) {
            toast.error("Delete failed", uploadErrorMessage(err, "Could not remove profile picture."));
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleSaveProfile = async () => {
        if (!fullName.trim()) {
            toast.error("Missing name", "Agent name is required.");
            return;
        }
        if (!selectedCountry?.dialCode) {
            toast.error("Missing country code", "Please select a phone country.");
            return;
        }
        const dial = normalizeDialCode(selectedCountry.dialCode);
        const digits = phoneLocal.replace(/\D/g, "");
        if (!digits) {
            toast.error("Missing phone", "Enter your phone number (digits only).");
            return;
        }
        if (!selectedJobTitleId) {
            toast.error("Missing job title", "Please select a job title.");
            return;
        }
        if (!selectedExperienceValue) {
            toast.error("Missing experience", "Please select years of experience.");
            return;
        }
        const experienceNum = Number(selectedExperienceValue);
        if (Number.isNaN(experienceNum)) {
            toast.error("Invalid experience", "Experience value is not valid.");
            return;
        }
        if (!selectedNationality?.id) {
            toast.error("Missing nationality", "Please select your nationality.");
            return;
        }
        if (!brokerLicense.trim()) {
            toast.error("Missing BRN", "Dubai broker license (BRN) is required.");
            return;
        }
        if (!description.trim()) {
            toast.error("Missing description", "Please enter a description.");
            return;
        }
        if (!linkedin.trim()) {
            toast.error("Missing LinkedIn", "Please enter your LinkedIn profile URL.");
            return;
        }
        if (selectedLanguageIds.length === 0) {
            toast.error("Missing languages", "Select at least one language.");
            return;
        }

        const combinedPhone = `${dial}${digits}`;

        const body: AgentUpdateProfileBody = {
            fullName: fullName.trim(),
            specialization: selectedJobTitleId,
            experience: experienceNum,
            brokerLicenseNumber: brokerLicense.trim(),
            nationality: selectedNationality.id,
            languages: selectedLanguageIds,
            phoneNumber: combinedPhone,
            phoneCode: dial,
            phoneNumberWithoutCode: digits,
            description: description.trim(),
            linkedin: linkedin.trim(),
            isWhatsappPrimary,
        };
        if (isWhatsappPrimary) {
            body.whatsappNumber = combinedPhone;
        }

        try {
            setIsSavingProfile(true);
            await agentService.updateProfile(body);
            const refreshed = await agentService.getProfile();
            applyAgentProfileData(refreshed, countriesList);
            void refreshAgentHeader();
            toast.success("Profile updated", "Your profile was saved successfully.");
        } catch (err: unknown) {
            toast.error("Update failed", uploadErrorMessage(err, "Could not update profile."));
        } finally {
            setIsSavingProfile(false);
        }
    };

    const hasRealProfilePhoto =
        Boolean(selectedImage?.startsWith("blob:")) ||
        hasUploadedProfilePicture(profilePictureFilename);

    const profileImageSrc = selectedImage ?? serverProfilePictureUrl ?? userImg;

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            {isProfileLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}

            <div className="bg-[#FFF] rounded-[15px] grid grid-cols-1 xl:grid-cols-[1fr_350px] items-stretch">
                {/* Left side Form */}
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-[20px] gap-x-[30px] md:p-[30px] p-[20px] rounded-[15px] bg-[#FFF] ">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-[16px]">
                            {/* Agent name */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Agent name <span className="text-[#EA3934]">*</span></label>
                                <input
                                    type="text"
                                    placeholder="Enter name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                />
                            </div>

                            {/*Phone number */}
                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Phone number <span className="text-[#EA3934]">*</span>
                                </label>
                                <div className="flex items-center gap-[10px] mb-[10px]">
                                    {/* Country Code */}
                                    <div className="relative" ref={dropdownRef}>
                                        <div
                                            className="flex items-center gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none"
                                            onClick={() => {
                                                setIsCountryDropdownOpen(!isCountryDropdownOpen);
                                                if (!isCountryDropdownOpen) setSearchQuery("");
                                            }}
                                        >
                                            {selectedCountry ? (
                                                <img src={selectedCountry.flag} alt={selectedCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                            ) : (
                                                <span className="inline-block w-[20px] h-[14px] rounded-[2px] bg-[#EAEAEA]" aria-hidden />
                                            )}
                                            <DownArrowIcon className={`mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} width={10} height={10} />
                                        </div>

                                        {isCountryDropdownOpen && (
                                            <div className="absolute top-[50px] left-0 w-[260px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                                                {/* Search Box */}
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
                                                <div className="overflow-y-auto overflow-x-hidden flex-1 py-[8px]">
                                                    {filteredCountries.length > 0 ? filteredCountries.map((country) => (
                                                        <div
                                                            key={country.id}
                                                            className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedCountry?.id === country.id ? "bg-[#F5F5F5]" : ""}`}
                                                            onClick={() => {
                                                                setSelectedCountry(country);
                                                                setIsCountryDropdownOpen(false);
                                                                setSearchQuery("");
                                                            }}
                                                        >
                                                            <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                                                            <span className="text-[13px] font-[Medium] text-[#222] truncate">{country.name} ({country.dialCode})</span>
                                                        </div>
                                                    )) : (
                                                        <div className="p-[14px] text-[13px] text-[#707070] text-center">No countries found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Phone Number */}
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="tel-national"
                                            placeholder="Phone number"
                                            value={phoneLocal}
                                            onChange={(e) => setPhoneLocal(e.target.value.replace(/[^\d\s-]/g, ""))}
                                            className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                                        />
                                        {isPhoneVerified ? (
                                            <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                                                <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Enter otp"
                                        className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <div className="bg-[rgba(34,34,34,0.10)] px-[10px] h-[34px]  rounded-[10px] flex items-center absolute right-[7px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#222] text-[12px] font-[Medium]">
                                        Verify
                                    </div>
                                </div>
                            </div>

                            {/*Email Id */}
                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Email Id <span className="text-[#EA3934]">*</span>
                                </label>

                                <div className="relative flex-1">
                                    <input
                                        type="email"
                                        readOnly
                                        title="Email cannot be changed here"
                                        value={email}
                                        className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none bg-[#F9F9F9]"
                                    />
                                    {isEmailVerified ? (
                                        <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                                            <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                                        </div>
                                    ) : null}
                                </div>
                                {/* <div className="relative flex-1 mt-[6px]">
                                    <input
                                        type="text"
                                        placeholder="Enter otp"
                                        className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <div className="bg-[rgba(34,34,34,0.10)] px-[10px] h-[34px] rounded-[10px] flex items-center absolute right-[7px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#222] text-[12px] font-[Medium]">
                                        Verify
                                    </div>
                                </div> */}
                            </div>
                            {/* Job title */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Job title <span className="text-[#EA3934]">*</span></label>
                                <div className="relative" ref={jobTitleDropdownRef}>
                                    <div
                                        className="w-full h-[44px] rounded-[10px] border border-[#EAEAEA] px-[16px] text-[14px] font-[Regular] flex items-center justify-between cursor-pointer"
                                        onClick={() => setIsJobTitleDropdownOpen(!isJobTitleDropdownOpen)}
                                    >
                                        <span className={selectedJobTitleId ? "text-[#222]" : "text-[#AAAAAA]"}>
                                            {selectedJobTitleLabel || "Select job title"}
                                        </span>
                                        <DownArrowIcon className={`transition-transform ${isJobTitleDropdownOpen ? "rotate-180" : ""}`} width={12} height={12} fill="#707070" />
                                    </div>
                                    {isJobTitleDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 p-[6px] max-h-[200px] overflow-y-auto">
                                            {jobTitles.map((option) => (
                                                <div
                                                    key={option._id}
                                                    className={`px-[14px] py-[10px] cursor-pointer rounded-[8px] hover:bg-[#F5F5F5] ${selectedJobTitleId === option._id ? "bg-[#F5F5F5]" : ""}`}
                                                    onClick={() => {
                                                        setSelectedJobTitleId(option._id);
                                                        setIsJobTitleDropdownOpen(false);
                                                    }}
                                                >
                                                    <span className="text-[13px] font-[Regular] text-[#222]">{option.title}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Experience */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Experience <span className="text-[#EA3934]">*</span></label>
                                <div className="relative" ref={experienceDropdownRef}>
                                    <div
                                        className="w-full h-[44px] rounded-[10px] border border-[#EAEAEA] px-[16px] text-[14px] font-[Regular] flex items-center justify-between cursor-pointer"
                                        onClick={() => setIsExperienceDropdownOpen(!isExperienceDropdownOpen)}
                                    >
                                        <span className={selectedExperienceValue ? "text-[#222]" : "text-[#AAAAAA]"}>
                                            {selectedExperienceLabel || "Select year of experience"}
                                        </span>
                                        <DownArrowIcon className={`transition-transform ${isExperienceDropdownOpen ? "rotate-180" : ""}`} width={12} height={12} fill="#707070" />
                                    </div>
                                    {isExperienceDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 p-[6px] max-h-[200px] overflow-y-auto">
                                            {experienceOptions.map((option) => (
                                                <div
                                                    key={option.value}
                                                    className={`px-[14px] py-[10px] cursor-pointer rounded-[8px] hover:bg-[#F5F5F5] ${selectedExperienceValue === option.value ? "bg-[#F5F5F5]" : ""}`}
                                                    onClick={() => {
                                                        setSelectedExperienceValue(option.value);
                                                        setIsExperienceDropdownOpen(false);
                                                    }}
                                                >
                                                    <span className="text-[13px] font-[Regular] text-[#222]">{option.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/*Dubai Broker License (BRN) */}
                            <div>
                                <label className="block text-[12px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Dubai Broker License (BRN) <span className="text-[#EA3934]">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={brokerLicense}
                                    onChange={(e) => setBrokerLicense(e.target.value)}
                                    placeholder="Broker license (BRN)"
                                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                />
                            </div>
                            {/* Nationality */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Nationality <span className="text-[#EA3934]">*</span></label>
                                <div className="relative" ref={nationalityDropdownRef}>
                                    <div
                                        className="w-full h-[44px] rounded-[10px] border border-[#EAEAEA] px-[16px] flex items-center justify-between cursor-pointer"
                                        onClick={() => setIsNationalityDropdownOpen(!isNationalityDropdownOpen)}
                                    >
                                        {selectedNationality ? (
                                            <div className="flex items-center gap-[10px]">
                                                <img src={selectedNationality.flag} alt={selectedNationality.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                                <span className="text-[14px] font-[Regular] text-[#222]">{selectedNationality.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[14px] font-[Regular] text-[#AAAAAA]">Select Nationality</span>
                                        )}
                                        <DownArrowIcon className={`transition-transform ${isNationalityDropdownOpen ? "rotate-180" : ""}`} width={12} height={12} fill="#707070" />
                                    </div>
                                    {isNationalityDropdownOpen && (
                                        <div className="absolute xl:top-[-205px] top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[200px] overflow-hidden flex flex-col">
                                            <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                                                <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                                                    <SearchIcon className="text-[#707070] shrink-0" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search nationality..."
                                                        className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                                        value={nationalitySearchQuery}
                                                        onChange={(e) => setNationalitySearchQuery(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="overflow-y-auto flex-1 p-[6px] scrollbar-hide">
                                                {filteredNationalities.length > 0 ? filteredNationalities.map((country) => (
                                                    <div
                                                        key={country.id}
                                                        className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedNationality?.id === country.id ? "bg-[#F5F5F5]" : ""}`}
                                                        onClick={() => {
                                                            setSelectedNationality(country);
                                                            setIsNationalityDropdownOpen(false);
                                                            setNationalitySearchQuery("");
                                                        }}
                                                    >
                                                        <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                                        <span className="text-[13px] font-[Regular] text-[#222]">{country.name}</span>
                                                    </div>
                                                )) : (
                                                    <div className="px-[14px] py-[12px] text-center text-[13px] text-[#707070]">No nationalities found</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-[16px]">
                            {/* Languages (multi-select, same pattern as developer Assign Agencies) */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Language known <span className="text-[#EA3934]">*</span></label>
                                <div className={`relative ${selectedLanguageItems.length > 0 ? "mb-[10px]" : "mb-[0px]"}`} ref={languageDropdownRef}>
                                    <button
                                        type="button"
                                        onClick={() => setIsLanguageDropdownOpen((prev) => !prev)}
                                        className="w-full h-[44px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-left text-[14px] font-[Regular] text-[#707070] flex items-center justify-between"
                                    >
                                        Select languages
                                        <DownArrowIcon width={11} height={7} className={`transition-transform ${isLanguageDropdownOpen ? "rotate-180" : ""}`} />
                                    </button>
                                    {isLanguageDropdownOpen && (
                                        <div className="absolute left-0 top-[52px] z-30 w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] py-[6px] max-h-[220px] overflow-y-auto">
                                            {languages.length === 0 ? (
                                                <div className="px-[14px] py-[10px] text-[12px] text-[#707070]">No languages available</div>
                                            ) : (
                                                languages.map((option) => {
                                                    const isSelected = selectedLanguageIds.includes(option._id);
                                                    return (
                                                        <button
                                                            key={option._id}
                                                            type="button"
                                                            onClick={() => addLanguage(option._id)}
                                                            className={`w-full text-left px-[14px] py-[9px] text-[12px] font-[SemiBold] transition-colors ${isSelected ? "bg-[#F5F7FF] text-[#0832AE]" : "text-[#222] hover:bg-[#F5F5F5]"}`}
                                                        >
                                                            {option.name}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                                {selectedLanguageItems.length > 0 && (
                                    <div className="flex flex-wrap gap-[8px] ">
                                        {selectedLanguageItems.map((lang) => (
                                            <span
                                                key={lang._id}
                                                className="inline-flex items-center gap-[6px] h-[21px] rounded-[5px] bg-[#222] text-white px-[8px] text-[12px] font-[SemiBold]"
                                            >
                                                {lang.name}
                                                <button
                                                    type="button"
                                                    onClick={() => removeLanguage(lang._id)}
                                                    className="cursor-pointer text-white/90 leading-none"
                                                    aria-label={`Remove ${lang.name}`}
                                                >
                                                    <CancelIcon width={6} height={6} stroke="#FFFFFF" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Long description */}
                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    description <span className="text-[#EA3934]">*</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Tell clients about your experience and approach."
                                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] py-[14px] h-[290px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                />
                            </div>
                            {/* LinkedIn */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">LinkedIn <span className="text-[#EA3934]">*</span></label>
                                <div className="h-[44px] border border-[rgba(34,34,34,0.10)] rounded-[10px] p-[0px_10px] flex items-center gap-[10px]">
                                    <input
                                        type="url"
                                        placeholder="Enter URL"
                                        value={linkedin}
                                        onChange={(e) => setLinkedin(e.target.value)}
                                        className="w-full text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <div className="pointer-events-none text-[#0077b5]">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                    </div>
                                </div>

                            </div>
                            {/* Password */}
                            {/* <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Password <span className="text-[#EA3934]">*</span>
                                </label>
                                <div className="h-[44px] border border-[rgba(34,34,34,0.10)] rounded-[10px] p-[0px_10px] flex items-center gap-[10px]">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Leave blank to keep current password"
                                        className="w-full  text-[13px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className=" text-[#707070] focus:outline-none">
                                        <EyeIcon width={16} height={16} fill="#222" />
                                    </button>
                                </div>
                            </div> */}

                            {/* Confirm Password */}
                            {/* <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Confirm password <span className="text-[#EA3934]">*</span>
                                </label>
                                <div className="h-[44px] border border-[rgba(34,34,34,0.10)] rounded-[10px] p-[0px_10px] flex items-center gap-[10px]">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="w-full  text-[13px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className=" text-[#707070] focus:outline-none">
                                        <EyeIcon width={16} height={16} fill="#222" />
                                    </button>
                                </div>
                            </div> */}
                        </div>
                    </div>
                    <div className="flex items-center justify-between md:p-[0px_30px_30px_30px] p-[0px_20px_20px_20px]">
                        <div className="">
                            {/* <button className="border border-[#222] text-[#222] text-[14px] font-[Bold] px-[20px] h-[44px] rounded-[10px]">
                                Cancel
                            </button> */}
                        </div>
                        <div className="">
                            <button
                                type="button"
                                disabled={isSavingProfile || isProfileLoading}
                                onClick={handleSaveProfile}
                                className="bg-[#EA3934] text-white text-[14px] font-[Bold] px-[20px] h-[44px] rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSavingProfile ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right side Profile Image upload */}
                <div className="relative bg-[#F5F5F5] rounded-[15px] p-[30px] m-[4px] flex flex-col items-center">
                    {isUploadingPhoto && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-[15px] bg-white/70">
                            <Loader size={56} margin={0} />
                        </div>
                    )}
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[60px]">
                        Agent profile picture
                    </h2>

                    <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <div className="w-[220px] h-[220px] rounded-full border-2 border-white bg-[rgba(34,34,34,0.10)] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)] mb-[50px] flex items-center justify-center overflow-hidden shrink-0">
                        <img src={profileImageSrc} alt="Profile preview" className="w-full h-full object-cover" />
                    </div>

                    <div className="flex items-center gap-[12px]">
                        <button
                            type="button"
                            className="bg-[#0832AE] text-[#fff] text-[12px] font-[SemiBold] px-[10px] h-[34px] rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleAddPhotoClick}
                            disabled={isUploadingPhoto}
                        >
                            {hasRealProfilePhoto ? "Change photo" : "Add photo"}
                        </button>
                        <button
                            type="button"
                            className="bg-[#fff] text-[#222] text-[12px] font-[SemiBold] px-[10px] h-[34px] rounded-[10px] disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleDeletePhoto}
                            disabled={isUploadingPhoto || !hasRealProfilePhoto}
                        >
                            Delete photo
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Profile;