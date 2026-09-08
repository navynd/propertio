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
      className={`${isDashboard ? "p-[0px]" : "p-[18px] min-h-[80px]"} rounded-[15px]  flex items-center`}
      style={
        !isDashboard
          ? {
            backgroundImage: `url(${mainbg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
          : {}
      }
    >
      <div className="w-full overflow-x-auto scrollbar-hide flex items-center justify-between gap-4">
        <div
          onClick={onBackClick}
          className="cursor-pointer flex items-center md:gap-[20px] gap-[14px] shrink-0 w-fit"
        >
          {showBack && (
            <LeftArrowWhiteIcon width={15} height={isMdUp ? 27 : 17} onClick={onBackClick} />
          )}
          <h1 className="text-[#FFF] font-[Bold] md:text-[28px] text-[20px] leading-[100%] shrink-0">
            {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {verified ? (
            <div
              className="text-[12px] text-[#FFF] font-[Medium] border-2 border-[#00A663] bg-[rgba(0,166,99,0.2)] flex p-[10px] h-[40px] items-center justify-center rounded-full"
              role="status"
              aria-label="Verified agency"
            >
              <VerifiedIcon className="w-[20px] h-[20px]" />
              <span className="ml-[8px]">Verified</span>
            </div>
          ) : null}
          <button
            type="button"
            className="cursor-pointer flex p-[10px] items-center justify-center rounded-full bg-[#FFF]"
          >
            <SettingIcon className="w-[20px] h-[20px]" />
          </button>
          <button
            onClick={() => navigate("/agency/notification")}
            type="button"
            className="cursor-pointer relative flex p-[10px] items-center justify-center rounded-full bg-[#FFF]"
          >
            <NotificationIcon className="w-[20px] h-[20px]" />
            {unreadNotificationCount > 0 && (
              <div className="absolute top-[4px] right-[4px] min-w-[17px] h-[17px] px-[4px] bg-[#EA3934] rounded-full flex items-center justify-center">
                <p className="text-[#fff] text-[10px] font-[Bold] leading-none">
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </p>
              </div>
            )}
          </button>
          <div className="relative flex-shrink-0 cursor-pointer flex items-center rounded-full border-2 border-[rgba(255,255,255,0.10)] bg-[rgba(34,34,34,0.10)] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)]" onClick={() => navigate("/agency/profile")}>
            <img src={avatarSrc} alt="" className="w-[40px] h-[40px] rounded-full object-cover" />
            <div className="absolute flex-shrink-0 w-[24px] h-[24px] flex items-center justify-center border-1 border-[#FFCB2B] rounded-full top-[-2px] right-[-2px] z-10">
              <KingIcon className="w-full h-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgencyHeader;
