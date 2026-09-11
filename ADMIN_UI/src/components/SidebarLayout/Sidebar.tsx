import { useState, useEffect } from "react";
import { NavLink, Link, useLocation, matchPath, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogOverlay } from "../Ui/Dialog";
import { HamburgerMenuIcon, Cross2Icon } from "@radix-ui/react-icons";
import { DashboardIcon, AgentIcon, AllocationIcon, AllocationWhiteIcon, ListingIcon, LeadsIcon, LeadsWhiteIcon, SubscriptionIcon, ProfileIcon, LogoutIcon, DownArrowIcon } from '../../assets/icons'
import logo from '../../assets/img/logo.png'
import { authService } from "../../services/authService";
import { useSystemSettings } from "../../context/SystemSettingsContext";
import Loader from "../Loader/loader";

type NavItem = {
    icon: typeof DashboardIcon;
    path: string;
    label: string;
    hasDropdown?: boolean;
    subItems?: { path: string; label: string }[];
    activePaths?: string[];
};

const MASTER_DATA_PATHS = [
    "/listingtypes",
    "/propertytypes",
    "/amenities",
    "/jobtitles",
    "/languages",
    "/countries",
    "/propertylocations",
    "/projectlocations",
    "/blogcategories",
];

const LISTING_MANAGEMENT_PATHS = [
    "/listingproperty",
    "/listingproject",
    "/listingprojectinquiry",
    "/listingpropertyinquiry",
];

function getSubItemActivePaths(path: string): string[] {
    if (path === "/useraccount") return ["/useraccount", "/useraccountdetail"];
    if (path === "/developeraccount")
        return ["/developeraccount", "/developeraccountdetail", "/developeraccountview"];
    if (path === "/agencyaccount")
        return ["/agencyaccount", "/agencyaccountdetail", "/agencyaccountview"];
    if (path === "/agentaccount")
        return ["/agentaccount", "/agentaccountdetail", "/agentaccountview"];
    if (path === "/amenities") return ["/amenities", "/amenitiesdetail"];
    if (path === "/listingproperty")
        return ["/listingproperty", "/listingpropertydetail"];
    if (path === "/listingproject")
        return ["/listingproject", "/listingprojectdetail"];
    if (path === "/cmsteam") return ["/cmsteam", "/cmsteamdetail"];
    if (path === "/cmsblogs") return ["/cmsblogs", "/cmsblogdetail"];
    return [path];
}

function pathnameMatchesAny(pathname: string, paths: string[]) {
    return paths.some((p) => matchPath({ path: p, end: true }, pathname) != null);
}

function isNavSectionActive(item: NavItem, pathname: string): boolean {
    const subMatch = item.subItems?.some((sub) =>
        pathnameMatchesAny(pathname, getSubItemActivePaths(sub.path))
    );
    if (subMatch) return true;
    if (item.path === "/listing") {
        return pathnameMatchesAny(pathname, LISTING_MANAGEMENT_PATHS);
    }
    if (item.path === "/Master") {
        return pathnameMatchesAny(pathname, MASTER_DATA_PATHS);
    }
    return pathname.startsWith(item.path);
}

