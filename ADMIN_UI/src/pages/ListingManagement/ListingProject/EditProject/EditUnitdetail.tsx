import { useCallback, useEffect, useMemo, useState } from "react";
import UnitDetails from "../AddProject/AddProjectComponents/UnitDetails";
import type {
    UnitDetailsFormValue,
    UnitPropertyTypeOption,
} from "../AddProject/AddProjectComponents/UnitDetails";
import {
    projectsService,
    type PropertyTypeMasterItem,
    type SupportedUrlsMasterData,
} from "../../../../services/projectsService";
import { API_BASE_URL } from "../../../../services/apiClient";
import { useToast } from "../../../../context/ToastContext";
import { createToastNotify } from "../../../../utils/toastNotify";

type EditUnitdetailProps = {
    projectId: string;
    unitProperties: Array<Record<string, unknown>>;
    onAfterSave: () => Promise<void>;
    primaryActionLabel?: string;
};

const isObjectId = (value: string) => /^[a-fA-F0-9]{24}$/.test(value);

const toNumber = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : NaN;
};

const extractFilename = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.includes("/") ? trimmed.split("/").pop() || null : trimmed;
};

const extractProjectImgBase = (data: SupportedUrlsMasterData): string | null => {
    const candidates: Array<Record<string, unknown> | undefined> = [];
    if (data.supportedUrls && typeof data.supportedUrls === "object") {
        candidates.push(data.supportedUrls);
    }
    if (data.supportedurls && typeof data.supportedurls === "object") {
        candidates.push(data.supportedurls);
    }
    if (data.items && !Array.isArray(data.items) && typeof data.items === "object") {
        candidates.push(data.items);
    }
    if (Array.isArray(data.items)) {
        data.items.forEach((item) => {
            if (item && typeof item === "object") candidates.push(item);
        });
    }

    for (const candidate of candidates) {
        const projectUrl = candidate?.projectUrl;
        if (projectUrl && typeof projectUrl === "object") {
            const img = (projectUrl as Record<string, unknown>).img;
            if (typeof img === "string" && img.trim()) return img;
        }
    }

    return null;
};

const toLayoutPriceString = (startingPrice: unknown): string => {
    if (!startingPrice || typeof startingPrice !== "object") return "";
    const amount = (startingPrice as { amount?: unknown }).amount;
    if (typeof amount === "number" && Number.isFinite(amount)) return String(amount);
    return "";
};

const mapUnitPropertiesToForm = (rows: Array<Record<string, unknown>>): UnitDetailsFormValue => {
    let nextPropertyId = 1;
    const properties = rows.map((row) => {
        const propertyId = nextPropertyId++;
        const layoutsRaw = Array.isArray(row.layouts) ? row.layouts : [];
        let nextLayoutId = 1;
        const layouts = layoutsRaw.map((lay) => {
            const layout = lay as Record<string, unknown>;
            const layoutId = nextLayoutId++;
            const floorPlans = Array.isArray(layout.floorPlans)
                ? (layout.floorPlans as unknown[]).map((x) => String(x)).filter(Boolean)
                : [];
            return {
                id: layoutId,
                isOpen: true,
                layoutName: String(layout.layoutName ?? ""),
                areaSqm: String(layout.areaSqm ?? ""),
                areaSqft: String(layout.areaSqft ?? ""),
                bedrooms: String(layout.bedrooms ?? ""),
                hasMaidBedroom: Boolean(layout.maidBedroom),
                bathrooms: String(layout.bathrooms ?? ""),
                totalUnits: String(layout.totalUnits ?? ""),
                layoutPrice: toLayoutPriceString(layout.startingPrice),
                floorPlanImage: null,
                layoutMongoId: layout._id ? String(layout._id) : undefined,
                existingFloorPlanFilenames: floorPlans.length ? floorPlans : undefined,
            };
        });
        return {
            id: propertyId,
            isOpen: true,
            towerName: String(row.buildingName ?? ""),
            propertyType: row.propertyType ? String(row.propertyType) : "",
            areaSqm: String(row.areaSqm ?? ""),
            areaSqft: String(row.areaSqft ?? ""),
            layouts,
            buildingMongoId: row._id ? String(row._id) : undefined,
        };
    });
    return { properties };
};

