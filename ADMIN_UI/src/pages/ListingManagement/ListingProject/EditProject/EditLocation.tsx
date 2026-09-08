import { useEffect, useMemo, useState } from "react";
import LocationAdd from "../AddProject/AddProjectComponents/LocationAdd";
import type { LocationFormValue } from "../AddProject/AddProjectComponents/LocationAdd";
import { projectsService } from "../../../../services/projectsService";
import { useToast } from "../../../../context/ToastContext";
import { createToastNotify } from "../../../../utils/toastNotify";

type EditLocationProps = {
    projectId: string;
    project: Record<string, unknown>;
    onAfterSave: () => Promise<void>;
    onContinue?: () => void;
    primaryActionLabel?: string;
};

const toStringValue = (value: unknown) => {
    if (typeof value === "string") return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return "";
};

const toLocationFormState = (project: Record<string, unknown>): LocationFormValue => {
    const location = (project.location || {}) as Record<string, unknown>;
    const coordinates = ((location.coordinates || {}) as { coordinates?: unknown }).coordinates;
    const [lng, lat] = Array.isArray(coordinates) ? coordinates : [undefined, undefined];
    const latitude = toStringValue(location.latitude || project.latitude || lat);
    const longitude = toStringValue(location.longitude || project.longitude || lng);
    const formattedAddress = toStringValue(location.address || project.address || project.projectAddress);
    const searchLocation = formattedAddress || toStringValue(location.zone || location.city);

    return {
        zone: toStringValue(location.zone || project.zone),
        city: toStringValue(location.city || project.city),
        latitude,
        longitude,
        searchLocation,
        formattedAddress,
        placeId: toStringValue(location.googlePlaceId || project.googlePlaceId),
    };
};

const EditLocation = ({ projectId, project, onAfterSave, onContinue, primaryActionLabel = "Save changes" }: EditLocationProps) => {
    const { push } = useToast();
    const toast = createToastNotify(push);
    const initialState = useMemo(() => toLocationFormState(project), [project]);
    const [form, setForm] = useState<LocationFormValue>(initialState);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setForm(initialState);
    }, [initialState]);

    const handleDiscard = () => {
        setForm(initialState);
    };

    const handleSave = async () => {
        const latitude = Number.parseFloat(form.latitude);
        const longitude = Number.parseFloat(form.longitude);
        if (!form.zone.trim() || !form.city.trim()) {
            toast.error("Validation required", "Please select a valid location to set zone and city.");
            return;
        }
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            toast.error("Validation required", "Please pin a valid location on map.");
            return;
        }

        const address = form.formattedAddress.trim();
        const placeId = form.placeId.trim();

        setIsSaving(true);
        try {
            await projectsService.updateProject(projectId, {
                location: {
                    address: address || undefined,
                    city: form.city.trim(),
                    zone: form.zone.trim(),
                    googlePlaceId: placeId || undefined,
                    coordinates: {
                        type: "Point",
                        coordinates: [longitude, latitude],
                    },
                },
            });
            toast.success("Location updated", "Project location has been updated.");
            await onAfterSave();
            onContinue?.();
        } catch (error: unknown) {
            const message =
                (error as { message?: string })?.message || "Failed to save project location.";
            toast.error("Save failed", message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <div className={isSaving ? "pointer-events-none opacity-60" : ""}>
                <LocationAdd
                    value={form}
                    onChange={setForm}
                    projectAddress={initialState.formattedAddress}
                    projectAddressPlaceId={initialState.placeId}
                />
            </div>
            <div className="flex items-center justify-end gap-[10px] mt-[30px]">
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
                    {isSaving ? "Saving..." : primaryActionLabel}
                </button>
            </div>
        </div>
    );
};

export default EditLocation;
