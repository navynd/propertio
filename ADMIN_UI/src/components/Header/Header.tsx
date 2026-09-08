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
        <div className="bg-transparent border-b border-[#ECECEC] pb-[16px] mb-[24px] w-full">
            <div className="w-full overflow-x-auto scrollbar-hide flex items-center justify-between gap-4">
                <div onClick={onBackClick} className="cursor-pointer flex items-center md:gap-[20px] gap-[14px] shrink-0 w-fit">
                    {showBack && (
                        <div className="p-2 hover:bg-[#F5F5F5] rounded-full transition-colors">
                            <LeftArrowWhiteIcon 
                                width={15} 
                                height={isMdUp ? 23 : 17} 
                                stroke="#222222" 
                                fill="#222222"
                                onClick={onBackClick} 
                            />
                        </div>
                    )}
                    <h1 className="text-[#222222] font-[Bold] md:text-[26px] text-[20px] leading-[100%] shrink-0">{title}</h1>
                </div>
                <div className="flex items-center gap-3">
                    <h4 className="text-[14px] font-[Medium] text-[#707070] hidden sm:block">Admin Portal</h4>
                    <div className="flex-shrink-0 cursor-pointer flex items-center rounded-full border border-[#ECECEC] p-[2px]">
                        <img src={profileimg} alt="img" className="w-[36px] h-[36px] rounded-full shrink-0 object-cover" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;