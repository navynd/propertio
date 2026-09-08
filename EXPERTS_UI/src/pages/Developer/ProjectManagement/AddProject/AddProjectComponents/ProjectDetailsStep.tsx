import { TickIcon } from "../../../../../components/CustomFile/icons";
import { useEffect, useRef, useState } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { getGoogleMapsApiKey, useGoogleMapsLoader } from "../../../../../hooks/useGoogleMapsLoader";
import "quill/dist/quill.snow.css";

export type ProjectDetailsFormValue = {
    projectTitle: string;
    projectAddress: string;
    projectAddressPlaceId: string;
    aboutProject: string;
    projectDescription: string;
    amenityIds: string[];
};

export type ProjectDetailsAmenityOption = {
    id: string;
    name: string;
};

type ProjectDetailsStepProps = {
    value: ProjectDetailsFormValue;
    amenityOptions: ProjectDetailsAmenityOption[];
    onChange: (value: ProjectDetailsFormValue) => void;
};

type GooglePlaceResult = {
    formatted_address?: string;
    name?: string;
    place_id?: string;
};
type GoogleAutocompleteInstance = {
    getPlace: () => GooglePlaceResult;
};

const ProjectDetailsStep = ({ value, amenityOptions, onChange }: ProjectDetailsStepProps) => {
    const googleMapsApiKey = getGoogleMapsApiKey();
    const { isLoaded: isGooglePlacesLoaded } = useGoogleMapsLoader();
    const [addressAutocomplete, setAddressAutocomplete] = useState<GoogleAutocompleteInstance | null>(null);

    const quillRef = useRef<HTMLDivElement | null>(null);
    const [quill, setQuill] = useState<any>(null);

    const descriptionHtmlRef = useRef<string>("");
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const latestValueRef = useRef<ProjectDetailsFormValue>(value);

    useEffect(() => {
        latestValueRef.current = value;
    }, [value]);

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

    const updateField = <K extends keyof ProjectDetailsFormValue>(
        key: K,
        nextValue: ProjectDetailsFormValue[K]
    ) => {
        onChange({ ...value, [key]: nextValue });
    };

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
        if (quill) {
            if (value.projectDescription && quill.root.innerHTML !== value.projectDescription) {
                quill.root.innerHTML = value.projectDescription;
            }
            const onTextChange = () => {
                descriptionHtmlRef.current = quill.root.innerHTML;
                onChange({
                    ...latestValueRef.current,
                    projectDescription: quill.root.innerHTML,
                });
            };
            quill.on("text-change", onTextChange);

            // Add handler for the toolbar image button.
            // We insert the image as a base64 data URL so it works immediately without an upload backend.
            try {
                const toolbar = quill.getModule("toolbar") as any;
                toolbar?.addHandler?.("image", () => {
                    imageInputRef.current?.click();
                });
            } catch {
                // If toolbar module isn't available yet, ignore; Quill will still render toolbar.
            }

            return () => {
                quill.off("text-change", onTextChange);
            };
        }
    }, [quill, onChange, value.projectDescription]);

    useEffect(() => {
        const input = imageInputRef.current;
        if (!input) return;

        const onChange = (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) insertImageFromFile(file);
            // Allow uploading the same file twice.
            target.value = "";
        };

        input.addEventListener("change", onChange);
        return () => input.removeEventListener("change", onChange);
    }, [quill]);

    const toggleAmenity = (amenityId: string) => {
        const current = value.amenityIds;
        updateField(
            "amenityIds",
            current.includes(amenityId)
                ? current.filter((item) => item !== amenityId)
                : [...current, amenityId]
        );
    };

    const addressInput = (
        <input
            type="text"
            placeholder="Enter Street name, Area / locality, City, State, Country"
            value={value.projectAddress}
            onChange={(event) => {
                onChange({
                    ...value,
                    projectAddress: event.target.value,
                    projectAddressPlaceId: "",
                });
            }}
            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
        />
    );

    return (
        <div className="rounded-[15px] bg-white  md:p-[30px] p-[16px]">
            <h3 className="text-[20px] font-[Bold] text-[#222] mb-[30px]">Project details</h3>
            <div className="flex flex-col gap-[30px]">
                {/* project title */}
                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        Project Title <span className="text-[#D4A373]">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Enter project title"
                        value={value.projectTitle}
                        onChange={(event) => updateField("projectTitle", event.target.value)}
                        className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                    />
                </div>
                {/* project address */}
                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        Project Address <span className="text-[#D4A373]">*</span>
                    </label>
                    {googleMapsApiKey && isGooglePlacesLoaded ? (
                        <Autocomplete
                            onLoad={(instance) =>
                                setAddressAutocomplete(instance as unknown as GoogleAutocompleteInstance)
                            }
                            onPlaceChanged={() => {
                                const place = addressAutocomplete?.getPlace();
                                const resolvedAddress =
                                    place?.formatted_address || place?.name || value.projectAddress;
                                onChange({
                                    ...value,
                                    projectAddress: resolvedAddress,
                                    projectAddressPlaceId: place?.place_id || "",
                                });
                            }}
                            options={{
                                fields: ["formatted_address", "name", "place_id"],
                                types: ["geocode"],
                            }}
                        >
                            {addressInput}
                        </Autocomplete>
                    ) : (
                        addressInput
                    )}
                </div>
                {/* Amenities  * */}
                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">
                        Amenities <span className="text-[#D4A373]">*</span>
                    </label>
                    <div className="flex flex-wrap gap-[8px]">
                        {amenityOptions.map((amenity) => {
                            const isActive = value.amenityIds.includes(amenity.id);
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
                                            ? "bg-[#D4A373] border-[#D4A373]"
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
                    {amenityOptions.length === 0 && (
                        <p className="text-[12px] text-[#707070]">No amenities available.</p>
                    )}
                </div>

                {/*  About the project */}
                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">
                        About the project <span className="text-[#D4A373]">*</span>
                    </label>
                    <textarea
                        placeholder="Describe about the project"
                        rows={8}
                        value={value.aboutProject}
                        onChange={(event) => updateField("aboutProject", event.target.value)}
                        className="w-full min-h-[220px] rounded-[10px] border border-[rgba(34,34,34,0.10)] p-[12px] text-[13px] font-[Regular] text-[#222] placeholder:text-[#A0A0A0] resize-none focus:outline-none"
                    />
                </div>

                {/*Project description */}
                <div>
                    {/* Label */}
                    <label className="text-[14px] font-[600] text-[#222] block mb-[8px]">
                        Project description <span className="text-[#D4A373]">*</span>
                    </label>

                    {/* Editor Container */}
                    <div className="h-[320px] border border-[rgba(34,34,34,0.10)] rounded-[12px] overflow-hidden bg-white">
                        <style>
                            {`
                                .custom-quill .ql-editor img {
                                    max-width: 100%;
                                    height: auto;
                                }
                            `}
                        </style>

                        {/* Editor */}
                        <div ref={quillRef} className="custom-quill h-[220px]" />
                    </div>
                </div>
            </div>
            {/* Hidden input for Quill image button */}
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
            />
        </div>
    );
};

export default ProjectDetailsStep;
