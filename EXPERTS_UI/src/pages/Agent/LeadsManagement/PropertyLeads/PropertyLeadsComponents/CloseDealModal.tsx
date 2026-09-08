import { useEffect, useState } from "react";
import { CancelIcon, MultiUserIcon, SingleUserIcon } from "../../../../../components/CustomFile/icons";
import home1img from "../../../../../assets/img/home1.png";

export type CloseDealLeadData = {
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    propertyName: string;
    propertyImage: string;
    listingType?: "Rent" | "Buy";
};

interface CloseDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead?: CloseDealLeadData | null;
    onSubmit?: (payload: { dealAmount: number }) => Promise<void> | void;
    isSubmitting?: boolean;
}

const MOCK_LEAD: CloseDealLeadData = {
    customerName: "Jackson Crossland",
    customerEmail: "jacksoncrossland@gmail.com",
    customerPhone: "+(000) 1234 5678",
    propertyName: "Omniyat Bespoke | Villa",
    propertyImage: home1img,
    listingType: "Rent",
};

function listingBadgeClass(type: "Rent" | "Buy") {
    if (type === "Rent") return "bg-[rgba(234,57,52,0.10)] text-[#EA3934]";
    return "bg-[rgba(0,166,99,0.10)] text-[#00A663]";
}

const CloseDealModal = ({ isOpen, onClose, lead, onSubmit, isSubmitting = false }: CloseDealModalProps) => {
    const [dealAmount, setDealAmount] = useState("");
    useEffect(() => {
        if (!isOpen) setDealAmount("");
    }, [isOpen]);

    const data = lead ?? MOCK_LEAD;
    const listingType = data.listingType ?? "Rent";
    const email = data.customerEmail ?? "—";
    const phone = data.customerPhone ?? "—";
    const parsedAmount = Number(dealAmount);
    const isAmountValid = dealAmount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;

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


                <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_50px]">
                    <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1] md:mb-[35px] mb-[20px]">
                        Close the deal
                    </h2>
                    <div className="flex flex-col gap-[10px]">
                        {/* Customer card */}
                        <div className="rounded-[14px] bg-[#F5F5F5] p-4 md:p-5">
                            <div className="flex items-center gap-4">
                                <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-full">
                                    <SingleUserIcon width={60} height={60} stroke="#707070" className="shrink-0" />
                                </div>
                                <div className="min-w-0 flex-1 space-y-4">
                                    <div>
                                        <p className="text-[12px] font-[Regular] text-[#707070]">Customer name</p>
                                        <p className="text-[15px] font-[Bold] text-[#222]">{data.customerName}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="md:mt-[30px] mt-[20px]">
                                <p className="text-[12px] font-[Regular] text-[#707070]">Email address</p>
                                <p className="break-words text-[15px] font-[Bold] text-[#222]">{email}</p>
                            </div>
                            <div className="mt-[15px] mb-[15px] border-t border-[rgba(34,34,34,0.08)]"></div>
                            <div className="">
                                <p className="text-[12px] font-[Regular] text-[#707070]">Phone number</p>
                                <p className="text-[14px] font-[Bold] text-[#222]">{phone}</p>
                            </div>
                        </div>

                        {/* Property card */}
                        <div className="rounded-[14px] bg-[#F5F5F5] p-4 md:p-5">
                            <div className="flex  gap-4">
                                <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[10px] bg-[#E8E8E8]">
                                    {data.propertyImage ? (
                                        <img
                                            src={data.propertyImage}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-[10px] text-[#999]">
                                            —
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex items-center  ">
                                    <div>
                                        <p className="text-[12px] font-[Bold] leading-snug text-[#222] ">{data.propertyName}</p>
                                        <div className="flex flex-wrap items-center gap-2 mt-[4px]">
                                            <span className="text-[12px] font-[Regular] text-[#707070]">Listing type :</span>
                                            <span
                                                className={`inline-flex items-center rounded-[6px] h-[21px] px-[10px] py-[4px] text-[11px] font-[SemiBold] md:text-[12px] ${listingBadgeClass(listingType)}`}
                                            >
                                                {listingType}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Deal amount */}
                        <div className="mt-[15px]">
                            <label htmlFor="close-deal-amount" className="mb-2 block text-left text-[14px] font-[Bold] text-[#222]">
                                Deal amount
                            </label>
                            <div className="relative">
                                <input
                                    id="close-deal-amount"
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Enter deal amount"
                                    value={dealAmount}
                                    onChange={(e) => setDealAmount(e.target.value)}
                                    className="h-[48px] w-full rounded-[10px] border border-[rgba(34,34,34,0.12)] bg-white py-2 pl-3 pr-14 text-[14px] font-[Regular] text-[#222] placeholder:text-[#999] focus:border-[#222] focus:outline-none"
                                />
                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[14px] font-[SemiBold] text-[#707070]">
                                    AED
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Save button fixed bottom */}
                <div className="shrink-0  p-[20px_20px_20px_20px] md:p-[30px_50px_60px_50px]">
                    <button
                        type="button"
                        disabled={!onSubmit || !isAmountValid || isSubmitting}
                        onClick={async () => {
                            if (!onSubmit || !isAmountValid) return;
                            await onSubmit({ dealAmount: parsedAmount });
                            setDealAmount("");
                        }}
                        className="h-[44px] w-full rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSubmitting ? "Submitting..." : "Submit"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CloseDealModal;
