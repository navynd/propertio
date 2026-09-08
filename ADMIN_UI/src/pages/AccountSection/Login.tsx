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

  const [email, setEmail] = useState("molumulkadmin@yopmail.com");
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
        <div className="flex lg:flex-row flex-col min-h-[100dvh] bg-white overflow-hidden">

            {/* Left Image Section */}
            <div className="lg:w-[60%] w-full hidden lg:block">
                <img
                    src={Loginbg}
                    alt="Login Background"
                    className="w-full h-[100dvh] object-cover"
                />
            </div>

            {/* Right Login Section */}
            <div className="flex items-center justify-center lg:w-[40%] w-full min-h-[100dvh] p-[20px] bg-white">
                <div className="w-full max-w-[400px] relative">
                    {isLoginLoading ? (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 rounded-[12px]">
                            <Loader size={88} margin={0} />
                        </div>
                    ) : null}
                    {showForgotPassword && !showChangePassword && isSendingOtp ? (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 rounded-[12px]">
                            <Loader size={88} margin={0} />
                        </div>
                    ) : null}
                    {!showForgotPassword && (
                        <>
                            {/* Top Content */}
                            <div className="flex flex-col items-center mb-[40px]">
                                <div className="mb-[20px] flex justify-center items-center w-[60px] h-[60px] rounded-[15px] bg-[#FFF] shadow-[0_6px_18px_0_rgba(0,0,0,0.15)]">
                                    <UserColorIcon fill="var(--primary-color, #1F3D51)" height={30} width={30} />
                                </div>

                                <div className="text-center">
                                    <h2 className="font-[Bold] text-[#222] text-[34px] mb-[4px] leading-[44px]">
                                        Sign in with email
                                    </h2>

                                    <p className="font-[Regular] text-[#222] text-[14px]">
                                        Please login to make your work easy.
                                    </p>
                                </div>
                            </div>

                            {/* Form */}
                            <form className="flex flex-col gap-[14px]" onSubmit={handleLogin}>

                                {/* Email */}
                                <div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email address"
                                        className="border border-[rgba(34,34,34,0.10)] bg-[#fff] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none placeholder:text-[#707070] w-full"
                                    />
                                </div>

                                {/* Password */}
                                <div>
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        className="border border-[rgba(34,34,34,0.10)] bg-[#fff] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none placeholder:text-[#707070] w-full"
                                    />
                                </div>

                                {/* Remember + Forgot */}
                                <div className="flex items-center justify-between mb-[10px]">

                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="remember"
                                            checked={rememberMe}
                                            onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                                            className="flex h-[15px] w-[15px] items-center justify-center rounded-[5px] border border-[rgba(34,34,34,0.20)] bg-white text-white data-[state=checked]:bg-[#EA3934] data-[state=checked]:border-[#EA3934] cursor-pointer"
                                        >
                                            <CheckboxIndicator>
                                                <TickIcon className="mt-[-1px]" />
                                            </CheckboxIndicator>
                                        </Checkbox>

                                        <label
                                            htmlFor="remember"
                                            className="cursor-pointer font-[Regular] text-[14px] text-[#222]"
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
                                        className="font-[Bold] text-[15px] text-[#222]"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                {/* Login Button EA3934*/}
                                <button
                                    type="submit"
                                    disabled={isLoginLoading}
                                    className="cursor-pointer bg-[var(--primary-color,#1F3D51)] hover:bg-[var(--primary-hover,#162b39)] transition-colors w-full text-[14px] font-[Bold] text-[#FFF] p-[16px] rounded-[10px]"
                                >
                                    {isLoginLoading ? "Logging in..." : "Login"}
                                </button>
                                {loginError ? (
                                    <p className="text-[12px] text-[#EA3934] mt-[2px]">{loginError}</p>
                                ) : null}
                            </form>
                        </>
                    )}
                    {/*Forgot password*/}
                    {showForgotPassword && !showChangePassword && (
                        <>
                            <div className="flex flex-col items-center mb-[40px]">
                                <div className="text-center">
                                    <h2 className="font-[Bold] text-[#222] text-[34px] mb-[4px]">
                                        Forgot password
                                    </h2>
                                </div>
                            </div>
                            <form
                                className="w-[400px] flex flex-col gap-[14px] mb-[30px] max-sm:w-full login_form"
                                onSubmit={handleSendOtp}
                            >
                                <div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        className="border border-[rgba(34,34,34,0.10)] bg-[#fff] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none placeholder:text-[#707070] w-full"
                                        placeholder="Email address"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSendingOtp}
                                    className="cursor-pointer bg-[var(--primary-color,#1F3D51)] hover:bg-[var(--primary-hover,#162b39)] transition-colors w-full text-[14px] font-[Bold] text-[#FFF] p-[16px] rounded-[10px]"
                                >
                                    {isSendingOtp ? "Sending..." : "Get OTP"}
                                </button>
                                {forgotError ? (
                                    <p className="text-[12px] text-[#EA3934] mt-[2px]">{forgotError}</p>
                                ) : null}
                            </form>
                            <div className="text-center flex items-center justify-center gap-[6px]">
                                <p className="font-[Regular] text-[#222] text-[14px] text-[#222]">Did you remember your password?</p>
                                <p
                                    onClick={returnToLogin}
                                    className="font-[Bold] text-[#222] text-[15px] text-[#222] cursor-pointer"
                                >
                                    Login now
                                </p>
                            </div>
                        </>
                    )}
                    {/*Change Password*/}
                    {showChangePassword && (
                        <>
                            <div className="flex flex-col items-center mb-[40px]">
                                <div className="text-center">
                                    <h2 className="font-[Bold] text-[#222] text-[34px] mb-[4px]">
                                        Change password
                                    </h2>
                                </div>
                            </div>
                            <form
                                className="w-[400px] flex flex-col gap-[14px] mb-[30px] max-sm:w-full login_form"
                                onSubmit={handleResetPassword}
                            >
                                <div>
                                    <input
                                        id="enter_new_password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="border border-[rgba(34,34,34,0.10)] bg-[#fff] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none placeholder:text-[#707070] w-full"
                                        placeholder="Enter new password"
                                    />
                                </div>
                                <div>
                                    <input
                                        id="confirm_new_password"
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        className="border border-[rgba(34,34,34,0.10)] bg-[#fff] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none placeholder:text-[#707070] w-full"
                                        placeholder="Confirm new password"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isResetLoading}
                                    className="cursor-pointer bg-[var(--primary-color,#1F3D51)] hover:bg-[var(--primary-hover,#162b39)] transition-colors w-full text-[14px] font-[Bold] text-[#FFF] p-[16px] rounded-[10px]"
                                >
                                    {isResetLoading ? "Saving..." : "Confirm password"}
                                </button>
                                {changeError ? (
                                    <p className="text-[12px] text-[#EA3934] mt-[2px]">{changeError}</p>
                                ) : null}
                            </form>
                            <div className="text-center flex items-center justify-center gap-[6px]">
                                <p className="font-[Regular] text-[#222] text-[14px] text-[#222]">Did you remember your password?</p>
                                <p
                                    onClick={returnToLogin}
                                    className="font-[Bold] text-[#222] text-[14px] text-[#0832AE] cursor-pointer"
                                >
                                    Login now
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