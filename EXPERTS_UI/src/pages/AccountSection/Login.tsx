import Loginbg from '../../assets/img/loginbg.png'
import logo from '../../assets/img/logo.png'
import loginuser from '../../assets/img/loginuser.png'
import { BackIcon, EyeCloseIcon, EyeDarkIcon, EyeIcon, TickIcon } from "../../components/CustomFile/icons";
import { Checkbox, CheckboxIndicator } from "../../components/Ui/Checkbox";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordOtpModal from "./PasswordOtpModal";
import PasswordSucessModal from "./PasswordSucessModal";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { toast } from "../../services/toast";
import Loader from "../../components/Loader/loader";

function Login() {
    {/*login section*/ }
    const navigate = useNavigate();
    const { login, session, isAuthenticated } = useAuth();
    const [showPasswordText, setShowPasswordText] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [isPasswordOtpModalOpen, setIsPasswordOtpModalOpen] = useState(false);
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [isPasswordSuccessModalOpen, setIsPasswordSuccessModalOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotError, setForgotError] = useState<string | null>(null);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [resetError, setResetError] = useState<string | null>(null);
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [isResendingOtp, setIsResendingOtp] = useState(false);
    const [isResettingPassword, setIsResettingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    const routeByRole = (role?: string) => {
        if (role === "developer") return "/developer/dashboard";
        if (role === "agency") return "/agency/dashboard";
        if (role === "agent" || role === "superagent") return "/agent/dashboard";
        return "/";
    };

    const loginSuccessDescription = (role?: string) => {
        const r = (role || "").trim().toLowerCase();
        if (r === "developer") return "Developer";
        if (r === "agency") return "Agency";
        if (r === "agent" || r === "superagent") return "Agent";
        return "Account";
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        navigate(routeByRole(session?.user.role), { replace: true });
    }, [isAuthenticated, navigate, session?.user.role]);

    const handleLogin = async (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) event.preventDefault();
        if (!email.trim()) {
            setLoginError("Email is required");
            return;
        }
        if (!password) {
            setLoginError("Password is required");
            return;
        }
        setIsLoggingIn(true);
        setLoginError("");
        try {
            const result = await login({
                email: email.trim().toLowerCase(),
                password,
            });
            toast.success("Logged in successfully", loginSuccessDescription(result.user.role));
            navigate(routeByRole(result.user.role), { replace: true });
        } catch (error: unknown) {
            const message =
                (error as { message?: string })?.message || "Invalid email or password";
            setLoginError(message);
            toast.error("Login failed", message);
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (

        <div className="h-screen flex overflow-hidden [--primary:#D4A373] bg-[linear-gradient(-2deg,var(--primary,rgba(212, 163, 115,0.10))_-34.83%,rgba(212, 163, 115,0)_15.73%)]">

            {/* Left image collage */}
            <div className="hidden lg:block lg:flex-[6] h-full">
                <img
                    src={Loginbg}
                    alt="loginbg"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Right content */}
            <div className="flex-[6] h-full bg-[#F5F5F5] p-[40px] overflow-y-auto scrollbar-hide">
                {/* Top bar */}
                <div className="flex items-center justify-between mb-[40px]">
                    <div className="flex items-center">
                        <img src={logo} alt="img" className="w-[125px]" />
                    </div>
                    {showForgotPassword && !showChangePassword && (
                        <button
                            onClick={() => {
                                setShowPasswordText(false);
                                setShowForgotPassword(false);
                                setShowChangePassword(false);
                                setIsPasswordOtpModalOpen(false);
                                setIsPasswordSuccessModalOpen(false);
                                setForgotEmail("");
                                setForgotError(null);
                                setOtpError(null);
                                setResetError(null);
                            }}
                            className="flex items-center gap-[10px]"
                        >
                            <div className="bg-[#222] rounded-full w-[24px] h-[24px] flex items-center justify-center">
                                <BackIcon className="w-[10px] h-[10px]" />
                            </div>
                            <p className="font-[Bold] text-[#222] text-[14px]">Back to home</p>
                        </button>
                    )}
                </div>

                {/* Center card */}
                <div className="flex items-center justify-center login_right_full">
                    <div className="flex flex-col items-center justify-center w-[990px] max-sm:w-full">
                        <div className="relative h-[450px] overflow-y-auto scrollbar-hide max-sm:h-full login_right">
                            {isLoggingIn && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#F5F5F5]/80">
                                    <Loader size={88} margin={0} />
                                </div>
                            )}
                            {/* Sign in with email */}
                            {!showForgotPassword && (
                                <>
                                    <div className="flex flex-col items-center mb-[40px]">
                                        <div className="">
                                            <img src={loginuser} alt="img" className="w-[70px] h-[70px]" />
                                        </div>
                                        <div className="text-center">
                                            <h2 className="font-[Bold] text-[#222] text-[34px] mb-[4px]">
                                                Sign in with email
                                            </h2>
                                            <p className="font-[Regular] text-[#222] text-[14px]">
                                                Please login to make your work easy.
                                            </p>
                                        </div>
                                    </div>
                                    <form
                                        className="w-[400px] flex flex-col gap-[14px] mb-[80px] max-sm:w-full login_form"
                                        onSubmit={handleLogin}
                                        noValidate
                                    >
                                        {/* Email */}
                                        <div>
                                            <input
                                                id="login-email"
                                                type="email"
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value)}
                                                autoComplete="email"
                                                className="border-[rgba(34,34,34,0.10)] border bg-[#F5F5F5] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none shadow-none focus:outline-none focus:shadow-none placeholder:text-[#707070] w-full"
                                                placeholder="Email address"
                                            />
                                        </div>
                                        {/* Password */}
                                        <div className="relative">
                                            <input
                                                id="login-password"
                                                type={showPasswordText ? "text" : "password"}
                                                value={password}
                                                onChange={(event) => setPassword(event.target.value)}
                                                placeholder="Password"
                                                autoComplete="current-password"
                                                className="w-full border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5] rounded-[10px] p-[20px_16px]  text-[14px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[14px] placeholder:font-[Regular]"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPasswordText(!showPasswordText)}
                                                className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[#707070] focus:outline-none cursor-pointer"
                                            >
                                                {showPasswordText ? <EyeIcon width={20} height={20} /> : <EyeCloseIcon width={20} height={20} />}
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between mb-[14px]">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="remember"
                                                    checked={rememberMe}
                                                    onCheckedChange={(value) => setRememberMe(value === true)}
                                                    className="flex h-[15px] w-[15px] items-center justify-center rounded-[5px] border border-[rgba(34,34,34,0.20)] bg-[#F5F5F5] text-white data-[state=checked]:bg-[#D4A373] data-[state=checked]:border-[#D4A373] cursor-pointer"
                                                >
                                                    <CheckboxIndicator className="">
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
                                                className="cursor-pointer font-[Bold] text-[14px] text-[#0832AE]"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoggingIn}
                                            className="cursor-pointer bg-[#D4A373] w-full text-[14px] font-[Bold] text-[#FFF] p-[16px] rounded-[10px] disabled:opacity-70"
                                        >
                                            {isLoggingIn ? "Signing in..." : "Login"}
                                        </button>
                                        {loginError ? (
                                            <p className="text-[12px] font-[Medium] text-[#D4A373]">{loginError}</p>
                                        ) : null}
                                    </form>
                                    <div className="text-center">
                                        <h5 className="text-[14px] font-[Bold] text-[#222] mb-[6px]">Note :</h5>
                                        <p className="text-[12px] font-[Regular] text-[#707070]">
                                            Only authorized Developers, Agencies, and Agents may log in
                                        </p>
                                    </div>
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
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (!forgotEmail.trim()) {
                                                setForgotError("Email is required");
                                                return;
                                            }
                                            setForgotError(null);
                                            setOtpError(null);
                                            setIsSendingOtp(true);
                                            authService
                                                .sendOtp({ email: forgotEmail.trim().toLowerCase() })
                                                .then(() => {
                                                    toast.success("OTP sent", "Check your email for the code.");
                                                    setIsPasswordOtpModalOpen(true);
                                                })
                                                .catch((err: unknown) => {
                                                    const message =
                                                        (err as { message?: string })?.message ||
                                                        "Unable to send OTP right now.";
                                                    setForgotError(message);
                                                    toast.error("Failed to send OTP", message);
                                                })
                                                .finally(() => setIsSendingOtp(false));
                                        }}
                                    >
                                        <div>
                                            <input
                                                id="email"
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                className="border-[rgba(34,34,34,0.10)] border bg-[#F5F5F5] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none shadow-none focus:outline-none focus:shadow-none placeholder:text-[#707070] w-full"
                                                placeholder="Email address"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSendingOtp}
                                            className="cursor-pointer bg-[#D4A373] w-full text-[14px] font-[Bold] text-[#FFF] p-[16px] rounded-[10px]"
                                        >
                                            {isSendingOtp ? "Sending..." : "Get OTP"}
                                        </button>
                                        {forgotError ? (
                                            <p className="text-[12px] font-[Medium] text-[#D4A373]">
                                                {forgotError}
                                            </p>
                                        ) : null}
                                    </form>
                                    <div className="text-center flex items-center justify-center gap-[6px]">
                                        <p className="font-[Regular] text-[#222] text-[14px] text-[#222]">Did you remember your password?</p>
                                        <p
                                            onClick={() => {
                                                setShowForgotPassword(false);
                                                setShowChangePassword(false);
                                                setForgotError(null);
                                                setOtpError(null);
                                                setResetError(null);
                                            }}
                                            className="font-[Bold] text-[#222] text-[14px] text-[#0832AE] cursor-pointer"
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
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (!forgotEmail.trim()) {
                                                setResetError("Email is required");
                                                return;
                                            }
                                            if (!newPassword || newPassword.length < 6) {
                                                setResetError("Password must be at least 6 characters");
                                                return;
                                            }
                                            if (newPassword !== confirmNewPassword) {
                                                setResetError("Passwords do not match");
                                                return;
                                            }
                                            setResetError(null);
                                            setIsResettingPassword(true);
                                            authService
                                                .resetPassword({
                                                    email: forgotEmail.trim().toLowerCase(),
                                                    newPassword,
                                                })
                                                .then(() => {
                                                    toast.success("Password updated", "You can login now.");
                                                    setIsPasswordSuccessModalOpen(true);
                                                })
                                                .catch((err: unknown) => {
                                                    const message =
                                                        (err as { message?: string })?.message ||
                                                        "Unable to reset password right now.";
                                                    setResetError(message);
                                                    toast.error("Password reset failed", message);
                                                })
                                                .finally(() => setIsResettingPassword(false));
                                        }}
                                    >
                                        <div>
                                            <input
                                                id="enter_new_password"
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="border-[rgba(34,34,34,0.10)] border bg-[#F5F5F5] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none shadow-none focus:outline-none focus:shadow-none placeholder:text-[#707070] w-full"
                                                placeholder="Enter new password"
                                            />
                                        </div>
                                        <div>
                                            <input
                                                id="confirm_new_password"
                                                type="password"
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                className="border-[rgba(34,34,34,0.10)] border bg-[#F5F5F5] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none shadow-none focus:outline-none focus:shadow-none placeholder:text-[#707070] w-full"
                                                placeholder="Confirm new password"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isResettingPassword}
                                            className="cursor-pointer bg-[#D4A373] w-full text-[14px] font-[Bold] text-[#FFF] p-[16px] rounded-[10px]"
                                        >
                                            {isResettingPassword ? "Saving..." : "Confirm password"}
                                        </button>
                                        {resetError ? (
                                            <p className="text-[12px] font-[Medium] text-[#D4A373]">
                                                {resetError}
                                            </p>
                                        ) : null}
                                    </form>
                                    <div className="text-center flex items-center justify-center gap-[6px]">
                                        <p className="font-[Regular] text-[#222] text-[14px] text-[#222]">Did you remember your password?</p>
                                        <p
                                            onClick={() => {
                                                setShowForgotPassword(false);
                                                setShowChangePassword(false);
                                            }}
                                            className="font-[Bold] text-[#222] text-[14px] text-[#0832AE] cursor-pointer"
                                        >
                                            Login now
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <PasswordOtpModal
                isOpen={isPasswordOtpModalOpen}
                onClose={() => setIsPasswordOtpModalOpen(false)}
                email={forgotEmail.trim().toLowerCase()}
                isVerifying={isVerifyingOtp}
                isResending={isResendingOtp}
                error={otpError ?? undefined}
                onResendOtp={() => {
                    if (!forgotEmail.trim()) return;
                    setOtpError(null);
                    setIsResendingOtp(true);
                    authService
                        .sendOtp({ email: forgotEmail.trim().toLowerCase() })
                        .catch(() => {
                            setOtpError("Unable to resend OTP right now.");
                            toast.error("Failed to resend OTP", "Please try again.");
                        })
                        .then(() => toast.success("OTP resent", "Check your email for the code."))
                        .finally(() => setIsResendingOtp(false));
                }}
                onVerifyOtp={(otpValue) => {
                    if (!forgotEmail.trim()) return;
                    setOtpError(null);
                    setIsVerifyingOtp(true);
                    authService
                        .verifyOtp({ email: forgotEmail.trim().toLowerCase(), otp: otpValue })
                        .then(() => {
                            toast.success("OTP verified");
                            setIsPasswordOtpModalOpen(false);
                            setShowForgotPassword(true);
                            setShowChangePassword(true);
                            setNewPassword("");
                            setConfirmNewPassword("");
                        })
                        .catch((err: unknown) => {
                            const message =
                                (err as { message?: string })?.message ||
                                "Invalid OTP. Please try again.";
                            setOtpError(message);
                            toast.error("OTP verification failed", message);
                        })
                        .finally(() => setIsVerifyingOtp(false));
                }}
            />
            <PasswordSucessModal
                isOpen={isPasswordSuccessModalOpen}
                onClose={() => {
                    setIsPasswordSuccessModalOpen(false);
                    setShowForgotPassword(false);
                    setShowChangePassword(false);
                    setIsPasswordOtpModalOpen(false);
                    setForgotError(null);
                    setOtpError(null);
                    setResetError(null);
                }}
            />
        </div>
    );
}

