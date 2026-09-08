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
            className={`flex  items-center rounded-[15px] ${isEmbedded ? "p-[0px]" : "p-[18px]"}`}
            style={
                isEmbedded
                    ? undefined
                    : {
                        backgroundImage: `url(${mainbg})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }
            }
        >
            <div className="w-full overflow-x-auto scrollbar-hide flex items-center justify-between gap-4">
                <div onClick={onBackClick} className="cursor-pointer flex items-center md:gap-[20px] gap-[14px] shrink-0 w-fit">
                    {showBack && <LeftArrowWhiteIcon width={15} height={isMdUp ? 27 : 17} onClick={onBackClick} />}
                    <h1 className="text-[#FFF] font-[Bold] md:text-[28px] text-[20px] leading-[100%] shrink-0">{title}</h1>
                </div>
                <div className="flex items-center gap-3">
                    {verified ? (
                        <div
                            className="text-[12px] text-[#FFF] font-[Medium] border-2 border-[#00A663] bg-[rgba(0,166,99,0.2)] flex px-[10px] h-[40px] items-center justify-center rounded-full"
                            role="status"
                            aria-label="Verified agent"
                        >
                            <VerifiedIcon className="w-[20px] h-[20px]" />
                            <span className="ml-[8px]">Verified</span>
                        </div>
                    ) : null}
                    <button className="cursor-pointer flex p-[10px] items-center justify-center rounded-full bg-[#FFF]">
                        <SettingIcon className="w-[20px] h-[20px]" />
                    </button>
                    <button
                        onClick={() => navigate("/agent/notification")}
                        type="button"
                        className="cursor-pointer relative flex p-[10px] items-center justify-center rounded-full bg-[#FFF]"
                    >
                        <NotificationIcon className="w-[20px] h-[20px]" />
                        {unreadNotificationCount > 0 && (
                            <div className="absolute top-[4px] right-[4px] min-w-[17px] h-[17px] px-[4px] bg-[#D4A373] rounded-full flex items-center justify-center">
                                <p className="text-[#fff] text-[10px] font-[Bold] leading-none">
                                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                                </p>
                            </div>
                        )}
                    </button>
                    <div className="relative flex-shrink-0 cursor-pointer flex items-center rounded-full border-2 border-[rgba(255,255,255,0.10)] bg-[rgba(34,34,34,0.10)] shadow-[2px_0_15px_0_rgba(0,0,0,0.15)]" onClick={() => navigate("/agent/profile")}>
                        <img src={avatarSrc} alt="" className="w-[40px] h-[40px] rounded-full object-cover" />
                        <div
                            className={`absolute flex-shrink-0 w-[23px] h-[23px] flex items-center justify-center ${isSuperAgent ? "bg-[#D4A373]" : "bg-[#0832AE]"} border border-[#222] rounded-full top-[-1px] right-[-4px] z-10`}
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