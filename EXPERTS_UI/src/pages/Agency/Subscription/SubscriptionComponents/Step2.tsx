import { useMemo, useState } from "react";
import { LeftArrowIcon, QuestionIcon, RightArrowIcon, TickIcon } from "../../../../components/CustomFile/icons";
import americanExpress from "../../../../assets/img/Amex.svg";
import mastercard from "../../../../assets/img/Mastercard.svg";
import visa from "../../../../assets/img/payment tags.svg";
import debitCardBg from "../../../../assets/img/debitcard.png";
import paypal from "../../../../assets/img/PayPal.svg";
import discover from "../../../../assets/img/Discover.svg";
const savedCards = [
    {
        id: 1,
        type: "visa",
        logo: visa,
        number: "**** **** **** 2345",
        name: "William turner",
        expiry: "05/27",
    },
    {
        id: 2,
        type: "mastercard",
        logo: mastercard,
        number: "**** **** **** 2345",
        name: "William",
        expiry: "05/29",
    },
    {
        id: 3,
        type: "visa",
        logo: mastercard,
        number: "**** **** **** 2347",
        name: "John Doe",
        expiry: "05/29",
    },
    {
        id: 4,
        type: "mastercard",
        logo: mastercard,
        number: "**** **** **** 2349",
        name: "John Doe",
        expiry: "05/31",
    },
];
const inputClass =
    "h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-3 text-[14px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:border-[#222] focus:outline-none";

const labelClass = "mb-2 block text-left text-[14px] font-[SemiBold] text-[#222]";

const CARDS_PER_PAGE = 2;