const validateUnitForm = (value: UnitDetailsFormValue): string | null => {
    if (value.properties.length < 1) {
        return "Add at least one property with layouts.";
    }
    for (const property of value.properties) {
        const propertyAreaSqm = toNumber(property.areaSqm);
        const propertyAreaSqft = toNumber(property.areaSqft);
        if (
            !property.propertyType.trim() ||
            !isObjectId(property.propertyType.trim()) ||
            !(propertyAreaSqm > 0) ||
            !(propertyAreaSqft > 0)
        ) {
            return "Each property needs a valid property type and positive area (sq.m and sq.ft).";
        }
        if (property.layouts.length < 1) {
            return "Each property needs at least one layout.";
        }
        for (const layout of property.layouts) {
            const layoutAreaSqm = toNumber(layout.areaSqm);
            const layoutAreaSqft = toNumber(layout.areaSqft);
            const bedrooms = toNumber(layout.bedrooms);
            const bathrooms = toNumber(layout.bathrooms);
            const totalUnits = toNumber(layout.totalUnits);
            const layoutPrice = toNumber(layout.layoutPrice);
            const hasFloorPlan =
                Boolean(layout.floorPlanImage) ||
                Boolean(layout.existingFloorPlanFilenames && layout.existingFloorPlanFilenames.length > 0);
            if (!layout.layoutName.trim()) {
                return "Each layout needs a name.";
            }
            if (!(layoutAreaSqm > 0) || !(layoutAreaSqft > 0)) {
                return "Each layout needs positive size (sq.m and sq.ft).";
            }
            if (!(bedrooms >= 0) || !(bathrooms >= 0)) {
                return "Bedrooms and bathrooms must be valid numbers (0 or more).";
            }
            if (!layout.layoutMongoId && !(totalUnits >= 1)) {
                return "New layouts require at least one unit.";
            }
            if (!(layoutPrice > 0)) {
                return "Each layout needs a positive starting price.";
            }
            if (!hasFloorPlan) {
                return "Each layout needs a floor plan image.";
            }
        }
    }
    return null;
};

const buildPropertiesPayload = (
    value: UnitDetailsFormValue,
    floorPlanFilenameByKey: Record<string, string>
): Array<Record<string, unknown>> => {
    return value.properties.map((property) => {
        const body: Record<string, unknown> = {
            propertyType: property.propertyType.trim(),
            areaSqm: toNumber(property.areaSqm),
            areaSqft: toNumber(property.areaSqft),
            layouts: property.layouts.map((layout) => {
                const key = `${property.id}-${layout.id}`;
                const uploaded = floorPlanFilenameByKey[key];
                const existing = (layout.existingFloorPlanFilenames || [])
                    .map((f) => extractFilename(f))
                    .filter((name): name is string => Boolean(name));
                const floorPlans = uploaded ? [uploaded] : existing;

                const layoutBody: Record<string, unknown> = {
                    layoutName: layout.layoutName.trim(),
                    areaSqm: toNumber(layout.areaSqm),
                    areaSqft: toNumber(layout.areaSqft),
                    bedrooms: toNumber(layout.bedrooms),
                    maidBedroom: layout.hasMaidBedroom,
                    bathrooms: toNumber(layout.bathrooms),
                    floorPlans,
                };
                const price = toNumber(layout.layoutPrice);
                layoutBody.startingPrice =
                    Number.isFinite(price) && price > 0 ? { amount: price, currency: "AED" } : null;

                if (layout.layoutMongoId) {
                    layoutBody._id = layout.layoutMongoId;
                } else {
                    layoutBody.totalUnits = toNumber(layout.totalUnits);
                }
                return layoutBody;
            }),
        };

        if (property.buildingMongoId) {
            body._id = property.buildingMongoId;
        }
        const tower = property.towerName.trim();
        if (tower) {
            body.buildingName = tower;
        }
        return body;
    });
};

