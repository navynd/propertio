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
    { icon: DashboardIcon, path: "/agency/dashboard", label: "Dashboard" },
    { icon: AgentIcon, path: "/agency/super-agent", label: "Agents & Super Agents", activePaths: ["/agency/super-agent", "/agency/super-agent-details/:id", "/agency/super-agent-edit"] },
    {
        icon: AllocationIcon,
        path: "/agency/allocation",
        label: "Allocation",
        hasDropdown: true,
        subItems: [
            { path: "/agency/allocation/project", label: "Project allocation" },
            { path: "/agency/allocation/property", label: "Property allocation" }
        ]
    },
    { icon: ListingIcon, path: "/agency/listings", label: "Listing Management", activePaths: ["/agency/listings", "/agency/listings/edit-property", "/agency/listing-details/:id"] },
    {
        icon: LeadsIcon,
        path: "/agency/leads",
        label: "Leads Management",
        hasDropdown: true,
        subItems: [
            { path: "/agency/leads/project", label: "Project leads" },
            { path: "/agency/leads/property", label: "Property leads" }
        ]
    },
    { icon: SubscriptionIcon, path: "/agency/subscription", label: "Subscription" },
    { icon: ProfileIcon, path: "/agency/profile", label: "Profile" },
    { icon: LogoutIcon, path: "/agency/logout", label: "Logout" },
];

function AgencySidebar() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

    const toggleDropdown = (path: string) => {
        setOpenDropdowns(prev => ({ ...prev, [path]: !prev[path] }));
    };

    const location = useLocation();
    const isCheckoutRoute =
        location.pathname === "/agency/checkout" || location.pathname === "/user/checkout";

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
                    to="/agency/dashboard"
                    onClick={() => {
                        if (isMobile) {
                            setIsDrawerOpen(false);
                        }
                    }}
                >
                    <EstatehubLogo width="155" height="38" subtitle="AGENCY" />
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
                                        {item.path === "/agency/allocation" && (isActiveParent || isDropdownOpen) ? (
                                            <AllocationWhiteIcon />
                                        ) : item.path === "/agency/leads" && (isActiveParent || isDropdownOpen) ? (
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
                                            subItem.path === "/agency/leads/property"
                                                ? ["/agency/leads/property", "/agency/leads/property-details/:id"]
                                                : subItem.path === "/agency/leads/project"
                                                    ? ["/agency/leads/project", "/agency/leads/project-details/:id", "/agency/leads/view-project-details"]
                                                    : subItem.path === "/agency/allocation/project"
                                                        ? [
                                                            "/agency/allocation/project",
                                                            "/agency/allocation/project-details/:id",
                                                            "/agency/allocation/project-assign-agent",
                                                            "/agency/allocation/project-review-assign",
                                                            "/agency/allocation/project-units",
                                                            "/agency/allocation/project-unit-details",
                                                            "/agency/allocation/project-edit-assign",
                                                        ]
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
                <Link to="/agency/dashboard">
                    <EstatehubLogo width="135" height="34" subtitle="AGENCY" />
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

export default AgencySidebar