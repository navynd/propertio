import React, { useRef, useState, useEffect } from "react";
import mainbg from "../../../assets/img/mainbg.png";
import profileimg from '../../../assets/img/profileimg.png'
import { VerifiedIcon, EyeIcon, DownArrowIcon, SearchIcon } from "../../../components/CustomFile/icons";
import DeveloperHeader from "../../../components/Header/DeveloperHeader";
import { developerService } from "../../../services/developerService";
import { toast } from "../../../services/toast";
import { API_BASE_URL } from "../../../services/apiClient";
import Loader from "../../../components/Loader/loader";

type CountryOption = {
    id: string;
    name: string;
    code: string;
    dialCode: string;
    flag: string;
};

const Profile = () => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [countriesList, setCountriesList] = useState<CountryOption[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const defaultOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const [developerImgBase, setDeveloperImgBase] = useState(`${defaultOrigin}/uploads/img/developer/`);
    const [developerId, setDeveloperId] = useState("");
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isVerifiedDeveloper, setIsVerifiedDeveloper] = useState(false);
    const [form, setForm] = useState({
        name: "",
        phoneNumber: "",
        email: "",
        address: "",
        foundedYear: "",
        shortDescription: "",
        longDescription: "",
    });
    const filteredCountries = countriesList.filter(country =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.dialCode.includes(searchQuery)
    );

    useEffect(() => {
        let mounted = true;
        developerService
            .getCountriesMasterData()
            .then((data) => {
                if (!mounted) return;
                const countries = Array.isArray(data.countries) ? data.countries : [];
                const mappedCountries: CountryOption[] = countries
                    .filter((country) => country.isActive !== false)
                    .map((country) => ({
                        id: country._id,
                        name: country.name,
                        code: country.code,
                        dialCode: country.phoneCode,
                        flag: country.flag || "",
                    }));
                setCountriesList(mappedCountries);
                if (!selectedCountry && mappedCountries.length > 0) {
                    setSelectedCountry(
                        mappedCountries.find((country) => country.code === "AE") || mappedCountries[0]
                    );
                }
            })
            .catch(() => {
                if (!mounted) return;
                toast.error("Failed to load countries", "Could not fetch country master data.");
            });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        let mounted = true;
        developerService
            .getSupportedUrlsMasterData()
            .then((data) => {
                if (!mounted) return;
                const source =
                    (data.supportedUrls as Record<string, unknown>) ||
                    (data.supportedurls as Record<string, unknown>) ||
                    {};
                const developerUrl =
                    (source.developerUrl as Record<string, unknown>) ||
                    (source.developerurl as Record<string, unknown>) ||
                    {};
                const base = String(developerUrl.img || `${defaultOrigin}/uploads/img/developer/`).replace(/\/?$/, "/");
                setDeveloperImgBase(base);
            })
            .catch(() => undefined);
        return () => {
            mounted = false;
        };
    }, [defaultOrigin]);

    const applyProfileToForm = (profile: Record<string, unknown>) => {
        const phoneCode = String(profile.phoneCode || "").trim();
        const localPhone = String(profile.phoneNumberWithoutCode || "").trim();
        const fullPhone = String(profile.phoneNumber || "").trim();
        if (phoneCode) {
            const matchedCountry = countriesList.find((country) => country.dialCode === phoneCode);
            if (matchedCountry) setSelectedCountry(matchedCountry);
        }
        const address = (profile.address as Record<string, unknown>) || {};
        setDeveloperId(String(profile._id || ""));
        setIsVerifiedDeveloper(Boolean(profile.isVerified));
        setForm({
            name: String(profile.name || ""),
            phoneNumber: localPhone || fullPhone,
            email: String(profile.email || ""),
            address: String(address.fullAddress || address.street || ""),
            foundedYear: profile.foundedYear ? String(profile.foundedYear) : "",
            shortDescription: String(profile.shortDescription || ""),
            longDescription: String(profile.longDescription || profile.description || ""),
        });
        const pic = String(profile.profilePicture || profile.logo || "").trim();
        if (pic) {
            const picUrl = pic.startsWith("http://") || pic.startsWith("https://")
                ? pic
                : `${developerImgBase}${pic.includes("/") ? pic.split("/").pop() || pic : pic}`;
            setSelectedImage(picUrl);
        } else {
            setSelectedImage(null);
        }
    };

    useEffect(() => {
        let mounted = true;
        setIsProfileLoading(true);
        developerService
            .getProfile()
            .then((profile) => {
                if (!mounted) return;
                applyProfileToForm(profile as Record<string, unknown>);
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                toast.error("Failed to load profile", (error as { message?: string })?.message || "Could not fetch profile.");
            })
            .finally(() => {
                if (!mounted) return;
                setIsProfileLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [developerImgBase, countriesList]);

    const handleSaveProfile = async () => {
        if (!form.name.trim()) {
            toast.error("Missing name", "Developer name is required.");
            return;
        }
        if (!form.phoneNumber.trim()) {
            toast.error("Missing phone number", "Phone number is required.");
            return;
        }
        if (!selectedCountry?.dialCode) {
            toast.error("Missing country code", "Please select a country code.");
            return;
        }
        try {
            setIsSavingProfile(true);
            await developerService.updateProfile({
                name: form.name.trim(),
                phoneNumber: form.phoneNumber.trim(),
                phoneCode: selectedCountry.dialCode,
                phoneNumberWithoutCode: form.phoneNumber.trim().replace(/\D/g, ""),
                address: { fullAddress: form.address.trim() },
                foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
                shortDescription: form.shortDescription.trim(),
                longDescription: form.longDescription.trim(),
                description: form.longDescription.trim(),
            });
            const refreshed = await developerService.getProfile();
            applyProfileToForm(refreshed as Record<string, unknown>);
            toast.success("Profile updated", "Developer profile saved successfully.");
        } catch (error: unknown) {
            toast.error("Update failed", (error as { message?: string })?.message || "Could not update profile.");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleAddPhotoClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!developerId) {
            toast.error("Missing developer", "Developer ID not found.");
            return;
        }
        const imageUrl = URL.createObjectURL(file);
        setSelectedImage(imageUrl);
        try {
            setIsUploadingPhoto(true);
            const formData = new FormData();
            formData.append("developerId", developerId);
            formData.append("profilePicture", file);
            await developerService.uploadProfilePicture(formData);
            const refreshed = await developerService.getProfile();
            applyProfileToForm(refreshed as Record<string, unknown>);
            toast.success("Profile picture updated", "Profile picture uploaded successfully.");
        } catch (error: unknown) {
            toast.error("Upload failed", (error as { message?: string })?.message || "Failed to upload profile picture.");
        } finally {
            setIsUploadingPhoto(false);
            URL.revokeObjectURL(imageUrl);
        }
    };

    const handleDeletePhoto = async () => {
        if (!developerId) {
            toast.error("Missing developer", "Developer ID not found.");
            return;
        }
        try {
            setIsUploadingPhoto(true);
            const formData = new FormData();
            formData.append("developerId", developerId);
            formData.append("removeProfilePicture", "true");
            await developerService.uploadProfilePicture(formData);
            setSelectedImage(null);
            toast.success("Profile picture removed", "Profile picture deleted successfully.");
        } catch (error: unknown) {
            toast.error("Delete failed", (error as { message?: string })?.message || "Failed to remove profile picture.");
        } finally {
            setIsUploadingPhoto(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            {/* Header */}
            <DeveloperHeader
                title="Your profile"
                showBack={false}
                onBackClick={() => { }}
                profileImage={selectedImage}
                verified={isVerifiedDeveloper}
            />
            {isProfileLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}

            <div className="bg-[#FFF] rounded-[15px] grid grid-cols-1 xl:grid-cols-[1fr_350px] items-stretch">
                {/* Left side Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-[20px] gap-x-[30px] md:p-[30px] p-[20px] rounded-[15px] bg-[#FFF] ">
                    {/* Column 1 */}
                    <div className="flex flex-col gap-[16px]">
                        <div>
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                Developer name <span className="text-[#EA3934]">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                            />
                        </div>

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
                                        {selectedCountry?.flag ? (
                                            <img src={selectedCountry.flag} alt={selectedCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                        ) : (
                                            <span className="text-[12px] font-[Medium] text-[#222]">{selectedCountry?.code || "--"}</span>
                                        )}
                                        <DownArrowIcon className={`mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
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
                                                        {country.flag ? (
                                                            <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                                                        ) : (
                                                            <span className="text-[12px] font-[Medium] text-[#222] shrink-0">{country.code}</span>
                                                        )}
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
                                        value={form.phoneNumber}
                                        onChange={(e) => setForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                                        className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                                    />
                                    <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                                        <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                                    </div>
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

                        <div>
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                Email Id <span className="text-[#EA3934]">*</span>
                            </label>

                            <div className="relative flex-1">
                                <input
                                    type="email"
                                    disabled={true}
                                    value={form.email}
                                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                                    className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none  bg-[#F9F9F9]"
                                />
                                <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[14px] font-[Bold]">
                                    <VerifiedIcon className="w-[14px] h-[14px]" /> Verified
                                </div>
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

                        <div>
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                Address <span className="text-[#EA3934]">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.address}
                                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                                className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-[SemiBold] text-[#222] mb-[8px]">
                                Founded year <span className="text-[#EA3934]">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.foundedYear}
                                onChange={(e) => setForm((prev) => ({ ...prev, foundedYear: e.target.value }))}
                                className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-[SemiBold] text-[#222] mb-[8px]">
                                Short Description <span className="text-[#EA3934]">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.shortDescription}
                                onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
                                className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                            />
                        </div>

                        {/* <div className="mt-[20px]">
                            <button className="border border-[#222] text-[#222] text-[14px] font-[Bold] px-[20px] h-[44px] rounded-[10px]">
                                Cancel
                            </button>
                        </div> */}
                        <div className=" pt-[20px] flex ">
                            <button
                                className="bg-[#EA3934] text-white text-[14px] font-[Bold] px-[20px] h-[44px] rounded-[10px] disabled:opacity-60 cursor-pointer"
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                            >
                                {isSavingProfile ? "Saving..." : "Save changes"}
                            </button>
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="flex flex-col gap-[16px]">
                        <div>
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                Long description <span className="text-[#EA3934]">*</span>
                            </label>
                            <textarea
                                value={form.longDescription}
                                onChange={(e) => setForm((prev) => ({ ...prev, longDescription: e.target.value }))}
                                className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[10px] py-[14px] h-[290px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                            />
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
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[#707070] focus:outline-none">
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
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[#707070] focus:outline-none">
                                    <EyeIcon width={16} height={16} />
                                </button>
                            </div>
                        </div> */}

                        {/* <div className="mt-auto pt-[20px] flex justify-end">
                            <button
                                className="bg-[#EA3934] text-white text-[14px] font-[Bold] px-[20px] h-[44px] rounded-[10px] disabled:opacity-60"
                                onClick={handleSaveProfile}
                                disabled={isSavingProfile}
                            >
                                {isSavingProfile ? "Saving..." : "Save changes"}
                            </button>
                        </div> */}
                    </div>
                </div>

                {/* Right side Profile Image upload */}
                <div className="bg-[#F5F5F5] rounded-[15px] p-[30px] m-[4px] flex flex-col items-center">
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[60px]">
                        Developer profile picture
                    </h2>

                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    <div className="bg-white rounded-[15px] w-[220px] h-[220px] flex items-center justify-center mb-[30px] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)] overflow-hidden">
                        <img src={selectedImage || profileimg} alt="img" className="w-full h-full object-cover" />
                    </div>

                    <div className="flex items-center gap-[12px]">
                        <button
                            className="bg-[#0832AE] text-[#fff] text-[12px] font-[SemiBold] px-[10px] h-[34px] rounded-[10px]"
                            onClick={handleAddPhotoClick}
                            disabled={isUploadingPhoto}
                        >
                            {isUploadingPhoto ? "Uploading..." : "Add photo"}
                        </button>
                        <button
                            className="bg-[#fff] text-[#222] text-[12px] font-[SemiBold] px-[10px] h-[34px] rounded-[10px]"
                            onClick={handleDeletePhoto}
                            disabled={isUploadingPhoto}
                        >
                            Delete photo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;