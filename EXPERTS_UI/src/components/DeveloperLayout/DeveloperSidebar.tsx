import { useState } from "react";
import { NavLink, Link, useLocation, matchPath } from "react-router-dom";
import { Dialog, DialogContent, DialogOverlay } from "../Ui/Dialog";
import { HamburgerMenuIcon, Cross2Icon } from "@radix-ui/react-icons";
import { DashboardIcon, ProjectIcon, RevenueIcon, ProfileIcon, LogoutIcon, NotificationIcon } from '../CustomFile/icons'
import { EstatehubLogo } from "../CustomFile/EstatehubLogo";

type NavItem = {
    icon: typeof DashboardIcon;
    path: string;
    label: string;
    /** If set, item is active when pathname matches any of these (exact). Otherwise uses `path` only. */
    activePaths?: string[];
};

const navItems: NavItem[] = [
    { icon: DashboardIcon, path: "/developer/dashboard", label: "Dashboard" },
    {
        icon: ProjectIcon,
        path: "/developer/project-management?tab=unpublished",
        label: "Project management",
        activePaths: ["/developer/project-management", "/developer/project-details", "/developer/units", "/developer/units-details", "/developer/unit-edit", "/developer/assign-agencies", "/developer/review-assignment", "/developer/unpublished-project-details", "/developer/units-assign", "/developer/units-edit-assign", "/developer/units-edit", "/developer/active-project-details", "/developer/add-project", "/developer/edit-project", "/developer/soldout-project-details"],
    },
    {
        icon: RevenueIcon,
        path: "/developer/revenue-management",
        label: "Revenue management",
        activePaths: ["/developer/revenue-management", "/developer/revenue-details"],
    },
    { icon: ProfileIcon, path: "/developer/profile", label: "Profile" },
    { icon: LogoutIcon, path: "/developer/logout", label: "Logout" },
];

function DeveloperSidebar() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const location = useLocation();
    const isCheckoutRoute = location.pathname === "/user/checkout";
    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="flex flex-col h-full bg-[#FFFFFF] border-r border-[#EAECEF] w-[280px] p-[24px_20px] sidebar overflow-hidden shadow-[2px_0_12px_rgba(0,0,0,0.03)]">
            <div className="mb-[36px] flex justify-between items-center w-full sidebar_logo px-2">
                <Link
                    to="/developer/dashboard"
                    onClick={() => {
                        if (isMobile) {
                            setIsDrawerOpen(false);
                        }
                    }}
                >
                    <EstatehubLogo width="155" height="38" subtitle="DEVELOPER" />
                </Link>
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
                    const isItemActive = pathsToMatch.some(
                        (p) => matchPath({ path: p, end: true }, location.pathname) != null
                    );
                    return (
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
                                className={`flex items-center justify-center w-[38px] h-[38px] rounded-[10px] transition-colors ${isItemActive ? "bg-[#1E293B]" : "bg-[#F8FAFC] group-hover:bg-[#E2E8F0]"}`}
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
                <Link to="/developer/dashboard">
                    <EstatehubLogo width="135" height="34" subtitle="DEVELOPER" />
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

export default DeveloperSidebar