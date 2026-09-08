import React, { useRef, useState, useEffect } from "react";
import mainbg from "../../../assets/img/mainbg.png";
import profileimg from "../../../assets/img/C12.jpg";
import {
  VerifiedIcon,
  EyeIcon,
  DownArrowIcon,
  SearchIcon,
} from "../../../components/CustomFile/icons";
import AgencyHeader from "../../../components/Header/AgencyHeader";
import Loader from "../../../components/Loader/loader";

import {
  agencyService,
  type AgencyProfile,
} from "../../../services/agencyService";

import { toast } from "../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../services/apiClient";
import { useAgencyLayout } from "../../../context/AgencyLayoutContext";
import {
  buildProfilePictureUrl,
  hasUploadedProfilePicture,
} from "../../../utils/agentProfileMedia";

const MAX_PROFILE_IMAGE_BYTES = 15 * 1024 * 1024;
type Country = {
  _id: string;
  name: string;
  code: string;
  phoneCode: string;
  flag: string;
  isActive?: boolean;
  displayOrder?: number;
};

function localDigitsFromFull(full: string | undefined, dialCode: string | undefined): string {
  if (!full) return "";
  const all = full.replace(/\D/g, "");
  const code = (dialCode || "").replace(/\D/g, "");
  if (code && all.startsWith(code)) return all.slice(code.length);
  return all;
}

