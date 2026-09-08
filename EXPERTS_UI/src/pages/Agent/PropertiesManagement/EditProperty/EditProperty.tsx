import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { agentService } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";
import EditPropertyTypeStep from "./EditPropertyTypeStep";
import EditPropertyMedia from "./EditPropertyMedia";
import EditOtherDetails from "./EditOtherDetails";
import EditLocation from "./EditLocation";
import type { PropertyDetailsFormValue } from "../AddProperty/AddProjectComponents/PropertyDetailsStep";
import type { PropertyMediaUploadFormValue, PropertyMediaUploadPreviewValue } from "../AddProperty/AddProjectComponents/PropertyMediaUpload";
import type { OtherDetailsFormValue } from "../AddProperty/AddProjectComponents/OtherDetailsStep";
import type { PropertyLocationFormValue } from "../AddProperty/AddProjectComponents/LocationAdd";

type EditTabId = "status" | "media" | "other" | "location";

const EditProperty = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const propertyId = String((location.state as { propertyId?: string } | null)?.propertyId || "").trim();

    const [activeTab, setActiveTab] = useState<EditTabId>("status");
    const [listingTypeId, setListingTypeId] = useState("");
    const [propertyTypeId, setPropertyTypeId] = useState("");
    const [listingTransaction, setListingTransaction] = useState("");
    const [propertyDetails, setPropertyDetails] = useState<PropertyDetailsFormValue>({
        propertyTitle: "",
        propertyAddress: "",
        propertyAddressPlaceId: "",
        propertyDescription: "",
        amenityIds: [],
    });
    const [locationDetails, setLocationDetails] = useState<PropertyLocationFormValue>({
        zone: "",
        city: "",
        latitude: "",
        longitude: "",
        searchLocation: "",
        formattedAddress: "",
        placeId: "",
    });
    const [mediaUpload, setMediaUpload] = useState<PropertyMediaUploadFormValue>({
        propertyImages: [],
        propertyVideo: null,
        virtualTourLink: "",
    });
    const [uploadedMedia, setUploadedMedia] = useState<{ images: string[]; videoTour: string | null; virtualTour360: string }>({
        images: [],
        videoTour: null,
        virtualTour360: "",
    });
    const [uploadedMediaSignature, setUploadedMediaSignature] = useState<string | null>(null);
    const [uploadedLocalFileKeys, setUploadedLocalFileKeys] = useState<string[]>([]);
    const [uploadedMediaPreview, setUploadedMediaPreview] = useState<PropertyMediaUploadPreviewValue>({
        images: [],
        propertyVideo: null,
    });
    const [otherDetails, setOtherDetails] = useState<OtherDetailsFormValue>({
        bedrooms: "",
        maidBedroom: false,
        bathrooms: "",
        areaSqm: "",
        areaSqft: "",
        dldPermitNumber: "",
        dldPermitUrl: "",
        price: "",
        maintenanceFees: "",
        serviceCharges: "",
    });
    const [propertyMediaBaseUrls, setPropertyMediaBaseUrls] = useState<{ img: string; vid: string }>({ img: "", vid: "" });
    const [isLoadingProperty, setIsLoadingProperty] = useState(false);
    const [savingTab, setSavingTab] = useState<EditTabId | null>(null);

    const tabs: { id: EditTabId; label: string }[] = [
        { id: "status", label: "Property type & property details" },
        { id: "media", label: "Media upload" },
        { id: "other", label: "Other details" },
        { id: "location", label: "Location" },
    ];

    const extractFilename = (value?: string | null) => {
        if (!value) return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        return trimmed.includes("/") ? trimmed.split("/").pop() || null : trimmed;
    };
    const toNumber = (value: string) => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : NaN;
    };
    const toOptionalNumber = (value: string) => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    };
    const toFileKey = (file: File | null) => (file ? `${file.name}:${file.size}:${file.lastModified}` : "none");
    const buildMediaSignature = (media: PropertyMediaUploadFormValue) => {
        const imageKeys = media.propertyImages.map((file) => toFileKey(file)).join("|");
        return [imageKeys, toFileKey(media.propertyVideo), media.virtualTourLink.trim()].join("::");
    };

    const isPropertyDetailsComplete =
        propertyDetails.propertyTitle.trim().length > 0 &&
        propertyDetails.propertyAddress.trim().length > 0 &&
        propertyDetails.amenityIds.length > 0 &&
        propertyDetails.propertyDescription.trim().length > 0;
    const isOtherDetailsComplete =
        toNumber(otherDetails.bedrooms) >= 0 &&
        toNumber(otherDetails.bathrooms) >= 0 &&
        toNumber(otherDetails.areaSqm) > 0 &&
        toNumber(otherDetails.price) > 0 &&
        otherDetails.dldPermitNumber.trim().length > 0;
    const isLocationComplete =
        locationDetails.zone.trim().length > 0 &&
        locationDetails.city.trim().length > 0 &&
        Number.isFinite(Number.parseFloat(locationDetails.latitude)) &&
        Number.isFinite(Number.parseFloat(locationDetails.longitude));

    const uploadAndCacheMedia = useCallback(async () => {
        if (!mediaUpload.propertyImages.length && !mediaUpload.propertyVideo) return uploadedMedia;
        const formData = new FormData();
        if (propertyId) formData.append("propertyId", propertyId);
        mediaUpload.propertyImages.forEach((file) => formData.append("images", file));
        if (mediaUpload.propertyVideo) formData.append("video", mediaUpload.propertyVideo);
        const response = await agentService.uploadPropertyMedia(formData);

        const toPublicUrl = (item: { url?: string; path?: string; filename?: string } | undefined, base?: string) => {
            if (!item) return null;
            const direct = item.url || item.path || item.filename || "";
            if (!direct) return null;
            if (direct.startsWith("http://") || direct.startsWith("https://")) return direct;
            const filename = extractFilename(item.filename || item.url || item.path);
            if (!base || !filename) return null;
            return `${base.replace(/\/?$/, "/")}${filename}`;
        };

        const imageNames = (response.uploads?.images || [])
            .map((item) => extractFilename(item.filename || item.url || item.path))
            .filter((name): name is string => Boolean(name));
        const videoName = extractFilename(
            response.uploads?.videos?.[0]?.filename ||
            response.uploads?.videos?.[0]?.url ||
            response.uploads?.videos?.[0]?.path
        );

        const imageBase =
            response.baseUrls?.images ||
            (response as { propertyUrl?: { img?: string } })?.propertyUrl?.img ||
            propertyMediaBaseUrls.img;
        const videoBase =
            response.baseUrls?.videos ||
            (response as { propertyUrl?: { vid?: string } })?.propertyUrl?.vid ||
            propertyMediaBaseUrls.vid;

        const uploadedImagePreviewUrls = (response.uploads?.images || [])
            .map((item) => toPublicUrl(item, imageBase))
            .filter((item): item is string => Boolean(item));
        const uploadedVideoPreview = toPublicUrl(response.uploads?.videos?.[0], videoBase);

        const nextUploaded = {
            images: [...uploadedMedia.images, ...imageNames].filter((value, index, arr) => value && arr.indexOf(value) === index),
            videoTour: videoName || uploadedMedia.videoTour,
            virtualTour360: mediaUpload.virtualTourLink.trim(),
        };

        setUploadedMedia(nextUploaded);
        setUploadedLocalFileKeys((prev) => {
            const next = [...prev, ...mediaUpload.propertyImages.map((file) => toFileKey(file))];
            return next.filter((value, index, arr) => value && arr.indexOf(value) === index);
        });
        setUploadedMediaPreview((prev) => ({
            images: [...prev.images, ...uploadedImagePreviewUrls].filter((value, index, arr) => value && arr.indexOf(value) === index),
            propertyVideo: uploadedVideoPreview || prev.propertyVideo,
        }));
        setUploadedMediaSignature(buildMediaSignature(mediaUpload));
        return nextUploaded;
    }, [mediaUpload, uploadedMedia, propertyMediaBaseUrls, propertyId]);

    const loadProperty = useCallback(async () => {
        if (!propertyId) return;
        setIsLoadingProperty(true);
        let imgBase = "";
        let vidBase = "";
        try {
            const urlRes = await agentService.getSupportedUrlsMasterData();
            const anyRes = urlRes as unknown as {
                supportedUrls?: { propertyUrl?: { img?: string; vid?: string } };
                supportedurls?: { propertyUrl?: { img?: string; vid?: string } };
                propertyUrl?: { img?: string; vid?: string };
            };
            const root =
                anyRes?.supportedUrls?.propertyUrl ||
                anyRes?.supportedurls?.propertyUrl ||
                anyRes?.propertyUrl;
            imgBase = root?.img || "";
            vidBase = root?.vid || "";
            setPropertyMediaBaseUrls({ img: imgBase, vid: vidBase });
        } catch {
            // no-op
        }

        try {
            const property = await agentService.getPropertyById(propertyId);
            if (!property?._id) return;
            const amenityIds = (property.amenities || []).map((a) => String(a?._id || "")).filter(Boolean);
            const imageNames = (property.images || [])
                .map((img) => extractFilename(img?.url))
                .filter((name): name is string => Boolean(name));
            const videoName = extractFilename(property.videoTour || "");
            const toMediaUrl = (name: string, base: string) => {
                if (!name) return "";
                if (name.startsWith("http://") || name.startsWith("https://")) return name;
                return base ? `${base.replace(/\/?$/, "/")}${name}` : name;
            };
            const coordinates = (property as { location?: { coordinates?: { coordinates?: number[] } } })?.location?.coordinates?.coordinates;
            setListingTypeId(String(property.listingType?._id || ""));
            setPropertyTypeId(String(property.propertyType?._id || ""));
            setListingTransaction(String(property.listingType?.transaction || "").trim().toLowerCase());
            setPropertyDetails({
                propertyTitle: property.title || "",
                propertyAddress: property.location?.fullAddress || "",
                propertyAddressPlaceId: "",
                propertyDescription: property.description || "",
                amenityIds,
            });
            setLocationDetails({
                zone: property.location?.zone || "",
                city: property.location?.city || "",
                latitude: Array.isArray(coordinates) && coordinates[1] != null ? String(coordinates[1]) : "",
                longitude: Array.isArray(coordinates) && coordinates[0] != null ? String(coordinates[0]) : "",
                searchLocation: property.location?.fullAddress || "",
                formattedAddress: property.location?.fullAddress || "",
                placeId: "",
            });
            setOtherDetails({
                bedrooms: String(property.bedrooms ?? ""),
                maidBedroom: Boolean(property.maidBedroom),
                bathrooms: String(property.bathrooms ?? ""),
                areaSqm: String(property.area?.sqm ?? ""),
                areaSqft: String(property.area?.sqft ?? ""),
                dldPermitNumber: property.dldPermitNumber || "",
                dldPermitUrl: property.dldPermitUrl || "",
                price: String(property.price ?? ""),
                maintenanceFees: property.maintenanceFees != null ? String(property.maintenanceFees) : "",
                serviceCharges: property.serviceCharges != null ? String(property.serviceCharges) : "",
            });
            setUploadedMedia({
                images: imageNames,
                videoTour: videoName,
                virtualTour360: property.virtualTour360 || "",
            });
            const imagePreviewUrls = (property.images || [])
                .map((img) => {
                    const raw = img?.url ? String(img.url) : "";
                    if (!raw) return "";
                    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
                    const filename = extractFilename(raw);
                    if (!filename) return "";
                    if (!imgBase) return filename;
                    return toMediaUrl(filename, imgBase);
                })
                .filter((v): v is string => Boolean(v));

            const rawVideo = property.videoTour ? String(property.videoTour) : "";
            const videoPreviewUrl =
                rawVideo && (rawVideo.startsWith("http://") || rawVideo.startsWith("https://"))
                    ? rawVideo
                    : videoName
                        ? toMediaUrl(videoName, vidBase)
                        : null;

            setUploadedMediaPreview({
                images: imagePreviewUrls,
                propertyVideo: videoPreviewUrl,
            });
            setMediaUpload({ propertyImages: [], propertyVideo: null, virtualTourLink: property.virtualTour360 || "" });
            setUploadedLocalFileKeys([]);
            setUploadedMediaSignature(
                buildMediaSignature({ propertyImages: [], propertyVideo: null, virtualTourLink: property.virtualTour360 || "" })
            );
        } catch (error: unknown) {
            const message = (error as { message?: string })?.message || "Failed to load property for editing.";
            toast.error("Load property failed", message);
        } finally {
            setIsLoadingProperty(false);
        }
    }, [propertyId]);

    useEffect(() => {
        if (!propertyId) {
            toast.error("Missing property", "Property ID not found.");
            navigate("/agent/properties-management");
            return;
        }
        void loadProperty();
    }, [propertyId, navigate, loadProperty]);

    const saveStatusTab = async () => {
        if (!isPropertyDetailsComplete || !listingTypeId || !propertyTypeId) {
            toast.error("Validation required", "Please complete listing type, property type and property details.");
            return;
        }
        if (!propertyId) return;
        setSavingTab("status");
        try {
            await agentService.updateProperty(propertyId, {
                title: propertyDetails.propertyTitle.trim(),
                description: propertyDetails.propertyDescription,
                listingType: listingTypeId,
                propertyType: propertyTypeId,
                amenities: propertyDetails.amenityIds,
                location: {
                    fullAddress: propertyDetails.propertyAddress.trim(),
                    city: locationDetails.city || "",
                    zone: locationDetails.zone || "",
                },
            });
            toast.success("Saved", "Property type and details updated.");
        } catch (error: unknown) {
            toast.error("Update failed", (error as { message?: string })?.message || "Failed to update this section.");
        } finally {
            setSavingTab(null);
        }
    };

    const saveMediaTab = async () => {
        const totalSelectedImages = mediaUpload.propertyImages.length + uploadedMedia.images.length;
        if (totalSelectedImages < 1) {
            toast.error("Validation required", "Please upload at least one property image.");
            return;
        }
        if (!propertyId) return;
        setSavingTab("media");
        try {
            const finalMedia =
                mediaUpload.propertyImages.length > 0 || mediaUpload.propertyVideo
                    ? await uploadAndCacheMedia()
                    : uploadedMedia;
            await agentService.updateProperty(propertyId, {
                images: finalMedia.images,
                videoTour: finalMedia.videoTour || undefined,
                virtualTour360: mediaUpload.virtualTourLink.trim() || undefined,
            });
            toast.success("Saved", "Media updated successfully.");
        } catch (error: unknown) {
            toast.error("Update failed", (error as { message?: string })?.message || "Failed to update media.");
        } finally {
            setSavingTab(null);
        }
    };

    const saveOtherTab = async () => {
        if (!isOtherDetailsComplete) {
            toast.error("Validation required", "Please complete required other details.");
            return;
        }
        if (!propertyId) return;
        setSavingTab("other");
        try {
            await agentService.updateProperty(propertyId, {
                bedrooms: toNumber(otherDetails.bedrooms),
                maidBedroom: otherDetails.maidBedroom,
                bathrooms: toNumber(otherDetails.bathrooms),
                area: { sqm: toNumber(otherDetails.areaSqm), sqft: toOptionalNumber(otherDetails.areaSqft) },
                price: toNumber(otherDetails.price),
                dldPermitNumber: otherDetails.dldPermitNumber.trim(),
                dldPermitUrl: otherDetails.dldPermitUrl.trim() || undefined,
                maintenanceFees: toOptionalNumber(otherDetails.maintenanceFees),
                serviceCharges: toOptionalNumber(otherDetails.serviceCharges),
            });
            toast.success("Saved", "Other details updated.");
        } catch (error: unknown) {
            toast.error("Update failed", (error as { message?: string })?.message || "Failed to update this section.");
        } finally {
            setSavingTab(null);
        }
    };

    const saveLocationTab = async () => {
        if (!isLocationComplete) {
            toast.error("Validation required", "Please select location on map before save.");
            return;
        }
        if (!propertyId) return;
        setSavingTab("location");
        try {
            await agentService.updateProperty(propertyId, {
                location: {
                    fullAddress: locationDetails.formattedAddress || propertyDetails.propertyAddress.trim() || undefined,
                    city: locationDetails.city,
                    zone: locationDetails.zone,
                    googlePlaceId: locationDetails.placeId || propertyDetails.propertyAddressPlaceId || undefined,
                    coordinates: {
                        type: "Point",
                        coordinates: [Number.parseFloat(locationDetails.longitude), Number.parseFloat(locationDetails.latitude)],
                    },
                },
            });
            toast.success("Saved", "Location updated.");
        } catch (error: unknown) {
            toast.error("Update failed", (error as { message?: string })?.message || "Failed to update location.");
        } finally {
            setSavingTab(null);
        }
    };

    const renderTabContent = () => {
        if (activeTab === "status") {
            return (
                <EditPropertyTypeStep
                    listingTypeId={listingTypeId}
                    propertyTypeId={propertyTypeId}
                    onListingTypeChange={setListingTypeId}
                    onPropertyTypeChange={setPropertyTypeId}
                    onListingTransactionChange={setListingTransaction}
                    propertyDetails={propertyDetails}
                    onPropertyDetailsChange={setPropertyDetails}
                    onDiscard={() => void loadProperty()}
                    onSave={() => void saveStatusTab()}
                    isSaving={savingTab === "status"}
                />
            );
        }
        if (activeTab === "media") {
            return (
                <EditPropertyMedia
                    value={mediaUpload}
                    onChange={setMediaUpload}
                    uploadedPreview={uploadedMediaPreview}
                    useUploadedPreview={uploadedMediaSignature !== null && uploadedMediaSignature === buildMediaSignature(mediaUpload)}
                    uploadedLocalFileKeys={uploadedLocalFileKeys}
                    onRemoveUploadedImage={(imageUrl) => {
                        const previewIndex = uploadedMediaPreview.images.findIndex((url) => url === imageUrl);
                        if (previewIndex < 0) return;
                        setUploadedMedia((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== previewIndex) }));
                        setUploadedMediaPreview((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== previewIndex) }));
                        setUploadedLocalFileKeys((prev) => prev.filter((_, i) => i !== previewIndex));
                        setUploadedMediaSignature(null);
                    }}
                    onRemoveUploadedVideo={() => {
                        setUploadedMedia((prev) => ({ ...prev, videoTour: null }));
                        setUploadedMediaPreview((prev) => ({ ...prev, propertyVideo: null }));
                        setUploadedMediaSignature(null);
                    }}
                    onDiscard={() => void loadProperty()}
                    onSave={() => void saveMediaTab()}
                    isSaving={savingTab === "media"}
                />
            );
        }
        if (activeTab === "other") {
            return (
                <EditOtherDetails
                    listingTransaction={listingTransaction}
                    value={otherDetails}
                    onChange={setOtherDetails}
                    onDiscard={() => void loadProperty()}
                    onSave={() => void saveOtherTab()}
                    isSaving={savingTab === "other"}
                />
            );
        }
        return (
            <EditLocation
                value={locationDetails}
                onChange={setLocationDetails}
                propertyAddress={propertyDetails.propertyAddress}
                propertyAddressPlaceId={propertyDetails.propertyAddressPlaceId}
                onDiscard={() => void loadProperty()}
                onSave={() => void saveLocationTab()}
                isSaving={savingTab === "location"}
            />
        );
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px] rounded-[15px]">
            <div className="rounded-[15px]">
                <div className="px-[20px] rounded-t-[15px] border-b border-[rgba(34,34,34,0.08)] overflow-x-auto scrollbar-hide bg-white">
                    <div className="min-w-max flex items-center gap-[4px] scrollbar-hide mt-[8px]">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`cursor-pointer p-[20px_30px] border-b-2 text-[13px] font-[SemiBold] whitespace-nowrap transition-colors ${isActive ? "text-[#0832AE] border-[#0832AE]" : "text-[#222] border-transparent"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>{renderTabContent()}</div>
            </div>
            {(isLoadingProperty || savingTab !== null) && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
        </div>
    );
};

export default EditProperty;
