import { useState, useRef, useEffect } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { ModalCloseIcon, OtpVertifyTickIcon, PfOrangeLogoIcon } from "../parts/icon";
import { useNavigate } from "react-router-dom";
import { userSendOtp, userVerifyOtp } from "../../services/apiService";

interface OTPVerificationModalProps {
  open: boolean;
  onClose: () => void;
  email: string;
  onVerified?: () => void;
}

function OTPVerificationModal({
  open,
  onClose,
  email,
  onVerified,
}: OTPVerificationModalProps) {
  const navigate = useNavigate();
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const maskEmail = (email: string) => {
    if (!email) return "";
    const [localPart, domain] = email.split("@");
    if (!localPart || !domain) return email;
    const visibleChars = Math.max(1, Math.floor(localPart.length * 0.3));
    const masked = localPart.slice(0, visibleChars) + "X".repeat(6);
    return `${masked}@${domain}`;
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage("");
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (isVerified) {
      setIsVerified(false);
    }

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (/^\d+$/.test(pastedData)) {
      const newOtp = [...otp];
      pastedData.split("").forEach((digit, idx) => {
        if (idx < 6) {
          newOtp[idx] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join("");

    if (otpValue.length === 0) {
      setErrorMessage("Please enter the OTP");
      inputRefs.current[0]?.focus();
      return;
    }

    if (otpValue.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit OTP");
      const firstEmptyIndex = otp.findIndex((digit) => !digit);
      inputRefs.current[firstEmptyIndex >= 0 ? firstEmptyIndex : 5]?.focus();
      return;
    }

    setIsVerified(false);
    setIsVerifying(true);
    setErrorMessage("");

    try {
      const response = await userVerifyOtp({
        email,
        otp: otpValue,
      });

      const ok = response.success ?? response.status ?? true;
      if (!ok) {
        setErrorMessage(response.message || "Please check the code");
        setIsVerified(false);
        setIsVerifying(false);
        return;
      }

      setIsVerified(true);
      setIsVerifying(false);
      setTimeout(() => {
        onClose();
        if (onVerified) {
          onVerified();
          return;
        }

        navigate(`/changepassword?email=${encodeURIComponent(email)}`);
      }, 700);
    } catch (err: unknown) {
      const maybeError = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const apiMessage =
        maybeError.response?.data?.message ||
        maybeError.response?.data?.error ||
        maybeError.message;
      setErrorMessage(apiMessage || "Please check the code");
      setIsVerified(false);
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setOtp(Array(6).fill(""));
    setErrorMessage("");
    setIsVerified(false);

    try {
      setIsVerifying(true);
      await userSendOtp({ email });
    } catch (err: unknown) {
      const maybeError = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const apiMessage =
        maybeError.response?.data?.message ||
        maybeError.response?.data?.error ||
        maybeError.message;
      setErrorMessage(apiMessage || "Failed to resend OTP");
    } finally {
      setIsVerifying(false);
      inputRefs.current[0]?.focus();
    }
  };

  useEffect(() => {
    if (open) {
      setOtp(Array(6).fill(""));
      setErrorMessage("");
      setIsVerifying(false);
      setIsVerified(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  return (
    open && (
      <div className="emailotp-modal-overlay" onClick={onClose}>
        <div className="emailotp-modal" onClick={(e) => e.stopPropagation()}>
          <div className="emailotp-modal-header">
            <div className="emailotp-modal-close-icon" onClick={onClose}>
              <ModalCloseIcon width="16" height="16" />
            </div>
          </div>
          <div className="emailotp-modal-content">
            {/* Logo */}
            <div className="emailotp-modal-logo">
              <PfOrangeLogoIcon />
            </div>

            {/* Title */}
            <div className="emailotp-modal-title">
              Enter the OTP we sent to your email
            </div>

            {/* Email */}
            <div className="emailotp-modal-email">{maskEmail(email)}</div>

            {/* OTP Fields */}
            <Box className="pf-modal__otpFields emailotp-fields">
              {otp.map((digit, index) => (
                <TextField
                  key={index}
                  inputRef={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  error={!!errorMessage}
                  inputProps={{
                    maxLength: 1,
                    className: "pf-modal__otpInput",
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                    onPaste: handlePaste,
                    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) =>
                      handleKeyDown(index, e),
                  }}
                  placeholder=""
                  className={`pf-modal__otpField ${errorMessage ? "pf-modal__otpField--error" : ""} ${isVerifying ? "pf-modal__otpField--verifying" : ""}`}
                />
              ))}
            </Box>
            {/* Error */}

            {errorMessage && (
              <Typography className="emailotp-error">
                {errorMessage}
              </Typography>
            )}

            {/* Verify Button */}
            <Button
              fullWidth
              variant="contained"
              className={`pf-modal__verifyBtn ${isVerified ? "pf-modal__verifyBtn--verified" : ""
                }`}
              onClick={handleVerify}
              disabled={isVerifying || isVerified}
            >
              {isVerifying ? (
                "Verifying..."
              ) : isVerified ? (
                <Box className="pf-modal__verifyBtnContent">
                  <OtpVertifyTickIcon />
                  <span>OTP verified</span>
                </Box>
              ) : (
                "Verify OTP"
              )}
            </Button>

            {/* Resend */}
            <Box className="emailotp-resend">
              <Typography component="p" className="pf-modal__resendText">
                Didn't receive the email?{" "}
                <span onClick={handleResend} className="pf-modal__resendLink">
                  Resend it
                </span>
              </Typography>
            </Box>
          </div>
        </div>
      </div>
    )
  );

}
export default OTPVerificationModal;

// <CommonModal open={open} handleClose={onClose} className="pf-modal common_modal" closeButtonClassName="closeButtonClassName">
//   <Box className="pf-modal__content">
//     <Box className="pf-modal__body">
//       <Box className="">
//         <PfOrangeLogoIcon />
//       </Box>
//       <Typography component="h2" className="pf-modal__title">
//         Enter the OTP we send to your email.
//       </Typography>

//       <Typography component="p" className="pf-modal__email">
//         {maskEmail(email)}
//       </Typography>

//       <Box className="pf-modal__otpFields">
//         {otp.map((digit, index) => (
//           <TextField
//             key={index}
//             inputRef={(el) => {
//               inputRefs.current[index] = el;
//             }}
//             value={digit}
//             onChange={(e) => handleOtpChange(index, e.target.value)}
//             error={!!errorMessage}
//             inputProps={{
//               maxLength: 1,
//               className: "pf-modal__otpInput",
//               inputMode: "numeric",
//               pattern: "[0-9]*",
//               onPaste: handlePaste,
//               onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) =>
//                 handleKeyDown(index, e),
//             }}
//             placeholder="0"
//             className={`pf-modal__otpField ${errorMessage ? "pf-modal__otpField--error" : ""} ${isVerifying ? "pf-modal__otpField--verifying" : ""}`}
//           />
//         ))}
//       </Box>

//       {errorMessage && (
//         <Typography className="pf-modal__errorText">
//           {errorMessage}
//         </Typography>
//       )}

//       <Button
//         fullWidth
//         variant="contained"
//         className={`pf-modal__verifyBtn ${isVerified ? "pf-modal__verifyBtn--verified" : ""
//           }`}
//         onClick={handleVerify}
//         disabled={otp.join("").length !== 6 || isVerifying || isVerified}
//       >
//         {isVerifying ? (
//           "Verifying..."
//         ) : isVerified ? (
//           <Box className="pf-modal__verifyBtnContent">
//             <OtpVertifyTickIcon />
//             <span>OTP verified</span>
//           </Box>
//         ) : (
//           "Verify OTP"
//         )}
//       </Button>
//     </Box>

//     <Box className="pf-modal__footer">
//       <Typography component="p" className="pf-modal__resendText">
//         Didn't receive the email?{" "}
//         <span onClick={handleResend} className="pf-modal__resendLink">
//           Resend it
//         </span>
//       </Typography>
//     </Box>
//   </Box>
// </CommonModal>