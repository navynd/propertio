import { useEffect, useMemo, useRef, useState } from "react";
import { ChangeIcon, DownloadIcon, LeftArrowIcon, PdfIcon, PlusIcon, RightArrowIcon, TrashIcon } from "../../../../assets/icons";
import Loader from "../../../../components/Loader/loader";
import { API_BASE_URL } from "../../../../services/apiClient";
import { projectsService, type SupportedUrlsMasterData } from "../../../../services/projectsService";
import { useToast } from "../../../../context/ToastContext";
import { createToastNotify } from "../../../../utils/toastNotify";

type EditMediaProps = {
    projectId: string;
    project: Record<string, unknown>;
    onAfterSave: () => Promise<void>;
    onContinue?: () => void;
    primaryActionLabel?: string;
};

type BaseUrls = {
    image: string;
    video: string;
    document: string;
};

type ImageItem = {
    key: string;
    filename: string;
    url: string;
    file?: File;
};
const MAX_PROJECT_IMAGES = 50;

const extractFilename = (value?: string | null) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed.includes("/") ? trimmed.split("/").pop() || null : trimmed;
};

const buildPublicUrl = (value: unknown, base: string) => {
    const raw = typeof value === "string" ? value : "";
    if (!raw.trim()) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
    const filename = extractFilename(raw);
    if (!filename) return null;
    return `${base.replace(/\/?$/, "/")}${filename}`;
};

const resolveProjectBaseUrls = (data: SupportedUrlsMasterData, fallback: BaseUrls): BaseUrls => {
    const candidates: Array<Record<string, unknown> | undefined> = [];
    if (data.supportedUrls && typeof data.supportedUrls === "object") candidates.push(data.supportedUrls);
    if (data.supportedurls && typeof data.supportedurls === "object") candidates.push(data.supportedurls);
    if (data.items && !Array.isArray(data.items) && typeof data.items === "object") candidates.push(data.items);
    if (Array.isArray(data.items)) {
        data.items.forEach((item) => {
            if (item && typeof item === "object") candidates.push(item);
        });
    }

    const readMaybe = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
    const pickFromObject = (obj: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
            const hit = readMaybe(obj[key]);
            if (hit) return hit;
        }
        return null;
    };

    for (const candidate of candidates) {
        const projectUrl = candidate?.projectUrl;
        if (!projectUrl || typeof projectUrl !== "object") continue;
        const urls = projectUrl as Record<string, unknown>;
        const image = pickFromObject(urls, ["img", "image", "images", "projectImage", "projectImages"]);
        const video = pickFromObject(urls, ["vid", "video", "videos", "projectVideo", "projectVideos"]);
        const document = pickFromObject(urls, ["doc", "docs", "document", "documents", "brochure"]);
        return {
            image: (image || fallback.image).replace(/\/?$/, "/"),
            video: (video || fallback.video).replace(/\/?$/, "/"),
            document: (document || fallback.document).replace(/\/?$/, "/"),
        };
    }

    return fallback;
};

