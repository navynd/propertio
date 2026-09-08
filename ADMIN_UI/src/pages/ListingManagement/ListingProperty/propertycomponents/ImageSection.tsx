import { useEffect, useRef, useState } from "react";
import home1img from "../../../../assets/img/home1.png";
import home2img from "../../../../assets/img/home2.png";
import home3img from "../../../../assets/img/home3.png";
import home4img from "../../../../assets/img/home4.png";
import home5img from "../../../../assets/img/home5.png";
import home6img from "../../../../assets/img/home6.png";
import { LeftArrowIcon, PlusIcon, RightArrowIcon, TrashIcon, ChangeIcon } from "../../../../assets/icons";

const GALLERY_PAGE_SIZE = 12;

type GalleryItem = {
    id: number;
    src: string;
    file?: File;
    source: "remote" | "local";
};

export type ImageSaveEntry =
    | { kind: "remote"; src: string }
    | { kind: "local"; file: File };

const galleryImagess = [
    { id: 1, img: home1img },
    { id: 2, img: home2img },
    { id: 3, img: home3img },
    { id: 4, img: home4img },
    { id: 5, img: home5img },
    { id: 6, img: home6img },
    { id: 7, img: home6img },
    { id: 8, img: home4img },
    { id: 9, img: home2img },
    { id: 10, img: home1img },
    { id: 11, img: home3img },
    { id: 12, img: home5img },
    { id: 13, img: home1img },
    { id: 14, img: home6img },
    { id: 15, img: home5img },
    { id: 16, img: home4img },
    { id: 17, img: home3img },
    { id: 18, img: home2img },
    { id: 19, img: home1img },
    { id: 20, img: home6img },
    { id: 21, img: home5img },
    { id: 22, img: home4img },
    { id: 23, img: home3img },
    { id: 24, img: home2img },
    { id: 25, img: home1img },
    { id: 26, img: home6img },
    { id: 27, img: home5img },
    { id: 28, img: home4img },
    { id: 29, img: home3img },
    { id: 30, img: home2img },
    { id: 31, img: home1img },
    { id: 32, img: home6img },
    { id: 33, img: home5img },
    { id: 34, img: home4img },
    { id: 35, img: home3img },
    { id: 36, img: home2img },
    { id: 37, img: home1img },
    { id: 38, img: home6img },
];

const initialGalleryItems: GalleryItem[] = galleryImagess.map((row) => ({
    id: row.id,
    src: row.img,
    source: "local",
}));

const maxInitialId = galleryImagess.reduce((m, r) => Math.max(m, r.id), 0);

const isBlobUrl = (src: string) => src.startsWith("blob:");

const urlsToGalleryItems = (urls: string[]): GalleryItem[] =>
    urls.map((src, index) => ({ id: index + 1, src, source: "remote" }));

type ImageSectionProps = {
    remoteImageUrls?: string[];
    onLocalFilesChange?: (files: File[]) => void;
    onSaveEntriesChange?: (entries: ImageSaveEntry[], hasChanges: boolean) => void;
    onSaveImages?: () => void;
    isSavingImages?: boolean;
    disableSaveImages?: boolean;
};

