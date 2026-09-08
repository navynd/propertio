import { GalleryIcon, VideoIcon, CancelIcon } from "../../../../../components/CustomFile/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "../../../../../services/toast";

type PreviewItem = {
    file: File;
    url: string;
};
type DisplayImageItem = {
    url: string;
    source: "remote" | "local";
    localIndex?: number;
};

export type PropertyMediaUploadFormValue = {
    propertyImages: File[];
    propertyVideo: File | null;
    virtualTourLink: string;
};

export type PropertyMediaUploadPreviewValue = {
    images: string[];
    propertyVideo: string | null;
};

type PropertyMediaUploadProps = {
    value: PropertyMediaUploadFormValue;
    onChange: (value: PropertyMediaUploadFormValue) => void;
    uploadedPreview?: PropertyMediaUploadPreviewValue;
    useUploadedPreview?: boolean;
    uploadedLocalFileKeys?: string[];
    onRemoveUploadedImage?: (imageUrl: string) => void;
};

const PropertyMediaUpload = ({
    value,
    onChange,
    uploadedPreview,
    useUploadedPreview = false,
    uploadedLocalFileKeys = [],
    onRemoveUploadedImage,
}: PropertyMediaUploadProps) => {
    const projectImagesInputRef = useRef<HTMLInputElement | null>(null);
    const projectVideoInputRef = useRef<HTMLInputElement | null>(null);

    const [projectImages, setProjectImages] = useState<PreviewItem[]>(
        () => value.propertyImages.map((file) => ({ file, url: URL.createObjectURL(file) }))
    );
    const [projectVideo, setProjectVideo] = useState<PreviewItem | null>(
        () => (value.propertyVideo ? { file: value.propertyVideo, url: URL.createObjectURL(value.propertyVideo) } : null)
    );

    const projectImagesUrls = useMemo(() => projectImages.map((i) => i.url), [projectImages]);
    const getLocalFileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
    const remoteImageUrls = uploadedPreview?.images || [];
    const displayImageItems = useMemo<DisplayImageItem[]>(() => {
        if (useUploadedPreview && remoteImageUrls.length > 0) {
            return remoteImageUrls.map((url) => ({ url, source: "remote" as const }));
        }

        const freshLocalItems = projectImages
            .map((img, index) => ({ img, index }))
            .filter(({ img }) => !uploadedLocalFileKeys.includes(getLocalFileKey(img.file)))
            .map(({ img, index }) => ({
                url: img.url,
                source: "local" as const,
                localIndex: index,
            }));

        if (remoteImageUrls.length > 0 && freshLocalItems.length > 0) {
            return [
                ...remoteImageUrls.map((url) => ({ url, source: "remote" as const })),
                ...freshLocalItems,
            ];
        }
        if (remoteImageUrls.length > 0) {
            return remoteImageUrls.map((url) => ({ url, source: "remote" as const }));
        }
        return freshLocalItems;
    }, [projectImages, remoteImageUrls, uploadedLocalFileKeys, useUploadedPreview]);
    const videoPreviewUrl =
        useUploadedPreview && uploadedPreview?.propertyVideo
            ? uploadedPreview.propertyVideo
            : projectVideo?.url || null;

    useEffect(() => {
        // Cleanup object URLs to avoid memory leaks.
        return () => {
            projectImages.forEach((i) => URL.revokeObjectURL(i.url));
            if (projectVideo) URL.revokeObjectURL(projectVideo.url);
        };
    }, [projectImages, projectVideo]);

    const appendImages = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setProjectImages((prev) => {
            if (prev.length + files.length > 50) {
                toast.error("Validation required", "You can upload up to 50 images only.");
                return prev;
            }
            const nextImages = Array.from(files).map((file) => ({
                file,
                url: URL.createObjectURL(file),
            }));
            return [...prev, ...nextImages];
        });
    };

    const removeProjectImage = (indexToRemove: number) => {
        setProjectImages((prev) =>
            prev.filter((item, index) => {
                if (index === indexToRemove) {
                    URL.revokeObjectURL(item.url);
                    return false;
                }
                return true;
            })
        );
    };

    const replaceSingle = (
        files: FileList | null,
        onSet: React.Dispatch<React.SetStateAction<PreviewItem | null>>
    ) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        onSet((prev) => {
            if (prev) URL.revokeObjectURL(prev.url);
            return { file, url: URL.createObjectURL(file) };
        });
    };

    useEffect(() => {
        onChange({
            propertyImages: projectImages.map((item) => item.file),
            propertyVideo: projectVideo?.file ?? null,
            virtualTourLink: value.virtualTourLink,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectImages, projectVideo]);

    return (
        <div className=" bg-white flex flex-col gap-[30px] md:p-[30px] p-[16px] rounded-[15px]">
            <h3 className="text-[20px] font-[Bold] text-[#222]">Media upload</h3>
            {/* Project images */}
            <div>
                <p className="text-[14px] font-[Bold] text-[#222] mb-[12px]">
                    Upload project images <span className="text-[#EA3934]">*</span>
                </p>
                <div
                    onClick={() => projectImagesInputRef.current?.click()}
                    className="rounded-[15px] border border-dashed border-[rgba(34,34,34,0.30)] min-h-[220px] flex flex-col items-center justify-center text-center md:p-[56px] p-[24px] cursor-pointer"
                    role="button"
                    tabIndex={0}
                >
                    {displayImageItems.length === 0 ? (
                        <>
                            <GalleryIcon width={52} height={52} />
                            <p className="text-[13px] font-[Medium] text-[#222] mt-[20px]">Select a file or drag and drop here</p>
                            <p className="text-[12px] font-[Regular] text-[#707070] mt-[12px]">JPG, PNG or webp, file size no more than 200MB</p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    projectImagesInputRef.current?.click();
                                }}
                                className="mt-[24px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
                            >
                                Select File
                            </button>
                        </>
                    ) : (
                        <div className="w-full">
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-[10px]">
                                {displayImageItems.map((item, index) => (
                                    <div
                                        key={`${item.url}-${index}`}
                                        className="relative rounded-[10px] overflow-hidden border border-[rgba(34,34,34,0.10)] bg-white"
                                    >
                                        <button
                                            type="button"
                                            aria-label="Remove image"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (item.source === "remote") {
                                                    onRemoveUploadedImage?.(item.url);
                                                    return;
                                                }
                                                const localIndex = item.localIndex;
                                                if (typeof localIndex !== "number") return;
                                                removeProjectImage(localIndex);
                                            }}
                                            className="absolute top-[6px] right-[6px] z-[1] bg-white rounded-full p-[7px] shadow cursor-pointer"
                                        >
                                            <CancelIcon width={10} height={10} />
                                        </button>
                                        <img
                                            src={item.url}
                                            alt="Property upload preview"
                                            className="w-full h-[110px] object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    projectImagesInputRef.current?.click();
                                }}
                                className="mt-[18px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
                            >
                                Select more images
                            </button>
                        </div>
                    )}
                </div>
                <input
                    ref={projectImagesInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        appendImages(e.target.files);
                        e.currentTarget.value = "";
                    }}
                />
            </div>
            {/* Project video */}
            <div>
                <p className="text-[14px] font-[Bold] text-[#222] mb-[12px]">
                    Upload project video <span className="text-[#707070] font-[Regular]">(Optional)</span>
                </p>
                <div
                    onClick={() => projectVideoInputRef.current?.click()}
                    className="rounded-[15px] border border-dashed border-[rgba(34,34,34,0.30)] min-h-[220px] flex flex-col items-center justify-center text-center md:p-[56px] p-[24px] cursor-pointer"
                    role="button"
                    tabIndex={0}
                >
                    {!videoPreviewUrl ? (
                        <>
                            <VideoIcon width={52} height={52} />
                            <p className="text-[13px] font-[Medium] text-[#222] mt-[20px]">Select a file or drag and drop here</p>
                            <p className="text-[12px] font-[Regular] text-[#707070] mt-[12px]">MP4 or WebM, file size must not exceed 1GB</p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    projectVideoInputRef.current?.click();
                                }}
                                className="mt-[24px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
                            >
                                Select File
                            </button>
                        </>
                    ) : (
                        <div className="w-full">
                            <video
                                src={videoPreviewUrl}
                                controls
                                className="w-full h-[410px] object-cover rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-black"
                            />
                            <p className="text-[12px] text-[#707070] mt-[10px] break-all">
                                {projectVideo?.file.name || "Uploaded video"}
                            </p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    projectVideoInputRef.current?.click();
                                }}
                                className="mt-[14px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
                            >
                                Replace video
                            </button>
                        </div>
                    )}
                </div>
                <input
                    ref={projectVideoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                        replaceSingle(e.target.files, setProjectVideo);
                        e.currentTarget.value = "";
                    }}
                />
            </div>
            {/* 360 tour link */}
            <div>
                <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                    360 tour link <span className="text-[#707070] font-[Regular]">(Optional)</span>
                </label>
                <input
                    type="text"
                    placeholder="Enter tour link"
                    value={value.virtualTourLink}
                    onChange={(e) =>
                        onChange({
                            propertyImages: projectImages.map((item) => item.file),
                            propertyVideo: projectVideo?.file ?? null,
                            virtualTourLink: e.target.value,
                        })
                    }
                    className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                />
            </div>

        </div>
    );
};

export default PropertyMediaUpload;
