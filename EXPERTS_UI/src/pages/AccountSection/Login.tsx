import { BackIcon, EyeCloseIcon, EyeIcon, TickIcon } from "../../components/CustomFile/icons";
import { Checkbox, CheckboxIndicator } from "../../components/Ui/Checkbox";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PasswordOtpModal from "./PasswordOtpModal";
import PasswordSucessModal from "./PasswordSucessModal";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { toast } from "../../services/toast";
import Loader from "../../components/Loader/loader";
import { EstatehubLogo } from "../../components/CustomFile/EstatehubLogo";
import home1 from "../../assets/img/home.png";
import home4 from "../../assets/img/home4.png";

const SHOWCASE_SLIDES = [
    {
        image: home1,
        tag: "GLOBAL DEVELOPER & AGENCY SUITE",
        title: "The Professional Real Estate Ecosystem",
        desc: "Empowering premier developers, boutique agencies, and certified brokerages with institutional-grade management tools."
    },
    {
        image: home4,
        tag: "CURATED PORTFOLIO MANAGEMENT",
        title: "Intelligent Lead & Inventory Control",
        desc: "Seamlessly allocate units, track investor inquiries, and maximize international property reach across prime markets."
    }
];

function Login() {
    const navigate = useNavigate();
    const { login, session, isAuthenticated } = useAuth();
    const [currentSlide, setCurrentSlide] = useState(0);
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

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % SHOWCASE_SLIDES.length);
        }, 6000);
        return () => clearInterval(timer);
    }, []);

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
        <div className="h-screen w-full flex overflow-hidden bg-[#FBFBFA]">
            {/* Left Hero Showcase */}
            <div className="hidden lg:flex lg:flex-[6] relative h-full bg-[#0F1E29] overflow-hidden select-none">
                {/* Background Image Carousel with Smooth Fade */}
                {SHOWCASE_SLIDES.map((slide, idx) => (
                    <div
                        key={idx}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentSlide ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"}`}
                        style={{ transitionProperty: "opacity, transform", transitionDuration: "1200ms" }}
                    >
                        <img
                            src={slide.image}
                            alt="Estatehub Architectural Showcase"
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}

                {/* Elegant Dark Vignette & Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B151D] via-[#0B151D]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B151D]/80 via-transparent to-[#0B151D]/40" />

                {/* Hero Header Badge */}
                <div className="absolute top-10 left-10 z-10">
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/15">
                        <span className="w-2 h-2 rounded-full bg-[#D4A373] animate-pulse" />
                        <span className="text-[12px] font-[Bold] tracking-widest text-[#F5F0E8] uppercase">
                            Estatehub Partner Portal
                        </span>
                    </div>
                </div>

                {/* Hero Bottom Content */}
                <div className="absolute bottom-12 left-10 right-10 z-10 flex flex-col gap-5 text-white">
                    <div className="flex flex-col gap-2">
                        <span className="text-[11px] font-[Bold] tracking-[3px] text-[#D4A373] uppercase">
                            {SHOWCASE_SLIDES[currentSlide].tag}
                        </span>
                        <h1 className="text-[32px] xl:text-[36px] font-[Bold] leading-[1.2] text-[#FFFFFF] tracking-tight max-w-[540px]">
                            {SHOWCASE_SLIDES[currentSlide].title}
                        </h1>
                        <p className="text-[14px] text-white/75 font-[Regular] leading-relaxed max-w-[500px]">
                            {SHOWCASE_SLIDES[currentSlide].desc}
                        </p>
                    </div>

                    {/* Indicators and Stats */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/15 mt-2">
                        {/* Slide Indicators */}
                        <div className="flex items-center gap-2">
                            {SHOWCASE_SLIDES.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentSlide(i)}
                                    aria-label={`Go to slide ${i + 1}`}
                                    className={`h-[4px] rounded-full transition-all duration-500 ${i === currentSlide ? "w-[32px] bg-[#D4A373]" : "w-[12px] bg-white/30 hover:bg-white/60"}`}
                                />
                            ))}
                        </div>

                        {/* Partner Portal Metric Highlights */}
                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <div className="text-[16px] font-[Bold] text-[#F5F0E8] leading-tight">100%</div>
                                <div className="text-[11px] font-[Medium] text-white/60">Verified Network</div>
                            </div>
                            <div className="w-[1px] h-6 bg-white/20" />
                            <div className="text-right">
                                <div className="text-[16px] font-[Bold] text-[#D4A373] leading-tight">Global</div>
                                <div className="text-[11px] font-[Medium] text-white/60">Market Presence</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Form Card */}
            <div className="flex-[6] h-full bg-[#0A0A0A] p-6 sm:p-10 md:p-14 overflow-y-auto scrollbar-hide flex flex-col justify-between">
                {/* Top bar with Official Estatehub Monogram */}
                <div className="flex items-center justify-between mb-8 w-full max-w-[480px] mx-auto">
                    <div className="flex items-center">
                        <EstatehubLogo width="175" height="42" subtitle="PARTNER PORTAL" variant="dark" />
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
                            className="flex items-center gap-2 text-[#A89880] hover:text-[#C9A96E] transition-colors group cursor-pointer"
                        >
                            <div className="bg-[#171717] border border-[#2A2A2A] group-hover:border-[#C9A96E]/50 rounded-full w-[26px] h-[26px] flex items-center justify-center transition-colors">
                                <BackIcon className="w-[10px] h-[10px] text-[#A89880] group-hover:text-[#C9A96E]" />
                            </div>
                            <span className="font-[Bold] text-[13px]">Back to login</span>
                        </button>
                    )}
                </div>

                {/* Center Card */}
                <div className="flex items-center justify-center my-auto w-full">
                    <div className="w-full max-w-[440px] bg-[#141414] lg:p-10 p-6 rounded-[24px] shadow-[0_16px_50px_rgba(0,0,0,0.6)] border border-[#2A2A2A]">
                        <div className="relative">
                            {isLoggingIn && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-[24px]">
                                    <Loader size={72} margin={0} />
                                </div>
                            )}

                            {/* Sign in with email */}
                            {!showForgotPassword && (
                                <>
                                    <div className="flex flex-col items-start mb-7">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C9A96E]/10 border border-[#C9A96E]/20 text-[#C9A96E] text-[11px] font-[Bold] tracking-wider uppercase mb-3">
                                            <span>Secure Authentication</span>
                                        </div>
                                        <h2 className="font-[Bold] text-[#F5F0E8] text-[28px] tracking-tight mb-1">
                                            Sign in to Portal
                                        </h2>
                                        <p className="font-[Regular] text-[#A89880] text-[14px]">
                                            Welcome back. Enter your verified credentials to continue.
                                        </p>
                                    </div>

                                    <form
                                        className="w-full flex flex-col gap-4 mb-6"
                                        onSubmit={handleLogin}
                                        noValidate
                                    >
                                        {/* Email */}
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="login-email" className="text-[12px] font-[Bold] text-[#C9A96E] uppercase tracking-wider">
                                                Email Address
                                            </label>
                                            <input
                                                id="login-email"
                                                type="email"
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value)}
                                                autoComplete="email"
                                                className="border-[#2A2A2A] border bg-[#1A1A1A] focus:bg-[#202020] rounded-[12px] p-[16px_16px] text-[14px] font-[Regular] text-[#F5F0E8] outline-none transition-all focus:border-[#C9A96E] focus:ring-2 focus:ring-[#C9A96E]/15 placeholder:text-[#6B6259] w-full"
                                                placeholder="partner@estatehub.com"
                                            />
                                        </div>

                                        {/* Password */}
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="login-password" className="text-[12px] font-[Bold] text-[#C9A96E] uppercase tracking-wider">
                                                Password
                                            </label>
                                            <div className="relative">
                                                <input
                                                    id="login-password"
                                                    type={showPasswordText ? "text" : "password"}
                                                    value={password}
                                                    onChange={(event) => setPassword(event.target.value)}
                                                    placeholder="••••••••••••"
                                                    autoComplete="current-password"
                                                    className="w-full border border-[#2A2A2A] bg-[#1A1A1A] focus:bg-[#202020] rounded-[12px] p-[16px_16px] text-[14px] font-[Medium] text-[#F5F0E8] outline-none transition-all focus:border-[#C9A96E] focus:ring-2 focus:ring-[#C9A96E]/15 placeholder:text-[#6B6259]"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswordText(!showPasswordText)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A89880] hover:text-[#C9A96E] focus:outline-none cursor-pointer transition-colors"
                                                >
                                                    {showPasswordText ? <EyeIcon width={18} height={18} /> : <EyeCloseIcon width={18} height={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Remember Me & Forgot Password */}
                                        <div className="flex items-center justify-between pt-1">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="remember"
                                                    checked={rememberMe}
                                                    onCheckedChange={(value) => setRememberMe(value === true)}
                                                    className="flex h-[16px] w-[16px] items-center justify-center rounded-[4px] border border-[#2A2A2A] bg-[#1A1A1A] text-black data-[state=checked]:bg-[#C9A96E] data-[state=checked]:border-[#C9A96E] cursor-pointer transition-colors"
                                                >
                                                    <CheckboxIndicator>
                                                        <TickIcon className="mt-[-1px] text-black" />
                                                    </CheckboxIndicator>
                                                </Checkbox>
                                                <label
                                                    htmlFor="remember"
                                                    className="cursor-pointer font-[Medium] text-[13px] text-[#A89880] select-none hover:text-[#F5F0E8] transition-colors"
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
                                                className="cursor-pointer font-[Bold] text-[13px] text-[#C9A96E] hover:text-[#E4C98B] transition-colors"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={isLoggingIn}
                                            className="cursor-pointer bg-[#C9A96E] hover:bg-[#E4C98B] active:scale-[0.99] w-full text-[14px] font-[Bold] tracking-wide text-[#0A0A0A] py-4 px-6 rounded-[12px] shadow-lg shadow-[#C9A96E]/20 transition-all disabled:opacity-60 mt-2"
                                        >
                                            {isLoggingIn ? "Authenticating..." : "Sign in to Dashboard"}
                                        </button>

                                        {loginError && (
                                            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-[10px]">
                                                <p className="text-[12px] font-[Medium] text-rose-400 text-center">{loginError}</p>
                                            </div>
                                        )}
                                    </form>

                                    <div className="pt-5 border-t border-[#2A2A2A] text-center">
                                        <p className="text-[12px] font-[Regular] text-[#A89880] leading-relaxed">
                                            <strong className="font-[Bold] text-[#F5F0E8]">Authorized Access Only:</strong> Dedicated gateway for registered Developers, Agencies, and Certified Agents.
                                        </p>
                                    </div>
                                </>
                            )}

                            {/* Forgot password */}
                            {showForgotPassword && !showChangePassword && (
                                <>
                                    <div className="flex flex-col items-start mb-6">
                                        <h2 className="font-[Bold] text-[#1F3D51] text-[26px] tracking-tight mb-1">
                                            Reset Password
                                        </h2>
                                        <p className="font-[Regular] text-[#707070] text-[13px]">
                                            Enter your registered email address to receive a secure one-time verification code.
                                        </p>
                                    </div>

                                    <form
                                        className="w-full flex flex-col gap-4 mb-6"
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
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="email" className="text-[12px] font-[Bold] text-[#1F3D51] uppercase tracking-wider">
                                                Registered Email
                                            </label>
                                            <input
                                                id="email"
                                                type="email"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                className="border-[#E4E4E2] border bg-[#FBFBFA] focus:bg-white rounded-[12px] p-[16px_16px] text-[14px] font-[Regular] text-[#1F3D51] outline-none transition-all focus:border-[#D4A373] focus:ring-2 focus:ring-[#D4A373]/15 placeholder:text-[#A0A0A0] w-full"
                                                placeholder="partner@estatehub.com"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSendingOtp}
                                            className="cursor-pointer bg-[#1F3D51] hover:bg-[#152B39] w-full text-[14px] font-[Bold] text-white py-4 px-6 rounded-[12px] shadow-sm transition-all disabled:opacity-60 mt-1"
                                        >
                                            {isSendingOtp ? "Sending code..." : "Get Verification Code"}
                                        </button>

                                        {forgotError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-[10px]">
                                                <p className="text-[12px] font-[Medium] text-red-600 text-center">
                                                    {forgotError}
                                                </p>
                                            </div>
                                        )}
                                    </form>

                                    <div className="text-center pt-4 border-t border-[#F0F0EE] flex items-center justify-center gap-1.5">
                                        <span className="font-[Regular] text-[13px] text-[#707070]">Remembered your credentials?</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowForgotPassword(false);
                                                setShowChangePassword(false);
                                                setForgotError(null);
                                                setOtpError(null);
                                                setResetError(null);
                                            }}
                                            className="font-[Bold] text-[13px] text-[#D4A373] hover:text-[#B68453] cursor-pointer transition-colors"
                                        >
                                            Back to login
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Change Password */}
                            {showChangePassword && (
                                <>
                                    <div className="flex flex-col items-start mb-6">
                                        <h2 className="font-[Bold] text-[#1F3D51] text-[26px] tracking-tight mb-1">
                                            Set New Password
                                        </h2>
                                        <p className="font-[Regular] text-[#707070] text-[13px]">
                                            Create a strong password with at least 6 characters.
                                        </p>
                                    </div>

                                    <form
                                        className="w-full flex flex-col gap-4 mb-6"
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
                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="enter_new_password" className="text-[12px] font-[Bold] text-[#1F3D51] uppercase tracking-wider">
                                                New Password
                                            </label>
                                            <input
                                                id="enter_new_password"
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="border-[#E4E4E2] border bg-[#FBFBFA] focus:bg-white rounded-[12px] p-[16px_16px] text-[14px] font-[Regular] text-[#1F3D51] outline-none transition-all focus:border-[#D4A373] focus:ring-2 focus:ring-[#D4A373]/15 placeholder:text-[#A0A0A0] w-full"
                                                placeholder="••••••••••••"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label htmlFor="confirm_new_password" className="text-[12px] font-[Bold] text-[#1F3D51] uppercase tracking-wider">
                                                Confirm New Password
                                            </label>
                                            <input
                                                id="confirm_new_password"
                                                type="password"
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                className="border-[#E4E4E2] border bg-[#FBFBFA] focus:bg-white rounded-[12px] p-[16px_16px] text-[14px] font-[Regular] text-[#1F3D51] outline-none transition-all focus:border-[#D4A373] focus:ring-2 focus:ring-[#D4A373]/15 placeholder:text-[#A0A0A0] w-full"
                                                placeholder="••••••••••••"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isResettingPassword}
                                            className="cursor-pointer bg-[#1F3D51] hover:bg-[#152B39] w-full text-[14px] font-[Bold] text-white py-4 px-6 rounded-[12px] shadow-sm transition-all disabled:opacity-60 mt-1"
                                        >
                                            {isResettingPassword ? "Updating password..." : "Confirm & Save"}
                                        </button>

                                        {resetError && (
                                            <div className="p-3 bg-red-50 border border-red-200 rounded-[10px]">
                                                <p className="text-[12px] font-[Medium] text-red-600 text-center">
                                                    {resetError}
                                                </p>
                                            </div>
                                        )}
                                    </form>

                                    <div className="text-center pt-4 border-t border-[#F0F0EE] flex items-center justify-center gap-1.5">
                                        <span className="font-[Regular] text-[13px] text-[#707070]">Remembered your password?</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowForgotPassword(false);
                                                setShowChangePassword(false);
                                            }}
                                            className="font-[Bold] text-[13px] text-[#D4A373] hover:text-[#B68453] cursor-pointer transition-colors"
                                        >
                                            Back to login
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Copyright */}
                <div className="w-full max-w-[480px] mx-auto pt-6 text-center">
                    <p className="text-[12px] font-[Regular] text-[#999999]">
                        © {new Date().getFullYear()} Estatehub Real Estate Ecosystem. All rights reserved.
                    </p>
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