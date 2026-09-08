import { useEffect, useRef, useState } from "react";
import { DownArrowIcon } from "../../../assets/icons";
import type { SeoFields } from "../cmsData";

export const inputClass =
    "h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none";
export const textareaClass =
    "w-full rounded-[10px] border border-[#EAEAEA] px-[14px] py-[12px] text-[13px] resize-none focus:outline-none";
export const labelClass = "block text-[14px] font-[SemiBold] text-[#222] mb-[8px]";
export const sectionClass = "bg-white rounded-[12px] p-[20px] border border-[#EAEAEA] mb-[20px]";
export const sectionTitleClass = "text-[18px] font-[Bold] text-[#222] mb-[20px]";

export function RequiredLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className={labelClass}>
            {children} <span className="text-[#EA3934]">*</span>
        </label>
    );
}

export function TextField({
    label,
    value,
    onChange,
    placeholder,
    required,
    type = "text",
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    required?: boolean;
    type?: string;
}) {
    return (
        <div>
            {required ? (
                <RequiredLabel>{label}</RequiredLabel>
            ) : (
                <label className={labelClass}>{label}</label>
            )}
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={inputClass}
            />
        </div>
    );
}

export function TextAreaField({
    label,
    value,
    onChange,
    placeholder,
    rows = 4,
    required,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
    required?: boolean;
}) {
    return (
        <div>
            {required ? <RequiredLabel>{label}</RequiredLabel> : <label className={labelClass}>{label}</label>}
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className={textareaClass}
            />
        </div>
    );
}

export function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div>
            <label className={labelClass}>{label}</label>
            <div className="flex items-center justify-between border border-[#EAEAEA] rounded-[10px] px-[14px] h-[44px]">
                <span className="text-[13px] font-[Medium] text-[#222]">{checked ? "Active" : "Inactive"}</span>
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
        </div>
    );
}

export function Dropdown({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (v: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const display = options.find((o) => o.value === value)?.label ?? value;

    return (
        <div>
            <label className={labelClass}>{label}</label>
            <div className="relative w-full" ref={ref}>
                <div
                    onClick={() => setOpen(!open)}
                    className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none"
                >
                    <h4 className="text-[13px] font-[Medium] text-[#222] truncate">{display}</h4>
                    <DownArrowIcon className={`mt-[2px] transition-transform ${open ? "rotate-180" : ""}`} width={14} height={14} />
                </div>
                {open && (
                    <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 overflow-hidden py-[8px] max-h-[220px] overflow-y-auto">
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                className={`flex items-center px-[14px] py-[10px] cursor-pointer hover:bg-[#F5F5F5] ${value === opt.value ? "bg-[#F5F5F5]" : ""}`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                            >
                                <span className="text-[13px] font-[Medium] text-[#222]">{opt.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export function SeoSection({
    seo,
    onChange,
}: {
    seo: any;
    onChange: (seo: any) => void;
}) {
    return (
        <div className={sectionClass}>
            <h3 className={sectionTitleClass}>SEO Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                <TextField
                    label="Meta Title"
                    value={seo.metaTitle}
                    onChange={(v) => onChange({ ...seo, metaTitle: v })}
                />
                <TextField
                    label="Meta Keywords"
                    value={seo.metaKeywords}
                    onChange={(v) => onChange({ ...seo, metaKeywords: v })}
                />
                <div className="md:col-span-2">
                    <TextAreaField
                        label="Meta Description"
                        value={seo.metaDescription}
                        onChange={(v) => onChange({ ...seo, metaDescription: v })}
                        rows={3}
                    />
                </div>
            </div>
        </div>
    );
}

export function SaveBar({ onSave }: { onSave: () => void }) {
    return (
        <div className="flex justify-end mt-[10px]">
            <button
                type="button"
                onClick={onSave}
                className="h-[44px] px-[28px] rounded-[10px] bg-[#6A3CA8] text-[#fff] text-[14px] font-[Bold] cursor-pointer"
            >
                Save Changes
            </button>
        </div>
    );
}
