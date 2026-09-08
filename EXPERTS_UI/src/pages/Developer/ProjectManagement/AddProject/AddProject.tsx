import { useState, useEffect, useRef } from "react";
import Stepper from "./AddProjectComponents/Stepper";
import ProjectStatusStep from "./AddProjectComponents/ProjectStatusStep";
import ProjectDetailsStep from "./AddProjectComponents/ProjectDetailsStep";
import MediaUploadStep from "./AddProjectComponents/MediaUploadStep";
import type { MediaUploadFormValue, MediaUploadPreviewValue } from "./AddProjectComponents/MediaUploadStep";
import UnitDetails from "./AddProjectComponents/UnitDetails";
import type { UnitDetailsFormValue, UnitPropertyTypeOption } from "./AddProjectComponents/UnitDetails";
import PricePayment from "./AddProjectComponents/PricePayment";
import type { PricePaymentFormValue } from "./AddProjectComponents/PricePayment";
import LocationAdd from "./AddProjectComponents/LocationAdd";
import type { LocationFormValue } from "./AddProjectComponents/LocationAdd";
import DeveloperHeader from "../../../../components/Header/DeveloperHeader";
import { useNavigate } from "react-router-dom";
import {
    developerService,
    type AmenityMasterItem,
    type PropertyTypeMasterItem,
    type ProjectTypeStatusMasterItem,
} from "../../../../services/developerService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";
import { mediaFileKey } from "./projectMediaUtils";

type Step = {
    id: number;
    label: string;
};

type ProjectDetailsAmenityOption = {
    id: string;
    name: string;
};

type ProjectDetailsFormValue = {
    projectTitle: string;
    projectAddress: string;
    projectAddressPlaceId: string;
    aboutProject: string;
    projectDescription: string;
    amenityIds: string[];
};

const steps: Step[] = [
    { id: 1, label: "Project status" },
    { id: 2, label: "Project details" },
    { id: 3, label: "Media Upload" },
    { id: 4, label: "Price & Payment Plan" },
    { id: 5, label: "Location" },
    { id: 6, label: "Unit details" },
];

const fallbackProjectTypeStatusOptions: ProjectTypeStatusMasterItem[] = [
    { name: "New project", value: "ready" },
    { name: "Off-plan project", value: "off-plan" },
];

const isRichTextEmpty = (html: string) => {
    const text = html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return !text;
};

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

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

const buildMediaSignature = (media: MediaUploadFormValue) => {
    const imageKeys = media.projectImages.map((file) => mediaFileKey(file)).join("|");
    return [
        imageKeys,
        mediaFileKey(media.projectVideo),
        mediaFileKey(media.brochureDoc),
        mediaFileKey(media.masterPlanImage),
    ].join("::");
};

/** When `next` is `prev` with exactly one image removed (same order), return removed index. */
const findSingleRemovedProjectImageIndex = (prev: File[], next: File[]): number | null => {
    if (prev.length !== next.length + 1) return null;
    for (let removeAt = 0; removeAt < prev.length; removeAt++) {
        const merged = [...prev.slice(0, removeAt), ...prev.slice(removeAt + 1)];
        const matches = merged.every((f, i) => mediaFileKey(f) === mediaFileKey(next[i]));
        if (matches) return removeAt;
    }
    return null;
};

