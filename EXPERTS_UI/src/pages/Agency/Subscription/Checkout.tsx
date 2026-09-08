import { useMemo, useState } from "react";
import { LeftArrowIcon, RightArrowIcon, TickIcon } from "../../../components/CustomFile/icons";
import mastercard from "../../../assets/img/Mastercard.svg";
import visa from "../../../assets/img/payment tags.svg";
import americanExpress from "../../../assets/img/Amex.svg";

import { useNavigate } from "react-router-dom";
import Step1 from "./SubscriptionComponents/Step1";
import Step2 from "./SubscriptionComponents/Step2";
import Step3 from "./SubscriptionComponents/Step3";

type CheckoutStep = 1 | 2 | 3;
type PaymentMethod = "card" | "paypal";

const stepMeta = [
    { id: 1, label: "Basic information" },
    { id: 2, label: "Payment" },
    { id: 3, label: "Success" },
] as const;

const Checkout = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<CheckoutStep>(1);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");


    return (
        <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
            <div className="h-[66px] bg-white md:p-[18px_20px] p-[18px_15px]">
                <div className="mx-auto flex h-full w-full max-w-[1220px] items-center justify-between">
                    <div className="flex items-center gap-[10px]">
                        <button
                            type="button"
                            onClick={() => {
                                if (step === 1) {
                                    navigate(-1);
                                    return;
                                }
                                setStep((prev) => (prev === 3 ? 2 : 1));
                            }}
                            className="inline-flex items-center gap-[8px] text-[14px] font-[Bold] text-[#222] cursor-pointer"
                        >
                            <span className="grid h-[20px] w-[20px] place-items-center rounded-full bg-[#222] shrink-0 rotate-180 ">
                                <RightArrowIcon className="h-[8px] w-[8px]" fill="#fff" rotate={180} />
                            </span>
                            Back
                        </button>
                        <h1 className="border-l border-[#D9D9D9] pl-[10px] text-[20px] font-[Bold] text-[#222]">Payment</h1>
                    </div>
                    <div className="hidden items-center gap-[6px] rounded-full  px-[8px] py-[5px] sm:flex">
                        {stepMeta.map((item) => {
                            const isComplete = item.id < step;
                            const isActive = item.id === step;
                            return (
                                <span
                                    key={item.id}
                                    className={`inline-flex items-center gap-[6px] rounded-full px-[10px] h-[40px] text-[12px] font-[Medium] ${isActive ? "bg-[#F5F5F5] text-[#222]" : isComplete ? "bg-[#00A663] text-[#FFF] font-[SemiBold]" : "text-[#222] border border-dashed border-[rgba(34,34,34,0.10)] opacity-50"}`}
                                >
                                    <span
                                        className={`grid h-[16px] w-[16px] place-items-center rounded-full text-[10px] font-[SemiBold] ${isActive ? "bg-[#0832AE] text-white" : isComplete ? "bg-[#FFF] text-[#222]" : "bg-white text-[#707070] border border-[rgba(34,34,34,0.10)]"}`}
                                    >
                                        {isComplete ? <TickIcon className="h-[6px] w-[10px]" fill="#00A663" /> : item.id}
                                    </span>
                                    {item.label}
                                </span>
                            );
                        })}
                    </div>
                    <div className="w-[42px] sm:hidden" />
                </div>
            </div>

            <main className="flex-1 px-4 py-8 md:px-8 md:py-10">
                {step === 1 ? (

                    <Step1 onNext={() => setStep(2)} onCancel={() => navigate(-1)} />
                ) : step === 2 ? (

                    <Step2 onNext={() => setStep(3)} onCancel={() => navigate(-1)} />
                ) : (

                    <Step3 onCancel={() => navigate(-1)} />
                )}
            </main >

            <footer className="bg-white md:p-[18px_20px] p-[18px_15px]">
                <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-[8px] text-[12px] text-[#222] sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[14px] text-[#222] font-[Regular]">Copyright © 2025 molumulk.ae. All rights reserved.</p>
                    <div className="flex items-center gap-[26px] font-[Regular]">
                        <button type="button" className="cursor-pointer text-[14px] text-[#222] font-[Regular]">Terms & Conditions</button>
                        <button type="button" className="cursor-pointer text-[14px] text-[#222] font-[Regular]">Privacy policy</button>
                        <button type="button" className="cursor-pointer text-[14px] text-[#222] font-[Regular]">Cookie policy</button>
                    </div>
                </div>
            </footer>
        </div >
    );
};

export default Checkout;
