import { useState, useEffect } from "react";
import { NavLink, Link, useLocation, matchPath } from "react-router-dom";
import { Dialog, DialogContent, DialogOverlay } from "../Ui/Dialog";
import { HamburgerMenuIcon, Cross2Icon } from "@radix-ui/react-icons";
import { DashboardIcon, AgentIcon, AllocationIcon, AllocationWhiteIcon, ListingIcon, LeadsIcon, LeadsWhiteIcon, SubscriptionIcon, ProfileIcon, LogoutIcon, DownArrowIcon } from '../CustomFile/icons'
import { EstatehubLogo } from "../CustomFile/EstatehubLogo";

type NavItem = {
    icon: typeof DashboardIcon;
    path: string;
    label: string;
    hasDropdown?: boolean;
    subItems?: { path: string; label: string }[];
    activePaths?: string[];
};

const navItems: NavItem[] = [
    { icon: DashboardIcon, path: "/agent/dashboard", label: "Dashboard" },
    {
        icon: AllocationIcon,
        path: "/agent/allocated",
        label: "Allocated",
        hasDropdown: true,
        subItems: [
            { path: "/agent/allocated/project", label: "Allocated project" },
            { path: "/agent/allocated/property", label: "Allocated property" }
        ]
    },
    { icon: ListingIcon, path: "/agent/properties-management", label: "Properties management", activePaths: ["/agent/properties-management", "/agent/properties-management-details/:id", "/agent/properties-management/edit", "/agent/properties-management/add-property", "/agent/properties-management/edit-property"] },
    {
        icon: LeadsIcon,
        path: "/agent/leads",
        label: "Leads Management",
        hasDropdown: true,
        subItems: [
            { path: "/agent/leads/project", label: "Project leads" },
            { path: "/agent/leads/property", label: "Property leads" }
        ]
    },
    { icon: ProfileIcon, path: "/agent/profile", label: "Profile" },
    { icon: LogoutIcon, path: "/agent/logout", label: "Logout" },
];

