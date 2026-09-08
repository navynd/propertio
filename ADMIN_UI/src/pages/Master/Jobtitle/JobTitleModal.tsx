import { useEffect, useState } from "react";
import { CancelIcon } from "../../../assets/icons";
import type { JobTitleRecord } from "../../../types/api";
import { formatJobTitleDate } from "./jobTitleData";

const inputClass =
    "h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] focus:outline-none";
const textareaClass =
    "w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] py-[12px] text-[14px] resize-none focus:outline-none";
const labelClass = "text-[14px] font-[Bold] text-[#222] block mb-[6px]";

function Toggle({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
            <span className="text-[13px] font-[Medium] text-[#222]">
                {checked ? "Active" : "Inactive"}
            </span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${checked ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"}`}
            >
                <span
                    className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${checked ? "left-[22px]" : "left-[2px]"}`}
                />
            </button>
        </div>
    );
}

export type JobTitleFormPayload = {
    title: string;
    description: string;
    isActive: boolean;
};

type JobTitleModalProps = {
    isOpen: boolean;
    onClose: () => void;
    editingRecord: JobTitleRecord | null;
    onSave: (payload: JobTitleFormPayload, editingId?: string) => void;
};

export default function JobTitleModal({
    isOpen,
    onClose,
    editingRecord,
    onSave,
}: JobTitleModalProps) {
    const isEdit = Boolean(editingRecord);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        if (editingRecord) {
            setTitle(editingRecord.title);
            setDescription(editingRecord.description ?? "");
            setIsActive(editingRecord.isActive);
            return;
        }
        setTitle("");
        setDescription("");
        setIsActive(true);
    }, [isOpen, editingRecord]);

    if (!isOpen) return null;

    const modalTitle = isEdit ? "Edit Job Title" : "Add Job Title";

    const handleSave = () => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle) return;
        onSave(
            {
                title: trimmedTitle,
                description: description.trim(),
                isActive,
            },
            editingRecord?._id
        );
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/40 flex justify-center md:items-center items-end z-[9999]"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="relative bg-white w-full md:max-w-[520px] rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden">
                <div className="shrink-0 flex justify-end p-[20px_20px_0px_20px]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center"
                        aria-label="Close"
                    >
                        <CancelIcon width={14} height={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_40px]">
                    <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1]">
                        {modalTitle}
                    </h2>

                    <div className="flex flex-col gap-[20px] mt-[28px]">
                        <div>
                            <label className={labelClass}>
                                Title <span className="text-[#EA3934]">*</span>
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Sales Agent"
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                                placeholder="Optional description"
                                className={`${textareaClass} h-[100px]`}
                            />
                            <p className="text-[12px] text-[#707070] mt-[6px] text-right">
                                {description.length}/500
                            </p>
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <Toggle checked={isActive} onChange={setIsActive} />
                        </div>

                        {isEdit && editingRecord && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] pt-[4px]">
                                <div>
                                    <label className={labelClass}>Created At</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={formatJobTitleDate(editingRecord.createdAt)}
                                        className={`${inputClass} bg-[#F9F9F9] cursor-not-allowed`}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Updated At</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={formatJobTitleDate(editingRecord.updatedAt)}
                                        className={`${inputClass} bg-[#F9F9F9] cursor-not-allowed`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="shrink-0 flex flex-wrap items-center justify-end gap-[12px] p-[20px] md:p-[24px_40px_32px_40px] border-t border-[rgba(34,34,34,0.08)]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-[44px] px-[24px] rounded-[10px] border border-[rgba(34,34,34,0.10)] text-[14px] font-[Medium] text-[#222] cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!title.trim()}
                        className="h-[44px] px-[24px] rounded-[10px] bg-[#6A3CA8] text-white text-[14px] font-[Bold] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}
