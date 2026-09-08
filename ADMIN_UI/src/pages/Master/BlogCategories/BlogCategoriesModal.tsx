import { useEffect, useState } from "react";
import { CancelIcon, PlusUserIcon, TrashIcon } from "../../../assets/icons";
import type { BlogCategoryRecord, BlogSubcategoryRecord } from "../../../types/api";

const inputClass =
  "h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] focus:outline-none";
const labelClass = "text-[14px] font-[Bold] text-[#222] block mb-[6px]";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

export type BlogCategoryFormPayload = {
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  subcategories: BlogSubcategoryRecord[];
};

type BlogCategoriesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingRecord: BlogCategoryRecord | null;
  onSave: (payload: BlogCategoryFormPayload, editingId?: string) => void;
};

export default function BlogCategoriesModal({
  isOpen,
  onClose,
  editingRecord,
  onSave,
}: BlogCategoriesModalProps) {
  const isEdit = Boolean(editingRecord);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [subcategories, setSubcategories] = useState<BlogSubcategoryRecord[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      setName(editingRecord.name);
      setSlug(editingRecord.slug);
      setSlugTouched(true);
      setDisplayOrder(editingRecord.displayOrder ?? 0);
      setIsActive(editingRecord.isActive !== false);
      setSubcategories(
        (editingRecord.subcategories ?? []).map((sub) => ({
          _id: sub._id,
          name: sub.name,
          slug: sub.slug,
          displayOrder: sub.displayOrder ?? 0,
        }))
      );
      return;
    }
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDisplayOrder(0);
    setIsActive(true);
    setSubcategories([]);
  }, [isOpen, editingRecord]);

  if (!isOpen) return null;

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const addSubcategory = () => {
    setSubcategories((prev) => [
      ...prev,
      { name: "", slug: "", displayOrder: prev.length },
    ]);
  };

  const updateSubcategory = (
    index: number,
    field: keyof BlogSubcategoryRecord,
    value: string | number
  ) => {
    setSubcategories((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      if (field === "name") {
        row.name = String(value);
        if (!row.slug || row.slug === slugify(next[index].name)) {
          row.slug = slugify(String(value));
        }
      } else if (field === "slug") {
        row.slug = slugify(String(value));
      } else if (field === "displayOrder") {
        row.displayOrder = Number(value) || 0;
      }
      next[index] = row;
      return next;
    });
  };

  const removeSubcategory = (index: number) => {
    setSubcategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const finalSlug = (slug.trim() || slugify(trimmedName)).toLowerCase();
    const cleanedSubs = subcategories
      .map((sub, index) => ({
        _id: sub._id,
        name: sub.name.trim(),
        slug: (sub.slug.trim() || slugify(sub.name)).toLowerCase(),
        displayOrder: sub.displayOrder ?? index,
      }))
      .filter((sub) => sub.name);

    onSave(
      {
        name: trimmedName,
        slug: finalSlug,
        displayOrder: displayOrder >= 0 ? displayOrder : 0,
        isActive,
        subcategories: cleanedSubs,
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
      <div className="relative bg-white w-full md:max-w-[640px] rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-[20px] py-[16px] border-b border-[rgba(34,34,34,0.08)]">
          <h2 className="text-[18px] font-[Bold] text-[#222]">
            {isEdit ? "Edit Blog Category" : "Add Blog Category"}
          </h2>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <CancelIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-[20px] py-[16px] space-y-[16px]">
          <div>
            <label className={labelClass}>Category name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Market Insights"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="market-insights"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
            <div>
              <label className={labelClass}>Display order</label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value, 10) || 0)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <Toggle checked={isActive} onChange={setIsActive} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-[10px]">
              <label className={`${labelClass} mb-0`}>Subcategories</label>
              <button
                type="button"
                onClick={addSubcategory}
                className="text-[12px] font-[SemiBold] text-[#6A3CA8] inline-flex items-center gap-[6px] cursor-pointer"
              >
                <PlusUserIcon width={14} height={14} />
                Add subcategory
              </button>
            </div>

            {subcategories.length === 0 ? (
              <p className="text-[13px] text-[#707070] border border-dashed border-[rgba(34,34,34,0.12)] rounded-[10px] px-[14px] py-[20px] text-center">
                No subcategories yet. Add one to organize posts under this category.
              </p>
            ) : (
              <div className="space-y-[10px]">
                {subcategories.map((sub, index) => (
                  <div
                    key={sub._id || `new-${index}`}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_36px] gap-[8px] items-center border border-[rgba(34,34,34,0.08)] rounded-[10px] p-[10px]"
                  >
                    <input
                      type="text"
                      value={sub.name}
                      onChange={(e) => updateSubcategory(index, "name", e.target.value)}
                      placeholder="Subcategory name"
                      className="h-[40px] rounded-[8px] border border-[rgba(34,34,34,0.10)] px-[10px] text-[13px] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={sub.slug}
                      onChange={(e) => updateSubcategory(index, "slug", e.target.value)}
                      placeholder="slug"
                      className="h-[40px] rounded-[8px] border border-[rgba(34,34,34,0.10)] px-[10px] text-[13px] focus:outline-none"
                    />
                    <input
                      type="number"
                      min={0}
                      value={sub.displayOrder ?? index}
                      onChange={(e) =>
                        updateSubcategory(index, "displayOrder", parseInt(e.target.value, 10) || 0)
                      }
                      placeholder="Order"
                      className="h-[40px] rounded-[8px] border border-[rgba(34,34,34,0.10)] px-[10px] text-[13px] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeSubcategory(index)}
                      className="h-[40px] w-[36px] flex items-center justify-center rounded-[8px] border border-[rgba(234,57,52,0.2)] text-[#EA3934] cursor-pointer"
                      aria-label="Remove subcategory"
                    >
                      <TrashIcon width={16} height={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-[20px] py-[16px] border-t border-[rgba(34,34,34,0.08)] flex justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="h-[44px] px-[20px] rounded-[12px] border border-[rgba(34,34,34,0.12)] text-[14px] font-[SemiBold] text-[#222] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="h-[44px] px-[24px] rounded-[12px] bg-[#6A3CA8] text-white text-[14px] font-[SemiBold] cursor-pointer disabled:opacity-50"
          >
            {isEdit ? "Save changes" : "Create category"}
          </button>
        </div>
      </div>
    </div>
  );
}
