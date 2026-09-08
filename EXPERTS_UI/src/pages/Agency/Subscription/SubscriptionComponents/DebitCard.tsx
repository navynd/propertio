import { EditIcon, PlusIcon, TrashIcon } from "../../../../components/CustomFile/icons";
import visaIcon from "../../../../assets/img/payment tags.svg";
import mastercardIcon from "../../../../assets/img/Mastercard.svg";
import americanExpressIcon from "../../../../assets/img/Amex.svg";
import cardbg from "../../../../assets/img/Maskgroup.png";
import { useState } from "react";
import DebitCardModal from "./DebitCardModal";
type CardRow = {
    id: string;
    maskedNumber: string;
    holder: string;
    expiry: string;
    brand: "visa" | "amex" | "mastercard";
    inUse: boolean;
};

const CARDS_TABLE_GRID =
    "grid grid-cols-[1.2fr_1fr_1fr_1.2fr_1fr_1fr] px-[14px] py-[10px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]";

const otherCards: CardRow[] = [
    {
        id: "1",
        maskedNumber: "**** **** **** 2345",
        holder: "William turner",
        expiry: "05/27",
        brand: "visa",
        inUse: true,
    },
    {
        id: "2",
        maskedNumber: "**** **** **** 8899",
        holder: "William turner",
        expiry: "12/28",
        brand: "amex",
        inUse: false,
    },
    {
        id: "3",
        maskedNumber: "**** **** **** 4421",
        holder: "William turner",
        expiry: "03/26",
        brand: "mastercard",
        inUse: false,
    },
];

function CardBrandLogo({ brand }: { brand: CardRow["brand"] }) {
    const src = brand === "visa" ? visaIcon : brand === "amex" ? americanExpressIcon : mastercardIcon;
    const alt = brand === "visa" ? "Visa" : brand === "amex" ? "American Express" : "Mastercard";
    return (
        <span className="inline-flex h-8 w-[52px] items-center justify-start">
            <img src={src} alt={alt} className="max-h-7 w-auto max-w-[48px] object-contain object-left" />
        </span>
    );
}

function PaymentCardVisual() {
    return (
        <div
            className="relative aspect-[1.58/1] w-full max-w-[400px] overflow-hidden rounded-[16px] bg-cover bg-center text-white shadow-lg"
            style={{ backgroundImage: `url(${cardbg})` }}
        >
            <div className="relative z-[1] flex h-full flex-col justify-between p-6">
                <div className="h-[30px] w-[50px]">
                    <img src={visaIcon} alt="Visa" className="h-full w-full object-contain object-left" />
                </div>
                <div>
                    <p className="mb-1 text-[10px] font-[SemiBold] uppercase tracking-wider text-[rgba(255,255,255,0.65)]">
                        Card number
                    </p>
                    <p className="text-[17px] font-[Bold] tracking-widest text-white">**** **** **** 2345</p>
                </div>
                <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                        <p className="mb-1 text-[10px] font-[SemiBold] uppercase tracking-wider text-[rgba(255,255,255,0.65)]">
                            Card holder name
                        </p>
                        <p className="truncate text-[15px] font-[Bold] text-white">William turner</p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="mb-1 text-[10px] font-[SemiBold] uppercase tracking-wider text-[rgba(255,255,255,0.65)]">
                            Expire date
                        </p>
                        <p className="text-[15px] font-[Bold] text-white">05/27</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OtherCardsTable() {
    return (
        <div className="min-w-0 rounded-[15px]  bg-white p-[20px] md:p-[30px]">
            <h3 className="mb-5 text-[16px] font-[Bold] text-[#222] md:text-[18px]">Other cards</h3>
            <div className="w-full overflow-x-auto scrollbar-hide">
                <div className="min-w-[1020px]">
                    <div className="overflow-hidden rounded-[10px] border border-[rgba(34,34,34,0.08)] bg-white">
                        <div className={`${CARDS_TABLE_GRID} border-b border-[rgba(34,34,34,0.08)] bg-[#F5F5F5]`}>
                            <p className="text-[14px] font-[SemiBold] text-[#222]">Card number</p>
                            <p className="text-[14px] font-[SemiBold] text-[#222]">Card holder name</p>
                            <p className="text-[14px] font-[SemiBold] text-[#222]">Expire date</p>
                            <p className="text-[14px] font-[SemiBold] text-[#222]">Card type</p>
                            <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                            <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                        </div>

                        {otherCards.map((row, index) => (
                            <div
                                key={row.id}
                                className={`bg-[#FFF]  ${CARDS_TABLE_GRID} ${index !== otherCards.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                            >
                                <p className="min-w-0 truncate text-[12px] font-[Regular] tracking-wide text-[#222]">
                                    {row.maskedNumber}
                                </p>
                                <p className="min-w-0 truncate text-[12px] font-[Regular] text-[#222]">{row.holder}</p>
                                <p className="text-[12px] font-[Regular] text-[#222]">{row.expiry}</p>
                                <div className="flex items-center">
                                    <CardBrandLogo brand={row.brand} />
                                </div>
                                <div className="flex items-center">
                                    {row.inUse ? (
                                        <span className="inline-flex items-center rounded-[6px] bg-[#00A663] px-[10px] py-[6px] text-[12px] font-[SemiBold] leading-none text-white">
                                            In use
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            className="inline-flex items-center rounded-[6px] border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5] px-[10px] py-[6px] text-[12px] font-[SemiBold] leading-none text-[#222] transition-colors hover:bg-[#EAEAEA]"
                                        >
                                            Use this card
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-[6px]">
                                    <button
                                        type="button"
                                        className="cursor-pointer rounded-[8px] p-[6px] hover:bg-[#F1F5F9]"
                                        aria-label="Edit card"
                                    >
                                        <EditIcon width={20} height={20} stroke="#222" />
                                    </button>
                                    <button
                                        type="button"
                                        className="cursor-pointer rounded-[8px] p-[6px] hover:bg-[#F1F5F9]"
                                        aria-label="Delete card"
                                    >
                                        <TrashIcon width={20} height={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const DebitCard = () => {
    const [isDebitCardModalOpen, setIsDebitCardModalOpen] = useState(false);
    return (
        <>
            <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-[15px] border border-[rgba(34,34,34,0.08)] bg-white p-4 md:p-5">
                    <h2 className="text-[18px] font-[Bold] text-[#222] md:text-[20px]">Manage debit/credit cards</h2>
                    <button
                        onClick={() => setIsDebitCardModalOpen(true)}
                        type="button"
                        className="flex h-[40px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[50px] bg-[#D4A373] px-5 text-[13px] font-[Bold] text-white transition-opacity hover:opacity-95"
                    >
                        <PlusIcon width={16} height={16} />
                        Add debit/credit card
                    </button>
                </div>

                <div className="rounded-[15px] border border-[rgba(34,34,34,0.08)] bg-white p-4 md:p-8">
                    <h3 className="mb-6 text-[16px] font-[Bold] text-[#222]">Card using for payments</h3>
                    <PaymentCardVisual />
                </div>

                <OtherCardsTable />
            </div>
            <DebitCardModal isOpen={isDebitCardModalOpen} onClose={() => setIsDebitCardModalOpen(false)} />
        </>
    );
};

export default DebitCard;
