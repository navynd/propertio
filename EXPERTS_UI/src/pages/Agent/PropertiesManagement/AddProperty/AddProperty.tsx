import { useState, useEffect } from "react";
import Stepper from "./AddProjectComponents/Stepper";
import UnitDetails from "./AddProjectComponents/UnitDetails";
import LocationAdd from "./AddProjectComponents/LocationAdd.tsx";
import PropertyTypeStep from "./AddProjectComponents/PropertyTypeStep";
import PropertyDetailsStep from "./AddProjectComponents/PropertyDetailsStep";
import PropertyMediaUpload from "./AddProjectComponents/PropertyMediaUpload";
import OtherDetailsStep from "./AddProjectComponents/OtherDetailsStep";
import type { PropertyDetailsFormValue } from "./AddProjectComponents/PropertyDetailsStep";
import type { PropertyLocationFormValue } from "./AddProjectComponents/LocationAdd.tsx";
import type { PropertyMediaUploadFormValue } from "./AddProjectComponents/PropertyMediaUpload";
import type { PropertyMediaUploadPreviewValue } from "./AddProjectComponents/PropertyMediaUpload";
import type { OtherDetailsFormValue } from "./AddProjectComponents/OtherDetailsStep";
import { agentService } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";
import { useLocation, useNavigate } from "react-router-dom";

type Step = {
    id: number;
    label: string;
};

const steps: Step[] = [
    { id: 1, label: "Property Type" },
    { id: 2, label: "Property details" },
    { id: 3, label: "Media Upload" },
    { id: 4, label: "Other Details" },
    { id: 5, label: "Location" },
];

const ADD_PROPERTY_PATH = "/agent/properties-management/add-property";

