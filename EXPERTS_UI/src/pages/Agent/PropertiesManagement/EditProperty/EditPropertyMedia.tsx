import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import ImageSection from "./EditProjectComponents/ImageSection";
import VideoBrochureSections from "./EditProjectComponents/VideoBrochureSections";
import type {
    PropertyMediaUploadFormValue,
    PropertyMediaUploadPreviewValue,
} from "../AddProperty/AddProjectComponents/PropertyMediaUpload";

type EditPropertyMediaProps = {
    value: PropertyMediaUploadFormValue;
    onChange: (value: PropertyMediaUploadFormValue) => void;
    uploadedPreview: PropertyMediaUploadPreviewValue;
    useUploadedPreview: boolean;
    uploadedLocalFileKeys: string[];
    onRemoveUploadedImage: (imageUrl: string) => void;
    onRemoveUploadedVideo: () => void;
    onDiscard: () => void;
    onSave: () => void;
    isSaving: boolean;
};

const EditPropertyMedia = ({
    value,
    onChange,
    uploadedPreview,
    uploadedLocalFileKeys,
    onRemoveUploadedImage,
    onRemoveUploadedVideo,
    onDiscard,
    onSave,
    isSaving,
}: EditPropertyMediaProps) => {
    const location = useLocation();
    const isEditpath = location.pathname.includes("/agent/properties-management/edit-property");
    const localPreviews = useMemo(
        () => value.propertyImages.map((file) => ({ file, url: URL.createObjectURL(file) })),
        [value.propertyImages]
    );
    useEffect(() => {
        return () => {
            localPreviews.forEach((item) => URL.revokeObjectURL(item.url));
        };
    }, [localPreviews]);
    const localVideoPreview = useMemo(
        () => (value.propertyVideo ? URL.createObjectURL(value.propertyVideo) : null),
        [value.propertyVideo]
    );
    useEffect(() => {
        return () => {
            if (localVideoPreview) URL.revokeObjectURL(localVideoPreview);
        };
    }, [localVideoPreview]);
    const imageItems = [
        ...uploadedPreview.images.map((src, index) => ({
            id: `uploaded-${index}`,
            src,
        })),
        ...localPreviews.map((item, index) => ({
            id: `local-${index}`,
            src: item.url,
        })),
    ];
    return (
        <div>
            <div className={`bg-white min-w-0 overflow-hidden ${isEditpath ? "rounded-b-[15px]" : ""}`}>
                <ImageSection
                    items={imageItems}
                    onAddPhotos={(files) => {
                        onChange({
                            ...value,
                            propertyImages: [...value.propertyImages, ...files],
                        });
                    }}
                    onReplacePhoto={(id, file) => {
                        if (id.startsWith("uploaded-")) {
                            const index = Number(id.replace("uploaded-", ""));
                            const targetUrl = uploadedPreview.images[index];
                            if (targetUrl) onRemoveUploadedImage(targetUrl);
                            onChange({
                                ...value,
                                propertyImages: [...value.propertyImages, file],
                            });
                            return;
                        }
                        if (id.startsWith("local-")) {
                            const index = Number(id.replace("local-", ""));
                            if (Number.isNaN(index) || index < 0 || index >= value.propertyImages.length) return;
                            const nextFiles = [...value.propertyImages];
                            nextFiles[index] = file;
                            onChange({
                                ...value,
                                propertyImages: nextFiles,
                            });
                        }
                    }}
                    onDeletePhoto={(id) => {
                        if (id.startsWith("uploaded-")) {
                            const index = Number(id.replace("uploaded-", ""));
                            const targetUrl = uploadedPreview.images[index];
                            if (targetUrl) onRemoveUploadedImage(targetUrl);
                            return;
                        }
                        if (id.startsWith("local-")) {
                            const index = Number(id.replace("local-", ""));
                            if (Number.isNaN(index) || index < 0 || index >= value.propertyImages.length) return;
                            const nextFiles = value.propertyImages.filter((_, i) => i !== index);
                            onChange({
                                ...value,
                                propertyImages: nextFiles,
                            });
                        }
                    }}
                    onDeleteAll={() => {
                        uploadedPreview.images.forEach((url) => onRemoveUploadedImage(url));
                        onChange({
                            ...value,
                            propertyImages: [],
                        });
                    }}
                />
                <VideoBrochureSections
                    videoUrl={localVideoPreview || uploadedPreview.propertyVideo || null}
                    onChangeVideo={(file) => {
                        onChange({
                            ...value,
                            propertyVideo: file,
                        });
                    }}
                    onDeleteVideo={() => {
                        const hadUploadedVideo = Boolean(uploadedPreview.propertyVideo);
                        onChange({
                            ...value,
                            propertyVideo: null,
                        });
                        if (hadUploadedVideo) onRemoveUploadedVideo();
                    }}
                />
                <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        360 tour link <span className="text-[#EA3934]">*</span>
                    </label>
                    <input
                        type="text"
                        value={value.virtualTourLink}
                        onChange={(e) =>
                            onChange({
                                ...value,
                                virtualTourLink: e.target.value,
                            })
                        }
                        placeholder="Enter tour link"
                        className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                    />
                </div>
            </div>
            <div className="flex items-center justify-end gap-[10px] mt-[30px]">
                <button
                    type="button"
                    onClick={onDiscard}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] border border-[#222] text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px]"
                >
                    Discard
                </button>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] bg-[#EA3934] text-[#FFF] text-[14px] font-[Bold] inline-flex items-center gap-[5px] disabled:opacity-50"
                >
                    {isSaving ? "Saving..." : "Save changes"}
                </button>
            </div>
        </div>
    );
};

export default EditPropertyMedia;
