import { KingIcon, TickIcon } from "../../../../components/CustomFile/icons";
import successImg from "../../../../assets/img/sucess.png"
type Step3Props = {
    onCancel: () => void;
};
const Step3 = ({ onCancel }: Step3Props) => {
    const invoiceId = "IN486953";
    return (
        <div className="mx-auto flex w-full max-w-[760px] flex-col items-center px-2 py-6 text-center">
            {/* <div className="relative mb-[10px] mt-[10px] h-[84px] w-[220px]">
                <span className="absolute left-[20px] top-[22px] h-[4px] w-[4px] rounded-full bg-[#D4A373]" />
                <span className="absolute left-[42px] top-[12px] h-[3px] w-[3px] rounded-full bg-[#FF4EC5]" />
                <span className="absolute left-[58px] top-[28px] h-[6px] w-[3px] rotate-[20deg] rounded-[2px] bg-[#0832AE]" />
                <span className="absolute left-[78px] top-[14px] h-[2px] w-[12px] rounded-full bg-[#8A58FF]" />
                <span className="absolute right-[20px] top-[24px] h-[4px] w-[4px] rounded-full bg-[#D4A373]" />
                <span className="absolute right-[45px] top-[12px] h-[3px] w-[3px] rounded-full bg-[#FF4EC5]" />
                <span className="absolute right-[63px] top-[28px] h-[6px] w-[3px] -rotate-[20deg] rounded-[2px] bg-[#00A663]" />
                <span className="absolute right-[82px] top-[14px] h-[2px] w-[12px] rounded-full bg-[#D0A63A]" />

                <div className="absolute left-1/2 top-[20px] grid h-[42px] w-[42px] -translate-x-1/2 place-items-center rounded-full bg-[#CFF6E5]">
                    <div className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#00A663]">
                        <TickIcon width={11} height={8} />
                    </div>
                </div>
            </div> */}
            <div className="w-[320px] h-[84px] mb-[30px]">
                <img src={successImg} alt="success" className="w-full h-full object-cover" />
            </div>

            <p className="text-[20px] font-[SemiBold] text-[#707070]">Amazing!</p>
            <h2 className="mt-[2px] text-[30px] font-[Bold] text-[#222]">Congratulations. Payment successful</h2>
            <p className="mt-[4px] text-[17px] font-[Regular] text-[#707070]">
                Your invoice ID : <span className="font-[Bold] text-[#222]">{invoiceId}</span>
            </p>

            <div className="my-[30px] h-px w-full bg-[rgba(34,34,34,0.08)]" />

            <p className="text-[17px] font-[Medium] text-[#222]">Your purchased plan</p>
            <div className="mt-[30px] flex w-full items-center justify-between rounded-[15px] bg-white md:p-[30px] p-[16px]">
                <div className="flex items-center gap-[12px]">
                    <span className="grid h-[55px] w-[55px] place-items-center rounded-full bg-[#F5F5F5] text-[15px]"><KingIcon width={30} height={30} /></span>
                    <p className="text-[15px] font-[Medium] text-[#222]">Premium plan</p>
                </div>
                <div className="text-right">
                    <p className="text-[30px] font-[Bold] leading-none text-[#222]">
                        AED 390<span className="text-[14px] font-[Regular] text-[#707070]"> /month</span>
                    </p>
                    <p className="mt-[6px] text-[12px] font-[Medium] text-[#222]">Plan duration 30 days</p>
                </div>
            </div>
        </div >
    )
}

export default Step3;