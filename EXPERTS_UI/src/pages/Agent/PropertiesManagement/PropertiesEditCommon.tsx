import { useCallback, useEffect, useId, useRef, useState } from "react";
import home1img from "../../../assets/img/home1.png";
import home2img from "../../../assets/img/home2.png";
import home3img from "../../../assets/img/home3.png";
import home4img from "../../../assets/img/home4.png";
import home5img from "../../../assets/img/home5.png";
import home6img from "../../../assets/img/home6.png";
import videoPlay from "../../../assets/img/video.webm";
import {
    ChangeIcon,
    DownArrowIcon,
    LeftArrowIcon,
    PlayIcon,
    PlusIcon,
    RightArrowIcon,
    TickIcon,
    TrashIcon,
} from "../../../components/CustomFile/icons";

const GALLERY_PAGE_SIZE = 8;

const SEED_IMAGES = [home1img, home2img, home3img, home4img, home5img, home6img, home4img, home3img];

const amenitiesList = [
    "Balcony",
    "Central A/C",
    "Maids Room",
    "Pets Allowed",
    "View of Water",
    "Built in Wardrobes",
    "Kitchen Appliances",
    "Mezzanine",
    "Networked",
    "Private gym",
    "Private Jacuzzi",
    "Central A/C",
    "Private gym",
];

type GalleryItem = { id: number; url: string };

