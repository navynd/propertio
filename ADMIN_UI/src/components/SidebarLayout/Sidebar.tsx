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
    const appName = settings?.appName || "Molumulk";

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
        <div className="relative flex flex-col h-full bg-[#FFF] shadow-md md:w-[350px] xl:w-[310px] lg:w-[280px] w-[320px] lg:p-[30px_30px_30px_30px]  p-[20px_20px_20px_20px] sidebar overflow-hidden">
            {isLoggingOut ? (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center gap-2 bg-white/90">
                    <Loader size={72} margin={0} />
                    <p className="text-[14px] font-[Medium] text-[#707070]">Signing out…</p>
                </div>
            ) : null}
            <div className="mb-[40px] flex justify-between items-center w-full sidebar_logo">
                <Link
                    to="/dashboard"
                    onClick={() => {
                        if (isMobile) {
                            setIsDrawerOpen(false);
                        }
                    }}
                >
                    <img src={logoSrc} alt={appName} className="w-[100px]" />
                </Link>
                {/* <h4 className="molumulk-text">
                    <span>P</span>
                    <span>R</span>
                    <span>O</span>
                    <span>P</span>
                    <span>E</span>
                    <span>R</span>
                    <span>T</span>
                    <span>I</span>
                    <span>O</span>
                </h4> */}
                {isMobile && (
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        className="cursor-pointer w-[40px] h-[40px] rounded-[12px] border border-[#E6E6E6] bg-white flex items-center justify-center"
                    >
                        <Cross2Icon className="w-[18px] h-[18px] text-[#222]" />
                    </button>
                )}
            </div>
            <aside className="flex-1 flex flex-col items-start gap-[10px] w-full sidebar_aside overflow-y-auto pr-[4px]">
                {navItems.map((item, index) => {
                    const pathsToMatch = item.activePaths ?? [item.path];
                    const isItemActive = pathsToMatch.some((p) => matchPath({ path: p, end: true }, location.pathname) != null);
                    const isDirectMatch = matchPath({ path: item.path, end: true }, location.pathname) != null;
                    const isDropdownOpen = openDropdowns[item.path] || false;
                    const isActiveParent =
                        isDirectMatch ||
                        (item.hasDropdown && isNavSectionActive(item, location.pathname));
                    return item.hasDropdown ? (
                        <div key={index} className={`flex flex-col w-full p-[6px] rounded-[18px] transition-colors ${isDropdownOpen ? 'theme-active-parent-bg' : isActiveParent ? 'theme-active-parent-bg' : 'bg-transparent theme-hover-bg'}`}>
                            <Link
                                to={item.path}
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleDropdown(item.path);
                                }}
                                className={`flex w-full items-center justify-between pr-[14px] p-[2px] ${isDropdownOpen ? 'mb-[4px]' : ''} rounded-[15px] transition focus:outline-none focus:border-none focus:shadow-none bg-transparent`}
                            >
                                <div className="flex items-center gap-[10px]">
                                    <div
                                        className={`flex items-center justify-center w-[46px] h-[46px] rounded-[12px] ${isActiveParent || isDropdownOpen ? "theme-active-icon-bg" : "bg-[#fff] shadow-[0px_1px_4px_rgba(0,0,0,0.16)]"}`}
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
                                                    stroke={isActiveParent || isDropdownOpen ? "#fff" : "#707070"}
                                                    fill={isActiveParent || isDropdownOpen ? "#fff" : "#707070"}
                                                />
                                            )}
                                    </div>
                                    <p className="text-[14px] text-[#222] font-[Medium]">{item.label}</p>
                                </div>
                                <DownArrowIcon
                                    width={12}
                                    height={12}
                                    className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                                    fill="#222"
                                />
                            </Link>

                            {isDropdownOpen && item.subItems && (
                                <div className="flex flex-col gap-[6px]">
                                    {item.subItems.map((subItem, subIndex) => {
                                        const subItemActivePaths = getSubItemActivePaths(subItem.path);
                                        const isSubActive = subItemActivePaths.some(
                                            (p) => matchPath({ path: p, end: true }, location.pathname) != null
                                        );
                                        // Default "Project allocation" to active if no sub-item is active, just to match the screenshot state exactly if we are at the parent
                                        const looksActive = isSubActive;
                                        return (
                                            <NavLink
                                                key={subIndex}
                                                to={subItem.path}
                                                onClick={() => setIsDrawerOpen(false)}
                                                className={`flex items-center justify-start w-full px-[20px] py-[16px] rounded-[12px] text-[13px] font-[Medium] transition-colors ${looksActive ? "theme-subitem-active-bg" : "bg-[#fff] text-[#222] theme-subitem-hover-bg"
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
                            className={`flex w-full gap-[10px] items-center justify-start rounded-[15px] p-[6px] transition theme-hover-bg focus:outline-none focus:border-none focus:shadow-none bg-transparent`}
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
                            <div className="flex items-center justify-center w-[46px] h-[46px] rounded-[12px] bg-[#fff] shadow-[0px_1px_4px_rgba(0,0,0,0.16)]">
                                <item.icon stroke="#707070" fill="#707070" />
                            </div>
                            <p className="text-[14px] font-[Medium]">Logout</p>
                        </button>
                    ) : (
                        <NavLink
                            key={index}
                            to={item.path}
                            end
                            className={() =>
                                `flex w-full gap-[10px] items-center justify-start rounded-[15px] p-[6px] transition theme-hover-bg focus:outline-none focus:border-none focus:shadow-none ${isItemActive ? " theme-active-parent-bg " : "bg-transparent "
                                }`
                            }
                            onClick={() => {
                                setIsDrawerOpen(false);
                            }}
                        >
                            <div
                                className={`flex items-center justify-center w-[46px] h-[46px] rounded-[12px] ${isItemActive ? "theme-active-icon-bg" : "bg-[#fff] shadow-[0px_1px_4px_rgba(0,0,0,0.16)]"}`}
                            >
                                <item.icon
                                    stroke={isItemActive ? "#fff" : "#707070"}
                                    fill={isItemActive ? "#fff" : "#707070"}
                                />
                            </div>
                            <p className={`text-[14px] ${isItemActive ? "text-[#222]" : ""} font-[Medium]`}>{item.label}</p>
                        </NavLink>
                    );
                })}
            </aside>
            <div className="pt-[20px] mt-auto border-t border-[rgba(34,34,34,0.10)]">
                <p className="text-[12px] leading-[1.5] text-[#707070] font-[Regular]">
                    Copyright © 2025 {settings?.appName || 'Molumulk'}.
                </p>
                <p className="text-[12px] leading-[1.5] text-[#707070] font-[Regular]">
                    All rights reserved.
                </p>
            </div>
        </div >
    );

    return (
        <>
            {/* Mobile Hamburger Menu bg-gradient-to-r from-[#7B4DDB] to-[#9B6BFF] shadow-[0_5px_10px_rgba(123,77,49,0.15)]               bg-white/20 backdrop-blur-sm*/}
            <div className={`lg:hidden fixed top-0 left-0 right-0 bg-[#fff] p-[14px_16px] z-[10] flex items-center justify-between border-b border-[rgba(0,0,0,0.1)] ${isCheckoutRoute ? "border-none" : ""}`}>
                <Link to="/dashboard">
                    <img src={logoSrc} alt={appName} className="w-[100px]" />
                </Link>

                <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <button
                        type="button"
                        className="cursor-pointer w-[40px] h-[40px] rounded-[12px] border border-[#E6E6E6] bg-white flex items-center justify-center"
                        onClick={() => setIsDrawerOpen(true)}
                    >
                        <HamburgerMenuIcon className="w-[20px] h-[20px] text-[#222]" />
                    </button>
                    <DialogOverlay className="fixed inset-0 bg-[rgba(0,0,0,0.5)] data-[state=open]:animate-in data-[state=closed]:animate-out" />
                    <DialogContent className="fixed left-0 top-0 h-[100dvh] bg-[#fff] border-r border-[rgba(0,0,0,0.1)] p-0 translate-x-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left z-[99] overflow-hidden">
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