const Profile = () => {
  const { refreshAgencyHeader } = useAgencyLayout();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [serverProfilePictureUrl, setServerProfilePictureUrl] = useState<
    string | null
  >(null);
  const [profilePictureFilename, setProfilePictureFilename] = useState<
    string | null
  >(null);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);
  const [isNationalityDropdownOpen, setIsNationalityDropdownOpen] =
    useState(false);
  const [nationalitySearchQuery, setNationalitySearchQuery] = useState("");
  const [selectedNationality, setSelectedNationality] =
    useState<Country | null>(null);
  const [nationalityOptions, setNationalityOptions] = useState<Country[]>([]);
  const [imageBaseUrls, setImageBaseUrls] = useState({
    agency: "",
    property: "",
  });

  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const pageLoading = loadingProfile || loadingMaster;
  const [countryOptions, setCountryOptions] = useState<Country[]>([]);
  const filteredCountries = countryOptions.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.phoneCode.includes(searchQuery),
  );
  const filteredNationalities = nationalityOptions.filter((country) =>
    country.name.toLowerCase().includes(nationalitySearchQuery.toLowerCase()),
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res: any = await agencyService.getProfile();

        if (res) {
          setProfile(res);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProfile(false);
      }
    };

    void fetchProfile();
  }, []);

  const handleSave = async () => {
    if (!profile || savingProfile) return;

    const dialCode = String(selectedCountry?.phoneCode ?? profile.phoneCode ?? "").trim();
    const localDigits =
      String(profile.phoneNumberWithoutCode ?? "")
        .replace(/\D/g, "") ||
      localDigitsFromFull(profile.phoneNumber, dialCode);

    const payload: Record<string, unknown> = {
      agencyName: profile.agencyName,
      nationality: selectedNationality?._id,
      address: profile.address,
    };

    if (dialCode && localDigits) {
      const compactCode = dialCode.replace(/\s/g, "");
      payload.phoneCode = dialCode;
      payload.phoneNumberWithoutCode = localDigits;
      payload.phoneNumber = `${compactCode}${localDigits}`;
    }

    try {
      setSavingProfile(true);
      const updated = await agencyService.updateProfile(payload);
      if (updated) setProfile(updated);
      void refreshAgencyHeader();
      toast.success("Profile updated", "Your agency profile was saved.");
    } catch (err) {
      console.error(err);
      toast.error(
        "Update failed",
        getApiErrorMessage(err, "Could not save your profile. Please try again."),
      );
    } finally {
      setSavingProfile(false);
    }
  };

  //   const handleSave = async () => {
  //     if (!profile) return;

  //     try {

  //       await agencyService.updateProfile(profile);
  //       alert("Updated successfully");
  //     } catch (err) {
  //       console.error(err);
  //     }
  //   };

  useEffect(() => {
    let isMounted = true;

    const loadMasterData = async () => {
      try {
        const res: any = await agencyService.getMasterData([
          "supportedurls",
          "languages",
          "countries",
        ]);

        if (!isMounted) return;

        const countries: Country[] = res?.countries || [];

        // reuse same data for nationality
        setNationalityOptions(countries);

        const activeCountries = countries
          .filter((c) => c.isActive)
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

        setCountryOptions(activeCountries);

        // default AE
        const defaultCountry =
          activeCountries.find((c) => c.code === "AE") || activeCountries[0];

        setSelectedCountry(defaultCountry);

        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallback = `${fallbackOrigin}/uploads/img/property/`;

        const supported = res?.supportedUrls;

        setImageBaseUrls({
          agency: supported?.agencyUrl?.img?.trim() || fallback,
          property: supported?.propertyUrl?.img?.trim() || fallback,
        });
      } catch (err) {
        console.error("Master data error:", err);
      } finally {
        if (isMounted) setLoadingMaster(false);
      }
    };

    void loadMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const pic = profile?.profilePicture
      ? String(profile.profilePicture).trim()
      : null;
    setProfilePictureFilename(pic);
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const base = (
      imageBaseUrls.agency || `${fallbackOrigin}/uploads/img/agency/`
    ).replace(/\/?$/, "/");
    setServerProfilePictureUrl(buildProfilePictureUrl(base, pic));
  }, [profile?.profilePicture, imageBaseUrls.agency]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsCountryDropdownOpen(false);
      }
      if (
        nationalityDropdownRef.current &&
        !nationalityDropdownRef.current.contains(event.target as Node)
      ) {
        setIsNationalityDropdownOpen(false);
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

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!profile?._id) {
      toast.error(
        "Missing profile",
        "Wait for your profile to finish loading and try again.",
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
      await agencyService.uploadAgencyProfilePicture(profile._id, { file });

      const updatedProfile = await agencyService.getProfile();
      if (updatedProfile) setProfile(updatedProfile);
      void refreshAgencyHeader();
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

    if (!profile?._id) {
      toast.error(
        "Missing profile",
        "Wait for your profile to finish loading and try again.",
      );
      return;
    }

    try {
      setIsUploadingPhoto(true);
      await agencyService.uploadAgencyProfilePicture(profile._id, {
        removeProfilePicture: true,
      });

      const updatedProfile = await agencyService.getProfile();
      if (updatedProfile) setProfile(updatedProfile);
      void refreshAgencyHeader();
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

  const hasRealProfilePhoto =
    Boolean(selectedImage?.startsWith("blob:")) ||
    hasUploadedProfilePicture(profilePictureFilename);

  const profileImageSrc =
    selectedImage ?? serverProfilePictureUrl ?? profileimg;

  const toImageUrl = (image: string | null, type: "agency" | "property") => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/property/`;

    const base =
      (type === "agency" ? imageBaseUrls.agency : imageBaseUrls.property) ||
      fallbackBase;

    const cleanBase = base.replace(/\/+$/, "");
    const cleanImage = image.replace(/^\/+/, "");

    return `${cleanBase}/${cleanImage}`;
  };

  useEffect(() => {
    if (profile?.nationality && nationalityOptions.length > 0) {
      const matchedNationality = nationalityOptions.find(
        (c) => c._id === profile.nationality,
      );

      if (matchedNationality) {
        setSelectedNationality(matchedNationality);
      }
    }
  }, [profile, nationalityOptions]);

  useEffect(() => {
    if (!profile || countryOptions.length === 0) return;
    const code = String(profile.phoneCode ?? "").trim();
    if (!code) return;
    const digits = (s: string) => s.replace(/\D/g, "");
    const target = digits(code);
    const match = countryOptions.find((c) => {
      const pc = String(c.phoneCode ?? "").trim();
      return pc === code || digits(pc) === target;
    });
    if (match) setSelectedCountry(match);
  }, [profile?.phoneCode, countryOptions]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      {/* Header */}
      <AgencyHeader
        title="Your profile"
        showBack={false}
        onBackClick={() => { }}
      />

      {pageLoading ? (
        <div
          className="rounded-[15px] bg-white min-h-[320px] flex flex-col items-center justify-center gap-3 py-12"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader size={72} margin={0} />
          <p className="text-[13px] font-[Regular] text-[#707070]">
            Loading profile…
          </p>
        </div>
      ) : (
        <div className="relative bg-[#FFF] rounded-[15px] grid grid-cols-1 xl:grid-cols-[1fr_350px] items-stretch">
          {savingProfile && (
            <div
              className="absolute inset-0 z-[20] rounded-[15px] bg-white/70 flex flex-col items-center justify-center gap-2"
              aria-busy="true"
              aria-live="polite"
            >
              <Loader size={56} margin={0} />
              <p className="text-[13px] font-[Regular] text-[#707070]">Saving…</p>
            </div>
          )}
          {/* Left side Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-[20px] gap-x-[30px] md:p-[30px] p-[20px] rounded-[15px] bg-[#FFF] ">
            {/* Column 1 */}
            <div className="flex flex-col gap-[16px]">
              {/*Agency Name */}
              <div>
                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                  Agency Name <span className="text-[#EA3934]">*</span>
                </label>
                <input
                  type="text"
                  value={profile?.agencyName || ""}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, agencyName: e.target.value } : prev,
                    )
                  }
                  className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
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
                      <img
                        src={selectedCountry?.flag}
                        alt={selectedCountry?.code}
                        className="w-[20px] h-[14px] rounded-[2px] object-cover"
                      />
                      <DownArrowIcon
                        className={`mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
                        width={14}
                        height={14}
                      />
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
                          {filteredCountries.length > 0 ? (
                            filteredCountries.map((country) => (
                              <div
                                key={country._id}
                                className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedCountry?._id === country._id ? "bg-[#F5F5F5]" : ""}`}
                                onClick={() => {
                                  setSelectedCountry(country);
                                  setIsCountryDropdownOpen(false);
                                  setSearchQuery("");
                                }}
                              >
                                <img
                                  src={country.flag}
                                  alt={country.code}
                                  className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0"
                                />
                                <span className="text-[13px] font-[Medium] text-[#222] truncate">
                                  {country.name} ({country.phoneCode})
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="p-[14px] text-[13px] text-[#707070] text-center">
                              No countries found
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Phone Number — local digits; save sends phoneCode + phoneNumberWithoutCode + phoneNumber for existing API */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="501234567"
                      value={
                        profile?.phoneNumberWithoutCode ??
                        localDigitsFromFull(
                          profile?.phoneNumber,
                          selectedCountry?.phoneCode ?? profile?.phoneCode,
                        ) ??
                        ""
                      }
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        setProfile((prev) =>
                          prev ? { ...prev, phoneNumberWithoutCode: digits } : prev,
                        );
                      }}
                      disabled={savingProfile}
                      className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none disabled:opacity-60"
                    />
                    {profile?.isPhoneVerified && (
                      <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                        <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                      </div>
                    )}
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

                <div className="relative flex-1 ">
                  <input
                    type="email"
                    value={profile?.email || ""}
                    disabled={true}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev ? { ...prev, email: e.target.value } : prev,
                      )
                    }
                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none bg-[#F9F9F9] "
                  />
                  {profile?.isEmailVerified && (
                    <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                      <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                    </div>
                  )}
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

              {/*Office Registration Number (ORN) */}
              <div>
                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                  Office Registration Number (ORN){" "}
                  <span className="text-[#EA3934]">*</span>
                </label>
                <input
                  type="text"
                  value={profile?.orn || ""}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, orn: e.target.value } : prev,
                    )
                  }
                  className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                />
              </div>
              {/*A Address */}
              <div>
                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                  Address <span className="text-[#EA3934]">*</span>
                </label>
                <input
                  type="text"
                  value={profile?.address?.fullAddress || ""}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev
                        ? {
                          ...prev,
                          address: {
                            ...prev.address,
                            fullAddress: e.target.value,
                          },
                        }
                        : prev,
                    )
                  }
                  className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                />
              </div>

              <div className="mt-[20px]">
                {/* <button className="border border-[#222] text-[#222] text-[14px] font-[Bold] px-[20px] h-[44px] rounded-[10px]">
                  Cancel
                </button> */}
              </div>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-[16px]">
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
                          src={selectedNationality.flag}
                          alt={selectedNationality.code}
                          className="w-[20px] h-[14px] rounded-[2px] object-cover"
                        />
                        <span className="text-[14px] font-[Regular] text-[#222]">
                          {selectedNationality.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[14px] font-[Regular] text-[#AAAAAA]">
                        Select
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
                    <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
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
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
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

              {/* <div>
                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                  Password <span className="text-[#EA3934]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    defaultValue="12345kannan"
                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] h-[44px] text-[14px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
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
                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                  Confirm password <span className="text-[#EA3934]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    defaultValue="12345kannan"
                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] h-[44px] text-[14px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[#707070] focus:outline-none"
                  >
                    <EyeIcon width={16} height={16} />
                  </button>
                </div>
              </div> */}

              <div className="mt-auto pt-[20px] flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={savingProfile}
                  className="bg-[#EA3934] text-white text-[14px] font-[Bold] px-[20px] h-[44px] rounded-[10px] disabled:opacity-60 disabled:pointer-events-none"
                >
                  {savingProfile ? "Saving…" : "Save changes"}
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
              Agency profile picture
            </h2>

            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="w-[220px] h-[220px] rounded-full border-2 border-white bg-[rgba(34,34,34,0.10)] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)] mb-[50px] flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={profileImageSrc}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
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
      )}
    </div>
  );
};

export default Profile;