/** Keeps only characters valid for the field kind: integer, decimal, or amount (digits + thousands commas). */
function sanitizeNumericInput(raw: string, kind: "integer" | "decimal" | "amount"): string {
    if (kind === "integer") {
        return raw.replace(/\D/g, "");
    }
    if (kind === "amount") {
        return raw.replace(/[^\d,]/g, "");
    }
    const cleaned = raw.replace(/[^\d.]/g, "");
    const dot = cleaned.indexOf(".");
    if (dot === -1) return cleaned;
    return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

function SuffixInput({
    label,
    value,
    onChange,
    suffix,
    required,
    type = "text",
    inputMode,
}: {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    suffix: string;
    required?: boolean;
    type?: string;
    inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
}) {
    const inputId = useId();
    return (
        <div>
            {label ? (
                <label htmlFor={inputId} className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                    {label} {required && <span className="text-[#D4A373]">*</span>}
                </label>
            ) : null}
            <div className="flex overflow-hidden rounded-[10px] border border-[rgba(34,34,34,0.10)]">
                <input
                    id={inputId}
                    type={type}
                    inputMode={inputMode}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-[44px] min-w-0 flex-1 border-0 px-[14px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                />
                <span className="flex shrink-0 items-center px-[12px] text-[12px] font-[Regular] text-[#707070]">
                    {suffix}
                </span>
            </div>
        </div>
    );
}

const listingTypeOptions = ["Rent", "Sale"];
const propertyTypeOptions = ["Apartment", "Villa", "Townhouse", "Penthouse", "Studio"];
const zoneLocationOptions = ["Downtown", "Marina", "Palm Jumeirah", "JVC", "Business Bay", "Dubai Hills"];

const PropertiesEditCommon = () => {
    const [listingType, setListingType] = useState("Rent");
    const [propertyType, setPropertyType] = useState("Apartment");
    const [isListingTypeDropdownOpen, setIsListingTypeDropdownOpen] = useState(false);
    const [isPropertyTypeDropdownOpen, setIsPropertyTypeDropdownOpen] = useState(false);
    const [isZoneLocationDropdownOpen, setIsZoneLocationDropdownOpen] = useState(false);
    const listingTypeDropdownRef = useRef<HTMLDivElement>(null);
    const propertyTypeDropdownRef = useRef<HTMLDivElement>(null);
    const zoneLocationDropdownRef = useRef<HTMLDivElement>(null);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>(["Balcony"]);
    const [bedrooms, setBedrooms] = useState("2");
    const [maidBedroom, setMaidBedroom] = useState(false);
    const [bathrooms, setBathrooms] = useState("5");
    const [areaSqm, setAreaSqm] = useState("2000");
    const [areaSqft, setAreaSqft] = useState("21527.82");
    const [dldPermit, setDldPermit] = useState("4556585");
    const [dldUrl, setDldUrl] = useState("https://example.com/verify-permit");
    const [monthlyRent, setMonthlyRent] = useState("9,000,000");
    const [maintenancePct, setMaintenancePct] = useState("10");
    const [monthlyRentSecondary, setMonthlyRentSecondary] = useState("500");
    const [zone, setZone] = useState("Downtown");

    const nextPhotoId = useRef(100);
    const [photos, setPhotos] = useState<GalleryItem[]>(() =>
        SEED_IMAGES.map((url, i) => ({ id: i + 1, url }))
    );
    const [galleryPage, setGalleryPage] = useState(0);
    const addPhotosInputRef = useRef<HTMLInputElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const replaceTargetIdRef = useRef<number | null>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    const [videoSrc, setVideoSrc] = useState<string>(videoPlay);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);

    const handleAreaSqmChange = useCallback((value: string) => {
        setAreaSqm(sanitizeNumericInput(value, "integer"));
    }, []);

    const handleAreaSqftChange = useCallback((value: string) => {
        setAreaSqft(sanitizeNumericInput(value, "decimal"));
    }, []);

    const handleMonthlyRentChange = useCallback((value: string) => {
        setMonthlyRent(sanitizeNumericInput(value, "amount"));
    }, []);

    const handleMaintenanceFeesChange = useCallback((value: string) => {
        setMaintenancePct(sanitizeNumericInput(value, "decimal"));
    }, []);

    const handleMonthlyRentSecondaryChange = useCallback((value: string) => {
        setMonthlyRentSecondary(sanitizeNumericInput(value, "amount"));
    }, []);

    const totalGalleryPages = Math.max(1, Math.ceil(photos.length / GALLERY_PAGE_SIZE));
    const visiblePhotos = photos.slice(
        galleryPage * GALLERY_PAGE_SIZE,
        galleryPage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE
    );
    const canPrevGallery = galleryPage > 0;
    const canNextGallery = galleryPage < totalGalleryPages - 1;

    useEffect(() => {
        setGalleryPage((gp) => {
            const maxPage = Math.max(0, Math.ceil(photos.length / GALLERY_PAGE_SIZE) - 1);
            return Math.min(gp, maxPage);
        });
    }, [photos.length]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (listingTypeDropdownRef.current && !listingTypeDropdownRef.current.contains(target)) {
                setIsListingTypeDropdownOpen(false);
            }
            if (propertyTypeDropdownRef.current && !propertyTypeDropdownRef.current.contains(target)) {
                setIsPropertyTypeDropdownOpen(false);
            }
            if (zoneLocationDropdownRef.current && !zoneLocationDropdownRef.current.contains(target)) {
                setIsZoneLocationDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleAmenity = (name: string) => {
        setSelectedAmenities((prev) =>
            prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]
        );
    };

    const readFileAsUrl = (file: File): Promise<string> =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

    const onAddPhotos = useCallback(async (files: FileList | null) => {
        if (!files?.length) return;
        const additions: GalleryItem[] = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            if (!f.type.startsWith("image/")) continue;
            const url = await readFileAsUrl(f);
            additions.push({ id: nextPhotoId.current++, url });
        }
        if (additions.length) setPhotos((p) => [...p, ...additions]);
    }, []);

    const replacePhoto = useCallback(async (file: File | undefined) => {
        const id = replaceTargetIdRef.current;
        if (!file || id == null || !file.type.startsWith("image/")) return;
        const url = await readFileAsUrl(file);
        setPhotos((prev) => prev.map((item) => (item.id === id ? { ...item, url } : item)));
        replaceTargetIdRef.current = null;
    }, []);

    const removePhoto = (id: number) => {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
    };

    const deleteAllPhotos = () => {
        setPhotos([]);
        setGalleryPage(0);
    };

    const handlePlayVideo = () => {
        videoRef.current?.play();
        setIsVideoPlaying(true);
    };

    const handlePauseVideo = () => {
        videoRef.current?.pause();
        setIsVideoPlaying(false);
    };

    const onVideoFile = async (files: FileList | null) => {
        const f = files?.[0];
        if (!f) return;
        const url = URL.createObjectURL(f);
        setVideoSrc(url);
        setIsVideoPlaying(false);
    };

    const clearVideo = () => {
        if (videoSrc.startsWith("blob:")) URL.revokeObjectURL(videoSrc);
        setVideoSrc("");
        setIsVideoPlaying(false);
    };

    return (
        <div className="rounded-[15px] bg-[#F5F5F5]">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-3 xl:items-stretch bg-white rounded-[15px]">
                {/* Column 1 */}
                <div className="md:p-[30px_0px_30px_30px] p-[20px_0px_20px_20px] flex flex-col gap-5 min-w-0">
                    {/* Listing type */}
                    <div ref={listingTypeDropdownRef} className="relative">
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Listing type <span className="text-[#D4A373]">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setIsListingTypeDropdownOpen((prev) => !prev);
                                setIsPropertyTypeDropdownOpen(false);
                                setIsZoneLocationDropdownOpen(false);
                            }}
                            className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
                        >
                            <span
                                className={`text-[14px] font-[Regular] ${listingType ? "text-[#222]" : "text-[#707070]"}`}
                            >
                                {listingType || "Select listing type"}
                            </span>
                            <DownArrowIcon
                                width={11}
                                height={7}
                                className={`transition-transform shrink-0 ${isListingTypeDropdownOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {isListingTypeDropdownOpen && (
                            <div className="absolute top-[80px] left-0 w-full z-20 max-h-[160px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                {listingTypeOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            setListingType(option);
                                            setIsListingTypeDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${listingType === option ? "text-[#D4A373] bg-[#FDF2F2]" : "text-[#222]"}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {/* Property type */}
                    <div ref={propertyTypeDropdownRef} className="relative">
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Property type <span className="text-[#D4A373]">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setIsPropertyTypeDropdownOpen((prev) => !prev);
                                setIsListingTypeDropdownOpen(false);
                                setIsZoneLocationDropdownOpen(false);
                            }}
                            className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
                        >
                            <span
                                className={`text-[14px] font-[Regular] ${propertyType ? "text-[#222]" : "text-[#707070]"}`}
                            >
                                {propertyType || "Select property type"}
                            </span>
                            <DownArrowIcon
                                width={11}
                                height={7}
                                className={`transition-transform shrink-0 ${isPropertyTypeDropdownOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {isPropertyTypeDropdownOpen && (
                            <div className="absolute top-[80px] left-0 w-full z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                {propertyTypeOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            setPropertyType(option);
                                            setIsPropertyTypeDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${propertyType === option ? "text-[#D4A373] bg-[#FDF2F2]" : "text-[#222]"}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">
                            Amenities <span className="text-[#D4A373]">*</span>
                        </p>
                        <div className="max-h-[280px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                            {amenitiesList.map((amenity, idx) => {
                                const isActive = selectedAmenities.includes(amenity);
                                return (
                                    <button
                                        key={`${amenity}-${idx}`}
                                        type="button"
                                        onClick={() => toggleAmenity(amenity)}
                                        className={`min-h-[39px] rounded-full px-[12px] border text-left text-[12px] font-[Regular] inline-flex items-center gap-[6px] cursor-pointer transition-colors ${isActive
                                            ? "bg-[#222] text-white border-[#222]"
                                            : "bg-white text-[#222] border-[rgba(34,34,34,0.10)]"
                                            }`}
                                    >
                                        <span
                                            className={`h-[15px] w-[15px] rounded-full border flex shrink-0 items-center justify-center ${isActive
                                                ? "bg-[#D4A373] border-[#D4A373]"
                                                : "bg-white border-[rgba(34,34,34,0.20)]"
                                                }`}
                                        >
                                            {isActive && <TickIcon width={8} height={7} fill="#fff" />}
                                        </span>
                                        <span className="truncate">{amenity}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="bedrooms" className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Number of bedrooms <span className="text-[#D4A373]">*</span>
                        </label>
                        <input
                            id="bedrooms"
                            type="number"
                            min={0}
                            value={bedrooms}
                            onChange={(e) => setBedrooms(e.target.value)}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                        />
                    </div>

                    <label className="flex cursor-pointer items-center gap-3 text-[13px] font-[Regular] text-[#222]">
                        <input
                            type="checkbox"
                            checked={maidBedroom}
                            onChange={(e) => setMaidBedroom(e.target.checked)}
                            className="sr-only peer"
                        />
                        <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${maidBedroom
                                ? "border-[#D4A373] bg-[#D4A373]"
                                : "border-[rgba(34,34,34,0.25)] bg-white"
                                }`}
                        >
                            {maidBedroom && <TickIcon width={10} height={8} fill="#fff" />}
                        </span>
                        Maid bed room is available
                    </label>
                </div>

                {/* Column 2 */}
                <div className="md:p-[30px_0px_30px_0px] p-[20px_0px_20px_0px] flex flex-col gap-5 min-w-0">
                    <div>
                        <label htmlFor="bathrooms" className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Number of bathrooms <span className="text-[#D4A373]">*</span>
                        </label>
                        <input
                            id="bathrooms"
                            type="number"
                            min={0}
                            value={bathrooms}
                            onChange={(e) => setBathrooms(e.target.value)}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                        />
                    </div>

                    <div>
                        <p className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Area of the property <span className="text-[#D4A373]">*</span>
                        </p>
                        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-3">
                            {/* Area in square meters */}
                            <SuffixInput
                                label=""
                                value={areaSqm}
                                onChange={handleAreaSqmChange}
                                suffix="Sq.m"
                                type="text"
                                inputMode="numeric"
                            />
                            {/* Area in square feet */}
                            <SuffixInput
                                label=""
                                value={areaSqft}
                                onChange={handleAreaSqftChange}
                                suffix="Sq.ft"
                                type="text"
                                inputMode="decimal"
                            />
                        </div>
                    </div>

                    <div>
                        <p className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            DLD Permit number <span className="text-[#D4A373]">*</span>
                        </p>
                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                value={dldPermit}
                                onChange={(e) => setDldPermit(e.target.value)}
                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                            />
                            <input
                                type="url"
                                value={dldUrl}
                                onChange={(e) => setDldUrl(e.target.value)}
                                placeholder="Verification link"
                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-[13px] font-[Regular] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Monthly rental price */}
                    <SuffixInput
                        label="Monthly rental price"
                        required
                        value={monthlyRent}
                        onChange={handleMonthlyRentChange}
                        suffix="AED"
                        inputMode="numeric"
                    />
                    {/* Maintenance fees */}
                    <SuffixInput
                        label="Maintenance fees"
                        required
                        value={maintenancePct}
                        onChange={handleMaintenanceFeesChange}
                        suffix="%"
                        type="text"
                        inputMode="decimal"
                    />
                    {/* Monthly rental price secondary */}
                    <SuffixInput
                        label="Monthly rental price"
                        required
                        value={monthlyRentSecondary}
                        onChange={handleMonthlyRentSecondaryChange}
                        suffix="AED"
                        inputMode="numeric"
                    />
                    {/* Zone location */}
                    <div ref={zoneLocationDropdownRef} className="relative">
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                            Zone location <span className="text-[#D4A373]">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => {
                                setIsZoneLocationDropdownOpen((prev) => !prev);
                                setIsListingTypeDropdownOpen(false);
                                setIsPropertyTypeDropdownOpen(false);
                            }}
                            className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
                        >
                            <span className={`text-[14px] font-[Regular] ${zone ? "text-[#222]" : "text-[#707070]"}`}>
                                {zone || "Select zone location"}
                            </span>
                            <DownArrowIcon
                                width={11}
                                height={7}
                                className={`transition-transform shrink-0 ${isZoneLocationDropdownOpen ? "rotate-180" : ""}`}
                            />
                        </button>
                        {isZoneLocationDropdownOpen && (
                            <div className="absolute top-[80px] left-0 w-full z-20 max-h-[200px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                                {zoneLocationOptions.map((option) => (
                                    <button
                                        key={option}
                                        type="button"
                                        onMouseDown={(event) => {
                                            event.preventDefault();
                                            setZone(option);
                                            setIsZoneLocationDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${zone === option ? "text-[#D4A373] bg-[#FDF2F2]" : "text-[#222]"}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 3 — media */}
                <div className="flex flex-col min-w-0 h-full">
                    <section className="rounded-[10px] bg-[#F5F5F5] m-[4px_4px_0px_4px] min-w-0 flex flex-col">
                        <div className="md:p-[30px_20px_24px_20px] p-[20px_20px_16px_20px] flex items-center justify-between gap-3">
                            <h3 className="text-[14px] font-[SemiBold] text-[#222]">Uploaded images</h3>
                            <div className="flex shrink-0 items-center gap-[16px]">
                                <button
                                    type="button"
                                    aria-label="Previous images"
                                    disabled={!canPrevGallery}
                                    onClick={() => setGalleryPage((p) => Math.max(0, p - 1))}
                                    className="rotate-180 flex cursor-pointer items-center justify-center rounded-[8px] text-[#222] transition-colors hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                    <LeftArrowIcon width={8} height={14} fill="#222222" />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Next images"
                                    disabled={!canNextGallery}
                                    onClick={() =>
                                        setGalleryPage((p) => Math.min(totalGalleryPages - 1, p + 1))
                                    }
                                    className="flex cursor-pointer items-center justify-center rounded-[8px] text-[#222] transition-colors hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-35"
                                >
                                    <RightArrowIcon width={8} height={14} fill="#222222" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                            {visiblePhotos.map((item) => (
                                <div
                                    key={item.id}
                                    className="group relative aspect-square overflow-hidden rounded-[6px] bg-[#F0F0F0]"
                                >
                                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0 flex items-center justify-center gap-[5px] bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            type="button"
                                            aria-label="Replace image"
                                            onClick={() => {
                                                replaceTargetIdRef.current = item.id;
                                                replaceInputRef.current?.click();
                                            }}
                                            className="flex w-[28px] h-[28px] cursor-pointer items-center justify-center rounded-full bg-white shadow-sm"
                                        >
                                            <ChangeIcon width={15} height={15} fill="#222222" />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Delete image"
                                            onClick={() => removePhoto(item.id)}
                                            className="flex w-[28px] h-[28px] cursor-pointer items-center justify-center rounded-full bg-white shadow-sm"
                                        >
                                            <TrashIcon width={15} height={15} fill="#222222" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="md:p-[20px] p-[20px] flex flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => addPhotosInputRef.current?.click()}
                                className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-[SemiBold] text-[#222]"
                            >
                                <PlusIcon width={16} height={16} fill="#222222" />
                                Add Photo
                            </button>
                            <button
                                type="button"
                                onClick={deleteAllPhotos}
                                className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-[SemiBold] text-[#222]"
                            >
                                <TrashIcon width={18} height={18} />
                                Delete all
                            </button>
                        </div>

                        <input
                            ref={addPhotosInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                void onAddPhotos(e.target.files);
                                e.target.value = "";
                            }}
                        />
                        <input
                            ref={replaceInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                void replacePhoto(e.target.files?.[0]);
                                e.target.value = "";
                            }}
                        />
                    </section>

                    <section className="rounded-[15px] bg-[#F5F5F5] m-[4px_4px_4px_4px] h-full ">
                        <h3 className="md:p-[30px_0px_25px_0px] p-[20px_0px_20px_0px] text-center text-[14px] font-[SemiBold] text-[#222]">
                            Upload project video
                        </h3>
                        {videoSrc ? (
                            <div className="relative overflow-hidden rounded-[12px] bg-[#222]">
                                <video
                                    ref={videoRef}
                                    src={videoSrc}
                                    className="h-[200px] w-full cursor-pointer object-cover sm:h-[240px]"
                                    muted
                                    loop
                                    playsInline
                                    onClick={handlePauseVideo}
                                />
                                {!isVideoPlaying && (
                                    <button
                                        type="button"
                                        onClick={handlePlayVideo}
                                        className="absolute inset-0 flex items-center justify-center bg-black/25"
                                        aria-label="Play video"
                                    >
                                        <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full">
                                            <PlayIcon />
                                        </span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex h-[200px] items-center justify-center rounded-[12px] border border-dashed border-[rgba(34,34,34,0.15)] bg-[#FAFAFA] text-[13px] text-[#707070] sm:h-[240px]">
                                No video uploaded
                            </div>
                        )}

                        <div className="md:p-[20px] p-[20px] flex flex-wrap items-center justify-between gap-3">
                            <button
                                type="button"
                                onClick={() => videoInputRef.current?.click()}
                                className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-[SemiBold] text-[#222]"
                            >
                                <ChangeIcon width={14} height={14} />
                                Change
                            </button>
                            <button
                                type="button"
                                onClick={clearVideo}
                                className="inline-flex cursor-pointer items-center gap-2 text-[13px] font-[SemiBold] text-[#222]"
                            >
                                <TrashIcon width={18} height={18} />
                                Delete
                            </button>
                        </div>
                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                                void onVideoFile(e.target.files);
                                e.target.value = "";
                            }}
                        />
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PropertiesEditCommon;