export default Login;

// import Loginbg from '../../assets/img/loginbg.png'
// import logo from '../../assets/img/logo.png'
// import loginuser from '../../assets/img/loginuser.png'
// import { BackIcon, EyeDarkIcon, TickIcon } from "../../components/CustomFile/icons";
// import { Checkbox, CheckboxIndicator } from "../../components/Ui/Checkbox";
// import { useEffect, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import PasswordOtpModal from "./PasswordOtpModal";
// import PasswordSucessModal from "./PasswordSucessModal";
// import { useAuth } from "../../context/AuthContext";
// import { authService } from "../../services/authService";
// import { toast } from "../../services/toast";
// import Loader from "../../components/Loader/loader";

// function Login() {
//     {/*login section*/ }
//     const navigate = useNavigate();
//     const { login, session, isAuthenticated } = useAuth();
//     const [showPasswordText, setShowPasswordText] = useState(false);
//     const [showForgotPassword, setShowForgotPassword] = useState(false);
//     const [isPasswordOtpModalOpen, setIsPasswordOtpModalOpen] = useState(false);
//     const [showChangePassword, setShowChangePassword] = useState(false);
//     const [isPasswordSuccessModalOpen, setIsPasswordSuccessModalOpen] = useState(false);
//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     const [loginError, setLoginError] = useState("");
//     const [isLoggingIn, setIsLoggingIn] = useState(false);
//     const [forgotEmail, setForgotEmail] = useState("");
//     const [forgotError, setForgotError] = useState<string | null>(null);
//     const [otpError, setOtpError] = useState<string | null>(null);
//     const [resetError, setResetError] = useState<string | null>(null);
//     const [isSendingOtp, setIsSendingOtp] = useState(false);
//     const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
//     const [isResendingOtp, setIsResendingOtp] = useState(false);
//     const [isResettingPassword, setIsResettingPassword] = useState(false);
//     const [newPassword, setNewPassword] = useState("");
//     const [confirmNewPassword, setConfirmNewPassword] = useState("");