const navItems: NavItem[] = [
    { icon: DashboardIcon, path: "/dashboard", label: "Dashboard" },
    {
        icon: AllocationIcon,
        path: "/user",
        label: "Roles & Privileges",
        hasDropdown: true,
        subItems: [
            { path: "/useraccount", label: "User Account" },
            { path: "/developeraccount", label: "Developer Account" },
            { path: "/agencyaccount", label: "Agency Account" },
            { path: "/agentaccount", label: "Agent Account" },
        ]
    },
    {
        icon: ListingIcon,
        path: "/listing",
        label: "Listing Management",
        hasDropdown: true,
        subItems: [
            { path: "/listingproperty", label: "Listing Properties" },
            { path: "/listingproject", label: "Listing Projects" },
            // { path: "/listingprojectinquiry", label: "Listing Project Inquiries" },
            // { path: "/listingpropertyinquiry", label: "Listing Property Inquiries" },
        ]
    },
    {
        icon: ListingIcon,
        path: "/Master",
        label: "Master Data",
        hasDropdown: true,
        subItems: [
            { path: "/listingtypes", label: "Listing Types" },
            { path: "/propertytypes", label: "Property Types" },
            { path: "/amenities", label: "Amenities" },
            { path: "/jobtitles", label: "Agent Jobtitles" },
            { path: "/languages", label: "Agent Languages" },
            { path: "/countries", label: "Countries" },
            { path: "/propertylocations", label: "Property Locations" },
            { path: "/projectlocations", label: "Project Locations" },
            { path: "/blogcategories", label: "Blog Categories" },
        ]
    },
    {
        icon: LeadsIcon,
        path: "/cms",
        label: "CMS Management",
        hasDropdown: true,
        subItems: [
            { path: "/cmsaboutus", label: "About Us" },
            { path: "/cmsteam", label: "Our Team" },
            { path: "/cmstestimonials", label: "Testimonials" },
            { path: "/cmscontactus", label: "Contact Us" },
            { path: "/cmsblogs", label: "Blogs" },
            { path: "/cmslegal", label: "Legal Pages" },
            { path: "/banner", label: "Banner Management" },
            { path: "/cmssitemap", label: "Sitemap" },
            { path: "/seosetting", label: "SEO Settings" },
        ]
    },
    {
        icon: LeadsIcon,
        path: "/systemsettings",
        label: "System Settings",
        hasDropdown: true,
        subItems: [
            { path: "/currencymanagement", label: "Currency Management" },
            { path: "/sizesettings", label: "Site Settings" },
            { path: "/seosetting", label: "SEO Settings" },
        ]
    },
    { icon: ProfileIcon, path: "/reportsmanagement", label: "Reports Management" },
    { icon: LogoutIcon, path: "/", label: "Logout" },
];

