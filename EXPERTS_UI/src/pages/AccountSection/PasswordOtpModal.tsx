import React, { useRef, useState, useEffect } from "react";
import { CancelIcon } from "../../components/CustomFile/icons";
import logo from "../../assets/img/logo.png";
import Loader from "../../components/Loader/loader";

interface PasswordOtpModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    isVerifying?: boolean;
    error?: string;
    onVerifyOtp: (otp: string) => void;
    onResendOtp: () => void;
    isResending?: boolean;
}

const maskEmail = (email: string) => {
    const [user, domain] = email.split("@");
    if (!user || !domain) return email;
    const maskedUser =
        user.length <= 2
            ? `${user[0] ?? ""}*`
            : `${user.slice(0, 2)}${"*".repeat(Math.min(6, user.length - 2))}`;
    return `${maskedUser}@${domain}`;
};

const PasswordOtpModal: React.FC<PasswordOtpModalProps> = ({
    isOpen,
    onClose,
    onVerifyOtp,
    email,
    isVerifying = false,
    error,
    onResendOtp,
    isResending = false,
}) => {
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);

    const inputsRef = useRef<HTMLInputElement[]>([]);
    useEffect(() => {
        if (isOpen) {
            setOtp(["", "", "", "", "", ""]);
        }
    }, [isOpen]);
    if (!isOpen) return null;
    const isOtpComplete = otp.every((num) => num !== "");
    const handleChange = (value: string, index: number) => {
        if (!/^[0-9]?$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // move next
        if (value && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        // move back on delete
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };
    return (
        <div className="fixed inset-0 bg-black/40 flex justify-center md:items-center items-end z-[9999]">
            <div className="relative bg-white w-full md:max-w-[560px]  h-auto max-h-[90vh] rounded-t-2xl md:rounded-[24px] flex flex-col  transform transition-all duration-300">
                {isVerifying && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-t-2xl md:rounded-[24px] bg-white/75">
                        <Loader size={88} margin={0} />
                    </div>
                )}
                <div className="flex justify-end md:p-[20px] p-[10px]">
                    <button
                        onClick={onClose}
                        className="cursor-pointer w-[42px] h-[42px] rounded-[12px] border border-[#E6E6E6] bg-white flex items-center justify-center"
                    >
                        <CancelIcon />
                    </button>
                </div>

                <div className="md:p-[0px_50px_60px_50px] p-[0px_20px_30px_20px]">
                    <div className="flex flex-col items-center text-center">
                        <img src={logo} alt="Estatehub Providers" className="w-[138px] mb-[31px]" />

                        <h3 className="font-[Bold] text-[#222] text-[20px] leading-[1.1] mb-[8px]">
                            Enter the OTP we send to your email
                        </h3>
                        <p className="font-[Medium] text-[#707070] text-[16px] mb-[40px]">
                            {maskEmail(email)}
                        </p>

                        <div className="flex items-center justify-center gap-[14px] mb-[40px]">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => {
                                        if (el) {
                                            inputsRef.current[index] = el;
                                        }
                                    }}
                                    value={digit}
                                    maxLength={1}
                                    placeholder="0"
                                    onChange={(e) =>
                                        handleChange(e.target.value, index)
                                    }
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className={`
                                        w-[56px] h-[56px] rounded-[14px] text-center text-[20px] outline-none
                                        border
                                        ${digit ? "border-[#222]" : "border-[rgba(34,34,34,0.10)]"}
                                    `}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (!isOtpComplete) return;
                                onVerifyOtp(otp.join(""));
                            }}
                            disabled={!isOtpComplete || isVerifying}
                            className={`
                                w-full text-[22px] font-[Bold] p-[16px] rounded-[10px] mb-[40px] transition-colors
                                ${isOtpComplete && !isVerifying
                                    ? "bg-[#EA3934] text-white cursor-pointer"
                                    : "bg-[#EA3934] text-white opacity-[0.4] cursor-not-allowed"
                                }
                            `}
                        >
                            {isVerifying ? "Verifying..." : "Verify OTP"}
                        </button>
                        {error ? (
                            <p className="text-[12px] font-[Medium] text-[#EA3934] mb-[14px]">
                                {error}
                            </p>
                        ) : null}

                        <div className="flex items-center justify-center gap-[8px] text-[28px]">
                            <span className="font-[Regular] text-[#222] text-[14px]">Didn&apos;t receive the email?</span>
                            <button
                                type="button"
                                onClick={onResendOtp}
                                disabled={isResending}
                                className="cursor-pointer font-[Bold] text-[#0832AE] text-[14px] disabled:opacity-50"
                            >
                                {isResending ? "Resending..." : "Resend it"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasswordOtpModal;