type Step2Props = {
    onNext: () => void;
    onCancel: () => void;
};
const Step2 = ({ onNext, onCancel }: Step2Props) => {
    const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">();
    const [selectedSavedCard, setSelectedSavedCard] = useState<number>(savedCards[0]?.id ?? 1);
    const [cardPage, setCardPage] = useState(0);

    const [cardNumber, setCardNumber] = useState("");
    const [ccv, setCcv] = useState("");
    const [expireDate, setExpireDate] = useState("");
    const [holderName, setHolderName] = useState("");
    const [useForFuture, setUseForFuture] = useState(false);

    const [showNewCardShow, setShowNewCardShow] = useState(false);

    const totalCardPages = Math.max(1, Math.ceil(savedCards.length / CARDS_PER_PAGE));
    const visibleSavedCards = useMemo(
        () => savedCards.slice(cardPage * CARDS_PER_PAGE, cardPage * CARDS_PER_PAGE + CARDS_PER_PAGE),
        [cardPage],
    );

    const goPrevSavedCards = () => {
        setCardPage((p) => Math.max(0, p - 1));
    };

    const goNextSavedCards = () => {
        setCardPage((p) => Math.min(totalCardPages - 1, p + 1));
    };

    return (
        <div className="w-full max-w-[1220px] mx-auto">
            <h2 className="mb-[14px] text-[20px] leading-[120%] font-[Bold] text-[#222]">Choose your payment method</h2>

            <div className=" grid lg:grid-cols-[1fr_400px] rounded-[15px] bg-[#FFF]">
                <div className="bg-white p-[14px] md:p-[30px] rounded-[15px]">

                    <button
                        type="button"
                        className={`mb-[12px] flex flex-col w-full  justify-between rounded-[10px] border md:p-[30px_20px] p-[16px] text-left ${paymentMethod === "card" ? "border-[rgba(34,34,34,0.10)] bg-white" : "border-none    bg-[#F5F5F5]"}`}
                    >
                        <div onClick={() => setPaymentMethod("card")} className={`cursor-pointer gap-[10px] flex items-center justify-between ${paymentMethod === "card" ? "border-b border-[rgba(34,34,34,0.10)] mr-[-20px] ml-[-20px] pb-[20px] md:pr-[30px] pr-[16px] md:pl-[30px] pl-[16px]" : ""}`}>
                            <div className="flex items-start gap-[10px]">
                                <span
                                    className={`mt-[3px] h-[18px] w-[18px] shrink-0 rounded-full border ${paymentMethod === "card" ? "border-[4px] border-[#EA3934] " : "border-[1px] border-[rgba(34,34,34,0.10)] bg-white"}`}
                                />
                                <div>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Credit / Debit card</p>
                                    <p className="mt-[2px] text-[12px] font-[Regular] text-[#707070]">
                                        Safe money transfer using visa, maestro, discover and american express
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-[6px] flex-wrap sm:flex-nowrap justify-end max-w-[120px] sm:max-w-none">
                                <img src={americanExpress} alt="Amex" className="h-[13px] w-auto" />
                                <img src={discover} alt="Discover" className="h-[14px] w-auto" />
                                <img src={mastercard} alt="Mastercard" className="h-[14px] w-auto" />
                                <img src={visa} alt="Visa" className="h-[14px] w-auto" />
                            </div>
                        </div>
                        {paymentMethod === "card" && (
                            <div className="mb-[12px] rounded-[10px] mt-[20px]">
                                <div className="mb-[10px] flex items-center justify-between">
                                    <p className="text-[20px] font-[Bold] text-[#222]">Your saved cards</p>
                                    <div className="flex items-center gap-[20px]">
                                        <button
                                            type="button"
                                            onClick={goPrevSavedCards}
                                            disabled={cardPage <= 0}
                                            className="grid place-items-center rounded-full cursor-pointer rotate-180 disabled:cursor-not-allowed disabled:opacity-35"
                                            aria-label="Previous saved cards"
                                        >
                                            <LeftArrowIcon width={14} height={14} className="text-[#707070]" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={goNextSavedCards}
                                            disabled={cardPage >= totalCardPages - 1}
                                            className="grid place-items-center rounded-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
                                            aria-label="Next saved cards"
                                        >
                                            <RightArrowIcon width={14} height={14} className="text-[#707070]" />
                                        </button>
                                    </div>
                                </div>

                                {/*Saved cards*/}
                                <div className="grid gap-[10px] md:grid-cols-2">
                                    {visibleSavedCards.map((card) => {
                                        const isActive = selectedSavedCard === card.id;

                                        return (
                                            <button
                                                key={card.id}
                                                type="button"
                                                onClick={() => setSelectedSavedCard(card.id)}
                                                className={`cursor-pointer relative overflow-hidden rounded-[10px] p-[12px] text-left transition-all ${isActive ? "text-[#222] border-transparent rounded-[10px]" : "bg-[#F5F5F5]"}   `}
                                                style={
                                                    isActive
                                                        ? {
                                                            backgroundImage: `url(${debitCardBg})`,
                                                            backgroundSize: "cover",
                                                            backgroundPosition: "center",
                                                            borderRadius: "10px"
                                                        }
                                                        : {}
                                                }
                                            >
                                                {/* Top */}
                                                <div className="mb-[18px] flex items-start justify-between">
                                                    <img src={card.logo} alt={card.type} className="h-[14px] w-auto" />

                                                    <span
                                                        className={`grid h-[17px] w-[17px] place-items-center rounded-full border
              ${isActive
                                                                ? "border-[#222] bg-[#222]"
                                                                : "border-[rgba(34,34,34,0.20)]"
                                                            }
            `}
                                                    >
                                                        {isActive && <TickIcon width={8} height={6} />}
                                                    </span>
                                                </div>

                                                {/* Card Number */}
                                                <p
                                                    className={`text-[10px] font-[SemiBold] ${isActive ? "text-[#707070]" : "text-[#707070]"
                                                        }`}
                                                >
                                                    CARD NUMBER
                                                </p>
                                                <p
                                                    className={`text-[17px] tracking-[1px] font-[Bold] ${isActive ? "text-[#FFF]" : "text-[#222]"
                                                        }`}
                                                >
                                                    {card.number}
                                                </p>

                                                {/* Bottom */}
                                                <div className="mt-[14px] flex items-end justify-between">
                                                    <div>
                                                        <p
                                                            className={`text-[10px] font-[SemiBold] ${isActive ? "text-[#707070]" : "text-[#707070]"
                                                                }`}
                                                        >
                                                            CARD HOLDER NAME
                                                        </p>
                                                        <p
                                                            className={`text-[15px] font-[Bold] ${isActive ? "text-[#FFF]" : "text-[#222]"
                                                                }`}
                                                        >
                                                            {card.name}
                                                        </p>
                                                    </div>

                                                    <div className="text-right">
                                                        <p
                                                            className={`text-[10px] font-[SemiBold] ${isActive ? "text-[#707070]" : "text-[#707070]"
                                                                }`}
                                                        >
                                                            EXPIRE DATE
                                                        </p>
                                                        <p
                                                            className={`text-[15px] font-[Bold] ${isActive ? "text-[#FFF]" : "text-[#222]"
                                                                }`}
                                                        >
                                                            {card.expiry}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/*Pay by new card*/}
                                {showNewCardShow && (
                                    <div>
                                        <div className={`flex flex-col gap-6 mt-[30px] ${showNewCardShow ? "border-t border-[rgba(34,34,34,0.10)] pt-[30px] ml-[-20px] mr-[-20px]" : ""}`}></div>
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
                                                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#222]"
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
                                                    className="mt-0.5 h-[15px] w-[15px] shrink-0 cursor-pointer rounded-full border border-[rgba(34,34,34,0.20)] accent-[#EA3934] focus:ring-0"
                                                />
                                                <span className="text-left text-[14px] font-[Regular] leading-snug text-[#222]">
                                                    Use and save the card details for future use
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/*Pay by new card button*/}
                                {!showNewCardShow && (
                                    <button
                                        type="button"
                                        onClick={() => setShowNewCardShow(true)}
                                        className="mt-[10px] h-[52px] w-full rounded-[10px] border border-dashed border-[rgba(34,34,34,0.16)] text-[13px] font-[SemiBold] text-[#0832AE] cursor-pointer"
                                    >
                                        + Pay by new card
                                    </button>
                                )}
                            </div>
                        )}
                    </button>


                    {/*Paypal payment method*/}
                    <button
                        type="button"
                        className={` w-full  rounded-[10px] border md:p-[30px_20px] p-[16px] text-left ${paymentMethod === "paypal" ? "border-[rgba(34,34,34,0.10)] bg-white" : "border-none bg-[#F5F5F5]"}`}
                    >
                        <div onClick={() => setPaymentMethod("paypal")} className={`cursor-pointer flex items-center justify-between ${paymentMethod === "paypal" ? "" : ""}`}>
                            <div className="flex items-start gap-[10px]">
                                <span
                                    className={`mt-[3px] h-[18px] w-[18px] shrink-0 rounded-full border ${paymentMethod === "paypal" ? "border-[4px] border-[#EA3934]" : "border-[1px] border-[rgba(34,34,34,0.10)] bg-white"}`}
                                />
                                <div>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Paypal</p>
                                    <p className="mt-[2px] text-[12px] font-[Regular] text-[#707070]">
                                        you will be redirected to the PayPal website after submitting your order
                                    </p>
                                </div>
                            </div>
                            <div className="w-[40px] h-[24px]">
                                <img src={paypal} alt="Paypal" className="h-full w-full" />
                            </div>
                        </div>
                    </button>

                    {/*Cancel and Confirm payment*/}
                    <div className="mt-[300px] grid grid-cols-1 gap-[10px] sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="h-[44px] rounded-[10px] border border-[#222] text-[14px] font-[Bold] text-[#222] cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onNext}
                            className="h-[44px] rounded-[10px] bg-[#EA3934] text-[14px] font-[Bold] text-white cursor-pointer"
                        >
                            Confirm payment: 20,000 AED
                        </button>
                    </div>
                </div>

                {/*Summary*/}
                <div className="rounded-[15px] bg-[#F5F5F5] border-[4px] border-[#FFF] md:p-[30px] p-[16px]">
                    <h3 className="text-[20px] leading-[120%] font-[Bold] text-[#222] mb-[30px]">Summary</h3>
                    <div className="border border-[rgba(34,34,34,0.10)] mt-[10px] md:mr-[-30px] mr-[-16px] ml-[-16px] md:ml-[-30px]"></div>
                    <div className="mt-[30px]">
                        <div>
                            <p className="text-[12px] font-[Regular] text-[#707070]">Plan name</p>
                            <p className="text-[15px] font-[Bold] text-[#222]">Professional</p>
                        </div>
                        <div>
                            <p className="text-[12px] font-[Regular] text-[#707070]">Duration</p>
                            <p className="text-[15px] font-[Bold] text-[#222]">30 Days</p>
                        </div>
                    </div>

                    <div className="mt-[16px] rounded-[10px] border border-[rgba(34,34,34,0.10)]">
                        {[
                            { label: "Subtotal", value: "19,900 AED" },
                            { label: "Platform fee", value: "180 AED" },
                            { label: "Tax", value: "20 AED" },
                        ].map((item, index) => (
                            <div
                                key={item.label}
                                className={`flex items-center justify-between px-[12px] py-[10px] ${index < 2 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                            >
                                <span className="text-[13px] font-[Regular] text-[#707070]">{item.label}</span>
                                <span className="text-[13px] font-[Bold] text-[#222]">{item.value}</span>
                            </div>
                        ))}
                        <div className="border-t border-[rgba(34,34,34,0.08)] px-[12px] py-[12px]">
                            <p className="text-[12px] font-[Regular] text-[#707070]">Total payable amount</p>
                            <p className="mt-[4px] text-[25px] leading-none font-[SemiBold] text-[#222]">20,000 AED</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default Step2;