function Sidebar() {
    const { settings } = useSystemSettings();
    const logoSrc = settings?.logo ? `http://localhost:5000/${settings.logo}` : logo;
    const appName = settings?.appName || "Estatehub";

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();

    // const toggleDropdown = (path: string) => {
    //     setOpenDropdowns(prev => ({ ...prev, [path]: !prev[path] }));
    // };
    const toggleDropdown = (path: string) => {
        setOpenDropdowns((prev) => {
            const isCurrentlyOpen = prev[path];

            return isCurrentlyOpen ? {} : { [path]: true };
        });
    };
    const location = useLocation();
    const isCheckoutRoute = location.pathname === "/user/checkout";

    // useEffect(() => {
    //     const newDropdowns: Record<string, boolean> = {};

    //     navItems.forEach((item) => {
    //         if (item.hasDropdown && location.pathname.startsWith(item.path)) {
    //             newDropdowns[item.path] = true;
    //         }
    //     });

    //     setOpenDropdowns(newDropdowns);
    // }, [location.pathname]);
    useEffect(() => {
        const newDropdowns: Record<string, boolean> = {};

        navItems.forEach((item) => {
            if (item.hasDropdown && isNavSectionActive(item, location.pathname)) {
                newDropdowns[item.path] = true;
            }
        });

        setOpenDropdowns(newDropdowns);
    }, [location.pathname]);
    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="relative flex flex-col h-full bg-[#141414] border-r border-[rgba(201,169,110,0.18)] shadow-2xl md:w-[350px] xl:w-[310px] lg:w-[280px] w-[320px] lg:p-[30px_24px] p-[20px_18px] sidebar overflow-hidden">
            {isLoggingOut ? (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-2 bg-black/80 backdrop-blur-sm">
                    <Loader size={72} margin={0} />
                    <p className="text-[14px] font-[Medium] text-[#C9A96E]">Signing out…</p>
                </div>
            ) : null}
            <div className="mb-[36px] flex justify-between items-center w-full sidebar_logo">
                <Link
                    to="/dashboard"
                    onClick={() => {
                        if (isMobile) {
                            setIsDrawerOpen(false);
                        }
                    }}
                >
                    <img src={logoSrc} alt={appName} className="w-[110px]" />
                </Link>
                {isMobile && (
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        className="cursor-pointer w-[38px] h-[38px] rounded-[10px] border border-[rgba(201,169,110,0.25)] bg-[#1A1A1A] flex items-center justify-center text-[#C9A96E] hover:bg-[#222]"
                    >
                        <Cross2Icon className="w-[18px] h-[18px]" />
                    </button>
                )}
            </div>
            <aside className="flex-1 flex flex-col items-start gap-[8px] w-full sidebar_aside overflow-y-auto pr-[4px]">
                {navItems.map((item, index) => {
                    const pathsToMatch = item.activePaths ?? [item.path];
                    const isItemActive = pathsToMatch.some((p) => matchPath({ path: p, end: true }, location.pathname) != null);
                    const isDirectMatch = matchPath({ path: item.path, end: true }, location.pathname) != null;
                    const isDropdownOpen = openDropdowns[item.path] || false;
                    const isActiveParent =
                        isDirectMatch ||
                        (item.hasDropdown && isNavSectionActive(item, location.pathname));
                    return item.hasDropdown ? (
                        <div key={index} className={`flex flex-col w-full p-[6px] rounded-[16px] transition-all ${isDropdownOpen ? 'theme-active-parent-bg' : isActiveParent ? 'theme-active-parent-bg' : 'bg-transparent theme-hover-bg'}`}>
                            <Link
                                to={item.path}
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleDropdown(item.path);
                                }}
                                className={`flex w-full items-center justify-between pr-[14px] p-[2px] ${isDropdownOpen ? 'mb-[6px]' : ''} rounded-[14px] transition focus:outline-none focus:border-none focus:shadow-none bg-transparent`}
                            >
                                <div className="flex items-center gap-[12px]">
                                    <div
                                        className={`flex items-center justify-center w-[42px] h-[42px] rounded-[10px] transition-all ${isActiveParent || isDropdownOpen ? "theme-active-icon-bg" : "bg-[#1A1A1A] border border-[rgba(201,169,110,0.12)] text-[#A89880]"}`}
                                    >
                                        {item.path === "/user" && (isActiveParent || isDropdownOpen) ? (
                                            <AllocationWhiteIcon />
                                        ) : item.path === "/cms" && (isActiveParent || isDropdownOpen) ? (
                                            <LeadsWhiteIcon />
                                        ) : item.path === "/systemsettings" && (isActiveParent || isDropdownOpen) ? (
                                            <LeadsWhiteIcon />
                                        ) :
                                            (
                                                <item.icon
                                                    stroke={isActiveParent || isDropdownOpen ? "#0A0A0A" : "#A89880"}
                                                    fill={isActiveParent || isDropdownOpen ? "#0A0A0A" : "#A89880"}
                                                />
                                            )}
                                    </div>
                                    <p className={`text-[14px] font-[Medium] ${isActiveParent || isDropdownOpen ? "text-[#F5F0E8] font-[SemiBold]" : "text-[#A89880]"}`}>{item.label}</p>
                                </div>
                                <DownArrowIcon
                                    width={12}
                                    height={12}
                                    className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                                    fill={isActiveParent || isDropdownOpen ? "#C9A96E" : "#A89880"}
                                />
                            </Link>

                            {isDropdownOpen && item.subItems && (
                                <div className="flex flex-col gap-[6px] pl-[10px]">
                                    {item.subItems.map((subItem, subIndex) => {
                                        const subItemActivePaths = getSubItemActivePaths(subItem.path);
                                        const isSubActive = subItemActivePaths.some(
                                            (p) => matchPath({ path: p, end: true }, location.pathname) != null
                                        );
                                        const looksActive = isSubActive;
                                        return (
                                            <NavLink
                                                key={subIndex}
                                                to={subItem.path}
                                                onClick={() => setIsDrawerOpen(false)}
                                                className={`flex items-center justify-start w-full px-[16px] py-[12px] rounded-[10px] text-[13px] font-[Medium] transition-all ${looksActive ? "theme-subitem-active-bg shadow-md" : "bg-[#1A1A1A]/60 text-[#A89880] hover:text-[#C9A96E] hover:bg-[rgba(201,169,110,0.08)]"
                                                    }`}
                                            >
                                                {subItem.label}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : item.label === "Logout" ? (
                        <button
                            key={index}
                            type="button"
                            className={`flex w-full gap-[12px] items-center justify-start rounded-[16px] p-[6px] transition theme-hover-bg focus:outline-none focus:border-none focus:shadow-none bg-transparent cursor-pointer`}
                            onClick={async () => {
                                try {
                                    setIsLoggingOut(true);
                                    await authService.logout();
                                } finally {
                                    setIsDrawerOpen(false);
                                    navigate("/");
                                    setIsLoggingOut(false);
                                }
                            }}
                        >
                            <div className="flex items-center justify-center w-[42px] h-[42px] rounded-[10px] bg-[#1A1A1A] border border-[rgba(201,169,110,0.12)] text-[#A89880]">
                                <item.icon stroke="#A89880" fill="#A89880" />
                            </div>
                            <p className="text-[14px] font-[Medium] text-[#A89880] hover:text-[#C9A96E]">Logout</p>
                        </button>
                    ) : (
                        <NavLink
                            key={index}
                            to={item.path}
                            end
                            className={() =>
                                `flex w-full gap-[12px] items-center justify-start rounded-[16px] p-[6px] transition theme-hover-bg focus:outline-none focus:border-none focus:shadow-none ${isItemActive ? " theme-active-parent-bg " : "bg-transparent "
                                }`
                            }
                            onClick={() => {
                                setIsDrawerOpen(false);
                            }}
                        >
                            <div
                                className={`flex items-center justify-center w-[42px] h-[42px] rounded-[10px] transition-all ${isItemActive ? "theme-active-icon-bg" : "bg-[#1A1A1A] border border-[rgba(201,169,110,0.12)] text-[#A89880]"}`}
                            >
                                <item.icon
                                    stroke={isItemActive ? "#0A0A0A" : "#A89880"}
                                    fill={isItemActive ? "#0A0A0A" : "#A89880"}
                                />
                            </div>
                            <p className={`text-[14px] ${isItemActive ? "text-[#F5F0E8] font-[SemiBold]" : "text-[#A89880]"} font-[Medium]`}>{item.label}</p>
                        </NavLink>
                    );
                })}
            </aside>
            <div className="pt-[18px] mt-auto border-t border-[rgba(201,169,110,0.15)]">
                <p className="text-[12px] leading-[1.5] text-[#A89880] font-[Regular]">
                    Copyright © 2025 {settings?.appName || 'Estatehub'}.
                </p>
                <p className="text-[11px] leading-[1.5] text-[#A89880]/60 font-[Regular]">
                    Luxury Real Estate Portal
                </p>
            </div>
        </div >
    );

    return (
        <>
            {/* Mobile Hamburger Menu */}
            <div className={`lg:hidden fixed top-0 left-0 right-0 bg-[#141414] p-[14px_16px] z-[10] flex items-center justify-between border-b border-[rgba(201,169,110,0.18)] ${isCheckoutRoute ? "border-none" : ""}`}>
                <Link to="/dashboard">
                    <img src={logoSrc} alt={appName} className="w-[100px]" />
                </Link>

                <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <button
                        type="button"
                        className="cursor-pointer w-[40px] h-[40px] rounded-[10px] border border-[rgba(201,169,110,0.25)] bg-[#1A1A1A] flex items-center justify-center text-[#C9A96E]"
                        onClick={() => setIsDrawerOpen(true)}
                    >
                        <HamburgerMenuIcon className="w-[20px] h-[20px]" />
                    </button>
                    <DialogOverlay className="fixed inset-0 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out" />
                    <DialogContent className="fixed left-0 top-0 h-[100dvh] bg-[#141414] border-r border-[rgba(201,169,110,0.18)] p-0 translate-x-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left z-[99] overflow-hidden">
                        <SidebarContent isMobile />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex flex-col items-center h-[100dvh] fixed max-sm:w-full z-[100]">
                <SidebarContent />
            </div>
        </>
    );
}

export default Sidebar