//     const routeByRole = (role?: string) => {
//         if (role === "developer") return "/developer/dashboard";
//         if (role === "agency") return "/agency/dashboard";
//         if (role === "agent") return "/agent/dashboard";
//         return "/";
//     };

//     useEffect(() => {
//         if (!isAuthenticated) return;
//         navigate(routeByRole(session?.user.role), { replace: true });
//     }, [isAuthenticated, navigate, session?.user.role]);

//     const handleLogin = async (event?: React.FormEvent<HTMLFormElement>) => {
//         if (event) event.preventDefault();
//         if (!email.trim() || !password) {
//             setLoginError("Email and password are required");
//             return;
//         }
//         setIsLoggingIn(true);
//         setLoginError("");
//         try {
//             const result = await login({
//                 email: email.trim().toLowerCase(),
//                 password,
//             });
//             toast.success("Login successful");
//             navigate(routeByRole(result.user.role), { replace: true });
//         } catch (error: unknown) {
//             const message =
//                 (error as { message?: string })?.message || "Invalid email or password";
//             setLoginError(message);
//             toast.error("Login failed", message);
//         } finally {
//             setIsLoggingIn(false);
//         }
//     };

//     return (

//         <div className="[--primary:#D4A373] bg-[linear-gradient(-2deg,var(--primary,rgba(212, 163, 115,0.10))_-34.83%,rgba(212, 163, 115,0)_15.73%)]">
//             <div className="grid grid-cols-2 max-sm:grid-cols-1">
//                 {/* Left image collage */}
//                 <div className="max-sm:hidden">
//                     <div className="">
//                         <img src={Loginbg} alt="" className="w-full h-[100vh] object-cover" />
//                     </div>
//                 </div>