const ImageSection = ({
    remoteImageUrls,
    onLocalFilesChange,
    onSaveEntriesChange,
    onSaveImages,
    isSavingImages = false,
    disableSaveImages = false,
}: ImageSectionProps) => {
    const useRemote = remoteImageUrls != null;
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() =>
        useRemote && remoteImageUrls.length > 0
            ? urlsToGalleryItems(remoteImageUrls)
            : useRemote
              ? []
              : initialGalleryItems
    );
    const [galleryPage, setGalleryPage] = useState(0);
    const nextIdRef = useRef(
        useRemote ? Math.max(remoteImageUrls.length, 0) + 1 : maxInitialId + 1
    );
    const addPhotosInputRef = useRef<HTMLInputElement | null>(null);
    const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
    const replaceTargetIdRef = useRef<number | null>(null);
    const galleryItemsRef = useRef(galleryItems);
    const initialSignatureRef = useRef("");
    galleryItemsRef.current = galleryItems;

    const totalGalleryPages = Math.max(1, Math.ceil(galleryItems.length / GALLERY_PAGE_SIZE));
    const visibleGallery = galleryItems.slice(
        galleryPage * GALLERY_PAGE_SIZE,
        galleryPage * GALLERY_PAGE_SIZE + GALLERY_PAGE_SIZE
    );
    const canPrevGallery = galleryPage > 0;
    const canNextGallery = galleryPage < totalGalleryPages - 1;

    const buildItemSignature = (items: GalleryItem[]) =>
        items
            .map((item) => {
                if (item.source === "remote") return `remote:${item.src}`;
                const file = item.file;
                if (!file) return `local:${item.src}`;
                return `local:${file.name}:${file.size}:${file.lastModified}`;
            })
            .join("|");

    useEffect(() => {
        if (remoteImageUrls == null) return;
        const items = urlsToGalleryItems(remoteImageUrls);
        setGalleryItems(items);
        setGalleryPage(0);
        nextIdRef.current = items.length + 1;
        initialSignatureRef.current = buildItemSignature(items);
    }, [remoteImageUrls]);

    useEffect(() => {
        if (galleryPage > totalGalleryPages - 1) {
            setGalleryPage(Math.max(0, totalGalleryPages - 1));
        }
    }, [galleryPage, totalGalleryPages]);

    useEffect(() => {
        return () => {
            galleryItemsRef.current.forEach((item) => {
                if (isBlobUrl(item.src)) URL.revokeObjectURL(item.src);
            });
        };
    }, []);

    useEffect(() => {
        if (!onLocalFilesChange) return;
        onLocalFilesChange(
            galleryItems
                .filter((item) => item.source === "local" && item.file)
                .map((item) => item.file as File)
        );
    }, [galleryItems, onLocalFilesChange]);

    useEffect(() => {
        if (!onSaveEntriesChange) return;
        const entries: ImageSaveEntry[] = galleryItems
            .map((item) =>
                item.source === "remote"
                    ? ({ kind: "remote", src: item.src } as const)
                    : item.file
                      ? ({ kind: "local", file: item.file } as const)
                      : null
            )
            .filter((item): item is ImageSaveEntry => item != null);
        const hasChanges = buildItemSignature(galleryItems) !== initialSignatureRef.current;
        onSaveEntriesChange(entries, hasChanges);
    }, [galleryItems, onSaveEntriesChange]);

    const appendPhotosFromFiles = (files: FileList | null) => {
        if (!files?.length) return;
        const fileArr = Array.from(files);
        let lastPageAfterAdd = 0;
        setGalleryItems((prev) => {
            const added = fileArr.map((file) => ({
                id: nextIdRef.current++,
                src: URL.createObjectURL(file),
                file,
                source: "local" as const,
            }));
            const next = [...prev, ...added];
            lastPageAfterAdd = Math.max(0, Math.ceil(next.length / GALLERY_PAGE_SIZE) - 1);
            return next;
        });
        // New files are appended at the end; jump to the page that contains them so visibleGallery updates on screen.
        setGalleryPage(lastPageAfterAdd);
    };

    const replacePhoto = (id: number, file: File | undefined) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setGalleryItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;
                if (isBlobUrl(item.src)) URL.revokeObjectURL(item.src);
                return { ...item, src: url, file, source: "local" as const };
            })
        );
    };

    const deletePhoto = (id: number) => {
        setGalleryItems((prev) => {
            const target = prev.find((i) => i.id === id);
            if (target && isBlobUrl(target.src)) URL.revokeObjectURL(target.src);
            return prev.filter((i) => i.id !== id);
        });
    };

    const deleteAllPhotos = () => {
        setGalleryItems((prev) => {
            prev.forEach((item) => {
                if (isBlobUrl(item.src)) URL.revokeObjectURL(item.src);
            });
            return [];
        });
        setGalleryPage(0);
    };

    return (
        <>
            <div className="min-w-0 border border-[#EAEAEA] rounded-[12px]">
                <div>
                    <div className="flex items-center justify-between gap-4 md:p-[20px] p-[16px]">
                        <h2 className="text-[20px] font-[Bold] text-[#222]">Images</h2>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                aria-label="Previous images"
                                disabled={!canPrevGallery}
                                onClick={() => setGalleryPage((p) => Math.max(0, p - 1))}
                                className="rotate-180 cursor-pointer flex h-9 w-9 items-center justify-center text-[#222] transition-opacity hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                                <LeftArrowIcon width={8} height={14} fill="#222222" />
                            </button>
                            <button
                                type="button"
                                aria-label="Next images"
                                disabled={!canNextGallery}
                                onClick={() => setGalleryPage((p) => Math.min(totalGalleryPages - 1, p + 1))}
                                className="cursor-pointer flex h-9 w-9 items-center justify-center bg-white text-[#222] transition-opacity hover:bg-[#FAFAFA] disabled:cursor-not-allowed disabled:opacity-35"
                            >
                                <RightArrowIcon width={8} height={14} fill="#222222" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-0">
                        {visibleGallery.map((item) => (
                            <div
                                key={item.id}
                                className="group relative aspect-square overflow-hidden bg-[#F0F0F0]"
                            >
                                <img src={item.src} alt="" className="h-full w-full object-cover" />
                                <div className="pointer-events-none absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/15" />
                                <div className="absolute inset-x-0 bottom-0 flex justify-center pb-2 opacity-0 transition-opacity group-hover:opacity-100">
                                    <div className="pointer-events-auto flex items-center gap-2">
                                        <button
                                            type="button"
                                            aria-label="Replace image"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                replaceTargetIdRef.current = item.id;
                                                replaceImageInputRef.current?.click();
                                            }}
                                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-md transition hover:bg-[#F5F5F5]"
                                        >
                                            <ChangeIcon width={11} height={12} />
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="Delete image"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deletePhoto(item.id);
                                            }}
                                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white shadow-md transition hover:bg-[#F5F5F5]"
                                        >
                                            <TrashIcon width={14} height={14} fill="#222222" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between gap-2 md:p-[30px] p-[16px]">
                        <button
                            type="button"
                            className="flex items-center gap-[5px] cursor-pointer"
                            onClick={() => addPhotosInputRef.current?.click()}
                        >
                            <PlusIcon width={15} height={15} fill="#222222" />
                            <span className="text-[12px] font-[SemiBold] text-[#222222]">Add Photo</span>
                        </button>
                        <button
                            type="button"
                            className="flex items-center gap-[5px] cursor-pointer"
                            onClick={deleteAllPhotos}
                        >
                            <TrashIcon width={15} height={15} fill="#222222" />
                            <span className="text-[12px] font-[SemiBold] text-[#222222]">Delete all</span>
                        </button>
                    </div>
                    <div className="flex justify-end px-[16px] pb-[16px] md:px-[30px] md:pb-[24px]">
                        <button
                            type="button"
                            onClick={onSaveImages}
                            disabled={isSavingImages || disableSaveImages}
                            className="h-[38px] rounded-[10px] bg-[#0832AE] px-[14px] text-[12px] font-[SemiBold] text-white disabled:opacity-60"
                        >
                            {isSavingImages ? "Saving images..." : "Save Images"}
                        </button>
                    </div>
                </div>
            </div>

            <input
                ref={addPhotosInputRef}
                type="file"
                accept="image/*"
                multiple={true}
                aria-label="Upload multiple images"
                className="hidden"
                onChange={(e) => {
                    appendPhotosFromFiles(e.target.files);
                    e.currentTarget.value = "";
                }}
            />
            <input
                ref={replaceImageInputRef}
                type="file"
                accept="image/*"
                multiple={false}
                aria-label="Replace with one image"
                className="hidden"
                onChange={(e) => {
                    const id = replaceTargetIdRef.current;
                    const file = e.target.files?.[0];
                    replaceTargetIdRef.current = null;
                    if (id != null && file) replacePhoto(id, file);
                    e.currentTarget.value = "";
                }}
            />
        </>
    );
};

export default ImageSection;
