import { useEffect, useRef, useState } from "react";
import { LeftArrowIcon, PlusIcon, RightArrowIcon, TrashIcon, ChangeIcon } from "../../../../../components/CustomFile/icons";

const GALLERY_PAGE_SIZE = 12;

type GalleryItem = {
    id: string;
    src: string;
};

const isBlobUrl = (src: string) => src.startsWith("blob:");

type ImageSectionProps = {
    items?: GalleryItem[];
    onAddPhotos?: (files: File[]) => void;
    onReplacePhoto?: (id: string, file: File) => void;
    onDeletePhoto?: (id: string) => void;
    onDeleteAll?: () => void;
};

const ImageSection = ({
    items = [],
    onAddPhotos,
    onReplacePhoto,
    onDeletePhoto,
    onDeleteAll,
}: ImageSectionProps) => {
    const incomingGallery = items;
    const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(incomingGallery);
    const [galleryPage, setGalleryPage] = useState(0);
    const addPhotosInputRef = useRef<HTMLInputElement | null>(null);
    const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
    const replaceTargetIdRef = useRef<string | null>(null);
    const galleryItemsRef = useRef(galleryItems);
    galleryItemsRef.current = galleryItems;

    const totalGalleryPages = Math.max(1, Math.ceil(galleryItems.length / GALLERY_PAGE_SIZE));
    const visibleGallery = galleryItems.slice(
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

    useEffect(() => {
        setGalleryItems((prev) => {
            prev.forEach((item) => {
                if (isBlobUrl(item.src)) URL.revokeObjectURL(item.src);
            });
            return incomingGallery;
        });
        setGalleryPage(0);
    }, [items]);

    useEffect(() => {
        return () => {
            galleryItemsRef.current.forEach((item) => {
                if (isBlobUrl(item.src)) URL.revokeObjectURL(item.src);
            });
        };
    }, []);

    const appendPhotosFromFiles = (files: FileList | null) => {
        if (!files?.length) return;
        const fileArr = Array.from(files);
        onAddPhotos?.(fileArr);
    };

    const replacePhoto = (id: string, file: File | undefined) => {
        if (!file) return;
        onReplacePhoto?.(id, file);
    };

    const deletePhoto = (id: string) => {
        onDeletePhoto?.(id);
    };

    const deleteAllPhotos = () => {
        onDeleteAll?.();
    };

    return (
        <>
            <div className="min-w-0 border-b border-[#EAEAEA]">
                <div>
                    <div className="flex items-center justify-between gap-4 md:p-[20px_30px] p-[16px]">
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
