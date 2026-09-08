import { useEffect, useRef, useState } from "react";
import videoPlay from "../../../../../assets/img/video.webm";
import {
    ChangeIcon,
    TrashIcon,
    PlayIcon,
} from "../../../../../components/CustomFile/icons";

type HoverActionsProps = {
    onChange: () => void;
    onDelete: () => void;
};

const HoverActions = ({ onChange, onDelete }: HoverActionsProps) => {
    return (
        <div className="flex w-[88px] shrink-0 flex-col justify-center gap-3">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onChange();
                }}
                className="flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] text-[#707070] transition hover:opacity-80"
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
                className="flex cursor-pointer items-center gap-2 text-left text-[13px] font-[SemiBold] text-[#707070] transition hover:opacity-80"
            >
                <TrashIcon width={14} height={14} fill="#222222" />
                <span>Delete</span>
            </button>
        </div>
    );
};

type VideoBrochureSectionsProps = {
    videoUrl?: string | null;
    onChangeVideo?: (file: File) => void;
    onDeleteVideo?: () => void;
};

const VideoBrochureSections = ({ videoUrl, onChangeVideo, onDeleteVideo }: VideoBrochureSectionsProps) => {
    const videoInputRef = useRef<HTMLInputElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        setIsPlaying(false);
        if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
        }
    }, [videoUrl]);

    useEffect(() => {
        return () => {
            if (videoRef.current) {
                videoRef.current.pause();
            }
        };
    }, []);

    const handlePlay = () => {
        if (!videoRef.current) return;
        videoRef.current.play();
        setIsPlaying(true);
    };

    const handlePause = () => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        setIsPlaying(false);
    };

    return (
        <>
            {/* Property video */}
            <div className="border-b border-[rgba(34,34,34,0.10)] md:px-[30px] px-[16px] py-6 md:py-8">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-4 md:mb-5">Video</h2>
                <div className="flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-10">
                    <div className="relative w-full max-w-[560px] min-w-0 overflow-hidden rounded-[12px] bg-[#222]">
                        <video
                            ref={videoRef}
                            src={videoUrl ?? videoPlay}
                            className="w-full h-[220px] sm:h-[260px] lg:h-[280px] object-cover cursor-pointer"
                            muted
                            loop
                            playsInline
                            onClick={handlePause}
                        />
                        {!isPlaying && (
                            <button
                                type="button"
                                onClick={handlePlay}
                                className="absolute inset-0 flex items-center justify-center bg-black/20"
                            >
                                <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full">
                                    <PlayIcon />
                                </span>
                            </button>
                        )}
                    </div>
                    <HoverActions
                        onChange={() => videoInputRef.current?.click()}
                        onDelete={() => onDeleteVideo?.()}
                    />
                </div>
                <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.type.startsWith("video/")) {
                            onChangeVideo?.(file);
                        }
                        e.currentTarget.value = "";
                    }}
                />
            </div>
        </>
    );
};

export default VideoBrochureSections;
