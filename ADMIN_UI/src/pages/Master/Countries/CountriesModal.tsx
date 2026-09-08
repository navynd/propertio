import { useEffect, useMemo, useState } from "react";
import { CancelIcon } from "../../../assets/icons";
import type { CountryRecord } from "../../../types/api";
import { formatJobTitleDate } from "../Jobtitle/jobTitleData";

const inputClass =
  "h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] focus:outline-none";
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

export type CountryFormPayload = {
  name: string;
  code: string;
  phoneCode: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  displayOrder: string;
  isActive: boolean;
};

type CountriesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  editingRecord: CountryRecord | null;
  onSave: (payload: CountryFormPayload, editingId?: string) => void;
};

export default function CountriesModal({
  isOpen,
  onClose,
  editingRecord,
  onSave,
}: CountriesModalProps) {
  const isEdit = Boolean(editingRecord);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [flag, setFlag] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [displayOrder, setDisplayOrder] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    if (editingRecord) {
      setName(editingRecord.name);
      setCode(editingRecord.code ?? "");
      setPhoneCode(editingRecord.phoneCode ?? "");
      setFlag(editingRecord.flag ?? "");
      setCurrencyCode(editingRecord.currency?.code ?? "");
      setCurrencySymbol(editingRecord.currency?.symbol ?? "");
      setDisplayOrder(
        editingRecord.displayOrder != null ? String(editingRecord.displayOrder) : ""
      );
      setIsActive(editingRecord.isActive !== false);
      return;
    }
    setName("");
    setCode("");
    setPhoneCode("");
    setFlag("");
    setCurrencyCode("");
    setCurrencySymbol("");
    setDisplayOrder("");
    setIsActive(true);
  }, [isOpen, editingRecord]);

  const flagPreviewOk = useMemo(() => /^https?:\/\//i.test(flag.trim()), [flag]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedName || !trimmedCode) return;
    onSave(
      {
        name: trimmedName,
        code: trimmedCode,
        phoneCode: phoneCode.trim(),
        flag: flag.trim(),
        currencyCode: currencyCode.trim().toUpperCase(),
        currencySymbol: currencySymbol.trim(),
        displayOrder: displayOrder.trim(),
        isActive,
      },
      editingRecord?._id
    );
    onClose();
  };

  const canSave = Boolean(name.trim() && code.trim());

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center md:items-center items-end z-[9999]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white w-full md:max-w-[600px] rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden">
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
            {isEdit ? "Edit Country" : "Add Country"}
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
                placeholder="e.g. Afghanistan"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div>
                <label className={labelClass}>
                  Code <span className="text-[#EA3934]">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 3))}
                  placeholder="e.g. AF"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Phone code</label>
                <input
                  type="text"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.slice(0, 12))}
                  placeholder="e.g. +93"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Flag URL</label>
              <input
                type="url"
                value={flag}
                onChange={(e) => setFlag(e.target.value.slice(0, 500))}
                placeholder="https://flagcdn.com/w80/af.png"
                className={inputClass}
              />
              {flag.trim() && (
                <div className="mt-[10px] flex items-center gap-[12px]">
                  {flagPreviewOk ? (
                    <img
                      src={flag.trim()}
                      alt=""
                      className="h-[32px] w-[48px] object-cover rounded-[4px] border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5]"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <p className="text-[12px] text-[#707070]">
                    {flagPreviewOk ? "Preview" : "Enter a valid http(s) URL to preview"}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <div>
                <label className={labelClass}>Currency code</label>
                <input
                  type="text"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="e.g. AFN"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Currency symbol</label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value.slice(0, 10))}
                  placeholder="e.g. ؋"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Display order</label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                placeholder="Auto-assigned if empty"
                className={inputClass}
              />
            </div>

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
            disabled={!canSave}
            className="flex-1 h-[44px] rounded-[12px] bg-[#6A3CA8] text-white text-[14px] font-[SemiBold] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEdit ? "Save changes" : "Add country"}
          </button>
        </div>
      </div>
    </div>
  );
}
