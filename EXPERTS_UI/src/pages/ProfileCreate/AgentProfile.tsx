import React, { useRef, useState, useEffect } from "react";
import logoimg from "../../assets/img/logo.png";
import { EyeIcon, DownArrowIcon, SearchIcon, CancelIcon, NoUserIcon, EmptyNoUserIcon, VerifiedIcon } from "../../components/CustomFile/icons";
import type { Country } from "../../data/countries";
import { countries } from "../../data/countries";
import { apiClient, getApiErrorMessage } from "../../services/apiClient";
import { toast } from "../../services/toast";
import Loader from "../../components/Loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";

type MasterCountry = {
    _id: string;
    name: string;
    code: string;
    phoneCode?: string;
    flag?: string;
};

type MasterJobTitle = {
    _id: string;
    title: string;
    isActive?: boolean;
};

type MasterLanguage = {
    _id: string;
    name: string;
    isActive?: boolean;
};

type MasterAgentExperience = {
    name?: string;
    value?: string;
};

type ProfileCreateMasterResponse = {
    countries?: MasterCountry[];
    jobTitles?: MasterJobTitle[];
    jobtitles?: MasterJobTitle[];
    languages?: MasterLanguage[];
    agentExperience?: MasterAgentExperience[];
    agentexperience?: MasterAgentExperience[];
};

type CountryOption = Country & { masterId?: string };
type JobTitleOption = { id: string; label: string };
type LanguageOption = { id: string; label: string };
type ExperienceOption = { value: string; label: string };

type UploadProfilePictureResponse = {
    uploadsBaseUrl?: string;
    url?: string;
    path?: string;
    filename?: string;
};