const AddProject = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(1);
    const [projectStatus, setProjectStatus] = useState<"ready" | "off-plan">("ready");
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isUploadingMedia, setIsUploadingMedia] = useState(false);
    const [isSubmittingProject, setIsSubmittingProject] = useState(false);
    const [projectDetails, setProjectDetails] = useState<ProjectDetailsFormValue>({
        projectTitle: "",
        projectAddress: "",
        projectAddressPlaceId: "",
        aboutProject: "",
        projectDescription: "",
        amenityIds: [],
    });
    const [mediaUpload, setMediaUpload] = useState<MediaUploadFormValue>({
        projectImages: [],
        projectVideo: null,
        brochureDoc: null,
        masterPlanImage: null,
        virtualTourLink: "",
    });
    const [uploadedMedia, setUploadedMedia] = useState<{
        images: string[];
        masterPlan: string[];
        brochure: string | null;
        videoTour: string | null;
        virtualTour360: string;
    }>({
        images: [],
        masterPlan: [],
        brochure: null,
        videoTour: null,
        virtualTour360: "",
    });
    const [uploadedMediaSignature, setUploadedMediaSignature] = useState<string | null>(null);
    const [uploadedMediaPreview, setUploadedMediaPreview] = useState<MediaUploadPreviewValue>({
        images: [],
        projectVideo: null,
        brochureDoc: null,
        masterPlanImage: null,
    });
    /** Same order/length as `uploadedMediaPreview.images` after upload or single-image removal. */
    const [uploadedProjectImageKeys, setUploadedProjectImageKeys] = useState<string[]>([]);
    const [projectTypeStatusOptions, setProjectTypeStatusOptions] = useState<ProjectTypeStatusMasterItem[]>(
        fallbackProjectTypeStatusOptions
    );
    const [amenityOptions, setAmenityOptions] = useState<ProjectDetailsAmenityOption[]>([]);
    const [propertyTypeOptions, setPropertyTypeOptions] = useState<UnitPropertyTypeOption[]>([]);
    const [pricePayment, setPricePayment] = useState<PricePaymentFormValue>({
        projectPrice: "",
        governmentFees: "",
        paymentOptions: [
            {
                id: 1,
                downPayment: "",
                duringConstruction: "",
                handoverValue: "",
                constructionInstallments: [],
            },
        ],
    });
    const [locationDetails, setLocationDetails] = useState<LocationFormValue>({
        zone: "",
        city: "",
        latitude: "",
        longitude: "",
        searchLocation: "",
        formattedAddress: "",
        placeId: "",
    });
    const [unitDetails, setUnitDetails] = useState<UnitDetailsFormValue>({
        properties: [],
    });
    const shouldUseUploadedMediaPreview =
        uploadedMediaSignature !== null && uploadedMediaSignature === buildMediaSignature(mediaUpload);

    const prevProjectImagesRef = useRef<File[]>([]);

    useEffect(() => {
        const prev = prevProjectImagesRef.current;
        const next = mediaUpload.projectImages;

        if (
            uploadedMediaSignature !== null &&
            uploadedMediaPreview.images.length > 0 &&
            prev.length === uploadedMediaPreview.images.length &&
            next.length === prev.length - 1
        ) {
            const removedIndex = findSingleRemovedProjectImageIndex(prev, next);
            if (removedIndex !== null) {
                setUploadedMediaPreview((p) => {
                    if (p.images.length !== prev.length) return p;
                    return {
                        ...p,
                        images: p.images.filter((_, i) => i !== removedIndex),
                    };
                });
                setUploadedMedia((m) => {
                    if (m.images.length !== prev.length) return m;
                    return {
                        ...m,
                        images: m.images.filter((_, i) => i !== removedIndex),
                    };
                });
                setUploadedMediaSignature(buildMediaSignature(mediaUpload));
            }
        }

        prevProjectImagesRef.current = next;
    }, [mediaUpload, uploadedMediaSignature, uploadedMediaPreview.images.length]);

    useEffect(() => {
        let isMounted = true;
        developerService
            .getProjectTypeStatusMasterData()
            .then((data) => {
                if (!isMounted) return;
                const raw = data.projectTypeStatus || data.projecttypestatus || [];
                const normalized = raw.filter(
                    (item): item is ProjectTypeStatusMasterItem =>
                        (item?.value === "ready" || item?.value === "off-plan") && Boolean(item?.name)
                );
                if (!normalized.length) return;
                setProjectTypeStatusOptions(normalized);
                setProjectStatus((prev) =>
                    normalized.some((item) => item.value === prev) ? prev : normalized[0].value
                );
            })
            .catch((error: unknown) => {
                const message =
                    (error as { message?: string })?.message ||
                    "Unable to load project type status options.";
                toast.error("Master data load failed", message);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        developerService
            .getPropertyTypesMasterData()
            .then((data) => {
                if (!isMounted) return;
                const propertyTypes = (data.propertyTypes || data.propertytypes || [])
                    .filter(
                        (item: PropertyTypeMasterItem) =>
                            Boolean(item?._id && item?.name) && item.isActive !== false
                    )
                    .sort((a: PropertyTypeMasterItem, b: PropertyTypeMasterItem) => {
                        const orderA = typeof a.displayOrder === "number" ? a.displayOrder : Number.MAX_SAFE_INTEGER;
                        const orderB = typeof b.displayOrder === "number" ? b.displayOrder : Number.MAX_SAFE_INTEGER;
                        return orderA - orderB;
                    })
                    .map((item: PropertyTypeMasterItem) => ({
                        id: String(item._id),
                        name: item.name.trim(),
                    }))
                    .filter(
                        (item, index, arr) =>
                            item.name.length > 0 &&
                            isObjectId(item.id) &&
                            arr.findIndex((current) => current.id === item.id) === index
                    );
                setPropertyTypeOptions(propertyTypes);
            })
            .catch((error: unknown) => {
                const message =
                    (error as { message?: string })?.message || "Unable to load property types.";
                toast.error("Master data load failed", message);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        developerService
            .getAmenitiesMasterData()
            .then((data) => {
                if (!isMounted) return;
                const amenities = (data.amenities || [])
                    .filter((item: AmenityMasterItem) => Boolean(item?._id && item?.name))
                    .map((item: AmenityMasterItem) => ({
                        id: item._id,
                        name: item.name,
                    }));
                setAmenityOptions(amenities);
                setProjectDetails((prev) => ({
                    ...prev,
                    amenityIds: prev.amenityIds.filter((id) => amenities.some((item) => item.id === id)),
                }));
            })
            .catch((error: unknown) => {
                const message =
                    (error as { message?: string })?.message || "Unable to load amenities.";
                toast.error("Master data load failed", message);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }, [activeStep]);

    const isProjectDetailsComplete =
        projectDetails.projectTitle.trim().length > 0 &&
        projectDetails.projectAddress.trim().length > 0 &&
        projectDetails.aboutProject.trim().length > 0 &&
        projectDetails.amenityIds.length > 0 &&
        !isRichTextEmpty(projectDetails.projectDescription);

    const isMediaStepComplete = mediaUpload.projectImages.length > 0;

    const getPricePaymentValidationError = (): string | null => {
        if (!(toNumber(pricePayment.projectPrice) > 0)) {
            return "Enter a valid project price greater than 0.";
        }
        if (!(toNumber(pricePayment.governmentFees) >= 0)) {
            return "Enter valid government fees (0 or more).";
        }
        if (pricePayment.paymentOptions.length < 1) {
            return "Add at least one payment plan option.";
        }

        for (const option of pricePayment.paymentOptions) {
            const downPayment = toNumber(option.downPayment);
            const duringConstruction = toNumber(option.duringConstruction);
            const handoverValue = toNumber(option.handoverValue);

            if (
                !Number.isFinite(downPayment) ||
                !Number.isFinite(duringConstruction) ||
                !Number.isFinite(handoverValue)
            ) {
                return `Payment option ${option.id}: enter valid numbers for down payment, during construction, and handover.`;
            }

            if (downPayment < 0 || duringConstruction < 0 || handoverValue < 0) {
                return `Payment option ${option.id}: percentages cannot be negative.`;
            }

            const invalidInstallment = option.constructionInstallments.find(
                (item) =>
                    !Number.isFinite(toNumber(item.percentage)) ||
                    !(toNumber(item.percentage) > 0) ||
                    item.date.trim().length < 1
            );
            if (invalidInstallment) {
                return `Payment option ${option.id}: each added installment requires percentage and date.`;
            }

            const totalPercentage = downPayment + duringConstruction + handoverValue;
            if (Math.abs(totalPercentage - 100) >= 0.01) {
                return `Payment option ${option.id}: down payment + during construction + handover must equal 100%.`;
            }
        }

        return null;
    };

    const isPricePaymentComplete = !getPricePaymentValidationError();

    const isLocationComplete =
        locationDetails.zone.trim().length > 0 &&
        locationDetails.city.trim().length > 0 &&
        Number.isFinite(Number.parseFloat(locationDetails.latitude)) &&
        Number.isFinite(Number.parseFloat(locationDetails.longitude));

    const isUnitDetailsComplete =
        unitDetails.properties.length > 0 &&
        unitDetails.properties.every((property) => {
            const propertyAreaSqm = toNumber(property.areaSqm);
            const propertyAreaSqft = toNumber(property.areaSqft);
            return (
                property.propertyType.trim().length > 0 &&
                isObjectId(property.propertyType.trim()) &&
                propertyAreaSqm > 0 &&
                propertyAreaSqft > 0 &&
                property.layouts.length > 0 &&
                property.layouts.every((layout) => {
                    const layoutAreaSqm = toNumber(layout.areaSqm);
                    const layoutAreaSqft = toNumber(layout.areaSqft);
                    const bedrooms = toNumber(layout.bedrooms);
                    const bathrooms = toNumber(layout.bathrooms);
                    const totalUnits = toNumber(layout.totalUnits);
                    const layoutPrice = toNumber(layout.layoutPrice);
                    return (
                        layout.layoutName.trim().length > 0 &&
                        layoutAreaSqm > 0 &&
                        layoutAreaSqft > 0 &&
                        bedrooms >= 0 &&
                        bathrooms >= 0 &&
                        totalUnits > 0 &&
                        layoutPrice > 0 &&
                        Boolean(layout.floorPlanImage)
                    );
                })
            );
        });

    const uploadAndCacheMedia = async () => {
        const mediaSignature = buildMediaSignature(mediaUpload);
        if (uploadedMediaSignature === mediaSignature && uploadedMedia.images.length > 0) {
            const cachedMedia = {
                ...uploadedMedia,
                virtualTour360: mediaUpload.virtualTourLink.trim(),
            };
            setUploadedMedia(cachedMedia);
            return cachedMedia;
        }

        const formData = new FormData();
        mediaUpload.projectImages.forEach((file) => formData.append("images", file));
        if (mediaUpload.projectVideo) formData.append("video", mediaUpload.projectVideo);
        if (mediaUpload.brochureDoc) formData.append("brochure", mediaUpload.brochureDoc);
        if (mediaUpload.masterPlanImage) formData.append("masterPlan", mediaUpload.masterPlanImage);

        const response = await developerService.uploadProjectMedia(formData);
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
            .filter((item) => item.type !== "masterPlan")
            .map((item) => extractFilename(item.filename || item.url))
            .filter((item): item is string => Boolean(item));
        const masterPlanNames = (response.uploads?.images || [])
            .filter((item) => item.type === "masterPlan")
            .map((item) => extractFilename(item.filename || item.url))
            .filter((item): item is string => Boolean(item));
        const brochureName =
            extractFilename(response.project?.brochure) ||
            extractFilename(response.uploads?.documents?.[0]?.filename || response.uploads?.documents?.[0]?.url);
        const videoName =
            extractFilename(response.project?.videoTour) ||
            extractFilename(response.uploads?.videos?.[0]?.filename || response.uploads?.videos?.[0]?.url);
        const imageBase = response.baseUrls?.images;
        const videoBase = response.baseUrls?.videos;
        const documentBase = response.baseUrls?.documents;
        const uploadedImagePreviewUrls = (response.uploads?.images || [])
            .filter((item) => item.type !== "masterPlan")
            .map((item) => toPublicUrl(item, imageBase))
            .filter((item): item is string => Boolean(item));
        const uploadedMasterPlanPreview =
            toPublicUrl(
                (response.uploads?.images || []).find((item) => item.type === "masterPlan"),
                imageBase
            ) ||
            null;
        const uploadedVideoPreview = toPublicUrl(response.uploads?.videos?.[0], videoBase);
        const uploadedBrochurePreview = toPublicUrl(response.uploads?.documents?.[0], documentBase);

        const nextUploadedMedia = {
            images: imageNames,
            masterPlan: masterPlanNames,
            brochure: brochureName,
            videoTour: videoName,
            virtualTour360: mediaUpload.virtualTourLink.trim(),
        };

        setUploadedMedia(nextUploadedMedia);
        setUploadedMediaPreview({
            images: uploadedImagePreviewUrls,
            projectVideo: uploadedVideoPreview,
            brochureDoc: uploadedBrochurePreview,
            masterPlanImage: uploadedMasterPlanPreview,
        });
        setUploadedProjectImageKeys(mediaUpload.projectImages.map((f) => mediaFileKey(f)));
        setUploadedMediaSignature(mediaSignature);
        return nextUploadedMedia;
    };

    const onSaveDraft = async () => {
        if (activeStep === 1) return;
        if (!isProjectDetailsComplete) {
            toast.error(
                "Validation required",
                "Please fill all required project detail fields before saving draft."
            );
            return;
        }
        setIsSavingDraft(true);
        try {
            let draftMedia = {
                ...uploadedMedia,
                virtualTour360: mediaUpload.virtualTourLink.trim(),
            };
            let draftProperties: Array<Record<string, unknown>> | undefined;
            const hasAnyMediaSelection =
                mediaUpload.projectImages.length > 0 ||
                Boolean(mediaUpload.projectVideo) ||
                Boolean(mediaUpload.brochureDoc) ||
                Boolean(mediaUpload.masterPlanImage);
            if (activeStep >= 3 && hasAnyMediaSelection) {
                setIsUploadingMedia(true);
                try {
                    draftMedia = await uploadAndCacheMedia();
                } finally {
                    setIsUploadingMedia(false);
                }
            }

            let draftPaymentPlans:
                | Array<{
                    planName: string;
                    downPayment: { percentage: number };
                    duringConstruction: { percentage: number; installments: Array<{ percentage: number; date: string }> };
                    onHandover: { percentage: number };
                }>
                | undefined;
            let draftGovernmentFees: number | undefined;
            let draftLaunchPrice: { startingFrom: number; currency: "AED" } | undefined;
            if (activeStep >= 4 && isPricePaymentComplete) {
                draftGovernmentFees = toOptionalNumber(pricePayment.governmentFees);
                const draftStartingPrice = toOptionalNumber(pricePayment.projectPrice);
                if (draftStartingPrice && draftStartingPrice > 0) {
                    draftLaunchPrice = {
                        startingFrom: draftStartingPrice,
                        currency: "AED",
                    };
                }
                draftPaymentPlans = pricePayment.paymentOptions.map((option, index) => ({
                    planName: `Option ${index + 1}`,
                    downPayment: {
                        percentage: toNumber(option.downPayment),
                    },
                    duringConstruction: {
                        percentage: toNumber(option.duringConstruction),
                        installments: option.constructionInstallments.map((item) => ({
                            percentage: toNumber(item.percentage),
                            date: item.date,
                        })),
                    },
                    onHandover: {
                        percentage: toNumber(option.handoverValue),
                    },
                }));
            }

            let draftLocation:
                | {
                    address?: string;
                    city: string;
                    zone: string;
                    googlePlaceId?: string;
                    coordinates: {
                        type: "Point";
                        coordinates: [number, number];
                    };
                }
                | undefined;
            if (activeStep >= 5 && isLocationComplete) {
                const lat = toOptionalNumber(locationDetails.latitude);
                const lng = toOptionalNumber(locationDetails.longitude);
                if (lat !== undefined && lng !== undefined) {
                    draftLocation = {
                        address: locationDetails.formattedAddress || projectDetails.projectAddress.trim() || undefined,
                        city: locationDetails.city,
                        zone: locationDetails.zone,
                        googlePlaceId: locationDetails.placeId || projectDetails.projectAddressPlaceId || undefined,
                        coordinates: {
                            type: "Point",
                            coordinates: [lng, lat],
                        },
                    };
                }
            }

            if (activeStep >= 6 && isUnitDetailsComplete) {
                const floorPlanFileEntries = unitDetails.properties.flatMap((property) =>
                    property.layouts.flatMap((layout) =>
                        layout.floorPlanImage
                            ? [{ key: `${property.id}-${layout.id}`, file: layout.floorPlanImage }]
                            : []
                    )
                );

                let floorPlanFilenameByKey: Record<string, string> = {};
                if (floorPlanFileEntries.length > 0) {
                    const floorPlanFormData = new FormData();
                    floorPlanFileEntries.forEach((entry) => floorPlanFormData.append("floorPlans", entry.file));
                    setIsSubmittingProject(true);
                    try {
                        const floorPlanUploadResponse = await developerService.uploadProjectMedia(floorPlanFormData);
                        const uploadedFloorPlans = (floorPlanUploadResponse.uploads?.floorPlans || [])
                            .map((item) => extractFilename(item.filename || item.url))
                            .filter((name): name is string => Boolean(name));

                        if (uploadedFloorPlans.length !== floorPlanFileEntries.length) {
                            toast.error(
                                "Floor plan upload failed",
                                "Some floor plan files failed to upload. Please retry."
                            );
                            return;
                        }

                        floorPlanFilenameByKey = floorPlanFileEntries.reduce<Record<string, string>>(
                            (acc, entry, index) => {
                                acc[entry.key] = uploadedFloorPlans[index];
                                return acc;
                            },
                            {}
                        );
                    } finally {
                        setIsSubmittingProject(false);
                    }
                }

                draftProperties = unitDetails.properties.map((property) => ({
                    buildingName: property.towerName.trim() || undefined,
                    propertyType: property.propertyType,
                    areaSqm: toNumber(property.areaSqm),
                    areaSqft: toNumber(property.areaSqft),
                    layouts: property.layouts.map((layout) => ({
                        layoutName: layout.layoutName.trim(),
                        areaSqm: toNumber(layout.areaSqm),
                        areaSqft: toNumber(layout.areaSqft),
                        bedrooms: toNumber(layout.bedrooms),
                        maidBedroom: layout.hasMaidBedroom,
                        bathrooms: toNumber(layout.bathrooms),
                        totalUnits: toNumber(layout.totalUnits),
                        startingPrice: {
                            amount: toNumber(layout.layoutPrice),
                            currency: "AED",
                        },
                        floorPlans: floorPlanFilenameByKey[`${property.id}-${layout.id}`]
                            ? [floorPlanFilenameByKey[`${property.id}-${layout.id}`]]
                            : [],
                    })),
                }));
            }

            const response = await developerService.createProject({
                publishStatus: "draft",
                projectType: projectStatus,
                projectTitle: projectDetails.projectTitle.trim(),
                address: projectDetails.projectAddress.trim(),
                googlePlaceId: projectDetails.projectAddressPlaceId || undefined,
                aboutProject: projectDetails.aboutProject.trim(),
                description: projectDetails.projectDescription,
                amenities: projectDetails.amenityIds,
                images: draftMedia.images,
                masterPlan: draftMedia.masterPlan[0] || undefined,
                brochure: draftMedia.brochure || undefined,
                videoTour: draftMedia.videoTour || undefined,
                virtualTour360: draftMedia.virtualTour360 || undefined,
                governmentFees: draftGovernmentFees,
                launchPrice: draftLaunchPrice,
                paymentPlans: draftPaymentPlans,
                zone: draftLocation?.zone,
                city: draftLocation?.city,
                latitude: draftLocation?.coordinates.coordinates[1],
                longitude: draftLocation?.coordinates.coordinates[0],
                location: draftLocation,
                properties: draftProperties,
            });
            const draftProjectId = response?.nextSteps?.projectId;
            toast.success(
                "Draft saved",
                draftProjectId
                    ? `Project draft saved successfully (ID: ${draftProjectId}).`
                    : "Project draft saved successfully."
            );
            if (response?.nextSteps?.currentStatus === "unpublished") {
                toast.success(
                    "Moved to unpublished",
                    response?.nextSteps?.message || "Draft is complete and moved to unpublished."
                );
                navigate("/developer/project-management?tab=unpublished");
            } else {
                navigate("/developer/project-management?tab=drafts");
            }
        } catch (error: unknown) {
            const message =
                (error as { message?: string })?.message || "Failed to save draft.";
            toast.error("Save draft failed", message);
        } finally {
            setIsSavingDraft(false);
        }
    };

    const onNext = async () => {
        if (activeStep === 2 && !isProjectDetailsComplete) {
            toast.error(
                "Validation required",
                "Please fill all required project detail fields before continuing."
            );
            return;
        }

        if (activeStep === 3) {
            if (!isMediaStepComplete) {
                toast.error(
                    "Validation required",
                    "Please upload at least one project image before continuing."
                );
                return;
            }

            setIsUploadingMedia(true);
            try {
                await uploadAndCacheMedia();

                toast.success("Media uploaded", "Project media uploaded successfully.");
                setActiveStep((prev) => Math.min(steps.length, prev + 1));
            } catch (error: unknown) {
                const message =
                    (error as { message?: string })?.message || "Failed to upload project media.";
                toast.error("Media upload failed", message);
            } finally {
                setIsUploadingMedia(false);
            }
            return;
        }

        if (activeStep === 4 && !isPricePaymentComplete) {
            toast.error(
                "Validation required",
                getPricePaymentValidationError() ||
                "Complete project price, government fees, and payment plan split (total 100%) before continuing."
            );
            return;
        }

        if (activeStep === 5 && !isLocationComplete) {
            toast.error(
                "Validation required",
                "Please select a location on map to get city, zone, latitude and longitude."
            );
            return;
        }

        if (activeStep === 6 && !isUnitDetailsComplete) {
            toast.error(
                "Validation required",
                "Add at least one property with valid layouts, required fields, and floor plan image."
            );
            return;
        }

        if (activeStep === 6) {
            const floorPlanFileEntries = unitDetails.properties.flatMap((property) =>
                property.layouts.flatMap((layout) =>
                    layout.floorPlanImage
                        ? [{ key: `${property.id}-${layout.id}`, file: layout.floorPlanImage }]
                        : []
                )
            );

            const floorPlanFormData = new FormData();
            floorPlanFileEntries.forEach((entry) => floorPlanFormData.append("floorPlans", entry.file));

            setIsSubmittingProject(true);
            let floorPlanFilenameByKey: Record<string, string> = {};
            try {
                if (floorPlanFileEntries.length > 0) {
                    const floorPlanUploadResponse = await developerService.uploadProjectMedia(floorPlanFormData);
                    const uploadedFloorPlans = (floorPlanUploadResponse.uploads?.floorPlans || [])
                        .map((item) => extractFilename(item.filename || item.url))
                        .filter((name): name is string => Boolean(name));

                    if (uploadedFloorPlans.length !== floorPlanFileEntries.length) {
                        toast.error(
                            "Floor plan upload failed",
                            "Some floor plan files failed to upload. Please retry."
                        );
                        return;
                    }

                    floorPlanFilenameByKey = floorPlanFileEntries.reduce<Record<string, string>>(
                        (acc, entry, index) => {
                            acc[entry.key] = uploadedFloorPlans[index];
                            return acc;
                        },
                        {}
                    );
                }
            } catch (error: unknown) {
                const message =
                    (error as { message?: string })?.message || "Failed to upload floor plan files.";
                toast.error("Floor plan upload failed", message);
                setIsSubmittingProject(false);
                return;
            }

            const paymentPlans = pricePayment.paymentOptions.map((option, index) => ({
                planName: `Option ${index + 1}`,
                downPayment: {
                    percentage: toNumber(option.downPayment),
                },
                duringConstruction: {
                    percentage: toNumber(option.duringConstruction),
                    installments: option.constructionInstallments.map((item) => ({
                        percentage: toNumber(item.percentage),
                        date: item.date,
                    })),
                },
                onHandover: {
                    percentage: toNumber(option.handoverValue),
                },
            }));

            const properties = unitDetails.properties.map((property) => ({
                buildingName: property.towerName.trim() || undefined,
                propertyType: property.propertyType,
                areaSqm: toNumber(property.areaSqm),
                areaSqft: toNumber(property.areaSqft),
                layouts: property.layouts.map((layout) => ({
                    layoutName: layout.layoutName.trim(),
                    areaSqm: toNumber(layout.areaSqm),
                    areaSqft: toNumber(layout.areaSqft),
                    bedrooms: toNumber(layout.bedrooms),
                    maidBedroom: layout.hasMaidBedroom,
                    bathrooms: toNumber(layout.bathrooms),
                    totalUnits: toNumber(layout.totalUnits),
                    startingPrice: {
                        amount: toNumber(layout.layoutPrice),
                        currency: "AED",
                    },
                    floorPlans: floorPlanFilenameByKey[`${property.id}-${layout.id}`]
                        ? [floorPlanFilenameByKey[`${property.id}-${layout.id}`]]
                        : [],
                })),
            }));

            try {
                const response = await developerService.createProject({
                    publishStatus: "unpublished",
                    projectType: projectStatus,
                    projectTitle: projectDetails.projectTitle.trim(),
                    aboutProject: projectDetails.aboutProject.trim(),
                    description: projectDetails.projectDescription,
                    amenities: projectDetails.amenityIds,
                    address: projectDetails.projectAddress.trim(),
                    googlePlaceId: projectDetails.projectAddressPlaceId || locationDetails.placeId || undefined,
                    zone: locationDetails.zone,
                    city: locationDetails.city,
                    latitude: toNumber(locationDetails.latitude),
                    longitude: toNumber(locationDetails.longitude),
                    images: uploadedMedia.images,
                    masterPlan: uploadedMedia.masterPlan[0] || undefined,
                    brochure: uploadedMedia.brochure || undefined,
                    videoTour: uploadedMedia.videoTour || undefined,
                    virtualTour360: uploadedMedia.virtualTour360 || undefined,
                    governmentFees: toNumber(pricePayment.governmentFees),
                    launchPrice: {
                        startingFrom: toNumber(pricePayment.projectPrice),
                        currency: "AED",
                    },
                    paymentPlans,
                    location: {
                        address: locationDetails.formattedAddress || projectDetails.projectAddress.trim(),
                        city: locationDetails.city,
                        zone: locationDetails.zone,
                        googlePlaceId: locationDetails.placeId || projectDetails.projectAddressPlaceId || undefined,
                        coordinates: {
                            type: "Point",
                            coordinates: [toNumber(locationDetails.longitude), toNumber(locationDetails.latitude)],
                        },
                    },
                    properties,
                });

                toast.success(
                    "Project created",
                    response?.nextSteps?.message || "Project has been created successfully."
                );
                navigate("/developer/project-management?tab=unpublished");
            } catch (error: unknown) {
                const message =
                    (error as { message?: string })?.message || "Failed to create project.";
                toast.error("Project creation failed", message);
            } finally {
                setIsSubmittingProject(false);
            }
            return;
        }

        setActiveStep((prev) => Math.min(steps.length, prev + 1));
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            {(isSavingDraft || isUploadingMedia || isSubmittingProject) && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
            {/* Header */}
            <DeveloperHeader
                title="Add Project"
                showBack={true}
                onBackClick={() => navigate(-1)}
            />
            <Stepper activeStep={activeStep} steps={steps} />

            {activeStep === 1 && (
                <ProjectStatusStep
                    status={projectStatus}
                    options={projectTypeStatusOptions}
                    onChange={setProjectStatus}
                />
            )}
            {activeStep === 2 && (
                <ProjectDetailsStep
                    value={projectDetails}
                    amenityOptions={amenityOptions}
                    onChange={setProjectDetails}
                />
            )}
            {activeStep === 3 && (
                <MediaUploadStep
                    value={mediaUpload}
                    onChange={setMediaUpload}
                    uploadedPreview={uploadedMediaPreview}
                    useUploadedPreview={shouldUseUploadedMediaPreview}
                    uploadedProjectImageKeys={uploadedProjectImageKeys}
                />
            )}
            {activeStep === 4 && (
                <PricePayment
                    value={pricePayment}
                    onChange={setPricePayment}
                />
            )}
            {activeStep === 5 && (
                <LocationAdd
                    value={locationDetails}
                    onChange={setLocationDetails}
                    projectAddress={projectDetails.projectAddress}
                    projectAddressPlaceId={projectDetails.projectAddressPlaceId}
                />
            )}
            {activeStep === 6 && (
                <UnitDetails
                    value={unitDetails}
                    onChange={setUnitDetails}
                    propertyTypeOptions={propertyTypeOptions}
                />
            )}
            {activeStep > 6 && (
                <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] p-[20px] text-[#707070]">
                    Step content will be added here.
                </div>
            )}

            <div className="flex items-center justify-between pt-[8px]">
                <button
                    type="button"
                    onClick={() => navigate("/developer/project-management?tab=unpublished")}
                    className="cursor-pointer h-[44px] px-[20px] rounded-[10px] border border-[#222] text-[14px] font-[Bold] text-[#222]"
                >
                    Cancel
                </button>
                <div className="flex items-center gap-[10px]">
                    {activeStep !== 1 && (
                        <button
                            type="button"
                            onClick={() => setActiveStep((prev) => Math.max(1, prev - 1))}
                            disabled={isSavingDraft || isUploadingMedia || isSubmittingProject}
                            className={`h-[44px] px-[20px] rounded-[10px] border text-[14px] font-[Bold] ${isSavingDraft || isUploadingMedia || isSubmittingProject
                                    ? "border-[#222]/40 text-[#222]/40 cursor-not-allowed"
                                    : "border-[#222] text-[#222] cursor-pointer"
                                }`}
                        >
                            Back
                        </button>
                    )}
                    {activeStep !== 1 && (
                        <button
                            type="button"
                            onClick={onSaveDraft}
                            disabled={isSavingDraft}
                            className={`h-[44px] px-[20px] rounded-[10px] border text-[14px] font-[Bold] ${isSavingDraft
                                    ? "border-[#222]/40 text-[#222]/40 cursor-not-allowed"
                                    : "border-[#222] text-[#222] cursor-pointer"
                                }`}
                        >
                            {isSavingDraft ? "Saving..." : "Save as draft"}
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onNext}
                        disabled={
                            (activeStep === 5 && !isLocationComplete) ||
                            isSavingDraft ||
                            isUploadingMedia ||
                            isSubmittingProject
                        }
                        className={`h-[44px] px-[20px] rounded-[10px] text-white text-[14px] font-[Bold] ${(activeStep === 5 && !isLocationComplete) ||
                                isSavingDraft ||
                                isUploadingMedia ||
                                isSubmittingProject
                                ? "bg-[#EA3934]/50 cursor-not-allowed"
                                : "bg-[#EA3934] cursor-pointer"
                            }`}
                    >
                        {isUploadingMedia ? "Uploading..." : isSubmittingProject ? "Submitting..." : "Next"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddProject;
