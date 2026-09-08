import { useEffect, useRef, useState } from "react";
import home1img from "../../../../../assets/img/home1.png";
import home4img from "../../../../../assets/img/home4.png";
import {
    ChangeIcon,
    TrashIcon,
    PdfIcon,
    PlayIcon,
    DownloadIcon,
} from "../../../../../assets/icons";

const formatUploadedDate = (ts: number) => {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

type HoverActionsProps = {
    onChange: () => void;
    onDelete: () => void;
    /** Match static design: dark labels (#222) vs muted (#707070) */
    labelTone?: "muted" | "dark";
};

const HoverActions = ({ onChange, onDelete, labelTone = "muted" }: HoverActionsProps) => {
    const labelClass = labelTone === "dark" ? "text-[#222]" : "text-[#707070]";
    return (
        <div className="flex w-[88px] shrink-0 flex-col justify-center gap-3">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onChange();
                }}
                className={`flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] ${labelClass} transition hover:opacity-80`}
            >
                <ChangeIcon width={11} height={12} />
                <span>Change</span>
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                className={`flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] ${labelClass} transition hover:opacity-80`}
            >
                <TrashIcon width={14} height={14} fill="#222222" />
                <span>Delete</span>
            </button>
        </div>
    );
};

const VideoBrochureSection = () => {
    const videoInputRef = useRef<HTMLInputElement | null>(null);
    const brochureInputRef = useRef<HTMLInputElement | null>(null);
    const masterPlanInputRef = useRef<HTMLInputElement | null>(null);
    const videoUrlRef = useRef<string | null>(null);
    const brochureUrlRef = useRef<string | null>(null);
    const masterPlanUrlRef = useRef<string | null>(null);

    const [posterSrc] = useState(home1img);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const [brochure, setBrochure] = useState<{
        url: string | null;
        name: string;
        lastModified: number;
    } | null>({
        url: null,
        name: "Brochure_file.pdf",
        lastModified: new Date(2025, 4, 26).getTime(),
    });

    const [masterPlanSrc, setMasterPlanSrc] = useState<string | null>(home4img);

    videoUrlRef.current = videoUrl;
    brochureUrlRef.current = brochure?.url ?? null;
    masterPlanUrlRef.current =
        masterPlanSrc != null && masterPlanSrc.startsWith("blob:") ? masterPlanSrc : null;

    useEffect(() => {
        return () => {
            if (videoUrlRef.current?.startsWith("blob:")) URL.revokeObjectURL(videoUrlRef.current);
            const b = brochureUrlRef.current;
            if (b?.startsWith("blob:")) URL.revokeObjectURL(b);
            const m = masterPlanUrlRef.current;
            if (m) URL.revokeObjectURL(m);
        };
    }, []);

    const setVideoFromFile = (file: File | undefined) => {
        if (!file || !file.type.startsWith("video/")) return;
        setVideoUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
    };

    const clearVideo = () => {
        setVideoUrl((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return null;
        });
    };

    const setBrochureFromFile = (file: File | undefined) => {
        if (!file) return;
        const isPdf =
            file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) return;
        setBrochure((prev) => {
            if (prev?.url?.startsWith("blob:")) URL.revokeObjectURL(prev.url);
            return {
                url: URL.createObjectURL(file),
                name: file.name,
                lastModified: file.lastModified,
            };
        });
    };

    const clearBrochure = () => {
        setBrochure((prev) => {
            if (prev?.url?.startsWith("blob:")) URL.revokeObjectURL(prev.url);
            return null;
        });
    };

    const setMasterPlanFromFile = (file: File | undefined) => {
        if (!file || !file.type.startsWith("image/")) return;
        setMasterPlanSrc((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
    };

    const clearMasterPlan = () => {
        setMasterPlanSrc((prev) => {
            if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
            return null;
        });
    };

    return (
        <>
            {/* Project video */}
            <div className="border-b border-[rgba(34,34,34,0.10)] md:px-[30px] px-[16px] py-6 md:py-8">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-4 md:mb-5">Project video</h2>
                <div className="flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-10">
                    <div className="relative w-full max-w-[560px] min-w-0 overflow-hidden rounded-[12px] bg-[#F0F0F0] aspect-video">
                        {videoUrl ? (
                            <video
                                src={videoUrl}
                                className="h-full w-full object-cover cursor-pointer"
                                controls
                                playsInline
                            />
                        ) : (
                            <>
                                <img
                                    src={posterSrc}
                                    alt=""
                                    className="h-full w-full object-cover cursor-pointer"
                                />
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-black/35 shadow-md backdrop-blur-[2px]">
                                        <PlayIcon width={30} height={30} />
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="pointer-events-none absolute inset-0 rounded-[12px] bg-black/0 transition-colors bg-black/10" />
                    </div>
                    <HoverActions
                        onChange={() => videoInputRef.current?.click()}
                        onDelete={clearVideo}
                    />
                </div>
                <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                        setVideoFromFile(e.target.files?.[0]);
                        e.currentTarget.value = "";
                    }}
                />
            </div>

            {/* Brochure document */}
            <div className="border-b border-[rgba(34,34,34,0.10)] md:px-[30px] px-[16px] py-6 md:py-8">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-4 md:mb-5">Brochure document</h2>
                {brochure ? (
                    <div className="flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-10">
                        <div className="flex min-w-0 flex-1 max-w-[560px] items-center gap-4 rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white px-4 py-3">
                            <PdfIcon width={34} height={42} />
                            <div className="min-w-0 flex-1">
                                <p className="text-[14px] font-[SemiBold] text-[#222] break-all">
                                    {brochure.name}
                                </p>
                                <p className="text-[12px] text-[#707070] mt-1">
                                    Uploaded on {formatUploadedDate(brochure.lastModified)}
                                </p>
                            </div>
                            {brochure.url ? (
                                <a
                                    href={brochure.url}
                                    download={brochure.name}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(34,34,34,0.08)] bg-[#F5F5F5] transition hover:bg-[#ECECEC]"
                                    aria-label="Download brochure"
                                >
                                    <DownloadIcon width={14} height={14} />
                                </a>
                            ) : (
                                <span
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(34,34,34,0.06)] bg-[#FAFAFA] opacity-40"
                                    aria-hidden
                                >
                                    <DownloadIcon width={14} height={14} />
                                </span>
                            )}
                        </div>
                        <HoverActions
                            onChange={() => brochureInputRef.current?.click()}
                            onDelete={clearBrochure}
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => brochureInputRef.current?.click()}
                        className="flex min-h-[100px] w-full max-w-[560px] flex-col items-center justify-center rounded-[12px] border border-dashed border-[rgba(34,34,34,0.25)] bg-[#FAFAFA] px-4 py-6 text-[13px] text-[#707070] transition hover:border-[rgba(34,34,34,0.35)]"
                    >
                        Select brochure (PDF)
                    </button>
                )}
                <input
                    ref={brochureInputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                        setBrochureFromFile(e.target.files?.[0]);
                        e.currentTarget.value = "";
                    }}
                />
            </div>

            {/* Masterplan */}
            <div className="border-b border-[rgba(34,34,34,0.10)] md:px-[30px] px-[16px] py-6 md:py-8">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-4 md:mb-5">Masterplan</h2>
                {masterPlanSrc ? (
                    <div className=" flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                        <div className="relative w-full max-w-[560px] min-w-0 overflow-hidden rounded-[12px] bg-[#F0F0F0] aspect-[3/2]">
                            <img
                                src={masterPlanSrc}
                                alt=""
                                className="h-full w-full object-cover"
                            />
                            <div className="pointer-events-none absolute inset-0 rounded-[12px] bg-black/0 transition-colors group-hover:bg-black/10" />
                        </div>
                        <HoverActions
                            labelTone="dark"
                            onChange={() => masterPlanInputRef.current?.click()}
                            onDelete={clearMasterPlan}
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => masterPlanInputRef.current?.click()}
                        className="flex min-h-[120px] w-full max-w-[560px] flex-col items-center justify-center rounded-[12px] border border-dashed border-[rgba(34,34,34,0.25)] bg-[#FAFAFA] px-4 py-6 text-[13px] text-[#707070] transition hover:border-[rgba(34,34,34,0.35)]"
                    >
                        Select masterplan image
                    </button>
                )}
                <input
                    ref={masterPlanInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                        setMasterPlanFromFile(e.target.files?.[0]);
                        e.currentTarget.value = "";
                    }}
                />
            </div>
        </>
    );
};

export default VideoBrochureSection;
