import { useState } from "react";
import { CancelIcon, QuestionIcon } from "../../../../components/CustomFile/icons";

interface DebitCardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const inputClass =
    "h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-3 text-[14px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:border-[#222] focus:outline-none";

const labelClass = "mb-2 block text-left text-[14px] font-[SemiBold] text-[#222]";

const DebitCardModal = ({ isOpen, onClose }: DebitCardModalProps) => {
    const [cardNumber, setCardNumber] = useState("");
    const [ccv, setCcv] = useState("");
    const [expireDate, setExpireDate] = useState("");
    const [holderName, setHolderName] = useState("");
    const [useForFuture, setUseForFuture] = useState(false);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/40 md:items-center"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className="relative bg-white w-full md:max-w-[480px] h-auto transform transition-all duration-300 rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header fixed */}
                <div className="shrink-0 flex justify-end  p-[20px_20px_0px_20px] ">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center"
                    >
                        <CancelIcon width={14} height={14} />
                    </button>
                </div>

                {/* Content section */}
                <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_50px]">
                    <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1] md:mb-[35px] mb-[20px]">
                        Add Debit/Credit Card
                    </h2>
                    <div className="flex flex-col gap-6">
                        <div>
                            <label htmlFor="debit-card-number" className={labelClass}>
                                Card number
                            </label>
                            <input
                                id="debit-card-number"
                                type="text"
                                inputMode="numeric"
                                autoComplete="cc-number"
                                placeholder="Enter card number"
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                className={inputClass}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
                            <div>
                                <label htmlFor="debit-card-ccv" className={`${labelClass} mb-2 flex items-center gap-1.5`}>
                                    CCV code
                                    <button
                                        type="button"
                                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[rgba(34,34,34,0.15)] bg-[#F5F5F5] text-[#222]"
                                        aria-label="What is CCV?"
                                        title="Security code on the back of your card"
                                    >
                                        <QuestionIcon width={10} height={10} fill="#222222" />
                                    </button>
                                </label>
                                <input
                                    id="debit-card-ccv"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="cc-csc"
                                    placeholder="Enter CCV code"
                                    value={ccv}
                                    onChange={(e) => setCcv(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="debit-card-expiry" className={labelClass}>
                                    Expire date
                                </label>
                                <input
                                    id="debit-card-expiry"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="cc-exp"
                                    placeholder="MM/YY"
                                    value={expireDate}
                                    onChange={(e) => setExpireDate(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="debit-card-holder" className={labelClass}>
                                Card holder name
                            </label>
                            <input
                                id="debit-card-holder"
                                type="text"
                                autoComplete="cc-name"
                                placeholder="Enter card holder name"
                                value={holderName}
                                onChange={(e) => setHolderName(e.target.value)}
                                className={inputClass}
                            />
                        </div>

                        <label className="flex cursor-pointer items-center gap-3 mb-[30px]">
                            <input
                                type="checkbox"
                                checked={useForFuture}
                                onChange={(e) => setUseForFuture(e.target.checked)}
                                className="mt-0.5 h-[15px] w-[15px] shrink-0 cursor-pointer rounded-full border border-[rgba(34,34,34,0.20)] accent-[#D4A373] focus:ring-0"
                            />
                            <span className="text-left text-[14px] font-[Regular] leading-snug text-[#222]">
                                Use this card for future payments
                            </span>
                        </label>
                    </div>
                </div>

                <div className="shrink-0 px-5 pb-6 pt-2 md:px-8 md:pb-8">
                    <button
                        type="button"
                        className="h-[48px] w-full rounded-[10px] bg-[#D4A373] text-center text-[14px] font-[Bold] text-white transition-opacity hover:opacity-95"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DebitCardModal;