const AgentProfile = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const invitationToken = (searchParams.get("token") || "").trim();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploadedProfilePicture, setUploadedProfilePicture] = useState<string>("");

    // Country dropdown states 
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [countryOptions, setCountryOptions] = useState<CountryOption[]>(
        countries.map((c) => ({ ...c, masterId: undefined })),
    );
    const [selectedCountry, setSelectedCountry] = useState<CountryOption>(
        { ...(countries.find(c => c.code === "AE") || countries[0]), masterId: undefined },
    );
    const [isMasterLoading, setIsMasterLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isJobTitleDropdownOpen, setIsJobTitleDropdownOpen] = useState(false);
    const [selectedJobTitle, setSelectedJobTitle] = useState("");
    const [selectedJobTitleId, setSelectedJobTitleId] = useState("");
    const jobTitleDropdownRef = useRef<HTMLDivElement>(null);
    const [isExperienceDropdownOpen, setIsExperienceDropdownOpen] = useState(false);
    const [selectedExperience, setSelectedExperience] = useState("");
    const experienceDropdownRef = useRef<HTMLDivElement>(null);
    const [isNationalityDropdownOpen, setIsNationalityDropdownOpen] = useState(false);
    const [nationalitySearchQuery, setNationalitySearchQuery] = useState("");
    const [selectedNationality, setSelectedNationality] = useState<CountryOption | null>(null);
    const nationalityDropdownRef = useRef<HTMLDivElement>(null);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const languageDropdownRef = useRef<HTMLDivElement>(null);

    const [jobTitleOptions, setJobTitleOptions] = useState<JobTitleOption[]>([]);
    const [experienceOptions, setExperienceOptions] = useState<ExperienceOption[]>([]);
    const [languageOptions, setLanguageOptions] = useState<LanguageOption[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<LanguageOption[]>([]);
    const removeLanguage = (languageId: string) => {
        setSelectedLanguages((prev) => prev.filter((l) => l.id !== languageId));
    };
    const addLanguage = (language: LanguageOption) => {
        setSelectedLanguages((prev) =>
            prev.some((l) => l.id === language.id) ? prev : [...prev, language],
        );
        setIsLanguageDropdownOpen(false);
    };
    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [phoneOtp, setPhoneOtp] = useState("");
    const [email, setEmail] = useState("");
    const [emailOtp, setEmailOtp] = useState("");
    const [brokerLicenseNumber, setBrokerLicenseNumber] = useState("");
    const [description, setDescription] = useState("");
    const [linkedin, setLinkedin] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
    const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
    const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
    const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const filteredCountries = countryOptions.filter(country =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.dialCode.includes(searchQuery)
    );
    const filteredNationalities = countryOptions.filter(country =>
        country.name.toLowerCase().includes(nationalitySearchQuery.toLowerCase())
    );

    useEffect(() => {
        let mounted = true;

        const loadMasterData = async () => {
            try {
                setIsMasterLoading(true);
                const res = await apiClient.get<ProfileCreateMasterResponse>(
                    "/master-data?types=supportedurls,countries,jobtitles,agentexperience,languages",
                    { auth: false },
                );
                if (!mounted) return;

                const apiCountries = (res?.countries || []).map((c, index) => ({
                    id: index + 1,
                    name: c.name,
                    code: c.code,
                    dialCode: c.phoneCode || "",
                    flag: c.flag || `https://flagcdn.com/w80/${String(c.code || "").toLowerCase()}.png`,
                    masterId: c._id,
                }));
                if (apiCountries.length > 0) {
                    setCountryOptions(apiCountries);
                    const defaultCountry =
                        apiCountries.find((c) => c.code === "AE") || apiCountries[0];
                    setSelectedCountry(defaultCountry);
                }

                const apiJobTitles = (res?.jobTitles || res?.jobtitles || [])
                    .filter((item) => item?.isActive !== false && item?.title?.trim())
                    .map((item) => ({ id: item._id, label: item.title.trim() }));
                setJobTitleOptions(apiJobTitles);

                const apiExperience = (res?.agentExperience || res?.agentexperience || [])
                    .map((item) => {
                        const raw = (item?.name || item?.value || "").trim();
                        if (!raw) return null;
                        return { value: String(item?.value || raw).trim(), label: raw };
                    })
                    .filter(Boolean) as ExperienceOption[];
                setExperienceOptions(apiExperience);

                const apiLanguages = (res?.languages || [])
                    .filter((item) => item?.isActive !== false && item?.name?.trim())
                    .map((item) => ({ id: item._id, label: item.name.trim() }));
                setLanguageOptions(apiLanguages);
            } catch (error: unknown) {
                if (!mounted) return;
                toast.error(
                    "Load failed",
                    getApiErrorMessage(error, "Could not load profile dropdowns."),
                );
                // Keep static countries fallback; dropdowns can remain empty until backend responds.
                setJobTitleOptions([]);
                setExperienceOptions([]);
                setLanguageOptions([]);
            } finally {
                if (mounted) setIsMasterLoading(false);
            }
        };

        void loadMasterData();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!invitationToken) {
            toast.error("Invalid invitation", "Invitation token is missing.");
        }
    }, [invitationToken]);

    useEffect(() => {
        setIsEmailVerified(false);
    }, [email]);

    useEffect(() => {
        setIsPhoneVerified(false);
    }, [phoneNumber, selectedCountry.dialCode]);

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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setSelectedImage(imageUrl);
            if (!invitationToken) return;
            setIsUploadingPicture(true);
            const form = new FormData();
            form.append("invitationToken", invitationToken);
            form.append("profilePicture", file);
            apiClient
                .post<UploadProfilePictureResponse>("/auth/agents/upload-profile-picture", form, {
                    auth: false,
                })
                .then((res) => {
                    const uploadedPath =
                        String(res?.path || res?.filename || res?.url || "").trim();
                    if (uploadedPath) {
                        setUploadedProfilePicture(uploadedPath);
                    }
                })
                .catch((error: unknown) => {
                    toast.error(
                        "Upload failed",
                        getApiErrorMessage(error, "Could not upload profile picture."),
                    );
                })
                .finally(() => setIsUploadingPicture(false));
        }
    };

    const handleDeletePhoto = () => {
        setSelectedImage(null);
        setUploadedProfilePicture("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSendEmailOtp = async () => {
        if (!email.trim()) {
            toast.error("Email required", "Enter email before sending OTP.");
            return;
        }
        setIsSendingEmailOtp(true);
        try {
            await apiClient.post("/auth/agents/send-email-otp", { email: email.trim().toLowerCase() }, { auth: false });
            toast.success("OTP sent", "Check your email for the verification code.");
        } catch (error: unknown) {
            toast.error("Failed", getApiErrorMessage(error, "Could not send email OTP."));
        } finally {
            setIsSendingEmailOtp(false);
        }
    };

    const handleVerifyEmailOtp = async () => {
        if (!email.trim() || !emailOtp.trim()) {
            toast.error("Missing values", "Enter email and OTP.");
            return;
        }
        setIsVerifyingEmailOtp(true);
        try {
            await apiClient.post(
                "/auth/agents/verify-email-otp",
                { email: email.trim().toLowerCase(), otp: emailOtp.trim() },
                { auth: false },
            );
            setIsEmailVerified(true);
            toast.success("Verified", "Email verified successfully.");
        } catch (error: unknown) {
            setIsEmailVerified(false);
            toast.error("Verification failed", getApiErrorMessage(error, "Could not verify email OTP."));
        } finally {
            setIsVerifyingEmailOtp(false);
        }
    };

    const handleSendPhoneOtp = async () => {
        if (!email.trim() || !phoneNumber.trim()) {
            toast.error("Missing values", "Enter email and phone number.");
            return;
        }
        setIsSendingPhoneOtp(true);
        try {
            const response = await apiClient.post<{ otp?: string }>(
                "/auth/agents/send-phone-otp",
                {
                    email: email.trim().toLowerCase(),
                    phoneNumber: phoneNumber.trim(),
                    countryCode: selectedCountry.dialCode,
                },
                { auth: false },
            );
            // TEMP (non-Twilio): backend returns OTP in response data; auto-fill verify field for testing.
            if (response?.otp) {
                setPhoneOtp(String(response.otp));
            }
            toast.success("OTP sent", "Phone OTP sent successfully.");
        } catch (error: unknown) {
            toast.error("Failed", getApiErrorMessage(error, "Could not send phone OTP."));
        } finally {
            setIsSendingPhoneOtp(false);
        }
    };

    const handleVerifyPhoneOtp = async () => {
        if (!email.trim() || !phoneNumber.trim() || !phoneOtp.trim()) {
            toast.error("Missing values", "Enter email, phone number and OTP.");
            return;
        }
        setIsVerifyingPhoneOtp(true);
        try {
            await apiClient.post(
                "/auth/agents/verify-phone-otp",
                {
                    email: email.trim().toLowerCase(),
                    phoneNumber: phoneNumber.trim(),
                    countryCode: selectedCountry.dialCode,
                    otp: phoneOtp.trim(),
                },
                { auth: false },
            );
            setIsPhoneVerified(true);
            toast.success("Verified", "Phone verified successfully.");
        } catch (error: unknown) {
            setIsPhoneVerified(false);
            toast.error("Verification failed", getApiErrorMessage(error, "Could not verify phone OTP."));
        } finally {
            setIsVerifyingPhoneOtp(false);
        }
    };

    const handleCreateProfile = async () => {
        if (!invitationToken) {
            toast.error("Invalid invitation", "Invitation token is missing.");
            return;
        }
        if (!selectedJobTitleId || !selectedNationality?.masterId || selectedLanguages.length === 0) {
            toast.error("Missing fields", "Please fill all required dropdown fields.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match", "Enter the same password in both fields.");
            return;
        }
        setIsSubmittingProfile(true);
        try {
            await apiClient.post(
                `/auth/agents/accept-invitation?token=${encodeURIComponent(invitationToken)}`,
                {
                    fullName: fullName.trim(),
                    phoneNumber: phoneNumber.trim(),
                    countryCode: selectedCountry.dialCode,
                    jobTitle: selectedJobTitleId,
                    experience: selectedExperience,
                    brokerLicenseNumber: brokerLicenseNumber.trim(),
                    nationality: selectedNationality.masterId,
                    linkedin: linkedin.trim() || undefined,
                    description: description.trim() || undefined,
                    languages: selectedLanguages.map((x) => x.id),
                    password,
                    confirmPassword,
                    profilePicture: uploadedProfilePicture || undefined,
                },
                { auth: false },
            );
            toast.success("Profile created", "Submitted successfully. Wait for agency verification.");
            navigate("/", { replace: true });
        } catch (error: unknown) {
            toast.error("Submit failed", getApiErrorMessage(error, "Could not create profile."));
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    // Passwords
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordMismatch =
        confirmPassword.length > 0 && password !== confirmPassword;

    return (
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center pt-[40px] pb-[30px] px-[20px] font-['Outfit',sans-serif]">
            {/* Logo */}
            <div className="mb-[40px]">
                <img src={logoimg} alt="Estatehub Providers" className="h-[40px]" />
            </div>

            {/* Main Card */}
            <div className="relative w-full max-w-[1200px] bg-white rounded-[15px] p-[4px] flex flex-col md:flex-row">
                {(isMasterLoading || isUploadingPicture || isSubmittingProfile) && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 rounded-[15px]">
                        <Loader size={72} margin={0} />
                    </div>
                )}

                {/* Left Side (Forms) */}
                <div className="flex-1 flex flex-col relative w-full md:p-[24px] p-[16px]">
                    {/* Notice */}
                    <div className="bg-[#E6F7F0] rounded-[15px] p-[20px] flex items-center gap-[10px] mb-[24px]">
                        <div className="w-[24px] h-[24px] rounded-full border border-[#00A663] flex items-center justify-center text-[#00A663] font-[Regular] text-[12px] shrink-0">i</div>
                        <p className="text-[#222] text-[14px] font-[Regular]">
                            <span className="font-[SemiBold] ">Note :</span> only after completing your profile you can access everything. so please complete your profile
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[30px] gap-y-[24px]">
                        {/* Col 1 */}
                        <div className="flex flex-col gap-[20px]">
                            {/* Agency Name / Agent Name (typo preserved as in design "Agenct Name") */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Agenct Name <span className="text-[#EA3934]">*</span></label>
                                <input value={fullName} onChange={(e) => setFullName(e.target.value)} type="text" placeholder="Enter Name" className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]" />
                            </div>

                            {/* Email Id */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Email Id <span className="text-[#EA3934]">*</span></label>
                                <div className="relative mb-[5px] w-full">
                                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Enter Email address" className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]" />
                                    {isEmailVerified ? (
                                        <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                                            <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] h-[44px] pl-[16px] pr-[4px]">
                                    <input value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} type="text" placeholder="Enter otp" className="w-full  rounded-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]" />
                                    <button type="button" onClick={isEmailVerified ? undefined : (emailOtp.trim() ? handleVerifyEmailOtp : handleSendEmailOtp)} disabled={isSendingEmailOtp || isVerifyingEmailOtp} className="bg-[rgba(34,34,34,0.10)] text-[#222] font-[SemiBold] text-[12px] h-[32px] px-[16px] rounded-[10px] shrink-0 hover:bg-[#EAEAEA] transition-colors disabled:opacity-60">{isEmailVerified ? "Verified" : emailOtp.trim() ? (isVerifyingEmailOtp ? "Verifying..." : "Verify") : (isSendingEmailOtp ? "Sending..." : "Send OTP")}</button>
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Phone Number (whatsapp) <span className="text-[#EA3934]">*</span></label>
                                <div className="flex gap-[10px] bg-white rounded-[10px] h-[44px] items-center mb-[10px]">
                                    <div className="relative h-full" ref={dropdownRef}>
                                        <div
                                            className="flex items-center gap-[6px] p-[0px_30px_0px_10px] cursor-pointer h-full border border-[#EAEAEA] rounded-[10px]"
                                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                        >
                                            <img src={selectedCountry.flag} alt={selectedCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                            <DownArrowIcon className={`flex-shrink-0 mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
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
                                                    {filteredCountries.length > 0 ? filteredCountries.map((country) => (
                                                        <div
                                                            key={country.id}
                                                            className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedCountry.id === country.id ? "bg-[#F5F5F5]" : ""}`}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setSelectedCountry(country);
                                                                setIsCountryDropdownOpen(false);
                                                                setSearchQuery("");
                                                            }}
                                                        >
                                                            <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                                            <span className="text-[13px] font-[Regular] text-[#222]">{country.name}</span>
                                                            <span className="text-[13px] font-[Medium] text-[#707070] ml-auto">{country.dialCode}</span>
                                                        </div>
                                                    )) : (
                                                        <div className="px-[14px] py-[12px] text-center text-[13px] text-[#707070]">No countries found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative w-full">
                                        <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} type="text" placeholder="Enter phone number" className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]" />
                                        {isPhoneVerified ? (
                                            <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                                                <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] h-[44px] pl-[16px] pr-[4px]">
                                    <input value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} type="text" placeholder="Enter otp" className="w-full  rounded-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]" />
                                    <button type="button" onClick={isPhoneVerified ? undefined : (phoneOtp.trim() ? handleVerifyPhoneOtp : handleSendPhoneOtp)} disabled={isSendingPhoneOtp || isVerifyingPhoneOtp} className="bg-[rgba(34,34,34,0.10)] text-[#222] font-[SemiBold] text-[12px] h-[32px] px-[16px] rounded-[10px] shrink-0 hover:bg-[#EAEAEA] transition-colors disabled:opacity-60">{isPhoneVerified ? "Verified" : phoneOtp.trim() ? (isVerifyingPhoneOtp ? "Verifying..." : "Verify") : (isSendingPhoneOtp ? "Sending..." : "Send OTP")}</button>
                                </div>
                            </div>



                            {/* Job title */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Job title <span className="text-[#EA3934]">*</span></label>
                                <div className="relative" ref={jobTitleDropdownRef}>
                                    <div
                                        className="w-full h-[44px] rounded-[10px] border border-[#EAEAEA] px-[16px] text-[14px] font-[Regular] flex items-center justify-between cursor-pointer"
                                        onClick={() => setIsJobTitleDropdownOpen(!isJobTitleDropdownOpen)}
                                    >
                                        <span className={selectedJobTitle ? "text-[#222]" : "text-[#AAAAAA]"}>
                                            {selectedJobTitle || "Select job title"}
                                        </span>
                                        <DownArrowIcon className={`transition-transform ${isJobTitleDropdownOpen ? "rotate-180" : ""}`} width={12} height={12} fill="#707070" />
                                    </div>
                                    {isJobTitleDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 p-[6px]">
                                            {jobTitleOptions.map((option) => (
                                                <div
                                                    key={option.id}
                                                    className={`px-[14px] py-[10px] cursor-pointer rounded-[8px] hover:bg-[#F5F5F5] ${selectedJobTitleId === option.id ? "bg-[#F5F5F5]" : ""}`}
                                                    onClick={() => {
                                                        setSelectedJobTitle(option.label);
                                                        setSelectedJobTitleId(option.id);
                                                        setIsJobTitleDropdownOpen(false);
                                                    }}
                                                >
                                                    <span className="text-[13px] font-[Regular] text-[#222]">{option.label}</span>
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
                                        <span className={selectedExperience ? "text-[#222]" : "text-[#AAAAAA]"}>
                                            {experienceOptions.find((x) => x.value === selectedExperience)?.label || "Select year of experience"}
                                        </span>
                                        <DownArrowIcon className={`transition-transform ${isExperienceDropdownOpen ? "rotate-180" : ""}`} width={12} height={12} fill="#707070" />
                                    </div>
                                    {isExperienceDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 p-[6px]">
                                            {experienceOptions.map((option) => (
                                                <div
                                                    key={option.value}
                                                    className={`px-[14px] py-[10px] cursor-pointer rounded-[8px] hover:bg-[#F5F5F5] ${selectedExperience === option.value ? "bg-[#F5F5F5]" : ""}`}
                                                    onClick={() => {
                                                        setSelectedExperience(option.value);
                                                        setIsExperienceDropdownOpen(false);
                                                    }}
                                                >
                                                    <span className="text-[13px] font-[Regular] text-[#222]">{option.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* BRN */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Dubai Broker License (BRN) <span className="text-[#EA3934]">*</span></label>
                                <input value={brokerLicenseNumber} onChange={(e) => setBrokerLicenseNumber(e.target.value)} type="text" placeholder="Enter Dubai Broker License (BRN)" className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px]  h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]" />
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
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[180px] overflow-hidden flex flex-col">
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

                        {/* Col 2 */}
                        <div className="flex flex-col gap-[20px]">
                            {/* Languages */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Language known <span className="text-[#EA3934]">*</span></label>
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
                                                const isSelected = selectedLanguages.some((x) => x.id === option.id);
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        onClick={() => addLanguage(option)}
                                                        className={`w-full text-left px-[14px] py-[9px] text-[12px] font-[SemiBold] transition-colors ${isSelected
                                                            ? "bg-[#F5F7FF] text-[#0832AE]"
                                                            : "text-[#222] hover:bg-[#F5F5F5]"
                                                            }`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Selected languages (same pattern as AssignAgencies chips) */}
                            {selectedLanguages.length > 0 && (
                                <div className="flex flex-wrap gap-[8px] min-h-[34px]">
                                    {selectedLanguages.map((language, index) => (
                                        <span
                                            key={`${language.id}-${index}`}
                                            className="inline-flex items-center gap-[6px] h-[21px] rounded-[5px] bg-[#222] text-white px-[8px] text-[12px] font-[SemiBold]"
                                        >
                                            {language.label}
                                            <button
                                                type="button"
                                                onClick={() => removeLanguage(language.id)}
                                                className="cursor-pointer text-white/90 leading-none"
                                                aria-label={`Remove ${language.label}`}
                                            >
                                                <CancelIcon width={6} height={6} stroke="#FFFFFF" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Description <span className="text-[#EA3934]">*</span></label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Enter description"
                                    className="w-full h-[220px] border border-[rgba(34,34,34,0.10)] rounded-[10px] pt-[14px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] resize-none"
                                ></textarea>
                            </div>

                            {/* LinkedIn */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">LinkedIn <span className="text-[#EA3934]">*</span></label>
                                <div className="flex items-center gap-[10px] h-[44px] p-[0_14px] border border-[rgba(34,34,34,0.10)] rounded-[10px]">
                                    <input
                                        value={linkedin}
                                        onChange={(e) => setLinkedin(e.target.value)}
                                        type="text"
                                        placeholder="Enter URL"
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
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Password <span className="text-[#EA3934]">*</span></label>
                                <div className="flex items-center gap-[10px] h-[44px] p-[0_14px] border border-[rgba(34,34,34,0.10)] rounded-[10px]">
                                    <input
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter password"
                                        className="w-full text-[13px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="cursor-pointer text-[#707070] focus:outline-none">
                                        <EyeIcon width={19} height={19} />
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">Confirm password <span className="text-[#EA3934]">*</span></label>
                                <div
                                    className={`flex items-center gap-[10px] h-[44px] p-[0_14px] border rounded-[10px] ${passwordMismatch ? "border-[#EA3934]" : "border-[rgba(34,34,34,0.10)]"
                                        }`}
                                >
                                    <input
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Re enter your password"
                                        aria-invalid={passwordMismatch}
                                        className="w-full text-[13px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="cursor-pointer text-[#707070] focus:outline-none">
                                        <EyeIcon width={19} height={19} />
                                    </button>
                                </div>
                                {passwordMismatch ? (
                                    <p className="text-[12px] font-[Medium] text-[#EA3934] mt-[6px]">
                                        Passwords do not match.
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex items-center justify-between lg:col-span-2 pt-[20px] mt-[10px]">
                        <button type="button" onClick={() => navigate("/")} className="border border-[#222] text-[#222] text-[14px] font-[Bold] rounded-[10px] px-[20px] h-[44px] transition">
                            Cancel
                        </button>
                        <button type="button" onClick={handleCreateProfile} disabled={isSubmittingProfile} className="bg-[#EA3934] text-white text-[14px] font-[Bold] rounded-[10px] px-[20px] h-[44px] transition disabled:opacity-60">
                            {isSubmittingProfile ? "Creating..." : "Create profile"}
                        </button>
                    </div>
                </div>

                {/* Right Side (Profile Picture) */}
                <div className="w-full md:w-[320px] lg:w-[350px] bg-[#F9F9F9] rounded-[20px] p-[40px_30px] flex flex-col items-center shrink-0">
                    <h3 className="text-[#222] font-[Bold] text-[20px] mb-[50px] w-full text-center">Your profile photo</h3>

                    <div className="w-[210px] h-[210px] rounded-full border-2 border-white bg-[rgba(34,34,34,0.10)] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)] mb-[50px] flex items-center justify-center overflow-hidden shrink-0">
                        {selectedImage ? (
                            <img src={selectedImage} alt="Profile preview" className="w-full h-full object-cover" />
                        ) : (
                            <div className="mt-[30px]">
                                <EmptyNoUserIcon width={150} height={180} />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-[10px] w-full justify-center">
                        <button
                            type="button"
                            disabled={isUploadingPicture}
                            className="bg-[#0832AE] text-white font-[SemiBold] text-[12px] px-[20px] h-[34px] rounded-[10px] transition "
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploadingPicture ? "Uploading..." : "Add photo"}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageChange}
                        />
                        <button
                            className="bg-white cursor-pointer opacity-50 text-[#222] font-[SemiBold] text-[12px] px-[20px] h-[34px] rounded-[10px] transition"
                            onClick={handleDeletePhoto}
                        >
                            Delete photo
                        </button>
                    </div>
                </div>

            </div>

            {/* Footer */}
            <p className="mt-[30px] text-[#222] text-[14px] font-[Regular]">Copyright © 2025 estatehub.ae. All rights reserved.</p>
        </div>
    );
};

export default AgentProfile;