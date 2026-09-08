import React, { useRef, useState, useEffect, useCallback } from "react";
import Quill from "quill";
import { DownArrowIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";
import ImageSection, { type ImageSaveEntry } from "./propertycomponents/ImageSection";
import OtherDetails from "./propertycomponents/OtherDetails";
import PropertyAmenitiesSection from "./propertycomponents/PropertyAmenitiesSection";
import PropertyLocation from "./propertycomponents/PropertyLocation";
import PropertyMediaSection from "./propertycomponents/PropertyMediaSection";
import { propertiesService } from "../../../services/propertiesService";
import { useToast } from "../../../context/ToastContext";
import type {
    AmenityMasterItem,
    ListingTypeMasterItem,
    NamedValueMasterItem,
    PropertyTypeMasterItem,
} from "../../../types/api";
import "quill/dist/quill.snow.css";

const COMPLETION_STATUS_OPTIONS = [
    { name: "Ready", value: "ready" },
    { name: "Off-plan", value: "off-plan" },
];

type ListingDetailTabId = "details" | "additional";

function ListingPropertyDetail() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [searchParams] = useSearchParams();
    const propertyId = searchParams.get("id")?.trim() || "";

    const [pageLoading, setPageLoading] = useState(Boolean(propertyId));
    const [pageError, setPageError] = useState<string | null>(null);
    const [amenityOptions, setAmenityOptions] = useState<AmenityMasterItem[]>([]);
    const [selectedAmenityIds, setSelectedAmenityIds] = useState<string[]>([]);
    const [remoteImageUrls, setRemoteImageUrls] = useState<string[]>([]);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [virtualTour360, setVirtualTour360] = useState("");
    const [uploadedImageFiles, setUploadedImageFiles] = useState<File[]>([]);
    const [imageSaveEntries, setImageSaveEntries] = useState<ImageSaveEntry[]>([]);
    const [isImageGalleryDirty, setIsImageGalleryDirty] = useState(false);
    const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
    const [isVideoMarkedForRemoval, setIsVideoMarkedForRemoval] = useState(false);
    const [initialVirtualTour360, setInitialVirtualTour360] = useState("");
    const [isSavingImages, setIsSavingImages] = useState(false);
    const [isSavingMedia, setIsSavingMedia] = useState(false);
    const [readOnlyFields, setReadOnlyFields] = useState<Array<{ label: string; value: string }>>([]);
    const [activeTab, setActiveTab] = useState<ListingDetailTabId>("details");
    const [title, setTitle] = useState("");
    const [bedrooms, setBedrooms] = useState("");
    const [bathrooms, setBathrooms] = useState("");
    const [areaSqm, setAreaSqm] = useState("");
    const [areaSqft, setAreaSqft] = useState("");
    const [price, setPrice] = useState("");
    const [maintenanceFees, setMaintenanceFees] = useState("");
    const [serviceCharges, setServiceCharges] = useState("");
    const [dldPermitNumber, setDldPermitNumber] = useState("");
    const [dldPermitUrl, setDldPermitUrl] = useState("");
    const [monthlyRent, setMonthlyRent] = useState("");
    const [fullAddress, setFullAddress] = useState("");
    const [city, setCity] = useState("");
    const [zone, setZone] = useState("");
    const [building, setBuilding] = useState("");

    // Property Status Toggle States
    const [isPropertyActive, setIsPropertyActive] = useState(true);
    const [isFeatured, setIsFeatured] = useState(false);
    const [isVerified, setIsVerified] = useState(true);
    const [isPetFriendly, setIsPetFriendly] = useState(false);
    const [maidRoomAvailable, setMaidRoomAvailable] = useState(false);
    const [listingTypeOptions, setListingTypeOptions] = useState<ListingTypeMasterItem[]>([]);
    const [propertyTypeOptions, setPropertyTypeOptions] = useState<PropertyTypeMasterItem[]>([]);
    const [furnishedStatusOptions, setFurnishedStatusOptions] = useState<NamedValueMasterItem[]>([]);

    const [isListingTypeDropdownOpen, setIsListingTypeDropdownOpen] = useState(false);
    const [selectedListingTypeId, setSelectedListingTypeId] = useState("");

    const [isPropertyTypeDropdownOpen, setIsPropertyTypeDropdownOpen] = useState(false);
    const [selectedPropertyTypeId, setSelectedPropertyTypeId] = useState("");

    const [isCompletionStatusDropdownOpen, setIsCompletionStatusDropdownOpen] = useState(false);
    const [selectedCompletionStatus, setSelectedCompletionStatus] = useState("ready");

    const [isFurnishedStatusDropdownOpen, setIsFurnishedStatusDropdownOpen] = useState(false);
    const [selectedFurnishedStatus, setSelectedFurnishedStatus] = useState("");

    // Currency
    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
    const [selectedCurrency, setSelectedCurrency] = useState("AED");

    const listingTypeDropdownRef = useRef<HTMLDivElement>(null);
    const propertyTypeDropdownRef = useRef<HTMLDivElement>(null);
    const completionStatusDropdownRef = useRef<HTMLDivElement>(null);
    const furnishedStatusDropdownRef = useRef<HTMLDivElement>(null);
    const currencyDropdownRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<HTMLDivElement | null>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const [description, setDescription] = useState("");
    const [quill, setQuill] = useState<any>(null);
    const [hasHydratedDescription, setHasHydratedDescription] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const extractFilename = useCallback((value?: string | null) => {
        if (!value) return "";
        const trimmed = String(value).trim();
        if (!trimmed) return "";
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            const [withoutQuery] = trimmed.split("?");
            return withoutQuery.split("/").pop() || "";
        }
        return trimmed.includes("/") ? trimmed.split("/").pop() || "" : trimmed;
    }, []);

    const formatDateTime = useCallback((value?: string | null) => {
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
    }, []);

    const selectedListingTypeLabel =
        listingTypeOptions.find((item) => item._id === selectedListingTypeId)?.name?.trim() ||
        "Select listing type";
    const selectedPropertyTypeLabel =
        propertyTypeOptions.find((item) => item._id === selectedPropertyTypeId)?.name?.trim() ||
        "Select property type";
    const selectedFurnishedStatusLabel =
        furnishedStatusOptions.find((item) => item.value === selectedFurnishedStatus)?.name ||
        "Select furnished status";
    const selectedCompletionStatusLabel =
        COMPLETION_STATUS_OPTIONS.find((item) => item.value === selectedCompletionStatus)?.name ||
        "Select completion status";

    const selectedListingType = listingTypeOptions.find(
        (item) => item._id === selectedListingTypeId
    );
    const isRentListing = selectedListingType?.transaction === "rent";
    const tabs: { id: ListingDetailTabId; label: string }[] = [
        { id: "details", label: "Property Details" },
        { id: "additional", label: "Additional Details" },
    ];

    const toggleAmenity = useCallback((amenityId: string) => {
        setSelectedAmenityIds((prev) =>
            prev.includes(amenityId)
                ? prev.filter((id) => id !== amenityId)
                : [...prev, amenityId]
        );
    }, []);

    const handleVideoFileSelected = useCallback((file: File | null) => {
        if (!file) return;
        setSelectedVideoFile(file);
        setIsVideoMarkedForRemoval(false);
        setVideoPreviewUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
    }, []);

    const handleRemoveVideo = useCallback(() => {
        setSelectedVideoFile(null);
        setIsVideoMarkedForRemoval(true);
        setVideoPreviewUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return null;
        });
    }, []);

    const handleCancel = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    const handleSave = useCallback(async () => {
        if (!propertyId || isSaving) return;
        setIsSaving(true);
        try {
            const toOptionalNumber = (raw: string) => {
                const cleaned = String(raw ?? "")
                    .trim()
                    .replace(/[^0-9.-]/g, "");
                if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === "-.") {
                    return undefined;
                }
                const parsed = Number(cleaned);
                return Number.isFinite(parsed) ? parsed : undefined;
            };

            const payload: Record<string, unknown> = {
                title: title.trim(),
                description,
                listingType: selectedListingTypeId || undefined,
                propertyType: selectedPropertyTypeId || undefined,
                completionStatus: selectedCompletionStatus,
                furnishedStatus: selectedFurnishedStatus || undefined,
                bedrooms: toOptionalNumber(bedrooms),
                bathrooms: toOptionalNumber(bathrooms),
                maidBedroom: maidRoomAvailable,
                areaSqm: toOptionalNumber(areaSqm),
                areaSqft: toOptionalNumber(areaSqft),
                price: toOptionalNumber(price),
                currency: selectedCurrency || "AED",
                maintenanceFees: toOptionalNumber(maintenanceFees),
                serviceCharges: toOptionalNumber(serviceCharges),
                dldPermitNumber: dldPermitNumber.trim(),
                dldPermitUrl: dldPermitUrl.trim(),
                isActive: isPropertyActive,
                isFeatured,
                isVerified,
                isPetFriendly,
                amenities: selectedAmenityIds,
                location: {
                    fullAddress: fullAddress.trim(),
                    city: city.trim(),
                    zone: zone.trim(),
                    building: building.trim(),
                },
            };

            if (isRentListing) {
                payload.monthlyRentalPrice = toOptionalNumber(monthlyRent);
            }

            await propertiesService.updateProperty(propertyId, payload);
            push({
                type: "success",
                title: "Property updated",
                description: "Property details were saved successfully.",
            });
            navigate("/listingproperty");
        } catch (error) {
            push({
                type: "error",
                title: "Save failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Failed to update property details.",
            });
        } finally {
            setIsSaving(false);
        }
    }, [
        propertyId,
        isSaving,
        title,
        description,
        selectedListingTypeId,
        selectedPropertyTypeId,
        selectedCompletionStatus,
        selectedFurnishedStatus,
        bedrooms,
        bathrooms,
        maidRoomAvailable,
        areaSqm,
        areaSqft,
        price,
        selectedCurrency,
        maintenanceFees,
        serviceCharges,
        dldPermitNumber,
        dldPermitUrl,
        isPropertyActive,
        isFeatured,
        isVerified,
        isPetFriendly,
        selectedAmenityIds,
        fullAddress,
        city,
        zone,
        building,
        isRentListing,
        monthlyRent,
        push,
        navigate,
    ]);

    const handleSaveImages = useCallback(async () => {
        if (!propertyId || !isImageGalleryDirty || isSavingImages) return;
        setIsSavingImages(true);
        try {
            const localFiles = imageSaveEntries
                .filter((entry): entry is Extract<ImageSaveEntry, { kind: "local" }> => entry.kind === "local")
                .map((entry) => entry.file);

            let uploadRes:
                | Awaited<ReturnType<typeof propertiesService.uploadPropertyMedia>>
                | undefined;
            let uploadedNames: string[] = [];

            if (localFiles.length) {
                const formData = new FormData();
                localFiles.forEach((file) => formData.append("images", file));
                uploadRes = await propertiesService.uploadPropertyMedia(formData);
                uploadedNames = (uploadRes.uploads?.images ?? [])
                    .map((row) => extractFilename(row.filename || row.url || row.path))
                    .filter(Boolean);
            }

            const imageBase = uploadRes?.propertyUrl?.img || "http://localhost:5000/uploads/img/property/";
            let uploadedIndex = 0;
            const nextNames: string[] = [];
            const nextUrls: string[] = [];

            imageSaveEntries.forEach((entry) => {
                if (entry.kind === "remote") {
                    const name = extractFilename(entry.src);
                    if (!name) return;
                    nextNames.push(name);
                    nextUrls.push(entry.src);
                    return;
                }
                const name = uploadedNames[uploadedIndex++];
                if (!name) return;
                nextNames.push(name);
                nextUrls.push(`${imageBase.replace(/\/?$/, "/")}${name}`);
            });

            await propertiesService.updateProperty(propertyId, { images: nextNames });
            setRemoteImageUrls(nextUrls);
            setUploadedImageFiles([]);
            setIsImageGalleryDirty(false);
            push({
                type: "success",
                title: "Images updated",
                description: "Property images have been saved successfully.",
            });
        } catch (error) {
            push({
                type: "error",
                title: "Failed to save images",
                description:
                    error instanceof Error
                        ? error.message
                        : "Unable to update property images. Please try again.",
            });
        } finally {
            setIsSavingImages(false);
        }
    }, [propertyId, isImageGalleryDirty, isSavingImages, imageSaveEntries, extractFilename, push]);

    const handleSaveMedia = useCallback(async () => {
        if (!propertyId || isSavingMedia) return;
        const hasTourChanged = virtualTour360.trim() !== initialVirtualTour360.trim();
        if (!selectedVideoFile && !isVideoMarkedForRemoval && !hasTourChanged) return;
        setIsSavingMedia(true);
        try {
            let nextVideoName: string | undefined;
            let nextVideoUrl: string | null | undefined;
            if (selectedVideoFile) {
                const formData = new FormData();
                formData.append("video", selectedVideoFile);
                const uploadRes = await propertiesService.uploadPropertyMedia(formData);
                const uploaded = uploadRes.uploads?.videos?.[0];
                nextVideoName = extractFilename(uploaded?.filename || uploaded?.url || uploaded?.path);
                if (nextVideoName) {
                    const videoBase =
                        uploadRes.propertyUrl?.vid ||
                        "http://localhost:5000/uploads/vid/property/";
                    nextVideoUrl = `${videoBase.replace(/\/?$/, "/")}${nextVideoName}`;
                }
            }
            const payload: Record<string, unknown> = { virtualTour360: virtualTour360.trim() };
            if (isVideoMarkedForRemoval) payload.videoTour = "";
            if (selectedVideoFile) payload.videoTour = nextVideoName || "";
            await propertiesService.updateProperty(propertyId, payload);
            if (nextVideoUrl !== undefined) {
                setVideoPreviewUrl(nextVideoUrl ?? null);
                setSelectedVideoFile(null);
            }
            if (isVideoMarkedForRemoval) {
                setVideoPreviewUrl(null);
            }
            setIsVideoMarkedForRemoval(false);
            setInitialVirtualTour360(virtualTour360.trim());
            push({
                type: "success",
                title: "Media updated",
                description: "Video and 360 tour details have been saved successfully.",
            });
        } catch (error) {
            push({
                type: "error",
                title: "Failed to save media",
                description:
                    error instanceof Error
                        ? error.message
                        : "Unable to update media details. Please try again.",
            });
        } finally {
            setIsSavingMedia(false);
        }
    }, [
        propertyId,
        isSavingMedia,
        virtualTour360,
        initialVirtualTour360,
        selectedVideoFile,
        isVideoMarkedForRemoval,
        extractFilename,
        push,
    ]);

    const handleImageSaveEntriesChange = useCallback(
        (entries: ImageSaveEntry[], hasChanges: boolean) => {
            setImageSaveEntries(entries);
            setIsImageGalleryDirty(hasChanges);
        },
        []
    );

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        Promise.all([
            propertiesService.getPropertyClassificationMasterData(controller.signal),
            propertiesService.listAmenities(controller.signal),
        ])
            .then(([classification, amenities]) => {
                if (!mounted) return;
                const { listingTypes, propertyTypes, furnishedStatus } = classification;
                setListingTypeOptions(listingTypes);
                setPropertyTypeOptions(propertyTypes);
                setFurnishedStatusOptions(furnishedStatus);
                setAmenityOptions(amenities);
                if (!propertyId) {
                    setSelectedListingTypeId((prev) => prev || listingTypes[0]?._id || "");
                    setSelectedPropertyTypeId((prev) => prev || propertyTypes[0]?._id || "");
                    setSelectedFurnishedStatus(
                        (prev) => prev || furnishedStatus[0]?.value || ""
                    );
                }
            })
            .catch(() => {
                if (!mounted) return;
                setListingTypeOptions([]);
                setPropertyTypeOptions([]);
                setFurnishedStatusOptions([]);
                setAmenityOptions([]);
            });

        return () => {
            mounted = false;
            controller.abort();
        };
    }, [propertyId]);

    useEffect(() => {
        if (!propertyId) {
            setPageLoading(false);
            setPageError(null);
            return;
        }

        let mounted = true;
        const controller = new AbortController();
        setPageLoading(true);
        setPageError(null);

        Promise.all([
            propertiesService.getPropertyById(propertyId, controller.signal),
            propertiesService.getSupportedUrls(controller.signal),
        ])
            .then(([{ property }, supported]) => {
                if (!mounted) return;

                const imgBase = supported.supportedUrls?.propertyUrl?.img ?? "";
                const vidBase = supported.supportedUrls?.propertyUrl?.vid ?? "";

                setTitle(property.title ?? "");
                setDescription(property.description ?? "");
                setHasHydratedDescription(false);
                setSelectedListingTypeId(property.listingType?._id ?? "");
                setSelectedPropertyTypeId(property.propertyType?._id ?? "");
                setSelectedCompletionStatus(property.completionStatus ?? "ready");
                setSelectedFurnishedStatus(property.furnishedStatus ?? "");
                setBedrooms(
                    property.bedrooms != null ? String(property.bedrooms) : ""
                );
                setBathrooms(
                    property.bathrooms != null ? String(property.bathrooms) : ""
                );
                setMaidRoomAvailable(Boolean(property.maidBedroom));
                setAreaSqm(
                    property.area?.sqm != null ? String(property.area.sqm) : ""
                );
                setAreaSqft(
                    property.area?.sqft != null ? String(property.area.sqft) : ""
                );
                setPrice(property.price != null ? String(property.price) : "");
                setSelectedCurrency(property.currency ?? "AED");
                setMaintenanceFees(
                    property.maintenanceFees != null
                        ? String(property.maintenanceFees)
                        : ""
                );
                setServiceCharges(
                    property.serviceCharges != null
                        ? String(property.serviceCharges)
                        : ""
                );
                setDldPermitNumber(property.dldPermitNumber ?? "");
                setDldPermitUrl(property.dldPermitUrl ?? "");
                setMonthlyRent(
                    property.rentPricing?.monthly != null
                        ? String(property.rentPricing.monthly)
                        : ""
                );
                setFullAddress(property.location?.fullAddress ?? "");
                setCity(property.location?.city ?? "");
                setZone(property.location?.zone ?? "");
                setBuilding(property.location?.building ?? "");
                setIsPropertyActive(property.isActive !== false);
                setIsFeatured(Boolean(property.isFeatured));
                setIsVerified(property.isVerified !== false);
                setIsPetFriendly(Boolean(property.isPetFriendly));
                setSelectedAmenityIds(
                    (property.amenities ?? []).map((a) => String(a._id))
                );
                setVirtualTour360(property.virtualTour360 ?? "");
                setInitialVirtualTour360(property.virtualTour360 ?? "");
                setUploadedImageFiles([]);
                setSelectedVideoFile(null);
                setIsVideoMarkedForRemoval(false);
                const resolvedImages = (property.images ?? [])
                    .map((img) => {
                        const url = img?.url?.trim();
                        if (!url) return "";
                        if (/^https?:\/\//i.test(url)) return url;
                        const base = (imgBase || "").replace(/\/$/, "");
                        const path = url.replace(/^\//, "");
                        return base ? `${base}/${path}` : url;
                    })
                    .filter(Boolean);
                setRemoteImageUrls(resolvedImages);

                const videoUrlRaw = property.videoTour?.trim() || "";
                const videoUrl = (() => {
                    if (!videoUrlRaw) return "";
                    if (/^https?:\/\//i.test(videoUrlRaw)) return videoUrlRaw;
                    const base = (vidBase || "").replace(/\/$/, "");
                    const path = videoUrlRaw.replace(/^\//, "");
                    return base ? `${base}/${path}` : videoUrlRaw;
                })();
                setVideoPreviewUrl(videoUrl || null);

                const p = property as Record<string, unknown>;
                const locationObj = (property.location ?? {}) as Record<string, unknown>;
                const coordinatesObj = (locationObj.coordinates ?? {}) as Record<string, unknown>;
                const coordinates = Array.isArray(coordinatesObj.coordinates)
                    ? coordinatesObj.coordinates
                    : [];
                const featuredObj = (p.featured ?? {}) as Record<string, unknown>;
                const dealInfoObj = (p.dealInfo ?? {}) as Record<string, unknown>;
                const dealCustomerObj = (dealInfoObj.customer ?? {}) as Record<string, unknown>;
                const agentObj = (property.agent ?? {}) as Record<string, unknown>;
                const agencyObj = (property.agency ?? {}) as Record<string, unknown>;

                const toText = (value: unknown) => {
                    if (value == null || value === "") return "—";
                    if (typeof value === "boolean") return value ? "Yes" : "No";
                    if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
                    return String(value);
                };

                setReadOnlyFields([
                    { label: "Property ID", value: toText(property._id) },
                    { label: "Slug", value: toText(property.slug) },
                    { label: "Reference ID", value: toText(p.referenceId) },
                    { label: "Status", value: toText(property.status) },
                    { label: "Agent ID", value: toText(agentObj._id) },
                    { label: "Agent Name", value: toText(agentObj.fullName ?? agentObj.name) },
                    { label: "Agent Email", value: toText(agentObj.email) },
                    { label: "Agent Phone", value: toText(agentObj.phoneNumber) },
                    { label: "Agency ID", value: toText(agencyObj._id) },
                    { label: "Agency Name", value: toText(agencyObj.agencyName ?? agencyObj.name) },
                    { label: "Agency Email", value: toText(agencyObj.email) },
                    { label: "Google Place ID", value: toText(locationObj.googlePlaceId) },
                    { label: "Latitude", value: toText(coordinates[1]) },
                    { label: "Longitude", value: toText(coordinates[0]) },
                    { label: "Is Waterfront", value: toText(p.isWaterfront) },
                    { label: "Is Superagent Listing", value: toText(p.isSuperagentListing) },
                    { label: "Featured Priority", value: toText(featuredObj.priority) },
                    { label: "Featured Until", value: formatDateTime(featuredObj.featuredUntil as string | undefined) },
                    { label: "Meta Title", value: toText(p.metaTitle) },
                    { label: "Meta Description", value: toText(p.metaDescription) },
                    { label: "Meta Keywords", value: toText(p.metaKeywords as unknown) },
                    { label: "Published At", value: formatDateTime(property.publishedAt) },
                    { label: "Created At", value: formatDateTime(property.createdAt) },
                    { label: "Updated At", value: formatDateTime(p.updatedAt as string | undefined) },
                    { label: "Last Modified At", value: formatDateTime(p.lastModifiedAt as string | undefined) },
                    { label: "Deactivated At", value: formatDateTime(p.deactivatedAt as string | undefined) },
                    { label: "Views", value: toText(p.views) },
                    { label: "Likes", value: toText(p.likes) },
                    { label: "Inquiries", value: toText(p.inquiries) },
                    { label: "Shares", value: toText(p.shares) },
                    { label: "Contact Count", value: toText(p.contactCount) },
                    { label: "Last Contacted At", value: formatDateTime(p.lastContactedAt as string | undefined) },
                    { label: "Report Count", value: toText(p.reportCount) },
                    { label: "Is Flagged", value: toText(p.isFlagged) },
                    { label: "Flagged Reason", value: toText(p.flaggedReason) },
                    { label: "Flagged At", value: formatDateTime(p.flaggedAt as string | undefined) },
                    { label: "Deal Type", value: toText(dealInfoObj.dealType) },
                    { label: "Deal Amount", value: toText(dealInfoObj.dealAmount) },
                    { label: "Deal Closed Date", value: formatDateTime(dealInfoObj.dealClosedDate as string | undefined) },
                    { label: "Deal Customer Name", value: toText(dealCustomerObj.name) },
                    { label: "Deal Customer Email", value: toText(dealCustomerObj.email) },
                    { label: "Deal Customer Phone", value: toText(dealCustomerObj.phone) },
                    { label: "Allocation Ref", value: toText(p.allocationRef) },
                ]);
            })
            .catch((err: unknown) => {
                if (!mounted) return;
                const message =
                    err instanceof Error ? err.message : "Failed to load property";
                setPageError(message);
                setReadOnlyFields([]);
            })
            .finally(() => {
                if (mounted) setPageLoading(false);
            });

        return () => {
            mounted = false;
            controller.abort();
        };
    }, [propertyId, formatDateTime]);

    useEffect(() => {
        if (activeTab !== "details") return;
        if (pageLoading || pageError || quill || !quillRef.current) return;

        try {
            // Clear stale DOM from prior mounts before creating a fresh instance.
            quillRef.current.innerHTML = "";
            const instance = new Quill(quillRef.current, {
                theme: "snow",
                modules: {
                    toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ["bold", "italic", "underline"],
                        [{ list: "ordered" }, { list: "bullet" }],
                        ["link"],
                        ["clean"],
                    ],
                },
            });
            setQuill(instance);
        } catch {
            setQuill(null);
        }
    }, [activeTab, pageLoading, pageError, quill]);

    useEffect(() => {
        return () => {
            setQuill(null);
        };
    }, []);

    useEffect(() => {
        // Details tab is conditionally rendered. When we leave it, the editor DOM unmounts,
        // so we must reset the instance and allow clean re-initialization on return.
        if (activeTab !== "details") {
            setQuill(null);
            setHasHydratedDescription(false);
        }
    }, [activeTab]);

    const insertImageFromFile = (file: File) => {
        if (!quill) return;
        if (!file.type.startsWith("image/")) return;

        const reader = new FileReader();
        reader.onload = () => {
            const range = quill.getSelection(true);
            const index = range ? range.index : quill.getLength();
            const src = String(reader.result);
            quill.insertEmbed(index, "image", src, "user");
            quill.setSelection(index + 1, 0, "user");
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        if (activeTab !== "details") return;
        if (!quill) return;

        // Hydrate once from API so we don't overwrite user edits afterward.
        if (!hasHydratedDescription && quill.root.innerHTML !== description) {
            quill.clipboard?.dangerouslyPasteHTML?.(description || "");
            setHasHydratedDescription(true);
        }

        const onTextChange = () => {
            setDescription(quill.root.innerHTML);
        };
        quill.on("text-change", onTextChange);

        try {
            const toolbar = quill.getModule("toolbar");
            toolbar?.addHandler?.("image", () => {
                imageInputRef.current?.click();
            });
        } catch {
            // toolbar module may not be ready yet
        }

        return () => {
            quill.off("text-change", onTextChange);
        };
    }, [activeTab, quill, description, hasHydratedDescription]);

    useEffect(() => {
        const input = imageInputRef.current;
        if (!input) return;

        const onChange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) insertImageFromFile(file);
            target.value = "";
        };

        input.addEventListener("change", onChange);
        return () => input.removeEventListener("change", onChange);
    }, [quill]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                listingTypeDropdownRef.current &&
                !listingTypeDropdownRef.current.contains(event.target as Node)
            ) {
                setIsListingTypeDropdownOpen(false);
            }
            if (
                propertyTypeDropdownRef.current &&
                !propertyTypeDropdownRef.current.contains(event.target as Node)
            ) {
                setIsPropertyTypeDropdownOpen(false);
            }
            if (
                completionStatusDropdownRef.current &&
                !completionStatusDropdownRef.current.contains(event.target as Node)
            ) {
                setIsCompletionStatusDropdownOpen(false);
            }
            if (
                furnishedStatusDropdownRef.current &&
                !furnishedStatusDropdownRef.current.contains(event.target as Node)
            ) {
                setIsFurnishedStatusDropdownOpen(false);
            }
            if (
                currencyDropdownRef.current &&
                !currencyDropdownRef.current.contains(event.target as Node)
            ) {
                setIsCurrencyDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    if (!propertyId) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <Header
                    title="Listing Property Detail"
                    showBack={true}
                    onBackClick={() => navigate(-1)}
                />
                <div className="mt-[20px] rounded-[12px] border border-[#EAEAEA] bg-white p-[24px] text-center">
                    <p className="text-[14px] text-[#707070]">
                        Open a property from the listing table to view its details.
                    </p>
                </div>
            </div>
        );
    }

    if (pageLoading) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <Header
                    title="Listing Property Detail"
                    showBack={true}
                    onBackClick={() => navigate(-1)}
                />
                <div className="mt-[40px] flex justify-center">
                    <Loader size={80} margin="0" />
                </div>
            </div>
        );
    }

    if (pageError) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <Header
                    title="Listing Property Detail"
                    showBack={true}
                    onBackClick={() => navigate(-1)}
                />
                <div className="mt-[20px] rounded-[12px] border border-[#EAEAEA] bg-white p-[24px] text-center">
                    <p className="text-[14px] text-[#EA3934] mb-[12px]">{pageError}</p>
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="text-[13px] font-[SemiBold] text-[#0832AE]"
                    >
                        Back to listings
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">

            {/* Header */}
            <Header
                title={"Listing Property Details"}
                showBack={true}
                onBackClick={() => navigate(-1)}
            />

            {/* Main Content */}
            <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
                <div className="rounded-t-[12px] border-b border-[rgba(34,34,34,0.08)] overflow-x-auto">
                    <div className="min-w-max flex items-center gap-[4px] mt-[8px]">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`cursor-pointer p-[16px_24px] border-b-2 text-[13px] font-[SemiBold] whitespace-nowrap transition-colors ${isActive ? "text-[#0832AE] border-[#0832AE]" : "text-[#222] border-transparent"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Grid */}

                <div className="space-y-[25px]">
                    {activeTab === "details" && (
                        <>

                    {/* ================= Basic Information ================= */}

                    <div className="bg-white rounded-[12px] p-[20px] border border-[#EAEAEA]">
                        <h3 className="text-[18px] font-[Bold] text-[#222] mb-[20px]">
                            Basic Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[20px]">
                            {/* Title */}
                            <div className="md:col-span-2 xl:col-span-3">
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Property Title
                                </label>

                                <input
                                    type="text"
                                    placeholder="Enter Property Title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                            {/* Slug */}
                            {/* <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Slug
                                </label>

                                <input
                                    type="text"
                                    placeholder="property-slug"
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div> */}

                            {/* Meta Title */}
                            {/* <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Meta Title
                                </label>

                                <input
                                    type="text"
                                    placeholder="Enter Meta Title"
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div> */}

                            {/* Description */}
                            <div className="md:col-span-2 xl:col-span-3">
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Description
                                </label>

                                <div className="h-[320px] border border-[rgba(34,34,34,0.10)] rounded-[12px] overflow-hidden bg-white">
                                    <style>
                                        {`
                                            .custom-quill .ql-editor img {
                                                max-width: 100%;
                                                height: auto;
                                            }
                                        `}
                                    </style>
                                    <div ref={quillRef} className="custom-quill h-[220px]" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ================= Property Classification ================= */}
                    <div className="bg-white rounded-[12px] p-[20px] border border-[#EAEAEA]">
                        <h3 className="text-[18px] font-[Bold] text-[#222] mb-[20px]">
                            Property Classification
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[20px]">

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Listing Type
                                </label>

                                <div className="relative w-full" ref={listingTypeDropdownRef}>
                                    <div onClick={() => setIsListingTypeDropdownOpen(!isListingTypeDropdownOpen)} className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none" >
                                        <h4 className="text-[13px] font-[Medium] text-[#222] truncate">
                                            {selectedListingTypeLabel}
                                        </h4>
                                        <DownArrowIcon className={`mt-[2px] transition-transform ${isListingTypeDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
                                    </div>

                                    {isListingTypeDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 overflow-hidden py-[8px] max-h-[220px] overflow-y-auto">
                                            {listingTypeOptions.length === 0 ? (
                                                <p className="px-[14px] py-[10px] text-[13px] text-[#707070]">
                                                    No listing types
                                                </p>
                                            ) : (
                                                listingTypeOptions.map((type) => (
                                                    <div
                                                        key={type._id}
                                                        className={`flex items-center px-[14px] py-[10px] cursor-pointer hover:bg-[#F5F5F5] ${selectedListingTypeId === type._id ? "bg-[#F5F5F5]" : ""}`}
                                                        onClick={() => {
                                                            setSelectedListingTypeId(type._id);
                                                            setIsListingTypeDropdownOpen(false);
                                                        }}
                                                    >
                                                        <span className="text-[13px] font-[Medium] text-[#222]">
                                                            {type.name || "—"}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Property Type
                                </label>

                                <div className="relative w-full" ref={propertyTypeDropdownRef} >
                                    <div onClick={() => setIsPropertyTypeDropdownOpen(!isPropertyTypeDropdownOpen)} className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none" >
                                        <h4 className="text-[13px] font-[Medium] text-[#222] truncate">
                                            {selectedPropertyTypeLabel}
                                        </h4>
                                        <DownArrowIcon className={`mt-[2px] transition-transform ${isPropertyTypeDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
                                    </div>

                                    {isPropertyTypeDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 overflow-hidden py-[8px] max-h-[220px] overflow-y-auto">
                                            {propertyTypeOptions.length === 0 ? (
                                                <p className="px-[14px] py-[10px] text-[13px] text-[#707070]">
                                                    No property types
                                                </p>
                                            ) : (
                                                propertyTypeOptions.map((type) => (
                                                    <div
                                                        key={type._id}
                                                        className={`flex items-center px-[14px] py-[10px] cursor-pointer hover:bg-[#F5F5F5] ${selectedPropertyTypeId === type._id ? "bg-[#F5F5F5]" : ""}`}
                                                        onClick={() => {
                                                            setSelectedPropertyTypeId(type._id);
                                                            setIsPropertyTypeDropdownOpen(false);
                                                        }}
                                                    >
                                                        <span className="text-[13px] font-[Medium] text-[#222]">
                                                            {type.name || "—"}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Completion Status
                                </label>

                                <div className="relative w-full" ref={completionStatusDropdownRef}>
                                    {/* Selected */}
                                    <div className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none" onClick={() => setIsCompletionStatusDropdownOpen(!isCompletionStatusDropdownOpen)}>
                                        <h4 className="text-[13px] font-[Medium] text-[#222] truncate">
                                            {selectedCompletionStatusLabel}
                                        </h4>

                                        <DownArrowIcon className={`mt-[2px] transition-transform ${isCompletionStatusDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
                                    </div>

                                    {isCompletionStatusDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 overflow-hidden py-[8px]">
                                            {COMPLETION_STATUS_OPTIONS.map((option) => (
                                                <div
                                                    key={option.value}
                                                    className={`flex items-center px-[14px] py-[10px] cursor-pointer hover:bg-[#F5F5F5] ${selectedCompletionStatus === option.value ? "bg-[#F5F5F5]" : ""}`}
                                                    onClick={() => {
                                                        setSelectedCompletionStatus(option.value);
                                                        setIsCompletionStatusDropdownOpen(false);
                                                    }}
                                                >
                                                    <span className="text-[13px] font-[Medium] text-[#222]">
                                                        {option.name}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Furnished Status
                                </label>

                                <div className="relative w-full" ref={furnishedStatusDropdownRef}>
                                    {/* Selected */}
                                    <div className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none" onClick={() => setIsFurnishedStatusDropdownOpen(!isFurnishedStatusDropdownOpen)}>
                                        <h4 className="text-[13px] font-[Medium] text-[#222] truncate">
                                            {selectedFurnishedStatusLabel}
                                        </h4>

                                        <DownArrowIcon className={`mt-[2px] transition-transform ${isFurnishedStatusDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
                                    </div>

                                    {isFurnishedStatusDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 overflow-hidden py-[8px] max-h-[220px] overflow-y-auto">
                                            {furnishedStatusOptions.length === 0 ? (
                                                <p className="px-[14px] py-[10px] text-[13px] text-[#707070]">
                                                    No furnished options
                                                </p>
                                            ) : (
                                                furnishedStatusOptions.map((option) => (
                                                    <div
                                                        key={option.value}
                                                        className={`flex items-center px-[14px] py-[10px] cursor-pointer hover:bg-[#F5F5F5] ${selectedFurnishedStatus === option.value ? "bg-[#F5F5F5]" : ""}`}
                                                        onClick={() => {
                                                            setSelectedFurnishedStatus(option.value);
                                                            setIsFurnishedStatusDropdownOpen(false);
                                                        }}
                                                    >
                                                        <span className="text-[13px] font-[Medium] text-[#222]">
                                                            {option.name}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* ================= Property Details ================= */}
                    <div className="bg-white rounded-[12px] p-[20px] border border-[#EAEAEA]">
                        <h3 className="text-[18px] font-[Bold] text-[#222] mb-[20px]">
                            Property Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[20px]">

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Bedrooms
                                </label>

                                <input
                                    type="number"
                                    placeholder="2"
                                    value={bedrooms}
                                    onChange={(e) => setBedrooms(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                                <label className="mt-[8px] inline-flex items-center gap-[8px] cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={maidRoomAvailable}
                                        onChange={(event) => setMaidRoomAvailable(event.target.checked)}
                                        className="h-[13px] w-[13px] rounded border border-[rgba(34,34,34,0.20)]"
                                    />
                                    <span className="text-[12px] font-[Regular] text-[#707070]">Maid bedroom is available</span>
                                </label>
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Bathrooms
                                </label>

                                <input
                                    type="number"
                                    placeholder="2"
                                    value={bathrooms}
                                    onChange={(e) => setBathrooms(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Area SQM
                                </label>

                                <input
                                    type="number"
                                    placeholder="1500"
                                    value={areaSqm}
                                    onChange={(e) => setAreaSqm(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Area SQFT
                                </label>

                                <input
                                    type="number"
                                    placeholder="1800"
                                    value={areaSqft}
                                    onChange={(e) => setAreaSqft(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                        </div>
                    </div>

                    <PropertyAmenitiesSection
                        amenities={amenityOptions}
                        selectedAmenityIds={selectedAmenityIds}
                        onToggleAmenity={toggleAmenity}
                    />

                    {/* ================= Pricing ================= */}
                    <div className="bg-white rounded-[12px] p-[20px] border border-[#EAEAEA]">
                        <h3 className="text-[18px] font-[Bold] text-[#222] mb-[20px]">
                            Pricing
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[20px]">

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Price
                                </label>

                                <input
                                    type="number"
                                    placeholder="250000"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Currency
                                </label>

                                <div
                                    className="relative w-full"
                                    ref={currencyDropdownRef}
                                >
                                    {/* Selected */}
                                    <div className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none" onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}>
                                        <h4 className="text-[13px] font-[Medium] text-[#222] truncate">
                                            {selectedCurrency}
                                        </h4>

                                        <DownArrowIcon className={`mt-[2px] transition-transform ${isCurrencyDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
                                    </div>

                                    {/* Dropdown */}
                                    {isCurrencyDropdownOpen && (
                                        <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 overflow-hidden py-[8px]">
                                            {["AED"].map((type) => (
                                                <div
                                                    key={type} className={`flex items-center px-[14px] py-[10px] cursor-pointer hover:bg-[#F5F5F5] ${selectedCurrency === type ? "bg-[#F5F5F5]" : ""}`}
                                                    onClick={() => {
                                                        setSelectedCurrency(type);
                                                        setIsCurrencyDropdownOpen(
                                                            false
                                                        );
                                                    }}
                                                >
                                                    <span className="text-[13px] font-[Medium] text-[#222]">
                                                        {type}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Maintenance Fees
                                </label>

                                <input
                                    type="number"
                                    placeholder="Enter Maintenance Fees"
                                    value={maintenanceFees}
                                    onChange={(e) => setMaintenanceFees(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Service Charges
                                </label>

                                <input
                                    type="number"
                                    placeholder="Enter Service Charges"
                                    value={serviceCharges}
                                    onChange={(e) => setServiceCharges(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                        </div>
                    </div>

                    {/* ================= Property Status ================= */}
                    <div className="bg-white rounded-[12px] p-[20px] border border-[#EAEAEA]">
                        <h3 className="text-[18px] font-[Bold] text-[#222] mb-[20px]">
                            Property Status
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[20px]">

                            {/* Property Active */}
                            <div className="flex items-center justify-between border border-[#EAEAEA] rounded-[10px] px-[14px] h-[44px]">
                                <span className="text-[13px] font-[Medium] text-[#222]">
                                    Property Active
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setIsPropertyActive(!isPropertyActive)}
                                    className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isPropertyActive ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"
                                        }`}
                                >
                                    <span
                                        className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isPropertyActive ? "left-[22px]" : "left-[2px]"
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Featured */}
                            <div className="flex items-center justify-between border border-[#EAEAEA] rounded-[10px] px-[14px] h-[44px]">
                                <span className="text-[13px] font-[Medium] text-[#222]">
                                    Featured
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setIsFeatured(!isFeatured)}
                                    className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isFeatured ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"
                                        }`}
                                >
                                    <span
                                        className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isFeatured ? "left-[22px]" : "left-[2px]"
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Verified */}
                            <div className="flex items-center justify-between border border-[#EAEAEA] rounded-[10px] px-[14px] h-[44px]">
                                <span className="text-[13px] font-[Medium] text-[#222]">
                                    Verified
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setIsVerified(!isVerified)}
                                    className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isVerified ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"
                                        }`}
                                >
                                    <span
                                        className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isVerified ? "left-[22px]" : "left-[2px]"
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Pet Friendly */}
                            <div className="flex items-center justify-between border border-[#EAEAEA] rounded-[10px] px-[14px] h-[44px]">
                                <span className="text-[13px] font-[Medium] text-[#222]">
                                    Pet Friendly
                                </span>

                                <button
                                    type="button"
                                    onClick={() => setIsPetFriendly(!isPetFriendly)}
                                    className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isPetFriendly ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"
                                        }`}
                                >
                                    <span
                                        className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isPetFriendly ? "left-[22px]" : "left-[2px]"
                                            }`}
                                    />
                                </button>
                            </div>

                        </div>
                    </div>
                    {/* ================= Location ================= */}
                    <div className="bg-white rounded-[12px] p-[20px] border border-[#EAEAEA]">
                        <h3 className="text-[18px] font-[Bold] text-[#222] mb-[20px]">
                            Location
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[20px]">

                            <div className="md:col-span-2 xl:col-span-3">
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Full Address
                                </label>

                                <textarea
                                    placeholder="Enter Full Address"
                                    value={fullAddress}
                                    onChange={(e) => setFullAddress(e.target.value)}
                                    className="w-full h-[120px] rounded-[10px] border border-[#EAEAEA] px-[14px] py-[12px] text-[13px] resize-none focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    City
                                </label>

                                <input
                                    type="text"
                                    placeholder="Dubai"
                                    value={city}
                                    onChange={(e) => setCity(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Zone
                                </label>

                                <input
                                    type="text"
                                    placeholder="Business Bay"
                                    value={zone}
                                    onChange={(e) => setZone(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Building
                                </label>

                                <input
                                    type="text"
                                    placeholder="Tower A"
                                    value={building}
                                    onChange={(e) => setBuilding(e.target.value)}
                                    className="h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
                                />
                            </div>

                        </div>
                    </div>

                    <PropertyMediaSection
                        videoPreviewUrl={videoPreviewUrl}
                        virtualTour360={virtualTour360}
                        onVirtualTour360Change={setVirtualTour360}
                        onVideoFileSelected={handleVideoFileSelected}
                        onRemoveVideo={handleRemoveVideo}
                        onSaveMedia={handleSaveMedia}
                        isSavingMedia={isSavingMedia}
                    />

                    <ImageSection
                        remoteImageUrls={remoteImageUrls}
                        onLocalFilesChange={setUploadedImageFiles}
                        onSaveEntriesChange={handleImageSaveEntriesChange}
                        onSaveImages={handleSaveImages}
                        isSavingImages={isSavingImages}
                        disableSaveImages={!isImageGalleryDirty}
                    />

                    <OtherDetails
                        dldPermitNumber={dldPermitNumber}
                        dldPermitUrl={dldPermitUrl}
                        onDldPermitNumberChange={setDldPermitNumber}
                        onDldPermitUrlChange={setDldPermitUrl}
                        showMonthlyRent={isRentListing}
                        monthlyRent={monthlyRent}
                        onMonthlyRentChange={setMonthlyRent}
                        maintenanceFees={maintenanceFees}
                        onMaintenanceFeesChange={setMaintenanceFees}
                        serviceCharges={serviceCharges}
                        onServiceChargesChange={setServiceCharges}
                    />

                    <PropertyLocation
                        zone={zone}
                        city={city}
                        fullAddress={fullAddress}
                        onZoneChange={setZone}
                        onCityChange={setCity}
                        onFullAddressChange={setFullAddress}
                    />
                        </>
                    )}

                    {activeTab === "additional" && (
                    <div className="bg-white rounded-[12px] p-[20px] border border-[#EAEAEA] mt-[20px]">
                        <h3 className="text-[18px] font-[Bold] text-[#222] mb-[20px]">
                            Additional Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[14px]">
                            {readOnlyFields.map((field) => (
                                <div key={field.label}>
                                    <label className="block text-[13px] font-[SemiBold] text-[#222] mb-[6px]">
                                        {field.label}
                                    </label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={field.value}
                                        className="h-[42px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-[#F9FAFB] px-[12px] text-[12px] font-[Medium] text-[#707070] focus:outline-none"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    )}
                </div>
            </div>
            {activeTab === "details" && (
            <div className="mt-[24px] flex items-center justify-end gap-[12px]">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="h-[42px] px-[20px] rounded-[10px] border border-[rgba(34,34,34,0.10)] text-[#222] text-[14px] font-[Medium] hover:bg-[#F5F5F5] transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || pageLoading}
                        className={`h-[42px] px-[24px] rounded-[10px] text-[#fff] text-[14px] font-[SemiBold] transition-all ${isSaving || pageLoading
                                ? "bg-[#6A3CA899] cursor-not-allowed"
                                : "bg-[#6A3CA8] hover:opacity-90"
                            }`}
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
            </div>
            )}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
            />
        </div>
    );
}

export default ListingPropertyDetail;