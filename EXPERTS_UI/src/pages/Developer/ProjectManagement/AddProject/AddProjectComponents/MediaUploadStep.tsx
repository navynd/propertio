import { GalleryIcon, UploadIcon, VideoIcon, PdfIcon, CancelIcon } from "../../../../../components/CustomFile/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { mediaFileKey } from "../projectMediaUtils";

type PreviewItem = {
    file: File;
    url: string;
};

export type MediaUploadFormValue = {
    projectImages: File[];
    projectVideo: File | null;
    brochureDoc: File | null;
    masterPlanImage: File | null;
    virtualTourLink: string;
};

export type MediaUploadPreviewValue = {
    images: string[];
    projectVideo: string | null;
    brochureDoc: string | null;
    masterPlanImage: string | null;
};

type MediaUploadStepProps = {
    value: MediaUploadFormValue;
    onChange: (value: MediaUploadFormValue) => void;
    uploadedPreview?: MediaUploadPreviewValue;
    useUploadedPreview?: boolean;
    /** File identity keys aligned with `uploadedPreview.images` for CDN thumbnails. */
    uploadedProjectImageKeys?: string[];
};

const toPreview = (file: File): PreviewItem => ({
    file,
    url: URL.createObjectURL(file),
});

const isHttpOrHttpsUrl = (url: string | null | undefined): url is string =>
    Boolean(url && /^https?:\/\//i.test(url.trim()));

const MediaUploadStep = ({
    value,
    onChange,
    uploadedPreview,
    useUploadedPreview = false,
    uploadedProjectImageKeys = [],
}: MediaUploadStepProps) => {
    const projectImagesInputRef = useRef<HTMLInputElement | null>(null);
    const projectVideoInputRef = useRef<HTMLInputElement | null>(null);
    const brochureInputRef = useRef<HTMLInputElement | null>(null);
    const masterPlanInputRef = useRef<HTMLInputElement | null>(null);

    const [projectImages, setProjectImages] = useState<PreviewItem[]>(
        () => value.projectImages.map(toPreview)
    );
    const [projectVideo, setProjectVideo] = useState<PreviewItem | null>(
        () => (value.projectVideo ? toPreview(value.projectVideo) : null)
    );
    const [brochureDoc, setBrochureDoc] = useState<PreviewItem | null>(
        () => (value.brochureDoc ? toPreview(value.brochureDoc) : null)
    );
    const [masterPlanImage, setMasterPlanImage] = useState<PreviewItem | null>(
        () => (value.masterPlanImage ? toPreview(value.masterPlanImage) : null)
    );
    const previewStateRef = useRef<{
        projectImages: PreviewItem[];
        projectVideo: PreviewItem | null;
        brochureDoc: PreviewItem | null;
        masterPlanImage: PreviewItem | null;
    }>({
        projectImages: [],
        projectVideo: null,
        brochureDoc: null,
        masterPlanImage: null,
    });

    const remoteImageUrls = uploadedPreview?.images || [];

    const projectImageDisplayUrls = useMemo(
        () =>
            projectImages.map((item, index) => {
                const cdnUrl =
                    index < uploadedProjectImageKeys.length &&
                    index < remoteImageUrls.length &&
                    mediaFileKey(item.file) === uploadedProjectImageKeys[index]
                        ? remoteImageUrls[index]
                        : null;
                return cdnUrl ?? item.url;
            }),
        [projectImages, uploadedProjectImageKeys, remoteImageUrls]
    );
    const videoPreviewUrl =
        projectVideo?.url ??
        (useUploadedPreview ? uploadedPreview?.projectVideo ?? null : null);
    const brochurePreviewUrl =
        brochureDoc?.url ??
        (useUploadedPreview ? uploadedPreview?.brochureDoc ?? null : null);
    const masterPlanPreviewUrl =
        masterPlanImage?.url ??
        (useUploadedPreview ? uploadedPreview?.masterPlanImage ?? null : null);

    /** Only after successful upload (CDN); blob URLs fail after navigation / revoke — do not use for View PDF. */
    const brochureViewPdfHref =
        useUploadedPreview && isHttpOrHttpsUrl(uploadedPreview?.brochureDoc)
            ? uploadedPreview.brochureDoc.trim()
            : null;

    useEffect(() => {
        previewStateRef.current = {
            projectImages,
            projectVideo,
            brochureDoc,
            masterPlanImage,
        };
    }, [projectImages, projectVideo, brochureDoc, masterPlanImage]);

    useEffect(() => {
        // Cleanup object URLs only when component unmounts.
        return () => {
            previewStateRef.current.projectImages.forEach((i) => URL.revokeObjectURL(i.url));
            if (previewStateRef.current.projectVideo) {
                URL.revokeObjectURL(previewStateRef.current.projectVideo.url);
            }
            if (previewStateRef.current.brochureDoc) {
                URL.revokeObjectURL(previewStateRef.current.brochureDoc.url);
            }
            if (previewStateRef.current.masterPlanImage) {
                URL.revokeObjectURL(previewStateRef.current.masterPlanImage.url);
            }
        };
    }, []);

    useEffect(() => {
        // Keep parent state in sync with local file selections.
        onChange({
            projectImages: projectImages.map((item) => item.file),
            projectVideo: projectVideo?.file ?? null,
            brochureDoc: brochureDoc?.file ?? null,
            masterPlanImage: masterPlanImage?.file ?? null,
            virtualTourLink: value.virtualTourLink,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectImages, projectVideo, brochureDoc, masterPlanImage]);

    const appendImages = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setProjectImages((prev) => {
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

    const formatUploadedDate = (file: File) => {
        const d = new Date(file.lastModified);
        if (Number.isNaN(d.getTime())) return "";
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };
    return (
        <div className="rounded-[15px] bg-white flex flex-col gap-[30px] md:p-[30px] p-[16px]">
            <h3 className="text-[20px] font-[Bold] text-[#222]">Media upload</h3>
            {/* Project images */}
            <div>
                <p className="text-[14px] font-[Bold] text-[#222] mb-[12px]">
                    Upload project images <span className="text-[#D4A373]">*</span>
                </p>
                <div
                    onClick={() => projectImagesInputRef.current?.click()}
                    className="rounded-[15px] border border-dashed border-[rgba(34,34,34,0.30)] min-h-[220px] flex flex-col items-center justify-center text-center md:p-[56px] p-[24px] cursor-pointer"
                    role="button"
                    tabIndex={0}
                >
                    {projectImages.length === 0 ? (
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
                                {projectImages.map((item, index) => {
                                    const url = projectImageDisplayUrls[index];
                                    return (
                                    <div
                                        key={`${mediaFileKey(item.file)}-${index}`}
                                        className="relative rounded-[10px] overflow-hidden border border-[rgba(34,34,34,0.10)] bg-white"
                                    >
                                        {projectImages[index] != null && (
                                            <button
                                                type="button"
                                                aria-label="Remove image"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeProjectImage(index);
                                                }}
                                                className="absolute top-[6px] right-[6px] z-[1] bg-white rounded-full p-[7px] shadow cursor-pointer"
                                            >
                                                <CancelIcon width={10} height={10} />
                                            </button>
                                        )}
                                        <img
                                            src={url}
                                            alt="Project upload preview"
                                            className="w-full h-[110px] object-cover"
                                        />
                                    </div>
                                    );
                                })}
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
                        <div className="w-full" onClick={(e) => e.stopPropagation()}>
                            <video
                                src={videoPreviewUrl}
                                controls
                                className="w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-black"
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
            {/* Brochure document */}
            <div>
                <p className="text-[14px] font-[Bold] text-[#222] mb-[12px]">
                    Upload the brochure document <span className="text-[#707070] font-[Regular]">(Optional)</span>
                </p>
                <div
                    onClick={() => brochureInputRef.current?.click()}
                    className="rounded-[15px] border border-dashed border-[rgba(34,34,34,0.30)] min-h-[220px] flex flex-col items-center justify-center text-center md:p-[56px] p-[24px] cursor-pointer"
                    role="button"
                    tabIndex={0}
                >
                    {!brochurePreviewUrl ? (
                        <>
                            <UploadIcon width={52} height={52} />
                            <p className="text-[13px] font-[Medium] text-[#222] mt-[20px]">Select a file or drag and drop here</p>
                            <p className="text-[12px] font-[Regular] text-[#707070] mt-[12px]">PDF only, file size no more than 10MB</p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    brochureInputRef.current?.click();
                                }}
                                className="mt-[24px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
                            >
                                Select File
                            </button>
                        </>
                    ) : (
                        <div className="w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-[14px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white p-[14px]">
                                <PdfIcon width={34} height={42} />
                                <div className="flex flex-col">
                                    <p className="text-[13px] font-[SemiBold] text-[#222] break-all">
                                        {brochureDoc?.file.name || "Uploaded brochure"}
                                    </p>
                                    {brochureDoc && (
                                        <p className="text-[12px] text-[#707070] mt-[6px]">
                                            Uploaded on {formatUploadedDate(brochureDoc.file)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-[10px] mt-[14px] justify-center flex-wrap">
                                {brochureViewPdfHref ? (
                                    <a
                                        href={brochureViewPdfHref}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-[34px] px-[16px] rounded-[10px] border border-[rgba(34,34,34,0.20)] bg-white text-[#222] text-[12px] font-[SemiBold] inline-flex items-center justify-center"
                                    >
                                        View PDF
                                    </a>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        brochureInputRef.current?.click();
                                    }}
                                    className="h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
                                >
                                    Replace
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <input
                    ref={brochureInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                        replaceSingle(e.target.files, setBrochureDoc);
                        e.currentTarget.value = "";
                    }}
                />
            </div>
            {/* Master Plan */}
            <div>
                <p className="text-[14px] font-[Bold] text-[#222] mb-[12px]">
                    Upload master Plan <span className="text-[#707070] font-[Regular]">(Optional)</span>
                </p>
                <div
                    onClick={() => masterPlanInputRef.current?.click()}
                    className="rounded-[15px] border border-dashed border-[rgba(34,34,34,0.30)] min-h-[220px] flex flex-col items-center justify-center text-center md:p-[56px] p-[24px] cursor-pointer"
                    role="button"
                    tabIndex={0}
                >
                    {!masterPlanPreviewUrl ? (
                        <>
                            <GalleryIcon width={52} height={52} />
                            <p className="text-[13px] font-[Medium] text-[#222] mt-[20px]">Select a file or drag and drop here</p>
                            <p className="text-[12px] font-[Regular] text-[#707070] mt-[12px]">JPG, PNG or webp, file size no more than 10MB</p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    masterPlanInputRef.current?.click();
                                }}
                                className="mt-[24px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
                            >
                                Select File
                            </button>
                        </>
                    ) : (
                        <div className="w-full" onClick={(e) => e.stopPropagation()}>
                            <img
                                src={masterPlanPreviewUrl}
                                alt={masterPlanImage?.file.name || "Master plan preview"}
                                className="w-full max-h-[240px] object-contain rounded-[10px]  bg-white"
                            />
                            <p className="text-[12px] text-[#707070] mt-[10px] break-all">
                                {masterPlanImage?.file.name || "Uploaded master plan"}
                            </p>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    masterPlanInputRef.current?.click();
                                }}
                                className="mt-[14px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
                            >
                                Replace image
                            </button>
                        </div>
                    )}
                </div>
                <input
                    ref={masterPlanInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        replaceSingle(e.target.files, setMasterPlanImage);
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
                            projectImages: projectImages.map((item) => item.file),
                            projectVideo: projectVideo?.file ?? null,
                            brochureDoc: brochureDoc?.file ?? null,
                            masterPlanImage: masterPlanImage?.file ?? null,
                            virtualTourLink: e.target.value,
                        })
                    }
                    className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                />
            </div>

        </div>
    );
};

export default MediaUploadStep;
