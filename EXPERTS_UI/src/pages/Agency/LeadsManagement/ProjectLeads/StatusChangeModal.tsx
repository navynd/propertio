import { useEffect, useRef, useState } from "react";
import { CancelIcon, DownArrowIcon } from "../../../../components/CustomFile/icons";

/** Agency-only modal: unit picker + confirm before parent calls agency APIs. */
interface StatusChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  nextStatus?: string;
  onSave?: (selectedUnit: string) => boolean | void | Promise<boolean | void>;
  unitOptions?: string[];
}

const StatusChangeModal = ({
  isOpen,
  onClose,
  nextStatus,
  onSave,
  unitOptions,
}: StatusChangeModalProps) => {
  const [unit, setUnit] = useState("");
  const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
  const unitDropdownRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const resolvedUnitOptions =
    unitOptions && unitOptions.length > 0 ? unitOptions : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        unitDropdownRef.current &&
        !unitDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUnitDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowConfirm(false);
      setUnit("");
      setIsUnitDropdownOpen(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const statusTitle = nextStatus ?? "Reserved";
  const statusSentence =
    statusTitle === "In-Progress" ? "In-progress" : statusTitle;
  const keepDays = statusTitle === "In-Progress" ? 10 : 7;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center md:items-center items-end z-[9999]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {!showConfirm ? (
        <div className="relative bg-white w-full md:max-w-[480px] md:h-auto h-[70vh] transform transition-all duration-300 rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-visible">
          <div className="shrink-0 flex justify-end  p-[20px_20px_0px_20px] ">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center"
            >
              <CancelIcon width={14} height={14} />
            </button>
          </div>

          <div className="flex-1 p-[0px_20px] md:p-[0px_50px] overflow-visible">
            <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1]">
              Changing status to {statusSentence}
            </h2>
            <p className="text-[14px] font-[Regular] text-[#222] leading-[1.2] text-center mt-[10px]">
              This {statusSentence} status will be kept for {keepDays} days
            </p>
            <div className="flex flex-col gap-[24px] mt-[35px]">
              <div ref={unitDropdownRef} className="relative">
                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                  Unit
                </label>
                <button
                  type="button"
                  onClick={() => setIsUnitDropdownOpen((prev) => !prev)}
                  className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
                >
                  <span
                    className={`text-[14px] font-[Regular] ${unit ? "text-[#222]" : "text-[#707070]"}`}
                  >
                    {unit || "Select unit"}
                  </span>
                  <DownArrowIcon
                    width={11}
                    height={7}
                    className={`transition-transform ${isUnitDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isUnitDropdownOpen && (
                  <div className="absolute top-[80px] left-0 w-full z-20 max-h-[160px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                    {resolvedUnitOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          setUnit(option);
                          setIsUnitDropdownOpen(false);
                        }}
                        className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${unit === option ? "text-[#D4A373] bg-[#FDF2F2]" : "text-[#222]"}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-[10px] shrink-0  p-[20px_20px_20px_20px] md:p-[30px_50px_60px_50px]">
            <button
              type="button"
              onClick={onClose}
              className="h-[44px] flex-1 w-full rounded-[10px] border border-[#222] bg-white text-[#222] text-[14px] font-[Bold]"
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-[44px] flex-1 w-full rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold]"
              onClick={() => setShowConfirm(true)}
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div
          className="relative bg-white w-full md:max-w-[480px] h-auto transform transition-all duration-300 rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-visible"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 flex justify-end  p-[20px_20px_0px_20px] ">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center"
            >
              <CancelIcon width={14} height={14} />
            </button>
          </div>
          <div className="flex-1 p-[0px_20px_20px_20px] md:p-[0px_50px_50px_50px] overflow-visible">
            <h2 className="text-center text-[20px] md:text-[20px] font-[Bold] text-[#222] leading-[1.1] mt-[10px]">
              Changing status to {statusSentence}
            </h2>
            <p className="text-center text-[14px] font-[Regular] text-[#222] mt-[10px]">
              This {statusSentence} status will be kept for {keepDays} days
            </p>

            <div className="mt-[26px] grid grid-cols-2 gap-[18px]">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="h-[44px] rounded-[14px] border border-[#222] bg-white text-[#222] text-[16px] font-[Bold]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const result = await onSave?.(unit);
                  if (result === false) return;
                  setShowConfirm(false);
                  onClose();
                }}
                className="h-[44px] rounded-[14px] bg-[#D4A373] text-white text-[16px] font-[Bold]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusChangeModal;
