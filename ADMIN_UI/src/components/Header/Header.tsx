import { useState, useEffect } from "react";
import { LeftArrowWhiteIcon } from "../../assets/icons";
import { useLocation } from "react-router-dom";
import profileimg from '../../assets/img/profileless.png'

const Header = ({ title, showBack = false, onBackClick = () => {} }: { title: string, showBack?: boolean, onBackClick?: () => void }) => {
    const [isMdUp, setIsMdUp] = useState(false);
    const location = useLocation();
    
    useEffect(() => {
        const mql = window.matchMedia("(min-width: 768px)");
        const sync = () => setIsMdUp(mql.matches);
        sync();
        mql.addEventListener("change", sync);
        return () => mql.removeEventListener("change", sync);
    }, []);

    return (
        <div className="bg-transparent border-b border-[rgba(201,169,110,0.18)] pb-[18px] mb-[26px] w-full">
            <div className="w-full overflow-x-auto scrollbar-hide flex items-center justify-between gap-4">
                <div onClick={onBackClick} className="cursor-pointer flex items-center md:gap-[20px] gap-[14px] shrink-0 w-fit">
                    {showBack && (
                        <div className="p-2 hover:bg-[#1A1A1A] rounded-full transition-colors border border-transparent hover:border-[rgba(201,169,110,0.2)]">
                            <LeftArrowWhiteIcon 
                                width={15} 
                                height={isMdUp ? 23 : 17} 
                                stroke="#C9A96E" 
                                fill="#C9A96E"
                                onClick={onBackClick} 
                            />
                        </div>
                    )}
                    <h1 className="text-[#F5F0E8] font-['Playfair_Display',serif] font-bold md:text-[28px] text-[22px] tracking-tight shrink-0">{title}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[12px] font-[Medium] text-[#C9A96E] px-[12px] py-[4px] rounded-full bg-[rgba(201,169,110,0.08)] border border-[rgba(201,169,110,0.2)] hidden sm:inline-block">
                        Luxury Admin
                    </span>
                    <div className="flex-shrink-0 cursor-pointer flex items-center rounded-full border border-[rgba(201,169,110,0.35)] p-[2px] shadow-[0_0_10px_rgba(201,169,110,0.15)]">
                        <img src={profileimg} alt="img" className="w-[36px] h-[36px] rounded-full shrink-0 object-cover" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;