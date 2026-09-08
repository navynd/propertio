import { useEffect, useMemo, useRef, useState } from "react";
import { DownArrowIcon, SearchIcon, VerifiedIcon } from "../../../assets/icons";
import { PdfIcon, DownloadIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import userEmptyImg from "../../../assets/img/profileless.png";
import type { Country } from "../../../data/countries";
import { countries } from "../../../data/countries";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { developersService } from "../../../services/developersService";
import type { AdminDeveloperDetail, CountryOption, DeveloperProjectsSummary } from "../../../types/api";

type SelectCountry = CountryOption;

function DeveloperAccDetail() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [searchParams] = useSearchParams();
  const developerId = searchParams.get("id")?.trim() || "";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [countryOptions, setCountryOptions] = useState<SelectCountry[]>(countries as unknown as SelectCountry[]);
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<SelectCountry>(
    (countries.find((c) => c.code === "AE") || countries[0]) as unknown as SelectCountry
  );
  const [selectedCountry, setSelectedCountry] = useState<SelectCountry>(
    (countries.find((c) => c.code === "AE") || countries[0]) as unknown as SelectCountry
  );

  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  const [developerDetails, setDeveloperDetails] = useState<AdminDeveloperDetail | null>(null);
  const [projectsSummary, setProjectsSummary] = useState<DeveloperProjectsSummary | null>(null);
  const [developerImgBaseUrl, setDeveloperImgBaseUrl] = useState("");
  const [developerDocBaseUrl, setDeveloperDocBaseUrl] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumberWithoutCode, setPhoneNumberWithoutCode] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [aboutDeveloper, setAboutDeveloper] = useState("");
  const [displayName, setDisplayName] = useState("Developer Name");

  const [isDeveloperActive, setIsDeveloperActive] = useState(true);
  const [isDeveloperVerified, setIsDeveloperVerified] = useState(false);
  const [isEmailNotificationActive, setIsEmailNotificationActive] = useState(true);
  const [isPushNotificationActive, setIsPushNotificationActive] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  const [lastLogin, setLastLogin] = useState("—");
  const [lastActiveAt, setLastActiveAt] = useState("—");
  const [createdAt, setCreatedAt] = useState("—");
  const [loginAttempts, setLoginAttempts] = useState("0");

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadingDeveloper, setLoadingDeveloper] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const filteredPhoneCountries = useMemo(
    () =>
      countryOptions.filter(
        (country) =>
          country.name.toLowerCase().includes(phoneSearchQuery.toLowerCase()) ||
          country.dialCode.includes(phoneSearchQuery)
      ),
    [countryOptions, phoneSearchQuery]
  );

  const filteredCountries = useMemo(
    () =>
      countryOptions.filter((country) =>
        country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
      ),
    [countryOptions, countrySearchQuery]
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
    if (lower.includes("profileless.png") || lower.includes("profiless.png")) return true;
    const base = lower.split(/[/\\?#]/).pop() ?? "";
    return base === "profileless.png" || base === "profiless.png";
  };

  const resolveDeveloperAvatarSrc = (raw?: string | null, explicitUrl?: string | null): string => {
    const value = (raw || "").trim();
    if (value && /^https?:\/\//i.test(value)) return value;
    const direct = (explicitUrl || "").trim();
    if (direct && /^https?:\/\//i.test(direct)) return direct;
    if (!value || isPlaceholderProfilePicture(value)) return userEmptyImg;
    if (value.startsWith("/")) return value;
    const base = (developerImgBaseUrl || "").trim().replace(/\/+$/, "");
    if (!base) return userEmptyImg;
    return `${base}/${encodeURIComponent(value)}`;
  };

  const registrationDocument = useMemo(() => {
    const firstDoc = developerDetails?.registrationDocuments?.[0] || "";
    const hasDocument = Boolean(firstDoc);
    const fileName = firstDoc.split("/").pop() || "—";
    return {
      hasDocument,
      name: fileName,
      url: firstDoc && /^https?:\/\//i.test(firstDoc)
        ? firstDoc
        : firstDoc
          ? `${(developerDocBaseUrl || "").replace(/\/+$/, "")}/${encodeURIComponent(firstDoc)}`
          : null,
      uploadedOn: hasDocument ? formatDateTime(developerDetails?.createdAt) : "",
    };
  }, [developerDetails, developerDocBaseUrl]);

  const isApprovalPending = useMemo(() => {
    const invitationStatus = String(developerDetails?.invitationStatus || "").toLowerCase();
    return invitationStatus === "accepted" && !Boolean(developerDetails?.isVerified);
  }, [developerDetails?.invitationStatus, developerDetails?.isVerified]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
        setIsPhoneDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const loadMasterData = async () => {
      try {
        const [fetchedCountries, urls] = await Promise.all([
          developersService.listMasterCountries(controller.signal),
          developersService.getSupportedUrls(controller.signal),
        ]);
        if (!mounted) return;
        const nextCountries = fetchedCountries.length ? fetchedCountries : (countries as unknown as SelectCountry[]);
        setCountryOptions(nextCountries);
        setDeveloperImgBaseUrl((urls.supportedUrls?.developerUrl?.img || "").trim());
        setDeveloperDocBaseUrl((urls.supportedUrls?.developerUrl?.doc || "").trim());
      } catch {
        if (!mounted) return;
        setCountryOptions(countries as unknown as SelectCountry[]);
        setDeveloperImgBaseUrl("");
        setDeveloperDocBaseUrl("");
      }
    };
    void loadMasterData();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const hydrateDeveloper = async () => {
      if (!developerId) {
        setLoadError("Missing developer id in URL.");
        setLoadingDeveloper(false);
        return;
      }
      setLoadingDeveloper(true);
      setLoadError(null);
      try {
        const data = await developersService.getDeveloperById(developerId, controller.signal);
        if (!mounted) return;
        const dev = data.developer;
        setDeveloperDetails(dev);
        setProjectsSummary(data.projectsSummary || null);
        setName(dev.name || "");
        setEmail(dev.email || "");
        const resolvedPhoneCode = String(dev.phoneCode || dev.nationality?.phoneCode || "").trim();
        setPhoneNumberWithoutCode(splitPhoneNumber(dev.phoneNumber || dev.phoneNumberWithoutCode, resolvedPhoneCode));
        setFoundedYear(dev.foundedYear ? String(dev.foundedYear) : "");
        setWebsite(dev.website || "");
        setAddress(dev.address?.fullAddress || "");
        setAboutDeveloper(dev.aboutUs || dev.description || dev.shortDescription || dev.longDescription || "");
        setDisplayName(dev.name || dev.email || "Developer Name");
        setIsDeveloperActive(Boolean(dev.isActive));
        setIsDeveloperVerified(Boolean(dev.isVerified));
        setIsEmailVerified(Boolean(dev.isEmailVerified));
        setIsPhoneVerified(Boolean(dev.isPhoneVerified));
        setIsEmailNotificationActive(Boolean(dev.preferences?.notificationSettings?.email ?? true));
        setIsPushNotificationActive(Boolean(dev.preferences?.notificationSettings?.push ?? true));
        setLastLogin(formatDateTime(dev.lastLogin));
        setLastActiveAt(formatDateTime(dev.lastActiveAt));
        setCreatedAt(formatDateTime(dev.createdAt));
        setLoginAttempts(String(dev.loginAttempts ?? 0));

        const phoneCountry =
          countryOptions.find((c) => c.dialCode === resolvedPhoneCode) ||
          countryOptions.find((c) => c.code === dev.nationality?.code) ||
          countryOptions.find((c) => c.code === "AE") ||
          countryOptions[0];
        if (phoneCountry) setSelectedPhoneCountry(phoneCountry);

        const countryRef =
          countryOptions.find((c) => c._id && c._id === dev.nationality?._id) ||
          countryOptions.find((c) => c.code === dev.nationality?.code) ||
          countryOptions.find((c) => c.code === "AE") ||
          countryOptions[0];
        if (countryRef) setSelectedCountry(countryRef);

        setSelectedImage(resolveDeveloperAvatarSrc(dev.profilePicture || dev.logo, dev.profilePictureUrl));
      } catch (error) {
        if (!mounted) return;
        setLoadError(getApiErrorMessage(error, "Failed to load developer details"));
      } finally {
        if (mounted) setLoadingDeveloper(false);
      }
    };
    void hydrateDeveloper();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [developerId, countryOptions]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !developerId) return;
    try {
      setIsUploadingPhoto(true);
      const data = await developersService.updateDeveloperProfilePicture(developerId, file);
      const updated = data.developer;
      if (updated) {
        setDeveloperDetails((prev) => ({ ...(prev || {}), ...updated }));
        setSelectedImage(resolveDeveloperAvatarSrc(updated.profilePicture || updated.logo, updated.profilePictureUrl));
      }
      push({ type: "success", title: "Profile updated", description: "Developer profile image updated." });
    } catch (error) {
      push({ type: "error", title: "Upload failed", description: getApiErrorMessage(error, "Unable to upload image") });
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = async () => {
    const result = await Swal.fire({
      title: "Delete profile photo?",
      text: "This will remove the current profile picture.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#EA3934",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    if (!developerId) return;
    try {
      setIsUploadingPhoto(true);
      const data = await developersService.removeDeveloperProfilePicture(developerId);
      const updated = data.developer;
      if (updated) {
        setDeveloperDetails((prev) => ({ ...(prev || {}), ...updated }));
      }
      setSelectedImage(userEmptyImg);
      push({ type: "success", title: "Profile removed", description: "Developer profile image removed." });
    } catch (error) {
      push({ type: "error", title: "Remove failed", description: getApiErrorMessage(error, "Unable to remove image") });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!developerId) return;
    if (!name.trim()) {
      push({ type: "error", title: "Validation error", description: "Developer name is required." });
      return;
    }
    if (!email.trim()) {
      push({ type: "error", title: "Validation error", description: "Developer email is required." });
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumberWithoutCode.trim(),
        phoneCode: selectedPhoneCountry?.dialCode || "",
        nationality: selectedCountry?._id,
        address: { fullAddress: address.trim() },
        aboutUs: aboutDeveloper.trim(),
        website: website.trim(),
        foundedYear: foundedYear ? Number(foundedYear) : undefined,
        isActive: isDeveloperActive,
        isVerified: isDeveloperVerified,
        preferences: {
          notificationSettings: {
            email: isEmailNotificationActive,
            push: isPushNotificationActive,
          },
        },
      };
      const data = await developersService.updateDeveloperById(developerId, payload);
      const dev = data.developer;
      setDeveloperDetails(dev);
      setDisplayName(dev.name || dev.email || "Developer Name");
      setSelectedImage(resolveDeveloperAvatarSrc(dev.profilePicture || dev.logo, dev.profilePictureUrl));
      push({ type: "success", title: "Developer updated", description: "Developer details were saved successfully." });
      navigate("/developeraccount");
    } catch (error) {
      push({ type: "error", title: "Save failed", description: getApiErrorMessage(error, "Failed to update developer") });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => navigate(-1);

  if (loadingDeveloper) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <Header title="Developer Detail" showBack={true} onBackClick={() => navigate(-1)} />
        <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px] min-h-[65vh] flex items-center justify-center">
          <Loader size={80} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header title="Developer Detail" showBack={true} onBackClick={() => navigate(-1)} />
      <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
        {loadError && (
          <div className="mb-[20px] rounded-[10px] border border-[rgba(234,57,52,0.25)] bg-[#FFF5F5] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#EA3934]">
            {loadError}
          </div>
        )}

        <div className="bg-[#fff] p-[20px] rounded-[12px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] mb-[20px]">
          <div className="flex items-center justify-between flex-wrap gap-[20px]">
            <div className="flex items-center gap-[16px]">
              <div className="relative w-[90px] h-[90px] rounded-full overflow-hidden border border-[rgba(34,34,34,0.10)] shrink-0">
                <img
                  src={selectedImage || userEmptyImg}
                  alt="Developer"
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
              <div>
                <h3 className="text-[18px] font-[Bold] text-[#222]">{displayName}</h3>
                <p className="text-[13px] font-[Regular] text-[#707070] mt-[4px]">
                  Upload and manage Developer logo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-[12px] flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="h-[42px] px-[18px] rounded-[10px] bg-[#222] text-[#fff] text-[14px] font-[Medium] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploadingPhoto ? "Uploading..." : "Change Logo"}
              </button>
              <button
                type="button"
                onClick={handleDeleteImage}
                disabled={isUploadingPhoto}
                className="h-[42px] px-[18px] rounded-[10px] border border-[rgba(34,34,34,0.10)] text-[#EA3934] text-[14px] font-[Medium] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[20px]">
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
              Developer Name <span className="text-[#EA3934]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
              Email Address <span className="text-[#EA3934]">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
              Phone Number <span className="text-[#EA3934]">*</span>
            </label>
            <div className="flex items-center gap-[10px]">
              <div className="relative" ref={phoneDropdownRef}>
                <div
                  className="flex items-center gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none"
                  onClick={() => setIsPhoneDropdownOpen((prev) => !prev)}
                >
                  <img src={selectedPhoneCountry.flag} alt={selectedPhoneCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                  <DownArrowIcon className={`mt-[2px] transition-transform ${isPhoneDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
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
                  value={phoneNumberWithoutCode}
                  onChange={(e) => setPhoneNumberWithoutCode(e.target.value)}
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

          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
              Country <span className="text-[#EA3934]">*</span>
            </label>
            <div className="relative w-full" ref={countryDropdownRef}>
              <div
                className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none"
                onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
              >
                <h4 className="text-[13px] font-[Medium] text-[#222] truncate">{selectedCountry.name}</h4>
                <DownArrowIcon className={`mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
              </div>
              {isCountryDropdownOpen && (
                <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
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
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Developer Verified</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Developer Verified</span>
              <button
                type="button"
                disabled
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isDeveloperVerified ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"} opacity-50 cursor-not-allowed`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isDeveloperVerified ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Developer Status</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Developer Active</span>
              <button
                type="button"
                onClick={() => setIsDeveloperActive((v) => !v)}
                disabled={isApprovalPending}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isDeveloperActive ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"} ${isApprovalPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isDeveloperActive ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Email Notification</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Email Notification</span>
              <button
                type="button"
                onClick={() => setIsEmailNotificationActive((v) => !v)}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isEmailNotificationActive ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"}`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isEmailNotificationActive ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Push Notification</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Push Notification</span>
              <button
                type="button"
                onClick={() => setIsPushNotificationActive((v) => !v)}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isPushNotificationActive ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"}`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isPushNotificationActive ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Founded Year</label>
            <input
              type="number"
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value)}
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-[120px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none resize-none"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">About Developer</label>
            <textarea
              value={aboutDeveloper}
              onChange={(e) => setAboutDeveloper(e.target.value)}
              className="w-full h-[140px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none resize-none"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Registration Document</label>
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

          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Total Projects</label>
            <input type="number" value={projectsSummary?.total ?? projectsSummary?.storedTotalProjects ?? 0} disabled className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]" />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Off-plan Projects</label>
            <input type="number" value={projectsSummary?.offPlan ?? 0} disabled className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]" />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Completed Projects</label>
            <input type="number" value={projectsSummary?.completedProjects ?? 0} disabled className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]" />
          </div>

          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Last Login</label>
            <input type="text" value={lastLogin} readOnly className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none" />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Last Active At</label>
            <input type="text" value={lastActiveAt} readOnly className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none" />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Created At</label>
            <input type="text" value={createdAt} readOnly className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none" />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Login Attempts</label>
            <input type="text" value={loginAttempts} readOnly className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-[12px] mt-[24px]">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving || isUploadingPhoto}
            className="h-[42px] px-[24px] rounded-[10px] border border-[rgba(34,34,34,0.15)] text-[#222] text-[14px] font-[SemiBold] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isUploadingPhoto}
            className="h-[42px] px-[24px] rounded-[10px] text-[#fff] text-[14px] font-[SemiBold] bg-[#6A3CA8] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeveloperAccDetail;