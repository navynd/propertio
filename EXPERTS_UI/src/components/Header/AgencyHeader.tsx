import { useState, useEffect } from "react";
import { VerifiedIcon, SettingIcon, NotificationIcon, LeftArrowWhiteIcon } from "../CustomFile/icons";
import profileimg from "../../assets/img/C12.jpg";
import { KingIcon } from "../CustomFile/icons";
import { useLocation } from "react-router-dom";
import mainbg from "../../assets/img/mainbg.png";
import { useAgencyLayout } from "../../context/AgencyLayoutContext";
import { useNavigate } from "react-router-dom";
import { agencyService } from "../../services/agencyService";

export type AgencyHeaderProps = {
  title: string;
  showBack: boolean;
  onBackClick: () => void;
  /** Resolved avatar URL; overrides context when set (e.g. Storybook). */
  profileImage?: string | null;
  /** Verification badge; overrides context when set. */
  verified?: boolean;
};

const AgencyHeader = ({
  title,
  showBack,
  onBackClick,
  profileImage: profileImageProp,
  verified: verifiedProp,
}: AgencyHeaderProps) => {
  const navigate = useNavigate();
  const [isMdUp, setIsMdUp] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const location = useLocation();
  const isDashboard = location.pathname === "/agency/dashboard";
  const isAgencyPage = location.pathname.startsWith("/agency");
  const { shellHeader } = useAgencyLayout();
  const profileImage =
    profileImageProp !== undefined ? profileImageProp : shellHeader.profileImage;
  const verified = verifiedProp !== undefined ? verifiedProp : shellHeader.verified;
  const avatarSrc = profileImage?.trim() ? profileImage : profileimg;

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsMdUp(mql.matches);
    sync();
    mql.addEventListener("change", sync);
    return () => mql.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!isAgencyPage) return;
    let mounted = true;
    agencyService
      .getProfile()
      .then((profile) => {
        if (!mounted) return;
        const count = Number(profile?.unreadNotificationCount);
        setUnreadNotificationCount(
          Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
        );
      })
      .catch(() => {
        if (!mounted) return;
        setUnreadNotificationCount(0);
      });
    return () => {
      mounted = false;
    };
  }, [isAgencyPage, location.pathname]);

  return (
    <div
      className={`${isDashboard ? "p-[0px]" : "p-[16px_24px] min-h-[76px]"} rounded-[20px] flex items-center shadow-2xl relative overflow-hidden`}
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
      <div className="w-full overflow-x-auto scrollbar-hide flex items-center justify-between gap-4 z-10">
        <div
          onClick={onBackClick}
          className="cursor-pointer flex items-center md:gap-[18px] gap-[12px] shrink-0 w-fit"
        >
          {showBack && (
            <button
              type="button"
              aria-label="Back"
              className="w-[36px] h-[36px] rounded-full bg-[#171717]/80 hover:bg-[#2A2A2A] backdrop-blur-md border border-[#2A2A2A] flex items-center justify-center transition-transform active:scale-95 text-[#F5F0E8]"
            >
              <LeftArrowWhiteIcon width={14} height={isMdUp ? 20 : 14} onClick={onBackClick} />
            </button>
          )}
          <h1 className="text-[#F5F0E8] font-[Bold] md:text-[26px] text-[20px] leading-[100%] shrink-0">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {verified ? (
            <div
              className="text-[12px] text-[#4ADE80] font-[SemiBold] border border-[#4ADE80]/30 bg-[#4ADE80]/10 flex px-[14px] h-[38px] items-center justify-center rounded-full backdrop-blur-sm"
              role="status"
              aria-label="Verified agency"
            >
              <VerifiedIcon className="w-[18px] h-[18px]" />
              <span className="ml-[6px]">Verified</span>
            </div>
          ) : null}
          <button
            type="button"
            className="cursor-pointer flex w-[38px] h-[38px] items-center justify-center rounded-full bg-[#171717] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-[#A89880] hover:text-[#F5F0E8] transition-colors"
          >
            <SettingIcon className="w-[18px] h-[18px]" />
          </button>
          <button
            onClick={() => navigate("/agency/notification")}
            type="button"
            className="cursor-pointer relative flex w-[38px] h-[38px] items-center justify-center rounded-full bg-[#171717] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-[#A89880] hover:text-[#F5F0E8] transition-colors"
          >
            <NotificationIcon className="w-[18px] h-[18px]" />
            {unreadNotificationCount > 0 && (
              <div className="absolute top-[2px] right-[2px] min-w-[16px] h-[16px] px-[4px] bg-[#C9A96E] rounded-full flex items-center justify-center shadow-md">
                <p className="text-[#0A0A0A] text-[9px] font-[Bold] leading-none">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </p>
              </div>
            )}
          </button>
          <div className="relative flex-shrink-0 cursor-pointer flex items-center rounded-full border-2 border-[#C9A96E]/40 bg-[#171717] shadow-lg" onClick={() => navigate("/agency/profile")}>
            <img src={avatarSrc} alt="" className="w-[40px] h-[40px] rounded-full object-cover" />
            <div className="absolute flex-shrink-0 w-[22px] h-[22px] flex items-center justify-center border border-[#C9A96E] rounded-full top-[-2px] right-[-2px] z-10 bg-[#0A0A0A]">
              <KingIcon className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyHeader;
