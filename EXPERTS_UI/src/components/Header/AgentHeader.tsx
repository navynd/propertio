import { useState, useEffect } from "react";
import { VerifiedIcon, SettingIcon, NotificationIcon, LeftArrowWhiteIcon } from "../CustomFile/icons";
import mainbg from "../../assets/img/mainbg.png";
import profileimg from '../../assets/img/user.png'
import superagentimg from '../../assets/img/Frame.svg'
import agentimg from '../../assets/img/Layer_26.svg'
import { useLocation, useNavigate } from "react-router-dom";
import { agentService } from "../../services/agentService";

export type AgentHeaderProps = {
    title: string;
    showBack: boolean;
    onBackClick: () => void;
    /** Resolved avatar URL (e.g. CDN + filename or blob URL). Omit for default placeholder. */
    profileImage?: string | null;
    /** Platform verification badge (e.g. agency-verified agent). */
    verified?: boolean;
    /** Corner badge styling: `superagent` vs `agent`. */
    agentType?: "agent" | "superagent";
    /**
     * `shell` — full hero bar with its own mainbg (global layout).
     * `embedded` — no background; sits inside a parent card that already uses mainbg.
     */
    variant?: "shell" | "embedded";
};

const AgentHeader = ({
    title,
    showBack,
    onBackClick,
    profileImage,
    verified = false,
    agentType = "agent",
    variant = "shell",
}: AgentHeaderProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMdUp, setIsMdUp] = useState(false);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const avatarSrc = profileImage?.trim() ? profileImage : profileimg;
    const isSuperAgent = agentType === "superagent";
    const isAgentPage = location.pathname.startsWith("/agent");

    useEffect(() => {
        const mql = window.matchMedia("(min-width: 768px)");
        const sync = () => setIsMdUp(mql.matches);
        sync();
        mql.addEventListener("change", sync);
        return () => mql.removeEventListener("change", sync);
    }, []);

    useEffect(() => {
        if (!isAgentPage) return;
        let mounted = true;
        agentService
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
    }, [isAgentPage, location.pathname]);
    const isEmbedded = variant === "embedded";
    return (
        <div
            className={`${isEmbedded ? "p-[0px]" : "p-[16px_24px] min-h-[76px]"} rounded-[20px] flex items-center shadow-2xl relative overflow-hidden`}
            style={
                !isEmbedded
                    ? {
                        backgroundImage: `linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(23, 23, 23, 0.90) 100%), url(${mainbg})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }
                    : {}
            }
        >
            <div className="w-full overflow-x-auto scrollbar-hide flex items-center justify-between gap-4 z-10">
                <div onClick={onBackClick} className="cursor-pointer flex items-center md:gap-[18px] gap-[12px] shrink-0 w-fit">
                    {showBack && (
                        <button
                            type="button"
                            aria-label="Back"
                            className="w-[36px] h-[36px] rounded-full bg-[#171717]/80 hover:bg-[#2A2A2A] backdrop-blur-md border border-[#2A2A2A] flex items-center justify-center transition-transform active:scale-95 text-[#F5F0E8]"
                        >
                            <LeftArrowWhiteIcon width={14} height={isMdUp ? 20 : 14} onClick={onBackClick} />
                        </button>
                    )}
                    <h1 className="text-[#F5F0E8] font-[Bold] md:text-[26px] text-[20px] leading-[100%] shrink-0">{title}</h1>
                </div>
                <div className="flex items-center gap-3">
                    {verified ? (
                        <div
                            className="text-[12px] text-[#4ADE80] font-[SemiBold] border border-[#4ADE80]/30 bg-[#4ADE80]/10 flex px-[14px] h-[38px] items-center justify-center rounded-full backdrop-blur-sm"
                            role="status"
                            aria-label="Verified agent"
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
                        onClick={() => navigate("/agent/notification")}
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
                    <div className="relative flex-shrink-0 cursor-pointer flex items-center rounded-full border-2 border-[#C9A96E]/40 bg-[#171717] shadow-lg" onClick={() => navigate("/agent/profile")}>
                        <img src={avatarSrc} alt="" className="w-[40px] h-[40px] rounded-full object-cover" />
                        <div
                            className={`absolute flex-shrink-0 w-[20px] h-[20px] flex items-center justify-center ${isSuperAgent ? "bg-[#C9A96E]" : "bg-[#1E293B]"} border border-[#2A2A2A] rounded-full top-[-1px] right-[-3px] z-10 shadow-sm`}
                            title={isSuperAgent ? "Super agent" : "Agent"}
                            aria-hidden
                        >
                            <img src={isSuperAgent ? superagentimg : agentimg} alt="" className="w-[8px] h-[11px] object-cover" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default AgentHeader;
// import { VerifiedIcon, SettingIcon, NotificationIcon } from "../CustomFile/icons";
// import profileimg from '../../assets/img/user.png'
// const AgentHeader = () => {
//     return (

//         <div className="flex items-center gap-3">
//             <button className="text-[12px] text-[#FFF] font-[Medium] border-2 border-[#00A663] bg-[rgba(0,166,99,0.2)] cursor-pointer flex p-[10px] h-[44px] items-center justify-center rounded-full bg-[#FFF]">
//                 <VerifiedIcon className="w-[20px] h-[20px]" /><span className="ml-[5px]"> Verified</span>
//             </button>
//             <button className="cursor-pointer flex p-[14px] items-center justify-center rounded-full bg-[#FFF]">
//                 <SettingIcon className="w-[20px] h-[20px]" />
//             </button>
//             <button className="cursor-pointer relative flex p-[14px] items-center justify-center rounded-full bg-[#FFF]">
//                 <NotificationIcon className="w-[20px] h-[20px]" />
//                 <div className="absolute top-[4px] right-[6px] bg-[#D4A373] rounded-full w-[18px] h-[18px] flex items-center justify-center">
//                     <p className="text-[#fff] text-[10px] font-[Bold]">2</p>
//                 </div>
//             </button>
//             <div className="flex-shrink-0 cursor-pointer flex items-center rounded-full border-2 border-[rgba(255,255,255,0.10)] bg-[rgba(34,34,34,0.10)] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)]">
//                 <img src={profileimg} alt="img" className="w-[46px] h-[46px] rounded-full object-cover" />
//             </div>
//         </div>
//     );
// };

// export default AgentHeader;