const AddProperty = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeStep, setActiveStep] = useState(1);
    const [projectStatus, setProjectStatus] = useState<"new" | "offplan">("new");
    const [listingTypeId, setListingTypeId] = useState("");
    const [propertyTypeId, setPropertyTypeId] = useState("");
    const [listingTransaction, setListingTransaction] = useState("");
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [isSubmittingProperty, setIsSubmittingProperty] = useState(false);
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
    const [uploadedMedia, setUploadedMedia] = useState<{
        images: string[];
        videoTour: string | null;
        virtualTour360: string;
    }>({
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
    const buildMediaSignature = (media: PropertyMediaUploadFormValue) => {
        const toFileKey = (file: File | null) =>
            file ? `${file.name}:${file.size}:${file.lastModified}` : "none";
        const imageKeys = media.propertyImages.map((file) => toFileKey(file)).join("|");
        return [imageKeys, toFileKey(media.propertyVideo), media.virtualTourLink.trim()].join("::");
    };
    const toFileKey = (file: File | null) =>
        file ? `${file.name}:${file.size}:${file.lastModified}` : "none";
    const shouldUseUploadedMediaPreview =
        uploadedMediaSignature !== null && uploadedMediaSignature === buildMediaSignature(mediaUpload);

    const uploadAndCacheMedia = async () => {
        const mediaSignature = buildMediaSignature(mediaUpload);
        if (uploadedMediaSignature === mediaSignature && uploadedMedia.images.length > 0) {
            const cached = {
                ...uploadedMedia,
                virtualTour360: mediaUpload.virtualTourLink.trim(),
            };
            setUploadedMedia(cached);
            return cached;
        }

        const formData = new FormData();
        mediaUpload.propertyImages.forEach((file) => formData.append("images", file));
        if (mediaUpload.propertyVideo) formData.append("video", mediaUpload.propertyVideo);

        const response = await agentService.uploadPropertyMedia(formData);
        const toPublicUrl = (
            item: { url?: string; path?: string; filename?: string } | undefined,
            base?: string
        ) => {
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
        const imageBase = response.baseUrls?.images || (response as { propertyUrl?: { img?: string } })?.propertyUrl?.img;
        const videoBase = response.baseUrls?.videos || (response as { propertyUrl?: { vid?: string } })?.propertyUrl?.vid;
        const uploadedImagePreviewUrls = (response.uploads?.images || [])
            .map((item) => toPublicUrl(item, imageBase))
            .filter((item): item is string => Boolean(item));
        const uploadedVideoPreview = toPublicUrl(response.uploads?.videos?.[0], videoBase);
        const nextUploaded = {
            images: imageNames,
            videoTour: videoName,
            virtualTour360: mediaUpload.virtualTourLink.trim(),
        };
        setUploadedMedia(nextUploaded);
        setUploadedLocalFileKeys(mediaUpload.propertyImages.map((file) => toFileKey(file)));
        setUploadedMediaPreview({
            images: uploadedImagePreviewUrls,
            propertyVideo: uploadedVideoPreview,
        });
        setUploadedMediaSignature(mediaSignature);
        return nextUploaded;
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

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }, [activeStep]);

    const showBackButton =
        location.pathname === ADD_PROPERTY_PATH ? activeStep > 1 : true;

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <Stepper activeStep={activeStep} steps={steps} />

            {activeStep === 1 && (
                <PropertyTypeStep
                    listingTypeId={listingTypeId}
                    propertyTypeId={propertyTypeId}
                    onListingTypeChange={setListingTypeId}
                    onPropertyTypeChange={setPropertyTypeId}
                    onListingTransactionChange={setListingTransaction}
                />
            )}
            {activeStep === 2 && (
                <PropertyDetailsStep
                    value={propertyDetails}
                    onChange={setPropertyDetails}
                />
            )}
            {activeStep === 3 && (
                <PropertyMediaUpload
                    value={mediaUpload}
                    onChange={setMediaUpload}
                    uploadedPreview={uploadedMediaPreview}
                    useUploadedPreview={shouldUseUploadedMediaPreview}
                    uploadedLocalFileKeys={uploadedLocalFileKeys}
                    onRemoveUploadedImage={(imageUrl) => {
                        const previewIndex = uploadedMediaPreview.images.findIndex((url) => url === imageUrl);
                        if (previewIndex < 0) return;
                        setUploadedMedia((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== previewIndex),
                        }));
                        setUploadedMediaPreview((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== previewIndex),
                        }));
                        setUploadedLocalFileKeys((prev) => prev.filter((_, i) => i !== previewIndex));
                        setUploadedMediaSignature(null);
                    }}
                />
            )}
            {activeStep === 4 && (
                <OtherDetailsStep
                    listingTransaction={listingTransaction}
                    value={otherDetails}
                    onChange={setOtherDetails}
                />
            )}
            {activeStep === 5 && (
                <LocationAdd
                    value={locationDetails}
                    onChange={setLocationDetails}
                    propertyAddress={propertyDetails.propertyAddress}
                    propertyAddressPlaceId={propertyDetails.propertyAddressPlaceId}
                />
            )}
            {activeStep > 5 && (
                <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] p-[20px] text-[#707070]">
                    Step content will be added here.
                </div>
            )}

            <div className="flex items-center justify-between pt-[8px]">
                <button
                    type="button"
                    onClick={() => navigate("/agent/properties-management")}
                    className="cursor-pointer h-[44px] px-[20px] rounded-[10px] border border-[#222] text-[14px] font-[Bold] text-[#222]"
                >
                    Cancel
                </button>

                <div className="flex items-center gap-[10px]">
                    {showBackButton && (
                        <button
                            type="button"
                            disabled={isUploadingMedia || isSubmittingProperty}
                            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                            className="cursor-pointer h-[44px] px-[20px] rounded-[10px] border border-[#222] text-[14px] font-[Bold] text-[#222]"
                        >
                            Back
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={isUploadingMedia || isSubmittingProperty}
                        onClick={async () => {
                            if (activeStep === 1 && (!listingTypeId.trim() || !propertyTypeId.trim())) {
                                toast.error(
                                    "Validation required",
                                    "Please select both listing type and property type before continuing."
                                );
                                return;
                            }
                            if (activeStep === 2 && !isPropertyDetailsComplete) {
                                toast.error("Validation required", "Please fill all required property details.");
                                return;
                            }
                            if (activeStep === 3) {
                                if (mediaUpload.propertyImages.length < 1) {
                                    toast.error("Validation required", "Please upload at least one property image.");
                                    return;
                                }
                                if (mediaUpload.propertyImages.length > 50) {
                                    toast.error("Validation required", "You can upload up to 50 images only.");
                                    return;
                                }
                                setIsUploadingMedia(true);
                                try {
                                    await uploadAndCacheMedia();
                                    toast.success("Media uploaded", "Property media uploaded successfully.");
                                    setActiveStep((prev) => Math.min(steps.length, prev + 1));
                                } catch (error: unknown) {
                                    const message = (error as { message?: string })?.message || "Failed to upload media.";
                                    toast.error("Media upload failed", message);
                                } finally {
                                    setIsUploadingMedia(false);
                                }
                                return;
                            }
                            if (activeStep === 4 && !isOtherDetailsComplete) {
                                toast.error("Validation required", "Please complete all required other details.");
                                return;
                            }
                            if (activeStep === 5) {
                                if (!isLocationComplete) {
                                    toast.error("Validation required", "Please select location on map before submit.");
                                    return;
                                }
                                setIsSubmittingProperty(true);
                                try {
                                    const finalMedia =
                                        uploadedMedia.images.length > 0 ? uploadedMedia : await uploadAndCacheMedia();
                                    await agentService.createProperty({
                                        title: propertyDetails.propertyTitle.trim(),
                                        description: propertyDetails.propertyDescription,
                                        listingType: listingTypeId,
                                        propertyType: propertyTypeId,
                                        bedrooms: toNumber(otherDetails.bedrooms),
                                        maidBedroom: otherDetails.maidBedroom,
                                        bathrooms: toNumber(otherDetails.bathrooms),
                                        area: {
                                            sqm: toNumber(otherDetails.areaSqm),
                                            sqft: toOptionalNumber(otherDetails.areaSqft),
                                        },
                                        price: toNumber(otherDetails.price),
                                        currency: "AED",
                                        dldPermitNumber: otherDetails.dldPermitNumber.trim(),
                                        dldPermitUrl: otherDetails.dldPermitUrl.trim() || undefined,
                                        amenities: propertyDetails.amenityIds,
                                        images: finalMedia.images,
                                        videoTour: finalMedia.videoTour || undefined,
                                        virtualTour360: mediaUpload.virtualTourLink.trim() || undefined,
                                        maintenanceFees: toOptionalNumber(otherDetails.maintenanceFees),
                                        serviceCharges: toOptionalNumber(otherDetails.serviceCharges),
                                        location: {
                                            fullAddress:
                                                locationDetails.formattedAddress ||
                                                propertyDetails.propertyAddress.trim() ||
                                                undefined,
                                            city: locationDetails.city,
                                            zone: locationDetails.zone,
                                            googlePlaceId:
                                                locationDetails.placeId ||
                                                propertyDetails.propertyAddressPlaceId ||
                                                undefined,
                                            coordinates: {
                                                type: "Point",
                                                coordinates: [
                                                    Number.parseFloat(locationDetails.longitude),
                                                    Number.parseFloat(locationDetails.latitude),
                                                ],
                                            },
                                        },
                                    });
                                    toast.success("Property created", "Property created successfully.");
                                    navigate("/agent/properties-management");
                                } catch (error: unknown) {
                                    const message =
                                        (error as { message?: string })?.message || "Failed to create property.";
                                    toast.error("Create property failed", message);
                                } finally {
                                    setIsSubmittingProperty(false);
                                }
                                return;
                            }
                            setActiveStep((prev) => Math.min(steps.length, prev + 1));
                        }}
                        className="cursor-pointer h-[44px] px-[20px] rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isUploadingMedia ? "Uploading..." : isSubmittingProperty ? "Submitting..." : "Next"}
                    </button>
                </div>
            </div>
            {(isUploadingMedia || isSubmittingProperty) && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
        </div>
    );
};

export default AddProperty;