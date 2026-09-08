import { useRef } from "react";
import { GalleryIcon, VideoIcon } from "../../../../assets/icons";

type PropertyMediaSectionProps = {
  videoPreviewUrl: string | null;
  virtualTour360: string;
  onVirtualTour360Change: (value: string) => void;
  onVideoFileSelected?: (file: File | null) => void;
  onRemoveVideo?: () => void;
  onSaveMedia?: () => void;
  isSavingMedia?: boolean;
};

const PropertyMediaSection = ({
  videoPreviewUrl,
  virtualTour360,
  onVirtualTour360Change,
  onVideoFileSelected,
  onRemoveVideo,
  onSaveMedia,
  isSavingMedia = false,
}: PropertyMediaSectionProps) => {
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="bg-white rounded-[12px] p-[20px] border border-[#EAEAEA] flex flex-col gap-[30px]">
      <h3 className="text-[18px] font-[Bold] text-[#222]">Media upload</h3>

      <div>
        <p className="text-[14px] font-[Bold] text-[#222] mb-[12px]">
          Property video <span className="text-[#707070] font-[Regular]">(Optional)</span>
        </p>
        <div
          onClick={() => videoInputRef.current?.click()}
          className="rounded-[15px] border border-dashed border-[rgba(34,34,34,0.30)] min-h-[220px] flex flex-col items-center justify-center text-center md:p-[56px] p-[24px] cursor-pointer"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") videoInputRef.current?.click();
          }}
        >
          {!videoPreviewUrl ? (
            <>
              <VideoIcon width={52} height={52} />
              <p className="text-[13px] font-[Medium] text-[#222] mt-[20px]">
                Select a file or drag and drop here
              </p>
              <p className="text-[12px] font-[Regular] text-[#707070] mt-[12px]">
                MP4 or WebM, file size must not exceed 1GB
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  videoInputRef.current?.click();
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
                className="w-full max-h-[410px] object-cover rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-black"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  videoInputRef.current?.click();
                }}
                className="mt-[14px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
              >
                Replace video
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveVideo?.();
                }}
                className="mt-[10px] h-[34px] px-[16px] rounded-[10px] border border-[#222] text-[#222] text-[12px] font-[SemiBold]"
              >
                Remove video
              </button>
            </div>
          )}
        </div>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            onVideoFileSelected?.(file);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <div>
        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
          360 tour link <span className="text-[#707070] font-[Regular]">(Optional)</span>
        </label>
        <input
          type="text"
          placeholder="Enter tour link"
          value={virtualTour360}
          onChange={(e) => onVirtualTour360Change(e.target.value)}
          className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
        />
      </div>

      <p className="text-[12px] text-[#707070] flex items-center gap-[8px] -mt-[16px]">
        <GalleryIcon width={16} height={16} />
        Property images are managed in the gallery section below.
      </p>

      <div className="flex justify-end -mt-[10px]">
        <button
          type="button"
          onClick={onSaveMedia}
          disabled={isSavingMedia}
          className="h-[38px] rounded-[10px] bg-[#0832AE] px-[14px] text-[12px] font-[SemiBold] text-white disabled:opacity-60"
        >
          {isSavingMedia ? "Saving media..." : "Save Video / 360"}
        </button>
      </div>
    </div>
  );
};

export default PropertyMediaSection;
