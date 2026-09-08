import React, { useRef, useState, useEffect } from "react";
import logoimg from "../../assets/img/logo.png";
import {
    EyeIcon,
    DownArrowIcon,
    SearchIcon,
    UploadIcon,
    ProfileBuildingIcon,
    VerifiedIcon,
} from "../../components/CustomFile/icons";
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

type DeveloperProfileMasterResponse = {
    countries?: MasterCountry[];
};

type CountryOption = Country & { masterId?: string };

type UploadProfilePictureResponse = {
    uploads?: { images?: Array<{ path?: string; filename?: string; url?: string }> };
    path?: string;
    filename?: string;
    url?: string;
};

type UploadDocItem = { path?: string; filename?: string; url?: string };
type UploadRegistrationDocumentsResponse = {
    uploads?: { documents?: UploadDocItem[] };
};

const PASSWORD_CLIENT_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const buildFullPhoneForOtp = (dialCode: string, localDigits: string) => {
    const dial = dialCode.trim();
    const digits = localDigits.replace(/\D/g, "");
    const withPlus = dial.startsWith("+") ? dial : `+${dial.replace(/^\+/, "")}`;
    return `${withPlus}${digits}`;
};

const DeveloperProfile = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const invitationToken = (searchParams.get("token") || "").trim();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploadedProfilePicture, setUploadedProfilePicture] = useState("");

    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [countryOptions, setCountryOptions] = useState<CountryOption[]>(
        countries.map((c) => ({ ...c, masterId: undefined })),
    );
    const [selectedCountry, setSelectedCountry] = useState<CountryOption>(
        { ...(countries.find((c) => c.code === "AE") || countries[0]), masterId: undefined },
    );
    const [isMasterLoading, setIsMasterLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [isNationalityDropdownOpen, setIsNationalityDropdownOpen] = useState(false);
    const [nationalitySearchQuery, setNationalitySearchQuery] = useState("");
    const [selectedNationality, setSelectedNationality] = useState<CountryOption | null>(null);
    const nationalityDropdownRef = useRef<HTMLDivElement>(null);

    const [developerName, setDeveloperName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [phoneOtp, setPhoneOtp] = useState("");
    const [email, setEmail] = useState("");
    const [emailOtp, setEmailOtp] = useState("");
    const [address, setAddress] = useState("");
    const [foundedYear, setFoundedYear] = useState("");
    const [shortDescription, setShortDescription] = useState("");
    const [longDescription, setLongDescription] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
    const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
    const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
    const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);

    const [uploadedRegistrationFilenames, setUploadedRegistrationFilenames] = useState<string[]>([]);
    const [isUploadingDocs, setIsUploadingDocs] = useState(false);
    const [isUploadingPicture, setIsUploadingPicture] = useState(false);
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

    const filteredCountries = countryOptions.filter(
        (country) =>
            country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            country.dialCode.includes(searchQuery),
    );
    const filteredNationalities = countryOptions.filter((country) =>
        country.name.toLowerCase().includes(nationalitySearchQuery.toLowerCase()),
    );

    const isBlockingOverlay =
        isMasterLoading || isUploadingPicture || isUploadingDocs || isSubmittingProfile;

    useEffect(() => {
        let mounted = true;

        const loadMasterData = async () => {
            try {
                setIsMasterLoading(true);
                const res = await apiClient.get<DeveloperProfileMasterResponse>(
                    "/master-data?types=countries",
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
                    const defaultCountry = apiCountries.find((c) => c.code === "AE") || apiCountries[0];
                    setSelectedCountry(defaultCountry);
                }
            } catch (error: unknown) {
                if (!mounted) return;
                toast.error("Load failed", getApiErrorMessage(error, "Could not load countries."));
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
            if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
                setIsNationalityDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const imageUrl = URL.createObjectURL(file);
        setSelectedImage(imageUrl);
        if (!invitationToken) {
            toast.error("Invalid invitation", "Invitation token is missing.");
            return;
        }
        setIsUploadingPicture(true);
        const form = new FormData();
        form.append("invitationToken", invitationToken);
        form.append("profilePicture", file);
        apiClient
            .post<UploadProfilePictureResponse>("/auth/developers/upload-profile-picture", form, { auth: false })
            .then((res) => {
                const img = res?.uploads?.images?.[0];
                const uploadedPath = String(img?.path || img?.filename || res?.path || res?.filename || res?.url || "").trim();
                if (uploadedPath) setUploadedProfilePicture(uploadedPath);
            })
            .catch((error: unknown) => {
                toast.error("Upload failed", getApiErrorMessage(error, "Could not upload profile picture."));
            })
            .finally(() => setIsUploadingPicture(false));
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
            await apiClient.post("/auth/developers/send-email-otp", { email: email.trim().toLowerCase() }, { auth: false });
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
                "/auth/developers/verify-email-otp",
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
        const normalizedEmail = email.trim().toLowerCase();
        const localDigits = phoneNumber.replace(/\D/g, "");
        if (!normalizedEmail || !localDigits) {
            toast.error("Missing values", "Enter email and phone number.");
            return;
        }
        const fullPhone = buildFullPhoneForOtp(selectedCountry.dialCode, localDigits);
        setIsSendingPhoneOtp(true);
        try {
            const response = await apiClient.post<{ otp?: string }>(
                "/auth/developers/send-phone-otp",
                { email: normalizedEmail, phoneNumber: fullPhone },
                { auth: false },
            );
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
        const normalizedEmail = email.trim().toLowerCase();
        const localDigits = phoneNumber.replace(/\D/g, "");
        if (!normalizedEmail || !localDigits || !phoneOtp.trim()) {
            toast.error("Missing values", "Enter email, phone number and OTP.");
            return;
        }
        const fullPhone = buildFullPhoneForOtp(selectedCountry.dialCode, localDigits);
        setIsVerifyingPhoneOtp(true);
        try {
            await apiClient.post(
                "/auth/developers/verify-phone-otp",
                { email: normalizedEmail, phoneNumber: fullPhone, otp: phoneOtp.trim() },
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

    const handleDocChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        const allowed = files.filter((f) => /\.(pdf|doc|docx|jpe?g|png|webp)$/i.test(f.name));
        if (allowed.length !== files.length) {
            toast.error("Invalid file", "Only PDF, DOC, DOCX, JPG, PNG, or WEBP files are allowed.");
        }
        const remainingSlots = 5 - uploadedRegistrationFilenames.length;
        if (remainingSlots <= 0) {
            toast.error("Limit reached", "You can upload up to 5 registration documents.");
            e.target.value = "";
            return;
        }
        const batch = allowed.slice(0, remainingSlots);
        if (!batch.length) {
            e.target.value = "";
            return;
        }

        setIsUploadingDocs(true);
        try {
            const form = new FormData();
            batch.forEach((f) => form.append("documents", f));
            const res = await apiClient.post<UploadRegistrationDocumentsResponse>(
                "/auth/developers/upload-registration-documents",
                form,
                { auth: false },
            );
            const docs = res?.uploads?.documents ?? [];
            const names = docs
                .map((d) => String(d.filename || d.path || "").trim())
                .filter((n) => /\.(pdf|doc|docx|jpe?g|png|webp)$/i.test(n));
            if (names.length) {
                setUploadedRegistrationFilenames((prev) => [...prev, ...names].slice(0, 5));
                toast.success("Uploaded", `${names.length} file(s) uploaded.`);
            } else {
                toast.error("Upload response", "Could not read uploaded file names from the server.");
            }
        } catch (error: unknown) {
            toast.error("Upload failed", getApiErrorMessage(error, "Could not upload documents."));
        } finally {
            setIsUploadingDocs(false);
            e.target.value = "";
        }
    };

    const handleCreateProfile = async () => {
        if (!invitationToken) {
            toast.error("Invalid invitation", "Invitation token is missing.");
            return;
        }
        if (!developerName.trim()) {
            toast.error("Missing name", "Developer name is required.");
            return;
        }
        const localDigits = phoneNumber.replace(/\D/g, "");
        if (!localDigits) {
            toast.error("Missing phone", "Enter your phone number.");
            return;
        }
        if (!email.trim()) {
            toast.error("Missing email", "Enter your email.");
            return;
        }
        if (!address.trim()) {
            toast.error("Missing address", "Address is required.");
            return;
        }
        if (!selectedNationality?.masterId) {
            toast.error("Missing nationality", "Select your nationality.");
            return;
        }
        const yearNum = Number.parseInt(String(foundedYear).trim(), 10);
        const currentYear = new Date().getFullYear();
        if (!Number.isFinite(yearNum) || yearNum < 1800 || yearNum > currentYear + 1) {
            toast.error("Invalid year", "Enter a valid founded year.");
            return;
        }
        if (!shortDescription.trim()) {
            toast.error("Missing description", "Short description is required.");
            return;
        }
        if (!longDescription.trim()) {
            toast.error("Missing description", "Long description is required.");
            return;
        }
        if (uploadedRegistrationFilenames.length === 0) {
            toast.error("Missing documents", "Upload at least one registration document.");
            return;
        }
        if (!PASSWORD_CLIENT_REGEX.test(password)) {
            toast.error(
                "Weak password",
                "Use at least 8 characters with uppercase, lowercase, and a number.",
            );
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match", "Enter the same password in both fields.");
            return;
        }
        if (!isEmailVerified || !isPhoneVerified) {
            toast.error("Verification required", "Verify your email and phone before submitting.");
            return;
        }

        setIsSubmittingProfile(true);
        try {
            await apiClient.post(
                `/auth/developers/accept-invitation?token=${encodeURIComponent(invitationToken)}`,
                {
                    name: developerName.trim(),
                    phoneNumber: localDigits,
                    countryCode: selectedCountry.dialCode.trim(),
                    address: { fullAddress: address.trim() },
                    nationality: selectedNationality.masterId,
                    foundedYear: yearNum,
                    shortDescription: shortDescription.trim(),
                    longDescription: longDescription.trim(),
                    registrationDocuments: uploadedRegistrationFilenames,
                    password,
                    confirmPassword,
                    profilePicture: uploadedProfilePicture || undefined,
                },
                { auth: false },
            );
            toast.success("Profile created", "Submitted successfully. Please wait for admin verification.");
            navigate("/", { replace: true });
        } catch (error: unknown) {
            toast.error("Submit failed", getApiErrorMessage(error, "Could not create developer profile."));
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center pt-[40px] pb-[30px] px-[20px] font-['Outfit',sans-serif]">
            <div className="mb-[40px]">
                <img src={logoimg} alt="Propertio Providers" className="h-[40px]" />
            </div>

            <div className="relative w-full max-w-[1200px] bg-white rounded-[15px] p-[4px] flex flex-col md:flex-row">
                {isBlockingOverlay && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 rounded-[15px]">
                        <Loader size={72} margin={0} />
                    </div>
                )}

                <div className="flex-1 flex flex-col relative w-full md:p-[24px] p-[16px]">
                    <div className="bg-[#E6F7F0] rounded-[15px] p-[20px] flex items-center gap-[10px] mb-[24px]">
                        <div className="w-[24px] h-[24px] rounded-full border border-[#00A663] flex items-center justify-center text-[#00A663] font-[Regular] text-[12px] shrink-0">i</div>
                        <p className="text-[#222] text-[14px] font-[Regular]">
                            <span className="font-[SemiBold] ">Note :</span> only after completing your profile you can access everything. so please complete your profile
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-[30px] gap-y-[24px]">
                        <div className="flex flex-col gap-[20px]">
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Developer name <span className="text-[#EA3934]">*</span>
                                </label>
                                <input
                                    value={developerName}
                                    onChange={(e) => setDeveloperName(e.target.value)}
                                    type="text"
                                    placeholder="Enter Name"
                                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                />
                            </div>
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Email Id <span className="text-[#EA3934]">*</span>
                                </label>
                                <div className="relative mb-[5px] w-full">
                                    <input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        type="email"
                                        placeholder="Enter Email address"
                                        className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    {isEmailVerified ? (
                                        <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[12px] font-[Bold]">
                                            <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                                        </div>
                                    ) : null}
                                </div>
                                <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] h-[44px] pl-[16px] pr-[4px]">
                                    <input
                                        value={emailOtp}
                                        onChange={(e) => setEmailOtp(e.target.value)}
                                        type="text"
                                        placeholder="Enter otp"
                                        className="w-full rounded-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <button
                                        type="button"
                                        onClick={isEmailVerified ? undefined : emailOtp.trim() ? handleVerifyEmailOtp : handleSendEmailOtp}
                                        disabled={isSendingEmailOtp || isVerifyingEmailOtp}
                                        className="bg-[rgba(34,34,34,0.10)] text-[#222] font-[SemiBold] text-[12px] h-[32px] px-[16px] rounded-[10px] shrink-0 hover:bg-[#EAEAEA] transition-colors disabled:opacity-60"
                                    >
                                        {isEmailVerified
                                            ? "Verified"
                                            : emailOtp.trim()
                                              ? isVerifyingEmailOtp
                                                  ? "Verifying..."
                                                  : "Verify"
                                              : isSendingEmailOtp
                                                ? "Sending..."
                                                : "Send OTP"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Phone number <span className="text-[#EA3934]">*</span>
                                </label>
                                <div className="flex gap-[10px] bg-white rounded-[10px] h-[44px] items-center mb-[10px]">
                                    <div className="relative h-full" ref={dropdownRef}>
                                        <div
                                            className="flex items-center gap-[6px] p-[0px_30px_0px_10px] cursor-pointer h-full border border-[#EAEAEA] rounded-[10px]"
                                            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                        >
                                            <img src={selectedCountry.flag} alt={selectedCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                            <DownArrowIcon
                                                className={`flex-shrink-0 mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
                                                width={14}
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
                                                                key={country.id}
                                                                className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedCountry.id === country.id ? "bg-[#F5F5F5]" : ""}`}
                                                                onClick={(ev) => {
                                                                    ev.preventDefault();
                                                                    ev.stopPropagation();
                                                                    setSelectedCountry(country);
                                                                    setIsCountryDropdownOpen(false);
                                                                    setSearchQuery("");
                                                                }}
                                                            >
                                                                <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                                                <span className="text-[13px] font-[Regular] text-[#222]">{country.name}</span>
                                                                <span className="text-[13px] font-[Medium] text-[#707070] ml-auto">{country.dialCode}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="px-[14px] py-[12px] text-center text-[13px] text-[#707070]">No countries found</div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative w-full">
                                        <input
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            type="text"
                                            inputMode="tel"
                                            placeholder="Enter phone number"
                                            className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                        />
                                        {isPhoneVerified ? (
                                            <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[12px] font-[Bold]">
                                                <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] h-[44px] pl-[16px] pr-[4px]">
                                    <input
                                        value={phoneOtp}
                                        onChange={(e) => setPhoneOtp(e.target.value)}
                                        type="text"
                                        placeholder="Enter otp"
                                        className="w-full rounded-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <button
                                        type="button"
                                        onClick={isPhoneVerified ? undefined : phoneOtp.trim() ? handleVerifyPhoneOtp : handleSendPhoneOtp}
                                        disabled={isSendingPhoneOtp || isVerifyingPhoneOtp}
                                        className="bg-[rgba(34,34,34,0.10)] text-[#222] font-[SemiBold] text-[12px] h-[32px] px-[16px] rounded-[10px] shrink-0 hover:bg-[#EAEAEA] transition-colors disabled:opacity-60"
                                    >
                                        {isPhoneVerified
                                            ? "Verified"
                                            : phoneOtp.trim()
                                              ? isVerifyingPhoneOtp
                                                  ? "Verifying..."
                                                  : "Verify"
                                              : isSendingPhoneOtp
                                                ? "Sending..."
                                                : "Send OTP"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Address <span className="text-[#EA3934]">*</span>
                                </label>
                                <input
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    type="text"
                                    placeholder="Enter Address"
                                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                />
                            </div>

                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Nationality <span className="text-[#EA3934]">*</span>
                                </label>
                                <div className="relative" ref={nationalityDropdownRef}>
                                    <div
                                        className="w-full h-[44px] rounded-[10px] border border-[#EAEAEA] px-[16px] flex items-center justify-between cursor-pointer"
                                        onClick={() => setIsNationalityDropdownOpen(!isNationalityDropdownOpen)}
                                    >
                                        {selectedNationality ? (
                                            <div className="flex items-center gap-[10px] min-w-0">
                                                <img src={selectedNationality.flag} alt={selectedNationality.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                                                <span className="text-[14px] font-[Regular] text-[#222] truncate">{selectedNationality.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[14px] font-[Regular] text-[#AAAAAA]">Select nationality</span>
                                        )}
                                        <DownArrowIcon
                                            className={`transition-transform shrink-0 ${isNationalityDropdownOpen ? "rotate-180" : ""}`}
                                            width={12}
                                            height={12}
                                            fill="#707070"
                                        />
                                    </div>

                                    {isNationalityDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
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
                                                {filteredNationalities.length > 0 ? (
                                                    filteredNationalities.map((country) => (
                                                        <div
                                                            key={country.id}
                                                            className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedNationality?.id === country.id ? "bg-[#F5F5F5]" : ""}`}
                                                            onClick={(ev) => {
                                                                ev.preventDefault();
                                                                ev.stopPropagation();
                                                                setSelectedNationality(country);
                                                                setIsNationalityDropdownOpen(false);
                                                                setNationalitySearchQuery("");
                                                            }}
                                                        >
                                                            <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                                            <span className="text-[13px] font-[Regular] text-[#222]">{country.name}</span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-[14px] py-[12px] text-center text-[13px] text-[#707070]">No nationalities found</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Upload office related documents <span className="text-[#EA3934]">*</span>
                                </label>
                                <div
                                    className="border border-dashed border-[#D1D1D1] rounded-[14px] lg:p-[56px] md:p-[40px] p-[24px] flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-[#FAFAFA]"
                                    onClick={() => docInputRef.current?.click()}
                                >
                                    <div className="flex items-center justify-center mb-[24px]">
                                        <UploadIcon width={48} height={48} />
                                    </div>
                                    <p className="text-[#222] text-[13px] font-[Medium]">Select a file or drag and drop here</p>
                                    <p className="text-[#707070] text-[12px] font-[Regular] mt-[8px] mb-[24px]">
                                        PDF, DOC, DOCX, JPG, PNG, or WEBP — up to 5 files
                                    </p>
                                    <button
                                        type="button"
                                        className="bg-[#0832AE] text-white text-[12px] font-[SemiBold] px-[20px] rounded-[10px] h-[34px] pointer-events-none"
                                    >
                                        Select File
                                    </button>
                                    <input
                                        type="file"
                                        ref={docInputRef}
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
                                        multiple
                                        onChange={handleDocChange}
                                    />
                                </div>
                                {uploadedRegistrationFilenames.length > 0 ? (
                                    <ul className="mt-[10px] text-[12px] text-[#222] font-[Regular] list-disc pl-[18px] space-y-[4px]">
                                        {uploadedRegistrationFilenames.map((name) => (
                                            <li key={name} className="truncate">
                                                {name}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex flex-col gap-[20px]">
                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Founded year <span className="text-[#EA3934]">*</span>
                                </label>
                                <input
                                    value={foundedYear}
                                    onChange={(e) => setFoundedYear(e.target.value)}
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Enter founded year"
                                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                />
                            </div>

                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Short description <span className="text-[#EA3934]">*</span>
                                </label>
                                <input
                                    value={shortDescription}
                                    onChange={(e) => setShortDescription(e.target.value)}
                                    type="text"
                                    placeholder="Enter short description"
                                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                />
                            </div>

                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Long description <span className="text-[#EA3934]">*</span>
                                </label>
                                <textarea
                                    value={longDescription}
                                    onChange={(e) => setLongDescription(e.target.value)}
                                    placeholder="Enter long description"
                                    rows={10}
                                    className="w-full min-h-[200px] pt-[14px] border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[14px] pb-[14px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] resize-y"
                                />
                            </div>

                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Password <span className="text-[#EA3934]">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[40px] h-[44px] text-[13px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[#707070] focus:outline-none"
                                    >
                                        <EyeIcon width={16} height={16} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[#222] text-[14px] font-[SemiBold] mb-[8px]">
                                    Confirm password <span className="text-[#EA3934]">*</span>
                                </label>
                                <div
                                    className={`relative rounded-[10px] border ${
                                        passwordMismatch ? "border-[#EA3934]" : "border-[rgba(34,34,34,0.10)]"
                                    }`}
                                >
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Re enter your password"
                                        aria-invalid={passwordMismatch}
                                        className="w-full rounded-[10px] pl-[14px] pr-[40px] h-[44px] text-[13px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[#707070] focus:outline-none"
                                    >
                                        <EyeIcon width={16} height={16} />
                                    </button>
                                </div>
                                {passwordMismatch ? (
                                    <p className="text-[12px] font-[Medium] text-[#EA3934] mt-[6px]">Passwords do not match.</p>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between lg:col-span-2 pt-[20px] mt-auto">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="border border-[#222] text-[#222] text-[14px] font-[Bold] rounded-[10px] px-[20px] h-[44px] transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateProfile}
                            disabled={isSubmittingProfile}
                            className="bg-[#EA3934] text-white text-[14px] font-[Bold] rounded-[10px] px-[20px] h-[44px] transition disabled:opacity-60"
                        >
                            {isSubmittingProfile ? "Creating..." : "Create profile"}
                        </button>
                    </div>
                </div>

                <div className="w-full md:w-[320px] lg:w-[350px] bg-[#F9F9F9] rounded-[20px] p-[40px_30px] flex flex-col items-center shrink-0">
                    <h3 className="text-[#222] font-[Bold] text-[20px] mb-[50px] w-full text-center">Developer profile picture</h3>

                    <div className="w-[218px] h-[219px] rounded-[15px] border-2 border-white bg-[rgba(34,34,34,0.10)] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)] mb-[50px] flex items-center justify-center overflow-hidden shrink-0">
                        {selectedImage ? (
                            <img src={selectedImage} alt="Profile preview" className="w-full h-full object-cover" />
                        ) : (
                            <ProfileBuildingIcon />
                        )}
                    </div>

                    <div className="flex items-center gap-[10px] w-full justify-center flex-wrap">
                        <button
                            type="button"
                            className="cursor-pointer bg-[#0832AE] text-white font-[SemiBold] text-[12px] px-[20px] h-[34px] rounded-[8px] transition"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploadingPicture ? "Uploading..." : "Add photo"}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={handleImageChange}
                        />
                        <button
                            type="button"
                            className="cursor-pointer bg-white text-[#707070] font-[SemiBold] text-[12px] px-[20px] h-[34px] rounded-[10px] border border-[rgba(34,34,34,0.10)] transition hover:bg-[#F5F5F5]"
                            onClick={handleDeletePhoto}
                        >
                            Delete photo
                        </button>
                    </div>
                </div>
            </div>

            <p className="mt-[30px] text-[#222] text-[14px] font-[Regular]">Copyright © 2026 propertio.ae. All rights reserved.</p>
        </div>
    );
};

export default DeveloperProfile;
