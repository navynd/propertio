import { useEffect, useState } from "react";
import { CancelIcon } from "../../../assets/icons";
import type { PropertyTypeRecord } from "../../../types/api";
import { formatJobTitleDate } from "../Jobtitle/jobTitleData";

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

export type PropertyTypeFormPayload = {
  name: string;
  category: string;
  description: string;
  isActive: boolean;
  displayOrder?: number;
};

type PropertyTypeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingRecord: PropertyTypeRecord | null;
  onSave: (payload: PropertyTypeFormPayload, editingId?: string) => void;
};

export default function PropertyTypeModal({
  isOpen,
  onClose,
  editingRecord,
  onSave,
}: PropertyTypeModalProps) {
  const isEdit = Boolean(editingRecord);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      setName(editingRecord.name ?? "");
      setCategory(editingRecord.category ?? "");
      setDescription(editingRecord.description ?? "");
      setIsActive(editingRecord.isActive !== false);
      setDisplayOrder(
        editingRecord.displayOrder != null ? String(editingRecord.displayOrder) : ""
      );
      return;
    }
    setName("");
    setCategory("");
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
        category: category.trim(),
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
            {isEdit ? "Edit Property Type" : "Add Property Type"}
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
                placeholder="e.g. Apartment"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value.slice(0, 100))}
                placeholder="e.g. Residential"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                placeholder="Optional description"
                rows={3}
                className={textareaClass}
              />
            </div>
            {/* <div>
              <label className={labelClass}>Display order</label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="Auto-assigned if empty"
                className={inputClass}
              />
            </div> */}
            <div>
              <label className={labelClass}>Status</label>
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
            {isEdit && editingRecord?.updatedAt && (
              <p className="text-[12px] text-[#707070]">
                Last updated: {formatJobTitleDate(editingRecord.updatedAt)}
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 p-[20px] md:p-[24px_40px_32px] flex gap-[12px]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-[44px] rounded-[12px] border border-[rgba(34,34,34,0.12)] text-[14px] font-[SemiBold] text-[#222] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 h-[44px] rounded-[12px] bg-[#6A3CA8] text-white text-[14px] font-[SemiBold] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? "Save changes" : "Add property type"}
          </button>
        </div>
      </div>
    </div>
  );
}