//                 {/* Right content */}
//                 <div className="p-[40px] max-sm:p-[40px_15px] bg-[#F5F5F5] ">
//                     {/* Top bar */}
//                     <div className="flex items-center justify-between mb-[40px]">
//                         <div className="flex items-center">
//                             <img src={logo} alt="img" className="w-[125px]" />
//                         </div>

//                         <button
//                             onClick={() => {
//                                 setShowPasswordText(false);
//                                 setShowForgotPassword(false);
//                                 setShowChangePassword(false);
//                                 setIsPasswordOtpModalOpen(false);
//                                 setIsPasswordSuccessModalOpen(false);
//                                 setForgotError(null);
//                                 setOtpError(null);
//                                 setResetError(null);
//                             }}
//                             className="flex items-center gap-[10px]"
//                         >
//                             <div className="bg-[#222] rounded-full w-[24px] h-[24px] flex items-center justify-center">
//                                 <BackIcon className="w-[10px] h-[10px]" />
//                             </div>
//                             <p className="font-[Bold] text-[#222] text-[14px]">Back to home</p>
//                         </button>
//                     </div>

//                     {/* Center card */}
//                     <div className="flex items-center justify-center login_right_full">
//                         <div className="flex flex-col items-center justify-center w-[400px] max-sm:w-full">
//                             <div className="relative h-[450px] overflow-y-auto max-sm:h-full login_right">
//                                 {isLoggingIn && (
//                                     <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#F5F5F5]/80">
//                                         <Loader size={88} margin={0} />
//                                     </div>
//                                 )}
//                                 {/* Sign in with email */}
//                                 {!showForgotPassword && (
//                                     <>
//                                         <div className="flex flex-col items-center mb-[40px]">
//                                             <div className="">
//                                                 <img src={loginuser} alt="img" className="w-[70px] h-[70px]" />
//                                             </div>
//                                             <div className="text-center">
//                                                 <h2 className="font-[Bold] text-[#222] text-[34px] mb-[4px]">
//                                                     Sign in with email
//                                                 </h2>
//                                                 <p className="font-[Regular] text-[#222] text-[14px]">
//                                                     Please login to make your work easy.
//                                                 </p>
//                                             </div>
//                                         </div>
//                                         <div
//                                             className="w-[400px] flex flex-col gap-[14px] mb-[80px] max-sm:w-full login_form"
//                                         >
//                                             {/* Email */}
//                                             <div>
//                                                 <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="border-[rgba(34,34,34,0.10)] border bg-[#F5F5F5] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none shadow-none focus:outline-none focus:shadow-none placeholder:text-[#707070] w-full" placeholder="Email address" />
//                                             </div>
//                                             {/* Password */}
//                                             <div className="relative">
//                                                 <input
//                                                     type={showPasswordText ? "text" : "password"}
//                                                     value={password}
//                                                     onChange={(event) => setPassword(event.target.value)}
//                                                     placeholder="Password"
//                                                     className="w-full border border-[rgba(34,34,34,0.10)] bg-[#F5F5F5] rounded-[10px] p-[20px_16px]  text-[14px] font-[Medium] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[14px] placeholder:font-[Regular]"
//                                                 />
//                                                 <button type="button" onClick={() => setShowPasswordText(!showPasswordText)} className="absolute right-[16px] top-1/2 -translate-y-1/2 text-[#707070] focus:outline-none cursor-pointer">
//                                                     <EyeDarkIcon width={20} height={20} />
//                                                 </button>
//                                             </div>


