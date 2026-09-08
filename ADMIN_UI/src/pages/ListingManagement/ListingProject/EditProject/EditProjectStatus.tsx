import { useEffect, useMemo, useRef, useState } from "react";
import "quill/dist/quill.snow.css";
import { NewProjectsIcon, OffPlanProjectsIcon, TickIcon } from "../../../../assets/icons";
import { projectsService, type AmenityMasterItem } from "../../../../services/projectsService";
import { useToast } from "../../../../context/ToastContext";
import { createToastNotify } from "../../../../utils/toastNotify";

type EditProjectStatusProps = {
    projectId: string;
    project: Record<string, unknown>;
    onContinue?: () => void;
    onAfterSave?: () => void | Promise<void>;
    primaryActionLabel?: string;
};

type AmenityOption = {
    id: string;
    name: string;
};

type FormState = {
    projectType: "ready" | "off-plan";
    isActive: boolean;
    projectTitle: string;
    projectAddress: string;
    googlePlaceId: string;
    projectDescription: string;
    aboutProject: string;
    amenityIds: string[];
};

const toFormState = (project: Record<string, unknown>): FormState => {
    const location = (project.location || {}) as Record<string, unknown>;
    const amenities = Array.isArray(project.amenities) ? project.amenities : [];
    return {
        projectType: project.projectType === "off-plan" ? "off-plan" : "ready",
        isActive: project.isActive !== false,
        projectTitle: String(project.projectName || ""),
        projectAddress: String(location.address || ""),
        googlePlaceId: String(location.googlePlaceId || ""),
        projectDescription: String(project.description || ""),
        aboutProject: String(project.aboutProject || ""),
        amenityIds: amenities
            .map((item) => (item && typeof item === "object" ? String((item as { _id?: string })._id || "") : ""))
            .filter(Boolean),
    };
};

const EditProjectStatus = ({
    projectId,
    project,
    onContinue,
    onAfterSave,
    primaryActionLabel = "Save changes",
}: EditProjectStatusProps) => {
    const { push } = useToast();
    const toast = createToastNotify(push);
    const projectStatusOptions = [
        { id: "ready" as const, label: "New Projects", Icon: NewProjectsIcon },
        { id: "off-plan" as const, label: "Off plan project", Icon: OffPlanProjectsIcon },
    ];
    const initialState = useMemo(() => toFormState(project), [project]);
    const [form, setForm] = useState<FormState>(initialState);
    const [amenityOptions, setAmenityOptions] = useState<AmenityOption[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const quillRef = useRef<HTMLDivElement | null>(null);
    const [quill, setQuill] = useState<any>(null);
    const imageInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setForm(initialState);
    }, [initialState]);

    useEffect(() => {
        let mounted = true;
        let instance: any = null;

        const initQuill = async () => {
            if (!quillRef.current) return;
            try {
                const { default: Quill } = await import("quill");
                if (!mounted || !quillRef.current) return;

                instance = new Quill(quillRef.current, {
                    theme: "snow",
                    modules: {
                        toolbar: [
                            [{ header: [1, 2, 3, false] }],
                            ["bold", "italic", "underline"],
                            [{ list: "ordered" }, { list: "bullet" }],
                            // ["link", "image"],
                            ["clean"],
                        ],
                    },
                });
                setQuill(instance);
            } catch {
                setQuill(null);
            }
        };

        void initQuill();

        return () => {
            mounted = false;
            setQuill(null);
            instance = null;
        };
    }, []);

    useEffect(() => {
        projectsService
            .listAmenities()
            .then((items) => {
                const amenities = (items || [])
                    .filter((item: AmenityMasterItem) => Boolean(item?._id && item?.name))
                    .map((item: AmenityMasterItem) => ({ id: String(item._id), name: String(item.name) }));
                setAmenityOptions(amenities);
            })
            .catch((error: unknown) => {
                const message = (error as { message?: string })?.message || "Unable to load amenities.";
                toast.error("Master data load failed", message);
            });
    }, []);

    useEffect(() => {
        if (!quill) return;
        if (quill.root.innerHTML !== form.projectDescription) {
            quill.root.innerHTML = form.projectDescription || "";
        }

        const onTextChange = () => {
            setForm((prev) => ({ ...prev, projectDescription: quill.root.innerHTML }));
        };
        quill.on("text-change", onTextChange);

        try {
            const toolbar = quill.getModule("toolbar") as { addHandler?: (name: string, cb: () => void) => void };
            toolbar?.addHandler?.("image", () => imageInputRef.current?.click());
        } catch {
            // No-op
        }

        return () => {
            quill.off("text-change", onTextChange);
        };
    }, [quill, form.projectDescription]);

    const insertImageFromFile = (file: File) => {
        if (!quill || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
            const range = quill.getSelection(true);
            const index = range ? range.index : quill.getLength();
            quill.insertEmbed(index, "image", String(reader.result), "user");
            quill.setSelection(index + 1, 0, "user");
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const input = imageInputRef.current;
        if (!input) return;
        const onFileChange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) insertImageFromFile(file);
            target.value = "";
        };
        input.addEventListener("change", onFileChange);
        return () => input.removeEventListener("change", onFileChange);
    }, [quill]);

    const toggleAmenity = (amenityId: string) => {
        setForm((prev) => ({
            ...prev,
            amenityIds: prev.amenityIds.includes(amenityId)
                ? prev.amenityIds.filter((id) => id !== amenityId)
                : [...prev.amenityIds, amenityId],
        }));
    };

    const onDiscard = () => {
        setForm(initialState);
    };

    const onSave = async () => {
        setIsSaving(true);
        try {
            await projectsService.updateProject(projectId, {
                projectType: form.projectType,
                isActive: form.isActive,
                projectName: form.projectTitle.trim(),
                address: form.projectAddress.trim(),
                googlePlaceId: form.googlePlaceId || undefined,
                description: form.projectDescription,
                aboutProject: form.aboutProject.trim(),
                amenities: form.amenityIds,
            });
            toast.success("Project updated", "Project status and details updated successfully.");
            await onAfterSave?.();
            onContinue?.();
        } catch (error: unknown) {
            const message =
                (error as { message?: string })?.message || "Failed to update project details.";
            toast.error("Update failed", message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div>
            <div className="bg-white p-[16px] md:p-[30px] border-b border-[rgba(34,34,34,0.10)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[16px] mb-[30px]">
                    <h3 className="text-[20px] font-[Bold] text-[#222]">Project status</h3>
                    <div className="flex items-center justify-between sm:justify-end gap-[12px]  rounded-[10px] px-[14px] h-[44px] min-w-[220px] sm:min-w-[260px]">
                        <span className="text-[13px] font-[Medium] text-[#222]">Project Active</span>
                        <button
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
                            aria-pressed={form.isActive}
                            aria-label={form.isActive ? "Deactivate project" : "Activate project"}
                            className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 shrink-0 ${form.isActive ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"
                                }`}
                        >
                            <span
                                className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${form.isActive ? "left-[22px]" : "left-[2px]"
                                    }`}
                            />
                        </button>
                    </div>
                </div>
                <p className="text-[14px] font-[SemiBold] text-[#222] mb-[15px]">Select project status <span className="text-[#EA3934]">*</span></p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
                    {projectStatusOptions.map(({ id, label, Icon }) => {
                        const isActive = form.projectType === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setForm((prev) => ({ ...prev, projectType: id }))}
                                className={`h-[115px] p-[20px_15px] rounded-[10px] border flex flex-col items-center justify-center gap-[10px] ${isActive
                                    ? "border-[rgba(8,50,174,0.30)] bg-[rgba(8,50,174,0.10)]"
                                    : "border-[rgba(34,34,34,0.10)] bg-white"
                                    }`}
                            >
                                <Icon width={50} height={50} fill={isActive ? "#0832AE" : "#222"} />
                                <span className={`text-[13px] font-[Medium] ${isActive ? "text-[#0832AE]" : "text-[#222]"}`}>
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="bg-white  md:p-[30px] p-[16px]">
                <h3 className="text-[20px] font-[Bold] text-[#222] mb-[30px]">Project details</h3>
                <div className="flex flex-col gap-[30px]">
                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Project Title <span className="text-[#EA3934]">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter project title"
                            value={form.projectTitle}
                            onChange={(event) => setForm((prev) => ({ ...prev, projectTitle: event.target.value }))}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Project Address <span className="text-[#EA3934]">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="Enter Street name, Area / locality, City, State, Country"
                            value={form.projectAddress}
                            onChange={(event) => setForm((prev) => ({ ...prev, projectAddress: event.target.value }))}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[14px] font-[600] text-[#222] block mb-[8px]">
                            Project description <span className="text-[#EA3934]">*</span>
                        </label>
                        <div className="edittoolbar relative h-[320px] border border-[rgba(34,34,34,0.10)] rounded-[12px] overflow-hidden bg-white">
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

                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">
                            Amenities <span className="text-[#EA3934]">*</span>
                        </label>
                        <div className="flex flex-wrap gap-[8px]">
                            {amenityOptions.map((amenity) => {
                                const isActive = form.amenityIds.includes(amenity.id);
                                return (
                                    <button
                                        key={amenity.id}
                                        type="button"
                                        onClick={() => toggleAmenity(amenity.id)}
                                        className={`h-[39px] rounded-full px-[14px] border text-[13px] font-[Regular] inline-flex items-center gap-[6px] cursor-pointer ${isActive
                                            ? "bg-[#222] text-white border-[#222]"
                                            : "bg-white text-[#222] border-[rgba(34,34,34,0.10)]"
                                            }`}
                                    >
                                        <span
                                            className={`h-[15px] w-[15px] rounded-full border flex items-center justify-center ${isActive
                                                ? "bg-[#EA3934] border-[#EA3934]"
                                                : "bg-white border-[rgba(34,34,34,0.20)]"
                                                }`}
                                        >
                                            {isActive && <TickIcon width={8} height={7} fill="#fff" />}
                                        </span>
                                        {amenity.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">
                            About the project <span className="text-[#EA3934]">*</span>
                        </label>
                        <textarea
                            placeholder="Describe about the project"
                            rows={8}
                            value={form.aboutProject}
                            onChange={(event) => setForm((prev) => ({ ...prev, aboutProject: event.target.value }))}
                            className="w-full min-h-[220px] rounded-[10px] border border-[rgba(34,34,34,0.10)] p-[12px] text-[13px] font-[Regular] text-[#222] placeholder:text-[#A0A0A0] resize-none focus:outline-none"
                        />
                    </div>
                </div>
                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                />
            </div>
            <div className="flex items-center justify-end gap-[10px] mt-[30px]">
                <button
                    type="button"
                    onClick={onDiscard}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] border border-[#222]  text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px]"
                >
                    Discard
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className={`h-[44px] rounded-[10px] px-[20px] text-[14px] font-[Bold] inline-flex items-center gap-[5px] ${isSaving ? "bg-[#EA3934]/50 text-[#FFF] cursor-not-allowed" : "bg-[#EA3934] text-[#FFF] cursor-pointer"}`}
                >
                    {isSaving ? "Saving..." : primaryActionLabel}
                </button>
            </div>
        </div>
    );
};

export default EditProjectStatus;
