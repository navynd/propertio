import { useEffect, useState } from "react";
import { CancelIcon } from "../../../../components/CustomFile/icons";

interface PropertyUrlModalProps {
    isOpen: boolean;
    onClose: () => void;
    value?: string;
    onSave?: (nextUrl: string) => void | Promise<void>;
    isSaving?: boolean;
}

const PropertyUrlModal = ({ isOpen, onClose, value, onSave, isSaving = false }: PropertyUrlModalProps) => {
    const [url, setUrl] = useState(value ?? "");

    useEffect(() => {
        if (!isOpen) return;
        setUrl(value ?? "");
    }, [isOpen, value]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center md:items-center items-end z-[9999]"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="relative bg-white w-full md:max-w-[480px] h-auto transform transition-all duration-300 rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden">
                <div className="shrink-0 flex justify-end  p-[20px_20px_0px_20px] ">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center"
                    >
                        <CancelIcon width={14} height={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_50px]">
                    <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1]">
                        Edit property URL
                    </h2>
                    <div className="flex flex-col gap-[24px] mt-[35px]">
                        {/* Property url */}
                        <div>
                            <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                                Property url
                            </label>
                            <input
                                type="text"
                                placeholder="Enter property url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] text-[#222] font-[Medium]  placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="shrink-0  p-[20px_20px_20px_20px] md:p-[30px_50px_60px_50px]">
                    <button
                        type="button"
                        onClick={() => {
                            onSave?.(url.trim());
                        }}
                        disabled={isSaving}
                        className="cursor-pointer h-[44px] w-full rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PropertyUrlModal;
