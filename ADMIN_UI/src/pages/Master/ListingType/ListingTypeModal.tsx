import { useEffect, useRef, useState } from "react";
import { CancelIcon, DownArrowIcon } from "../../../assets/icons";
import type { ListingTypeRecord } from "../../../types/api";
import { formatJobTitleDate } from "../Jobtitle/jobTitleData";

const inputClass =
  "h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] focus:outline-none";
const textareaClass =
  "w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] py-[12px] text-[14px] resize-none focus:outline-none";
const labelClass = "text-[14px] font-[Bold] text-[#222] block mb-[6px]";

const categoryOptions = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

const transactionOptions = [
  { value: "buy", label: "Buy" },
  { value: "rent", label: "Rent" },
];

function ModalDropdown({
  label,
  required,
  value,
  options,
  onChange,
}: {
  label: string;
  required?: boolean;
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
      <label className={labelClass}>
        {label}
        {required ? <span className="text-[#EA3934]"> *</span> : null}
      </label>
      <div className="relative w-full" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between gap-[6px] border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer"
        >
          <span className="text-[13px] font-[Medium] text-[#222] truncate capitalize">
            {display}
          </span>
          <DownArrowIcon
            className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            width={14}
            height={14}
          />
        </button>
        {open && (
          <div className="absolute top-[50px] left-0 w-full bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-20 py-[8px] max-h-[220px] overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-[14px] py-[10px] text-left text-[13px] font-[Medium] capitalize hover:bg-[#F5F5F5] ${
                  value === opt.value ? "bg-[#F5F5F5] text-[#6A3CA8]" : "text-[#222]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

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

export type ListingTypeFormPayload = {
  name: string;
  slug?: string;
  transaction: string;
  category: string;
  description: string;
  isActive: boolean;
  displayOrder?: number;
};

type ListingTypeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingRecord: ListingTypeRecord | null;
  onSave: (payload: ListingTypeFormPayload, editingId?: string) => void;
};

export default function ListingTypeModal({
  isOpen,
  onClose,
  editingRecord,
  onSave,
}: ListingTypeModalProps) {
  const isEdit = Boolean(editingRecord);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [transaction, setTransaction] = useState("buy");
  const [category, setCategory] = useState("residential");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      setName(editingRecord.name ?? "");
      setSlug(editingRecord.slug ?? "");
      setTransaction(editingRecord.transaction ?? "buy");
      setCategory(editingRecord.category ?? "residential");
      setDescription(editingRecord.description ?? "");
      setIsActive(editingRecord.isActive !== false);
      setDisplayOrder(
        editingRecord.displayOrder != null ? String(editingRecord.displayOrder) : ""
      );
      return;
    }
    setName("");
    setSlug("");
    setTransaction("buy");
    setCategory("residential");
    setDescription("");
    setIsActive(true);
    setDisplayOrder("");
  }, [isOpen, editingRecord]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const order =
      displayOrder.trim() === "" ? undefined : Number.parseInt(displayOrder, 10);
    onSave(
      {
        name: trimmedName,
        slug: slug.trim() || undefined,
        transaction,
        category,
        description: description.trim(),
        isActive,
        displayOrder: Number.isFinite(order) ? order : undefined,
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
      <div className="relative bg-white w-full md:max-w-[560px] rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden">
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
            {isEdit ? "Edit Listing Type" : "Add Listing Type"}
          </h2>

          <div className="flex flex-col gap-[20px] mt-[28px]">
            <div>
              <label className={labelClass}>
                Name <span className="text-[#EA3934]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Residential Buy"
                className={inputClass}
              />
            </div>
            {/* <div>
              <label className={labelClass}>Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Auto-generated if empty"
                className={inputClass}
              />
            </div> */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
              <ModalDropdown
                label="Transaction"
                required
                value={transaction}
                options={transactionOptions}
                onChange={setTransaction}
              />
              <ModalDropdown
                label="Category"
                value={category}
                options={categoryOptions}
                onChange={setCategory}
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
            </div>
            {/* <div>
              <label className={labelClass}>Display order</label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
            </div> */}
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
            disabled={!name.trim()}
            className="h-[44px] px-[24px] rounded-[10px] bg-[#6A3CA8] text-white text-[14px] font-[Bold] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
