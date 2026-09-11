import { useNavigate } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";
import Loginbg from '../../assets/img/main1.png';
import { TickIcon, UserColorIcon } from "../../assets/icons";
import { Checkbox, CheckboxIndicator } from "../../components/Ui/Checkbox";
import PasswordOtpModal from "./PasswordOtpModal";
import PasswordSucessModal from "./PasswordSucessModal";
import { authService } from "../../services/authService";
import { authStorage } from "../../services/authStorage";
import { getApiErrorMessage } from "../../services/apiClient";
import { useToast } from "../../context/ToastContext";
import Loader from "../../components/Loader/loader";

function Login() {
  const navigate = useNavigate();
  const { push } = useToast();

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isPasswordOtpModalOpen, setIsPasswordOtpModalOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isPasswordSuccessModalOpen, setIsPasswordSuccessModalOpen] = useState(false);

  const [email, setEmail] = useState("estatehubadmin@yopmail.com");
  const [password, setPassword] = useState("admin@123");
  const [rememberMe, setRememberMe] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [loginError, setLoginError] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [changeError, setChangeError] = useState("");

  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  useEffect(() => {
    if (authStorage.getAccessToken()) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setLoginError("");
    if (!email.trim() || !password.trim()) {
      setLoginError("Email and password are required");
      return;
    }
    setIsLoginLoading(true);
    try {
      await authService.login({
        email: email.trim(),
        password,
        rememberMe,
      });
      push({
        type: "success",
        title: "Login successful",
        description: "Welcome back to the admin panel.",
      });
      navigate("/dashboard");
    } catch (error) {
      const msg = getApiErrorMessage(error, "Invalid email or password");
      setLoginError(msg);
      push({ type: "error", title: "Login failed", description: msg });
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setForgotError("");
    setOtpError("");
    if (!forgotEmail.trim()) {
      setForgotError("Email is required");
      return;
    }
    setIsSendingOtp(true);
    try {
      await authService.sendOtp(forgotEmail.trim());
      push({
        type: "success",
        title: "OTP sent successfully",
        description: "Check your email for the verification code.",
      });
      setIsPasswordOtpModalOpen(true);
    } catch (error) {
      const msg = getApiErrorMessage(error, "Failed to send OTP");
      setForgotError(msg);
      push({ type: "error", title: "Could not send OTP", description: msg });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setOtpError("");
    setIsVerifyingOtp(true);
    try {
      await authService.verifyOtp(forgotEmail.trim(), otp);
      push({
        type: "success",
        title: "OTP verified successfully",
        description: "You can set a new password now.",
      });
      setIsPasswordOtpModalOpen(false);
      setShowChangePassword(true);
    } catch (error) {
      const msg = getApiErrorMessage(error, "Invalid OTP");
      setOtpError(msg);
      push({ type: "error", title: "OTP verification failed", description: msg });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setChangeError("");
    if (!newPassword || !confirmNewPassword) {
      setChangeError("Both password fields are required");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setChangeError("Passwords do not match");
      return;
    }
    setIsResetLoading(true);
    try {
      await authService.resetPassword(forgotEmail.trim(), newPassword);
      push({
        type: "success",
        title: "Password reset successful",
        description: "Please sign in with your new password.",
      });
      setIsPasswordSuccessModalOpen(true);
      setShowChangePassword(false);
      setShowForgotPassword(false);
      setForgotEmail("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTimeout(() => {
        setIsPasswordSuccessModalOpen(false);
      }, 1200);
    } catch (error) {
      const msg = getApiErrorMessage(error, "Failed to reset password");
      setChangeError(msg);
      push({ type: "error", title: "Password reset failed", description: msg });
    } finally {
      setIsResetLoading(false);
    }
  };

  const returnToLogin = () => {
    setShowForgotPassword(false);
    setShowChangePassword(false);
    setForgotError("");
    setOtpError("");
    setChangeError("");
  };

    return (
        <div className="flex lg:flex-row flex-col min-h-[100dvh] bg-[#0A0A0A] overflow-hidden">

            {/* Left Image Section */}
            <div className="lg:w-[58%] w-full hidden lg:block relative">
                <img
                    src={Loginbg}
                    alt="Login Background"
                    className="w-full h-[100dvh] object-cover filter brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-[#0A0A0A]" />
                <div className="absolute bottom-[50px] left-[50px] z-10 max-w-[500px]">
                    <span className="inline-block px-[14px] py-[6px] rounded-full bg-black/60 backdrop-blur-md border border-[rgba(201,169,110,0.3)] text-[#C9A96E] text-[12px] font-semibold tracking-wider uppercase mb-3">
                        Estatehub Administration
                    </span>
                    <h1 className="font-['Playfair_Display',serif] text-[#F5F0E8] text-[36px] font-bold leading-tight">
                        Exclusive Portal for Real Estate Operations
                    </h1>
                </div>
            </div>

            {/* Right Login Section */}
            <div className="flex items-center justify-center lg:w-[42%] w-full min-h-[100dvh] p-[24px] bg-[#0A0A0A]">
                <div className="w-full max-w-[420px] relative bg-[#141414] border border-[rgba(201,169,110,0.18)] rounded-[24px] p-[36px_32px] shadow-[0_16px_50px_rgba(0,0,0,0.6)]">
                    {isLoginLoading ? (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-[24px]">
                            <Loader size={88} margin={0} />
                        </div>
                    ) : null}
                    {showForgotPassword && !showChangePassword && isSendingOtp ? (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-[24px]">
                            <Loader size={88} margin={0} />
                        </div>
                    ) : null}
                    {!showForgotPassword && (
                        <>
                            {/* Top Content */}
                            <div className="flex flex-col items-center mb-[32px]">
                                <div className="mb-[18px] flex justify-center items-center w-[58px] h-[58px] rounded-[16px] bg-[#1A1A1A] border border-[rgba(201,169,110,0.25)] shadow-[0_4px_18px_rgba(201,169,110,0.15)]">
                                    <UserColorIcon fill="#C9A96E" height={28} width={28} />
                                </div>

                                <div className="text-center">
                                    <h2 className="font-['Playfair_Display',serif] text-[#F5F0E8] text-[30px] font-bold mb-[6px] tracking-tight">
                                        Sign in to Admin
                                    </h2>

                                    <p className="text-[#A89880] text-[13px] font-[Regular]">
                                        Enter your credentials to access the control panel.
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <form className="flex flex-col gap-[16px]" onSubmit={handleLogin}>

                                {/* Email */}
                                <div>
                                    <label className="block text-[12px] font-[Medium] text-[#C9A96E] mb-[6px]">Email Address</label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="estatehubadmin@yopmail.com"
                                        className="border border-[rgba(201,169,110,0.2)] bg-[#1A1A1A] rounded-[12px] px-[16px] py-[14px] text-[14px] text-[#F5F0E8] outline-none placeholder:text-[#A89880]/60 w-full focus:border-[#C9A96E] transition-all"
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <label className="block text-[12px] font-[Medium] text-[#C9A96E] mb-[6px]">Password</label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="border border-[rgba(201,169,110,0.2)] bg-[#1A1A1A] rounded-[12px] px-[16px] py-[14px] text-[14px] text-[#F5F0E8] outline-none placeholder:text-[#A89880]/60 w-full focus:border-[#C9A96E] transition-all"
                                    />
                                </div>

                                {/* Remember + Forgot */}
                                <div className="flex items-center justify-between my-[4px]">

                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="remember"
                                            checked={rememberMe}
                                            onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                                            className="flex h-[16px] w-[16px] items-center justify-center rounded-[5px] border border-[rgba(201,169,110,0.3)] bg-[#1A1A1A] text-black data-[state=checked]:bg-[#C9A96E] data-[state=checked]:border-[#C9A96E] cursor-pointer"
                                        >
                                            <CheckboxIndicator>
                                                <TickIcon className="mt-[-1px]" />
                                            </CheckboxIndicator>
                                        </Checkbox>

                                        <label
                                            htmlFor="remember"
                                            className="cursor-pointer font-[Regular] text-[13px] text-[#A89880]"
                                        >
                                            Remember me
                                        </label>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForgotPassword(true);
                                            setShowChangePassword(false);
                                        }}
                                        className="font-[Medium] text-[13px] text-[#C9A96E] hover:underline"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {/* Login Button */}
                                <button
                                    type="submit"
                                    disabled={isLoginLoading}
                                    className="cursor-pointer bg-gradient-to-r from-[#C9A96E] to-[#B89355] hover:from-[#E4C98B] hover:to-[#C9A96E] transition-all w-full text-[14px] font-[Bold] text-[#0A0A0A] py-[15px] rounded-[12px] shadow-[0_4px_18px_rgba(201,169,110,0.25)] hover:shadow-[0_6px_24px_rgba(201,169,110,0.4)] mt-[6px]"
                                >
                                    {isLoginLoading ? "Signing in..." : "Sign in to Dashboard"}
                                </button>
                                {loginError ? (
                                    <p className="text-[12px] text-[#EF4444] mt-[2px]">{loginError}</p>
                                ) : null}
                            </form>
                        </>
                    )}
                    {/*Forgot password*/}
                    {showForgotPassword && !showChangePassword && (
                        <>
                            <div className="flex flex-col items-center mb-[32px]">
                                <div className="text-center">
                                    <h2 className="font-['Playfair_Display',serif] text-[#F5F0E8] text-[30px] font-bold mb-[6px]">
                                        Reset Password
                                    </h2>
                                    <p className="text-[#A89880] text-[13px] font-[Regular]">Enter your registered email to receive an OTP</p>
                                </div>
                            </div>
                            <form
                                className="w-full flex flex-col gap-[16px] mb-[24px]"
                                onSubmit={handleSendOtp}
                            >
                                <div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="border border-[rgba(201,169,110,0.2)] bg-[#1A1A1A] rounded-[12px] px-[16px] py-[14px] text-[14px] text-[#F5F0E8] outline-none placeholder:text-[#A89880]/60 w-full focus:border-[#C9A96E]"
                                        placeholder="Email address"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSendingOtp}
                                    className="cursor-pointer bg-gradient-to-r from-[#C9A96E] to-[#B89355] hover:from-[#E4C98B] hover:to-[#C9A96E] transition-all w-full text-[14px] font-[Bold] text-[#0A0A0A] py-[15px] rounded-[12px] shadow-[0_4px_18px_rgba(201,169,110,0.25)]"
                                >
                                    {isSendingOtp ? "Sending OTP..." : "Send Verification Code"}
                                </button>
                                {forgotError ? (
                                    <p className="text-[12px] text-[#EF4444] mt-[2px]">{forgotError}</p>
                                ) : null}
                            </form>
                            <div className="text-center flex items-center justify-center gap-[6px]">
                                <p className="font-[Regular] text-[13px] text-[#A89880]">Remembered password?</p>
                                <p
                                    onClick={returnToLogin}
                                    className="font-[Bold] text-[13px] text-[#C9A96E] cursor-pointer hover:underline"
                                >
                                    Sign in
                                </p>
                            </div>
                        </>
                    )}
                    {/*Change Password*/}
                    {showChangePassword && (
                        <>
                            <div className="flex flex-col items-center mb-[32px]">
                                <div className="text-center">
                                    <h2 className="font-['Playfair_Display',serif] text-[#F5F0E8] text-[30px] font-bold mb-[6px]">
                                        New Password
                                    </h2>
                                    <p className="text-[#A89880] text-[13px] font-[Regular]">Create a secure password for your account</p>
                                </div>
                            </div>
                            <form
                                className="w-full flex flex-col gap-[16px] mb-[24px]"
                                onSubmit={handleResetPassword}
                            >
                                <div>
                                    <input
                                        id="enter_new_password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="border border-[rgba(201,169,110,0.2)] bg-[#1A1A1A] rounded-[12px] px-[16px] py-[14px] text-[14px] text-[#F5F0E8] outline-none placeholder:text-[#A89880]/60 w-full focus:border-[#C9A96E]"
                                        placeholder="Enter new password"
                                    />
                                </div>
                                <div>
                                    <input
                                        id="confirm_new_password"
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        className="border border-[rgba(201,169,110,0.2)] bg-[#1A1A1A] rounded-[12px] px-[16px] py-[14px] text-[14px] text-[#F5F0E8] outline-none placeholder:text-[#A89880]/60 w-full focus:border-[#C9A96E]"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isResetLoading}
                                    className="cursor-pointer bg-gradient-to-r from-[#C9A96E] to-[#B89355] hover:from-[#E4C98B] hover:to-[#C9A96E] transition-all w-full text-[14px] font-[Bold] text-[#0A0A0A] py-[15px] rounded-[12px] shadow-[0_4px_18px_rgba(201,169,110,0.25)]"
                                >
                                    {isResetLoading ? "Saving..." : "Update Password"}
                                </button>
                                {changeError ? (
                                    <p className="text-[12px] text-[#EF4444] mt-[2px]">{changeError}</p>
                                ) : null}
                            </form>
                            <div className="text-center flex items-center justify-center gap-[6px]">
                                <p className="font-[Regular] text-[13px] text-[#A89880]">Return to</p>
                                <p
                                    onClick={returnToLogin}
                                    className="font-[Bold] text-[13px] text-[#C9A96E] cursor-pointer hover:underline"
                                >
                                    Sign in
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <PasswordOtpModal
                isOpen={isPasswordOtpModalOpen}
                onClose={() => setIsPasswordOtpModalOpen(false)}
                email={forgotEmail}
                isVerifying={isVerifyingOtp}
                isResending={isResendingOtp}
                error={otpError}
                onVerifyOtp={handleVerifyOtp}
                onResendOtp={() => {
                  setIsResendingOtp(true);
                  void authService
                    .sendOtp(forgotEmail.trim())
                    .then(() =>
                      push({
                        type: "success",
                        title: "OTP resent successfully",
                        description: "Check your inbox for the latest code.",
                      })
                    )
                    .catch((error) =>
                      push({
                        type: "error",
                        title: "Could not resend OTP",
                        description: getApiErrorMessage(error, "Failed to resend OTP"),
                      })
                    )
                    .finally(() => {
                      setIsResendingOtp(false);
                    });
                }}
            />
            <PasswordSucessModal
                isOpen={isPasswordSuccessModalOpen}
                onClose={() => setIsPasswordSuccessModalOpen(false)}
            />
        </div>
    );
}

export default Login;