const EditUnitdetail = ({ projectId, unitProperties, onAfterSave, primaryActionLabel = "Save changes" }: EditUnitdetailProps) => {
    const { push } = useToast();
    const toast = createToastNotify(push);
    const initialForm = useMemo(() => mapUnitPropertiesToForm(unitProperties), [unitProperties]);
    const [form, setForm] = useState<UnitDetailsFormValue>(initialForm);
    const [propertyTypeOptions, setPropertyTypeOptions] = useState<UnitPropertyTypeOption[]>([]);
    const [floorPlanBaseUrl, setFloorPlanBaseUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fallbackImageBase = useMemo(() => {
        const origin = API_BASE_URL.replace(/\/api\/?$/, "");
        return `${origin}/uploads/img/project/`;
    }, []);

    useEffect(() => {
        setForm(initialForm);
    }, [initialForm]);

    useEffect(() => {
        let isMounted = true;
        projectsService
            .listPropertyTypesMaster()
            .then((data) => {
                if (!isMounted) return;
                const propertyTypes = data
                    .filter(
                        (item: PropertyTypeMasterItem) =>
                            Boolean(item?._id && item?.name) && item.isActive !== false
                    )
                    .sort((a: PropertyTypeMasterItem, b: PropertyTypeMasterItem) => {
                        const orderA =
                            typeof a.displayOrder === "number" ? a.displayOrder : Number.MAX_SAFE_INTEGER;
                        const orderB =
                            typeof b.displayOrder === "number" ? b.displayOrder : Number.MAX_SAFE_INTEGER;
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
                    (error as { message?: string })?.message || "Unable to load property type options.";
                toast.error("Master data load failed", message);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;
        projectsService
            .getSupportedUrls()
            .then((data) => {
                if (!isMounted) return;
                const resolved = extractProjectImgBase(data);
                setFloorPlanBaseUrl((resolved || fallbackImageBase).replace(/\/?$/, "/"));
            })
            .catch(() => {
                if (!isMounted) return;
                setFloorPlanBaseUrl(fallbackImageBase.replace(/\/?$/, "/"));
            });
        return () => {
            isMounted = false;
        };
    }, [fallbackImageBase]);

    const resolveFloorPlanSrc = useCallback(
        (filename: string) => {
            const name = extractFilename(filename);
            if (!name || !floorPlanBaseUrl) return null;
            return `${floorPlanBaseUrl}${encodeURIComponent(name).replace(/%2F/g, "/")}`;
        },
        [floorPlanBaseUrl]
    );

    const handleDiscard = () => {
        setForm(initialForm);
    };

    const handleSave = async () => {
        const validationError = validateUnitForm(form);
        if (validationError) {
            toast.error("Validation required", validationError);
            return;
        }

        const floorPlanFileEntries = form.properties.flatMap((property) =>
            property.layouts.flatMap((layout) =>
                layout.floorPlanImage
                    ? [{ key: `${property.id}-${layout.id}`, file: layout.floorPlanImage }]
                    : []
            )
        );

        const floorPlanFormData = new FormData();
        floorPlanFormData.append("projectId", projectId);
        floorPlanFileEntries.forEach((entry) => floorPlanFormData.append("floorPlans", entry.file));

        setIsSaving(true);
        let floorPlanFilenameByKey: Record<string, string> = {};
        try {
            if (floorPlanFileEntries.length > 0) {
                const floorPlanUploadResponse = await projectsService.uploadProjectMedia(floorPlanFormData);
                const rawFloorPlans = floorPlanUploadResponse.uploads?.floorPlans;
                const uploadedFloorPlans = (Array.isArray(rawFloorPlans) ? rawFloorPlans : [])
                    .map((item) => {
                        const row = item as { filename?: string; url?: string };
                        return extractFilename(row.filename || row.url);
                    })
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

            const properties = buildPropertiesPayload(form, floorPlanFilenameByKey);
            await projectsService.updateProject(projectId, { properties });
            toast.success("Unit details saved", "Layouts and unit configuration were updated.");
            await onAfterSave();
        } catch (error: unknown) {
            const message = (error as { message?: string })?.message || "Failed to save unit details.";
            toast.error("Save failed", message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <div className={`rounded-b-[15px] bg-white md:p-[30px] p-[16px] ${isSaving ? "pointer-events-none opacity-60" : ""}`}>
                <UnitDetails
                    value={form}
                    onChange={setForm}
                    propertyTypeOptions={propertyTypeOptions}
                    resolveFloorPlanSrc={floorPlanBaseUrl ? resolveFloorPlanSrc : undefined}
                />
            </div>
            <div className="flex items-center justify-end gap-[10px] mt-[30px] px-[16px] md:px-[30px] pb-[20px]">
                <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={isSaving}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] border border-[#222] text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px] disabled:opacity-50"
                >
                    Discard
                </button>
                <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] bg-[#EA3934] text-[#FFF] text-[14px] font-[Bold] inline-flex items-center gap-[5px] disabled:opacity-50"
                >
                    {isSaving ? "Saving…" : primaryActionLabel}
                </button>
            </div>
        </div>
    );
};

export default EditUnitdetail;