//                                             <div className="flex items-center justify-between mb-[14px]">
//                                                 <div className="flex items-center gap-2">
//                                                     <Checkbox
//                                                         id="remember"
//                                                         className="flex h-[15px] w-[15px] items-center justify-center rounded-[5px] border border-[rgba(34,34,34,0.20)] bg-[#F5F5F5] text-white data-[state=checked]:bg-[#D4A373] data-[state=checked]:border-[#D4A373] cursor-pointer"
//                                                     >
//                                                         <CheckboxIndicator className="">
//                                                             <TickIcon className="mt-[-1px]" />
//                                                         </CheckboxIndicator>
//                                                     </Checkbox>
//                                                     <label
//                                                         htmlFor="remember"
//                                                         className="cursor-pointer font-[Regular] text-[14px] text-[#222]"
//                                                     >
//                                                         Remember me
//                                                     </label>
//                                                 </div>

//                                                 <button
//                                                     type="button"
//                                                     onClick={() => {
//                                                         setShowForgotPassword(true);
//                                                         setShowChangePassword(false);
//                                                     }}
//                                                     className="cursor-pointer font-[Bold] text-[14px] text-[#0832AE]"
//                                                 >
//                                                     Forgot password?
//                                                 </button>
//                                             </div>

//                                             <button
//                                                 type="submit"
//                                                 onClick={() => handleLogin()}
//                                                 disabled={isLoggingIn}
//                                                 className="cursor-pointer bg-[#D4A373] w-full text-[14px] font-[Bold] text-[#FFF] p-[16px] rounded-[10px]"
//                                             >
//                                                 {isLoggingIn ? "Signing in..." : "Login"}
//                                             </button>
//                                             {loginError ? (
//                                                 <p className="text-[12px] font-[Medium] text-[#D4A373]">{loginError}</p>
//                                             ) : null}
//                                         </div>
//                                         <div className="text-center">
//                                             <h5 className="text-[14px] font-[Bold] text-[#222] mb-[6px]">Note :</h5>
//                                             <p className="text-[12px] font-[Regular] text-[#707070]">
//                                                 Only authorized Developers, Agencies, and Agents may log in
//                                             </p>
//                                         </div>
//                                     </>
//                                 )}
//                                 {/*Forgot password*/}
//                                 {showForgotPassword && !showChangePassword && (
//                                     <>
//                                         <div className="flex flex-col items-center mb-[40px]">
//                                             <div className="text-center">
//                                                 <h2 className="font-[Bold] text-[#222] text-[34px] mb-[4px]">
//                                                     Forgot password
//                                                 </h2>
//                                             </div>
//                                         </div>
//                                         <form
//                                             className="w-[400px] flex flex-col gap-[14px] mb-[30px] max-sm:w-full login_form"
//                                             onSubmit={(e) => {
//                                                 e.preventDefault();
//                                                 if (!forgotEmail.trim()) {
//                                                     setForgotError("Email is required");
//                                                     return;
//                                                 }
//                                                 setForgotError(null);
//                                                 setOtpError(null);
//                                                 setIsSendingOtp(true);
//                                                 authService
//                                                     .sendOtp({ email: forgotEmail.trim().toLowerCase() })
//                                                     .then(() => {
//                                                         toast.success("OTP sent", "Check your email for the code.");
//                                                         setIsPasswordOtpModalOpen(true);
//                                                     })
//                                                     .catch((err: unknown) => {
//                                                         const message =
//                                                             (err as { message?: string })?.message ||
//                                                             "Unable to send OTP right now.";
//                                                         setForgotError(message);
//                                                         toast.error("Failed to send OTP", message);
//                                                     })
//                                                     .finally(() => setIsSendingOtp(false));
//                                             }}
//                                         >
//                                             <div>
//                                                 <input
//                                                     id="email"
//                                                     type="email"
//                                                     value={forgotEmail}
//                                                     onChange={(e) => setForgotEmail(e.target.value)}
//                                                     className="border-[rgba(34,34,34,0.10)] border bg-[#F5F5F5] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none shadow-none focus:outline-none focus:shadow-none placeholder:text-[#707070] w-full"
//                                                     placeholder="Email address"
//                                                 />
//                                             </div>
//                                             <button
//                                                 type="submit"
//                                                 disabled={isSendingOtp}
//                                                 className="cursor-pointer bg-[#D4A373] w-full text-[14px] font-[Bold] text-[#FFF] p-[16px] rounded-[10px]"
//                                             >
//                                                 {isSendingOtp ? "Sending..." : "Get OTP"}
//                                             </button>
//                                             {forgotError ? (
//                                                 <p className="text-[12px] font-[Medium] text-[#D4A373]">
//                                                     {forgotError}
//                                                 </p>
//                                             ) : null}
//                                         </form>
//                                         <div className="text-center flex items-center justify-center gap-[6px]">
//                                             <p className="font-[Regular] text-[#222] text-[14px] text-[#222]">Did you remember your password?</p>
//                                             <p
//                                                 onClick={() => {
//                                                     setShowForgotPassword(false);
//                                                     setShowChangePassword(false);
//                                                     setForgotError(null);
//                                                     setOtpError(null);
//                                                     setResetError(null);
//                                                 }}
//                                                 className="font-[Bold] text-[#222] text-[14px] text-[#0832AE] cursor-pointer"
//                                             >
//                                                 Login now
//                                             </p>
//                                         </div>
//                                     </>
//                                 )}
//                                 {/*Change Password*/}
//                                 {showChangePassword && (
//                                     <>
//                                         <div className="flex flex-col items-center mb-[40px]">
//                                             <div className="text-center">
//                                                 <h2 className="font-[Bold] text-[#222] text-[34px] mb-[4px]">
//                                                     Change password
//                                                 </h2>
//                                             </div>
//                                         </div>
//                                         <form
//                                             className="w-[400px] flex flex-col gap-[14px] mb-[30px] max-sm:w-full login_form"
//                                             onSubmit={(e) => {
//                                                 e.preventDefault();
//                                                 if (!forgotEmail.trim()) {
//                                                     setResetError("Email is required");
//                                                     return;
//                                                 }
//                                                 if (!newPassword || newPassword.length < 6) {
//                                                     setResetError("Password must be at least 6 characters");
//                                                     return;
//                                                 }
//                                                 if (newPassword !== confirmNewPassword) {
//                                                     setResetError("Passwords do not match");
//                                                     return;
//                                                 }
//                                                 setResetError(null);
//                                                 setIsResettingPassword(true);
//                                                 authService
//                                                     .resetPassword({
//                                                         email: forgotEmail.trim().toLowerCase(),
//                                                         newPassword,
//                                                     })
//                                                     .then(() => {
//                                                         toast.success("Password updated", "You can login now.");
//                                                         setIsPasswordSuccessModalOpen(true);
//                                                     })
//                                                     .catch((err: unknown) => {
//                                                         const message =
//                                                             (err as { message?: string })?.message ||
//                                                             "Unable to reset password right now.";
//                                                         setResetError(message);
//                                                         toast.error("Password reset failed", message);
//                                                     })
//                                                     .finally(() => setIsResettingPassword(false));
//                                             }}
//                                         >
//                                             <div>
//                                                 <input
//                                                     id="enter_new_password"
//                                                     type="password"
//                                                     value={newPassword}
//                                                     onChange={(e) => setNewPassword(e.target.value)}
//                                                     className="border-[rgba(34,34,34,0.10)] border bg-[#F5F5F5] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none shadow-none focus:outline-none focus:shadow-none placeholder:text-[#707070] w-full"
//                                                     placeholder="Enter new password"
//                                                 />
//                                             </div>
//                                             <div>
//                                                 <input
//                                                     id="confirm_new_password"
//                                                     type="password"
//                                                     value={confirmNewPassword}
//                                                     onChange={(e) => setConfirmNewPassword(e.target.value)}
//                                                     className="border-[rgba(34,34,34,0.10)] border bg-[#F5F5F5] rounded-[10px] p-[20px_16px] text-[14px] font-[Regular] text-[#222] outline-none shadow-none focus:outline-none focus:shadow-none placeholder:text-[#707070] w-full"
//                                                     placeholder="Confirm new password"
//                                                 />
//                                             </div>
//                                             <button
//                                                 type="submit"
//                                                 disabled={isResettingPassword}
//                                                 className="cursor-pointer bg-[#D4A373] w-full text-[14px] font-[Bold] text-[#FFF] p-[16px] rounded-[10px]"
//                                             >
//                                                 {isResettingPassword ? "Saving..." : "Confirm password"}
//                                             </button>
//                                             {resetError ? (
//                                                 <p className="text-[12px] font-[Medium] text-[#D4A373]">
//                                                     {resetError}
//                                                 </p>
//                                             ) : null}
//                                         </form>
//                                         <div className="text-center flex items-center justify-center gap-[6px]">
//                                             <p className="font-[Regular] text-[#222] text-[14px] text-[#222]">Did you remember your password?</p>
//                                             <p
//                                                 onClick={() => {
//                                                     setShowForgotPassword(false);
//                                                     setShowChangePassword(false);
//                                                 }}
//                                                 className="font-[Bold] text-[#222] text-[14px] text-[#0832AE] cursor-pointer"
//                                             >
//                                                 Login now
//                                             </p>
//                                         </div>
//                                     </>
//                                 )}
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <PasswordOtpModal
//                 isOpen={isPasswordOtpModalOpen}
//                 onClose={() => setIsPasswordOtpModalOpen(false)}
//                 email={forgotEmail.trim().toLowerCase()}
//                 isVerifying={isVerifyingOtp}
//                 isResending={isResendingOtp}
//                 error={otpError ?? undefined}
//                 onResendOtp={() => {
//                     if (!forgotEmail.trim()) return;
//                     setOtpError(null);
//                     setIsResendingOtp(true);
//                     authService
//                         .sendOtp({ email: forgotEmail.trim().toLowerCase() })
//                         .catch(() => {
//                             setOtpError("Unable to resend OTP right now.");
//                             toast.error("Failed to resend OTP", "Please try again.");
//                         })
//                         .then(() => toast.success("OTP resent", "Check your email for the code."))
//                         .finally(() => setIsResendingOtp(false));
//                 }}
//                 onVerifyOtp={(otpValue) => {
//                     if (!forgotEmail.trim()) return;
//                     setOtpError(null);
//                     setIsVerifyingOtp(true);
//                     authService
//                         .verifyOtp({ email: forgotEmail.trim().toLowerCase(), otp: otpValue })
//                         .then(() => {
//                             toast.success("OTP verified");
//                             setIsPasswordOtpModalOpen(false);
//                             setShowForgotPassword(true);
//                             setShowChangePassword(true);
//                             setNewPassword("");
//                             setConfirmNewPassword("");
//                         })
//                         .catch((err: unknown) => {
//                             const message =
//                                 (err as { message?: string })?.message ||
//                                 "Invalid OTP. Please try again.";
//                             setOtpError(message);
//                             toast.error("OTP verification failed", message);
//                         })
//                         .finally(() => setIsVerifyingOtp(false));
//                 }}
//             />
//             <PasswordSucessModal
//                 isOpen={isPasswordSuccessModalOpen}
//                 onClose={() => {
//                     setIsPasswordSuccessModalOpen(false);
//                     setShowForgotPassword(false);
//                     setShowChangePassword(false);
//                     setIsPasswordOtpModalOpen(false);
//                     setForgotError(null);
//                     setOtpError(null);
//                     setResetError(null);
//                 }}
//             />
//         </div>
//     );
// }

// export default Login;