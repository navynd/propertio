import React from "react";
import { CancelIcon } from "../../assets/icons";

interface PasswordSucessModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PasswordSucessModal: React.FC<PasswordSucessModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000] p-[10px]"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-[580px] rounded-[20px] md:rounded-[24px] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-end md:p-[20px] p-[10px]">
                    <button
                        onClick={onClose}
                        className="cursor-pointer w-[42px] h-[42px] rounded-[12px] border border-[#E6E6E6] bg-white flex items-center justify-center"
                    >
                        <CancelIcon />
                    </button>
                </div>

                <div className="p-[20px_20px_46px_20px] md:p-[12px_40px_60px_40px]">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-[126px] h-[126px] rounded-full bg-[#10B98133] flex items-center justify-center mb-[28px]">
                            <div className="w-[94px] h-[94px] rounded-full bg-[#05A666] flex items-center justify-center text-white text-[48px] leading-none">
                                ✓
                            </div>
                        </div>

                        <h3 className="font-[SemiBold] text-[#222] text-[18px] md:text-[20px] leading-[1.15] mb-[14px]">
                            Your password is successfully changed
                        </h3>
                        <p className="font-[Regular] text-[#222] text-[14px] md:text-[14px] leading-[1.2]">
                            Redirecting to the login page...
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasswordSucessModal;
