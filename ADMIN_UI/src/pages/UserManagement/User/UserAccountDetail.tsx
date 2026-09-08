import profileimg from "../../../assets/img/user.png";
import userEmptyImg from "../../../assets/img/profileless.png";
import type { Country } from "../../../data/countries";
import { countries } from "../../../data/countries";
import React, { useRef, useState, useEffect } from "react";
import { DownArrowIcon, SearchIcon, VerifiedIcon, } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../../../services/apiClient";
import { usersService } from "../../../services/usersService";
import type { AdminUserDetail } from "../../../types/api";
import { useToast } from "../../../context/ToastContext";

type SelectCountry = Country & { _id?: string };

function UserAccountDetail() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [searchParams] = useSearchParams();
    const userId = searchParams.get("id")?.trim() || "";
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumberWithoutCode, setPhoneNumberWithoutCode] = useState("");
    const [authProvider, setAuthProvider] = useState("");
    const [banReason, setBanReason] = useState("");
    const [lastLogin, setLastLogin] = useState("—");
    const [lastActiveAt, setLastActiveAt] = useState("—");
    const [createdAt, setCreatedAt] = useState("—");
    const [loginAttempts, setLoginAttempts] = useState("—");
    const [displayName, setDisplayName] = useState("User Name");
    const [loadingUser, setLoadingUser] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [userDetails, setUserDetails] = useState<AdminUserDetail | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isUserActive, setIsUserActive] = useState(true);
    const [isBanActive, setIsBanActive] = useState(false);
    const [isEmailNotificationActive, setIsEmailNotificationActive] = useState(true);
    const [isPushNotificationActive, setIsPushNotificationActive] = useState(true);
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [userImgBaseUrl, setUserImgBaseUrl] = useState("");
    // Phone dropdown state
    const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);

    // Country dropdown state
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

    // Search states
    const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
    const [countrySearchQuery, setCountrySearchQuery] = useState("");

    // Country options from master-data
    const [countryOptions, setCountryOptions] = useState<SelectCountry[]>(countries);

    // Selected country
    const [selectedPhoneCountry, setSelectedPhoneCountry] =
        useState<SelectCountry>(
            countries.find((c) => c.code === "AE") || countries[0]
        );

    const [selectedCountry, setSelectedCountry] = useState<SelectCountry>(
        countries.find((c) => c.code === "AE") || countries[0]
    );

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

    const splitPhoneNumber = (value?: string | null, code?: string | null) => {
        const phone = (value || "").trim();
        const phoneCode = (code || "").trim();
        if (!phone) return "";
        const digitsOnly = phone.replace(/\D/g, "");
        const codeDigits = phoneCode.replace(/\D/g, "");
        if (digitsOnly && codeDigits && digitsOnly.startsWith(codeDigits)) {
            return digitsOnly.slice(codeDigits.length);
        }
        return digitsOnly;
    };

    const isPlaceholderProfilePicture = (filename?: string | null): boolean => {
        if (!filename || !String(filename).trim()) return true;
        const lower = String(filename).trim().toLowerCase();
        if (lower.includes("profileless.png") || lower.includes("profiless.png")) {
            return true;
        }
        const base = lower.split(/[/\\?#]/).pop() ?? "";
        return base === "profileless.png" || base === "profiless.png";
    };

    const resolveUserAvatarSrc = (raw?: string | null, explicitUrl?: string | null): string => {
        const value = (raw || "").trim();
        // Prefer original profilePicture first for social URLs (Google, Apple, etc.)
        if (value && /^https?:\/\//i.test(value)) return value;

        const direct = (explicitUrl || "").trim();
        if (direct && /^https?:\/\//i.test(direct)) return direct;

        if (!value || isPlaceholderProfilePicture(value)) return userEmptyImg;
        if (value.startsWith("/")) return value;
        const base = (userImgBaseUrl || "").trim().replace(/\/+$/, "");
        if (!base) return userEmptyImg;
        return `${base}/${encodeURIComponent(value)}`;
    };

    // Refs
    const phoneDropdownRef = useRef<HTMLDivElement>(null);
    const countryDropdownRef = useRef<HTMLDivElement>(null);

    // Filtered phone countries
    const filteredPhoneCountries = countryOptions.filter(
        (country) =>
            country.name
                .toLowerCase()
                .includes(phoneSearchQuery.toLowerCase()) ||
            country.dialCode.includes(phoneSearchQuery)
    );

    // Filtered countries
    const filteredCountries = countryOptions.filter((country) =>
        country.name
            .toLowerCase()
            .includes(countrySearchQuery.toLowerCase())
    );

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        const loadCountries = async () => {
            try {
                const fetchedCountries = await usersService.listMasterCountries(controller.signal);
                if (!mounted) return;
                const nextCountries = fetchedCountries.length > 0 ? fetchedCountries : countries;
                setCountryOptions(nextCountries);
                setSelectedCountry((prev) =>
                    nextCountries.find((country) => country.code === prev.code) ||
                    nextCountries.find((country) => country.code === "AE") ||
                    nextCountries[0]
                );
                setSelectedPhoneCountry((prev) =>
                    nextCountries.find((country) => country.code === prev.code) ||
                    nextCountries.find((country) => country.code === "AE") ||
                    nextCountries[0]
                );
            } catch {
                if (!mounted) return;
                setCountryOptions(countries);
            }
        };

        void loadCountries();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        const loadSupportedUrls = async () => {
            try {
                const data = await usersService.getSupportedUrls(controller.signal);
                if (!mounted) return;
                setUserImgBaseUrl((data.supportedUrls?.userUrl?.img || "").trim());
            } catch {
                if (!mounted) return;
                setUserImgBaseUrl("");
            }
        };

        void loadSupportedUrls();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        const hydrateUser = async () => {
            if (!userId) {
                setLoadError("Missing user id in URL.");
                setLoadingUser(false);
                return;
            }
            setLoadingUser(true);
            setLoadError(null);
            try {
                const data = await usersService.getUserById(userId, controller.signal);
                if (!mounted) return;
                const user = data.user;
                setUserDetails(user);
                setFirstName(user.firstName || "");
                setLastName(user.lastName || "");
                setEmail(user.email || "");
                const resolvedPhoneCode = String(
                    user.phoneCode || user.country?.phoneCode || ""
                ).trim();
                const phoneCountryFromCode =
                    resolvedPhoneCode &&
                    countryOptions.find(
                        (country) =>
                            String(country.dialCode || "").replace(/\D/g, "") ===
                            resolvedPhoneCode.replace(/\D/g, "")
                    );
                if (phoneCountryFromCode) {
                    setSelectedPhoneCountry(phoneCountryFromCode);
                }
                setPhoneNumberWithoutCode(
                    splitPhoneNumber(
                        user.phoneNumberWithoutCode || user.phoneNumber,
                        resolvedPhoneCode
                    )
                );
                setAuthProvider(user.authProvider || "");
                setBanReason(user.bannedReason || "");
                setIsUserActive(Boolean(user.isActive));
                setIsBanActive(Boolean(user.isBanned));
                setIsEmailNotificationActive(
                    user.preferences?.notificationSettings?.email ?? true
                );
                setIsPushNotificationActive(
                    user.preferences?.notificationSettings?.push ?? true
                );
                setIsEmailVerified(Boolean(user.isEmailVerified));
                setIsPhoneVerified(
                    Boolean(
                        user.isPhoneNumberVerified ??
                        user.isPhoneVerified
                    )
                );
                setLastLogin(formatDateTime(user.lastLogin));
                setLastActiveAt(formatDateTime(data.activity?.lastActivityDate || user.lastActiveAt));
                setCreatedAt(formatDateTime(user.createdAt));
                setLoginAttempts(String(user.loginAttempts ?? 0));
                setDisplayName(
                    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
                    user.email ||
                    "User Name"
                );
                setSelectedImage(resolveUserAvatarSrc(user.profilePicture, user.profilePictureUrl));
            } catch (error) {
                if (!mounted) return;
                setLoadError(getApiErrorMessage(error, "Failed to load user details"));
            } finally {
                if (mounted) {
                    setLoadingUser(false);
                }
            }
        };

        void hydrateUser();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, [userId]);

    useEffect(() => {
        if (!userDetails || countryOptions.length === 0) return;
        const country = userDetails.country;
        if (country?.code) {
            const next =
                countryOptions.find((item) => item.code === country.code) ||
                (country.name && country.phoneCode
                    ? {
                        id: countryOptions.length + 1,
                        name: country.name,
                        code: country.code,
                        dialCode: country.phoneCode,
                        flag: country.flag || "",
                    }
                    : null);
            if (next) {
                setSelectedCountry(next);
            }
        }
        const resolvedPhoneCode = String(
            userDetails.phoneCode || userDetails.country?.phoneCode || ""
        ).replace(/\D/g, "");
        if (resolvedPhoneCode) {
            const phoneCountry = countryOptions.find(
                (item) => String(item.dialCode || "").replace(/\D/g, "") === resolvedPhoneCode
            );
            if (phoneCountry) {
                setSelectedPhoneCountry(phoneCountry);
            }
        }
    }, [countryOptions, userDetails]);

    // Outside click close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                phoneDropdownRef.current &&
                !phoneDropdownRef.current.contains(event.target as Node)
            ) {
                setIsPhoneDropdownOpen(false);
            }

            if (
                countryDropdownRef.current &&
                !countryDropdownRef.current.contains(event.target as Node)
            ) {
                setIsCountryDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);
    const handleImageUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!userId) {
            push({
                type: "error",
                title: "Upload failed",
                description: "Missing user id in URL.",
            });
            return;
        }

        if (!file.type.startsWith("image/")) {
            push({
                type: "error",
                title: "Upload failed",
                description: "Only image files are allowed.",
            });
            return;
        }

        const previousImage = selectedImage;
        const previewUrl = URL.createObjectURL(file);
        setSelectedImage(previewUrl);
        setIsUploadingPhoto(true);

        try {
            const data = await usersService.updateUserProfilePicture(userId, file);
            const updatedUser = data.user;
            if (updatedUser) {
                setUserDetails(updatedUser);
                setSelectedImage(
                    resolveUserAvatarSrc(updatedUser.profilePicture, updatedUser.profilePictureUrl)
                );
            }
            push({
                type: "success",
                title: "Photo updated",
                description: "User profile picture updated successfully.",
            });
        } catch (error) {
            setSelectedImage(previousImage);
            push({
                type: "error",
                title: "Upload failed",
                description: getApiErrorMessage(error, "Failed to update profile picture"),
            });
        } finally {
            URL.revokeObjectURL(previewUrl);
            setIsUploadingPhoto(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleDeleteImage = async () => {
        if (!userId) {
            push({
                type: "error",
                title: "Delete failed",
                description: "Missing user id in URL.",
            });
            return;
        }

        setIsUploadingPhoto(true);
        try {
            const data = await usersService.removeUserProfilePicture(userId);
            const updatedUser = data.user;
            if (updatedUser) {
                setUserDetails(updatedUser);
                setSelectedImage(
                    resolveUserAvatarSrc(updatedUser.profilePicture, updatedUser.profilePictureUrl)
                );
            } else {
                setSelectedImage(null);
            }
            push({
                type: "success",
                title: "Photo removed",
                description: "User profile picture removed successfully.",
            });
        } catch (error) {
            push({
                type: "error",
                title: "Delete failed",
                description: getApiErrorMessage(error, "Failed to remove profile picture"),
            });
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }

    };

    const handleSave = async () => {
        if (!userId) {
            const message = "Missing user id in URL.";
            setLoadError(message);
            push({ type: "error", title: "Save failed", description: message });
            return;
        }

        const trimmedFirstName = firstName.trim();
        const trimmedLastName = lastName.trim();
        const trimmedEmail = email.trim();
        const trimmedPhone = phoneNumberWithoutCode.trim();
        const trimmedBanReason = banReason.trim();

        if (!trimmedFirstName || !trimmedLastName || !trimmedEmail || !trimmedPhone) {
            push({
                type: "error",
                title: "Save failed",
                description: "First name, last name, email, and phone are required.",
            });
            return;
        }

        if (isBanActive && trimmedBanReason.length < 10) {
            push({
                type: "error",
                title: "Save failed",
                description: "Banned reason must be at least 10 characters.",
            });
            return;
        }

        const countryId = selectedCountry._id || userDetails?.country?._id;
        if (!countryId) {
            push({
                type: "error",
                title: "Save failed",
                description: "Country is required before updating this user.",
            });
            return;
        }

        setIsSaving(true);
        try {
            const data = await usersService.updateUserById(userId, {
                firstName: trimmedFirstName,
                lastName: trimmedLastName,
                email: trimmedEmail,
                phoneNumber: trimmedPhone,
                phoneCode: selectedPhoneCountry.dialCode,
                countryId,
                isActive: isUserActive,
                isBanned: isBanActive,
                bannedReason: isBanActive ? trimmedBanReason : "",
                preferences: {
                    notificationSettings: {
                        email: isEmailNotificationActive,
                        push: isPushNotificationActive,
                    },
                },
            });

            const updatedUser = data.user;
            setUserDetails(updatedUser);
            setFirstName(updatedUser.firstName || "");
            setLastName(updatedUser.lastName || "");
            setEmail(updatedUser.email || "");
            setPhoneNumberWithoutCode(
                splitPhoneNumber(
                    updatedUser.phoneNumber,
                    updatedUser.country?.phoneCode || updatedUser.phoneCode
                )
            );
            setAuthProvider(updatedUser.authProvider || "");
            setBanReason(updatedUser.bannedReason || "");
            setIsUserActive(Boolean(updatedUser.isActive));
            setIsBanActive(Boolean(updatedUser.isBanned));
            setIsEmailNotificationActive(
                updatedUser.preferences?.notificationSettings?.email ?? true
            );
            setIsPushNotificationActive(
                updatedUser.preferences?.notificationSettings?.push ?? true
            );
            setIsEmailVerified(Boolean(updatedUser.isEmailVerified));
            setIsPhoneVerified(
                Boolean(
                    updatedUser.isPhoneNumberVerified ??
                    updatedUser.isPhoneVerified
                )
            );
            setLastLogin(formatDateTime(updatedUser.lastLogin));
            setLastActiveAt(
                formatDateTime(data.activity?.lastActivityDate || updatedUser.lastActiveAt)
            );
            setCreatedAt(formatDateTime(updatedUser.createdAt));
            setLoginAttempts(String(updatedUser.loginAttempts ?? 0));
            setDisplayName(
                [updatedUser.firstName, updatedUser.lastName].filter(Boolean).join(" ").trim() ||
                updatedUser.email ||
                "User Name"
            );
            const profileSrc = (updatedUser.profilePictureUrl || updatedUser.profilePicture || "").trim();
            setSelectedImage(profileSrc || null);

            push({
                type: "success",
                title: "User updated",
                description: "User details were saved successfully.",
            });
            navigate("/useraccount");
        } catch (error) {
            const message = getApiErrorMessage(error, "Failed to update user");
            push({ type: "error", title: "Save failed", description: message });
        } finally {
            setIsSaving(false);
        }
    };
    if (loadingUser) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <Header
                    title="UserAccount"
                    showBack={true}
                    onBackClick={() => navigate(-1)}
                />
                <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px] min-h-[65vh] flex items-center justify-center">
                    <Loader size={80} />
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            {/* Header */}
            <Header
                title="UserAccount"
                showBack={true}
                onBackClick={() => navigate(-1)}
            />

            {/* Content */}
            <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
                {loadError && (
                    <div className="mb-[20px] rounded-[10px] border border-[rgba(234,57,52,0.25)] bg-[#FFF5F5] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#EA3934]">
                        {loadError}
                    </div>
                )}
                {/* User Profile */}
                <div className="bg-[#fff] p-[20px] rounded-[12px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] mb-[20px]">
                    <div className="flex items-center justify-between flex-wrap gap-[20px]">

                        {/* Left */}
                        <div className="flex items-center gap-[16px]">

                            {/* Profile Image */}
                            <div className="relative w-[90px] h-[90px] flex justify-center items-center rounded-full overflow-hidden border border-[rgba(34,34,34,0.10)] shrink-0">
                                <img
                                    src={selectedImage || userEmptyImg}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                    onError={(event) => {
                                        event.currentTarget.src = userEmptyImg;
                                    }}
                                />
                                {isUploadingPhoto && (
                                    <div className="absolute inset-0 bg-white/65 flex items-center justify-center">
                                        <Loader size={42} />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div>
                                <h3 className="text-[18px] font-[Bold] text-[#222]">
                                    {displayName}
                                </h3>

                                <p className="text-[13px] font-[Regular] text-[#707070] mt-[4px]">
                                    Upload and manage profile photo
                                </p>
                            </div>
                        </div>

                        {/* Right */}
                        <div className="flex items-center gap-[12px] flex-wrap">

                            {/* Change Photo */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingPhoto}
                                className="h-[42px] px-[18px] rounded-[10px] bg-[#222] text-[#fff] text-[14px] font-[Medium] hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isUploadingPhoto ? "Uploading..." : "Change Photo"}
                            </button>

                            {/* Delete */}
                            <button
                                type="button"
                                onClick={handleDeleteImage}
                                disabled={isUploadingPhoto}
                                className="h-[42px] px-[18px] rounded-[10px] border border-[rgba(34,34,34,0.10)] text-[#EA3934] text-[14px] font-[Medium] hover:bg-[#FFF5F5] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Delete
                            </button>

                            {/* Hidden Input */}
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">

                    {/* First Name */}
                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            First Name{" "}
                            <span className="text-[#EA3934]">*</span>
                        </label>

                        <input
                            type="text"
                            value={firstName}
                            onChange={(event) => setFirstName(event.target.value)}
                            placeholder="Enter First Name"
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Last Name{" "}
                            <span className="text-[#EA3934]">*</span>
                        </label>

                        <input
                            type="text"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                            placeholder="Enter Last Name"
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Email Address{" "}
                            <span className="text-[#EA3934]">*</span>
                        </label>

                        <div className="relative flex-1">
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                placeholder="Enter Email"
                                className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
                            />

                            {isEmailVerified && (
                                <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                                    <VerifiedIcon className="w-[14px] h-[14px]" />
                                    Verified
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Phone number{" "}
                            <span className="text-[#EA3934]">*</span>
                        </label>

                        <div className="flex items-center gap-[10px] mb-[10px]">

                            {/* Phone Country Dropdown */}
                            <div className="relative" ref={phoneDropdownRef}>
                                <div className="flex items-center gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none"
                                    onClick={() => {
                                        setIsPhoneDropdownOpen(!isPhoneDropdownOpen);

                                        if (!isPhoneDropdownOpen) {
                                            setPhoneSearchQuery("");
                                        }
                                    }}
                                >
                                    <img
                                        src={selectedPhoneCountry.flag}
                                        alt={selectedPhoneCountry.code}
                                        className="w-[20px] h-[14px] rounded-[2px] object-cover"
                                    />

                                    <DownArrowIcon
                                        className={`mt-[2px] transition-transform ${isPhoneDropdownOpen ? "rotate-180" : ""}`}
                                        width={14}
                                        height={14}
                                    />
                                </div>

                                {isPhoneDropdownOpen && (
                                    <div className="absolute top-[50px] left-0 w-[260px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                                        {/* Search */}
                                        <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                                            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                                                <SearchIcon className="text-[#707070] shrink-0" />

                                                <input
                                                    type="text"
                                                    placeholder="Search country..."
                                                    className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                                    value={phoneSearchQuery}
                                                    onChange={(e) =>
                                                        setPhoneSearchQuery(
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>

                                        {/* List */}
                                        <div className="overflow-y-auto overflow-x-hidden flex-1 py-[8px]">
                                            {filteredPhoneCountries.length >
                                                0 ? (
                                                filteredPhoneCountries.map(
                                                    (country) => (
                                                        <div
                                                            key={country.id}
                                                            className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedPhoneCountry.id ===
                                                                country.id
                                                                ? "bg-[#F5F5F5]"
                                                                : ""
                                                                }`}
                                                            onClick={() => {
                                                                setSelectedPhoneCountry(country);
                                                                setIsPhoneDropdownOpen(false);
                                                                setPhoneSearchQuery("");
                                                            }}
                                                        >
                                                            <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                                                            <span className="text-[13px] font-[Medium] text-[#222] truncate">
                                                                {country.name} ({country.dialCode})
                                                            </span>
                                                        </div>
                                                    )
                                                )
                                            ) : (
                                                <div className="p-[14px] text-[13px] text-[#707070] text-center">
                                                    No countries found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Phone Input */}
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={phoneNumberWithoutCode}
                                    onChange={(event) =>
                                        setPhoneNumberWithoutCode(
                                            event.target.value.replace(/\D/g, "")
                                        )
                                    }
                                    placeholder="1234 5678 585"
                                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
                                />

                                {isPhoneVerified && (
                                    <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                                        <VerifiedIcon className="w-[14px] h-[14px]" />
                                        Verified
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Country Dropdown */}
                    <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Country{" "}
                            <span className="text-[#EA3934]">*</span>
                        </label>

                        <div
                            className="relative w-full"
                            ref={countryDropdownRef}
                        >
                            <div
                                className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none"
                                onClick={() => {
                                    setIsCountryDropdownOpen(
                                        !isCountryDropdownOpen
                                    );

                                    if (!isCountryDropdownOpen) {
                                        setCountrySearchQuery("");
                                    }
                                }}
                            >
                                <h4 className="text-[13px] font-[Medium] text-[#222] truncate">
                                    {selectedCountry.name}
                                </h4>

                                <DownArrowIcon
                                    className={`mt-[2px] transition-transform ${isCountryDropdownOpen
                                        ? "rotate-180"
                                        : ""
                                        }`}
                                    width={14}
                                    height={14}
                                />
                            </div>

                            {isCountryDropdownOpen && (
                                <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">

                                    {/* Search */}
                                    <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                                            <SearchIcon className="text-[#707070] shrink-0" />

                                            <input
                                                type="text"
                                                placeholder="Search country..."
                                                className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                                value={countrySearchQuery}
                                                onChange={(e) =>
                                                    setCountrySearchQuery(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="overflow-y-auto overflow-x-hidden flex-1 py-[8px]">
                                        {filteredCountries.length > 0 ? (
                                            filteredCountries.map(
                                                (country) => (
                                                    <div
                                                        key={country.id}
                                                        className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedCountry.id ===
                                                            country.id
                                                            ? "bg-[#F5F5F5]"
                                                            : ""
                                                            }`}
                                                        onClick={() => {
                                                            setSelectedCountry(
                                                                country
                                                            );

                                                            setIsCountryDropdownOpen(
                                                                false
                                                            );

                                                            setCountrySearchQuery(
                                                                ""
                                                            );
                                                        }}
                                                    >
                                                        <img
                                                            src={country.flag}
                                                            alt={country.code}
                                                            className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0"
                                                        />

                                                        <span className="text-[13px] font-[Medium] text-[#222] truncate">
                                                            {country.name}
                                                        </span>
                                                    </div>
                                                )
                                            )
                                        ) : (
                                            <div className="p-[14px] text-[13px] text-[#707070] text-center">
                                                No countries found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* User Active */}
                    <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            User Status
                        </label>

                        <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
                            <span className="text-[13px] font-[Medium] text-[#222]">
                                User Active
                            </span>

                            <button
                                type="button"
                                onClick={() => setIsUserActive(!isUserActive)}
                                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isUserActive ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"
                                    }`}
                            >
                                <span
                                    className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isUserActive ? "left-[22px]" : "left-[2px]"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/*Auth Provider*/}
                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Auth Provider{" "}
                            <span className="text-[#EA3934]">*</span>
                        </label>

                        <input
                            type="text"
                            value={authProvider || "—"}
                            disabled={true}
                            className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]"
                        />
                    </div>

                   
                    {/* Email Notification */}
                    <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Email Notification
                        </label>

                        <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
                            <span className="text-[13px] font-[Medium] text-[#222]">
                                Email Notification
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsEmailNotificationActive(
                                        !isEmailNotificationActive
                                    )
                                }
                                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isEmailNotificationActive
                                    ? "bg-[#6A3CA8]"
                                    : "bg-[#D1D5DB]"
                                    }`}
                            >
                                <span
                                    className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isEmailNotificationActive
                                        ? "left-[22px]"
                                        : "left-[2px]"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Push Notification */}
                    <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Push Notification
                        </label>

                        <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
                            <span className="text-[13px] font-[Medium] text-[#222]">
                                Push Notification
                            </span>

                            <button
                                type="button"
                                onClick={() =>
                                    setIsPushNotificationActive(
                                        !isPushNotificationActive
                                    )
                                }
                                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isPushNotificationActive
                                    ? "bg-[#6A3CA8]"
                                    : "bg-[#D1D5DB]"
                                    }`}
                            >
                                <span
                                    className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isPushNotificationActive
                                        ? "left-[22px]"
                                        : "left-[2px]"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                     {/* Ban status */}
                     <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Ban Status
                        </label>

                        <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
                            <span className="text-[13px] font-[Medium] text-[#222]">
                                Ban User
                            </span>

                            <button
                                type="button"
                                onClick={() => setIsBanActive(!isBanActive)}
                                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isBanActive ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"
                                    }`}
                            >
                                <span
                                    className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isBanActive ? "left-[22px]" : "left-[2px]"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    <div >
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Ban Reason
                        </label>

                        <textarea
                            value={banReason}
                            onChange={(event) => setBanReason(event.target.value)}
                            placeholder="Enter Reason"
                            className="w-full h-[100px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none resize-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Last Login
                        </label>
                        <input
                            type="text"
                            value={lastLogin}
                            readOnly
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-[#F9FAFB] px-[12px] text-[13px] font-[Medium] text-[#707070] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Last Active At
                        </label>
                        <input
                            type="text"
                            value={lastActiveAt}
                            readOnly
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-[#F9FAFB] px-[12px] text-[13px] font-[Medium] text-[#707070] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Created At
                        </label>
                        <input
                            type="text"
                            value={createdAt}
                            readOnly
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-[#F9FAFB] px-[12px] text-[13px] font-[Medium] text-[#707070] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Login Attempts
                        </label>
                        <input
                            type="text"
                            value={loginAttempts}
                            readOnly
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-[#F9FAFB] px-[12px] text-[13px] font-[Medium] text-[#707070] focus:outline-none"
                        />
                    </div>

                </div>

                <div className="mt-[24px] flex items-center justify-end gap-[12px]">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="h-[42px] px-[20px] rounded-[10px] border border-[rgba(34,34,34,0.10)] text-[#222] text-[14px] font-[Medium] hover:bg-[#F5F5F5] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || loadingUser}
                        className={`h-[42px] px-[24px] rounded-[10px] text-[#fff] text-[14px] font-[SemiBold] transition-all ${isSaving || loadingUser
                            ? "bg-[#6A3CA899] cursor-not-allowed"
                            : "bg-[#6A3CA8] hover:opacity-90"
                            }`}
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UserAccountDetail;