const EditMedia = ({
    projectId,
    project,
    onAfterSave,
    onContinue,
    primaryActionLabel = "Save changes",
}: EditMediaProps) => {
    const { push } = useToast();
    const toast = createToastNotify(push);
    const [isBusy, setIsBusy] = useState(false);
    const [tourLink, setTourLink] = useState("");
    const [replaceImageKey, setReplaceImageKey] = useState<string | null>(null);
    const [galleryPage, setGalleryPage] = useState(0);
    const [images, setImages] = useState<ImageItem[]>([]);
    const [pendingRemoveKeys, setPendingRemoveKeys] = useState<string[]>([]);
    const [videoDraft, setVideoDraft] = useState<{ filename: string | null; url: string | null; file: File | null }>({
        filename: null,
        url: null,
        file: null,
    });
    const [brochureDraft, setBrochureDraft] = useState<{ filename: string | null; url: string | null; file: File | null }>({
        filename: null,
        url: null,
        file: null,
    });
    const [masterPlanDraft, setMasterPlanDraft] = useState<{ filename: string | null; url: string | null; file: File | null }>({
        filename: null,
        url: null,
        file: null,
    });
    const [baseUrls, setBaseUrls] = useState<BaseUrls>(() => {
        const origin = API_BASE_URL.replace(/\/api\/?$/, "");
        return {
            image: `${origin}/uploads/img/project/`,
            video: `${origin}/uploads/vid/project/`,
            document: `${origin}/uploads/doc/project/`,
        };
    });

    const addImagesInputRef = useRef<HTMLInputElement | null>(null);
    const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
    const videoInputRef = useRef<HTMLInputElement | null>(null);
    const brochureInputRef = useRef<HTMLInputElement | null>(null);
    const masterPlanInputRef = useRef<HTMLInputElement | null>(null);
    const isBlobUrl = (value: string | null): value is string =>
        typeof value === "string" && value.startsWith("blob:");

    useEffect(() => {
        let isMounted = true;
        projectsService
            .getSupportedUrls()
            .then((data) => {
                if (!isMounted) return;
                setBaseUrls((prev) => resolveProjectBaseUrls(data, prev));
            })
            .catch(() => {
                // Keep fallback urls.
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const initialImages = useMemo<ImageItem[]>(() => {
        const arr = Array.isArray(project.images) ? (project.images as Array<Record<string, unknown>>) : [];
        return arr
            .map((item, index) => {
                const filename = extractFilename((item.url as string) || "");
                if (!filename) return null;
                const key = String(item._id || `${filename}-${index}`);
                const url = buildPublicUrl(item.url, baseUrls.image);
                if (!url) return null;
                return { key, filename, url };
            })
            .filter((item): item is ImageItem => Boolean(item));
    }, [project, baseUrls.image]);

    const initialVideoFilename = extractFilename((project.videoTour as string) || "");
    const initialVideoUrl = buildPublicUrl(project.videoTour, baseUrls.video);
    const initialBrochureFilename = extractFilename((project.brochure as string) || "");
    const initialBrochureUrl = buildPublicUrl(project.brochure, baseUrls.document);
    const initialMasterPlanRaw = Array.isArray(project.masterPlan) ? (project.masterPlan[0] as string) : "";
    const initialMasterPlanFilename = extractFilename(initialMasterPlanRaw || "");
    const initialMasterPlanUrl = buildPublicUrl(initialMasterPlanRaw, baseUrls.image);

    useEffect(() => {
        setTourLink(
            typeof project.virtualTour360 === "string"
                ? project.virtualTour360
                : typeof project.tour360 === "string"
                    ? project.tour360
                    : ""
        );
        setImages(initialImages);
        setPendingRemoveKeys([]);
        setVideoDraft({ filename: initialVideoFilename, url: initialVideoUrl, file: null });
        setBrochureDraft({ filename: initialBrochureFilename, url: initialBrochureUrl, file: null });
        setMasterPlanDraft({ filename: initialMasterPlanFilename, url: initialMasterPlanUrl, file: null });
        setGalleryPage(0);
    }, [project, initialImages, initialVideoFilename, initialVideoUrl, initialBrochureFilename, initialBrochureUrl, initialMasterPlanFilename, initialMasterPlanUrl]);

    const GALLERY_PAGE_SIZE = 12;
    const totalGalleryPages = Math.max(1, Math.ceil(images.length / GALLERY_PAGE_SIZE));
    const visibleImages = images.slice(
        galleryPage * GALLERY_PAGE_SIZE,
        galleryPage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE
    );
    const canPrevGallery = galleryPage > 0;
    const canNextGallery = galleryPage < totalGalleryPages - 1;

    useEffect(() => {
        if (galleryPage > totalGalleryPages - 1) {
            setGalleryPage(Math.max(0, totalGalleryPages - 1));
        }
    }, [galleryPage, totalGalleryPages]);

    const uploadMediaFiles = async (files: { images?: File[]; video?: File; brochure?: File; masterPlan?: File }) => {
        const formData = new FormData();
        formData.append("projectId", projectId);
        files.images?.forEach((file) => formData.append("images", file));
        if (files.video) formData.append("video", files.video);
        if (files.brochure) formData.append("brochure", files.brochure);
        if (files.masterPlan) formData.append("masterPlan", files.masterPlan);
        await projectsService.uploadProjectMedia(formData);
    };

    const removeMediaKeys = async (keys: string[]) => {
        if (!keys.length) return;
        const formData = new FormData();
        formData.append("projectId", projectId);
        keys.forEach((key) => formData.append("removeKeys", key));
        await projectsService.uploadProjectMedia(formData);
    };

    const addPendingRemoveKeys = (keys: Array<string | null>) => {
        const validKeys = keys.filter((key): key is string => Boolean(key && key.trim()));
        if (!validKeys.length) return;
        setPendingRemoveKeys((prev) => Array.from(new Set([...prev, ...validKeys])));
    };

    const onAddImages = (files: FileList | null) => {
        const selected = files ? Array.from(files).filter((f) => f.type.startsWith("image/")) : [];
        if (!selected.length) return;
        if (images.length >= MAX_PROJECT_IMAGES) {
            toast.error("Image limit reached", `A project can have up to ${MAX_PROJECT_IMAGES} images only.`);
            return;
        }
        if (images.length + selected.length > MAX_PROJECT_IMAGES) {
            const remaining = Math.max(0, MAX_PROJECT_IMAGES - images.length);
            toast.error("Too many images", `You can add only ${remaining} more image${remaining === 1 ? "" : "s"}.`);
            return;
        }
        let nextPage = 0;
        setImages((prev) => {
            const next = [
                ...prev,
                ...selected.map((file) => ({
                    key: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    filename: file.name,
                    url: URL.createObjectURL(file),
                    file,
                })),
            ];
            nextPage = Math.max(0, Math.ceil(next.length / GALLERY_PAGE_SIZE) - 1);
            return next;
        });
        setGalleryPage(nextPage);
    };

    const onReplaceImage = (file?: File) => {
        if (!replaceImageKey || !file || !file.type.startsWith("image/")) return;
        const newPreviewUrl = URL.createObjectURL(file);
        setImages((prev) =>
            prev.map((item) => {
                if (item.key !== replaceImageKey) return item;
                if (isBlobUrl(item.url)) URL.revokeObjectURL(item.url);
                addPendingRemoveKeys([item.file ? null : item.filename]);
                return {
                    ...item,
                    filename: file.name,
                    url: newPreviewUrl,
                    file,
                };
            })
        );
        setReplaceImageKey(null);
    };

    const onDeleteImage = (filename: string) => {
        setImages((prev) => {
            const target = prev.find((item) => item.filename === filename);
            if (!target) return prev;
            if (isBlobUrl(target.url)) URL.revokeObjectURL(target.url);
            addPendingRemoveKeys([target.file ? null : target.filename]);
            return prev.filter((item) => item.key !== target.key);
        });
    };

    const onDeleteAllImages = () => {
        if (!images.length) return;
        images.forEach((item) => {
            if (isBlobUrl(item.url)) URL.revokeObjectURL(item.url);
        });
        addPendingRemoveKeys(images.map((item) => (item.file ? null : item.filename)));
        setImages([]);
        setGalleryPage(0);
    };

    const onChangeVideo = (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith("video/")) {
            toast.error("Invalid video", "Please select a valid video file.");
            return;
        }
        setVideoDraft((prev) => {
            if (isBlobUrl(prev.url)) URL.revokeObjectURL(prev.url);
            return { ...prev, file, url: URL.createObjectURL(file) };
        });
    };

    const onDeleteVideo = () => {
        setVideoDraft((prev) => {
            if (isBlobUrl(prev.url)) URL.revokeObjectURL(prev.url);
            addPendingRemoveKeys([prev.file ? null : prev.filename]);
            return { ...prev, file: null, url: null };
        });
    };

    const onChangeBrochure = (file?: File) => {
        if (!file) return;
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            toast.error("Invalid brochure", "Please select a PDF brochure document.");
            return;
        }
        setBrochureDraft((prev) => {
            if (isBlobUrl(prev.url)) URL.revokeObjectURL(prev.url);
            return { ...prev, file, filename: file.name, url: URL.createObjectURL(file) };
        });
    };

    const onDeleteBrochure = () => {
        setBrochureDraft((prev) => {
            if (isBlobUrl(prev.url)) URL.revokeObjectURL(prev.url);
            addPendingRemoveKeys([prev.file ? null : prev.filename]);
            return { ...prev, file: null, filename: null, url: null };
        });
    };

    const onChangeMasterPlan = (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Invalid master plan", "Please select an image file for master plan.");
            return;
        }
        setMasterPlanDraft((prev) => {
            if (isBlobUrl(prev.url)) URL.revokeObjectURL(prev.url);
            return { ...prev, file, filename: file.name, url: URL.createObjectURL(file) };
        });
    };

    const onDeleteMasterPlan = () => {
        setMasterPlanDraft((prev) => {
            if (isBlobUrl(prev.url)) URL.revokeObjectURL(prev.url);
            addPendingRemoveKeys([prev.file ? null : prev.filename]);
            return { ...prev, file: null, filename: null, url: null };
        });
    };

    const onDiscard = () => {
        images.forEach((item) => {
            if (isBlobUrl(item.url)) URL.revokeObjectURL(item.url);
        });
        if (isBlobUrl(videoDraft.url)) URL.revokeObjectURL(videoDraft.url);
        if (isBlobUrl(brochureDraft.url)) URL.revokeObjectURL(brochureDraft.url);
        if (isBlobUrl(masterPlanDraft.url)) URL.revokeObjectURL(masterPlanDraft.url);
        setImages(initialImages);
        setPendingRemoveKeys([]);
        setVideoDraft({ filename: initialVideoFilename, url: initialVideoUrl, file: null });
        setBrochureDraft({ filename: initialBrochureFilename, url: initialBrochureUrl, file: null });
        setMasterPlanDraft({ filename: initialMasterPlanFilename, url: initialMasterPlanUrl, file: null });
        setGalleryPage(0);
        setTourLink(typeof project.virtualTour360 === "string" ? project.virtualTour360 : typeof project.tour360 === "string" ? project.tour360 : "");
    };

    const onSave = async () => {
        setIsBusy(true);
        try {
            if (images.length > MAX_PROJECT_IMAGES) {
                toast.error("Too many images", `A project can have up to ${MAX_PROJECT_IMAGES} images only.`);
                return;
            }
            const imageFiles = images.filter((item) => item.file).map((item) => item.file as File);
            const removeKeys = [...pendingRemoveKeys];
            if (!videoDraft.file && !videoDraft.url && videoDraft.filename) removeKeys.push(videoDraft.filename);
            if (!brochureDraft.file && !brochureDraft.url && brochureDraft.filename) removeKeys.push(brochureDraft.filename);
            if (!masterPlanDraft.file && !masterPlanDraft.url && masterPlanDraft.filename) removeKeys.push(masterPlanDraft.filename);

            const uniqueRemoveKeys = Array.from(new Set(removeKeys));
            if (uniqueRemoveKeys.length) {
                await removeMediaKeys(uniqueRemoveKeys);
            }
            if (imageFiles.length) {
                await uploadMediaFiles({ images: imageFiles });
            }
            if (videoDraft.file) {
                await uploadMediaFiles({ video: videoDraft.file });
            }
            if (brochureDraft.file) {
                await uploadMediaFiles({ brochure: brochureDraft.file });
            }
            if (masterPlanDraft.file) {
                await uploadMediaFiles({ masterPlan: masterPlanDraft.file });
            }
            await projectsService.updateProject(projectId, { virtualTour360: tourLink.trim() || null });
            toast.success("Media updated", "Media details saved successfully.");
            await onAfterSave();
            onContinue?.();
        } catch (error: unknown) {
            const message = (error as { message?: string })?.message || "Failed to save media details.";
            toast.error("Save failed", message);
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="relative">
            {isBusy ? (
                <div
                    className="fixed inset-0 z-[1250] flex flex-col items-center justify-center gap-3 bg-black/25"
                    role="status"
                    aria-live="polite"
                    aria-busy="true"
                >
                    <Loader size={90} margin={0} />
                    <p className="rounded-[8px] bg-white/95 px-4 py-2 text-[14px] font-[SemiBold] text-[#222] shadow-sm">
                        Please wait…
                    </p>
                </div>
            ) : null}
            <div className={` bg-white min-w-0 overflow-hidden ${isBusy ? "pointer-events-none opacity-60" : ""}`}>
                <div className="border-b border-[rgba(34,34,34,0.10)]">
                    <div className="flex items-center justify-between gap-4 md:p-[30px_30px_25px_30px] p-[16px]">
                        <h2 className="text-[20px] font-[Bold] text-[#222]">Images</h2>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                aria-label="Previous images"
                                disabled={!canPrevGallery}
                                onClick={() => setGalleryPage((page) => Math.max(0, page - 1))}
                                className="rotate-180 cursor-pointer flex h-9 w-9 items-center justify-center text-[#222] transition-opacity hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                                <LeftArrowIcon width={8} height={14} fill="#222222" />
                            </button>
                            <button
                                type="button"
                                aria-label="Next images"
                                disabled={!canNextGallery}
                                onClick={() => setGalleryPage((page) => Math.min(totalGalleryPages - 1, page + 1))}
                                className="cursor-pointer flex h-9 w-9 items-center justify-center bg-white text-[#222] transition-opacity hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                                <RightArrowIcon width={8} height={14} fill="#222222" />
                            </button>
                        </div>
                    </div>
                    {images.length ? (
                        <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-0">
                            {visibleImages.map((item) => (
                                <div key={item.key} className="group relative aspect-square overflow-hidden bg-[#F0F0F0]">
                                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                                    <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
                                    <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2 opacity-0 transition-opacity group-hover:opacity-100">
                                        <div className="pointer-events-auto flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReplaceImageKey(item.key);
                                                    replaceImageInputRef.current?.click();
                                                }}
                                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-md transition hover:bg-[#F5F5F5]"
                                            >
                                                <ChangeIcon width={11} height={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDeleteImage(item.filename)}
                                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-md transition hover:bg-[#F5F5F5]"
                                            >
                                                <TrashIcon width={14} height={14} fill="#222222" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-[12px] border border-dashed border-[rgba(34,34,34,0.25)] bg-[#FAFAFA] min-h-[120px] flex items-center justify-center text-[13px] text-[#707070]">
                            No images uploaded yet
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-2 md:p-[30px] p-[16px]">
                        <button
                            type="button"
                            onClick={() => addImagesInputRef.current?.click()}
                            className="flex items-center gap-[5px] cursor-pointer"
                        >
                            <PlusIcon width={15} height={15} fill="#222222" />
                            <span className="text-[12px] font-[SemiBold] text-[#222]">Add Photo</span>
                        </button>
                        <button
                            type="button"
                            onClick={onDeleteAllImages}
                            className="flex items-center gap-[5px] cursor-pointer"
                        >
                            <TrashIcon width={15} height={15} fill="#222222" />
                            <span className="text-[12px] font-[SemiBold] text-[#222]">Delete all</span>
                        </button>
                    </div>
                </div>

                <div className="border-b border-[rgba(34,34,34,0.10)] md:px-[30px] px-[16px] py-6 md:py-8">
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[14px]">Project video</h2>
                    <div className="flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-10">
                        <div className="relative w-full max-w-[560px] min-w-0 overflow-hidden rounded-[12px] bg-[#F0F0F0] aspect-video">
                            {videoDraft.url ? (
                                <video src={videoDraft.url} className="h-full w-full object-cover" controls playsInline />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-[13px] text-[#707070]">No video uploaded</div>
                            )}
                        </div>
                        <div className="flex w-[88px] shrink-0 flex-col justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => videoInputRef.current?.click()}
                                className="flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] text-[#707070] transition hover:opacity-80"
                            >
                                <ChangeIcon width={11} height={12} />
                                <span>Change</span>
                            </button>
                            <button
                                type="button"
                                onClick={onDeleteVideo}
                                className="flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] text-[#707070] transition hover:opacity-80"
                            >
                                <TrashIcon width={14} height={14} fill="#222222" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-b border-[rgba(34,34,34,0.10)] md:px-[30px] px-[16px] py-6 md:py-8 ">
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[14px]">Brochure document</h2>
                    <div className="flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-10">
                        <div className="flex min-w-0 flex-1 max-w-[560px] items-center gap-4 rounded-[12px] bg-white px-4 py-4 shadow-[0_-1px_18px_0px_rgba(0,0,0,0.10)]">
                            <PdfIcon width={34} height={42} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-[SemiBold] text-[#222] break-all">
                                    {brochureDraft.filename || "No brochure uploaded"}
                                </p>
                            </div>
                            {brochureDraft.url ? (
                                <a
                                    href={brochureDraft.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#F5F5F5] transition "
                                >
                                    <DownloadIcon width={14} height={14} />
                                </a>
                            ) : null}
                        </div>
                        <div className="flex w-[88px] shrink-0 flex-col justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => brochureInputRef.current?.click()}
                                className="flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] text-[#707070] transition hover:opacity-80"
                            >
                                <ChangeIcon width={11} height={12} />
                                <span>Change</span>
                            </button>
                            <button
                                type="button"
                                onClick={onDeleteBrochure}
                                className="flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] text-[#707070] transition hover:opacity-80"
                            >
                                <TrashIcon width={14} height={14} fill="#222222" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-b border-[rgba(34,34,34,0.10)] md:px-[30px] px-[16px] py-6 md:py-8">
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[14px]">Master plan</h2>
                    <div className="flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-10">
                        <div className="relative w-full max-w-[560px] min-w-0 overflow-hidden rounded-[12px] bg-[#F0F0F0] aspect-[3/2]">
                            {masterPlanDraft.url ? (
                                <img src={masterPlanDraft.url} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-[13px] text-[#707070]">No master plan uploaded</div>
                            )}
                        </div>
                        <div className="flex w-[88px] shrink-0 flex-col justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => masterPlanInputRef.current?.click()}
                                className="flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] text-[#222] transition hover:opacity-80"
                            >
                                <ChangeIcon width={11} height={12} />
                                <span>Change</span>
                            </button>
                            <button
                                type="button"
                                onClick={onDeleteMasterPlan}
                                className="flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] text-[#222] transition hover:opacity-80"
                            >
                                <TrashIcon width={14} height={14} fill="#222222" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[20px]">
                        360 tour link <span className="text-[#707070] font-[Regular]">(Optional)</span>
                    </label>
                    <input
                        type="text"
                        value={tourLink}
                        onChange={(event) => setTourLink(event.target.value)}
                        placeholder="Enter tour link"
                        className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                    />
                </div>
            </div>

            <input
                ref={addImagesInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                    onAddImages(event.target.files);
                    event.currentTarget.value = "";
                }}
            />
            <input
                ref={replaceImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    onReplaceImage(event.target.files?.[0]);
                    event.currentTarget.value = "";
                }}
            />
            <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                    onChangeVideo(event.target.files?.[0]);
                    event.currentTarget.value = "";
                }}
            />
            <input
                ref={brochureInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => {
                    onChangeBrochure(event.target.files?.[0]);
                    event.currentTarget.value = "";
                }}
            />
            <input
                ref={masterPlanInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    onChangeMasterPlan(event.target.files?.[0]);
                    event.currentTarget.value = "";
                }}
            />

            <div className="flex items-center justify-end gap-[10px] mt-[30px]">
                <button
                    type="button"
                    onClick={onDiscard}
                    disabled={isBusy}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] border border-[#222] text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px] disabled:opacity-50"
                >
                    Discard
                </button>
                <button
                    type="button"
                    onClick={() => void onSave()}
                    disabled={isBusy}
                    className="cursor-pointer h-[44px] rounded-[10px] px-[20px] bg-[#EA3934] text-[#FFF] text-[14px] font-[Bold] inline-flex items-center gap-[5px] disabled:opacity-50"
                >
                    {isBusy ? "Please wait…" : primaryActionLabel}
                </button>
            </div>
        </div>
    );
};

export default EditMedia;
