import { useState, useEffect } from "react";
import { VerifiedIcon, SettingIcon, NotificationIcon, LeftArrowWhiteIcon } from "../CustomFile/icons";
import mainbg from "../../assets/img/mainbg.png";
import { useLocation, useNavigate } from "react-router-dom";
import profileimg from '../../assets/img/profileimg.png'
import { developerService } from "../../services/developerService";
import { API_BASE_URL } from "../../services/apiClient";
type DeveloperHeaderProps = {
    title: string;
    showBack: boolean;
    onBackClick: () => void;
    profileImage?: string | null;
    verified?: boolean;
};

const DeveloperHeader = ({ title, showBack, onBackClick, profileImage, verified }: DeveloperHeaderProps) => {
    const navigate = useNavigate();
    const [isMdUp, setIsMdUp] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [headerImage, setHeaderImage] = useState(profileimg);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const location = useLocation();
    const isDashboard = location.pathname === "/developer/dashboard";
    const isDeveloperPage = location.pathname.startsWith("/developer");
    useEffect(() => {
        const mql = window.matchMedia("(min-width: 768px)");
        const sync = () => setIsMdUp(mql.matches);
        sync();
        mql.addEventListener("change", sync);
        return () => mql.removeEventListener("change", sync);
    }, []);

    useEffect(() => {
        if (!isDeveloperPage) return;
        let mounted = true;
        const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
        const fallbackBase = `${fallbackOrigin}/uploads/img/developer/`;

        const resolveImageBase = async () => {
            try {
                const data = await developerService.getSupportedUrlsMasterData();
                const source =
                    (data.supportedUrls as Record<string, unknown>) ||
                    (data.supportedurls as Record<string, unknown>) ||
                    {};
                const developerUrl =
                    (source.developerUrl as Record<string, unknown>) ||
                    (source.developerurl as Record<string, unknown>) ||
                    {};
                return String(developerUrl.img || fallbackBase).replace(/\/?$/, "/");
            } catch {
                return fallbackBase;
            }
        };

        Promise.all([developerService.getProfile(), resolveImageBase()])
            .then(([profile, imageBase]) => {
                if (!mounted) return;
                const profileRecord = (profile || {}) as Record<string, unknown>;
                if (typeof verified !== "boolean") {
                    setIsVerified(Boolean(profileRecord.isVerified));
                }
                const count = Number(profileRecord.unreadNotificationCount);
                setUnreadNotificationCount(
                    Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
                );
                const pic = String(profileRecord.profilePicture || profileRecord.logo || "").trim();
                if (pic && !profileImage) {
                    const picUrl = pic.startsWith("http://") || pic.startsWith("https://")
                        ? pic
                        : `${imageBase}${pic.includes("/") ? pic.split("/").pop() || pic : pic}`;
                    setHeaderImage(picUrl);
                }
            })
            .catch(() => undefined);

        return () => {
            mounted = false;
        };
    }, [isDeveloperPage, profileImage, verified, location.pathname]);

    useEffect(() => {
        if (typeof verified === "boolean") {
            setIsVerified(verified);
        }
    }, [verified]);

    useEffect(() => {
        if (typeof profileImage === "string" && profileImage.trim()) {
            setHeaderImage(profileImage);
        }
    }, [profileImage]);
    return (
        <div className={`${isDashboard ? "p-0" : "p-[16px_24px] min-h-[76px]"} rounded-[20px] flex items-center shadow-2xl relative overflow-hidden`}
            style={
                !isDashboard
                    ? {
                        backgroundImage: `linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(23, 23, 23, 0.90) 100%), url(${mainbg})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }
                    : {}
            }
        >
            <div className="w-full flex items-center justify-between gap-4 z-10">
                <div onClick={onBackClick} className="cursor-pointer flex items-center md:gap-[18px] gap-[12px] shrink-0">
                    {showBack && (
                        <button
                            type="button"
                            aria-label="Back"
                            className="w-[36px] h-[36px] rounded-full bg-[#171717]/80 hover:bg-[#2A2A2A] backdrop-blur-md border border-[#2A2A2A] flex items-center justify-center transition-transform active:scale-95 text-[#F5F0E8]"
                        >
                            <LeftArrowWhiteIcon width={14} height={isMdUp ? 20 : 14} />
                        </button>
                    )}
                    <div>
                        <h1 className="text-[#F5F0E8] font-[Bold] md:text-[26px] text-[18px] tracking-tight leading-tight shrink-0 drop-shadow-sm">{title}</h1>
                        <p className="text-[#C9A96E] text-[11px] font-[Medium] hidden sm:block tracking-wider uppercase">Estatehub Partner Suite</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <button className={`text-[12px] font-[SemiBold] border cursor-pointer flex px-3.5 h-[38px] items-center justify-center rounded-full backdrop-blur-md transition-all shadow-sm ${isVerified
                        ? "text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10 hover:bg-[#4ADE80]/20"
                        : "text-[#A89880] border-[#2A2A2A] bg-[#171717] hover:bg-[#2A2A2A]"
                        }`}>
                        {isVerified && <VerifiedIcon className="w-[16px] h-[16px] text-[#4ADE80]" />}
                        <span className={isVerified ? "ml-[6px]" : ""}>{isVerified ? "Verified Partner" : "Unverified"}</span>
                    </button>
                    <button
                        onClick={() => navigate('/developer/profile')}
                        title="Settings"
                        className="cursor-pointer w-[38px] h-[38px] rounded-full bg-[#171717]/80 hover:bg-[#2A2A2A] backdrop-blur-md border border-[#2A2A2A] flex items-center justify-center transition-all text-[#F5F0E8] hover:scale-105"
                    >
                        <SettingIcon className="w-[18px] h-[18px]" />
                    </button>
                    <button
                        onClick={() => navigate('/developer/notification')}
                        title="Notifications"
                        className="cursor-pointer relative w-[38px] h-[38px] rounded-full bg-[#171717]/80 hover:bg-[#2A2A2A] backdrop-blur-md border border-[#2A2A2A] flex items-center justify-center transition-all text-[#F5F0E8] hover:scale-105"
                    >
                        <NotificationIcon className="w-[18px] h-[18px]" />
                        {unreadNotificationCount > 0 && (
                            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#C9A96E] text-[#0A0A0A] font-[Bold] text-[10px] rounded-full flex items-center justify-center shadow-md animate-pulse">
                                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                            </div>
                        )}
                    </button>
                    <div
                        onClick={() => navigate("/developer/profile")}
                        className="flex-shrink-0 cursor-pointer p-0.5 rounded-full ring-2 ring-[#C9A96E]/60 hover:ring-[#C9A96E] transition-all"
                    >
                        <img src={headerImage} alt="Profile" className="w-[36px] h-[36px] rounded-full object-cover shadow-md" />
                    </div>
                </div>
            </div>
        </div>

    );
};

export default DeveloperHeader;