function AgentSidebar() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    const toggleDropdown = (path: string) => {
        setOpenDropdowns(prev => ({ ...prev, [path]: !prev[path] }));
    };

    const location = useLocation();
    const isCheckoutRoute = location.pathname === "/user/checkout";

    useEffect(() => {
        const newDropdowns: Record<string, boolean> = {};

        navItems.forEach((item) => {
            if (item.hasDropdown && location.pathname.startsWith(item.path)) {
                newDropdowns[item.path] = true;
            }
        });

        setOpenDropdowns(newDropdowns);
    }, [location.pathname]);
    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#EAECEF] w-[280px] p-[24px_20px] sidebar overflow-hidden shadow-[2px_0_12px_rgba(0,0,0,0.03)]">
            <div className="mb-[36px] flex justify-between items-center w-full sidebar_logo px-2">
                <Link
                    to="/agent/dashboard"
                    onClick={() => {
                        if (isMobile) {
                            setIsDrawerOpen(false);
                        }
                    }}
                >
                    <EstatehubLogo width="155" height="38" subtitle="AGENT" />
                </Link>
                {isMobile && (
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        className="cursor-pointer w-[36px] h-[36px] rounded-[10px] border border-[#E6E6E6] bg-white flex items-center justify-center text-[#222]"
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
                    const isParentPathMatch = location.pathname.startsWith(item.path);
                    const isDropdownOpen = openDropdowns[item.path] || false;
                    const isActiveParent = isDirectMatch || (item.hasDropdown && isParentPathMatch);
                    return item.hasDropdown ? (
                        <div key={index} className={`flex flex-col w-full p-2 rounded-[14px] transition-colors ${isDropdownOpen ? 'bg-[#F8FAFC] border border-[#E2E8F0]' : isActiveParent ? 'bg-[#F1F5F9]' : 'bg-transparent hover:bg-[#F8FAFC]'}`}>
                            <Link
                                to={item.path}
                                onClick={(e) => {
                                    e.preventDefault();
                                    toggleDropdown(item.path);
                                }}
                                className={`flex w-full items-center justify-between p-1 rounded-[10px] transition focus:outline-none bg-transparent`}
                            >
                                <div className="flex items-center gap-[10px]">
                                    <div
                                        className={`flex items-center justify-center w-[36px] h-[36px] rounded-[10px] transition-colors ${isActiveParent || isDropdownOpen ? "bg-[#0F172A]" : "bg-[#F1F5F9]"}`}
                                    >
                                        {item.path === "/agent/allocated" && (isActiveParent || isDropdownOpen) ? (
                                            <AllocationWhiteIcon />
                                        ) : item.path === "/agent/leads" && (isActiveParent || isDropdownOpen) ? (
                                            <LeadsWhiteIcon />
                                        ) : (
                                            <item.icon
                                                stroke={isActiveParent || isDropdownOpen ? "#D4A373" : "#64748B"}
                                                fill={isActiveParent || isDropdownOpen ? "#D4A373" : "#64748B"}
                                            />
                                        )}
                                    </div>
                                    <p className={`text-[13px] font-[SemiBold] ${isActiveParent || isDropdownOpen ? "text-[#0F172A]" : "text-[#475569]"}`}>{item.label}</p>
                                </div>
                                <DownArrowIcon
                                    width={10}
                                    height={10}
                                    className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
                                    fill="#64748B"
                                />
                            </Link>

                            {isDropdownOpen && item.subItems && (
                                <div className="flex flex-col gap-1.5 mt-2 pl-2">
                                    {item.subItems.map((subItem, subIndex) => {
                                        const subItemActivePaths =
                                            subItem.path === "/agent/allocated/project"
                                                ? ["/agent/allocated/project", "/agent/allocated/project-details", "/agent/allocated/project-units", "/agent/allocated/project-unit-details"]
                                                : subItem.path === "/agent/leads/project"
                                                    ? ["/agent/leads/project", "/agent/leads/project-details/:id", "/agent/leads/view-project-details"]
                                                    : subItem.path === "/agent/leads/property"
                                                        ? ["/agent/leads/property", "/agent/leads/property-details/:id"]
                                                        : subItem.path === "/agent/allocated/property"
                                                            ? ["/agent/allocated/property", "/agent/allocated/property-details/:id", "/agent/allocated/property/edit"]
                                                            : [subItem.path];
                                        const isSubActive = subItemActivePaths.some(
                                            (p) => matchPath({ path: p, end: true }, location.pathname) != null
                                        );
                                        const looksActive = isSubActive || (isParentPathMatch && !isDirectMatch && isSubActive) || (isDirectMatch && subIndex === 0);
                                        return (
                                            <NavLink
                                                key={subIndex}
                                                to={subItem.path}
                                                onClick={() => setIsDrawerOpen(false)}
                                                className={`flex items-center justify-start w-full px-3 py-2 rounded-[8px] text-[12px] font-[SemiBold] transition-all ${looksActive ? "bg-[#0F172A] text-white shadow-sm" : "text-[#64748B] hover:text-[#0F172A] hover:bg-white"
                                                    }`}
                                            >
                                                {subItem.label}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <NavLink
                            key={index}
                            to={item.path}
                            end
                            className={() =>
                                `flex w-full gap-[12px] items-center justify-start rounded-[12px] p-[8px_12px] transition-all duration-200 group focus:outline-none ${isItemActive
                                    ? "bg-[#0F172A] text-white shadow-sm"
                                    : "bg-transparent text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                                }`
                            }
                            onClick={() => {
                                setIsDrawerOpen(false);
                            }}
                        >
                            <div
                                className={`flex items-center justify-center w-[36px] h-[36px] rounded-[10px] transition-colors ${isItemActive ? "bg-[#1E293B]" : "bg-[#F8FAFC] group-hover:bg-[#E2E8F0]"}`}
                            >
                                <item.icon
                                    stroke={isItemActive ? "#D4A373" : "#64748B"}
                                    fill={isItemActive ? "#D4A373" : "#64748B"}
                                />
                            </div>
                            <p className={`text-[13px] font-[SemiBold] tracking-wide ${isItemActive ? "text-white" : "text-[#334155] group-hover:text-[#0F172A]"}`}>{item.label}</p>
                            {isItemActive && (
                                <div className="ml-auto w-1.5 h-4 rounded-full bg-[#D4A373]" />
                            )}
                        </NavLink>
                    );
                })}
            </aside>
            <div className="pt-[20px] mt-auto border-t border-[#F1F5F9] px-2">
                <p className="text-[11px] leading-[1.5] text-[#94A3B8] font-[Medium]">
                    Estatehub Partner Portal v2.4
                </p>
                <p className="text-[11px] leading-[1.5] text-[#CBD5E1] font-[Regular]">
                    © 2026 Estatehub Real Estate LLC.
                </p>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Hamburger Menu */}
            <div className={`lg:hidden fixed top-0 left-0 right-0 bg-[#fff] p-[14px_16px] z-[10] flex items-center justify-between border-b border-[rgba(0,0,0,0.1)] ${isCheckoutRoute ? "border-none" : ""}`}>
                <Link to="/agent/dashboard">
                    <EstatehubLogo width="135" height="34" subtitle="AGENT" />
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

export default AgentSidebar

// import { useState } from "react";
// import { NavLink, Link, useLocation, matchPath } from "react-router-dom";
// import { Dialog, DialogContent, DialogOverlay } from "../Ui/Dialog";
// import { HamburgerMenuIcon, Cross2Icon } from "@radix-ui/react-icons";
// import { DashboardIcon, AllocationIcon, AllocationWhiteIcon, ListingIcon, LeadsIcon, LeadsWhiteIcon, SubscriptionIcon, ProfileIcon, LogoutIcon, DownArrowIcon } from '../CustomFile/icons'
// import logo from '../../assets/img/logo.png'

// const navItems = [
//     { icon: DashboardIcon, path: "/agent/dashboard", label: "Dashboard" },
//     {
//         icon: AllocationIcon,
//         path: "/agent/allocated",
//         label: "Allocated",
//         hasDropdown: true,
//         subItems: [
//             { path: "/agent/allocated/project", label: "Allocated project" },
//             { path: "/agent/allocated/property", label: "Allocated property" }
//         ]
//     },
//     { icon: ListingIcon, path: "/agent/listings", label: "Properties management" },
//     {
//         icon: LeadsIcon,
//         path: "/agent/leads",
//         label: "Leads Management",
//         hasDropdown: true,
//         subItems: [
//             { path: "/agent/leads/project", label: "Project leads" },
//             { path: "/agent/leads/property", label: "Property leads" }
//         ]
//     },
//     { icon: ProfileIcon, path: "/agent/profile", label: "Profile" },
//     { icon: LogoutIcon, path: "/agent/logout", label: "Logout" },
// ];

// function Sidebar() {
//     const [isDrawerOpen, setIsDrawerOpen] = useState(false);
//     const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

//     const toggleDropdown = (path: string) => {
//         setOpenDropdowns(prev => ({ ...prev, [path]: !prev[path] }));
//     };

//     const location = useLocation();
//     const isCheckoutRoute = location.pathname === "/user/checkout";
//     const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
//         <div className="flex flex-col h-full bg-[#F5F5F5] md:w-[350px] w-[320px] md:p-[30px] p-[20px] sidebar overflow-hidden">
//             <div className="mb-[40px] flex justify-between items-center w-full sidebar_logo">
//                 <Link
//                     to="/developer/dashboard"
//                     onClick={() => {
//                         if (isMobile) {
//                             setIsDrawerOpen(false);
//                         }
//                     }}
//                 >
//                     <img src={logo} alt="img" className="w-[100px]" />
//                 </Link>
//                 {isMobile && (
//                     <button
//                         type="button"
//                         onClick={() => setIsDrawerOpen(false)}
//                         className="cursor-pointer w-[40px] h-[40px] rounded-[12px] border border-[#E6E6E6] bg-white flex items-center justify-center"
//                     >
//                         <Cross2Icon className="w-[18px] h-[18px] text-[#222]" />
//                     </button>
//                 )}
//             </div>
//             <aside className="flex-1 flex flex-col items-start gap-[10px] w-full sidebar_aside overflow-y-auto pr-[4px]">
//                 {navItems.map((item, index) => {
//                     const isDirectMatch = matchPath({ path: item.path, end: true }, location.pathname) != null;
//                     const isParentPathMatch = location.pathname.startsWith(item.path);
//                     const isDropdownOpen = openDropdowns[item.path] || false;
//                     const isActiveParent = isDirectMatch || (item.hasDropdown && isParentPathMatch);

//                     return item.hasDropdown ? (
//                         <div key={index} className={`flex flex-col w-full p-[6px] rounded-[18px] transition-colors ${isDropdownOpen ? 'bg-[#EAEAEA]' : 'bg-transparent hover:bg-[rgba(34,34,34,0.10)]'}`}>
//                             <Link
//                                 to={item.path}
//                                 onClick={(e) => {
//                                     e.preventDefault();
//                                     toggleDropdown(item.path);
//                                 }}
//                                 className={`flex w-full items-center justify-between pr-[14px] p-[2px] ${isDropdownOpen ? 'mb-[4px]' : ''} rounded-[15px] transition focus:outline-none focus:border-none focus:shadow-none bg-transparent`}
//                             >
//                                 <div className="flex items-center gap-[10px]">
//                                     <div
//                                         className={`flex items-center justify-center w-[46px] h-[46px] rounded-[12px] ${isActiveParent || isDropdownOpen ? "bg-[#222]" : "bg-[#fff]"}`}
//                                     >
//                                         {item.path === "/agency/allocation" && (isActiveParent || isDropdownOpen) ? (
//                                             <AllocationWhiteIcon fill="#fff" />
//                                         ) : item.path === "/agency/leads" && (isActiveParent || isDropdownOpen) ? (
//                                             <LeadsWhiteIcon fill="#fff" />
//                                         ) : (
//                                             <item.icon
//                                                 stroke={isActiveParent || isDropdownOpen ? "#fff" : "#707070"}
//                                                 fill={isActiveParent || isDropdownOpen ? "#fff" : "#707070"}
//                                             />
//                                         )}
//                                     </div>
//                                     <p className="text-[14px] text-[#222] font-[Medium]">{item.label}</p>
//                                 </div>
//                                 <DownArrowIcon
//                                     width={12}
//                                     height={12}
//                                     className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
//                                     fill="#222"
//                                 />
//                             </Link>

//                             {isDropdownOpen && item.subItems && (
//                                 <div className="flex flex-col gap-[6px]">
//                                     {item.subItems.map((subItem, subIndex) => {
//                                         const isSubActive = matchPath({ path: subItem.path, end: true }, location.pathname) != null;
//                                         // Default "Project allocation" to active if no sub-item is active, just to match the screenshot state exactly if we are at the parent
//                                         const looksActive = isSubActive || (isParentPathMatch && !isDirectMatch && isSubActive) || (isDirectMatch && subIndex === 0);
//                                         return (
//                                             <NavLink
//                                                 key={subIndex}
//                                                 to={subItem.path}
//                                                 onClick={() => setIsDrawerOpen(false)}
//                                                 className={`flex items-center justify-start w-full px-[20px] py-[16px] rounded-[12px] text-[13px] font-[Medium] transition-colors ${looksActive ? "bg-[#0832AE] text-[#fff]" : "bg-[#fff] text-[#222] hover:bg-[#F5F5F5]"
//                                                     }`}
//                                             >
//                                                 {subItem.label}
//                                             </NavLink>
//                                         );
//                                     })}
//                                 </div>
//                             )}
//                         </div>
//                     ) : (
//                         <NavLink
//                             key={index}
//                             to={item.path}
//                             end
//                             className={({ isActive }) =>
//                                 `flex w-full gap-[10px] items-center justify-start rounded-[15px] p-[6px] transition hover:bg-[rgba(34,34,34,0.10)] focus:outline-none focus:border-none focus:shadow-none ${isActive ? "bg-[rgba(34,34,34,0.10)] " : "bg-transparent "
//                                 }`
//                             }
//                             onClick={() => {
//                                 setIsDrawerOpen(false);
//                             }}
//                         >
//                             <div
//                                 className={`flex items-center justify-center w-[46px] h-[46px] rounded-[12px] ${isDirectMatch ? "bg-[#222]" : "bg-[#fff]"}`}
//                             >
//                                 <item.icon
//                                     stroke={isDirectMatch ? "#fff" : "#707070"}
//                                     fill={isDirectMatch ? "#fff" : "#707070"}
//                                 />
//                             </div>
//                             <p className="text-[14px] text-[#222] font-[Medium]">{item.label}</p>
//                         </NavLink>
//                     );
//                 })}
//             </aside>
//             <div className="pt-[20px] mt-auto border-t border-[rgba(34,34,34,0.10)]">
//                 <p className="text-[12px] leading-[1.5] text-[#707070] font-[Regular]">
//                     Copyright © 2025 estatehub.ae.
//                 </p>
//                 <p className="text-[12px] leading-[1.5] text-[#707070] font-[Regular]">
//                     All rights reserved.
//                 </p>
//             </div>
//         </div>
//     );

//     return (
//         <>
//             {/* Mobile Hamburger Menu */}
//             <div className={`lg:hidden fixed top-0 left-0 right-0 bg-[#fff] p-[14px_16px] z-[10] flex items-center justify-between border-b border-[rgba(0,0,0,0.1)] ${isCheckoutRoute ? "border-none" : ""}`}>
//                 <Link to="/developer/dashboard">
//                     <img src={logo} alt="img" className="w-[100px]" />
//                 </Link>
//                 <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
//                     <button
//                         type="button"
//                         className="cursor-pointer w-[40px] h-[40px] rounded-[12px] border border-[#E6E6E6] bg-white flex items-center justify-center"
//                         onClick={() => setIsDrawerOpen(true)}
//                     >
//                         <HamburgerMenuIcon className="w-[20px] h-[20px] text-[#222]" />
//                     </button>
//                     <DialogOverlay className="fixed inset-0 bg-[rgba(0,0,0,0.5)] data-[state=open]:animate-in data-[state=closed]:animate-out" />
//                     <DialogContent className="fixed left-0 top-0 h-[100dvh] bg-[#fff] border-r border-[rgba(0,0,0,0.1)] p-0 translate-x-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left z-[99] overflow-hidden">
//                         <SidebarContent isMobile />
//                     </DialogContent>
//                 </Dialog>
//             </div>

//             {/* Desktop Sidebar */}
//             <div className="hidden lg:flex flex-col items-center h-[100dvh] fixed max-sm:w-full z-[100]">
//                 <SidebarContent />
//             </div>
//         </>
//     );
// }

// export default Sidebar