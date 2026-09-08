import { useEffect, useState } from "react";
import { CancelIcon } from "../../../assets/icons";
import { formatJobTitleDate } from "../Jobtitle/jobTitleData";

const inputClass =
  "h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] focus:outline-none";
const labelClass = "text-[14px] font-[Bold] text-[#222] block mb-[6px]";

export type ListingSearchCityFormPayload = {
  displayName: string;
  cityKey?: string;
};

type LocationRecord = {
  _id: string;
  cityKey: string;
  displayName: string;
  propertyCount?: number;
  projectCount?: number;
  updatedAt?: string;
};

type ListingSearchCityModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingRecord: LocationRecord | null;
  kind: "property" | "project";
  titleAdd: string;
  titleEdit: string;
  onSave: (payload: ListingSearchCityFormPayload, editingId?: string) => void;
};

export default function ListingSearchCityModal({
  isOpen,
  onClose,
  editingRecord,
  kind,
  titleAdd,
  titleEdit,
  onSave,
}: ListingSearchCityModalProps) {
  const isEdit = Boolean(editingRecord);
  const [displayName, setDisplayName] = useState("");
  const [cityKey, setCityKey] = useState("");

  const listingCount =
    kind === "property"
      ? (editingRecord?.propertyCount ?? 0)
      : (editingRecord?.projectCount ?? 0);

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      setDisplayName(editingRecord.displayName);
      setCityKey(editingRecord.cityKey ?? "");
      return;
    }
    setDisplayName("");
    setCityKey("");
  }, [isOpen, editingRecord]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = displayName.trim();
    if (!trimmed) return;
    onSave(
      {
        displayName: trimmed,
        cityKey: isEdit ? undefined : cityKey.trim() || undefined,
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
            {isEdit ? titleEdit : titleAdd}
          </h2>

          <p className="text-center text-[12px] text-[#707070] mt-[10px] max-w-[420px] mx-auto">
            {kind === "property"
              ? "Used in property search filters. The property listing count updates automatically when properties publish or change city."
              : "Used in project search filters. The project listing count updates automatically when projects publish or change city."}
          </p>

          <div className="flex flex-col gap-[20px] mt-[24px]">
            <div>
              <label className={labelClass}>
                Display name <span className="text-[#EA3934]">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.slice(0, 120))}
                placeholder="e.g. Dubai"
                className={inputClass}
              />
            </div>
            {!isEdit && (
              <div>
                <label className={labelClass}>City key (optional)</label>
                <input
                  type="text"
                  value={cityKey}
                  onChange={(e) => setCityKey(e.target.value.slice(0, 80))}
                  placeholder="Auto-derived from display name if empty"
                  className={inputClass}
                />
              </div>
            )}
            {isEdit && editingRecord && (
              <>
                <div>
                  <label className={labelClass}>City key</label>
                  <p className="text-[13px] text-[#707070] font-[Medium]">{editingRecord.cityKey}</p>
                </div>
                <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] p-[12px]">
                  <p className="text-[11px] text-[#707070]">
                    {kind === "property" ? "Property listings" : "Project listings"}
                  </p>
                  <p className="text-[18px] font-[Bold] text-[#222]">{listingCount}</p>
                </div>
                {editingRecord.updatedAt && (
                  <p className="text-[12px] text-[#707070]">
                    Last updated: {formatJobTitleDate(editingRecord.updatedAt)}
                  </p>
                )}
              </>
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
            disabled={!displayName.trim()}
            className="flex-1 h-[44px] rounded-[12px] bg-[#6A3CA8] text-white text-[14px] font-[SemiBold] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? "Save changes" : "Add location"}
          </button>
        </div>
      </div>
    </div>
  );
}
