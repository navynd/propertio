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
        <div className={`${isDashboard ? "p-[0px]" : "p-[20px] min-h-[80px]"} rounded-[15px]  flex items-center`}
            style={
                !isDashboard
                    ? {
                        backgroundImage: `url(${mainbg})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        height: "80px",
                    }
                    : {}
            }
        >
            <div className="w-full overflow-x-auto scrollbar-hide flex items-center justify-between gap-4">
                <div onClick={onBackClick} className="cursor-pointer flex items-center md:gap-[20px] gap-[14px] shrink-0 w-fit">
                    {showBack && <LeftArrowWhiteIcon width={15} height={isMdUp ? 27 : 17} onClick={onBackClick} />}
                    <h1 className="text-[#FFF] font-[Bold] md:text-[28px] text-[20px] leading-[100%] shrink-0">{title}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button className={`text-[12px] font-[Medium] border-2 cursor-pointer flex p-[10px] h-[44px] items-center justify-center rounded-full ${isVerified
                        ? "text-[#FFF] border-[#00A663] bg-[rgba(0,166,99,0.20)]"
                        : "text-[#FFF] border-[rgba(255,255,255,0.30)] bg-[rgba(34,34,34,0.20)]"
                        }`}>
                        {isVerified && <VerifiedIcon className="w-[20px] h-[20px]" />}
                        <span className={isVerified ? "ml-[8px]" : ""}>{isVerified ? "Verified" : "Unverified"}</span>
                    </button>
                    <button className="cursor-pointer flex p-[10px] items-center justify-center rounded-full bg-[#FFF]">
                        <SettingIcon className="w-[20px] h-[20px]" />
                    </button>
                    <button onClick={() => navigate('/developer/notification')} className="cursor-pointer relative flex p-[10px] items-center justify-center rounded-full bg-[#FFF]">
                        <NotificationIcon className="w-[20px] h-[20px]" />
                        {unreadNotificationCount > 0 && (
                            <div className="absolute top-[4px] right-[4px] min-w-[17px] h-[17px] px-[4px] bg-[#EA3934] rounded-full flex items-center justify-center">
                                <p className="text-[#fff] text-[10px] font-[Bold] leading-none">
                                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                                </p>
                            </div>
                        )}
                    </button>
                    <div onClick={() => navigate("/developer/profile")} className="flex-shrink-0 cursor-pointer flex items-center rounded-full border-2 border-[rgba(255,255,255,0.10)] bg-[rgba(34,34,34,0.10)] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)]">
                        <img src={headerImage} alt="img" className="w-[40px] h-[40px] rounded-full object-cover" />
                    </div>
                </div>
            </div>
        </div>

    );
};

export default DeveloperHeader;